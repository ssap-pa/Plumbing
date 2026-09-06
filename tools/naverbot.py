"""Helper: Playwright Chromium whose every request is relayed through the Node
APIRequestContext (the browser's own TLS stack cannot pass the agent proxy here).
Cookies are read from ./cookies.txt (never committed). Formats accepted:
  - "NAME=value; NAME2=value2" (Cookie header string)
  - JSON list of {name, value, domain?, path?}
"""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

SCRATCH = os.path.dirname(os.path.abspath(__file__))
COOKIE_FILE = os.path.join(SCRATCH, "cookies.txt")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"

def load_cookies():
    raw = open(COOKIE_FILE, encoding="utf-8").read().strip()
    out = []
    if raw.startswith("["):
        for c in json.loads(raw):
            out.append({"name": c["name"], "value": c["value"],
                        "domain": c.get("domain", ".naver.com") or ".naver.com",
                        "path": c.get("path", "/") or "/"})
    else:
        for part in re.split(r";\s*|\n", raw):
            if "=" in part:
                n, v = part.split("=", 1)
                out.append({"name": n.strip(), "value": v.strip(), "domain": ".naver.com", "path": "/"})
    return out

class Bot:
    def __init__(self, headless=True):
        self.headless = headless
    async def __aenter__(self):
        self.p = await async_playwright().start()
        self.b = await self.p.chromium.launch(executable_path="/opt/pw-browsers/chromium", headless=self.headless,
            proxy={"server": "http://127.0.0.1:38591"}, args=["--no-sandbox", "--disable-http2", "--disable-quic"])
        self.ctx = await self.b.new_context(user_agent=UA, locale="ko-KR", viewport={"width": 1400, "height": 900},
                                            accept_downloads=False)
        await self.ctx.add_cookies(load_cookies())
        return self
    upload_map = {}   # filename -> local path, filled before set_files()
    async def _relay(self, route, request):
        try:
            if request.method == "POST" and "upphoto.naver.com" in request.url:
                body = request.post_data_buffer or b""
                m = re.search(rb'name="([^"]+)"; filename="([^"]+)"', body)
                field = m.group(1).decode() if m else "image"
                fname = m.group(2).decode("utf-8", "replace") if m else ""
                path = self.upload_map.get(fname) or self.upload_map.get(os.path.basename(fname))
                if not path:
                    print("UPLOAD: no local file for", fname); await route.abort(); return
                data = open(path, "rb").read()
                mime = "image/png" if path.lower().endswith(".png") else "image/jpeg"
                hdrs = {k: v for k, v in request.headers.items() if k.lower() in ("origin", "referer", "accept", "accept-language")}
                resp = await self.ctx.request.post(request.url, headers=hdrs, timeout=180000,
                        multipart={field: {"name": fname, "mimeType": mime, "buffer": data}})
                print("UPLOAD relayed", fname, len(data), "->", resp.status)
                await route.fulfill(response=resp); return
            resp = await self.ctx.request.fetch(request, max_redirects=0, timeout=90000)
            loc = resp.headers.get("location")
            if 300 <= resp.status < 400 and loc:
                from urllib.parse import urljoin
                target = urljoin(request.url, loc)
                if request.is_navigation_request():
                    html = '<!doctype html><meta charset="utf-8"><script>location.replace(%s)</script>' % json.dumps(target)
                    await route.fulfill(status=200, content_type="text/html; charset=utf-8", body=html)
                    return
                resp = await self.ctx.request.fetch(request, max_redirects=20, timeout=90000)
            await route.fulfill(response=resp)
        except Exception as e:
            msg = str(e).splitlines()[0]
            if "disposed" not in msg:
                print("RELAY FAIL", request.url[:100], msg[:120])
            try: await route.abort()
            except Exception: pass
    async def page(self):
        pg = await self.ctx.new_page()
        await pg.route("**/*", self._relay)
        return pg
    async def __aexit__(self, *a):
        await self.b.close(); await self.p.stop()

async def login_check():
    async with Bot() as bot:
        pg = await bot.page()
        r = await pg.goto("https://m.blog.naver.com/", wait_until="domcontentloaded", timeout=90000)
        print("status", r.status, "url", pg.url, "title", await pg.title())
        html = await pg.content()
        m = re.search(r'"blogId":"([^"]+)"', html) or re.search(r'blogId=([A-Za-z0-9_\-]+)', pg.url)
        print("blogId:", m.group(1) if m else None)
        nick = re.search(r'"nickName":"([^"]*)"', html)
        print("nickName:", nick.group(1) if nick else None)
        await pg.screenshot(path=os.path.join(SCRATCH, "login_check.png"), full_page=False)

if __name__ == "__main__":
    asyncio.run(login_check())
