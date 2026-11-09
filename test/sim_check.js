// Advance towns many years and check every record. Usage: node sim_check.js era years pop seed
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js', 'family.js', 'sim.js', 'econ.js', 'society.js', 'census.js', 'edit.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const ctx = { module: { exports: {} }, console, Date, Math, JSON }; vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const era = process.argv[2] || 'medieval', YEARS = +(process.argv[3] || 50), N = +(process.argv[4] || 1000), SEED = +(process.argv[5] || 7);
function check(W) {
  const P = W.people, probs = [], y = W.year;
  for (const p of Object.values(P)) {
    if (p.died != null && p.died < p.born) probs.push(`${p.id} died before born`);
    if (p.died != null && p.status !== 'dead') probs.push(`${p.id} died but ${p.status}`);
    if (p.status === 'dead' && p.died == null) probs.push(`${p.id} dead no year`);
    for (const k of ['father', 'mother']) if (p[k]) { const par = P[p[k]]; if (!par) { probs.push(`${p.id} missing ${k}`); continue; } if (!par.children.includes(p.id)) probs.push(`${p.id} not in ${k} children`); const g = p.born - par.born; if (g < 12) probs.push(`${p.id} ${k} gap ${g}`); if (k === 'mother' && g > 52) probs.push(`${p.id} mother ${g}`); if (k === 'mother' && par.died != null && par.died < p.born) probs.push(`${p.id} born after mother died`); }
    for (const c of p.children) if (!P[c] || (P[c].father !== p.id && P[c].mother !== p.id)) probs.push(`${p.id} child link ${c}`);
    if (p.spouse) { const s = P[p.spouse]; if (!s || s.spouse !== p.id) probs.push(`${p.id} spouse not mutual`); else if (s.died != null || p.died != null) probs.push(`${p.id} married to dead/dead married`); else if (E.closelyRelated(W, p, s)) probs.push(`${p.id} married kin`); }
    if (p.status === 'resident') { const h = W.households[p.household]; if (!h || !h.members.includes(p.id)) probs.push(`${p.id} household`); if (y - p.born < 15 && !h.members.some(id => P[id].status === 'resident' && y - P[id].born >= 16)) probs.push(`${p.id} child alone age ${y - p.born}`); if (p.workplace && (!W.workplaces[p.workplace] || !W.workplaces[p.workplace].members.includes(p.id))) probs.push(`${p.id} workplace`); for (const k of ['mood','stress','trauma','guilt','drink']) if (p.mind && !Number.isFinite(p.mind[k])) probs.push(`${p.id} mind ${k} ${p.mind[k]}`); if (!Number.isFinite(p.health)) probs.push(`${p.id} health`); }
    for (const e of p.events) for (const m of e.text.matchAll(/@(\d+)/g)) if (!P[m[1]]) probs.push(`${p.id} event ref ${m[1]}`);
  }
  for (const h of Object.values(W.households)) for (const id of h.members) if (!P[id] || P[id].household !== h.id) probs.push(`hh ${h.id} member ${id}`);
  for (const w of Object.values(W.workplaces)) for (const id of w.members) if (!P[id] || P[id].workplace !== w.id) probs.push(`wp ${w.id} member ${id}`);
  for (const r of Object.values(W.rels)) if (!P[r.a] || !P[r.b] || !Number.isFinite(r.score)) probs.push('rel bad');
  return probs;
}
const t0 = Date.now();
const W = E.createCommunity({ era, population: N, seed: SEED, name: 'Testham', options: era === 'dropped' ? { gathering: 'mixed', perfectFirstYear: true } : {} });
let probs = check(W); if (probs.length) console.log('START PROBLEMS', probs.slice(0, 5));
const t1 = Date.now(); let allProbs = 0;
for (let i = 0; i < YEARS; i++) {
  const R = E.advanceYear(W);
  const pr = check(W); allProbs += pr.length;
  if (pr.length) console.log(`year ${R.y} PROBLEMS ${pr.length}:`, [...new Set(pr)].slice(0, 6).join(' | '));
  if (i % Math.max(1, Math.floor(YEARS / 10)) === 0 || i === YEARS - 1) {
    const live = Object.values(W.people).filter(p => p.status === 'resident');
    const dep = live.filter(p => p.mind && p.mind.depressed).length, drink = live.filter(p => p.mind && p.mind.drink > 60).length, herm = live.filter(p => p.hermit).length;
    const ages = live.map(p => W.year - p.born).sort((a, b) => a - b);
    const c = W.chronicle[R.y].stats;
    console.log(`${R.y}: pop ${c.population} births ${c.births} deaths ${c.deaths} (infant ${c.infantDeaths}) wed ${c.marriages} split ${c.divorces} in ${c.arrivals} out ${c.departures} ill ${c.illnesses} hurt ${c.injuries} | mood ${R.mood} depressed ${dep} drinking ${herm ? '' : ''}${drink} hermits ${herm} | median age ${ages[ages.length >> 1]} kids<16 ${ages.filter(a => a < 16).length}${W.chronicle[R.y].outbreak ? ' | OUTBREAK ' + W.chronicle[R.y].outbreak.name + ' ' + W.chronicle[R.y].outbreak.deaths + ' dead' : ''}`);
  }
}
const ms = Date.now() - t1;
const dead = Object.values(W.people).filter(p => p.died != null && p.died >= W.startYear);
const adult = dead.filter(p => p.died - p.born >= 15);
const evs = Object.values(W.people).reduce((s, p) => s + p.events.length, 0);
console.log(`\n${era}: ${YEARS} years in ${ms} ms (${(ms / YEARS).toFixed(0)} ms/yr) | deaths since start ${dead.length}, avg adult age at death ${(adult.reduce((s, p) => s + p.died - p.born, 0) / adult.length).toFixed(1)} | events ${evs} | rels ${Object.keys(W.rels).length} | save size ${(JSON.stringify(W).length / 1e6).toFixed(1)} MB | TOTAL PROBLEMS ${allProbs}`);
if (process.env.SAMPLE) { const live = Object.values(W.people).filter(p => p.status === 'resident' && W.year - p.born > 30); const p = live[3]; for (let y = W.startYear; y < W.year; y++) { const s = E.personYearSummary(W, p, y); const ev = p.events.filter(e => e.y === y); if (s || ev.length) console.log(y, s && s.text, ev.map(e => e.text.replace(/@(\d+)/g, (m, i) => W.people[i].first)).join(' / ')); } }
