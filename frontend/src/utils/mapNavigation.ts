import type { MapKind, Procedure, TreeNode } from "../types";

export interface ProcedureMapLocation {
  mapKind: MapKind;
  path: string;
  procedures: Procedure[];
}

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
): ProcedureMapLocation | null {
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

function pushUniqueLocation(
  out: ProcedureMapLocation[],
  loc: ProcedureMapLocation
): void {
  if (out.some((x) => x.mapKind === loc.mapKind && x.path === loc.path)) return;
  out.push(loc);
}

function collectProcedureInTree(
  nodes: TreeNode[],
  procName: string,
  mapKind: MapKind,
  prefix = "",
  out: ProcedureMapLocation[] = []
): ProcedureMapLocation[] {
  const target = procName.toLowerCase();

  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.keyword}` : node.keyword;
    if (node.procedures.some((p) => p.name.toLowerCase() === target)) {
      pushUniqueLocation(out, { mapKind, path, procedures: node.procedures });
    }
    collectProcedureInTree(node.children, procName, mapKind, path, out);
  }
  return out;
}

function collectProcedureByTagMatch(
  nodes: TreeNode[],
  procName: string,
  tag: string,
  mapKind: MapKind,
  prefix = "",
  out: ProcedureMapLocation[] = []
): ProcedureMapLocation[] {
  const target = procName.toLowerCase();
  const tagUpper = tag.trim().toUpperCase();

  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.keyword}` : node.keyword;
    const hasProc = node.procedures.some((p) => p.name.toLowerCase() === target);
    if (hasProc && node.keyword.toUpperCase() === tagUpper) {
      pushUniqueLocation(out, { mapKind, path, procedures: node.procedures });
    }
    collectProcedureByTagMatch(node.children, procName, tag, mapKind, path, out);
  }
  return out;
}

function buildPathOrderMap(
  nodes: TreeNode[],
  prefix = "",
  order = new Map<string, number>(),
  counter = { n: 0 }
): Map<string, number> {
  for (const node of nodes) {
    const path = prefix ? `${prefix}/${node.keyword}` : node.keyword;
    order.set(path, counter.n++);
    buildPathOrderMap(node.children, path, order, counter);
  }
  return order;
}

export function pickPrimaryProcedureLocation(
  locations: ProcedureMapLocation[],
  hwTree: TreeNode[],
  otherTree: TreeNode[]
): ProcedureMapLocation | null {
  if (locations.length === 0) return null;

  const hwLocs = locations.filter((l) => l.mapKind === "hw");
  const pool = hwLocs.length > 0 ? hwLocs : locations.filter((l) => l.mapKind === "other");
  const tree = hwLocs.length > 0 ? hwTree : otherTree;
  const order = buildPathOrderMap(tree);

  return pool
    .slice()
    .sort((a, b) => (order.get(a.path) ?? 9999) - (order.get(b.path) ?? 9999))[0];
}

export function findAllProcedureOnMap(
  hwTree: TreeNode[],
  otherTree: TreeNode[],
  proc: Procedure
): ProcedureMapLocation[] {
  if (proc.source === "module_all" || proc.machine_type === "ALL") {
    return [];
  }

  const target = proc.name.toLowerCase();
  const out: ProcedureMapLocation[] = [];

  collectProcedureInTree(hwTree, proc.name, "hw", "", out);
  collectProcedureInTree(otherTree, proc.name, "other", "", out);

  for (const tag of proc.tags) {
    collectProcedureByTagMatch(hwTree, proc.name, tag, "hw", "", out);
    collectProcedureByTagMatch(otherTree, proc.name, tag, "other", "", out);
  }

  for (const tag of proc.tags) {
    const loc = findKeywordLocation(hwTree, otherTree, tag);
    if (loc?.procedures.some((p) => p.name.toLowerCase() === target)) {
      pushUniqueLocation(out, loc);
    }
  }

  return out;
}

export function findProcedureOnMap(
  hwTree: TreeNode[],
  otherTree: TreeNode[],
  proc: Procedure
): ProcedureMapLocation | null {
  const all = findAllProcedureOnMap(hwTree, otherTree, proc);
  return pickPrimaryProcedureLocation(all, hwTree, otherTree);
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

export function pulsePathsForLocation(
  locations: ProcedureMapLocation[],
  primary: ProcedureMapLocation
): string[] {
  return locations.filter((l) => l.mapKind === primary.mapKind).map((l) => l.path);
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

export function isMapJumpPulsePath(
  paths: string[] | null | undefined,
  path: string
): boolean {
  return paths?.includes(path) ?? false;
}

export function primaryMapJumpScrollPath(
  selectedKeyword: string | null,
  paths: string[] | null | undefined
): string | null {
  return selectedKeyword ?? paths?.[0] ?? null;
}
