// ================= Stage 6 page code: exports, printing, pictures, compressed saves =================
ui.exp = { gedWho: 'all', gedNotes: true, secrets: false, detail: false, famLiving: false, bookFrom: null, bookTo: null, bookBack: true };
try { ui.saveCompressed = localStorage.getItem('tc-compress') === '1'; } catch (e) { ui.saveCompressed = false; }
NAV.splice(NAV.findIndex(x => x[0] === 'story') + 1, 0, ['exports', 'Exports & printing']);

function safeName(s) { return String(s).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'community'; }
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000);
}

// ---------- printing (and "Save as PDF" from the print window) ----------
function printHTML(title, html, landscape) {
  let area = document.getElementById('printArea');
  if (!area) { area = document.createElement('div'); area.id = 'printArea'; document.body.appendChild(area); }
  area.innerHTML = `${landscape ? '<style>@page { size: landscape; margin: 10mm; }</style>' : '<style>@page { margin: 16mm 14mm; }</style>'}<div class="pdoc">${html}</div>`;
  const oldTitle = document.title; document.title = title;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); area.innerHTML = ''; document.title = oldTitle; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => { window.print(); if (!window.matchMedia) done(); }, 60);
}
function printTitlePage(title, sub) {
  return `<div class="ptitle"><h1>${esc(title)}</h1><p>${sub}</p><p class="muted">${esc(W.name)} · ${esc(eraOf(W).label || W.era)} · printed at the start of ${esc(yl(W.year))}</p></div>`;
}
// one person's whole life, ready to print
function printLife(p, o) {
  o = o || ui.exp;
  const f = familyOf(W, p);
  const h = W.households[p.household];
  const names = ids => ids.map(id => { const q = W.people[id]; const rw = relationWord(W, p, q); return `${esc(fullName(q))}${q.status === 'dead' ? ' †' : ''}${rw && rw !== 'relative' ? ` <span class="muted">(${esc(rw)})</span>` : ''}`; }).join(', ');
  const fam = [['Husband, wife or partner', f.spouse], ['Former partners', f.former], ['Parents', f.parents], ['Step-parents', f.stepParents], ['Children', f.children], ['Brothers and sisters', f.siblings], ['Half-brothers and half-sisters', f.halfSiblings], ['Grandparents', f.grandparents], ['Grandchildren', f.grandchildren]]
    .filter(([, ids]) => ids.length).map(([t, ids]) => `<tr><th>${t}</th><td>${names(ids)}</td></tr>`).join('');
  const rels = socialOf(p).filter(r => !r.ended && r.type !== 'spouse').sort((a, b) => REL_ORDER.indexOf(a.type) - REL_ORDER.indexOf(b.type) || Math.abs(b.score) - Math.abs(a.score));
  const relRows = rels.map(r => { const hist = (r.history || []).filter(x => x && x.text); return `<tr><th>${esc(cap(r.type))}</th><td>${esc(fullName(W.people[r.other]))} — ${linkify(r.reason || '')}, since ${esc(yl(r.since))}${hist.length ? `<div class="small">${hist.map(x => `${esc(yl(x.y))}: ${linkify(x.text)}`).join('; ')}</div>` : ''}</td></tr>`; }).join('');
  const evs = p.events.filter(e => (o.secrets || !e.secret) && (o.detail || !e.minor));
  const byYear = {}; for (const e of evs) (byYear[e.y] = byYear[e.y] || []).push(e);
  const hist = {}; for (const r of (p.hist || [])) hist[r[0]] = r;
  const years = [...new Set([...Object.keys(byYear), ...Object.keys(hist)].map(Number))].sort((a, b) => a - b);
  const yrs = years.map(yr => {
    const list = (byYear[yr] || []).slice().sort((a, b) => (a.s ?? 9) - (b.s ?? 9) || EVENT_PRIORITY.indexOf(a.t) - EVENT_PRIORITY.indexOf(b.t));
    const sum = hist[yr] ? personYearSummary(W, p, yr) : null;
    if (!list.length && !sum) return '';
    return `<div class="pyr"><div class="pwhen">${esc(yl(yr))}<small>${yr - p.born >= 0 ? 'age ' + (yr - p.born) : ''}</small></div><div>${sum ? `<div class="ysum">${esc(sum.text)}</div>` : ''}${list.map(e => `<div class="pev${e.secret ? ' secret' : ''}">${e.s != null ? `<b>${SEASONS[e.s]}:</b> ` : ''}${linkify(e.text)}${e.why ? ` <span class="muted">— why: ${linkify(e.why)}</span>` : ''}</div>`).join('')}</div></div>`;
  }).join('');
  const sub = p.status === 'dead' ? `${esc(yl(p.born))} – ${esc(yl(p.died))} · died aged ${p.died - p.born} of ${esc(p.cause || 'unknown causes')}` : `Born ${esc(yl(p.born))} · age ${ageOf(p, W.year)} · ${esc(statusWord(p).toLowerCase())}`;
  return `<section class="plife">
    <h2>${esc(fullName(p))}${p.birthName && p.birthName !== p.last ? ` <span class="muted">(born ${esc(p.birthName)})</span>` : ''}</h2>
    <p class="muted">${sub}${(p.status === 'resident' ? p.occupation : p.formerOccupation || p.occupation) ? ' · ' + esc(p.status === 'resident' ? p.occupation : p.formerOccupation || p.occupation) : ''}${h && p.status === 'resident' ? ` · ${esc(h.name)}, ${esc(h.district)}` : ''}</p>
    <p class="bio">${linkify(writeBio(W, p, p.died || W.year))} ${p.status === 'resident' ? linkify(bioNow(p)) : ''}</p>
    ${p.notes ? `<p><b>Notes:</b> ${esc(p.notes)}</p>` : ''}
    ${fam ? `<h3>Family</h3><table class="ptab">${fam}</table>` : ''}
    ${relRows ? `<h3>Friends, loves and enemies</h3><table class="ptab">${relRows}</table>` : ''}
    ${(p.hist || []).length > 1 ? `<h3>Mood and health over the years</h3>${lifeChart(p)}` : ''}
    <h3>Year by year</h3>${yrs || '<p class="muted">No recorded events.</p>'}
  </section>`;
}
function printPeople(ids, title, sub) {
  const ps = ids.map(id => W.people[id]).filter(Boolean);
  if (!ps.length) { toast('Nobody to print.'); return; }
  const done = busy(`Getting ${ps.length} ${ps.length === 1 ? 'life' : 'lives'} ready to print…`);
  setTimeout(() => {
    try {
      const contents = ps.length > 1 ? `<div class="pcontents"><h3>In this book (${ps.length})</h3><ol>${ps.map(p => `<li>${esc(fullName(p))} <span class="muted">${p.status === 'dead' ? `${esc(yl(p.born))}–${esc(yl(p.died))}` : 'b. ' + esc(yl(p.born))}</span></li>`).join('')}</ol></div>` : '';
      printHTML(`${W.name} - ${title}`, (ps.length > 1 ? printTitlePage(title, sub || '') + contents : '') + ps.map(p => printLife(p)).join(''));
    } finally { done(); }
  }, 30);
}
function printChronicle(from, to, withBack) {
  const H = historyIndex();
  from = Math.max(H.min, from); to = Math.min(H.max, to);
  const ys = []; for (let y = from; y <= to; y++) if (withBack || (W.chronicle && W.chronicle[y])) ys.push(y);
  if (!ys.length) { toast('No years in that range.'); return; }
  const done = busy(`Getting ${ys.length} years ready to print…`);
  setTimeout(() => {
    try {
      const body = ys.map(y => { const c = W.chronicle && W.chronicle[y]; const pop = c ? c.stats.population : (W.yearStats[y] && W.yearStats[y].population);
        return `<section class="pyear"><h2>${esc(yl(y))}${pop != null ? ` <span class="muted">· ${pop} people</span>` : ''}</h2>${c ? '' : '<p class="muted small">Before the chronicle: births, deaths, marriages and comings and goings only.</p>'}${historyYearBody(y)}</section>`; }).join('');
      printHTML(`${W.name} - chronicle ${yl(from)} to ${yl(to)}`, printTitlePage(`The Chronicle of ${W.name}`, `${esc(yl(ys[0]))} to ${esc(yl(ys[ys.length - 1]))} · ${ys.length} years`) + `<div class="pyearwrap">${trendChart ? `<div class="pchart">${trendChart()}</div>` : ''}${body}</div>`);
    } finally { done(); }
  }, 30);
}

