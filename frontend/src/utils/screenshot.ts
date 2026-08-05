const SVG_PRESENTATION_PROPS = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-size",
  "font-weight",
  "font-family",
] as const;

function inlineSvgStyles(source: SVGSVGElement, target: SVGSVGElement): void {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll("*"))];
  const targetNodes = [target, ...Array.from(target.querySelectorAll("*"))];

  for (let i = 0; i < sourceNodes.length; i += 1) {
    const src = sourceNodes[i];
    const tgt = targetNodes[i] as SVGElement | undefined;
    if (!tgt) continue;

    const computed = getComputedStyle(src);
    const styleParts: string[] = [];

    for (const prop of SVG_PRESENTATION_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (!value) continue;
      styleParts.push(`${prop}:${value}`);
      if (prop === "fill" || prop === "stroke" || prop === "stroke-width" || prop === "opacity") {
        tgt.setAttribute(prop, value);
      }
    }

    if (styleParts.length > 0) {
      tgt.setAttribute("style", styleParts.join(";"));
    }
  }
}

export async function downloadSvgAsPng(
  svg: SVGSVGElement,
  filename: string
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  inlineSvgStyles(svg, clone);

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute(
    "fill",
    getComputedStyle(document.documentElement).getPropertyValue("--bg-panel").trim() ||
      "#13131a"
  );
  clone.insertBefore(bg, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const width = svg.viewBox.baseVal.width || svg.clientWidth || 800;
  const height = svg.viewBox.baseVal.height || svg.clientHeight || 600;

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error("PNG export failed"));
          return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(pngBlob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        resolve();
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG render failed"));
    };
    img.src = url;
  });
}
