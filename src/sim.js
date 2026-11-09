// ================= Stage 2a: the yearly life engine =================
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

// ---------- extra settings (starting estimates, editable) ----------
Object.assign(SETTING_INFO, {
  arrivals: { label: 'Newcomers per year, per 1,000 people', unit: 'number', min: 0, max: 100 },
  leaving: { label: 'Yearly chance a young single adult moves away', unit: 'chance', min: 0, max: 0.3 },
  familiesLeaving: { label: 'Yearly chance a whole household moves away', unit: 'chance', min: 0, max: 0.2 },
  medicine: { label: 'How well illness and injury are treated (0 = none, 1 = like today)', unit: 'factor', min: 0, max: 1 },
  outbreaks: { label: 'Yearly chance of an outbreak of disease', unit: 'chance', min: 0, max: 1 },
  accidents: { label: 'Accident risk (1 = normal for this setting)', unit: 'factor', min: 0, max: 5 }
});
const EXTRA_DEFAULTS = {
  medieval: { arrivals: 6, leaving: 0.02, familiesLeaving: 0.002, medicine: 0.05, outbreaks: 0.28, accidents: 1 },
  frontier: { arrivals: 24, leaving: 0.06, familiesLeaving: 0.02, medicine: 0.15, outbreaks: 0.25, accidents: 1 },
  modern: { arrivals: 26, leaving: 0.07, familiesLeaving: 0.022, medicine: 0.9, outbreaks: 0.08, accidents: 1 },
  fantasy: { arrivals: 8, leaving: 0.025, familiesLeaving: 0.003, medicine: 0.2, outbreaks: 0.22, accidents: 1 },
  scifi: { arrivals: 12, leaving: 0.03, familiesLeaving: 0.01, medicine: 0.95, outbreaks: 0.12, accidents: 1 },
  dropped: { arrivals: 0, leaving: 0, familiesLeaving: 0, medicine: 0.1, outbreaks: 0.3, accidents: 1.4 }
};
for (const k of Object.keys(EXTRA_DEFAULTS)) Object.assign(ERAS[k].settings, EXTRA_DEFAULTS[k]);

// ---------- illnesses ----------
// c = how easily it spreads, base = chance per season of catching it anyway, sm = season multipliers,
// lethal = chance it kills a healthy adult with no treatment, kid/old = extra risk for children / the old
const DISEASES = [
  { id: 'cold', name: 'a bad cold', eras: 'all', c: 0.05, base: 0.05, sm: [1, .5, 1.1, 1.7], lethal: 0.0004, kid: 2, old: 4 },
  { id: 'fever', name: 'a fever', eras: ['medieval', 'frontier', 'fantasy', 'dropped'], c: 0.04, base: 0.02, sm: [1, 1.3, 1, 1], lethal: 0.025, kid: 2.5, old: 3, lasting: [['a weak chest', 0.05]] },
  { id: 'flu', name: 'influenza', eras: 'all', c: 0.1, base: 0.008, sm: [0.7, .2, 1, 2.6], lethal: 0.012, kid: 2, old: 6, outbreak: 3 },
  { id: 'measles', name: 'measles', eras: ['medieval', 'frontier', 'fantasy', 'modern', 'dropped'], c: 0.22, base: 0.002, sm: [1.5, 1, .8, 1], lethal: 0.01, kid: 4, old: 1, childish: true, outbreak: 2, lasting: [['poor eyesight', 0.04], ['deafness in one ear', 0.03]] },
  { id: 'pox', name: 'smallpox', eras: ['medieval', 'frontier'], c: 0.2, base: 0.0004, sm: [1, 1, 1, 1.2], lethal: 0.22, kid: 1.5, old: 1.5, outbreak: 1.5, lasting: [['pockmarked skin', 0.65], ['blindness in one eye', 0.05]] },
  { id: 'flux', name: 'the bloody flux', eras: ['medieval', 'fantasy', 'dropped'], c: 0.08, base: 0.01, sm: [.8, 2.2, 1.3, .4], lethal: 0.06, kid: 2.5, old: 3, outbreak: 2 },
  { id: 'cholera', name: 'cholera', eras: ['frontier'], c: 0.14, base: 0.0008, sm: [.8, 2.5, 1.2, .3], lethal: 0.3, kid: 1.5, old: 2, outbreak: 2 },
  { id: 'typhoid', name: 'typhoid', eras: ['medieval', 'frontier'], c: 0.06, base: 0.003, sm: [.8, 1.8, 1.2, .6], lethal: 0.12, kid: 1.3, old: 2 },
  { id: 'consumption', name: 'consumption', eras: ['medieval', 'frontier', 'fantasy'], c: 0.015, base: 0.0015, sm: [1, 1, 1, 1.3], lethal: 0.18, kid: 1, old: 1.5, lasting: [['a weak chest', 0.6]] },
  { id: 'pestilence', name: 'the great pestilence', eras: ['medieval'], c: 0.3, base: 0, sm: [1, 1.4, 1.2, .7], lethal: 0.45, kid: 1.2, old: 1.4, outbreak: 0.15, outbreakOnly: true },
  { id: 'scarlet', name: 'scarlet fever', eras: ['frontier', 'modern'], c: 0.12, base: 0.002, sm: [1.2, .6, 1, 1.4], lethal: 0.05, kid: 3, old: 0.5, childish: true, outbreak: 1 },
  { id: 'pneumonia', name: 'pneumonia', eras: 'all', c: 0, base: 0.003, sm: [.8, .4, 1, 2.4], lethal: 0.12, kid: 1.5, old: 5 },
  { id: 'stomach', name: 'a stomach bug', eras: ['modern', 'scifi'], c: 0.08, base: 0.03, sm: [1, 1, 1, 1.4], lethal: 0, kid: 1, old: 1 },
  { id: 'virus', name: 'a new respiratory virus', eras: ['modern'], c: 0.14, base: 0, sm: [1, .6, 1, 1.8], lethal: 0.05, kid: 0.2, old: 8, outbreak: 0.6, outbreakOnly: true },
  { id: 'microbe', name: 'a native microbe fever', eras: ['scifi'], c: 0.12, base: 0, sm: [1, 1, 1, 1], lethal: 0.06, kid: 1.5, old: 3, outbreak: 2, outbreakOnly: true, lasting: [['a weak chest', 0.1]] },
  { id: 'greyfever', name: 'the grey fever', eras: ['fantasy'], c: 0.18, base: 0, sm: [1, 1, 1.3, 1.3], lethal: 0.12, kid: 2, old: 2, outbreak: 2, outbreakOnly: true },
  { id: 'wasting', name: 'the wasting curse', eras: ['fantasy'], c: 0, base: 0.0008, sm: [1, 1, 1, 1], lethal: 0.3, kid: 1, old: 1 },
  { id: 'unknownfever', name: 'an unknown fever', eras: ['dropped'], c: 0.1, base: 0.006, sm: [1, 1.4, 1, .8], lethal: 0.07, kid: 2, old: 3, outbreak: 2 },
  { id: 'badwater', name: 'sickness from bad water', eras: ['dropped'], c: 0.02, base: 0.02, sm: [1, 1.8, 1, .5], lethal: 0.02, kid: 3, old: 2, lasting: [['a weak stomach', 0.1]] }
];
function diseasesFor(W) { return DISEASES.filter(d => d.eras === 'all' || d.eras.includes(W.era)); }

// ---------- injuries ----------
const INJURY_RISK = { farming: 0.05, labor: 0.06, craft: 0.035, animals: 0.06, outdoors: 0.07, fighting: 0.1, healing: 0.01, learning: 0.008, trade: 0.012, arts: 0.015, leadership: 0.01, magic: 0.03 };
const INJURIES = {
  farming: ['gored by an ox', 'a fall from a hay wagon', 'a deep cut from a scythe', 'crushed under a cart wheel'],
  labor: ['a crushed hand', 'a fall from a ladder', 'a back wrenched lifting', 'struck by a falling beam'],
  craft: ['a bad burn at work', 'a hand caught in a tool', 'a deep cut from a blade', 'a splinter that went bad'],
  animals: ['kicked by a horse', 'trampled by cattle', 'a bad bite from an animal', 'thrown from a horse'],
  outdoors: ['a fall from a tree', 'attacked by a wild animal', 'a fall down a ravine', 'nearly drowned in the river'],
  fighting: ['wounded in a fight', 'a blade wound', 'a broken jaw in a brawl', 'an arrow wound'],
  mining: ['a cave-in', 'a blasting accident', 'a fall down a shaft'],
  child: ['a broken arm from a fall', 'a fall from a tree', 'a nasty burn from the hearth', 'nearly drowned playing by the water'],
  elder: ['a bad fall at home', 'a broken hip', 'a fall on the ice'],
  travel: { modern: 'a car crash', scifi: 'a shuttle-bay accident', frontier: 'a stagecoach overturning', medieval: 'a cart overturning', fantasy: 'a cart overturning on the king\'s road', dropped: 'a fall while scouting' },
  magic: ['a spell that went wrong', 'a burn from an alchemical mix']
};
const LASTING = ['a limp', 'a bad back', 'two missing fingers', 'a scarred face', 'blindness in one eye', 'constant pain in one leg', 'a stiff arm', 'deafness in one ear'];

// ---------- helpers ----------
function lives(W) { return residentsAlive(W); }
function setSeason(W, s) { W._s = s; }
function tag(W, rng) { return W._s != null ? W._s : rng.int(0, 3); }
function mindOf(p) { if (!p.mind) p.mind = { mood: 0, stress: 20, trauma: 0, guilt: 0, joy: 0, drink: 0, depressed: false, worry: 0, yearStress: 0 }; if (p.mind.yearStress == null) p.mind.yearStress = 0; if (p.mind.joy == null) p.mind.joy = 0; if (p.mind.worry == null) p.mind.worry = 0; return p.mind; }
function relScore(W, a, b) { const r = getRel(W, a, b); return r ? r.score : 0; }
function kinWeights(W, p) {
  // who feels it when something happens to p, and how strongly (0..1)
  const out = new Map();
  const add = (id, w) => { const q = W.people[id]; if (q && isAlive(q) && q.status === 'resident' && id !== p.id) out.set(id, Math.max(out.get(id) || 0, w)); };
  if (p.spouse) add(p.spouse, 1);
  for (const c of p.children) add(c, 0.85);
  add(p.father, 0.9); add(p.mother, 0.95);
  for (const s of siblingsOf(W, p)) add(s, 0.55);
  for (const pid of [p.father, p.mother]) { const par = W.people[pid]; if (par) { add(par.father, 0.35); add(par.mother, 0.4); } }
  for (const c of p.children) { const k = W.people[c]; if (k) for (const g of k.children) add(g, 0.3); }
  for (const r of relsOf(W, p.id)) {
    if (r.ended) continue;
    const other = r.a === p.id ? r.b : r.a;
    if (r.type === 'close friend') add(other, 0.6); else if (r.type === 'friend') add(other, 0.3);
    else if (r.type === 'courting') add(other, 0.8);
    else if (r.type === 'spouse') add(other, 1);
  }
  return out;
}
// relationship index (rebuilt each year)
let REL_INDEX = null;
function buildRelIndex(W) { REL_INDEX = new Map(); for (const [k, r] of Object.entries(W.rels)) { for (const id of [r.a, r.b]) { if (!REL_INDEX.has(id)) REL_INDEX.set(id, []); REL_INDEX.get(id).push(r); } } }
function relsOf(W, id) { if (!REL_INDEX) buildRelIndex(W); return REL_INDEX.get(id) || []; }
function setRelIndexed(W, a, b, type, score, since, reason, extra) {
  const existed = !!getRel(W, a, b);
  const r = setRel(W, a, b, type, score, since, reason, extra);
  if (r && !existed && REL_INDEX) { for (const id of [a, b]) { if (!REL_INDEX.has(id)) REL_INDEX.set(id, []); REL_INDEX.get(id).push(r); } }
  return r;
}
function relNote(r, y, text) { if (!r) return; r.history = r.history || []; r.history.push({ y, s: undefined, text }); if (r.history.length > 30) r.history.splice(0, r.history.length - 30); }

// ripple: something happened to p; family and friends feel it
function ripple(W, rng, p, y, kind, mag, text, opts) {
  opts = opts || {};
  const ws = kinWeights(W, p);
  for (const [id, w0] of ws) {
    const q = W.people[id]; const m = mindOf(q);
    const sens = 0.6 + q.traits.A / 250 + (kind === 'worry' || kind === 'grief' ? q.traits.N / 250 : 0);
    const w = w0 * sens;
    if (kind === 'joy' || kind === 'pride') m.joy += mag * w;
    else if (kind === 'worry') m.worry += mag * w;
    else if (kind === 'shame') { m.stress += mag * w * 0.6; }
    if (text && w0 >= (opts.logAt || 0.6)) addEvent(W, q, y, 'ripple', text.replace('{who}', `@${p.id}`), { minor: true });
  }
  // rivals and enemies feel the opposite (a little)
  if (kind === 'joy' || kind === 'pride' || kind === 'worry') {
    for (const r of relsOf(W, p.id)) {
      if (r.ended || r.score > -30) continue;
      const q = W.people[r.a === p.id ? r.b : r.a]; if (!q || !isAlive(q)) continue;
      const m = mindOf(q);
      if (kind === 'worry') m.joy += mag * 0.15; else m.stress += mag * 0.15;
    }
  }
}

