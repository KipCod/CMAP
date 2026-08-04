import type { TreeNode } from "../types";

export function collectExpandablePaths(nodes: TreeNode[], prefix = ""): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.keyword}` : node.keyword;
    if (node.children.length > 0) {
      paths.push(path);
      paths.push(...collectExpandablePaths(node.children, path));
    }
  }
  return paths;
}

export function countTotal(node: TreeNode): number {
  let total = node.count;
  for (const child of node.children) {
    total += countTotal(child);
  }
  return total;
}

export function parsePath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

export function isOnSelectedPath(nodePath: string, selectedPath: string | null): boolean {
  if (!selectedPath) return false;
  return selectedPath === nodePath || selectedPath.startsWith(`${nodePath}/`);
}

export function getPathLabel(path: string): string {
  return parsePath(path).join(" › ");
}

export interface FlatNode {
  node: TreeNode;
  path: string;
  parentPath: string | null;
  isLastSibling: boolean;
  ancestorContinues: boolean[];
}

export function flattenVisibleTree(
  nodes: TreeNode[],
  expanded: Set<string>,
  prefix = "",
  ancestorContinues: boolean[] = []
): FlatNode[] {
  const result: FlatNode[] = [];

  nodes.forEach((node, index) => {
    const path = prefix ? `${prefix}/${node.keyword}` : node.keyword;
    const isLast = index === nodes.length - 1;
    result.push({
      node,
      path,
      parentPath: prefix || null,
      isLastSibling: isLast,
      ancestorContinues,
    });

    const isOpen = expanded.has(path);
    if (isOpen && node.children.length > 0) {
      result.push(
        ...flattenVisibleTree(node.children, expanded, path, [...ancestorContinues, !isLast])
      );
    }
  });

  return result;
}

export function collectRootStats(nodes: TreeNode[]): { keyword: string; count: number }[] {
  return nodes.map((n) => ({ keyword: n.keyword, count: countTotal(n) }));
}

export function findRootForPath(nodes: TreeNode[], path: string): string | null {
  const root = parsePath(path)[0];
  return nodes.some((n) => n.keyword === root) ? root : null;
}

export function heatLevel(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0;
  return Math.min(1, count / max);
}
