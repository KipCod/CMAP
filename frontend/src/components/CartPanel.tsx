import { useState } from "react";
import type { Procedure } from "../types";
import { copyCartToClipboard, procedureId } from "../utils/cartUtils";

interface Props {
  items: Procedure[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CartPanel({ items, onRemove, onClear }: Props) {
  const [copied, setCopied] = useState(false);

  if (items.length === 0) {
    return <p className="cart-empty">Cart is empty.</p>;
  }

  const handleCopyAll = async () => {
    const ok = await copyCartToClipboard(items);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="cart-panel">
      <div className="cart-panel-actions">
        <span className="cart-panel-count">{items.length} items</span>
        <div className="cart-action-btns">
          <button
            type="button"
            className={`cart-copy-btn ${copied ? "copied" : ""}`}
            onClick={handleCopyAll}
          >
            {copied ? "Copied!" : "Copy all"}
          </button>
          <button type="button" className="cart-clear-btn" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
      <ul className="cart-list">
        {items.map((p) => {
          const id = procedureId(p);
          return (
            <li key={id} className="cart-item">
              <div className="cart-item-top">
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="proc-name proc-name-link"
                >
                  {p.name}
                </a>
                <button
                  type="button"
                  className="cart-remove-btn"
                  onClick={() => onRemove(id)}
                  aria-label="Remove from cart"
                >
                  ×
                </button>
              </div>
              <div className="cart-item-title">{p.title}</div>
              <div className="cart-item-context">
                {p.module} · {p.part} · {p.machine_type}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
