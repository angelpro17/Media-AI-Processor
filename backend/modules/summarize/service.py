"""
Extractive text summarizer.
Works in any language — selects the most important sentences from the original text
using TF-IDF-style word-frequency scoring. No heavy ML model required.
"""
import logging
import re
import math
from collections import Counter
from typing import List, Tuple

log = logging.getLogger(__name__)

# Common stopwords (Spanish + English) to ignore when scoring
_STOPWORDS = frozenset(
    # Spanish
    "de la el en y a los las del un una que es por con para se al lo como su más no o "
    "pero sino también entre sobre todo este esta estos estas ese esa esos esas aquel "
    "aquella ha sido ser estar muy ya desde hasta donde cuando fue han sido tiene tienen "
    "sin embargo así puede pueden cual cuales hay le les nos me te mi mis tu tus sus "
    "otro otra otros otras cada uno una unos unas era eran ser hay "
    # English
    "the a an in to of and is for on with this that it are was be has have had will would "
    "can could should may might shall not or but from at by as do does did been being if "
    "its our their your my his her we they them him us all some any no between into "
    "through during before after above below such than too very can just don so now".split()
)


def _split_sentences(text: str) -> List[str]:
    """Split text into sentences, handling common abbreviations."""
    # Split on sentence-ending punctuation followed by space + uppercase or end
    parts = re.split(r'(?<=[.!?;])\s+', text.strip())
    # Filter out very short fragments
    return [s.strip() for s in parts if len(s.strip()) > 15]


def _score_sentences(sentences: List[str]) -> List[Tuple[int, float, str]]:
    """Score sentences by word frequency relevance."""
    # Build word frequency from all text
    all_words = []
    for sent in sentences:
        words = re.findall(r'\b\w{3,}\b', sent.lower())
        all_words.extend(w for w in words if w not in _STOPWORDS)

    if not all_words:
        return [(i, 1.0, s) for i, s in enumerate(sentences)]

    freq = Counter(all_words)
    max_freq = max(freq.values())
    # Normalize to 0-1
    norm_freq = {w: c / max_freq for w, c in freq.items()}

    scored = []
    for i, sent in enumerate(sentences):
        words = re.findall(r'\b\w{3,}\b', sent.lower())
        content_words = [w for w in words if w not in _STOPWORDS]

        if not content_words:
            scored.append((i, 0.0, sent))
            continue

        # Average word importance
        word_score = sum(norm_freq.get(w, 0) for w in content_words) / len(content_words)

        # Length bonus: prefer medium-length sentences (not too short, not too long)
        length_factor = min(1.0, len(content_words) / 8)

        # Position bonus: first and last sentences are often important
        n = len(sentences)
        if i == 0:
            pos_bonus = 1.3
        elif i == n - 1:
            pos_bonus = 1.1
        elif i < n * 0.2:
            pos_bonus = 1.15
        else:
            pos_bonus = 1.0

        score = word_score * length_factor * pos_bonus
        scored.append((i, score, sent))

    return scored


def summarize_text(text: str, ratio: float = 0.35) -> str:
    """
    Extractive summarization: pick the most important sentences.
    ratio: fraction of sentences to keep (0.0 - 1.0)
    """
    if not text.strip():
        return ""

    sentences = _split_sentences(text)

    if len(sentences) <= 3:
        return text.strip()

    scored = _score_sentences(sentences)

    # Number of sentences to select
    n_select = max(2, min(len(sentences) - 1, int(math.ceil(len(sentences) * ratio))))

    # Pick top-scoring sentences
    top = sorted(scored, key=lambda x: x[1], reverse=True)[:n_select]

    # Return them in original order for coherence
    top.sort(key=lambda x: x[0])

    return " ".join(s[2] for s in top)


def run_text_summarization(job_id: str, text: str) -> None:
    """Background job for text summarization."""
    from core.jobs import update_job

    try:
        update_job(job_id, status="processing", progress=50)
        summary = summarize_text(text)
        update_job(job_id, status="done", progress=100, summary=summary)
        log.info("Text summarization job %s done", job_id)
    except Exception as e:
        log.exception("Text summarization job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))


def run_document_summarization(job_id: str, src_path: str, ext: str, out_name: str) -> None:
    import os, tempfile
    from core.jobs import update_job
    import fitz
    from docx import Document

    out_dir = tempfile.gettempdir()

    try:
        update_job(job_id, status="processing", progress=10)

        text_content = ""

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

        summary = summarize_text(text_content)

        update_job(job_id, progress=90)

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
