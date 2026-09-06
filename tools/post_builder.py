"""Build a Naver SmartEditor post from a JSON spec via the relayed browser.
Usage: python3 post_builder.py spec.json [--publish]
Spec:
{
  "title": "...", "category": "배관설비", "visibility": "private",
  "tags": ["..."],
  "blocks": [
    {"type": "text", "lines": ["...", "", "..."]},
    {"type": "map", "query": "안산 힐스테이트중앙", "pick": "힐스테이트중앙아파트"},
    {"type": "hr"},
    {"type": "images", "files": ["/abs/01.jpg", "/abs/02.jpg"], "caption": "현장"}
  ]
}
Without --publish: fills everything, opens the publish panel, selects options, screenshots, and stops.
"""
import asyncio, json, os, re, sys, time
from naverbot import Bot, SCRATCH

WRITE = "https://blog.naver.com/violentgun/postwrite"

async def shot(pg, name):
    p = os.path.join(SCRATCH, name); await pg.screenshot(path=p, full_page=False); print("shot", name)

async def dismiss(pg):
    for sel in [".se-popup-button-cancel", "button.se-help-panel-close-button"]:
        try:
            loc = pg.locator(sel).first
            if await loc.is_visible(timeout=600): await loc.click(); await pg.wait_for_timeout(400)
        except Exception: pass

async def focus_last_paragraph(pg):
    para = pg.locator(".se-component.se-text .se-text-paragraph").last
    await para.click(); await pg.keyboard.press("End")

async def type_lines(pg, lines):
    for i, line in enumerate(lines):
        if line: await pg.keyboard.type(line, delay=3)
        if i < len(lines) - 1: await pg.keyboard.press("Enter")

async def count(pg, sel):
    return await pg.locator(sel).count()

async def insert_hr(pg):
    await pg.locator("button.se-insert-horizontal-line-toolbar-button, button[data-name='horizontal-line']").first.click()
    await pg.wait_for_timeout(600)

async def insert_map(pg, query, pick):
    await pg.locator("button.se-map-toolbar-button").first.click()
    await pg.wait_for_timeout(2500)
    inp = pg.locator("input[placeholder*='장소명']").first
    await inp.click(); await pg.keyboard.type(query, delay=30)
    items = pg.locator(".se-place-map-search-result-item")
    for attempt in range(5):
        await pg.locator("button.se-place-search-button").first.click()
        try:
            await items.first.wait_for(state="visible", timeout=8000); break
        except Exception:
            print("  map search retry", attempt + 1); await pg.keyboard.press("Enter")
    n = await items.count(); print("  map results:", n)
    if n == 0:
        await pg.locator("button.se-popup-close-button").first.click(); print("  MAP SKIPPED (no results)"); return
    target = items.filter(has_text=pick).first if pick else items.first
    if pick and await target.count() == 0: target = items.first
    await target.hover(); await pg.wait_for_timeout(400)
    await target.locator("button.se-place-add-button").first.click(); await pg.wait_for_timeout(1200)
    await pg.locator("button.se-popup-button-confirm").first.click()
    await pg.wait_for_timeout(2000)

async def insert_images(bot, pg, files, caption):
    before = await count(pg, ".se-component.se-image")
    for f in files: bot.upload_map[os.path.basename(f)] = f
    async with pg.expect_file_chooser(timeout=15000) as fc:
        await pg.locator("button.se-image-toolbar-button").first.click()
    chooser = await fc.value
    await chooser.set_files(files)
    if len(files) > 1:
        await pg.wait_for_timeout(1500)
        try: await pg.locator(".se-popup").locator("text=개별사진").first.click(timeout=8000)
        except Exception as e: print("  layout dialog:", str(e).splitlines()[0])
    # wait until all images present
    deadline = time.time() + 60 + 15 * len(files)
    while time.time() < deadline:
        now = await count(pg, ".se-component.se-image")
        if now >= before + len(files): break
        await pg.wait_for_timeout(1000)
    now = await count(pg, ".se-component.se-image")
    print(f"  images: {before} -> {now} (expected +{len(files)})")
    err = await pg.locator(".se-popup-transfer-error").count()
    if err:
        txt = await pg.locator(".se-popup-transfer-error").first.inner_text()
        print("  TRANSFER ERROR:", txt[:200].replace("\n", " / "))
        try: await pg.locator(".se-popup-transfer-error button").filter(has_text="확인").first.click()
        except Exception: pass
    await pg.wait_for_timeout(1500)
    if caption:
        img = pg.locator(".se-component.se-image").nth(before)
        await img.scroll_into_view_if_needed(); await img.click(); await pg.wait_for_timeout(800)
        cap = img.locator(".se-caption").first
        await cap.click(); await pg.keyboard.type(caption, delay=8)
        await pg.wait_for_timeout(300)

