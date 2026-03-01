import os
import uuid
import tempfile
import logging

from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from core.jobs import create_job, update_job, delete_job
from modules.audio.service import run_denoise_pipeline

log = logging.getLogger(__name__)

router = APIRouter()

SUPPORTED_EXTS = {"mp3", "wav", "ogg", "flac", "m4a"}
MAX_BYTES = 100 * 1024 * 1024  # 100 MB


@router.post("/denoise")
async def denoise(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    mode: str = Form("fast"),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_EXTS:
        raise HTTPException(400, f"Formato no soportado. Usa: {', '.join(SUPPORTED_EXTS).upper()}")

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, "El archivo supera el límite de 100 MB.")

    job_id = uuid.uuid4().hex
    base_name = (file.filename or "audio").rsplit(".", 1)[0]
    out_name   = f"{base_name}_sin_ruido.mp3"

    create_job(job_id, filename=out_name, mime_type="audio/mpeg")

    # Save upload to temp so background task can access it
    tmp_in = tempfile.mktemp(suffix=f".{ext}")
    with open(tmp_in, "wb") as f:
        f.write(contents)

    background_tasks.add_task(run_denoise_pipeline, job_id, tmp_in, ext, mode, out_name)

    return JSONResponse({"job_id": job_id}, status_code=202)
