from flask import render_template


def home():
    return render_template("home.html")


def courses():
    return render_template("courses.html")


def lab():
    return render_template("lab.html")


def tutor():
    return render_template("tutor.html")


def leaderboard():
    return render_template("leaderboard.html")


def community():
    return render_template("community.html")


def certifications():
    return render_template("certifications.html")


def resources():
    return render_template("resources.html")


def mentor():
    return render_template("mentor.html")


def about():
    return render_template("about.html")


def student_login():
    return render_template("student-login.html")


def student_register():
    return render_template("student-register.html")


def admin_login():
    return render_template("admin-login.html")


def lms_portal():
    return render_template("lms_login.html")
