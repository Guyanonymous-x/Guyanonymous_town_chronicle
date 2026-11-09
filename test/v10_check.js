// Checks V10: inner lives and coming out, attitudes, lasting injuries, new periods, births in prison. Usage: node v10_check.js [years] [seed] [era]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js', 'family.js', 'sim.js', 'econ.js', 'society.js', 'lives.js', 'census.js', 'edit.js', 'export.js', 'maker.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const ctx = { module: { exports: {} }, console, Date, Math, JSON, Blob, Response, CompressionStream, DecompressionStream, TextEncoder, TextDecoder, Uint8Array };
vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const YEARS = +(process.argv[2] || 50), SEED = +(process.argv[3] || 9);
const eras = process.argv[4] ? [process.argv[4]] : Object.keys(E.ERAS);
const BAD = /undefined|NaN|\[object|\$\{|null\b/;
let total = 0;
for (const era of eras) {
  const W = E.createCommunity({ era, population: 500, seed: SEED, name: 'T', options: era === 'dropped' ? { gathering: 'families' } : {} }); E.upgradeWorld(W);
  const att0 = Object.fromEntries(E.ISSUES.map(i => [i.key, W.att[i.key].v]));
  // a woman expecting a child is locked up: the baby should be born while she is inside, and go home
  const mum = Object.values(W.people).find(p => p.status === 'resident' && p.sex === 'f' && p.spouse && W.people[p.spouse].status === 'resident' && W.year - p.born >= 20 && W.year - p.born <= 35 && !p.preg);
  if (mum) { mum.preg = { y: W.year, s: 2, father: mum.spouse, secret: null, since: W.year * 4 - 1 }; ctx.__mum = mum; ctx.__W = W; }
  if (mum) { mum.prevHousehold = mum.household; vm.runInContext('leaveHousehold(__W, __mum)', ctx); mum.status = 'prison'; mum.prisonUntil = W.year + 5; mum.occId = null; mum.occupation = 'In prison'; }
  const mumKids = mum ? mum.children.length : 0;
  const c = { years: YEARS, people: 0, feltOther: 0, realised: 0, out: 0, hiding: 0, gay: 0, gayOut: 0, gayHiding: 0, comingOutEvents: 0, newNames: 0, estranged: 0, harassed: 0, assaultsFromHate: 0, severe: 0, lostWork: 0, wrongJobs: 0, lawChanges: 0, prisonBirth: 0, badText: 0, badAtt: 0, bad: 0 };
  for (let k = 0; k < YEARS; k++) E.advanceYear(W);
  for (const p of Object.values(W.people)) {
    if (!p.att && p.status === 'resident' && p.died == null && p.born < W.year - 1 && !(p.arrived >= W.year - 1)) { c.bad++; if (c.bad < 4) console.log('   no attitudes:', p.id, p.born, p.arrived); }
    if (p.att) for (const v of Object.values(p.att)) if (!Number.isFinite(v) || v < -100 || v > 100) c.badAtt++;
    if (p.inner) { c.feltOther++; if (p.inner.realised) c.realised++; if (p.inner.out) c.out++; else if (p.inner.realised && p.status === 'resident' && p.died == null) c.hiding++; if (p.inner.out && p.inner.realised && p.inner.out < p.inner.realised) c.bad++; if (p.inner.out && p.gender !== p.inner.felt) { c.bad++; console.log('   out but gender', p.gender, p.inner.felt); } }
    if (p.gender && (!p.inner || !p.inner.out) && p.gender !== (p.sex === 'm' ? 'man' : 'woman')) { c.bad++; console.log('   gender without coming out', p.id); }
    if (p.so) { c.gay++; if (p.so.out) c.gayOut++; else if (p.so.realised && p.status === 'resident' && p.died == null) c.gayHiding++; }
    if (p.firstAtBirth && p.firstAtBirth !== p.first) c.newNames++;
    c.comingOutEvents += p.events.filter(e => /^Came out, and from now on|^Stopped hiding, and lives openly/.test(e.text)).length;
    c.harassed += p.events.filter(e => /jeered at and shunned/.test(e.text)).length;
    c.lostWork += p.events.filter(e => /^Had to give up work as/.test(e.text)).length;
    if ((p.conditions || []).some(x => E.CONDITION_EFFECTS[x] && E.CONDITION_EFFECTS[x].cannot)) c.severe++;
    if (p.status === 'resident' && p.died == null && p.occId) { const o = (E.ERAS[era].occupations || []).find(x => x.id === p.occId); if (o && !E.canDoWork(p, o)) c.wrongJobs++; }
    for (const e of p.events) if (BAD.test(e.text) || (e.why && BAD.test(e.why))) { c.badText++; if (c.badText < 3) console.log('   bad text:', e.text.slice(0, 120)); }
    c.people++;
  }
  c.estranged = Object.values(W.rels).filter(r => (r.history || []).some(h => /turned away from .* after .* came out/.test(h.text))).length;
  c.assaultsFromHate = Object.values((W.soc && W.soc.crimes) || {}).filter(x => /hatred/.test(x.why || x.motive || '')).length;
  c.lawChanges = (W.log || []).filter(l => l.t === 'law' && /same-sex couples/.test(l.text)).length;
  if (mum) { c.prisonBirth = mum.children.length - mumKids; const kid = W.people[mum.children[mum.children.length - 1]]; if (!mum.children.slice(mumKids).some(id => W.people[id].born === W.year - YEARS)) { c.bad++; console.log('   no birth in prison'); } }
  const att1 = Object.fromEntries(E.ISSUES.map(i => [i.key, W.att[i.key].v]));
  const p = c.bad + c.badText + c.badAtt + c.wrongJobs;
  total += p;
  console.log(`${era}: attitudes ${JSON.stringify(att0)} -> ${JSON.stringify(att1)}`);
  console.log(`   ${JSON.stringify(c)} | problems ${p}`);
}
console.log('TOTAL PROBLEMS', total);
