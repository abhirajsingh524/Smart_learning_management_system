"""
One-time admin creation script.
Run: python create_admin.py

Creates an admin user directly in MongoDB — no server needed.
Safe to run multiple times (skips if email already exists).
"""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).parent / ".env")

try:
    from pymongo import MongoClient
    from werkzeug.security import generate_password_hash
except ImportError:
    print("Missing dependencies. Run:  pip install pymongo werkzeug python-dotenv")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME   = "NeroX"          # same DB as Node.js backend

if not MONGO_URI:
    print("ERROR: MONGO_URI is not set in .env")
    sys.exit(1)

# ── Collect admin details ─────────────────────────────────────────────────
print("=" * 50)
print("  NeuroLearnX — Create Admin User")
print("=" * 50)

name     = input("Admin name     : ").strip()
email    = input("Admin email    : ").strip().lower()
password = input("Admin password : ").strip()

if not name or not email or not password:
    print("ERROR: All fields are required.")
    sys.exit(1)

if len(password) < 8:
    print("ERROR: Password must be at least 8 characters.")
    sys.exit(1)

# ── Connect and insert ────────────────────────────────────────────────────
print(f"\nConnecting to MongoDB...")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    client.admin.command("ping")
    print("Connected ✅")
except Exception as e:
    print(f"Connection failed: {e}")
    sys.exit(1)

db    = client[DB_NAME]
users = db["users"]

# Check duplicate
if users.find_one({"email": email}):
    print(f"\nUser {email!r} already exists in MongoDB.")
    print("Use a different email or update the existing user.")
    client.close()
    sys.exit(0)

# Hash password and insert
now     = datetime.now(timezone.utc).isoformat()
pw_hash = generate_password_hash(password, method="pbkdf2:sha256")

result = users.insert_one({
    "name":            name,
    "email":           email,
    "password":        pw_hash,
    "role":            "admin",
    "phone":           None,
    "course":          None,
    "enrolledCourses": [],
    "lastActiveAt":    now,
    "createdAt":       now,
    "updatedAt":       now,
})

print(f"\n✅ Admin created successfully!")
print(f"   Name  : {name}")
print(f"   Email : {email}")
print(f"   Role  : admin")
print(f"   ID    : {result.inserted_id}")
print(f"\nYou can now log in at: http://localhost:5000/admin/login")

client.close()
