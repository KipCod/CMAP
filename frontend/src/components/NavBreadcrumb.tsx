import type { MapKind } from "../types";
import { parsePath } from "../utils/mapUtils";
import { RoutePin } from "./NavIcons";
interface Props {
  module: string;
  part: string;
  machine: string;
  mapKind: MapKind | null;
  keywordPath: string | null;
}

export function NavBreadcrumb({ module, part, machine, mapKind, keywordPath }: Props) {
  const crumbs: { label: string; type: string }[] = [
    { label: module, type: "module" },
    { label: part, type: "part" },
    { label: machine, type: "machine" },
  ];

  if (mapKind) {
    crumbs.push({
      label: mapKind === "hw" ? "HW MAP" : "Support MAP",
      type: "map",
    });
  }

  if (keywordPath) {
    parsePath(keywordPath).forEach((seg, i) => {
      crumbs.push({ label: seg, type: i === 0 ? "region" : "keyword" });
    });
  }

  return (
    <nav className="nav-breadcrumb" aria-label="Navigation path">
      <span className="nav-label">
        <RoutePin size={13} className="nav-label-icon" />
        Route
      </span>      <ol className="crumb-list">
        {crumbs.map((c, i) => (
          <li key={`${c.type}-${c.label}-${i}`} className={`crumb crumb-${c.type}`}>
            {i > 0 && <span className="crumb-sep" aria-hidden="true">›</span>}
            <span className="crumb-text">{c.label}</span>
          </li>
        ))}
        {!keywordPath && (
          <li className="crumb crumb-hint">
            <span className="crumb-sep" aria-hidden="true">›</span>
            <span className="crumb-text muted">Select a keyword</span>
          </li>
        )}
      </ol>
      {keywordPath && (
        <span className="you-are-here">
          <span className="pin-dot" />
          You are here
        </span>
      )}
    </nav>
  );
}
