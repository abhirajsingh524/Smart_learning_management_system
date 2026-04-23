from flask import jsonify, request


def register_error_handlers(app):
    @app.errorhandler(404)
    def not_found(_):
        if request.path.startswith("/api/"):
            return jsonify({"message": "Not Found"}), 404
        return "Not Found", 404

    @app.errorhandler(500)
    def internal(_):
        if request.path.startswith("/api/"):
            return jsonify({"message": "Internal Server Error"}), 500
        return "Internal Server Error", 500
