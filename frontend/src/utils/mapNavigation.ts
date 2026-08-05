import type { MapKind, Procedure, TreeNode } from "../types";
import { parsePath } from "./mapUtils";

export function findNodeByPath(nodes: TreeNode[], path: string): TreeNode | null {
  const parts = parsePath(path);
  let level = nodes;
  let found: TreeNode | null = null;
  for (const part of parts) {
    found = level.find((n) => n.keyword.toUpperCase() === part.toUpperCase()) ?? null;
    if (!found) return null;
    level = found.children;
  }
  return found;
}

function findDeepestPathByKeyword(
  nodes: TreeNode[],
  keyword: string,
  prefix = ""
): string | null {
  const kw = keyword.trim().toUpperCase();
  let deepest: string | null = null;

  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.keyword}` : node.keyword;
    if (node.keyword.toUpperCase() === kw) deepest = path;
    const child = findDeepestPathByKeyword(node.children, kw, path);
    if (child) deepest = child;
  }
  return deepest;
}

export function findKeywordLocation(
  hwTree: TreeNode[],
  otherTree: TreeNode[],
  keyword: string
): { mapKind: MapKind; path: string; procedures: Procedure[] } | null {
  const hwPath = findDeepestPathByKeyword(hwTree, keyword);
  if (hwPath) {
    const node = findNodeByPath(hwTree, hwPath)!;
    return { mapKind: "hw", path: hwPath, procedures: node.procedures };
  }
  const otherPath = findDeepestPathByKeyword(otherTree, keyword);
  if (otherPath) {
    const node = findNodeByPath(otherTree, otherPath)!;
    return { mapKind: "other", path: otherPath, procedures: node.procedures };
  }
  return null;
}

export function findProcedureOnMap(
  hwTree: TreeNode[],
  otherTree: TreeNode[],
  proc: Procedure
): { mapKind: MapKind; path: string; procedures: Procedure[] } | null {
  for (const tag of proc.tags) {
    const loc = findKeywordLocation(hwTree, otherTree, tag);
    if (loc) return loc;
  }
  return null;
}

export function pathMatchesMapFilter(path: string, filter: string): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  return path.toLowerCase().includes(f);
}

export function nodeMatchesMapFilter(
  node: TreeNode,
  path: string,
  filter: string
): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  if (node.keyword.toLowerCase().includes(f) || node.display.toLowerCase().includes(f)) {
    return true;
  }
  return node.children.some((child) => {
    const childPath = path ? `${path}/${child.keyword}` : child.keyword;
    return nodeMatchesMapFilter(child, childPath, filter);
  });
}
