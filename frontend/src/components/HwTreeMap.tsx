import { useCallback, useEffect, useMemo, useState } from "react";
import type { TreeNode } from "../types";
import {
  collectExpandablePaths,
  countTotal,
  flattenVisibleTree,
  getPathLabel,
  isOnSelectedPath,
} from "../utils/mapUtils";
import { nodeMatchesMapFilter, nodeDirectMatchesMapFilter } from "../utils/mapNavigation";

interface Props {
  nodes: TreeNode[];
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
  expanded: Set<string>;
  onToggle: (keyword: string) => void;
  onExpandAllTop: () => void;
  onCollapseAllTop: () => void;
  mapFilter?: string;
  mapJumpPulsePath?: string | null;
}

export function HwTreeMap({
  nodes,
  selectedKeyword,
  onSelect,
  expanded,
  onToggle,
  onExpandAllTop,
  onCollapseAllTop,
  mapFilter = "",
  mapJumpPulsePath = null,
}: Props) {
  const flat = useMemo(
    () => flattenVisibleTree(nodes, expanded),
    [nodes, expanded]
  );

  useEffect(() => {
    const scrollTarget = selectedKeyword ?? mapJumpPulsePath;
    if (!scrollTarget) return;
    const el = document.querySelector(
      `[data-tree-path="${CSS.escape(scrollTarget)}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedKeyword, mapJumpPulsePath]);

  return (
    <div className="hw-tree-map">
      {nodes.length > 0 && (
        <div className="hw-tree-toolbar">
          <button type="button" className="hw-tree-toolbar-btn" onClick={onExpandAllTop}>
            Expand all
          </button>
          <button type="button" className="hw-tree-toolbar-btn" onClick={onCollapseAllTop}>
            Collapse all
          </button>
        </div>
      )}

      <div className="hw-tree-list" role="tree">
        {flat.map((item) => {
          const { node, path, isLastSibling, ancestorContinues } = item;
          const depth = node.depth;
          const hasChildren = node.children.length > 0;
          const isOpen = expanded.has(path);
          const total = countTotal(node);
          const isSelected = selectedKeyword === path;
          const onPath = isOnSelectedPath(path, selectedKeyword);
          const isRoot = depth === 0;
          const filterActive = mapFilter.trim().length > 0;
          const filterMatch = filterActive && nodeMatchesMapFilter(node, path, mapFilter);
          const filterStrong = filterActive && nodeDirectMatchesMapFilter(node, path, mapFilter);
          const filterDim = filterActive && !filterMatch;
          const jumpPulse = mapJumpPulsePath === path;

          return (
            <div
              key={path}
              data-tree-path={path}
              className={`hw-tree-row-wrap ${onPath ? "on-path" : ""} ${isRoot ? "is-root" : ""} ${filterDim ? "filter-dim" : ""} ${filterMatch ? "filter-match" : ""} ${filterStrong ? "filter-match-strong" : ""} ${jumpPulse ? "map-jump-pulse" : ""}`}
              role="treeitem"
              aria-expanded={hasChildren ? isOpen : undefined}
              style={{ ["--depth" as string]: String(depth) }}
            >
              <div className={`hw-tree-row ${isSelected ? "selected" : ""} ${total === 0 ? "empty" : ""}`}>
                {depth > 1 &&
                  ancestorContinues.slice(0, depth - 1).map((continues, i) => (
                    <span
                      key={`${path}-ind-${i}`}
                      className={`hw-tree-indent ${continues ? "continues" : ""}`}
                    />
                  ))}

                {depth > 0 && (
                  <span className={`hw-tree-branch ${isLastSibling ? "last" : ""}`}>
                    <span className="hw-tree-hline" />
                  </span>
                )}

                {hasChildren ? (
                  <button
                    type="button"
                    className="hw-tree-expand"
                    onClick={() => onToggle(path)}
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    {isOpen ? "▾" : "▸"}
                  </button>
                ) : (
                  <span className="hw-tree-expand leaf" aria-hidden="true" />
                )}

                <button
                  type="button"
                  className="hw-tree-label"
                  onClick={() => onSelect(path, node.procedures)}
                  title={path}
                >
                  <span className="hw-tree-name">{node.display}</span>
                  {total > 0 && <span className="hw-tree-count">{total}</span>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedKeyword && (
        <div className="map-path-strip">
          <span className="path-label">Path</span>
          <code>{getPathLabel(selectedKeyword)}</code>
        </div>
      )}
    </div>
  );
}

export function useHwTreeExpanded(nodes: TreeNode[], contextKey: string) {
  const [expanded, setExpanded] = useState(() => new Set<string>());

  const expandablePaths = useMemo(() => collectExpandablePaths(nodes), [nodes]);

  useEffect(() => {
    setExpanded(new Set());
  }, [contextKey]);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandToPath = useCallback((path: string) => {
    const parts = path.split("/");
    setExpanded((prev) => {
      const next = new Set(prev);
      let acc = "";
      for (let i = 0; i < parts.length; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        next.add(acc);
      }
      return next;
    });
  }, []);

  const expandAllTop = useCallback(() => {
    setExpanded(new Set(expandablePaths));
  }, [expandablePaths]);

  const collapseAllTop = useCallback(() => {
    setExpanded(new Set());
  }, []);

  return { expanded, toggle, expandToPath, expandAllTop, collapseAllTop };
}