// ---------- pictures of trees and maps ----------
const SVG_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-size', 'font-weight', 'font-family', 'paint-order', 'stroke-linejoin', 'text-anchor'];
function staticSVG(svg) {
  svg.classList.remove('hl'); svg.querySelectorAll('.on,.flash').forEach(x => x.classList.remove('on', 'flash'));
  const W0 = +svg.dataset.w, H0 = +svg.dataset.h;
  const clone = svg.cloneNode(true);
  const A = svg.querySelectorAll('*'), B = clone.querySelectorAll('*');
  for (let i = 0; i < A.length; i++) {
    const tag = A[i].tagName.toLowerCase(); if (tag === 'title' || tag === 'g' || tag === 'style') continue;
    const cs = getComputedStyle(A[i]);
    for (const k of SVG_PROPS) { const v = cs.getPropertyValue(k); if (v && v !== 'normal' && !(k === 'stroke-dasharray' && v === 'none')) B[i].setAttribute(k, v); }
    B[i].removeAttribute('class');
  }
  // where each top-level piece sits, so a page of a big drawing only carries what is on it
  const parts = [];
  [...svg.children].forEach((o, i) => {
    const c = clone.children[i]; if (!c || o.tagName.toLowerCase() === 'title') return;
    let bb; try { bb = o.getBBox(); } catch (e) { bb = { x: 0, y: 0, width: W0, height: H0 }; }
    let dx = 0, dy = 0; const t = o.transform && o.transform.baseVal && o.transform.baseVal.consolidate(); if (t) { dx = t.matrix.e; dy = t.matrix.f; }
    parts.push({ x: bb.x + dx - 4, y: bb.y + dy - 4, w: bb.width + 8, h: bb.height + 8, el: c });
  });
  clone.removeAttribute('class'); clone.removeAttribute('style');
  clone.setAttribute('viewBox', `0 0 ${W0} ${H0}`); clone.setAttribute('width', W0); clone.setAttribute('height', H0);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.insertAdjacentHTML('afterbegin', `<rect x="0" y="0" width="${W0}" height="${H0}" fill="#fffdf8"/>`);
  return { text: '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone), w: W0, h: H0, el: clone, parts };
}
function pictureName(wrap) {
  const card = wrap.closest('.card'); const h = card && card.querySelector('h3'); const h1 = document.querySelector('#main h1');
  const who = nav.cur && nav.cur.view === 'person' && W.people[nav.cur.params.id] ? fullName(W.people[nav.cur.params.id]) + ' ' + ({ tree: 'family tree', map: 'connections' }[ui.personTab] || '') : (h ? h.textContent : h1 ? h1.textContent : 'drawing');
  return safeName(`${W.name} ${who} ${W.year}`);
}
async function savePicture(wrap, kind) {
  const svg = wrap.querySelector('.viz svg'); if (!svg) return;
  const done = busy(kind === 'pdf' ? 'Getting the drawing ready to print…' : 'Making the picture…');
  await new Promise(r => setTimeout(r, 30));
  try {
    const s = staticSVG(svg); const name = pictureName(wrap);
    if (kind === 'svg') { downloadBlob(new Blob([s.text], { type: 'image/svg+xml' }), name + '.svg'); toast('Saved ' + name + '.svg'); return; }
    if (kind === 'pdf') {
      // a landscape page holds about 1000 × 680 of the drawing at full size
      const PW = 1000, PH = 680; const cols = Math.ceil(s.w / PW), rows = Math.ceil(s.h / PH); const n = cols * rows;
      const title = esc(name.replace(/-/g, ' '));
      const page = (vb, label) => {
        let c;
        if (label && label.startsWith('page')) {
          const [x0, y0, w0, h0] = vb.split(' ').map(Number);
          c = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          c.insertAdjacentHTML('afterbegin', `<rect x="${x0}" y="${y0}" width="${w0}" height="${h0}" fill="#fffdf8"/>`);
          for (const pt of s.parts) if (pt.x < x0 + w0 && pt.x + pt.w > x0 && pt.y < y0 + h0 && pt.y + pt.h > y0) c.appendChild(pt.el.cloneNode(true));
        } else c = s.el.cloneNode(true);
        c.setAttribute('viewBox', vb); c.setAttribute('width', '100%'); c.removeAttribute('height'); c.setAttribute('preserveAspectRatio', 'xMinYMin meet'); return `<div class="ppage"><h2 class="pdraw">${title}${label ? ` <span class="muted">· ${label}</span>` : ''}</h2><div class="pdrawing">${c.outerHTML}</div></div>`; };
      let html = page(`0 0 ${s.w} ${s.h}`, n > 1 ? 'the whole drawing' : '');
      if (n > 1) {
        done(); const full = confirm(`At full size this drawing needs ${n} pages (${cols} across, ${rows} down).\n\nOK: print a page showing the whole drawing, then all ${n} full-size pages.\nCancel: print just the one page showing the whole drawing.`);
        if (full) { let k = 0; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { k++; html += page(`${c * PW} ${r * PH} ${PW} ${PH}`, `page ${k} of ${n} — row ${r + 1}, column ${c + 1}`); } }
      }
      printHTML(name, html, true); return;
    }
    // PNG: twice the screen size for sharpness, shrunk if the browser can't make a picture that big
    const maxDim = 16000, maxArea = 100e6;
    const k = Math.min(2, maxDim / s.w, maxDim / s.h, Math.sqrt(maxArea / (s.w * s.h)));
    const url = URL.createObjectURL(new Blob([s.text], { type: 'image/svg+xml' }));
    const img = new Image(); img.decoding = 'sync';
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('the drawing could not be turned into a picture')); img.src = url; });
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(s.w * k)); c.height = Math.max(1, Math.round(s.h * k));
    const g = c.getContext('2d'); g.fillStyle = '#fffdf8'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    if (!blob) throw new Error('the picture was too big for the browser');
    downloadBlob(blob, name + '.png');
    toast(k < 1 ? `Saved ${name}.png — it was shrunk to fit; use SVG for full detail.` : `Saved ${name}.png`, k < 1 ? 5000 : 2600);
  } catch (err) { alert('Could not save the picture: ' + err.message); }
  finally { done(); }
}
// add the picture buttons to every drawing
vizFrame = (orig => (inner, height) => orig(inner, height).replace('<button class="small" data-vz="fit" title="Show everything">Fit all</button>', '<button class="small" data-vz="fit" title="Show everything">Fit all</button><span class="vzsep"></span><button class="small" data-pic="png" title="Save the whole drawing as a picture">PNG</button><button class="small" data-pic="svg" title="Save the whole drawing as an SVG picture (sharp at any size)">SVG</button><button class="small" data-pic="pdf" title="Print the drawing, or save it as a PDF from the print window">Print / PDF</button>'))(vizFrame);
document.addEventListener('click', e => { const b = e.target.closest('[data-pic]'); if (b) { e.preventDefault(); e.stopPropagation(); savePicture(b.closest('.vizwrap'), b.dataset.pic); } }, true);

