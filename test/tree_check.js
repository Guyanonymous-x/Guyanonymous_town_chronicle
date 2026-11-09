// Checks family-tree layouts: no overlapping boxes, every line connects drawn people. Usage: node tree_check.js era years
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js', 'family.js', 'sim.js', 'econ.js', 'society.js', 'lives.js', 'census.js', 'edit.js', 'viz.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n') + '\n;this.__set = w => { W = w; };';
const ctx = { module: { exports: {} }, console, Date, Math, JSON }; vm.createContext(ctx); vm.runInContext('var W;' + src, ctx);
const E = ctx.module.exports;
const era = process.argv[2] || 'medieval', years = +(process.argv[3] || 20);
const Wd = E.createCommunity({ era, population: 600, seed: 5, name: 'T', options: { gathering: 'families' } });
for (let i = 0; i < years; i++) E.advanceYear(Wd);
ctx.__set(Wd);
const optsList = [
  { up: 2, down: 2, spouses: true, former: false, siblings: true, siblingLines: false, dead: true, gone: true },
  { up: 4, down: 4, spouses: true, former: true, siblings: true, siblingLines: true, dead: true, gone: true },
  { up: 3, down: 0, spouses: false, former: false, siblings: false, siblingLines: false, dead: false, gone: false },
  { up: 0, down: 5, spouses: true, former: true, siblings: false, siblingLines: false, dead: true, gone: true }
];
let trees = 0, overlaps = 0, badEdges = 0, maxN = 0;
const ids = Object.keys(Wd.people).map(Number);
for (const o of optsList) for (const id of ids) {
  if (!vm.runInContext(`treeOk(${JSON.stringify(o)}, ${id})`, ctx)) continue;
  const r = vm.runInContext(`(() => { const t = buildTree(${id}, ${JSON.stringify(o)}); const pts = [...t.pos.entries()]; let ov = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const a = pts[i][1], b = pts[j][1]; if (Math.abs(a.x - b.x) < TB.w - 0.5 && Math.abs(a.y - b.y) < TB.h - 0.5) ov++; } let be = 0; for (const e of t.edges) { if (e.t === 'couple' && (!t.pos.has(e.a) || !t.pos.has(e.b))) be++; if (e.t === 'child' && !t.pos.has(e.child)) be++; } return [pts.length, ov, be]; })()`, ctx);
  trees++; overlaps += r[1] ? 1 : 0; badEdges += r[2]; maxN = Math.max(maxN, r[0]);
}
console.log(`${era}: ${trees} trees drawn, ${overlaps} with overlapping boxes, ${badEdges} broken lines, largest tree ${maxN} people`);
