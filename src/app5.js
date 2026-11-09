// ================= Stage 3 page code: the census =================
const DRILL_NEXT = { work: 'sector', sector: 'occupation', occupation: 'workplace', workplace: 'sex', agegroup: 'age', age: 'sex', area: 'hhtype', hhtype: 'hhsize', marital: 'agegroup', means: 'work', health: 'conditions', mood: 'mind', standing: 'record', origin: 'culture', culture: 'faith' };
function censusDim(k) { return CENSUS_DIMS.find(d => d.key === k); }
function censusMatch(f) {
  let ppl = censusPeople(W);
  for (const [k, v] of Object.entries(f)) { const d = censusDim(k); ppl = ppl.filter(p => { const x = d.fn(W, p); return d.multi ? (x || []).includes(v) : x === v; }); }
  return ppl;
}
function censusGroups(d, ppl) {
  const c = new Map();
  for (const p of ppl) { let x = d.fn(W, p); if (x == null) continue; for (const v of (d.multi ? x : [x])) { if (!c.has(v)) c.set(v, []); c.get(v).push(p); } }
  let rows = [...c.entries()];
  if (d.order === 'age') rows.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  else if (d.order === 'num') rows.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  else if (Array.isArray(d.order)) { const ix = v => { const i = d.order.indexOf(v); return i < 0 ? 99 : i; }; rows.sort((a, b) => ix(a[0]) - ix(b[0])); }
  else rows.sort((a, b) => b[1].length - a[1].length);
  return rows;
}
function viewCensus(params) {
  const f = params.f || {};
  const ppl = censusMatch(f);
  const used = Object.keys(f);
  const avail = CENSUS_DIMS.filter(d => !used.includes(d.key) && !(d.key === 'means' && W.era === 'dropped') && !(['standing', 'record'].includes(d.key) && !W.soc));
  let show = params.show && !used.includes(params.show) ? params.show : null;
  if (!show) { const last = used[used.length - 1]; show = (last && DRILL_NEXT[last] && !used.includes(DRILL_NEXT[last]) && (DRILL_NEXT[last] !== 'sector' || f.work === 'In work')) ? DRILL_NEXT[last] : (avail[0] || {}).key; }
  const d = censusDim(show);
  const rows = d ? censusGroups(d, ppl) : [];
  const max = Math.max(1, ...rows.map(r => r[1].length));
  const crumbs = [`<a data-census='{}'>Everyone (${censusPeople(W).length})</a>`];
  let acc = {};
  for (const k of used) { acc = Object.assign({}, acc, { [k]: f[k] }); crumbs.push(`<a data-census='${esc(JSON.stringify(acc))}'>${esc(censusDim(k).label)}: <b>${esc(f[k])}</b> (${censusMatch(acc).length})</a>`); }
  const label = used.map(k => `${censusDim(k).label.toLowerCase()}: ${f[k]}`).join(', ') || 'everyone';
  const total = ppl.length;
  const prev = W.censusDetail && W.censusDetail[W.year - 1];
  return `<h1>Census of ${esc(W.name)}, ${esc(yl(W.year))}</h1>
  <p class="muted">Everyone living here${W.era === 'dropped' ? '' : ' (and anyone in prison)'}, counted every way. Click any line to look inside it; keep clicking to go down to the people themselves.</p>
  <div class="card">
    <div class="crumbs" style="flex-wrap:wrap">${crumbs.join(' <span class="muted">›</span> ')}</div>
    <div style="display:flex;align-items:baseline;gap:1rem;flex-wrap:wrap"><span style="font-family:var(--serif);font-size:2rem">${total}</span><span class="muted">${total === 1 ? 'person' : 'people'}${used.length ? ' match' : ''}</span>
      <button class="small primary" id="cenList" ${total ? '' : 'disabled'}>List these ${total} people</button></div>
    <div class="filters small" style="margin-top:.8rem">Break down by: ${avail.map(x => `<button class="small ${x.key === show ? 'primary' : ''}" data-cdim="${x.key}">${esc(x.label)}</button>`).join(' ')}</div>
    ${d ? `<table class="list"><thead><tr><th>${esc(d.label)}</th><th style="width:90px">People</th><th style="width:70px">Share</th><th></th><th style="width:70px">Men</th><th style="width:70px">Women</th></tr></thead><tbody>
      ${rows.map(([v, list]) => { const m = list.filter(p => p.sex === 'm').length; return `<tr class="rowlink" data-cadd='${esc(JSON.stringify({ k: d.key, v }))}'><td><a>${esc(v)}</a></td><td>${list.length}</td><td>${total ? Math.round(list.length / total * 100) : 0}%</td><td style="width:35%"><span class="bar" style="display:block;height:10px;background:var(--soft);border-radius:4px"><i style="display:block;height:100%;width:${(list.length / max * 100).toFixed(1)}%;background:var(--accent);border-radius:4px"></i></span></td><td>${m}</td><td>${list.length - m}</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Nobody here falls into this.</td></tr>'}
      </tbody></table>${d.multi ? '<p class="small muted">A person can be counted on more than one line here.</p>' : ''}` : ''}
  </div>
  ${censusTrends()}`;
}
afterRender.census = p => {
  const f = (p && p.f) || {};
  document.querySelectorAll('[data-cdim]').forEach(b => b.onclick = () => { nav.cur = { view: 'census', params: { f, show: b.dataset.cdim } }; render(); });
  document.querySelectorAll('[data-cadd]').forEach(r => r.onclick = () => { const { k, v } = JSON.parse(r.dataset.cadd); go('census', { f: Object.assign({}, f, { [k]: v }) }); });
  document.querySelectorAll('[data-census]').forEach(a => a.onclick = e => { e.preventDefault(); go('census', { f: JSON.parse(a.dataset.census) }); });
  if ($('#cenList')) $('#cenList').onclick = () => { const ids = censusMatch(f).map(q => q.id); ui.peopleFilter = { ids, label: Object.entries(f).map(([k, v]) => `${censusDim(k).label.toLowerCase()}: ${v}`).join(', ') || 'everyone in the census', status: 'all' }; ui.peoplePage = 0; go('people'); };
};
function censusTrends() {
  const cd = W.censusDetail || {};
  const ys = Object.keys(cd).map(Number).sort((a, b) => b - a);
  if (ys.length < 2) return `<div class="card"><h3>Census over the years</h3><p class="muted small">A census is taken at the start of every year. Advance a year to start seeing changes.</p></div>`;
  const pct = (s, dim, keys) => { const c = s.dims[dim] || {}; const tot = Object.values(c).reduce((a, b) => a + b, 0) || 1; return Math.round(keys.reduce((a, k) => a + (c[k] || 0), 0) / tot * 100); };
  const cols = [
    ['People', s => s.n], ['Households', s => s.households], ['Median age', s => s.medianAge],
    ['Children', s => (s.dims.agegroup || {})['Children (0–15)'] || 0], ['Elders', s => (s.dims.agegroup || {})['Elders (65+)'] || 0],
    ['In work', s => (s.dims.work || {})['In work'] || 0], ['Out of work', s => (s.dims.work || {})['Out of work or odd jobs'] || 0],
    ['Married %', s => pct(s, 'marital', ['Married', 'Living with a partner', 'Married (spouse left on Earth)'])],
    ...(W.era !== 'dropped' ? [['Poor %', s => pct(s, 'means', ['destitute', 'poor'])]] : []),
    ['Happy %', s => pct(s, 'mood', ['Happy', 'Content'])], ['Poor health %', s => pct(s, 'health', ['Poor', 'Very poor'])],
    ...(W.soc ? [['With a record', s => (s.dims.record || {})['Has a record'] || 0]] : [])
  ];
  return `<div class="card"><h3>Census over the years</h3><p class="small muted">Taken at the start of each year.</p>
    <div style="overflow-x:auto"><table class="list"><thead><tr><th>Year</th>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>
    ${ys.map(y => { const s = cd[y]; return `<tr><td>${esc(yl(y))}</td>${cols.map(c => `<td>${c[1](s)}</td>`).join('')}</tr>`; }).join('')}
    </tbody></table></div></div>`;
}
