import os
import logging
import cloudinary
import cloudinary.uploader
from core.jobs import update_job
from dotenv import load_dotenv

from typing import Optional

load_dotenv()
log = logging.getLogger(__name__)

# Cloudinary requires CLOUDINARY_URL in environment
# e.g., CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
_has_cloud = bool(os.environ.get("CLOUDINARY_URL", ""))

def upload_to_cloud(job_id: str, local_path: str, resource_type: str = "auto") -> Optional[str]:
    """
    Uploads a local file to Cloudinary and returns the secure URL.
    Updates the job result_path pointing to CDN. If not configured, returns None.
    """
    if not _has_cloud:
        log.warning("No CLOUDINARY_URL configured. Falling back to local file serving.")
        return local_path
        
    try:
        log.info(f"Uploading generic job {job_id} output to Cloudinary...")
        resp = cloudinary.uploader.upload(
            local_path,
            resource_type=resource_type,
            public_id=job_id,
            folder="media-ai-processor"
        )
        url = resp.get("secure_url")
        log.info(f"Uploaded to CDN: {url}")
        
        # Optionally, remove local file here if we strictly want serverless operation.
        # os.remove(local_path)
        
        return url
    except Exception as e:
        log.error(f"Cloud upload failed: {e}")
        return local_path
