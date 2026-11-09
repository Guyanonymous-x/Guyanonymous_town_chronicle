import asyncio, json, os, sys, gzip
from playwright.async_api import async_playwright
import openpyxl
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
import xml.dom.minidom
URL = 'file:///home/claude/town/town-chronicle.html'
OUT = '/tmp/ui9'; os.makedirs(OUT, exist_ok=True)
eras = sys.argv[1].split(',') if len(sys.argv) > 1 else ['medieval', 'dropped', 'modern', 'frontier', 'fantasy', 'scifi']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(accept_downloads=True, viewport={'width': 1360, 'height': 900})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.goto(URL)
        # catch the print window instead of opening it
        await pg.evaluate("window.print = () => { const a = document.getElementById('printArea'); window.__prints = (window.__prints || []).concat([{ lives: a.querySelectorAll('.plife').length, years: a.querySelectorAll('.pyear').length, svg: a.querySelectorAll('svg').length, len: a.innerHTML.length, uniq: new Set([...a.querySelectorAll('.ppage:not(:first-child) g[transform]')].map(g => g.getAttribute('transform'))).size, total: a.querySelector('.ppage svg') ? a.querySelector('.ppage svg').querySelectorAll('g[transform]').length : 0, tiles: a.querySelectorAll('.ppage').length, printing: document.body.classList.contains('printing') }]); window.dispatchEvent(new Event('afterprint')); }; delete window.showSaveFilePicker; window.showSaveFilePicker = undefined;")
        tot = {}
        def add(k, v=1): tot[k] = tot.get(k, 0) + v
        for era in eras:
            await pg.click(f'[data-era={era}]'); await pg.fill('#cPop', '500'); await pg.fill('#cSeed', '13')
            await pg.click('#cGo'); await pg.wait_for_selector('.stats', timeout=30000)
            await pg.evaluate("(() => { for (let i = 0; i < 8; i++) advanceYear(W); render(); })()")
            n_all = await pg.evaluate("Object.keys(W.people).length")
            await pg.evaluate("go('exports')"); await pg.wait_for_selector('#xGed')
            if era == eras[0]: await pg.screenshot(path=f'{OUT}/exports-page.png', full_page=True)
            # family-tree file
            async with pg.expect_download() as d: await pg.click('#xGed')
            dl = await d.value; path = f'{OUT}/{era}.ged'; await dl.save_as(path)
            txt = open(path, encoding='utf-8', newline='').read()
            same = await pg.evaluate("t => t === exportGedcom(W, { who: 'all', notes: true, secrets: false, fileName: " + json.dumps(dl.suggested_filename) + " }).text.replace(/\\d+ [A-Z]{3} \\d{4}/, m => m)", txt)
            indi = txt.count(' INDI\r\n')
            ok = indi == n_all and txt.startswith('0 HEAD') and txt.rstrip().endswith('0 TRLR')
            add('ged files'); add('ged ok', ok); add('ged people', indi)
            # living only
            await pg.select_option('#xGedWho', 'living')
            async with pg.expect_download() as d: await pg.click('#xGed')
            dl = await d.value; await dl.save_as(path + '2'); t2 = open(path + '2', encoding='utf-8', newline='').read()
            nlive = await pg.evaluate("residentsAlive(W).length")
            add('ged living ok', t2.count(' INDI\r\n') == nlive)
            await pg.select_option('#xGedWho', 'all')
            # Excel
            async with pg.expect_download() as d: await pg.click('#xXlsx')
            dl = await d.value; xp = f'{OUT}/{era}.xlsx'; await dl.save_as(xp)
            wb = openpyxl.load_workbook(xp, read_only=True)
            want = await pg.evaluate("workbookSheets(W, { secrets: false }).map(s => [s.name, s.rows.length])")
            got = [[ws.title, sum(1 for _ in ws.iter_rows())] for ws in wb.worksheets]
            add('xlsx files'); add('xlsx ok', got == want)
            if got != want: print('  xlsx differs', got, want)
            # print every person's life, with and without details and secrets
            r = await pg.evaluate("""() => { let n = 0, bad = 0; for (const o of [{ detail: false, secrets: false }, { detail: true, secrets: true }]) for (const p of Object.values(W.people)) { try { const h = printLife(p, o); n++; if (!h.includes('<h2>') || h.includes('undefined') || h.includes('NaN')) { bad++; if (bad < 3) console.log('bad life', p.id); } } catch (e) { bad++; console.error('life', p.id, e.message); } } return [n, bad]; }""")
            add('lives printed', r[0]); add('lives bad', r[1])
            # print buttons
            await pg.evaluate("window.__prints = []")
            pid = await pg.evaluate("residentsAlive(W)[3].id")
            await pg.fill('#xPerson', await pg.evaluate(f"(() => {{ const p = W.people[{pid}]; return fullName(p) + ' (b. ' + p.born + ') #' + p.id; }})()"))
            await pg.click('#xPrintPerson'); await pg.wait_for_timeout(300)
            hid = await pg.evaluate("document.querySelector('#xHh').value"); hn = await pg.evaluate(f"W.households[{hid}].members.length")
            await pg.click('#xPrintHh'); await pg.wait_for_timeout(300)
            fam = await pg.evaluate("document.querySelector('#xFam').value"); fn = await pg.evaluate(f"Object.values(W.people).filter(p => (p.birthName || p.last) === {json.dumps(fam)}).length")
            await pg.click('#xPrintFam'); await pg.wait_for_timeout(500)
            yrs = await pg.evaluate("(() => { const H = historyIndex(); return H.max - H.min + 1; })()")
            await pg.select_option('#xFrom', await pg.evaluate("String(historyIndex().min)")); await pg.select_option('#xTo', await pg.evaluate("String(historyIndex().max)"))
            await pg.click('#xPrintBook'); await pg.wait_for_timeout(800)
            pr = await pg.evaluate("window.__prints")
            exp = [1, hn, fn]
            okp = len(pr) == 4 and [x['lives'] for x in pr[:3]] == exp and pr[3]['years'] == yrs and all(x['printing'] for x in pr)
            add('print buttons ok', okp)
            if not okp: print('  prints', pr, exp, yrs)
            if era == eras[0]:
                await pg.evaluate("printHTML('t', '')")  # leave nothing behind
                # a print preview picture of one life
                await pg.evaluate(f"(() => {{ const a = document.getElementById('printArea') || Object.assign(document.createElement('div'), {{ id: 'printArea' }}); document.body.appendChild(a); a.innerHTML = '<div class=\"pdoc\">' + printLife(W.people[{pid}], {{ detail: false, secrets: false }}) + '</div>'; document.body.classList.add('printing'); }})()")
                await pg.emulate_media(media='print'); await pg.screenshot(path=f'{OUT}/print-life.png', full_page=True); await pg.emulate_media(media='screen')
                await pg.evaluate("document.body.classList.remove('printing'); document.getElementById('printArea').innerHTML = ''")
            # People page: a chosen list
            await pg.evaluate("ui.peopleFilter = { sex: 'f', situation: '' }; ui.peoplePage = 0; go('people')"); await pg.wait_for_selector('#bPrintList')
            nl = await pg.evaluate("peopleMatching(ui.peopleFilter).length")
            await pg.evaluate("window.__prints = []; window.confirm = () => true")
            await pg.click('#bPrintList'); await pg.wait_for_timeout(1500)
            pl = await pg.evaluate("window.__prints")
            async with pg.expect_download() as d: await pg.click('#bXlsxList')
            dl = await d.value; await dl.save_as(f'{OUT}/{era}-list.xlsx'); wb2 = openpyxl.load_workbook(f'{OUT}/{era}-list.xlsx', read_only=True)
            rows = sum(1 for _ in wb2['People'].iter_rows()) - 1
            async with pg.expect_download() as d: await pg.click('#bGedList')
            dl = await d.value; await dl.save_as(f'{OUT}/{era}-list.ged'); gl = open(f'{OUT}/{era}-list.ged', encoding='utf-8', newline='').read().count(' INDI\r\n')
            okl = len(pl) == 1 and pl[0]['lives'] == nl and rows == nl and gl == nl
            add('list exports ok', okl)
            if not okl: print('  list', pl, nl, rows, gl)
            # person page and household page print buttons, history button
            await pg.evaluate("window.__prints = []")
            await pg.evaluate(f"ui.personTab = 'story'; go('person', {{ id: {pid} }})"); await pg.click('#bPrintLife'); await pg.wait_for_timeout(300)
            await pg.evaluate(f"go('household', {{ id: {hid} }})"); await pg.click('#bPrintHh'); await pg.wait_for_timeout(300)
            pb = await pg.evaluate("window.__prints")
            add('page print buttons ok', len(pb) == 2 and pb[0]['lives'] == 1 and pb[1]['lives'] == hn)
            await pg.evaluate("go('history')"); await pg.click('#hPrint'); add('history button ok', await pg.evaluate("nav.cur.view") == 'exports')
            # pictures: box tree, marriage map, person tree and map
            pics = 0; picok = 0
            for setup in ["ui.famSel = null; go('trees')", f"ui.personTab = 'tree'; go('person', {{ id: {pid} }})", f"ui.personTab = 'map'; go('person', {{ id: {pid} }})"]:
                await pg.evaluate(setup); await pg.wait_for_timeout(200)
                wraps = await pg.query_selector_all('.vizwrap')
                for wi, w in enumerate(wraps):
                    full = await pg.evaluate("w => { const s = w.querySelector('svg'); return [+s.dataset.w, +s.dataset.h]; }", w)
                    async with pg.expect_download(timeout=120000) as d: await (await w.query_selector('[data-pic=svg]')).click()
                    dl = await d.value; sp = f'{OUT}/pic.svg'; await dl.save_as(sp)
                    doc = xml.dom.minidom.parse(sp); root = doc.documentElement
                    svg_ok = root.tagName == 'svg' and abs(float(root.getAttribute('width')) - full[0]) < 1 and 'var(' not in open(sp).read()
                    async with pg.expect_download(timeout=120000) as d: await (await w.query_selector('[data-pic=png]')).click()
                    dl = await d.value; pp = f'{OUT}/pic-{era}-{pics}.png'; await dl.save_as(pp)
                    im = Image.open(pp); k = im.size[0] / full[0]
                    png_ok = im.size[0] > 50 and abs(im.size[1] / full[1] - k) < 0.02
                    await pg.evaluate("window.__prints = []")
                    await (await w.query_selector('[data-pic=pdf]')).click()
                    for _ in range(120):
                        if await pg.evaluate('window.__prints.length'): break
                        await pg.wait_for_timeout(500)
                    pdf_ok = (await pg.evaluate(f"window.__prints.length === 1 && (window.__prints[0].tiles === 1 || window.__prints[0].uniq === window.__prints[0].total) && window.__prints[0].svg === (Math.ceil({full[0]} / 1000) * Math.ceil({full[1]} / 680) > 1 ? 1 + Math.ceil({full[0]} / 1000) * Math.ceil({full[1]} / 680) : 1)"))
                    pics += 1; picok += bool(svg_ok and png_ok and pdf_ok)
                    if not (svg_ok and png_ok and pdf_ok): print('  picture', setup[:30], wi, svg_ok, png_ok, pdf_ok, im.size, full)
                    if era == eras[0] and pics == 1: os.system(f'cp {pp} {OUT}/boxtree-picture.png')
            add('pictures', pics); add('pictures ok', picok)
            # compressed save, then reopen; then a normal save, then reopen
            before = await pg.evaluate("[W.year, Object.keys(W.people).length, JSON.stringify(W).length]")
            for comp in (True, False):
                await pg.evaluate(f"ui.saveCompressed = {str(comp).lower()}; fileHandle = null")
                async with pg.expect_download() as d: await pg.click('#bSave')
                dl = await d.value; sv = f'{OUT}/{era}-save' + ('.gz' if comp else ''); await dl.save_as(sv)
                raw = open(sv, 'rb').read(); is_gz = raw[:2] == b'\x1f\x8b'
                async with pg.expect_file_chooser() as fc: await pg.click('#bOpen')
                ch = await fc.value; await ch.set_files(sv); await pg.wait_for_timeout(2500)
                after = await pg.evaluate("[W.year, Object.keys(W.people).length, JSON.stringify(W).length]")
                add('saves', 1); add('saves ok', after == before and is_gz == comp and dl.suggested_filename.endswith('.gz') == comp)
                if after != before: print('  reopen differs', comp, before, after)
                add('compressed size %' if comp else 'normal size', len(raw))
            # carry on after reopening
            await pg.evaluate("(() => { advanceYear(W); render(); })()"); add('continued after reopen', await pg.evaluate("W.year") == before[0] + 1)
            print(era, json.dumps(tot)); 
            await pg.evaluate('dirty=false'); await pg.click('#bNew')
        print('TOTAL', json.dumps(tot))
        print('ERRORS:', errs[:8], len(errs))
        await b.close()
asyncio.run(main())
