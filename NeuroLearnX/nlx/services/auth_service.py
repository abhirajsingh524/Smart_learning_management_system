"""
Authentication service — reads/writes the SAME MongoDB Atlas database
that the Node.js backend uses (collection: users).

Security improvements:
  - Admin registration requires ADMIN_REGISTER_KEY from .env
  - Roles are validated against an allowlist
  - Email format is validated with regex
  - Passwords must be ≥ 8 chars (raised from 6)
  - ADMIN_REGISTER_KEY is never echoed in any response
  - Timing-safe comparison for admin key (hmac.compare_digest)
  - Supports both werkzeug (pbkdf2) and bcrypt hashes (Node.js compat)
"""
import hmac
import os
import re
from datetime import datetime, timezone

from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash

from ..db import get_db
from ..utils.token_utils import issue_token

# ── Constants ─────────────────────────────────────────────────────────────

ALLOWED_ROLES = {"student", "admin"}
_EMAIL_RE     = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# ── Helpers ───────────────────────────────────────────────────────────────

def _public_user(doc: dict) -> dict:
    """Return the safe user shape the frontend expects. Never includes password."""
    uid = str(doc.get("_id", doc.get("id", "")))
    return {
        "id":              uid,
        "name":            doc.get("name", ""),
        "email":           doc.get("email", ""),
        "role":            doc.get("role", "student"),
        "phone":           doc.get("phone"),
        "course":          doc.get("course"),
        "enrolledCourses": doc.get("enrolledCourses", []),
        "lastActiveAt":    doc.get("lastActiveAt"),
        "createdAt":       doc.get("createdAt"),
        "updatedAt":       doc.get("updatedAt"),
    }


def _make_token(doc: dict) -> str:
    uid = str(doc.get("_id", doc.get("id", "")))
    return issue_token({
        "userId": uid,
        "id":     uid,
        "email":  doc.get("email", ""),
        "role":   doc.get("role", "student"),
    })


def _get_admin_key() -> str:
    """Read ADMIN_REGISTER_KEY from Flask config (preferred) or env directly."""
    try:
        return (current_app.config.get("ADMIN_REGISTER_KEY") or "").strip()
    except RuntimeError:
        return os.getenv("ADMIN_REGISTER_KEY", "").strip()


def _validate_admin_key(provided_key: str) -> tuple[bool, str]:
    """
    Validate the admin registration key.

    Returns (is_valid: bool, error_message: str).
    Uses hmac.compare_digest for timing-safe comparison to prevent
    timing attacks that could reveal the key length.
    """
    secret_key = _get_admin_key()

    # If ADMIN_REGISTER_KEY is not set or empty → admin registration is disabled
    if not secret_key:
        return False, "Admin registration is disabled on this server."

    if not provided_key:
        return False, "admin_key is required to register as admin."

    # Timing-safe comparison — prevents timing oracle attacks
    keys_match = hmac.compare_digest(
        secret_key.encode("utf-8"),
        provided_key.encode("utf-8"),
    )
    if not keys_match:
        return False, "Invalid admin key."

    return True, ""


# ── Public API ────────────────────────────────────────────────────────────

