// Checks V11: villages of only your characters, every detail chosen, roles given to anyone, and the monthly journal.
// Usage: node v11_check.js [years] [seed] [era]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js', 'family.js', 'sim.js', 'econ.js', 'society.js', 'lives.js', 'census.js', 'edit.js', 'export.js', 'maker.js', 'roles.js', 'journal.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const ctx = { module: { exports: {} }, console, Date, Math, JSON, Blob, Response, CompressionStream, DecompressionStream, TextEncoder, TextDecoder, Uint8Array };
vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const YEARS = +(process.argv[2] || 30), SEED = +(process.argv[3] || 4), eras = process.argv[4] ? [process.argv[4]] : Object.keys(E.ERAS);
const seeded = s => { let a = s * 99991 + 7; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const BAD = /undefined|NaN|\[object|\$\{|\{P\}|\{place\}|null\b/;
function check(W) { // the same consistency check the other checks use
  const P = W.people, probs = [], y = W.year;
  for (const p of Object.values(P)) {
    if (p.died != null && p.status !== 'dead') probs.push(`${p.id} died but ${p.status}`);
    for (const k of ['father', 'mother']) if (p[k]) { const par = P[p[k]]; if (!par || !par.children.includes(p.id)) probs.push(`${p.id} ${k} link`); }
    for (const c of p.children) if (!P[c] || (P[c].father !== p.id && P[c].mother !== p.id)) probs.push(`${p.id} child link`);
    if (p.spouse) { const s = P[p.spouse]; if (!s || s.spouse !== p.id) probs.push(`${p.id} spouse not mutual`); }
    if (p.status === 'resident') { const h = W.households[p.household]; if (!h || !h.members.includes(p.id)) probs.push(`${p.id} household`); }
    for (const e of p.events) for (const m of e.text.matchAll(/@(\d+)/g)) if (!P[m[1]]) probs.push(`${p.id} event ref`);
  }
  for (const w of Object.values(W.workplaces)) for (const id of w.members) if (!P[id] || P[id].workplace !== w.id) probs.push(`wp ${w.id}`);
  return probs;
}
let total = 0;
(async () => {
for (const era of eras) {
  const r = seeded(SEED), c = { made: 0, movedIn: 0, chosenKept: 0, chosenWrong: 0, rolesGiven: 0, warned: 0, roleFailed: 0, years: YEARS, people: 0, entries: 0, expected: 0, badText: 0, badWriter: 0, namedOk: 0, namedWrong: 0, turnsOk: 0, turnsWrong: 0, listOk: 0, listWrong: 0, sheetRows: 0, strangers: 0 };
  // 1. an empty village of only my characters
  const W = E.createCommunity({ era, population: 50, seed: SEED, name: 'T', options: era === 'dropped' ? { gathering: 'families' } : {} }); E.upgradeWorld(W); E.emptyVillage(W);
  if (Object.keys(W.people).length) c.chosenWrong++;
  const y0 = W.year, F = E.makerTcFields(W);
  for (let i = 0; i < 14; i++) {
    const P = E.makerBlank(W); E.makerGenerate(W, P, seeded(SEED * 100 + i)); c.made++;
    P.lists.family = P.lists.family.filter(x => !/spouse|partner|son|daughter|child/i.test(x.relation)); // they come alone, so the village is only mine
    if (P.f.gender.v === 'Non-binary') P.tc = { sex: r() < 0.5 ? 'm' : 'f' };
    P.tc = P.tc || {};
    for (const f of F) if (r() < 0.4) P.tc[f.key] = f.multi ? f.options.filter(() => r() < 0.08).map(o => o[0]) : f.options[Math.floor(r() * f.options.length)][0];
    if (P.tc.livesAs === 'nonbinary' || P.f.gender.v === 'Non-binary') P.tc.sex = P.tc.sex || 'm';
    if (P.tc.orientation === 'straight') delete P.tc.open;
    const err = E.makerMoveInNow(W, P, {}, i % 4);
    if (err) { console.log('   could not move in:', err); continue; }
    c.movedIn++;
    const p = Object.values(W.people).find(q => q.made && q.made.plan === 'now' + W.nextMadeNow); if (!p) { c.chosenWrong++; continue; }
    const t = P.tc, want = [];
    if (t.faith) want.push(p.faith === t.faith); if (t.literate) want.push(p.literate === (t.literate === 'yes'));
    for (const k of ['O', 'C', 'E', 'A', 'N']) if (t['trait' + k]) want.push(p.traits[k] === +t['trait' + k]);
    if (t.health) want.push(p.health === +t.health); if (t.wealth) want.push(W.households[p.household].wealth === +t.wealth);
    if (t.conditions && t.conditions.length) want.push(t.conditions.every(x => p.conditions.includes(x)));
    if (t.livesAs) want.push(E.genderOf ? true : (p.gender || (p.sex === 'm' ? 'man' : 'woman')) === t.livesAs);
    if (t.orientation) want.push(p.orientation === t.orientation);
    for (const ok of want) ok ? c.chosenKept++ : c.chosenWrong++;
  }
  // 2. give everyone a role, some that don't fit
  const roles = E.allRoles(W);
  for (const p of Object.values(W.people)) {
    if (p.status !== 'resident') continue;
    const o = roles[Math.floor(r() * roles.length)];
    if (E.roleWarnings(W, p, o).length) c.warned++;
    const err = E.assignRole(W, p, o); if (!err || /already/.test(err)) c.rolesGiven++; else { c.roleFailed++; console.log('   role failed:', err, o.name); }
  }
  // 3. the journal: a named writer, then my list in turn
  const J = E.journalState(W), res = Object.values(W.people).filter(p => p.status === 'resident');
  if (res.length >= 3) { J.named[`${W.year}-5`] = res[0].id; J.writers = [res[1].id, res[2].id]; J.mode = 'listTurn'; }
  E.advanceYear(W);
  const first = J.entries.filter(e => e.y === y0);
  if (res.length >= 3) {
    for (const e of first) { if (e.m === 5) (e.w === res[0].id ? c.namedOk++ : c.namedWrong++); else if ([res[1].id, res[2].id].includes(e.w)) c.turnsOk++; else if (res[1].status === 'resident' && res[2].status === 'resident') c.turnsWrong++; }
    J.mode = 'listRandom'; E.advanceYear(W);
    for (const e of J.entries.filter(e => e.y === y0 + 1)) (J.writers.includes(e.w) || !J.writers.some(id => W.people[id].status === 'resident' && W.people[id].died == null)) ? c.listOk++ : c.listWrong++;
    J.mode = 'random';
  }
  for (let k = 2; k < YEARS; k++) E.advanceYear(W);
  // every entry: written by someone alive and in the town at the time, with clean text and a proper date
  for (const e of J.entries) {
    const w = W.people[e.w];
    if (!w || w.born > e.y - 12 || (w.died != null && w.died < e.y)) c.badWriter++;
    if (BAD.test(e.paras.join(' ')) || !/^2nd [A-Z][a-z]+ /.test(e.date)) { c.badText++; if (c.badText < 3) console.log('   bad entry:', e.date, e.paras.join(' ').slice(0, 140)); }
  }
  c.entries = J.entries.length; c.expected = YEARS * 12; c.people = Object.keys(W.people).length;
  c.strangers = Object.values(W.people).filter(p => !p.made && p.arrived != null && p.arrived > y0 && !p.father && !p.mother).length;
  const probs = check(W);
  const { sheets } = await E.exportWorkbook(W, { secrets: false }); const js = sheets.find(s => s.name === 'Journal'); c.sheetRows = js ? js.rows.length - 1 : 0;
  const p = c.chosenWrong + c.roleFailed + c.badText + c.badWriter + c.namedWrong + c.turnsWrong + c.listWrong + probs.length + (c.sheetRows !== c.entries ? 1 : 0) + (c.entries < c.expected * 0.9 && Object.values(W.people).some(q => q.status === 'resident') ? 1 : 0);
  total += p;
  console.log(`${era}: ${JSON.stringify(c)} | town problems ${probs.length} | problems ${p}`); probs.slice(0, 3).forEach(x => console.log('   ', x));
  // 4. an ordinary village: twelve entries a year from different villagers
  const V = E.createCommunity({ era, population: 300, seed: SEED + 1, name: 'V', options: era === 'dropped' ? { gathering: 'families' } : {} }); E.upgradeWorld(V);
  for (let k = 0; k < 5; k++) E.advanceYear(V);
  const ent = V.journal.entries, byYear = {}; for (const e of ent) (byYear[e.y] = byYear[e.y] || []).push(e.w);
  const repeats = Object.values(byYear).reduce((a, ws) => a + ws.length - new Set(ws).size, 0), badV = ent.filter(e => BAD.test(e.paras.join(' '))).length;
  total += (ent.length !== 60 ? 1 : 0) + badV;
  console.log(`   ordinary village: ${ent.length} entries in 5 years, ${repeats} repeat writers within a year, ${badV} bad`);
}
console.log('TOTAL PROBLEMS', total);
})();
