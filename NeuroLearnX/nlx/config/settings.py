import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


def build_settings():
    return {
        "SECRET_KEY":           os.getenv("SECRET_KEY", "dev-secret-change-me"),
        "GROQ_API_KEY":         os.getenv("GROQ_API_KEY", "").strip(),
        "GEMINI_API_KEY":       os.getenv("GEMINI_API_KEY", "").strip(),
        # ── MongoDB ──────────────────────────────────────────────────────
        "MONGO_URI":            os.getenv("MONGO_URI", "").strip(),
        # ── JWT ──────────────────────────────────────────────────────────
        "JWT_SECRET":           os.getenv("JWT_SECRET", "change_this_to_a_long_random_secret"),
        "JWT_EXPIRES_IN":       os.getenv("JWT_EXPIRES_IN", "7d"),
        # ── Admin registration gate ───────────────────────────────────────
        # Set a strong random value in .env to enable admin self-registration.
        # Leave empty ("") to disable admin registration entirely.
        "ADMIN_REGISTER_KEY":   os.getenv("ADMIN_REGISTER_KEY", "").strip(),
        # ── Legacy JSON store (kept for fallback / quiz attempts) ─────────
        "USER_STORE_PATH":      os.getenv("USER_STORE_PATH",    str(ROOT_DIR / "data" / "users.json")),
        "ATTEMPT_STORE_PATH":   os.getenv("ATTEMPT_STORE_PATH", str(ROOT_DIR / "data" / "quiz_attempts.json")),
        "JSON_SORT_KEYS": False,
    }
