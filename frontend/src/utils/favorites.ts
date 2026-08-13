import type { MapKind, Procedure } from "../types";
import { procedureId } from "./cartUtils";

export interface FavoriteEntry {
  id: string;
  procedure: Procedure;
  mapKind?: MapKind;
  keywordPath?: string;
  addedAt: number;
}

export interface FavoriteFolder {
  id: string;
  name: string;
  collapsed: boolean;
  items: FavoriteEntry[];
}

export interface FavoritesExport {
  version: 1;
  exportedAt: string;
  folders: FavoriteFolder[];
}

const STORAGE_KEY = "coachmap-favorites";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadFavorites(): FavoriteFolder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteFolder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(folders: FavoriteFolder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

export function promptFolderName(defaultName = ""): string | null {
  const name = window.prompt("Folder name:", defaultName);
  if (name === null) return null;
  const trimmed = name.trim();
  if (!trimmed) {
    window.alert("Folder name cannot be empty.");
    return null;
  }
  return trimmed;
}

export function createFolder(
  name: string,
  folders: FavoriteFolder[]
): { folders: FavoriteFolder[]; id: string } {
  const folder: FavoriteFolder = {
    id: newId(),
    name: name.trim() || "New folder",
    collapsed: false,
    items: [],
  };
  const next = [...folders, folder];
  saveFavorites(next);
  return { folders: next, id: folder.id };
}

export function renameFolder(
  folders: FavoriteFolder[],
  folderId: string,
  name: string
): FavoriteFolder[] {
  const next = folders.map((f) =>
    f.id === folderId ? { ...f, name: name.trim() || f.name } : f
  );
  saveFavorites(next);
  return next;
}

export function deleteFolder(folders: FavoriteFolder[], folderId: string): FavoriteFolder[] {
  const next = folders.filter((f) => f.id !== folderId);
  saveFavorites(next);
  return next;
}

export function toggleFolderCollapsed(
  folders: FavoriteFolder[],
  folderId: string
): FavoriteFolder[] {
  const next = folders.map((f) =>
    f.id === folderId ? { ...f, collapsed: !f.collapsed } : f
  );
  saveFavorites(next);
  return next;
}

export function isInFavorites(folders: FavoriteFolder[], proc: Procedure): boolean {
  const id = procedureId(proc);
  return folders.some((f) => f.items.some((item) => procedureId(item.procedure) === id));
}

export function addToFolder(
  folders: FavoriteFolder[],
  folderId: string,
  proc: Procedure,
  meta?: { mapKind?: MapKind; keywordPath?: string }
): FavoriteFolder[] {
  const pid = procedureId(proc);
  const next = folders.map((folder) => {
    if (folder.id !== folderId) return folder;
    if (folder.items.some((item) => procedureId(item.procedure) === pid)) {
      return folder;
    }
    const entry: FavoriteEntry = {
      id: newId(),
      procedure: proc,
      mapKind: meta?.mapKind,
      keywordPath: meta?.keywordPath,
      addedAt: Date.now(),
    };
    return { ...folder, items: [...folder.items, entry] };
  });
  saveFavorites(next);
  return next;
}

export function addManyToFolder(
  folders: FavoriteFolder[],
  folderId: string,
  procedures: Procedure[],
  metaFor?: (proc: Procedure) => { mapKind?: MapKind; keywordPath?: string } | undefined
): FavoriteFolder[] {
  let next = folders;
  for (const proc of procedures) {
    next = addToFolder(next, folderId, proc, metaFor?.(proc));
  }
  return next;
}

/** Variants in folder scope that are not yet saved in the folder. */
export function missingVariantsInFolder(
  folder: FavoriteFolder,
  variants: Procedure[]
): Procedure[] {
  const inFolder = new Set(folder.items.map((item) => procedureId(item.procedure)));
  return variants.filter((v) => !inFolder.has(procedureId(v)));
}

/** True when other configs exist and at least one variant is not in the folder yet. */
export function canExpandProcedureToAllConfigs(
  folder: FavoriteFolder,
  variants: Procedure[]
): boolean {
  if (variants.length <= 1) return false;
  return missingVariantsInFolder(folder, variants).length > 0;
}

export function removeFromFavorites(
  folders: FavoriteFolder[],
  proc: Procedure
): FavoriteFolder[] {
  const pid = procedureId(proc);
  const next = folders.map((f) => ({
    ...f,
    items: f.items.filter((item) => procedureId(item.procedure) !== pid),
  }));
  saveFavorites(next);
  return next;
}

export function removeFavoriteEntry(
  folders: FavoriteFolder[],
  folderId: string,
  entryId: string
): FavoriteFolder[] {
  const next = folders.map((f) =>
    f.id === folderId
      ? { ...f, items: f.items.filter((item) => item.id !== entryId) }
      : f
  );
  saveFavorites(next);
  return next;
}

export function exportSingleFolder(folder: FavoriteFolder): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      folder: { name: folder.name, items: folder.items },
    },
    null,
    2
  );
}

