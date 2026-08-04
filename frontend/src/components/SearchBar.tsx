import type { Procedure } from "../types";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  scoped: Procedure[];
  global: Procedure[];
  moduleAll: Procedure[];
  contextLabel: string;
  module: string;
  loading: boolean;
}

function procedureConfigLabel(p: Procedure): string {
  if (p.source === "module_all" || p.machine_type === "ALL") {
    return `${p.module}/all`;
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

function ResultList({ items }: { items: Procedure[] }) {
  if (items.length === 0) {
    return <p className="search-empty">No matches.</p>;
  }
  return (
    <ul className="search-results">
      {items.map((p) => {
        const config = procedureConfigLabel(p);
        const title = procedureDisplayTitle(p);
        return (
          <li
            key={`${p.source ?? "config"}-${p.module}-${p.part}-${p.machine_type}-${p.name}`}
            className="search-item"
          >
            <div className="search-item-line">
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="proc-name proc-name-link search-name-link"
              >
                {p.name}
              </a>
              <span className="search-config">[{config}]</span>
              <span className="search-title">{title}</span>
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
  loading,
}: Props) {
  const hasQuery = query.trim().length > 0;

  return (
    <div className="search-dock-inner">
      <input
        type="search"
        className="search-input"
        placeholder="Search procedures, tags, keywords…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      {hasQuery && (
        <div className="search-results-area">
          <div className="search-panels">
            <section className="search-panel scoped">
              <header>
                <span className="search-badge scoped-badge">Current</span>
                <h3>{contextLabel}</h3>
                <span className="search-count">{scoped.length}</span>
              </header>
              {loading ? (
                <p className="search-empty">Searching…</p>
              ) : (
                <ResultList items={scoped} />
              )}
            </section>
            <section className="search-panel global">
              <header>
                <span className="search-badge global-badge">All configs</span>
                <h3>Global search</h3>
                <span className="search-count">{global.length}</span>
              </header>
              {loading ? (
                <p className="search-empty">Searching…</p>
              ) : (
                <ResultList items={global} />
              )}
            </section>
            <section className="search-panel module-all">
              <header>
                <span className="search-badge module-all-badge">no config</span>
                <h3>{module} / all</h3>
                <span className="search-count">{moduleAll.length}</span>
              </header>
              {loading ? (
                <p className="search-empty">Searching…</p>
              ) : (
                <ResultList items={moduleAll} />
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
