"""Load config, CSV, and tree files into memory."""

from __future__ import annotations

import csv
import json
import re
from copy import deepcopy
from pathlib import Path

from backend.app_paths import get_config_path, resolve_data_path
from backend.config_utils import module_names, normalize_modules
from backend.models import ConfigContext, Procedure, TreeNode
from backend.paths import config_csv_path, part_all_csv_path, tree_path

ROOT = Path(__file__).resolve().parent.parent


def load_config() -> dict:
    path = get_config_path()
    if not path.exists():
        raise FileNotFoundError(f"config.json not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    data["modules"] = normalize_modules(data.get("modules"))
    return data


def normalize_tag(tag: str) -> str:
    return tag.strip().upper()


def parse_tags(raw: str) -> list[str]:
    if not raw or not raw.strip():
        return ["REST"]
    tags = [normalize_tag(t) for t in re.split(r"[;,]", raw) if t.strip()]
    return tags or ["REST"]


def normalize_row(row: dict[str, str]) -> dict[str, str]:
    return {
        k.strip().lstrip("\ufeff").lower(): (v or "").strip()
        for k, v in row.items()
    }


def parse_csv_row(row: dict[str, str], module: str, part: str, machine: str) -> Procedure:
    lower = normalize_row(row)
    return Procedure(
        name=lower.get("name", "").strip(),
        title=lower.get("title", "").strip(),
        tags=parse_tags(lower.get("tag", "")),
        link=lower.get("link", "").strip(),
        module=module,
        part=part,
        machine_type=machine,
        source="config",
    )


def parse_module_all_row(row: dict[str, str], module: str, part: str) -> Procedure:
    lower = normalize_row(row)
    return Procedure(
        name=lower.get("name", "").strip(),
        title=lower.get("title", "").strip(),
        tags=[],
        link=lower.get("link", "").strip(),
        module=module,
        part=part,
        machine_type="ALL",
        source="module_all",
    )


def _measure_raw_indent(line: str, tab_width: int = 4) -> int:
    """Normalize tabs/spaces so mixed-indent tree files keep hierarchy."""
    expanded = line.expandtabs(tab_width)
    stripped = expanded.lstrip(" ")
    return len(expanded) - len(stripped)


def parse_tree(text: str) -> list[TreeNode]:
    if not text.strip():
        return []

    lines = [ln for ln in text.replace("\r\n", "\n").split("\n") if ln.strip()]
    if not lines:
        return []

    parsed: list[tuple[int, str]] = []
    raw_indents: set[int] = {0}

    for line in lines:
        raw = _measure_raw_indent(line)
        content = line[raw:].strip()
        if not content:
            continue
        raw_indents.add(raw)
        parsed.append((raw, content.upper()))

    unique_indents = sorted(raw_indents - {0})
    level_map = {0: 0}
    for idx, indent_val in enumerate(unique_indents):
        level_map[indent_val] = idx + 1

    roots: list[TreeNode] = []
    stack: list[tuple[int, TreeNode]] = []

    for raw, keyword in parsed:
        depth = level_map.get(raw, 0)
        node = TreeNode(keyword=keyword, display=keyword, depth=depth)

        while stack and stack[-1][0] >= depth:
            stack.pop()

        if stack:
            stack[-1][1].children.append(node)
        else:
            roots.append(node)

        stack.append((depth, node))

    return roots


def collect_keyword_map(nodes: list[TreeNode]) -> dict[str, TreeNode]:
    mapping: dict[str, TreeNode] = {}

    def walk(node_list: list[TreeNode]) -> None:
        for node in node_list:
            mapping[node.keyword.upper()] = node
            walk(node.children)

    walk(nodes)
    return mapping


def assign_procedures(
    procedures: list[Procedure],
    hw_nodes: list[TreeNode],
    other_nodes: list[TreeNode],
) -> None:
    hw_map = collect_keyword_map(hw_nodes)
    other_map = collect_keyword_map(other_nodes)

    for proc in procedures:
        hw_matched = False
        for tag in proc.tags:
            node = hw_map.get(tag.upper())
            if node:
                node.procedures.append(proc)
                hw_matched = True

        if hw_matched:
            continue

        for tag in proc.tags:
            node = other_map.get(tag.upper())
            if node:
                node.procedures.append(proc)


def clone_tree(nodes: list[TreeNode]) -> list[TreeNode]:
    def clone(node: TreeNode) -> TreeNode:
        return TreeNode(
            keyword=node.keyword,
            display=node.display,
            depth=node.depth,
            children=[clone(c) for c in node.children],
            procedures=[],
        )

    return [clone(n) for n in nodes]


def matches_query(query: str, *parts: str) -> bool:
    """Legacy helper — prefer procedure_matches_query for Procedure rows."""
    tokens = query.split()
    if not tokens:
        return False
    haystack = " ".join(parts).lower()
    return all(token in haystack for token in tokens)


def procedure_matches_query(query: str, proc: Procedure) -> bool:
    """Match name, title, or tags only — not config path fields."""
    q = query.strip().lower()
    if not q:
        return False

    name = proc.name.lower()
    title = proc.title.lower()
    tags = [t.lower() for t in proc.tags]

    tokens = q.split()
    if len(tokens) == 1 and re.fullmatch(r"[a-z0-9_]+", tokens[0]):
        token = tokens[0]
        if token in name or token in title:
            return True
        return any(token == tag for tag in tags)

    def token_hits(token: str) -> bool:
        if token in name or token in title:
            return True
        return any(token == tag or token in tag for tag in tags)

    return all(token_hits(token) for token in tokens)


class DataStore:
    def __init__(self) -> None:
        self.config = load_config()
        self.contexts: dict[str, ConfigContext] = {}
        self.hw_trees: dict[str, list[TreeNode]] = {}
        self.other_trees: dict[str, list[TreeNode]] = {}
        self.all_procedures: list[Procedure] = []
        self.module_all_procedures: list[Procedure] = []
        self.config_procedure_keys: set[tuple[str, str, str]] = set()
        # (module, part, name) -> sorted machine types
        self.name_machines: dict[tuple[str, str, str], set[str]] = {}
        self._load_all()

    @staticmethod
    def csv_key(module: str, part: str, machine: str) -> str:
        return f"{module}_{part}_{machine}"

    def _load_all(self) -> None:
        csv_dir = resolve_data_path(self.config, "csv_dir")
        tree_dir = resolve_data_path(self.config, "tree_dir")

        for module in module_names(self.config["modules"]):
            for part, part_cfg in self.config["parts"].items():
                for machine in part_cfg["machine_types"]:
                    ck = self.csv_key(module, part, machine)
                    ctx = ConfigContext(module=module, part=part, machine_type=machine)
                    self.contexts[ck] = ctx

                    csv_path = config_csv_path(csv_dir, module, part, machine)
                    procedures: list[Procedure] = []
                    if csv_path.exists():
                        with csv_path.open(encoding="utf-8-sig", newline="") as f:
                            reader = csv.DictReader(f)
                            for row in reader:
                                proc = parse_csv_row(row, module, part, machine)
                                if not proc.name:
                                    continue
                                procedures.append(proc)
                                self.all_procedures.append(proc)
                                self.config_procedure_keys.add((proc.module, proc.part, proc.name))
                                key = (proc.module, proc.part, proc.name)
                                self.name_machines.setdefault(key, set()).add(machine)

                    hw_file = tree_path(tree_dir, module, part, machine, "hw")
                    other_file = tree_path(tree_dir, module, part, machine, "other")
                    hw_copy = clone_tree(
                        parse_tree(hw_file.read_text(encoding="utf-8-sig"))
                        if hw_file.exists()
                        else []
                    )
                    other_copy = clone_tree(
                        parse_tree(other_file.read_text(encoding="utf-8-sig"))
                        if other_file.exists()
                        else []
                    )
                    assign_procedures(procedures, hw_copy, other_copy)

                    self.hw_trees[ck] = hw_copy
                    self.other_trees[ck] = other_copy

        for module in module_names(self.config["modules"]):
            for part in self.config["parts"]:
                csv_path = part_all_csv_path(csv_dir, module, part)
                if not csv_path.exists():
                    continue
                with csv_path.open(encoding="utf-8-sig", newline="") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        proc = parse_module_all_row(row, module, part)
                        if not proc.name:
                            continue
                        self.module_all_procedures.append(proc)
                        self.all_procedures.append(proc)

    def _collect_warnings(
        self, csv_dir: Path, tree_dir: Path, module: str, part: str, machine: str
    ) -> list[str]:
        warnings: list[str] = []
        csv_path = config_csv_path(csv_dir, module, part, machine)
        if not csv_path.exists():
            warnings.append(f"Missing config CSV: {csv_path.name}")
        for kind, label in (("hw", "HW tree"), ("other", "Support tree")):
            tp = tree_path(tree_dir, module, part, machine, kind)
            if not tp.exists():
                rel = tp.as_posix().split("data/", 1)[-1] if "data/" in tp.as_posix() else tp.name
                warnings.append(f"Missing {label}: data/{rel}")
        part_all = part_all_csv_path(csv_dir, module, part)
        if not part_all.exists():
            warnings.append(f"Missing part-all CSV: {part_all.name}")
        return warnings

    def get_view(self, module: str, part: str, machine: str) -> dict:
        ck = self.csv_key(module, part, machine)
        csv_dir = resolve_data_path(self.config, "csv_dir")
        tree_dir = resolve_data_path(self.config, "tree_dir")
        return {
            "hw_tree": [n.to_dict() for n in self.hw_trees[ck]],
            "other_tree": [n.to_dict() for n in self.other_trees[ck]],
            "warnings": self._collect_warnings(csv_dir, tree_dir, module, part, machine),
        }

    def get_name_machines(self, module: str, part: str) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {}
        prefix = (module, part)
        for (m, p, name), machines in self.name_machines.items():
            if m == module and p == part:
                result[name] = sorted(machines)
        return result

    def search(self, query: str, module: str | None, part: str | None, machine: str | None) -> dict:
        q = query.strip().lower()
        if not q:
            return {"scoped": [], "global": [], "module_all": []}

        scoped: list[dict] = []
        global_results: list[dict] = []
        module_all_results: list[dict] = []

        for proc in self.all_procedures:
            if proc.source != "config":
                continue

            if proc.module != module:
                continue

            if not procedure_matches_query(q, proc):
                continue

            item = proc.to_dict()
            in_scope = (
                proc.part == part
                and proc.machine_type == machine
            )
            if proc.part == part:
                global_results.append(item)
            if in_scope:
                scoped.append(item)

        for proc in self.module_all_procedures:
            if proc.module != module or proc.part != part:
                continue
            if (proc.module, proc.part, proc.name) in self.config_procedure_keys:
                continue

            if not procedure_matches_query(q, proc):
                continue

            module_all_results.append(proc.to_dict())

        return {"scoped": scoped, "global": global_results, "module_all": module_all_results}
