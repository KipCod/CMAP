import { useMemo, useRef } from "react";
import type { TreeNode } from "../types";
import { getPathLabel } from "../utils/mapUtils";
import { downloadSvgAsPng } from "../utils/screenshot";
import { HwGraphCanvas } from "./HwGraphCanvas";
import { ZoomPanViewport } from "./ZoomPanViewport";

interface Props {
  nodes: TreeNode[];
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
  onClose: () => void;
  contextLabel: string;
}

export function HwGraphFullView({
  nodes,
  selectedKeyword,
  onSelect,
  onClose,
  contextLabel,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hasNodes = nodes.length > 0;

  const title = useMemo(
    () => (selectedKeyword ? getPathLabel(selectedKeyword) : "Full graph"),
    [selectedKeyword]
  );

  const handleScreenshot = async () => {
    if (!svgRef.current) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    await downloadSvgAsPng(svgRef.current, `hw-map-${stamp}.png`);
  };

  return (
    <div className="hw-graph-full-view">
      <header className="hw-graph-full-toolbar">
        <div className="hw-graph-full-meta">
          <h2>HW MAP — Full View</h2>
          <span className="hw-graph-full-context">{contextLabel}</span>
          {selectedKeyword && (
            <span className="hw-graph-full-path">{title}</span>
          )}
        </div>
        <div className="hw-graph-full-actions">
          <button type="button" className="hw-graph-full-btn" onClick={handleScreenshot} disabled={!hasNodes}>
            Screenshot
          </button>
          <button type="button" className="hw-graph-full-btn primary" onClick={onClose}>
            Back to MAP
          </button>
        </div>
      </header>

      <div className="hw-graph-full-scroll">
        {hasNodes ? (
          <ZoomPanViewport className="hw-graph-full-zoom">
            <HwGraphCanvas
              nodes={nodes}
              selectedKeyword={selectedKeyword}
              onSelect={onSelect}
              compactLabels={false}
              svgRef={svgRef}
              svgClassName="hw-graph-svg hw-graph-svg-full"
            />
          </ZoomPanViewport>
        ) : (
          <p className="empty-hint">No HW tree data for this configuration.</p>
        )}
      </div>
    </div>
  );
}
