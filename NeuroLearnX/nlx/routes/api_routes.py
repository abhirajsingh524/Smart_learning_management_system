from flask import Blueprint

from ..controllers import api_controller

api_bp = Blueprint("api_bp", __name__, url_prefix="/api")

api_bp.post("/tutor")(api_controller.tutor_api)
api_bp.post("/lab/run")(api_controller.lab_run)
api_bp.get("/quiz")(api_controller.quiz_api)
api_bp.get("/analytics")(api_controller.analytics_api)
api_bp.get("/leaderboard")(api_controller.leaderboard_api)
api_bp.get("/health")(api_controller.health)
api_bp.get("/dashboard")(api_controller.dashboard_api)

api_bp.get("/student/dashboard")(api_controller.student_dashboard_api)
api_bp.get("/student/courses")(api_controller.student_courses_api)
api_bp.get("/student/courses/<course_id>")(api_controller.student_course_api)
api_bp.get("/student/quizzes/<quiz_id>")(api_controller.student_quiz_api)
api_bp.post("/student/quiz/attempt")(api_controller.student_quiz_attempt_api)
api_bp.get("/student/profile")(api_controller.student_profile_api)
api_bp.put("/student/profile")(api_controller.student_profile_api)

api_bp.get("/admin/dashboard")(api_controller.admin_dashboard_api)
api_bp.get("/admin/analytics")(api_controller.admin_analytics_api)
api_bp.get("/admin/students")(api_controller.admin_students_api)
api_bp.get("/admin/students/<student_id>")(api_controller.admin_student_api)
api_bp.put("/admin/students/<student_id>")(api_controller.admin_student_api)
api_bp.delete("/admin/students/<student_id>")(api_controller.admin_student_api)

api_bp.post("/ai/chat")(api_controller.ai_chat_api)
api_bp.get("/protected/ping")(api_controller.protected_ping)
api_bp.get("/admin/ping")(api_controller.admin_ping)
