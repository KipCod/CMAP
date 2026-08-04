import { useCallback, useEffect, useMemo, useState } from "react";
import type { TreeNode } from "../types";
import { countTotal, getPathLabel, isOnSelectedPath, collectExpandablePaths } from "../utils/mapUtils";

interface Props {
  nodes: TreeNode[];
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
  expanded: Set<string>;
  onToggle: (keyword: string) => void;
  onExpandAllTop: () => void;
  onCollapseAllTop: () => void;
}

function KeywordChip({
  node,
  path,
  selectedKeyword,
  onSelect,
}: {
  node: TreeNode;
  path: string;
  selectedKeyword: string | null;
  onSelect: Props["onSelect"];
}) {
  const total = countTotal(node);
  const isSelected = selectedKeyword === path;
  const onPath = isOnSelectedPath(path, selectedKeyword);

  return (
    <button
      type="button"
      className={`support-chip ${isSelected ? "selected" : ""} ${onPath ? "on-path" : ""} ${total === 0 ? "empty" : ""}`}
      onClick={() => onSelect(path, node.procedures)}
      title={path}
    >
      <span className="support-chip-label">{node.display}</span>
      {total > 0 && <span className="support-chip-count">{total}</span>}
    </button>
  );
}

function SupportBranch({
  node,
  path,
  depth,
  selectedKeyword,
  onSelect,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  path: string;
  depth: number;
  selectedKeyword: string | null;
  onSelect: Props["onSelect"];
  expanded: Set<string>;
  onToggle: (path: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(path);
  const total = countTotal(node);
  const isSelected = selectedKeyword === path;
  const onPath = isOnSelectedPath(path, selectedKeyword);

  const branches = node.children.filter((c) => c.children.length > 0);
  const leaves = node.children.filter((c) => c.children.length === 0);

  return (
    <div
      className={`support-branch depth-${depth} ${onPath ? "on-path" : ""}`}
      style={{ ["--depth" as string]: String(depth) }}
    >
      <div className={`support-branch-header ${isSelected ? "selected" : ""}`}>
        {hasChildren && (
          <button
            type="button"
            className="support-expand"
            onClick={() => onToggle(path)}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
        )}
        <button
          type="button"
          className="support-branch-label"
          onClick={() => onSelect(path, node.procedures)}
        >
          {node.display}
          {total > 0 && <span className="support-branch-count">{total}</span>}
        </button>
      </div>

      {hasChildren && isOpen && (
        <div className="support-branch-body">
          {leaves.length > 0 && (
            <div className="support-chip-grid">
              {leaves.map((leaf) => {
                const leafPath = `${path}/${leaf.keyword}`;
                return (
                  <KeywordChip
                    key={leafPath}
                    node={leaf}
                    path={leafPath}
                    selectedKeyword={selectedKeyword}
                    onSelect={onSelect}
                  />
                );
              })}
            </div>
          )}
          {branches.map((child) => {
            const childPath = `${path}/${child.keyword}`;
            return (
              <SupportBranch
                key={childPath}
                node={child}
                path={childPath}
                depth={depth + 1}
                selectedKeyword={selectedKeyword}
                onSelect={onSelect}
                expanded={expanded}
                onToggle={onToggle}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SupportZoneMap({
  nodes,
  selectedKeyword,
  onSelect,
  expanded,
  onToggle,
  onExpandAllTop,
  onCollapseAllTop,
}: Props) {
  return (
    <div className="support-zone-map">
      {nodes.length > 0 && (
        <div className="support-map-toolbar">
          <button type="button" className="support-map-toolbar-btn" onClick={onExpandAllTop}>
            Expand all
          </button>
          <button type="button" className="support-map-toolbar-btn" onClick={onCollapseAllTop}>
            Collapse all
          </button>
        </div>
      )}
      {nodes.map((region) => {
        const path = region.keyword;
        const isOpen = expanded.has(path);
        const total = countTotal(region);
        const isSelected = selectedKeyword === path;
        const onPath = isOnSelectedPath(path, selectedKeyword);
        const branches = region.children.filter((c) => c.children.length > 0);
        const leaves = region.children.filter((c) => c.children.length === 0);

        return (
          <section
            key={path}
            className={`support-region ${onPath ? "on-path" : ""} ${isOpen ? "open" : ""}`}
          >
            <header className={`support-region-header ${isSelected ? "selected" : ""}`}>
              <button
                type="button"
                className="support-expand"
                onClick={() => onToggle(path)}
                aria-label={isOpen ? "Collapse region" : "Expand region"}
              >
                {isOpen ? "▾" : "▸"}
              </button>
              <button
                type="button"
                className="support-region-title"
                onClick={() => onSelect(path, region.procedures)}
              >
                {region.display}
                {total > 0 && <span className="support-region-count">{total}</span>}
              </button>
            </header>

            {isOpen && (
              <div className="support-region-body">
                {leaves.length > 0 && (
                  <div className="support-chip-grid top-level">
                    {leaves.map((leaf) => {
                      const leafPath = `${path}/${leaf.keyword}`;
                      return (
                        <KeywordChip
                          key={leafPath}
                          node={leaf}
                          path={leafPath}
                          selectedKeyword={selectedKeyword}
                          onSelect={onSelect}
                        />
                      );
                    })}
                  </div>
                )}
                {branches.map((child) => (
                  <SupportBranch
                    key={`${path}/${child.keyword}`}
                    node={child}
                    path={`${path}/${child.keyword}`}
                    depth={1}
                    selectedKeyword={selectedKeyword}
                    onSelect={onSelect}
                    expanded={expanded}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {selectedKeyword && (
        <div className="map-path-strip">
          <span className="path-label">Path</span>
          <code>{getPathLabel(selectedKeyword)}</code>
        </div>
      )}
    </div>
  );
}

export function useSupportExpanded(nodes: TreeNode[]) {
  const [expanded, setExpanded] = useState(() => new Set<string>());

  const expandablePaths = useMemo(() => collectExpandablePaths(nodes), [nodes]);

  useEffect(() => {
    setExpanded(new Set());
  }, [nodes]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandToPath = (path: string) => {
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
  };

  const expandAllTop = useCallback(() => {
    setExpanded(new Set(expandablePaths));
  }, [expandablePaths]);

  const collapseAllTop = useCallback(() => {
    setExpanded(new Set());
  }, []);

  return { expanded, toggle, expandToPath, expandAllTop, collapseAllTop };
}
