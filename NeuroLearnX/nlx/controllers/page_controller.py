from flask import render_template, redirect, request


# ── Public pages ──────────────────────────────────────────────────────────
def home():           return render_template("home.html")
def courses():        return render_template("courses.html")
def lab():            return render_template("lab.html")
def tutor():          return render_template("tutor.html")
def leaderboard():    return render_template("leaderboard.html")
def community():      return render_template("community.html")
def certifications(): return render_template("certifications.html")
def resources():      return render_template("resources.html")
def mentor():         return render_template("mentor.html")
def about():          return render_template("about.html")
def analytics():      return render_template("analytics.html")
def learning():       return render_template("learning.html")
def quiz():           return render_template("quiz.html")
def dashboard():      return render_template("dashboard.html")

# ── Auth pages ────────────────────────────────────────────────────────────
def student_login():    return render_template("student-login.html")
def student_register(): return render_template("student-register.html")
def admin_login():      return render_template("admin-login.html")

# ── Classic dashboards ────────────────────────────────────────────────────
def student_dashboard(): return render_template("student-dashboard.html")
def admin_dashboard():   return render_template("admin-dashboard.html")

# ── LMS login & portal entry — redirect to Node.js ───────────────────────
def lms_login():  return _node("/login")
def lms_portal(): return _node("/lms")

# ── LMS pages — redirect to Node.js (port 5000) which owns localStorage ──
# Flask (5001) and Node.js (5000) have separate localStorage origins.
# All LMS pages must be served from the SAME origin as the login page.
# Node.js already has all these routes registered.
_NODE_PORT = 5000

def _node(path):
    """Redirect to the Node.js server preserving query string."""
    qs = request.query_string.decode()
    url = f"http://localhost:{_NODE_PORT}{path}"
    if qs:
        url += "?" + qs
    return redirect(url, code=302)

def lms_student_dashboard():  return _node("/lms/student/dashboard")
def lms_student_courses():    return _node("/lms/student/courses")
def lms_student_course(course_id): return _node(f"/lms/student/course/{course_id}")
def lms_student_quiz(quiz_id):     return _node(f"/lms/student/quiz/{quiz_id}")
def lms_student_ai():         return _node("/lms/student/ai")
def lms_admin_dashboard():    return _node("/lms/admin/dashboard")
def lms_admin_students():     return _node("/lms/admin/students")
def lms_admin_analytics():    return _node("/lms/admin/analytics")
