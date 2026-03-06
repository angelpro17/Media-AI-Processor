import logging
import os
import tempfile
from core.jobs import update_job

log = logging.getLogger(__name__)

_readers = {}

def get_reader(langs: list):
    """Langs is e.g. ['es', 'en']"""
    lang_key = tuple(sorted(langs))
    if lang_key not in _readers:
        log.info(f"Loading EasyOCR model for {langs}...")
        import easyocr
        _readers[lang_key] = easyocr.Reader(langs, gpu=False)
        log.info(f"EasyOCR model for {langs} loaded.")
    return _readers[lang_key]


def _preprocess(src_path: str) -> str:
    """
    Improve contrast and sharpness of image before OCR.
    Returns the path to a preprocessed PNG (or the original if cv2 is not available).
    """
    try:
        import cv2
        import numpy as np

        img = cv2.imread(src_path)
        if img is None:
            # Try reading with PIL for webp support
            from PIL import Image
            pil_img = Image.open(src_path).convert("RGB")
            img = np.array(pil_img)[:, :, ::-1]  # RGB → BGR

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Adaptive thresholding — makes text much crisper
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        thresh = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        out_path = src_path + "_prep.png"
        cv2.imwrite(out_path, thresh)
        return out_path
    except Exception as e:
        log.warning(f"Image preprocessing failed, using original: {e}")
        return src_path


def run_ocr(job_id: str, src_path: str, langs: list, out_name: str):
    out_dir = tempfile.gettempdir()
    prep_path = None
    try:
        update_job(job_id, status="processing", progress=10)

        # Preprocess the image for better accuracy
        prep_path = _preprocess(src_path)
        update_job(job_id, status="processing", progress=25)

        reader = get_reader(langs)
        update_job(job_id, status="processing", progress=50)

        # Run OCR — disable paragraph merging for better per-line accuracy
        # Use both the preprocessed and original images and merge results
        results_prep = reader.readtext(prep_path, detail=1, paragraph=False)
        results_orig = reader.readtext(src_path, detail=1, paragraph=False)

        # Merge: keep lines with confidence > 0.1, prefer preprocessed
        seen = set()
        lines = []
        for result_set in [results_prep, results_orig]:
            for (_, text, conf) in result_set:
                text = text.strip()
                if text and conf > 0.1 and text not in seen:
                    seen.add(text)
                    lines.append(text)

        text = "\n".join(lines) if lines else "(No se detectó texto en la imagen)"
        update_job(job_id, status="processing", progress=90)

        out_path = os.path.join(out_dir, f"{job_id}_ocr.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)

        update_job(job_id, status="done", progress=100,
                   result_path=out_path, filename=out_name, mime_type="text/plain")
        log.info("OCR job %s done -> %s chars extracted", job_id, len(text))

    except Exception as e:
        log.exception("OCR job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        for p in [src_path, prep_path]:
            if p:
                try:
                    os.remove(p)
                except OSError:
                    pass