// ---------- world upgrade (older saves and fresh towns) ----------
function upgradeWorld(W) {
  const era = eraOf(W);
  for (const k of Object.keys(SETTING_INFO)) if (W.settings[k] === undefined) W.settings[k] = era.settings[k];
  W.chronicle = W.chronicle || {};
  W.census = W.census || {};
  if (!W.census[W.year]) W.census[W.year] = quickCensus(W, W.year);
  for (const p of Object.values(W.people)) {
    if (p.status !== 'resident' || p.died != null) continue;
    mindOf(p);
    if (!p.skills) {
      p.skills = {};
      const a = ageOf(p, W.year);
      for (const [k, v] of Object.entries(p.aptitude)) p.skills[k] = Math.round(clamp(v * 0.25 + (a > 10 ? Math.min(a - 10, 20) : 0), 0, 100));
      const o = currentOcc(W, p);
      if (o) p.skills[o.skill] = Math.round(clamp(p.aptitude[o.skill] * 0.4 + Math.min(45, (a - (o.min || 16)) * 2.2), 5, 100));
    }
    if (!p.hist) p.hist = [];
    if (p.jobSince == null && p.occId) p.jobSince = Math.max(p.born + 14, W.year - rng0(p.id) % 15);
  }
  // spouse relationships carry the quality of each marriage
  for (const p of Object.values(W.people)) {
    if (!p.spouse || p.id > p.spouse || p.died != null) continue;
    const s = W.people[p.spouse];
    if (!s || s.died != null) continue;
    if (!getRel(W, p.id, s.id) || getRel(W, p.id, s.id).type !== 'spouse') {
      const since = (p.events.filter(e => e.t === 'married' || e.t === 'partnered').pop() || {}).y || W.year;
      const compat = 100 - (Math.abs(p.traits.A - s.traits.A) + Math.abs(p.traits.O - s.traits.O)) / 2;
      setRel(W, p.id, s.id, 'spouse', Math.round(clamp(compat * 0.6 + (p.traits.A + s.traits.A) / 8 - (p.traits.N + s.traits.N) / 10 + (rng0(p.id + s.id) % 30) - 5, 5, 95)), since, s.union === 'partners' ? 'partners' : 'married');
    }
  }
  W.groups && Object.values(W.groups).forEach(g => { g.past = g.past || []; });
  if (!W.started) {
    // the first year should not start with nobody already expecting
    W.started = W.year;
    const r = new Rng((W.seed * 31 + 5) >>> 0);
    for (const w of Object.values(W.people)) {
      if (w.status !== 'resident' || w.died != null || w.sex !== 'f' || !w.spouse) continue;
      const hus = W.people[w.spouse]; if (!hus || hus.sex !== 'm') continue;
      const a = ageOf(w, W.year); const ff = fertilityFactor(a); if (!ff) continue;
      if (W.settings.familySizeLimit && w.children.filter(c => isAlive(W.people[c])).length >= Math.round(((w.desiredKids ?? 2) + (hus.desiredKids ?? 2)) / 2)) continue;
      if (w.children.some(c => W.people[c].born >= W.year - 1)) continue;
      if (r.chance(W.settings.fertility * ff * 0.75)) { const s = r.int(0, 2); w.preg = { y: W.year, s, father: hus.id, secret: null, since: W.year * 4 + s - 3 }; }
    }
    // in the empty world, people want more children to survive
    if (W.era === 'dropped') for (const p of Object.values(W.people)) if (p.status === 'resident' && p.desiredKids != null) p.desiredKids += 1;
  }
  econUpgrade(W);
  socUpgrade(W);
  if (!W.censusDetail || !W.censusDetail[W.year]) takeCensus(W);
  W.version = Math.max(W.version || 1, 4);
  if (typeof livesUpgrade === 'function') livesUpgrade(W); // V10: attitudes and inner lives
}
function rng0(n) { let x = (n * 2654435761) >>> 0; x ^= x >>> 13; return x; }
function currentOcc(W, p) {
  const era = eraOf(W);
  if (!p.occId) return null;
  if (W.era === 'dropped' && String(p.occId).startsWith('role_')) { const r = droppedRoles(W).find(x => 'role_' + x.name.toLowerCase().replace(/[^a-z]+/g, '_') === p.occId); return r ? { id: p.occId, name: r.name, skill: r.skill, min: 14, wp: 'none' } : null; }
  if (p.occId === 'apprentice') { const m = W.people[p.masterId]; const o = m && era.occupations.find(x => x.id === m.occId); return { id: 'apprentice', name: p.occupation, skill: o ? o.skill : 'craft', min: 12, wp: 'employer' }; }
  return era.occupations.find(o => o.id === p.occId) || null;
}

// ---------- the year ----------
function advanceYear(W) {
  upgradeWorld(W);
  const y = W.year;
  const rng = new Rng((W.seed * 1000003 + y * 7919 + 17) >>> 0);
  const era = eraOf(W);
  W._sim = true; W._y = y; W._s = null;
  buildRelIndex(W);
  const R = { y, births: 0, deaths: 0, infantDeaths: 0, causes: {}, marriages: 0, divorces: 0, arrivals: 0, departures: 0, outbreaks: [], illnesses: 0, injuries: 0, miscarriages: 0, newFriends: 0, quarrels: 0, reconciled: 0, jobsStarted: 0, jobsLost: 0, retired: 0, items: [] };
  W._R = R;
  const startPop = lives(W).length;
  for (const p of lives(W)) { const m = mindOf(p); m.joy = 0; m.worry = 0; m.yearStress = 0; p._sick = null; }
  // an outbreak this year?
  const outbreak = planOutbreak(W, y) || pickOutbreak(W, rng, y);
  const Y = econStart(W, rng, y, R);
  for (let s = 0; s < 4; s++) {
    setSeason(W, s);
    runPlans(W, rng, y, s, R);
    if (typeof makerLockedDeaths === 'function') makerLockedDeaths(W, rng, y, s, R);
    econSeason(W, rng, y, s, R, Y);
    seasonHealth(W, rng, y, s, R, outbreak);
    seasonBirths(W, rng, y, s, R);
  }
  W._s = null;
  if (typeof livesYear === 'function') livesYear(W, rng, y, R); // V10: inner lives, attitudes, lasting injuries
  yearRomance(W, rng, y, R);
  yearSocial(W, rng, y, R);
  yearGossip(W, rng, y, R);
  yearWork(W, rng, y, R);
  yearCrime(W, rng, y, R);
  yearPolitics(W, rng, y, R);
  yearHome(W, rng, y, R);
  yearMigration(W, rng, y, R);
  if (W.era === 'dropped') yearLanguages(W, rng, y, R);
  yearMoney(W, rng, y, R, Y);
  yearMind(W, rng, y, R);
  yearFinish(W, rng, y, R, startPop, outbreak, Y);
  delete W._sim; delete W._Y; delete W._y; delete W._s; delete W._R;
  W.year = y + 1;
  W.census[W.year] = quickCensus(W, W.year);
  takeCensus(W);
  REL_INDEX = null;
  return R;
}

function pickOutbreak(W, rng, y) {
  if (!rng.chance(W.settings.outbreaks)) return null;
  const ds = diseasesFor(W).filter(d => d.outbreak);
  if (!ds.length) return null;
  const d = rng.weighted(ds.map(x => [x, x.outbreak]));
  return { d, season: rng.weighted(d.sm.map((v, i) => [i, v])), boost: rng.range(2.5, 5), cases: 0, deaths: 0 };
}

// ---------- health: illness, injury, old age ----------
function seasonHealth(W, rng, y, s, R, outbreak) {
  const S = W.settings;
  const med = clamp(S.medicine, 0, 1);
  const people = lives(W);
  const ds = diseasesFor(W);
  // who is sick right now, by household / workplace / area
  const byHH = {}, byWP = {}, byD = {};
  for (const p of people) if (p._sick && p._sick.s === s - 1) {
    const k = p._sick.d.id;
    const h = W.households[p.household];
    (byHH[p.household] = byHH[p.household] || {})[k] = ((byHH[p.household] || {})[k] || 0) + 1;
    if (p.workplace) (byWP[p.workplace] = byWP[p.workplace] || {})[k] = ((byWP[p.workplace] || {})[k] || 0) + 1;
    if (h) (byD[h.district] = byD[h.district] || {})[k] = ((byD[h.district] || {})[k] || 0) + 1;
  }
  // outbreak arrives
  if (outbreak && outbreak.season === s) {
    const seeds = rng.sample(people, rng.int(2, 6));
    for (const p of seeds) catchIll(W, rng, p, outbreak.d, y, s, R, outbreak, true);
    W.log.push({ y, s, t: 'outbreak', text: `${cap(outbreak.d.name)} broke out in ${W.name}.` });
  }
  for (const p of people) {
    if (!isAlive(p) || (p._sick && p._sick.s === s)) continue;
    const a = ageOf(p, y);
    const h = W.households[p.household];
    // illness
    for (const d of ds) {
      if (d.outbreakOnly && !(outbreak && outbreak.d === d && s >= outbreak.season)) continue;
      let ch = d.base * d.sm[s] * ((W._Y && W._Y.healthMult[s]) || 1);
      const near = ((byHH[p.household] || {})[d.id] || 0) * 0.5 + ((p.workplace && byWP[p.workplace] || {})[d.id] || 0) * 0.12 + ((h && byD[h.district] || {})[d.id] || 0) * 0.015;
      ch += d.c * near * d.sm[s];
      if (outbreak && outbreak.d === d && s >= outbreak.season) ch = ch * outbreak.boost + d.c * 0.02;
      if (d.childish) ch *= a < 15 ? 3 : 0.15;
      ch *= 1.3 - p.health / 200;
      if (rng.chance(ch)) { catchIll(W, rng, p, d, y, s, R, outbreak && outbreak.d === d ? outbreak : null); break; }
    }
    if (!isAlive(p)) continue;
    // injuries
    let risk;
    const o = currentOcc(W, p);
    if (a < 14) risk = { k: 'child', r: 0.035 };
    else if (a >= 70) risk = { k: 'elder', r: 0.03 + (a - 70) * 0.004 };
    else if (o) risk = { k: /miner|mining/i.test(o.name) ? 'mining' : (INJURIES[o.skill] ? o.skill : 'labor'), r: (/miner|mining/i.test(o.name) ? 0.12 : INJURY_RISK[o.skill] || 0.02) };
    else risk = { k: 'labor', r: 0.012 };
    risk.r *= S.accidents * ((p.mind && p.mind.drink > 50) ? 1.8 : 1) * (typeof injuryProneness === 'function' ? injuryProneness(p) : 1); // V10: some lasting injuries make people more accident-prone
    if (rng.chance(risk.r / 4)) injure(W, rng, p, y, s, R, risk.k);
    if (rng.chance((a >= 16 ? (W.era === 'modern' ? 0.006 : 0.003) : 0.001) / 4 * S.accidents)) injure(W, rng, p, y, s, R, 'travel');
    if (!isAlive(p)) continue;
    // background mortality: old age and chronic illness not modelled separately
    const wxm = (W._Y && W._Y.healthMult[s]) || 1;
    const q = deathChance(W, p, y) * (a >= 50 ? 0.75 : 0.35) * (a >= 65 || a < 3 ? wxm : 1) * (W.settle && W.settle.healthBoost ? 1 - W.settle.healthBoost : 1);
    if (rng.chance(1 - Math.pow(1 - q, 0.25))) {
      const era = eraOf(W);
      let cause, kind = 'illness';
      if (a >= 65) { cause = rng.pick(era.oldCauses); kind = 'old'; }
      else if (a < 15) cause = a <= 2 ? rng.pick(era.infantCauses) : rng.pick(['a sudden fever', 'a sickness nobody could name', 'a winter illness', 'a fever that would not break']);
      else if (a >= 45 && p.conditions.length && rng.chance(0.6)) cause = `complications of ${p.conditions[0]}`;
      else if (a >= 45) cause = rng.pick(era.oldCauses.filter(c => !/old age/.test(c)).map(c => c.replace(' in old age', '')));
      else { cause = rng.pick(era.illnesses); if (/drown|fall|kick|crash|accident|collapse|stampede|fire|bite|malfunction|decompression|airlock|cliff|exposure|leg/i.test(cause)) kind = 'accident'; else if (/fight|brawl|gunfight|duel|raid|violent|attack/i.test(cause)) kind = 'violence'; }
      die(W, rng, p, y, cause, kind, R);
    }
  }
}
function catchIll(W, rng, p, d, y, s, R, outbreak, seed) {
  const a = ageOf(p, y);
  const med = clamp(W.settings.medicine + lawFx(W, 'medicine'), 0, 1);
  p._sick = { d, s };
  R.illnesses++;
  if (outbreak) outbreak.cases++;
  const sev = clamp(rng.next() * (1.5 - p.health / 100) + (p.mind && p.mind.drink > 60 ? 0.15 : 0), 0, 1);
  let lethal = d.lethal * (a < 5 ? d.kid * 1.5 : a < 15 ? d.kid * 0.6 : a >= 65 ? d.old * (1 + (a - 65) / 15) : 1) * (0.4 + sev * 1.4) * (1 - med * 0.92);
  if (W.era === 'dropped' && y - W.startYear < 3) lethal *= 1.3;
  { const hh = W.households[p.household]; if (hh && hh.wealth < 25) lethal *= 1.3; else if (hh && hh.wealth > 75) lethal *= 0.8; }
  if (rng.chance(clamp(lethal, 0, 0.95))) { die(W, rng, p, y, d.name, 'illness', R, outbreak); if (outbreak) outbreak.deaths++; return; }
  const m = mindOf(p);
  m.yearStress += sev * 15;
  p.health = Math.round(clamp(p.health - sev * (d.lethal > 0.05 ? 12 : 3), 1, 100));
  let lasting = null;
  for (const [eff, pr] of (d.lasting || [])) if (rng.chance(pr * (0.5 + sev)) && !p.conditions.includes(eff)) { lasting = eff; p.conditions.push(eff); break; }
  if (sev > 0.55 || lasting || d.lethal >= 0.1) {
    addEvent(W, p, y, 'ill', `Fell ill with ${d.name}${sev > 0.75 ? ' and nearly died' : ''}${lasting ? `, and was left with ${lasting}` : ''}.`, outbreak ? { why: `Caught it during the ${d.name} outbreak.` } : null);
    ripple(W, rng, p, y, 'worry', sev * 25, sev > 0.75 ? `Feared for {who}, who nearly died of ${d.name}.` : null);
  }
}
function injure(W, rng, p, y, s, R, kind) {
  const a = ageOf(p, y);
  const med = clamp(W.settings.medicine, 0, 1);
  const what = kind === 'travel' ? (INJURIES.travel[W.era] || 'a road accident') : rng.pick(INJURIES[kind] || INJURIES.labor);
  const roll = rng.next();
  const fatalP = (kind === 'mining' ? 0.1 : kind === 'travel' ? 0.12 : kind === 'elder' ? 0.08 : 0.04) * (1 - med * 0.6);
  // sometimes someone else is to blame
  let blame = null;
  if ((kind === 'travel' || kind === 'labor' || kind === 'mining' || kind === 'farming' || kind === 'animals' || kind === 'craft') && rng.chance(0.15)) {
    const wp = W.workplaces[p.workplace];
    const pool = (wp ? wp.members : []).map(id => W.people[id]).filter(q => q && q.id !== p.id && isAlive(q) && q.status === 'resident' && ageOf(q, y) >= 14);
    const others = pool.length ? pool : rng.sample(lives(W).filter(q => q.id !== p.id && ageOf(q, y) >= 16), 1);
    blame = others.length ? rng.pick(others) : null;
  }
  R.injuries++;
  if (roll < fatalP) {
    die(W, rng, p, y, what, 'accident', R);
    if (blame) blameFor(W, rng, blame, p, y, what, true);
    return;
  }
  if (roll < fatalP + 0.32) {
    const m = mindOf(p); m.yearStress += 20; m.trauma = clamp(m.trauma + 8, 0, 100);
    p.health = Math.round(clamp(p.health - rng.int(4, 15), 1, 100));
    let lasting = null;
    if (rng.chance(0.28 * (1 - med * 0.5))) { lasting = (typeof severeInjury === 'function' && severeInjury(W, rng, p)) || rng.pick(LASTING.filter(l => !p.conditions.includes(l))); if (lasting) { p.conditions.push(lasting); for (const k of Object.keys(p.skills || {})) if (/labor|craft|fighting|farming/.test(k)) p.skills[k] = Math.max(0, p.skills[k] - rng.int(3, 12)); } }
    addEvent(W, p, y, 'injury', `Badly hurt: ${what}${lasting ? `, leaving ${himHer(p)} with ${lasting}` : ''}.`, blame ? { why: `@${blame.id} was to blame.` } : null);
    ripple(W, rng, p, y, 'worry', 18, `Worried over {who}, badly hurt (${what}).`);
    if (blame) blameFor(W, rng, blame, p, y, what, false);
  }
}
function blameFor(W, rng, culprit, victim, y, what, fatal) {
  const m = mindOf(culprit);
  m.guilt = clamp(m.guilt + (fatal ? rng.int(35, 70) : rng.int(10, 30)) * (0.5 + culprit.traits.C / 100 + culprit.traits.A / 200), 0, 100);
  addEvent(W, culprit, y, 'guilt', fatal ? `Blamed for the death of @${victim.id} (${what}).` : `Blamed for hurting @${victim.id} (${what}).`);
  addMemory(culprit, y, 'guilt', victim.id, fatal ? 1 : 0.4, fatal ? `blamed for ${victim.first}'s death` : `blamed for ${victim.first}'s injury`);
  // the family blames them
  const fam = [victim.spouse, victim.father, victim.mother, ...victim.children].map(id => W.people[id]).filter(q => q && isAlive(q) && q.status === 'resident' && q.id !== culprit.id && ageOf(q, y) >= 12);
  if (!fatal) fam.unshift(victim);
  for (const q of fam) {
    const r = getRel(W, q.id, culprit.id);
    const old = r ? r.score : 0;
    const ns = clamp(old - (fatal ? rng.int(35, 75) : rng.int(10, 35)) * (1.2 - q.traits.A / 120), -100, 100);
    const nr = setRelIndexed(W, q.id, culprit.id, ns <= -55 ? 'enemy' : ns < 0 ? 'rival' : (r ? r.type : 'acquaintance'), ns, r ? r.since : y, fatal ? `blames ${culprit.first} for ${victim.first}'s death` : `blames ${culprit.first} for ${victim.first}'s injury`);
    relNote(nr, y, fatal ? `@${q.id} blamed @${culprit.id} for the death of @${victim.id}.` : `@${q.id} blamed @${culprit.id} for hurting @${victim.id}.`);
  }
}
function die(W, rng, p, y, cause, kind, R, outbreak) {
  if (!isAlive(p)) return;
  if (p.lockedDeath && y < p.lockedDeath.y) return; // a locked death year: nothing kills them before it
  killPerson(W, rng, p, y, cause, outbreak ? `During the ${outbreak.d.name} outbreak.` : null, kind);
  R.deaths++; R.causes[cause] = (R.causes[cause] || 0) + 1;
  if (ageOf(p, y) <= 1) R.infantDeaths++;
}
// called by killPerson while the year engine runs
function afterDeath(W, rng, p, y, cause, kind) {
  const a = ageOf(p, y);
  // friends grieve too
  for (const r of relsOf(W, p.id)) {
    const q = W.people[r.a === p.id ? r.b : r.a];
    if (!q || !isAlive(q) || q.status !== 'resident') continue;
    if (r.score >= 55 || r.type === 'courting') {
      addEvent(W, q, y, 'loss', `Lost ${r.type === 'courting' ? 'sweetheart' : 'dear friend'} @${p.id} (${cause}).`);
      addMemory(q, y, 'loss', p.id, r.type === 'courting' ? 0.8 : 0.45, `${r.type === 'courting' ? 'sweetheart' : 'close friend'} died (${cause})`);
    } else if (r.score <= -55 && rng.chance(0.4)) {
      addEvent(W, q, y, 'ripple', `Heard that enemy @${p.id} had died, and felt ${rng.pick(['nothing much', 'a guilty relief', 'strangely empty', 'that justice had been done'])}.`, { minor: true });
    }
    r.ended = r.ended || y;
  }
  // violent or sudden deaths leave scars on the closest family
  if (kind === 'accident' || kind === 'violence') {
    for (const id of [p.spouse, ...p.children, p.father, p.mother]) {
      const q = W.people[id]; if (!q || !isAlive(q) || q.status !== 'resident') continue;
      const m = mindOf(q); m.trauma = clamp(m.trauma + (kind === 'violence' ? 40 : 18) * (0.6 + q.traits.N / 100), 0, 100);
    }
  }
  // children and young people dying hits the whole family hard
  if (a < 30) for (const id of [p.father, p.mother]) { const q = W.people[id]; if (q && isAlive(q)) mindOf(q).trauma = clamp(mindOf(q).trauma + 12, 0, 100); }
  // leaves work; family may take over
  leaveJob(W, rng, p, y, 'died');
  // groups
  for (const g of Object.values(W.groups)) if (g.members.includes(p.id)) { g.members = g.members.filter(x => x !== p.id); g.past.push({ id: p.id, y, why: 'died' }); }
  // courting partners etc. become free; pregnancies end
  if (p.preg) p.preg = null;
}

