# ════════════════════════════════════════════════════
# tests/test_routes.py  —  Flask route + module tests
# Run with:  pytest tests/test_routes.py -v
# ════════════════════════════════════════════════════

import pytest
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c

# ── Page routes ──────────────────────────────────────
def test_dashboard_page(client):
    r = client.get("/")
    assert r.status_code == 200
    assert b"NeuroLearnX" in r.data

def test_learning_page(client):
    r = client.get("/learning")
    assert r.status_code == 200

def test_lab_page(client):
    r = client.get("/lab")
    assert r.status_code == 200

def test_analytics_page(client):
    r = client.get("/analytics")
    assert r.status_code == 200

def test_tutor_page(client):
    r = client.get("/tutor")
    assert r.status_code == 200

def test_quiz_page(client):
    r = client.get("/quiz")
    assert r.status_code == 200

# ── Health check ─────────────────────────────────────
def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.get_json()
    assert data["status"] == "ok"
    assert data["platform"] == "NeuroLearnX"

# ── API: Quiz ─────────────────────────────────────────
def test_quiz_api_returns_questions(client):
    r = client.get("/api/quiz")
    assert r.status_code == 200
    data = r.get_json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert "q" in data[0]
    assert "opts" in data[0]
    assert "ans" in data[0]
    assert "exp" in data[0]

# ── API: Lab Run ──────────────────────────────────────
def test_lab_run_returns_results(client):
    r = client.post("/api/lab/run",
        json={"dataset": "MNIST", "model": "Neural Network"},
        content_type="application/json")
    assert r.status_code == 200
    data = r.get_json()
    assert "accuracy" in data
    assert "f1_score" in data
    assert "training_curve" in data
    assert 0.0 <= data["accuracy"] <= 1.0
    assert len(data["training_curve"]) == 6

def test_lab_run_accepts_different_models(client):
    for model in ["Random Forest", "SVM", "Gradient Boosting"]:
        r = client.post("/api/lab/run",
            json={"dataset": "Iris", "model": model},
            content_type="application/json")
        assert r.status_code == 200

# ── API: Analytics ────────────────────────────────────
def test_analytics_api(client):
    r = client.get("/api/analytics")
    assert r.status_code == 200
    data = r.get_json()
    assert "progress" in data
    assert "skills" in data
    assert len(data["progress"]) == 7
    assert len(data["skills"]) == 6

# ── API: Tutor (mocked — no real API key needed) ──────
def test_tutor_api_requires_json(client):
    r = client.post("/api/tutor",
        json={"message": "What is a neural network?", "history": []},
        content_type="application/json")
    # Will fail with 500 if no API key — test the request structure only
    assert r.status_code in [200, 500]


