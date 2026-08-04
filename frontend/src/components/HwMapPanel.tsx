import { useCallback, useEffect, useState } from "react";
import type { TreeNode } from "../types";
import { HwGraphMap } from "./HwGraphMap";
import { HwTreeMap, useHwTreeExpanded } from "./HwTreeMap";

type HwViewMode = "graph" | "tree";

interface Props {
  nodes: TreeNode[];
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
}

export function HwMapPanel({ nodes, selectedKeyword, onSelect }: Props) {
  const [viewMode, setViewMode] = useState<HwViewMode>("graph");
  const treeExpanded = useHwTreeExpanded(nodes);

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
      </div>

      {viewMode === "graph" ? (
        <HwGraphMap
          nodes={nodes}
          selectedKeyword={selectedKeyword}
          onSelect={handleSelect}
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
        />
      )}
    </div>
  );
}
