// Full consistency check of generated towns, every era. Usage: node check.js [population] [seed]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const ctx = { module: { exports: {} }, console, Date, Math, JSON };
vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const N = +(process.argv[2] || 1000), SEED = +(process.argv[3] || 12345);
const eras = process.argv[4] ? [process.argv[4]] : ['medieval', 'frontier', 'modern', 'fantasy', 'scifi', 'dropped'];
let totalProblems = 0;
for (const era of eras) {
  const modes = era === 'dropped' ? ['mixed', 'strangers', 'families'] : [null];
  for (const mode of modes) {
    const t0 = Date.now();
    const W = E.createCommunity({ era, population: N, seed: SEED, name: 'Testville', options: mode ? { gathering: mode } : {} });
    const ms = Date.now() - t0;
    const y = W.year; const P = W.people; const probs = [];
    const all = Object.values(P);
    const res = all.filter(p => p.status === 'resident' && p.died == null);
    if (res.length !== N) probs.push(`residents ${res.length} != ${N}`);
    for (const p of all) {
      if (p.died != null && p.died < p.born) probs.push(`${p.id} died before born`);
      if (p.status === 'dead' && p.died == null) probs.push(`${p.id} dead without year`);
      if (p.died != null && p.status !== 'dead') probs.push(`${p.id} died but status ${p.status}`);
      for (const k of ['father', 'mother']) if (p[k]) {
        const par = P[p[k]]; if (!par) { probs.push(`${p.id} missing ${k}`); continue; }
        if (!par.children.includes(p.id)) probs.push(`${p.id} not in ${k}'s children`);
        const gap = p.born - par.born; if (gap < 12) probs.push(`${p.id} ${k} only ${gap} older`);
        if (k === 'mother' && gap > 50) probs.push(`${p.id} mother ${gap} at birth`);
        if (par.died != null && par.died < p.born - (k === 'father' ? 1 : 0)) probs.push(`${p.id} born after ${k} died`);
      }
      for (const c of p.children) { const k = P[c]; if (!k) probs.push(`${p.id} missing child ${c}`); else if (k.father !== p.id && k.mother !== p.id) probs.push(`${p.id} child ${c} lacks link back`); }
      if (p.spouse) { const s = P[p.spouse]; if (!s) probs.push(`${p.id} missing spouse`); else if (s.spouse !== p.id) probs.push(`${p.id} spouse not reciprocal`); else if (s.died != null) probs.push(`${p.id} married to dead`); }
      if (p.status === 'resident' && p.died == null) {
        const h = W.households[p.household]; if (!h) probs.push(`${p.id} no household`); else if (!h.members.includes(p.id)) probs.push(`${p.id} not in own household list`);
      }
      for (const e of p.events) for (const m of e.text.matchAll(/@(\d+)/g)) if (!P[m[1]]) probs.push(`${p.id} event refers to missing ${m[1]}`);
      for (const m of (p.bio || '').matchAll(/@(\d+)/g)) if (!P[m[1]]) probs.push(`${p.id} bio refers to missing ${m[1]}`);
      if (p.spouse && P[p.spouse] && E.closelyRelated(W, p, P[p.spouse])) probs.push(`${p.id} married close relative`);
    }
    for (const h of Object.values(W.households)) for (const id of h.members) { const p = P[id]; if (!p) probs.push(`household ${h.id} missing member ${id}`); else if (p.household !== h.id) probs.push(`household ${h.id} lists ${id} who lives elsewhere`); }
    for (const r of Object.values(W.rels)) if (!P[r.a] || !P[r.b]) probs.push(`rel to missing person`);
    for (const w of Object.values(W.workplaces)) for (const id of w.members) if (!P[id] || P[id].workplace !== w.id) probs.push(`workplace ${w.id} member mismatch ${id}`);
    for (const g of Object.values(W.groups)) for (const id of g.members) if (!P[id]) probs.push(`group missing ${id}`);
    // kids living with no adult
    for (const p of res) if (E.ageOf(p, y) < 15) { const h = W.households[p.household]; if (!h.members.some(id => P[id].died == null && P[id].status === 'resident' && E.ageOf(P[id], y) >= 16)) probs.push(`child ${p.id} (age ${E.ageOf(p, y)}) lives with no adult`); }
    // summaries
    const ages = res.map(p => E.ageOf(p, y)).sort((a, b) => a - b);
    const band = (lo, hi) => ages.filter(a => a >= lo && a <= hi).length;
    const adultDeaths = all.filter(p => p.died != null && p.died - p.born >= 15);
    const avgAdultDeath = adultDeaths.reduce((s, p) => s + (p.died - p.born), 0) / (adultDeaths.length || 1);
    const infant = all.filter(p => p.died != null && p.died - p.born <= 0).length, born = all.filter(p => p.events.some(e => e.t === 'born' && e.text.startsWith('Born to'))).length;
    const hh = Object.values(W.households).filter(h => h.members.some(id => P[id].status === 'resident' && P[id].died == null));
    const adults = res.filter(p => E.ageOf(p, y) >= 18);
    const occ = {}; for (const p of res) occ[p.occupation || '(none)'] = (occ[p.occupation || '(none)'] || 0) + 1;
    const rels = Object.values(W.rels); const rt = {}; for (const r of rels) rt[r.type] = (rt[r.type] || 0) + 1;
    const statuses = {}; for (const p of all) statuses[p.status] = (statuses[p.status] || 0) + 1;
    const kidsPerWoman = (() => { const w = all.filter(p => p.sex === 'f' && p.born <= y - 50 && p.born >= y - 80 && (p.died == null || p.died - p.born >= 45)); return w.length ? (w.reduce((s, p) => s + p.children.length, 0) / w.length).toFixed(2) : '-'; })();
    console.log(`\n=== ${era}${mode ? ' / ' + mode : ''}  (${ms} ms, seed ${SEED}) ===`);
    console.log(`records: ${all.length} people`, JSON.stringify(statuses));
    console.log(`residents ${res.length} | ages 0-4:${band(0, 4)} 5-14:${band(5, 14)} 15-29:${band(15, 29)} 30-44:${band(30, 44)} 45-64:${band(45, 64)} 65-79:${band(65, 79)} 80+:${band(80, 200)} | median ${ages[Math.floor(ages.length / 2)]} | oldest ${ages[ages.length - 1]}`);
    console.log(`men ${res.filter(p => p.sex === 'm').length} women ${res.filter(p => p.sex === 'f').length} | adults married/partnered ${adults.filter(p => p.spouse).length}/${adults.length} | widowed ${adults.filter(p => !p.spouse && p.widowedOf && p.widowedOf.length).length} | divorced/split ${adults.filter(p => !p.spouse && p.exes.length).length}`);
    console.log(`households ${hh.length} (avg size ${(res.length / hh.length).toFixed(2)}) | hermits ${res.filter(p => p.hermit).length} | avg adult age at death ${avgAdultDeath.toFixed(1)} | infant deaths ${infant}/${born} births | children per woman (completed) ${kidsPerWoman}`);
    console.log(`relationships: ${JSON.stringify(rt)} | groups ${Object.keys(W.groups).length} | feuds ${Object.keys(W.feuds).length} | workplaces ${Object.keys(W.workplaces).length}`);
    console.log('top jobs:', Object.entries(occ).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${v}`).join(', '));
    console.log(`file size about ${(JSON.stringify(W).length / 1e6).toFixed(2)} MB`);
    const uniq = [...new Set(probs)];
    console.log(uniq.length ? `PROBLEMS (${probs.length}): ` + uniq.slice(0, 12).join(' | ') : 'problems: 0');
    totalProblems += probs.length;
    if (process.env.SAMPLE) { const s = res[Math.floor(res.length / 3)]; console.log(s.bio); console.log(s.events.map(e => `${e.y}: ${e.text}${e.why ? ' (' + e.why + ')' : ''}`).join('\n')); }
  }
}
console.log('\nTOTAL PROBLEMS:', totalProblems);
