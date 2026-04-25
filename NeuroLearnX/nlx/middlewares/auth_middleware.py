"""
JWT auth middleware — decodes the same tokens issued by Node.js and Flask.
Token shape: { userId, email, role }
"""
from functools import wraps

from flask import jsonify, request

from ..utils.token_utils import read_token


def _token_from_request():
    # 1. Authorization: Bearer <token>
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    # 2. HTTP-only cookie
    return request.cookies.get("token")


def require_auth(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        token = _token_from_request()
        if not token:
            return jsonify({"message": "Not authenticated. Please sign in."}), 401

        payload = read_token(token)
        if not payload:
            return jsonify({"message": "Invalid or expired token. Please sign in again."}), 401

        request.current_user = payload
        return handler(*args, **kwargs)
    return wrapped


def require_role(*roles):
    def decorator(handler):
        @wraps(handler)
        @require_auth
        def wrapped(*args, **kwargs):
            role = request.current_user.get("role")
            if role not in roles:
                return jsonify({"message": "Forbidden — insufficient role."}), 403
            return handler(*args, **kwargs)
        return wrapped
    return decorator
