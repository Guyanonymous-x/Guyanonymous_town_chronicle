// ================= Stage 2a page code: advancing years, history, backups =================
const undoStack = [];          // earlier states kept in memory (newest last)
const UNDO_KEEP = 3;
let backupDir = null, backupLong = true, lastBackup = null, running = false;

// ---------- situations people are in (for filters) ----------
const SITUATIONS = [['unhappy', 'Unhappy'], ['happy', 'Happy'], ['depressed', 'Depressed'], ['grieving', 'Grieving'], ['traumatised', 'Haunted by the past'], ['guilty', 'Carrying guilt'], ['drinking', 'Drinking heavily'], ['poorHealth', 'In poor health'], ['injured', 'Living with an old injury'], ['pregnant', 'Expecting a baby'], ['courting', 'Courting'], ['affair', 'Having a secret affair (secret)'], ['unemployed', 'Out of work'], ['poor', 'Poor or destitute household'], ['debt', 'Household in debt'], ['rich', 'Well-off or rich household'], ['record', 'Has a criminal record'], ['shunned', 'Looked down on or shunned'], ['respected', 'Highly respected'], ['office', 'Holds an office']];
function situationTest(k, p) {
  const m = p.mind || {}; const last = (p.hist || [])[p.hist ? p.hist.length - 1 : 0];
  switch (k) {
    case 'unhappy': return m.mood < -15; case 'happy': return m.mood >= 25;
    case 'depressed': return !!m.depressed; case 'grieving': return last && last[4] > 0.5;
    case 'traumatised': return m.trauma > 35; case 'guilty': return m.guilt > 25;
    case 'drinking': return m.drink > 60; case 'poorHealth': return p.health < 40;
    case 'injured': return p.conditions.some(c => LASTING.includes(c));
    case 'pregnant': return !!p.preg; case 'affair': return !!p.affair && showSecrets;
    case 'courting': return Object.values(W.rels).some(r => r.type === 'courting' && !r.ended && (r.a === p.id || r.b === p.id));
    case 'unemployed': return /Unemployed|Odd jobs/.test(p.occupation || '');
    case 'poor': { const h = W.households[p.household]; return h && W.era !== 'dropped' && h.wealth < 28; }
    case 'debt': { const h = W.households[p.household]; return h && (h.savings || 0) < 0; }
    case 'record': return !!(p.record && p.record.some(r => !r.wrongful));
    case 'shunned': return standingOf(p) < 40;
    case 'respected': return standingOf(p) >= 80;
    case 'office': return !!W.soc && Object.values(W.soc.offices).some(o => o.holders.includes(p.id));
    case 'rich': { const h = W.households[p.household]; return h && W.era !== 'dropped' && h.wealth >= 65; }
  }
  return true;
}
function bioNow(p) {
  if (p.status !== 'resident' || !p.mind) return '';
  const He = cap(heShe(p)), his = hisHer(p); const m = p.mind; const out = [];
  const last = (p.hist || [])[p.hist.length - 1];
  if (!last) return '';
  const court = Object.values(W.rels).find(r => r.type === 'courting' && !r.ended && (r.a === p.id || r.b === p.id));
  if (court) out.push(`${He} is courting @${court.a === p.id ? court.b : court.a}.`);
  if (p.preg) out.push(`${He} is expecting a baby, due in ${SEASONS[p.preg.s].toLowerCase()}.`);
  if (m.depressed) out.push(`${He} has been in a deep low since ${m.depressed}.`);
  else if (m.mood >= 35) out.push(`Life is good for ${himHer(p)} right now.`);
  else if (m.mood <= -30) out.push(`These are dark days for ${himHer(p)}.`);
  if (last[4] > 0.6) { const l = p.memories.filter(x => x.kind === 'loss').pop(); if (l && l.who !== p.id) out.push(`${He} is still grieving @${l.who}.`); }
  if (m.trauma > 45) out.push(`${He} is haunted by what ${heShe(p)} has been through.`);
  if (m.guilt > 35) { const g = p.memories.filter(x => x.kind === 'guilt').pop(); out.push(g ? `${He} carries guilt: ${g.note}.` : `${He} carries a heavy guilt.`); }
  if (m.drink > 60) out.push(`${He} drinks far too much.`);
  return out.join(' ');
}

