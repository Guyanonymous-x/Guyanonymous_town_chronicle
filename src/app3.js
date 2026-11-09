// ================= Stage 2b page code: money, land, weather =================
function fmtMoney(v) {
  const E = ECON[W.era]; if (!E || v == null) return '';
  const neg = v < 0; v = Math.abs(Math.round(v));
  let s;
  if (W.era === 'medieval') { const l = Math.floor(v / 240), sh = Math.floor((v % 240) / 12), d = v % 12; s = l ? `£${l} ${sh}s` : sh ? `${sh}s ${d}d` : `${d}d`; }
  else if (W.era === 'frontier' || W.era === 'modern') s = '$' + v.toLocaleString();
  else s = `${v.toLocaleString()} ${E.unit}`;
  return neg ? `−${s} (debt)` : s;
}
function householdMoney(h) {
  if (W.era === 'dropped' || h.savings == null) return '';
  const m = h.money || [];
  const last = m[m.length - 1];
  const rows = m.slice(-12).reverse();
  let chart = '';
  if (m.length > 2) {
    const Wd = 520, H = 110, pl = 6, pr = 6;
    const vals = m.map(r => r[3] + r[4]);
    const mx = Math.max(...vals, 1), mn = Math.min(...vals, 0);
    const X = i => pl + i / (m.length - 1) * (Wd - pl - pr), Y = v => 8 + (mx - v) / (mx - mn || 1) * (H - 24);
    chart = `<svg viewBox="0 0 ${Wd} ${H}" width="100%"><line x1="${pl}" x2="${Wd - pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line)"/><path d="${vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="${pl}" y="${H - 4}" font-size="10" fill="var(--muted)">${m[0][0]}</text><text x="${Wd - pr}" y="${H - 4}" font-size="10" text-anchor="end" fill="var(--muted)">${m[m.length - 1][0]}</text></svg><p class="small muted">What the household is worth (savings plus home), year by year.</p>`;
  }
  return `<h3 style="margin-top:1rem">Money and home</h3>
    <dl class="kv"><dt>Home</dt><dd>${esc(h.home || '—')} (${h.owned ? 'owned' : 'rented or held from others'})${h.property ? `, worth about ${fmtMoney(h.property)}` : ''}</dd>
    <dt>Savings</dt><dd style="color:${h.savings < 0 ? 'var(--bad)' : 'inherit'}">${fmtMoney(h.savings)}</dd>
    ${last ? `<dt>Last year</dt><dd>earned ${fmtMoney(last[1])}, spent ${fmtMoney(last[2])}</dd>` : ''}
    ${h.onCharity && W.year - h.onCharity <= 2 ? `<dt>Note</dt><dd>Relied on ${W.era === 'modern' || W.era === 'scifi' ? 'public assistance' : 'charity'} in ${yl(h.onCharity)}.</dd>` : ''}</dl>
    ${chart}
    ${rows.length ? `<details><summary>Year by year</summary><table class="list" style="margin-top:.4rem"><thead><tr><th>Year</th><th>Earned</th><th>Spent</th><th>Savings</th><th>Home worth</th></tr></thead><tbody>${rows.map(r => `<tr><td>${yl(r[0])}</td><td>${fmtMoney(r[1])}</td><td>${fmtMoney(r[2])}</td><td>${fmtMoney(r[3])}</td><td>${r[4] ? fmtMoney(r[4]) : '—'}</td></tr>`).join('')}</tbody></table></details>` : ''}`;
}
function wealthCounts() {
  const words = ['destitute', 'poor', 'getting by', 'comfortable', 'well-off', 'rich'];
  const c = Object.fromEntries(words.map(w => [w, 0]));
  for (const h of Object.values(W.households)) if (h.members.some(id => W.people[id] && W.people[id].status === 'resident' && W.people[id].died == null)) c[wealthWord(h.wealth)]++;
  return c;
}
function econOverviewCard() {
  const hist = W.econ && W.econ.history ? W.econ.history : {};
  const ys = Object.keys(hist).map(Number).sort((a, b) => a - b);
  if (W.era === 'dropped') {
    const st = W.settle; if (!st) return '';
    return `<div class="card"><h3>The settlement</h3>${settleBars(st)}<p class="small">${st.discoveries.length} discoveries so far. <a data-navto="economy">See them all →</a></p></div>`;
  }
  if (!ys.length) return '';
  const h = hist[ys[ys.length - 1]];
  const wc = wealthCounts();
  return `<div class="card"><h3>Land and money in ${esc(yl(ys[ys.length - 1]))}</h3>
    <p>Weather: ${h.weather.map((w, i) => `<b>${SEASONS[i]}</b> ${esc(w)}`).join(' · ')}</p>
    <p>Harvest ${pctWord(h.food)} · food prices ${h.price > 1.02 ? 'up ' + Math.round((h.price - 1) * 100) + '%' : h.price < 0.98 ? 'down ' + Math.round((1 - h.price) * 100) + '%' : 'steady'} · trade ${h.economy >= 1.1 ? 'booming' : h.economy >= 0.95 ? 'steady' : h.economy >= 0.8 ? 'slow' : 'in a slump'}${h.famine ? ` · <span class="pill bad">hunger</span>` : ''}</p>
    ${h.pests && h.pests.length ? `<p class="small">Blights: ${esc(h.pests.join(', '))}</p>` : ''}
    <div class="barlist">${Object.entries(wc).map(([k, v]) => `<div class="row click" data-means="${k}"><span class="lab">${cap(k)}</span><span class="bar"><i style="width:${(v / Math.max(1, ...Object.values(wc)) * 100).toFixed(1)}%"></i></span><span class="num">${v}</span></div>`).join('')}</div>
    <p class="small muted">Households by means. <a data-navto="economy">More on the economy →</a></p></div>`;
}
document.addEventListener('click', e => { const m = e.target.closest('[data-means]'); if (m) { e.preventDefault(); ui.hhMeans = m.dataset.means; nav.stack = []; nav.cur = null; go('households'); } });
function pctWord(f) { const p = Math.round(f * 100); return `${p}% of normal${p < 75 ? ' (very poor)' : p < 90 ? ' (poor)' : p > 115 ? ' (plentiful)' : ''}`; }
function settleBars(st) {
  const bar = (l, v, word) => `<div class="trait"><span>${l}</span><span class="bar"><i style="width:${clamp(v * 100, 0, 100)}%;background:${v < 0.6 ? 'var(--bad)' : 'var(--accent)'}"></i></span><span class="small muted">${word}</span></div>`;
  return bar('Food', st.food / 1.5, st.food >= 1 ? 'enough' : st.food >= 0.8 ? 'a little short' : 'not enough') + bar('Shelter', st.shelter, Math.round(st.shelter * 100) + '% built') + bar('Tools', st.tools, Math.round(st.tools * 100) + '%') + bar('Farming', st.farming, st.farming ? Math.round(st.farming * 100) + '%' : 'not yet') + bar('Healing know-how', W.settings.medicine / 0.6, Math.round(W.settings.medicine * 100) + '%');
}
function viewEconomy() {
  const hist = W.econ && W.econ.history ? W.econ.history : {};
  const ys = Object.keys(hist).map(Number).sort((a, b) => b - a);
  if (W.era === 'dropped') {
    const st = W.settle;
    return `<h1>The settlement</h1><p class="muted">There is no money here. What matters is food, shelter, tools and what people work out how to do.</p>
    <div class="grid g2"><div class="card"><h3>Now</h3>${st ? settleBars(st) : ''}</div>
    <div class="card"><h3>Discoveries (${st ? st.discoveries.length : 0})</h3>${st && st.discoveries.length ? st.discoveries.map(d => `<div class="small">• <b>${yl(d.y)}</b>: ${esc(d.name)}${d.by ? ` — ${plink(d.by)}` : ''}</div>`).join('') : '<p class="muted">None yet.</p>'}</div></div>
    <div class="card"><h3>Year by year</h3><table class="list"><thead><tr><th>Year</th><th>Weather</th><th>Food</th><th>Shelter</th><th>Tools</th><th>Farming</th></tr></thead><tbody>${ys.map(y => { const h = hist[y]; return `<tr><td>${yl(y)}</td><td class="small">${h.weather.join(' · ')}</td><td>${Math.round(h.food * 100)}%</td><td>${Math.round(h.shelter * 100)}%</td><td>${Math.round(h.tools * 100)}%</td><td>${Math.round(h.farming * 100)}%</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Advance a year to see this.</td></tr>'}</tbody></table></div>`;
  }
  const live = residentsAlive(W);
  const byJob = {};
  for (const p of live) if (p.occId && p.income) { const j = (byJob[p.occupation] = byJob[p.occupation] || { n: 0, sum: 0 }); j.n++; j.sum += p.income; }
  const jobs = Object.entries(byJob).sort((a, b) => b[1].sum / b[1].n - a[1].sum / a[1].n);
  const hh = Object.values(W.households).filter(h => h.members.some(id => W.people[id] && W.people[id].status === 'resident' && W.people[id].died == null) && h.savings != null);
  const rich = hh.slice().sort((a, b) => (b.savings + (b.property || 0)) - (a.savings + (a.property || 0))).slice(0, 8);
  const debt = hh.filter(h => h.savings < 0).sort((a, b) => a.savings - b.savings).slice(0, 8);
  const wc = wealthCounts();
  const lastY = ys[0], last = hist[lastY];
  // food and trade over time
  let chart = '';
  const asc = ys.slice().reverse();
  if (asc.length > 1) {
    const Wd = 620, H = 140, pl = 30, pr = 8;
    const X = i => pl + i / (asc.length - 1) * (Wd - pl - pr), Y = v => 8 + (1.6 - v) / 1.4 * (H - 26);
    const line = (k, col) => `<path d="${asc.map((y, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(clamp(hist[y][k], 0.2, 1.6)).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2"/>`;
    chart = `<svg viewBox="0 0 ${Wd} ${H}" width="100%"><line x1="${pl}" x2="${Wd - pr}" y1="${Y(1)}" y2="${Y(1)}" stroke="var(--line)" stroke-dasharray="3 3"/><text x="${pl - 4}" y="${Y(1) + 3}" font-size="9" text-anchor="end" fill="var(--muted)">normal</text>${line('food', 'var(--good)')}${line('economy', 'var(--accent)')}${line('price', 'var(--bad)')}<text x="${pl}" y="${H - 4}" font-size="10" fill="var(--muted)">${asc[0]}</text><text x="${Wd - pr}" y="${H - 4}" font-size="10" text-anchor="end" fill="var(--muted)">${asc[asc.length - 1]}</text></svg>
      <p class="small"><span style="color:var(--good)">■</span> harvest &nbsp; <span style="color:var(--accent)">■</span> trade &nbsp; <span style="color:var(--bad)">■</span> food prices — compared with a normal year</p>`;
  }
  return `<h1>Economy and land</h1>
  <p class="muted">Money is in ${esc(ECON[W.era].unit)}. Amounts are rough estimates for the setting, not historical fact. A poor crop cuts the earnings of the people who grow it and of everyone who needs it (no apples, no cider), and raises food prices for all.</p>
  ${chart ? `<div class="card"><h3>Good years and bad</h3>${chart}</div>` : ''}
  <div class="grid g2">
    <div class="card"><h3>Households by means</h3><div class="barlist">${Object.entries(wc).map(([k, v]) => `<div class="row click" data-means="${k}"><span class="lab">${cap(k)}</span><span class="bar"><i style="width:${(v / Math.max(1, ...Object.values(wc)) * 100).toFixed(1)}%"></i></span><span class="num">${v}</span></div>`).join('')}</div></div>
    <div class="card"><h3>${last ? 'Hardest hit and best off in ' + esc(yl(lastY)) : 'Trades'}</h3>
      ${last && last.hardHit && last.hardHit.length ? `<p class="small"><b>Bad year:</b> ${last.hardHit.map(h => `<a data-filter='${esc(JSON.stringify({ occupation: h.job }))}'>${esc(h.job)}</a> (${h.n}, earnings ${h.m}%)`).join(', ')}</p>` : '<p class="small muted">No trade had a really bad year.</p>'}
      ${last && last.goodYear && last.goodYear.length ? `<p class="small"><b>Good year:</b> ${last.goodYear.map(h => `<a data-filter='${esc(JSON.stringify({ occupation: h.job }))}'>${esc(h.job)}</a> (${h.n}, earnings ${h.m}%)`).join(', ')}</p>` : ''}
    </div>
    <div class="card"><h3>Richest households</h3>${rich.map(h => `<div class="small">• <a data-hid="${h.id}">${esc(cap(h.name))}</a> — ${fmtMoney(h.savings + (h.property || 0))}</div>`).join('')}</div>
    <div class="card"><h3>Deepest in debt</h3>${debt.length ? debt.map(h => `<div class="small">• <a data-hid="${h.id}">${esc(cap(h.name))}</a> — ${fmtMoney(h.savings)}</div>`).join('') : '<p class="muted small">Nobody is in debt.</p>'}</div>
  </div>
  <div class="card"><h3>Average earnings by work (last year)</h3>
    <table class="list"><thead><tr><th>Work</th><th>People</th><th>Average earnings</th></tr></thead><tbody>${jobs.map(([k, v]) => `<tr class="rowlink" data-filter='${esc(JSON.stringify({ occupation: k }))}'><td><a>${esc(k)}</a></td><td>${v.n}</td><td>${fmtMoney(v.sum / v.n)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Advance a year to see earnings.</td></tr>'}</tbody></table></div>
  <div class="card"><h3>Weather and harvests, year by year</h3>
    <table class="list"><thead><tr><th>Year</th><th>Spring</th><th>Summer</th><th>Autumn</th><th>Winter</th><th>Harvest</th><th>Prices</th><th>Trade</th><th>Blights</th></tr></thead><tbody>
    ${ys.map(y => { const h = hist[y]; return `<tr><td>${yl(y)}</td>${h.weather.map(w => `<td class="small">${esc(w)}</td>`).join('')}<td>${Math.round(h.food * 100)}%${h.famine ? ' <span class="pill bad">hunger</span>' : ''}</td><td>${Math.round(h.price * 100)}%</td><td>${Math.round(h.economy * 100)}%</td><td class="small">${esc((h.pests || []).join(', '))}</td></tr>`; }).join('') || '<tr><td colspan="9" class="muted">Advance a year to see this.</td></tr>'}
    </tbody></table></div>`;
}
