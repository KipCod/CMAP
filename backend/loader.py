"""Load config, CSV, and tree files into memory."""

from __future__ import annotations

import csv
import json
from copy import deepcopy
from pathlib import Path

from backend.models import ConfigContext, Procedure, TreeNode

ROOT = Path(__file__).resolve().parent.parent


def load_config() -> dict:
    path = ROOT / "config.json"
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_tag(tag: str) -> str:
    return tag.strip().upper()


def parse_tags(raw: str) -> list[str]:
    if not raw or not raw.strip():
        return ["REST"]
    tags = [normalize_tag(t) for t in raw.split(";") if t.strip()]
    return tags or ["REST"]


def parse_csv_row(row: dict[str, str], module: str, part: str, machine: str) -> Procedure:
    lower = {k.lower(): v for k, v in row.items()}
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


def parse_module_all_row(row: dict[str, str], module: str) -> Procedure:
    lower = {k.lower(): v for k, v in row.items()}
    return Procedure(
        name=lower.get("name", "").strip(),
        title=lower.get("title", "").strip(),
        tags=[],
        link=lower.get("link", "").strip(),
        module=module,
        part="ALL",
        machine_type="ALL",
        source="module_all",
    )


def parse_tree(text: str) -> list[TreeNode]:
    if not text.strip():
        return []

    lines = [ln for ln in text.splitlines() if ln.strip()]
    roots: list[TreeNode] = []
    stack: list[tuple[int, TreeNode]] = []

    for line in lines:
        stripped = line.lstrip("\t")
        depth = len(line) - len(stripped)
        keyword = stripped.strip().upper()
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


class DataStore:
    def __init__(self) -> None:
        self.config = load_config()
        self.contexts: dict[str, ConfigContext] = {}
        self.hw_trees: dict[str, list[TreeNode]] = {}
        self.other_trees: dict[str, list[TreeNode]] = {}
        self.all_procedures: list[Procedure] = []
        self.module_all_procedures: list[Procedure] = []
        self.config_procedure_keys: set[tuple[str, str]] = set()
        self._load_all()

    @staticmethod
    def tree_key(part: str, machine: str) -> str:
        return f"{part}_{machine}"

    @staticmethod
    def csv_key(module: str, part: str, machine: str) -> str:
        return f"{module}_{part}_{machine}"

    def _load_all(self) -> None:
        csv_dir = ROOT / self.config["data_paths"]["csv_dir"]
        tree_dir = ROOT / self.config["data_paths"]["tree_dir"]

        hw_templates: dict[str, list[TreeNode]] = {}
        other_templates: dict[str, list[TreeNode]] = {}

        for part, part_cfg in self.config["parts"].items():
            for machine in part_cfg["machine_types"]:
                tk = self.tree_key(part, machine)
                hw_path = tree_dir / f"tree_hw_{part}_{machine}.txt"
                other_path = tree_dir / f"tree_other_{part}_{machine}.txt"
                hw_templates[tk] = parse_tree(hw_path.read_text(encoding="utf-8"))
                other_templates[tk] = parse_tree(other_path.read_text(encoding="utf-8"))

        for module in self.config["modules"]:
            for part, part_cfg in self.config["parts"].items():
                for machine in part_cfg["machine_types"]:
                    ck = self.csv_key(module, part, machine)
                    ctx = ConfigContext(module=module, part=part, machine_type=machine)
                    self.contexts[ck] = ctx

                    csv_path = csv_dir / f"{module}_{part}_{machine}.csv"
                    procedures: list[Procedure] = []
                    with csv_path.open(encoding="utf-8", newline="") as f:
                        reader = csv.DictReader(f)
                        for row in reader:
                            proc = parse_csv_row(row, module, part, machine)
                            procedures.append(proc)
                            self.all_procedures.append(proc)
                            self.config_procedure_keys.add((proc.module, proc.name))

                    tk = self.tree_key(part, machine)
                    hw_copy = clone_tree(hw_templates[tk])
                    other_copy = clone_tree(other_templates[tk])
                    assign_procedures(procedures, hw_copy, other_copy)

                    self.hw_trees[ck] = hw_copy
                    self.other_trees[ck] = other_copy

        for module in self.config["modules"]:
            csv_path = csv_dir / f"procedures_{module}_all.csv"
            if not csv_path.exists():
                continue
            with csv_path.open(encoding="utf-8", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    proc = parse_module_all_row(row, module)
                    self.module_all_procedures.append(proc)
                    self.all_procedures.append(proc)

    def get_view(self, module: str, part: str, machine: str) -> dict:
        ck = self.csv_key(module, part, machine)
        return {
            "hw_tree": [n.to_dict() for n in self.hw_trees[ck]],
            "other_tree": [n.to_dict() for n in self.other_trees[ck]],
        }

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

            haystack = " ".join(
                [proc.name, proc.title, " ".join(proc.tags), proc.module, proc.part, proc.machine_type]
            ).lower()
            if q not in haystack:
                continue

            item = proc.to_dict()
            in_scope = (
                proc.module == module
                and proc.part == part
                and proc.machine_type == machine
            )
            global_results.append(item)
            if in_scope:
                scoped.append(item)

        for proc in self.module_all_procedures:
            if proc.module != module:
                continue
            if (proc.module, proc.name) in self.config_procedure_keys:
                continue

            haystack = " ".join([proc.name, proc.title, proc.module]).lower()
            if q not in haystack:
                continue

            module_all_results.append(proc.to_dict())

        return {"scoped": scoped, "global": global_results, "module_all": module_all_results}
