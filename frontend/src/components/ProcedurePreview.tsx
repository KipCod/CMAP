import type { Procedure } from "../types";
import { highlightText } from "../utils/searchHighlight";

interface Props {
  procedure: Procedure;
  query: string;
}

export function ProcedurePreview({ procedure, query }: Props) {
  return (
    <div className="procedure-preview-popover" role="tooltip">
      <div className="procedure-preview-name">{highlightText(procedure.name, query)}</div>
      <div className="procedure-preview-title">{procedure.title}</div>
      {procedure.tags.length > 0 && (
        <div className="procedure-preview-tags">
          {procedure.tags.map((t) => (
            <span key={t} className="tag-chip">{t}</span>
          ))}
        </div>
      )}
      <div className="procedure-preview-link">{procedure.link}</div>
    </div>
  );
}
