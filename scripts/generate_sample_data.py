"""Generate voluminous sample tree and CSV data for CoachMAP."""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))

from backend.config_utils import module_names, normalize_modules

MODULES = module_names(normalize_modules(CONFIG.get("modules")))

# ---------------------------------------------------------------------------
# Tree builders (tab-indented)
# ---------------------------------------------------------------------------

def _indent(depth: int) -> str:
    return "\t" * depth


def build_hw_tree(part: str, machine: str) -> str:
    """Build a rich HW keyword tree per part/machine combo."""
    lines: list[str] = []

    # MOTOR subsystem — deep hierarchy
    lines.append("MOTOR")
    lines.append(f"{_indent(1)}SERVO")
    for axis in ("AXIS_X", "AXIS_Y", "AXIS_Z", "AXIS_R", "AXIS_T"):
        lines.append(f"{_indent(2)}{axis}")
    lines.append(f"{_indent(1)}STEPPER")
    for feed in ("FEED_A", "FEED_B", "FEED_C"):
        lines.append(f"{_indent(2)}{feed}")
    lines.append(f"{_indent(1)}SPINDLE")
    for sp in ("SP_01", "SP_02", "SP_03"):
        lines.append(f"{_indent(2)}{sp}")

    # SENSOR subsystem
    lines.append("SENSOR")
    lines.append(f"{_indent(1)}PROXIMITY")
    for i in range(1, 9):
        lines.append(f"{_indent(2)}PROX_{i:02d}")
    lines.append(f"{_indent(1)}ENCODER")
    for i in range(1, 5):
        lines.append(f"{_indent(2)}ENC_{i:02d}")
    lines.append(f"{_indent(1)}TEMPERATURE")
    for zone in ("CHAMBER", "STAGE", "LAMP", "EXHAUST"):
        lines.append(f"{_indent(2)}{zone}")

    # IO — many children (graph stress test)
    lines.append("IO")
    port_count = 16 if machine in ("Z1", "Z2", "Q1", "Q2") else 12
    for i in range(1, port_count + 1):
        lines.append(f"{_indent(1)}PORT_{i:02d}")

    # OPTICS
    lines.append("OPTICS")
    lines.append(f"{_indent(1)}LASER")
    for lk in ("ALIGN", "POWER", "PULSE", "WAVELENGTH"):
        lines.append(f"{_indent(2)}{lk}")
    lines.append(f"{_indent(1)}CAMERA")
    for cam in ("TOP", "SIDE", "BOTTOM", "MACRO"):
        lines.append(f"{_indent(2)}{cam}")

    # VACUUM / FLUID (part-specific flavour)
    if part == "SSS":
        lines.append("VACUUM")
        lines.append(f"{_indent(1)}PUMP")
        for p in ("ROUGH", "TURBO", "BACKING"):
            lines.append(f"{_indent(2)}{p}")
        lines.append("GAS")
        for gas in ("AR", "N2", "O2", "HE", "CF4", "SF6"):
            lines.append(f"{_indent(1)}MASS_{gas}")
    else:
        lines.append("CONVEYOR")
        for belt in ("IN", "OUT", "BUFFER", "REJECT"):
            lines.append(f"{_indent(1)}BELT_{belt}")
        lines.append("ROBOT")
        for j in range(1, 7):
            lines.append(f"{_indent(1)}J{j}")

    # VALVE manifold — flat many children under one parent
    lines.append("VALVE")
    for v in range(1, 13):
        lines.append(f"{_indent(1)}VLV_{v:02d}")

    return "\n".join(lines) + "\n"


