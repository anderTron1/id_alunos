import subprocess, sys
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/run", methods=["POST"])
def run_code():
    code = request.json.get("code", "")
    try:
        result = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True, text=True, timeout=10
        )
        return jsonify({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({"stdout": "", "stderr": "Tempo limite excedido (10s).", "returncode": 1})
    except Exception as e:
        return jsonify({"stdout": "", "stderr": str(e), "returncode": 1})

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=8850,
            ssl_context=('192.168.31.156+2.pem', '192.168.31.156+2-key.pem'))
