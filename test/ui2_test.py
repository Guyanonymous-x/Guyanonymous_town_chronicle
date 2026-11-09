import asyncio
from playwright.async_api import async_playwright
URL = 'file:///home/claude/town/town-chronicle.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1360, 'height': 900}, accept_downloads=True)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto(URL)
        await pg.evaluate('delete window.showSaveFilePicker; delete window.showDirectoryPicker')
        for era in ['medieval', 'dropped', 'modern', 'frontier', 'fantasy', 'scifi']:
            pass
            await pg.click(f'[data-era={era}]'); await pg.fill('#cPop', '600'); await pg.fill('#cSeed', '99')
            await pg.click('#cGo'); await pg.wait_for_selector('.stats', timeout=30000)
            await pg.click('#bNext'); await pg.wait_for_selector('.stats', timeout=60000); await pg.wait_for_timeout(300)
            await pg.click('#bMany'); await pg.click('[data-n="25"]'); await pg.click('#nGo')
            await pg.wait_for_function('!running', timeout=180000); await pg.wait_for_timeout(500)
            yr = await pg.evaluate('W.year')
            if era == 'medieval':
                await pg.screenshot(path='shots/20-overview.png', full_page=True)
                await pg.click('[data-nav=history]'); await pg.click('.yearcard:nth-child(1) summary'); await pg.click('.yearcard:nth-child(3) summary')
                await pg.screenshot(path='shots/21-history.png', full_page=False)
            # check every page for every person
            n = await pg.evaluate('''() => { let bad = 0; for (const id of Object.keys(W.people)) { for (const t of ['story','years','family','connections','traits']) { ui.personTab = t; nav.cur = {view:'person', params:{id:+id}}; try { render(); if (document.querySelector('.err')) bad++; } catch(e) { bad++; console.error(id, t, e.message); } } } return [Object.keys(W.people).length, bad]; }''')
            h = await pg.evaluate('''() => { let bad=0; nav.cur={view:'history',params:{}}; render(); for (const d of document.querySelectorAll('.yearcard')) { try { const x = historyYearBody(+d.dataset.year); if (!x) bad++; } catch(e) { bad++; console.error('hist', d.dataset.year, e.message); } } for (const v of ['overview','people','households','groups','grudges','work','economy','leaders','crime','secrets','census','settings','backups']) { nav.cur={view:v,params:{}}; render(); if (document.querySelector('.err')) bad++; } for (const s of SITUATIONS) { ui.peopleFilter={situation:s[0]}; nav.cur={view:'people',params:{}}; render(); if (document.querySelector('.err')) bad++; } return bad; }''')
            hh = await pg.evaluate('''() => { let bad=0; for (const id of Object.keys(W.households)) { nav.cur={view:'household',params:{id:+id}}; try { render(); if (document.querySelector('.err')) bad++; } catch(e) { bad++; } } return [Object.keys(W.households).length, bad]; }''')
            await pg.evaluate("nav.cur={view:'economy',params:{}}; render()"); await pg.screenshot(path=f'shots/30-economy-{era}.png', full_page=True)
            cen = await pg.evaluate('''() => { let bad = 0, n = 0; const walk = (f, depth) => { for (const d of CENSUS_DIMS) { if (f[d.key]) continue; nav.cur = {view:'census', params:{f, show:d.key}}; try { render(); n++; if (document.querySelector('.err')) bad++; } catch(e) { bad++; console.error('census', e.message); } if (depth < 1) { const rows = censusGroups(d, censusMatch(f)).slice(0, 2); for (const [v] of rows) walk(Object.assign({}, f, {[d.key]: v}), depth + 1); } } }; walk({}, 0); return [n, bad]; }''')
            tot = await pg.evaluate('''() => { let bad = 0; const all = censusPeople(W).length; for (const d of CENSUS_DIMS) { if (d.multi) continue; const s = censusGroups(d, censusPeople(W)).reduce((a, r) => a + r[1].length, 0); const none = censusPeople(W).filter(p => d.fn(W, p) == null).length; if (s + none !== all) bad++; } return bad; }''')
            print(era, 'census views', cen, 'dimension totals that do not add up:', tot)
            await pg.evaluate("nav.cur={view:'census',params:{f:{work:'In work'}}}; render()"); await pg.screenshot(path=f'shots/50-census-{era}.png', full_page=True)
            for v in ['leaders','crime','secrets']:
                await pg.evaluate(f"showSecrets=true; nav.cur={{view:'{v}',params:{{}}}}; render()"); await pg.screenshot(path=f'shots/40-{v}-{era}.png', full_page=True)
            await pg.evaluate("showSecrets=false")
            sp = await pg.evaluate('''() => { let bad=0; showSecrets=true; for (const id of Object.keys(W.people)) { ui.personTab='story'; nav.cur={view:'person',params:{id:+id}}; try { render(); if (document.querySelector('.err')) bad++; } catch(e) { bad++; console.error(e.message); } } showSecrets=false; return bad; }''')
            print(era, 'story pages with secrets shown, errors:', sp)
            await pg.evaluate("nav.cur={view:'overview',params:{}}; render()"); await pg.screenshot(path=f'shots/31-overview-{era}.png', full_page=True)
            print(era, 'year', yr, 'person pages', n, 'history/page errors', h, 'household pages', hh)
            if era == 'medieval':
                pid = await pg.evaluate("Object.values(W.people).filter(p=>p.status==='resident' && W.year-p.born>35 && p.events.filter(e=>e.y>=W.startYear).length>8)[0].id")
                await pg.evaluate(f"ui.personTab='years'; nav.cur={{view:'person',params:{{id:{pid}}}}}; render()")
                await pg.screenshot(path='shots/22-person-years.png', full_page=False)
                await pg.evaluate(f"ui.personTab='traits'; render()"); await pg.screenshot(path='shots/23-person-mind.png', full_page=True)
                await pg.evaluate(f"ui.personTab='connections'; render()"); await pg.screenshot(path='shots/24-person-conn.png', full_page=True)
                await pg.evaluate("ui.personTab='story'; render()"); await pg.screenshot(path='shots/25-person-story.png', full_page=False)
                # undo
                pg.once('dialog', lambda d: asyncio.ensure_future(d.accept()))
                await pg.evaluate("nav.cur={view:'overview',params:{}}; render()")
                await pg.click('#bUndo'); await pg.wait_for_timeout(1500)
                print('after undo year', await pg.evaluate('W.year'))
                # save & reopen
                async with pg.expect_download() as d: await pg.click('#bSave')
                dl = await d.value; await dl.save_as('/tmp/s2.json')
                before = await pg.evaluate('JSON.stringify(W).length')
                await pg.evaluate('dirty=false')
                async with pg.expect_file_chooser() as fc: await pg.click('#bOpen')
                ch = await fc.value; await ch.set_files('/tmp/s2.json'); await pg.wait_for_timeout(2500)
                print('reopened year', await pg.evaluate('W.year'), 'size same', before == await pg.evaluate('JSON.stringify(W).length'))
                await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=60000)
                print('advanced after reopen to', await pg.evaluate('W.year'))
            await pg.evaluate('dirty=false'); await pg.click('#bNew')
        print('ERRORS:', errs[:8], len(errs))
        await b.close()
asyncio.run(main())