// ---------- overview additions ----------
function overviewYearCards() {
  const ys = Object.keys(W.chronicle || {}).map(Number).sort((a, b) => a - b);
  if (!ys.length) return `<div class="card"><h3>Ready to begin</h3><p>Press <b>▶ Next year</b> at the top to live through ${esc(yl(W.year))} season by season, or <b>Advance…</b> to run many years. Each year is written into the <a data-navto="history">History</a> and into every person's life story.</p></div>`;
  const last = W.chronicle[ys[ys.length - 1]];
  const st = last.stats;
  return `<div class="grid g2">
    <div class="card"><h3>Last year: ${esc(yl(last.y))}</h3><p class="bio" style="font-size:1rem">${linkify(last.summary)}</p>
      <p class="small muted">${st.illnesses} illnesses · ${st.injuries} injuries · ${st.newFriends} new friendships · ${st.quarrels} quarrels · ${st.reconciled} made peace · ${st.jobsStarted} started work · ${st.retired} retired. <a data-navto="history">Read the whole history →</a></p></div>
    <div class="card"><h3>Through the years</h3>${trendChart()}</div></div>
    ${econOverviewCard()}`;
}
function trendChart() {
  const years = Object.keys(W.census || {}).map(Number).sort((a, b) => a - b);
  const allYs = Object.keys(W.yearStats || {}).map(Number).sort((a, b) => a - b);
  const pop = {};
  for (const y of allYs) if (W.yearStats[y].population != null) pop[y + 1] = W.yearStats[y].population;
  for (const y of years) pop[y] = W.census[y].population;
  const keys = Object.keys(pop).map(Number).sort((a, b) => a - b);
  if (keys.length < 2) return '<p class="muted small">Not enough years yet.</p>';
  const Wd = 520, H = 150, pl = 40, pr = 10, pt = 10, pb = 22;
  const x0 = keys[0], x1 = keys[keys.length - 1];
  const max = Math.max(...keys.map(k => pop[k])) * 1.1;
  const X = y => pl + (y - x0) / (x1 - x0) * (Wd - pl - pr);
  const Y = v => pt + (1 - v / max) * (H - pt - pb);
  const path = keys.map((k, i) => `${i ? 'L' : 'M'}${X(k).toFixed(1)},${Y(pop[k]).toFixed(1)}`).join(' ');
  const start = W.startYear;
  return `<svg viewBox="0 0 ${Wd} ${H}" width="100%" role="img" aria-label="Population over time">
    <rect x="${X(Math.max(x0, start))}" y="${pt}" width="${Math.max(0, X(x1) - X(Math.max(x0, start)))}" height="${H - pt - pb}" fill="var(--accent-soft)" opacity=".6"/>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.2"/>
    <text x="${pl - 4}" y="${Y(max / 1.1) + 4}" font-size="10" text-anchor="end" fill="var(--muted)">${Math.round(max / 1.1)}</text>
    <text x="${pl - 4}" y="${Y(0)}" font-size="10" text-anchor="end" fill="var(--muted)">0</text>
    <text x="${pl}" y="${H - 6}" font-size="10" fill="var(--muted)">${x0}</text><text x="${Wd - pr}" y="${H - 6}" font-size="10" text-anchor="end" fill="var(--muted)">${x1}</text>
    ${start > x0 && start < x1 ? `<text x="${X(start) + 4}" y="${pt + 12}" font-size="10" fill="var(--accent)">chronicle begins</text>` : ''}
  </svg><p class="small muted">Number of people living here. The shaded part is the years you have advanced through; before it is the reconstructed back-history.</p>`;
}
document.addEventListener('click', e => { const n = e.target.closest('[data-navto]'); if (n) { e.preventDefault(); nav.stack = []; nav.cur = null; go(n.dataset.navto); } });

