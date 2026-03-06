"""
In-memory job store with Supabase Database persistence.
Each job:  { id, status, progress, filename, mime_type, result_path, error }
status: "pending" | "processing" | "done" | "error"
"""
import threading
import logging
from typing import Dict, Any, Optional

from core.supabase_client import supabase

log = logging.getLogger(__name__)

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
    
    if supabase:
        try:
            supabase.table("jobs").insert(job).execute()
        except Exception as e:
            log.error(f"Supabase insert failed: {e}")
            
    with _lock:
        _jobs[job_id] = job
    return job

def update_job(job_id: str, **kwargs) -> None:
    if supabase:
        try:
            supabase.table("jobs").update(kwargs).eq("id", job_id).execute()
        except Exception as e:
            log.error(f"Supabase update failed: {e}")
            
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)

def get_job(job_id: str) -> Optional[Dict]:
    if supabase:
        try:
            res = supabase.table("jobs").select("*").eq("id", job_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            log.error(f"Supabase fetch failed: {e}")
            
    with _lock:
        return _jobs.get(job_id)

def delete_job(job_id: str) -> None:
    if supabase:
        try:
            supabase.table("jobs").delete().eq("id", job_id).execute()
        except Exception as e:
            log.error(f"Supabase delete failed: {e}")
            
    with _lock:
        _jobs.pop(job_id, None)

class _JobStore:
    def get(self, job_id: str): return get_job(job_id)
    def __len__(self): return len(_jobs)

job_store = _JobStore()
