import os
import tempfile
import logging

import numpy as np
import librosa
import soundfile as sf
from pydub import AudioSegment

from core.jobs import update_job

log = logging.getLogger(__name__)

TEMP_DIR = tempfile.gettempdir()

# ── Lazy-load DeepFilterNet ───────────────────────────────────
_df_model = None
_df_state = None


def get_deepfilter():
    global _df_model, _df_state
    if _df_model is None:
        log.info("Loading DeepFilterNet3…")
        from df.enhance import init_df
        _df_model, _df_state, _ = init_df()
        log.info("DeepFilterNet3 ready")
    return _df_model, _df_state


# ── Pipeline steps ────────────────────────────────────────────
def _to_wav(src: str) -> str:
    ext = src.rsplit(".", 1)[-1].lower()
    if ext == "wav":
        return src
    dst = src + "_conv.wav"
    seg = AudioSegment.from_file(src, format=ext)
    seg.export(dst, format="wav")
    return dst


def _deepfilter(wav_in: str, uid: str) -> str:
    from df.enhance import enhance, load_audio, save_audio
    model, state = get_deepfilter()
    audio, _ = load_audio(wav_in, sr=state.sr())
    enhanced  = enhance(model, state, audio)
    out = os.path.join(TEMP_DIR, f"{uid}_df.wav")
    save_audio(out, enhanced, state.sr())
    return out


def _noisereduce_pass(wav_in: str, uid: str) -> str:
    import noisereduce as nr
    y, sr = librosa.load(wav_in, sr=None, mono=False)
    if y.ndim == 1:
        y_clean = nr.reduce_noise(y=y, sr=sr, stationary=False, prop_decrease=0.7)
    else:
        y_clean = np.stack(
            [nr.reduce_noise(y=y[i], sr=sr, stationary=False, prop_decrease=0.7) for i in range(y.shape[0])],
            axis=0,
        )
    out = os.path.join(TEMP_DIR, f"{uid}_nr.wav")
    sf.write(out, y_clean.T if y_clean.ndim > 1 else y_clean, sr)
    return out


def _export_mp3(wav_in: str, out_mp3: str) -> str:
    seg = AudioSegment.from_wav(wav_in)
    gain = max(-20.0, -14.0 - seg.dBFS)   # normalize to -14 LUFS
    seg  = seg.apply_gain(gain)
    seg.export(out_mp3, format="mp3", bitrate="192k")
    return out_mp3


def _cleanup(*paths):
    for p in paths:
        if p and os.path.exists(p):
            try: os.remove(p)
            except OSError: pass


# ── Main background task ──────────────────────────────────────
def run_denoise_pipeline(job_id: str, src_path: str, ext: str, mode: str, out_name: str):
    uid = job_id
    wav_path = df_wav = nr_wav = None
    out_mp3  = os.path.join(TEMP_DIR, f"{uid}_clean.mp3")

    try:
        update_job(job_id, status="processing", progress=5)

        wav_path = _to_wav(src_path)
        update_job(job_id, progress=20)

        df_wav   = _deepfilter(wav_path, uid)
        update_job(job_id, progress=65)

        final = df_wav
        if mode == "premium":
            try:
                nr_wav = _noisereduce_pass(df_wav, uid)
                final  = nr_wav
            except Exception as e:
                log.warning("noisereduce second pass failed: %s", e)

        update_job(job_id, progress=85)
        _export_mp3(final, out_mp3)
        update_job(job_id, status="done", progress=100, result_path=out_mp3)
        log.info("Job %s done → %s", job_id, out_mp3)

    except Exception as e:
        log.exception("Job %s failed", job_id)
        update_job(job_id, status="error", error=str(e))
    finally:
        _cleanup(src_path, df_wav, nr_wav)
        if wav_path and wav_path != src_path:
            _cleanup(wav_path)
