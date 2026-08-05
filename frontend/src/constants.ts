import type { TreeNode } from "./types";

/** Stable fallback so hooks don't see a new [] reference every render. */
export const EMPTY_TREE_NODES: TreeNode[] = [];
