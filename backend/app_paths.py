"""Resolve application root and config paths (dev, PyInstaller exe, portable)."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def get_app_root() -> Path:
    """
    Base directory for config.json and relative data paths.

    Priority:
      1. COACHMAP_HOME environment variable
      2. Directory containing the executable (PyInstaller / frozen)
      3. Project root (parent of backend/)
    """
    env_home = os.environ.get("COACHMAP_HOME", "").strip()
    if env_home:
        return Path(env_home).resolve()

    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent

    return Path(__file__).resolve().parent.parent


def get_config_path() -> Path:
    """Path to config.json (override with COACHMAP_CONFIG)."""
    env_cfg = os.environ.get("COACHMAP_CONFIG", "").strip()
    if env_cfg:
        return Path(env_cfg).resolve()
    return get_app_root() / "config.json"


def resolve_data_base(config: dict) -> Path:
    """
    Root for data_paths entries.

    config.data_root — optional, relative to app root or absolute.
    Default "." → app root (same folder as exe + config.json).
    """
    app_root = get_app_root()
    data_root = str(config.get("data_root", ".")).strip() or "."
    base = Path(data_root)
    if base.is_absolute():
        return base.resolve()
    return (app_root / base).resolve()


def resolve_data_path(config: dict, key: str) -> Path:
    """Resolve data_paths[csv_dir|tree_dir] against data_root / app root."""
    rel = config["data_paths"][key]
    path = Path(rel)
    if path.is_absolute():
        return path.resolve()
    return (resolve_data_base(config) / path).resolve()
