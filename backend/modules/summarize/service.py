import logging
from typing import Dict, Any, List
from transformers import pipeline

log = logging.getLogger(__name__)

MODEL_NAME = "facebook/bart-large-cnn"

_cache: Dict[str, Any] = {}

def _get_pipeline():
    if "summarizer" not in _cache:
        log.info("Loading summarization model: %s", MODEL_NAME)
        # Using device=-1 for CPU. Model handles padding/truncation internally if needed,
        # but BART has a max context of 1024 tokens. We'll handle chunking if text is too long.
        summarizer = pipeline("summarization", model=MODEL_NAME, device=-1)
        _cache["summarizer"] = summarizer
        log.info("Model %s loaded", MODEL_NAME)
    return _cache["summarizer"]

def summarize_text(text: str) -> str:
    """Summarize plain text."""
    if not text.strip():
        return ""
        
    summarizer = _get_pipeline()
    
    # BART handles up to ~1024 tokens. A safe character limit for English/Spanish chunks is ~3000 chars.
    MAX_CHARS = 3000
    
    # If text is short enough, summarize it directly
    if len(text) <= MAX_CHARS:
        # Determine max_length based on input length
        input_len = len(text.split())
        max_len = min(130, max(30, int(input_len * 0.6)))
        min_len = min(30, max(10, int(input_len * 0.2)))
        
        result = summarizer(text, max_length=max_len, min_length=min_len, do_sample=False)
        return result[0]["summary_text"]
        
    # If text is too long, we need to chunk it, summarize chunks, and maybe summarize the summaries
    paragraphs = text.split("\n")
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        if len(current_chunk) + len(para) > MAX_CHARS and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            current_chunk += "\n" + para
            
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
        
    summarized_chunks = []
    for chunk in chunks:
        if len(chunk.strip()) < 50: # Too short to summarize meaningfully
            summarized_chunks.append(chunk.strip())
            continue
            
        input_len = len(chunk.split())
        max_len = min(130, max(30, int(input_len * 0.6)))
        min_len = min(30, max(10, int(input_len * 0.2)))
        
        try:
            res = summarizer(chunk, max_length=max_len, min_length=min_len, do_sample=False)
            summarized_chunks.append(res[0]["summary_text"])
        except Exception as e:
            log.warning("Failed to summarize chunk, returning original. Error: %s", e)
            summarized_chunks.append(chunk)
            
    # Combine summaries
    final_text = "\n\n".join(summarized_chunks)
    
    # If the combined summary is still longer than MAX_CHARS, we could do another pass,
    # but for simplicity, we'll return the combined chunk summaries as bullet points or paragraphs.
    return final_text

def run_document_summarization(job_id: str, src_path: str, ext: str, out_name: str) -> None:
    import os, tempfile
    from core.jobs import update_job
    from modules.translation.service import translate_docx, translate_pdf # we can't easily reuse pdf logic for extraction to summarize unless we use raw text
    import fitz
    from docx import Document

    out_dir = tempfile.gettempdir()
    
    try:
        update_job(job_id, status="processing", progress=10)
        
        text_content = ""
        
        # 1. Extract text based on format
        if ext == "pdf":
            doc = fitz.open(src_path)
            for page in doc:
                text_content += page.get_text() + "\n"
            doc.close()
            
        elif ext in ("docx", "doc"):
            doc = Document(src_path)
            for para in doc.paragraphs:
                text_content += para.text + "\n"
                
        elif ext == "txt":
            with open(src_path, "r", encoding="utf-8", errors="replace") as f:
                text_content = f.read()
        else:
            raise ValueError(f"Formato no soportado para resumen: {ext}")
            
        update_job(job_id, progress=40)
        
        # 2. Summarize
        summary = summarize_text(text_content)
        
        update_job(job_id, progress=90)
        
        # 3. Save to output text file (always return txt for summary)
        out_path = os.path.join(out_dir, f"{job_id}_summary.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(summary)
            
        update_job(job_id, status="done", progress=100,
                   result_path=out_path, filename=out_name, mime_type="text/plain")
        log.info("Doc summarization job %s done → %s", job_id, out_path)

    except Exception as e:
        log.exception("Doc summarization job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        try:
            os.remove(src_path)
        except OSError:
            pass
