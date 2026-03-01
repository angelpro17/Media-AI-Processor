import os
import subprocess
import tempfile
import logging

from core.jobs import update_job
from config import settings

log = logging.getLogger(__name__)
TEMP_DIR = tempfile.gettempdir()


def _cleanup(*paths):
    for p in paths:
        if p and os.path.exists(p):
            try: os.remove(p)
            except OSError: pass


def run_pdf_merge(job_id: str, src_paths: list, out_name: str):
    import fitz
    out_path = os.path.join(TEMP_DIR, f"{job_id}_merged.pdf")
    try:
        update_job(job_id, status="processing", progress=10)
        result_doc = fitz.open()
        for i, src in enumerate(src_paths):
            doc = fitz.open(src)
            result_doc.insert_pdf(doc)
            doc.close()
            update_job(job_id, status="processing", progress=10 + int(80 * (i + 1) / len(src_paths)))
            
        result_doc.save(out_path, garbage=4, deflate=True)
        result_doc.close()
        
        update_job(job_id, status="done", progress=100, result_path=out_path, filename=out_name, mime_type="application/pdf")
        log.info("PDF Merge job %s done -> %s", job_id, out_path)
    except Exception as e:
        log.exception("PDF Merge job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        _cleanup(*src_paths)


def run_pdf_split(job_id: str, src_path: str, start: int, end: int, out_name: str):
    import fitz
    out_path = os.path.join(TEMP_DIR, f"{job_id}_split.pdf")
    try:
        update_job(job_id, status="processing", progress=10)
        doc = fitz.open(src_path)
        
        # 1-indexed to 0-indexed, and handle "end" = -1 for last page
        start_idx = max(0, start - 1)
        end_idx = len(doc) - 1 if end <= 0 else min(len(doc) - 1, end - 1)
        
        result_doc = fitz.open()
        result_doc.insert_pdf(doc, from_page=start_idx, to_page=end_idx)
        result_doc.save(out_path, garbage=4, deflate=True)
        result_doc.close()
        doc.close()
        
        update_job(job_id, status="done", progress=100, result_path=out_path, filename=out_name, mime_type="application/pdf")
        log.info("PDF Split job %s done -> %s", job_id, out_path)
    except Exception as e:
        log.exception("PDF Split job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        _cleanup(src_path)


def run_pdf_compress(job_id: str, src_path: str, out_name: str):
    import fitz
    out_path = os.path.join(TEMP_DIR, f"{job_id}_compressed.pdf")
    try:
        update_job(job_id, status="processing", progress=10)
        doc = fitz.open(src_path)
        
        # Simple compression using fitz garbage options
        update_job(job_id, status="processing", progress=50)
        doc.save(out_path, garbage=4, deflate=True, clean=True)
        doc.close()
        
        update_job(job_id, status="done", progress=100, result_path=out_path, filename=out_name, mime_type="application/pdf")
        log.info("PDF Compress job %s done -> %s", job_id, out_path)
    except Exception as e:
        log.exception("PDF Compress job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        _cleanup(src_path)


def _libreoffice_convert(src: str, out_dir: str, out_fmt: str = "pdf") -> str:
    """Use LibreOffice headless to convert → PDF (or other format)."""
    soffice = settings.soffice_path
    if not os.path.exists(soffice):
        # fallback: try system PATH
        soffice = "soffice"

    cmd = [soffice, "--headless", "--norestore", f"--convert-to", out_fmt, "--outdir", out_dir, src]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"LibreOffice error: {result.stderr}")

    # LibreOffice outputs file with same basename
    basename = os.path.splitext(os.path.basename(src))[0]
    out_path = os.path.join(out_dir, f"{basename}.{out_fmt}")
    if not os.path.exists(out_path):
        raise FileNotFoundError(f"LibreOffice output not found: {out_path}")
    return out_path


def _pdf_to_docx(src_pdf: str, out_path: str) -> str:
    from pdf2docx import Converter
    cv = Converter(src_pdf)
    cv.convert(out_path, start=0, end=None)
    cv.close()
    return out_path


def _pdf_to_images(src_pdf: str, out_dir: str) -> str:
    """Convert each PDF page to PNG, then zip all images."""
    import fitz
    import zipfile

    doc   = fitz.open(src_pdf)
    paths = []
    for i, page in enumerate(doc):
        mat = fitz.Matrix(2.0, 2.0)   # 2× scale = ~150 DPI
        pix = page.get_pixmap(matrix=mat)
        p   = os.path.join(out_dir, f"page_{i+1:03}.png")
        pix.save(p)
        paths.append(p)
    doc.close()

    if len(paths) == 1:
        return paths[0]   # single image, no zip needed

    zip_path = os.path.join(out_dir, "pages.zip")
    with zipfile.ZipFile(zip_path, "w") as zf:
        for p in paths:
            zf.write(p, os.path.basename(p))
    for p in paths:
        _cleanup(p)
    return zip_path


def _images_to_pdf(src: str, out_path: str) -> str:
    import fitz
    doc = fitz.open()
    img_doc = fitz.open(src)
    rect = img_doc[0].rect
    page = doc.new_page(width=rect.width, height=rect.height)
    page.insert_image(rect, filename=src)
    doc.save(out_path)
    doc.close()
    return out_path


# ── Main background task ──────────────────────────────────────
def run_conversion_pipeline(job_id: str, src_path: str, in_ext: str, out_fmt: str, out_name: str):
    out_path = None
    out_dir  = TEMP_DIR

    try:
        update_job(job_id, status="processing", progress=10)

        if in_ext in ("docx", "doc", "xlsx", "xls", "pptx", "ppt") and out_fmt == "pdf":
            out_path = _libreoffice_convert(src_path, out_dir, "pdf")

        elif in_ext == "pdf" and out_fmt == "docx":
            out_path = os.path.join(out_dir, f"{job_id}.docx")
            _pdf_to_docx(src_path, out_path)

        elif in_ext == "pdf" and out_fmt == "png":
            img_dir  = tempfile.mkdtemp()
            out_path = _pdf_to_images(src_path, img_dir)

        elif in_ext in ("png", "jpg", "jpeg") and out_fmt == "pdf":
            out_path = os.path.join(out_dir, f"{job_id}.pdf")
            _images_to_pdf(src_path, out_path)

        else:
            raise ValueError(f"Unsupported conversion: {in_ext} → {out_fmt}")

        update_job(job_id, status="done", progress=100, result_path=out_path)
        log.info("Job %s done → %s", job_id, out_path)

    except Exception as e:
        log.exception("Job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        _cleanup(src_path)
