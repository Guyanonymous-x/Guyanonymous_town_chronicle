import asyncio
from playwright.async_api import async_playwright
URL = 'file:///home/claude/town/town-chronicle.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1360, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto(URL)
        for era in ['medieval', 'dropped', 'modern', 'frontier', 'fantasy', 'scifi']:
            await pg.click(f'[data-era={era}]'); await pg.fill('#cPop', '500'); await pg.fill('#cSeed', '11')
            await pg.click('#cGo'); await pg.wait_for_selector('.stats', timeout=30000)
            await pg.evaluate("(async () => { for (let i = 0; i < 20; i++) advanceYear(W); render(); })()")
            r = await pg.evaluate('''() => { let bad = 0, n = 0; const ids = Object.keys(W.people).map(Number).filter((x, i) => i % 25 === 0); for (const id of ids) for (const t of ['tree', 'map']) { ui.personTab = t; nav.cur = {view:'person', params:{id}}; try { render(); n++; if (document.querySelector('.err') || !document.querySelector('.viz svg')) bad++; } catch(e) { bad++; console.error(id, t, e.message); } } for (const v of ['trees', 'grudges']) { nav.cur = {view:v, params:{}}; render(); if (document.querySelector('.err')) bad++; } for (const g of Object.keys(W.groups)) { nav.cur = {view:'group', params:{id:+g}}; render(); if (document.querySelector('.err')) bad++; } return [n, bad]; }''')
            print(era, 'tree/map pages', r)
            if era in ('medieval', 'dropped'):
                pid = await pg.evaluate("Object.values(W.people).filter(p => p.status === 'resident' && W.year - p.born > 40 && p.children.length >= 3)[0].id")
                await pg.evaluate(f"ui.personTab='tree'; nav.cur={{view:'person',params:{{id:{pid}}}}}; render()"); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f'shots/60-tree-{era}.png')
                await pg.evaluate("ui.personTab='map'; render()"); await pg.wait_for_timeout(300); await pg.screenshot(path=f'shots/61-map-{era}.png')
                # click a node in the map: recentres
                before = await pg.evaluate("nav.cur.params.id")
                if await pg.query_selector('.viz g[data-mapp]'):
                    await pg.click('.viz g[data-mapp]'); await pg.wait_for_timeout(300)
                print(era, 'map click moved from', before, 'to', await pg.evaluate("nav.cur.params.id"), 'tab', await pg.evaluate("ui.personTab"))
                await pg.evaluate("nav.cur={view:'trees',params:{}}; render()"); await pg.wait_for_timeout(300); await pg.screenshot(path=f'shots/62-trees-{era}.png', full_page=True)
                await pg.evaluate("nav.cur={view:'grudges',params:{}}; render()"); await pg.wait_for_timeout(300); await pg.screenshot(path=f'shots/63-grudges-{era}.png', full_page=True)
                # drag pan does not navigate
                await pg.evaluate(f"ui.personTab='tree'; nav.cur={{view:'person',params:{{id:{pid}}}}}; render()")
                box = await pg.query_selector('.viz'); bb = await box.bounding_box()
                await pg.mouse.move(bb['x'] + 300, bb['y'] + 300); await pg.mouse.down(); await pg.mouse.move(bb['x'] + 420, bb['y'] + 360, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(200)
                print(era, 'after drag still on', await pg.evaluate("nav.cur.params.id") == pid)
            await pg.evaluate('dirty=false'); await pg.click('#bNew')
        print('ERRORS:', errs[:8], len(errs))
        await b.close()
asyncio.run(main())
