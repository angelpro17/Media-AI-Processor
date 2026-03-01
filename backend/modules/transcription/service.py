import logging
import os
import tempfile
from core.jobs import update_job
import whisper

log = logging.getLogger(__name__)

# Cache the model to avoid reloading for every request
_models = {}

def get_model(model_size: str):
    if model_size not in _models:
        log.info(f"Loading Whisper model '{model_size}'...")
        _models[model_size] = whisper.load_model(model_size)
        log.info(f"Whisper model '{model_size}' loaded.")
    return _models[model_size]

def get_writer(output_format: str, output_dir: str):
    from whisper.utils import get_writer as whisper_get_writer
    return whisper_get_writer(output_format, output_dir)

def run_transcription(job_id: str, src_path: str, model_size: str, output_format: str, out_name: str):
    out_dir = tempfile.gettempdir()
    try:
        update_job(job_id, status="processing", progress=10)

        # Transcribe
        model = get_model(model_size)
        result = model.transcribe(src_path, verbose=False)
        update_job(job_id, status="processing", progress=80)

        # Write result to file
        writer = get_writer(output_format, out_dir)
        
        # Whisper writer saves file based on original filename base. So we just need to rename it later.
        # It creates <out_dir>/<base_name>.<output_format>
        base_name = os.path.basename(src_path)
        writer(result, src_path)

        # The actual written file by Whisper
        written_path = os.path.join(out_dir, f"{base_name.rsplit('.', 1)[0]}.{output_format}")
        
        final_path = os.path.join(out_dir, f"{job_id}_transcribed.{output_format}")
        if os.path.exists(written_path):
            os.rename(written_path, final_path)
        else:
            raise RuntimeError("Result file was not created by Whisper writer")

        mime_map = {
            "txt": "text/plain",
            "srt": "text/plain",
            "vtt": "text/plain"
        }
        mime = mime_map.get(output_format, "text/plain")

        update_job(job_id, status="done", progress=100,
                   result_path=final_path, filename=out_name, mime_type=mime)
        log.info("Transcription job %s done -> %s", job_id, final_path)

    except Exception as e:
        log.exception("Transcription job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        try:
            os.remove(src_path)
        except OSError:
            pass
