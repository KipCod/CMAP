import { useCallback, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function ZoomPanViewport({ children, className = "" }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(3, Math.max(0.25, z + (e.deltaY > 0 ? -0.08 : 0.08))));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const stopDrag = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className={`zoom-pan-viewport ${className}`}>
      <div className="zoom-pan-toolbar">
        <button type="button" className="zoom-pan-btn" onClick={() => setZoom((z) => Math.min(3, z + 0.15))}>+</button>
        <button type="button" className="zoom-pan-btn" onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))}>−</button>
        <span className="zoom-pan-label">{Math.round(zoom * 100)}%</span>
        <button type="button" className="zoom-pan-btn zoom-pan-btn-reset" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
      </div>
      <div
        className="zoom-pan-canvas"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        <div className="zoom-pan-inner" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
