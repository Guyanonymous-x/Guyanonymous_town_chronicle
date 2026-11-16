# Checks saving and opening through the real Save and Open buttons, in every setting, including villages of only your own characters
# and an older (version 3) save. The reopened town must match the saved one exactly and keep running. Usage: python3 ui13_test.py
import asyncio, json, os
from playwright.async_api import async_playwright
URL = 'file:///home/claude/town/town-chronicle.html'
TMP = '/tmp/ui13'; os.makedirs(TMP, exist_ok=True)
ERAS = ['medieval', 'frontier', 'modern', 'fantasy', 'scifi', 'dropped', 'tudor', 'georgian', 'victorian', 'edwardian']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        res, errs = {}, []
        for i, era in enumerate(ERAS):
            mine = i % 2 == 1
            pg = await b.new_page(accept_downloads=True); msgs = []
            pg.on('dialog', lambda d: (msgs.append(d.message), asyncio.ensure_future(d.accept())))
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL)
            await pg.click(f'.eracard[data-era={era}]')
            if mine: await pg.select_option('#cMine', '1')
            else: await pg.fill('#cPop', '150')
            await pg.click('#cGo'); await pg.wait_for_timeout(400)
            if mine:
                for k in range(2):
                    await pg.click('#mkGen'); await pg.wait_for_timeout(80)
                    for sel in await pg.query_selector_all('[data-msex]'): await sel.select_option('f')
                    if await pg.evaluate("ui.maker.P.f.gender.v === 'Non-binary'"): await pg.select_option('[data-mtc="sex"]', 'm')
                    await pg.click('#mkNow'); await pg.wait_for_timeout(150)
            for k in range(2): await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=90000)
            await pg.evaluate("window.showSaveFilePicker = undefined")  # save by download, as browsers without the picker do
            async with pg.expect_download() as dl:
                await pg.click('#bSave')
            path = f'{TMP}/{era}.json'; await (await dl.value).save_as(path)
            saved = json.load(open(path, encoding='utf-8'))
            async with pg.expect_file_chooser() as fc:
                await pg.click('#bOpen')
            await (await fc.value).set_files(path); await pg.wait_for_timeout(1500)
            back = await pg.evaluate("JSON.parse(JSON.stringify(W))")
            same = all(back.get(k) == saved.get(k) for k in ['people', 'households', 'workplaces', 'rels', 'journal', 'photos', 'att', 'year', 'settings'])
            await pg.click('#bNext'); await pg.wait_for_function('!running', timeout=90000)
            runs = await pg.evaluate(f"W.year === {saved['year']} + 1")
            res[f'{era}{" (only mine)" if mine else ""}'] = (not msgs) and same and runs
            if msgs or not same or not runs: print('  ', era, msgs, 'same' if same else 'DIFFERENT', 'runs' if runs else 'DOES NOT RUN')
            await pg.close()
        # an older save (version 3) still opens
        old = json.load(open(f'{TMP}/medieval.json', encoding='utf-8')); old['version'] = 3; json.dump(old, open(f'{TMP}/old-v3.json', 'w', encoding='utf-8'))
        pg = await b.new_page(); msgs = []
        pg.on('dialog', lambda d: (msgs.append(d.message), asyncio.ensure_future(d.accept())))
        await pg.goto(URL)
        async with pg.expect_file_chooser() as fc:
            await pg.click('#cOpen')
        await (await fc.value).set_files(f'{TMP}/old-v3.json'); await pg.wait_for_timeout(1500)
        res['older version-3 save'] = not msgs and await pg.evaluate("!!W && W.version === FORMAT_VERSION")
        print(res)
        print('ALL SAVE/OPEN CHECKS PASSED' if all(res.values()) else 'SOME SAVE/OPEN CHECKS FAILED: ' + ', '.join(k for k, v in res.items() if not v))
        print('ERRORS:', errs[:5], len(errs))
        await b.close()
asyncio.run(main())
