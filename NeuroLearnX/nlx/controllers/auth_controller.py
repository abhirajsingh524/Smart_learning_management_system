"""
Auth controller — wraps auth_service and returns the JSON shape
the frontend expects:
  { token, role, user: { id, name, email, role, ... } }
"""
from flask import jsonify, request

from ..middlewares.auth_middleware import require_auth, require_role
from ..services.auth_service import login_user, register_user


# ── Helper ────────────────────────────────────────────────────────────────

def _cookie_response(payload: dict, status: int):
    """Return JSON + HTTP-only cookie (7 days)."""
    resp = jsonify(payload)
    resp.set_cookie("token", payload["token"],
                    httponly=True, samesite="Lax",
                    max_age=7 * 24 * 60 * 60)
    return resp, status


# ── Registration ──────────────────────────────────────────────────────────

def register_student():
    """
    POST /api/auth/student/register
    Always creates a student — role and admin_key fields are ignored.
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
    Default role: student. Admin requires valid admin_key.
    Body (student): { name, email, password }
    Body (admin):   { name, email, password, role: "admin", admin_key: "<key>" }
    """
    data = request.get_json(silent=True) or {}
    print(f"[Auth] POST /register  email={data.get('email')!r}  role={data.get('role')!r}")
    payload, error, status = register_user(data)
    if error:
        return jsonify({"message": error}), status
    return _cookie_response(payload, status)


# ── Login ─────────────────────────────────────────────────────────────────

def login():
    """
    POST /api/auth/login — unified login (student + admin).
    Body: { email, password }
    """
    data = request.get_json(silent=True) or {}
    print(f"[Auth] POST /login  email={data.get('email')!r}")
    payload, error, status = login_user(data, required_role=None)
    if error:
        return jsonify({"message": error}), status
    return _cookie_response(payload, status)


def login_admin():
    """
    POST /api/auth/admin/login — admin-only login.
    Returns 401 if the account is not an admin.
    Body: { email, password }
    """
    data = request.get_json(silent=True) or {}
    print(f"[Auth] POST /admin/login  email={data.get('email')!r}")
    payload, error, status = login_user(data, required_role="admin")
    if error:
        return jsonify({"message": error}), status
    return _cookie_response(payload, status)


def login_student():
    """
    POST /api/auth/student/login — student-only login.
    Returns 401 if the account is not a student.
    Body: { email, password }
    """
    data = request.get_json(silent=True) or {}
    print(f"[Auth] POST /student/login  email={data.get('email')!r}")
    payload, error, status = login_user(data, required_role="student")
    if error:
        return jsonify({"message": error}), status
    return _cookie_response(payload, status)


# ── Logout / Me ───────────────────────────────────────────────────────────

def logout():
    """POST /api/auth/logout — clears the auth cookie."""
    resp = jsonify({"message": "Logged out successfully."})
    resp.delete_cookie("token")
    return resp


@require_auth
def me():
    """GET /api/auth/me — returns current user from JWT."""
    safe = {k: v for k, v in request.current_user.items()
            if k not in ("password", "exp", "iat")}
    return jsonify({"user": safe})


# ── Admin-only ping ───────────────────────────────────────────────────────

@require_role("admin")
def admin_only_ping():
    """GET /api/auth/admin/ping — returns 403 if caller is not admin."""
    return jsonify({
        "message": "Admin access confirmed.",
        "admin":   request.current_user.get("email"),
    })