// ---------- pregnancy and birth ----------
function seasonBirths(W, rng, y, s, R) {
  const S = W.settings;
  const people = lives(W);
  // a woman locked up while expecting gives birth there, and the baby goes home to the father, or else to her old home or her parents
  // (V10 fix: before, the birth waited until she was let out, sometimes years later)
  for (const w of Object.values(W.people)) if (w.status === 'prison' && w.preg && isAlive(w) && w.preg.y * 4 + w.preg.s <= y * 4 + s) prisonBirth(W, rng, w, y, s, R);
  for (const w of people) {
    if (w.sex !== 'f' || !isAlive(w)) continue;
    const a = ageOf(w, y);
    // due?
    if (w.preg && w.preg.y * 4 + w.preg.s <= y * 4 + s) { giveBirth(W, rng, w, y, s, R); continue; }
    if (w.preg) continue;
    const ff = fertilityFactor(a); if (!ff) continue;
    // recently gave birth? (breastfeeding spacing)
    const last = w.lastBirth != null ? w.lastBirth : (w.children.length ? Math.max(...w.children.map(c => W.people[c].born)) * 4 + 2 : -1e9);
    const gap = y * 4 + s - last;
    let spacing = S.familySizeLimit ? (gap < 3 ? 0 : 1) : (gap < 4 ? 0 : gap < 7 ? 0.45 : 1);
    if (!spacing) continue;
    const partner = w.spouse ? W.people[w.spouse] : null;
    let p = 0, father = null, secret = null;
    if (partner && partner.sex === 'm') {
      p = S.fertility * ff * 2.1;
      if (S.familySizeLimit) {
        const living = w.children.filter(c => isAlive(W.people[c])).length;
        const want = Math.round(((w.desiredKids ?? 2) + (partner.desiredKids ?? 2)) / 2);
        if (living >= want) p *= W.era === 'dropped' ? 0.4 : 0.04; // no birth control in the empty world
      }
      const q = getRel(W, w.id, partner.id); if (q && q.score < 25) p *= 0.6;
      father = partner;
    } else {
      // courting couples and others
      const court = relsOf(W, w.id).find(r => r.type === 'courting' && !r.ended);
      const cp = court ? W.people[court.a === w.id ? court.b : court.a] : null;
      if (cp && cp.sex === 'm' && isAlive(cp)) { p = S.birthsOutsideMarriage * ff * 6; father = cp; }
      else { p = S.birthsOutsideMarriage * ff; }
    }
    // affairs
    if (w.affair && W.people[w.affair] && isAlive(W.people[w.affair]) && W.people[w.affair].sex === 'm' && rng.chance(0.25)) { father = W.people[w.affair]; secret = father; p = Math.max(p, S.fertility * ff * 0.6); }
    p *= spacing * (w.celibate ? 0 : 1) * (w.health < 30 ? 0.5 : 1);
    if (!rng.chance(1 - Math.pow(1 - clamp(p, 0, 0.95), 0.25))) continue;
    if (!father && !secret) {
      const men = people.filter(m => m.sex === 'm' && isAlive(m) && ageOf(m, y) >= 16 && ageOf(m, y) <= 60 && !closelyRelated(W, m, w));
      if (men.length && rng.chance(0.65)) { const m = rng.pick(men); if (m.spouse) secret = m; else father = m; }
    }
    const due = y * 4 + s + 3;
    w.preg = { y: Math.floor(due / 4), s: due % 4, father: father ? father.id : null, secret: secret ? secret.id : null, since: y * 4 + s };
    // miscarriage
    if (rng.chance(0.13 + (a > 38 ? 0.12 : 0))) {
      w.preg = null; R.miscarriages++;
      const m = mindOf(w); m.yearStress += 18;
      addMemory(w, y, 'loss', w.id, 0.35, 'lost a pregnancy');
      addEvent(W, w, y, 'miscarriage', 'Lost a baby early in pregnancy.', { private: true });
      if (partner) { mindOf(partner).yearStress += 10; }
      w.lastBirth = y * 4 + s - 2;
    } else if (father && !secret && w.spouse !== father.id) {
      // an unmarried pregnancy: news travels
      addEvent(W, w, y, 'pregnant', `Found ${himHerSelf(w)} expecting a child by @${father.id}, though they were not married.`);
      addEvent(W, father, y, 'pregnant', `@${w.id} is expecting his child.`);
    }
  }
}
function prisonBirth(W, rng, w, y, s, R) {
  const grown = h => h && h.members.some(id => { const q = W.people[id]; return q && isAlive(q) && q.status === 'resident' && ageOf(q, y) >= 16; });
  const dad = w.preg.father ? W.people[w.preg.father] : null;
  const homes = [dad && isAlive(dad) && dad.status === 'resident' ? W.households[dad.household] : null, W.households[w.prevHousehold],
    ...[w.mother, w.father].map(id => W.people[id]).filter(q => q && isAlive(q) && q.status === 'resident').map(q => W.households[q.household])];
  const home = homes.find(grown); if (!home) return; // nobody to take the baby yet: it waits
  const was = w.household; w.household = home.id;
  try { giveBirth(W, rng, w, y, s, R); } finally { w.household = was; home.members = home.members.filter(id => id !== w.id || was === home.id); }
  addEvent(W, w, y, 'child_born', `Gave birth while locked up; the baby went to ${home.name}.`);
}
function giveBirth(W, rng, w, y, s, R) {
  const S = W.settings;
  const pr = w.preg; w.preg = null; w.lastBirth = y * 4 + s;
  const fatherId = pr.secret ? (W.people[w.spouse] && W.people[w.spouse].sex === 'm' ? w.spouse : null) : pr.father;
  const father = W.people[fatherId] || null;
  const twins = rng.chance(0.012) ? 2 : 1;
  const born = [];
  for (let t = 0; t < twins; t++) {
    const c = makePerson(W, rng, { born: y, father: father ? father.id : null, mother: w.id, culture: father ? father.culture : w.culture });
    if (pr.secret) { c.secretFather = pr.secret; const sf = W.people[pr.secret]; if (sf) sf.secretChildren = (sf.secretChildren || []).concat(c.id); }
    w.children.push(c.id); if (father) father.children.push(c.id);
    moveToHousehold(W, c, W.households[w.household]);
    mindOf(c); c.skills = {}; for (const k of Object.keys(c.aptitude)) c.skills[k] = 0; c.hist = [];
    c.occupation = eraOf(W).youngChild;
    addEvent(W, c, y, 'born', `Born in ${SEASONS[s].toLowerCase()} to ${father ? `@${w.id} and @${father.id}` : `@${w.id}`}${twins === 2 ? ' — a twin' : ''}.`);
    addEvent(W, w, y, 'child_born', `Gave birth to ${rel3(c, 'a son', 'a daughter', 'a child')}, @${c.id}${twins === 2 ? ' (twins)' : ''}.`);
    if (father) addEvent(W, father, y, 'child_born', `Became a father: ${rel3(c, 'a son', 'a daughter', 'a child')}, @${c.id}.`);
    if (pr.secret) { const sf = W.people[pr.secret]; if (sf) { addEvent(W, sf, y, 'secret', `Secretly the father of @${c.id}, born to @${w.id}.`, { secret: true }); if (W.soc) addSecret(W, 'child', [w.id, sf.id, c.id], `@${sf.id} is the real father of @${c.id}, not the man everyone thinks.`, true, [w.id, sf.id], y); } }
    R.births++; born.push(c);
  }
  const c0 = born[0];
  mindOf(w).joy += 30; if (father) mindOf(father).joy += 22;
  ripple(W, rng, c0, y, 'joy', 18, null);
  for (const c of born) if (rng.chance(S.infantDeath * 0.5 * (1.45 - c.health / 110))) {
    die(W, rng, c, y, rng.pick(eraOf(W).infantCauses), 'illness', R);
  }
  if (rng.chance(S.childbirthDeath * twins * (ageOf(w, y) > 38 ? 1.8 : 1))) die(W, rng, w, y, 'complications in childbirth', 'illness', R);
}

