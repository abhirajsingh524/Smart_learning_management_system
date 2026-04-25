"""
One-time admin creation script — compatible with Node.js bcrypt hashes.

Run:  python create_admin.py

Creates an admin user directly in MongoDB using bcrypt (same as Node.js),
so the admin can log in via both the Node.js and Flask backends.
"""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# ── Check dependencies ────────────────────────────────────────────────────
missing = []
try:
    from pymongo import MongoClient
except ImportError:
    missing.append("pymongo")

try:
    import bcrypt
except ImportError:
    missing.append("bcrypt")

if missing:
    print("Missing packages. Run:  pip install " + " ".join(missing))
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "").strip()
DB_NAME   = "NeroX"   # must match Node.js backend

if not MONGO_URI:
    print("ERROR: MONGO_URI is not set in .env")
    sys.exit(1)

# ── Collect admin details ─────────────────────────────────────────────────
print("=" * 50)
print("  NeuroLearnX — Create Admin User")
print("=" * 50)
print(f"  Database: {DB_NAME}")
print(f"  URI:      {MONGO_URI[:45]}...")
print()

name     = input("Admin name     : ").strip()
email    = input("Admin email    : ").strip().lower()
password = input("Admin password : ").strip()

if not name or not email or not password:
    print("\nERROR: All fields are required.")
    sys.exit(1)

if len(password) < 8:
    print("\nERROR: Password must be at least 8 characters.")
    sys.exit(1)

# ── Connect ───────────────────────────────────────────────────────────────
print(f"\nConnecting to MongoDB...")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=12000)
    client.admin.command("ping")
    print("Connected ✅")
except Exception as e:
    print(f"Connection failed: {e}")
    sys.exit(1)

db    = client[DB_NAME]
users = db["users"]

# ── Check duplicate ───────────────────────────────────────────────────────
existing = users.find_one({"email": email})
if existing:
    print(f"\nUser {email!r} already exists (role: {existing.get('role')}).")
    if existing.get("role") != "admin":
        fix = input("Upgrade to admin? (y/N): ").strip().lower()
        if fix == "y":
            users.update_one({"email": email}, {"$set": {"role": "admin"}})
            print(f"✅ {email} upgraded to admin.")
        else:
            print("No changes made.")
    else:
        print("Already an admin — no changes needed.")
    client.close()
    sys.exit(0)

# ── Hash with bcrypt (same as Node.js bcryptjs) ───────────────────────────
pw_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")
now     = datetime.now(timezone.utc).isoformat()

result = users.insert_one({
    "name":            name,
    "email":           email,
    "password":        pw_hash,   # bcrypt — works with Node.js AND Flask
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
print(f"\nLogin at:")
print(f"   Node.js → http://localhost:5000/admin/login")
print(f"   Flask   → http://localhost:5001/admin/login")

client.close()
