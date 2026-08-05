"""Config parsing helpers."""

from __future__ import annotations

from typing import Any


def normalize_modules(raw_modules: list[Any] | None) -> list[dict[str, Any]]:
    """Accept legacy string list or [{name, active}, ...]."""
    if not raw_modules:
        return []

    normalized: list[dict[str, Any]] = []
    for item in raw_modules:
        if isinstance(item, str):
            normalized.append({"name": item, "active": True})
        elif isinstance(item, dict):
            name = str(item.get("name", "")).strip()
            if not name:
                continue
            normalized.append({"name": name, "active": bool(item.get("active", True))})
    return normalized


def module_names(modules: list[dict[str, Any]]) -> list[str]:
    return [m["name"] for m in modules]


def active_module_names(modules: list[dict[str, Any]]) -> list[str]:
    return [m["name"] for m in modules if m.get("active")]
