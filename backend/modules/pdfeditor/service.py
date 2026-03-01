import os
import io
import time
import uuid
import base64
import logging
import tempfile
import threading
from typing import Dict, List, Optional, Tuple, Any

import fitz  # PyMuPDF
import pikepdf
from pdf2docx import Converter

log = logging.getLogger(__name__)

TEMP_DIR = tempfile.gettempdir()
EXPIRY_MINUTES = 30  # auto-cleanup sessions older than this

_lock = threading.Lock()
_sessions: Dict[str, Dict[str, Any]] = {}




def _session_path(session_id: str) -> str:
    return os.path.join(TEMP_DIR, f"pdfeditor_{session_id}.pdf")


def _get_session(session_id: str) -> Dict[str, Any]:
    with _lock:
        session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Sesión '{session_id}' no encontrada o expirada.")
    session["last_access"] = time.time()
    return session


def _save_doc_and_close(session_id: str, doc: fitz.Document):
    """Save the current fitz.Document back to the session file safely."""
    path = _session_path(session_id)
    temp_path = path + ".tmp"
    doc.save(temp_path, garbage=4, deflate=True)
    doc.close()
    os.replace(temp_path, path)


def cleanup_expired():
    """Remove sessions older than EXPIRY_MINUTES."""
    now = time.time()
    expired = []
    with _lock:
        for sid, info in list(_sessions.items()):
            if now - info["last_access"] > EXPIRY_MINUTES * 60:
                expired.append(sid)
        for sid in expired:
            del _sessions[sid]
    for sid in expired:
        path = _session_path(sid)
        try:
            os.remove(path)
        except OSError:
            pass
    if expired:
        log.info("Cleaned up %d expired PDF editor sessions", len(expired))




