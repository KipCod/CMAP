export interface AppConfig {
  app_title: string;
  modules: string[];
  parts: Record<
    string,
    {
      label: string;
      machine_types: string[];
    }
  >;
  defaults: {
    module: string;
    part: string;
    machine_type: string;
  };
}

export interface Procedure {
  name: string;
  title: string;
  tags: string[];
  link: string;
  module: string;
  part: string;
  machine_type: string;
  source?: "config" | "module_all";
}

export interface TreeNode {
  keyword: string;
  display: string;
  depth: number;
  count: number;
  children: TreeNode[];
  procedures: Procedure[];
}

export interface ViewData {
  hw_tree: TreeNode[];
  other_tree: TreeNode[];
}

export interface SearchResult {
  scoped: Procedure[];
  global: Procedure[];
  module_all: Procedure[];
}

export type NameMachineIndex = Record<string, string[]>;
export type Theme = "light" | "dark";
export type MapKind = "hw" | "other";
