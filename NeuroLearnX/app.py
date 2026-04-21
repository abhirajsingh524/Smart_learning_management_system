from flask import Flask, render_template, jsonify, request
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

client = anthropic.Anthropic(api_key=os.getenv("key"))

# ── Pages ──────────────────────────────────────────────
@app.route("/")
def dashboard():
    return render_template("dashboard.html")

@app.route("/learning")
def learning():
    return render_template("learning.html")

@app.route("/lab")
def lab():
    return render_template("lab.html")

@app.route("/analytics")
def analytics():
    return render_template("analytics.html")

@app.route("/tutor")
def tutor():
    return render_template("tutor.html")

@app.route("/quiz")
def quiz():
    return render_template("quiz.html")

# ── Unified login & dashboard aliases (for Flask demo mode) ─────────────
@app.route("/login")
def login():
    return render_template("lms_login.html")

@app.route("/student-dashboard.html")
def student_dashboard_alias():
    return render_template("student-dashboard.html")

@app.route("/admin-dashboard.html")
def admin_dashboard_alias():
    return render_template("admin-dashboard.html")

# ── API: Dashboard Data (used by static/js/dashboard.js) ────────────────
@app.route("/api/dashboard", methods=["GET"])
def dashboard_api():
    # Keep response shape identical to the Node public API
    return jsonify({
        "progress": [
            {"week": "W1", "score": 42}, {"week": "W2", "score": 55},
            {"week": "W3", "score": 61}, {"week": "W4", "score": 70},
            {"week": "W5", "score": 74}, {"week": "W6", "score": 83},
            {"week": "W7", "score": 88},
        ],
        "skills": [
            {"skill": "Math",   "val": 85}, {"skill": "Coding", "val": 78},
            {"skill": "Theory", "val": 65}, {"skill": "NLP",    "val": 45},
            {"skill": "CV",     "val": 72}, {"skill": "MLOps",  "val": 30},
        ],
        "modules": [
            {"title": "Python & Math Foundations", "topics": 6, "done": 6, "color": "#00D4AA"},
            {"title": "Classical ML Algorithms", "topics": 8, "done": 7, "color": "#6C63FF"},
            {"title": "Deep Learning & CNNs", "topics": 10, "done": 5, "color": "#F59E0B"},
            {"title": "NLP & Transformers", "topics": 9, "done": 2, "color": "#EC4899"},
            {"title": "MLOps & Deployment", "topics": 7, "done": 0, "color": "#64748B"},
        ],
    })

# ── API: AI Tutor ──────────────────────────────────────
@app.route("/api/tutor", methods=["POST"])
def tutor_api():
    data = request.get_json()
    history = data.get("history", [])
    user_msg = data.get("message", "")

    messages = [{"role": m["role"], "content": m["text"]} for m in history]
    messages.append({"role": "user", "content": user_msg})

    response = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=1000,
        system=(
            "I am NeuroBot, an expert AI tutor for NeuroLearnX — "
            "an advanced machine learning learning platform. Help students "
            "understand ML concepts: neural networks, CNNs, NLP, Transformers, "
            "MLOps, etc. Be concise, friendly, use clear examples. "
            "Keep answers under 150 words unless detail is truly needed."
        ),
        messages=messages,
    )
    reply = response.content[0].text
    return jsonify({"reply": reply})

# ── API: Run ML Lab Experiment ─────────────────────────
@app.route("/api/lab/run", methods=["POST"])
def lab_run():
    import random, time
    data = request.get_json()
    dataset = data.get("dataset", "MNIST")
    model = data.get("model", "Neural Network")

    # Simulated training result
    acc = round(random.uniform(0.78, 0.96), 4)
    f1  = round(acc - random.uniform(0.01, 0.04), 4)
    params = random.randint(50000, 550000)

    return jsonify({
        "dataset": dataset,
        "model": model,
        "accuracy": acc,
        "f1_score": f1,
        "epochs": 6,
        "parameters": params,
        "training_curve": [
            {"epoch": i, "train": round(0.5 + i * 0.08 + random.uniform(0, 0.02), 4),
             "val":   round(0.48 + i * 0.07 + random.uniform(0, 0.02), 4)}
            for i in range(1, 7)
        ]
    })

# ── API: Quiz Questions ────────────────────────────────
@app.route("/api/quiz", methods=["GET"])
def quiz_api():
    questions = [
        {
            "q": "Which activation function is most commonly used in hidden layers of deep neural networks?",
            "opts": ["Sigmoid", "Tanh", "ReLU", "Softmax"],
            "ans": 2,
            "exp": "ReLU avoids the vanishing gradient problem and is computationally efficient."
        },
        {
            "q": "What does the 'attention' mechanism in Transformers primarily help with?",
            "opts": ["Speed up training", "Focus on relevant tokens across the sequence", "Reduce overfitting", "Normalize inputs"],
            "ans": 1,
            "exp": "Attention dynamically weighs the importance of different tokens in a sequence."
        },
        {
            "q": "Which technique randomly drops neurons during training to reduce overfitting?",
            "opts": ["Batch Normalization", "L2 Regularization", "Dropout", "Early Stopping"],
            "ans": 2,
            "exp": "Dropout randomly disables neurons each step, forcing redundant representations."
        },
    ]
    return jsonify(questions)

# ── API: Analytics Data ────────────────────────────────
@app.route("/api/analytics", methods=["GET"])
def analytics_api():
    return jsonify({
        "progress": [
            {"week": "W1", "score": 42}, {"week": "W2", "score": 55},
            {"week": "W3", "score": 61}, {"week": "W4", "score": 70},
            {"week": "W5", "score": 74}, {"week": "W6", "score": 83},
            {"week": "W7", "score": 88},
        ],
        "skills": [
            {"skill": "Math",   "val": 85}, {"skill": "Coding", "val": 78},
            {"skill": "Theory", "val": 65}, {"skill": "NLP",    "val": 45},
            {"skill": "CV",     "val": 72}, {"skill": "MLOps",  "val": 30},
        ]
    })

# ── Health Check ───────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "platform": "NeuroXLearn"})

if __name__ == "__main__":
    # Run Flask on a different port than Node (Node uses PORT=5000 by default)
    port = int(os.getenv("FLASK_PORT", "5001"))
    app.run(debug=True, port=port)