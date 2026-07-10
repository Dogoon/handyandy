import http.server
import json
import os
import platform
import socket
import socketserver
import subprocess
import traceback
import urllib.parse
import http.client
import urllib.request
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
        body = json.dumps(data, ensure_ascii=True).encode("utf-8")
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
            if folder:
                Path(folder).mkdir(parents=True, exist_ok=True)
                if platform.system() == "Windows":
                    subprocess.Popen(["explorer", folder.replace('/', '\\')])
                else:
                    subprocess.Popen(["open", folder])
                self.send_json({"ok": True})
            else:
                self.send_json({"ok": False, "error": "경로가 없습니다."}, 400)

        elif path == "/open-file":
            file_path = params.get("path", [""])[0]
            if file_path and Path(file_path).is_file():
                if platform.system() == "Windows":
                    os.startfile(file_path.replace('/', '\\'))
                else:
                    subprocess.Popen(["open", file_path])
                self.send_json({"ok": True})
            else:
                self.send_json({"ok": False, "error": "파일을 찾을 수 없습니다."}, 404)

        else:
            self.send_json({"error": "Not found"}, 404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/create-project":
            try:
                parent_path = body.get("parent_path", "")
                code = body.get("code", "")
                if not parent_path or not code:
                    self.send_json({"ok": False, "error": "경로 또는 코드가 없습니다."}, 400)
                    return
                proj_path = str(Path(parent_path) / code)
                folders = [
                    "prompts",
                    "images",
                    "_assets/prompts/characters",
                    "_assets/prompts/props",
                    "_assets/prompts/backgrounds",
                    "_assets/prompts/design",
                    "_assets/images",
                ]
                for folder in folders:
                    Path(proj_path, folder).mkdir(parents=True, exist_ok=True)
                print(f"[create-project] 완료 → {proj_path}", flush=True)
                self.send_json({"ok": True, "path": proj_path})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/get-image":
            try:
                import base64
                file_path = body.get("path", "")
                if not file_path or not Path(file_path).exists():
                    self.send_json({"ok": False, "error": "이미지 없음"})
                    return
                with open(file_path, "rb") as f:
                    data = base64.b64encode(f.read()).decode("ascii")
                ext = Path(file_path).suffix.lstrip(".").lower()
                mime = "image/png" if ext == "png" else "image/jpeg"
                self.send_json({"ok": True, "data": f"data:{mime};base64,{data}"})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/pick-folder":
            try:
                if platform.system() == "Darwin":
                    result = subprocess.run(
                        ['osascript', '-e', 'POSIX path of (choose folder)'],
                        capture_output=True, text=True
                    )
                    if result.returncode != 0:
                        self.send_json({"ok": False, "error": "취소됨"})
                        return
                    folder = result.stdout.strip().rstrip('/')
                else:
                    import tkinter as tk
                    from tkinter import filedialog
                    root_tk = tk.Tk(); root_tk.withdraw(); root_tk.attributes('-topmost', True)
                    folder = filedialog.askdirectory(parent=root_tk)
                    root_tk.destroy()
                    if not folder:
                        self.send_json({"ok": False, "error": "취소됨"})
                        return
                name = folder.replace('\\', '/').split('/')[-1]
                self.send_json({"ok": True, "path": folder.replace('\\', '/'), "name": name})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/pick-file":
            try:
                initial_dir = body.get("initial_dir", "~")
                if platform.system() == "Darwin":
                    script = f'POSIX path of (choose file default location POSIX file "{initial_dir}")'
                    result = subprocess.run(
                        ['osascript', '-e', script],
                        capture_output=True, text=True
                    )
                    if result.returncode != 0:
                        self.send_json({"ok": False, "error": "취소됨"})
                        return
                    file_path = result.stdout.strip()
                else:
                    import tkinter as tk
                    from tkinter import filedialog
                    root_tk = tk.Tk(); root_tk.withdraw(); root_tk.attributes('-topmost', True)
                    file_path = filedialog.askopenfilename(
                        initialdir=initial_dir,
                        filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
                        parent=root_tk
                    )
                    root_tk.destroy()
                    if not file_path:
                        self.send_json({"ok": False, "error": "취소됨"})
                        return
                file_path = file_path.replace('\\', '/')
                with open(file_path, encoding="utf-8") as f:
                    data = json.load(f)
                name = file_path.split('/')[-1]
                self.send_json({"ok": True, "path": file_path, "name": name, "data": data})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/save-preset":
            try:
                proj_path = body.get("proj_path", "")
                filename = body.get("filename", "")
                data = body.get("data", {})
                if not proj_path or not filename:
                    self.send_json({"ok": False, "error": "경로 또는 파일명이 없습니다."}, 400)
                    return
                presets_dir = Path(proj_path) / "presets"
                presets_dir.mkdir(parents=True, exist_ok=True)
                file_path = presets_dir / filename
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(f"[save-preset] 완료 → {file_path}", flush=True)
                self.send_json({"ok": True, "path": str(file_path)})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/list-presets":
            try:
                proj_path = body.get("proj_path", "")
                presets_dir = Path(proj_path) / "presets"
                presets = []
                if presets_dir.is_dir():
                    for p in sorted(presets_dir.glob("TPL_*.json")):
                        try:
                            with open(p, encoding="utf-8") as f:
                                data = json.load(f)
                            presets.append({"filename": p.name, "root": str(p), "data": data})
                        except Exception:
                            continue
                self.send_json({"ok": True, "presets": presets})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/check-file":
            try:
                file_path = body.get("path", "")
                exists = Path(file_path).exists() if file_path else False
                self.send_json({"ok": True, "exists": exists})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/next-version":
            try:
                # base: BECK_DES_YS_SwordMan_base_TypeA_V001
                # finds BECK_DES_YS_SwordMan_base_TypeA_V001.####.json → returns next ####
                folder = body.get("folder", "")
                base = body.get("base", "")  # filename without ext, e.g. BECK_DES_..._V001
                if not folder or not base:
                    self.send_json({"ok": False, "error": "folder/base 필요"}, 400)
                    return
                import re as _re
                pattern = _re.compile(r'^' + _re.escape(base) + r'\.(\d{4})\.json$')
                max_sub = 0
                for f in Path(folder).iterdir():
                    m = pattern.match(f.name)
                    if m:
                        max_sub = max(max_sub, int(m.group(1)))
                next_sub = max_sub + 1
                next_name = f"{base}.{next_sub:04d}.json"
                self.send_json({"ok": True, "next_name": next_name, "sub": next_sub})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/save-prompt":
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
                        if "presets" in p.parts:
                            continue
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

        elif path == "/save-settings":
            try:
                settings = body.get("settings", {})
                is_private = body.get("private", False)
                filename = "handyandy_private.json" if is_private else "handyandy_settings.json"
                settings_dir = Path(__file__).parent / "settings"
                settings_dir.mkdir(exist_ok=True)
                file_path = settings_dir / filename
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(settings, f, ensure_ascii=False, indent=2)
                self.send_json({"ok": True})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/load-settings":
            try:
                settings_dir = Path(__file__).parent / "settings"
                result = {}
                for filename in ["handyandy_settings.json", "handyandy_private.json"]:
                    file_path = settings_dir / filename
                    if file_path.exists():
                        with open(file_path, encoding="utf-8") as f:
                            result[filename.replace(".json", "").replace("handyandy_", "")] = json.load(f)
                self.send_json({"ok": True, "data": result})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/fetch-models":
            try:
                raw_key = body.get("api_key", "")
                api_key = raw_key.strip().encode("ascii", "ignore").decode("ascii")
                if not api_key:
                    self.send_json({"ok": False, "error": "API 키가 없습니다."}, 400)
                    return
                conn = http.client.HTTPSConnection("api.openai.com", timeout=15)
                conn.request("GET", "/v1/models", headers={"Authorization": f"Bearer {api_key}"})
                resp = conn.getresponse()
                result = json.loads(resp.read().decode("utf-8"))
                conn.close()
                if "error" in result:
                    self.send_json({"ok": False, "error": result["error"].get("message", str(result["error"]))}, 500)
                    return
                exclude = ("instruct", "realtime", "audio", "search", "vision", "preview", "turbo")
                import re
                all_models = result.get("data", [])
                models = sorted([
                    m["id"] for m in all_models
                    if m["id"].startswith("gpt-")
                    and not any(x in m["id"] for x in exclude)
                    and not re.search(r"-\d{4}-\d{2}-\d{2}$", m["id"])
                    and not re.search(r"-\d{8}$", m["id"])
                ])
                image_models_set = set(["dall-e-2", "dall-e-3"])
                for m in all_models:
                    if m["id"].startswith("dall-e") or m["id"].startswith("gpt-image"):
                        image_models_set.add(m["id"])
                image_models = sorted(image_models_set)
                self.send_json({"ok": True, "models": models, "image_models": image_models})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/generate-prompt":
            try:
                raw_key = body.get("api_key", "")
                api_key = raw_key.strip().encode("ascii", "ignore").decode("ascii")
                zones = body.get("zones", {})
                work_type = body.get("work_type", "SHOT")
                model = body.get("model", "gpt-4o-mini")
                if not api_key:
                    self.send_json({"ok": False, "error": "API 키가 없습니다."}, 400)
                    return

                zone_text = "\n".join([f"- {k}: {v}" for k, v in zones.items() if v])
                if work_type == "VDO":
                    system = "You are a professional video prompt writer. Write concise, vivid prompts for AI video generation."
                    user_msg = f"Write a video generation prompt based on these elements:\n{zone_text}\n\nRespond with:\n1. English prompt (1-2 sentences)\n2. Korean translation"
                else:
                    system = "You are a professional image prompt writer. Write concise, vivid prompts for AI image generation."
                    user_msg = f"Write an image generation prompt based on these elements:\n{zone_text}\n\nRespond with:\n1. English prompt (1-2 sentences)\n2. Korean translation"

                req_data = json.dumps({
                    "model": model,
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_msg}],
                    "max_tokens": 300
                }, ensure_ascii=False).encode("utf-8")

                print(f"[generate-prompt] 시작 → model={model} work_type={work_type}", flush=True)
                conn = http.client.HTTPSConnection("api.openai.com", timeout=30)
                conn.request("POST", "/v1/chat/completions", body=req_data, headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                })
                resp = conn.getresponse()
                result = json.loads(resp.read().decode("utf-8"))
                conn.close()

                if "error" in result:
                    err_msg = result["error"].get("message", str(result["error"]))
                    print(f"[generate-prompt] 실패 → {err_msg}", flush=True)
                    self.send_json({"ok": False, "error": f"OpenAI: {err_msg}"}, 500)
                    return
                content = result["choices"][0]["message"]["content"]
                lines = [l.strip() for l in content.strip().split("\n") if l.strip()]
                prompt_en = ""
                prompt_ko = ""
                for i, line in enumerate(lines):
                    if line.startswith("1.") or (i == 0 and not line.startswith("2.")):
                        prompt_en = line.lstrip("1.").strip()
                    elif line.startswith("2."):
                        prompt_ko = line.lstrip("2.").strip()

                print(f"[generate-prompt] 완료", flush=True)
                self.send_json({"ok": True, "prompt_en": prompt_en, "prompt_ko": prompt_ko})
            except Exception as e:
                print(f"[generate-prompt] 에러 → {e}", flush=True)
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/generate-image":
            try:
                api_key = body.get("api_key", "").strip()
                api_key = api_key.encode("ascii", "ignore").decode("ascii")
                prompt = body.get("prompt", "")
                save_path = body.get("save_path", "")
                img_model = body.get("model", "dall-e-3")
                if not api_key or not prompt:
                    self.send_json({"ok": False, "error": "API 키 또는 프롬프트가 없습니다."}, 400)
                    return

                print(f"[generate-image] 시작 → model={img_model}", flush=True)
                if img_model == "dall-e-3":
                    size = "1792x1024"
                elif img_model.startswith("gpt-image"):
                    size = "1536x1024"
                else:
                    size = "1024x1024"
                req_data = json.dumps({
                    "model": img_model,
                    "prompt": prompt,
                    "n": 1,
                    "size": size,
                }).encode("utf-8")
                conn = http.client.HTTPSConnection("api.openai.com", timeout=120)
                conn.request("POST", "/v1/images/generations", body=req_data, headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                })
                resp = conn.getresponse()
                result = json.loads(resp.read().decode("utf-8"))
                conn.close()

                if "error" in result:
                    err_msg = result["error"].get("message", str(result["error"]))
                    print(f"[generate-image] 실패 → {err_msg}", flush=True)
                    self.send_json({"ok": False, "error": f"OpenAI: {err_msg}"}, 500)
                    return

                item = result["data"][0]
                image_url = item.get("url")
                b64_data = item.get("b64_json")

                if save_path:
                    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
                    if b64_data:
                        import base64
                        with open(save_path, "wb") as f:
                            f.write(base64.b64decode(b64_data))
                    else:
                        urllib.request.urlretrieve(image_url, save_path)
                    print(f"[generate-image] 완료 → 저장됨: {save_path}", flush=True)
                    self.send_json({"ok": True, "saved": save_path})
                else:
                    print(f"[generate-image] 완료 → URL 반환", flush=True)
                    self.send_json({"ok": True, "url": image_url})
            except Exception as e:
                print(f"[generate-image] 에러 → {e}", flush=True)
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


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


def main():
    port = find_free_port(BASE_PORT)
    server = ThreadedHTTPServer(("localhost", port), AgentHandler)
    print(f"HandyAndy 에이전트 실행 중 → http://localhost:{port}")
    print("종료하려면 Ctrl+C 를 누르세요.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n에이전트 종료.")


if __name__ == "__main__":
    main()
