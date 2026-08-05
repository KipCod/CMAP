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

function configLabel(p: Procedure): string {
  return `${p.module}/${p.part}/${p.machine_type}`;
}

/** Strip leading [module/part/machine] from title when copying (avoid duplicate config). */
function copyTitle(p: Procedure): string {
  const trimmed = p.title.trim();
  const bracketed = `[${configLabel(p)}]`;
  if (trimmed.startsWith(bracketed)) {
    return trimmed.slice(bracketed.length).trim();
  }
  const generic = trimmed.match(/^\[[^\]]+\]\s*/);
  if (generic) {
    return trimmed.slice(generic[0].length).trim();
  }
  return trimmed;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text: name [config] title — no hyperlinks (Notepad-safe). */
export function formatCartPlainText(items: Procedure[]): string {
  return items
    .map((p) => `${p.name} [${configLabel(p)}] ${copyTitle(p)}`)
    .join("\n");
}

/** Rich HTML: hyperlinked name, then [config] and title. */
export function formatCartHtml(items: Procedure[]): string {
  const rows = items
    .map((p) => {
      const cfg = escapeHtml(configLabel(p));
      const name = escapeHtml(p.name);
      const title = escapeHtml(copyTitle(p));
      const link = escapeHtml(p.link);
      return `<div><a href="${link}">${name}</a> [${cfg}] ${title}</div>`;
    })
    .join("");
  return `<!DOCTYPE html><html><body>${rows}</body></html>`;
}

/** @deprecated Use formatCartPlainText — kept for compatibility. */
export function formatCartForClipboard(items: Procedure[]): string {
  return formatCartPlainText(items);
}

export async function copyCartToClipboard(items: Procedure[]): Promise<boolean> {
  const plain = formatCartPlainText(items);
  const html = formatCartHtml(items);

  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return true;
    }
  } catch {
    // fall through to plain text fallback
  }

  try {
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = plain;
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
