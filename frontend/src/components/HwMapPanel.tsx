import { useCallback, useEffect, useState } from "react";
import type { TreeNode } from "../types";
import { HwGraphMap } from "./HwGraphMap";
import { HwTreeMap, useHwTreeExpanded } from "./HwTreeMap";

type HwViewMode = "graph" | "tree";

interface Props {
  nodes: TreeNode[];
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
  onOpenFullView: () => void;
  mapFilter?: string;
  mapJumpPulsePath?: string | null;
  mapContextKey: string;
}

export function HwMapPanel({
  nodes,
  selectedKeyword,
  onSelect,
  onOpenFullView,
  mapFilter = "",
  mapJumpPulsePath = null,
  mapContextKey,
}: Props) {
  const [viewMode, setViewMode] = useState<HwViewMode>("graph");
  const treeExpanded = useHwTreeExpanded(nodes, mapContextKey);

  useEffect(() => {
    if (selectedKeyword) {
      treeExpanded.expandToPath(selectedKeyword);
    }
  }, [selectedKeyword, treeExpanded.expandToPath]);

  const handleSelect = useCallback(
    (keyword: string, procedures: TreeNode["procedures"]) => {
      treeExpanded.expandToPath(keyword);
      onSelect(keyword, procedures);
    },
    [onSelect, treeExpanded.expandToPath]
  );

  return (
    <div className="hw-map-panel">
      <div className="hw-view-toggle" role="tablist" aria-label="HW MAP view mode">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "graph"}
          className={`hw-view-btn ${viewMode === "graph" ? "active" : ""}`}
          onClick={() => setViewMode("graph")}
        >
          Graph View
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "tree"}
          className={`hw-view-btn ${viewMode === "tree" ? "active" : ""}`}
          onClick={() => setViewMode("tree")}
        >
          Tree View
        </button>
        <button
          type="button"
          className="hw-view-btn hw-view-btn-full"
          onClick={onOpenFullView}
          title="Open full-screen HW graph"
        >
          Full View
        </button>
      </div>

      {viewMode === "graph" ? (
        <HwGraphMap
          nodes={nodes}
          selectedKeyword={selectedKeyword}
          onSelect={handleSelect}
          mapFilter={mapFilter}
          mapJumpPulsePath={mapJumpPulsePath}
        />
      ) : (
        <HwTreeMap
          nodes={nodes}
          selectedKeyword={selectedKeyword}
          onSelect={handleSelect}
          expanded={treeExpanded.expanded}
          onToggle={treeExpanded.toggle}
          onExpandAllTop={treeExpanded.expandAllTop}
          onCollapseAllTop={treeExpanded.collapseAllTop}
          mapFilter={mapFilter}
          mapJumpPulsePath={mapJumpPulsePath}
        />
      )}
    </div>
  );
}