// ---------- saving compressed, opening either kind ----------
fileNameFor = (orig => () => orig() + (ui.saveCompressed ? '.gz' : ''))(fileNameFor);
saveFile = async function (asNew) {
  const text = JSON.stringify(W);
  const isGz = name => /\.gz$/i.test(name || '');
  try {
    if (window.showSaveFilePicker) {
      if (!fileHandle || asNew) {
        const types = [{ description: 'Town Chronicle save', accept: { 'application/json': ['.json'] } }, { description: 'Town Chronicle save, compressed (smaller)', accept: { 'application/gzip': ['.gz'] } }];
        fileHandle = await window.showSaveFilePicker({ suggestedName: fileNameFor(), types: ui.saveCompressed ? types.reverse() : types });
      }
      const data = isGz(fileHandle.name) ? await gzipText(text) : text;
      const wr = await fileHandle.createWritable(); await wr.write(data); await wr.close();
      dirty = false; renderFrame(); toast(`Saved to ${fileHandle.name}${isGz(fileHandle.name) ? ' (compressed)' : ''}`);
      return;
    }
  } catch (err) { if (err && err.name === 'AbortError') return; console.warn('Save picker failed, downloading instead', err); }
  const nm = fileNameFor();
  downloadBlob(isGz(nm) ? new Blob([await gzipText(text)], { type: 'application/gzip' }) : new Blob([text], { type: 'application/json' }), nm);
  dirty = false; renderFrame(); toast(`Downloaded ${nm}`);
};
openFile = function () {
  if (dirty && W && !confirm('You have unsaved changes. Open another file anyway?')) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,.gz,application/json,application/gzip';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    const done = busy(`Opening ${f.name}…`);
    try { const text = await readSaveBytes(await f.arrayBuffer()); const data = JSON.parse(text); validateWorld(data); W = data; upgradeWorld(W); undoStack.length = 0; dirty = false; fileHandle = null; nav.stack = []; nav.cur = null; render(); toast(`Opened ${W.name} (${yl(W.year)})`); }
    catch (err) { alert('Could not open that file: ' + err.message); }
    done();
  };
  inp.click();
};

