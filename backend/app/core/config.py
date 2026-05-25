# app/core/config.py
# Central configuration loaded from environment variables.
# All modules should import settings from here rather than reading os.getenv directly.

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── LLM ───────────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # ── Server ────────────────────────────────────────────────────────────────
    PORT: int = int(os.getenv("PORT", 8000))
    ENV: str = os.getenv("ENV", "production")

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:8080"
    ).split(",")

    # ── RAG ───────────────────────────────────────────────────────────────────
    CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", "rag/chroma_db")
    CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "agentnation_rag")

    # ── Memory ────────────────────────────────────────────────────────────────
    SIMULATION_LOG_PATH: str = os.getenv("SIMULATION_LOG_PATH", "memory/simulation_log.json")

    @property
    def is_development(self) -> bool:
        return self.ENV.lower() == "development"

    @property
    def resolved_api_key(self) -> str:
        return self.GEMINI_API_KEY or self.GOOGLE_API_KEY


settings = Settings()
