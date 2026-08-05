import { useCallback, useEffect, useRef, useState } from "react";
import type { MapKind, Procedure } from "../types";
import { getPathLabel } from "../utils/mapUtils";
import { procedureId } from "../utils/cartUtils";
import { RoutePin } from "./NavIcons";

const STORAGE_KEY = "coachmap-procedure-height";
const DEFAULT_HEIGHT = 240;
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

interface Props {
  procedures: Procedure[];
  keywordPath: string | null;
  mapKind: MapKind;
  cartIds: Set<string>;
  onAddToCart: (p: Procedure) => void;
  nameMachines: Record<string, string[]>;
  currentMachine: string;
}

export function ProcedurePanel({
  procedures,
  keywordPath,
  mapKind,
  cartIds,
  onAddToCart,
  nameMachines,
  currentMachine,
}: Props) {
  const [height, setHeight] = useState(loadHeight);
  const dragging = useRef(false);

  const hasSelection = Boolean(keywordPath);
  const hasProcedures = hasSelection && procedures.length > 0;

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
            return (
              <li key={id} className="procedure-card">
                <div className="procedure-card-top">
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="proc-name proc-name-link"
                  >
                    {p.name}
                  </a>
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
                    Also on: {otherMachines.join(", ")}
                  </div>
                )}
                <div className="proc-tags">
                  {p.tags.map((t) => (
                    <span key={t} className="tag-chip">
                      {t}
                    </span>
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
