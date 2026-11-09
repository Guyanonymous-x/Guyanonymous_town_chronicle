import asyncio, sys, json
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
        await pg.add_init_script('delete window.showSaveFilePicker')
        await pg.evaluate('delete window.showSaveFilePicker')
        await pg.screenshot(path='shots/01-create.png', full_page=True)
        for era in ['medieval', 'frontier', 'modern', 'fantasy', 'scifi', 'dropped']:
            await pg.click(f'[data-era={era}]')
            await pg.fill('#cPop', '1000'); await pg.fill('#cSeed', '4242')
            await pg.click('#cGo')
            await pg.wait_for_selector('.stats', timeout=30000)
            await pg.screenshot(path=f'shots/02-overview-{era}.png', full_page=True)
            # people list
            await pg.click('[data-nav=people]'); await pg.wait_for_selector('table.list')
            if era == 'medieval': await pg.screenshot(path='shots/03-people.png', full_page=False)
            # open 3rd person
            await pg.click('table.list tbody tr:nth-child(3)')
            await pg.wait_for_selector('.bio')
            await pg.screenshot(path=f'shots/04-person-{era}.png', full_page=True)
            for tab in ['family', 'connections', 'years', 'traits']:
                await pg.click(f'[data-ptab={tab}]')
                if era in ('medieval','dropped'): await pg.screenshot(path=f'shots/05-{era}-{tab}.png', full_page=True)
            await pg.click('#bBack')
            for v in ['households', 'groups', 'grudges', 'work', 'settings', 'overview']:
                await pg.click(f'[data-nav={v}]')
                if era == 'medieval': await pg.screenshot(path=f'shots/06-{v}.png', full_page=False)
            # visit every person page quickly via JS for errors
            n = await pg.evaluate('''() => { let bad = 0; const ids = Object.keys(W.people); for (const id of ids) { for (const t of ['story','family','connections','years','traits']) { ui.personTab = t; nav.cur = {view:'person', params:{id:+id}}; try { render(); if (document.querySelector('.err')) bad++; } catch(e) { bad++; console.error(id, t, e.message); } } } return [ids.length, bad]; }''')
            print(era, 'person pages checked:', n)
            hh = await pg.evaluate('''() => { let bad=0; for (const id of Object.keys(W.households)) { nav.cur={view:'household',params:{id:+id}}; render(); if (document.querySelector('.err')) bad++; } for (const id of Object.keys(W.groups)) { nav.cur={view:'group',params:{id:+id}}; render(); if (document.querySelector('.err')) bad++; } for (const id of Object.keys(W.workplaces)) { nav.cur={view:'workplace',params:{id:+id}}; render(); if (document.querySelector('.err')) bad++; } return bad; }''')
            print(era, 'household/group/workplace page errors:', hh)
            # save (download) and re-open
            if era in ('medieval', 'dropped'):
                async with pg.expect_download() as d:
                    await pg.click('#bSave')
                dl = await d.value
                path = f'/tmp/save-{era}.json'; await dl.save_as(path)
                before = await pg.evaluate('JSON.stringify(W)')
                await pg.evaluate('dirty=false')
                async with pg.expect_file_chooser() as fc:
                    await pg.click('#bOpen')
                ch = await fc.value; await ch.set_files(path)
                await pg.wait_for_timeout(1500)
                after = await pg.evaluate('JSON.stringify(W)')
                print(era, 'save/open round trip identical:', before == after, 'size', len(before))
            await pg.evaluate('dirty=false')
            await pg.click('#bNew')
        print('ERRORS:', errs[:10], len(errs))
        await b.close()
asyncio.run(main())
