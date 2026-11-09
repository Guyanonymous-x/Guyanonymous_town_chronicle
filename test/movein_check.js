// Checks moving made people into towns: arrival, family, locked death years, unlocking, and the whole town staying consistent.
// Usage: node movein_check.js [made people per setting] [years to run after] [seed]
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js', 'family.js', 'sim.js', 'econ.js', 'society.js', 'census.js', 'edit.js', 'export.js', 'maker.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const ctx = { module: { exports: {} }, console, Date, Math, JSON, Blob, Response, CompressionStream, DecompressionStream, TextEncoder, TextDecoder, Uint8Array };
vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.module.exports;
const N = +(process.argv[2] || 40), YEARS = +(process.argv[3] || 35), SEED = +(process.argv[4] || 21);
const seeded = s => { let a = s * 99991 + 7; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

// the same consistency check the editing check uses
function check(W) {
  const P = W.people, probs = [], y = W.year;
  for (const p of Object.values(P)) {
    if (p.died != null && p.died < p.born) probs.push(`${p.id} died before born`);
    if (p.died != null && p.status !== 'dead') probs.push(`${p.id} died but ${p.status}`);
    if (p.status === 'dead' && p.died == null) probs.push(`${p.id} dead no year`);
    for (const k of ['father', 'mother']) if (p[k]) { const par = P[p[k]]; if (!par) { probs.push(`${p.id} missing ${k}`); continue; } if (!par.children.includes(p.id)) probs.push(`${p.id} not in ${k}'s children`); }
    for (const c of p.children) if (!P[c] || (P[c].father !== p.id && P[c].mother !== p.id)) probs.push(`${p.id} child link ${c}`);
    if (p.spouse) { const s = P[p.spouse]; if (!s || s.spouse !== p.id) probs.push(`${p.id} spouse not mutual`); else if (s.died != null || p.died != null) probs.push(`${p.id} married to dead/dead married`); }
    if (p.status === 'resident') { const h = W.households[p.household]; if (!h || !h.members.includes(p.id)) probs.push(`${p.id} household`); if (y - p.born < 15 && !h.members.some(id => P[id].status === 'resident' && P[id].died == null && y - P[id].born >= 15)) probs.push(`${p.id} child alone`); }
    for (const e of p.events) { for (const m of e.text.matchAll(/@(\d+)/g)) if (!P[m[1]]) probs.push(`${p.id} event ref ${m[1]}`); if (/undefined|NaN|\[object|\$\{/.test(e.text)) probs.push(`${p.id} bad event text: ${e.text.slice(0, 60)}`); }
  }
  for (const h of Object.values(W.households)) for (const id of h.members) if (!P[id] || P[id].household !== h.id) probs.push(`hh ${h.id} member ${id}`);
  for (const w of Object.values(W.workplaces)) for (const id of w.members) if (!P[id] || P[id].workplace !== w.id) probs.push(`wp ${w.id} member ${id}`);
  for (const r of Object.values(W.rels)) if (!P[r.a] || !P[r.b] || !Number.isFinite(r.score)) probs.push('rel bad');
  return probs;
}

let T = { problems: 0 };
(async () => {
for (const era of Object.keys(E.MAKER_SETTINGS)) {
  const W = E.createCommunity({ era, population: 300, seed: SEED, name: 'T' }); E.upgradeWorld(W);
  const y0 = W.year, r = seeded(SEED), probs = [], plans = [];
  const c = { planned: 0, refused: 0, arrived: 0, partners: 0, kidsCame: 0, kidsStayed: 0, wrongDetails: 0, wrongFamily: 0, lwEvents: 0, literacyWrong: 0, sameJob: 0, jobInTown: 0,
    locked: 0, diedInLockedYear: 0, diedEarly: 0, outlivedLock: 0, unlocked: 0, unlockOk: 0, diePlanBlocked: 0, askSexBlocked: 0, askSexOk: 0, otherTraitsWrong: 0, partnerGoneInYear: 0, lockAfterRun: 0 };
  const bad = (k, m) => { c[k]++; if (probs.length < 10) probs.push(m); };
  for (let i = 0; i < N; i++) {
    const P = E.makerGenerate(W, E.makerBlank(W), seeded(SEED * 1000 + i));
    if (P.f.gender.v === 'Non-binary') { P.f.gender.v = r() < 0.5 ? 'Man' : 'Woman'; P.f.gender.l = true; }
    if (i % 4 === 0) { P.f.deathYear.v = String(y0 + (i % 8 === 0 ? 0 : 1 + Math.floor(r() * 30))); P.f.deathYear.l = true; }
    // someone typed in, whose sex can't be told from the name: the plan must ask
    if (i % 5 === 0) {
      const row = { id: 'typed' + i, locked: true, relation: 'Child', name: 'Zyxtrel ' + P.f.lastName.v, born: String(y0 - 3), died: '', joined: '', notes: '' };
      if (+P.f.birthYear.v <= y0 - 20) { P.lists.family.push(row); if (E.addPlan(W, { kind: 'madePerson', s: 0, person: JSON.parse(JSON.stringify(P)), sexes: {} })) c.askSexBlocked++; else bad('askSexBlocked', 'plan accepted without asking a child\'s sex'); P.tcSexes = { [row.id]: r() < 0.5 ? 'm' : 'f' }; }
    }
    const sexes = Object.assign({}, P.tcSexes || {});
    for (const row of P.lists.family) if (!E.makerRowSex(W, P, row) && !sexes[row.id]) sexes[row.id] = r() < 0.5 ? 'm' : 'f';
    const pl = { kind: 'madePerson', s: i % 4, person: JSON.parse(JSON.stringify(P)), sexes };
    const err = E.addPlan(W, pl);
    if (err) { bad('refused', `refused: ${err}`); continue; }
    c.planned++; if (P.lists.family.some(x => x.id === 'typed' + i)) c.askSexOk++;
    plans.push(pl);
  }
  E.advanceYear(W);
  for (const pl of plans) {
    const P = pl.person, main = Object.values(W.people).find(p => p.made && p.made.plan === pl.id);
    if (pl.status !== 'done' || !main) { bad('refused', `plan ${pl.id} ${pl.status}: ${pl.result}`); continue; }
    c.arrived++;
    const v = k => String(P.f[k].v).trim();
    if (main.first !== v('firstName') || main.born !== +v('birthYear') || main.sex !== (v('gender') === 'Man' ? 'm' : 'f') || main.arrived !== y0) bad('wrongDetails', `${main.first}: details differ`);
    if (!main.events.some(e => e.t === 'arrived' && e.y === y0)) bad('wrongDetails', `${main.first}: no arrival`);
    c.lwEvents += main.events.filter(e => e.lw).length;
    if (main.events.some(e => e.lw && e.y > y0)) bad('wrongDetails', `${main.first}: history after arrival`);
    if (main.events.some(e => e.lw && /^died\b/i.test(e.text))) bad('wrongDetails', `${main.first}: a death line in their life before arriving`);
    const party = E.makerParty({ year: y0, era }, P);
    if (party.partner) {
      // the partner may have died, or the couple split, during the year; find them by their arrival with this person
      const m = W.people[main.spouse] || Object.values(W.people).find(q => q.arrived === y0 && q.events.some(e => e.t === 'arrived' && e.text.includes('@' + main.id + '.')) && q.events.some(e => /^(Married|Moved in with) @/.test(e.text) && e.text.includes('@' + main.id)));
      if (!m) bad('wrongFamily', `${main.first}: partner missing`); else { c.partners++; if (main.spouse !== m.id) { c.partnerGoneInYear++; if (probs.length < 10) probs.push(`(info) ${main.first} & ${m.first}: ${m.died != null ? m.first + ' died, ' + m.cause : main.died != null ? main.first + ' died, ' + main.cause : 'split up'}`); } if (m.first !== party.partner.name.split(' ')[0]) bad('wrongFamily', 'partner name'); }
    }
    if (main.children.length !== party.kids.length) bad('wrongFamily', `${main.first}: ${main.children.length} children, expected ${party.kids.length}`);
    for (const id of main.children) { const k = W.people[id]; if (k.status === 'departed') c.kidsStayed++; else c.kidsCame++; if (y0 - k.born < 18 && k.status === 'departed') bad('wrongFamily', 'young child stayed behind'); }
    // reading and writing: in older settings, schooling other than only an apprenticeship
    if (!W.settings.familySizeLimit) { const edu = P.lists.edu.filter(x => String(x.what || '').trim()); const want = edu.some(x => x.stage ? x.stage !== 'apprentice' : !/apprentic/i.test(x.what)); if (main.literate !== want) bad('literacyWrong', `${main.first}: literate ${main.literate}, schooling says ${want}`); }
    const words = String(P.f.traits.v).split(/,|;|\band\b/).map(x => x.trim().toLowerCase()).filter(Boolean);
    if (JSON.stringify(main.made.otherTraits) !== JSON.stringify(words.filter(w => !E.MAKER_TRAIT_WORDS[w]))) bad('otherTraitsWrong', 'other traits');
    if (main.made.job) { const o = (E.ERAS[era].occupations || []).find(x => x.name.toLowerCase() === main.made.job.toLowerCase()); if (o) { c.jobInTown++; if (main.occId === o.id) c.sameJob++; } }
    if (main.lockedDeath) { c.locked++; if (E.planCheck(W, { kind: 'die', who: main.id, s: 0 })) c.diePlanBlocked++; else bad('diePlanBlocked', 'death plan allowed for a locked person'); }
  }
  // unlock a few and run the years forward
  for (const q of Object.values(W.people)) if (q.lockedDeath && q.died != null) { if (q.died === q.lockedDeath.y) c.diedInLockedYear++; else bad('diedEarly', `${q.first} died ${q.died}, locked ${q.lockedDeath.y}`); }
  const lockedPeople = Object.values(W.people).filter(p => p.lockedDeath && p.died == null);
  const toUnlock = lockedPeople.filter(p => p.lockedDeath.y > W.year + 3).slice(0, 2);
  for (const p of toUnlock) { const was = p.lockedDeath.y; c.unlocked++; if (!E.makerUnlockDeath(W, p) && !p.lockedDeath && !(W.lockedDeaths || []).includes(p.id)) c.unlockOk++; p._was = was; }
  const watch = lockedPeople.filter(p => !toUnlock.includes(p)).map(p => [p, p.lockedDeath.y]);
  for (let k = 0; k < YEARS; k++) E.advanceYear(W);
  for (const [p, ly] of watch) {
    if (ly > W.year - 1 && p.died == null) { c.lockAfterRun++; continue; }
    if (p.died === ly) c.diedInLockedYear++;
    else if (p.died != null && p.died < ly) bad('diedEarly', `${p.first} died ${p.died}, locked ${ly}`);
    else if (W.year > ly && p.died == null && p.status === 'resident') bad('outlivedLock', `${p.first} alive after locked ${ly}`);
  }
  const consistency = check(W);
  consistency.slice(0, 5).forEach(m => probs.push('town: ' + m));
  // exports still work with made people in them
  // exports with made people in them: written like export_check.js, so export_verify.py can read every person and cell back
  let expOk = true; const out = '/tmp/exp_made'; fs.mkdirSync(out, { recursive: true });
  try {
    const g = E.exportGedcom(W, { secrets: false }); fs.writeFileSync(`${out}/${era}.ged`, g.text);
    const exp = { people: {}, families: g.families };
    for (const p of Object.values(W.people)) {
      const life = (p.events || []).filter(e => !e.secret).map(e => `${e.y}${e.s != null ? ' ' + ['Spring', 'Summer', 'Autumn', 'Winter'][e.s] : ''}: ${E.plainText(W, e.text)}${e.why ? ' (' + E.plainText(W, e.why) + ')' : ''}`);
      const made = p.made ? ['', ...E.makerDetailText(W, p).split('\n')] : [];
      exp.people[p.id] = { first: p.first, last: p.last, birth: p.birthName && p.birthName !== p.last && p.sex === 'f' ? p.birthName : p.last, sex: p.sex === 'm' ? 'M' : 'F', born: p.born, died: p.died, father: p.father && W.people[p.father] ? p.father : null, mother: p.mother && W.people[p.mother] ? p.mother : null,
        spouse: p.spouse || null, note: ['', ...life, ...made], lifeCount: life.length, status: p.status };
    }
    fs.writeFileSync(`${out}/${era}.json`, JSON.stringify(exp));
    const { blob, sheets } = await E.exportWorkbook(W, { secrets: false });
    fs.writeFileSync(`${out}/${era}.xlsx`, Buffer.from(await blob.arrayBuffer()));
    fs.writeFileSync(`${out}/${era}.sheets.json`, JSON.stringify(sheets.map(s => ({ name: s.name, rows: s.rows }))));
    const ms = sheets.find(s => s.name === 'Made people'), nMade = Object.values(W.people).filter(q => q.made).length;
    c.madeSheetRows = ms ? ms.rows.length - 1 : 0; if (c.madeSheetRows !== nMade) bad('wrongDetails', `Made people sheet has ${c.madeSheetRows} rows, ${nMade} made people`);
    c.gedMadeNotes = (g.text.match(/Made with the person maker\./g) || []).length; if (c.gedMadeNotes !== nMade) bad('wrongDetails', `family-tree file has ${c.gedMadeNotes} made notes, ${nMade} made people`);
  } catch (e) { expOk = false; probs.push('export: ' + e.message); }
  const p = c.refused + c.wrongDetails + c.wrongFamily + c.literacyWrong + c.diedEarly + c.outlivedLock + c.otherTraitsWrong + (c.locked - c.diePlanBlocked) + (c.unlocked - c.unlockOk) + consistency.length + (expOk ? 0 : 1);
  T.problems += p;
  console.log(`${era} (arrive ${y0}, run to ${W.year}):`, JSON.stringify(c), `| town problems ${consistency.length} | exports ${expOk ? 'ok' : 'FAILED'} | problems ${p}`);
  probs.forEach(m => console.log('   ', m));
}
console.log(`TOTAL PROBLEMS ${T.problems}`);
})();
