"""CoachMAP FastAPI application."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.loader import DataStore

ROOT = Path(__file__).resolve().parent.parent
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
    return store.config


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


if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        if full_path.startswith("api/"):
            return {"detail": "Not found"}
        return FileResponse(index)