// ---------- advancing ----------
function askYears() {
  if (running) return;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="box" style="font-family:var(--sans);font-size:1rem;max-width:460px">
    <h2>Advance the chronicle</h2>
    <p>How many years should pass? Each year is lived season by season; you can stop at any time.</p>
    <p>${[1, 5, 10, 25, 50, 100].map(n => `<button class="small" data-n="${n}">${n}</button>`).join(' ')} &nbsp; or <input type="number" id="nYears" min="1" max="500" value="10" style="width:80px"> years</p>
    <p class="small muted">Roughly 0.2 seconds a year for 1,000 people; longer as the town grows. ${backupDir ? 'A backup goes to your backup folder at the end' + (backupLong ? ' and every 10 years.' : '.') : 'Tip: choose a backup folder on the Backups page to get automatic backup files.'}</p>
    <p><button class="primary" id="nGo">Start</button> <button id="nCancel">Cancel</button></p></div>`;
  document.body.appendChild(o);
  o.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { o.querySelector('#nYears').value = b.dataset.n; });
  o.querySelector('#nCancel').onclick = () => o.remove();
  o.querySelector('#nGo').onclick = () => { const n = clamp(Math.round(+o.querySelector('#nYears').value || 1), 1, 500); o.remove(); runYears(n); };
}
async function runYears(n) {
  if (running || !W) return;
  running = true;
  undoStack.push({ year: W.year, json: JSON.stringify(W) });
  while (undoStack.length > UNDO_KEEP) undoStack.shift();
  let stop = false;
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="box" style="font-family:var(--sans);font-size:1rem;min-width:380px"><h2 id="advT">Living through ${esc(yl(W.year))}…</h2><div class="progress"><i id="advP" style="width:0%"></i></div><p class="small muted" id="advS"></p>${n > 1 ? '<button id="advStop">Stop after this year</button>' : ''}</div>`;
  document.body.appendChild(o);
  if (o.querySelector('#advStop')) o.querySelector('#advStop').onclick = () => { stop = true; o.querySelector('#advStop').disabled = true; o.querySelector('#advStop').textContent = 'Stopping…'; };
  const from = W.year; let done = 0, err = null;
  await new Promise(r => setTimeout(r, 30));
  try {
    for (let i = 0; i < n && !stop; i++) {
      o.querySelector('#advT').textContent = `Living through ${yl(W.year)}…`;
      const R = advanceYear(W); done++;
      dirty = true;
      o.querySelector('#advP').style.width = (done / n * 100).toFixed(1) + '%';
      o.querySelector('#advS').textContent = `${done} of ${n} years · ${R.births} born, ${R.deaths} died · ${quickCensus(W, W.year).population} people now`;
      if (backupDir && backupLong && n >= 10 && done % 10 === 0 && done < n) await writeBackup('auto');
      await new Promise(r => setTimeout(r, 0));
    }
  } catch (e) { console.error(e); err = e; }
  o.remove(); running = false;
  if (err) { alert('Something went wrong while advancing: ' + err.message + '\nThe years that finished are kept; you can Undo to go back.'); }
  if (backupDir && done) await writeBackup('auto');
  render();
  if (done) toast(done === 1 ? `${yl(from)} is over. ${W.chronicle[from] ? W.chronicle[from].summary.split('. ')[0] + '.' : ''}` : `${done} years passed: ${yl(from)} to ${yl(W.year - 1)}.`, 4000);
}
function undoAdvance() {
  if (!undoStack.length || running) return;
  const snap = undoStack[undoStack.length - 1];
  const lost = W.year - snap.year;
  if (snap.kind === 'edit') { if (!confirm(`Undo the changes and plans you made in ${yl(snap.year)} since the last advance?\n\nEverything you edited or planned after that point is thrown away. Saved files are not touched.`)) return; undoStack.pop(); W = JSON.parse(snap.json); upgradeWorld(W); dirty = true; HIST_CACHE = null; render(); toast('Your recent changes were undone.'); return; }
  if (!confirm(`Go back to the start of ${yl(snap.year)}?\n\nThis will throw away everything that happened in ${lost === 1 ? yl(snap.year) : `${yl(snap.year)} to ${yl(W.year - 1)} (${lost} years)`}: every birth, death, marriage and other event in ${lost === 1 ? 'that year' : 'those years'}.\n\nYour saved files are not touched.`)) return;
  undoStack.pop();
  W = JSON.parse(snap.json); upgradeWorld(W); dirty = true; render(); toast(`Back at the start of ${yl(W.year)}.`);
}

