"""
Demo application — a minimal Flask web server used to test
CloudCanary's deployment, health-check, and rollback flow.
"""

from flask import Flask, jsonify
import os

app = Flask(__name__)

VERSION = os.environ.get("APP_VERSION", "1.0.0")


@app.route("/")
def index():
    return jsonify({
        "app": "demo-app",
        "version": VERSION,
        "message": "Hello from CloudCanary demo app!",
    })


@app.route("/health")
def health():
    return jsonify({"status": "healthy", "version": VERSION})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
