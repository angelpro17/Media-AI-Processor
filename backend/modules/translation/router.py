import uuid
import tempfile
import logging

from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from modules.translation.service import (
    translate_text, run_document_translation, SUPPORTED_PAIRS
)
from core.jobs import create_job

log = logging.getLogger(__name__)
router = APIRouter()

MAX_CHARS = 10_000
MAX_DOC_MB = 20
SUPPORTED_DOC_EXTS = {"pdf", "docx", "doc", "txt"}


class TranslateRequest(BaseModel):
    text:      str = Field(..., max_length=MAX_CHARS)
    direction: str = Field(..., description="'es-en' or 'en-es'")


@router.get("/pairs")
def get_pairs():
    return list(SUPPORTED_PAIRS.keys())


@router.post("")
def translate(req: TranslateRequest):
    """Translate plain text (synchronous — fast)."""
    if req.direction not in SUPPORTED_PAIRS:
        raise HTTPException(400, f"Dirección no soportada. Usa: {', '.join(SUPPORTED_PAIRS)}")
    if not req.text.strip():
        raise HTTPException(400, "El texto no puede estar vacío.")
    result = translate_text(req.text, req.direction)
    return JSONResponse({"translated": result, "direction": req.direction})


@router.post("/document")
async def translate_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    direction: str   = Form(...),
):
    """Translate an entire document file (background job)."""
    if direction not in SUPPORTED_PAIRS:
        raise HTTPException(400, f"Dirección no soportada: {direction}")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_DOC_EXTS:
        raise HTTPException(400, f"Formato no soportado. Usa: {', '.join(SUPPORTED_DOC_EXTS).upper()}")

    contents = await file.read()
    if len(contents) > MAX_DOC_MB * 1024 * 1024:
        raise HTTPException(413, f"El archivo supera el límite de {MAX_DOC_MB} MB.")

    job_id   = uuid.uuid4().hex
    base     = (file.filename or "document").rsplit(".", 1)[0]
    out_name = f"{base}_traducido.{ext}"

    mime_map = {
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc":  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pdf":  "application/pdf",
        "txt":  "text/plain",
    }

    tmp = tempfile.mktemp(suffix=f".{ext}")
    with open(tmp, "wb") as f:
        f.write(contents)

    create_job(job_id, filename=out_name, mime_type=mime_map.get(ext, "application/octet-stream"))
    background_tasks.add_task(run_document_translation, job_id, tmp, ext, direction, out_name)

    return JSONResponse({"job_id": job_id}, status_code=202)
