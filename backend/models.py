"""CoachMAP data models."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Procedure:
    name: str
    title: str
    tags: list[str]
    link: str
    module: str
    part: str
    machine_type: str
    source: str = "config"

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "title": self.title,
            "tags": self.tags,
            "link": self.link,
            "module": self.module,
            "part": self.part,
            "machine_type": self.machine_type,
            "source": self.source,
        }


@dataclass
class TreeNode:
    keyword: str
    display: str
    depth: int
    children: list[TreeNode] = field(default_factory=list)
    procedures: list[Procedure] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "keyword": self.keyword,
            "display": self.display,
            "depth": self.depth,
            "count": len(self.procedures),
            "children": [c.to_dict() for c in self.children],
            "procedures": [p.to_dict() for p in self.procedures],
        }


@dataclass
class ConfigContext:
    module: str
    part: str
    machine_type: str

    def key(self) -> str:
        return f"{self.module}_{self.part}_{self.machine_type}"