def upload_pdf(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Save uploaded PDF, create session, return metadata."""
    cleanup_expired()

    session_id = uuid.uuid4().hex[:12]
    path = _session_path(session_id)

    with open(path, "wb") as f:
        f.write(file_bytes)

    doc = fitz.open(path)
    page_count = len(doc)

    pages_info = []
    for i in range(page_count):
        page = doc[i]
        r = page.rect
        pages_info.append({
            "index": i,
            "width": round(r.width, 1),
            "height": round(r.height, 1),
            "rotation": page.rotation,
        })
    doc.close()

    with _lock:
        _sessions[session_id] = {
            "filename": filename,
            "path": path,
            "page_count": page_count,
            "created": time.time(),
            "last_access": time.time(),
        }

    return {
        "session_id": session_id,
        "filename": filename,
        "page_count": page_count,
        "pages": pages_info,
    }


def get_session_info(session_id: str) -> Dict[str, Any]:
    """Return current session info with page metadata."""
    session = _get_session(session_id)
    doc = fitz.open(session["path"])
    pages_info = []
    for i in range(len(doc)):
        page = doc[i]
        r = page.rect
        pages_info.append({
            "index": i,
            "width": round(r.width, 1),
            "height": round(r.height, 1),
            "rotation": page.rotation,
        })
    page_count = len(doc)
    doc.close()

    # Update cached page_count
    with _lock:
        if session_id in _sessions:
            _sessions[session_id]["page_count"] = page_count

    return {
        "session_id": session_id,
        "filename": session["filename"],
        "page_count": page_count,
        "pages": pages_info,
    }




def render_page(session_id: str, page_num: int, scale: float = 1.5) -> bytes:
    """Render a page as PNG bytes."""
    session = _get_session(session_id)
    doc = fitz.open(session["path"])

    if page_num < 0 or page_num >= len(doc):
        doc.close()
        raise ValueError(f"Página {page_num} fuera de rango (0-{len(doc)-1})")

    page = doc[page_num]
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img_bytes = pix.tobytes("png")
    doc.close()
    return img_bytes


def render_thumbnail(session_id: str, page_num: int) -> bytes:
    """Render a small thumbnail (scale=0.3) for the page panel."""
    return render_page(session_id, page_num, scale=0.3)


def render_all_thumbnails(session_id: str) -> List[str]:
    """Render all page thumbnails as base64 strings."""
    session = _get_session(session_id)
    doc = fitz.open(session["path"])
    thumbnails = []
    for i in range(len(doc)):
        page = doc[i]
        mat = fitz.Matrix(0.3, 0.3)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        b64 = base64.b64encode(img_bytes).decode("ascii")
        thumbnails.append(f"data:image/png;base64,{b64}")
    doc.close()
    return thumbnails




def delete_pages(session_id: str, page_indices: List[int]) -> Dict[str, Any]:
    """Delete pages at given indices (0-based)."""
    session = _get_session(session_id)
    doc = fitz.open(session["path"])

    # Sort descending so indices don't shift during deletion
    for idx in sorted(page_indices, reverse=True):
        if 0 <= idx < len(doc):
            doc.delete_page(idx)

    if len(doc) == 0:
        doc.close()
        raise ValueError("No se pueden eliminar todas las páginas.")

    _save_doc_and_close(session_id, doc)
    return get_session_info(session_id)


def reorder_pages(session_id: str, new_order: List[int]) -> Dict[str, Any]:
    """Reorder pages based on a list of current indices in the desired order."""
    session = _get_session(session_id)
    doc = fitz.open(session["path"])

    if sorted(new_order) != list(range(len(doc))):
        doc.close()
        raise ValueError("El nuevo orden debe contener todos los índices de página exactamente una vez.")

    doc.select(new_order)
    _save_doc_and_close(session_id, doc)
    return get_session_info(session_id)


def rotate_pages(session_id: str, page_indices: List[int], angle: int) -> Dict[str, Any]:
    """Rotate pages by angle (must be multiple of 90)."""
    if angle % 90 != 0:
        raise ValueError("El ángulo debe ser múltiplo de 90.")

    session = _get_session(session_id)
    doc = fitz.open(session["path"])

    for idx in page_indices:
        if 0 <= idx < len(doc):
            page = doc[idx]
            page.set_rotation((page.rotation + angle) % 360)

    _save_doc_and_close(session_id, doc)
    return get_session_info(session_id)




def add_text(
    session_id: str,
    page_num: int,
    text: str,
    x: float,
    y: float,
    font_size: float = 12,
    color: str = "#000000",
) -> Dict[str, Any]:
    """Insert text at (x, y) on the given page."""
    session = _get_session(session_id)
    doc = fitz.open(session["path"])

    if page_num < 0 or page_num >= len(doc):
        doc.close()
        raise ValueError(f"Página {page_num} fuera de rango.")

    page = doc[page_num]

    # Parse hex color
    r_c = int(color[1:3], 16) / 255
    g_c = int(color[3:5], 16) / 255
    b_c = int(color[5:7], 16) / 255

    # Insert text using the built-in Helvetica (no external fonts needed)
    text_writer = fitz.TextWriter(page.rect)
    font = fitz.Font("helv")
    text_writer.append((x, y), text, font=font, fontsize=font_size)
    text_writer.write_text(page, color=(r_c, g_c, b_c))

    _save_doc_and_close(session_id, doc)
    return get_session_info(session_id)


def add_image(
    session_id: str,
    page_num: int,
    image_bytes: bytes,
    x: float,
    y: float,
    width: float,
    height: float,
) -> Dict[str, Any]:
    """Insert an image at (x, y, x+width, y+height) on the given page."""
    session = _get_session(session_id)
    doc = fitz.open(session["path"])

    if page_num < 0 or page_num >= len(doc):
        doc.close()
        raise ValueError(f"Página {page_num} fuera de rango.")

    page = doc[page_num]
    rect = fitz.Rect(x, y, x + width, y + height)
    page.insert_image(rect, stream=image_bytes)

    _save_doc_and_close(session_id, doc)
    return get_session_info(session_id)


def redact_area(
    session_id: str,
    page_num: int,
    x: float,
    y: float,
    width: float,
    height: float,
) -> Dict[str, Any]:
    """
    Draw a white rectangle over a specific area to "erase" or redact content visually.
    This allows the user to then place new text over it.
    """
    session = _get_session(session_id)
    doc = fitz.open(session["path"])

    if page_num < 0 or page_num >= len(doc):
        doc.close()
        raise ValueError(f"Página {page_num} fuera de rango.")

    page = doc[page_num]
    rect = fitz.Rect(x, y, x + width, y + height)
    
    # Draw a white filled rectangle (border=white, fill=white)
    page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))

    _save_doc_and_close(session_id, doc)
    return get_session_info(session_id)


def get_page_blocks(session_id: str, page_num: int) -> List[Dict[str, Any]]:
    """Return text blocks for a specific page with their bounding boxes."""
    session = _get_session(session_id)
    doc = fitz.open(session["path"])
    
    if page_num < 0 or page_num >= len(doc):
        doc.close()
        return []
        
    page = doc[page_num]
    # get_text("dict") provides detailed info, but "blocks" is simpler (x0, y0, x1, y1, text, block_no, block_type)
    # block_type 0 is text.
    blocks = page.get_text("blocks")
    doc.close()
    
    result = []
    for b in blocks:
        if b[6] == 0:  # If it's a text block
            result.append({
                "x0": b[0],
                "y0": b[1],
                "x1": b[2],
                "y1": b[3],
                "text": b[4].strip()
            })
    return result


def edit_text_block(
    session_id: str,
    page_num: int,
    old_x0: float,
    old_y0: float,
    old_x1: float,
    old_y1: float,
    new_text: str,
    new_x0: float,
    new_y0: float,
    font_size: float,
    color_hex: str
) -> Dict[str, Any]:
    """
    Replaces a specific text block by redacting the original bounding box 
    and inserting new text in its place.
    """
    session = _get_session(session_id)
    doc = fitz.open(session["path"])

    if page_num < 0 or page_num >= len(doc):
        doc.close()
        raise ValueError(f"Página {page_num} fuera de rango.")

    page = doc[page_num]
    
    wipe_rect = fitz.Rect(old_x0 - 2, old_y0 - 2, old_x1 + 2, old_y1 + 2)
    page.draw_rect(wipe_rect, color=(1, 1, 1), fill=(1, 1, 1))

    color_hex = color_hex.lstrip("#")
    r = int(color_hex[0:2], 16) / 255.0
    g = int(color_hex[2:4], 16) / 255.0
    b = int(color_hex[4:6], 16) / 255.0

    if new_text.strip():
        text_rect = fitz.Rect(new_x0, new_y0, max(new_x0 + 10, page.rect.width - 20), page.rect.height - 20)
        page.insert_textbox(text_rect, new_text, fontsize=font_size, color=(r,g,b), fontname="helv", align=0)

    _save_doc_and_close(session_id, doc)
    return get_session_info(session_id)



def protect_pdf(session_id: str, password: str) -> Dict[str, Any]:
    """Encrypt the PDF with a password using pikepdf."""
    session = _get_session(session_id)
    path = session["path"]

    pdf = pikepdf.open(path)
    out_path = path + ".enc"
    pdf.save(
        out_path,
        encryption=pikepdf.Encryption(
            owner=password,
            user=password,
            R=6,  # AES-256
        ),
    )
    pdf.close()

    # Replace original with encrypted version
    os.replace(out_path, path)

    return {"session_id": session_id, "protected": True}


def get_download_path(session_id: str) -> Tuple[str, str]:
    """Return (file_path, filename) for download."""
    session = _get_session(session_id)
    path = session["path"]
    
    orig_name = session["filename"]
    if not orig_name.startswith("edited_"):
        orig_name = f"edited_{orig_name}"
        
    return path, orig_name


def export_to_docx(session_id: str) -> Tuple[str, str]:
    """Convert the current state of the PDF session into a DOCX file for full editing."""
    session = _get_session(session_id)
    pdf_path = session["path"]
    
    docx_filename = session["filename"].replace(".pdf", ".docx")
    if not docx_filename.endswith(".docx"):
        docx_filename += ".docx"
        
    docx_path = os.path.join(TEMP_DIR, f"{session_id}.docx")
    
    # Convert using pdf2docx
    cv = Converter(pdf_path)
    cv.convert(docx_path)
    cv.close()
    
    return docx_path, docx_filename
