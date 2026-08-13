import { useEffect, useMemo, useState } from "react";
import type { Procedure } from "../types";
import type { FavoriteEntry, FavoriteFolder } from "../utils/favorites";
import {
  canExpandProcedureToAllConfigs,
  configLabel,
  displayTitle,
  missingVariantsInFolder,
} from "../utils/favorites";
import { fetchProcedureVariants } from "../api";
import { procedureId } from "../utils/cartUtils";
import { getPathLabel } from "../utils/mapUtils";

interface Props {
  folder: FavoriteFolder;
  module: string;
  part: string;
  machine: string;
  cartIds: Set<string>;
  onAddToCart: (p: Procedure) => void;
  onRemove: (entryId: string) => void;
  onRename: () => void;
  onShowOnMap?: (p: Procedure) => void;
  onExpandToAllConfigs?: (proc: Procedure) => void;
  onExpandAllVisible?: (procedures: Procedure[]) => void;
}

function keywordLabel(entry: FavoriteEntry): string {
  if (entry.keywordPath) {
    const map = entry.mapKind === "hw" ? "HW" : "Support";
    return `${map} · ${getPathLabel(entry.keywordPath)}`;
  }
  if (entry.procedure.source === "module_all" || entry.procedure.machine_type === "ALL") {
    return "no config";
  }
  return "—";
}

function expandDisabledTitle(canExpand: boolean, variantCount: number): string {
  if (variantCount <= 1) return "No other machine configs for this procedure name";
  if (!canExpand) return "Already added for all available configs";
  return "Add missing configs to this folder";
}

export function FavoritesPanel({
  folder,
  module,
  part,
  machine,
  cartIds,
  onAddToCart,
  onRemove,
  onRename,
  onShowOnMap,
  onExpandToAllConfigs,
  onExpandAllVisible,
}: Props) {
  const rows = folder.items.filter(
    (item) =>
      item.procedure.module === module &&
      item.procedure.part === part &&
      item.procedure.machine_type === machine
  );

  const [variantsByName, setVariantsByName] = useState<Map<string, Procedure[]>>(new Map());

  const variantNamesKey = useMemo(
    () =>
      [...new Set(rows.map((r) => r.procedure.name))]
        .sort()
        .join("\0"),
    [rows]
  );

  useEffect(() => {
    let cancelled = false;
    const names = variantNamesKey ? variantNamesKey.split("\0") : [];
    const filtered = folder.items.filter(
      (item) =>
        item.procedure.module === module &&
        item.procedure.part === part &&
        item.procedure.machine_type === machine
    );

    (async () => {
      const next = new Map<string, Procedure[]>();
      for (const name of names) {
        const sample = filtered.find((r) => r.procedure.name === name)?.procedure;
        if (!sample || sample.source === "module_all" || sample.machine_type === "ALL") continue;
        try {
          const variants = await fetchProcedureVariants(name, sample.module, sample.part);
          if (!cancelled) next.set(name, variants);
        } catch {
          if (!cancelled) next.set(name, []);
        }
      }
      if (!cancelled) setVariantsByName(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [folder.id, folder.items, module, part, machine, variantNamesKey]);

  const expandAllProcedures = useMemo(() => {
    const seen = new Set<string>();
    const list: Procedure[] = [];
    for (const row of rows) {
      const name = row.procedure.name;
      if (seen.has(name)) continue;
      const variants = variantsByName.get(name) ?? [];
      if (!canExpandProcedureToAllConfigs(folder, variants)) continue;
      seen.add(name);
      list.push(row.procedure);
    }
    return list;
  }, [rows, variantsByName, folder]);

  const canExpandAll = expandAllProcedures.length > 0;

  return (
    <div className="favorites-panel">
      <header className="favorites-panel-header">
        <div>
          <div className="favorites-panel-title-row">
            <h2>{folder.name}</h2>
            <button
              type="button"
              className="fav-action-btn fav-panel-rename"
              onClick={onRename}
              title="Rename folder"
            >
              ✎
            </button>
          </div>
          <p className="favorites-panel-sub">
            {module} · {part} · {machine} — {rows.length} item{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        {onExpandAllVisible && rows.length > 0 && (
          <button
            type="button"
            className="fav-expand-all-btn"
            disabled={!canExpandAll}
            title={
              canExpandAll
                ? `Add missing configs for ${expandAllProcedures.length} procedure name(s)`
                : "All visible items are already expanded or have no other configs"
            }
            onClick={() => onExpandAllVisible(expandAllProcedures)}
          >
            Add all to configs
          </button>
        )}
      </header>

      {rows.length === 0 ? (
        <p className="favorites-panel-empty">
          No favorites in this folder for the current Part / Machine selection.
        </p>
      ) : (
        <div className="favorites-table-wrap">
          <table className="favorites-table">
            <thead>
              <tr>
                <th className="fav-col-keyword">Keyword path</th>
                <th className="fav-col-name">Name</th>
                <th className="fav-col-title">Title</th>
                <th className="fav-col-config">Config</th>
                <th className="fav-col-link">Link</th>
                <th className="fav-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => {
                const p = entry.procedure;
                const id = procedureId(p);
                const inCart = cartIds.has(id);
                const canMap =
                  p.source !== "module_all" &&
                  p.machine_type !== "ALL" &&
                  Boolean(entry.keywordPath || p.tags.length > 0);
                const variants = variantsByName.get(p.name) ?? [];
                const canExpand = canExpandProcedureToAllConfigs(folder, variants);
                const missingCount = missingVariantsInFolder(folder, variants).length;
                return (
                  <tr key={entry.id}>
                    <td className="fav-col-keyword">
                      <code>{keywordLabel(entry)}</code>
                    </td>
                    <td className="fav-col-name">
                      <span className="proc-name">{p.name}</span>
                    </td>
                    <td className="fav-col-title">{displayTitle(p)}</td>
                    <td className="fav-col-config">
                      <span className="search-config">[{configLabel(p)}]</span>
                    </td>
                    <td className="fav-col-link">
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="proc-name-link">
                        Open
                      </a>
                    </td>
                    <td className="fav-col-actions">
                      <div className="favorites-row-actions">
                        {onExpandToAllConfigs && (
                          <button
                            type="button"
                            className="fav-expand-configs-btn"
                            disabled={!canExpand}
                            title={expandDisabledTitle(canExpand, variants.length)}
                            onClick={() => onExpandToAllConfigs(p)}
                          >
                            {canExpand ? `+${missingCount} configs` : "All configs"}
                          </button>
                        )}
                        {onShowOnMap && canMap && (
                          <button
                            type="button"
                            className="search-map-btn fav-map-btn"
                            onClick={() => onShowOnMap(p)}
                            title="Show on MAP"
                          >
                            MAP
                          </button>
                        )}
                        <button
                          type="button"
                          className={`cart-add-btn ${inCart ? "in-cart" : ""}`}
                          onClick={() => onAddToCart(p)}
                          disabled={inCart}
                          title={inCart ? "In cart" : "Add to cart"}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6h15l-1.5 9h-11z" />
                            <circle cx="9" cy="20" r="1.5" />
                            <circle cx="17" cy="20" r="1.5" />
                            <path d="M6 6L5 3H2" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="favorites-row-remove"
                          onClick={() => onRemove(entry.id)}
                          title="Remove from folder"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
