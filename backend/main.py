import ssl
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

import os
import uuid
import asyncio
import logging
import tempfile
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, BackgroundTasks, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from core.jobs import job_store
from modules.audio.router import router as audio_router
from modules.docs.router import router as docs_router
from modules.translation.router import router as translation_router
from modules.transcription.router import router as transcription_router
from modules.video.router import router as video_router
from modules.ocr.router import router as ocr_router
from modules.summarize.router import router as summarize_router
from modules.pdfeditor.router import router as pdfeditor_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("AudioClean Pro starting up…")
    
    # Pre-load common translation models in the background so first translation is instant (if not on a low-RAM cloud like Render)
    def preload_models():
        if os.getenv("RENDER") or os.getenv("DISABLE_PRELOAD"):
            log.info("Skipping model pre-loading on Render to conserve RAM.")
            return
        
        try:
            from modules.translation.service import _get_pipeline
            log.info("Pre-loading translation models (en-es, es-en) to MPS/GPU...")
            _get_pipeline("en-es")
            _get_pipeline("es-en")
            log.info("Translation models pre-loaded successfully. Ready for instant use.")
        except Exception as e:
            log.warning("Failed to pre-load translation models: %s", e)

    import threading
    threading.Thread(target=preload_models, daemon=True).start()
    
    yield
    log.info("AudioClean Pro shutting down…")


app = FastAPI(
    title="AudioClean Pro API",
    description="AI-powered audio cleanup, document conversion, and translation.",
    version="1.0.0",
    lifespan=lifespan,
)

# GZip compression for faster payloads
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400, # Cache preflight requests for 24 hours
)

# API routes
app.include_router(audio_router,       prefix="/api/audio",         tags=["Audio"])
app.include_router(docs_router,        prefix="/api/docs",          tags=["Documents"])
app.include_router(translation_router, prefix="/api/translate",     tags=["Translation"])
app.include_router(transcription_router, prefix="/api/transcribe",  tags=["Transcription"])
app.include_router(video_router,       prefix="/api/video",         tags=["Video Tools"])
app.include_router(ocr_router,         prefix="/api/ocr",           tags=["OCR"])
app.include_router(summarize_router,   prefix="/api/summarize",     tags=["Summarize"])
app.include_router(pdfeditor_router,   prefix="/api/pdf-editor",    tags=["PDF Editor"])


@app.get("/api/ping")
def ping():
    return {"status": "ok", "timestamp": __import__("time").time()}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "active_jobs": len(job_store),
    }


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/jobs/{job_id}/download")
def download_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "done":
        raise HTTPException(status_code=400, detail="Job not ready yet")

    path = job.get("result_path")
    if not path:
        raise HTTPException(status_code=410, detail="Result file no longer available")

    # If the path is a Cloudinary URL, we can redirect directly
    if path.startswith("http"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=path)

    if not os.path.exists(path):
        raise HTTPException(status_code=410, detail="Result file no longer available")

    return FileResponse(
        path=path,
        filename=job["filename"],
        media_type=job.get("mime_type", "application/octet-stream"),
        background=BackgroundTasks(),
    )


@app.delete("/api/jobs/{job_id}")
def delete_job_route(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    from core.jobs import delete_job
    delete_job(job_id)
    return {"status": "deleted", "job_id": job_id}
