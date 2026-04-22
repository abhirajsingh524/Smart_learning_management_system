from flask import Flask, render_template, jsonify, request
import anthropic, os, random
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ── Page Routes ────────────────────────────────────────
@app.route("/")
def home():           return render_template("home.html")

@app.route("/courses")
def courses():        return render_template("courses.html")

@app.route("/lab")
def lab():            return render_template("lab.html")

@app.route("/tutor")
def tutor():          return render_template("tutor.html")

@app.route("/leaderboard")
def leaderboard():    return render_template("leaderboard.html")

@app.route("/community")
def community():      return render_template("community.html")

@app.route("/certifications")
def certifications(): return render_template("certifications.html")

@app.route("/resources")
def resources():      return render_template("resources.html")

@app.route("/mentor")
def mentor():         return render_template("mentor.html")

@app.route("/about")
def about():          return render_template("about.html")

# ── API: AI Tutor ──────────────────────────────────────
@app.route("/api/tutor", methods=["POST"])
def tutor_api():
    data    = request.get_json()
    history = data.get("history", [])
    user_msg= data.get("message", "")
    messages= [{"role": m["role"], "content": m["text"]} for m in history]
    messages.append({"role": "user", "content": user_msg})
    resp = client.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=1000,
        system=(
            "You are NeuroBot, an expert AI tutor for NeuroLearnX — "
            "an advanced machine learning learning platform. Help students "
            "understand ML concepts: neural networks, CNNs, NLP, Transformers, "
            "MLOps, RL etc. Be concise (under 150 words), friendly, use examples."
        ),
        messages=messages,
    )
    return jsonify({"reply": resp.content[0].text})

# ── API: ML Lab Experiment ─────────────────────────────
@app.route("/api/lab/run", methods=["POST"])
def lab_run():
    data    = request.get_json()
    dataset = data.get("dataset", "MNIST")
    model   = data.get("model",   "Neural Network")
    acc     = round(random.uniform(0.78, 0.96), 4)
    f1      = round(acc - random.uniform(0.01, 0.04), 4)
    curve   = [
        {"epoch": i,
         "train": round(0.50 + i*0.082 + random.uniform(0,0.015), 4),
         "val":   round(0.48 + i*0.072 + random.uniform(0,0.015), 4)}
        for i in range(1, 7)
    ]
    return jsonify({"dataset": dataset, "model": model,
                    "accuracy": acc, "f1_score": f1,
                    "epochs": 6, "parameters": random.randint(50000,550000),
                    "training_curve": curve})

# ── API: Quiz Questions ────────────────────────────────
@app.route("/api/quiz")
def quiz_api():
    return jsonify([
        {"q":"Which activation function best addresses vanishing gradients?",
         "opts":["Sigmoid","Tanh","ReLU","Softmax"],"ans":2,
         "exp":"ReLU avoids near-zero gradients that kill deep network learning."},
        {"q":"What does multi-head attention allow the model to do?",
         "opts":["Parallel batches","Attend to multiple subspaces","Reduce params","Apply dropout"],
         "ans":1,"exp":"Multiple heads let the model attend to different positions simultaneously."},
        {"q":"What is the purpose of epsilon in the Adam optimizer?",
         "opts":["LR decay","Prevent division by zero","Clip gradients","Set momentum"],
         "ans":1,"exp":"Epsilon prevents division by zero when the second moment is near zero."},
    ])

# ── API: Analytics Data ────────────────────────────────
@app.route("/api/analytics")
def analytics_api():
    return jsonify({
        "progress": [{"week":f"W{i}","score":s} for i,s in enumerate([42,55,61,70,74,83,88],1)],
        "skills":   [{"skill":s,"val":v} for s,v in
                     zip(["Math","Code","Theory","NLP","CV","MLOps"],[85,78,65,45,72,30])]
    })

# ── API: Leaderboard ───────────────────────────────────
@app.route("/api/leaderboard")
def leaderboard_api():
    return jsonify([
        {"rank":1,"name":"Aditya K.","points":9820,"badge":"🥇","streak":45,"courses":5},
        {"rank":2,"name":"Sneha R.", "points":9410,"badge":"🥈","streak":38,"courses":5},
        {"rank":3,"name":"Vikram S.","points":8990,"badge":"🥉","streak":30,"courses":4},
        {"rank":4,"name":"Meera P.", "points":8550,"badge":"⭐","streak":28,"courses":4},
        {"rank":5,"name":"Rohan T.", "points":8210,"badge":"⭐","streak":22,"courses":3},
        {"rank":6,"name":"Divya N.", "points":7890,"badge":"⭐","streak":19,"courses":3},
        {"rank":7,"name":"Arjun M.", "points":7540,"badge":"⭐","streak":15,"courses":3},
    ])

# ── Health Check ───────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({"status":"ok","platform":"NeuroLearnX"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)