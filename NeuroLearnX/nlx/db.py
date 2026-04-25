"""
MongoDB connection for the Flask service.
Connects to the SAME Atlas cluster as the Node.js backend.

Key fix: never cache None — always retry on next request if the
previous attempt failed. URI is read from env directly (not from
current_app.config) so it works even before the app context is fully
established.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env immediately so os.getenv works at import time
_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_ROOT / ".env")

try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
    _HAS_PYMONGO = True
except ImportError:
    _HAS_PYMONGO = False

_client = None   # module-level singleton — only set on SUCCESS


def _uri() -> str:
    """Read URI from env directly — works with or without app context."""
    # Try app config first (inside request context), fall back to os.getenv
    try:
        from flask import current_app
        val = current_app.config.get("MONGO_URI", "")
        if val:
            return val.strip()
    except RuntimeError:
        pass  # No app context — that's fine
    return os.getenv("MONGO_URI", "").strip()


def _get_client() -> "MongoClient | None":
    global _client

    # Return cached working client
    if _client is not None:
        return _client

    if not _HAS_PYMONGO:
        print("[Flask DB] pymongo not installed. Run: pip install pymongo")
        return None

    uri = _uri()
    if not uri:
        print("[Flask DB] MONGO_URI is not set in .env")
        return None

    try:
        client = MongoClient(
            uri,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
        )
        # Verify connectivity with a cheap ping
        client.admin.command("ping")
        _client = client   # only cache on success
        print(f"[Flask DB] MongoDB connected: {uri[:45]}...")
        return _client
    except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
        print(f"[Flask DB] Connection failed (will retry next request): {exc}")
        return None   # do NOT cache None — allow retry
    except Exception as exc:
        print(f"[Flask DB] Unexpected error: {exc}")
        return None   # do NOT cache None


def get_db():
    """
    Return the 'NeroX' database (same DB the Node.js app uses).
    Returns None if connection is unavailable — callers must handle this.
    """
    client = _get_client()
    if client is None:
        return None
    return client["NeroX"]


def reset_client():
    """Force a fresh connection attempt (useful after network recovery)."""
    global _client
    if _client is not None:
        try:
            _client.close()
        except Exception:
            pass
    _client = None


def seed_defaults():
    """
    Ensure demo seed users exist in MongoDB.
    Called once on first request. Safe to call multiple times (idempotent).

    Uses bcrypt (same as Node.js) so passwords work on both backends.
    """
    from datetime import datetime, timezone

    db = get_db()
    if db is None:
        print("[Flask seed] Skipping — no DB connection")
        return

    # Import bcrypt for Node.js-compatible hashes
    try:
        import bcrypt as _bcrypt
        def _hash(pw): return _bcrypt.hashpw(pw.encode(), _bcrypt.gensalt(10)).decode()
    except ImportError:
        # Fallback to werkzeug if bcrypt not installed
        from werkzeug.security import generate_password_hash
        def _hash(pw): return generate_password_hash(pw, method="pbkdf2:sha256")

    SEEDS = [
        {"name": "NeuroXLearn Admin",   "email": "admin@neuroxlearn.com",   "password": "Admin@123",   "role": "admin"},
        {"name": "Neuro Admin",         "email": "admin@neuro.com",         "password": "admin123",    "role": "admin"},
        {"name": "NeuroXLearn Student", "email": "student@neuroxlearn.com", "password": "Student@123", "role": "student"},
        {"name": "Neuro User",          "email": "user@neuro.com",          "password": "user123",     "role": "student"},
    ]

    users = db["users"]
    now   = datetime.now(timezone.utc).isoformat()

    for seed in SEEDS:
        existing = users.find_one({"email": seed["email"]})
        if existing:
            stored = existing.get("password", "")
            # Only repair if password is plain-text (len < 20) or unknown format
            is_hashed = len(stored) > 20 and (stored.startswith("$2") or stored.startswith("pbkdf2:"))
            if not is_hashed:
                users.update_one({"email": seed["email"]}, {"$set": {"password": _hash(seed["password"])}})
                print(f"[Flask seed] Repaired password: {seed['email']}")
            # Never overwrite a valid existing hash — Node.js may have set it
            continue

        users.insert_one({
            "name":            seed["name"],
            "email":           seed["email"],
            "password":        _hash(seed["password"]),
            "role":            seed["role"],
            "enrolledCourses": [],
            "lastActiveAt":    now,
            "createdAt":       now,
            "updatedAt":       now,
        })
        print(f"[Flask seed] Created: {seed['email']} ({seed['role']})")
