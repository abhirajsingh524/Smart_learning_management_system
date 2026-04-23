from uuid import uuid4

from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash

from ..models.user_store import UserStore
from ..utils.token_utils import issue_token

ALLOWED_ROLES = {"admin", "user", "intern", "student"}


def _store():
    return UserStore(current_app.config["USER_STORE_PATH"])


def _public_user(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "phone": user.get("phone"),
        "course": user.get("course"),
    }


def register_user(data, force_role=None):
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = force_role or (data.get("role") or "user")
    role = role if role in ALLOWED_ROLES else "user"

    if not name or not email or not password:
        return None, "name, email and password are required", 400

    if _store().find_by_email(email):
        return None, "Email already registered", 409

    created = {
        "id": str(uuid4()),
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
        "role": role,
        "phone": data.get("phone"),
        "course": data.get("course"),
    }
    _store().create(created)
    token = issue_token({"id": created["id"], "email": created["email"], "role": created["role"]})
    return {"token": token, "user": _public_user(created)}, None, 201


def login_user(data):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = _store().find_by_email(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return None, "Invalid credentials", 401

    token = issue_token({"id": user["id"], "email": user["email"], "role": user["role"]})
    return {"token": token, "user": _public_user(user)}, None, 200