// ---------- romance ----------
function yearRomance(W, rng, y, R) {
  const S = W.settings;
  const people = lives(W);
  // in the empty world, a husband or wife left on Earth is gone for good; in time people accept it
  if (W.era === 'dropped') for (const p of people) {
    const sp = W.people[p.spouse];
    if (!sp || sp.status !== 'leftBehind') continue;
    const yrs = y - W.startYear;
    if (yrs >= 1 && rng.chance(0.04 + yrs * 0.025 - griefLoad(p, y) * 0.03)) {
      W._s = rng.int(0, 3);
      p.spouse = null; p.union = null; sp.spouse = null; sp.union = null;
      p.widowedOf = (p.widowedOf || []).concat(sp.id);
      addEvent(W, p, y, 'mind', `Accepted that ${rel3(sp, 'husband', 'wife', 'partner')} @${sp.id}, left behind on Earth, was gone for good.`);
      mindOf(p).yearStress += 15;
    }
  }
  const singles = people.filter(p => !p.spouse && marryFactor(W, p, y) > 0 && isAlive(p));
  // singles look for someone
  const courting = new Set();
  for (const r of Object.values(W.rels)) if (r.type === 'courting' && !r.ended) { courting.add(r.a); courting.add(r.b); }
  for (const p of rng.shuffle(singles.slice())) {
    if (courting.has(p.id) || p.spouse || !isAlive(p)) continue;
    const a = ageOf(p, y);
    if (a < 15) continue;
    const want = S.marriageChance * marryFactor(W, p, y) * 1.4 * (W._Y ? clamp(1 + (W._Y.food - 1) * 0.6, 0.6, 1.3) : 1) * (0.6 + p.traits.E / 125) * (p.mind && p.mind.depressed ? 0.4 : 1);
    if (!rng.chance(want)) continue;
    W._s = rng.int(0, 3);
    const same = wantsSameSex(W, rng, p);
    const wantSex = same ? p.sex : (p.sex === 'm' ? 'f' : 'm');
    const ideal = same ? a : (p.sex === 'm' ? a - S.husbandOlder : a + S.husbandOlder);
    const known = new Set();
    for (const r of relsOf(W, p.id)) if (!r.ended && r.score > 0) known.add(r.a === p.id ? r.b : r.a);
    const h = W.households[p.household];
    let best = null, bestScore = -1e9;
    for (const q of rng.sample(singles, 60)) {
      if (q.id === p.id || q.sex !== wantSex || q.spouse || courting.has(q.id) || !isAlive(q)) continue;
      const qa = ageOf(q, y); if (qa < 15 || Math.abs(qa - ideal) > 10) continue;
      if (same ? q.orientation === 'straight' : (q.orientation === 'gay' && S.sameSexCouples)) continue;
      if (closelyRelated(W, p, q)) continue;
      const r = getRel(W, p.id, q.id); if (r && r.score < -20) continue;
      let sc = -Math.abs(qa - ideal) * 0.6 + rng.range(0, 5) + (known.has(q.id) ? 4 : 0) + (r && r.type === 'crush' ? 5 : 0);
      const qh = W.households[q.household]; if (h && qh && h.district === qh.district) sc += 1.5;
      if (q.workplace && q.workplace === p.workplace) sc += 1.5;
      if (q.venues && p.venues.some(v => q.venues.includes(v))) sc += 1;
      sc -= Math.abs(p.traits.A - q.traits.A) / 40;
      // feuding families: rarer, but it happens
      if (feudBetween(W, p, q)) sc -= 3;
      if (sc > bestScore) { bestScore = sc; best = q; }
    }
    if (!best && S.arrivals > 0 && rng.chance(0.25)) {
      const born = y - clamp(Math.round(ideal + rng.normal(0, 3)), wantSex === 'f' ? S.marriageAgeWomen : S.marriageAgeMen, 80);
      best = makePerson(W, rng, { born, sex: wantSex, arrived: y });
      if (same) best.orientation = 'gay';
      mindOf(best); best.skills = {}; for (const k of Object.keys(best.aptitude)) best.skills[k] = Math.round(best.aptitude[k] * 0.4); best.hist = [];
      best.events.push({ y: born, t: 'born', text: `Born outside ${W.name}.` });
      addEvent(W, best, y, 'arrived', `Came to ${W.name}, and soon met @${p.id}.`);
      newHousehold(W, rng, [best], y); R.arrivals++;
    }
    if (!best) continue;
    // does the other feel the same?
    const accept = 0.66 + (best.traits.A - 50) / 200 + (getRel(W, p.id, best.id) && getRel(W, p.id, best.id).score > 30 ? 0.2 : 0) - (feudBetween(W, p, best) ? 0.2 : 0);
    if (!rng.chance(accept)) {
      if (rng.chance(0.3)) { const r = setRelIndexed(W, p.id, best.id, 'crush', rng.int(30, 70), y, `${p.first} is sweet on ${best.first}, who is not interested`, { from: p.id }); mindOf(p).yearStress += 6; }
      continue;
    }
    const prev = getRel(W, p.id, best.id);
    const r = setRelIndexed(W, p.id, best.id, 'courting', rng.int(45, 80), y, feudBetween(W, p, best) ? 'courting in secret across a family feud' : rng.pick(['met through friends', 'kept running into each other', 'were introduced by family', 'met at a celebration', 'grew close slowly', 'it was love at first sight']));
    r.ended = null; delete r.from;
    relNote(r, y, `@${p.id} and @${best.id} began courting.`);
    addEvent(W, p, y, 'courting', `Began courting @${best.id}.`);
    addEvent(W, best, y, 'courting', `Began courting @${p.id}.`);
    mindOf(p).joy += 15; mindOf(best).joy += 15;
    courting.add(p.id); courting.add(best.id);
  }
  // courting couples move on or break up
  for (const r of Object.values(W.rels)) {
    if (r.type !== 'courting' || r.ended) continue;
    const a = W.people[r.a], b = W.people[r.b];
    if (!a || !b || !isAlive(a) || !isAlive(b) || a.status !== 'resident' || b.status !== 'resident' || a.spouse || b.spouse) { r.ended = r.ended || y; continue; }
    W._s = rng.int(0, 3);
    const yrs = y - r.since;
    const pregnant = (a.preg && a.preg.father === b.id) || (b.preg && b.preg.father === a.id);
    const ageOK = ageOf(a, y) >= (a.sex === 'f' ? S.marriageAgeWomen : S.marriageAgeMen) && ageOf(b, y) >= (b.sex === 'f' ? S.marriageAgeWomen : S.marriageAgeMen);
    const sameSex = a.sex === b.sex;
    const canWed = ageOK && (!sameSex || S.sameSexCouples);
    const compat = 1 - (Math.abs(a.traits.A - b.traits.A) + Math.abs(a.traits.C - b.traits.C)) / 200;
    if (canWed && rng.chance(pregnant ? 0.75 : clamp(0.18 + yrs * 0.12 + (r.score - 50) / 200, 0.05, 0.7))) {
      r.type = 'spouse';
      unite(W, rng, a, b, y, pregnant ? 'A baby was on the way.' : (yrs >= 3 ? 'After a long courtship.' : null));
      const rr = getRel(W, a.id, b.id); rr.type = 'spouse'; rr.score = clamp(r.score + 10, 10, 100); rr.since = y; rr.reason = a.union === 'partners' ? 'partners' : 'married';
      relNote(rr, y, `@${a.id} and @${b.id} ${a.union === 'partners' ? 'moved in together' : 'married'}.`);
      R.marriages++;
      mindOf(a).joy += 30; mindOf(b).joy += 30;
      ripple(W, rng, a, y, 'joy', 12, null); ripple(W, rng, b, y, 'joy', 12, null);
      R.items.push({ k: 'wedding', ids: [a.id, b.id] });
      // a strict-roles bride may leave her trade to keep house
      continue;
    }
    if (rng.chance(clamp(0.12 + (1 - compat) * 0.3 - (r.score - 50) / 300 + (pregnant ? -0.08 : 0), 0.02, 0.5))) {
      const leaver = rng.chance(0.5) ? a : b, left = leaver === a ? b : a;
      r.type = 'ex'; r.ended = null; r.score = clamp(Math.round(r.score - rng.int(40, 80)), -70, 30); r.reason = `${leaver.first} broke it off`;
      relNote(r, y, `@${leaver.id} broke off the courtship with @${left.id}.`);
      addEvent(W, left, y, 'heartbreak', `@${leaver.id} broke off their courtship.`);
      addEvent(W, leaver, y, 'heartbreak', `Broke off the courtship with @${left.id}.`, { why: rng.pick(['They wanted different things.', 'Feelings had faded.', 'Family disapproved.', `${leaver.first} had grown interested in someone else.`, 'Too many quarrels.']) });
      mindOf(left).yearStress += 25 + left.traits.N / 5; mindOf(leaver).yearStress += 8;
      addMemory(left, y, 'heartbreak', leaver.id, 0.4, 'heartbroken');
    } else { r.score = clamp(r.score + rng.int(-6, 10), 5, 100); }
  }
  // marriages: quality, affairs, separations
  for (const p of people) {
    if (!p.spouse || p.id > p.spouse || !isAlive(p)) continue;
    const s = W.people[p.spouse]; if (!s || !isAlive(s)) continue;
    let r = getRel(W, p.id, s.id);
    if (!r) r = setRelIndexed(W, p.id, s.id, 'spouse', 60, y, p.union === 'partners' ? 'partners' : 'married');
    W._s = rng.int(0, 3);
    const strain = (mindOf(p).drink + mindOf(s).drink) / 12 + (mindOf(p).depressed ? 4 : 0) + (mindOf(s).depressed ? 4 : 0) + (p.traits.N + s.traits.N - 100) / 25 - (p.traits.A + s.traits.A - 100) / 30;
    r.score = Math.round(clamp(r.score + rng.normal(0.5, 5) - strain, -60, 100));
    // affairs
    for (const [x, z] of [[p, s], [s, p]]) {
      if (x.affair) {
        const lover = W.people[x.affair];
        if (!lover || !isAlive(lover) || lover.id === z.id || lover.status !== 'resident') { x.affair = null; continue; }
        if (rng.chance(0.12)) {
          // found out
          x.affair = null; if (lover.affair === x.id) lover.affair = null;
          r.score = clamp(r.score - rng.int(30, 60), -100, 100);
          addEvent(W, z, y, 'betrayal', `Found out that @${x.id} was having an affair with @${lover.id}.`);
          addEvent(W, x, y, 'betrayal', `The affair with @${lover.id} was discovered by @${z.id}.`);
          const rl = setRelIndexed(W, z.id, lover.id, 'enemy', -rng.int(55, 95), y, `had an affair with ${z.first}'s ${rel3(x, 'husband', 'wife', 'partner')}`);
          relNote(rl, y, `@${z.id} learned of @${lover.id}'s affair with @${x.id}.`);
          mindOf(z).yearStress += 40; mindOf(z).trauma = clamp(mindOf(z).trauma + 15, 0, 100); mindOf(x).guilt = clamp(mindOf(x).guilt + 25 * (x.traits.C / 60), 0, 100);
          addMemory(z, y, 'betrayal', x.id, 0.7, 'betrayed by an affair');
          R.items.push({ k: 'scandal', ids: [x.id, lover.id] });
        } else if (rng.chance(0.35)) { x.affair = null; if (lover.affair === x.id) lover.affair = null; addEvent(W, x, y, 'secret', `Ended the secret affair with @${lover.id}.`, { secret: true }); }
      } else if (r.score < 35 && ageOf(x, y) >= 18 && rng.chance(0.035 * (1.2 - x.traits.C / 100) * (1 + (35 - r.score) / 50))) {
        const pool = lives(W).filter(q => q.id !== x.id && q.id !== z.id && q.sex !== x.sex && Math.abs(ageOf(q, y) - ageOf(x, y)) < 15 && ageOf(q, y) >= 18 && !closelyRelated(W, x, q) && (q.workplace === x.workplace || W.households[q.household]?.district === W.households[x.household]?.district));
        if (pool.length) {
          const lover = rng.pick(pool); x.affair = lover.id; if (!lover.spouse) lover.affair = x.id;
          if (W.soc) addSecret(W, 'affair', [x.id, lover.id], `@${x.id} is having an affair with @${lover.id}.`, true, [x.id, lover.id], y);
          addEvent(W, x, y, 'secret', `Began a secret affair with @${lover.id}.`, { secret: true, why: `The marriage to @${z.id} had grown cold.` });
          addEvent(W, lover, y, 'secret', `Began a secret affair with @${x.id}, who is married to @${z.id}.`, { secret: true });
        }
      }
    }
    if (S.divorce > 0 && r.score < 30) {
      const ch = S.divorce * 3 * (1 + (30 - r.score) / 25) * (p.union === 'partners' ? 1.6 : 1);
      if (rng.chance(ch)) {
        separate(W, rng, p, s, y);
        const rr = getRel(W, p.id, s.id); if (rr) { rr.type = 'ex'; rr.score = clamp(r.score - 20, -90, 40); relNote(rr, y, `@${p.id} and @${s.id} separated.`); }
        R.divorces++;
        for (const x of [p, s]) { mindOf(x).yearStress += 30; addMemory(x, y, 'divorce', x === p ? s.id : p.id, 0.4, 'marriage ended'); }
        for (const c of p.children.filter(c => s.children.includes(c))) { const k = W.people[c]; if (k && isAlive(k) && ageOf(k, y) < 18) { mindOf(k).yearStress += 20; addEvent(W, k, y, 'ripple', `${cap(hisHer(k))} parents @${p.id} and @${s.id} split up.`); } }
        R.items.push({ k: 'divorce', ids: [p.id, s.id] });
      }
    }
  }
}
function feudBetween(W, a, b) {
  for (const f of Object.values(W.feuds)) {
    if (f.status !== 'active') continue;
    const A = W.households[f.sideA.id], B = W.households[f.sideB.id];
    const inA = x => A && A.members.includes(x.id), inB = x => B && B.members.includes(x.id);
    if ((inA(a) && inB(b)) || (inB(a) && inA(b))) return f;
  }
  return null;
}

