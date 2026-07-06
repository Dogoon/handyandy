import http.server
import json
import os
import socket
import subprocess
import sys
import urllib.parse
from pathlib import Path

BASE_PORT = 3001


def find_free_port(start: int) -> int:
    port = start
    while port < start + 20:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("localhost", port)) != 0:
                return port
        port += 1
    raise RuntimeError("사용 가능한 포트를 찾을 수 없습니다.")


def cors_headers(handler):
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")


class AgentHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass  # 기본 로그 억제

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        cors_headers(self)
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        cors_headers(self)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if path == "/ping":
            self.send_json({"status": "ok", "version": "0.1.0"})

        elif path == "/open-folder":
            folder = params.get("path", [""])[0]
            if folder and os.path.isdir(folder):
                subprocess.Popen(["open", folder])
                self.send_json({"ok": True})
            else:
                self.send_json({"ok": False, "error": "폴더를 찾을 수 없습니다."}, 404)

        else:
            self.send_json({"error": "Not found"}, 404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/save-prompt":
            try:
                file_path = body.get("path", "")
                data = body.get("data", {})
                if not file_path:
                    self.send_json({"ok": False, "error": "경로가 없습니다."}, 400)
                    return
                Path(file_path).parent.mkdir(parents=True, exist_ok=True)
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                self.send_json({"ok": True, "path": file_path})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/search-prompts":
            try:
                root = body.get("root", "")
                query = body.get("query", "").lower()
                results = []
                if root and os.path.isdir(root):
                    for p in Path(root).rglob("*.json"):
                        try:
                            with open(p, encoding="utf-8") as f:
                                data = json.load(f)
                            text = json.dumps(data, ensure_ascii=False).lower()
                            if query in text or query in p.name.lower():
                                results.append({"file": str(p), "data": data})
                        except Exception:
                            continue
                self.send_json({"ok": True, "results": results})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/scan-assets":
            try:
                root = body.get("root", "")
                assets = {"CHR": [], "PROP": [], "BG": [], "DES": []}
                folder_map = {"characters": "CHR", "props": "PROP", "backgrounds": "BG", "design": "DES"}
                base = Path(root) / "_assets" / "prompts"
                if base.is_dir():
                    for folder, type_key in folder_map.items():
                        folder_path = base / folder
                        if folder_path.is_dir():
                            seen = {}
                            for p in folder_path.rglob("*.json"):
                                try:
                                    with open(p, encoding="utf-8") as f:
                                        data = json.load(f)
                                    name = data.get("filename", p.stem)
                                    ver = f"V{data.get('version', '001')}"
                                    base_name = "_".join(name.split("_")[2:-1]) if "_" in name else name
                                    if base_name not in seen:
                                        seen[base_name] = []
                                    seen[base_name].append(ver)
                                except Exception:
                                    continue
                            for name, vers in seen.items():
                                assets[type_key].append({"name": name, "versions": vers})
                self.send_json({"ok": True, "assets": assets})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/scan-shots":
            try:
                root = body.get("root", "")
                shots = {}
                base = Path(root) / "prompts"
                if base.is_dir():
                    for ep_dir in sorted(base.iterdir()):
                        if not ep_dir.is_dir(): continue
                        ep = ep_dir.name
                        shots[ep] = {}
                        for sc_dir in sorted(ep_dir.iterdir()):
                            if not sc_dir.is_dir(): continue
                            sc = sc_dir.name
                            shots[ep][sc] = []
                            for cut_dir in sorted(sc_dir.iterdir()):
                                if not cut_dir.is_dir(): continue
                                has = any(cut_dir.glob("*.json"))
                                shots[ep][sc].append({"cut": cut_dir.name, "has": has})
                self.send_json({"ok": True, "shots": shots})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        else:
            self.send_json({"error": "Not found"}, 404)


def main():
    port = find_free_port(BASE_PORT)
    server = http.server.HTTPServer(("localhost", port), AgentHandler)
    print(f"HandyAndy 에이전트 실행 중 → http://localhost:{port}")
    print("종료하려면 Ctrl+C 를 누르세요.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n에이전트 종료.")


if __name__ == "__main__":
    main()