def build_other_tree(part: str, machine: str) -> str:
    """Build a rich Support keyword tree."""
    lines: list[str] = []

    # MAINTENANCE — mix of branches and flat chips
    lines.append("MAINTENANCE")
    lines.append(f"{_indent(1)}CALIBRATION")
    for cal in ("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"):
        lines.append(f"{_indent(2)}{cal}")
    lines.append(f"{_indent(1)}CLEAN")
    for cl in ("FILTER", "CHUCK", "WINDOW", "NOZZLE", "SHOWER"):
        lines.append(f"{_indent(2)}{cl}")
    # Flat checklist items under MAINTENANCE (chip grid test)
    for i in range(1, 16):
        lines.append(f"{_indent(1)}CHK_{i:03d}")

    # DIAGNOSTIC — large alarm set
    lines.append("DIAGNOSTIC")
    alarm_count = 40 if machine in ("Z1", "Q1") else 25
    for i in range(1, alarm_count + 1):
        lines.append(f"{_indent(1)}ALM_{i:03d}")
    lines.append(f"{_indent(1)}LOG")
    for log in ("ERROR", "WARNING", "INFO", "DEBUG", "TRACE", "AUDIT"):
        lines.append(f"{_indent(2)}{log}")
    lines.append(f"{_indent(1)}SELF_TEST")
    for st in ("QUICK", "FULL", "HW", "SW", "COMM"):
        lines.append(f"{_indent(2)}{st}")

    # DOCUMENTATION / REST area
    lines.append("DOCUMENTATION")
    for doc in ("MANUAL", "SPEC", "DRAWING", "BOM", "SCHEMATIC"):
        lines.append(f"{_indent(1)}{doc}")

    lines.append("REST")

    return "\n".join(lines) + "\n"


def all_tree_keys() -> list[tuple[str, str]]:
    keys: list[tuple[str, str]] = []
    for part, cfg in CONFIG["parts"].items():
        for machine in cfg["machine_types"]:
            keys.append((part, machine))
    return keys


# ---------------------------------------------------------------------------
# Procedure generators
# ---------------------------------------------------------------------------

LONG_TITLE_SUFFIXES = [
    "— full sequence with safety interlock verification and post-run validation",
    "— extended procedure including pre-check, main operation, and recovery steps",
    "— operator guide with parameter reference and troubleshooting appendix",
    "— detailed workflow for production environment with sign-off requirements",
]


def gen_hw_procedures(part: str, machine: str) -> list[tuple[str, str, str, str]]:
    """Return list of (suffix, title, tags, link_suffix)."""
    procs: list[tuple[str, str, str, str]] = []
    n = 0

    def add(title: str, tags: str, link: str, long: bool = False):
        nonlocal n
        n += 1
        if long and n % 4 == 0:
            title += LONG_TITLE_SUFFIXES[n % len(LONG_TITLE_SUFFIXES)]
        procs.append((f"{n:03d}", title, tags, link))

    # MOTOR / SERVO / axes
    for axis in ("AXIS_X", "AXIS_Y", "AXIS_Z", "AXIS_R", "AXIS_T"):
        add(f"Servo {axis} Homing", f"MOTOR; SERVO; {axis}", f"homing-{axis.lower()}", long=True)
        add(f"Servo {axis} Jog Mode", f"MOTOR; SERVO; {axis}", f"jog-{axis.lower()}")
    for feed in ("FEED_A", "FEED_B", "FEED_C"):
        add(f"Stepper {feed} Setup", f"MOTOR; STEPPER; {feed}", f"stepper-{feed.lower()}")
    for sp in ("SP_01", "SP_02", "SP_03"):
        add(f"Spindle {sp} Speed Tune", f"MOTOR; SPINDLE; {sp}", f"spindle-{sp.lower()}", long=True)

    # SENSOR
    for i in range(1, 9):
        add(f"Proximity Sensor PROX_{i:02d} Adjust", f"SENSOR; PROXIMITY; PROX_{i:02d}", f"prox-{i:02d}")
    for i in range(1, 5):
        add(f"Encoder ENC_{i:02d} Reset", f"SENSOR; ENCODER; ENC_{i:02d}", f"enc-{i:02d}")
    for zone in ("CHAMBER", "STAGE", "LAMP", "EXHAUST"):
        add(f"Temperature {zone} Monitor", f"SENSOR; TEMPERATURE; {zone}", f"temp-{zone.lower()}", long=True)

    # IO ports
    port_count = 16 if machine in ("Z1", "Z2", "Q1", "Q2") else 12
    for i in range(1, port_count + 1):
        add(f"IO Port {i:02d} Configuration", f"IO; PORT_{i:02d}", f"io-p{i:02d}")

    # OPTICS
    for lk in ("ALIGN", "POWER", "PULSE", "WAVELENGTH"):
        add(f"Laser {lk} Calibration", f"OPTICS; LASER; {lk}", f"laser-{lk.lower()}", long=True)
    for cam in ("TOP", "SIDE", "BOTTOM", "MACRO"):
        add(f"Camera {cam} Focus", f"OPTICS; CAMERA; {cam}", f"cam-{cam.lower()}")

    # Part-specific
    if part == "SSS":
        for p in ("ROUGH", "TURBO", "BACKING"):
            add(f"Vacuum Pump {p} Start", f"VACUUM; PUMP; {p}", f"vac-{p.lower()}")
        for gas in ("AR", "N2", "O2", "HE", "CF4", "SF6"):
            add(f"Gas Mass Flow {gas} Setup", f"GAS; MASS_{gas}", f"gas-{gas.lower()}", long=True)
    else:
        for belt in ("IN", "OUT", "BUFFER", "REJECT"):
            add(f"Conveyor Belt {belt} Sync", f"CONVEYOR; BELT_{belt}", f"belt-{belt.lower()}")
        for j in range(1, 7):
            add(f"Robot Joint J{j} Teach", f"ROBOT; J{j}", f"robot-j{j}", long=True)

    # VALVE
    for v in range(1, 13):
        add(f"Valve VLV_{v:02d} Cycle Test", f"VALVE; VLV_{v:02d}", f"vlv-{v:02d}")

    # Multi-tag procedures (stress mapping)
    add("Full Motor Diagnostic Sweep", "MOTOR; SERVO; AXIS_X; AXIS_Y", "motor-sweep", long=True)
    add("Sensor Array Health Check", "SENSOR; PROXIMITY; ENCODER", "sensor-health", long=True)

    return procs


