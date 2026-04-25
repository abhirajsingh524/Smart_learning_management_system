from nlx import create_app
import os

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5001))
    print(f"[Flask] Starting on http://localhost:{port}")
    print("[Flask] Node.js should run on port 5000 (npm run dev)")
    print("[Flask] Flask runs on port 5001 (python app.py)")
    app.run(debug=True, port=port, host="0.0.0.0")