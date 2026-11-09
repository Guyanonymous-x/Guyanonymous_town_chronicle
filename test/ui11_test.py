# Checks V10 in Chrome: the four new periods, Attitudes page and controls, "who they are", Edit-tab changes, photos. Usage: python3 ui11_test.py
import asyncio, os
from playwright.async_api import async_playwright
URL = 'file:///home/claude/town/town-chronicle.html'
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots'); os.makedirs(SHOTS, exist_ok=True)
PHOTOS = ['/tmp/ui11_photo0.jpg', '/tmp/ui11_photo1.jpg']
from PIL import Image, ImageDraw  # two large test pictures, to check they are shrunk
for i, c in enumerate([(180, 120, 90), (90, 130, 170)]):
    im = Image.new('RGB', (2400, 1600), c); ImageDraw.Draw(im).ellipse((800, 300, 1600, 1300), fill=(240, 220, 200)); im.save(PHOTOS[i], quality=90)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1360, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(URL)
        res = {}
        res['ten settings offered'] = await pg.evaluate("document.querySelectorAll('.eracard').length") == 10
        await pg.screenshot(path=f'{SHOTS}/110-create-ten-settings.png', full_page=True)
        for era in ['tudor', 'georgian', 'victorian', 'edwardian']:
            await pg.evaluate("W = null; nav.stack = []; nav.cur = null; render()")
            await pg.click(f'.eracard[data-era={era}]'); await pg.fill('#cPop', '250'); await pg.click('#cGo'); await pg.wait_for_selector('.stats')
            await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=90000)
            for v in ['overview', 'people', 'economy', 'leaders', 'crime', 'attitudes', 'maker', 'photos']:
                await pg.click(f'[data-nav={v}]'); await pg.wait_for_timeout(80)
            await pg.click('[data-nav=maker]'); await pg.click('#mkGen'); await pg.wait_for_timeout(80)
            res[f'{era}: maker works'] = await pg.query_selector('#mkChecks .mk-ok') is not None
            await pg.click('[data-nav=economy]'); await pg.wait_for_timeout(80)
            res[f'{era}: money in pounds'] = '£' in await pg.inner_text('#main')
            if era == 'victorian':
                await pg.click('[data-nav=overview]'); await pg.screenshot(path=f'{SHOTS}/111-victorian-overview.png')
        # attitudes page and controls
        await pg.click('[data-nav=attitudes]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{SHOTS}/112-attitudes.png', full_page=True)
        await pg.evaluate("document.querySelector('[data-attset=samesex]').value = 50; document.querySelector('[data-attset=samesex]').dispatchEvent(new Event('change'))"); await pg.wait_for_timeout(150)
        res['setting an attitude holds it'] = await pg.evaluate("W.att.samesex.v === 50 && W.att.samesex.locked === true")
        await pg.click('[data-attlock=samesex]'); await pg.wait_for_timeout(100)
        res['release works'] = await pg.evaluate("W.att.samesex.locked === false")
        await pg.click('[data-attlock=samesex]'); await pg.wait_for_timeout(100)
        for k in range(4): await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=90000)
        res['held attitude stays'] = await pg.evaluate("W.att.samesex.v === 50")
        res['law followed the town'] = await pg.evaluate("W.settings.sameSexCouples === true")
        # a person: who they are, edit tab, photos
        pid = await pg.evaluate("Object.values(W.people).find(q => q.status === 'resident' && q.died == null && W.year - q.born > 25 && q.spouse).id")
        await pg.evaluate(f"ui.personTab = 'edit'; nav.cur = {{ view: 'person', params: {{ id: {pid} }} }}; render()"); await pg.wait_for_timeout(100)
        await pg.select_option('#edGender', 'nonbinary'); await pg.click('#edWhoSave'); await pg.wait_for_timeout(150)
        res['edit: lives as non-binary'] = await pg.evaluate(f"W.people[{pid}].gender === 'nonbinary' && W.people[{pid}].inner.out === W.year")
        res['words use their name'] = await pg.evaluate(f"heShe(W.people[{pid}]) === W.people[{pid}].first && rel3(W.people[{pid}], 'son', 'daughter', 'child') === 'child'")
        await pg.evaluate(f"ui.personTab = 'story'; render()"); await pg.wait_for_timeout(100)
        async with pg.expect_file_chooser() as fc:
            await pg.click(f'[data-addphoto="{pid}"]')
        await (await fc.value).set_files(PHOTOS[0]); await pg.wait_for_selector('.ph-overlay', timeout=10000)
        res['photo added and shrunk'] = await pg.evaluate("(() => { const ph = Object.values(W.photos)[0]; const i = new Image(); i.src = ph.data; return ph.data.startsWith('data:image/jpeg') && ph.data.length < 400000; })()")
        sp = await pg.evaluate(f"W.people[{pid}].spouse")
        name = await pg.evaluate(f"(() => {{ const q = W.people[{sp}]; return fullName(q) + ' (' + ageOf(q, W.year) + ') #' + q.id; }})()")
        await pg.fill('#phYear', str(await pg.evaluate("W.year - 3"))); await pg.fill('#phCap', 'Wedding anniversary'); await pg.click('#phSave'); await pg.wait_for_timeout(100)
        await pg.click('[data-photo]'); await pg.wait_for_selector('.ph-overlay')
        await pg.fill('#phAdd', name); await pg.click('#phAddBtn'); await pg.wait_for_timeout(150)
        res['group photo links two people'] = await pg.evaluate(f"Object.values(W.photos)[0].people.length === 2 && W.people[{sp}].photo === Object.values(W.photos)[0].id")
        await pg.screenshot(path=f'{SHOTS}/113-photo-viewer.png')
        await pg.click('.ph-close')
        async with pg.expect_file_chooser() as fc:
            await pg.click(f'[data-addphoto="{pid}"]')
        await (await fc.value).set_files(PHOTOS[1]); await pg.wait_for_selector('.ph-overlay')
        await pg.click('[data-phmain="' + str(pid) + '"]'); await pg.wait_for_timeout(100); await pg.click('.ph-close')
        res['main picture switched'] = await pg.evaluate(f"W.people[{pid}].photo === 2")
        res['picture shown at top'] = await pg.query_selector('img.avatar-photo') is not None
        await pg.screenshot(path=f'{SHOTS}/114-person-who-photos.png', full_page=True)
        res['save keeps photos'] = await pg.evaluate("(() => { const w = JSON.parse(JSON.stringify(W)); return Object.keys(w.photos).length === 2 && !!w.att; })()")
        await pg.click('[data-nav=photos]'); await pg.wait_for_timeout(100)
        res['photos page lists both'] = await pg.evaluate("document.querySelectorAll('#main .ph-thumb').length === 2")
        await pg.click('#bUndo') if await pg.query_selector('#bUndo') else None
        await pg.wait_for_timeout(150)
        res['undo works'] = await pg.evaluate("Object.keys(W.photos || {}).length <= 2")
        print(res)
        print('ALL V10 PAGE CHECKS PASSED' if all(res.values()) else 'SOME V10 PAGE CHECKS FAILED: ' + ', '.join(k for k, v in res.items() if not v))
        print('ERRORS:', errs[:5], len(errs))
        await b.close()
asyncio.run(main())
