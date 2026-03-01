import logging
import os
import tempfile
from core.jobs import update_job
import ffmpeg

log = logging.getLogger(__name__)

def run_audio_extraction(job_id: str, src_path: str, out_name: str):
    out_dir = tempfile.gettempdir()
    try:
        update_job(job_id, status="processing", progress=10)
        out_path = os.path.join(out_dir, f"{job_id}_extracted.mp3")

        update_job(job_id, status="processing", progress=40)
        
        # FFmpeg command: extract audio as MP3, 192k bitrate
        (
            ffmpeg
            .input(src_path)
            .output(out_path, acodec="libmp3lame", audio_bitrate="192k", vn=None)
            .overwrite_output()
            .run(quiet=True)
        )

        update_job(job_id, status="done", progress=100,
                   result_path=out_path, filename=out_name, mime_type="audio/mpeg")
        log.info("Audio extraction job %s done -> %s", job_id, out_path)

    except ffmpeg.Error as e:
        err_msg = e.stderr.decode("utf-8", errors="replace") if e.stderr else str(e)
        log.exception("Audio extraction job %s failed: %s", job_id, err_msg)
        update_job(job_id, status="error", error="Fallo al extraer audio (MP4/MKV corrupto o sin pista de audio).")
    except Exception as e:
        log.exception("Audio extraction job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        try:
            os.remove(src_path)
        except OSError:
            pass
