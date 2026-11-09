// ================= V10: who people are inside, how the town sees them, and lasting injuries =================
// Everything here runs once a year (livesYear), after the seasons, with its own random numbers.

// ---------- the issues a town and every person has an attitude about (-100 hostile … +100 accepting) ----------
const ISSUES = [
  { key: 'samesex', label: 'Same-sex love', about: 'gay, lesbian and bisexual people living openly' },
  { key: 'gender', label: 'Trans and non-binary people', about: 'people living as a gender other than the one they were raised as' },
  { key: 'disability', label: 'Disabled and disfigured people', about: 'people living with blindness, a lost limb, deafness or a disfigured face' },
  { key: 'outsiders', label: 'Newcomers and other cultures', about: 'people who arrived lately or come from another culture' },
  { key: 'faiths', label: 'Other faiths', about: 'people who follow a different faith from most of the town' },
  { key: 'women', label: 'Women working and leading', about: 'women in skilled work, trades and positions of authority' }
];
// Where each setting's town starts. These are estimates for each period; change them on the Attitudes page.
const ATT_START = {
  medieval: { samesex: -75, gender: -75, disability: -25, outsiders: -35, faiths: -70, women: -55 },
  tudor: { samesex: -75, gender: -75, disability: -25, outsiders: -35, faiths: -65, women: -50 },
  georgian: { samesex: -70, gender: -70, disability: -20, outsiders: -30, faiths: -45, women: -45 },
  frontier: { samesex: -60, gender: -65, disability: -15, outsiders: -30, faiths: -30, women: -40 },
  victorian: { samesex: -70, gender: -70, disability: -15, outsiders: -35, faiths: -35, women: -40 },
  edwardian: { samesex: -60, gender: -65, disability: -10, outsiders: -30, faiths: -25, women: -15 },
  modern: { samesex: 45, gender: 15, disability: 40, outsiders: 15, faiths: 35, women: 60 },
  fantasy: { samesex: -20, gender: -25, disability: -10, outsiders: -20, faiths: -30, women: -10 },
  scifi: { samesex: 65, gender: 55, disability: 60, outsiders: 45, faiths: 55, women: 80 },
  dropped: { samesex: 35, gender: 5, disability: 30, outsiders: 10, faiths: 20, women: 45 }
};

// ---------- new settings (shown on the Era settings page; all can be changed) ----------
Object.assign(SETTING_INFO, {
  transShare: { label: 'People whose gender is not the one they were raised as (trans)', unit: 'chance', min: 0, max: 0.05 },
  nonbinaryShare: { label: 'People who feel neither a man nor a woman (non-binary)', unit: 'chance', min: 0, max: 0.05 },
  hidingStress: { label: 'Unhappiness each year from hiding who they are', unit: 'factor', min: 0, max: 40 },
  attitudeEffect: { label: 'How strongly attitudes change how people treat each other', unit: 'factor', min: 0, max: 3 },
  attitudesChangeLaws: { label: 'Town attitudes can change the law on same-sex couples', unit: 'yes/no' },
  severeInjuries: { label: 'Lasting injuries that are severe (blindness, a lost limb…)', unit: 'chance', min: 0, max: 1 }
});
const LIVES_DEFAULTS = { transShare: 0.006, nonbinaryShare: 0.004, hidingStress: 8, attitudeEffect: 1, attitudesChangeLaws: true, severeInjuries: 0.2 };
for (const e of Object.values(ERAS)) e.settings = Object.assign({}, LIVES_DEFAULTS, e.settings);

