import logging
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse, Response, FileResponse
from pydantic import BaseModel

from .service import (
    upload_pdf, get_session_info, render_page, render_thumbnail,
    delete_pages, reorder_pages, rotate_pages,
    add_text, add_image, redact_area, protect_pdf, get_download_path,
    export_to_docx, get_page_blocks, edit_text_block
)

log = logging.getLogger(__name__)
router = APIRouter()

MAX_BYTES = 50 * 1024 * 1024  # 50 MB


# Models for JSON requests
class DeleteRequest(BaseModel):
    session_id: str
    pages: List[int]

class ReorderRequest(BaseModel):
    session_id: str
    new_order: List[int]

class RotateRequest(BaseModel):
    session_id: str
    pages: List[int]
    angle: int

class EditBlockRequest(BaseModel):
    session_id: str
    page: int
    old_x0: float
    old_y0: float
    old_x1: float
    old_y1: float
    new_text: str
    new_x0: float
    new_y0: float
    font_size: float
    color: str

class AddTextRequest(BaseModel):
    session_id: str
    page: int
    text: str
    x: float
    y: float
    font_size: float = 12
    color: str = "#000000"

class ProtectRequest(BaseModel):
    session_id: str
    password: str

class RedactRequest(BaseModel):
    session_id: str
    page: int
    x: float
    y: float
    width: float
    height: float


@router.post("/upload")
async def api_upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF to start an editing session."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "El archivo debe ser PDF.")
        
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, "El archivo supera el límite de 50 MB.")
        
    try:
        info = upload_pdf(contents, file.filename or "document.pdf")
        return info
    except Exception as e:
        log.exception("Upload failed")
        raise HTTPException(500, str(e))


@router.get("/info/{session_id}")
def api_get_info(session_id: str):
    """Get current session metadata (pages, sizes, etc)."""
    try:
        return get_session_info(session_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/page/{session_id}/{page_num}")
def api_render_page(session_id: str, page_num: int, scale: float = 1.6):
    """Render a full page for the central preview area."""
    try:
        img_bytes = render_page(session_id, page_num, scale=scale)
        return Response(content=img_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/thumbnail/{session_id}/{page_num}")
def api_render_thumbnail(session_id: str, page_num: int):
    """Render a small thumbnail for the sidebar."""
    try:
        img_bytes = render_thumbnail(session_id, page_num)
        return Response(content=img_bytes, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/delete")
def api_delete_pages(req: DeleteRequest):
    try:
        info = delete_pages(req.session_id, req.pages)
        return info
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/reorder")
def api_reorder_pages(req: ReorderRequest):
    try:
        info = reorder_pages(req.session_id, req.new_order)
        return info
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/rotate")
def api_rotate_pages(req: RotateRequest):
    try:
        info = rotate_pages(req.session_id, req.pages, req.angle)
        return info
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/add-text")
def api_add_text(req: AddTextRequest):
    try:
        info = add_text(
            req.session_id, req.page, req.text,
            req.x, req.y, req.font_size, req.color
        )
        return info
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/add-image")
async def api_add_image(
    session_id: str = Form(...),
    page: int = Form(...),
    x: float = Form(...),
    y: float = Form(...),
    width: float = Form(...),
    height: float = Form(...),
    file: UploadFile = File(...)
):
    try:
        img_bytes = await file.read()
        info = add_image(session_id, page, img_bytes, x, y, width, height)
        return info
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/redact")
def api_redact_area(req: RedactRequest):
    try:
        info = redact_area(
            req.session_id, req.page, req.x, req.y, req.width, req.height
        )
        return info
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/protect")
def api_protect_pdf(req: ProtectRequest):
    try:
        return protect_pdf(req.session_id, req.password)
    except Exception as e:
        log.exception("Protect failed")
        raise HTTPException(500, "Error al proteger PDF (quizá ya tiene contraseña).")


@router.get("/download/{session_id}")
def api_download(session_id: str):
    """Download the final edited PDF."""
    try:
        path, filename = get_download_path(session_id)
        return FileResponse(
            path=path,
            filename=filename,
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(404, str(e))


@router.get("/download-docx/{session_id}")
def api_download_docx(session_id: str):
    """Download the PDF session as a DOCX file for full editing."""
    try:
        path, filename = export_to_docx(session_id)
        return FileResponse(
            path=path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except Exception as e:
        log.exception("DOCX export failed")
        raise HTTPException(500, "Error al convertir a Word.")

@router.get("/page-blocks/{session_id}/{page}")
async def page_blocks_endpoint(session_id: str, page: int):
    try:
        blocks = get_page_blocks(session_id, page)
        return {"blocks": blocks}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/edit-block")
async def edit_block_endpoint(req: EditBlockRequest):
    try:
        info = edit_text_block(
            req.session_id,
            req.page,
            req.old_x0, req.old_y0, req.old_x1, req.old_y1,
            req.new_text,
            req.new_x0, req.new_y0,
            req.font_size, req.color
        )
        return info
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
