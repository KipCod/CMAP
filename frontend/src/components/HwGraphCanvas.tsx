import { useMemo, useRef, type Ref } from "react";
import type { TreeNode } from "../types";
import { isOnSelectedPath } from "../utils/mapUtils";
import {
  buildGraphLayout,
  isOnGraphPath,
  NODE_H,
  NODE_W,
  type GraphLayout,
} from "../utils/graphLayout";

interface Props {
  nodes: TreeNode[];
  selectedKeyword: string | null;
  onSelect: (keyword: string, procedures: TreeNode["procedures"]) => void;
  layout?: GraphLayout;
  compactLabels?: boolean;
  svgClassName?: string;
  svgRef?: Ref<SVGSVGElement>;
}

export function HwGraphCanvas({
  nodes,
  selectedKeyword,
  onSelect,
  layout: layoutProp,
  compactLabels = true,
  svgClassName = "hw-graph-svg",
  svgRef,
}: Props) {
  const layout = useMemo(
    () => layoutProp ?? buildGraphLayout(nodes),
    [layoutProp, nodes]
  );

  const nodeMap = useMemo(() => {
    const m = new Map<string, (typeof layout.nodes)[0]>();
    layout.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [layout.nodes]);

  const localRef = useRef<SVGSVGElement>(null);
  const ref = svgRef ?? localRef;

  return (
    <svg
      ref={ref}
      className={svgClassName}
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Hardware keyword graph"
    >
      <g className="graph-edges">
        {layout.edges.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          const active =
            isOnGraphPath(edge.from, selectedKeyword) &&
            isOnGraphPath(edge.to, selectedKeyword);
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y + NODE_H / 2}
              x2={to.x}
              y2={to.y - NODE_H / 2}
              className={`graph-edge ${active ? "active" : ""}`}
            />
          );
        })}
      </g>

      <g className="graph-nodes">
        {layout.nodes.map((n) => {
          const isSelected = selectedKeyword === n.id;
          const onPath = isOnSelectedPath(n.id, selectedKeyword);
          const empty = n.total === 0;
          const x = n.x - NODE_W / 2;
          const y = n.y - NODE_H / 2;
          const label =
            compactLabels && n.label.length > 10
              ? `${n.label.slice(0, 9)}…`
              : n.label;

          return (
            <g
              key={n.id}
              className={`graph-node-g ${onPath ? "on-path" : ""} ${isSelected ? "selected" : ""} ${empty ? "empty" : ""}`}
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelect(n.id, n.procedures)}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(n.id, n.procedures);
                }
              }}
            >
              <rect
                className="graph-node-rect"
                width={NODE_W}
                height={NODE_H}
                rx={8}
                ry={8}
              />
              <text
                className="graph-node-label"
                x={NODE_W / 2}
                y={NODE_H / 2 - (n.count > 0 ? 4 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label}
              </text>
              {n.total > 0 && (
                <text
                  className="graph-node-count"
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {n.total}
                </text>
              )}
              {isSelected && (
                <circle className="graph-node-pin" cx={NODE_W / 2} cy={-8} r={5} />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export { buildGraphLayout };
