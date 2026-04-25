from flask import Flask, jsonify

from .config.settings import build_settings
from .middlewares.error_handler import register_error_handlers
from .routes.api_routes import api_bp
from .routes.auth_routes import auth_bp
from .routes.page_routes import page_bp


def create_app():
    app = Flask(
        __name__,
        template_folder="../templates",
        static_folder="../static",
        static_url_path="/static",
    )
    app.config.from_mapping(build_settings())

    # ── Blueprints ────────────────────────────────────────────────────────
    app.register_blueprint(page_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp)
    register_error_handlers(app)

    # ── DB health endpoint (debug) ────────────────────────────────────────
    @app.get("/api/health")
    def _health():
        from .db import get_db
        db = get_db()
        connected = db is not None
        return jsonify({
            "ok": True,
            "flask": True,
            "mongo": connected,
            "mongoStatus": "connected" if connected else "unreachable",
        })

    # ── Seed on first request (inside app context) ────────────────────────
    _seeded = {"done": False}

    @app.before_request
    def _seed_once():
        if _seeded["done"]:
            return
        _seeded["done"] = True
        try:
            from .db import seed_defaults
            seed_defaults()
        except Exception as exc:
            print(f"[Flask init] Seed error (non-fatal): {exc}")
            _seeded["done"] = False  # allow retry on next request

    return app
