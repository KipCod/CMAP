import { useEffect, useState } from "react";
import type { TreeNode } from "../types";

interface Props {
  nodes: TreeNode[];
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
  expanded: Set<string>;
  onToggle: (keyword: string) => void;
}

function countTotal(node: TreeNode): number {
  let total = node.count;
  for (const child of node.children) {
    total += countTotal(child);
  }
  return total;
}

function TreeItem({
  node,
  path,
  selectedKeyword,
  onSelect,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  path: string;
  selectedKeyword: string | null;
  onSelect: Props["onSelect"];
  expanded: Set<string>;
  onToggle: Props["onToggle"];
}) {
  const key = path;
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(key);
  const total = countTotal(node);
  const isSelected = selectedKeyword === key;

  return (
    <div className="tree-item">
      <div
        className={`tree-row ${isSelected ? "selected" : ""} ${total === 0 ? "empty" : ""}`}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            onClick={() => onToggle(key)}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="tree-toggle spacer" />
        )}
        <button
          type="button"
          className="tree-label"
          onClick={() => onSelect(key, node.procedures)}
        >
          <span>{node.display}</span>
          {total > 0 && <span className="badge">{total}</span>}
        </button>
      </div>
      {hasChildren && isOpen && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeItem
              key={`${key}/${child.keyword}`}
              node={child}
              path={`${key}/${child.keyword}`}
              selectedKeyword={selectedKeyword}
              onSelect={onSelect}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function KeywordTree({
  nodes,
  selectedKeyword,
  onSelect,
  expanded,
  onToggle,
}: Props) {
  return (
    <div className="keyword-tree">
      {nodes.map((node) => (
        <TreeItem
          key={node.keyword}
          node={node}
          path={node.keyword}
          selectedKeyword={selectedKeyword}
          onSelect={onSelect}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
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

  return { expanded, toggle };
}
