"""
Auth controller — wraps auth_service and returns the JSON shape
the frontend expects:
  { token, role, user: { id, name, email, role, ... } }

Security notes:
  - ADMIN_REGISTER_KEY is validated in auth_service, never echoed here
  - Passwords are never logged or returned
  - HTTP-only cookie + Authorization header both supported
"""
from flask import jsonify, request

from ..middlewares.auth_middleware import require_auth, require_role
from ..services.auth_service import login_user, register_user
from ..utils.token_utils import read_token


# ── Helpers ───────────────────────────────────────────────────────────────

def _cookie_response(payload: dict, status: int):
    """Return JSON + set HTTP-only cookie (7 days)."""
    response = jsonify(payload)
    response.set_cookie(
        "token",
        payload["token"],
        httponly=True,
        samesite="Lax",
        max_age=7 * 24 * 60 * 60,
    )
    return response, status


# ── Routes ────────────────────────────────────────────────────────────────

def register_student():
    """
    POST /api/auth/student/register
    Always creates a student — admin_key and role fields are ignored.

    Body: { name, email, password, phone?, course? }
    """
    data = request.get_json(silent=True) or {}
    print(f"[Auth] POST /student/register  email={data.get('email')!r}")

    payload, error, status = register_user(data, force_role="student")
    if error:
        return jsonify({"message": error}), status
    return _cookie_response(payload, status)


def register():
    """
    POST /api/auth/register
    Creates a user with the requested role.
    - Default role: "student"
    - Role "admin": requires valid admin_key in request body

    Body (student): { name, email, password }
    Body (admin):   { name, email, password, role: "admin", admin_key: "<secret>" }
    """
    data = request.get_json(silent=True) or {}
    role = (data.get("role") or "student").strip().lower()
    print(f"[Auth] POST /register  email={data.get('email')!r}  role={role!r}")

    payload, error, status = register_user(data)
    if error:
        return jsonify({"message": error}), status
    return _cookie_response(payload, status)


def login():
    """
    POST /api/auth/login — unified login (student + admin).
    Body: { email, password }
    """
    data = request.get_json(silent=True) or {}
    print(f"[Auth] POST /login  email={data.get('email')!r}")

    payload, error, status = login_user(data)
    if error:
        return jsonify({"message": error}), status
    return _cookie_response(payload, status)


def logout():
    """POST /api/auth/logout — clears the auth cookie."""
    response = jsonify({"message": "Logged out successfully."})
    response.delete_cookie("token")
    return response


@require_auth
def me():
    """GET /api/auth/me — returns the current user from the JWT payload."""
    # current_user is set by require_auth middleware
    user = request.current_user
    # Never return sensitive fields
    safe = {k: v for k, v in user.items() if k not in ("password", "exp", "iat")}
    return jsonify({"user": safe})


# ── Admin-only example route ──────────────────────────────────────────────

@require_role("admin")
def admin_only_ping():
    """
    GET /api/auth/admin/ping
    Example of an admin-only route using the require_role decorator.
    Returns 403 if the caller is not an admin.
    """
    return jsonify({
        "message": "Admin access confirmed.",
        "admin":   request.current_user.get("email"),
    })
