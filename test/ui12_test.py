# Checks V11 in Chrome: an empty village of my characters, drop-downs and tick boxes, Move in now, the Roles page, the Journal. Usage: python3 ui12_test.py
import asyncio, os
from playwright.async_api import async_playwright
URL = 'file:///home/claude/town/town-chronicle.html'
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots'); os.makedirs(SHOTS, exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1360, 'height': 900}, accept_downloads=True)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(URL)
        res = {}
        # an empty village of only my characters
        await pg.click('.eracard[data-era=medieval]'); await pg.select_option('#cMine', '1'); await pg.click('#cGo')
        await pg.wait_for_selector('#mkGen', timeout=30000)
        res['empty village opens on Make a person'] = await pg.evaluate("Object.keys(W.people).length === 0 && nav.cur.view === 'maker'")
        names = []
        for i in range(6):
            # drop-downs: pick a first name from the list; for one person type their own
            await pg.select_option('[data-mpath="f.gender"]', 'Woman' if i % 2 else 'Man')
            opts = await pg.evaluate("[...document.querySelector('[data-msel=\"f.firstName\"]').options].map(o => o.value).filter(v => v && v !== '__other')")
            if i == 0:
                await pg.select_option('[data-msel="f.firstName"]', '__other'); await pg.fill('input[data-mpath="f.firstName"]', 'Wulfric'); await pg.press('input[data-mpath="f.firstName"]', 'Tab')
            else:
                await pg.select_option('[data-msel="f.firstName"]', opts[i * 3 % len(opts)])
            await pg.select_option('[data-msel="f.birthYear"]', str(await pg.evaluate("W.year") - 20 - i * 4))
            ticks = await pg.query_selector_all('[data-mchk="f.traits"]')
            await ticks[i].check(); await ticks[i + 7].check()
            await pg.select_option('[data-mtc="faith"]', index=1); await pg.select_option('[data-mtc="traitE"]', '90' if i == 1 else '30')
            if i == 2: await pg.check('[data-mtcchk="conditions"][value="blindness"]')
            if i == 0: await pg.screenshot(path=f'{SHOTS}/120-maker-dropdowns.png', full_page=True)
            await pg.click('#mkGen'); await pg.wait_for_timeout(100)
            for sel in await pg.query_selector_all('[data-msex]'): await sel.select_option('f')
            names.append(await pg.evaluate("ui.maker.P.f.firstName.v"))
            await pg.click('#mkNow'); await pg.wait_for_timeout(150)
        res['typed name kept'] = names[0] == 'Wulfric'
        res['six moved in now'] = await pg.evaluate("Object.values(W.people).filter(p => p.made).length") == 6
        res['chosen details applied'] = await pg.evaluate("(() => { const ps = Object.values(W.people).filter(p => p.made); const b = ps.find(p => p.conditions.includes('blindness')); return ps.every(p => p.faith === Object.keys(eraOf(W).faiths)[0]) && !!b && ps.filter(p => p.traits.E === 90).length >= 1; })()")
        # roles
        await pg.click('[data-nav=roles]'); await pg.wait_for_timeout(100)
        blind = await pg.evaluate("(() => { const p = Object.values(W.people).find(p => p.conditions.includes('blindness')); return fullName(p) + ' (' + ageOf(p, W.year) + ') #' + p.id; })()")
        bid = await pg.evaluate("Object.values(W.people).find(p => p.conditions.includes('blindness')).id")
        await pg.fill('#roleWho', blind); await pg.select_option('#roleWhat', await pg.evaluate("allRoles(W).find(o => o.skill === 'craft').id")); await pg.wait_for_timeout(100)
        res['warning shown'] = 'rules this work out' in await pg.inner_text('#roleWarn')
        await pg.click('#roleGo'); await pg.wait_for_timeout(150)
        res['role given anyway'] = await pg.evaluate(f"allRoles(W).find(o => o.id === W.people[{bid}].occId).skill === 'craft'")
        lord = await pg.evaluate("allRoles(W).find(o => officeFor(W, o)).id")
        other = await pg.evaluate(f"(() => {{ const p = Object.values(W.people).find(p => p.id !== {bid} && p.sex === 'm' && p.status === 'resident'); return fullName(p) + ' (' + ageOf(p, W.year) + ') #' + p.id; }})()")
        await pg.fill('#roleWho', other); await pg.select_option('#roleWhat', lord); await pg.click('#roleGo'); await pg.wait_for_timeout(150)
        res['office given'] = await pg.evaluate(f"W.people[{other.split('#')[1]}].occId === '{lord}'")
        await pg.screenshot(path=f'{SHOTS}/121-roles.png', full_page=True)
        await pg.click(f'[data-unrole="{bid}"]'); await pg.wait_for_timeout(150)
        res['role removed'] = await pg.evaluate(f"!W.people[{bid}].occId")
        # journal: my list, a named writer, then a year
        await pg.click('[data-nav=journal]'); await pg.wait_for_timeout(100)
        w1 = await pg.evaluate("(() => { const p = Object.values(W.people).find(p => p.made); return fullName(p) + ' (' + ageOf(p, W.year) + ') #' + p.id; })()")
        await pg.fill('#jAdd', w1); await pg.click('#jAddBtn'); await pg.wait_for_timeout(100)
        await pg.select_option('#jMode', 'listTurn'); await pg.wait_for_timeout(100)
        june = await pg.evaluate(f"(() => {{ const p = Object.values(W.people).find(p => p.status === 'resident' && p.id !== {w1.split('#')[1]} && ageOf(p, W.year) >= 14); return fullName(p) + ' (' + ageOf(p, W.year) + ') #' + p.id; }})()")
        await pg.select_option('#jMonth', '3'); await pg.fill('#jNamedWho', june); await pg.click('#jNameBtn'); await pg.wait_for_timeout(100)
        await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=90000); await pg.wait_for_timeout(200)
        await pg.click('[data-nav=journal]'); await pg.wait_for_timeout(150)
        res['twelve entries'] = await pg.evaluate("W.journal.entries.length") == 12
        res['named writer wrote June'] = await pg.evaluate(f"W.journal.entries.find(e => e.m === 3).w === {june.split('#')[1]}")
        res['family arrivals in one month'] = await pg.evaluate("Object.values(W.people).filter(p => p.made).every(p => { const fam = Object.values(W.people).filter(q => q.events.some(e => e.t === 'arrived' && e.text.includes('@' + p.id + '.'))); const m = p.events.find(e => e.t === 'arrived').m; return fam.every(q => q.events.find(e => e.t === 'arrived').m === m); })")
        res['list writer wrote the rest'] = await pg.evaluate(f"W.journal.entries.filter(e => e.m !== 3).every(e => e.w === {w1.split('#')[1]})")
        res['entries shown'] = await pg.evaluate("document.querySelectorAll('.jentry').length") == 12
        await pg.screenshot(path=f'{SHOTS}/122-journal.png', full_page=True)
        async with pg.expect_download() as dl:
            await pg.click('#jTxt')
        res['saved as text'] = (await dl.value).suggested_filename.endswith('journal.txt')
        async with pg.expect_download() as dl:
            await pg.click('#jDoc')
        res['saved for Word'] = (await dl.value).suggested_filename.endswith('journal.doc')
        await pg.evaluate(f"ui.personTab = 'story'; nav.cur = {{ view: 'person', params: {{ id: {w1.split('#')[1]} }} }}; render()"); await pg.wait_for_timeout(150)
        res['entries on writer page'] = 'journal entries' in await pg.inner_text('#main')
        res['saves keep the journal'] = await pg.evaluate("JSON.parse(JSON.stringify(W)).journal.entries.length === 12")
        print(res)
        print('ALL V11 PAGE CHECKS PASSED' if all(res.values()) else 'SOME V11 PAGE CHECKS FAILED: ' + ', '.join(k for k, v in res.items() if not v))
        print('ERRORS:', errs[:5], len(errs))
        await b.close()
asyncio.run(main())
