import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { MapKind, Procedure } from "../types";
import { getPathLabel } from "../utils/mapUtils";
import { procedureId } from "../utils/cartUtils";
import { RoutePin } from "./NavIcons";
import { ProcedurePreview } from "./ProcedurePreview";
import { FavoriteStarButton } from "./FavoriteStarButton";
import type { FavoriteFolder } from "../utils/favorites";

const STORAGE_KEY = "coachmap-procedure-height";
const DEFAULT_HEIGHT = 180;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 560;

function loadHeight(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HEIGHT;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, n)) : DEFAULT_HEIGHT;
  } catch {
    return DEFAULT_HEIGHT;
  }
}

function ProcedureLinkPreview({ procedure }: { procedure: Procedure }) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const maxW = 320;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - maxW - 12));
    setStyle({
      position: "fixed",
      left,
      top: Math.max(12, rect.top - 8),
      transform: "translateY(-100%)",
      zIndex: 3000,
      maxWidth: maxW,
      pointerEvents: "none",
    });
  }, [open]);

  return (
    <>
      <a
        ref={anchorRef}
        href={procedure.link}
        target="_blank"
        rel="noopener noreferrer"
        className="proc-name proc-name-link"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {procedure.name}
      </a>
      {open &&
        createPortal(
          <div
            className="procedure-preview-popover procedure-preview-portal"
            style={style}
            role="tooltip"
          >
            <ProcedurePreview procedure={procedure} query="" />
          </div>,
          document.body
        )}
    </>
  );
}

interface Props {
  procedures: Procedure[];
  keywordPath: string | null;
  mapKind: MapKind;
  cartIds: Set<string>;
  onAddToCart: (p: Procedure) => void;
  nameMachines: Record<string, string[]>;
  currentMachine: string;
  onTagClick?: (tag: string) => void;
  onSwitchMachine?: (machine: string) => void;
  favoriteFolders?: FavoriteFolder[];
  onFavoriteAdd?: (folderId: string, proc: Procedure) => void;
  onFavoriteCreateFolder?: (name: string) => string;
  favoriteMapMeta?: { mapKind: MapKind; keywordPath: string } | null;
  jumpHighlightProcedureId?: string | null;
}

export function ProcedurePanel({
  procedures,
  keywordPath,
  mapKind,
  cartIds,
  onAddToCart,
  nameMachines,
  currentMachine,
  onTagClick,
  onSwitchMachine,
  favoriteFolders = [],
  onFavoriteAdd,
  onFavoriteCreateFolder,
  favoriteMapMeta = null,
  jumpHighlightProcedureId = null,
}: Props) {
  const [height, setHeight] = useState(loadHeight);
  const dragging = useRef(false);
  const highlightRef = useRef<HTMLLIElement>(null);

  const hasSelection = Boolean(keywordPath);
  const hasProcedures = hasSelection && procedures.length > 0;

  useEffect(() => {
    if (!jumpHighlightProcedureId || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [jumpHighlightProcedureId, procedures]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(height));
  }, [height]);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      const startY = e.clientY;
      const startH = height;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const next = startH - (ev.clientY - startY);
        setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, next)));
      };

      const onUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [height]
  );

  return (
    <section
      className={`procedure-panel ${hasProcedures ? "has-items" : "is-idle"}`}
      aria-label="Procedures"
      style={{ height }}
    >
      <div
        className="procedure-resize-handle"
        onMouseDown={onResizeStart}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize procedures panel"
        title="Drag to resize"
      />

      <div className="procedure-toolbar">
        <div className="procedure-toolbar-main">
          <span className="panel-eyebrow">
            <RoutePin size={12} className="panel-eyebrow-icon" />
            Destination
          </span>
          <h2>Procedures</h2>
          {hasSelection ? (
            <>
              <span className={`dest-zone ${mapKind}`}>
                {mapKind === "hw" ? "HW MAP" : "Support MAP"}
              </span>
              <span className="procedure-path">{getPathLabel(keywordPath!)}</span>
            </>
          ) : (
            <span className="procedure-idle-hint">Pick a point on the map to see procedures here.</span>
          )}
        </div>
        {hasProcedures && (
          <div className="procedure-toolbar-count">
            <span className="dest-count">{procedures.length}</span>
            <span>procedure{procedures.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {hasSelection && procedures.length === 0 && (
        <p className="procedure-empty">No procedures at this location.</p>
      )}

      {hasProcedures && (
        <ul className="procedure-list">
          {procedures.map((p) => {
            const id = procedureId(p);
            const inCart = cartIds.has(id);
            const allMachines = nameMachines[p.name] ?? [p.machine_type];
            const otherMachines = allMachines.filter((m) => m !== currentMachine);
            const highlight = jumpHighlightProcedureId === id;
            return (
              <li
                key={id}
                ref={highlight ? highlightRef : undefined}
                className={`procedure-card ${highlight ? "map-jump-procedure-highlight" : ""}`}
              >
                <div className="procedure-card-top">
                  <div className="procedure-preview-wrap">
                    <ProcedureLinkPreview procedure={p} />
                  </div>
                  {onFavoriteAdd && onFavoriteCreateFolder && (
                    <FavoriteStarButton
                      procedure={p}
                      folders={favoriteFolders}
                      mapMeta={favoriteMapMeta}
                      onAdd={(folderId) => onFavoriteAdd(folderId, p)}
                      onCreateFolder={onFavoriteCreateFolder}
                      pickerPlacement="below"
                    />
                  )}
                  <button
                    type="button"
                    className={`cart-add-btn ${inCart ? "in-cart" : ""}`}
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
                <div className="proc-title">{p.title}</div>
                {otherMachines.length > 0 && (
                  <div className="proc-other-machines">
                    Also on:{" "}
                    {otherMachines.map((m, i) => (
                      <span key={m}>
                        {i > 0 && ", "}
                        <button
                          type="button"
                          className="proc-machine-link"
                          onClick={() => onSwitchMachine?.(m)}
                        >
                          {m}
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="proc-tags">
                  {p.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="tag-chip tag-chip-btn"
                      onClick={() => onTagClick?.(t)}
                      title={`Jump to ${t} on MAP`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
