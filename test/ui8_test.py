import asyncio
from playwright.async_api import async_playwright
URL = 'file:///home/claude/town/town-chronicle.html'
OVER = '''() => { let bad = 0, n = 0; document.querySelectorAll('.viz svg').forEach(svg => { const gs = [...svg.querySelectorAll('g[data-ni]')]; const bx = gs.map(g => g.getBBox ? (() => { const b = g.getBBox(); const t = g.transform.baseVal.consolidate().matrix; return { x: b.x + t.e, y: b.y + t.f, w: b.width, h: b.height }; })() : null); n += gs.length; for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) { const a = bx[i], b = bx[j]; if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) bad++; } }); return [n, bad]; }'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1360, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto(URL)
        tot = [0, 0, 0, 0]
        for era in ['medieval', 'dropped', 'modern', 'frontier', 'fantasy', 'scifi']:
            await pg.click(f'[data-era={era}]'); await pg.fill('#cPop', '500'); await pg.fill('#cSeed', '11')
            await pg.click('#cGo'); await pg.wait_for_selector('.stats', timeout=30000)
            await pg.evaluate("(() => { for (let i = 0; i < 10; i++) advanceYear(W); render(); })()")
            ids = await pg.evaluate("Object.keys(W.people).map(Number).filter((x, i) => i % 40 === 0)")
            pages = 0; dots = 0; over = 0; broken = 0
            for pid in ids:
                await pg.evaluate(f"ui.personTab='map'; nav.cur={{view:'person',params:{{id:{pid}}}}}; render()")
                n, o = await pg.evaluate(OVER); dots += n; over += o; pages += 1
                if not await pg.query_selector('.viz svg'): broken += 1
            fams = await pg.evaluate("[''].concat([...familyClusters().keys()].slice(0, 6))")
            for f in fams:
                await pg.evaluate(f"ui.famSel={f!r} || null; nav.cur={{view:'trees',params:{{}}}}; render()")
                n, o = await pg.evaluate(OVER); dots += n; over += o; pages += 1
                if len(await pg.query_selector_all('.viz svg')) < 2: broken += 1
            for g in (await pg.evaluate("Object.keys(W.groups).slice(0, 15)")):
                await pg.evaluate(f"nav.cur={{view:'group',params:{{id:{g}}}}}; render()")
                n, o = await pg.evaluate(OVER); dots += n; over += o; pages += 1
            await pg.evaluate("nav.cur={view:'grudges',params:{}}; render()"); n, o = await pg.evaluate(OVER); dots += n; over += o; pages += 1
            # click a copy box: the view jumps and stays on the page
            await pg.evaluate("ui.famSel=null; nav.cur={view:'trees',params:{}}; render()")
            jumped = await pg.evaluate("(() => { const c = document.querySelector('.viz [data-jump]'); if (!c) return 'none'; const svg = c.closest('svg'); const before = svg.getAttribute('viewBox'); c.dispatchEvent(new MouseEvent('click', {bubbles: true})); return before !== svg.getAttribute('viewBox') && nav.cur.view === 'trees'; })()")
            print(era, f'pages {pages}, dots {dots}, overlapping {over}, missing drawings {broken}, copy-box jump works {jumped}')
            tot[0] += pages; tot[1] += dots; tot[2] += over; tot[3] += broken
            await pg.evaluate('dirty=false'); await pg.click('#bNew')
        print('TOTAL pages', tot[0], 'dots', tot[1], 'overlapping', tot[2], 'missing', tot[3])
        print('ERRORS:', errs[:8], len(errs))
        await b.close()
asyncio.run(main())