// ---------- lasting injuries and conditions that change a life ----------
// cannot: kinds of work (skills) they can no longer do; prone: how much more likely they are to be hurt; marks: which attitude decides how others see them
const LASTING_SEVERE = ['blindness', 'the loss of an arm', 'the loss of a leg', 'deafness', 'a badly burned face'];
const CONDITION_EFFECTS = {
  'blindness': { cannot: ['craft', 'trade', 'animals', 'farming', 'outdoors', 'fighting', 'labor', 'healing', 'leadership'], prone: 1.6, disabled: true },
  'the loss of an arm': { cannot: ['craft', 'fighting', 'labor', 'farming'], prone: 1.3, disabled: true },
  'the loss of a leg': { cannot: ['labor', 'farming', 'fighting', 'outdoors', 'animals'], prone: 1.4, disabled: true },
  'deafness': { cannot: ['fighting'], prone: 1.25, disabled: true },
  'a badly burned face': { disfigured: true },
  'a scarred face': { disfigured: true }, 'a scar across the face': { disfigured: true }, 'pockmarked skin': { disfigured: true },
  'blindness in one eye': { prone: 1.15 }, 'deafness in one ear': { prone: 1.05 }, 'a limp': { prone: 1.1 }, 'a lame leg': { prone: 1.1 }
};
function conditionEffects(p) { return (p.conditions || []).map(c => CONDITION_EFFECTS[c]).filter(Boolean); }
function canDoWork(p, o) { return !conditionEffects(p).some(e => e.cannot && e.cannot.includes(o.skill)); }
function injuryProneness(p) { return conditionEffects(p).reduce((a, e) => a * (e.prone || 1), 1); }
function isDisabled(p) { return conditionEffects(p).some(e => e.disabled); }
function isDisfigured(p) { return conditionEffects(p).some(e => e.disfigured); }
// sim.js asks this when someone is left with a lasting injury: sometimes it is a severe one
function severeInjury(W, rng, p) { const s = W.settings.severeInjuries ?? 0.2; if (!rng.chance(s)) return null; const opts = LASTING_SEVERE.filter(l => !p.conditions.includes(l)); return opts.length ? rng.pick(opts) : null; }

// ---------- who someone is inside ----------
const otherSex = s => s === 'm' ? 'f' : 'm';
const sexGender = s => s === 'm' ? 'man' : 'woman';
const GENDER_WORD = { man: 'a man', woman: 'a woman', nonbinary: 'non-binary' };
function livesInitPerson(W, rng, p, y) {
  if (p.att) return;
  const S = W.settings, a = ageOf(p, y);
  // gender: most feel the gender they were raised as; some realise, as a child or later, that it isn't theirs
  if (!p.inner && rng.chance((S.transShare ?? 0) + (S.nonbinaryShare ?? 0))) {
    const felt = rng.chance((S.transShare ?? 0) / Math.max(1e-9, (S.transShare ?? 0) + (S.nonbinaryShare ?? 0))) ? sexGender(otherSex(p.sex)) : 'nonbinary';
    p.inner = { felt, realise: p.born + (rng.chance(0.6) ? rng.int(4, 14) : rng.int(15, 40)), realised: null, out: null };
  }
  // gay and bisexual people realise in their teens; same-sex couples already together are open
  if ((p.orientation === 'gay' || p.orientation === 'bisexual') && !p.so) {
    const sp = W.people[p.spouse];
    const together = sp && sp.sex === p.sex;
    p.so = { realise: p.born + rng.int(11, 21), realised: together ? Math.min(y, p.born + 18) : null, out: together ? y : null };
  }
  // their own attitudes: the town's, shaped by personality and age, or their family's if they are a child
  const t = townAtt(W), home = W.households[p.household];
  const elders = home ? home.members.map(id => W.people[id]).filter(q => q && q.att && q !== p && ageOf(q, y) >= 18) : [];
  p.att = {};
  for (const is of ISSUES) {
    const base = elders.length && a < 16 ? elders.reduce((s, q) => s + q.att[is.key], 0) / elders.length : t[is.key];
    const lean = (p.traits.O - 50) * 0.5 + (p.traits.A - 50) * 0.3 - Math.max(0, a - 40) * 0.25;
    p.att[is.key] = Math.round(clamp(base + lean + rng.normal(0, 18), -100, 100));
  }
  // at the start of a town, some who realised long ago are already open, depending on how accepting the town is
  for (const [k, inner, issue] of [['inner', p.inner, 'gender'], ['so', p.so, 'samesex']]) {
    if (!inner || inner.realised || y < inner.realise) continue;
    inner.realised = inner.realise;
    if (rng.chance(clamp(0.1 + (t[issue] + 100) / 200 * 0.7, 0.02, 0.85))) { inner.out = Math.max(inner.realise, y - rng.int(0, 10)); if (k === 'inner') p.gender = inner.felt; }
  }
}
function townAtt(W) { W.att = W.att || {}; const st = ATT_START[W.era] || ATT_START[eraBase(W)] || ATT_START.modern; for (const is of ISSUES) if (!W.att[is.key]) W.att[is.key] = { v: st[is.key], locked: false }; return Object.fromEntries(ISSUES.map(is => [is.key, W.att[is.key].v])); }

