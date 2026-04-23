import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from flask import current_app

from ..models.user_store import UserStore

COURSES = [
    {
        "_id": "c_ml_foundations",
        "title": "Machine Learning Foundations",
        "slug": "ml-foundations",
        "description": "Core concepts: supervised learning, evaluation, and linear models.",
        "isPublished": True,
        "modules": [
            {"title": "Introduction & setup", "summary": "Environment and datasets", "order": 1},
            {"title": "Linear & logistic regression", "summary": "Loss and optimization", "order": 2},
            {"title": "Model evaluation", "summary": "Cross-validation and metrics", "order": 3},
        ],
    },
    {
        "_id": "c_deep_learning",
        "title": "Deep Learning Intro",
        "slug": "deep-learning-intro",
        "description": "Neural networks, backpropagation, and CNN basics.",
        "isPublished": True,
        "modules": [
            {"title": "Neurons & activations", "summary": "ReLU and softmax", "order": 1},
            {"title": "Training loops", "summary": "SGD and mini-batches", "order": 2},
        ],
    },
]

QUIZZES = [
    {
        "_id": "q_ml_1",
        "courseId": "c_ml_foundations",
        "title": "Week 1 — ML basics",
        "weekNumber": 1,
        "kind": "weekly",
        "timeLimitMinutes": 15,
        "questions": [
            {
                "id": "q_ml_1_1",
                "text": "What is supervised learning?",
                "options": [
                    "Learning without labels",
                    "Learning from input-output pairs",
                    "Only clustering",
                    "Reinforcement only",
                ],
                "correctAnswer": 1,
            },
            {
                "id": "q_ml_1_2",
                "text": "Which metric suits imbalanced binary classification?",
                "options": ["Accuracy only", "F1-score", "Mean squared error", "RMSE"],
                "correctAnswer": 1,
            },
        ],
    },
    {
        "_id": "q_dl_1",
        "courseId": "c_deep_learning",
        "title": "Week 1 — Neural nets",
        "weekNumber": 1,
        "kind": "weekly",
        "timeLimitMinutes": 15,
        "questions": [
            {
                "id": "q_dl_1_1",
                "text": "Backpropagation computes…",
                "options": ["Random weights", "Gradients", "Dataset splits", "Learning-rate schedules"],
                "correctAnswer": 1,
            },
            {
                "id": "q_dl_1_2",
                "text": "ReLU is defined as…",
                "options": ["max(0,x)", "1/(1+e^-x)", "tanh(x)", "softmax(x)"],
                "correctAnswer": 0,
            },
        ],
    },
]


def _attempt_path():
    path = Path(current_app.config["ATTEMPT_STORE_PATH"])
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("[]", encoding="utf-8")
    return path


