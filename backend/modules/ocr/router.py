import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException, Form, BackgroundTasks
from core.jobs import create_job
import tempfile
import os

router = APIRouter(tags=["OCR"])

SUPPORTED_EXTS = {"png", "jpg", "jpeg", "webp"}
MAX_MB = 10

@router.post("")
async def create_ocr_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    langs: str = Form("es,en") # Comma separated list of languages
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_EXTS:
        raise HTTPException(400, f"Formato no soportado para OCR. Usa: {', '.join(SUPPORTED_EXTS).upper()}")

    contents = await file.read()
    if len(contents) > MAX_MB * 1024 * 1024:
        raise HTTPException(413, f"El archivo supera el límite de {MAX_MB} MB.")

    fd, tmp_path = tempfile.mkstemp(suffix=f".{ext}")
    os.write(fd, contents)
    os.close(fd)

    from .service import run_ocr
    base_name = (file.filename or "imagen").rsplit(".", 1)[0]
    out_name = f"{base_name}_ocr.txt"
    l_list = [l.strip() for l in langs.split(",") if l.strip()]

    job_id = uuid.uuid4().hex
    create_job(job_id, filename=out_name, mime_type="text/plain")

    background_tasks.add_task(run_ocr, job_id, tmp_path, l_list, out_name)
    return {"job_id": job_id}
