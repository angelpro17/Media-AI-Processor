import uuid
import tempfile
import logging

from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from core.jobs import create_job
from modules.docs.service import (
    run_conversion_pipeline,
    run_pdf_merge,
    run_pdf_split,
    run_pdf_compress
)
from typing import List

log = logging.getLogger(__name__)
router = APIRouter()

SUPPORTED_INPUT = {"pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "png", "jpg", "jpeg"}
MAX_BYTES = 50 * 1024 * 1024  # 50 MB

# Valid conversions: input_ext → list of possible output_exts
VALID_CONVERSIONS = {
    "docx": ["pdf"],
    "doc":  ["pdf"],
    "xlsx": ["pdf"],
    "xls":  ["pdf"],
    "pptx": ["pdf"],
    "ppt":  ["pdf"],
    "pdf":  ["docx", "png"],
    "png":  ["pdf"],
    "jpg":  ["pdf"],
    "jpeg": ["pdf"],
}


@router.get("/formats")
def get_formats():
    return VALID_CONVERSIONS


@router.post("/convert")
async def convert(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    output_format: str = Form(...),
):
    in_ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if in_ext not in SUPPORTED_INPUT:
        raise HTTPException(400, f"Formato de entrada no soportado: {in_ext}")

    valid_outputs = VALID_CONVERSIONS.get(in_ext, [])
    if output_format not in valid_outputs:
        raise HTTPException(400, f"No se puede convertir {in_ext.upper()} → {output_format.upper()}")

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, "El archivo supera el límite de 50 MB.")

    job_id   = uuid.uuid4().hex
    base     = (file.filename or "document").rsplit(".", 1)[0]
    out_name = f"{base}.{output_format}"

    mime_map = {
        "pdf":  "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "png":  "image/png",
    }

    tmp_in = tempfile.mktemp(suffix=f".{in_ext}")
    with open(tmp_in, "wb") as f:
        f.write(contents)

    create_job(job_id, filename=out_name, mime_type=mime_map.get(output_format, "application/octet-stream"))
    background_tasks.add_task(run_conversion_pipeline, job_id, tmp_in, in_ext, output_format, out_name)


    return JSONResponse({"job_id": job_id}, status_code=202)


@router.post("/merge")
async def merge_pdfs(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    if len(files) < 2:
        raise HTTPException(400, "Debe enviar al menos 2 archivos para unir.")
        
    tmp_paths = []
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "Todos los archivos deben ser PDF.")
        content = await f.read()
        tmp_in = tempfile.mktemp(suffix=".pdf")
        with open(tmp_in, "wb") as w:
            w.write(content)
        tmp_paths.append(tmp_in)
        
    job_id = uuid.uuid4().hex
    out_name = "merged.pdf"
    create_job(job_id, filename=out_name, mime_type="application/pdf")
    
    background_tasks.add_task(run_pdf_merge, job_id, tmp_paths, out_name)
    return JSONResponse({"job_id": job_id}, status_code=202)


@router.post("/split")
async def split_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    start: int = Form(1),
    end: int = Form(-1)
):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Debe ser un archivo PDF.")
        
    content = await file.read()
    tmp_in = tempfile.mktemp(suffix=".pdf")
    with open(tmp_in, "wb") as w:
        w.write(content)
        
    job_id = uuid.uuid4().hex
    out_name = (file.filename or "split").rsplit(".", 1)[0] + "_split.pdf"
    create_job(job_id, filename=out_name, mime_type="application/pdf")
    
    background_tasks.add_task(run_pdf_split, job_id, tmp_in, start, end, out_name)
    return JSONResponse({"job_id": job_id}, status_code=202)


@router.post("/compress")
async def compress_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Debe ser un archivo PDF.")
        
    content = await file.read()
    tmp_in = tempfile.mktemp(suffix=".pdf")
    with open(tmp_in, "wb") as w:
        w.write(content)
        
    job_id = uuid.uuid4().hex
    out_name = (file.filename or "compressed").rsplit(".", 1)[0] + "_compressed.pdf"
    create_job(job_id, filename=out_name, mime_type="application/pdf")
    
    background_tasks.add_task(run_pdf_compress, job_id, tmp_in, out_name)
    return JSONResponse({"job_id": job_id}, status_code=202)
