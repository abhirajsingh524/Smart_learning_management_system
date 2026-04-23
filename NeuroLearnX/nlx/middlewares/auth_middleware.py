from functools import wraps

from flask import jsonify, request

from ..utils.token_utils import read_token


def _token_from_request():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return request.cookies.get("token")


def require_auth(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        token = _token_from_request()
        payload = read_token(token)
        if not payload:
            return jsonify({"message": "Unauthorized"}), 401
        request.current_user = payload
        return handler(*args, **kwargs)

    return wrapped


def require_role(*roles):
    def decorator(handler):
        @wraps(handler)
        @require_auth
        def wrapped(*args, **kwargs):
            if request.current_user.get("role") not in roles:
                return jsonify({"message": "Forbidden"}), 403
            return handler(*args, **kwargs)

        return wrapped

    return decorator
