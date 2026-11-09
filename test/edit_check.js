// Advance towns many years and check every record. Usage: node sim_check.js era years pop seed
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js', 'family.js', 'sim.js', 'econ.js', 'society.js', 'lives.js', 'census.js', 'edit.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const ctx = { module: { exports: {} }, console, Date, Math, JSON }; vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
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

const era = process.argv[2] || 'medieval', YEARS = +(process.argv[3] || 15), SEED = +(process.argv[4] || 3);
const W = E.createCommunity({ era, population: 500, seed: SEED, name: 'T', options: era === 'dropped' ? { gathering: 'families' } : {} });
E.upgradeWorld(W);
const r = (() => { let a = SEED * 99991; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
const pick = arr => arr[Math.floor(r() * arr.length)];
const ctxEval = code => vm.runInContext(code, ctx);
let editErrs = {}, planStats = {}, problems = 0, edits = 0, plans = 0;
for (let i = 0; i < YEARS; i++) {
  const live = () => Object.values(W.people).filter(p => p.status === 'resident' && p.died == null);
  // direct edits
  for (let k = 0; k < 25; k++) {
    const p = pick(live()); const q = pick(live());
    const choices = [
      () => E.editPerson(W, p.id, 'first', 'Edited' + k),
      () => E.editPerson(W, p.id, 'health', Math.floor(r() * 100)),
      () => E.editPerson(W, p.id, 'traits.A', Math.floor(r() * 100)),
      () => E.editPerson(W, p.id, 'mind.drink', Math.floor(r() * 100)),
      () => E.editPerson(W, p.id, 'mind.depressed', r() < 0.5),
      () => E.editPerson(W, p.id, 'hermit', r() < 0.5),
      () => E.editPerson(W, p.id, 'occupation', (pick(E.jobChoices(W, p)) || {}).id),
      () => E.editPerson(W, p.id, 'household', r() < 0.3 ? 'new' : q.household),
      () => E.editRelationship(W, p.id, q.id, pick(['friend', 'enemy', 'courting', 'rival', 'end', 'strained']), Math.floor(r() * 100), 'test'),
      () => E.editHousehold(W, p.household, 'savings', Math.floor(r() * 5000) - 1000),
    ];
    const err = pick(choices)(); edits++; if (err) editErrs[err] = (editErrs[err] || 0) + 1;
  }
  // plans
  const kinds = Object.keys(E.PLAN_KINDS);
  for (let k = 0; k < 30; k++) {
    const kind = pick(kinds); const p = pick(live()), q = pick(live());
    const hh = Object.values(W.households).filter(h => h.members.some(id => W.people[id].status === 'resident'));
    const pl = { kind, who: p.id, target: q.id, s: Math.floor(r() * 4), n: 1 + Math.floor(r() * 8), cause: pick(['illness', 'accident', 'old', 'murder']), crime: pick(Object.keys(ctxEval('CRIME_RATES')[W.era])), caught: pick(['yes', 'no', '']), disease: pick(ctxEval('diseasesFor')(W)).id, job: (pick(E.jobChoices(W, p)) || {}).id, amount: Math.floor(r() * 2000) - 1000, office: (pick(ctxEval('OFFICES')[W.era] || [{}]) || {}).key, event: (pick(ctxEval('EVENTS')[W.era]) || {}).name, weather: 'a drought', pest: (pick(ctxEval('PESTS')[W.era]) || [])[1], a: pick(hh).id, b: pick(hh).id, feud: (Object.values(W.feuds).find(f => f.status === 'active') || {}).id, law: pick(ctxEval('LAWS')).id, disc: pick(ctxEval('DISCOVERIES')).id, force: r() < 0.5, withHousehold: r() < 0.5, lasting: r() < 0.5 };
    if (kind === 'weather') pl.weather = W.era === 'scifi' ? 'dust storms' : pick(['a drought', 'harsh and bitter', 'very wet', 'wet']);
    const err = E.addPlan(W, pl); plans++; const key = err ? 'refused: ' + err.slice(0, 50) : 'accepted';
    planStats[key] = (planStats[key] || 0) + 1;
  }
  E.advanceYear(W);
  const pr = check(W); problems += pr.length; if (pr.length) console.log('year', W.year - 1, 'PROBLEMS', JSON.stringify([...new Set(pr)].slice(0, 5)));
}
const st = {}; for (const pl of W.plans) { const k = pl.status + (pl.status === 'failed' ? ': ' + (pl.result || '').slice(0, 60) : ''); st[k] = (st[k] || 0) + 1; }
console.log(`${era}: ${edits} edits, ${plans} plans tried over ${YEARS} years; plan outcomes:`, JSON.stringify(st));
console.log('refusals at entry:', Object.entries(planStats).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${v}× ${k}`).join(' | '));
console.log('edit refusals:', Object.entries(editErrs).map(([k, v]) => `${v}× ${k}`).join(' | ') || 'none');
console.log('TOTAL PROBLEMS', problems);
