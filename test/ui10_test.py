# Checks the "Make a person" page in Chrome, in every setting. Usage: python3 ui10_test.py
import asyncio, os
from playwright.async_api import async_playwright
URL = 'file:///home/claude/town/town-chronicle.html'
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots'); os.makedirs(SHOTS, exist_ok=True)
ERAS = ['medieval', 'frontier', 'modern', 'fantasy', 'scifi', 'dropped', 'tudor', 'georgian', 'victorian', 'edwardian']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1360, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.goto(URL)
        totals = {'settings': 0, 'generated': 0, 'problems shown': 0, 'kept typed name': 0, 'tabs shown': 0, 'not ready message': 0}
        for era in ERAS:
            await pg.evaluate("W = null; nav.stack = []; nav.cur = null; render()")
            await pg.click(f'.eracard[data-era={era}]'); await pg.fill('#cPop', '150'); await pg.click('#cGo'); await pg.wait_for_selector('.stats')
            totals['settings'] += 1
            await pg.click('[data-nav=maker]'); await pg.wait_for_timeout(150)
            if era == 'medieval': await pg.screenshot(path=f'{SHOTS}/100-maker-empty.png', full_page=True)
            # type a first name (locks itself), then generate
            await pg.fill('[data-mpath="f.firstName"]', 'Wendeline'); await pg.wait_for_timeout(50)
            await pg.click('#mkGen'); await pg.wait_for_timeout(150); totals['generated'] += 1
            if await pg.evaluate("ui.maker.P.f.firstName.v") == 'Wendeline' and await pg.evaluate("ui.maker.P.f.firstName.l"): totals['kept typed name'] += 1
            if await pg.query_selector('#mkChecks .mk-warn'): totals['problems shown'] += 1
            await pg.screenshot(path=f'{SHOTS}/101-maker-{era}.png', full_page=True)
            for tab in ['family', 'record', 'turning', 'timeline', 'story', 'person']:
                await pg.click(f'[data-mtab={tab}]'); await pg.wait_for_timeout(80)
                if await pg.query_selector(f'[data-mtab={tab}].on'): totals['tabs shown'] += 1
                if era == 'medieval' and tab != 'person': await pg.screenshot(path=f'{SHOTS}/102-maker-{tab}.png', full_page=True)
            # generate 20 more times; nothing should go wrong
            for i in range(20):
                await pg.click('#mkGen'); totals['generated'] += 1
                if await pg.query_selector('#mkChecks .mk-warn'): totals['problems shown'] += 1
        # buttons, on the last town (sci-fi was the last one with the maker; make a fresh modern town)
        await pg.evaluate("W = null; nav.stack = []; nav.cur = null; render()")
        await pg.click('.eracard[data-era=modern]'); await pg.fill('#cPop', '150'); await pg.click('#cGo'); await pg.wait_for_selector('.stats')
        await pg.click('[data-nav=maker]'); await pg.click('#mkGen'); await pg.wait_for_timeout(100)
        res = {}
        await pg.click('#mkLockAll'); res['lock all'] = await pg.evaluate("Object.values(ui.maker.P.f).every(x => x.l) && ui.maker.P.story.l")
        await pg.click('#mkUnlockAll'); res['unlock all'] = await pg.evaluate("Object.values(ui.maker.P.f).every(x => !x.l) && !ui.maker.P.story.l")
        await pg.click('[data-mlock="f.lastName"]'); last = await pg.evaluate("ui.maker.P.f.lastName.v")
        await pg.click('#mkClear'); await pg.wait_for_timeout(100)
        res['clear unlocked keeps locked'] = await pg.evaluate("ui.maker.P.f.lastName.v") == last and await pg.evaluate("ui.maker.P.f.firstName.v") == ''
        await pg.click('#mkGen'); await pg.click('[data-mtab=family]')
        n = await pg.evaluate("ui.maker.P.lists.family.length")
        await pg.click('[data-mdel="family.0"]'); after = await pg.evaluate("ui.maker.P.lists.family.length")
        await pg.click('#mkUndoDel'); back = await pg.evaluate("ui.maker.P.lists.family.length")
        res['remove row and undo'] = (after == n - 1 and back == n)
        await pg.click('[data-madd=family]'); res['add row'] = await pg.evaluate("ui.maker.P.lists.family.length") == n + 1
        await pg.click('[data-mtab=story]'); await pg.fill('#mkStory', 'My own story.'); res['editing story locks it'] = await pg.evaluate("ui.maker.P.story.l")
        await pg.click('#mkRestory2'); res['locked story kept'] = await pg.evaluate("ui.maker.P.story.v") == 'My own story.'
        await pg.click('[data-mlock=story]'); await pg.click('#mkRestory2'); res['unlocked story rewritten'] = await pg.evaluate("ui.maker.P.story.v") != 'My own story.'
        await pg.click('#mkNew'); res['new blank'] = await pg.evaluate("Object.values(ui.maker.P.f).every(x => !x.v)")
        # the page leaves the rest of the app alone
        await pg.click('[data-nav=people]'); await pg.wait_for_timeout(100); await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=60000)
        await pg.click('[data-nav=maker]'); res['still works after a year'] = await pg.evaluate("ui.maker.P.f.firstName.v === ''") and await pg.query_selector('#mkGen') is not None
        # moving in: medieval town, a made person with a locked death year five years on
        await pg.evaluate("W = null; nav.stack = []; nav.cur = null; render()")
        await pg.click('.eracard[data-era=medieval]'); await pg.fill('#cPop', '200'); await pg.click('#cGo'); await pg.wait_for_selector('.stats')
        y0 = await pg.evaluate("W.year")
        await pg.click('[data-nav=maker]')
        await pg.fill('[data-mpath="f.firstName"]', 'Wendeline'); await pg.select_option('[data-mpath="f.gender"]', 'Woman')
        await pg.fill('[data-mpath="f.birthYear"]', str(y0 - 36)); await pg.fill('[data-mpath="f.deathYear"]', str(y0 + 5)); await pg.press('[data-mpath="f.deathYear"]', 'Tab')
        for k in range(30):  # generate until she has a partner, so the family part is tried
            await pg.click('#mkGen'); await pg.wait_for_timeout(60)
            if await pg.evaluate("!!makerParty(W, ui.maker.P).partner && makerParty(W, ui.maker.P).kids.length > 0"): break
        for sel in await pg.query_selector_all('[data-msex]'): await sel.select_option('f')
        res['draft kept in the save'] = await pg.evaluate("JSON.parse(JSON.stringify(W)).makerDraft.f.firstName.v === 'Wendeline'")
        res['unsaved changes shown'] = await pg.evaluate("dirty === true")
        await pg.select_option('#mkSeason', '1')
        await pg.screenshot(path=f'{SHOTS}/103-maker-movein.png', full_page=True)
        party = await pg.evaluate("(() => { const p = makerParty(W, ui.maker.P); return { partner: p.partner && p.partner.name, kids: p.kids.length }; })()")
        await pg.click('#mkPlan'); await pg.wait_for_timeout(150)
        res['plan added'] = await pg.evaluate("(W.plans || []).some(p => p.kind === 'madePerson' && p.status === 'waiting' && p.s === 1)")
        res['draft cleared after planning'] = await pg.evaluate("W.makerDraft.f.firstName.v === ''")
        await pg.click('[data-nav=story]'); await pg.wait_for_timeout(100)
        res['shown on Storyteller'] = 'Wendeline' in await pg.inner_text('#main')
        await pg.screenshot(path=f'{SHOTS}/104-story-made-plan.png')
        await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=60000); await pg.wait_for_timeout(200)
        wid = await pg.evaluate("(Object.values(W.people).find(p => p.made && p.first === 'Wendeline') || {}).id")
        res['she arrived'] = wid is not None
        if wid is not None:
            info = await pg.evaluate(f"(() => {{ const p = W.people[{wid}]; return {{ status: p.status, spouse: p.spouse ? W.people[p.spouse].first : null, kids: p.children.length, locked: p.lockedDeath && p.lockedDeath.y, arrived: p.arrived }}; }})()")
            print('arrived:', info, 'expected partner', party)
            res['locked death carried over'] = info['locked'] == y0 + 5
            await pg.evaluate(f"ui.personTab = 'story'; nav.cur = {{ view: 'person', params: {{ id: {wid} }} }}; render()"); await pg.wait_for_timeout(150)
            await pg.screenshot(path=f'{SHOTS}/105-made-person-page.png', full_page=True)
            res['details shown on their page'] = await pg.query_selector('.mk-made') is not None
            await pg.click('.mk-before summary'); await pg.wait_for_timeout(100)
            await pg.screenshot(path=f'{SHOTS}/107-made-person-before.png', full_page=True)
            res['details in printed life'] = await pg.evaluate(f"printLife(W.people[{wid}], ui.exp).includes('Before coming to')")
            res['other people unchanged'] = await pg.evaluate("!printLife(Object.values(W.people).find(q => !q.made && q.status === 'resident'), ui.exp).includes('Before coming to')")
            await pg.evaluate(f"ui.personTab = 'edit'; nav.cur = {{ view: 'person', params: {{ id: {wid} }} }}; render()"); await pg.wait_for_timeout(150)
            res['lock shown on Edit tab'] = await pg.query_selector('[data-unlockdeath]') is not None
            await pg.screenshot(path=f'{SHOTS}/106-made-person-edit.png')
            await pg.click('[data-unlockdeath]'); await pg.wait_for_timeout(150)
            res['unlock works'] = await pg.evaluate(f"!W.people[{wid}].lockedDeath && !(W.lockedDeaths || []).includes({wid})")
            await pg.click('#bUndo') if await pg.query_selector('#bUndo') else None
            await pg.wait_for_timeout(200)
            res['undo brings the lock back'] = await pg.evaluate(f"!!(W.people[{wid}] && W.people[{wid}].lockedDeath)")
            for k in range(6): await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=60000)
            d = await pg.evaluate(f"W.people[{wid}].died")
            print('died:', d, 'locked year', y0 + 5)
            res['died in the locked year'] = d == y0 + 5
        print(totals); print(res)
        print('ALL BUTTON CHECKS PASSED' if all(res.values()) else 'SOME BUTTON CHECKS FAILED')
        print('ERRORS:', errs[:5], len(errs))
        await b.close()
asyncio.run(main())
