import uuid
import tempfile
import logging

from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from modules.summarize.service import run_text_summarization, run_document_summarization
from core.jobs import create_job

log = logging.getLogger(__name__)
router = APIRouter()

MAX_CHARS = 20_000
MAX_DOC_MB = 20
SUPPORTED_DOC_EXTS = {"pdf", "docx", "doc", "txt"}

class SummarizeRequest(BaseModel):
    text: str = Field(..., max_length=MAX_CHARS)

@router.post("")
def summarize(req: SummarizeRequest, background_tasks: BackgroundTasks):
    """Summarize plain text (async via job system)."""
    if not req.text.strip():
        raise HTTPException(400, "El texto no puede estar vacío.")

    job_id = uuid.uuid4().hex
    create_job(job_id, filename="resumen.txt", mime_type="text/plain")
    background_tasks.add_task(run_text_summarization, job_id, req.text)

    return JSONResponse({"job_id": job_id})

@router.post("/document")
async def summarize_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Summarize an entire document (background job)."""
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_DOC_EXTS:
        raise HTTPException(400, f"Formato no soportado. Usa: {', '.join(SUPPORTED_DOC_EXTS).upper()}")

    contents = await file.read()
    if len(contents) > MAX_DOC_MB * 1024 * 1024:
        raise HTTPException(413, f"El archivo supera el límite de {MAX_DOC_MB} MB.")

    job_id   = uuid.uuid4().hex
    base     = (file.filename or "document").rsplit(".", 1)[0]
    out_name = f"{base}_resumen.txt"

    tmp = tempfile.mktemp(suffix=f".{ext}")
    with open(tmp, "wb") as f:
        f.write(contents)

    create_job(job_id, filename=out_name, mime_type="text/plain")
    background_tasks.add_task(run_document_summarization, job_id, tmp, ext, out_name)

    return JSONResponse({"job_id": job_id}, status_code=202)
