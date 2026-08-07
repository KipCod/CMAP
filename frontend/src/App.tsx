import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchConfig, fetchNameMachines, fetchSearch, fetchView } from "./api";
import { CartPanel } from "./components/CartPanel";
import { DataWarningsBanner } from "./components/DataWarningsBanner";
import { FavoritesPanel } from "./components/FavoritesPanel";
import { FavoritesSidebar } from "./components/FavoritesSidebar";
import { HwGraphFullView } from "./components/HwGraphFullView";
import { HwMapPanel } from "./components/HwMapPanel";
import { AppMark, GraphNodes, GridMap } from "./components/NavIcons";
import { NavBreadcrumb } from "./components/NavBreadcrumb";
import { ProcedurePanel } from "./components/ProcedurePanel";
import { UserManualPanel } from "./components/UserManualPanel";
import { SearchBar } from "./components/SearchBar";
import { SupportZoneMap, useSupportExpanded } from "./components/SupportZoneMap";
import { EMPTY_TREE_NODES } from "./constants";
import type { AppConfig, MapKind, NameMachineIndex, Procedure, Theme, ViewData } from "./types";
import { loadCart, procedureId, saveCart } from "./utils/cartUtils";
import {
  loadPresentationMode,
  loadSidebarCollapsed,
  savePresentationMode,
  saveSidebarCollapsed,
} from "./utils/layoutPrefs";
import { findNodeByPath, findProcedureOnMap, resolveProcedureMapMeta } from "./utils/mapNavigation";
import {
  addToFolder,
  createFolder,
  deleteFolder,
  exportSingleFolder,
  importIntoFolder,
  loadFavorites,
  removeFavoriteEntry,
  renameFolder,
  promptFolderName,
  type FavoriteFolder,
} from "./utils/favorites";
import "./styles.css";
type CollapsedZone = "hw" | "other" | null;

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [module, setModule] = useState("");
  const [part, setPart] = useState("");
  const [machine, setMachine] = useState("");
  const [view, setView] = useState<ViewData | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("coachmap-theme") as Theme) || "dark";
  });
  const [selectedMap, setSelectedMap] = useState<MapKind>("hw");
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedProcedures, setSelectedProcedures] = useState<Procedure[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScoped, setSearchScoped] = useState<Procedure[]>([]);
  const [searchGlobal, setSearchGlobal] = useState<Procedure[]>([]);
  const [searchModuleAll, setSearchModuleAll] = useState<Procedure[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [collapsedZone, setCollapsedZone] = useState<CollapsedZone>(null);
  const [cart, setCart] = useState<Procedure[]>(() => loadCart());
  const [cartOpen, setCartOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [hwGraphFullOpen, setHwGraphFullOpen] = useState(false);
  const [nameMachines, setNameMachines] = useState<NameMachineIndex>({});
  const [mapFilter, setMapFilter] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(loadSidebarCollapsed);
  const [presentationMode, setPresentationMode] = useState(loadPresentationMode);
  const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolder[]>(() => loadFavorites());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const clearSelectionRef = useRef(false);
  const selectedKeywordRef = useRef<string | null>(null);
  const selectedMapRef = useRef<MapKind>("hw");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingMapJumpRef = useRef<Procedure | null>(null);
  const favoritesImportRef = useRef<HTMLInputElement>(null);

  const mapContextKey = useMemo(
    () => (module && part && machine ? `${module}|${part}|${machine}` : ""),
    [module, part, machine]
  );
  const hwTree = view?.hw_tree ?? EMPTY_TREE_NODES;
  const otherTree = view?.other_tree ?? EMPTY_TREE_NODES;
  const otherExpanded = useSupportExpanded(otherTree, mapContextKey);
  const cartIds = useMemo(() => new Set(cart.map(procedureId)), [cart]);
  const selectedFolder = useMemo(
    () => favoriteFolders.find((f) => f.id === selectedFolderId) ?? null,
    [favoriteFolders, selectedFolderId]
  );
  const favoritesOpen = selectedFolderId !== null && selectedFolder !== null;

  useEffect(() => {
    selectedKeywordRef.current = selectedKeyword;
    selectedMapRef.current = selectedMap;
  }, [selectedKeyword, selectedMap]);

  useEffect(() => {
    saveSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    savePresentationMode(presentationMode);
  }, [presentationMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setHwGraphFullOpen(false);
        setManualOpen(false);
        setCartOpen(false);
        setSelectedFolderId(null);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("coachmap-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchConfig().then((cfg) => {
      setConfig(cfg);
      const defaultModule =
        cfg.modules.find((m) => m.name === cfg.defaults.module && m.active) ??
        cfg.modules.find((m) => m.active);
      setModule(defaultModule?.name ?? cfg.defaults.module);
      setPart(cfg.defaults.part);
      setMachine(cfg.defaults.machine_type);
    });
  }, []);

  useEffect(() => {
    if (!mapContextKey) {
      setView(null);
      return;
    }

    let cancelled = false;
    const [mod, prt, mach] = mapContextKey.split("|");
    fetchView(mod, prt, mach).then((v) => {
      if (cancelled) return;
      setView(v);

      const pending = pendingMapJumpRef.current;
      if (
        pending &&
        pending.module === mod &&
        pending.part === prt &&
        pending.machine_type === mach
      ) {
        pendingMapJumpRef.current = null;
        const loc = findProcedureOnMap(v.hw_tree, v.other_tree, pending);
        if (loc) {
          selectedKeywordRef.current = loc.path;
          selectedMapRef.current = loc.mapKind;
          setSelectedMap(loc.mapKind);
          setSelectedKeyword(loc.path);
          setSelectedProcedures(loc.procedures);
          if (loc.mapKind === "other") otherExpanded.expandToPath(loc.path);
          return;
        }
      }

      if (clearSelectionRef.current) {
        clearSelectionRef.current = false;
        setSelectedKeyword(null);
        setSelectedProcedures([]);
        return;
      }
      const path = selectedKeywordRef.current;
      const map = selectedMapRef.current;
      if (!path) return;

      const tree = map === "hw" ? v.hw_tree : v.other_tree;
      const node = findNodeByPath(tree, path);
      if (node) {
        setSelectedProcedures(node.procedures);
        return;
      }
      selectedKeywordRef.current = null;
      setSelectedKeyword(null);
      setSelectedProcedures([]);
    });
    return () => {
      cancelled = true;
    };
  }, [mapContextKey]);

  useEffect(() => {
    if (!module || !part) return;
    fetchNameMachines(module, part).then(setNameMachines).catch(() => setNameMachines({}));
  }, [module, part]);

  useEffect(() => {
    if (!searchQuery.trim() || !module || !part || !machine) {
      setSearchScoped([]);
      setSearchGlobal([]);
      setSearchModuleAll([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearchLoading(true);
      fetchSearch(searchQuery, module, part, machine)
        .then((res) => {
          setSearchScoped(res.scoped);
          setSearchGlobal(res.global);
          setSearchModuleAll(res.module_all);
        })
        .finally(() => setSearchLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, module, part, machine]);

  const machineTypes = useMemo(() => {
    if (!config || !part) return [];
    return config.parts[part]?.machine_types ?? [];
  }, [config, part]);

  const contextLabel = `${module} · ${part} · ${machine}`;

  const navigateToKeyword = useCallback(
    (map: MapKind, keyword: string, procedures: Procedure[]) => {
      setSelectedMap(map);
      setSelectedKeyword(keyword);
      setSelectedProcedures(procedures);
      if (map === "other") otherExpanded.expandToPath(keyword);
    },
    [otherExpanded.expandToPath]
  );

  const jumpToTag = useCallback(
    (tag: string) => {
      if (!view) return;
      const loc = findProcedureOnMap(view.hw_tree, view.other_tree, {
        name: "",
        title: "",
        tags: [tag],
        link: "",
        module,
        part,
        machine_type: machine,
      });
      if (loc) navigateToKeyword(loc.mapKind, loc.path, loc.procedures);
    },
    [view, module, part, machine, navigateToKeyword]
  );

  const jumpProcedureToMap = useCallback(
    (proc: Procedure) => {
      if (proc.source === "module_all" || proc.machine_type === "ALL") return;

      setSelectedFolderId(null);
      setManualOpen(false);
      setHwGraphFullOpen(false);
      pendingMapJumpRef.current = proc;

      const sameContext =
        proc.module === module && proc.part === part && proc.machine_type === machine;

      if (sameContext && view) {
        const loc = findProcedureOnMap(view.hw_tree, view.other_tree, proc);
        if (loc) {
          pendingMapJumpRef.current = null;
          selectedKeywordRef.current = loc.path;
          selectedMapRef.current = loc.mapKind;
          navigateToKeyword(loc.mapKind, loc.path, loc.procedures);
          return;
        }
      }

      clearSelectionRef.current = false;
      selectedKeywordRef.current = null;

      if (proc.module !== module) {
        setModule(proc.module);
        setPart(proc.part);
        setMachine(proc.machine_type);
      } else if (proc.part !== part) {
        setPart(proc.part);
        const types = config?.parts[proc.part]?.machine_types ?? [];
        if (types.includes(proc.machine_type)) {
          setMachine(proc.machine_type);
        } else if (types.length > 0) {
          setMachine(types[0]);
        }
      } else if (proc.machine_type !== machine) {
        setMachine(proc.machine_type);
      }
    },
    [module, part, machine, view, config, navigateToKeyword]
  );

  const resolveMapMeta = useCallback(
    (proc: Procedure) => {
      if (!view) return null;
      if (proc.module !== module || proc.part !== part || proc.machine_type !== machine) {
        return null;
      }
      return resolveProcedureMapMeta(view.hw_tree, view.other_tree, proc);
    },
    [view, module, part, machine]
  );

  const handleCreateFavoriteFolder = useCallback((name: string): string => {
    const { folders, id } = createFolder(name, favoriteFolders);
    setFavoriteFolders(folders);
    return id;
  }, [favoriteFolders]);

  const handleFavoriteAdd = useCallback(
    (folderId: string, proc: Procedure) => {
      let meta = resolveMapMeta(proc);
      if (!meta && view && proc.module === module && proc.part === part && proc.machine_type === machine) {
        meta = resolveProcedureMapMeta(view.hw_tree, view.other_tree, proc);
      }
      setFavoriteFolders((prev) => addToFolder(prev, folderId, proc, meta ?? undefined));
    },
    [resolveMapMeta, view, module, part, machine]
  );

  const handleSelectFavoriteFolder = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
    setManualOpen(false);
    setHwGraphFullOpen(false);
    setCartOpen(false);
  }, []);

  const handleRemoveFavoriteEntry = useCallback((entryId: string) => {
    if (!selectedFolderId) return;
    setFavoriteFolders((prev) => removeFavoriteEntry(prev, selectedFolderId, entryId));
  }, [selectedFolderId]);

  const handleExportSelectedFolder = useCallback(() => {
    if (!selectedFolder) return;
    const blob = new Blob([exportSingleFolder(selectedFolder)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const safe = selectedFolder.name.replace(/[^\w\-]+/g, "_").slice(0, 40);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coachmap-favorites-${safe}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedFolder]);

  const handleImportSelectedFolder = useCallback(
    (file: File) => {
      if (!selectedFolderId) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result ?? "");
          setFavoriteFolders((prev) => importIntoFolder(prev, selectedFolderId, text));
        } catch {
          window.alert("Could not import favorites file.");
        }
      };
      reader.readAsText(file);
    },
    [selectedFolderId]
  );

  const handleRenameSelectedFolder = useCallback(() => {
    if (!selectedFolder) return;
    const name = promptFolderName(selectedFolder.name);
    if (name && name !== selectedFolder.name) {
      setFavoriteFolders((prev) => renameFolder(prev, selectedFolder.id, name));
    }
  }, [selectedFolder]);

  const handleSelect = useCallback(
    (map: MapKind) => (keyword: string, procedures: Procedure[]) => {
      navigateToKeyword(map, keyword, procedures);
    },
    [navigateToKeyword]
  );

  const addToCart = useCallback((p: Procedure) => {
    setCart((prev) => {
      const id = procedureId(p);
      if (prev.some((x) => procedureId(x) === id)) return prev;
      const next = [...prev, p];
      saveCart(next);
      return next;
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => {
      const next = prev.filter((p) => procedureId(p) !== id);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    saveCart([]);
  }, []);

  const toggleCollapse = (zone: "hw" | "other") => {
    setCollapsedZone((prev) => (prev === zone ? null : zone));
  };

  const handlePartChange = (nextPart: string) => {
    clearSelectionRef.current = true;
    setPart(nextPart);
    const types = config?.parts[nextPart]?.machine_types ?? [];
    if (types.length > 0) setMachine(types[0]);
  };

  const handleMachineChange = (nextMachine: string) => {
    clearSelectionRef.current = false;
    setMachine(nextMachine);
  };

  const handleModuleSelect = (name: string) => {
    clearSelectionRef.current = true;
    setManualOpen(false);
    setHwGraphFullOpen(false);
    setSelectedFolderId(null);
    setModule(name);
  };

  const hwCollapsed = collapsedZone === "hw";
  const otherCollapsed = collapsedZone === "other";

  if (!config) {
    return <div className="loading-screen">Loading CoachMAP…</div>;
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${presentationMode ? "presentation-mode" : ""}`}>
      {!presentationMode && (
      <aside className={`sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-row">
            <AppMark size={22} className="brand-mark" />
            <h1>{config.app_title}</h1>
          </div>
          <p className="sidebar-tagline">Procedure Navigation</p>
        </div>        <nav className="module-nav" aria-label="Modules">
          <span className="nav-section-label">Modules</span>
          {config.modules.map((m) => (
            <button
              key={m.name}
              type="button"
              disabled={!m.active}
              className={`module-tab ${!m.active ? "inactive" : ""} ${!manualOpen && !hwGraphFullOpen && !favoritesOpen && module === m.name ? "active" : ""}`}
              onClick={() => handleModuleSelect(m.name)}
              title={m.active ? m.name : `${m.name} (inactive)`}
            >
              <span className="module-dot" />
              {m.name}
            </button>
          ))}
        </nav>

        <div className="cart-nav">
          <button
            type="button"
            className={`cart-tab ${cartOpen ? "active" : ""}`}
            onClick={() => setCartOpen((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6h15l-1.5 9h-11z" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="17" cy="20" r="1.5" />
              <path d="M6 6L5 3H2" />
            </svg>
            <span>Cart</span>
            {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
          </button>
          {cartOpen && (
            <CartPanel items={cart} onRemove={removeFromCart} onClear={clearCart} />
          )}
        </div>

        <FavoritesSidebar
          folders={favoriteFolders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFavoriteFolder}
          onCreateFolder={(name) => {
            const { folders, id } = createFolder(name, favoriteFolders);
            setFavoriteFolders(folders);
            setSelectedFolderId(id);
            setManualOpen(false);
            setHwGraphFullOpen(false);
          }}
          onRenameFolder={(id, name) => setFavoriteFolders((prev) => renameFolder(prev, id, name))}
          onDeleteFolder={(id) => {
            setFavoriteFolders((prev) => deleteFolder(prev, id));
            if (selectedFolderId === id) setSelectedFolderId(null);
          }}
        />

        <div className="sidebar-footer">
          <button
            type="button"
            className={`manual-tab ${manualOpen ? "active" : ""}`}
            onClick={() => {
              setManualOpen((v) => !v);
              setHwGraphFullOpen(false);
              setSelectedFolderId(null);
            }}
            aria-pressed={manualOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <path d="M8 7h8M8 11h8" />
            </svg>
            <span>User Manual</span>
          </button>

          {config.faq_url && (
            <a
              href={config.faq_url}
              target="_blank"
              rel="noopener noreferrer"
              className="manual-tab faq-tab"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.5 9.5a2.5 2.5 0 0 1 4.2 1.8c0 2-2.5 2-2.5 4" />
                <circle cx="12" cy="17" r="0.5" fill="currentColor" />
              </svg>
              <span>FAQ</span>
            </a>
          )}

          <div className="theme-toggle">
            <button
              type="button"
              className={theme === "light" ? "active" : ""}
              onClick={() => setTheme("light")}
            >
              Light
            </button>
            <button
              type="button"
              className={theme === "dark" ? "active" : ""}
              onClick={() => setTheme("dark")}
            >
              Dark
            </button>
          </div>
        </div>
      </aside>
      )}

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarCollapsed((v) => !v)}
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? "›" : "‹"}
      </button>

      <main className="main">
        {manualOpen ? (
          <>
            <header className="top-bar manual-top-bar">
              <h2 className="manual-page-title">User Manual</h2>
              <p className="manual-page-sub">All modules</p>
            </header>
            <UserManualPanel />
          </>
        ) : favoritesOpen && selectedFolder ? (
          <>
            <header className="top-bar">
              <div className="top-bar-row">
                <div className="selectors">
                  <div className="selector-group">
                    <span className="selector-label">Part</span>
                    <div className="part-selector">
                      {Object.keys(config.parts).map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`segment ${part === p ? "active" : ""}`}
                          onClick={() => handlePartChange(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="selector-group">
                    <span className="selector-label">Machine</span>
                    <div className="machine-chips">
                      {machineTypes.map((mt) => (
                        <button
                          key={mt}
                          type="button"
                          className={`chip ${machine === mt ? "active" : ""}`}
                          onClick={() => handleMachineChange(mt)}
                        >
                          {mt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="top-bar-actions">
                  <button
                    type="button"
                    className="layout-mode-btn"
                    onClick={handleExportSelectedFolder}
                    title="Export this folder"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    className="layout-mode-btn"
                    onClick={() => favoritesImportRef.current?.click()}
                    title="Import into this folder"
                  >
                    Import
                  </button>
                  <input
                    ref={favoritesImportRef}
                    type="file"
                    accept="application/json,.json"
                    className="fav-import-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportSelectedFolder(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="layout-mode-btn"
                    onClick={() => setSelectedFolderId(null)}
                  >
                    Back to MAP
                  </button>
                </div>
              </div>
            </header>
            <div className="content content-favorites">
              <FavoritesPanel
                folder={selectedFolder}
                module={module}
                part={part}
                machine={machine}
                cartIds={cartIds}
                onAddToCart={addToCart}
                onRemove={handleRemoveFavoriteEntry}
                onRename={handleRenameSelectedFolder}
                onShowOnMap={jumpProcedureToMap}
              />
            </div>
          </>
        ) : hwGraphFullOpen ? (
          <HwGraphFullView
            nodes={hwTree}
            selectedKeyword={selectedMap === "hw" ? selectedKeyword : null}
            onSelect={handleSelect("hw")}
            onClose={() => setHwGraphFullOpen(false)}
            contextLabel={contextLabel}
          />
        ) : (
          <>
        <header className="top-bar">
          <div className="top-bar-row">
          <div className="selectors">
            <div className="selector-group">
              <span className="selector-label">Part</span>
              <div className="part-selector">
                {Object.keys(config.parts).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`segment ${part === p ? "active" : ""}`}
                    onClick={() => handlePartChange(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="selector-group">
              <span className="selector-label">Machine</span>
              <div className="machine-chips">
                {machineTypes.map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    className={`chip ${machine === mt ? "active" : ""}`}
                    onClick={() => handleMachineChange(mt)}
                  >
                    {mt}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="top-bar-actions">
            <input
              type="search"
              className="map-filter-input"
              placeholder="Filter MAP keywords…"
              value={mapFilter}
              onChange={(e) => setMapFilter(e.target.value)}
              aria-label="Filter MAP keywords"
            />
            <button
              type="button"
              className={`layout-mode-btn ${presentationMode ? "active" : ""}`}
              onClick={() => setPresentationMode((v) => !v)}
              title="Presentation mode"
            >
              {presentationMode ? "Exit focus" : "Focus"}
            </button>
          </div>
          </div>
          <NavBreadcrumb
            module={module}
            part={part}
            machine={machine}
            mapKind={selectedKeyword ? selectedMap : null}
            keywordPath={selectedKeyword}
          />
        </header>

        <DataWarningsBanner warnings={view?.warnings ?? []} />

        <div className="content">
          <section
            className={`maps ${hwCollapsed ? "hw-collapsed" : ""} ${otherCollapsed ? "other-collapsed" : ""}`}
          >
            <div
              className={`map-panel map-panel-hw ${selectedMap === "hw" ? "focused" : ""} ${hwCollapsed ? "collapsed" : "expanded"}`}
            >
              {hwCollapsed ? (
                <button
                  type="button"
                  className="zone-collapsed-tab hw"
                  onClick={() => toggleCollapse("hw")}
                  title="Expand HW MAP"
                >
                  <span>HW</span>
                </button>
              ) : (
                <>
                  <header className="map-panel-header">
                    <div className="map-zone-badge hw">
                      <GraphNodes size={14} className="hw-zone-icon" />
                      HW
                    </div>
                    <div className="map-panel-titles">
                      <h2>HW MAP</h2>
                      <p className="map-zone-desc">machine hardware hierarchy graph</p>
                    </div>
                    <button
                      type="button"
                      className="zone-collapse-btn"
                      onClick={() => toggleCollapse("hw")}
                      title="Collapse HW MAP"
                      aria-label="Collapse HW MAP"
                    >
                      ◀
                    </button>
                  </header>
                  <div className="map-scroll">
                    {view ? (
                      <HwMapPanel
                        nodes={hwTree}
                        selectedKeyword={selectedMap === "hw" ? selectedKeyword : null}
                        onSelect={handleSelect("hw")}
                        onOpenFullView={() => {
                          setHwGraphFullOpen(true);
                          setManualOpen(false);
                        }}
                        mapFilter={mapFilter}
                        mapContextKey={mapContextKey}
                      />
                    ) : (
                      <p className="empty-hint">Loading map…</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div
              className={`map-panel map-panel-other ${selectedMap === "other" ? "focused" : ""} ${otherCollapsed ? "collapsed" : "expanded"}`}
            >
              {otherCollapsed ? (
                <button
                  type="button"
                  className="zone-collapsed-tab other"
                  onClick={() => toggleCollapse("other")}
                  title="Expand Support MAP"
                >
                  <span>Support</span>
                </button>
              ) : (
                <>
                  <header className="map-panel-header">
                    <div className="map-zone-badge other">
                      <GridMap size={12} />
                      Support
                    </div>
                    <div className="map-panel-titles">
                      <h2>Support MAP</h2>
                      <p className="map-zone-desc">module&apos;s important keywords</p>
                    </div>
                    <button
                      type="button"
                      className="zone-collapse-btn"
                      onClick={() => toggleCollapse("other")}
                      title="Collapse Support MAP"
                      aria-label="Collapse Support MAP"
                    >
                      ▶
                    </button>
                  </header>
                  <div className="map-scroll">
                    {view ? (
                      <SupportZoneMap
                        nodes={otherTree}
                        selectedKeyword={selectedMap === "other" ? selectedKeyword : null}
                        onSelect={handleSelect("other")}
                        expanded={otherExpanded.expanded}
                        onToggle={otherExpanded.toggle}
                        onExpandAllTop={otherExpanded.expandAllTop}
                        onCollapseAllTop={otherExpanded.collapseAllTop}
                        mapFilter={mapFilter}
                      />
                    ) : (
                      <p className="empty-hint">Loading map…</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          <ProcedurePanel
            procedures={selectedProcedures}
            keywordPath={selectedKeyword}
            mapKind={selectedMap}
            cartIds={cartIds}
            onAddToCart={addToCart}
            nameMachines={nameMachines}
            currentMachine={machine}
            onTagClick={jumpToTag}
            onSwitchMachine={handleMachineChange}
            favoriteFolders={favoriteFolders}
            onFavoriteAdd={handleFavoriteAdd}
            onFavoriteCreateFolder={handleCreateFavoriteFolder}
            favoriteMapMeta={
              selectedKeyword
                ? { mapKind: selectedMap, keywordPath: selectedKeyword }
                : null
            }
          />
        </div>

        {!presentationMode && (
        <footer className="search-dock">
          <SearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            scoped={searchScoped}
            global={searchGlobal}
            moduleAll={searchModuleAll}
            contextLabel={contextLabel}
            module={module}
            part={part}
            loading={searchLoading}
            cartIds={cartIds}
            onAddToCart={addToCart}
            onShowOnMap={jumpProcedureToMap}
            searchInputRef={searchInputRef}
            favoriteFolders={favoriteFolders}
            onFavoriteAdd={handleFavoriteAdd}
            onFavoriteCreateFolder={handleCreateFavoriteFolder}
            resolveMapMeta={resolveMapMeta}
          />
        </footer>
        )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