// ---------- the Exports & printing page ----------
function viewExports() {
  const o = ui.exp;
  const H = historyIndex();
  if (o.bookFrom == null) { o.bookFrom = W.startYear; o.bookTo = H.max; }
  const yearsOpt = sel => { const out = []; for (let y = H.min; y <= H.max; y++) out.push(`<option value="${y}" ${y === sel ? 'selected' : ''}>${esc(yl(y))}</option>`); return out.join(''); };
  const hhs = Object.values(W.households).filter(h => !h.dissolved && h.members.some(id => W.people[id] && W.people[id].status === 'resident')).sort((a, b) => a.name.localeCompare(b.name));
  const fams = [...familyClusters().entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const everyone = Object.values(W.people).sort((a, b) => (a.last + a.first).localeCompare(b.last + b.first));
  const all = Object.keys(W.people).length, live = residentsAlive(W).length;
  const text = JSON.stringify(W).length;
  return `<h1>Exports &amp; printing</h1>
  <p class="muted">Take ${esc(W.name)} out of the app: family-tree files, spreadsheets, printed life stories and pictures. Nothing here changes the community.</p>
  <div class="grid g2">
  <div class="card"><h3>Family-tree file (GEDCOM)</h3>
    <p class="small">The standard file most family-tree programs and websites can open or import. Each person comes with their parents, partners, children, births, deaths, work and faith.</p>
    <div class="filters small"><select id="xGedWho"><option value="all" ${o.gedWho === 'all' ? 'selected' : ''}>Everyone in the records (${all})</option><option value="living" ${o.gedWho === 'living' ? 'selected' : ''}>Only people living here now (${live})</option></select>
      <label><input type="checkbox" id="xGedNotes" ${o.gedNotes ? 'checked' : ''}> Add each person's life, year by year, as a note</label>
      <label><input type="checkbox" data-xo="secrets" ${o.secrets ? 'checked' : ''}> Include secrets</label></div>
    <button id="xGed">Download family-tree file (.ged)</button></div>
  <div class="card"><h3>Excel workbook</h3>
    <p class="small">One .xlsx file with a sheet for each of: people, life events, households, relationships, the town year by year, the census, town events, places of work, groups, feuds, crimes, leaders, elections, laws${W.econ ? ' and the economy' : ''}${o.secrets ? ', and secrets' : ''}. Top row frozen, with filters on every column.</p>
    <div class="filters small"><label><input type="checkbox" data-xo="secrets" ${o.secrets ? 'checked' : ''}> Include secrets</label></div>
    <button id="xXlsx">Download Excel workbook (.xlsx)</button>
    <p class="small muted">For just some people, filter them on the <a data-nav-go="people">People page</a> and use “Excel of these people”.</p></div>
  </div>
  <div class="card"><h3>Print life stories, or save them as PDF</h3>
    <p class="small">Each opens the print window. To make a PDF, choose “Save as PDF” as the printer there.</p>
    <div class="filters small"><label><input type="checkbox" data-xo="detail" ${o.detail ? 'checked' : ''}> Every small detail</label><label><input type="checkbox" data-xo="secrets" ${o.secrets ? 'checked' : ''}> Include secrets</label></div>
    <datalist id="dlEveryone">${everyone.map(p => `<option value="${esc(fullName(p))} (${p.status === 'dead' ? '† ' + p.died : 'b. ' + p.born}) #${p.id}">`).join('')}</datalist>
    <table class="list"><tbody>
      <tr><th>One person's life</th><td><input type="text" id="xPerson" list="dlEveryone" placeholder="Type a name…" size="32"></td><td><button class="small" id="xPrintPerson">Print</button></td></tr>
      <tr><th>A household</th><td><select id="xHh">${hhs.map(h => `<option value="${h.id}">${esc(cap(h.name))} — ${esc(h.district)} (${h.members.length})</option>`).join('')}</select></td><td><button class="small" id="xPrintHh">Print</button></td></tr>
      <tr><th>A family</th><td><select id="xFam">${fams.map(([n, l]) => `<option value="${esc(n)}">The ${esc(n)} family (${l.length} living here)</option>`).join('')}</select>
        <label class="small"><input type="checkbox" data-xo="famLiving" ${o.famLiving ? 'checked' : ''}> only those living here</label></td><td><button class="small" id="xPrintFam">Print</button></td></tr>
      <tr><th>A chosen list</th><td class="small">Filter people on the <a data-nav-go="people">People page</a> (or click “List these people” in the census), then use “Print these people”.</td><td></td></tr>
      <tr><th>The town's chronicle</th><td>From <select id="xFrom">${yearsOpt(o.bookFrom)}</select> to <select id="xTo">${yearsOpt(o.bookTo)}</select>
        <label class="small"><input type="checkbox" data-xo="bookBack" ${o.bookBack ? 'checked' : ''}> include years before the chronicle began</label></td><td><button class="small" id="xPrintBook">Print</button></td></tr>
    </tbody></table></div>
  <div class="grid g2">
  <div class="card"><h3>Pictures of trees and maps</h3>
    <p class="small">Every family tree and map has <b>PNG</b>, <b>SVG</b> and <b>Print / PDF</b> buttons in its top corner. They save the whole drawing, not just the part on screen.</p>
    <p class="small muted">PNG is an ordinary picture. SVG stays sharp at any size and is best for very big trees. Print / PDF gives a page showing the whole drawing; for a big drawing it can also print it at full size across several pages (it tells you how many first).</p></div>
  <div class="card"><h3>Saving smaller files</h3>
    <p class="small">This community is about ${(text / 1e6).toFixed(1)} MB as a normal save. In our tests a compressed save came out at about a seventh of that. Both open the same way with <b>Open…</b>.</p>
    <div class="filters small"><label><input type="radio" name="xComp" value="0" ${!ui.saveCompressed ? 'checked' : ''}> Normal saves (.town.json)</label><label><input type="radio" name="xComp" value="1" ${ui.saveCompressed ? 'checked' : ''}> Compressed saves (.town.json.gz)</label></div>
    <p class="small muted">This choice is used for “Save as…” and downloads. In the save window you can also pick either kind by its file type. Automatic backups stay normal.</p></div>
  </div>`;
}
afterRender.exports = () => {
  const o = ui.exp;
  document.querySelectorAll('[data-xo]').forEach(c => c.onchange = () => { o[c.dataset.xo] = c.checked; render(); });
  $('#xGedWho').onchange = e => { o.gedWho = e.target.value; };
  $('#xGedNotes').onchange = e => { o.gedNotes = e.target.checked; };
  $('#xGed').onclick = () => {
    const done = busy('Making the family-tree file…');
    setTimeout(() => { try { const nm = safeName(`${W.name} ${W.year}`) + '.ged'; const g = exportGedcom(W, { who: o.gedWho, notes: o.gedNotes, secrets: o.secrets, fileName: nm }); downloadBlob(new Blob([g.text], { type: 'text/plain;charset=utf-8' }), nm); toast(`Saved ${nm}: ${g.people} people, ${g.families} families.`, 4000); } catch (err) { alert('Could not make the file: ' + err.message); } finally { done(); } }, 30);
  };
  $('#xXlsx').onclick = async () => {
    const done = busy('Making the Excel workbook…'); await new Promise(r => setTimeout(r, 30));
    try { const nm = safeName(`${W.name} ${W.year}`) + '.xlsx'; const { blob, sheets } = await exportWorkbook(W, { secrets: o.secrets }); downloadBlob(blob, nm); toast(`Saved ${nm}: ${sheets.length} sheets.`, 4000); } catch (err) { alert('Could not make the workbook: ' + err.message); } finally { done(); }
  };
  $('#xPrintPerson').onclick = () => { const v = $('#xPerson').value; const m = /#(\d+)\s*$/.exec(v); const p = m && W.people[+m[1]]; if (!p) { toast('Pick a person from the list first.'); return; } printPeople([p.id], fullName(p)); };
  $('#xPrintHh').onclick = () => { const h = W.households[+$('#xHh').value]; if (!h) return; printPeople(h.members.slice().sort(byBorn), cap(h.name), `${esc(h.district)} · ${h.members.length} people`); };
  $('#xPrintFam').onclick = () => { const n = $('#xFam').value; const ids = Object.values(W.people).filter(p => (p.birthName || p.last) === n && (!o.famLiving || (p.status === 'resident' && p.died == null))).sort((a, b) => a.born - b.born).map(p => p.id); printPeople(ids, `The ${n} family`, `${ids.length} people born with the name ${esc(n)}${o.famLiving ? ', living here now' : ', from the oldest records to now'}`); };
  $('#xFrom').onchange = e => { o.bookFrom = +e.target.value; };
  $('#xTo').onchange = e => { o.bookTo = +e.target.value; };
  $('#xPrintBook').onclick = () => { const a = Math.min(o.bookFrom, o.bookTo), b = Math.max(o.bookFrom, o.bookTo); printChronicle(a, b, o.bookBack); };
  document.querySelectorAll('input[name=xComp]').forEach(r => r.onchange = () => { ui.saveCompressed = r.value === '1'; try { localStorage.setItem('tc-compress', ui.saveCompressed ? '1' : '0'); } catch (e) { } toast(ui.saveCompressed ? 'Saves will be compressed.' : 'Saves will be normal files.'); });
};
document.addEventListener('click', e => { const t = e.target.closest('[data-nav-go]'); if (t) { e.preventDefault(); if (t.dataset.navGo === 'people') { ui.peopleFilter = {}; ui.peoplePage = 0; } go(t.dataset.navGo); } });

// ---------- print buttons on other pages ----------
viewPerson = (orig => a => orig(a).replace('<div class="tabs">', `<div class="pbtns"><button class="small" id="bPrintLife" title="Print this life story, or save it as a PDF">Print life story</button></div><div class="tabs">`))(viewPerson);
afterRender.person = (orig => p => { orig(p); if ($('#bPrintLife')) $('#bPrintLife').onclick = () => { const q = W.people[nav.cur.params.id]; if (q) printPeople([q.id], fullName(q)); }; })(afterRender.person);
viewHousehold = (orig => a => { const out = orig(a); return out.replace(/<\/h1>/, ` <button class="small" id="bPrintHh">Print this household</button></h1>`); })(viewHousehold);
afterRender.household = (orig => p => { orig(p); if ($('#bPrintHh')) $('#bPrintHh').onclick = () => { const h = W.households[nav.cur.params.id]; if (h) printPeople(h.members.slice().sort(byBorn), cap(h.name), `${esc(h.district)} · ${h.members.length} people`); }; })(afterRender.household || (() => { }));
viewPeople = (orig => a => orig(a).replace('<table class="list">', `<div class="filters"><button class="small" id="bPrintList">Print these people</button><button class="small" id="bXlsxList">Excel of these people</button><button class="small" id="bGedList">Family-tree file of these people</button></div><table class="list">`))(viewPeople);
afterRender.people = (orig => p => {
  orig(p);
  const ids = () => peopleMatching(ui.peopleFilter).sort((a, b) => (a.last + a.first).localeCompare(b.last + b.first)).map(q => q.id);
  const label = () => ui.peopleFilter.label || 'Chosen people';
  if ($('#bPrintList')) $('#bPrintList').onclick = () => { const l = ids(); if (l.length > 300 && !confirm(`That is ${l.length} life stories — a very long print. Go ahead?`)) return; printPeople(l, label(), `${l.length} people`); };
  if ($('#bXlsxList')) $('#bXlsxList').onclick = async () => { const l = ids(); const done = busy('Making the Excel workbook…'); await new Promise(r => setTimeout(r, 30)); try { const nm = safeName(`${W.name} ${W.year} ${label()}`) + '.xlsx'; const { blob } = await exportWorkbook(W, { ids: l, secrets: ui.exp.secrets }); downloadBlob(blob, nm); toast(`Saved ${nm}: ${l.length} people.`); } finally { done(); } };
  if ($('#bGedList')) $('#bGedList').onclick = () => { const l = ids(); const nm = safeName(`${W.name} ${W.year} ${label()}`) + '.ged'; const g = exportGedcom(W, { who: 'ids', ids: l, notes: ui.exp.gedNotes, secrets: ui.exp.secrets, fileName: nm }); downloadBlob(new Blob([g.text], { type: 'text/plain;charset=utf-8' }), nm); toast(`Saved ${nm}: ${g.people} people, ${g.families} families.`); };
})(afterRender.people);
viewHistory = (orig => () => orig().replace('<button class="small" id="hOpenAll">', `<button class="small" id="hPrint">Print the chronicle…</button><button class="small" id="hOpenAll">`))(viewHistory);
afterRender.history = (orig => p => { orig(p); if ($('#hPrint')) $('#hPrint').onclick = () => go('exports'); })(afterRender.history);

render();
