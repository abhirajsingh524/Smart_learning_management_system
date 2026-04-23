from flask import Flask

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
    app.register_blueprint(page_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp)
    register_error_handlers(app)
    return app