// ---------- backups ----------
async function writeBackup(kind) {
  if (!backupDir) return;
  try {
    const name = `${W.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'community'}-${W.year}-backup.town.json`;
    const fh = await backupDir.getFileHandle(name, { create: true });
    const wr = await fh.createWritable(); await wr.write(JSON.stringify(W)); await wr.close();
    lastBackup = { name, when: new Date().toLocaleTimeString() };
  } catch (e) { console.warn(e); toast('Could not write the backup file: ' + e.message, 4000); }
}
function viewBackups() {
  const canFolder = !!window.showDirectoryPicker;
  return `<h1>Backups</h1>
  <div class="card"><h3>Automatic backup files</h3>
    ${canFolder ? `<p>Choose a folder on your computer. After every advance, the app writes a backup file there named after the community and year (for example <code>${esc(W.name.replace(/\s+/g, '-'))}-${W.year}-backup.town.json</code>). Older backups are never deleted by the app.</p>
      <p><button id="bkDir" class="primary">${backupDir ? 'Change backup folder' : 'Choose backup folder'}</button> ${backupDir ? `<span class="pill good">backing up to “${esc(backupDir.name)}”</span>` : '<span class="pill warn">no folder chosen yet</span>'}</p>
      <label class="small"><input type="checkbox" id="bkLong" ${backupLong ? 'checked' : ''}> During long runs, also back up every 10 years</label>
      ${lastBackup ? `<p class="small muted">Last backup: ${esc(lastBackup.name)} at ${esc(lastBackup.when)}.</p>` : ''}
      <p class="small muted">Your browser asks permission once each time you open the app.</p>`
      : `<p>This browser cannot write to a folder by itself. Use <b>Save</b> regularly, or download one of the restore points below. (Chrome and Edge can make automatic backups.)</p>`}
  </div>
  <div class="card"><h3>Restore points kept in memory</h3>
    <p class="small muted">The app keeps the state from before each of your last ${UNDO_KEEP} advances while this window is open. Closing the window clears them.</p>
    ${undoStack.length ? `<table class="list"><thead><tr><th>Start of year</th><th>Size</th><th></th></tr></thead><tbody>${undoStack.slice().reverse().map((u, i) => { const idx = undoStack.length - 1 - i; return `<tr><td>${esc(yl(u.year))}</td><td>${Math.round(u.json.length / 1e5) / 10} MB</td><td><button class="small" data-dl="${idx}">Download</button> <button class="small" data-restore="${idx}">Go back to this</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">None yet — they appear once you advance.</p>'}
  </div>`;
}
afterRender.backups = () => {
  if ($('#bkDir')) $('#bkDir').onclick = async () => { try { backupDir = await window.showDirectoryPicker({ mode: 'readwrite' }); await writeBackup('first'); render(); toast(`Backups will go to “${backupDir.name}”. First one written.`); } catch (e) { if (e.name !== 'AbortError') alert('Could not use that folder: ' + e.message); } };
  if ($('#bkLong')) $('#bkLong').onchange = e => { backupLong = e.target.checked; };
  document.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => { const u = undoStack[+b.dataset.dl]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u.json], { type: 'application/json' })); a.download = `${W.name.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-')}-${u.year}-restore.town.json`; document.body.appendChild(a); a.click(); a.remove(); });
  document.querySelectorAll('[data-restore]').forEach(b => b.onclick = () => {
    const idx = +b.dataset.restore; const u = undoStack[idx]; const lost = W.year - u.year;
    if (!confirm(`Go back to the start of ${yl(u.year)}?\n\nEverything that happened from ${yl(u.year)} to ${yl(W.year - 1)} (${lost} year${lost > 1 ? 's' : ''}) will be thrown away. Saved files are not touched.`)) return;
    undoStack.splice(idx); W = JSON.parse(u.json); upgradeWorld(W); dirty = true; render(); toast(`Back at the start of ${yl(W.year)}.`);
  });
};

