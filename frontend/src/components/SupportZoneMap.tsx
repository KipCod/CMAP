import { useCallback, useEffect, useMemo, useState } from "react";
import type { TreeNode } from "../types";
import { countTotal, getPathLabel, isOnSelectedPath, collectExpandablePaths } from "../utils/mapUtils";
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

function KeywordChip({
  node,
  path,
  selectedKeyword,
  onSelect,
  mapFilter = "",
  mapJumpPulsePath = null,
}: {
  node: TreeNode;
  path: string;
  selectedKeyword: string | null;
  onSelect: Props["onSelect"];
  mapFilter?: string;
  mapJumpPulsePath?: string | null;
}) {
  const total = countTotal(node);
  const isSelected = selectedKeyword === path;
  const onPath = isOnSelectedPath(path, selectedKeyword);
  const filterActive = mapFilter.trim().length > 0;
  const filterMatch = filterActive && nodeMatchesMapFilter(node, path, mapFilter);
  const filterStrong = filterActive && nodeDirectMatchesMapFilter(node, path, mapFilter);
  const filterDim = filterActive && !filterMatch;
  const jumpPulse = mapJumpPulsePath === path;

  return (
    <button
      type="button"
      data-support-path={path}
      className={`support-chip ${isSelected ? "selected" : ""} ${onPath ? "on-path" : ""} ${total === 0 ? "empty" : ""} ${filterDim ? "filter-dim" : ""} ${filterMatch ? "filter-match" : ""} ${filterStrong ? "filter-match-strong" : ""} ${jumpPulse ? "map-jump-pulse" : ""}`}
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
  mapFilter = "",
  mapJumpPulsePath = null,
}: {
  node: TreeNode;
  path: string;
  depth: number;
  selectedKeyword: string | null;
  onSelect: Props["onSelect"];
  expanded: Set<string>;
  onToggle: (path: string) => void;
  mapFilter?: string;
  mapJumpPulsePath?: string | null;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(path);
  const total = countTotal(node);
  const isSelected = selectedKeyword === path;
  const onPath = isOnSelectedPath(path, selectedKeyword);
  const filterActive = mapFilter.trim().length > 0;
  const filterMatch = filterActive && nodeMatchesMapFilter(node, path, mapFilter);
  const filterStrong = filterActive && nodeDirectMatchesMapFilter(node, path, mapFilter);
  const filterDim = filterActive && !filterMatch;
  const jumpPulse = mapJumpPulsePath === path;

  const branches = node.children.filter((c) => c.children.length > 0);
  const leaves = node.children.filter((c) => c.children.length === 0);

  return (
    <div
      className={`support-branch depth-${depth} ${onPath ? "on-path" : ""} ${filterDim ? "filter-dim" : ""} ${filterMatch ? "filter-match" : ""} ${filterStrong ? "filter-match-strong" : ""} ${jumpPulse ? "map-jump-pulse" : ""}`}
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
                    mapFilter={mapFilter}
                    mapJumpPulsePath={mapJumpPulsePath}
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
                mapFilter={mapFilter}
                mapJumpPulsePath={mapJumpPulsePath}
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
  mapFilter = "",
  mapJumpPulsePath = null,
}: Props) {
  useEffect(() => {
    const scrollTarget = selectedKeyword ?? mapJumpPulsePath;
    if (!scrollTarget) return;
    const el = document.querySelector(
      `[data-support-path="${CSS.escape(scrollTarget)}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedKeyword, mapJumpPulsePath]);

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

        const filterActive = mapFilter.trim().length > 0;
        const filterMatch = filterActive && nodeMatchesMapFilter(region, path, mapFilter);
        const filterStrong = filterActive && nodeDirectMatchesMapFilter(region, path, mapFilter);
        const filterDim = filterActive && !filterMatch;
        const jumpPulse = mapJumpPulsePath === path;

        return (
          <section
            key={path}
            data-support-path={path}
            className={`support-region ${onPath ? "on-path" : ""} ${isOpen ? "open" : ""} ${filterDim ? "filter-dim" : ""} ${filterMatch ? "filter-match" : ""} ${filterStrong ? "filter-match-strong" : ""} ${jumpPulse ? "map-jump-pulse" : ""}`}
          >
            <header className={`support-region-header ${isSelected ? "selected" : ""} ${jumpPulse ? "map-jump-pulse" : ""}`}>
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
                          mapFilter={mapFilter}
                          mapJumpPulsePath={mapJumpPulsePath}
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
                    mapFilter={mapFilter}
                    mapJumpPulsePath={mapJumpPulsePath}
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

export function useSupportExpanded(nodes: TreeNode[], contextKey: string) {
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
