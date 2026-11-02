"""Vercel entrypoint for the FastAPI backend."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.main import app  # noqa: E402

@app.middleware("http")
async def remove_vercel_api_prefix(request, call_next):
    # Vercel routes /api/* to this function; FastAPI routes are defined at /.
    path = request.scope.get("path", "")
    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:]
    raw_path = request.scope.get("raw_path")
    if raw_path and raw_path.startswith(b"/api/"):
        request.scope["raw_path"] = raw_path[4:]
    return await call_next(request)
