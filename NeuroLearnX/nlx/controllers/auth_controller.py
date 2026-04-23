from flask import jsonify, request

from ..middlewares.auth_middleware import require_auth
from ..services.auth_service import login_user, register_user
from ..utils.token_utils import read_token


def _response_with_cookie(payload, status):
    response = jsonify(payload)
    response.set_cookie("token", payload["token"], httponly=True, samesite="Lax")
    return response, status


def register_student():
    payload, error, status = register_user(request.get_json() or {}, force_role="student")
    if error:
        return jsonify({"message": error}), status
    return _response_with_cookie(payload, status)


def register():
    payload, error, status = register_user(request.get_json() or {})
    if error:
        return jsonify({"message": error}), status
    return _response_with_cookie(payload, status)


def login():
    payload, error, status = login_user(request.get_json() or {})
    if error:
        return jsonify({"message": error}), status
    return _response_with_cookie(payload, status)


def logout():
    response = jsonify({"message": "Logged out"})
    response.delete_cookie("token")
    return response


@require_auth
def me():
    token = request.cookies.get("token")
    if not token:
        auth = request.headers.get("Authorization", "")
        token = auth.split(" ", 1)[1] if auth.startswith("Bearer ") else None
    payload = read_token(token)
    return jsonify({"user": payload})
