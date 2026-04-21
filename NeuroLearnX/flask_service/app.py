"""
Optional Flask service (only needed if you later want Python-based modules).

Right now, Express handles everything. This service is provided as a simple example:
- /health
- /mongo/ping (PyMongo connection test)
"""
import os
from flask import Flask, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/mongo/ping")
def mongo_ping():
    uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/neurolx")
    client = MongoClient(uri)
    # Cheap command to verify connectivity
    client.admin.command("ping")
    return jsonify({"mongo": "ok"})


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", "7000"))
    app.run(host="0.0.0.0", port=port, debug=True)