def gen_other_procedures(part: str, machine: str) -> list[tuple[str, str, str, str]]:
    procs: list[tuple[str, str, str, str]] = []
    n = 100

    def add(title: str, tags: str, link: str, long: bool = False):
        nonlocal n
        n += 1
        if long:
            title += LONG_TITLE_SUFFIXES[n % len(LONG_TITLE_SUFFIXES)]
        procs.append((f"{n:03d}", title, tags, link))

    for cal in ("DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"):
        add(f"Calibration {cal}", f"MAINTENANCE; CALIBRATION; {cal}", f"cal-{cal.lower()}", long=True)
    for cl in ("FILTER", "CHUCK", "WINDOW", "NOZZLE", "SHOWER"):
        add(f"Clean {cl}", f"MAINTENANCE; CLEAN; {cl}", f"clean-{cl.lower()}")
    for i in range(1, 16):
        add(f"Maintenance Checklist CHK_{i:03d}", f"MAINTENANCE; CHK_{i:03d}", f"chk-{i:03d}")

    alarm_count = 40 if machine in ("Z1", "Q1") else 25
    for i in range(1, alarm_count + 1):
        if i % 3 == 0:
            add(
                f"Alarm ALM_{i:03d} Reset and Verify",
                f"DIAGNOSTIC; ALM_{i:03d}",
                f"alm-{i:03d}",
                long=True,
            )
        else:
            add(f"Alarm ALM_{i:03d} Acknowledge", f"DIAGNOSTIC; ALM_{i:03d}", f"alm-{i:03d}")

    for log in ("ERROR", "WARNING", "INFO", "DEBUG", "TRACE", "AUDIT"):
        add(f"Export {log} Log", f"DIAGNOSTIC; LOG; {log}", f"log-{log.lower()}", long=True)
    for st in ("QUICK", "FULL", "HW", "SW", "COMM"):
        add(f"Self Test {st}", f"DIAGNOSTIC; SELF_TEST; {st}", f"self-{st.lower()}")

    for doc in ("MANUAL", "SPEC", "DRAWING", "BOM", "SCHEMATIC"):
        add(f"Open {doc} Reference", f"DOCUMENTATION; {doc}", f"doc-{doc.lower()}")

    # REST (no HW match)
    add("General Operator Reference Guide", "", "rest-general", long=True)
    add("Quick Start and Emergency Stop Overview", "", "rest-quickstart", long=True)
    add("FAQ and Common Troubleshooting Index", "", "rest-faq")
    add("Contact and Escalation Matrix", "", "rest-contact")

    return procs


def module_prefix(module: str) -> str:
    return module.lower()


def write_trees():
    tree_dir = ROOT / CONFIG["data_paths"]["tree_dir"]
    tree_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for module in MODULES:
        mod_dir = tree_dir / module
        mod_dir.mkdir(parents=True, exist_ok=True)
        for part, machine in all_tree_keys():
            hw_path = mod_dir / f"hw-{part}-{machine}.txt"
            hw_path.write_text(build_hw_tree(part, machine), encoding="utf-8")
            other_path = mod_dir / f"other-{part}-{machine}.txt"
            other_path.write_text(build_other_tree(part, machine), encoding="utf-8")
            count += 2
    print(f"Wrote {count} tree files (per-module folders)")


