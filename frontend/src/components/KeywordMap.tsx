import { useEffect, useMemo, useState } from "react";
import type { MapKind, TreeNode } from "../types";
import {
  countTotal,
  flattenVisibleTree,
  getPathLabel,
  heatLevel,
  isOnSelectedPath,
} from "../utils/mapUtils";

interface Props {
  nodes: TreeNode[];
  mapKind: MapKind;
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
  expanded: Set<string>;
  onToggle: (keyword: string) => void;
}

const DEPTH_LABELS = ["Region", "District", "Point"];

function depthLabel(depth: number): string {
  return DEPTH_LABELS[Math.min(depth, DEPTH_LABELS.length - 1)];
}

export function KeywordMap({
  nodes,
  mapKind,
  selectedKeyword,
  onSelect,
  expanded,
  onToggle,
}: Props) {
  const flat = useMemo(
    () => flattenVisibleTree(nodes, expanded),
    [nodes, expanded]
  );

  const maxCount = useMemo(() => {
    let max = 0;
    const walk = (list: TreeNode[]) => {
      for (const n of list) {
        const t = countTotal(n);
        if (t > max) max = t;
        walk(n.children);
      }
    };
    walk(nodes);
    return max;
  }, [nodes]);

  return (
    <div className={`map-canvas map-canvas-${mapKind}`}>
      <div className="map-grid" aria-hidden="true" />

      <div className="map-legend">
        <span className="legend-item">
          <span className="legend-dot region" /> Region
        </span>
        <span className="legend-item">
          <span className="legend-dot district" /> District
        </span>
        <span className="legend-item">
          <span className="legend-dot point" /> Point
        </span>
        <span className="legend-item heat">Darker = more procedures</span>
      </div>

      <div className="map-nodes">
        {flat.map(({ node, path }) => {
          const total = countTotal(node);
          const hasChildren = node.children.length > 0;
          const isOpen = expanded.has(path);
          const isSelected = selectedKeyword === path;
          const onPath = isOnSelectedPath(path, selectedKeyword);
          const intensity = heatLevel(total, maxCount);

          return (
            <div
              key={path}
              className={`map-node-row depth-${node.depth} ${onPath ? "on-path" : ""} ${isSelected ? "selected" : ""} ${total === 0 ? "empty" : ""}`}
              style={{ paddingLeft: `${node.depth * 22 + 8}px` }}
            >
              {node.depth > 0 && (
                <span className={`branch-marker ${onPath ? "active" : ""}`} aria-hidden="true" />
              )}

              <div
                className={`map-node-card depth-${node.depth}`}
                style={{ ["--heat" as string]: String(intensity) }}
              >
                {hasChildren && (
                  <button
                    type="button"
                    className="map-expand"
                    onClick={() => onToggle(path)}
                    aria-label={isOpen ? "Collapse branch" : "Expand branch"}
                  >
                    {isOpen ? "−" : "+"}
                  </button>
                )}

                <button
                  type="button"
                  className="map-node-body"
                  onClick={() => onSelect(path, node.procedures)}
                >
                  <span className="map-node-type">{depthLabel(node.depth)}</span>
                  <span className="map-node-name">{node.display}</span>
                  {total > 0 && <span className="map-node-count">{total}</span>}
                  {isSelected && (
                    <span className="map-pin" title="You are here">
                      <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor">
                        <path d="M7 0C3.13 0 0 3.13 0 7c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 7 4.5a2.5 2.5 0 0 1 0 5z" />
                      </svg>
                    </span>
                  )}
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

export function useDefaultExpanded(nodes: TreeNode[]) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = new Set<string>();
    const walk = (list: TreeNode[], prefix: string) => {
      for (const n of list) {
        const p = prefix ? `${prefix}/${n.keyword}` : n.keyword;
        if (n.children.length > 0) {
          next.add(p);
          walk(n.children, p);
        }
      }
    };
    walk(nodes, "");
    setExpanded(next);
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
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        next.add(acc);
      }
      return next;
    });
  };

  return { expanded, toggle, expandToPath };
}
