import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


def build_settings():
    return {
        "SECRET_KEY": os.getenv("SECRET_KEY", "dev-secret-change-me"),
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY", "").strip(),
        "USER_STORE_PATH": os.getenv("USER_STORE_PATH", str(ROOT_DIR / "data" / "users.json")),
        "ATTEMPT_STORE_PATH": os.getenv("ATTEMPT_STORE_PATH", str(ROOT_DIR / "data" / "quiz_attempts.json")),
        "JSON_SORT_KEYS": False,
    }