// ---------- friendships, grudges, feuds ----------
const QUARREL_REASONS = ['money owed', 'a careless remark', 'gossip', 'a broken promise', 'jealousy', 'a drunken argument', 'politics', 'a borrowed tool', 'something said about family', 'a misunderstanding that grew', 'a rivalry at work', 'who was right about something small'];
const PEACE_REASONS = ['time softened things', 'a friend brought them together', 'they helped each other in a hard time', 'one finally apologised', 'they were thrown together at work', 'a shared loss put it in perspective', 'their children became friends'];
function contactBetween(W, a, b) {
  let c = 0;
  if (a.household === b.household) c += 3;
  if (a.workplace && a.workplace === b.workplace) c += 2;
  const ha = W.households[a.household], hb = W.households[b.household];
  if (ha && hb && ha.district === hb.district) c += 1;
  if (a.venues && b.venues && a.venues.some(v => b.venues.includes(v))) c += 0.5;
  return c;
}
function yearSocial(W, rng, y, R) {
  for (const r of Object.values(W.rels)) {
    if (r.ended || r.type === 'spouse' || r.type === 'mentor') continue;
    if (r.type === 'crush') { if (rng.chance(0.35)) { r.ended = y; r.type = 'old crush'; } continue; }
    const a = W.people[r.a], b = W.people[r.b];
    if (!a || !b || !isAlive(a) || !isAlive(b) || a.status !== 'resident' || b.status !== 'resident') { r.ended = r.ended || y; continue; }
    W._s = rng.int(0, 3);
    const contact = contactBetween(W, a, b);
    const old = r.score, oldType = r.type;
    if (r.score > 0 && r.type !== 'ex' && r.type !== 'courting') {
      r.score += contact > 0 ? rng.int(-2, 4 + Math.round(contact)) : -rng.int(2, 7);
      // quarrels
      const qch = 0.025 + (200 - a.traits.A - b.traits.A) / 4000 + (a.traits.N + b.traits.N) / 8000 + (mindOf(a).drink + mindOf(b).drink) / 2500;
      if (rng.chance(qch)) {
        const why = rng.pick(QUARREL_REASONS);
        r.score -= rng.int(18, 50);
        relNote(r, y, `@${a.id} and @${b.id} quarrelled over ${why}.`);
        if (r.score <= 10) { addEvent(W, a, y, 'quarrel', `Fell out with @${b.id} over ${why}.`); addEvent(W, b, y, 'quarrel', `Fell out with @${a.id} over ${why}.`); }
        if (r.score < 0) r.reason = `falling-out over ${why}`;
        R.quarrels++;
        mindOf(a).yearStress += 8; mindOf(b).yearStress += 8;
      }
      if (r.score < 12 && r.score > -5 && /friend/.test(r.type)) {
        r.type = 'old friend'; r.faded = y;
        relNote(r, y, `@${a.id} and @${b.id} drifted apart.`);
        
      } else if (r.score >= 62 && r.type === 'friend') { r.type = 'close friend'; relNote(r, y, `@${a.id} and @${b.id} became close friends.`); addEvent(W, a, y, 'friend', `Became close friends with @${b.id}.`, { minor: true }); addEvent(W, b, y, 'friend', `Became close friends with @${a.id}.`, { minor: true }); }
      else if (r.score < 55 && r.type === 'close friend') r.type = 'friend';
      else if (r.type === 'old friend' && r.score >= 25) { r.type = 'friend'; r.faded = null; relNote(r, y, `@${a.id} and @${b.id} picked up their old friendship.`); }
    } else if (r.score < 0 || r.type === 'ex') {
      // grudges cool, flare, or are forgiven
      const forgive = 0.04 + (a.traits.A + b.traits.A) / 1600 + Math.min(0.1, (y - r.since) / 150) - (r.feud ? 0.05 : 0) - (r.score < -70 ? 0.04 : 0);
      const flare = (contact > 0 ? 0.08 : 0.02) + (200 - a.traits.A - b.traits.A) / 3000 + (mindOf(a).drink + mindOf(b).drink) / 2000;
      if (rng.chance(forgive)) {
        const why = rng.pick(PEACE_REASONS);
        r.score = Math.round(r.score + rng.int(25, 60));
        if (r.score >= 0) {
          r.type = r.type === 'ex' ? 'ex' : (r.score >= 20 ? 'friend' : 'acquaintance'); r.reason = `made peace: ${why}`;
          relNote(r, y, `@${a.id} and @${b.id} made peace (${why}).`);
          addEvent(W, a, y, 'peace', `Made peace with @${b.id}.`, { why: cap(why) + '.' }); addEvent(W, b, y, 'peace', `Made peace with @${a.id}.`, { why: cap(why) + '.' });
          R.reconciled++; mindOf(a).joy += 8; mindOf(b).joy += 8;
        } else relNote(r, y, `Things cooled a little between @${a.id} and @${b.id}.`);
      } else if (rng.chance(flare)) {
        r.score = Math.round(r.score - rng.int(8, 25));
        const what = rng.pick(['a shouting match in public', 'insults traded', 'a shove that nearly became a fight', 'a cold snub', 'a spiteful rumour', 'a fistfight']);
        relNote(r, y, `${cap(what)} between @${a.id} and @${b.id}.`);
        addEvent(W, a, y, 'conflict', `${cap(what)} with @${b.id}.`, { minor: true }); addEvent(W, b, y, 'conflict', `${cap(what)} with @${a.id}.`, { minor: true });
        mindOf(a).yearStress += 10; mindOf(b).yearStress += 10;
        if (what === 'a fistfight' && rng.chance(0.25)) injure(W, rng, rng.chance(0.5) ? a : b, y, W._s, R, 'fighting');
      } else if (contact === 0 && r.score > -40 && rng.chance(0.12)) {
        r.score = Math.round(r.score / 2);
        if (r.score > -10) { r.type = 'old grudge'; r.faded = y; relNote(r, y, `@${a.id} and @${b.id} more or less forgot their quarrel.`); }
      }
      if (r.score <= -55 && r.type === 'rival') { r.type = 'enemy'; relNote(r, y, `@${a.id} and @${b.id} became bitter enemies.`); }
      else if (r.score > -55 && r.type === 'enemy') r.type = 'rival';
    }
    r.score = Math.round(clamp(r.score, -100, 100));
    if (r.score < 0 && /friend|acquaintance/.test(r.type)) { r.type = r.score <= -55 ? 'enemy' : 'rival'; relNote(r, y, `The friendship between @${a.id} and @${b.id} turned sour.`); }
  }
  // new friendships
  const people = lives(W);
  const byD = {}, byWp = {};
  for (const p of people) { const h = W.households[p.household]; if (h) (byD[h.district] = byD[h.district] || []).push(p); if (p.workplace) (byWp[p.workplace] = byWp[p.workplace] || []).push(p); }
  for (const p of people) {
    const a = ageOf(p, y); if (a < 4) continue;
    const want = p.hermit ? 0 : Math.round(1 + p.traits.E / 100 * 6);
    const have = relsOf(W, p.id).filter(r => !r.ended && /friend/.test(r.type) && r.type !== 'old friend').length;
    if (have >= want || !rng.chance(0.35 + (want - have) * 0.08)) continue;
    const h = W.households[p.household];
    const pool = [...(p.workplace ? byWp[p.workplace] || [] : []), ...(h ? rng.sample(byD[h.district] || [], 25) : [])];
    const cands = pool.filter(q => q.id !== p.id && q.household !== p.household && Math.abs(ageOf(q, y) - a) <= (a < 18 ? 3 : 15) && !getRel(W, p.id, q.id) && !q.hermit);
    if (!cands.length) continue;
    const q = rng.pick(cands);
    W._s = rng.int(0, 3);
    const where = q.workplace && q.workplace === p.workplace ? `work together at ${W.workplaces[p.workplace].name}` : `neighbours in ${h.district}`;
    const r = setRelIndexed(W, p.id, q.id, 'friend', rng.int(22, 45), y, where);
    relNote(r, y, `@${p.id} and @${q.id} became friends.`);
    addEvent(W, p, y, 'friend', `Made a new friend: @${q.id}.`, { minor: true });
    addEvent(W, q, y, 'friend', `Made a new friend: @${p.id}.`, { minor: true });
    R.newFriends++;
  }
  // groups gain and lose members
  for (const g of Object.values(W.groups)) {
    if (g.ended) continue;
    for (const id of g.members.slice()) {
      const q = W.people[id];
      if (!q || q.status !== 'resident' || !isAlive(q)) { g.members = g.members.filter(x => x !== id); g.past.push({ id, y, why: q && q.status === 'dead' ? 'died' : 'left town' }); continue; }
      if (g.type !== 'language' && rng.chance(0.06)) { g.members = g.members.filter(x => x !== id); g.past.push({ id, y, why: rng.pick(['lost interest', 'too busy', 'a falling-out', 'grew out of it']) }); addEvent(W, q, y, 'group', `Stopped going to ${g.name.toLowerCase()}.`, { minor: true }); }
    }
    if (g.type !== 'language' && g.members.length && rng.chance(0.4)) {
      const seed = W.people[rng.pick(g.members)];
      const fr = relsOf(W, seed.id).filter(r => !r.ended && /friend/.test(r.type)).map(r => W.people[r.a === seed.id ? r.b : r.a]).filter(q => q && isAlive(q) && q.status === 'resident' && !g.members.includes(q.id));
      if (fr.length) { const q = rng.pick(fr); g.members.push(q.id); addEvent(W, q, y, 'group', `Joined ${g.name.toLowerCase()}, brought in by @${seed.id}.`, { minor: true }); }
    }
    if (g.type !== 'language' && g.members.length < 3) { g.ended = y; for (const id of g.members) addEvent(W, W.people[id], y, 'group', `${cap(g.name)} broke up.`, { minor: true }); }
  }
  // feuds
  for (const f of Object.values(W.feuds)) {
    if (f.status !== 'active') continue;
    const A = W.households[f.sideA.id], B = W.households[f.sideB.id];
    const liveA = A ? A.members.map(id => W.people[id]).filter(p => p && isAlive(p) && p.status === 'resident') : [];
    const liveB = B ? B.members.map(id => W.people[id]).filter(p => p && isAlive(p) && p.status === 'resident') : [];
    W._s = rng.int(0, 3);
    if (!liveA.length || !liveB.length) { f.status = 'ended'; f.ended = y; f.history.push({ y, text: 'Ended: one family is no longer here.' }); continue; }
    const married = liveA.some(a => a.spouse && liveB.some(b => b.id === a.spouse));
    const avgA = (liveA.concat(liveB).reduce((s, p) => s + p.traits.A, 0)) / (liveA.length + liveB.length);
    if (married || rng.chance(0.03 + (avgA - 50) / 800 + (f.intensity < 25 ? 0.15 : 0))) {
      f.status = 'ended'; f.ended = y;
      const why = married ? 'a marriage joined the two families' : rng.pick(['the elders shook hands at last', 'a priest or friend brokered peace', 'they stood together in a crisis', 'the younger generation simply refused to carry it on']);
      f.history.push({ y, text: `Ended: ${why}.` });
      for (const p of liveA.concat(liveB)) { if (ageOf(p, y) >= 12) addEvent(W, p, y, 'feud', `The feud between ${f.sideA.name} and ${f.sideB.name} ended: ${why}.`); }
      for (const r of Object.values(W.rels)) if (r.feud === f.id && !r.ended && r.score < 0) { r.score = Math.round(r.score / 3); if (r.score > -10) r.type = 'old grudge'; r.feud = null; relNote(r, y, 'The family feud ended.'); }
      R.items.push({ k: 'feudEnd', text: `The feud between ${f.sideA.name} and ${f.sideB.name} ended: ${why}.` });
      continue;
    }
    const d = rng.int(-12, 10);
    f.intensity = clamp(f.intensity + d, 5, 100);
    if (d >= 6 || rng.chance(f.intensity / 400)) {
      const what = rng.pick(['insults at market', 'a brawl between the young men', 'a smashed fence', 'a public accusation', 'a poisoned well rumour', 'a cold refusal at a funeral', 'children fighting in the street']);
      f.history.push({ y, text: `Flared up: ${what}.` });
      const a = rng.pick(liveA), b = rng.pick(liveB);
      addEvent(W, a, y, 'feud', `The feud with ${f.sideB.name} flared: ${what}.`); addEvent(W, b, y, 'feud', `The feud with ${f.sideA.name} flared: ${what}.`);
      for (const r of Object.values(W.rels)) if (r.feud === f.id && !r.ended) r.score = clamp(r.score - rng.int(2, 8), -100, 0);
    }
  }
  // new feuds grow out of bitter enmities between grown members of two households
  if (rng.chance(lives(W).length / 2500)) {
    const en = Object.values(W.rels).filter(r => !r.ended && r.type === 'enemy' && !r.feud && W.people[r.a] && W.people[r.b] && isAlive(W.people[r.a]) && isAlive(W.people[r.b]) && W.people[r.a].household !== W.people[r.b].household);
    if (en.length) {
      const r = rng.pick(en); const a = W.people[r.a], b = W.people[r.b];
      const A = W.households[a.household], B = W.households[b.household];
      if (A && B && !Object.values(W.feuds).some(f => f.status === 'active' && [f.sideA.id, f.sideB.id].includes(A.id) && [f.sideA.id, f.sideB.id].includes(B.id))) {
        const id = W.next.f++; W._s = rng.int(0, 3);
        const nmA = A.name === B.name ? `${a.first} ${a.last}'s household` : A.name, nmB = A.name === B.name ? `${b.first} ${b.last}'s household` : B.name;
        W.feuds[id] = { id, sideA: { kind: 'household', id: A.id, name: nmA }, sideB: { kind: 'household', id: B.id, name: nmB }, reason: `the bad blood between ${a.first} and ${b.first} (${r.reason})`, since: y, intensity: rng.int(30, 70), status: 'active', history: [{ y, text: `Began when the families took sides between @${a.id} and @${b.id}.` }] };
        for (const x of A.members) for (const z of B.members) { const px = W.people[x], pz = W.people[z]; if (ageOf(px, y) >= 16 && ageOf(pz, y) >= 16 && !(getRel(W, x, z) && getRel(W, x, z).score > 30)) { const rr = setRelIndexed(W, x, z, 'rival', -rng.int(15, 50), y, `family feud: ${a.first} and ${b.first}`, { feud: id }); } }
        addEvent(W, a, y, 'feud', `The quarrel with @${b.id} became a feud between the families.`); addEvent(W, b, y, 'feud', `The quarrel with @${a.id} became a feud between the families.`);
        R.items.push({ k: 'feudStart', text: `A feud began between ${nmA} and ${nmB}.` });
      }
    }
  }
}

