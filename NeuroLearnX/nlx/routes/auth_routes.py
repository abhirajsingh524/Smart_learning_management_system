from flask import Blueprint

from ..controllers import auth_controller

auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/auth")

# ── Registration ──────────────────────────────────────────────────────────
auth_bp.post("/student/register")(auth_controller.register_student)
auth_bp.post("/register")(auth_controller.register)

# ── Login ─────────────────────────────────────────────────────────────────
auth_bp.post("/login")(auth_controller.login)           # unified (any role)
auth_bp.post("/admin/login")(auth_controller.login_admin)    # admin only
auth_bp.post("/student/login")(auth_controller.login_student) # student only

# ── Session ───────────────────────────────────────────────────────────────
auth_bp.post("/logout")(auth_controller.logout)
auth_bp.get("/me")(auth_controller.me)

# ── Admin-only test ───────────────────────────────────────────────────────
auth_bp.get("/admin/ping")(auth_controller.admin_only_ping)
