import { useEffect, useRef, useState } from "react";
import type { MapKind, Procedure } from "../types";
import type { FavoriteFolder } from "../utils/favorites";
import { isInFavorites } from "../utils/favorites";

interface Props {
  procedure: Procedure;
  folders: FavoriteFolder[];
  mapMeta?: { mapKind: MapKind; keywordPath: string } | null;
  onAdd: (folderId: string) => void;
  onCreateFolder: (name: string) => string | void;
  className?: string;
}

export function FavoriteStarButton({
  procedure,
  folders,
  mapMeta,
  onAdd,
  onCreateFolder,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const starred = isInFavorites(folders, procedure);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
      {open && (
        <div className="favorite-picker" role="dialog" aria-label="Choose favorites folder">
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
      )}
    </div>
  );
}
