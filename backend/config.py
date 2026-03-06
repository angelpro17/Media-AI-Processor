from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # CORS
    allowed_origins: List[str] = ["*"]

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # File limits
    max_audio_mb: int = 100
    max_doc_mb: int = 50
    max_text_chars: int = 10_000

    # LibreOffice
    soffice_path: str = "/Applications/LibreOffice.app/Contents/MacOS/soffice"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
