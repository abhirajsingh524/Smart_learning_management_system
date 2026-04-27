"""
Optional Flask service — health check + MongoDB connectivity test.
Reads MONGO_URI directly from the project .env file.
"""
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# ── Load .env from project root (two levels up from this file) ────────────
_ROOT = Path(__file__).resolve().parents[1]   # NeuroLearnX/
load_dotenv(_ROOT / ".env")

app = Flask(__name__)

# ── Reusable MongoDB client (created once, not per-request) ───────────────
_mongo_client: MongoClient | None = None


def _get_client() -> MongoClient | None:
    """Return a cached MongoClient, creating it on first call."""
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client

    uri = os.getenv("MONGO_URI", "").strip()
    if not uri:
        print("[flask_service] MONGO_URI is not set in .env")
        return None

    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=8000)
        client.admin.command("ping")          # verify on first connect
        _mongo_client = client
        print(f"[flask_service] MongoDB connected: {uri[:45]}...")
        return _mongo_client
    except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
        print(f"[flask_service] MongoDB connection failed: {exc}")
        return None
    except Exception as exc:
        print(f"[flask_service] Unexpected error: {exc}")
        return None


# ── Routes ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Basic liveness check — always returns 200."""
    return jsonify({"status": "ok", "service": "flask_service"})


@app.get("/mongo/ping")
def mongo_ping():
    """
    Verify MongoDB connectivity.
    Reads MONGO_URI from .env — no hardcoded credentials.
    Returns:
      200  { "mongo": "ok",   "uri_set": true }
      503  { "mongo": "error", "message": "..." }
    """
    uri = os.getenv("MONGO_URI", "").strip()
    if not uri:
        return jsonify({
            "mongo":   "error",
            "message": "MONGO_URI is not set in .env",
            "uri_set": False,
        }), 503

    client = _get_client()
    if client is None:
        return jsonify({
            "mongo":   "error",
            "message": "Could not connect to MongoDB. Check MONGO_URI in .env.",
            "uri_set": True,
        }), 503

    try:
        client.admin.command("ping")
        return jsonify({
            "mongo":   "ok",
            "uri_set": True,
            "uri_preview": uri[:45] + "...",
        })
    except Exception as exc:
        return jsonify({
            "mongo":   "error",
            "message": str(exc),
            "uri_set": True,
        }), 503


# ── Entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", "7000"))
    print(f"[flask_service] Starting on http://localhost:{port}")
    print(f"[flask_service] MONGO_URI set: {bool(os.getenv('MONGO_URI'))}")
    app.run(host="0.0.0.0", port=port, debug=True)
