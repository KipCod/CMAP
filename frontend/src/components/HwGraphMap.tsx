import type { TreeNode } from "../types";
import { getPathLabel } from "../utils/mapUtils";
import { HwGraphCanvas } from "./HwGraphCanvas";

interface Props {
  nodes: TreeNode[];
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
}

export function HwGraphMap({ nodes, selectedKeyword, onSelect }: Props) {
  return (
    <div className="hw-graph-wrap">
      <div className="map-legend graph-legend">
        <span className="legend-item">
          <span className="legend-dot region" /> Click node to navigate
        </span>
      </div>

      <div className="hw-graph-scroll">
        <HwGraphCanvas
          nodes={nodes}
          selectedKeyword={selectedKeyword}
          onSelect={onSelect}
        />
      </div>

      {selectedKeyword && (
        <div className="map-path-strip">
          <span className="path-label">Path</span>
          <code>{getPathLabel(selectedKeyword)}</code>
        </div>
      )}
    </div>
  );
}
