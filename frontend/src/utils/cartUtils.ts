import type { Procedure } from "../types";

export function procedureId(p: Procedure): string {
  return `${p.module}|${p.part}|${p.machine_type}|${p.name}`;
}

export function loadCart(): Procedure[] {
  try {
    const raw = localStorage.getItem("coachmap-cart");
    return raw ? (JSON.parse(raw) as Procedure[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: Procedure[]) {
  localStorage.setItem("coachmap-cart", JSON.stringify(items));
}

/** Tab-separated: name, title, config, link — one row per procedure */
export function formatCartForClipboard(items: Procedure[]): string {
  return items
    .map(
      (p) =>
        `${p.name}\t${p.title}\t${p.module}/${p.part}/${p.machine_type}\t${p.link}`
    )
    .join("\n");
}

export async function copyCartToClipboard(items: Procedure[]): Promise<boolean> {
  const text = formatCartForClipboard(items);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
