"""Migrate legacy data paths to {module}-{part}-{machine} and trees/{module}/ layout."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))

from backend.config_utils import module_names, normalize_modules

MODULES = module_names(normalize_modules(CONFIG.get("modules")))


def migrate_part_all_csvs(csv_dir: Path) -> int:
    count = 0
    for module in MODULES:
        for part in CONFIG["parts"]:
            target = csv_dir / f"{module}-{part}-all.csv"
            if target.exists():
                continue
            legacy = csv_dir / f"procedures-{module}-all.csv"
            if not legacy.exists():
                legacy = csv_dir / f"procedures_{module}_all.csv"
            if legacy.exists():
                shutil.copy2(legacy, target)
                count += 1
    return count


def migrate_csv(csv_dir: Path) -> int:
    count = 0
    for module in MODULES:
        for part, part_cfg in CONFIG["parts"].items():
            for machine in part_cfg["machine_types"]:
                legacy = csv_dir / f"{module}_{part}_{machine}.csv"
                target = csv_dir / f"{module}-{part}-{machine}.csv"
                if legacy.exists() and not target.exists():
                    shutil.copy2(legacy, target)
                    count += 1

        legacy_all = csv_dir / f"procedures_{module}_all.csv"
        target_all = csv_dir / f"procedures-{module}-all.csv"
        if legacy_all.exists() and not target_all.exists():
            shutil.copy2(legacy_all, target_all)
            count += 1

    return count


def migrate_trees(tree_dir: Path) -> int:
    """Copy shared legacy trees into per-module folders when module file is missing."""
    count = 0
    for module in MODULES:
        mod_dir = tree_dir / module
        mod_dir.mkdir(parents=True, exist_ok=True)
        for part, part_cfg in CONFIG["parts"].items():
            for machine in part_cfg["machine_types"]:
                for kind in ("hw", "other"):
                    target = mod_dir / f"{kind}-{part}-{machine}.txt"
                    if target.exists():
                        continue
                    legacy = tree_dir / f"tree_{kind}_{part}_{machine}.txt"
                    if legacy.exists():
                        shutil.copy2(legacy, target)
                        count += 1
    return count


if __name__ == "__main__":
    csv_dir = ROOT / CONFIG["data_paths"]["csv_dir"]
    tree_dir = ROOT / CONFIG["data_paths"]["tree_dir"]
    csv_n = migrate_csv(csv_dir)
    part_all_n = migrate_part_all_csvs(csv_dir)
    tree_n = migrate_trees(tree_dir)
    print(
        f"Migrated {csv_n} config CSV copies, {part_all_n} part-all CSV copies, "
        f"{tree_n} tree copies into module folders"
    )