def write_csvs():
    csv_dir = ROOT / CONFIG["data_paths"]["csv_dir"]
    csv_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    total_rows = 0

    for module in MODULES:
        prefix = module_prefix(module)
        for part, part_cfg in CONFIG["parts"].items():
            for machine in part_cfg["machine_types"]:
                rows = []
                idx = 0
                hw_procs = gen_hw_procedures(part, machine)
                other_procs = gen_other_procedures(part, machine)

                for suffix, title, tags, link_sfx in hw_procs:
                    idx += 1
                    name = f"{prefix}{idx:03d}.hw{suffix}"
                    rows.append({
                        "name": name,
                        "title": f"[{module}/{part}/{machine}] {title}",
                        "tag": tags,
                        "link": f"https://example.com/proc/{module}/{part}/{machine}/{link_sfx}",
                    })

                for suffix, title, tags, link_sfx in other_procs:
                    idx += 1
                    name = f"{prefix}{idx:03d}.ot{suffix}"
                    tag_val = tags if tags else "REST"
                    rows.append({
                        "name": name,
                        "title": f"[{module}/{part}/{machine}] {title}",
                        "tag": tag_val,
                        "link": f"https://example.com/proc/{module}/{part}/{machine}/{link_sfx}",
                    })

                path = csv_dir / f"{module}-{part}-{machine}.csv"
                with path.open("w", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=["name", "title", "tag", "link"])
                    writer.writeheader()
                    writer.writerows(rows)
                count += 1
                total_rows += len(rows)

    print(f"Wrote {count} CSV files ({total_rows} total procedure rows)")


def write_part_all_csvs():
    csv_dir = ROOT / CONFIG["data_paths"]["csv_dir"]
    csv_dir.mkdir(parents=True, exist_ok=True)
    count = 0

    part_all_titles = [
        "Cross-machine Safety Interlock Reference",
        "Part-wide Firmware Compatibility Matrix",
        "Shared Operator Checklist (All Machine Types)",
        "Global Parameter Export and Import Guide",
        "Unified Alarm Code Master List",
        "Multi-tool Preventive Maintenance Schedule",
        "Standard Naming Convention for Procedures",
        "Part Release Notes and Change Log Index",
        "Fleet-wide Configuration Backup Procedure",
        "All-machine Diagnostic Data Collection Runbook",
    ]

    part_suffix = {"SSS": "sa", "TTT": "ta"}

    for module in MODULES:
        prefix = module_prefix(module)
        for part in CONFIG["parts"]:
            suffix = part_suffix.get(part, part.lower()[:1])
            rows = []
            for i, title in enumerate(part_all_titles, start=1):
                rows.append({
                    "name": f"{prefix}.{suffix}all{i:02d}",
                    "title": f"[{module}/{part}/all] {title}",
                    "link": f"https://example.com/proc/{module}/{part}/all/{i:02d}",
                })

            path = csv_dir / f"{module}-{part}-all.csv"
            with path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["name", "title", "link"])
                writer.writeheader()
                writer.writerows(rows)
            count += 1

    print(f"Wrote {count} part-all CSV files ({module}-{part}-all.csv)")


def print_stats():
    part, machine = "SSS", "Z1"
    hw = build_hw_tree(part, machine)
    other = build_other_tree(part, machine)
    hw_lines = [ln for ln in hw.splitlines() if ln.strip()]
    other_lines = [ln for ln in other.splitlines() if ln.strip()]
    hw_procs = gen_hw_procedures(part, machine)
    other_procs = gen_other_procedures(part, machine)
    print(f"Sample stats ({part}/{machine}):")
    print(f"  HW keywords: {len(hw_lines)}, Other keywords: {len(other_lines)}")
    print(f"  HW procedures: {len(hw_procs)}, Other procedures: {len(other_procs)}")
    print(f"  Per CSV: ~{len(hw_procs) + len(other_procs)} rows × {len(CONFIG['modules'])} modules × 10 configs")


if __name__ == "__main__":
    print_stats()
    write_trees()
    write_csvs()
    write_part_all_csvs()