// ---------- work, school and skills ----------
function leaveJob(W, rng, p, y, why) {
  const wp = W.workplaces[p.workplace];
  if (wp) {
    wp.members = wp.members.filter(x => x !== p.id);
    if (wp.owner === p.id) {
      // a family member at the same place takes over
      const heirs = wp.members.map(id => W.people[id]).filter(q => q && isAlive(q) && (p.children.includes(q.id) || p.spouse === q.id || siblingsOf(W, p).includes(q.id)));
      if (heirs.length) {
        const h = heirs.sort((a, b) => a.born - b.born)[0]; wp.owner = h.id;
        addEvent(W, h, y, 'work', `Took over ${wp.name} from @${p.id}.`, { why: why === 'died' ? `@${p.id} had died.` : `@${p.id} had ${why}.` });
      } else if (!wp.members.length) wp.closed = y;
      else wp.owner = null;
    }
  }
  p.workplace = null;
  if (p.occId === 'apprentice') p.masterId = null;
}
function placeInWorkplace(W, rng, p, o, y) {
  const era = eraOf(W);
  let wp = null;
  const find = fn => Object.values(W.workplaces).find(w => !w.closed && fn(w));
  if (o.wp === 'shared') wp = find(w => w.kind === 'shared' && w.name === o.place);
  else if (o.wp === 'household') wp = find(w => w.members.some(id => { const q = W.people[id]; return q && q.household === p.household && q.occId === o.id; }));
  else if (o.wp === 'own') { const sp = W.people[p.spouse]; if (sp && sp.occId === o.id && sp.workplace) wp = W.workplaces[sp.workplace]; }
  else if (o.wp === 'employer') {
    const bosses = Object.values(W.workplaces).filter(w => !w.closed && w.owner && W.people[w.owner] && W.people[w.owner].occId === o.boss);
    wp = bosses.length ? rng.pick(bosses) : null;
  }
  if (!wp && (o.wp === 'shared' || o.wp === 'household' || o.wp === 'own')) {
    const id = W.next.w++;
    const h = W.households[p.household];
    const name = o.wp === 'shared' ? o.place : o.wp === 'household' ? `the ${h ? h.name.replace(/^the /, '').replace(' household', '') : p.last} ${o.place}` : `${p.last}'s ${o.place}`;
    wp = W.workplaces[id] = { id, name: /^the /.test(name) ? name : cap(name), kind: o.wp === 'own' ? 'business' : o.wp === 'household' ? 'family' : 'shared', owner: o.wp === 'shared' ? null : p.id, members: [], occ: [], opened: y };
  }
  if (wp) { p.workplace = wp.id; if (!wp.members.includes(p.id)) wp.members.push(p.id); if (!wp.occ.includes(o.name)) wp.occ.push(o.name); }
}
function jobSlots(W, workers) {
  const era = eraOf(W);
  const occs = era.occupations;
  const sumN = occs.reduce((s, o) => s + (o.apprentice ? 0 : o.n), 0) || 1;
  const want = {}, have = {};
  for (const o of occs) want[o.id] = o.unique ? 1 : Math.max(0, o.n / sumN * workers);
  for (const p of lives(W)) if (p.occId) have[p.occId] = (have[p.occId] || 0) + 1;
  return { want, have, occs };
}
function chooseJob(W, rng, p, y, slots) {
  slots = jobSlots(W, lives(W).filter(q => q.occId).length);
  const S = W.settings; const a = ageOf(p, y);
  const parents = [W.people[p.father], W.people[p.mother]].filter(Boolean);
  const cands = [];
  for (const o of slots.occs) {
    if (o.apprentice || o.spouseOf || isOfficeOcc(W, o.id)) continue;
    if (typeof canDoWork === 'function' && !canDoWork(p, o)) continue; // V10: work their injuries no longer allow
    const open = slots.want[o.id] - (slots.have[o.id] || 0);
    if (open <= 0.3) continue;
    if (a < o.min || (o.max && a > o.max)) continue;
    if (o.celibate && (p.spouse || p.children.length)) continue;
    if (o.lit && !p.literate && !S.familySizeLimit) continue;
    let w = open;
    if (o.sex !== 'any' && o.sex !== p.sex) { if (S.genderRoles === 'strict') continue; if (S.genderRoles === 'mixed') w *= 0.15; }
    w *= 0.3 + ((p.skills && p.skills[o.skill]) || p.aptitude[o.skill]) / 60;
    if (parents.some(q => q.occId === o.id)) w *= 1 + o.inherit * 25;
    if (o.cls === 'high') w *= parents.some(q => { const po = eraOf(W).occupations.find(x => x.id === q.occId); return po && po.cls === 'high'; }) || (p.education && /degree/i.test(p.education)) ? 6 : 0.25;
    cands.push([o, w]);
  }
  let o = cands.length ? rng.weighted(cands) : null;
  if (!o) { const fill = slots.occs.filter(x => x.filler && (x.sex === 'any' || x.sex === p.sex || S.genderRoles !== 'strict') && a >= x.min); o = fill.length ? rng.pick(fill) : null; }
  return o;
}
function startJob(W, rng, p, o, y, why, R) {
  if (typeof canDoWork === 'function' && !canDoWork(p, o)) return; // V10: work their lasting injuries no longer allow
  if (p.workplace) leaveJob(W, rng, p, y, 'moved on');
  const was = p.occupation;
  p.occId = o.id; p.occupation = o.name; p.jobSince = y;
  placeInWorkplace(W, rng, p, o, y);
  const parents = [W.people[p.father], W.people[p.mother]].filter(Boolean);
  const inherited = parents.some(q => q.occId === o.id);
  addEvent(W, p, y, 'work', `Started work as ${/^[aeiou]/i.test(o.name) ? 'an' : 'a'} ${/^[A-Z]{2}/.test(o.name) ? o.name : o.name.toLowerCase()}${p.workplace ? ` at ${W.workplaces[p.workplace].name}` : ''}.`, { why: why || (inherited ? `Following in the family trade.` : null) });
  R.jobsStarted++;
}
function yearWork(W, rng, y, R) {
  const S = W.settings; const era = eraOf(W);
  const modernish = !!S.familySizeLimit;
  const people = lives(W);
  const workersNow = people.filter(p => p.occId).length;
  if (W.era === 'dropped') { yearRolesDropped(W, rng, y, R); }
  for (const p of people) {
    if (!isAlive(p)) continue;
    const a = ageOf(p, y); W._s = rng.int(0, 3);
    const o = currentOcc(W, p);
    // skills grow with use, fade with age
    if (p.skills) {
      if (o) p.skills[o.skill] = clamp(p.skills[o.skill] + (1.5 + p.aptitude[o.skill] / 30) * (a < 30 ? 1.3 : a > 55 ? 0.4 : 1) * rng.range(0.5, 1.5), 0, 100);
      if (/student|pupil|school|lessons/i.test(p.occupation || '')) p.skills.learning = clamp(p.skills.learning + 2 + p.intellect / 30, 0, 100);
      if (a < 16) for (const k of Object.keys(p.skills)) p.skills[k] = clamp(p.skills[k] + rng.range(0, 1.5), 0, 100);
      if (a > 65) for (const k of Object.keys(p.skills)) p.skills[k] = clamp(p.skills[k] - rng.range(0, 1.2), 0, 100);
      for (const k of Object.keys(p.skills)) p.skills[k] = Math.round(p.skills[k] * 10) / 10;
    }
    if (W.era === 'dropped') { if (!p.occupation) p.occupation = a < 5 ? era.youngChild : era.childWork; continue; }
    // anyone with no role yet (babies, people who married in from outside)
    if (!p.occupation && !p.occId) {
      if (a < 5) p.occupation = era.youngChild;
      else if (a < (modernish ? 18 : 14)) p.occupation = rng.chance(S.schooling) ? (modernish ? (a < 14 ? 'Student (grade school)' : 'Student (high school)') : `Pupil at ${era.schoolName}`) : era.childWork;
      else if (a >= S.retireAge) p.occupation = era.retired;
      else { const job = chooseJob(W, rng, p, y, null); if (job) startJob(W, rng, p, job, y, a < 20 ? 'Old enough to work.' : 'Looking for a place here.', R); else p.occupation = modernish ? 'Unemployed (looking for work)' : 'Odd jobs'; }
      continue;
    }
    // children: starting school, finishing, apprenticeships
    if (a === 5 || a === 6) { if (p.occupation === era.youngChild && rng.chance(clamp(S.schooling + lawFx(W, 'schooling'), 0, 1))) { p.occupation = modernish ? 'Student (grade school)' : `Pupil at ${era.schoolName}`; addEvent(W, p, y, 'school', `Started ${modernish ? 'school' : 'lessons'}.`, { minor: true }); } else if (p.occupation === era.youngChild && a === 6) p.occupation = era.childWork; }
    if (modernish && a === 14 && p.occupation === 'Student (grade school)') p.occupation = 'Student (high school)';
    if (p.occupation === era.youngChild && a >= 7) p.occupation = era.childWork;
    const schoolEnd = modernish ? 18 : 14;
    const inChildRole = !p.occId && (p.occupation === era.childWork || /^Student \(|^Pupil/.test(p.occupation || '') || p.occupation === era.youngChild);
    if (inChildRole && a >= schoolEnd) {
      if (/^Student/.test(p.occupation)) { p.education = 'High school'; addEvent(W, p, y, 'school', 'Finished high school.', { minor: true }); }
      if (modernish && rng.chance(0.38 + p.intellect / 400)) { p.occupation = 'College student'; p.collegeSince = y; addEvent(W, p, y, 'school', 'Went to college.'); continue; }
      const job = chooseJob(W, rng, p, y, jobSlots(W, workersNow));
      if (job) startJob(W, rng, p, job, y, 'Old enough to work.', R); else p.occupation = modernish ? 'Unemployed (looking for work)' : 'Odd jobs';
      continue;
    }
    if (!modernish && inChildRole && a >= 12 && a < schoolEnd && rng.chance(0.12)) {
      // apprenticeship
      const masters = people.filter(m => { const mo = currentOcc(W, m); return mo && mo.skill === 'craft' && mo.wp === 'own' && ageOf(m, y) >= 25 && m.workplace && people.filter(x => x.masterId === m.id).length < 2; });
      if (masters.length) {
        const m = rng.pick(masters); const mo = currentOcc(W, m);
        p.occId = 'apprentice'; p.occupation = `Apprentice ${mo.name.toLowerCase()}`; p.masterId = m.id; p.jobSince = y;
        p.workplace = m.workplace; W.workplaces[m.workplace].members.push(p.id);
        setRelIndexed(W, m.id, p.id, 'mentor', rng.int(25, 65), y, `took ${himHer(p)} on as an apprentice`, { from: m.id });
        addEvent(W, p, y, 'work', `Apprenticed to @${m.id}, ${/^[aeiou]/i.test(mo.name) ? 'an' : 'a'} ${mo.name.toLowerCase()}.`);
        addEvent(W, m, y, 'work', `Took on @${p.id} as an apprentice.`, { minor: true });
        continue;
      }
    }
    if (p.occId === 'apprentice' && y - (p.jobSince || y) >= rng.int(4, 7)) {
      const m = W.people[p.masterId]; const mo = m && eraOf(W).occupations.find(x => x.id === m.occId);
      const target = mo || chooseJob(W, rng, p, y, jobSlots(W, workersNow));
      if (target) { leaveJob(W, rng, p, y, 'finished training'); startJob(W, rng, p, target, y, `Finished ${hisHer(p)} apprenticeship${m ? ` with @${m.id}` : ''}.`, R); mindOf(p).joy += 12; ripple(W, rng, p, y, 'pride', 8, null); }
      continue;
    }
    if (p.occupation === 'College student' && y - (p.collegeSince || y) >= 4) {
      p.education = rng.chance(0.85) ? "Bachelor's degree" : 'Some college';
      addEvent(W, p, y, 'school', p.education === "Bachelor's degree" ? 'Graduated from college.' : 'Left college without finishing.');
      if (p.education === "Bachelor's degree") { mindOf(p).joy += 15; ripple(W, rng, p, y, 'pride', 12, '{who} graduated from college.'); }
      const job = chooseJob(W, rng, p, y, jobSlots(W, workersNow));
      if (job) startJob(W, rng, p, job, y, null, R); else p.occupation = 'Unemployed (looking for work)';
      continue;
    }
    // retirement
    if (p.occId && a >= S.retireAge) {
      const ch = modernish ? 0.25 + (a - S.retireAge) * 0.08 : (a - S.retireAge) / 10 + (p.health < 40 ? 0.3 : 0);
      if (rng.chance(ch)) { leaveJob(W, rng, p, y, 'retired'); addEvent(W, p, y, 'work', modernish ? `Retired after working as ${/^[aeiou]/i.test(p.occupation) ? 'an' : 'a'} ${p.occupation.toLowerCase()}.` : `Gave up work as ${/^[aeiou]/i.test(p.occupation) ? 'an' : 'a'} ${p.occupation.toLowerCase()}; too old for it now.`); p.occId = null; p.occupation = era.retired; R.retired++; continue; }
    }
    if (p.occId && p.health < 18 && a >= 18 && rng.chance(0.5)) { leaveJob(W, rng, p, y, 'fell too ill to work'); addEvent(W, p, y, 'work', 'Had to stop working because of poor health.'); p.occId = null; p.occupation = modernish ? 'Unable to work (disability)' : era.retired; mindOf(p).yearStress += 15; continue; }
    // drinking costs jobs
    if (p.occId && mindOf(p).drink > 65 && rng.chance(0.15)) { const was = p.occupation; leaveJob(W, rng, p, y, 'lost the job'); p.occId = null; p.occupation = modernish ? 'Unemployed (looking for work)' : 'Odd jobs'; addEvent(W, p, y, 'work', `Lost ${hisHer(p)} place as ${/^[aeiou]/i.test(was) ? 'an' : 'a'} ${was.toLowerCase()}.`, { why: 'Too much drinking.' }); mindOf(p).yearStress += 25; R.jobsLost++; ripple(W, rng, p, y, 'worry', 12, null); continue; }
    // modern job changes and lay-offs
    if (modernish && p.occId && rng.chance(0.02)) { const was = p.occupation; leaveJob(W, rng, p, y, 'was laid off'); p.occId = null; p.occupation = 'Unemployed (looking for work)'; addEvent(W, p, y, 'work', `Was laid off from ${hisHer(p)} job as ${/^[aeiou]/i.test(was) ? 'an' : 'a'} ${was.toLowerCase()}.`); mindOf(p).yearStress += 25; R.jobsLost++; ripple(W, rng, p, y, 'worry', 10, null); continue; }
    if (modernish && p.occId && rng.chance(0.04)) { const job = chooseJob(W, rng, p, y, jobSlots(W, workersNow)); if (job && job.id !== p.occId) { startJob(W, rng, p, job, y, 'Wanted a change.', R); continue; } }
    // looking for work
    if (!p.occId && a >= 16 && a < S.retireAge && /Unemployed|Odd jobs/.test(p.occupation || '') && rng.chance(0.5)) { const job = chooseJob(W, rng, p, y, jobSlots(W, workersNow)); if (job) { startJob(W, rng, p, job, y, 'Found work at last.', R); mindOf(p).joy += 10; } }
    if (!p.occId && p.occupation === era.homemaker && modernish) { const young = p.children.some(c => { const k = W.people[c]; return k && isAlive(k) && ageOf(k, y) < 6; }); if (!young && rng.chance(0.3)) { const job = chooseJob(W, rng, p, y, jobSlots(W, workersNow)); if (job) startJob(W, rng, p, job, y, 'The children were old enough.', R); } }
    // a newly married woman in a strict setting may give up her trade
    if (S.genderRoles === 'strict' && p.sex === 'f' && p.spouse && p.occId && !/lady|midwife|alewife|spinster|herb/i.test(p.occupation) && p.events.some(e => e.y === y && e.t === 'married') && rng.chance(0.5)) { leaveJob(W, rng, p, y, 'married'); p.occId = null; p.occupation = era.homemaker; addEvent(W, p, y, 'work', 'Gave up paid work to keep house after marrying.'); continue; }
    // good and bad years at work
    if (p.occId && rng.chance(0.07)) {
      const lvl = p.skills ? p.skills[(o || {}).skill] || 50 : 50;
      if (rng.chance(lvl / 130)) { const what = rng.pick(['was praised as the best at the work', 'had a very good year at work', 'was given more responsibility', 'won a contest of skill', 'became known for fine work']); addEvent(W, p, y, 'success', `${cap(what)}.`); mindOf(p).joy += 15; ripple(W, rng, p, y, 'pride', 10, `Proud of {who}, who ${what}.`, { logAt: 0.85 }); }
      else { const what = rng.pick(['made a costly mistake at work', 'had a run of bad luck at work', 'was shamed by a botched job', 'clashed with the people they work for']).replace('they work', `${heShe(p)} works`); addEvent(W, p, y, 'setback', `${cap(what)}.`); mindOf(p).yearStress += 15; }
    }
  }
}
function yearRolesDropped(W, rng, y, R) {
  const era = eraOf(W);
  for (const p of lives(W)) {
    const a = ageOf(p, y); W._s = rng.int(0, 3);
    if (!p.occId && a >= 14 && a < 78 && p.health >= 30) {
      const r = rng.weighted(droppedRoles(W).map(x => [x, x.n * (0.4 + p.aptitude[x.skill] / 70) * (x.name === 'Translator' ? (p.languages.length >= 2 ? 3 : 0.05) : 1)]));
      p.occId = 'role_' + r.name.toLowerCase().replace(/[^a-z]+/g, '_'); p.occupation = r.name; p.jobSince = y;
      addEvent(W, p, y, 'work', `Took on work as ${/^[aeiou]/i.test(r.name) ? 'an' : 'a'} ${r.name.toLowerCase()}.`, { why: 'Old enough to pull ' + hisHer(p) + ' weight.' });
    } else if (p.occId && (a >= 78 || p.health < 25)) { p.occId = null; p.occupation = era.retired; addEvent(W, p, y, 'work', 'Stepped back to light duties.'); }
    else if (!p.occId && a >= 5 && a < 14 && p.occupation === era.youngChild) p.occupation = era.childWork;
    else if (p.occId && rng.chance(0.05)) {
      const r = rng.weighted(droppedRoles(W).map(x => [x, x.n * (0.4 + (p.skills ? p.skills[x.skill] : p.aptitude[x.skill]) / 60) * (x.name === 'Farmer' || x.name === 'Shelter builder' ? 1.5 : 1)]));
      if (r.name !== p.occupation) { addEvent(W, p, y, 'work', `Switched from ${p.occupation.toLowerCase()} to ${r.name.toLowerCase()}.`, { minor: true }); p.occId = 'role_' + r.name.toLowerCase().replace(/[^a-z]+/g, '_'); p.occupation = r.name; }
    }
  }
}

// ---------- homes ----------
function yearHome(W, rng, y, R) {
  const S = W.settings; const era = eraOf(W);
  for (const p of lives(W)) {
    const a = ageOf(p, y); const h = W.households[p.household]; if (!h) continue;
    W._s = rng.int(0, 3);
    if (!p.spouse && h.members.length > 1 && h.head !== p.id && !p.hermit) {
      const leaveP = S.familySizeLimit ? (a >= 19 && a <= 32 ? 0.16 : 0) : (a >= 22 && !p.spouse ? 0.04 : 0);
      if (leaveP && rng.chance(leaveP)) { newHousehold(W, rng, [p], y, rng.chance(0.5) ? h.district : null); addEvent(W, p, y, 'moved', `Moved out to a place of ${hisHer(p)} own.`); }
    }
    if (a >= 72 && !p.spouse && h.members.length === 1 && rng.chance(0.25)) {
      const kids = p.children.map(c => W.people[c]).filter(c => c && isAlive(c) && c.status === 'resident' && ageOf(c, y) >= 20 && c.household !== p.household);
      if (kids.length) { const k = rng.pick(kids); moveToHousehold(W, p, W.households[k.household]); addEvent(W, p, y, 'moved', `Moved in with ${rel3(k, 'son', 'daughter', 'child')} @${k.id}.`, { why: 'Getting older and living alone.' }); addEvent(W, k, y, 'took_in', `${cap(rel3(p, 'father', 'mother', 'parent'))} @${p.id} moved in.`); }
    }
    // grief and trauma can drive people away from others; time can bring them back
    const m = mindOf(p);
    if (!p.hermit && a >= 25 && !p.spouse && (m.trauma > 60 || griefLoad(p, y) > 1.2) && p.traits.E < 35 && rng.chance(0.04)) {
      const kidsHere = h.members.some(id => { const q = W.people[id]; return q && q.id !== p.id && ageOf(q, y) < 16; });
      if (!kidsHere) {
        p.hermit = true; p.hermitReason = m.trauma > 60 ? 'could not bear company after what happened' : 'withdrew from everyone after losing those closest';
        newHousehold(W, rng, [p], y, era.outskirts);
        addEvent(W, p, y, 'withdrew', 'Withdrew from everyone and went to live alone.', { why: cap(p.hermitReason) + '.' });
        ripple(W, rng, p, y, 'worry', 15, 'Worried about {who}, who has cut everyone off.');
      }
    } else if (!p.hermit && a >= 30 && !p.spouse && p.traits.E < 25 && h.members.length === 1 && rng.chance(0.035)) {
      p.hermit = true; p.hermitReason = rng.pick(era.hermitReasons);
      h.district = era.outskirts;
      addEvent(W, p, y, 'withdrew', 'Moved out to the edge of things and stopped seeing people.', { why: cap(p.hermitReason) + '.' });
    } else if (p.hermit && rng.chance(0.008 + (m.mood > 20 ? 0.015 : 0))) {
      p.hermit = false; addEvent(W, p, y, 'returned', `Came back to live among people again.`);
      newHousehold(W, rng, [p], y);
      p.hermitReason = null;
    }
  }
  // children left with no adult
  for (const c of lives(W)) if (ageOf(c, y) < 15) {
    const h = W.households[c.household];
    if (!h.members.some(id => { const q = W.people[id]; return q && isAlive(q) && q.status === 'resident' && ageOf(q, y) >= 16; })) { W._s = rng.int(0, 3); rehomeChild(W, rng, c, y); mindOf(c).trauma = clamp(mindOf(c).trauma + 10, 0, 100); }
  }
  for (const h of Object.values(W.households)) if (h.dissolved == null) recomputeHead(W, h);
}

// ---------- arrivals and departures ----------
function yearMigration(W, rng, y, R) {
  const S = W.settings;
  const n = lives(W).length;
  const expected = S.arrivals * n / 1000 * ((W._Y && W._Y.arrivalsMult) || 1) * (W._Y && W._Y.famine ? 0.3 : 1);
  let arrivals = Math.floor(expected) + (rng.chance(expected - Math.floor(expected)) ? 1 : 0);
  while (arrivals > 0) {
    W._s = rng.int(0, 3);
    const u = makeImmigrantUnit(W, rng, y, rng.chance(0.45) ? 'family' : 'single', 16, 45);
    for (const p of u) { mindOf(p); p.skills = {}; for (const k of Object.keys(p.aptitude)) p.skills[k] = Math.round(p.aptitude[k] * 0.35 + Math.min(20, ageOf(p, y) - 10)); p.hist = []; }
    assignNewcomerJobs(W, rng, u, y, R);
    arrivals -= u.length; R.arrivals += u.length;
  }
  if (S.familiesLeaving > 0) for (const h of Object.values(W.households)) {
    if (h.dissolved != null || !h.members.length) continue;
    const mem = h.members.map(id => W.people[id]).filter(p => p && isAlive(p) && p.status === 'resident');
    if (mem.length < 2 || !rng.chance(S.familiesLeaving)) continue;
    W._s = rng.int(0, 3);
    const why = rng.pick(['for better work elsewhere', 'to be near family in another place', 'after a run of bad luck', 'for a fresh start', 'to follow a job offer']);
    for (const p of mem) {
      leaveJob(W, rng, p, y, 'moved away'); departPerson(W, p, y, rng); R.departures++;
      p.events[p.events.length - 1].text = `Left ${W.name} with the household ${why}.`;
      for (const r of relsOf(W, p.id)) r.ended = r.ended || y;
      for (const g of Object.values(W.groups)) if (g.members.includes(p.id)) { g.members = g.members.filter(x => x !== p.id); g.past.push({ id: p.id, y, why: 'left town' }); }
    }
    R.items.push({ k: 'leftTown', ids: mem.map(p => p.id) });
  }
  if (S.leaving > 0) for (const p of lives(W)) {
    const a = ageOf(p, y);
    if (p.spouse || a < 17 || a > 35) continue;
    const kidsHere = p.children.some(c => { const k = W.people[c]; return k && isAlive(k) && k.status === 'resident'; });
    if (kidsHere) continue;
    const h = W.households[p.household];
    const others = h ? h.members.filter(id => id !== p.id).map(id => W.people[id]) : [];
    if (others.some(q => ageOf(q, y) < 16) && !others.some(q => q && ageOf(q, y) >= 16)) continue;
    let ch = S.leaving * (1 + (W._Y && W._Y.famine ? 1.5 : 0) + (h && h.wealth < 20 ? 0.8 : 0) + (mindOf(p).mood < -20 ? 1 : 0) + (p.occupation && /Unemployed|Odd jobs/.test(p.occupation) ? 1.5 : 0) + (p.traits.O - 50) / 60);
    if (rng.chance(ch)) {
      W._s = rng.int(0, 3);
      leaveJob(W, rng, p, y, 'moved away');
      departPerson(W, p, y, rng);
      R.departures++;
      ripple(W, rng, p, y, 'worry', 8, null);
      for (const r of relsOf(W, p.id)) r.ended = r.ended || y;
      for (const g of Object.values(W.groups)) if (g.members.includes(p.id)) { g.members = g.members.filter(x => x !== p.id); g.past.push({ id: p.id, y, why: 'left town' }); }
    }
  }
}
function assignNewcomerJobs(W, rng, unit, y, R) {
  const era = eraOf(W); const modernish = !!W.settings.familySizeLimit;
  for (const p of unit) {
    const a = ageOf(p, y);
    if (a < 5) p.occupation = era.youngChild;
    else if (a < (modernish ? 18 : 14)) p.occupation = rng.chance(W.settings.schooling) ? (modernish ? (a < 14 ? 'Student (grade school)' : 'Student (high school)') : `Pupil at ${era.schoolName}`) : era.childWork;
    else if (p.sex === 'f' && p.spouse && W.settings.genderRoles === 'strict' && rng.chance(0.55)) p.occupation = era.homemaker;
    else { const job = chooseJob(W, rng, p, y, jobSlots(W, lives(W).filter(q => q.occId).length + 1)); if (job) startJob(W, rng, p, job, y, 'Newly arrived and looking for work.', R); else p.occupation = modernish ? 'Unemployed (looking for work)' : 'Odd jobs'; }
    p.education = p.education || (p.literate ? 'Can read and write' : '');
    const v = era.venues.filter(v => v.kind !== 'school' && (v.who === 'all' || (v.who === 'adults' && a >= 16))).filter(() => rng.chance(0.4)).map(v => v.id); p.venues = v;
  }
}

// ---------- languages in the empty world ----------
function yearLanguages(W, rng, y, R) {
  const byCamp = {};
  for (const p of lives(W)) { const h = W.households[p.household]; if (h) (byCamp[h.district] = byCamp[h.district] || []).push(p); }
  for (const p of lives(W)) {
    const h = W.households[p.household]; if (!h) continue;
    const counts = {};
    for (const q of byCamp[h.district]) for (const l of q.languages) counts[l] = (counts[l] || 0) + 1;
    for (const q of h.members.map(id => W.people[id])) if (q) for (const l of q.languages) counts[l] = (counts[l] || 0) + 5;
    const options = Object.entries(counts).filter(([l]) => !p.languages.includes(l)).sort((a, b) => b[1] - a[1]);
    if (!options.length) continue;
    const a = ageOf(p, y);
    const ch = (a < 12 ? 0.45 : a < 25 ? 0.2 : 0.1) * (0.5 + p.intellect / 100) * (0.6 + p.traits.O / 125);
    if (rng.chance(ch)) { const l = options[0][0]; p.languages.push(l); W._s = rng.int(0, 3); addEvent(W, p, y, 'learned', `Learned enough ${l} to get by.`, { minor: a >= 12 ? false : true }); }
  }
}

// ---------- minds ----------
function griefLoad(p, y) {
  let g = 0;
  const T = 1 + p.traits.N / 40;
  for (const m of p.memories) {
    if (m.kind !== 'loss' && m.kind !== 'separation' && m.kind !== 'heartbreak' && m.kind !== 'divorce' && m.kind !== 'betrayal') continue;
    const age = y - m.y; if (age < 0) continue;
    g += m.weight * Math.exp(-age / (m.kind === 'separation' ? T * 3 : T));
  }
  return g;
}
function yearMind(W, rng, y, R) {
  const S = W.settings;
  let sum = 0, n = 0;
  for (const p of lives(W)) {
    const m = mindOf(p); const a = ageOf(p, y); W._s = 3;
    const grief = griefLoad(p, y);
    const friends = relsOf(W, p.id).filter(r => !r.ended && /friend/.test(r.type) && r.type !== 'old friend').length;
    const enemies = relsOf(W, p.id).filter(r => !r.ended && r.score <= -40).length;
    const sp = p.spouse ? getRel(W, p.id, p.spouse) : null;
    const h = W.households[p.household];
    const youngKids = h ? h.members.filter(id => { const q = W.people[id]; return q && ageOf(q, y) < 5; }).length : 0;
    const base = 12 - p.traits.N * 0.35 + p.traits.E * 0.12 + p.traits.A * 0.06;
    let stress = m.yearStress + youngKids * 5 + enemies * 4 + (p.occupation && /Unemployed/.test(p.occupation) ? 18 : 0) + (100 - p.health) * 0.25 + (h ? (40 - Math.min(40, h.wealth)) * 0.3 : 0);
    if (p.hermit) stress -= 5;
    m.stress = Math.round(clamp(m.stress * 0.4 + stress * 0.6, 0, 100));
    let mood = base + lawFx(W, 'mood') + m.joy * 0.8 - m.worry * 0.5 - grief * 28 - m.trauma * 0.3 - m.guilt * 0.3 - m.stress * 0.35 + Math.min(friends, 5) * 3 + (sp ? (sp.score - 50) * 0.25 : (a >= 25 && !p.hermit ? -4 : 0)) - (m.depressed ? 15 : 0) - m.drink * 0.08;
    m.mood = Math.round(clamp(m.mood * 0.35 + mood * 0.65, -100, 100));
    // trauma and guilt fade slowly
    m.trauma = Math.round(clamp(m.trauma * (0.82 + p.traits.N / 700) - friends * 0.4, 0, 100));
    m.guilt = Math.round(clamp(m.guilt * (0.8 + p.traits.C / 600), 0, 100));
    // depression
    if (!m.depressed && m.mood < -30 && a >= 12 && rng.chance(0.12 + p.traits.N / 400 + (m.mood < -55 ? 0.15 : 0))) {
      m.depressed = y; addEvent(W, p, y, 'mind', 'Sank into a deep, lasting low.', { why: moodReasons(W, p, y, grief, m).join('; ') || 'No single reason.' });
      ripple(W, rng, p, y, 'worry', 10, null);
    } else if (m.depressed && rng.chance(0.2 + Math.min(friends, 5) * 0.03 + (sp && sp.score > 50 ? 0.08 : 0) + (m.mood > -10 ? 0.2 : 0))) {
      m.depressed = false; addEvent(W, p, y, 'mind', 'Came out of a long dark time.', { why: friends >= 2 ? 'Friends and family helped.' : 'Time, mostly.' });
    }
    // drinking
    if (a >= 15) {
      const pull = lawFx(W, 'drink') * 6 + (m.stress > 55 ? 10 : 0) + (grief > 0.8 ? 8 : 0) + (m.trauma > 40 ? 6 : 0) + (m.depressed ? 6 : 0) - (p.traits.C - 50) / 6 + (W.era === 'scifi' ? -3 : 0);
      const before = m.drink;
      m.drink = Math.round(clamp(m.drink + (pull > 6 ? rng.int(3, 14) : -rng.int(4, 12)) + (m.drink > 60 ? 4 : 0), 0, 100));
      if (before <= 60 && m.drink > 60) { addEvent(W, p, y, 'mind', `Began drinking heavily.`, { why: moodReasons(W, p, y, grief, m).join('; ') || 'Habit took hold.' }); ripple(W, rng, p, y, 'worry', 12, 'Worried about {who}\'s drinking.'); }
      if (before > 60 && m.drink <= 40) addEvent(W, p, y, 'mind', 'Gave up the heavy drinking.', { why: rng.pick(['Family begged.', 'A scare with health.', 'Faith helped.', 'Friends stood by.', 'Hit bottom and climbed out.']) });
      if (m.drink > 60) p.health = Math.round(clamp(p.health - rng.int(1, 4), 1, 100));
    }
    // ageing body
    if (a > 40) p.health = Math.round(clamp(p.health - rng.range(0.2, 1.2) * (a > 70 ? 2 : 1), 1, 100));
    else if (p.health < 85) p.health = Math.round(clamp(p.health + rng.range(0, 3), 1, 100));
    // new long-term conditions with age
    if (a >= 20) for (const [c, prev] of eraOf(W).conditions) if (!p.conditions.includes(c) && rng.chance(prev / 45 * (a > 50 ? 1.6 : 0.6))) { p.conditions.push(c); addEvent(W, p, y, 'health', `Began to suffer from ${c}.`, { minor: true }); }
    // remember the year
    // old, minor memories fade away; life-defining ones stay
    if (p.memories.length > 12) p.memories = p.memories.filter(x => x.weight >= 0.85 || y - x.y < 15);
    p.hist.push([y, m.mood, p.health, m.stress, Math.round(grief * 100) / 100, m.drink, m.depressed ? 1 : 0, m.trauma, m.guilt]);
    if (p.hist.length > 400) p.hist.shift();
    sum += m.mood; n++;
  }
  R.mood = n ? Math.round(sum / n) : 0;
}
function moodReasons(W, p, y, grief, m) {
  const out = [];
  if (grief > 0.5) { const last = p.memories.filter(x => x.kind === 'loss').pop(); out.push(last ? `still grieving (${last.note})` : 'grief'); }
  if (m.trauma > 35) out.push('haunted by what happened');
  if (m.guilt > 30) out.push('weighed down by guilt');
  if (m.stress > 55) out.push('under heavy strain');
  if (p.health < 40) out.push('poor health');
  if (p.occupation && /Unemployed/.test(p.occupation)) out.push('out of work');
  return out;
}

// ---------- the year's summary ----------
function yearFinish(W, rng, y, R, startPop, outbreak, Y) {
  const pop = lives(W).length;
  const topCauses = Object.entries(R.causes).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const parts = [];
  const prevMood = W.chronicle[y - 1] ? W.chronicle[y - 1].mood : null;
  const tone = R.mood >= 15 ? 'a good year' : R.mood >= 0 ? 'an ordinary year' : R.mood >= -15 ? 'a difficult year' : 'a hard, grim year';
  parts.push(`${cap(tone)} in ${W.name}.`);
  if (Y) parts.push(econSummary(W, y, Y));
  if (outbreak && outbreak.cases) parts.push(`${cap(outbreak.d.name)} broke out in ${SEASONS[outbreak.season].toLowerCase()}: ${outbreak.cases} fell ill${outbreak.deaths ? ` and ${outbreak.deaths} died` : ''}.`);
  parts.push(`${R.births} ${R.births === 1 ? 'baby was' : 'babies were'} born and ${R.deaths} ${R.deaths === 1 ? 'person' : 'people'} died${topCauses.length ? ` (most often of ${topCauses.map(c => c[0]).slice(0, 2).join(' and ')})` : ''}.`);
  if (R.marriages) parts.push(`${R.marriages} ${R.marriages === 1 ? 'couple' : 'couples'} wed or set up home together${R.divorces ? `, and ${R.divorces} split up` : ''}.`);
  if (R.arrivals || R.departures) parts.push(`${R.arrivals} newcomers arrived and ${R.departures} moved away.`);
  for (const it of R.items) if (it.text) parts.push(it.text);
  parts.push(`The town now numbers ${pop} (${pop >= startPop ? '+' : ''}${pop - startPop}).`);
  W.chronicle[y] = {
    y, summary: parts.join(' '), mood: R.mood, moodPrev: prevMood,
    stats: { births: R.births, deaths: R.deaths, infantDeaths: R.infantDeaths, marriages: R.marriages, divorces: R.divorces, arrivals: R.arrivals, departures: R.departures, illnesses: R.illnesses, injuries: R.injuries, miscarriages: R.miscarriages, newFriends: R.newFriends, quarrels: R.quarrels, reconciled: R.reconciled, jobsStarted: R.jobsStarted, jobsLost: R.jobsLost, retired: R.retired, population: pop, start: startPop },
    weather: Y ? Y.weather : null, food: Y ? Y.food : null, price: Y ? Y.priceIndex : null,
    causes: R.causes, outbreak: outbreak && outbreak.cases ? { name: outbreak.d.name, season: outbreak.season, cases: outbreak.cases, deaths: outbreak.deaths } : null,
    items: R.items
  };
  W.yearStats[y] = Object.assign({}, W.chronicle[y].stats);
}

// ---------- a person's year in words ----------
function personYearSummary(W, p, y) {
  const evs = p.events.filter(e => e.y === y);
  const h = (p.hist || []).find(r => r[0] === y);
  const prev = (p.hist || []).find(r => r[0] === y - 1);
  if (!h) return null;
  const [, mood, health, stress, grief, drink, dep, trauma, guilt] = h;
  const word = mood >= 35 ? 'A happy year' : mood >= 12 ? 'A good year' : mood >= -8 ? 'An ordinary year' : mood >= -30 ? 'A hard year' : 'A very dark year';
  const why = [];
  if (evs.some(e => e.t === 'married' || e.t === 'partnered')) why.push('a wedding');
  if (evs.some(e => e.t === 'child_born')) why.push('a new baby');
  if (evs.some(e => e.t === 'courting')) why.push('a new romance');
  if (evs.some(e => e.t === 'loss')) why.push('a death in the family or among friends');
  if (evs.some(e => e.t === 'ill')) why.push('serious illness');
  if (evs.some(e => e.t === 'injury')) why.push('an injury');
  if (evs.some(e => e.t === 'heartbreak' || e.t === 'divorced')) why.push('heartbreak');
  if (evs.some(e => e.t === 'betrayal')) why.push('betrayal');
  if (evs.some(e => e.t === 'success')) why.push('success at work');
  if (evs.some(e => e.t === 'setback')) why.push('trouble at work');
  if (evs.some(e => e.t === 'work' && /lost|laid off/i.test(e.text))) why.push('losing work');
  if (grief > 0.5 && !evs.some(e => e.t === 'loss')) why.push('lingering grief');
  if (trauma > 40) why.push('old wounds of the mind');
  if (guilt > 30) why.push('guilt');
  if (drink > 60) why.push('heavy drinking');
  if (dep) why.push('depression');
  if (stress > 60 && !why.length) why.push('a great deal of strain');
  const trend = prev ? (mood - prev[1] > 15 ? ' Better than the year before.' : prev[1] - mood > 15 ? ' Worse than the year before.' : '') : '';
  return { word, mood, health, stress, text: `${word}${why.length ? ' — ' + why.slice(0, 4).join(', ') : ''}.${trend}` };
}

if (typeof module !== 'undefined') Object.assign(module.exports, { advanceYear, upgradeWorld, personYearSummary, SEASONS, griefLoad });

// ---------- history periods (V10): their own defaults where they differ, else their base setting's ----------
EXTRA_DEFAULTS.tudor = Object.assign({}, EXTRA_DEFAULTS.medieval, { arrivals: 8, medicine: 0.06, outbreaks: 0.26 });
EXTRA_DEFAULTS.georgian = Object.assign({}, EXTRA_DEFAULTS.medieval, { arrivals: 12, leaving: 0.03, medicine: 0.1, outbreaks: 0.2 });
EXTRA_DEFAULTS.victorian = Object.assign({}, EXTRA_DEFAULTS.frontier, { arrivals: 22, leaving: 0.05, familiesLeaving: 0.015, medicine: 0.25, outbreaks: 0.22 });
EXTRA_DEFAULTS.edwardian = Object.assign({}, EXTRA_DEFAULTS.frontier, { arrivals: 18, leaving: 0.05, familiesLeaving: 0.015, medicine: 0.45, outbreaks: 0.14 });
periodFill(EXTRA_DEFAULTS);
for (const [k, e] of Object.entries(ERAS)) if (e.base) e.settings = Object.assign({}, EXTRA_DEFAULTS[k], e.settings); // periods were copied before their base got these
periodFillLists(DISEASES);
