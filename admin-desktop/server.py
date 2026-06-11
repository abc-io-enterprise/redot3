#!/usr/bin/env python3
"""
ABC-IO Desktop Administration Backend
Owner: Christopher Porreca / redot1
Contact: cporreca@abc-io.com | 585-629-9120

Serves the offline admin dashboard and proxies commands to local/remote
infrastructure. Runs on localhost and does not require internet.
"""

import os
import sys
import json
import subprocess
import urllib.request
import urllib.error
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = int(os.getenv("ADMIN_PORT", "8765"))
ROOT = Path(__file__).resolve().parent

def run_shell(cmd, cwd=None, timeout=60):
    try:
        result = subprocess.run(
            cmd, shell=True, cwd=cwd, capture_output=True, text=True,
            timeout=timeout, encoding="utf-8", errors="ignore"
        )
        return {
            "ok": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "command timed out"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _json(self, data, code=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path, content_type="text/html"):
        if not path.exists():
            self.send_response(404)
            self.end_headers()
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/" or parsed.path == "/index.html":
            self._file(ROOT / "index.html")
        elif parsed.path == "/brand.css":
            self._file(ROOT / "brand.css", "text/css")
        elif parsed.path == "/api/health":
            self._json({"ok": True, "mode": "desktop-admin", "owner": "Christopher Porreca"})
        elif parsed.path == "/api/status":
            self._json(self.get_status())
        elif parsed.path == "/api/orchestrator/status":
            self._json(self.orchestrator_status())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8", errors="ignore")
        try:
            payload = json.loads(body) if body else {}
        except Exception:
            payload = {}

        if parsed.path == "/api/deploy/redot1":
            self._json(self.deploy_redot1(payload))
        elif parsed.path == "/api/backup":
            self._json(self.create_backup())
        elif parsed.path == "/api/archive":
            self._json(self.create_archive())
        elif parsed.path == "/api/heal/redot1":
            self._json(self.heal_redot1())
        elif parsed.path == "/api/self-heal":
            self._json(self.self_heal())
        elif parsed.path == "/api/orchestrator/start":
            self._json(self.start_orchestrator())
        elif parsed.path == "/api/orchestrator/stop":
            self._json(self.stop_orchestrator())
        else:
            self.send_response(404)
            self.end_headers()

    def get_status(self):
        project = Path.home() / "Documents" / "redot2"
        result = {
            "project_exists": project.exists(),
            "archive_exists": (Path.home() / "Documents" / "redot2.archive.zip").exists(),
            "git_branch": self._git_branch(project),
            "orchestrator_state": self.orchestrator_status(),
            "public_health": self._public_health()
        }
        return result

    def _git_branch(self, cwd):
        r = run_shell("git branch --show-current", cwd=str(cwd))
        return r["stdout"].strip() if r["ok"] else "unknown"

    def _public_health(self):
        urls = [
            "https://abc-io.com/health",
            "https://abc-io.com/api/v1/system/health"
        ]
        out = {}
        for url in urls:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "ABC-IO-Desktop"})
                resp = urllib.request.urlopen(req, timeout=8)
                out[url] = {"ok": True, "status": resp.status}
            except urllib.error.HTTPError as e:
                out[url] = {"ok": False, "status": e.code}
            except Exception as e:
                out[url] = {"ok": False, "error": str(e)}
        return out

    def orchestrator_status(self):
        state_file = Path.home() / "Documents" / "redot2-autonomous" / "orchestrator.state"
        if state_file.exists():
            try:
                return json.loads(state_file.read_text(encoding="utf-8"))
            except Exception as e:
                return {"ok": False, "error": str(e)}
        return {"ok": False, "error": "no state file"}

    def deploy_redot1(self, payload):
        project = Path.home() / "Documents" / "redot2"
        script = project / "scripts" / "deploy-staged-redot1.py"
        if not script.exists():
            return {"ok": False, "error": "deploy script not found"}
        tag = payload.get("tag", "v2.0.0")
        result = run_shell(f'python "{script}" --tag {tag}', cwd=str(project), timeout=300)
        return result

    def create_backup(self):
        project = Path.home() / "Documents" / "redot2"
        archive = Path.home() / f"Documents/redot2-backup-{self._timestamp()}.zip"
        result = run_shell(f'powershell -Command "Compress-Archive -Path {project} -DestinationPath {archive} -Force"', timeout=300)
        return {**result, "archive": str(archive)}

    def create_archive(self):
        project = Path.home() / "Documents" / "redot2"
        archive = Path.home() / "Documents" / "redot2.archive.zip"
        result = run_shell(f'powershell -Command "Compress-Archive -Path {project} -DestinationPath {archive} -Force"', timeout=300)
        return {**result, "archive": str(archive)}

    def heal_redot1(self):
        project = Path.home() / "Documents" / "redot2"
        script = project / "scripts" / "auto-heal.sh"
        if not script.exists():
            return {"ok": False, "error": "auto-heal script not found"}
        return run_shell(f'bash "{script}"', cwd=str(project), timeout=300)

    def self_heal(self):
        return self.heal_redot1()

    def start_orchestrator(self):
        project = Path.home() / "Documents" / "redot2"
        script = project / "scripts" / "autonomous-orchestrator.py"
        return run_shell(f'start /B python "{script}" --daemon', cwd=str(project))

    def stop_orchestrator(self):
        return run_shell('taskkill /F /IM python.exe /FI "WINDOWTITLE eq *autonomous*" 2>nul || true')

    def _timestamp(self):
        from datetime import datetime
        return datetime.now().strftime("%Y%m%d-%H%M%S")


def main():
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"ABC-IO Desktop Admin running at http://127.0.0.1:{PORT}")
    print("Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down")


if __name__ == "__main__":
    main()
