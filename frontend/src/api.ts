import type { AppConfig, NameMachineIndex, SearchResult, ViewData } from "./types";

const API = "/api";

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch(`${API}/config`);
  if (!res.ok) throw new Error("Failed to load config");
  return res.json();
}

export async function fetchView(
  module: string,
  part: string,
  machine: string
): Promise<ViewData> {
  const params = new URLSearchParams({ module, part, machine });
  const res = await fetch(`${API}/view?${params}`);
  if (!res.ok) throw new Error("Failed to load view");
  return res.json();
}

export async function fetchSearch(
  q: string,
  module: string,
  part: string,
  machine: string
): Promise<SearchResult> {
  const params = new URLSearchParams({ q, module, part, machine });
  const res = await fetch(`${API}/search?${params}`);
  if (!res.ok) throw new Error("Failed to search");
  return res.json();
}

export async function fetchNameMachines(
  module: string,
  part: string
): Promise<NameMachineIndex> {
  const params = new URLSearchParams({ module, part });
  const res = await fetch(`${API}/name-machines?${params}`);
  if (!res.ok) throw new Error("Failed to load name index");
  return res.json();
}
