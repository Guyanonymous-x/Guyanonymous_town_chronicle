// Checks the person maker (LifeWeaver's generator inside Town Chronicle). Usage: node maker_check.js [people per setting] [seed]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js', 'maker.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const ctx = { module: { exports: {} }, console, Date, Math, JSON }; vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const N = +(process.argv[2] || 300), SEED = +(process.argv[3] || 11);
const seeded = s => { let a = s * 99991 + 7; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const BAD = /\bundefined\b|\bNaN\b|\bnull\b|\[object|\$\{/;
const allText = P => [P.story.v, ...Object.values(P.f).map(x => x.v), ...Object.values(P.lists).flatMap(rows => rows.flatMap(r => Object.entries(r).filter(([k]) => k !== 'id' && k !== 'locked').map(([, v]) => v)))];
const snap = P => JSON.stringify({ f: P.f, lists: Object.fromEntries(Object.entries(P.lists).map(([k, rows]) => [k, rows.map(r => { const c = Object.assign({}, r); delete c.id; return c; })])), story: P.story });
let total = { made: 0, problems: 0 };
const notAvailable = Object.keys(E.ERAS).filter(e => !E.makerAvailable({ era: e }));
for (const era of Object.keys(E.MAKER_SETTINGS)) {
  const W = E.createCommunity({ era, population: 200, seed: SEED, name: 'T' });
  const y = E.makerYear(W), r = seeded(SEED), probs = [];
  const c = { made: 0, outOfAgeRange: 0, deadOnArrival: 0, badText: 0, emptyStory: 0, notMovable: 0, lockedChanged: 0, lockedRowsLost: 0, notRepeatable: 0, futureDeathKept: 0, deadCaught: 0, unbornCaught: 0 };
  const note = (k, msg) => { c[k]++; if (probs.length < 8) probs.push(msg); };
  for (let i = 0; i < N; i++) {
    // 1. a person made from nothing
    const P = E.makerGenerate(W, E.makerBlank(W), seeded(SEED * 1000 + i)); c.made++;
    const b = +P.f.birthYear.v;
    if (!(b >= y - E.MAKER_AGES[1] && b <= y - E.MAKER_AGES[0])) note('outOfAgeRange', `born ${b}, arrives ${y}`);
    if (P.f.deathYear.v !== '') note('deadOnArrival', `died ${P.f.deathYear.v}`);
    if (!P.story.v.trim()) note('emptyStory', 'empty story');
    const bad = allText(P).find(t => BAD.test(String(t))); if (bad) note('badText', `text: ${String(bad).slice(0, 80)}`);
    const pr = E.makerProblems(W, P); if (pr.length) note('notMovable', `${P.f.firstName.v}: ${pr[0]}`);
    // 2. the same random numbers make the same person
    const P2 = E.makerGenerate(W, E.makerBlank(W), seeded(SEED * 1000 + i));
    if (snap(P) !== snap(P2)) note('notRepeatable', 'two runs differ');
    // 3. lock some details and some rows, change them, and make the rest again
    const keys = E.LW.FIELDS.map(d => d.key).filter(k => r() < 0.3 && k !== 'deathYear');
    for (const k of keys) { P.f[k].l = true; if (k === 'birthYear') P.f[k].v = String(y - 16 - Math.floor(r() * 35)); else if (k === 'firstName') P.f[k].v = 'Testname'; }
    const keptRows = [];
    for (const n of E.LW.LISTNAMES) for (const row of P.lists[n]) if (r() < 0.25) { row.locked = true; keptRows.push(n + JSON.stringify(row)); }
    const before = JSON.stringify(keys.map(k => P.f[k].v));
    E.makerGenerate(W, P, seeded(SEED * 7000 + i));
    if (JSON.stringify(keys.map(k => P.f[k].v)) !== before) note('lockedChanged', `locked details changed (${keys.join(', ')})`);
    for (const kr of keptRows) { const n = E.LW.LISTNAMES.find(x => kr.startsWith(x)); if (!P.lists[n].some(row => n + JSON.stringify(row) === kr)) note('lockedRowsLost', `locked ${n} row lost`); }
    const bad2 = allText(P).find(t => BAD.test(String(t))); if (bad2) note('badText', `text after locking: ${String(bad2).slice(0, 80)}`);
    // 4. a locked death year after arrival is kept, and nothing on their timeline is after arrival
    const Q = E.makerBlank(W); Q.f.deathYear.v = String(y + 5 + (i % 30)); Q.f.deathYear.l = true;
    E.makerGenerate(W, Q, seeded(SEED * 9000 + i));
    if (Q.f.deathYear.v === String(y + 5 + (i % 30)) && !E.makerProblems(W, Q).length) c.futureDeathKept++; else note('futureDeathKept', `future death: ${E.makerProblems(W, Q)[0] || Q.f.deathYear.v}`);
    // 5. someone dead before arrival, or born after it, is caught
    const D = E.makerBlank(W); D.f.deathYear.v = String(y - 1); D.f.deathYear.l = true; E.makerGenerate(W, D, seeded(SEED * 11000 + i));
    if (E.makerProblems(W, D).some(t => /already be dead/.test(t))) c.deadCaught++;
    const U = E.makerBlank(W); U.f.birthYear.v = String(y + 3); U.f.birthYear.l = true; E.makerGenerate(W, U, seeded(SEED * 13000 + i));
    if (E.makerProblems(W, U).some(t => /not be born yet/.test(t))) c.unbornCaught++;
  }
  const p = c.outOfAgeRange + c.deadOnArrival + c.badText + c.emptyStory + c.notMovable + c.lockedChanged + c.lockedRowsLost + c.notRepeatable + (N - c.futureDeathKept) + (N - c.deadCaught) + (N - c.unbornCaught);
  total.made += c.made; total.problems += p;
  console.log(`${era}: arrival ${y} |`, JSON.stringify(c), `| problems ${p}`); probs.forEach(m => console.log('   ', m));
}
console.log(`maker not offered yet in: ${notAvailable.join(', ')}`);
console.log(`TOTAL made ${total.made}, PROBLEMS ${total.problems}`);
