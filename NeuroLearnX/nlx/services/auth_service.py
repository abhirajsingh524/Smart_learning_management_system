"""
Authentication service — reads/writes the SAME MongoDB Atlas database
that the Node.js backend uses (collection: users).

Password hash compatibility:
  - Node.js creates bcrypt hashes  ($2b$...)
  - Flask creates pbkdf2 hashes    (pbkdf2:sha256:...)
  - Both are verified here correctly
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
_EMAIL_RE     = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", re.IGNORECASE)

# ── Helpers ───────────────────────────────────────────────────────────────

def _public_user(doc: dict) -> dict:
    """Safe user shape — never includes password or internal fields."""
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
    try:
        return (current_app.config.get("ADMIN_REGISTER_KEY") or "").strip()
    except RuntimeError:
        return os.getenv("ADMIN_REGISTER_KEY", "").strip()


def _validate_admin_key(provided_key: str):
    """Returns (is_valid, error_message). Timing-safe comparison."""
    secret = _get_admin_key()
    if not secret:
        return False, "Admin registration is disabled on this server."
    if not provided_key:
        return False, "admin_key is required to register as admin."
    match = hmac.compare_digest(secret.encode("utf-8"), provided_key.encode("utf-8"))
    return (True, "") if match else (False, "Invalid admin key.")


def _check_password(plain: str, stored: str) -> bool:
    """
    Verify plain password against stored hash.

    Supports:
      - bcrypt   ($2a$/$2b$) — created by Node.js bcryptjs
      - pbkdf2   (pbkdf2:sha256:...) — created by Flask werkzeug
    """
    if not plain or not stored:
        return False

    # ── bcrypt (Node.js) ──────────────────────────────────────────────────
    if stored.startswith("$2"):
        try:
            import bcrypt as _bcrypt
            return _bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        except ImportError:
            # bcrypt not installed — try passlib as fallback
            try:
                from passlib.hash import bcrypt as _pl
                return _pl.verify(plain, stored)
            except ImportError:
                print("[Auth] WARNING: neither bcrypt nor passlib installed. "
                      "Run: pip install bcrypt")
                return False
        except Exception as exc:
            print(f"[Auth] bcrypt verify error: {exc}")
            return False

    # ── werkzeug pbkdf2 (Flask) ───────────────────────────────────────────
    if stored.startswith("pbkdf2:"):
        try:
            return check_password_hash(stored, plain)
        except Exception as exc:
            print(f"[Auth] pbkdf2 verify error: {exc}")
            return False

    print(f"[Auth] Unknown hash format: {stored[:20]}...")
    return False


# ── Registration ──────────────────────────────────────────────────────────

def register_user(data: dict, force_role: str = None):
    """
    Register a new user.

    force_role="student" → POST /api/auth/student/register (ignores role/admin_key)
    force_role=None      → POST /api/auth/register (role from body; admin needs key)
    """
    name      = (data.get("name")      or "").strip()
    email     = (data.get("email")     or "").strip().lower()
    password  = (data.get("password")  or "")
    admin_key = (data.get("admin_key") or "").strip()
    phone     = (data.get("phone")     or "").strip() or None
    course    = (data.get("course")    or "").strip() or None

    # Determine role
    if force_role:
        role = force_role
    else:
        raw_role = (data.get("role") or "student").strip().lower()
        role = raw_role if raw_role in ALLOWED_ROLES else "student"

    print(f"[Flask register] email={email!r} role={role!r}")

    # ── Validation ────────────────────────────────────────────────────────
    if not name or len(name) < 2:
        return None, "name must be at least 2 characters.", 400
    if not email or not _EMAIL_RE.match(email):
        return None, "Please enter a valid email address.", 400
    if not password or len(password) < 8:
        return None, "Password must be at least 8 characters.", 400

    # ── Admin key gate ────────────────────────────────────────────────────
    if role == "admin" and not force_role:
        valid, err = _validate_admin_key(admin_key)
        if not valid:
            print(f"[Flask register] Admin key rejected for {email!r}")
            return None, err, 403

    # ── DB ────────────────────────────────────────────────────────────────
    db = get_db()
    if db is None:
        return None, "Database unavailable. Please try again later.", 503

    users = db["users"]
    if users.find_one({"email": email}):
        return None, "This email is already registered.", 409

    now     = datetime.now(timezone.utc).isoformat()
    pw_hash = generate_password_hash(password, method="pbkdf2:sha256")

    enrolled = []
    if role == "student":
        enrolled = [str(c["_id"]) for c in db["courses"].find({"isPublished": True}, {"_id": 1})]

    doc = {
        "name": name, "email": email, "password": pw_hash,
        "role": role, "phone": phone, "course": course,
        "enrolledCourses": enrolled,
        "lastActiveAt": now, "createdAt": now, "updatedAt": now,
    }
    result  = users.insert_one(doc)
    doc["_id"] = result.inserted_id

    print(f"[Flask register] Created {role}: {email}")
    return {"token": _make_token(doc), "role": role, "user": _public_user(doc)}, None, 201


# ── Login ─────────────────────────────────────────────────────────────────

def login_user(data: dict, required_role: str = None):
    """
    Unified login — validates credentials and returns JWT.

    required_role="admin"   → POST /api/auth/admin/login  (403 if not admin)
    required_role="student" → POST /api/auth/student/login (403 if not student)
    required_role=None      → POST /api/auth/login         (any role accepted)
    """
    email    = (data.get("email")    or "").strip().lower()
    password = (data.get("password") or "")

    print(f"[Flask login] email={email!r} required_role={required_role!r}")

    # ── Input validation ──────────────────────────────────────────────────
    if not email or not password:
        return None, "Email and password are required.", 400
    if not _EMAIL_RE.match(email):
        return None, "Invalid email or password.", 401

    # ── DB lookup ─────────────────────────────────────────────────────────
    db = get_db()
    if db is None:
        return None, "Database unavailable. Please try again later.", 503

    doc = db["users"].find_one({"email": email})
    if not doc:
        print(f"[Flask login] Not found: {email}")
        return None, "Invalid email or password.", 401

    # ── Role check (before password — avoids timing leak) ─────────────────
    actual_role = doc.get("role", "student")
    if required_role and actual_role != required_role:
        print(f"[Flask login] Role mismatch: expected={required_role} actual={actual_role}")
        # Return same message as wrong password — don't reveal role info
        return None, "Invalid email or password.", 401

    # ── Password check ────────────────────────────────────────────────────
    if not _check_password(password, doc.get("password", "")):
        print(f"[Flask login] Wrong password: {email}")
        return None, "Invalid email or password.", 401

    # ── Success ───────────────────────────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()
    db["users"].update_one({"_id": doc["_id"]}, {"$set": {"lastActiveAt": now}})
    doc["lastActiveAt"] = now

    print(f"[Flask login] Success: {email} role={actual_role}")
    return {"token": _make_token(doc), "role": actual_role, "user": _public_user(doc)}, None, 200
