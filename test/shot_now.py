import asyncio, sys
from playwright.async_api import async_playwright
URL = 'file:///home/claude/town/town-chronicle.html'
tag = sys.argv[1] if len(sys.argv) > 1 else 'now'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1360, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL)
        await pg.click('[data-era=medieval]'); await pg.fill('#cPop', '600'); await pg.fill('#cSeed', '11')
        await pg.click('#cGo'); await pg.wait_for_selector('.stats', timeout=30000)
        pid = await pg.evaluate("Object.values(W.people).filter(p => p.status === 'resident' && W.year - p.born > 40 && p.children.length >= 3)[0].id")
        await pg.evaluate(f"ui.personTab='map'; nav.cur={{view:'person',params:{{id:{pid}}}}}; render()"); await pg.wait_for_timeout(400)
        el = await pg.query_selector('.vizwrap'); await el.screenshot(path=f'shots/{tag}-map.png')
        await pg.evaluate("nav.cur={view:'trees',params:{}}; render()"); await pg.wait_for_timeout(400)
        els = await pg.query_selector_all('.vizwrap')
        for i, el in enumerate(els): await el.screenshot(path=f'shots/{tag}-trees{i}.png')
        await pg.evaluate("ui.famSel=Object.values(W.people).find(p=>p.status==='resident').last; render()"); await pg.wait_for_timeout(400)
        els = await pg.query_selector_all('.vizwrap'); await els[0].screenshot(path=f'shots/{tag}-family.png')
        await els[1].scroll_into_view_if_needed(); g = await els[1].query_selector('g[data-fam]'); await g.hover(); await pg.wait_for_timeout(300); await els[1].screenshot(path=f'shots/{tag}-hover.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