// ---------- who stands out, and for what ----------
function majority(W, f) { const c = {}; for (const p of lives(W)) { const k = f(p); if (k) c[k] = (c[k] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || null; }
function marksOf(W, p, y, maj) {
  const m = [];
  if (p.so && p.so.out) m.push('samesex');
  if (p.gender && p.gender !== sexGender(p.sex)) m.push('gender');
  if (isDisabled(p) || isDisfigured(p)) m.push('disability');
  if ((p.arrived && y - p.arrived <= 5) || (maj.culture && p.culture !== maj.culture)) m.push('outsiders');
  if (maj.faith && p.faith && p.faith !== maj.faith && !/not religious/i.test(p.faith)) m.push('faiths');
  if (p.sex === 'f' && genderOf(p) === 'woman' && p.occId) { const o = (eraOf(W).occupations || []).find(x => x.id === p.occId); if (o && (o.cls === 'high' || o.cls === 'mid' || o.sex === 'm')) m.push('women'); }
  return m;
}
const MARK_WORDS = { samesex: 'loving who they love', gender: 'living as who they are', disability: 'how they look and live', outsiders: 'being an outsider', faiths: 'their faith', women: 'doing a man\'s work, as some saw it' };

// ---------- the yearly pass ----------
function livesYear(W, _rng, y, R) {
  const rng = new Rng((W.seed * 7777 + y * 131 + 3) >>> 0);
  const S = W.settings, people = lives(W), eff = S.attitudeEffect ?? 1;
  const t = townAtt(W);
  for (const p of people) livesInitPerson(W, rng, p, y);
  W._s = null;
  // 1. realising, hiding, and coming out
  for (const p of people) {
    const a = ageOf(p, y);
    for (const [k, issue] of [['inner', 'gender'], ['so', 'samesex']]) {
      const inn = p[k]; if (!inn || inn.out) continue;
      if (!inn.realised) {
        if (y < inn.realise) continue;
        inn.realised = y;
        addEvent(W, p, y, 'mind', k === 'inner' ? `Came to understand, inside, that ${heShe(p)} is not who everyone thinks: ${GENDER_WORD[inn.felt]}.` : `Came to understand, inside, that ${heShe(p)} is drawn to ${p.orientation === 'gay' ? (p.sex === 'm' ? 'men' : 'women') : 'both men and women'}.`, { secret: true });
        continue;
      }
      // hiding hurts
      const m = mindOf(p); m.yearStress += S.hidingStress ?? 8;
      if (a < 13) continue;
      // will they come out? It depends on the town, the people around them, and their own nature
      const around = closeCircle(W, p, y);
      const near = around.length ? around.reduce((s, q) => s + (q.att ? q.att[issue] : t[issue]), 0) / around.length : t[issue];
      const acc = t[issue] * 0.4 + near * 0.6;
      const ch = clamp(0.01 + Math.pow((acc + 100) / 200, 2) * 0.3 + (p.traits.E - 50) / 800 - (p.traits.N - 50) / 900 + (a >= 18 ? 0.01 : 0), 0.003, 0.35);
      if (rng.chance(ch)) comeOut(W, rng, p, k, issue, y, around);
      else if (!inn.hidingNoted) { inn.hidingNoted = y; addEvent(W, p, y, 'mind', `Keeps who ${heShe(p)} really is hidden, for fear of what people would do.`, { secret: true }); }
    }
  }
  // 2. attitudes drift: towards family, friends and the town; knowing someone open softens people
  const maj = { culture: majority(W, p => p.culture), faith: majority(W, p => p.faith) };
  const marked = new Map(); for (const p of people) marked.set(p.id, marksOf(W, p, y, maj));
  const share = {}; for (const is of ISSUES) share[is.key] = people.filter(p => marked.get(p.id).includes(is.key)).length / Math.max(1, people.length);
  const times = ATT_START[W.era] || ATT_START[eraBase(W)] || ATT_START.modern; // the views of the times, which people keep being pulled back towards
  for (const p of people) {
    const a = ageOf(p, y), circle = closeCircle(W, p, y), home = W.households[p.household];
    const fam = home ? home.members.map(id => W.people[id]).filter(q => q && q !== p && q.att) : [];
    for (const is of ISSUES) {
      const k = is.key; let v = p.att[k];
      const famV = fam.length ? fam.reduce((s, q) => s + q.att[k], 0) / fam.length : v;
      const friV = circle.length ? circle.reduce((s, q) => s + q.att[k], 0) / circle.length : v;
      const target = 0.45 * v + 0.25 * famV + 0.15 * friV + 0.15 * t[k];
      v += (target - v) * (a < 16 ? 0.35 : 0.12);
      if (W.att[k].locked) v += (t[k] - v) * 0.08; // the town's attitude is being pushed (your setting): people are nudged towards it
      if (share[k] < 0.25 && circle.some(q => (marked.get(q.id) || []).includes(k))) v += 1; // knowing someone well changes minds
      v += (times[k] - v) * 0.03;
      p.att[k] = Math.round(clamp(v + rng.normal(0, 2), -100, 100));
    }
  }
  // the town's attitude is the average of its grown-ups, unless you have locked it
  const adults = people.filter(p => ageOf(p, y) >= 16);
  for (const is of ISSUES) if (!W.att[is.key].locked && adults.length) W.att[is.key].v = Math.round(adults.reduce((s, p) => s + p.att[is.key], 0) / adults.length);
  W.attHistory = W.attHistory || {}; W.attHistory[y] = Object.fromEntries(ISSUES.map(is => [is.key, W.att[is.key].v]));
  const t2 = townAtt(W);
  // 3. how people are treated: friendships and family ties warm or cool, reputations rise or fall, and some are harassed
  for (const r of Object.values(W.rels)) {
    if (r.ended) continue;
    const A = W.people[r.a], B = W.people[r.b]; if (!A || !B || !isAlive(A) || !isAlive(B) || A.status !== 'resident' || B.status !== 'resident' || !A.att || !B.att) continue;
    let d = 0;
    for (const [x, z] of [[A, B], [B, A]]) for (const k of marked.get(z.id) || []) { const v = x.att[k]; d += v < -20 ? v / 100 * rng.range(1, 4) * eff * (k === 'disability' && isDisfigured(z) ? 1.5 : 1) : v > 40 ? 0.5 * eff : 0; }
    if (d) r.score = clamp(Math.round((r.score + d) * 10) / 10, -100, 100);
  }
  for (const p of people) {
    const mk = marked.get(p.id); if (!mk.length) continue;
    const worst = Math.min(...mk.map(k => t2[k]));
    if (p.standing != null) p.standing = Math.round(clamp(p.standing + (worst / 100) * 1.5 * eff, 0, 100) * 10) / 10;
    // harassment where the town is hostile
    if (worst < -20 && ageOf(p, y) >= 10 && rng.chance(-worst / 100 * 0.06 * eff)) {
      const k = mk.find(x => t2[x] === worst);
      const foes = people.filter(q => q !== p && q.att && q.att[k] < -50 && ageOf(q, y) >= 14);
      const foe = foes.length ? rng.pick(foes) : null;
      mindOf(p).yearStress += 12; addMemory(p, y, 'shame', foe ? foe.id : p.id, 0.3, 'harassed');
      if (foe && ageOf(foe, y) >= 16 && foe.traits.A < 35 && rng.chance(0.2) && typeof commitCrime === 'function') commitCrime(W, rng, y, R, 'assault', foe, p, `hatred of ${MARK_WORDS[k] === MARK_WORDS.women ? 'women doing such work' : 'people like ' + himHer(p)}`);
      else addEvent(W, p, y, 'conflict', `${foe ? `Was jeered at and shunned by @${foe.id}` : 'Was jeered at and shunned in the street'} for ${MARK_WORDS[k]}.`);
      if (k === 'disability' && isDisfigured(p) && rng.chance(0.3)) addEvent(W, p, y, 'conflict', 'Children ran away in fright at the sight of ' + hisHer(p) + ' face.', { minor: true });
    }
  }
  // 4. injuries that stop someone doing their work
  for (const p of people) {
    if (!p.occId || !p.conditions || !p.conditions.length) continue;
    const o = (eraOf(W).occupations || []).find(x => x.id === p.occId);
    if (o && !canDoWork(p, o)) {
      const c = p.conditions.find(c => CONDITION_EFFECTS[c] && CONDITION_EFFECTS[c].cannot && CONDITION_EFFECTS[c].cannot.includes(o.skill));
      leaveJob(W, rng, p, y, `could no longer do the work after ${c}`);
      p.formerOccupation = p.occupation; p.occId = null;
      p.occupation = 'Unable to do ' + hisHer(p) + ' old work';
      addEvent(W, p, y, 'setback', `Had to give up work as ${o.name.toLowerCase()} because of ${c}.`);
    }
  }
  // 5. the law can follow the town (if allowed in the settings)
  if (S.attitudesChangeLaws) {
    if (!S.sameSexCouples && t2.samesex >= 35) { S.sameSexCouples = true; W.log.push({ y, t: 'law', text: `With most people now accepting, same-sex couples were allowed to marry.` }); }
    else if (S.sameSexCouples && t2.samesex <= -35) { S.sameSexCouples = false; W.log.push({ y, t: 'law', text: `With feeling turned against them, same-sex couples were no longer allowed to marry.` }); }
  }
}
// people who matter to someone: family at home, parents, children, partner and close friends
function closeCircle(W, p, y) {
  const ids = new Set([p.father, p.mother, p.spouse, ...p.children]);
  const h = W.households[p.household]; if (h) h.members.forEach(id => ids.add(id));
  for (const r of relsOf(W, p.id)) if (!r.ended && r.score >= 35) ids.add(r.a === p.id ? r.b : r.a);
  ids.delete(p.id);
  return [...ids].map(id => W.people[id]).filter(q => q && isAlive(q) && q.status === 'resident' && q.att);
}
// coming out, and how the people around them react
function comeOut(W, rng, p, k, issue, y, around) {
  const inn = p[k]; inn.out = y;
  const m = mindOf(p); m.yearStress = Math.max(0, m.yearStress - 15); m.joy += 10;
  if (k === 'inner') {
    const from = genderOf(p); p.gender = inn.felt;
    // many choose a new name
    if (rng.chance(inn.felt === 'nonbinary' ? 0.35 : 0.65)) {
      const C = CULTURES[p.culture]; const sx = inn.felt === 'man' ? 'm' : inn.felt === 'woman' ? 'f' : rng.pick(['m', 'f']);
      const L = C && (sx === 'm' ? C.male : C.female); const list = L ? nameList(L, p.born) : null;
      if (list && list.length) { p.firstAtBirth = p.firstAtBirth || p.first; p.first = rng.pick(list); }
    }
    addEvent(W, p, y, 'mind', `Came out, and from now on lives as ${GENDER_WORD[inn.felt]}${p.firstAtBirth && p.firstAtBirth !== p.first ? `, taking the name ${p.first}` : ''}.`, { why: `${cap(heShe(p))} had been living as ${GENDER_WORD[from]}.` });
  } else addEvent(W, p, y, 'mind', `Stopped hiding, and lives openly as ${p.orientation === 'gay' ? (p.sex === 'm' ? 'a gay man' : 'a lesbian') : 'bisexual'}.`);
  // a marriage of convenience may not survive it
  const sp = W.people[p.spouse];
  if (k === 'so' && sp && sp.sex !== p.sex && W.settings.divorce > 0 && rng.chance(0.4)) separate(W, rng, p, sp, y);
  for (const q of around) {
    const v = q.att ? q.att[issue] : 0; const r = getRel(W, p.id, q.id);
    if (v < -30) {
      const fam = [p.father, p.mother, p.spouse, ...p.children].includes(q.id) || q.household === p.household;
      const drop = -rng.int(10, 40) * (W.settings.attitudeEffect ?? 1);
      const rr = r || setRelIndexed(W, p.id, q.id, fam ? 'strained' : 'acquaintance', 0, y, 'family');
      rr.score = clamp(rr.score + drop, -100, 100);
      if (fam && v < -60 && rng.chance(0.35)) { rr.type = 'estranged'; relNote(rr, y, `@${q.id} turned away from @${p.id} after ${heShe(p)} came out.`); addEvent(W, p, y, 'loss', `@${q.id} turned ${hisHer(q)} back on ${himHer(p)} after ${heShe(p)} came out.`); }
      else relNote(rr, y, `@${q.id} took it badly when @${p.id} came out.`);
    } else if (v > 30) {
      if (r) { r.score = clamp(r.score + rng.int(5, 15), -100, 100); relNote(r, y, `@${q.id} stood by @${p.id} when ${heShe(p)} came out.`); }
    }
  }
}
// a new or opened town gets its attitudes, and every person their inner life
function livesUpgrade(W) {
  townAtt(W);
  if (W._livesReady) return;
  const rng = new Rng((W.seed * 4243 + 11) >>> 0);
  for (const p of lives(W)) livesInitPerson(W, rng, p, W.year);
  W._livesReady = true;
}
if (typeof module !== 'undefined') Object.assign(module.exports, { ISSUES, ATT_START, livesYear, livesUpgrade, canDoWork, injuryProneness, isDisabled, isDisfigured, severeInjury, CONDITION_EFFECTS, townAtt, marksOf, comeOut });
