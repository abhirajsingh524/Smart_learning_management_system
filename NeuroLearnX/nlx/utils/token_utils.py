from flask import current_app
from itsdangerous import BadSignature, URLSafeSerializer


def _serializer():
    return URLSafeSerializer(current_app.config["SECRET_KEY"], salt="nlx-auth")


def issue_token(payload):
    return _serializer().dumps(payload)


def read_token(token):
    if not token:
        return None
    try:
        return _serializer().loads(token)
    except BadSignature:
        return None
