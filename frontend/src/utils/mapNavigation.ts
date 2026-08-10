import type { MapKind, Procedure, TreeNode } from "../types";

export function findNodeByPath(nodes: TreeNode[], path: string): TreeNode | null {
  const parts = path.split("/").filter(Boolean);
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

function findProcedureInTree(
  nodes: TreeNode[],
  procName: string,
  mapKind: MapKind,
  prefix = ""
): { mapKind: MapKind; path: string; procedures: Procedure[] } | null {
  const target = procName.toLowerCase();
  let best: { mapKind: MapKind; path: string; procedures: Procedure[] } | null = null;

  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.keyword}` : node.keyword;
    if (node.procedures.some((p) => p.name.toLowerCase() === target)) {
      best = { mapKind, path, procedures: node.procedures };
    }
    const deeper = findProcedureInTree(node.children, procName, mapKind, path);
    if (deeper) best = deeper;
  }
  return best;
}

function findProcedureByTagMatch(
  nodes: TreeNode[],
  procName: string,
  tag: string,
  mapKind: MapKind,
  prefix = ""
): { mapKind: MapKind; path: string; procedures: Procedure[] } | null {
  const target = procName.toLowerCase();
  const tagUpper = tag.trim().toUpperCase();
  let best: { mapKind: MapKind; path: string; procedures: Procedure[] } | null = null;

  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.keyword}` : node.keyword;
    const hasProc = node.procedures.some((p) => p.name.toLowerCase() === target);
    if (hasProc && node.keyword.toUpperCase() === tagUpper) {
      best = { mapKind, path, procedures: node.procedures };
    }
    const deeper = findProcedureByTagMatch(node.children, procName, tag, mapKind, path);
    if (deeper) best = deeper;
  }
  return best;
}

export function findProcedureOnMap(
  hwTree: TreeNode[],
  otherTree: TreeNode[],
  proc: Procedure
): { mapKind: MapKind; path: string; procedures: Procedure[] } | null {
  if (proc.source === "module_all" || proc.machine_type === "ALL") {
    return null;
  }

  const target = proc.name.toLowerCase();

  const byName = findProcedureInTree(hwTree, proc.name, "hw");
  if (byName) return byName;

  const otherByName = findProcedureInTree(otherTree, proc.name, "other");
  if (otherByName) return otherByName;

  for (const tag of proc.tags) {
    const hwTag = findProcedureByTagMatch(hwTree, proc.name, tag, "hw");
    if (hwTag) return hwTag;
    const otherTag = findProcedureByTagMatch(otherTree, proc.name, tag, "other");
    if (otherTag) return otherTag;
  }

  for (const tag of proc.tags) {
    const loc = findKeywordLocation(hwTree, otherTree, tag);
    if (loc?.procedures.some((p) => p.name.toLowerCase() === target)) {
      return loc;
    }
  }

  return null;
}

export function resolveProcedureMapMeta(
  hwTree: TreeNode[],
  otherTree: TreeNode[],
  proc: Procedure
): { mapKind: MapKind; keywordPath: string } | null {
  const loc = findProcedureOnMap(hwTree, otherTree, proc);
  if (!loc) return null;
  return { mapKind: loc.mapKind, keywordPath: loc.path };
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

export function nodeDirectMatchesMapFilter(
  node: TreeNode,
  path: string,
  filter: string
): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return false;
  return (
    node.keyword.toLowerCase().includes(f) ||
    node.display.toLowerCase().includes(f) ||
    path.toLowerCase().includes(f)
  );
}

export function treeHasMapFilterMatch(nodes: TreeNode[], filter: string, prefix = ""): boolean {
  const f = filter.trim();
  if (!f) return true;
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.keyword}` : node.keyword;
    if (nodeMatchesMapFilter(node, path, f)) return true;
  }
  return false;
}

export function mapHasFilterMatch(
  hwTree: TreeNode[],
  otherTree: TreeNode[],
  filter: string
): boolean {
  const f = filter.trim();
  if (!f) return true;
  return treeHasMapFilterMatch(hwTree, f) || treeHasMapFilterMatch(otherTree, f);
}
