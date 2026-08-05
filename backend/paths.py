"""Data file path helpers — {module}-{part}-{machine_type} naming."""

from __future__ import annotations

from pathlib import Path


def config_csv_path(csv_dir: Path, module: str, part: str, machine: str) -> Path:
    new = csv_dir / f"{module}-{part}-{machine}.csv"
    if new.exists():
        return new
    legacy = csv_dir / f"{module}_{part}_{machine}.csv"
    if legacy.exists():
        return legacy
    return new


def module_all_csv_path(csv_dir: Path, module: str) -> Path:
    new = csv_dir / f"procedures-{module}-all.csv"
    if new.exists():
        return new
    legacy = csv_dir / f"procedures_{module}_all.csv"
    if legacy.exists():
        return legacy
    return new


def tree_path(tree_dir: Path, module: str, part: str, machine: str, kind: str) -> Path:
    """kind: hw | other"""
    new = tree_dir / module / f"{kind}-{part}-{machine}.txt"
    if new.exists():
        return new
    legacy = tree_dir / f"tree_{kind}_{part}_{machine}.txt"
    if legacy.exists():
        return legacy
    return new