function normalizeImportedItems(raw: unknown): FavoriteEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.items)) {
    return obj.items as FavoriteEntry[];
  }
  if (obj.version === 1 && Array.isArray(obj.folders)) {
    return (obj.folders as FavoriteFolder[]).flatMap((f) => f.items ?? []);
  }
  if (obj.folder && typeof obj.folder === "object") {
    const f = obj.folder as { items?: FavoriteEntry[] };
    return f.items ?? [];
  }
  return [];
}

/** Import procedures into an existing folder; folder name is unchanged. */
export function importIntoFolder(
  folders: FavoriteFolder[],
  targetFolderId: string,
  json: string
): FavoriteFolder[] {
  const parsed = JSON.parse(json) as unknown;
  const incoming = normalizeImportedItems(parsed).map((item) => ({
    ...item,
    id: item.id || newId(),
    addedAt: item.addedAt ?? Date.now(),
  }));

  const next = folders.map((folder) => {
    if (folder.id !== targetFolderId) return folder;
    const seen = new Set(folder.items.map((i) => procedureId(i.procedure)));
    const merged = [...folder.items];
    for (const item of incoming) {
      const pid = procedureId(item.procedure);
      if (seen.has(pid)) continue;
      seen.add(pid);
      merged.push({ ...item, id: newId(), addedAt: Date.now() });
    }
    return { ...folder, items: merged };
  });
  saveFavorites(next);
  return next;
}

export function exportFavorites(folders: FavoriteFolder[]): string {
  const payload: FavoritesExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    folders,
  };
  return JSON.stringify(payload, null, 2);
}

export function importFavorites(
  folders: FavoriteFolder[],
  json: string,
  mode: "merge" | "replace"
): FavoriteFolder[] {
  const parsed = JSON.parse(json) as FavoritesExport;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.folders)) {
    throw new Error("Invalid favorites file");
  }

  const incoming = parsed.folders.map((f) => ({
    ...f,
    id: f.id || newId(),
    collapsed: f.collapsed ?? false,
    items: (f.items ?? []).map((item) => ({
      ...item,
      id: item.id || newId(),
      addedAt: item.addedAt ?? Date.now(),
    })),
  }));

  if (mode === "replace") {
    saveFavorites(incoming);
    return incoming;
  }

  const names = new Set(folders.map((f) => f.name.toLowerCase()));
  const merged = [...folders];
  for (const folder of incoming) {
    let name = folder.name;
    if (names.has(name.toLowerCase())) {
      name = `${name} (imported)`;
    }
    names.add(name.toLowerCase());
    merged.push({ ...folder, id: newId(), name });
  }
  saveFavorites(merged);
  return merged;
}

export function configLabel(proc: Procedure): string {
  if (proc.source === "module_all" || proc.machine_type === "ALL") {
    return `${proc.module}/${proc.part}/all`;
  }
  return `${proc.module}/${proc.part}/${proc.machine_type}`;
}

export function displayTitle(proc: Procedure): string {
  const bracketed = `[${configLabel(proc)}]`;
  if (proc.title.startsWith(bracketed)) {
    return proc.title.slice(bracketed.length).trim();
  }
  return proc.title.replace(/^\[[^\]]+\]\s*/, "").trim();
}
