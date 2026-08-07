import { useRef } from "react";
import type { MapKind, Procedure } from "../types";
import { procedureId } from "../utils/cartUtils";
import { highlightText } from "../utils/searchHighlight";
import { RoutePin } from "./NavIcons";
import { FavoriteStarButton } from "./FavoriteStarButton";
import type { FavoriteFolder } from "../utils/favorites";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  scoped: Procedure[];
  global: Procedure[];
  moduleAll: Procedure[];
  contextLabel: string;
  module: string;
  part: string;
  loading: boolean;
  cartIds: Set<string>;
  onAddToCart: (p: Procedure) => void;
  onShowOnMap?: (p: Procedure) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  favoriteFolders?: FavoriteFolder[];
  onFavoriteAdd?: (folderId: string, proc: Procedure) => void;
  onFavoriteCreateFolder?: (name: string) => string;
  resolveMapMeta?: (proc: Procedure) => { mapKind: MapKind; keywordPath: string } | null;
}

function partAllConfigLabel(module: string, part: string): string {
  return `${module}/${part}/all`;
}

function procedureConfigLabel(p: Procedure): string {
  if (p.source === "module_all" || p.machine_type === "ALL") {
    return partAllConfigLabel(p.module, p.part);
  }
  return `${p.module}/${p.part}/${p.machine_type}`;
}

function procedureDisplayTitle(p: Procedure): string {
  const config = procedureConfigLabel(p);
  const bracketed = `[${config}]`;
  if (p.title.startsWith(bracketed)) {
    return p.title.slice(bracketed.length).trim();
  }
  return p.title.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function ResultList({
  items,
  query,
  cartIds,
  onAddToCart,
  onShowOnMap,
  favoriteFolders = [],
  onFavoriteAdd,
  onFavoriteCreateFolder,
  resolveMapMeta,
}: {
  items: Procedure[];
  query: string;
  cartIds: Set<string>;
  onAddToCart: (p: Procedure) => void;
  onShowOnMap?: (p: Procedure) => void;
  favoriteFolders?: FavoriteFolder[];
  onFavoriteAdd?: (folderId: string, proc: Procedure) => void;
  onFavoriteCreateFolder?: (name: string) => string;
  resolveMapMeta?: (proc: Procedure) => { mapKind: MapKind; keywordPath: string } | null;
}) {
  if (items.length === 0) {
    return <p className="search-empty">No matches.</p>;
  }
  return (
    <ul className="search-results">
      {items.map((p) => {
        const config = procedureConfigLabel(p);
        const title = procedureDisplayTitle(p);
        const id = procedureId(p);
        const inCart = cartIds.has(id);
        const canMap =
          onShowOnMap &&
          p.source !== "module_all" &&
          p.machine_type !== "ALL";
        return (
          <li
            key={`${p.source ?? "config"}-${p.module}-${p.part}-${p.machine_type}-${p.name}`}
            className="search-item"
          >
            <div className="search-item-row">
              <div className="search-item-main">
                <div className="search-item-line">
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="proc-name proc-name-link search-name-link"
                  >
                    {highlightText(p.name, query)}
                  </a>
                  <span className="search-config">[{config}]</span>
                  <span className="search-title">{highlightText(title, query)}</span>
                </div>
                {p.tags.length > 0 && (
                  <div className="search-item-tags">
                    {p.tags.map((t) => (
                      <span key={t} className="tag-chip search-tag-chip">
                        {highlightText(t, query)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="search-item-actions">
                {canMap && (
                  <button
                    type="button"
                    className="search-map-btn"
                    onClick={() => onShowOnMap!(p)}
                    title="Show on MAP"
                    aria-label="Show on MAP"
                  >
                    <RoutePin size={14} />
                  </button>
                )}
                {onFavoriteAdd && onFavoriteCreateFolder && (
                  <FavoriteStarButton
                    procedure={p}
                    folders={favoriteFolders}
                    mapMeta={resolveMapMeta?.(p) ?? null}
                    onAdd={(folderId) => onFavoriteAdd(folderId, p)}
                    onCreateFolder={onFavoriteCreateFolder}
                    pickerPlacement="below"
                  />
                )}
                <button
                  type="button"
                  className={`cart-add-btn search-cart-btn ${inCart ? "in-cart" : ""}`}
                  onClick={() => onAddToCart(p)}
                  disabled={inCart}
                  title={inCart ? "Already in cart" : "Add to cart"}
                  aria-label={inCart ? "Already in cart" : "Add to cart"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6h15l-1.5 9h-11z" />
                    <circle cx="9" cy="20" r="1.5" />
                    <circle cx="17" cy="20" r="1.5" />
                    <path d="M6 6L5 3H2" />
                  </svg>
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SearchBar({
  query,
  onQueryChange,
  scoped,
  global,
  moduleAll,
  contextLabel,
  module,
  part,
  loading,
  cartIds,
  onAddToCart,
  onShowOnMap,
  searchInputRef,
  favoriteFolders,
  onFavoriteAdd,
  onFavoriteCreateFolder,
  resolveMapMeta,
}: Props) {
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef ?? localRef;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="search-dock-inner">
      <input
        ref={inputRef}
        type="search"
        className="search-input"
        placeholder="Search procedures, tags, keywords… (/ to focus)"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      {hasQuery && (
        <div className="search-results-area">
          <div className="search-panels">
            <section className="search-panel scoped">
              <header className="search-panel-sticky">
                <span className="search-badge scoped-badge">Current</span>
                <h3>{contextLabel}</h3>
                <span className="search-count">{loading ? "…" : scoped.length}</span>
              </header>
              {loading ? (
                <p className="search-empty">Searching…</p>
              ) : (
                <ResultList
                  items={scoped}
                  query={query}
                  cartIds={cartIds}
                  onAddToCart={onAddToCart}
                  onShowOnMap={onShowOnMap}
                  favoriteFolders={favoriteFolders}
                  onFavoriteAdd={onFavoriteAdd}
                  onFavoriteCreateFolder={onFavoriteCreateFolder}
                  resolveMapMeta={resolveMapMeta}
                />
              )}
            </section>
            <section className="search-panel global">
              <header className="search-panel-sticky">
                <span className="search-badge global-badge">All configs</span>
                <h3>{module} · {part}</h3>
                <span className="search-count">{loading ? "…" : global.length}</span>
              </header>
              {loading ? (
                <p className="search-empty">Searching…</p>
              ) : (
                <ResultList
                  items={global}
                  query={query}
                  cartIds={cartIds}
                  onAddToCart={onAddToCart}
                  onShowOnMap={onShowOnMap}
                  favoriteFolders={favoriteFolders}
                  onFavoriteAdd={onFavoriteAdd}
                  onFavoriteCreateFolder={onFavoriteCreateFolder}
                  resolveMapMeta={resolveMapMeta}
                />
              )}
            </section>
            <section className="search-panel module-all">
              <header className="search-panel-sticky">
                <span className="search-badge module-all-badge">no config</span>
                <h3>{partAllConfigLabel(module, part)}</h3>
                <span className="search-count">{loading ? "…" : moduleAll.length}</span>
              </header>
              {loading ? (
                <p className="search-empty">Searching…</p>
              ) : (
                <ResultList
                  items={moduleAll}
                  query={query}
                  cartIds={cartIds}
                  onAddToCart={onAddToCart}
                  onShowOnMap={onShowOnMap}
                  favoriteFolders={favoriteFolders}
                  onFavoriteAdd={onFavoriteAdd}
                  onFavoriteCreateFolder={onFavoriteCreateFolder}
                  resolveMapMeta={resolveMapMeta}
                />
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
