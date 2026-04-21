"""
NeuroX Python microservice — PyMongo analytics + optional AI echo.
Run: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from pydantic import BaseModel
from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI is required")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
db = client.get_default_database()


def attempts_collection():
    """Match Mongoose default collection name for QuizAttempt (`quizattempts`)."""
    names = db.list_collection_names()
    for n in names:
        if n.lower() == "quizattempts":
            return db[n]
    for n in names:
        if "quizattempt" in n.lower():
            return db[n]
    return db["quizattempts"]

app = FastAPI(title="NeuroX Python Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    try:
        client.admin.command("ping")
        return {"ok": True, "mongo": "up"}
    except Exception as e:
        return {"ok": False, "mongo": "down", "detail": str(e)}


@app.get("/analytics/summary")
def analytics_summary():
    """Aggregated stats for Node to merge into admin analytics."""
    users = db["users"]
    attempts = attempts_collection()

    total_students = users.count_documents({"role": "student"})
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active = users.count_documents({"role": "student", "lastActiveAt": {"$gte": week_ago}})

    att_list = list(attempts.find({}))
    total_attempts = len(att_list)
    avg_pct = None
    if total_attempts:
        s = sum(
            (a.get("score", 0) / a["maxScore"]) * 100
            for a in att_list
            if a.get("maxScore")
        )
        avg_pct = round(s / total_attempts, 2)

    return {
        "source": "python-pymongo",
        "totalStudents": total_students,
        "activeStudentsLast7d": active,
        "totalQuizAttempts": total_attempts,
        "avgQuizScorePct": avg_pct,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


class ChatBody(BaseModel):
    message: str
    context: Optional[dict] = None


@app.post("/ai/chat")
def ai_chat(body: ChatBody):
    """Lightweight tutor reply; swap with real LLM later."""
    text = (body.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="message required")
    lower = text.lower()
    if "neural" in lower or "network" in lower:
        reply = (
            "Neural networks stack layers of weighted sums plus nonlinear activations; "
            "training adjusts weights via gradients to minimize loss."
        )
    elif "gradient" in lower:
        reply = (
            "Gradients describe how loss changes with respect to each parameter; "
            "optimizers use them to update weights."
        )
    else:
        reply = (
            "I'm the NeuroX Python tutor (placeholder). Ask about ML fundamentals, "
            "evaluation metrics, or study tips — or connect a real LLM here."
        )
    return {"reply": reply, "source": "python-service"}
