from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware
from core.config import Config
from api.router import auth, evidence, reports, ai, agentic
import os

app = FastAPI(title="Sewa Sahayak API - Modular")

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[Config.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=Config.SECRET_KEY)

# Routers
app.include_router(auth.router)
app.include_router(evidence.router)
app.include_router(reports.router)
app.include_router(ai.router)
app.include_router(agentic.router)

@app.get("/api/health")
def health():
    return {"status": "running", "version": "2.0.0-modular"}

# SPA Support (Serve Vite build)
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    
    @app.get("/{file_path:path}")
    async def serve_spa(file_path: str):
        if file_path.startswith("api/"): return
        full_path = os.path.join(DIST_DIR, file_path)
        if os.path.isfile(full_path): return FileResponse(full_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
