import { useState } from "react";
import type { FavoriteFolder } from "../utils/favorites";
import { promptFolderName } from "../utils/favorites";
import {
  loadFavoritesSectionOpen,
  saveFavoritesSectionOpen,
} from "../utils/layoutPrefs";

interface Props {
  folders: FavoriteFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
}

export function FavoritesSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: Props) {
  const [sectionOpen, setSectionOpen] = useState(loadFavoritesSectionOpen);

  const toggleSection = () => {
    setSectionOpen((v) => {
      const next = !v;
      saveFavoritesSectionOpen(next);
      return next;
    });
  };

  const handleCreate = () => {
    const name = promptFolderName();
    if (name) onCreateFolder(name);
  };

  const handleRename = (folder: FavoriteFolder) => {
    const name = promptFolderName(folder.name);
    if (name && name !== folder.name) onRenameFolder(folder.id, name);
  };

  return (
    <div className={`favorites-sidebar ${sectionOpen ? "is-open" : "is-collapsed"}`}>
      <div className="favorites-sidebar-head">
        <button type="button" className="favorites-section-toggle" onClick={toggleSection}>
          <span className="favorites-section-chevron">{sectionOpen ? "▾" : "▸"}</span>
          <span className="nav-section-label">Favorites</span>
          <span className="favorites-section-count">{folders.length}</span>
        </button>
        <button type="button" className="fav-tool-btn" onClick={handleCreate} title="New folder">
          +
        </button>
      </div>

      {sectionOpen && (
        <div className="favorites-folder-scroll">
          {folders.length === 0 ? (
            <p className="favorites-sidebar-empty">No folders yet. Click + to add one.</p>
          ) : (
            <ul className="favorites-folder-list">
              {folders.map((folder) => (
                <li key={folder.id} className="favorites-folder-item">
                  <div className="favorites-folder-row">
                    <button
                      type="button"
                      className={`favorites-folder-btn ${selectedFolderId === folder.id ? "active" : ""}`}
                      onClick={() => onSelectFolder(folder.id)}
                      title={folder.name}
                    >
                      <span className="favorites-folder-name">{folder.name}</span>
                      <span className="favorites-folder-count">{folder.items.length}</span>
                    </button>
                    <div className="favorites-folder-actions">
                      <button
                        type="button"
                        className="fav-action-btn"
                        onClick={() => handleRename(folder)}
                        title="Rename"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="fav-action-btn fav-action-delete"
                        onClick={() => {
                          if (window.confirm(`Delete folder "${folder.name}"?`)) {
                            onDeleteFolder(folder.id);
                          }
                        }}
                        title="Delete folder"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
