// ================= Town Chronicle — page code =================
let W = null;            // the current community
let dirty = false;       // unsaved changes?
let fileHandle = null;   // where it was last saved (browsers that allow it)
let showSecrets = false;
const nav = { stack: [], cur: null };
const ui = { peopleFilter: {}, peopleSort: { key: 'name', asc: true }, peoplePage: 0, personTab: 'story', timelineDetail: false };

const $ = sel => document.querySelector(sel);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yl = y => eraOf(W).yearLabel(y);
function toast(msg, ms = 2600) { document.querySelectorAll('.toast').forEach(x => x.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
function busy(msg) { const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = `<div class="box">${esc(msg)}</div>`; document.body.appendChild(o); return () => o.remove(); }

// ---------- names and links ----------
function nameClass(p) { return p.status === 'dead' ? 'dead-name' : (p.status === 'resident' ? '' : 'gone-name'); }
function plink(id) {
  const p = W.people[id]; if (!p) return '<span class="muted">someone</span>';
  return `<a class="${nameClass(p)}" data-pid="${p.id}">${esc(fullName(p))}</a>`;
}
function linkify(text) { return esc(text).replace(/@(\d+)/g, (m, id) => plink(+id)); }
function ageText(p) {
  if (p.status === 'dead') return `died ${yl(p.died)} aged ${p.died - p.born}`;
  const a = ageOf(p, W.year);
  if (p.status === 'departed') return `moved away${p.departed ? ' in ' + yl(p.departed) : ''}`;
  if (p.status === 'leftBehind') return `left behind on Earth`;
  if (p.status === 'prison') return `${W.era === 'dropped' ? 'banished' : 'locked up'} until ${yl(p.prisonUntil)}`;
  return `age ${a}`;
}
function statusWord(p) { return { resident: 'Lives here', dead: 'Died', departed: 'Moved away', leftBehind: 'Left behind on Earth', prison: W.era === 'dropped' ? 'Banished for a time' : 'In prison' }[p.status] || p.status; }
function chip(id, sub) {
  const p = W.people[id]; if (!p) return '';
  const cls = p.status === 'dead' ? 'dead' : p.status === 'resident' ? '' : 'away';
  return `<span class="chip ${cls}" data-pid="${p.id}"><span class="nm">${esc(fullName(p))}</span><span class="sub">${esc(sub || ageText(p))}</span></span>`;
}

// ---------- navigation ----------
function go(view, params, replace) {
  if (nav.cur && !replace) nav.stack.push(nav.cur);
  nav.cur = { view, params: params || {} };
  if (view !== 'person') ui.personTab = ui.personTab;
  render(); window.scrollTo(0, 0);
}
function back() { if (nav.stack.length) { nav.cur = nav.stack.pop(); render(); } }
document.addEventListener('click', e => {
  const a = e.target.closest('[data-pid]');
  if (a) { e.preventDefault(); ui.personTab = 'story'; go('person', { id: +a.dataset.pid }); return; }
  const h = e.target.closest('[data-hid]');
  if (h) { e.preventDefault(); go('household', { id: +h.dataset.hid }); return; }
  const w = e.target.closest('[data-wid]');
  if (w) { e.preventDefault(); go('workplace', { id: +w.dataset.wid }); return; }
  const g = e.target.closest('[data-gid]');
  if (g) { e.preventDefault(); go('group', { id: +g.dataset.gid }); return; }
  const f = e.target.closest('[data-filter]');
  if (f) { e.preventDefault(); ui.peopleFilter = JSON.parse(f.dataset.filter); ui.peoplePage = 0; go('people'); return; }
});

// ---------- top bar & frame ----------
function renderFrame() {
  const era = W ? eraOf(W) : null;
  document.body.className = era ? 'era-' + era.key : '';
  const census = W ? quickCensus(W, W.year) : null;
  $('#topbar').innerHTML = `
    <div class="brand"><b>Town</b> Chronicle</div>
    <div class="where">${W ? `<strong>${esc(W.name)}</strong> &nbsp;·&nbsp; ${esc(era.label)} &nbsp;·&nbsp; ${W.year > W.startYear ? 'start of ' : ''}${esc(yl(W.year))} &nbsp;·&nbsp; ${census.population} people ${dirty ? '<span class="dirty">&nbsp;· not saved yet</span>' : ''}` : ''}</div>
    ${W ? `<button id="bNext" class="adv" title="Live through ${esc(yl(W.year))}, season by season">▶ Next year</button><button id="bMany" class="adv">Advance…</button>${undoStack.length ? `<button id="bUndo" title="Go back to before the last advance">Undo</button>` : ''}<span class="tsep"></span>` : ''}
    <button id="bNew">New</button><button id="bOpen">Open…</button>
    ${W ? `<button id="bSave">Save</button><button id="bSaveAs">Save as…</button>` : ''}`;
  $('#bNew').onclick = () => { if (dirty && !confirm('You have unsaved changes. Start a new community anyway?')) return; W = null; nav.stack = []; nav.cur = null; render(); };
  $('#bOpen').onclick = openFile;
  if (W) { $('#bSave').onclick = () => saveFile(false); $('#bSaveAs').onclick = () => saveFile(true); $('#bNext').onclick = () => runYears(1); $('#bMany').onclick = askYears; if ($('#bUndo')) $('#bUndo').onclick = undoAdvance; }
}
const NAV = [['overview', 'Overview'], ['history', 'History'], ['census', 'Census'], ['people', 'People'], ['trees', 'Family trees'], ['households', 'Households'], ['groups', 'Groups'], ['grudges', 'Feuds & grudges'], ['work', 'Places of work'], ['economy', 'Economy & land'], ['leaders', 'Leaders & politics'], ['crime', 'Crime & justice'], ['secrets', 'Gossip & secrets'], ['story', 'Storyteller'], ['settings', 'Era settings'], ['backups', 'Backups']];
function renderNav() {
  const cur = nav.cur ? nav.cur.view : 'overview';
  const map = { person: 'people', household: 'households', group: 'groups', workplace: 'work' };
  const on = map[cur] || cur;
  $('#nav').innerHTML = NAV.map(([k, l]) => `<button data-nav="${k}" class="${k === on ? 'on' : ''}">${l}</button>`).join('') +
    `<div class="sep"></div><div class="note">V9: adds Make a person — design someone (LifeWeaver’s person maker), lock what you want, and move them in with their family.</div>`;
  $('#nav').querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { if (b.dataset.nav === 'people') { ui.peopleFilter = {}; ui.peoplePage = 0; } if (b.dataset.nav === 'households') ui.hhMeans = null; nav.stack = []; nav.cur = null; go(b.dataset.nav); });
}
function render() {
  renderFrame();
  if (!W) { $('#nav').style.display = 'none'; renderCreate(); return; }
  $('#nav').style.display = '';
  if (!nav.cur) nav.cur = { view: 'overview', params: {} };
  renderNav();
  const v = nav.cur.view, p = nav.cur.params;
  const crumbs = nav.stack.length ? `<div class="crumbs"><button class="small" id="bBack">← Back</button></div>` : '';
  let html = '';
  try {
    html = ({ exports: viewExports, story: viewStory, trees: viewTrees, census: viewCensus, leaders: viewLeaders, crime: viewCrime, secrets: viewSecrets, economy: viewEconomy, history: viewHistory, backups: viewBackups, overview: viewOverview, people: viewPeople, person: viewPerson, households: viewHouseholds, household: viewHousehold, groups: viewGroups, group: viewGroup, grudges: viewGrudges, work: viewWork, workplace: viewWorkplace, settings: viewSettings, maker: viewMaker })[v](p);
  } catch (err) { console.error(err); html = `<div class="card err">Something went wrong showing this page: ${esc(err.message)}</div>`; }
  $('#main').innerHTML = crumbs + html;
  if ($('#bBack')) $('#bBack').onclick = back;
  if (afterRender[v]) afterRender[v](p);
}
const afterRender = {};

// ---------- create screen ----------
let createState = { era: 'medieval', settings: null };
function renderCreate() {
  const era = ERAS[createState.era];
  if (!createState.settings || createState.settingsEra !== era.key) { createState.settings = Object.assign({}, era.settings); createState.settingsEra = era.key; }
  const S = createState.settings;
  const drop = era.dropOptions;
  $('#main').innerHTML = `<div class="welcome">
    <div class="card">
      <h1>Create a new community</h1>
      <p class="muted">Pick a time period or setting, a name and how many people live there. The app works out about 90 years of back-history — births, marriages, deaths, families coming and going — so everyone starts with real family trees, a home, a job, friends and grudges.</p>
      <h3 style="margin-top:1rem">1. Time period or setting</h3>
      <div class="eras">${Object.values(ERAS).map(e => `<div class="eracard ${e.key === era.key ? 'on' : ''}" data-era="${e.key}"><div class="t">${e.icon} ${esc(e.label)}</div><div class="d">${esc(e.description)}</div></div>`).join('')}</div>
      <h3 style="margin-top:1.2rem">2. The basics</h3>
      <div class="formrow">
        <label>Name of the ${esc(era.townWord)}<span><input type="text" id="cName" value="${esc(createState.name || era.placeNames[0])}" size="22"> <button class="small" id="cNameDice" title="Suggest a name">Suggest</button></span></label>
        <label>Number of people (20–1000)<span><input type="number" id="cPop" min="20" max="1000" value="${createState.pop || 500}" style="width:90px"> <input type="range" id="cPopR" min="20" max="1000" value="${createState.pop || 500}"></span></label>
        <label>Random seed (same seed = same town)<span><input type="number" id="cSeed" value="${createState.seed || Math.floor(Math.random() * 1e6)}" style="width:110px"> <button class="small" id="cSeedDice">New</button></span></label>
      </div>
      ${drop ? `<div class="formrow">
        <label>${esc(drop.gathering.label)}<select id="cGather">${drop.gathering.choices.map(([k, l]) => `<option value="${k}" ${k === (createState.gathering || drop.gathering.default) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label><span><input type="checkbox" id="cPerfect" ${createState.perfect === false ? '' : 'checked'}> ${esc(drop.perfectFirstYear.label)} (used when years start advancing)</span></label>
      </div>` : ''}
      <details style="margin:.6rem 0 1rem"><summary>3. Era settings (optional)</summary>
        <p class="small muted">These numbers are <b>my starting estimates</b>, based on rough historical averages for this setting — not fixed rules. They shape the back-history and, later, every year that passes. Change anything you like.</p>
        <table class="settings-table">${Object.entries(SETTING_INFO).map(([k, info]) => `<tr><td>${esc(info.label)}</td><td>${settingInput(k, info, S[k])}</td></tr>`).join('')}</table>
        <button class="small" id="cReset" style="margin-top:.5rem">Put back the starting estimates</button>
      </details>
      <button class="primary" id="cGo" style="font-size:1.05rem;padding:.6em 1.4em">Create ${esc(era.townWord)}</button>
      <span class="muted small" style="margin-left:.8rem">Takes a few seconds for 1,000 people.</span>
    </div>
    <div class="card"><h3>Or open a saved community</h3><p class="muted small">Open a <code>.town.json</code> or compressed <code>.town.json.gz</code> file you saved earlier.</p><button id="cOpen">Open a file…</button></div>
  </div>`;
  const keep = () => { createState.name = $('#cName').value; createState.pop = +$('#cPop').value; createState.seed = +$('#cSeed').value; if ($('#cGather')) createState.gathering = $('#cGather').value; if ($('#cPerfect')) createState.perfect = $('#cPerfect').checked; readSettings(); };
  document.querySelectorAll('[data-era]').forEach(c => c.onclick = () => { keep(); const old = ERAS[createState.era]; createState.era = c.dataset.era; if (!createState.name || old.placeNames.includes(createState.name)) createState.name = ERAS[createState.era].placeNames[0]; renderCreate(); });
  $('#cNameDice').onclick = () => { const n = era.placeNames; $('#cName').value = n[(n.indexOf($('#cName').value) + 1) % n.length]; };
  $('#cSeedDice').onclick = () => { $('#cSeed').value = Math.floor(Math.random() * 1e6); };
  $('#cPop').oninput = () => { $('#cPopR').value = $('#cPop').value; };
  $('#cPopR').oninput = () => { $('#cPop').value = $('#cPopR').value; };
  $('#cReset').onclick = () => { keep(); createState.settings = Object.assign({}, era.settings); renderCreate(); $('details').open = true; };
  $('#cOpen').onclick = openFile;
  $('#cGo').onclick = () => {
    keep();
    const pop = Math.round(clamp(+$('#cPop').value || 0, 20, 1000));
    const name = $('#cName').value.trim() || era.placeNames[0];
    const done = busy(`Creating ${name} and its ${pop} people…`);
    setTimeout(() => {
      try {
        const opts = { era: era.key, population: pop, seed: +$('#cSeed').value || 1, name, settings: createState.settings, options: {} };
        if (drop) { opts.options.gathering = createState.gathering || drop.gathering.default; opts.options.perfectFirstYear = createState.perfect !== false; }
        W = createCommunity(opts); upgradeWorld(W); undoStack.length = 0;
        dirty = true; fileHandle = null; nav.stack = []; nav.cur = null;
        render();
        toast(`${name} is ready — ${pop} people. Remember to save.`);
      } catch (err) { console.error(err); alert('Sorry, creating the community failed: ' + err.message); }
      done();
    }, 40);
  };
}
function settingInput(k, info, v) {
  if (info.unit === 'yes/no') return `<input type="checkbox" data-set="${k}" ${v ? 'checked' : ''}>`;
  if (info.unit === 'choice') return `<select data-set="${k}">${info.choices.map(c => `<option ${c === v ? 'selected' : ''}>${c}</option>`).join('')}</select>`;
  const step = info.unit === 'years' ? 1 : (info.max <= 0.1 ? 0.0001 : 0.01);
  return `<input type="number" data-set="${k}" value="${v}" min="${info.min}" max="${info.max}" step="${step}"> <span class="small muted">${info.unit === 'chance' || info.unit === 'share' ? '(' + (v * 100).toFixed(v < 0.01 ? 2 : 1) + '%)' : ''}</span>`;
}
function readSettings() {
  document.querySelectorAll('[data-set]').forEach(el => {
    const k = el.dataset.set, info = SETTING_INFO[k];
    if (info.unit === 'yes/no') createState.settings[k] = el.checked;
    else if (info.unit === 'choice') createState.settings[k] = el.value;
    else { const v = parseFloat(el.value); if (!isNaN(v)) createState.settings[k] = clamp(v, info.min, info.max); }
  });
}

// ---------- overview ----------
function viewOverview() {
  const era = eraOf(W); const y = W.year;
  const live = residentsAlive(W);
  const c = quickCensus(W, y);
  const ages = live.map(p => ageOf(p, y)).sort((a, b) => a - b);
  const median = ages[Math.floor(ages.length / 2)];
  const occ = {}; for (const p of live) if (p.occId) occ[p.occupation] = (occ[p.occupation] || 0) + 1;
  const other = {}; for (const p of live) if (!p.occId) other[p.occupation || 'None'] = (other[p.occupation || 'None'] || 0) + 1;
  const districts = {}; for (const p of live) { const h = W.households[p.household]; const d = h ? h.district : '?'; districts[d] = (districts[d] || 0) + 1; }
  const all = Object.values(W.people);
  const dead = all.filter(p => p.status === 'dead').length, gone = all.filter(p => p.status === 'departed').length, left = all.filter(p => p.status === 'leftBehind').length;
  const widowed = live.filter(p => !p.spouse && p.widowedOf && p.widowedOf.length && ageOf(p, y) >= 16).length;
  const stat = (n, l, filter) => `<div class="stat ${filter ? 'click' : ''}" ${filter ? `data-filter='${esc(JSON.stringify(filter))}'` : ''}><div class="n">${n}</div><div class="l">${l}</div></div>`;
  return `<h1>${esc(W.name)}</h1>
  <p class="muted">${esc(era.description)} The chronicle stands at <b>${esc(yl(y))}</b>. <a data-navto="census">Open the full census →</a></p>
  <div class="stats">
    ${stat(c.population, 'people living here', {})}
    ${stat(c.households, 'households')}
    ${stat((c.population / c.households).toFixed(1), 'people per household')}
    ${stat(median, 'median age')}
    ${stat(c.male + ' / ' + c.female, 'men and boys / women and girls')}
    ${stat(c.children, 'children under 16', { ageMax: 15 })}
    ${stat(c.elders, 'aged 65 and over', { ageMin: 65 })}
    ${stat(c.married, 'married or partnered', { married: true })}
    ${stat(widowed, 'widowed', { widowed: true })}
    ${stat(c.employed, 'in paid work or a trade', { working: true })}
    ${stat(c.hermits, 'loners and hermits', { hermit: true })}
    ${stat(dead + gone + left, `in the records but not here (${dead} died${gone ? ', ' + gone + ' moved away' : ''}${left ? ', ' + left + ' left behind on Earth' : ''})`, { status: 'notHere' })}
  </div>
  ${overviewYearCards()}
  <div class="grid g2">
    <div class="card"><h3>Ages</h3>${pyramidSVG(live, y)}<p class="small muted">Men and boys on the left, women and girls on the right, in five-year bands.</p></div>
    <div class="card"><h3>Where people live</h3>${barList(districts, d => ({ district: d }))}</div>
    <div class="card"><h3>Work</h3>${barList(occ, o => ({ occupation: o }), 16)}</div>
    <div class="card"><h3>Not in paid work</h3>${barList(other, o => ({ occupation: o }))}</div>
  </div>`;
}
function barList(obj, filterFn, limit) {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const shown = limit ? entries.slice(0, limit) : entries;
  const max = entries.length ? entries[0][1] : 1;
  return `<div class="barlist">${shown.map(([k, v]) => `<div class="row ${filterFn ? 'click' : ''}" ${filterFn ? `data-filter='${esc(JSON.stringify(filterFn(k)))}'` : ''}><span class="lab">${esc(cap(k))}</span><span class="bar"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span><span class="num">${v}</span></div>`).join('')}</div>
    ${limit && entries.length > limit ? `<p class="small muted">…and ${entries.length - limit} more kinds of work. <a data-filter='${esc(JSON.stringify({ working: true }))}'>See everyone working</a></p>` : ''}`;
}
function pyramidSVG(live, y) {
  const bands = []; for (let a = 0; a < 100; a += 5) bands.push(a);
  const m = bands.map(() => 0), f = bands.map(() => 0);
  for (const p of live) { const i = Math.min(19, Math.floor(ageOf(p, y) / 5)); (p.sex === 'm' ? m : f)[i]++; }
  const max = Math.max(1, ...m, ...f);
  const Wd = 440, rowH = 14, H = bands.length * rowH + 10, mid = Wd / 2, half = mid - 40;
  let s = `<svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="Age pyramid">`;
  bands.forEach((a, i) => {
    const yy = H - (i + 1) * rowH;
    const mw = m[i] / max * half, fw = f[i] / max * half;
    s += `<rect x="${mid - 22 - mw}" y="${yy}" width="${mw}" height="${rowH - 2}" fill="var(--male)" rx="2"><title>Men ${a}–${a + 4}: ${m[i]}</title></rect>`;
    s += `<rect x="${mid + 22}" y="${yy}" width="${fw}" height="${rowH - 2}" fill="var(--female)" rx="2"><title>Women ${a}–${a + 4}: ${f[i]}</title></rect>`;
    s += `<text x="${mid}" y="${yy + rowH - 4}" font-size="9" text-anchor="middle" fill="var(--muted)">${a === 95 ? '95+' : a}</text>`;
    if (m[i]) s += `<text x="${mid - 26 - mw}" y="${yy + rowH - 4}" font-size="9" text-anchor="end" fill="var(--muted)">${m[i]}</text>`;
    if (f[i]) s += `<text x="${mid + 26 + fw}" y="${yy + rowH - 4}" font-size="9" fill="var(--muted)">${f[i]}</text>`;
  });
  return s + '</svg>';
}

// ---------- people list ----------
function peopleMatching(f) {
  const y = W.year;
  let list = Object.values(W.people);
  const st = f.status || 'resident';
  if (st === 'resident') list = list.filter(p => p.status === 'resident');
  else if (st === 'notHere') list = list.filter(p => p.status !== 'resident');
  else if (st !== 'all') list = list.filter(p => p.status === st);
  if (f.q) { const q = f.q.toLowerCase(); list = list.filter(p => fullName(p).toLowerCase().includes(q) || (p.birthName && p.birthName.toLowerCase().includes(q))); }
  if (f.sex) list = list.filter(p => p.sex === f.sex);
  if (f.ageMin != null) list = list.filter(p => ageOf(p, p.died || y) >= f.ageMin);
  if (f.ageMax != null) list = list.filter(p => ageOf(p, p.died || y) <= f.ageMax);
  if (f.district) list = list.filter(p => { const h = W.households[p.household]; return h && h.district === f.district; });
  if (f.occupation) list = list.filter(p => p.occupation === f.occupation);
  if (f.working) list = list.filter(p => p.occId);
  if (f.married) list = list.filter(p => p.spouse);
  if (f.widowed) list = list.filter(p => !p.spouse && p.widowedOf && p.widowedOf.length && ageOf(p, y) >= 16);
  if (f.hermit) list = list.filter(p => p.hermit);
  if (f.ids) { const s = new Set(f.ids); list = list.filter(p => s.has(p.id)); }
  if (f.situation) list = list.filter(p => situationTest(f.situation, p));
  return list;
}
function viewPeople() {
  const f = ui.peopleFilter; const y = W.year;
  const list = peopleMatching(f);
  const sk = ui.peopleSort.key, asc = ui.peopleSort.asc ? 1 : -1;
  const keyFn = { name: p => p.last + ' ' + p.first, age: p => -p.born, sex: p => p.sex, job: p => p.occupation || '', home: p => (W.households[p.household] || {}).name || '', district: p => (W.households[p.household] || {}).district || '', status: p => p.status }[sk];
  list.sort((a, b) => { const x = keyFn(a), z = keyFn(b); return (x < z ? -1 : x > z ? 1 : 0) * asc; });
  const per = 50, pages = Math.max(1, Math.ceil(list.length / per));
  ui.peoplePage = Math.min(ui.peoplePage, pages - 1);
  const slice = list.slice(ui.peoplePage * per, ui.peoplePage * per + per);
  const live = residentsAlive(W);
  const districts = [...new Set(Object.values(W.households).map(h => h.district))].sort();
  const occs = [...new Set(Object.values(W.people).map(p => p.occupation).filter(Boolean))].sort();
  const th = (k, l) => `<th data-sort="${k}" class="${sk === k ? 'sorted' + (asc > 0 ? ' asc' : '') : ''}">${l}</th>`;
  const active = Object.entries(f).filter(([k, v]) => v != null && v !== '' && k !== 'status' && k !== 'q');
  return `<h1>People</h1>
  <div class="filters">
    <input type="search" id="fQ" placeholder="Search by name…" value="${esc(f.q || '')}" size="22">
    <select id="fStatus">${[['resident', 'Living here'], ['all', 'Everyone in the records'], ['dead', 'Died'], ['departed', 'Moved away'], ...(W.era === 'dropped' ? [['leftBehind', 'Left behind on Earth']] : []), ['prison', W.era === 'dropped' ? 'Banished for a time' : 'In prison'], ['notHere', 'Not here any more']].map(([k, l]) => `<option value="${k}" ${(f.status || 'resident') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select id="fSex"><option value="">Everyone</option><option value="m" ${f.sex === 'm' ? 'selected' : ''}>Men and boys</option><option value="f" ${f.sex === 'f' ? 'selected' : ''}>Women and girls</option></select>
    <select id="fDistrict"><option value="">All areas</option>${districts.map(d => `<option ${f.district === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
    <select id="fOcc"><option value="">Any work or role</option>${occs.map(o => `<option ${f.occupation === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
    <select id="fSit"><option value="">Any situation</option>${SITUATIONS.map(([k, l]) => `<option value="${k}" ${f.situation === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <label class="small"><input type="checkbox" id="fHermit" ${f.hermit ? 'checked' : ''}> loners only</label>
    ${active.length || f.q ? `<button class="small" id="fClear">Clear filters</button>` : ''}
  </div>
  ${f.ageMin != null || f.ageMax != null || f.married || f.widowed || f.working || f.ids ? `<p class="small muted">Also showing only: ${[f.ageMin != null ? 'aged ' + f.ageMin + '+' : '', f.ageMax != null ? 'aged ' + f.ageMax + ' or under' : '', f.married ? 'married or partnered' : '', f.widowed ? 'widowed' : '', f.working ? 'in paid work' : '', f.ids ? f.label || 'a chosen group' : ''].filter(Boolean).join(', ')}</p>` : ''}
  <p class="small muted">${list.length} ${list.length === 1 ? 'person' : 'people'} (of ${live.length} living here)</p>
  <table class="list"><thead><tr>${th('name', 'Name')}${th('age', 'Age')}${th('sex', 'Sex')}${th('job', 'Work or role')}${th('home', 'Household')}${th('district', 'Area')}${(f.status && f.status !== 'resident') ? th('status', 'Status') : ''}</tr></thead><tbody>
  ${slice.map(p => { const h = W.households[p.household]; return `<tr class="rowlink" data-pid="${p.id}"><td><a class="${nameClass(p)}">${esc(fullName(p))}</a>${p.hermit ? ' <span class="pill">loner</span>' : ''}</td><td>${p.status === 'dead' ? '† ' + (p.died - p.born) : ageOf(p, y)}</td><td>${p.sex === 'm' ? 'M' : 'F'}</td><td>${esc(p.occupation || '')}</td><td>${h && p.status === 'resident' ? esc(cap(h.name)) : ''}</td><td>${h && p.status === 'resident' ? esc(h.district) : ''}</td>${(f.status && f.status !== 'resident') ? `<td>${esc(statusWord(p))}</td>` : ''}</tr>`; }).join('')}
  </tbody></table>
  <div class="pager"><button class="small" id="pPrev" ${ui.peoplePage === 0 ? 'disabled' : ''}>← Previous</button><span class="small">Page ${ui.peoplePage + 1} of ${pages}</span><button class="small" id="pNext" ${ui.peoplePage >= pages - 1 ? 'disabled' : ''}>Next →</button></div>`;
}
afterRender.people = () => {
  const upd = (k, v) => { ui.peopleFilter[k] = v || undefined; ui.peoplePage = 0; render(); };
  let t; $('#fQ').oninput = e => { clearTimeout(t); t = setTimeout(() => { ui.peopleFilter.q = e.target.value; ui.peoplePage = 0; render(); const q = $('#fQ'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
  $('#fStatus').onchange = e => upd('status', e.target.value);
  $('#fSex').onchange = e => upd('sex', e.target.value);
  $('#fDistrict').onchange = e => upd('district', e.target.value);
  $('#fOcc').onchange = e => upd('occupation', e.target.value);
  $('#fHermit').onchange = e => upd('hermit', e.target.checked);
  $('#fSit').onchange = e => upd('situation', e.target.value);
  if ($('#fClear')) $('#fClear').onclick = () => { ui.peopleFilter = {}; ui.peoplePage = 0; render(); };
  document.querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => { const k = th.dataset.sort; ui.peopleSort = { key: k, asc: ui.peopleSort.key === k ? !ui.peopleSort.asc : true }; render(); });
  $('#pPrev').onclick = () => { ui.peoplePage--; render(); };
  $('#pNext').onclick = () => { ui.peoplePage++; render(); };
};

// ---------- one person ----------
function viewPerson({ id }) {
  const p = W.people[id]; if (!p) return '<div class="card">That person is not in the records.</div>';
  const y = p.died || W.year;
  const h = W.households[p.household];
  const color = p.sex === 'm' ? 'var(--male)' : 'var(--female)';
  const initials = (p.first[0] || '') + (p.last[0] || '');
  const tabs = [['story', 'Life story'], ['years', 'Year by year'], ['family', 'Family'], ['tree', 'Family tree'], ['connections', 'Connections'], ['map', 'Connection map'], ['traits', 'Mind, body & skills'], ['edit', 'Edit & plan']];
  const head = `<div class="card"><div class="phead">
    <div class="avatar" style="background:${color}">${esc(initials)}</div>
    <div style="flex:1">
      <h1 style="margin-bottom:.15rem">${esc(fullName(p))}${p.birthName && p.birthName !== p.last ? ` <span class="muted" style="font-size:1rem">(born ${esc(p.birthName)})</span>` : ''}</h1>
      <div>${p.status === 'dead' ? `${yl(p.born)} – ${yl(p.died)} · died aged ${p.died - p.born} of ${esc(p.cause)}` : `Born ${yl(p.born)} · age ${ageOf(p, W.year)}`}
        &nbsp;<span class="pill ${p.status === 'resident' ? 'good' : p.status === 'dead' ? 'bad' : 'warn'}">${statusWord(p)}</span>
        ${p.hermit ? '<span class="pill">loner</span>' : ''}</div>
      <div class="muted small" style="margin-top:.2rem">${p.status === 'resident' ? `${esc(p.occupation || '')}${p.workplace ? ` at <a data-wid="${p.workplace}">${esc(W.workplaces[p.workplace].name)}</a>` : ''}${h ? ` · lives in <a data-hid="${h.id}">${esc(h.name)}</a>, ${esc(h.district)}` : ''}` : (p.formerOccupation || p.occupation ? esc(p.formerOccupation || p.occupation) : '')}</div>
    </div></div>
    <div class="tabs">${tabs.map(([k, l]) => `<button data-ptab="${k}" class="${ui.personTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="ptab">${({ story: personStory, family: personFamily, tree: personTree, map: personMap, edit: personEdit, connections: personConnections, years: personYears, traits: personTraits })[ui.personTab](p, y)}</div>
  </div>`;
  return head;
}
afterRender.person = () => {
  document.querySelectorAll('[data-ptab]').forEach(b => b.onclick = () => { ui.personTab = b.dataset.ptab; render(); });
  if ($('#tlDetail')) $('#tlDetail').onchange = e => { ui.timelineDetail = e.target.checked; render(); };
  if ($('#secrets')) $('#secrets').onchange = e => { showSecrets = e.target.checked; render(); };
};
function personStory(p, y) {
  const f = familyOf(W, p);
  const firstFew = (ids, n) => ids.slice(0, n).map(id => chip(id, relationWord(W, p, W.people[id]) || '')).join('');
  return `<p class="bio">${linkify(writeBio(W, p, y))} ${linkify(bioNow(p))}</p>
  ${p.status === 'dead' ? `<p class="muted">Died in ${yl(p.died)} of ${esc(p.cause)}.</p>` : ''}
  ${personSociety(p)}
  <div class="grid g3" style="margin-top:1rem">
    <div><div class="famsec"><h4>Closest family</h4><div class="chips">${firstFew([...f.spouse, ...f.parents, ...f.children], 10) || '<span class="muted small">No close family on record.</span>'}</div></div></div>
    <div><div class="famsec"><h4>Closest friends</h4><div class="chips">${socialOf(p).filter(r => !r.ended && /close friend|^friend|courting/.test(r.type)).sort((a, b) => b.score - a.score).slice(0, 6).map(r => chip(r.other, r.type)).join('') || '<span class="muted small">Nobody close.</span>'}</div></div></div>
    <div><div class="famsec"><h4>Bad blood</h4><div class="chips">${socialOf(p).filter(r => !r.ended && r.score < 0 && r.type !== 'ex' && r.type !== 'old grudge').sort((a, b) => a.score - b.score).slice(0, 6).map(r => chip(r.other, r.type)).join('') || '<span class="muted small">No grudges.</span>'}</div></div></div>
  </div>`;
}
function socialOf(p) {
  const out = [];
  for (const r of Object.values(W.rels)) if (r.a === p.id || r.b === p.id) out.push(Object.assign({ other: r.a === p.id ? r.b : r.a }, r));
  return out;
}
function famRow(title, ids, p) {
  if (!ids.length) return '';
  return `<div class="famsec"><h4>${title} (${ids.length})</h4><div class="chips">${ids.map(id => { const q = W.people[id]; const rw = relationWord(W, p, q); return chip(id, `${rw && rw !== 'relative' ? rw + ' · ' : ''}${ageText(q)}`); }).join('')}</div></div>`;
}
function personFamily(p) {
  const f = familyOf(W, p);
  const secretBits = [];
  if (p.secretFather) secretBits.push(`${plink(p.id)}'s real father is ${plink(p.secretFather)} — nobody knows.`);
  if (p.secretChildren && p.secretChildren.length) secretBits.push(`${plink(p.id)} secretly fathered ${p.secretChildren.map(plink).join(', ')}.`);
  const h = W.households[p.household];
  return `${famRow('Husband, wife or partner', f.spouse, p)}${famRow('Former partners', f.former, p)}${famRow('Parents', f.parents, p)}${famRow('Step-parents', f.stepParents, p)}${famRow('Guardian', f.guardian, p)}
    ${famRow('Children', f.children, p)}${famRow('Brothers and sisters', f.siblings, p)}${famRow('Half-brothers and half-sisters', f.halfSiblings, p)}
    ${famRow('Grandparents', f.grandparents, p)}${famRow('Grandchildren', f.grandchildren, p)}${famRow('Aunts and uncles', f.auntsUncles, p)}${famRow('Nieces and nephews', f.niecesNephews, p)}${famRow('Cousins', f.cousins, p)}${famRow('In-laws', f.inLaws, p)}
    ${!Object.values(f).some(a => a.length) ? '<p class="muted">No family on record.</p>' : ''}
    ${h && p.status === 'resident' ? `<div class="famsec"><h4>Shares a home with — <a data-hid="${h.id}">${esc(h.name)}</a></h4><div class="chips">${h.members.filter(id => id !== p.id).map(id => chip(id, relationWord(W, p, W.people[id]) || (W.era === 'dropped' ? 'shelter-mate' : 'lodger'))).join('') || '<span class="muted small">Lives alone.</span>'}</div></div>` : ''}
    ${secretBits.length ? `<div class="famsec"><label class="small"><input type="checkbox" id="secrets" ${showSecrets ? 'checked' : ''}> Show family secrets</label>${showSecrets ? `<p class="timeline"><span class="secret">${secretBits.join(' ')}</span></p>` : ''}</div>` : ''}
    <p class="small"><a data-ptab-go="tree">See this as a family tree →</a></p>`;
}
const REL_ORDER = ['courting', 'crush', 'close friend', 'friend', 'acquaintance', 'mentor', 'old friend', 'ex', 'strained', 'estranged', 'old grudge', 'rival', 'enemy'];
const REL_LABEL = { courting: 'Courting', crush: 'Crushes', 'close friend': 'Close friends', friend: 'Friends', acquaintance: 'On good terms', mentor: 'Teacher / apprentice', 'old friend': 'Old friends (drifted apart)', ex: 'Former partners', strained: 'Strained family ties', estranged: 'Estranged family', 'old grudge': 'Old grudges (mostly forgotten)', rival: 'Rivals', enemy: 'Enemies' };
function relRow(r, dir) {
  const hist = (r.history || []).filter(h => h && h.text);
  return `<div class="relrow"><span>${dir ? `<span class="small muted">${dir}</span> ` : ''}${plink(r.other)}</span><span>${scoreBar(r.score)}</span><span class="small">${linkify(cap(r.reason || ''))}${r.feud ? ` <span class="pill bad">feud</span>` : ''}${r.ended ? ` <span class="pill">ended ${yl(r.ended)}</span>` : ''}${hist.length ? `<details class="relhist"><summary>${hist.length} thing${hist.length > 1 ? 's' : ''} that happened between them</summary>${hist.map(h => `<div>${yl(h.y)}: ${linkify(h.text)}</div>`).join('')}</details>` : ''}</span><span class="small muted">since ${yl(r.since)}</span></div>`;
}
function scoreBar(s) {
  const w = Math.abs(s) / 2; const col = s >= 0 ? 'var(--good)' : 'var(--bad)';
  return `<span class="score" title="${s > 0 ? '+' : ''}${s} (from −100 hatred to +100 devotion)"><i style="left:${s >= 0 ? 50 : 50 - w}%;width:${w}%;background:${col}"></i></span>`;
}
function personConnections(p) {
  if (p.status !== 'resident' && p.status !== 'dead') return '<p class="muted">This person is not living in the community, so day-to-day connections are not tracked.</p>';
  const all = socialOf(p);
  const rels = all.filter(r => !r.ended && r.type !== 'spouse' && r.type !== 'old crush');
  const past = all.filter(r => r.ended || r.type === 'old crush');
  const by = {}; for (const r of rels) (by[r.type] = by[r.type] || []).push(r);
  let out = '';
  for (const t of REL_ORDER) if (by[t]) {
    out += `<div class="famsec"><h4>${REL_LABEL[t]} (${by[t].length})</h4>${by[t].sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).map(r => {
      const dir = r.type === 'crush' ? (r.from === p.id ? 'has a crush on' : 'has a crush on ' + esc(p.first) + ':') : r.type === 'mentor' ? (r.from === p.id ? 'teaching' : 'learning from') : '';
      return relRow(r, dir);
    }).join('')}</div>`;
  }
  if (p.spouse) { const sr = getRel(W, p.id, p.spouse); if (sr) out = `<div class="famsec"><h4>Marriage</h4>${relRow(Object.assign({ other: p.spouse }, sr), '')}</div>` + out; }
  if (past.length) out += `<details class="famsec"><summary>Past connections (${past.length}) — people who died, moved away, or a romance that ended</summary>${past.sort((a, b) => (b.ended || 0) - (a.ended || 0)).map(r => relRow(r, '')).join('')}</details>`;
  // regular community: workplace, neighbours, places they go
  const live = residentsAlive(W);
  const h = W.households[p.household];
  const wp = W.workplaces[p.workplace];
  if (wp) { const co = wp.members.filter(id => id !== p.id); out += `<div class="famsec"><h4>Works with at <a data-wid="${wp.id}">${esc(wp.name)}</a> (${co.length})</h4><div class="chips">${co.slice(0, 24).map(id => chip(id, W.people[id].occupation)).join('') || '<span class="muted small">Works alone.</span>'}${co.length > 24 ? `<a data-wid="${wp.id}" class="small">…all ${co.length}</a>` : ''}</div></div>`; }
  if (h && p.status === 'resident') {
    const nb = live.filter(q => q.id !== p.id && q.household !== p.household && W.households[q.household] && W.households[q.household].district === h.district);
    out += `<div class="famsec"><h4>Neighbours in ${esc(h.district)} (${nb.length})</h4><p class="small">${nb.length ? `<a data-filter='${esc(JSON.stringify({ district: h.district }))}'>See all ${nb.length + 1} people who live in ${esc(h.district)}</a>` : 'No near neighbours.'}</p></div>`;
  }
  if (p.venues.length) {
    out += `<div class="famsec"><h4>Places they go regularly</h4>${p.venues.map(v => { const ven = W.venues.find(x => x.id === v); const regulars = live.filter(q => q.id !== p.id && q.venues.includes(v)); return `<div class="small">• ${esc(ven ? ven.name : v)} — <a data-filter='${esc(JSON.stringify({ ids: regulars.map(q => q.id), label: 'regulars at ' + (ven ? ven.name : v) }))}'>${regulars.length} other regulars</a></div>`; }).join('')}</div>`;
  }
  const groups = Object.values(W.groups).filter(g => g.members.includes(p.id));
  if (groups.length) out += `<div class="famsec"><h4>Groups</h4>${groups.map(g => `<div class="small">• <a data-gid="${g.id}">${esc(g.name)}</a> (${g.members.length} members)</div>`).join('')}</div>`;
  const feuds = Object.values(W.feuds).filter(fd => [fd.sideA.id, fd.sideB.id].includes(p.household));
  if (feuds.length) out += `<div class="famsec"><h4>Family feuds</h4>${feuds.map(fd => `<div class="small">• <a data-hid="${fd.sideA.id}">${esc(cap(fd.sideA.name))}</a> against <a data-hid="${fd.sideB.id}">${esc(fd.sideB.name)}</a> — over ${esc(fd.reason)}, since ${yl(fd.since)}</div>`).join('')}</div>`;
  return out || '<p class="muted">No connections on record.</p>';
}
const EVENT_PRIORITY = ['died', 'arrived', 'married', 'partnered', 'divorced', 'child_born', 'loss', 'betrayal', 'injury', 'ill', 'withdrew', 'returned', 'mind', 'heartbreak', 'courting', 'pregnant', 'miscarriage', 'guilt', 'feud', 'peace', 'quarrel', 'work', 'success', 'setback', 'school', 'moved', 'took_in', 'left', 'born', 'secret', 'learned', 'health', 'child_married', 'grandchild', 'sibling_born', 'child_left', 'conflict', 'friend', 'group', 'ripple'];
function personYears(p) {
  const evs = p.events.filter(e => (showSecrets || !e.secret) && (ui.timelineDetail || !e.minor));
  const byYear = {};
  for (const e of evs) (byYear[e.y] = byYear[e.y] || []).push(e);
  const hist = {}; for (const h of (p.hist || [])) hist[h[0]] = h;
  const years = [...new Set([...Object.keys(byYear).map(Number), ...Object.keys(hist).map(Number)])].sort((a, b) => a - b);
  const rows = years.map(yr => {
    let list = (byYear[yr] || []).slice().sort((a, b) => (a.s ?? 9) - (b.s ?? 9) || EVENT_PRIORITY.indexOf(a.t) - EVENT_PRIORITY.indexOf(b.t));
    const sum = hist[yr] ? personYearSummary(W, p, yr) : null;
    if (!ui.timelineDetail && list.length > 3) { const keep = list.slice().sort((a, b) => EVENT_PRIORITY.indexOf(a.t) - EVENT_PRIORITY.indexOf(b.t)).slice(0, 3); list = list.filter(e => keep.includes(e)); }
    const more = (byYear[yr] || []).length - list.length;
    return `<div class="yr"><div class="when">${yl(yr)}<small>${yr - p.born >= 0 ? 'age ' + (yr - p.born) : ''}</small>${sum ? miniBars(sum) : ''}</div><div>
      ${sum ? `<div class="ysum">${esc(sum.text)}</div>` : ''}
      ${list.map(e => `<div class="ev ${e.secret ? 'secret' : ''} ${e.minor ? 'minor' : ''}">${e.s != null ? `<span class="season">${SEASONS[e.s]}</span>` : ''}${linkify(e.text)}${e.why ? `<div class="why">Why: ${linkify(e.why)}</div>` : ''}</div>`).join('')}
      ${!list.length && sum ? '<div class="small muted">Nothing out of the ordinary.</div>' : ''}
      ${more > 0 ? `<div class="small muted">+ ${more} smaller things (tick “every detail”)</div>` : ''}</div></div>`;
  });
  return `<div class="filters"><label class="small"><input type="checkbox" id="tlDetail" ${ui.timelineDetail ? 'checked' : ''}> Show every detail (small things too)</label>
    ${p.events.some(e => e.secret) ? `<label class="small"><input type="checkbox" id="secrets" ${showSecrets ? 'checked' : ''}> Show secrets</label>` : ''}
    <span class="small muted">The bars beside each year show mood (left) and health (right).</span></div>
    ${(p.hist || []).length > 1 ? `<div class="card" style="padding:.6rem .8rem">${lifeChart(p)}</div>` : ''}
    <div class="timeline">${rows.join('') || '<p class="muted">No recorded events yet.</p>'}</div>
    <p class="small muted">Before the chronicle began, only the main events are known. From the first year you advance, every year is recorded.</p>`;
}
function miniBars(sum) {
  const mc = sum.mood >= 10 ? 'var(--good)' : sum.mood >= -10 ? 'var(--warn)' : 'var(--bad)';
  return `<span class="minibars" title="Mood ${sum.mood}, health ${sum.health}"><i style="height:${Math.round((sum.mood + 100) / 200 * 22) + 2}px;background:${mc}"></i><i style="height:${Math.round(sum.health / 100 * 22) + 2}px;background:var(--male)"></i></span>`;
}
function lifeChart(p) {
  const h = p.hist; const Wd = 640, H = 120, pad = 26;
  const x0 = h[0][0], x1 = h[h.length - 1][0];
  const X = yv => pad + (x1 === x0 ? 0 : (yv - x0) / (x1 - x0)) * (Wd - pad - 8);
  const Ym = v => 8 + (100 - v) / 200 * (H - 30);
  const Yh = v => 8 + (100 - v) / 100 * (H - 30);
  const line = (fn, idx) => h.map((r, i) => `${i ? 'L' : 'M'}${X(r[0]).toFixed(1)},${fn(r[idx]).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="Mood and health over the years">
    <line x1="${pad}" x2="${Wd - 8}" y1="${Ym(0)}" y2="${Ym(0)}" stroke="var(--line)" stroke-dasharray="3 3"/>
    <path d="${line(Yh, 2)}" fill="none" stroke="var(--male)" stroke-width="2"/>
    <path d="${line(Ym, 1)}" fill="none" stroke="var(--accent)" stroke-width="2.2"/>
    <text x="${pad}" y="${H - 6}" font-size="10" fill="var(--muted)">${x0}</text><text x="${Wd - 8}" y="${H - 6}" font-size="10" text-anchor="end" fill="var(--muted)">${x1}</text>
    <text x="${pad + 4}" y="14" font-size="10" fill="var(--accent)">mood</text><text x="${pad + 40}" y="14" font-size="10" fill="var(--male)">health</text></svg>`;
}
function personTraits(p) {
  const era = eraOf(W);
  const apt = Object.entries(p.aptitude).filter(([k]) => k !== 'magic' || W.era === 'fantasy').sort((a, b) => b[1] - a[1]).slice(0, 4);
  const aptName = { farming: 'farming', craft: 'making things', trade: 'trading & dealing', learning: 'book learning', healing: 'caring & healing', fighting: 'fighting', animals: 'animals', outdoors: 'outdoor life', arts: 'music & art', leadership: 'leading others', labor: 'hard labour', magic: 'magic' };
  const orient = { straight: p.sex === 'm' ? 'women' : 'men', gay: p.sex === 'm' ? 'men' : 'women', bisexual: 'men and women' }[p.orientation];
  const h = W.households[p.household];
  const m = p.mind || {};
  const grief = p.hist && p.hist.length ? p.hist[p.hist.length - 1][4] : 0;
  const bar = (label, v, max, bad, word) => `<div class="trait"><span>${label}</span><span class="bar"><i style="width:${clamp(v / max * 100, 0, 100)}%;background:${bad ? 'var(--bad)' : 'var(--accent)'}"></i></span><span class="small muted">${word}</span></div>`;
  const skills = p.skills ? Object.entries(p.skills).filter(([k]) => k !== 'magic' || W.era === 'fantasy').sort((a, b) => b[1] - a[1]).slice(0, 6) : [];
  const lvl = v => v >= 80 ? 'master' : v >= 60 ? 'expert' : v >= 40 ? 'capable' : v >= 20 ? 'learning' : 'novice';
  const mindBlock = p.status === 'resident' && p.mind ? `<div class="card" style="margin-bottom:1rem"><h3>State of mind (${esc(yl(W.year - 1))})</h3>
    ${bar('Mood', (m.mood || 0) + 100, 200, (m.mood || 0) < -20, (m.mood >= 35 ? 'happy' : m.mood >= 12 ? 'content' : m.mood >= -8 ? 'so-so' : m.mood >= -30 ? 'unhappy' : 'miserable') + ` (${m.mood})`)}
    ${bar('Under strain', m.stress || 0, 100, (m.stress || 0) > 55, m.stress)}
    ${bar('Grief', grief * 50, 100, grief > 0.6, grief > 1 ? 'deep' : grief > 0.4 ? 'heavy' : grief > 0.1 ? 'some' : 'none')}
    ${bar('Haunted by the past', m.trauma || 0, 100, (m.trauma || 0) > 40, m.trauma)}
    ${bar('Guilt', m.guilt || 0, 100, (m.guilt || 0) > 30, m.guilt)}
    ${bar('Drinking', m.drink || 0, 100, (m.drink || 0) > 60, m.drink > 60 ? 'a problem' : m.drink > 30 ? 'more than is good' : 'little or none')}
    ${m.depressed ? `<p class="small"><span class="pill bad">depressed since ${yl(m.depressed)}</span></p>` : ''}
    ${p.preg ? `<p class="small"><span class="pill acc">expecting a baby (${SEASONS[p.preg.s].toLowerCase()} ${yl(p.preg.y)})</span>${showSecrets && p.preg.secret ? ` — the real father is ${plink(p.preg.secret)}` : ''}</p>` : ''}
    ${p.affair && showSecrets ? `<p class="small"><span class="pill warn">secret affair with</span> ${plink(p.affair)}</p>` : ''}
    </div>` : '';
  const skillBlock = skills.length ? `<h3 style="margin-top:1rem">Skills</h3>${skills.map(([k, v]) => `<div class="trait"><span>${cap(aptName[k])}</span><span class="bar"><i style="width:${v}%"></i></span><span class="small muted">${lvl(v)} (${Math.round(v)})</span></div>`).join('')}` : '';
  return `${mindBlock}<div class="grid g2"><div>
    <h3>Personality</h3>
    ${Object.keys(TRAIT_NAMES).map(k => `<div class="trait"><span>${TRAIT_NAMES[k]}</span><span class="bar"><i style="width:${p.traits[k]}%"></i></span><span class="small muted">${traitWord(k, p.traits[k])}</span></div>`).join('')}
    <div class="trait"><span>Quick-witted</span><span class="bar"><i style="width:${p.intellect}%"></i></span><span class="small muted">${p.intellect}/100</span></div>
    <div class="trait"><span>Health</span><span class="bar"><i style="width:${p.health}%;background:${p.health < 40 ? 'var(--bad)' : 'var(--good)'}"></i></span><span class="small muted">${p.health}/100</span></div>
    ${skillBlock}
    <h3 style="margin-top:1rem">Natural talents</h3>
    ${apt.map(([k, v]) => `<div class="trait"><span>${aptName[k]}</span><span class="bar"><i style="width:${v}%"></i></span><span class="small muted">${v}/100</span></div>`).join('')}
  </div><div>
    <dl class="kv">
      <dt>Looks</dt><dd>${esc(p.appearance.build)}, ${p.appearance.height} cm, ${esc(p.appearance.hair)} hair, ${esc(p.appearance.eyes)} eyes</dd>
      <dt>Quirk</dt><dd>${esc(cap(p.quirk.replace(/\btheir\b/g, hisHer(p))))}</dd>
      <dt>Enjoys</dt><dd>${esc(p.hobbies.join(', '))}</dd>
      <dt>Hopes</dt><dd>${esc(cap(p.goal))}</dd>
      <dt>Fears</dt><dd>${esc(cap(p.fear.replace(/\btheir\b/g, hisHer(p))))}</dd>
      <dt>Cares most about</dt><dd>${esc(p.values.join(' and '))}</dd>
      <dt>Faith</dt><dd>${esc(p.faith)}</dd>
      <dt>Languages</dt><dd>${esc(p.languages.join(', '))}</dd>
      <dt>Schooling</dt><dd>${esc(p.education || (p.literate ? 'Can read and write' : '—'))}</dd>
      <dt>Health issues</dt><dd>${esc(p.conditions.join(', ') || 'none known')}</dd>
      <dt>Attracted to</dt><dd>${esc(orient)}</dd>
      ${p.homeland ? `<dt>Home on Earth</dt><dd>${esc(p.homeland)}</dd>` : ''}
      ${p.formerOccupation ? `<dt>Old-world job</dt><dd>${esc(p.formerOccupation)}</dd>` : ''}
      ${h && p.status === 'resident' && W.era !== 'dropped' ? `<dt>Household is</dt><dd>${wealthWord(h.wealth)} (${h.wealth}/100)${h.home ? `, lives in ${esc(h.home)} (${h.owned ? 'owned' : 'rented'})` : ''}</dd>` : ''}
      ${p.income ? `<dt>Earned last year</dt><dd>${fmtMoney(p.income)}</dd>` : ''}
      ${p.hermit ? `<dt>Why alone</dt><dd>${esc(cap(p.hermitReason))}</dd>` : ''}
      ${p.memories.length ? `<dt>Carries with them</dt><dd>${p.memories.slice(-6).map(m => `${linkify('@' + m.who)} — ${esc(m.note)} (${yl(m.y)})`).join('<br>')}</dd>` : ''}
    </dl>
  </div></div>`;
}

// ---------- households ----------
function viewHouseholds() {
  const y = W.year;
  let hh = Object.values(W.households).filter(h => h.members.some(id => { const p = W.people[id]; return p && p.status === 'resident' && p.died == null; }));
  if (ui.hhMeans) hh = hh.filter(h => wealthWord(h.wealth) === ui.hhMeans);
  const sortKey = ui.hhSort || 'name';
  hh.sort((a, b) => sortKey === 'size' ? b.members.length - a.members.length : sortKey === 'wealth' ? b.wealth - a.wealth : sortKey === 'district' ? a.district.localeCompare(b.district) : a.name.localeCompare(b.name));
  return `<h1>Households</h1><p class="muted">${hh.length} homes. ${W.era === 'dropped' ? 'In the empty world a "household" is whoever shares a shelter.' : ''}</p>
  <div class="filters small">Sort by: ${[['name', 'name'], ['size', 'size'], ['wealth', 'wealth'], ['district', 'area']].map(([k, l]) => `<button class="small ${sortKey === k ? 'primary' : ''}" data-hhsort="${k}">${l}</button>`).join(' ')}
    ${W.era !== 'dropped' ? `&nbsp; Means: <select id="hhMeans"><option value="">all</option>${['destitute', 'poor', 'getting by', 'comfortable', 'well-off', 'rich'].map(w => `<option ${ui.hhMeans === w ? 'selected' : ''}>${w}</option>`).join('')}</select>` : ''}</div>
  <table class="list"><thead><tr><th>Household</th><th>Head</th><th>People</th><th>Area</th>${W.era !== 'dropped' ? '<th>Home</th><th>Means</th><th>Savings / debt</th>' : ''}</tr></thead><tbody>
  ${hh.map(h => `<tr class="rowlink" data-hid="${h.id}"><td><a>${esc(cap(h.name))}</a></td><td>${h.head ? plink(h.head) : ''}</td><td>${h.members.length}</td><td>${esc(h.district)}</td>${W.era !== 'dropped' ? `<td class="small">${esc(h.home || '')}${h.home ? (h.owned ? ' (owned)' : ' (rented)') : ''}</td><td>${wealthWord(h.wealth)}</td><td class="small" style="color:${(h.savings || 0) < 0 ? 'var(--bad)' : 'inherit'}">${h.savings != null ? fmtMoney(h.savings) : ''}</td>` : ''}</tr>`).join('')}
  </tbody></table>`;
}
afterRender.households = () => { document.querySelectorAll('[data-hhsort]').forEach(b => b.onclick = () => { ui.hhSort = b.dataset.hhsort; render(); }); if ($('#hhMeans')) $('#hhMeans').onchange = e => { ui.hhMeans = e.target.value || null; render(); }; };
function viewHousehold({ id }) {
  const h = W.households[id]; if (!h) return '<div class="card">Household not found.</div>';
  const head = W.people[h.head];
  const feuds = Object.values(W.feuds).filter(f => f.sideA.id === h.id || f.sideB.id === h.id);
  return `<div class="card"><h1>${esc(cap(h.name))}</h1>
    <p class="muted">${esc(h.district)} · ${W.era !== 'dropped' ? `${wealthWord(h.wealth)} (${h.wealth}/100) · ` : ''}set up in ${yl(h.founded)}</p>
    <div class="chips">${h.members.map(mid => chip(mid, `${head && mid !== head.id ? (relationWord(W, head, W.people[mid]) || (W.era === 'dropped' ? 'shelter-mate' : 'lodger')) : 'head of household'} · ${ageText(W.people[mid])}`)).join('')}</div>
    ${head ? `<p class="small"><a data-treefrom="${head.id}">See ${esc(head.first)}'s family tree →</a></p>` : ''}
    ${householdMoney(h)}
    ${householdEdit(h)}
    ${feuds.length ? `<h3 style="margin-top:1rem">Feuds</h3>${feuds.map(f => { const other = f.sideA.id === h.id ? f.sideB : f.sideA; return `<p>Feuding with <a data-hid="${other.id}">${esc(other.name)}</a> since ${yl(f.since)}, over ${esc(f.reason)}. <span class="pill bad">bitterness ${f.intensity}/100</span></p>`; }).join('')}` : ''}
  </div>`;
}

// ---------- groups ----------
function viewGroups() {
  const gs = Object.values(W.groups).sort((a, b) => b.members.length - a.members.length);
  const fams = {};
  for (const p of residentsAlive(W)) (fams[p.last] = fams[p.last] || []).push(p.id);
  const famList = Object.entries(fams).filter(([, ids]) => ids.length >= 3).sort((a, b) => b[1].length - a[1].length);
  return `<h1>Groups</h1>
  <div class="card"><h3>Friend groups and circles</h3>
  ${gs.length ? `<table class="list"><thead><tr><th>Group</th><th>Members</th><th>Since</th><th>Started by</th></tr></thead><tbody>${gs.map(g => `<tr class="rowlink" data-gid="${g.id}"><td><a>${esc(g.name)}</a></td><td>${g.members.length}</td><td>${yl(g.since)}</td><td>${g.founder ? plink(g.founder) : '<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No groups yet.</p>'}</div>
  <div class="card"><h3>Families by surname</h3><p class="small muted">Everyone living here who shares a surname (married names included).</p>
  <div class="chips">${famList.map(([n, ids]) => `<span class="chip" data-filter='${esc(JSON.stringify({ ids, label: 'the ' + n + ' family' }))}'><span class="nm">${esc(n)}</span><span class="sub">${ids.length} people</span></span>`).join('')}</div></div>`;
}
function viewGroup({ id }) {
  const g = W.groups[id]; if (!g) return '<div class="card">Group not found.</div>';
  const inner = []; const M = g.members;
  for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) { const r = getRel(W, M[i], M[j]); if (r) inner.push(r); }
  const bad = inner.filter(r => r.score < 0);
  return `<div class="card"><h1>${esc(g.name)}</h1><p class="muted">${g.members.length} members · together since ${yl(g.since)}${g.founder ? ' · started around ' + plink(g.founder) : ''}</p>
  <div class="chips">${g.members.map(mid => chip(mid, W.people[mid].occupation || ageText(W.people[mid]))).join('')}</div>
  <h3 style="margin-top:1rem">Inside the group</h3><p class="small">${inner.filter(r => r.score > 0).length} friendships${bad.length ? `, and ${bad.length} sore spots:` : ', no quarrels.'}</p>
  ${bad.map(r => `<div class="small">• ${plink(r.a)} and ${plink(r.b)} — ${esc(r.type)}: ${esc(r.reason)}</div>`).join('')}
  <h3 style="margin-top:1rem">Map of the group</h3>${groupMap(g)}</div>`;
}

// ---------- grudges ----------
function viewGrudges() {
  const feuds = Object.values(W.feuds);
  const bad = Object.values(W.rels).filter(r => r.score < 0 && r.type !== 'ex' && !r.feud && W.people[r.a].status === 'resident' && W.people[r.b].status === 'resident').sort((a, b) => a.score - b.score);
  return `<h1>Feuds & grudges</h1>
  <div class="card"><h3>Family feuds (${feuds.length})</h3>
  ${feuds.map(f => `<div style="margin-bottom:.7rem"><b><a data-hid="${f.sideA.id}">${esc(cap(f.sideA.name))}</a> against <a data-hid="${f.sideB.id}">${esc(f.sideB.name)}</a></b> <span class="pill ${f.status === 'active' ? 'bad' : ''}">${f.status === 'active' ? 'bitterness ' + f.intensity + '/100' : 'ended ' + yl(f.ended)}</span><br><span class="small">Since ${yl(f.since)}, over ${linkify(f.reason)}. ${Object.values(W.rels).filter(r => r.feud === f.id).length} people on the two sides were at odds.</span>
    ${(f.history || []).length ? `<details><summary class="small">What happened (${f.history.length})</summary>${f.history.map(h => `<div class="small">${yl(h.y)}: ${linkify(h.text)}</div>`).join('')}</details>` : ''}
    <details class="feudmap"><summary class="small">Map of the two households</summary>${feudMap(f)}</details></div>`).join('') || '<p class="muted">No family feuds.</p>'}</div>
  <div class="card"><h3>Map of bad blood</h3>${grudgeMap()}</div>
  <div class="card"><h3>Personal grudges and broken ties (${bad.length})</h3>
  ${bad.map(r => `<div class="relrow"><span>${plink(r.a)} &amp; ${plink(r.b)}</span><span>${scoreBar(r.score)}</span><span class="small"><span class="pill ${r.score <= -55 ? 'bad' : 'warn'}">${esc(r.type)}</span> ${esc(r.reason)}</span><span class="small muted">since ${yl(r.since)}</span></div>`).join('') || '<p class="muted">None.</p>'}
  <p class="small muted" style="margin-top:.6rem">From Stage 2, each year these can flare up, cool down, or be forgiven — with the reasons recorded.</p></div>`;
}

// ---------- work ----------
function viewWork() {
  const wps = Object.values(W.workplaces).filter(w => w.members.some(id => W.people[id] && W.people[id].status === 'resident')).sort((a, b) => b.members.length - a.members.length);
  return `<h1>Places of work</h1><p class="muted">${wps.length} places. People who work on their own (peddlers, midwives, drivers…) are listed under People by their work.</p>
  <table class="list"><thead><tr><th>Place</th><th>People</th><th>Kinds of work</th><th>Owner</th></tr></thead><tbody>
  ${wps.map(w => `<tr class="rowlink" data-wid="${w.id}"><td><a>${esc(cap(w.name))}</a></td><td>${w.members.length}</td><td class="small">${esc(w.occ.join(', '))}</td><td>${w.owner ? plink(w.owner) : '<span class="muted small">shared</span>'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No workplaces yet.</td></tr>'}
  </tbody></table>`;
}
function viewWorkplace({ id }) {
  const w = W.workplaces[id]; if (!w) return '<div class="card">Not found.</div>';
  return `<div class="card"><h1>${esc(cap(w.name))}</h1><p class="muted">${w.members.length} people${w.owner ? ' · run by ' + plink(w.owner) : ''}</p>
  <div class="chips">${w.members.map(mid => chip(mid, W.people[mid].occupation)).join('')}</div></div>`;
}

// ---------- settings (read-only in Stage 1) ----------
function viewSettings() {
  const S = W.settings; const era = eraOf(W);
  return `<h1>Era settings</h1><p class="muted">The numbers this community was created with. They were starting estimates — the ones changed from the defaults are marked. Changing them for future years comes with the editing tools in Stage 5.</p>
  <div class="card"><table class="settings-table">${Object.entries(SETTING_INFO).map(([k, info]) => { const v = S[k], d = era.settings[k]; const show = info.unit === 'yes/no' ? (v ? 'yes' : 'no') : info.unit === 'chance' || info.unit === 'share' ? (v * 100).toFixed(v < 0.01 ? 2 : 1) + '%' : v; return `<tr><td>${esc(info.label)}</td><td><b>${esc(show)}</b> ${v !== d ? '<span class="pill warn">changed</span>' : ''}</td></tr>`; }).join('')}
  ${W.options && W.options.gathering ? `<tr><td>Who was taken together</td><td><b>${esc((era.dropOptions.gathering.choices.find(c => c[0] === W.options.gathering) || [])[1])}</b></td></tr><tr><td>Year one has perfect weather</td><td><b>${W.options.perfectFirstYear ? 'yes' : 'no'}</b></td></tr>` : ''}
  <tr><td>Random seed</td><td><b>${W.seed}</b></td></tr></table></div>`;
}

// ---------- saving and opening ----------
function fileNameFor() { return `${W.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'community'}-${W.year}.town.json`; }
async function saveFile(asNew) {
  const text = JSON.stringify(W);
  try {
    if (window.showSaveFilePicker) {
      if (!fileHandle || asNew) fileHandle = await window.showSaveFilePicker({ suggestedName: fileNameFor(), types: [{ description: 'Town Chronicle save', accept: { 'application/json': ['.json'] } }] });
      const wr = await fileHandle.createWritable(); await wr.write(text); await wr.close();
      dirty = false; renderFrame(); toast(`Saved to ${fileHandle.name}`);
      return;
    }
  } catch (err) { if (err && err.name === 'AbortError') return; console.warn('Save picker failed, downloading instead', err); }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = fileNameFor(); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  dirty = false; renderFrame(); toast(`Downloaded ${fileNameFor()}`);
}
function openFile() {
  if (dirty && W && !confirm('You have unsaved changes. Open another file anyway?')) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const done = busy(`Opening ${f.name}…`);
    const rd = new FileReader();
    rd.onload = () => {
      try { const data = JSON.parse(rd.result); validateWorld(data); W = data; upgradeWorld(W); undoStack.length = 0; dirty = false; fileHandle = null; nav.stack = []; nav.cur = null; render(); toast(`Opened ${W.name} (${yl(W.year)})`); }
      catch (err) { alert('Could not open that file: ' + err.message); }
      done();
    };
    rd.onerror = () => { done(); alert('Could not read that file.'); };
    rd.readAsText(f);
  };
  inp.click();
}
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });


afterRender.group = () => vizWire();
afterRender.grudges = () => { vizWire(); document.querySelectorAll('details.feudmap').forEach(d => d.addEventListener('toggle', () => { if (d.open) vizWire(); })); };
afterRender.household = () => document.querySelectorAll('[data-treefrom]').forEach(c => c.onclick = () => { ui.personTab = 'tree'; go('person', { id: +c.dataset.treefrom }); });
document.addEventListener('click', e => { const t = e.target.closest('[data-ptab-go]'); if (t) { ui.personTab = t.dataset.ptabGo; render(); } });