async def build(spec, publish):
    async with Bot() as bot:
        pg = await bot.page()
        await pg.goto(WRITE, wait_until="networkidle", timeout=180000)
        await pg.wait_for_timeout(2500); await dismiss(pg)
        await pg.locator(".se-documentTitle .se-text-paragraph").first.click()
        await pg.keyboard.type(spec["title"], delay=5)
        await pg.locator(".se-component.se-text .se-text-paragraph").first.click()
        for i, b in enumerate(spec["blocks"]):
            t = b["type"]; print(f"[{i+1}/{len(spec['blocks'])}] {t}")
            if t == "text":
                await focus_last_paragraph(pg); await type_lines(pg, b["lines"]); await pg.keyboard.press("Enter")
            elif t == "hr":
                await focus_last_paragraph(pg); await insert_hr(pg)
            elif t == "map":
                await focus_last_paragraph(pg); await insert_map(pg, b["query"], b.get("pick"))
            elif t == "images":
                await focus_last_paragraph(pg); await insert_images(bot, pg, b["files"], b.get("caption"))
            await dismiss(pg)
        comps = await pg.evaluate("() => Array.from(document.querySelectorAll('.se-component')).map(c=>c.className.split(' ').filter(x=>/^se-(text|image|map|placesMap|horizontalLine|imageStrip|imageGroup|documentTitle|oglink|quotation)$/.test(x)).join(' ')).filter(Boolean)")
        print("components:", comps)
        body_chars = await pg.evaluate("() => Array.from(document.querySelectorAll('.se-component.se-text')).map(e=>e.innerText).join('').replace(/\\s/g,'').length")
        print("body chars (no spaces):", body_chars)
        await shot(pg, "build_full.png")
        await pg.screenshot(path=os.path.join(SCRATCH, "build_fullpage.png"), full_page=True)
        # publish panel
        await pg.keyboard.press("Escape")
        await pg.locator("button.publish_btn__m9KHH").first.click(); await pg.wait_for_timeout(2500)
        # category: spec["category"] may be "12_설비" (categoryNo_name) or a name
        if spec.get("category"):
            await pg.locator("button.selectbox_button__jb1Dt").first.click(); await pg.wait_for_timeout(800)
            cat = spec["category"]
            opt = pg.locator(f"label[for='{cat}']") if "_" in cat else pg.locator("[class*=option_category] label").filter(has_text=cat)
            n = await opt.count(); print("  category options matched:", n)
            if n: await opt.first.click()
            else:
                dump = await pg.evaluate("() => Array.from(document.querySelectorAll('[class*=option_category] label')).map(l=>l.getAttribute('for')+':'+(l.innerText||'').trim())")
                print("  available categories:", dump); await pg.keyboard.press("Escape")
            await pg.wait_for_timeout(600)
        if spec.get("visibility") == "private":
            await pg.locator("label[for='open_private']").first.click(); await pg.wait_for_timeout(300)
        # tags
        ti = pg.locator("#tag-input")
        await ti.click()
        for tag in spec.get("tags", []):
            await pg.keyboard.type(tag, delay=5); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(500)
        state = await pg.evaluate("""() => ({
            category: (document.querySelector('button.selectbox_button__jb1Dt')||{}).innerText,
            private: !!(document.querySelector('#open_private')||{}).checked,
            tags: Array.from(document.querySelectorAll('[class*=tag_list] *, [class*=tag] span')).map(e=>(e.innerText||'').trim()).filter(x=>x.startsWith('#')).length
        })""")
        print("publish state:", state)
        await shot(pg, "publish_panel.png")
        if not publish:
            print("DRY RUN: stopping before 발행 확인"); return None
        # log publish traffic
        def on_resp(r):
            import re as _re
            if not _re.search(r'\.(js|css|png|gif|woff2?|svg|jpg|cur|json)(\?|$)', r.url) and "nlog" not in r.url:
                print("  PUB RESP", r.status, r.url[:130])
        pg.on("response", on_resp)
        pg.on("requestfailed", lambda r: print("  PUB REQFAIL", r.url[:130], r.failure))
        await pg.locator("button.confirm_btn__WEaBq").first.click()
        await pg.wait_for_timeout(9000)
        await shot(pg, "after_publish.png")
        print("after publish url:", pg.url)
        # verify via authenticated title list
        import json as _json, urllib.parse as _up
        r = await bot.ctx.request.get("https://blog.naver.com/PostTitleListAsync.naver?blogId=violentgun&viewdate=&currentPage=1&categoryNo=0&countPerPage=5", headers={"Referer":"https://blog.naver.com/violentgun"})
        try:
            data = _json.loads(await r.text())
            top = data["postList"][0]
            print("VERIFY newest logNo:", top["logNo"], "openType:", top["openType"], "title:", _up.unquote_plus(top["title"])[:60])
            return top["logNo"]
        except Exception as e:
            print("verify parse fail:", str(e)[:120]); return pg.url

if __name__ == "__main__":
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    publish = "--publish" in sys.argv
    asyncio.run(build(spec, publish))
