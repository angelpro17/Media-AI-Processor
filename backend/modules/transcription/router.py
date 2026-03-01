import uuid
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, BackgroundTasks
from core.jobs import create_job
import tempfile
import os

router = APIRouter(prefix="/transcription", tags=["Transcription"])

SUPPORTED_EXTS = {"mp3", "wav", "m4a", "ogg", "flac", "mp4", "mkv", "avi", "mov"}
MAX_MB = 100

@router.post("")
async def create_transcription_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model_size: str = Form("base"),
    output_format: str = Form("txt")
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_EXTS:
        raise HTTPException(400, f"Formato no soportado para transcripción. Usa: {', '.join(SUPPORTED_EXTS).upper()}")

    contents = await file.read()
    if len(contents) > MAX_MB * 1024 * 1024:
        raise HTTPException(413, f"El archivo supera el límite de {MAX_MB} MB.")

    fd, tmp_path = tempfile.mkstemp(suffix=f".{ext}")
    os.write(fd, contents)
    os.close(fd)

    from .service import run_transcription
    base_name = (file.filename or "media").rsplit(".", 1)[0]
    out_name = f"{base_name}_transcripcion.{output_format}"

    job_id = uuid.uuid4().hex
    create_job(job_id, filename=out_name, mime_type="text/plain")

    background_tasks.add_task(run_transcription, job_id, tmp_path, model_size, output_format, out_name)
    return {"job_id": job_id}
