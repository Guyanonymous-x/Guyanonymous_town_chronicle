// ================= Stage 2c page code: leaders, crime, reputation and secrets =================
function standingOf(p) { return p.standing != null ? p.standing : (W.soc ? baseStanding(W, p) : 50); }
function personSociety(p) {
  if (!W.soc) return '';
  const out = [];
  const st = standingOf(p);
  out.push(`<div class="famsec"><h4>Reputation</h4><p class="small">In the eyes of the town, ${esc(p.first)} is <b>${standingWord(st)}</b> (${st}/100).</p></div>`);
  const offices = [];
  for (const o of Object.values(W.soc.offices)) for (const h of o.history) if (h.ids.includes(p.id)) offices.push(`${esc(o.title)} from ${yl(h.y)} (${esc(h.how.replace(/@(\d+)/g, (m, id) => fullName(W.people[id])))})`);
  if (offices.length) out.push(`<div class="famsec"><h4>Offices held</h4>${[...new Set(offices)].map(t => `<div class="small">• ${t}</div>`).join('')}</div>`);
  const rec = (p.record || []);
  if (rec.length) out.push(`<div class="famsec"><h4>Run-ins with the law</h4>${rec.map(r => `<div class="small">• ${yl(r.y)}: ${esc(r.type)} — ${esc(r.outcome)}${r.wrongful ? ' <span class="pill warn">wrongly accused</span>' : ''}</div>`).join('')}</div>`);
  const victimOf = W.soc.crimes.filter(c => c.victim === p.id);
  if (victimOf.length) out.push(`<div class="famsec"><h4>Crimes against ${esc(p.first)}</h4>${victimOf.map(c => `<div class="small">• ${yl(c.y)}: ${esc(c.type)}${c.solved ? ` by ${plink(c.culprit)}` : showSecrets ? ` by ${plink(c.culprit)} <span class="pill warn">secret</span>` : ' — never solved'}</div>`).join('')}</div>`);
  const about = Object.values(W.soc.secrets).filter(s => s.about.includes(p.id) && (s.public || showSecrets));
  if (about.length) out.push(`<div class="famsec"><h4>What people say</h4>${about.map(s => `<div class="small">• ${linkify(s.text)} ${s.public ? `<span class="pill">common talk since ${yl(s.public)}</span>` : `<span class="pill warn">secret: ${s.knownBy.length} know</span>`} ${showSecrets || s.public ? (s.truth ? '<span class="pill bad">true</span>' : '<span class="pill good">a lie</span>') : ''}</div>`).join('')}</div>`);
  const knows = Object.values(W.soc.secrets).filter(s => !s.public && s.knownBy.includes(p.id) && !s.about.includes(p.id));
  if (knows.length) out.push(`<div class="famsec"><h4>Knows ${knows.length} secret${knows.length > 1 ? 's' : ''} about others</h4>${showSecrets ? knows.map(s => `<div class="small">• ${linkify(s.text)}${s.truth ? '' : ' (a lie)'}</div>`).join('') : '<p class="small muted">Tick “Show family secrets / Show secrets” to see them.</p>'}</div>`);
  if (Object.values(W.soc.secrets).some(s => !s.public && s.about.includes(p.id)) && !showSecrets) out.push(`<p class="small muted">There are things about ${esc(p.first)} that the town does not know. <label><input type="checkbox" id="secrets"> Show secrets</label></p>`);
  return out.join('');
}
function viewLeaders() {
  if (!W.soc) return '<p class="muted">Advance a year first.</p>';
  const S = W.soc;
  const lead = S.offices[LEAD_KEY[W.era]];
  const appr = Object.entries(S.approval).map(([y, a]) => [+y, a]).sort((a, b) => a[0] - b[0]);
  const laws = S.laws.slice().reverse();
  const els = S.elections.slice().reverse();
  let chart = '';
  if (appr.length > 1) {
    const Wd = 560, H = 110, pl = 28, pr = 8;
    const X = i => pl + i / (appr.length - 1) * (Wd - pl - pr), Y = v => 8 + (100 - v) / 100 * (H - 26);
    chart = `<svg viewBox="0 0 ${Wd} ${H}" width="100%"><line x1="${pl}" x2="${Wd - pr}" y1="${Y(50)}" y2="${Y(50)}" stroke="var(--line)" stroke-dasharray="3 3"/><text x="${pl - 4}" y="${Y(50) + 3}" font-size="9" text-anchor="end" fill="var(--muted)">50%</text><path d="${appr.map(([, a], i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(a.v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="${pl}" y="${H - 4}" font-size="10" fill="var(--muted)">${appr[0][0]}</text><text x="${Wd - pr}" y="${H - 4}" font-size="10" text-anchor="end" fill="var(--muted)">${appr[appr.length - 1][0]}</text></svg><p class="small muted">How the people feel about their leader, year by year.</p>`;
  }
  return `<h1>Leaders and politics</h1>
  <p class="muted">Who runs ${esc(W.name)}, how they got there, and the rules they made. ${eraBase(W) === 'medieval' || eraBase(W) === 'frontier' ? 'As in the real past this setting is based on, only men vote.' : ''}</p>
  <div class="grid g2">
    <div class="card"><h3>In office now</h3>${Object.values(S.offices).map(o => `<div class="famsec"><h4>${esc(o.title)}</h4><div class="chips">${o.holders.map(id => chip(id, `since ${yl(o.since)}`)).join('') || '<span class="muted small">Nobody right now.</span>'}</div>${o.next ? `<p class="small muted">Next ${OFFICES[W.era].find(x => x.key === o.key).how === 'election' ? 'vote' : 'appointment'}: ${yl(o.next)}</p>` : ''}</div>`).join('')}</div>
    <div class="card"><h3>Approval of the leader</h3>${lead && lead.holders[0] ? `<p>${plink(lead.holders[0])}: <b>${appr.length ? appr[appr.length - 1][1].v + '%' : '—'}</b></p>` : ''}${chart}</div>
  </div>
  <div class="card"><h3>Rules made by leaders (${laws.length})</h3>${laws.map(l => `<div class="small">• ${yl(l.y)}: ${plink(l.by)} ${esc(l.name)} ${l.ended ? `<span class="pill">ended ${yl(l.ended)}</span>` : '<span class="pill good">in force</span>'} ${l.approval > 0 ? '<span class="pill good">popular</span>' : l.approval < 0 ? '<span class="pill bad">unpopular</span>' : ''}</div>`).join('') || '<p class="muted small">None yet.</p>'}</div>
  <div class="card"><h3>Elections (${els.length})</h3>${els.map(e => `<details><summary>${yl(e.y)} — ${esc(e.title)}: ${e.winners.map(plink).join(', ')} · ${e.voters} voted</summary>${e.results.map(r => `<div class="small" style="padding-left:1rem">${plink(r.id)} — ${r.v} votes ${e.winners.includes(r.id) ? '<span class="pill good">won</span>' : ''}</div>`).join('')}</details>`).join('') || '<p class="muted small">None yet.</p>'}</div>
  <div class="card"><h3>Everyone who has held office</h3>${Object.values(S.offices).map(o => `<div class="famsec"><h4>${esc(o.title)}</h4>${o.history.slice().reverse().map(h => `<div class="small">• ${yl(h.y)}: ${h.ids.map(plink).join(', ')} — ${linkify(h.how)}</div>`).join('')}</div>`).join('')}</div>`;
}
function viewCrime() {
  if (!W.soc) return '<p class="muted">Advance a year first.</p>';
  const S = W.soc;
  const f = ui.crimeFilter || 'all';
  const list = S.crimes.filter(c => f === 'all' || (f === 'unsolved' ? !c.solved : f === 'solved' ? c.solved : c.type === f)).slice().reverse();
  const types = [...new Set(S.crimes.map(c => c.type))];
  const byType = {}; for (const c of S.crimes) { const t = byType[c.type] = byType[c.type] || { n: 0, s: 0 }; t.n++; if (c.solved) t.s++; }
  const prisoners = Object.values(W.people).filter(p => p.status === 'prison' && p.died == null);
  const wrong = S.crimes.filter(c => c.wronglyBlamed);
  const shown = list.slice(0, 200);
  return `<h1>Crime and justice</h1>
  <p class="muted">${S.crimes.length} crimes since the chronicle began. Unsolved crimes keep their culprit hidden unless you tick “Show secrets”. <label class="small"><input type="checkbox" id="secrets" ${showSecrets ? 'checked' : ''}> Show secrets</label></p>
  <div class="grid g2">
    <div class="card"><h3>By kind</h3><table class="list"><thead><tr><th>Crime</th><th>Count</th><th>Solved</th></tr></thead><tbody>${Object.entries(byType).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `<tr><td>${esc(cap(k))}</td><td>${v.n}</td><td>${Math.round(v.s / v.n * 100)}%</td></tr>`).join('') || '<tr><td colspan="3" class="muted">None yet.</td></tr>'}</tbody></table></div>
    <div class="card"><h3>${W.era === 'dropped' ? 'Banished for a time' : 'Locked up now'} (${prisoners.length})</h3><div class="chips">${prisoners.map(p => chip(p.id, `until ${yl(p.prisonUntil)}`)).join('') || '<span class="muted small">Nobody.</span>'}</div>
      <h3 style="margin-top:1rem">Wrongly blamed (${wrong.length})</h3>${wrong.slice(-12).reverse().map(c => `<div class="small">• ${yl(c.y)}: ${plink(c.wronglyBlamed)} for ${esc(c.type)} ${c.cleared ? `<span class="pill good">cleared ${yl(c.cleared)}</span>` : ''}${showSecrets ? ` — really ${plink(c.culprit)}` : ''}</div>`).join('') || '<p class="muted small">Nobody.</p>'}</div>
  </div>
  <div class="card"><h3>The record</h3>
    <div class="filters small">Show: <select id="crimeF"><option value="all">all</option><option value="unsolved" ${f === 'unsolved' ? 'selected' : ''}>unsolved</option><option value="solved" ${f === 'solved' ? 'selected' : ''}>solved</option>${types.map(t => `<option ${f === t ? 'selected' : ''}>${t}</option>`).join('')}</select> ${list.length > 200 ? '<span class="muted">(newest 200 shown)</span>' : ''}</div>
    <table class="list"><thead><tr><th>Year</th><th>Crime</th><th>Victim</th><th>Culprit</th><th>Outcome</th></tr></thead><tbody>
    ${shown.map(c => `<tr><td>${yl(c.y)}</td><td>${esc(c.type)}${c.amount ? ` <span class="small muted">(${fmtMoney(c.amount)})</span>` : ''}</td><td>${c.victim ? plink(c.victim) : '—'}</td><td>${c.solved || showSecrets ? plink(c.culprit) + (c.solved ? '' : ' <span class="pill warn">secret</span>') : '<span class="muted">unknown</span>'}</td><td class="small">${c.solved ? esc(c.punishment || 'dealt with') + (c.how && c.how !== 'caught' ? ` (${esc(c.how)}${c.solved !== c.y ? ', ' + yl(c.solved) : ''})` : '') : c.wronglyBlamed ? `${plink(c.wronglyBlamed)} wrongly blamed` : 'unsolved'}${c.motive && (c.solved || showSecrets) ? `<div class="muted">${linkify(cap(c.motive))}</div>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No crimes yet.</td></tr>'}
    </tbody></table></div>`;
}
afterRender.crime = () => { if ($('#crimeF')) $('#crimeF').onchange = e => { ui.crimeFilter = e.target.value; render(); }; if ($('#secrets')) $('#secrets').onchange = e => { showSecrets = e.target.checked; render(); }; };
function viewSecrets() {
  if (!W.soc) return '<p class="muted">Advance a year first.</p>';
  const all = Object.values(W.soc.secrets);
  const pub = all.filter(s => s.public).sort((a, b) => b.public - a.public);
  const hidden = all.filter(s => !s.public && !s.dead);
  const word = { affair: 'Affair', child: 'Secret parentage', crime: 'Crime', rumor: 'Rumour' };
  const row = s => `<tr><td>${yl(s.y)}</td><td>${word[s.kind] || s.kind}</td><td>${linkify(s.text)}</td><td>${s.truth ? '<span class="pill bad">true</span>' : '<span class="pill good">a lie</span>'}</td><td>${s.public ? 'everyone, since ' + yl(s.public) : s.knownBy.length + ' people'}</td></tr>`;
  return `<h1>Gossip and secrets</h1>
  <p class="muted">What the town believes, and what is really true. Secrets spread person to person along friendships and families; once enough people know, everybody does. Lies spread just as well as the truth.</p>
  <div class="card"><h3>Common talk (${pub.length})</h3><p class="small muted">Things the whole town has heard — true or not.</p>
    <table class="list"><thead><tr><th>Started</th><th>Kind</th><th>What people say</th><th>Truth</th><th>Who knows</th></tr></thead><tbody>${pub.slice(0, 150).map(row).join('') || '<tr><td colspan="5" class="muted">Nothing yet.</td></tr>'}</tbody></table></div>
  <div class="card"><h3>Still secret (${hidden.length})</h3>
    ${showSecrets ? `<table class="list"><thead><tr><th>Started</th><th>Kind</th><th>The secret</th><th>Truth</th><th>Who knows</th></tr></thead><tbody>${hidden.slice(0, 150).map(row).join('')}</tbody></table>` : `<p class="small">These are hidden so they don't spoil the story. <label><input type="checkbox" id="secrets"> Show secrets</label></p>`}</div>`;
}
afterRender.secrets = () => { if ($('#secrets')) $('#secrets').onchange = e => { showSecrets = e.target.checked; render(); }; };
