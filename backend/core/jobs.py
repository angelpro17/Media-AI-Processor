"""
In-memory job store.
Each job:  { id, status, progress, filename, mime_type, result_path, error }
status: "pending" | "processing" | "done" | "error"
"""
import threading
from typing import Dict, Any, Optional

_lock = threading.Lock()
_jobs: Dict[str, Dict[str, Any]] = {}


def create_job(job_id: str, filename: str, mime_type: str) -> Dict:
    job = {
        "id":          job_id,
        "status":      "pending",
        "progress":    0,
        "filename":    filename,
        "mime_type":   mime_type,
        "result_path": None,
        "error":       None,
    }
    with _lock:
        _jobs[job_id] = job
    return job


def update_job(job_id: str, **kwargs) -> None:
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)


def get_job(job_id: str) -> Optional[Dict]:
    with _lock:
        return _jobs.get(job_id)


def delete_job(job_id: str) -> None:
    with _lock:
        _jobs.pop(job_id, None)


# Make the store dict-like for len() in main.py
class _JobStore:
    def get(self, job_id: str): return get_job(job_id)
    def __len__(self): return len(_jobs)


job_store = _JobStore()
