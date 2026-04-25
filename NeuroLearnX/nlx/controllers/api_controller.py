import random

from flask import jsonify, request

from ..middlewares.auth_middleware import require_auth, require_role
from ..services import lms_service
from ..services.tutor_service import tutor_reply


def tutor_api():
    body = request.get_json() or {}
    history = body.get("history", [])
    message = body.get("message", "")
    return jsonify({"reply": tutor_reply(history, message)})


def lab_run():
    body = request.get_json() or {}
    dataset = body.get("dataset", "MNIST")
    model = body.get("model", "Neural Network")
    accuracy = round(random.uniform(0.78, 0.96), 4)
    f1 = round(accuracy - random.uniform(0.01, 0.04), 4)
    curve = [
        {
            "epoch": i,
            "train": round(0.50 + i * 0.082 + random.uniform(0, 0.015), 4),
            "val": round(0.48 + i * 0.072 + random.uniform(0, 0.015), 4),
        }
        for i in range(1, 7)
    ]
    return jsonify(
        {
            "dataset": dataset,
            "model": model,
            "accuracy": accuracy,
            "f1_score": f1,
            "epochs": 8,
            "parameters": random.randint(50000, 550000),
            "training_curve": curve,
        }
    )


def quiz_api():
    return jsonify(
        [
            {
                "q": "Which activation function best addresses vanishing gradients?",
                "opts": ["Sigmoid", "Tanh", "ReLU", "Softmax"],
                "ans": 2,
                "exp": "ReLU avoids near-zero gradients that kill deep network learning.",
            },
            {
                "q": "What does multi-head attention allow the model to do?",
                "opts": ["Parallel batches", "Attend to multiple subspaces", "Reduce params", "Apply dropout"],
                "ans": 1,
                "exp": "Multiple heads let the model attend to different positions simultaneously.",
            },
            {
                "q": "What is the purpose of epsilon in the Adam optimizer?",
                "opts": ["LR decay", "Prevent division by zero", "Clip gradients", "Set momentum"],
                "ans": 1,
                "exp": "Epsilon prevents division by zero when the second moment is near zero.",
            },
        ]
    )


def analytics_api():
    return jsonify(
        {
            "progress": [{"week": f"W{i}", "score": s} for i, s in enumerate([42, 55, 61, 70, 74, 83, 88], 1)],
            "skills": [
                {"skill": s, "val": v}
                for s, v in zip(["Math", "Code", "Theory", "NLP", "CV", "MLOps"], [85, 78, 65, 45, 72, 30])
            ],
        }
    )


def leaderboard_api():
    return jsonify(
        [
            {"rank": 1, "name": "Aditya K.", "points": 9820, "badge": "🥇", "streak": 45, "courses": 5},
            {"rank": 2, "name": "Sneha R.", "points": 9410, "badge": "🥈", "streak": 38, "courses": 5},
            {"rank": 3, "name": "Vikram S.", "points": 8990, "badge": "🥉", "streak": 30, "courses": 4},
            {"rank": 4, "name": "Meera P.", "points": 8550, "badge": "⭐", "streak": 28, "courses": 4},
            {"rank": 5, "name": "Rohan T.", "points": 8210, "badge": "⭐", "streak": 22, "courses": 3},
            {"rank": 6, "name": "Divya N.", "points": 7890, "badge": "⭐", "streak": 19, "courses": 3},
            {"rank": 7, "name": "Arjun M.", "points": 7540, "badge": "⭐", "streak": 15, "courses": 3},
        ]
    )


def health():
    return jsonify({"status": "ok", "platform": "NeuroLearnX"})


def dashboard_api():
    return jsonify(lms_service.dashboard_public())


@require_auth
@require_role("student")
def student_dashboard_api():
    payload = lms_service.student_dashboard(request.current_user)
    if not payload:
        return jsonify({"message": "User not found."}), 404
    return jsonify(payload)


@require_auth
@require_role("student")
def student_courses_api():
    rows = lms_service.list_student_courses(request.current_user)
    if rows is None:
        return jsonify({"message": "User not found."}), 404
    return jsonify({"courses": rows})


@require_auth
@require_role("student")
def student_course_api(course_id):
    payload, err, status = lms_service.get_student_course(request.current_user, course_id)
    if err:
        return jsonify({"message": err}), status
    return jsonify(payload)


@require_auth
@require_role("student")
def student_quiz_api(quiz_id):
    payload, err, status = lms_service.get_quiz_for_attempt(request.current_user, quiz_id)
    if err:
        return jsonify({"message": err}), status
    return jsonify(payload)


@require_auth
@require_role("student")
def student_quiz_attempt_api():
    payload, err, status = lms_service.submit_quiz_attempt(request.current_user, request.get_json() or {})
    if err:
        return jsonify({"message": err}), status
    return jsonify(payload), status


@require_auth
@require_role("student")
def student_profile_api():
    if request.method == "GET":
        profile = lms_service.student_profile(request.current_user)
        if not profile:
            return jsonify({"message": "User not found."}), 404
        return jsonify({"profile": profile})
    profile, err = lms_service.update_student_profile(request.current_user, request.get_json() or {})
    if err:
        return jsonify({"message": err}), 400
    return jsonify({"message": "Profile updated successfully.", "profile": profile})


@require_auth
@require_role("admin")
def admin_dashboard_api():
    return jsonify(lms_service.admin_dashboard(request.current_user))


@require_auth
@require_role("admin")
def admin_analytics_api():
    return jsonify(lms_service.admin_analytics())


@require_auth
@require_role("admin")
def admin_students_api():
    query = request.args.get("q") or request.args.get("search") or ""
    return jsonify({"students": lms_service.list_students(query)})


@require_auth
@require_role("admin")
def admin_student_api(student_id):
    if request.method == "GET":
        student = lms_service.get_student(student_id)
        if not student:
            return jsonify({"message": "Student not found."}), 404
        return jsonify({"student": student})
    if request.method == "PUT":
        student, err, status = lms_service.update_student(student_id, request.get_json() or {})
        if err:
            return jsonify({"message": err}), status
        return jsonify({"message": "Student updated successfully.", "student": student})
    deleted = lms_service.delete_student(student_id)
    if not deleted:
        return jsonify({"message": "Student not found."}), 404
    return jsonify({"message": "Student deleted successfully."})


@require_auth
def ai_chat_api():
    body = request.get_json() or {}
    message = (body.get("message") or "").strip()
    if not message:
        return jsonify({"message": "message is required"}), 400
    reply, source = lms_service.ai_reply(message)
    return jsonify({"reply": reply, "source": source})


@require_auth
def protected_ping():
    return jsonify({"status": "ok", "message": "Authenticated"})


@require_role("admin")
def admin_ping():
    return jsonify({"status": "ok", "message": "Admin access granted"})
