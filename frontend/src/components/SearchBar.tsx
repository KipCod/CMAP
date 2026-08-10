import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { MapKind, Procedure } from "../types";
import { procedureId } from "../utils/cartUtils";
import { getPathLabel } from "../utils/mapUtils";
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
  variant?: "dock" | "topbar";
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
        const mapMeta = resolveMapMeta?.(p) ?? null;
        const canMap =
          onShowOnMap &&
          p.source !== "module_all" &&
          p.machine_type !== "ALL";
        const mapHint = mapMeta
          ? `${mapMeta.mapKind === "hw" ? "HW" : "Support"} · ${getPathLabel(mapMeta.keywordPath)}`
          : null;

        return (
          <li
            key={`${p.source ?? "config"}-${p.module}-${p.part}-${p.machine_type}-${p.name}`}
            className="search-item"
          >
            <div className="search-item-row">
              <div className="search-item-main">
                <div className="search-item-head">
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="proc-name proc-name-link search-name-link"
                  >
                    {highlightText(p.name, query)}
                  </a>
                  <span className="search-config">[{config}]</span>
                </div>
                <div className="search-title">{highlightText(title, query)}</div>
                {mapHint && (
                  <div className="search-map-hint">
                    <RoutePin size={11} />
                    <span>{mapHint}</span>
                  </div>
                )}
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
                    title={mapHint ? `Jump to ${mapHint}` : "Show on MAP"}
                    aria-label={mapHint ? `Jump to ${mapHint}` : "Show on MAP"}
                  >
                    <RoutePin size={14} />
                  </button>
                )}
                {onFavoriteAdd && onFavoriteCreateFolder && (
                  <FavoriteStarButton
                    procedure={p}
                    folders={favoriteFolders}
                    mapMeta={mapMeta}
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

function SearchResultsPanels({
  query,
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
  favoriteFolders,
  onFavoriteAdd,
  onFavoriteCreateFolder,
  resolveMapMeta,
}: {
  query: string;
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
  favoriteFolders?: FavoriteFolder[];
  onFavoriteAdd?: (folderId: string, proc: Procedure) => void;
  onFavoriteCreateFolder?: (name: string) => string;
  resolveMapMeta?: (proc: Procedure) => { mapKind: MapKind; keywordPath: string } | null;
}) {
  return (
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
          <h3>
            {module} · {part}
          </h3>
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
  variant = "dock",
}: Props) {
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef ?? localRef;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const hasQuery = query.trim().length > 0;
  const isTopbar = variant === "topbar";

  const handleShowOnMap = (p: Procedure) => {
    onShowOnMap?.(p);
    if (isTopbar) setDropdownOpen(false);
  };

  const handleQueryInput = (value: string) => {
    onQueryChange(value);
    if (!isTopbar) return;
    if (value.trim()) {
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
    }
  };

  const openDropdownIfQuery = () => {
    if (isTopbar && query.trim()) {
      setDropdownOpen(true);
    }
  };

  useLayoutEffect(() => {
    if (!isTopbar || !dropdownOpen || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const width = Math.min(1280, window.innerWidth - 32);
    const left = Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16));
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 10,
      left,
      width,
    });
  }, [isTopbar, dropdownOpen, query, inputRef]);

  useEffect(() => {
    if (!isTopbar || !dropdownOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      const portal = document.getElementById("search-topbar-portal");
      if (portal?.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [isTopbar, dropdownOpen]);

  const inputEl = (
    <input
      ref={inputRef}
      type="search"
      className={isTopbar ? "search-topbar-input" : "search-input"}
      placeholder={isTopbar ? "Search procedures… (/)" : "Search procedures, tags, keywords… (/ to focus)"}
      value={query}
      onChange={(e) => handleQueryInput(e.target.value)}
      onKeyDown={(e) => {
        if (!isTopbar) return;
        if (e.key === "Enter") {
          e.preventDefault();
          openDropdownIfQuery();
        }
      }}
      aria-expanded={isTopbar ? dropdownOpen : undefined}
      aria-controls={isTopbar ? "search-topbar-results" : undefined}
    />
  );

  const resultsPanels = (
    <SearchResultsPanels
      query={query}
      scoped={scoped}
      global={global}
      moduleAll={moduleAll}
      contextLabel={contextLabel}
      module={module}
      part={part}
      loading={loading}
      cartIds={cartIds}
      onAddToCart={onAddToCart}
      onShowOnMap={handleShowOnMap}
      favoriteFolders={favoriteFolders}
      onFavoriteAdd={onFavoriteAdd}
      onFavoriteCreateFolder={onFavoriteCreateFolder}
      resolveMapMeta={resolveMapMeta}
    />
  );

  if (isTopbar) {
    return (
      <div
        className={`search-topbar-wrap ${dropdownOpen ? "search-topbar-active" : ""}`}
        ref={wrapRef}
      >
        {inputEl}
        {hasQuery && dropdownOpen &&
          createPortal(
            <>
              <div
                className="search-topbar-backdrop"
                onClick={() => setDropdownOpen(false)}
                aria-hidden="true"
              />
              <div
                id="search-topbar-portal"
                className="search-topbar-dropdown"
                style={dropdownStyle}
                role="region"
                aria-label="Search results"
              >
                <div className="search-topbar-dropdown-head">
                  <strong>Search results</strong>
                  <span className="search-topbar-dropdown-sub">{query.trim()}</span>
                </div>
                {resultsPanels}
              </div>
            </>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div className="search-dock-inner">
      {inputEl}
      {hasQuery && <div className="search-results-area">{resultsPanels}</div>}
    </div>
  );
}
