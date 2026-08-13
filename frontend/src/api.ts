import type { AppConfig, NameMachineIndex, Procedure, SearchResult, ViewData } from "./types";

const API = "/api";

const inflightViews = new Map<string, Promise<ViewData>>();

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
  const key = `${module}|${part}|${machine}`;
  const pending = inflightViews.get(key);
  if (pending) return pending;

  const params = new URLSearchParams({ module, part, machine });
  const promise = fetch(`${API}/view?${params}`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load view");
      return res.json() as Promise<ViewData>;
    })
    .finally(() => {
      inflightViews.delete(key);
    });

  inflightViews.set(key, promise);
  return promise;
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

export async function fetchProcedureVariants(
  name: string,
  module: string,
  part: string
): Promise<Procedure[]> {
  const params = new URLSearchParams({ name, module, part });
  const res = await fetch(`${API}/procedure-variants?${params}`);
  if (!res.ok) throw new Error("Failed to load procedure variants");
  return res.json();
}
