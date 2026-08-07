"""CoachMAP FastAPI application."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.loader import DataStore

from backend.app_paths import get_app_root

def _bundle_root() -> Path:
    """Code/static bundle root (PyInstaller _MEIPASS or project root)."""
    import sys

    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent

ROOT = _bundle_root()
FRONTEND_DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="CoachMAP")
store = DataStore()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/config")
def get_config():
    cfg = dict(store.config)
    cfg["_app_root"] = str(get_app_root())
    return cfg


@app.get("/api/view")
def get_view(
    module: str = Query(...),
    part: str = Query(...),
    machine: str = Query(...),
):
    return store.get_view(module, part, machine)


@app.get("/api/search")
def search(
    q: str = Query(""),
    module: str = Query(...),
    part: str = Query(...),
    machine: str = Query(...),
):
    return store.search(q, module, part, machine)


@app.get("/api/name-machines")
def name_machines(
    module: str = Query(...),
    part: str = Query(...),
):
    return store.get_name_machines(module, part)


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        if full_path.startswith("api/"):
            return {"detail": "Not found"}
        return FileResponse(index)
