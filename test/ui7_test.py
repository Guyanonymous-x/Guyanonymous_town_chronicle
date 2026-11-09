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
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(URL)
        await pg.fill('#cPop', '400'); await pg.click('#cGo'); await pg.wait_for_selector('.stats')
        # a woman of child-bearing age with a husband
        pid = await pg.evaluate("Object.values(W.people).find(p => p.status==='resident' && p.sex==='f' && p.spouse && !p.preg && W.year-p.born>20 && W.year-p.born<35).id")
        await pg.evaluate(f"ui.personTab='edit'; nav.cur={{view:'person',params:{{id:{pid}}}}}; render()")
        await pg.screenshot(path='shots/70-edit.png', full_page=True)
        # rename via the form
        await pg.fill('[data-ed=first]', 'Rosamund'); await pg.press('[data-ed=first]', 'Tab'); await pg.wait_for_timeout(200)
        print('renamed:', await pg.evaluate(f"W.people[{pid}].first"))
        # health edit
        await pg.fill('[data-ed=health]', '33'); await pg.press('[data-ed=health]', 'Tab'); await pg.wait_for_timeout(200)
        print('health:', await pg.evaluate(f"W.people[{pid}].health"))
        # plan 8 children in summer
        await pg.select_option('#plKind', 'children'); await pg.select_option('#plSeason', '1'); await pg.select_option('#pf_n', '8')
        await pg.click('#plAdd'); await pg.wait_for_timeout(200)
        print('toast:', await pg.evaluate("(document.querySelector('.toast')||{}).textContent")); print('plans:', await pg.evaluate("(W.plans||[]).map(p => p.kind + ':' + p.status)"))
        # town plan: a fire in spring, an outbreak
        await pg.click('[data-nav=story]'); await pg.wait_for_timeout(200)
        await pg.select_option('#tpKind', 'event'); await pg.wait_for_timeout(100)
        await pg.click('#tpAdd'); await pg.wait_for_timeout(100)
        await pg.select_option('#tpKind', 'newcomers'); await pg.wait_for_timeout(100); await pg.fill('#tf_n', '3'); await pg.click('#tpAdd'); await pg.wait_for_timeout(100)
        await pg.screenshot(path='shots/71-story.png', full_page=True)
        await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=60000); await pg.wait_for_timeout(300)
        print('after year:', await pg.evaluate("W.plans.map(p => p.kind + ':' + p.status + ' — ' + (p.result||''))"))
        print('children of', pid, ':', await pg.evaluate(f"W.people[{pid}].children.filter(c => W.people[c].born === W.year - 1).length"))
        await pg.evaluate("nav.cur={view:'story',params:{}}; render()"); await pg.screenshot(path='shots/72-story-after.png', full_page=True)
        # undo edits snapshot path: make an edit then undo
        await pg.evaluate(f"ui.personTab='edit'; nav.cur={{view:'person',params:{{id:{pid}}}}}; render()")
        await pg.fill('[data-ed=last]', 'Zzz'); await pg.press('[data-ed=last]', 'Tab'); await pg.wait_for_timeout(200)
        await pg.click('#bUndo'); await pg.wait_for_timeout(800)
        print('after undo last name:', await pg.evaluate(f"W.people[{pid}].last"))
        # open every person's edit tab
        r = await pg.evaluate('''() => { let bad = 0; for (const id of Object.keys(W.people)) { ui.personTab = 'edit'; nav.cur = {view:'person', params:{id:+id}}; try { render(); if (document.querySelector('.err')) bad++; } catch(e) { bad++; console.error(e.message); } } for (const id of Object.keys(W.households).slice(0, 200)) { nav.cur = {view:'household', params:{id:+id}}; render(); if (document.querySelector('.err')) bad++; } return bad; }''')
        print('edit tab errors:', r)
        print('ERRORS:', errs[:6], len(errs))
        await b.close()
asyncio.run(main())
