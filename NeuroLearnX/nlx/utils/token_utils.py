"""
JWT helpers — matches the Node.js token shape exactly:
  payload: { userId, email, role }

Uses PyJWT (pip install PyJWT).
Falls back gracefully if the library is missing.
"""
import os
from datetime import datetime, timedelta, timezone

from flask import current_app

try:
    import jwt as _jwt
    _HAS_JWT = True
except ImportError:
    _HAS_JWT = False


def _secret():
    try:
        return current_app.config.get("JWT_SECRET") or os.getenv("JWT_SECRET", "change_this_to_a_long_random_secret")
    except RuntimeError:
        return os.getenv("JWT_SECRET", "change_this_to_a_long_random_secret")


def _expires_delta():
    """Parse JWT_EXPIRES_IN like '7d', '1d', '24h' into a timedelta."""
    raw = (current_app.config.get("JWT_EXPIRES_IN") or "7d").strip()
    if raw.endswith("d"):
        return timedelta(days=int(raw[:-1]))
    if raw.endswith("h"):
        return timedelta(hours=int(raw[:-1]))
    if raw.endswith("m"):
        return timedelta(minutes=int(raw[:-1]))
    return timedelta(days=7)


def issue_token(payload: dict) -> str:
    """
    Sign a JWT.  payload must contain at least: userId, email, role.
    """
    if not _HAS_JWT:
        raise RuntimeError("PyJWT is not installed. Run: pip install PyJWT")

    data = dict(payload)
    data["exp"] = datetime.now(timezone.utc) + _expires_delta()
    data["iat"] = datetime.now(timezone.utc)
    return _jwt.encode(data, _secret(), algorithm="HS256")


def read_token(token: str):
    """
    Verify and decode a JWT.  Returns the payload dict or None on failure.
    Accepts tokens issued by both Flask (this file) and Node.js.
    """
    if not token or not _HAS_JWT:
        return None
    try:
        payload = _jwt.decode(token, _secret(), algorithms=["HS256"])
        # Normalise: Node uses `userId`, Flask may use `id` — expose both
        if "userId" in payload and "id" not in payload:
            payload["id"] = payload["userId"]
        if "id" in payload and "userId" not in payload:
            payload["userId"] = payload["id"]
        return payload
    except _jwt.ExpiredSignatureError:
        return None
    except _jwt.InvalidTokenError:
        return None
