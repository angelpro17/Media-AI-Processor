import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks
from core.jobs import create_job
import tempfile
import os

router = APIRouter(tags=["Video Tools"])

SUPPORTED_EXTS = {"mp4", "mkv", "avi", "mov", "webm"}
MAX_MB = 200

@router.post("/extract-audio")
async def extract_audio_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_EXTS:
        raise HTTPException(400, f"Formato no soportado para extracción. Usa: {', '.join(SUPPORTED_EXTS).upper()}")

    contents = await file.read()
    if len(contents) > MAX_MB * 1024 * 1024:
        raise HTTPException(413, f"El archivo supera el límite de {MAX_MB} MB.")

    fd, tmp_path = tempfile.mkstemp(suffix=f".{ext}")
    os.write(fd, contents)
    os.close(fd)

    from .service import run_audio_extraction
    base_name = (file.filename or "video").rsplit(".", 1)[0]
    out_name = f"{base_name}_audio.mp3"

    job_id = uuid.uuid4().hex
    create_job(job_id, filename=out_name, mime_type="audio/mpeg")

    background_tasks.add_task(run_audio_extraction, job_id, tmp_path, out_name)
    return {"job_id": job_id}
