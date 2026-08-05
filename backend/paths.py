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


def part_all_csv_path(csv_dir: Path, module: str, part: str) -> Path:
    """Part-scoped no-config CSV: {module}-{part}-all.csv"""
    new = csv_dir / f"{module}-{part}-all.csv"
    if new.exists():
        return new
    legacy_module = csv_dir / f"procedures-{module}-all.csv"
    if legacy_module.exists():
        return legacy_module
    legacy_module2 = csv_dir / f"procedures_{module}_all.csv"
    if legacy_module2.exists():
        return legacy_module2
    return new


def module_all_csv_path(csv_dir: Path, module: str) -> Path:
    """Deprecated — use part_all_csv_path."""
    legacy_module = csv_dir / f"procedures-{module}-all.csv"
    if legacy_module.exists():
        return legacy_module
    return csv_dir / f"procedures_{module}_all.csv"


def tree_path(tree_dir: Path, module: str, part: str, machine: str, kind: str) -> Path:
    """kind: hw | other"""
    new = tree_dir / module / f"{kind}-{part}-{machine}.txt"
    if new.exists():
        return new
    legacy = tree_dir / f"tree_{kind}_{part}_{machine}.txt"
    if legacy.exists():
        return legacy
    return new
