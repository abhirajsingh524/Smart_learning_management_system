from flask import Blueprint

from ..controllers import page_controller

page_bp = Blueprint("page_bp", __name__)

# ── Public pages ──────────────────────────────────────────────────────────
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
page_bp.get("/analytics")(page_controller.analytics)
page_bp.get("/learning")(page_controller.learning)
page_bp.get("/quiz")(page_controller.quiz)
page_bp.get("/dashboard")(page_controller.dashboard)

# ── Auth pages ────────────────────────────────────────────────────────────
page_bp.get("/student/login")(page_controller.student_login)
page_bp.get("/student/register")(page_controller.student_register)
page_bp.get("/admin/login")(page_controller.admin_login)
page_bp.get("/register")(page_controller.student_register)

# ── Classic dashboards ────────────────────────────────────────────────────
page_bp.get("/student/dashboard")(page_controller.student_dashboard)
page_bp.get("/admin/dashboard")(page_controller.admin_dashboard)
page_bp.get("/student-dashboard.html")(page_controller.student_dashboard)
page_bp.get("/admin-dashboard.html")(page_controller.admin_dashboard)

# ── LMS login & portal entry ──────────────────────────────────────────────
page_bp.get("/login")(page_controller.lms_login)
page_bp.get("/login.html")(page_controller.lms_login)
page_bp.get("/lms")(page_controller.lms_portal)
page_bp.get("/lms/portal")(page_controller.lms_portal)

# ── LMS student routes ────────────────────────────────────────────────────
page_bp.get("/lms/student/dashboard")(page_controller.lms_student_dashboard)
page_bp.get("/lms/student/courses")(page_controller.lms_student_courses)
page_bp.get("/lms/student/course/<course_id>")(page_controller.lms_student_course)
page_bp.get("/lms/student/quiz/<quiz_id>")(page_controller.lms_student_quiz)
page_bp.get("/lms/student/ai")(page_controller.lms_student_ai)

# ── LMS admin routes ──────────────────────────────────────────────────────
page_bp.get("/lms/admin/dashboard")(page_controller.lms_admin_dashboard)
page_bp.get("/lms/admin/students")(page_controller.lms_admin_students)
page_bp.get("/lms/admin/analytics")(page_controller.lms_admin_analytics)