def _read_attempts():
    try:
        return json.loads(_attempt_path().read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _write_attempts(rows):
    _attempt_path().write_text(json.dumps(rows, indent=2), encoding="utf-8")


def _users():
    return UserStore(current_app.config["USER_STORE_PATH"])


def _public_user(user):
    return {
        "id": user.get("id"),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
        "phone": user.get("phone"),
        "course": user.get("course"),
        "enrolledCourses": user.get("enrolledCourses", []),
        "lastActiveAt": user.get("lastActiveAt"),
    }


def _ensure_student_enrollments(user):
    if user.get("role") != "student":
        return user
    enrolled = user.get("enrolledCourses")
    if isinstance(enrolled, list) and enrolled:
        return user
    course_ids = [course["_id"] for course in COURSES if course.get("isPublished")]
    updated = _users().update_by_id(user["id"], {"enrolledCourses": course_ids})
    return updated or user


def dashboard_public():
    return {
        "progress": [{"week": f"W{i}", "score": s} for i, s in enumerate([42, 55, 61, 70, 74, 83, 88], 1)],
        "skills": [
            {"skill": skill, "val": value}
            for skill, value in zip(["Math", "Coding", "Theory", "NLP", "CV", "MLOps"], [85, 78, 65, 45, 72, 30])
        ],
        "modules": [
            {"title": "Python & Math Foundations", "topics": 6, "done": 6, "color": "#00D4AA"},
            {"title": "Classical ML Algorithms", "topics": 8, "done": 7, "color": "#6C63FF"},
            {"title": "Deep Learning & CNNs", "topics": 10, "done": 5, "color": "#F59E0B"},
            {"title": "NLP & Transformers", "topics": 9, "done": 2, "color": "#EC4899"},
            {"title": "MLOps & Deployment", "topics": 7, "done": 0, "color": "#64748B"},
        ],
    }


def student_dashboard(current_user):
    user = _users().find_by_id(current_user["id"])
    if not user:
        return None
    user = _ensure_student_enrollments(user)
    attempts = [row for row in _read_attempts() if str(row.get("userId")) == str(user["id"])]
    attempts.sort(key=lambda row: row.get("createdAt", ""), reverse=True)

    avg_pct = None
    if attempts:
        total = 0.0
        for item in attempts:
            max_score = item.get("maxScore", 0)
            total += (item.get("score", 0) / max_score) * 100 if max_score else 0
        avg_pct = round(total / len(attempts), 1)

    quiz_map = {quiz["_id"]: quiz for quiz in QUIZZES}
    course_map = {course["_id"]: course for course in COURSES}
    recent = []
    for item in attempts[:5]:
        quiz = quiz_map.get(item.get("quizId"), {})
        course = course_map.get(item.get("courseId"), {})
        recent.append(
            {
                "id": item.get("id"),
                "score": item.get("score"),
                "maxScore": item.get("maxScore"),
                "durationMs": item.get("durationMs"),
                "createdAt": item.get("createdAt"),
                "quizTitle": quiz.get("title"),
                "courseTitle": course.get("title"),
            }
        )

    return {
        "message": "Student dashboard",
        "student": _public_user(user),
        "stats": {
            "enrolledCount": len(user.get("enrolledCourses", [])),
            "quizAttempts": len(attempts),
            "avgScorePct": avg_pct,
        },
        "recentAttempts": recent,
    }


def student_profile(current_user):
    user = _users().find_by_id(current_user["id"])
    if not user:
        return None
    user = _ensure_student_enrollments(user)
    return _public_user(user)


def update_student_profile(current_user, payload):
    allowed = {}
    for key in ["name", "phone", "course"]:
        if key in payload:
            allowed[key] = str(payload.get(key) or "").strip()
    if not allowed:
        return None, "No valid fields to update (name, phone, course)."
    allowed["lastActiveAt"] = datetime.now(timezone.utc).isoformat()
    updated = _users().update_by_id(current_user["id"], allowed)
    if not updated:
        return None, "User not found."
    return _public_user(updated), None


def list_student_courses(current_user):
    user = _users().find_by_id(current_user["id"])
    if not user:
        return None
    user = _ensure_student_enrollments(user)
    enrolled = set(user.get("enrolledCourses", []))
    out = []
    for course in COURSES:
        if course["_id"] in enrolled and course.get("isPublished"):
            quiz_count = sum(1 for quiz in QUIZZES if quiz["courseId"] == course["_id"])
            out.append(
                {
                    "_id": course["_id"],
                    "title": course["title"],
                    "slug": course["slug"],
                    "description": course["description"],
                    "modules": course["modules"],
                    "quizCount": quiz_count,
                }
            )
    return out


def get_student_course(current_user, course_id):
    courses = list_student_courses(current_user)
    if courses is None:
        return None, "User not found.", 404
    course = next((row for row in courses if row["_id"] == course_id), None)
    if not course:
        return None, "You are not enrolled in this course.", 403

    attempts = [row for row in _read_attempts() if str(row.get("userId")) == str(current_user["id"])]
    quiz_rows = []
    for quiz in sorted([q for q in QUIZZES if q["courseId"] == course_id], key=lambda q: q.get("weekNumber", 0)):
        per_quiz = [a for a in attempts if a.get("quizId") == quiz["_id"]]
        best = None
        if per_quiz:
            best_item = max(per_quiz, key=lambda a: (a.get("score", 0) / a.get("maxScore", 1)) if a.get("maxScore") else 0)
            best = {
                "pct": (best_item["score"] / best_item["maxScore"]) * 100 if best_item.get("maxScore") else 0,
                "score": best_item.get("score"),
                "maxScore": best_item.get("maxScore"),
                "at": best_item.get("createdAt"),
            }
        quiz_rows.append(
            {
                "_id": quiz["_id"],
                "title": quiz["title"],
                "weekNumber": quiz.get("weekNumber", 1),
                "kind": quiz.get("kind", "weekly"),
                "timeLimitMinutes": quiz.get("timeLimitMinutes", 15),
                "bestAttempt": best,
            }
        )
    return {"course": course, "quizzes": quiz_rows}, None, 200


def get_quiz_for_attempt(current_user, quiz_id):
    quiz = next((row for row in QUIZZES if row["_id"] == quiz_id), None)
    if not quiz:
        return None, "Quiz not found.", 404
    courses = list_student_courses(current_user) or []
    course_ids = {row["_id"] for row in courses}
    if quiz["courseId"] not in course_ids:
        return None, "Not enrolled in this course.", 403
    return {
        "quiz": {
            "id": quiz["_id"],
            "courseId": quiz["courseId"],
            "title": quiz["title"],
            "weekNumber": quiz["weekNumber"],
            "kind": quiz["kind"],
            "timeLimitMinutes": quiz["timeLimitMinutes"],
            "questions": [{"id": q["id"], "text": q["text"], "options": q["options"]} for q in quiz["questions"]],
        }
    }, None, 200


def submit_quiz_attempt(current_user, payload):
    quiz_id = payload.get("quizId")
    answers = payload.get("answers")
    if not quiz_id or not isinstance(answers, list):
        return None, "quizId and answers[] are required.", 400
    quiz = next((row for row in QUIZZES if row["_id"] == quiz_id), None)
    if not quiz:
        return None, "Quiz not found.", 404
    check, err, status = get_quiz_for_attempt(current_user, quiz_id)
    if err:
        return None, err, status
    _ = check

    questions = quiz["questions"]
    score = 0
    for idx, question in enumerate(questions):
        if idx < len(answers) and int(answers[idx]) == int(question["correctAnswer"]):
            score += 1
    max_score = len(questions)

    attempts = _read_attempts()
    prev_count = sum(
        1
        for item in attempts
        if str(item.get("userId")) == str(current_user["id"]) and str(item.get("quizId")) == str(quiz_id)
    )
    created = {
        "id": str(uuid4()),
        "userId": current_user["id"],
        "quizId": quiz_id,
        "courseId": quiz["courseId"],
        "score": score,
        "maxScore": max_score,
        "answers": [int(x) for x in answers],
        "durationMs": int(payload.get("durationMs") or 0),
        "attemptNumber": prev_count + 1,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    attempts.append(created)
    _write_attempts(attempts)
    _users().update_by_id(current_user["id"], {"lastActiveAt": datetime.now(timezone.utc).isoformat()})

    return {
        "message": "Attempt recorded.",
        "attempt": {
            "id": created["id"],
            "score": score,
            "maxScore": max_score,
            "percent": round((score / max_score) * 100, 1) if max_score else 0,
            "durationMs": created["durationMs"],
            "attemptNumber": created["attemptNumber"],
            "createdAt": created["createdAt"],
        },
    }, None, 201


def admin_dashboard(current_user):
    students = [u for u in _users().list_all() if u.get("role") == "student"]
    admin = _users().find_by_id(current_user["id"]) or current_user
    return {
        "message": "Admin dashboard",
        "admin": _public_user(admin),
        "stats": {"totalStudents": len(students)},
    }


def _expand_student(user):
    course_map = {course["_id"]: course for course in COURSES}
    expanded = []
    for course_id in user.get("enrolledCourses", []):
        course = course_map.get(course_id)
        if course:
            expanded.append({"_id": course["_id"], "title": course["title"], "slug": course["slug"]})
    payload = _public_user(user)
    payload["enrolledCourses"] = expanded
    return payload


def list_students(query=""):
    query = (query or "").strip().lower()
    students = [u for u in _users().list_all() if u.get("role") == "student"]
    if query:
        students = [u for u in students if query in (u.get("name", "").lower()) or query in (u.get("email", "").lower())]
    return [_expand_student(_ensure_student_enrollments(u)) for u in students]


def get_student(student_id):
    user = _users().find_by_id(student_id)
    if not user or user.get("role") != "student":
        return None
    return _expand_student(_ensure_student_enrollments(user))


def update_student(student_id, payload):
    user = _users().find_by_id(student_id)
    if not user or user.get("role") != "student":
        return None, "Student not found.", 404
    updates = {}
    for key in ["name", "email", "phone", "course"]:
        if key in payload:
            updates[key] = str(payload.get(key) or "").strip()
    if "enrolledCourses" in payload and isinstance(payload.get("enrolledCourses"), list):
        valid = {c["_id"] for c in COURSES}
        updates["enrolledCourses"] = [cid for cid in payload.get("enrolledCourses") if cid in valid]
    if not updates:
        return None, "No valid fields to update.", 400
    updated = _users().update_by_id(student_id, updates)
    return _expand_student(_ensure_student_enrollments(updated)), None, 200


def delete_student(student_id):
    user = _users().find_by_id(student_id)
    if not user or user.get("role") != "student":
        return False
    return _users().delete_by_id(student_id)


def admin_analytics():
    students = [u for u in _users().list_all() if u.get("role") == "student"]
    attempts = _read_attempts()
    total_attempts = len(attempts)
    avg = 0
    if attempts:
        sum_pct = 0.0
        for item in attempts:
            max_score = item.get("maxScore", 0)
            sum_pct += (item.get("score", 0) / max_score) * 100 if max_score else 0
        avg = round(sum_pct / len(attempts), 1)
    seven_days_ago = datetime.now(timezone.utc).timestamp() - (7 * 24 * 60 * 60)
    active = 0
    for user in students:
        last_active = user.get("lastActiveAt")
        if not last_active:
            continue
        try:
            ts = datetime.fromisoformat(last_active.replace("Z", "+00:00")).timestamp()
            if ts >= seven_days_ago:
                active += 1
        except ValueError:
            continue

    course_perf = []
    for course in COURSES:
        course_attempts = [a for a in attempts if a.get("courseId") == course["_id"]]
        avg_course = 0
        if course_attempts:
            total = 0.0
            for item in course_attempts:
                max_score = item.get("maxScore", 0)
                total += (item.get("score", 0) / max_score) * 100 if max_score else 0
            avg_course = round(total / len(course_attempts), 1)
        course_perf.append(
            {
                "courseId": course["_id"],
                "title": course["title"],
                "attempts": len(course_attempts),
                "avgScorePct": avg_course,
            }
        )

    return {
        "overview": {
            "totalStudents": len(students),
            "activeUsersLast7Days": active,
            "totalQuizAttempts": total_attempts,
            "avgQuizScorePct": avg,
        },
        "coursePerformance": course_perf,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def ai_reply(message):
    text = (message or "").strip().lower()
    if "gradient" in text:
        return (
            "Gradients measure how loss changes with each weight, and optimizers use them to update parameters.",
            "placeholder",
        )
    if "overfit" in text:
        return ("Overfitting means memorizing training noise; use regularization, dropout, and validation checks.", "placeholder")
    if "cnn" in text or "convolution" in text:
        return ("CNNs learn spatial patterns through convolution filters and pooling over feature maps.", "placeholder")
    return (
        "I am NeuroX. Ask about ML concepts, quizzes, and course topics, and I will explain step by step.",
        "placeholder",
    )
