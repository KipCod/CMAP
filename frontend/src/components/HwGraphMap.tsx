import type { TreeNode } from "../types";
import { getPathLabel } from "../utils/mapUtils";
import { HwGraphCanvas } from "./HwGraphCanvas";

interface Props {
  nodes: TreeNode[];
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
  mapFilter?: string;
}

export function HwGraphMap({ nodes, selectedKeyword, onSelect, mapFilter = "" }: Props) {
  return (
    <div className="hw-graph-wrap">
      <p className="graph-hint">Click node to navigate</p>

      <div className="hw-graph-scroll">
        <HwGraphCanvas
          nodes={nodes}
          selectedKeyword={selectedKeyword}
          onSelect={onSelect}
          mapFilter={mapFilter}
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
