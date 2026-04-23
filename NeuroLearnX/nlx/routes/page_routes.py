from flask import Blueprint

from ..controllers import page_controller

page_bp = Blueprint("page_bp", __name__)

page_bp.get("/")(page_controller.home)
page_bp.get("/courses")(page_controller.courses)
page_bp.get("/lab")(page_controller.lab)
page_bp.get("/tutor")(page_controller.tutor)
page_bp.get("/leaderboard")(page_controller.leaderboard)
page_bp.get("/community")(page_controller.community)
page_bp.get("/certifications")(page_controller.certifications)
page_bp.get("/resources")(page_controller.resources)
page_bp.get("/mentor")(page_controller.mentor)
page_bp.get("/about")(page_controller.about)

page_bp.get("/student/login")(page_controller.student_login)
page_bp.get("/student/register")(page_controller.student_register)
page_bp.get("/admin/login")(page_controller.admin_login)
page_bp.get("/lms/portal")(page_controller.lms_portal)
page_bp.get("/login")(page_controller.lms_portal)
page_bp.get("/register")(page_controller.student_register)
