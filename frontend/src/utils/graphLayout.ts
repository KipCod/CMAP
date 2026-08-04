import type { Procedure, TreeNode } from "../types";
import { countTotal } from "./mapUtils";

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  depth: number;
  count: number;
  total: number;
  procedures: Procedure[];
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

const NODE_W = 92;
const NODE_H = 34;
const LEVEL_GAP = 72;
const SIBLING_GAP = 20;
const ROOT_GAP = 40;
const PAD = 36;

function layoutNode(
  node: TreeNode,
  path: string,
  depth: number,
  xOffset: number,
  nodes: GraphNode[],
  edges: GraphEdge[],
  parentId: string | null
): { width: number; centerX: number } {
  const id = path;
  const total = countTotal(node);

  if (parentId) {
    edges.push({ from: parentId, to: id });
  }

  if (node.children.length === 0) {
    const centerX = xOffset + NODE_W / 2;
    nodes.push({
      id,
      label: node.keyword,
      x: centerX,
      y: depth * LEVEL_GAP + PAD,
      depth: node.depth,
      count: node.count,
      total,
      procedures: node.procedures,
    });
    return { width: NODE_W + SIBLING_GAP, centerX };
  }

  let cursor = xOffset;
  const childCenters: number[] = [];

  node.children.forEach((child) => {
    const childPath = `${path}/${child.keyword}`;
    const result = layoutNode(child, childPath, depth + 1, cursor, nodes, edges, id);
    childCenters.push(result.centerX);
    cursor += result.width;
  });

  const totalWidth = cursor - xOffset - SIBLING_GAP;
  const centerX = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;

  nodes.push({
    id,
    label: node.keyword,
    x: centerX,
    y: depth * LEVEL_GAP + PAD,
    depth: node.depth,
    count: node.count,
    total,
    procedures: node.procedures,
  });

  return { width: totalWidth + SIBLING_GAP, centerX };
}

export function buildGraphLayout(roots: TreeNode[]): GraphLayout {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let cursor = PAD;

  roots.forEach((root, i) => {
    const { width } = layoutNode(root, root.keyword, 0, cursor, nodes, edges, null);
    cursor += width + (i < roots.length - 1 ? ROOT_GAP : 0);
  });

  if (nodes.length === 0) {
    return { nodes, edges, width: 400, height: 200 };
  }

  const maxY = Math.max(...nodes.map((n) => n.y));
  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x));

  return {
    nodes,
    edges,
    width: maxX - minX + NODE_W + PAD * 2,
    height: maxY + NODE_H + PAD * 2,
  };
}

export function isOnGraphPath(nodeId: string, selectedId: string | null): boolean {
  if (!selectedId) return false;
  return selectedId === nodeId || selectedId.startsWith(`${nodeId}/`);
}

export { NODE_W, NODE_H };
