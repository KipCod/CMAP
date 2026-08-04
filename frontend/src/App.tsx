import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchConfig, fetchSearch, fetchView } from "./api";
import { CartPanel } from "./components/CartPanel";
import { HwMapPanel } from "./components/HwMapPanel";
import { AppMark, GraphNodes, GridMap } from "./components/NavIcons";
import { NavBreadcrumb } from "./components/NavBreadcrumb";
import { ProcedurePanel } from "./components/ProcedurePanel";
import { UserManualPanel } from "./components/UserManualPanel";
import { SearchBar } from "./components/SearchBar";
import { SupportZoneMap, useSupportExpanded } from "./components/SupportZoneMap";
import type { AppConfig, MapKind, Procedure, Theme, ViewData } from "./types";
import { loadCart, procedureId, saveCart } from "./utils/cartUtils";
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

  const otherExpanded = useSupportExpanded(view?.other_tree ?? []);

  const cartIds = useMemo(() => new Set(cart.map(procedureId)), [cart]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("coachmap-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchConfig().then((cfg) => {
      setConfig(cfg);
      setModule(cfg.defaults.module);
      setPart(cfg.defaults.part);
      setMachine(cfg.defaults.machine_type);
    });
  }, []);

  useEffect(() => {
    if (!module || !part || !machine) return;
    fetchView(module, part, machine).then(setView);
    setSelectedKeyword(null);
    setSelectedProcedures([]);
  }, [module, part, machine]);

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

  const handleSelect = useCallback(
    (map: MapKind) => (keyword: string, procedures: Procedure[]) => {
      setSelectedMap(map);
      setSelectedKeyword(keyword);
      setSelectedProcedures(procedures);
      if (map === "other") otherExpanded.expandToPath(keyword);
    },
    [otherExpanded.expandToPath]
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
    setPart(nextPart);
    const types = config?.parts[nextPart]?.machine_types ?? [];
    if (types.length > 0) setMachine(types[0]);
  };

  const hwCollapsed = collapsedZone === "hw";
  const otherCollapsed = collapsedZone === "other";

  if (!config) {
    return <div className="loading-screen">Loading CoachMAP…</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-row">
            <AppMark size={22} className="brand-mark" />
            <h1>{config.app_title}</h1>
          </div>
          <p className="sidebar-tagline">Procedure Map</p>
        </div>        <nav className="module-nav" aria-label="Modules">
          <span className="nav-section-label">Modules</span>
          {config.modules.map((m) => (
            <button
              key={m}
              type="button"
              className={`module-tab ${!manualOpen && module === m ? "active" : ""}`}
              onClick={() => {
                setManualOpen(false);
                setModule(m);
              }}
            >
              <span className="module-dot" />
              {m}
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

        <div className="sidebar-footer">
          <button
            type="button"
            className={`manual-tab ${manualOpen ? "active" : ""}`}
            onClick={() => setManualOpen((v) => !v)}
            aria-pressed={manualOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <path d="M8 7h8M8 11h8" />
            </svg>
            <span>User Manual</span>
          </button>

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

      <main className="main">
        {manualOpen ? (
          <>
            <header className="top-bar manual-top-bar">
              <h2 className="manual-page-title">User Manual</h2>
              <p className="manual-page-sub">All modules</p>
            </header>
            <UserManualPanel />
          </>
        ) : (
          <>
        <header className="top-bar">
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
                    onClick={() => setMachine(mt)}
                  >
                    {mt}
                  </button>
                ))}
              </div>
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
                        nodes={view.hw_tree}
                        selectedKeyword={selectedMap === "hw" ? selectedKeyword : null}
                        onSelect={handleSelect("hw")}
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
                        nodes={view.other_tree}
                        selectedKeyword={selectedMap === "other" ? selectedKeyword : null}
                        onSelect={handleSelect("other")}
                        expanded={otherExpanded.expanded}
                        onToggle={otherExpanded.toggle}
                        onExpandAllTop={otherExpanded.expandAllTop}
                        onCollapseAllTop={otherExpanded.collapseAllTop}
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
          />
        </div>

        <footer className="search-dock">
          <SearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            scoped={searchScoped}
            global={searchGlobal}
            moduleAll={searchModuleAll}
            contextLabel={contextLabel}
            module={module}
            loading={searchLoading}
          />
        </footer>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
