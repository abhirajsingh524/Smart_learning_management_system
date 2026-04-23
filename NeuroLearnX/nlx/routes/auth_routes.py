from flask import Blueprint

from ..controllers import auth_controller

auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/auth")

auth_bp.post("/student/register")(auth_controller.register_student)
auth_bp.post("/register")(auth_controller.register)
auth_bp.post("/login")(auth_controller.login)
auth_bp.post("/logout")(auth_controller.logout)
auth_bp.get("/me")(auth_controller.me)
