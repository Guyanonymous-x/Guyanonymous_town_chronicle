// ================= Town Chronicle engine (no page code here) =================
const FORMAT = 'town-chronicle';
const FORMAT_VERSION = 3;

// ---------- random numbers (seeded, so the same seed makes the same town) ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
class Rng {
  constructor(seed) { this.r = mulberry32(seed >>> 0); }
  next() { return this.r(); }
  chance(p) { return this.r() < p; }
  int(a, b) { return a + Math.floor(this.r() * (b - a + 1)); }
  range(a, b) { return a + this.r() * (b - a); }
  pick(arr) { return arr[Math.floor(this.r() * arr.length)]; }
  normal(m, sd) { let u = 0, v = 0; while (u === 0) u = this.r(); v = this.r(); return m + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  weighted(obj) { // {key: weight} or [[item, weight], ...]
    const entries = Array.isArray(obj) ? obj : Object.entries(obj);
    let total = 0; for (const e of entries) total += Math.max(0, e[1]);
    if (total <= 0) return entries.length ? entries[0][0] : undefined;
    let x = this.r() * total;
    for (const e of entries) { x -= Math.max(0, e[1]); if (x <= 0) return e[0]; }
    return entries[entries.length - 1][0];
  }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  sample(arr, n) { return this.shuffle(arr.slice()).slice(0, n); }
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// ---------- small helpers ----------
function ageOf(p, y) { return y - p.born; }
function isAlive(p) { return p.died == null; }
function isResident(p) { return p.status === 'resident'; }
function eraOf(W) { return ERAS[W.era]; }
function heShe(p) { return p.sex === 'm' ? 'he' : 'she'; }
function hisHer(p) { return p.sex === 'm' ? 'his' : 'her'; }
function himHer(p) { return p.sex === 'm' ? 'him' : 'her'; }
function rel3(p, m, f, n) { return p.sex === 'm' ? m : (p.sex === 'f' ? f : n); }
function ordinal(n) { return ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'][n - 1] || (n + 'th'); }
function fullName(p) { return p ? `${p.first} ${p.last}` : 'unknown'; }

function addEvent(W, p, y, type, text, extra) {
  const e = { y, t: type, text };
  if (W && W._s != null) e.s = W._s;
  if (extra) Object.assign(e, extra);
  p.events.push(e);
  return e;
}
function addMemory(p, y, kind, who, weight, note) { p.memories.push({ y, kind, who, weight: Math.round(weight * 100) / 100, note }); }

// ---------- names ----------
function nameList(list, born) {
  if (Array.isArray(list)) return list;
  for (const [until, names] of list.bands) if (born < until) return names;
  return list.bands[list.bands.length - 1][1];
}
function genFantasyName(rng, sex) {
  const g = CULTURES.fantasy.gen;
  return rng.pick(g.start) + rng.pick(sex === 'm' ? g.maleEnd : g.femaleEnd);
}
function pickFirstName(W, rng, culture, sex, born, parents) {
  const C = CULTURES[culture];
  const era = eraOf(W);
  // naming after a parent or grandparent was common before modern times
  const namesakeP = era.settings.familySizeLimit ? 0.05 : 0.3;
  if (parents && parents.length && rng.chance(namesakeP)) {
    const pool = [];
    for (const par of parents) {
      if (!par) continue;
      if (par.sex === sex) pool.push(par.first);
      for (const gid of [par.father, par.mother]) { const g = W.people[gid]; if (g && g.sex === sex) pool.push(g.first); }
    }
    if (pool.length) return rng.pick(pool);
  }
  if (C.gen) return genFantasyName(rng, sex);
  return rng.pick(nameList(sex === 'm' ? C.male : C.female, born));
}
function pickSurname(rng, culture) {
  const C = CULTURES[culture];
  if (C.gen) return rng.pick(C.gen.sur1) + rng.pick(C.gen.sur2);
  return rng.pick(C.surnames);
}

// ---------- world object ----------
function makeEmptyWorld(opts) {
  const era = ERAS[opts.era];
  const settings = Object.assign({}, era.settings, opts.settings || {});
  return {
    format: FORMAT, version: FORMAT_VERSION,
    id: 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    name: opts.name, era: opts.era, seed: opts.seed, settings, options: opts.options || {},
    targetPopulation: opts.population,
    startYear: era.startYear, year: era.startYear, createdAt: new Date().toISOString(),
    people: {}, households: {}, workplaces: {}, rels: {}, groups: {}, feuds: {},
    venues: era.venues.map(v => ({ id: v.id, name: v.name, kind: v.kind })),
    districts: era.districts.slice(),
    yearStats: {}, log: [],
    next: { p: 1, h: 1, w: 1, g: 1, f: 1 },
    edits: []
  };
}

// ---------- people ----------
const HAIR_DARK = ['black', 'black', 'black', 'dark brown', 'dark brown', 'brown'];
const LIGHT_CULTURES = new Set(['medievalEnglish','frontierAnglo','irish','german','modernAmerican','british','modernGerman','slavic','fantasy','scifi']);

function makePerson(W, rng, o) {
  const era = eraOf(W);
  const S = W.settings;
  const id = W.next.p++;
  const father = o.father ? W.people[o.father] : null;
  const mother = o.mother ? W.people[o.mother] : null;
  const culture = o.culture || (father ? father.culture : mother ? mother.culture : rng.weighted(era.cultures));
  const sex = o.sex || (rng.chance(0.512) ? 'm' : 'f');
  const p = {
    id, first: '', last: '', birthName: '', sex, born: o.born, died: null, cause: null,
    status: 'resident', father: o.father || null, mother: o.mother || null,
    spouse: null, union: null, exes: [], children: [], household: null, culture,
    faith: null, orientation: 'straight', traits: {}, health: 75, appearance: {}, conditions: [], aptitude: {},
    occupation: null, occId: null, workplace: null, formerOccupation: null, education: '', literate: false,
    languages: [], hermit: false, hermitReason: null, celibate: false, quirk: '', hobbies: [], goal: '', fear: '', values: [],
    venues: [], arrived: o.arrived || null, homeland: null, desiredKids: null, guardian: null,
    events: [], memories: [], notes: ''
  };
  // names
  p.first = o.first || pickFirstName(W, rng, culture, sex, o.born, [father, mother]);
  p.last = o.last || (father ? father.last : mother ? mother.last : pickSurname(rng, culture));
  p.birthName = p.last;
  // personality: partly inherited from parents
  for (const k of ['O', 'C', 'E', 'A', 'N']) {
    const base = (father && mother) ? (father.traits[k] + mother.traits[k]) / 2 : (father || mother) ? (father || mother).traits[k] : 50;
    const inh = (father || mother) ? 0.4 : 0;
    p.traits[k] = Math.round(clamp(base * inh + rng.normal(50, 17) * (1 - inh), 1, 99));
  }
  p.intellect = Math.round(clamp(rng.normal(50, 17), 1, 99));
  for (const sk of ['farming', 'craft', 'trade', 'learning', 'healing', 'fighting', 'animals', 'outdoors', 'arts', 'leadership', 'labor', 'magic'])
    p.aptitude[sk] = Math.round(clamp(rng.normal(50, 18), 1, 99));
  p.health = Math.round(clamp(rng.normal(76, 13), 10, 100));
  // orientation (estimate: about 3% gay, 2% bisexual)
  const ro = rng.next(); p.orientation = ro < 0.03 ? 'gay' : ro < 0.05 ? 'bisexual' : 'straight';
  // faith: usually the family's
  p.faith = (mother && mother.faith && rng.chance(0.9)) ? mother.faith : (father && father.faith && rng.chance(0.85)) ? father.faith : rng.weighted(era.faiths);
  // appearance
  const hairPool = LIGHT_CULTURES.has(culture) ? GENERIC.hair : HAIR_DARK;
  const eyePool = LIGHT_CULTURES.has(culture) ? GENERIC.eyes : ['brown', 'dark brown', 'dark brown', 'hazel'];
  const par = [father, mother].filter(Boolean);
  p.appearance.hair = (par.length && rng.chance(0.85)) ? rng.pick(par).appearance.hair : rng.pick(hairPool);
  p.appearance.eyes = (par.length && rng.chance(0.85)) ? rng.pick(par).appearance.eyes : rng.pick(eyePool);
  p.appearance.build = rng.pick(GENERIC.builds);
  const modernHeights = ['modern', 'scifi', 'dropped'].includes(W.era);
  const avgH = (sex === 'm' ? 172 : 160) + (modernHeights ? 4 : 0);
  p.appearance.height = Math.round(rng.normal(avgH, 7));
  // quirks, likes and wants
  p.quirk = rng.pick(GENERIC.quirks);
  p.hobbies = rng.sample(era.hobbies, rng.int(1, 3));
  p.goal = rng.pick(era.goals);
  p.fear = rng.pick(GENERIC.fears);
  p.values = rng.sample(GENERIC.values, 2);
  // languages
  const lang = CULTURES[culture].language;
  p.languages = [lang];
  for (const x of par) for (const l of x.languages) if (!p.languages.includes(l) && rng.chance(0.7)) p.languages.push(l);
  // modern-habit family size wish
  if (S.familySizeLimit) p.desiredKids = rng.weighted(era.desiredKids || [[0, 0.14], [1, 0.18], [2, 0.38], [3, 0.18], [4, 0.08], [5, 0.04]]);
  W.people[id] = p;
  return p;
}

// ---------- households ----------
function newHousehold(W, rng, members, y, district) {
  const id = W.next.h++;
  const era = eraOf(W);
  if (!district) district = pickDistrict(W, rng, members[0] && members[0].culture);
  const h = { id, name: '', members: [], head: null, district, founded: y, wealth: 30, dissolved: null };
  W.households[id] = h;
  for (const m of members) moveToHousehold(W, m, h);
  recomputeHead(W, h);
  return h;
}
function pickDistrict(W, rng, c) {
  const era = eraOf(W); let district;
  {
    // some areas are home to one community (e.g. the Mexican quarter)
    const own = era.districtCulture ? Object.keys(era.districtCulture).filter(d => era.districtCulture[d] === c) : [];
    if (own.length && rng.chance(0.75)) district = rng.pick(own);
    else { const others = era.districts.filter(d => !(era.districtCulture && era.districtCulture[d] && era.districtCulture[d] !== c && rng.chance(0.9))); district = rng.pick(others.length ? others : era.districts); }
  }
  return district;
}
function moveToHousehold(W, p, h) {
  if (p.household && W.households[p.household]) {
    const old = W.households[p.household];
    old.members = old.members.filter(x => x !== p.id);
    if (old !== h) recomputeHead(W, old);
  }
  p.household = h.id;
  if (!h.members.includes(p.id)) h.members.push(p.id);
}
function recomputeHead(W, h) {
  const strict = W.settings.genderRoles === 'strict';
  const live = h.members.map(id => W.people[id]).filter(p => p && isAlive(p) && isResident(p));
  if (!live.length) { h.head = null; if (h.dissolved == null) h.dissolved = W._y || W.year; h.name = h.name || 'empty household'; return; }
  h.dissolved = null;
  const adults = live.filter(p => ageOf(p, W._y || W.year) >= 16);
  const pool = adults.length ? adults : live;
  pool.sort((a, b) => {
    if (strict && a.sex !== b.sex) return a.sex === 'm' ? -1 : 1;
    return a.born - b.born;
  });
  h.head = pool[0].id;
  h.name = `the ${pool[0].last} household`;
}
function leaveHousehold(W, p) {
  if (p.household && W.households[p.household]) {
    const h = W.households[p.household];
    h.members = h.members.filter(x => x !== p.id);
    recomputeHead(W, h);
  }
}

// ---------- kinship ----------
function ancestors(W, p, depth) {
  const out = new Set([p.id]);
  let frontier = [p];
  for (let d = 0; d < depth; d++) {
    const nf = [];
    for (const x of frontier) for (const pid of [x.father, x.mother]) {
      if (pid && W.people[pid] && !out.has(pid)) { out.add(pid); nf.push(W.people[pid]); }
    }
    frontier = nf;
  }
  return out;
}
function closelyRelated(W, a, b) {
  if (a.id === b.id) return true;
  const A = ancestors(W, a, 2), B = ancestors(W, b, 2);
  for (const x of A) if (B.has(x)) return true;
  return false;
}
function siblingsOf(W, p, includeHalf = true) {
  const out = new Set();
  for (const pid of [p.father, p.mother]) {
    const par = W.people[pid]; if (!par) continue;
    for (const c of par.children) if (c !== p.id) out.add(c);
  }
  if (!includeHalf) return [...out].filter(c => { const s = W.people[c]; return s.father === p.father && s.mother === p.mother; });
  return [...out];
}

// ---------- mortality, fertility, marriage ----------
function deathChance(W, p, y) {
  const S = W.settings; const a = ageOf(p, y);
  let q;
  if (a <= 4) q = S.childDeath;
  else if (a <= 14) q = S.youthDeath;
  else q = S.adultDeath + 0.0008 * S.agingSpeed * Math.exp(0.09 * (a - 30));
  q *= (1.45 - p.health / 110);
  if (p.conditions.length) q *= 1 + 0.08 * p.conditions.length;
  return clamp(q, 0, 0.92);
}
function deathCause(W, rng, p, y) {
  const era = eraOf(W); const a = ageOf(p, y);
  if (a <= 2) return rng.pick(era.infantCauses);
  if (a >= 68 && rng.chance(0.7)) return rng.pick(era.oldCauses);
  return rng.pick(era.illnesses);
}
function fertilityFactor(a) {
  if (a < 15) return 0; if (a < 20) return 0.55; if (a < 30) return 1; if (a < 35) return 0.85;
  if (a < 40) return 0.6; if (a < 45) return 0.28; if (a < 50) return 0.04; return 0;
}
function marryFactor(W, p, y) {
  const S = W.settings; const a = ageOf(p, y);
  const min = p.sex === 'f' ? S.marriageAgeWomen : S.marriageAgeMen;
  if (a < min || p.celibate) return 0;
  let f;
  if (a < min + 2) f = 0.45; else if (a < 35) f = 1; else if (a < 45) f = 0.5; else if (a < 60) f = 0.22; else f = 0.06;
  if (p.hermit) f *= 0.1;
  if (p.exes.length) f *= 0.7;
  if (p.orientation === 'gay' && !S.sameSexCouples) f *= 0.35;
  return f;
}
function wantsSameSex(W, rng, p) {
  if (!W.settings.sameSexCouples) return false;
  if (p.orientation === 'gay') return true;
  if (p.orientation === 'bisexual') return rng.chance(0.35);
  return false;
}

// ---------- unions ----------
function unite(W, rng, a, b, y, why) {
  const S = W.settings;
  const partners = rng.chance(S.partnersNotMarried);
  a.spouse = b.id; b.spouse = a.id;
  a.union = b.union = partners ? 'partners' : 'married';
  if (!partners && a.sex !== b.sex) {
    const wife = a.sex === 'f' ? a : b, husband = a.sex === 'm' ? a : b;
    if (rng.chance(S.wifeTakesName)) wife.last = husband.last;
  }
  const verb = partners ? 'Moved in with' : 'Married';
  addEvent(W, a, y, partners ? 'partnered' : 'married', `${verb} @${b.id}.`, why ? { why } : null);
  addEvent(W, b, y, partners ? 'partnered' : 'married', `${verb} @${a.id}.`, why ? { why } : null);
  for (const x of [a, b]) for (const pid of [x.father, x.mother]) {
    const par = W.people[pid];
    if (par && isAlive(par) && par.status === 'resident') addEvent(W, par, y, 'child_married', `${cap(rel3(x, 'son', 'daughter', 'child'))} @${x.id} ${partners ? 'moved in with' : 'married'} @${x === a ? b.id : a.id}.`);
  }
  // housing: join whoever already heads a home with others in it, else set up a new one
  const ha = W.households[a.household], hb = W.households[b.household];
  const aKeeps = ha && ha.head === a.id && ha.members.length > 1;
  const bKeeps = hb && hb.head === b.id && hb.members.length > 1;
  const bringKids = (from, to) => {
    for (const cid of from.children) {
      const c = W.people[cid];
      if (c && isAlive(c) && isResident(c) && ageOf(c, y) < 16 && c.household === from.household) moveToHousehold(W, c, to);
    }
  };
  if (aKeeps && !bKeeps) { bringKids(b, ha); moveToHousehold(W, b, ha); }
  else if (bKeeps && !aKeeps) { bringKids(a, hb); moveToHousehold(W, a, hb); }
  else {
    const parentHome = ha || hb;
    const district = (parentHome && rng.chance(0.6)) ? parentHome.district : pickDistrict(W, rng, rng.chance(0.5) ? a.culture : b.culture);
    const h = newHousehold(W, rng, [], y, district);
    bringKids(a, h); bringKids(b, h);
    moveToHousehold(W, a, h); moveToHousehold(W, b, h);
    recomputeHead(W, h);
  }
}
function separate(W, rng, a, b, y) {
  a.spouse = null; b.spouse = null;
  const wasMarried = a.union === 'married';
  a.union = b.union = null;
  a.exes.push(b.id); b.exes.push(a.id);
  const word = wasMarried ? 'Divorced' : 'Split up with';
  addEvent(W, a, y, 'divorced', `${word} @${b.id}.`);
  addEvent(W, b, y, 'divorced', `${word} @${a.id}.`);
  // who moves out
  let leaver;
  if (a.sex !== b.sex) leaver = rng.chance(0.7) ? (a.sex === 'm' ? a : b) : (a.sex === 'm' ? b : a);
  else leaver = rng.chance(0.5) ? a : b;
  const h = newHousehold(W, rng, [leaver], y);
  // children mostly stay with the mother
  setRel(W, a.id, b.id, 'ex', rng.int(-45, 15), y, wasMarried ? 'divorced' : 'split up');
  return h;
}

// ---------- relationships (non-family) ----------
function relKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }
function setRel(W, a, b, type, score, since, reason, extra) {
  if (a === b) return null;
  const k = relKey(a, b);
  const r = W.rels[k] || { a: Math.min(a, b), b: Math.max(a, b), history: [] };
  r.type = type; r.score = Math.round(clamp(score, -100, 100)); r.since = since; r.reason = reason;
  if (extra) Object.assign(r, extra);
  W.rels[k] = r;
  return r;
}
function getRel(W, a, b) { return W.rels[relKey(a, b)] || null; }

// ---------- death ----------
function killPerson(W, rng, p, y, cause, why, kind) {
  p.died = y; p.deathKind = kind || null; if (W._s != null) p.diedSeason = W._s; p.cause = cause; p.status = 'dead';
  addEvent(W, p, y, 'died', `Died at ${ageOf(p, y)}: ${cause}.`, why ? { why } : null);
  const closeness = { spouse: 1, child: 1, parent: 0.85, sibling: 0.5, grandchild: 0.35, grandparent: 0.4 };
  const notify = (q, kind, text) => {
    if (!q || !isAlive(q) || q.status === 'leftBehind') return;
    addEvent(W, q, y, 'loss', text);
    let w = closeness[kind];
    if (kind === 'parent' && ageOf(q, y) < 16) w = 1;
    addMemory(q, y, 'loss', p.id, w, `${kind === 'parent' ? 'parent' : kind} died (${cause})`);
  };
  if (p.spouse) {
    const s = W.people[p.spouse];
    notify(s, 'spouse', `Widowed: ${rel3(p, 'husband', 'wife', 'partner')} @${p.id} died (${cause}).`);
    if (s) { s.spouse = null; s.union = null; s.widowedOf = (s.widowedOf || []).concat(p.id); }
    p.spouse = null;
  }
  for (const cid of p.children) { const c = W.people[cid]; notify(c, 'parent', `Lost ${hisHer(c || p)} ${rel3(p, 'father', 'mother', 'parent')}, @${p.id} (${cause}).`); }
  for (const pid of [p.father, p.mother]) { const par = W.people[pid]; notify(par, 'child', `${cap(rel3(p, 'son', 'daughter', 'child'))} @${p.id} died at ${ageOf(p, y)} (${cause}).`); }
  for (const sid of siblingsOf(W, p)) { const s = W.people[sid]; if (s && ageOf(s, y) >= 3) notify(s, 'sibling', `${cap(rel3(p, 'brother', 'sister', 'sibling'))} @${p.id} died (${cause}).`); }
  if (W._sim && typeof afterDeath === 'function') afterDeath(W, rng, p, y, cause, kind || 'illness');
  leaveHousehold(W, p);
}

// ---------- orphans and moving ----------
function rehomeChild(W, rng, c, y) {
  // closest living resident relative: grandparent, adult sibling, aunt/uncle; else a neighbour
  const cand = [];
  for (const pid of [c.father, c.mother]) {
    const par = W.people[pid]; if (!par) continue;
    for (const gid of [par.father, par.mother]) { const g = W.people[gid]; if (g && isAlive(g) && isResident(g) && ageOf(g, y) < 75) cand.push([g, 'grandparent']); }
    for (const sid of siblingsOf(W, par)) { const s = W.people[sid]; if (s && isAlive(s) && isResident(s) && ageOf(s, y) >= 20) cand.push([s, rel3(s, 'uncle', 'aunt', 'relative')]); }
  }
  for (const sid of siblingsOf(W, c)) { const s = W.people[sid]; if (s && isAlive(s) && isResident(s) && ageOf(s, y) >= 18 && s.household !== c.household) cand.push([s, rel3(s, 'older brother', 'older sister', 'older sibling')]); }
  let target, label;
  if (cand.length) { [target, label] = rng.pick(cand); }
  else {
    const hh = Object.values(W.households).filter(h => h.dissolved == null && h.members.length >= 2 && h.id !== c.household && h.head && W.people[h.head] && isAlive(W.people[h.head]) && W.people[h.head].status === 'resident' && ageOf(W.people[h.head], y) >= 20);
    if (!hh.length) return;
    const h = rng.pick(hh); target = W.people[h.head]; label = 'neighbour';
  }
  if (!target || !target.household) return;
  moveToHousehold(W, c, W.households[target.household]);
  c.guardian = target.id;
  addEvent(W, c, y, 'moved', `Taken in by ${label} @${target.id}.`, { why: 'No parent was left at home to care for them.' });
  addEvent(W, target, y, 'took_in', `Took in @${c.id}, who had no parent left at home.`);
}

// ---------- immigrants and founders ----------
function makeImmigrantUnit(W, rng, y, kind, minAge, maxAge) {
  const era = eraOf(W);
  const maleShare = era.immigrantMale || 0.5;
  const culture = rng.weighted(era.cultures);
  const made = [];
  if (kind === 'single') {
    const sex = rng.chance(maleShare) ? 'm' : 'f';
    const a = rng.int(minAge, maxAge);
    const p = makePerson(W, rng, { born: y - a, sex, culture, arrived: y });
    newHousehold(W, rng, [p], y);
    made.push(p);
  } else {
    const ha = rng.int(Math.max(minAge, 19), maxAge);
    const husband = makePerson(W, rng, { born: y - ha, sex: 'm', culture, arrived: y });
    const wa = clamp(Math.round(ha - W.settings.husbandOlder + rng.normal(0, 3)), 16, 80);
    const wife = makePerson(W, rng, { born: y - wa, sex: 'f', culture: rng.chance(0.85) ? culture : rng.weighted(era.cultures), arrived: y });
    if (rng.chance(W.settings.wifeTakesName)) wife.last = husband.last;
    husband.spouse = wife.id; wife.spouse = husband.id; husband.union = wife.union = 'married';
    const h = newHousehold(W, rng, [husband, wife], y);
    made.push(husband, wife);
    // children born before arrival, by the mother's fertile years
    const marriedAt = Math.max(W.settings.marriageAgeWomen, rng.int(17, 26));
    let kids = 0; const maxKids = W.settings.familySizeLimit ? (wife.desiredKids ?? 2) : 9;
    for (let ma = marriedAt; ma <= Math.min(wa, 44) && kids < maxKids; ma++) {
      const cy = y - (wa - ma);
      if (ha - (y - cy) < 17) continue; // the father must have been grown
      if (rng.chance((W.settings.familySizeLimit ? 0.3 : W.settings.fertility * 0.75) * fertilityFactor(ma))) {
        const c = makePerson(W, rng, { born: cy, father: husband.id, mother: wife.id, arrived: y });
        husband.children.push(c.id); wife.children.push(c.id);
        if (y - cy < 18 || rng.chance(0.15)) { moveToHousehold(W, c, h); made.push(c); }
        else { c.status = 'departed'; c.events.push({ y: cy, t: 'born', text: `Born to @${husband.id} and @${wife.id} before the family came to ${W.name}.` }); c.departedNote = 'stayed behind when the family moved'; }
        kids++; ma += 1;
      }
    }
    recomputeHead(W, h);
  }
  for (const p of made) {
    if (p.status !== 'resident') continue;
    if (!p.events.some(e => e.t === 'born')) p.events.push({ y: p.born, t: 'born', text: p.father ? `Born to @${p.father} and @${p.mother}.` : `Born elsewhere, before coming to ${W.name}.` });
    addEvent(W, p, y, 'arrived', `Came to ${W.name}${p.father ? ' with the family' : ''}.`, { why: rng.pick(['looking for land and work', 'to make a fresh start', 'following relatives who came before', 'after hard times where they lived before', 'drawn by talk of opportunity']) });
  }
  return made;
}

// ---------- back-history simulation ----------
function residentsAlive(W) { return Object.values(W.people).filter(p => p.status === 'resident' && p.died == null); }

function simulateBackHistory(W, rng, target, years) {
  const S = W.settings;
  const y0 = W.startYear - years;
  W._y = y0;
  // founders: families and single adults already living there
  let pop = 0; const startPop = Math.round(target * 0.42);
  while (pop < startPop) pop += makeImmigrantUnit(W, rng, y0, rng.chance(0.72) ? 'family' : 'single', 16, 60).length;
  for (const p of residentsAlive(W)) { p.events = p.events.filter(e => e.t !== 'arrived'); p.arrived = null; p.founder = true; }

  for (let y = y0 + 1; y < W.startYear; y++) {
    W._y = y;
    stepYear(W, rng, y, target * (0.42 + 0.58 * (y - y0) / years), true);
  }
  W._y = W.startYear;
}

function stepYear(W, rng, y, popTarget, backHistory) {
  const S = W.settings;
  const st = { births: 0, deaths: 0, marriages: 0, divorces: 0, arrivals: 0, departures: 0, infantDeaths: 0 };
  let live = residentsAlive(W);
  // deaths
  for (const p of live) {
    if (rng.chance(deathChance(W, p, y))) { killPerson(W, rng, p, y, deathCause(W, rng, p, y)); st.deaths++; if (ageOf(p, y) <= 1) st.infantDeaths++; }
  }
  live = live.filter(isAlive);
  // separations
  if (S.divorce > 0) {
    for (const p of live) {
      if (!p.spouse || p.id > p.spouse) continue;
      const s = W.people[p.spouse];
      const mod = (1 + (p.traits.N + s.traits.N - 100) / 120) * (1 + (100 - p.traits.A - s.traits.A + 50) / 200) * (p.union === 'partners' ? 1.6 : 1);
      if (rng.chance(S.divorce * mod)) { separate(W, rng, p, s, y); st.divorces++; }
    }
  }
  // partners who decide to marry
  for (const p of live) if (p.spouse && p.union === 'partners' && p.id < p.spouse && rng.chance(0.07)) {
    const s = W.people[p.spouse]; p.union = s.union = 'married';
    addEvent(W, p, y, 'married', `Married long-time partner @${s.id}.`); addEvent(W, s, y, 'married', `Married long-time partner @${p.id}.`);
  }
  // marriages
  const singles = live.filter(p => !p.spouse && marryFactor(W, p, y) > 0);
  const bySex = { m: singles.filter(p => p.sex === 'm'), f: singles.filter(p => p.sex === 'f') };
  const taken = new Set();
  for (const p of rng.shuffle(singles.slice())) {
    if (taken.has(p.id) || p.spouse) continue;
    if (!rng.chance(S.marriageChance * marryFactor(W, p, y))) continue;
    const same = wantsSameSex(W, rng, p);
    const wantSex = same ? p.sex : (p.sex === 'm' ? 'f' : 'm');
    const pa = ageOf(p, y);
    const ideal = same ? pa : (p.sex === 'm' ? pa - S.husbandOlder : pa + S.husbandOlder);
    const pool = bySex[wantSex].filter(q => !taken.has(q.id) && !q.spouse && q.id !== p.id && Math.abs(ageOf(q, y) - ideal) <= 9 &&
      (same ? (q.orientation !== 'straight') : (q.orientation !== 'gay' || !S.sameSexCouples)));
    let partner = null;
    const tries = rng.sample(pool, 25);
    let best = -1e9;
    for (const q of tries) {
      if (closelyRelated(W, p, q)) continue;
      const sc = -Math.abs(ageOf(q, y) - ideal) + rng.range(0, 6) + marryFactor(W, q, y) * 3 + (q.household && W.households[q.household] && p.household && W.households[q.household].district === W.households[p.household].district ? 1.5 : 0);
      if (sc > best) { best = sc; partner = q; }
    }
    if (!partner && rng.chance(0.3)) {
      // marries someone from outside who comes to live here
      const sex = wantSex;
      const born = y - clamp(Math.round(ideal + rng.normal(0, 3)), sex === 'f' ? S.marriageAgeWomen : S.marriageAgeMen, 85);
      partner = makePerson(W, rng, { born, sex, arrived: y });
      if (same) partner.orientation = 'gay';
      partner.events.push({ y: born, t: 'born', text: `Born outside ${W.name}.` });
      addEvent(W, partner, y, 'arrived', `Came to ${W.name} to marry @${p.id}.`);
      newHousehold(W, rng, [partner], y);
      st.arrivals++;
    }
    if (partner) { unite(W, rng, p, partner, y); taken.add(p.id); taken.add(partner.id); st.marriages++; }
  }
  // births
  for (const w of live) {
    if (w.sex !== 'f' || !isAlive(w)) continue;
    const a = ageOf(w, y); const ff = fertilityFactor(a); if (!ff) continue;
    const husband = w.spouse ? W.people[w.spouse] : null;
    let p;
    if (husband && husband.sex === 'm') {
      p = S.fertility * ff;
      const livingKids = w.children.filter(c => isAlive(W.people[c])).length;
      if (S.familySizeLimit) { const want = Math.round(((w.desiredKids ?? 2) + (husband.desiredKids ?? 2)) / 2); if (livingKids >= want) p *= 0.04; }
    } else if (!w.spouse) {
      p = S.birthsOutsideMarriage * ff * (w.celibate ? 0 : 1);
    } else p = 0;
    const last = w.children.length ? Math.max(...w.children.map(c => W.people[c].born)) : -9999;
    if (y - last <= 0) p = 0; else if (y - last === 1) p *= 0.25; else if (y - last === 2) p *= 0.8;
    if (!rng.chance(p)) continue;
    const twins = rng.chance(0.012) ? 2 : 1;
    let father = husband && husband.sex === 'm' ? husband : null;
    let secret = null;
    if (!father) {
      // father outside marriage: sometimes known, sometimes a secret
      const men = live.filter(m => m.sex === 'm' && isAlive(m) && ageOf(m, y) >= 17 && ageOf(m, y) <= 60 && !closelyRelated(W, m, w));
      if (men.length && rng.chance(0.6)) { const m = rng.pick(men); if (m.spouse) secret = m; else father = m; }
    }
    for (let t = 0; t < twins; t++) {
      const c = makePerson(W, rng, { born: y, father: father ? father.id : null, mother: w.id, culture: father ? father.culture : w.culture });
      if (secret) { c.secretFather = secret.id; secret.secretChildren = (secret.secretChildren || []).concat(c.id); }
      w.children.push(c.id); if (father) father.children.push(c.id);
      moveToHousehold(W, c, W.households[w.household]);
      const parentsTxt = father ? `@${w.id} and @${father.id}` : `@${w.id}`;
      c.events.push({ y, t: 'born', text: `Born to ${parentsTxt}${twins === 2 ? ' — a twin' : ''}.` });
      addEvent(W, w, y, 'child_born', `Gave birth to ${rel3(c, 'a son', 'a daughter', 'a child')}, @${c.id}${twins === 2 ? ' (twins)' : ''}.`);
      if (father) addEvent(W, father, y, 'child_born', `Became a father: ${rel3(c, 'a son', 'a daughter', 'a child')}, @${c.id}.`);
      if (secret) addEvent(W, secret, y, 'secret', `Secretly fathered @${c.id} with @${w.id}.`, { secret: true });
      for (const sid of siblingsOf(W, c)) { const s = W.people[sid]; if (s && isAlive(s) && isResident(s) && s.household === c.household) addEvent(W, s, y, 'sibling_born', `${cap(rel3(c, 'a brother', 'a sister', 'a sibling'))}, @${c.id}, was born.`); }
      for (const par of [w, father]) if (par) for (const gid of [par.father, par.mother]) { const g = W.people[gid]; if (g && isAlive(g) && isResident(g)) addEvent(W, g, y, 'grandchild', `Grandchild @${c.id} born to @${par.id}.`); }
      st.births++;
      if (rng.chance(S.infantDeath * (1.45 - c.health / 110))) { killPerson(W, rng, c, y, rng.pick(eraOf(W).infantCauses)); st.deaths++; st.infantDeaths++; }
    }
    if (rng.chance(S.childbirthDeath * twins)) { killPerson(W, rng, w, y, 'complications in childbirth'); st.deaths++; }
  }
  live = residentsAlive(W);
  // young adults leaving home (modern habit), elderly moving in with children
  for (const p of live) {
    const a = ageOf(p, y); const h = W.households[p.household];
    if (!h) continue;
    if (!p.spouse && h.members.length > 1 && h.head !== p.id) {
      const leaveP = S.familySizeLimit ? (a >= 19 && a <= 30 ? 0.18 : 0) : (p.sex === 'm' && a >= 24 ? 0.04 : 0);
      if (leaveP && rng.chance(leaveP)) { newHousehold(W, rng, [p], y); addEvent(W, p, y, 'moved', `Moved out to a place of ${hisHer(p)} own.`); }
    }
    if (a >= 72 && !p.spouse && h.members.length === 1 && rng.chance(0.25)) {
      const kids = p.children.map(c => W.people[c]).filter(c => c && isAlive(c) && isResident(c) && ageOf(c, y) >= 20 && c.household !== p.household);
      if (kids.length) { const k = rng.pick(kids); moveToHousehold(W, p, W.households[k.household]); addEvent(W, p, y, 'moved', `Moved in with ${rel3(k, 'son', 'daughter', 'child')} @${k.id}.`, { why: 'Getting older and living alone.' }); addEvent(W, k, y, 'took_in', `${cap(rel3(p, 'father', 'mother', 'parent'))} @${p.id} moved in.`); }
    }
  }
  // arrivals / departures to follow the town's rough growth
  if (popTarget) {
    live = residentsAlive(W);
    let n = live.length;
    while (n < popTarget - 1) { const u = makeImmigrantUnit(W, rng, y, rng.chance(0.5) ? 'family' : 'single', 16, 45); n += u.length; st.arrivals += u.length; }
    if (n > popTarget * 1.03) {
      const leavers = rng.shuffle(live.filter(p => isAlive(p) && !p.spouse && ageOf(p, y) >= 16 && ageOf(p, y) <= 32 && !p.children.length));
      while (n > popTarget * 1.01 && leavers.length) { departPerson(W, leavers.pop(), y, rng); n--; st.departures++; }
    }
  }
  // children left with no parent at home
  for (const c of residentsAlive(W)) {
    if (ageOf(c, y) >= 15) continue;
    const h = W.households[c.household];
    const adultHere = h && h.members.some(id => { const q = W.people[id]; return q && isAlive(q) && isResident(q) && ageOf(q, y) >= 16; });
    if (!adultHere) rehomeChild(W, rng, c, y);
  }
  st.population = residentsAlive(W).length;
  W.yearStats[y] = st;
  return st;
}
function departPerson(W, p, y, rng) {
  p.status = 'departed'; p.departed = y;
  const where = rng.pick(['to seek a living elsewhere', 'for the city', 'to find work in another town', 'to try their luck further off', 'after a falling-out at home']);
  addEvent(W, p, y, 'left', `Left ${W.name} ${where}.`);
  for (const pid of [p.father, p.mother]) { const par = W.people[pid]; if (par && isAlive(par) && isResident(par)) addEvent(W, par, y, 'child_left', `${cap(rel3(p, 'son', 'daughter', 'child'))} @${p.id} left ${W.name}.`); }
  leaveHousehold(W, p);
}

// ---------- jobs ----------
function occupationsFor(W) { const era = eraOf(W); return era.occupations; }
function assignJobs(W, rng, y, opts) {
  opts = opts || {};
  const era = opts.era || eraOf(W);
  const S = opts.settings || W.settings;
  const occs = opts.occs || era.occupations;
  const people = residentsAlive(W).sort((a, b) => a.born - b.born);
  const N = people.length;
  const modernish = !!S.familySizeLimit;
  const byId = Object.fromEntries(occs.map(o => [o.id, o]));
  const holders = {};
  const apprenticeCandidates = [];
  const setOcc = (p, o) => { p.occId = o.id; p.occupation = o.name; slots[o.id]--; (holders[o.id] = holders[o.id] || []).push(p); };
  const workers = [];
  // literacy and education
  for (const p of people) {
    const a = ageOf(p, y);
    if (modernish) p.literate = a >= 7 || (a >= 5 && rng.chance(0.5));
    else p.literate = a >= 8 && rng.chance(S.literacy);
  }
  for (const p of people) {
    p.occupation = null; p.occId = null; p.workplace = null;
    const a = ageOf(p, y);
    if (a < 5) { p.occupation = era.youngChild; continue; }
    const schoolEnd = modernish ? 18 : 14;
    if (a < schoolEnd) {
      if (rng.chance(S.schooling)) p.occupation = modernish ? (a < 14 ? 'Student (grade school)' : 'Student (high school)') : `Pupil at ${era.schoolName}`;
      else p.occupation = era.childWork;
      if (!modernish && a >= 12 && rng.chance(0.3)) apprenticeCandidates.push(p);
      continue;
    }
    if (modernish && a <= 22 && rng.chance(a <= 20 ? 0.35 : 0.2)) { p.occupation = 'College student'; continue; }
    if (a >= S.retireAge) {
      const retireP = modernish ? clamp(0.55 + (a - S.retireAge) * 0.08, 0, 1) : clamp((a - S.retireAge) / 8 + (p.health < 45 ? 0.5 : 0), 0, 1);
      if (rng.chance(retireP)) { p.occupation = era.retired; continue; }
    }
    if (modernish) {
      if (rng.chance(era.disabledRate || 0.03)) { p.occupation = 'Unable to work (disability)'; continue; }
      const hasBaby = p.children.some(c => { const k = W.people[c]; return k && isAlive(k) && ageOf(k, y) < 5; });
      if (hasBaby && p.spouse && rng.chance(p.sex === 'f' ? 0.22 : 0.03)) { p.occupation = era.homemaker; continue; }
      if (rng.chance(era.unemployment || 0.04)) { p.occupation = 'Unemployed (looking for work)'; continue; }
    } else {
      const homeP = S.genderRoles === 'strict' ? 0.55 : S.genderRoles === 'mixed' ? 0.3 : 0.05;
      if (p.sex === 'f' && p.spouse && rng.chance(homeP)) { p.occupation = era.homemaker; continue; }
    }
    if (a < 18 && !modernish && rng.chance(0.3)) apprenticeCandidates.push(p);
    workers.push(p);
  }
  const slots = {};
  // job slots are shared out in proportion to each job's weight, scaled to the expected number of workers
  const expectWorkers = workers.length;
  const sumN = occs.reduce((s, o) => s + (o.apprentice ? 0 : o.n), 0) || 1;
  for (const o of occs) {
    if (o.apprentice) { slots[o.id] = 0; continue; }
    let exp = o.n / sumN * expectWorkers;
    if (o.unique) exp = N >= 60 ? 1 : (rng.chance(N / 60) ? 1 : 0);
    slots[o.id] = Math.floor(exp) + (rng.chance(exp - Math.floor(exp)) ? 1 : 0);
  }
  for (const p of workers) {
    const a = ageOf(p, y);
    // choose a job
    const parents = [W.people[p.father], W.people[p.mother]].filter(Boolean);
    const cands = [];
    for (const o of occs) {
      if (o.apprentice || slots[o.id] <= 0) continue;
      if (a < o.min || (o.max && a > o.max)) continue;
      if (o.celibate && (p.spouse || p.children.length)) continue;
      if (o.spouseOf) continue;
      if (o.lit && !p.literate && !modernish) continue;
      let w = slots[o.id];
      if (o.sex !== 'any' && o.sex !== p.sex) {
        if (S.genderRoles === 'strict') continue;
        if (S.genderRoles === 'mixed') w *= 0.15;
      }
      w *= 0.4 + p.aptitude[o.skill] / 80;
      if (parents.some(q => q.occId === o.id)) w *= 1 + o.inherit * 25;
      if (o.cls === 'high') w *= parents.some(q => q.occId && byId[q.occId] && byId[q.occId].cls === 'high') ? 10 : 0.4;
      cands.push([o, w]);
    }
    let chosen = cands.length ? rng.weighted(cands) : null;
    if (!chosen) {
      const fill = occs.filter(o => o.filler && (o.sex === 'any' || o.sex === p.sex || S.genderRoles !== 'strict') && a >= o.min);
      chosen = fill.length ? rng.pick(fill) : null;
    }
    if (chosen) setOcc(p, chosen);
    else p.occupation = modernish ? 'Unemployed (looking for work)' : 'Odd jobs';
  }
  // unique positions nobody happened to take (e.g. the lord): give them to the best-placed adult
  for (const o of occs) {
    if (!o.unique || o.spouseOf || (holders[o.id] || []).length || N < 60) continue;
    const pool = people.filter(p => { const a = ageOf(p, y); return a >= Math.max(o.min, 25) && a <= 70 && (o.sex === 'any' || o.sex === p.sex || S.genderRoles === 'equal') && !(o.celibate && (p.spouse || p.children.length)) && !holders['__taken' + p.id]; });
    if (!pool.length) continue;
    const pick = pool.sort((a, b) => (b.aptitude[o.skill] + (b.spouse ? 10 : 0) + b.children.length * 3) - (a.aptitude[o.skill] + (a.spouse ? 10 : 0) + a.children.length * 3))[0];
    if (pick.occId && slots[pick.occId] != null) slots[pick.occId]++;
    if (pick.occId && holders[pick.occId]) holders[pick.occId] = holders[pick.occId].filter(x => x !== pick);
    pick.literate = true; setOcc(pick, o);
  }
  // spouse-linked titles (e.g. Lady of the manor)
  for (const o of occs) if (o.spouseOf) for (const h of (holders[o.spouseOf] || [])) {
    const s = W.people[h.spouse];
    if (s && isAlive(s) && isResident(s)) { s.occId = o.id; s.occupation = o.name; (holders[o.id] = holders[o.id] || []).push(s); }
  }
  // workplaces
  const wpByKey = {};
  const makeWp = (key, name, kind, owner) => {
    if (wpByKey[key]) return wpByKey[key];
    const id = W.next.w++;
    const wp = { id, name: /^the /.test(name) ? name : cap(name), kind, owner: owner ? owner.id : null, members: [], occ: [] };
    W.workplaces[id] = wp; wpByKey[key] = wp; return wp;
  };
  const join = (p, wp) => { if (p.workplace && W.workplaces[p.workplace]) { const old = W.workplaces[p.workplace]; old.members = old.members.filter(x => x !== p.id); } p.workplace = wp.id; wp.members.push(p.id); if (!wp.occ.includes(p.occupation)) wp.occ.push(p.occupation); };
  for (const p of people) {
    const o = byId[p.occId]; if (!o) continue;
    if (o.wp === 'household') { const h = W.households[p.household]; join(p, makeWp(`h${p.household}-${o.id}`, `the ${h ? h.name.replace(/^the /, '').replace(' household', '') : p.last} ${o.place}`, 'family', h ? W.people[h.head] : p)); }
    else if (o.wp === 'own') { const sp = p.spouse && W.people[p.spouse]; const key = (sp && sp.occId === o.id) ? `own-${Math.min(p.id, sp.id)}-${o.id}` : `own-${p.id}-${o.id}`; join(p, makeWp(key, `${p.last}'s ${o.place}`, 'business', p)); }
    else if (o.wp === 'shared') join(p, makeWp(`shared-${o.place}`, o.place, 'shared', null));
  }
  for (const p of people) {
    const o = byId[p.occId]; if (!o || o.wp !== 'employer') continue;
    const bosses = (holders[o.boss] || []).filter(b => b.workplace);
    if (bosses.length) join(p, W.workplaces[rng.pick(bosses).workplace]);
  }
  // apprentices go to craft masters
  const masters = people.filter(p => { const o = byId[p.occId]; return o && o.skill === 'craft' && o.wp === 'own' && ageOf(p, y) >= 25 && p.workplace; });
  for (const p of apprenticeCandidates) {
    if (!masters.length || (p.occId && byId[p.occId] && !byId[p.occId].filler && p.occupation !== era.childWork && !String(p.occupation).startsWith('Pupil'))) continue;
    const free = masters.filter(m => (m._appr || 0) < 2); if (!free.length) continue;
    const m = rng.pick(free); m._appr = (m._appr || 0) + 1;
    if (p.occId) { slots[p.occId]++; }
    p.occId = 'apprentice'; p.occupation = `Apprentice ${byId[m.occId].name.toLowerCase()}`; p.masterId = m.id;
    join(p, W.workplaces[m.workplace]);
    setRel(W, m.id, p.id, 'mentor', rng.int(20, 70), y - rng.int(0, 3), `took ${himHer(p)} on as an apprentice`, { from: m.id });
  }
  for (const m of masters) delete m._appr;
}

// ---------- traits that depend on the town being complete ----------
function assignLateTraits(W, rng, y) {
  const era = eraOf(W);
  const S = W.settings;
  const live = residentsAlive(W);
  const modernish = !!S.familySizeLimit;
  for (const p of live) {
    const a = ageOf(p, y);
    // conditions, more common with age
    p.conditions = [];
    for (const [c, prev] of era.conditions) if (rng.chance(prev * (a < 18 ? 0.3 : a < 40 ? 0.8 : 1.5))) p.conditions.push(c);
    // education
    if (W.era === 'modern' || W.era === 'dropped') {
      if (a < 18) p.education = 'In school';
      else {
        const o = (era.occupations || ERAS.modern.occupations).find(x => x.id === p.occId);
        const hi = o && o.cls === 'high', mid = o && o.cls === 'mid';
        p.education = rng.weighted(hi ? [['Graduate degree', 0.45], ["Bachelor's degree", 0.5], ['Some college', 0.05]] : mid ? [["Bachelor's degree", 0.4], ['Associate degree', 0.2], ['Some college', 0.2], ['High school', 0.2]] : [['High school', 0.5], ['Some college', 0.2], ['Some high school', 0.12], ['Associate degree', 0.1], ["Bachelor's degree", 0.08]]);
      }
    } else if (W.era === 'scifi') {
      p.education = a < 18 ? 'In the learning center' : rng.weighted([['Colony certification', 0.45], ['Technical degree', 0.35], ['University degree', 0.2]]);
    } else p.education = p.literate ? 'Can read and write' : 'Cannot read or write';
    // hopes that fit their life now
    const unfit = g => (p.spouse && /settle down|marry|find someone/i.test(g)) || (a >= 55 && /degree|promot|get out of this town|knighted|apprentice|squire|college|first crop/i.test(g)) || (a < 14 && /mortgage|retire|business|council|reeve|sheriff|promot/i.test(g)) || (!p.children.length && a >= 50 && /children|kids|son who/i.test(g));
    if (unfit(p.goal)) { const ok = era.goals.filter(g => !unfit(g)); if (ok.length) p.goal = rng.pick(ok); }
  }
  // hermits / loners
  const onlyCarer = p => { const h = W.households[p.household]; if (!h) return false; const others = h.members.map(id => W.people[id]).filter(q => q.id !== p.id && isAlive(q)); return others.some(q => ageOf(q, y) < 16) && !others.some(q => ageOf(q, y) >= 16); };
  const adults = live.filter(p => ageOf(p, y) >= 25 && !p.spouse && !onlyCarer(p) && !p.children.some(c => { const k = W.people[c]; return k && isAlive(k) && ageOf(k, y) < 18; }));
  const nH = Math.round(S.hermits * live.filter(p => ageOf(p, y) >= 18).length);
  const picks = [];
  const pool = adults.slice();
  for (let i = 0; i < nH && pool.length; i++) {
    const p = rng.weighted(pool.map(q => [q, Math.pow(100 - q.traits.E, 2) + 1]));
    picks.push(p); pool.splice(pool.indexOf(p), 1);
  }
  for (const p of picks) {
    p.hermit = true; p.hermitReason = rng.pick(era.hermitReasons);
    const since = clamp(y - rng.int(1, Math.max(1, ageOf(p, y) - 20)), p.born + 18, y);
    addEvent(W, p, since, 'withdrew', `Withdrew from ${eraOf(W).townWord} life and went to live alone.`, { why: cap(p.hermitReason) + '.' });
    const h = W.households[p.household];
    if (h && h.members.length > 1) newHousehold(W, rng, [p], since, era.outskirts);
    else if (h) h.district = era.outskirts;
    p.traits.E = Math.min(p.traits.E, 25);
  }
  // venues (places people regularly go)
  for (const p of live) {
    const a = ageOf(p, y);
    p.venues = [];
    for (const v of era.venues) {
      const who = v.who;
      if (who === 'kids' && a >= 18) continue;
      if (who === 'adults' && a < 16) continue;
      if (who === 'men' && (p.sex !== 'm' || a < 16)) continue;
      if (who === 'women' && (p.sex !== 'f' || a < 14)) continue;
      let pr = v.p;
      if (v.kind === 'school') pr = p.occupation && /student|pupil|learning|school/i.test(p.occupation) ? 1 : 0;
      if (v.kind === 'worship') {
        if (v.faith) pr = p.faith && p.faith.includes(v.faith) ? 0.85 : 0;
        else if (/no religion|not religious|no faith/i.test(p.faith || '')) pr = 0.05;
        else if (era.venues.some(x => x.faith && (p.faith || '').includes(x.faith))) pr = 0;
      }
      if (v.kind === 'tavern') pr *= 0.5 + p.traits.E / 100;
      if (p.hermit) pr *= 0.08;
      if (rng.chance(pr)) p.venues.push(v.id);
    }
  }
}

// ---------- wealth ----------
function assignWealth(W, rng) {
  const era = eraOf(W);
  const byId = Object.fromEntries((era.occupations || []).map(o => [o.id, o]));
  for (const h of Object.values(W.households)) {
    if (h.dissolved != null) continue;
    let best = 'low';
    for (const id of h.members) { const p = W.people[id]; const o = p && byId[p.occId]; if (o && o.cls === 'high') best = 'high'; else if (o && o.cls === 'mid' && best !== 'high') best = 'mid'; }
    const base = best === 'high' ? rng.normal(84, 7) : best === 'mid' ? rng.normal(55, 10) : rng.normal(26, 11);
    h.wealth = Math.round(clamp(base, 2, 99));
    if (h.district === era.outskirts) h.wealth = Math.min(h.wealth, 25);
  }
}

// ---------- social web ----------
function buildSocialWeb(W, rng, y) {
  const era = eraOf(W);
  const live = residentsAlive(W);
  const byDistrict = {}, byWp = {}, byVenue = {};
  for (const p of live) {
    const h = W.households[p.household]; const d = h ? h.district : '?';
    (byDistrict[d] = byDistrict[d] || []).push(p);
    if (p.workplace) (byWp[p.workplace] = byWp[p.workplace] || []).push(p);
    for (const v of p.venues) (byVenue[v] = byVenue[v] || []).push(p);
  }
  const friendCount = {};
  const cnt = id => friendCount[id] || 0;
  const venueName = id => (era.venues.find(v => v.id === id) || {}).name || id;
  const sinceFor = (a, b, ctx) => {
    const latestBorn = Math.max(a.born, b.born);
    const arrived = Math.max(a.arrived || 0, b.arrived || 0);
    const lo = Math.max(latestBorn + (ctx === 'childhood' ? 4 : 14), arrived);
    return clamp(rng.int(lo, y), lo > y ? y : lo, y);
  };
  for (const p of live) {
    const a = ageOf(p, y); if (a < 4) continue;
    const want = p.hermit ? (rng.chance(0.4) ? 1 : 0) : Math.round(1 + p.traits.E / 100 * 6 + rng.range(-1, 1));
    if (cnt(p.id) >= want) continue;
    const h = W.households[p.household];
    const pools = [];
    if (h && byDistrict[h.district]) pools.push(['district', byDistrict[h.district], 3]);
    if (p.workplace && byWp[p.workplace]) pools.push(['work', byWp[p.workplace], 3]);
    for (const v of p.venues) if (byVenue[v]) pools.push(['venue:' + v, byVenue[v], 1.2]);
    const scored = [];
    for (const [ctx, list, wgt] of pools) {
      for (const q of rng.sample(list, 30)) {
        if (q.id === p.id || q.household === p.household) continue;
        const qa = ageOf(q, y);
        const maxGap = a < 18 ? 3 : 14;
        if (Math.abs(qa - a) > maxGap) continue;
        if (q.hermit && rng.chance(0.85)) continue;
        if (getRel(W, p.id, q.id)) continue;
        let s = wgt + rng.range(0, 3);
        for (const k of ['O', 'A', 'E']) s -= Math.abs(p.traits[k] - q.traits[k]) / 90;
        if (p.hobbies.some(hb => q.hobbies.includes(hb))) s += 1.5;
        if (a < 14 && p.sex === q.sex) s += 1.2;
        scored.push([q, s, ctx]);
      }
    }
    scored.sort((x, z) => z[1] - x[1]);
    for (const [q, s, ctx] of scored) {
      if (cnt(p.id) >= want) break;
      if (cnt(q.id) >= 9) continue;
      const close = rng.chance(0.22 + (p.traits.A + q.traits.A - 100) / 400);
      let reason, since;
      const qh = W.households[q.household];
      const bothYoungHere = !p.arrived && !q.arrived && Math.abs(p.born - q.born) <= 3;
      if (ctx === 'district') { reason = bothYoungHere ? `grew up near each other in ${h.district}` : `neighbours in ${h.district}`; since = sinceFor(p, q, bothYoungHere ? 'childhood' : 'adult'); }
      else if (ctx === 'work') { reason = `work together at ${W.workplaces[p.workplace].name}`; since = sinceFor(p, q, 'adult'); }
      else { const vn = venueName(ctx.slice(6)); reason = /school|learning/.test(vn) ? `go to school together` : `met through ${vn}`; since = sinceFor(p, q, a < 16 ? 'childhood' : 'adult'); }
      if (p.hobbies.some(hb => q.hobbies.includes(hb))) reason += `; both love ${p.hobbies.find(hb => q.hobbies.includes(hb))}`;
      setRel(W, p.id, q.id, close ? 'close friend' : 'friend', close ? rng.int(62, 95) : rng.int(22, 60), since, reason);
      friendCount[p.id] = cnt(p.id) + 1; friendCount[q.id] = cnt(q.id) + 1;
    }
  }
  // rivals and enemies
  const rivalReasons = ['an old insult that was never forgiven', 'jealousy over a sweetheart', 'competing for the same work', 'a debt that was never repaid', 'a childhood fight that never healed', 'gossip one spread about the other', 'a broken promise', 'an accusation of cheating', 'a drunken brawl', 'a humiliation in front of others', 'envy of the other\'s success', 'a borrowed thing that came back broken'];
  const nR = Math.round(live.length * 0.11);
  const adultsTeens = live.filter(p => ageOf(p, y) >= 10);
  for (let i = 0; i < nR; i++) {
    const p = rng.weighted(adultsTeens.map(q => [q, Math.pow((100 - q.traits.A) + q.traits.N, 1.5)]));
    if (!p) break;
    const h = W.households[p.household];
    const pool = [...(byDistrict[h ? h.district : ''] || []), ...(p.workplace ? byWp[p.workplace] || [] : [])].filter(q => q.id !== p.id && Math.abs(ageOf(q, y) - ageOf(p, y)) < 20 && ageOf(q, y) >= 10 && !getRel(W, p.id, q.id) && q.household !== p.household);
    if (!pool.length) continue;
    const q = rng.pick(pool);
    let reason = rng.pick(rivalReasons);
    if (p.workplace && p.workplace === q.workplace && rng.chance(0.5)) reason = `rivalry at ${W.workplaces[p.workplace].name}`;
    const score = -rng.int(18, 90);
    setRel(W, p.id, q.id, score <= -55 ? 'enemy' : 'rival', score, clamp(y - rng.int(0, 12), Math.max(p.born, q.born) + 10, y), reason);
  }
  // strained family ties
  const famReasons = ['an argument over the inheritance', 'disapproval of a marriage', 'years of quiet resentment', 'a falling-out nobody talks about', 'old favouritism between siblings', 'harsh words said at a funeral', 'money lent and never repaid', 'a betrayal of trust'];
  const nF = Math.round(live.length * 0.035);
  for (let i = 0; i < nF; i++) {
    const p = rng.pick(live); if (ageOf(p, y) < 16) continue;
    const kin = [...siblingsOf(W, p), p.father, p.mother, ...p.children].map(id => W.people[id]).filter(q => q && isAlive(q) && isResident(q) && ageOf(q, y) >= 16 && !getRel(W, p.id, q.id));
    if (!kin.length) continue;
    const q = rng.pick(kin); const score = -rng.int(15, 85);
    setRel(W, p.id, q.id, score <= -55 ? 'estranged' : 'strained', score, clamp(y - rng.int(0, 15), Math.max(p.born, q.born) + 16, y), rng.pick(famReasons));
  }
  // crushes and courting couples
  const singles = live.filter(p => !p.spouse && ageOf(p, y) >= 13 && ageOf(p, y) <= 45 && !p.celibate && !p.hermit);
  for (const p of singles) {
    if (!rng.chance(0.13)) continue;
    const same = wantsSameSex(W, rng, p);
    const wantSex = same ? p.sex : (p.sex === 'm' ? 'f' : 'm');
    const a = ageOf(p, y);
    const pool = singles.filter(q => q.sex === wantSex && q.id !== p.id && Math.abs(ageOf(q, y) - a) <= (a < 18 ? 2 : 8) && !getRel(W, p.id, q.id) && !closelyRelated(W, p, q));
    if (!pool.length) continue;
    const q = rng.pick(pool);
    if (rng.chance(0.3) && a >= 15) setRel(W, p.id, q.id, 'courting', rng.int(45, 85), clamp(y - rng.int(0, 2), y - 2, y), 'have been walking out together');
    else setRel(W, p.id, q.id, 'crush', rng.int(30, 80), clamp(y - rng.int(0, 2), y - 2, y), `${p.first} is sweet on ${q.first}, who ${rng.chance(0.5) ? 'has no idea' : 'may suspect'}`, { from: p.id });
  }
}

// ---------- groups and feuds ----------
function buildGroups(W, rng, y) {
  const era = eraOf(W);
  const live = residentsAlive(W).filter(p => ageOf(p, y) >= 10 && !p.hermit);
  const nG = W.era === 'dropped' ? 0 : Math.max(2, Math.round(live.length / 30));
  const used = new Set();
  for (let i = 0; i < nG; i++) {
    const seed = rng.pick(live); if (!seed) break;
    const h = W.households[seed.household];
    let name = rng.pick(era.groupNames).replace('{district}', h ? h.district.replace(/^the /, '') : 'town');
    name = cap(name);
    if (used.has(name)) continue;
    used.add(name);
    const a = ageOf(seed, y);
    const pool = live.filter(q => q.id !== seed.id && Math.abs(ageOf(q, y) - a) <= (a < 18 ? 3 : 15) && (W.households[q.household]?.district === h?.district || q.workplace === seed.workplace || q.hobbies.some(x => seed.hobbies.includes(x)) || q.venues.some(v => seed.venues.includes(v))));
    const friends = Object.values(W.rels).filter(r => (r.a === seed.id || r.b === seed.id) && /friend/.test(r.type)).map(r => W.people[r.a === seed.id ? r.b : r.a]).filter(q => q && isAlive(q) && isResident(q));
    const members = [seed, ...friends.slice(0, 3)];
    for (const q of rng.shuffle(pool)) { if (members.length >= rng.int(4, 9)) break; if (!members.includes(q)) members.push(q); }
    if (members.length < 3) continue;
    const id = W.next.g++;
    const since = clamp(y - rng.int(0, 15), Math.max(...members.map(m => m.born + 10)), y);
    W.groups[id] = { id, name, type: 'friends', members: members.map(m => m.id), since, founder: seed.id, mood: rng.int(40, 90) };
    for (let x = 0; x < members.length; x++) for (let z = x + 1; z < members.length; z++) {
      const r = getRel(W, members[x].id, members[z].id);
      if (!r) { if (rng.chance(0.55)) setRel(W, members[x].id, members[z].id, 'friend', rng.int(20, 55), since, `both part of ${name.toLowerCase()}`); }
    }
  }
  // language groups for the empty-world scenario
  if (W.era === 'dropped') {
    const byLang = {};
    for (const p of residentsAlive(W)) for (const l of p.languages) (byLang[l] = byLang[l] || []).push(p.id);
    for (const [l, ids] of Object.entries(byLang)) if (ids.length >= 3) {
      const id = W.next.g++;
      W.groups[id] = { id, name: `${l} speakers`, type: 'language', members: ids, since: y, mood: 60 };
    }
  }
}
function buildFeuds(W, rng, y) {
  const era = eraOf(W);
  const hh = Object.values(W.households).filter(h => h.dissolved == null && h.district !== era.outskirts && h.members.filter(id => ageOf(W.people[id], y) >= 16).length >= 2);
  const nF = Math.max(1, Math.round(residentsAlive(W).length / 170));
  for (let i = 0; i < nF && hh.length > 2; i++) {
    const A = rng.pick(hh);
    const sameDistrict = hh.filter(h => h !== A && h.district === A.district);
    const B = sameDistrict.length && rng.chance(0.6) ? rng.pick(sameDistrict) : rng.pick(hh.filter(h => h !== A));
    if (!B) continue;
    const adultsA = A.members.map(id => W.people[id]).filter(p => ageOf(p, y) >= 16);
    const adultsB = B.members.map(id => W.people[id]).filter(p => ageOf(p, y) >= 16);
    if (adultsA.some(a => adultsB.some(b => closelyRelated(W, a, b)))) continue;
    const reason = rng.pick(era.feudReasons);
    const since = y - rng.int(1, 25);
    const intensity = rng.int(30, 90);
    const id = W.next.f++;
    const hA = W.people[A.head], hB = W.people[B.head];
    const nmA = A.name === B.name && hA ? `${hA.first} ${hA.last}'s household` : A.name, nmB = A.name === B.name && hB ? `${hB.first} ${hB.last}'s household` : B.name;
    W.feuds[id] = { id, sideA: { kind: 'household', id: A.id, name: nmA }, sideB: { kind: 'household', id: B.id, name: nmB }, reason, since, intensity, status: 'active', history: [{ y: since, text: `Began over ${reason}.` }] };
    for (const a of adultsA) for (const b of adultsB) {
      if (getRel(W, a.id, b.id) && /friend|courting|crush/.test(getRel(W, a.id, b.id).type)) continue; // some friendships survive feuds
      const sc = -clamp(Math.round(intensity * rng.range(0.5, 1.1)), 10, 100);
      setRel(W, a.id, b.id, sc <= -55 ? 'enemy' : 'rival', sc, since, `family feud: ${reason}`, { feud: id });
    }
    const headA = W.people[A.head], headB = W.people[B.head];
    if (headA) addEvent(W, headA, since, 'feud', `A feud began with @${headB.id}'s household over ${reason}.`);
    if (headB) addEvent(W, headB, since, 'feud', `A feud began with @${headA.id}'s household over ${reason}.`);
  }
}

// ---------- biographies ----------
function personalityWords(p) {
  const t = p.traits; const out = [];
  const pairs = [['E', 'outgoing', 'quiet'], ['A', 'warm-hearted', 'sharp-tongued'], ['C', 'hard-working', 'careless'], ['N', 'quick to worry', 'calm'], ['O', 'curious', 'set in their ways']];
  const ranked = pairs.map(([k, hi, lo]) => [Math.abs(t[k] - 50), t[k] >= 50 ? hi : lo]).sort((a, b) => b[0] - a[0]);
  for (const [d, w] of ranked) if (d >= 12 && out.length < 3) out.push(w);
  if (!out.length) out.push('even-tempered');
  return out;
}
function roleSentence(W, p) {
  const He = cap(heShe(p)); const o = p.occupation; const lo = o.toLowerCase();
  const wp = W.workplaces[p.workplace];
  if (p.occId) return `${He} works as ${/^[aeiou]/i.test(o) ? 'an' : 'a'} ${/^[A-Z]{2}/.test(o) ? o : lo}${wp ? ` at ${wp.name}` : ''}.`;
  if (/^(keeps|cares|helps|does)/i.test(o)) return `${He} ${lo}.`;
  if (/student|pupil/i.test(o)) return `${He} is ${/^pupil/i.test(o) ? 'a ' + lo : 'a ' + lo.replace('student (', 'student in ').replace(')', '')}.`;
  if (/small child|preschooler|crèche/i.test(o)) return `${He} is still small.`;
  if (/^elder/i.test(o)) return `${He} is one of the elders and does light duties.`;
  if (/stay-at-home|caregiver/i.test(o)) return `${He} is a ${lo}.`;
  if (/odd jobs/i.test(o)) return `${He} gets by on odd jobs.`;
  return `${He} is ${lo}.`;
}
function writeBio(W, p, y) {
  const era = eraOf(W);
  const S = []; const a = ageOf(p, y); const He = cap(heShe(p)), his = hisHer(p);
  const father = W.people[p.father], mother = W.people[p.mother];
  const sibs = siblingsOf(W, p).map(id => W.people[id]);
  const allKids = [...new Set([...(mother ? mother.children : []), ...(father ? father.children : [])])].map(id => W.people[id]).sort((x, z) => x.born - z.born);
  // origins
  if (W.era === 'dropped' && p.homeland) {
    S.push(`@${p.id} was born in ${p.born} and grew up in ${p.homeland}${father || mother ? `, the child of ${[father, mother].filter(Boolean).map(x => '@' + x.id).join(' and ')}` : ''}.`);
  } else if (father || mother) {
    const pos = allKids.indexOf(p) + 1;
    const parentsTxt = [father, mother].filter(Boolean).map(x => '@' + x.id).join(' and ');
    S.push(`@${p.id} was born in ${p.born} to ${parentsTxt}${allKids.length > 1 ? `, the ${ordinal(pos)} of ${allKids.length} children` : ', an only child'}${p.arrived ? '' : ` here in ${W.name}`}.`);
  } else {
    S.push(`@${p.id} was born around ${p.born}${p.arrived ? ` and came to ${W.name} in ${p.arrived}` : `, one of the old families of ${W.name}`}.`);
  }
  const deadSibs = sibs.filter(s => s.died != null && s.died <= y);
  if (deadSibs.length >= 2) S.push(`${He} lost ${deadSibs.length} brothers and sisters along the way.`);
  else if (deadSibs.length === 1) S.push(`${He} lost ${rel3(deadSibs[0], 'a brother', 'a sister', 'a sibling')}, @${deadSibs[0].id}, in ${deadSibs[0].died}.`);
  for (const par of [father, mother]) if (par && par.died != null && par.died <= y && par.died - p.born < 18 && par.died >= p.born) S.push(`${He} was only ${par.died - p.born} when ${his} ${rel3(par, 'father', 'mother', 'parent')} died of ${par.cause}.`);
  if (p.guardian) S.push(`${He} was taken in by @${p.guardian}.`);
  if (p.arrived && (father || mother) && W.era !== 'dropped') S.push(`The family came to ${W.name} in ${p.arrived}.`);
  // character
  const words = personalityWords(p).map(w => w.replace('their ways', `${his} ways`));
  S.push(`${He} is ${words.length > 1 ? words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1] : words[0]}. ${He} ${p.quirk.replace(/\btheir\b/g, his)}.`);
  // work
  if (p.status === 'resident' && p.occupation) S.push(roleSentence(W, p));
  if (p.formerOccupation) S.push(`Back in the old world ${heShe(p)} was ${/^[aeiou]/i.test(p.formerOccupation) ? 'an' : 'a'} ${p.formerOccupation.toLowerCase()}.`);
  // family life
  const spouse = W.people[p.spouse];
  const marriages = p.events.filter(e => e.t === 'married' || e.t === 'partnered');
  if (spouse) {
    const since = marriages.length ? marriages[marriages.length - 1].y : null;
    S.push(`${He} ${p.union === 'partners' ? 'lives with partner' : 'is married to'} @${spouse.id}${since ? ` (since ${since})` : ''}.`);
  }
  if (p.widowedOf && p.widowedOf.length) S.push(`${He} was widowed when @${p.widowedOf[p.widowedOf.length - 1]} died.`);
  if (p.exes.length) S.push(`${He} ${p.exes.length > 1 ? `has ${p.exes.length} former partners` : `split from @${p.exes[0]}`}.`);
  const kids = p.children.map(id => W.people[id]);
  const liveKids = kids.filter(k => k.died == null || k.died > y);
  const deadKids = kids.filter(k => k.died != null && k.died <= y);
  if (kids.length) S.push(`${He} has had ${kids.length} ${kids.length === 1 ? 'child' : 'children'}${deadKids.length ? `, and buried ${deadKids.length === 1 ? 'one' : deadKids.length}` : ''}.`);
  // hermit
  if (p.hermit) S.push(`${He} lives alone at ${era.outskirts.replace(/^an? /, 'a ')}: ${heShe(p)} ${p.hermitReason}.`.replace('at a ', 'in a ').replace('at an ', 'in an '));
  if (p.conditions.length) S.push(`${He} lives with ${p.conditions.join(' and ')}.`);
  S.push(`${He} enjoys ${p.hobbies.join(', ').replace(/, ([^,]*)$/, ' and $1')}, hopes one day ${p.goal.replace(/\btheir\b/g, his)}, and secretly fears ${p.fear.replace(/\btheir\b/g, his)}.`);
  return S.join(' ');
}

// ---------- the empty-world arrival ----------
function performDrop(W, rng, target) {
  const y = W.startYear;
  const mode = (W.options && W.options.gathering) || 'mixed';
  const live = residentsAlive(W);
  // Everyone still alive keeps their old-world job as their "former" job
  for (const p of live) p.formerOccupation = p.occId ? p.occupation : null;
  const chosen = new Set(); const units = [];
  // "blocked" holds everyone who would already know a chosen person (close family, cousins, spouse)
  const blocked = new Set();
  const kinOf = (p, wide) => {
    const out = new Set([p.id]);
    if (p.spouse) out.add(p.spouse); for (const e of p.exes) out.add(e);
    const tops = wide ? [...ancestors(W, p, 2)] : [p.id, p.father, p.mother].filter(Boolean);
    // everyone descended (2 generations) from p's grandparents = siblings, parents, aunts, uncles, cousins
    let layer = tops.map(id => W.people[id]).filter(Boolean);
    for (const t of layer) out.add(t.id);
    for (let d = 0; d < 2; d++) { const nl = []; for (const x of layer) for (const c of x.children) { if (!out.has(c)) { out.add(c); nl.push(W.people[c]); } } layer = nl.filter(Boolean); }
    for (const c of p.children) { out.add(c); const k = W.people[c]; if (k) for (const g of k.children) out.add(g); }
    return out;
  };
  const choose = (mem, wide) => { units.push(mem); for (const m of mem) { chosen.add(m.id); for (const k of kinOf(m, wide)) blocked.add(k); } };
  const hh = rng.shuffle(Object.values(W.households).filter(h => h.dissolved == null && h.members.length));
  const familyShare = mode === 'families' ? 1 : mode === 'strangers' ? 0 : 0.45;
  let count = 0;
  for (const wide of [true, false]) { // first try keeping cousins apart too; relax only if needed
    for (const h of hh) {
      if (count >= target * familyShare) break;
      const mem = h.members.map(id => W.people[id]).filter(p => p && isAlive(p) && isResident(p) && !chosen.has(p.id));
      if (!mem.length || mem.some(m => blocked.has(m.id)) || count + mem.length > target) continue;
      choose(mem, wide); count += mem.length;
    }
    if (mode !== 'families') for (const p of rng.shuffle(live.slice())) {
      if (count >= target) break;
      if (chosen.has(p.id) || blocked.has(p.id) || ageOf(p, y) < 16) continue;
      choose([p], wide); count++;
    }
    if (count >= target) break;
  }
  // if the old world could not supply enough unrelated people, add lone strangers with no recorded family
  while (count < target) {
    const a = rng.int(16, 70);
    const p = makePerson(W, rng, { born: y - a });
    p.events.push({ y: p.born, t: 'born', text: 'Born on Earth.' });
    const h = newHousehold(W, rng, [p], y);
    p.formerOccupation = rng.pick(ERAS.modern.occupations.filter(o => !o.unique && a >= o.min)).name;
    choose([p], false); count++;
  }
  // keep only the chosen and their close relatives (as records), drop unrelated old-world people
  const keep = new Set(chosen);
  for (const id of chosen) {
    const p = W.people[id];
    for (const a of ancestors(W, p, 2)) keep.add(a);
    for (const c of p.children) keep.add(c);
    for (const s of siblingsOf(W, p)) keep.add(s);
    if (p.spouse) keep.add(p.spouse);
    for (const e of p.exes) keep.add(e);
    for (const c of p.children) { const k = W.people[c]; if (k) for (const g of k.children) keep.add(g); }
  }
  for (const id of Object.keys(W.people)) if (!keep.has(+id)) delete W.people[id];
  // clean dangling links
  for (const p of Object.values(W.people)) {
    if (p.father && !W.people[p.father]) p.father = null;
    if (p.mother && !W.people[p.mother]) p.mother = null;
    if (p.spouse && !W.people[p.spouse]) p.spouse = null;
    if (p.guardian && !W.people[p.guardian]) p.guardian = null;
    if (p.secretFather && !W.people[p.secretFather]) p.secretFather = null;
    p.children = p.children.filter(c => W.people[c]);
    p.exes = p.exes.filter(c => W.people[c]);
    if (p.widowedOf) p.widowedOf = p.widowedOf.filter(c => W.people[c]);
    if (p.secretChildren) p.secretChildren = p.secretChildren.filter(c => W.people[c]);
    p.memories = p.memories.filter(m => W.people[m.who]);
    p.events = p.events.filter(e => !/@(\d+)/.test(e.text) || [...e.text.matchAll(/@(\d+)/g)].every(m => W.people[m[1]]));
  }
  // people who stayed on Earth keep only their key life events
  for (const p of Object.values(W.people)) if (!chosen.has(p.id)) p.events = p.events.filter(e => ['born', 'married', 'partnered', 'died', 'divorced', 'child_born'].includes(e.t));
  W.rels = {}; W.households = {}; W.workplaces = {}; W.next.h = 1; W.next.w = 1;
  // everyone not chosen and still alive stays on Earth
  for (const p of Object.values(W.people)) {
    p.household = null; p.workplace = null;
    if (!chosen.has(p.id)) { if ((p.status === 'resident' || p.status === 'departed') && p.died == null) p.status = 'leftBehind'; p.occupation = p.died == null ? (p.occupation || null) : null; }
  }
  // homelands and camps
  for (const unit of units) {
    const lead = unit[0];
    const home = rng.pick(HOMELANDS[lead.culture] || ['somewhere on Earth']);
    const camp = rng.pick(eraOf(W).districts);
    for (const p of unit) p.homeland = home;
    for (const p of unit) {
      for (const pid of [p.father, p.mother, ...p.children, ...siblingsOf(W, p)]) { const r = W.people[pid]; if (r && !r.homeland) r.homeland = home; }
    }
    const h = newHousehold(W, rng, unit, y, camp);
    recomputeHead(W, h);
    // second languages (estimate: 45% of non-English speakers know some English)
    for (const p of unit) if (!p.languages.includes('English') && ageOf(p, y) >= 10 && rng.chance(0.45)) p.languages.push('English');
  }
  // one shared arrival event
  for (const id of chosen) {
    const p = W.people[id];
    const left = [p.spouse, ...p.children, p.father, p.mother].map(x => W.people[x]).filter(q => q && q.status === 'leftBehind');
    addEvent(W, p, y, 'arrived', `Woke up in an empty, wild world with ${W.people[id].household && W.households[p.household].members.length > 1 ? 'the family' : 'only strangers around'}.`,
      { why: left.length ? `Left behind on Earth: ${left.map(q => '@' + q.id).join(', ')}.` : 'Nobody knows how or why it happened.' });
    for (const q of left) addMemory(p, y, 'separation', q.id, q.id === p.spouse || p.children.includes(q.id) ? 1 : 0.7, 'left behind on Earth');
    p.arrived = y;
  }
  // survival roles from old skills
  const era = eraOf(W);
  for (const id of chosen) {
    const p = W.people[id]; const a = ageOf(p, y);
    if (a < 5) { p.occupation = era.youngChild; p.occId = null; continue; }
    if (a < 14) { p.occupation = era.childWork; p.occId = null; continue; }
    if (a >= 78 || p.health < 30) { p.occupation = era.retired; p.occId = null; continue; }
    const roles = era.survivalRoles.map(r => [r, r.n * (0.4 + p.aptitude[r.skill] / 70) * (p.formerOccupation && /nurse|doctor|paramedic|health/i.test(p.formerOccupation) && r.name === 'Healer' ? 15 : 1) * (p.formerOccupation && /teacher/i.test(p.formerOccupation) && r.name === 'Teacher' ? 8 : 1) * (p.formerOccupation && /carpenter|construction|electrician|plumber/i.test(p.formerOccupation) && r.name === 'Shelter builder' ? 5 : 1) * (r.name === 'Translator' ? (p.languages.length >= 2 ? 3 : 0.1) : 1)]);
    const r = rng.weighted(roles);
    p.occupation = r.name; p.occId = 'role_' + r.name.toLowerCase().replace(/[^a-z]+/g, '_');
  }
  W.yearStats = {};
}

// ---------- create a whole community ----------
function createCommunity(opts) {
  const era = ERAS[opts.era];
  const W = makeEmptyWorld(opts);
  const rng = new Rng(opts.seed);
  const target = clamp(Math.round(opts.population), 20, 1000);
  const dropped = opts.era === 'dropped';
  const years = 90;
  const poolFactor = { strangers: 5.5, mixed: 4, families: 3.2 }[(W.options && W.options.gathering) || 'mixed'] || 4;
  simulateBackHistory(W, rng, dropped ? Math.round(target * poolFactor) : target, dropped ? 75 : years);
  // settle at exactly the target
  const y = W.startYear;
  W._y = y;
  if (!dropped) {
    let live = residentsAlive(W);
    while (live.length < target) { makeImmigrantUnit(W, rng, y - 1, target - live.length >= 3 && rng.chance(0.5) ? 'family' : 'single', 16, 40); live = residentsAlive(W); }
    if (live.length > target) {
      const leavers = rng.shuffle(live.filter(p => !p.spouse && ageOf(p, y) >= 16 && ageOf(p, y) <= 35 && !p.children.length && W.households[p.household].members.length > 1));
      while (residentsAlive(W).length > target && leavers.length) departPerson(W, leavers.pop(), y - 1, rng);
      // very small towns: also let some whole single-person households leave
      const lone = rng.shuffle(residentsAlive(W).filter(p => !p.spouse && !p.children.length && ageOf(p, y) >= 16));
      while (residentsAlive(W).length > target && lone.length) departPerson(W, lone.pop(), y - 1, rng);
      // then any unmarried adult whose leaving does not leave a child without an adult
      const safeToLeave = p => { const h = W.households[p.household]; const others = h.members.map(id => W.people[id]).filter(q => q.id !== p.id && isAlive(q) && isResident(q)); return !others.some(q => ageOf(q, y) < 16) || others.some(q => ageOf(q, y) >= 16); };
      const anyone = rng.shuffle(residentsAlive(W).filter(p => !p.spouse && ageOf(p, y) >= 16));
      while (residentsAlive(W).length > target && anyone.length) { const p = anyone.pop(); if (safeToLeave(p)) departPerson(W, p, y - 1, rng); }
      // last resort for tiny towns: a whole small household moves away
      const homes = Object.values(W.households).filter(h => h.dissolved == null && h.members.length).sort((a, b) => a.members.length - b.members.length);
      for (const h of homes) {
        const n = residentsAlive(W).length; if (n <= target) break;
        if (h.members.length > n - target) continue;
        for (const id of h.members.slice()) departPerson(W, W.people[id], y - 1, rng);
      }
      // still over: a small household leaves and lone newcomers fill the gap exactly
      if (residentsAlive(W).length > target) {
        const h = Object.values(W.households).filter(h => h.dissolved == null && h.members.length).sort((a, b) => a.members.length - b.members.length)[0];
        for (const id of h.members.slice()) departPerson(W, W.people[id], y - 1, rng);
        while (residentsAlive(W).length < target) makeImmigrantUnit(W, rng, y - 1, 'single', 18, 40);
      }
    }
    for (const c of residentsAlive(W)) if (ageOf(c, y) < 15) { const h = W.households[c.household]; if (!h.members.some(id => { const q = W.people[id]; return q && isAlive(q) && isResident(q) && ageOf(q, y) >= 16; })) rehomeChild(W, rng, c, y - 1); }
    assignJobs(W, rng, y);
  } else {
    assignJobs(W, rng, y, { era: ERAS.modern, settings: ERAS.modern.settings, occs: ERAS.modern.occupations });
    performDrop(W, rng, target);
  }
  assignLateTraits(W, rng, y);
  assignWealth(W, rng);
  // in the empty world, everyone outside their own family is a stranger
  if (!dropped) { buildSocialWeb(W, rng, y); buildGroups(W, rng, y); buildFeuds(W, rng, y); }
  else buildGroups(W, rng, y);
  for (const h of Object.values(W.households)) recomputeHead(W, h);
  for (const p of Object.values(W.people)) p.events.sort((a, b) => a.y - b.y);
  W.log.push({ y, t: 'founded', text: dropped ? `${residentsAlive(W).length} people woke up in an empty world and named the place ${W.name}.` : `The chronicle of ${W.name} begins with ${residentsAlive(W).length} residents.` });
  // record the population at the start
  W.census = { [y]: quickCensus(W, y) };
  delete W._y;
  return W;
}

function quickCensus(W, y) {
  const live = residentsAlive(W);
  const c = { population: live.length, male: 0, female: 0, children: 0, adults: 0, elders: 0, married: 0, households: 0, employed: 0, hermits: 0 };
  for (const p of live) {
    p.sex === 'm' ? c.male++ : c.female++;
    const a = ageOf(p, y); if (a < 16) c.children++; else if (a < 65) c.adults++; else c.elders++;
    if (p.spouse) c.married++; if (p.occId) c.employed++; if (p.hermit) c.hermits++;
  }
  c.households = Object.values(W.households).filter(h => h.dissolved == null && h.members.some(id => isResident(W.people[id]) && isAlive(W.people[id]))).length;
  return c;
}

// ---------- save / load checks ----------
function validateWorld(W) {
  if (!W || W.format !== FORMAT) throw new Error('This file is not a Town Chronicle save file.');
  if (!ERAS[W.era]) throw new Error('This save uses an era this version does not know: ' + W.era);
  if (W.version > FORMAT_VERSION) throw new Error('This save was made by a newer version of the app.');
  for (const k of ['people', 'households', 'workplaces', 'rels', 'groups', 'feuds']) if (typeof W[k] !== 'object') throw new Error('The save file is missing its ' + k + ' section.');
  return true;
}

if (typeof module !== 'undefined') module.exports = { createCommunity, validateWorld, ERAS, CULTURES, SETTING_INFO, residentsAlive, ageOf, siblingsOf, closelyRelated, quickCensus };