// ---------- history ----------
let HIST_CACHE = null;
function historyIndex() {
  if (HIST_CACHE && HIST_CACHE.key === W.id + ':' + W.year + ':' + Object.keys(W.people).length) return HIST_CACHE;
  const idx = {};
  const at = y => (idx[y] = idx[y] || { births: [], deaths: [], weddings: [], splits: [], arrivals: [], leavers: [], ill: [], hurt: [], drama: [] });
  for (const p of Object.values(W.people)) {
    for (const e of p.events) {
      if (e.secret) continue;
      const Y = at(e.y);
      if (e.t === 'born' && !/elsewhere|outside|before the family|Born on Earth/.test(e.text)) Y.births.push(p.id);
      else if ((e.t === 'married' || e.t === 'partnered')) { const m = /@(\d+)/.exec(e.text); if (m && +m[1] > p.id) Y.weddings.push([p.id, +m[1], e.t]); }
      else if (e.t === 'divorced') { const m = /@(\d+)/.exec(e.text); if (m && +m[1] > p.id) Y.splits.push([p.id, +m[1]]); }
      else if (e.t === 'arrived') Y.arrivals.push(p.id);
      else if (e.t === 'left') Y.leavers.push(p.id);
      else if (e.t === 'ill') Y.ill.push([p.id, e.text]);
      else if (e.t === 'injury') Y.hurt.push([p.id, e.text]);
      else if (['betrayal', 'withdrew', 'returned', 'guilt', 'feud', 'justice', 'scandal', 'election', 'office', 'confession', 'disaster', 'war', 'discovery'].includes(e.t) && !e.minor) Y.drama.push([p.id, e.text]);
    }
    if (p.died != null) at(p.died).deaths.push(p.id);
  }
  const years = Object.keys(idx).map(Number);
  HIST_CACHE = { key: W.id + ':' + W.year + ':' + Object.keys(W.people).length, idx, min: Math.min(...years), max: W.year - 1 };
  return HIST_CACHE;
}
function moodChip(m) { if (m == null) return ''; const c = m >= 10 ? 'var(--good)' : m >= -5 ? 'var(--warn)' : 'var(--bad)'; return `<span class="moodchip" style="background:${c}" title="Average mood ${m}">${m >= 15 ? 'good' : m >= 0 ? 'fair' : m >= -15 ? 'hard' : 'grim'}</span>`; }
function viewHistory() {
  const H = historyIndex();
  const asc = ui.histAsc;
  const ys = []; for (let y = H.min; y <= H.max; y++) ys.push(y);
  if (!asc) ys.reverse();
  const decades = [...new Set(ys.map(y => Math.floor(y / 10) * 10))];
  const rows = ys.map(y => {
    const c = W.chronicle && W.chronicle[y];
    const Y = H.idx[y] || { births: [], deaths: [], weddings: [] };
    const short = c ? c.summary.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.') : `${Y.births.length} born · ${Y.deaths.length} died · ${Y.weddings.length} weddings`;
    const pop = c ? c.stats.population : (W.yearStats[y] && W.yearStats[y].population);
    return `<details class="yearcard" data-year="${y}" id="yr-${y}"><summary><span class="yy">${esc(yl(y))}</span><span class="small">${esc(short)}</span><span class="small muted">${c ? moodChip(c.mood) + ' ' : '<span class="pill">before the chronicle</span> '}${pop != null ? pop + ' people' : ''}</span></summary><div class="body"></div></details>`;
  });
  return `<h1>History of ${esc(W.name)}</h1>
  <p class="muted">Every year from the oldest records to now. Click a year to open it. Years before ${esc(yl(W.startYear))} are the reconstructed back-history: births, deaths, marriages and comings and goings only.</p>
  <div class="card">${trendChart()}</div>
  <div class="filters"><button class="small" id="hOrder">${asc ? 'Show newest first' : 'Show oldest first'}</button>
    <select id="hJump"><option value="">Jump to a decade…</option>${decades.map(d => `<option value="${d}">${esc(yl(d))}s</option>`).join('')}</select>
    <button class="small" id="hOpenAll">Open the 10 years shown first</button></div>
  <div class="card" style="padding:.3rem .8rem">${rows.join('') || '<p class="muted">No history yet.</p>'}</div>`;
}
afterRender.history = () => {
  $('#hOrder').onclick = () => { ui.histAsc = !ui.histAsc; render(); };
  $('#hJump').onchange = e => { const d = +e.target.value; if (!d && d !== 0) return; const H = historyIndex(); let y = clamp(d, H.min, H.max); const el = document.getElementById('yr-' + y) || document.getElementById('yr-' + (d + 9)); if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  $('#hOpenAll').onclick = () => { [...document.querySelectorAll('.yearcard')].slice(0, 10).forEach(d => d.open = true); };
  document.querySelectorAll('.yearcard').forEach(d => d.addEventListener('toggle', () => { if (d.open && !d.querySelector('.body').innerHTML) d.querySelector('.body').innerHTML = historyYearBody(+d.dataset.year); }));
};
function historyYearBody(y) {
  const H = historyIndex(); const Y = H.idx[y] || { births: [], deaths: [], weddings: [], splits: [], arrivals: [], leavers: [], ill: [], hurt: [], drama: [] };
  const c = W.chronicle && W.chronicle[y];
  const sec = (title, inner, n) => n ? `<h4>${title} (${n})</h4>${inner}` : '';
  const chips = (ids, sub) => `<div class="chips">${ids.map(id => chip(id, sub(W.people[id]))).join('')}</div>`;
  const lines = arr => arr.map(([id, t]) => `<div class="small">• ${plink(id)}: ${linkify(t)}</div>`).join('');
  const log = (W.log || []).filter(l => l.y === y);
  let out = '';
  if (c) {
    out += `<p class="bio" style="font-size:1rem">${linkify(c.summary)}</p>`;
    const st = c.stats;
    out += `<p class="small muted">Mood of the town: ${c.mood}${c.moodPrev != null ? ` (was ${c.moodPrev})` : ''} · ${st.illnesses} illnesses · ${st.injuries} injuries · ${st.miscarriages} lost pregnancies · ${st.newFriends} new friendships · ${st.quarrels} quarrels · ${st.reconciled} made peace · ${st.jobsStarted} started work · ${st.jobsLost} lost work · ${st.retired} retired</p>`;
    if (c.weather) out += `<p class="small"><b>Weather:</b> ${c.weather.map((w, i) => `${SEASONS[i]} ${esc(w)}`).join(' · ')}${c.food != null && W.era !== 'dropped' ? ` · <b>harvest</b> ${Math.round(c.food * 100)}% · <b>food prices</b> ${Math.round(c.price * 100)}%` : ''}</p>`;
    const causes = Object.entries(c.causes || {}).sort((a, b) => b[1] - a[1]);
    if (causes.length) out += `<p class="small"><b>Causes of death:</b> ${causes.map(([k, v]) => `${esc(k)} (${v})`).join(', ')}</p>`;
  }
  if (log.length) out += `<h4>In the community</h4>${log.map(l => `<div class="small">• ${l.s != null ? SEASONS[l.s] + ': ' : ''}${linkify(l.text)}</div>`).join('')}`;
  out += sec('Deaths', chips(Y.deaths, p => `aged ${p.died - p.born} · ${p.cause}`), Y.deaths.length);
  out += sec('Births', chips(Y.births, p => `to ${[W.people[p.mother], W.people[p.father]].filter(Boolean).map(q => q.first).join(' & ') || 'unknown'}`), Y.births.length);
  out += sec('Weddings and new couples', Y.weddings.map(([a, b, t]) => `<div class="small">• ${plink(a)} and ${plink(b)}${t === 'partnered' ? ' set up home together' : ' married'}</div>`).join(''), Y.weddings.length);
  out += sec('Separations', Y.splits.map(([a, b]) => `<div class="small">• ${plink(a)} and ${plink(b)}</div>`).join(''), Y.splits.length);
  out += sec('Newcomers', chips(Y.arrivals, p => p.occupation || ageText(p)), Y.arrivals.length);
  out += sec('Moved away', chips(Y.leavers, p => ageText(p)), Y.leavers.length);
  out += sec('Serious illness', lines(Y.ill), Y.ill.length);
  out += sec('Injuries', lines(Y.hurt), Y.hurt.length);
  out += sec('Scandals, feuds and turning points', lines(Y.drama), Y.drama.length);
  return out || '<p class="muted small">Nothing recorded this year.</p>';
}

render();
