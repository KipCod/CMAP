import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { MapKind, Procedure } from "../types";
import type { FavoriteFolder } from "../utils/favorites";
import { isInFavorites } from "../utils/favorites";

const PICKER_WIDTH = 280;
const VIEWPORT_PAD = 8;
const GAP = 6;
const MIN_PICKER_HEIGHT = 120;

interface Props {
  procedure: Procedure;
  folders: FavoriteFolder[];
  mapMeta?: { mapKind: MapKind; keywordPath: string } | null;
  onAdd: (folderId: string) => void;
  onCreateFolder: (name: string) => string | void;
  className?: string;
  pickerPlacement?: "above" | "below";
}

function clampPickerLeft(rect: DOMRect): number {
  return Math.min(
    Math.max(VIEWPORT_PAD, rect.right - PICKER_WIDTH),
    window.innerWidth - PICKER_WIDTH - VIEWPORT_PAD
  );
}

export function FavoriteStarButton({
  procedure,
  folders,
  mapMeta,
  onAdd,
  onCreateFolder,
  className = "",
  pickerPlacement = "above",
}: Props) {
  const [open, setOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [pickerStyle, setPickerStyle] = useState<CSSProperties | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const starred = isInFavorites(folders, procedure);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) {
      setPickerStyle(null);
      return;
    }

    const updatePosition = () => {
      if (!wrapRef.current) return;

      const rect = wrapRef.current.getBoundingClientRect();
      const left = clampPickerLeft(rect);
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
      const spaceAbove = rect.top - VIEWPORT_PAD;

      let placeBelow = pickerPlacement === "below";
      const fitsBelow = spaceBelow >= MIN_PICKER_HEIGHT;
      const fitsAbove = spaceAbove >= MIN_PICKER_HEIGHT;

      if (placeBelow && !fitsBelow && fitsAbove) {
        placeBelow = false;
      } else if (!placeBelow && !fitsAbove && fitsBelow) {
        placeBelow = true;
      } else if (!fitsBelow && !fitsAbove) {
        placeBelow = spaceBelow >= spaceAbove;
      }

      const maxHeight = Math.max(80, (placeBelow ? spaceBelow : spaceAbove) - GAP);

      if (placeBelow) {
        setPickerStyle({
          position: "fixed",
          top: rect.bottom + GAP,
          left,
          width: PICKER_WIDTH,
          maxHeight,
          zIndex: 3000,
        });
      } else {
        setPickerStyle({
          position: "fixed",
          left,
          width: PICKER_WIDTH,
          maxHeight,
          zIndex: 3000,
          bottom: window.innerHeight - rect.top + GAP,
        });
      }
    };

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);

    const pickerEl = pickerRef.current;
    const ro = pickerEl ? new ResizeObserver(updatePosition) : null;
    ro?.observe(pickerEl!);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, pickerPlacement, folders.length, mapMeta?.keywordPath]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || pickerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handlePick = (folderId: string) => {
    onAdd(folderId);
    setOpen(false);
    setNewFolderName("");
  };

  const handleCreateAndAdd = () => {
    const name = newFolderName.trim() || "New folder";
    const createdId = onCreateFolder(name);
    if (typeof createdId === "string") {
      handlePick(createdId);
    }
  };

  const picker = open ? (
    <div
      ref={pickerRef}
      className="favorite-picker favorite-picker-portal"
      style={
        pickerStyle ?? {
          position: "fixed",
          left: -9999,
          top: 0,
          width: PICKER_WIDTH,
          maxHeight: MIN_PICKER_HEIGHT,
          zIndex: 3000,
          visibility: "hidden",
        }
      }
        role="dialog"
        aria-label="Choose favorites folder"
      >
        <div className="favorite-picker-title">Add to folder</div>
        {mapMeta && (
          <div className="favorite-picker-meta">
            {mapMeta.mapKind === "hw" ? "HW" : "Support"} · {mapMeta.keywordPath.split("/").join(" › ")}
          </div>
        )}
        <ul className="favorite-picker-list">
          {folders.length === 0 && (
            <li className="favorite-picker-empty">No folders yet — create one below.</li>
          )}
          {folders.map((f) => (
            <li key={f.id}>
              <button type="button" className="favorite-picker-item" onClick={() => handlePick(f.id)}>
                <span>{f.name}</span>
                <span className="favorite-picker-count">{f.items.length}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="favorite-picker-new">
          <input
            type="text"
            className="favorite-picker-input"
            placeholder="New folder name…"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
          />
          <button type="button" className="favorite-picker-create" onClick={handleCreateAndAdd}>
            Create & add
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className={`favorite-star-wrap ${className}`} ref={wrapRef}>
      <button
        type="button"
        className={`favorite-star-btn ${starred ? "starred" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title={starred ? "Add to another folder" : "Add to favorites"}
        aria-label="Add to favorites"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
        </svg>
      </button>
      {picker && createPortal(picker, document.body)}
    </div>
  );
}
