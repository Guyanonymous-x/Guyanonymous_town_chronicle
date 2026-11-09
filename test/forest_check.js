// Checks the whole-family and whole-community box trees. Usage: node forest_check.js era years seed
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js', 'family.js', 'sim.js', 'econ.js', 'society.js', 'census.js', 'edit.js', 'viz.js', 'forest.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n') + '\n;this.__set = w => { W = w; };';
const ctx = { module: { exports: {} }, console, Date, Math, JSON }; vm.createContext(ctx); vm.runInContext('var W; var esc = s => String(s); var statusWord = p => p.status; ' + src, ctx);
const E = ctx.module.exports;
const era = process.argv[2] || 'medieval', years = +(process.argv[3] || 20), seed = +(process.argv[4] || 5);
const Wd = E.createCommunity({ era, population: 800, seed, name: 'T', options: { gathering: 'families' } });
for (let i = 0; i < years; i++) E.advanceYear(Wd);
ctx.__set(Wd); ctx.Wd = Wd;
const optsList = [
  { spouses: true, former: true, dead: true, gone: true, down: 99 },
  { spouses: true, former: false, dead: false, gone: false, down: 99 },
  { spouses: true, former: true, dead: true, gone: false, down: 2 },
];
const check = `(carriers, o) => {
  const t0 = Date.now(); const f = forestLayout(carriers, o); const ms = Date.now() - t0;
  const shownC = carriers.filter(id => treeOk(o, id));
  let missing = 0, twice = 0; const mains = new Map(); for (const b of f.boxes) if (b.kind === 'main') mains.set(b.id, (mains.get(b.id) || 0) + 1);
  for (const [id, n] of mains) if (n > 1) twice++;
  const partnerIds = new Set(f.boxes.filter(b => b.kind === 'partner').map(b => b.id));
  if (o.down >= 99) for (const id of shownC) if (!mains.has(id) && !partnerIds.has(id)) missing++;
  const rows = new Map(); for (const b of f.boxes) { if (!rows.has(b.y)) rows.set(b.y, []); rows.get(b.y).push(b.x); }
  let over = 0; for (const xs of rows.values()) { xs.sort((a, b) => a - b); for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] < TB.w - 0.5) over++; }
  let badShown = 0; for (const b of f.boxes) for (const i of (b.ids || [b.id])) if (!treeOk(o, i)) badShown++;
  const copies = f.boxes.filter(b => b.kind === 'copy' || b.kind === 'kids' || (b.kind === 'partner' && mains.has(b.id))).length;
  return [shownC.length, mains.size, f.boxes.length, copies, missing, twice, over, badShown, ms];
}`;
let tot = { trees: 0, missing: 0, twice: 0, over: 0, bad: 0 };
const fams = [...new Set(Object.values(Wd.people).filter(p => p.status === 'resident').map(p => p.birthName || p.last))];
for (const o of optsList) {
  const all = Object.keys(Wd.people).map(Number);
  const r = vm.runInContext(`(${check})(${JSON.stringify(all)}, ${JSON.stringify(o)})`, ctx);
  console.log(`  whole community ${JSON.stringify(o)}: ${r[0]} could be shown, ${r[1]} full boxes, ${r[2]} boxes in all (${r[3]} copies), missing ${r[4]}, drawn in full twice ${r[5]}, overlapping ${r[6]}, wrongly shown ${r[7]}, ${r[8]} ms`);
  tot.trees++; tot.missing += r[4]; tot.twice += r[5]; tot.over += r[6]; tot.bad += r[7];
  for (const fn of fams) {
    const c = Object.values(Wd.people).filter(p => (p.birthName || p.last) === fn).map(p => p.id);
    const q = vm.runInContext(`(${check})(${JSON.stringify(c)}, ${JSON.stringify(o)})`, ctx);
    tot.trees++; tot.missing += q[4]; tot.twice += q[5]; tot.over += q[6]; tot.bad += q[7];
  }
}
console.log(`${era}: ${Object.keys(Wd.people).length} people ever, ${fams.length} families, ${tot.trees} trees checked — missing ${tot.missing}, twice ${tot.twice}, overlapping ${tot.over}, wrongly shown ${tot.bad}`);
if (process.argv[5] === 'why') {
  const o = optsList[0];
  const r = vm.runInContext(`(() => { const all = Object.keys(W.people).map(Number); const f = forestLayout(all, ${JSON.stringify(o)}); const have = new Set(f.boxes.filter(b => b.kind === 'main' || b.kind === 'partner').map(b => b.id)); return all.filter(id => treeOk(${JSON.stringify(o)}, id) && !have.has(id)).map(id => { const p = W.people[id]; return [id, p.status, p.father, p.mother, p.spouse, p.children.length, (p.widowedOf||[]).length, (p.exes||[]).length, f.boxes.some(b => b.id === id)]; }); })()`, ctx);
  console.log(JSON.stringify(r));
}
if (process.argv[5] === 'kinds') console.log(vm.runInContext(`(() => { const all = Object.keys(W.people).map(Number); const f = forestLayout(all, ${JSON.stringify(optsList[0])}); const main = new Set(f.boxes.filter(b => b.kind === 'main').map(b => b.id)); const k = {}; for (const b of f.boxes) { const n = b.kind === 'partner' ? (main.has(b.id) ? 'partner copy' : 'partner only here') : b.kind; k[n] = (k[n] || 0) + 1; } return JSON.stringify(k) + ' roots drawn ' + f.drawnRoots.length; })()`, ctx));
