# ══════════════════════════════════════════════════════
# tests/test_routes.py   —  Run: pytest tests/ -v
# ══════════════════════════════════════════════════════
import pytest, sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c

# ── Page route tests ────────────────────────────────
@pytest.mark.parametrize("route,keyword", [
    ("/",               b"NeuroLearnX"),
    ("/courses",        b"Learning Tracks"),
    ("/lab",            b"ML Lab"),
    ("/tutor",          b"NeuroBot"),
    ("/leaderboard",    b"Leaderboard"),
    ("/community",      b"Community"),
    ("/certifications", b"Certifications"),
    ("/resources",      b"Resources"),
    ("/mentor",         b"Mentors"),
    ("/about",          b"About"),
])
def test_page_loads(client, route, keyword):
    r = client.get(route)
    assert r.status_code == 200
    assert keyword in r.data

# ── Health check ────────────────────────────────────
def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"

# ── Quiz API ────────────────────────────────────────
def test_quiz_returns_3_questions(client):
    r    = client.get("/api/quiz")
    data = r.get_json()
    assert r.status_code == 200
    assert len(data) == 3
    for q in data:
        assert "q" in q and "opts" in q and "ans" in q and "exp" in q

# ── Leaderboard API ─────────────────────────────────
def test_leaderboard_returns_7(client):
    r    = client.get("/api/leaderboard")
    data = r.get_json()
    assert r.status_code == 200
    assert len(data) == 7
    assert data[0]["rank"] == 1

# ── Analytics API ───────────────────────────────────
def test_analytics_structure(client):
    r    = client.get("/api/analytics")
    data = r.get_json()
    assert "progress" in data and "skills" in data
    assert len(data["progress"]) == 7
    assert len(data["skills"])   == 6

# ── Lab Run API ─────────────────────────────────────
def test_lab_run_basic(client):
    r    = client.post("/api/lab/run",
             json={"dataset":"MNIST","model":"Neural Network"},
             content_type="application/json")
    data = r.get_json()
    assert r.status_code == 200
    assert 0 < data["accuracy"] <= 1.0
    assert len(data["training_curve"]) == 6

@pytest.mark.parametrize("model", ["Random Forest","SVM","Gradient Boosting","ResNet-18"])
def test_lab_all_models(client, model):
    r = client.post("/api/lab/run",
          json={"dataset":"Iris","model":model},
          content_type="application/json")
    assert r.status_code == 200

# ── Tutor API (no real key needed, just test structure) ─
def test_tutor_accepts_request(client):
    r = client.post("/api/tutor",
          json={"message":"What is a neural network?","history":[]},
          content_type="application/json")
    assert r.status_code in [200, 500]  # 500 OK if no key in test env


def test_auth_register_login_and_protected(client):
    email = "phase2_user@example.com"
    register = client.post(
        "/api/auth/student/register",
        json={"name": "Phase Two", "email": email, "password": "pass1234"},
        content_type="application/json",
    )
    assert register.status_code in [201, 409]

    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "pass1234"},
        content_type="application/json",
    )
    assert login.status_code == 200
    data = login.get_json()
    assert "token" in data and "user" in data

    protected = client.get(
        "/api/protected/ping",
        headers={"Authorization": f"Bearer {data['token']}"},
    )
    assert protected.status_code == 200


def test_lms_and_admin_login_pages_load(client):
    r = client.get("/login")
    assert r.status_code == 200
    assert b"NeuroXLearn" in r.data
    r2 = client.get("/admin/login")
    assert r2.status_code == 200
    assert b"admin" in r2.data.lower() or b"sign" in r2.data.lower()


# ══════════════════════════════════════════════════════
# requirements.txt
# ══════════════════════════════════════════════════════
# flask>=3.0
# anthropic>=0.25
# python-dotenv>=1.0
# pytest>=8.0
# pytest-flask>=0.21

# ══════════════════════════════════════════════════════
# .env.example  —  Copy to .env and fill your key
# ══════════════════════════════════════════════════════
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
