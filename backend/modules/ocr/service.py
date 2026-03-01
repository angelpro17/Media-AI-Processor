import logging
import os
import tempfile
from core.jobs import update_job
import easyocr

log = logging.getLogger(__name__)

_readers = {}

def get_reader(langs: list):
    """Langs is e.g. ['es', 'en']"""
    lang_key = tuple(sorted(langs))
    if lang_key not in _readers:
        log.info(f"Loading EasyOCR model for {langs}...")
        _readers[lang_key] = easyocr.Reader(langs)
        log.info(f"EasyOCR model for {langs} loaded.")
    return _readers[lang_key]

def run_ocr(job_id: str, src_path: str, langs: list, out_name: str):
    out_dir = tempfile.gettempdir()
    try:
        update_job(job_id, status="processing", progress=10)

        reader = get_reader(langs)
        update_job(job_id, status="processing", progress=50)

        results = reader.readtext(src_path, detail=0, paragraph=True)
        text = "\n\n".join(results)

        update_job(job_id, status="processing", progress=90)
        
        out_path = os.path.join(out_dir, f"{job_id}_ocr.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)

        update_job(job_id, status="done", progress=100,
                   result_path=out_path, filename=out_name, mime_type="text/plain")
        log.info("OCR job %s done -> %s", job_id, out_path)

    except Exception as e:
        log.exception("OCR job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        try:
            os.remove(src_path)
        except OSError:
            pass