def register_user(data: dict, force_role: str = None):
    """
    Register a new user.

    force_role="student"  → used by POST /api/auth/student/register
                            (ignores role and admin_key from body)
    force_role=None       → used by POST /api/auth/register
                            (role from body; admin requires valid admin_key)

    Returns: (payload | None, error_message | None, http_status)
    """
    # ── Extract and sanitise fields ───────────────────────────────────────
    name       = (data.get("name")       or "").strip()
    email      = (data.get("email")      or "").strip().lower()
    password   = (data.get("password")   or "")
    admin_key  = (data.get("admin_key")  or "").strip()
    phone      = (data.get("phone")      or "").strip() or None
    course     = (data.get("course")     or "").strip() or None

    # Determine role
    if force_role:
        role = force_role
    else:
        requested_role = (data.get("role") or "student").strip().lower()
        role = requested_role if requested_role in ALLOWED_ROLES else "student"

    print(f"[Flask register] name={name!r} email={email!r} role={role!r}")

    # ── Input validation ──────────────────────────────────────────────────
    if not name:
        return None, "name is required.", 400
    if len(name) < 2:
        return None, "name must be at least 2 characters.", 400

    if not email:
        return None, "email is required.", 400
    if not _EMAIL_RE.match(email):
        return None, "Please enter a valid email address.", 400

    if not password:
        return None, "password is required.", 400
    if len(password) < 8:
        return None, "Password must be at least 8 characters.", 400

    # ── Admin key gate ────────────────────────────────────────────────────
    # Only checked when role == "admin" AND force_role is not set
    # (force_role="student" bypasses this entirely)
    if role == "admin" and not force_role:
        valid, key_error = _validate_admin_key(admin_key)
        if not valid:
            # 403 Forbidden — key missing or wrong
            # Never reveal whether the key exists or what it is
            print(f"[Flask register] Admin key rejected for {email!r}")
            return None, key_error, 403

    # ── Database operations ───────────────────────────────────────────────
    db = get_db()
    if db is None:
        return None, "Database unavailable. Please try again later.", 503

    users = db["users"]

    if users.find_one({"email": email}):
        return None, "This email is already registered.", 409

    now     = datetime.now(timezone.utc).isoformat()
    pw_hash = generate_password_hash(password, method="pbkdf2:sha256")

    # Auto-enroll students in all published courses
    enrolled = []
    if role == "student":
        courses_col = db["courses"]
        enrolled = [
            str(c["_id"])
            for c in courses_col.find({"isPublished": True}, {"_id": 1})
        ]

    doc = {
        "name":            name,
        "email":           email,
        "password":        pw_hash,
        "role":            role,
        "phone":           phone,
        "course":          course,
        "enrolledCourses": enrolled,
        "lastActiveAt":    now,
        "createdAt":       now,
        "updatedAt":       now,
    }
    result = users.insert_one(doc)
    doc["_id"] = result.inserted_id

    token = _make_token(doc)
    print(f"[Flask register] Created {role} user: {email}")

    return {"token": token, "role": role, "user": _public_user(doc)}, None, 201


def login_user(data: dict):
    """
    POST /api/auth/login — unified login (student + admin).
    """
    email    = (data.get("email")    or "").strip().lower()
    password = (data.get("password") or "")

    print(f"[Flask login] Attempt: email={email!r}")

    if not email or not password:
        return None, "Email and password are required.", 400

    if not _EMAIL_RE.match(email):
        return None, "Invalid email or password.", 401  # don't reveal format error

    db = get_db()
    if db is None:
        return None, "Database unavailable. Please try again later.", 503

    users = db["users"]
    doc   = users.find_one({"email": email})

    if not doc:
        print(f"[Flask login] User not found: {email}")
        return None, "Invalid email or password.", 401

    stored_hash = doc.get("password", "")
    pw_ok       = _check_password(password, stored_hash)

    if not pw_ok:
        print(f"[Flask login] Wrong password for: {email}")
        return None, "Invalid email or password.", 401

    # Touch lastActiveAt
    now = datetime.now(timezone.utc).isoformat()
    users.update_one({"_id": doc["_id"]}, {"$set": {"lastActiveAt": now}})
    doc["lastActiveAt"] = now

    token = _make_token(doc)
    role  = doc.get("role", "student")
    print(f"[Flask login] Success: {email} role={role}")
    return {"token": token, "role": role, "user": _public_user(doc)}, None, 200


def _check_password(plain: str, stored: str) -> bool:
    """
    Verify a password against either a werkzeug (pbkdf2) or bcrypt hash.
    Node.js uses bcryptjs ($2a$/$2b$); Flask uses werkzeug (pbkdf2:sha256:...).
    """
    if not stored:
        return False

    if stored.startswith("$2"):
        # bcrypt hash — created by Node.js bcryptjs
        try:
            import bcrypt
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        except ImportError:
            pass
        try:
            from passlib.hash import bcrypt as pl_bcrypt
            return pl_bcrypt.verify(plain, stored)
        except ImportError:
            pass
        return False

    # werkzeug hash (pbkdf2:sha256:...)
    return check_password_hash(stored, plain)
