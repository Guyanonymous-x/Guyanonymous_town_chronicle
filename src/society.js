// ================= Stage 2c: crime and justice, leaders and politics, reputation and gossip =================
// Rates and punishments are starting estimates with real-history roots, not exact history.

Object.assign(SETTING_INFO, {
  crime: { label: 'How much crime there is (1 = normal for this setting)', unit: 'factor', min: 0, max: 5 },
  gossip: { label: 'How fast gossip spreads (1 = normal)', unit: 'factor', min: 0, max: 5 }
});
for (const k of Object.keys(ERAS)) Object.assign(ERAS[k].settings, { crime: 1, gossip: 1 });

// crimes per 1,000 people per year (before personal circumstances)
const CRIME_RATES = {
  medieval: { theft: 22, assault: 9, fraud: 1, poaching: 6, murder: 0.25, arson: 0.3 },
  frontier: { theft: 20, assault: 12, fraud: 2, rustling: 4, murder: 0.5, arson: 0.3 },
  modern: { theft: 18, assault: 4, fraud: 3, drugs: 4, murder: 0.05, arson: 0.15 },
  fantasy: { theft: 20, assault: 9, fraud: 1.5, poaching: 5, murder: 0.3, arson: 0.3 },
  scifi: { theft: 8, assault: 3, fraud: 3, smuggling: 3, murder: 0.03, arson: 0.05 },
  dropped: { theft: 14, assault: 7, fraud: 0, murder: 0.25, arson: 0.1 }
};
const CRIME_WORDS = {
  theft: ['stole money from', 'stole tools from', 'stole a pig from', 'broke into the home of', 'pilfered goods from'],
  assault: ['beat', 'attacked', 'struck down', 'brawled with and badly hurt'],
  fraud: ['cheated', 'swindled', 'kept false accounts and cheated'],
  poaching: ['poached deer in the lord\'s forest'], rustling: ['stole cattle'], drugs: ['dealt drugs'], smuggling: ['smuggled contraband through the spaceport'],
  murder: ['murdered'], arson: ['set fire to the home of']
};
// how each setting deals with crime: detection chance, and punishment by crime and harshness
const JUSTICE = {
  medieval: { detect: 0.45, court: 'the manor court', punish: { theft: [['fined', 0.63], ['put in the pillory', 0.32], ['hanged as a felon', 0.05]], assault: [['fined', 0.85], ['put in the stocks', 0.15]], fraud: [['fined', 1]], poaching: [['fined heavily', 0.8], ['branded and fined', 0.2]], murder: [['hanged', 0.7], ['fled and was outlawed', 0.3]], arson: [['hanged', 0.6], ['outlawed', 0.4]] } },
  frontier: { detect: 0.4, court: 'the circuit judge', punish: { theft: [['jailed', 0.7], ['run out of town', 0.3]], assault: [['jailed', 0.6], ['fined', 0.4]], fraud: [['jailed', 0.8], ['run out of town', 0.2]], rustling: [['jailed', 0.6], ['hanged', 0.3], ['lynched by a mob', 0.1]], murder: [['hanged', 0.5], ['imprisoned', 0.42], ['lynched by a mob', 0.08]], arson: [['imprisoned', 0.7], ['hanged', 0.3]] } },
  modern: { detect: 0.3, court: 'the county court', punish: { theft: [['given probation', 0.8], ['jailed', 0.2]], assault: [['given probation', 0.55], ['jailed', 0.45]], fraud: [['given probation', 0.6], ['imprisoned', 0.4]], drugs: [['given probation', 0.65], ['imprisoned', 0.35]], murder: [['imprisoned', 1]], arson: [['imprisoned', 1]] } },
  fantasy: { detect: 0.45, court: 'the lord\'s justice', punish: { theft: [['put in the stocks', 0.5], ['fined', 0.3], ['branded a thief', 0.2]], assault: [['fined', 0.7], ['put in the stocks', 0.3]], fraud: [['fined', 0.7], ['banished', 0.3]], poaching: [['fined', 0.7], ['branded', 0.3]], murder: [['executed', 0.6], ['banished', 0.4]], arson: [['executed', 0.5], ['banished', 0.5]] } },
  scifi: { detect: 0.6, court: 'the colony tribunal', punish: { theft: [['fined', 0.85], ['confined', 0.15]], assault: [['fined', 0.5], ['confined', 0.5]], fraud: [['confined', 0.6], ['fined', 0.4]], smuggling: [['confined', 0.6], ['deported to Earth', 0.4]], murder: [['deported to Earth', 0.6], ['confined', 0.4]], arson: [['confined', 1]] } },
  dropped: { detect: 0.6, court: 'the settlement council', punish: { theft: [['given extra work and shamed', 0.8], ['banished for a time', 0.2]], assault: [['banished for a time', 0.5], ['given extra work and shamed', 0.5]], murder: [['banished into the wilderness', 0.7], ['executed by vote of the council', 0.3]], arson: [['banished into the wilderness', 1]] } }
};
const JAIL_YEARS = { jailed: [1, 1], imprisoned: [3, 20], confined: [1, 4], 'banished for a time': [1, 3] };

// offices
const OFFICES = {
  medieval: [{ key: 'lord', title: 'Lord of the manor', how: 'heir', occ: 'lord_of_the_manor' }, { key: 'reeve', title: 'Reeve', how: 'election', term: 1, seats: 1, voters: 'men', occ: 'reeve' }, { key: 'constable', title: 'Constable', how: 'appointment', term: 3, by: 'lord' }],
  frontier: [{ key: 'mayor', title: 'Mayor', how: 'election', term: 2, seats: 1, voters: 'men' }, { key: 'sheriff', title: 'Sheriff', how: 'election', term: 2, seats: 1, voters: 'men', occ: 'sheriff' }],
  modern: [{ key: 'mayor', title: 'Mayor', how: 'election', term: 4, seats: 1, voters: 'adults', occ: 'mayor' }, { key: 'council', title: 'Town council', how: 'election', term: 4, seats: 5, voters: 'adults' }, { key: 'chief', title: 'Police chief', how: 'appointment', term: 6, by: 'mayor', pool: /police/i }],
  fantasy: [{ key: 'lord', title: 'Lord', how: 'heir', occ: 'lord' }, { key: 'elder', title: 'Town elder', how: 'election', term: 3, seats: 1, voters: 'adults' }, { key: 'captain', title: 'Captain of the guard', how: 'appointment', term: 5, by: 'lord', pool: /man-at-arms|knight/i }],
  scifi: [{ key: 'admin', title: 'Colony administrator', how: 'appointment', term: 6, by: 'the Company', occ: 'colony_administrator' }, { key: 'council', title: 'Colony council', how: 'election', term: 3, seats: 5, voters: 'adults', occ: 'council_member' }],
  dropped: [{ key: 'leader', title: 'Speaker of the settlement', how: 'election', term: 2, seats: 1, voters: 'adults' }, { key: 'council', title: 'Settlement council', how: 'election', term: 2, seats: 5, voters: 'adults' }]
};
const LEAD_KEY = { medieval: 'lord', frontier: 'mayor', modern: 'mayor', fantasy: 'lord', scifi: 'admin', dropped: 'leader' };
// rules a leader may bring in, chosen by temperament
const LAWS = [
  { id: 'dues', name: 'raised the dues and taxes', fit: p => (100 - p.traits.A) + (50 - p.traits.C) / 2, fx: { dues: 0.06 }, approval: -15, eras: ['medieval', 'fantasy', 'frontier', 'modern', 'scifi'] },
  { id: 'relief', name: 'lowered the dues for hard-up households', fit: p => p.traits.A, fx: { dues: -0.04 }, approval: 12, eras: ['medieval', 'fantasy', 'frontier', 'modern', 'scifi'] },
  { id: 'watch', name: 'set up a night watch', fit: p => p.traits.C + p.traits.N / 2, fx: { detect: 0.15 }, approval: 4 },
  { id: 'harsh', name: 'ordered harsh punishments for crime', fit: p => (100 - p.traits.A) + p.traits.C / 2, fx: { harsh: 1, crime: -0.15 }, approval: -2 },
  { id: 'mercy', name: 'softened the punishments for petty crime', fit: p => p.traits.A + p.traits.O / 2, fx: { harsh: -1 }, approval: 3 },
  { id: 'school', name: 'paid for a school', fit: p => p.traits.O + p.traits.C / 2, fx: { schooling: 0.2 }, approval: 8, eras: ['medieval', 'fantasy', 'frontier', 'dropped'] },
  { id: 'healer', name: 'brought in a healer for the town', fit: p => p.traits.A + p.traits.C / 2, fx: { medicine: 0.06 }, approval: 10 },
  { id: 'temperance', name: 'closed the drinking houses on holy days', fit: p => p.traits.C + (100 - p.traits.O), fx: { drink: -1 }, approval: -6 },
  { id: 'fair', name: 'started a yearly fair', fit: p => p.traits.E + p.traits.O / 2, fx: { mood: 4, economy: 0.04 }, approval: 10 },
  { id: 'curfew', name: 'imposed a curfew', fit: p => p.traits.N + (100 - p.traits.O) / 2, fx: { crime: -0.1, mood: -2 }, approval: -8 },
  { id: 'granary', name: 'built a common granary against famine', fit: p => p.traits.C + p.traits.A / 2, fx: { famine: -0.3 }, approval: 12 }
];
const RUMORS = {
  medieval: ['stealing from the alms box', 'consorting with a witch', 'carrying on with a married man', 'cheating at the market scales', 'fathering a child in the next village'],
  frontier: ['cheating at cards', 'being a wanted man back East', 'carrying on with a married woman', 'stealing horses', 'watering the whiskey'],
  modern: ['cheating on taxes', 'having an affair', 'stealing from work', 'drinking on the job', 'dealing pills'],
  fantasy: ['dealing in dark magic', 'carrying on with a married man', 'stealing from the temple', 'being a goblin spy', 'cheating at dice'],
  scifi: ['stealing water rations', 'having an affair', 'sabotaging the reactor', 'selling data to rivals', 'faking safety logs'],
  dropped: ['hoarding food', 'stealing tools', 'having an affair', 'planning to leave with the best supplies', 'lying about their old life']
};

// ---------- set-up ----------
function socUpgrade(W) {
  if (W.soc) return;
  W.soc = { secrets: {}, nextSecret: 1, crimes: [], nextCrime: 1, offices: {}, elections: [], laws: [], approval: {} };
  const y = W.year;
  for (const p of Object.values(W.people)) if (p.status === 'resident' && p.died == null && p.standing == null) p.standing = baseStanding(W, p);
  // secrets that already exist
  for (const p of Object.values(W.people)) {
    if (p.secretFather && W.people[p.secretFather] && W.people[p.mother]) addSecret(W, 'child', [p.mother, p.secretFather, p.id], `@${p.secretFather} is the real father of @${p.id}, not the man everyone thinks.`, true, [p.mother, p.secretFather], p.born);
  }
  // offices: start with whoever already does the job
  for (const o of OFFICES[W.era] || []) {
    const holders = o.occ ? Object.values(W.people).filter(p => p.status === 'resident' && p.died == null && p.occId === o.occ).map(p => p.id) : [];
    W.soc.offices[o.key] = { key: o.key, title: o.title, holders: holders.slice(0, o.seats || 1), since: y, next: o.how === 'heir' ? null : y + (holders.length ? 1 + Math.floor(rng0(W.seed + o.key.length) % (o.term || 1)) : 0), history: holders.length ? [{ y, ids: holders.slice(0, o.seats || 1), how: 'already in office' }] : [] };
  }
}
function baseStanding(W, p) {
  const o = currentOcc(W, p);
  let s = 50 + (p.traits.A - 50) / 5 + (p.traits.C - 50) / 6 + (o && o.cls === 'high' ? 15 : o && o.cls === 'mid' ? 5 : 0);
  if (p.hermit) s -= 10;
  if (o && /lord|priest|pastor|doctor|judge|mayor|administrator|chaplain/i.test(o.name)) s += 15;
  return Math.round(clamp(s, 5, 95));
}
function standingWord(s) { return s >= 80 ? 'highly respected' : s >= 62 ? 'well thought of' : s >= 40 ? 'ordinary standing' : s >= 22 ? 'looked down on' : 'shunned'; }
function lawFx(W, k) { let v = 0; for (const l of (W.soc && W.soc.laws) || []) if (!l.ended && l.fx[k]) v += l.fx[k]; return v; }
function addSecret(W, kind, about, text, truth, knownBy, y) {
  const id = W.soc.nextSecret++;
  W.soc.secrets[id] = { id, kind, about: about.filter(Boolean), text, truth, knownBy: [...new Set(knownBy.filter(Boolean))], public: false, y };
  return W.soc.secrets[id];
}

// ---------- gossip ----------
function yearGossip(W, rng, y, R) {
  const people = lives(W);
  const adults = people.filter(p => ageOf(p, y) >= 14).length || 1;
  const G = W.settings.gossip;
  // new false rumours, mostly from people with grudges
  for (const r of Object.values(W.rels)) {
    if (r.ended || r.score > -35) continue;
    const a = W.people[r.a], b = W.people[r.b]; if (!a || !b || !isAlive(a) || !isAlive(b) || a.status !== 'resident' || b.status !== 'resident') continue;
    const [src, tgt] = rng.chance(0.5) ? [a, b] : [b, a];
    if (!rng.chance(0.04 * G * (1.3 - src.traits.A / 100))) continue;
    const what = rng.pick(RUMORS[W.era]);
    W._s = rng.int(0, 3);
    addSecret(W, 'rumor', [tgt.id], `@${tgt.id} has been ${what}.`, false, [src.id], y).source = src.id;
    addEvent(W, src, y, 'secret', `Started a false rumour that @${tgt.id} has been ${what}.`, { secret: true, why: `Bad blood: ${r.reason}.` });
  }
  // spreading
  for (const sct of Object.values(W.soc.secrets)) {
    if (sct.public || sct.dead) continue;
    if (sct.about.every(id => !W.people[id] || !isAlive(W.people[id]))) { sct.dead = y; continue; }
    const knowers = sct.knownBy.map(id => W.people[id]).filter(p => p && isAlive(p) && p.status === 'resident');
    const known = new Set(sct.knownBy);
    for (const k of knowers) {
      const self = sct.about.includes(k.id);
      const g = (k.traits.E + (100 - k.traits.A) + (100 - k.traits.C)) / 300;
      let tells = (self ? 0.03 : 0.25 + g * 1.1) * G * (sct.kind === 'rumor' ? 1.3 : 1);
      while (tells > 0) {
        if (!rng.chance(Math.min(1, tells))) break;
        tells -= 1;
        const pool = relsOf(W, k.id).filter(r => !r.ended && r.score > 15).map(r => r.a === k.id ? r.b : r.a);
        const h = W.households[k.household]; if (h) pool.push(...h.members);
        const cand = pool.filter(id => !known.has(id) && W.people[id] && isAlive(W.people[id]) && W.people[id].status === 'resident' && ageOf(W.people[id], y) >= 12);
        if (!cand.length) break;
        const t = rng.pick(cand); known.add(t); sct.knownBy.push(t);
      }
    }
    // a confession: guilt eats at people
    if (sct.kind === 'crime' && !sct.public) { const c = W.people[sct.about[0]]; if (c && isAlive(c) && c.mind && c.mind.guilt > 60 && rng.chance(0.15)) { W._s = rng.int(0, 3); addEvent(W, c, y, 'confession', 'Could not bear the guilt any longer, and confessed.'); goPublic(W, rng, sct, y, R, 'confession'); continue; } }
    const residentsKnowing = sct.knownBy.filter(id => W.people[id] && W.people[id].status === 'resident' && isAlive(W.people[id])).length;
    if (residentsKnowing >= Math.max(10, adults * 0.18)) { W._s = rng.int(0, 3); goPublic(W, rng, sct, y, R, 'gossip'); }
    else if (sct.kind === 'affair') {
      // the wronged spouse hears it
      const [x, lover] = sct.about.map(id => W.people[id]);
      const sp = x && W.people[x.spouse];
      if (sp && known.has(sp.id) && x.affair) { W._s = rng.int(0, 3); revealAffair(W, rng, x, lover, sp, y, R, 'gossip'); sct.public = y; }
    }
    if (sct.public && sct.knownBy.length > 0) sct.knownBy = sct.knownBy.slice(0, 40);
  }
}
function goPublic(W, rng, sct, y, R, how) {
  sct.public = y;
  const ppl = sct.about.map(id => W.people[id]).filter(Boolean);
  const hit = { affair: 15, child: 10, crime: 25, rumor: 12 }[sct.kind] || 10;
  for (const p of ppl) { if (!isAlive(p) || p.status !== 'resident') continue; if (sct.kind === 'child' && p.id === sct.about[2]) continue; p.standing = Math.round(clamp((p.standing ?? 50) - hit, 0, 100)); mindOf(p).yearStress += hit; addEvent(W, p, y, 'scandal', `Everyone heard: ${sct.text}${sct.truth ? '' : ' (It was a lie.)'}`.replace(/\(It was a lie\.\)/, ''), { why: how === 'confession' ? 'A confession.' : 'Gossip spread until the whole town knew.' }); }
  W.log.push({ y, s: W._s, t: 'scandal', text: `The talk of the town: ${sct.text}` });
  R.items.push({ k: 'scandal', text: `The talk of the town: ${sct.text}` });
  if (sct.kind === 'affair') { const [x, lover] = ppl; const sp = x && W.people[x.spouse]; if (sp && x.affair) revealAffair(W, rng, x, lover, sp, y, R, 'scandal'); }
  if (sct.kind === 'child') { const [mother, father, child] = ppl; const hus = mother && W.people[mother.spouse]; if (hus && hus.id !== (father && father.id) && isAlive(hus)) { const r = getRel(W, mother.id, hus.id); if (r) r.score = clamp(r.score - 35, -100, 100); mindOf(hus).yearStress += 30; addEvent(W, hus, y, 'betrayal', `Learned that @${child.id} is not his child but @${father.id}'s.`); const nr = setRelIndexed(W, hus.id, father.id, 'enemy', -rng.int(55, 90), y, `fathered a child with ${hus.first}'s wife`); relNote(nr, y, `@${hus.id} learned the truth about @${child.id}.`); } }
  if (sct.kind === 'crime' && sct.crime) { const c = W.soc.crimes.find(x => x.id === sct.crime); if (c && !c.solved) solveCrime(W, rng, c, y, R, how === 'confession' ? 'confessed' : 'word got around'); }
  if (sct.kind === 'rumor') {
    const t = ppl[0]; const src = W.people[sct.source];
    if (t && src && isAlive(t) && rng.chance(0.4 + t.traits.O / 300)) {
      const r = getRel(W, t.id, src.id); const nr = setRelIndexed(W, t.id, src.id, 'enemy', Math.min(r ? r.score : 0, 0) - rng.int(20, 40), r ? r.since : y, `spread lies about ${t.first}`);
      relNote(nr, y, `@${t.id} found out @${src.id} had started the rumour.`);
      addEvent(W, t, y, 'scandal', `Found out that @${src.id} started the lies about ${himHer(t)}.`);
      if (rng.chance(0.5)) { t.standing = Math.round(clamp(t.standing + hit * 0.8, 0, 100)); src.standing = Math.round(clamp((src.standing ?? 50) - 10, 0, 100)); addEvent(W, src, y, 'scandal', `Was shown up as a liar for spreading rumours about @${t.id}.`); }
    }
  }
}
function revealAffair(W, rng, x, lover, z, y, R, how) {
  if (!x || !lover || !z || !x.affair) return;
  x.affair = null; if (lover.affair === x.id) lover.affair = null;
  const r = getRel(W, x.id, z.id); if (r) r.score = clamp(r.score - rng.int(30, 60), -100, 100);
  addEvent(W, z, y, 'betrayal', `Found out that @${x.id} was having an affair with @${lover.id}.`, { why: how === 'gossip' ? 'Someone told.' : 'The whole town was talking.' });
  addEvent(W, x, y, 'betrayal', `The affair with @${lover.id} came out.`);
  const rl = setRelIndexed(W, z.id, lover.id, 'enemy', -rng.int(55, 95), y, `had an affair with ${z.first}'s ${rel3(x, 'husband', 'wife', 'partner')}`);
  relNote(rl, y, `@${z.id} learned of @${lover.id}'s affair with @${x.id}.`);
  mindOf(z).yearStress += 40; mindOf(z).trauma = clamp(mindOf(z).trauma + 15, 0, 100);
  addMemory(z, y, 'betrayal', x.id, 0.7, 'betrayed by an affair');
}

// ---------- crime ----------
function crimeProps(W, p, y) {
  const a = ageOf(p, y); if (a < 13 || a > 75) return 0;
  const h = W.households[p.household]; const m = p.mind || {};
  let v = (100 - p.traits.A) / 50 * (100 - p.traits.C) / 50;
  v *= a < 18 ? 0.8 : a < 30 ? 1.5 : a < 45 ? 1 : 0.5;
  v *= p.sex === 'm' ? 1.6 : 0.6;
  if (h && h.wealth < 25 && W.era !== 'dropped') v *= 1.8;
  if ((m.drink || 0) > 50) v *= 1.6;
  if (/Unemployed|Odd jobs/.test(p.occupation || '')) v *= 1.7;
  if (p.record) v *= 1.5;
  if (p.standing != null && p.standing > 70) v *= 0.6;
  return v;
}
function yearCrime(W, rng, y, R) {
  const people = lives(W).filter(p => isAlive(p));
  const rates = CRIME_RATES[W.era];
  const Y = W._Y || {};
  const hard = (Y.famine ? 1 + Y.famine * 2 : 1) * (W.econ && W.econ.economy < 0.85 ? 1.3 : 1);
  const mult = W.settings.crime * Math.max(0.2, 1 + lawFx(W, 'crime')) * people.length / 1000;
  const weights = people.map(p => [p, crimeProps(W, p, y)]).filter(x => x[1] > 0);
  for (const [type, rate] of Object.entries(rates)) {
    let n = rate * mult * (type === 'theft' || type === 'poaching' || type === 'rustling' ? hard : 1);
    let count = Math.floor(n) + (rng.chance(n - Math.floor(n)) ? 1 : 0);
    for (let i = 0; i < count; i++) {
      W._s = rng.int(0, 3);
      let culprit, victim = null;
      if (type === 'murder' || type === 'assault' || type === 'arson') {
        // grudges first
        const grudges = Object.values(W.rels).filter(r => !r.ended && r.score <= (type === 'murder' ? -60 : -35));
        const cand = grudges.map(r => { const a = W.people[r.a], b = W.people[r.b]; if (!a || !b || !isAlive(a) || !isAlive(b) || a.status !== 'resident' || b.status !== 'resident') return null; const [c, v] = crimeProps(W, a, y) >= crimeProps(W, b, y) ? [a, b] : [b, a]; return [[c, v, r], crimeProps(W, c, y) * (-r.score / 50)]; }).filter(Boolean);
        if (cand.length && rng.chance(type === 'murder' ? 0.75 : 0.55)) { const pick = rng.weighted(cand); [culprit, victim] = pick; }
      }
      if (!culprit) culprit = rng.weighted(weights);
      if (!culprit || !isAlive(culprit) || culprit.status !== 'resident') continue;
      if (!victim && type !== 'poaching' && type !== 'rustling' && type !== 'drugs' && type !== 'smuggling') {
        const pool = people.filter(q => q.id !== culprit.id && q.household !== culprit.household && ageOf(q, y) >= 16 && isAlive(q));
        if (type === 'theft' || type === 'fraud') { const rich = pool.filter(q => W.households[q.household] && W.households[q.household].wealth >= 45); victim = rng.pick(rich.length ? rich : pool); }
        else victim = rng.pick(pool);
      }
      if (victim && (!isAlive(victim) || victim.status !== 'resident')) continue;
      commitCrime(W, rng, y, R, type, culprit, victim);
    }
  }
  // revenge: families of the murdered sometimes take matters into their own hands
  for (const c of W.soc.crimes.filter(c => c.type === 'murder' && c.solved && c.y >= y - 10 && !c.avenged)) {
    const killer = W.people[c.culprit]; if (!killer || !isAlive(killer) || killer.status !== 'resident') continue;
    const victim = W.people[c.victim];
    const kin = [victim.spouse, victim.father, victim.mother, ...victim.children, ...siblingsOf(W, victim)].map(id => W.people[id]).filter(q => q && isAlive(q) && q.status === 'resident' && ageOf(q, y) >= 16);
    for (const q of kin) if (rng.chance(0.04 * (1.4 - q.traits.A / 100))) { W._s = rng.int(0, 3); c.avenged = y; commitCrime(W, rng, y, R, rng.chance(0.3) ? 'murder' : 'assault', q, killer, `revenge for @${victim.id}`); break; }
  }
  // prison terms end
  for (const p of Object.values(W.people)) if (p.status === 'prison' && p.died == null && p.prisonUntil <= y) releasePrisoner(W, rng, p, y);
}
function commitCrime(W, rng, y, R, type, culprit, victim, motive, forceCaught) {
  const J = JUSTICE[W.era];
  const id = W.soc.nextCrime++;
  const verb = rng.pick(CRIME_WORDS[type] || ['wronged']);
  const c = { id, y, s: W._s, type, culprit: culprit.id, victim: victim ? victim.id : null, solved: false, motive: motive || null };
  W.soc.crimes.push(c);
  const r = victim ? getRel(W, culprit.id, victim.id) : null;
  if (!motive) c.motive = r && r.score < -30 ? `bad blood: ${r.reason}` : (type === 'theft' ? (W.households[culprit.household] && W.households[culprit.household].wealth < 25 ? 'need' : 'greed') : null);
  const cm = mindOf(culprit);
  cm.guilt = clamp(cm.guilt + ({ murder: 50, arson: 30, assault: 12, theft: 8, fraud: 8 }[type] || 5) * (culprit.traits.A / 60), 0, 100);
  R.crimes = (R.crimes || 0) + 1;
  // what happens to the victim
  if (type === 'theft' || type === 'fraud') { const h = W.households[victim.household]; if (h && h.savings > 0) { const amt = Math.round(h.savings * rng.range(0.05, 0.25) + (ECON[W.era] ? ECON[W.era].income.low * 0.1 : 0)); h.savings -= amt; const ch = W.households[culprit.household]; if (ch) ch.savings = (ch.savings || 0) + amt; c.amount = amt; setWealth(W, h); if (ch) setWealth(W, ch); } mindOf(victim).yearStress += 12; }
  if (type === 'assault') { injure(W, rng, victim, y, W._s, R, 'fighting'); mindOf(victim).trauma = clamp(mindOf(victim).trauma + 15, 0, 100); }
  if (type === 'arson') { const h = W.households[victim.household]; if (h) { if (h.property) h.property = Math.round(h.property * 0.4); if (h.savings > 0) h.savings = Math.round(h.savings * 0.7); setWealth(W, h); for (const id of h.members) { const q = W.people[id]; if (q && isAlive(q)) { mindOf(q).trauma = clamp(mindOf(q).trauma + 20, 0, 100); addEvent(W, q, y, 'crime', 'The home was set on fire in the night.'); } } } }
  if (type === 'murder') { die(W, rng, victim, y, 'murdered', 'violence', R); c.victimDied = !isAlive(victim); }
  // was it seen? caught?
  const lawmen = lives(W).filter(p => /constable|sheriff|deputy|police|security|man-at-arms|guard|reeve/i.test(p.occupation || '')).length;
  let detect = J.detect + lawFx(W, 'detect') + Math.min(0.15, lawmen * 0.02) - (culprit.intellect - 50) / 250 + ({ murder: 0.25, assault: 0.3, arson: -0.1, fraud: -0.1, theft: -0.05 }[type] || 0);
  if (W.era === 'dropped') detect += 0.1;
  const caught = forceCaught === true ? true : forceCaught === false ? false : rng.chance(clamp(detect, 0.05, 0.95));
  const vtext = victim ? ` @${victim.id}` : '';
  addEvent(W, culprit, y, 'crime', `${cap(verb)}${vtext}.`, { secret: !caught, why: c.motive ? cap(c.motive.replace(/@(\d+)/g, '@$1')) + '.' : null });
  if (victim && type !== 'murder') addEvent(W, victim, y, 'crime', `Was the victim of a crime: ${type === 'theft' ? 'robbed' : type === 'fraud' ? 'cheated' : type === 'assault' ? 'attacked' : 'targeted'}${caught ? ` by @${culprit.id}` : ' — nobody knows by whom'}.`);
  if (type === 'murder' && !caught) { const sct = addSecret(W, 'crime', [culprit.id], `@${culprit.id} murdered @${victim.id}.`, true, [culprit.id], y); sct.crime = id; W.log.push({ y, s: W._s, t: 'crime', text: `@${victim.id} was found murdered. Nobody knows who did it.` }); R.items.push({ k: 'murder', text: `@${victim.id} was found murdered, and the killer was not found.` }); }
  if (!caught && type !== 'murder') {
    if (rng.chance(0.25)) { const sct = addSecret(W, 'crime', [culprit.id], `@${culprit.id} ${verb}${vtext}.`, true, [culprit.id], y); sct.crime = id; const pals = relsOf(W, culprit.id).filter(r => !r.ended && r.score > 50).map(r => r.a === culprit.id ? r.b : r.a); if (pals.length) sct.knownBy.push(rng.pick(pals)); }
    // sometimes the wrong person is blamed
    if (victim && forceCaught !== false && rng.chance(0.06)) {
      const suspects = lives(W).filter(q => q.id !== culprit.id && q.id !== victim.id && ageOf(q, y) >= 16 && ((q.standing ?? 50) < 35 || (getRel(W, q.id, victim.id) && getRel(W, q.id, victim.id).score < -30)));
      if (suspects.length) { const inn = rng.pick(suspects); c.wronglyBlamed = inn.id; judge(W, rng, c, inn, y, R, true); }
    }
    return c;
  }
  if (caught) solveCrime(W, rng, c, y, R, 'caught');
  return c;
}
function solveCrime(W, rng, c, y, R, how) {
  const culprit = W.people[c.culprit];
  c.solved = y; c.how = how;
  if (c.wronglyBlamed) { const inn = W.people[c.wronglyBlamed]; if (inn) { inn.standing = Math.round(clamp((inn.standing ?? 50) + 15, 0, 100)); addEvent(W, inn, y, 'justice', `Cleared at last: the real culprit was @${culprit.id}.`); c.cleared = y; } }
  if (!culprit || !isAlive(culprit) || culprit.status !== 'resident') return;
  for (const s of Object.values(W.soc.secrets)) if (s.crime === c.id) s.public = s.public || y;
  judge(W, rng, c, culprit, y, R, false);
}
function judge(W, rng, c, who, y, R, wrongful) {
  const J = JUSTICE[W.era];
  const table = J.punish[c.type] || [['fined', 1]];
  const harsh = lawFx(W, 'harsh');
  let p = table.map(([k, w], i) => [k, w * (i === table.length - 1 ? Math.pow(2, harsh) : 1)]);
  if (who.record && who.record.length) p = p.map(([k, w], i) => [k, w * (i ? 1.6 : 0.8)]);
  const outcome = rng.weighted(p);
  const victim = W.people[c.victim];
  c.punishment = wrongful ? null : outcome; if (wrongful) c.wrongfulPunishment = outcome;
  who.record = (who.record || []).concat({ y, type: c.type, outcome, wrongful: !!wrongful, crime: c.id });
  who.standing = Math.round(clamp((who.standing ?? 50) - ({ murder: 40, arson: 30, assault: 15, theft: 15, fraud: 18 }[c.type] || 10), 0, 100));
  const what = `${c.type === 'theft' ? 'theft' : c.type === 'fraud' ? 'fraud' : c.type}${victim ? ` against @${victim.id}` : ''}`;
  addEvent(W, who, y, 'justice', `${wrongful ? 'Wrongly accused of' : 'Caught and judged for'} ${what} by ${J.court}: ${outcome}.`, wrongful ? { why: 'Someone had to be blamed, and people already thought the worst of ' + himHer(who) + '.' } : null);
  mindOf(who).yearStress += 30; mindOf(who).trauma = clamp(mindOf(who).trauma + (wrongful ? 25 : 10), 0, 100);
  ripple(W, rng, who, y, 'shame', 20, `{who} was ${wrongful ? 'accused' : 'convicted'} of ${c.type}: ${outcome}.`);
  if (victim && isAlive(victim) && !wrongful) { const r = getRel(W, victim.id, who.id); const nr = setRelIndexed(W, victim.id, who.id, 'enemy', Math.min(r ? r.score : 0, 0) - 30, r ? r.since : y, `${who.first} committed ${c.type} against ${victim.first}`); relNote(nr, y, `@${who.id} was convicted of ${c.type} against @${victim.id}.`); }
  W.log.push({ y, s: W._s, t: 'justice', text: `@${who.id} was ${wrongful ? 'wrongly accused' : 'convicted'} of ${what}: ${outcome}.` });
  if (c.type === 'murder' || /hanged|executed|lynched/.test(outcome)) R.items.push({ k: 'justice', text: `@${who.id} was ${wrongful ? 'wrongly convicted' : 'convicted'} of ${what}: ${outcome}.` });
  // carrying it out
  if (/hanged|executed|lynched/.test(outcome)) { die(W, rng, who, y, outcome.replace('by vote of the council', '') .replace(/^(\w+)/, '$1') + ` for ${c.type}`, 'violence', R); return; }
  if (/fined/.test(outcome)) { const h = W.households[who.household]; if (h && ECON[W.era]) { h.savings = (h.savings || 0) - Math.round(ECON[W.era].income.low * (/heavily/.test(outcome) ? 0.8 : 0.3)); setWealth(W, h); } }
  if (/pillory|stocks|branded|shamed/.test(outcome)) { who.standing = Math.round(clamp(who.standing - 10, 0, 100)); mindOf(who).yearStress += 15; }
  if (/run out of town|outlawed|banished into|deported|fled/.test(outcome)) { leaveJob(W, rng, who, y, 'was driven out'); departPerson(W, who, y, rng); who.events[who.events.length - 1].text = `Gone from ${W.name}: ${outcome}.`; return; }
  const yrs = JAIL_YEARS[outcome] || (/jailed|confined/.test(outcome) ? [1, 2] : /imprisoned/.test(outcome) ? (c.type === 'murder' ? [12, 30] : [2, 6]) : null);
  if (yrs) {
    const n = rng.int(yrs[0], yrs[1]);
    leaveJob(W, rng, who, y, 'was locked up'); leaveHousehold(W, who);
    who.prevHousehold = who.household; who.status = 'prison'; who.prisonUntil = y + n; who.occId = null; who.occupation = /banished/.test(outcome) ? 'Banished for a time' : 'In prison';
    who.events[who.events.length - 1].text += ` (${n} year${n > 1 ? 's' : ''})`;
    for (const g of Object.values(W.groups)) if (g.members.includes(who.id)) { g.members = g.members.filter(x => x !== who.id); g.past.push({ id: who.id, y, why: 'locked up' }); }
    const sp = W.people[who.spouse];
    if (sp && isAlive(sp) && (c.type === 'murder' || n >= 5) && W.settings.divorce > 0 && rng.chance(0.4)) { separate(W, rng, who, sp, y); W.households[who.household] && leaveHousehold(W, who); }
  }
}
function releasePrisoner(W, rng, p, y) {
  W._s = rng.int(0, 3);
  p.status = 'resident'; delete p.prisonUntil;
  const sp = W.people[p.spouse];
  const back = sp && isAlive(sp) && sp.status === 'resident' ? W.households[sp.household] : (W.households[p.prevHousehold] && W.households[p.prevHousehold].members.some(id => W.people[id] && W.people[id].status === 'resident') ? W.households[p.prevHousehold] : null);
  if (back) moveToHousehold(W, p, back); else newHousehold(W, rng, [p], y);
  p.occupation = W.settings.familySizeLimit ? 'Unemployed (looking for work)' : 'Odd jobs';
  addEvent(W, p, y, 'justice', back ? 'Came home after serving the sentence.' : 'Came back after serving the sentence, to a life that had moved on.');
  mindOf(p).trauma = clamp(mindOf(p).trauma + 10, 0, 100);
}

// ---------- leaders and politics ----------
function yearPolitics(W, rng, y, R) {
  const defs = OFFICES[W.era] || [];
  const people = lives(W).filter(p => isAlive(p));
  for (const o of defs) {
    const off = W.soc.offices[o.key] || (W.soc.offices[o.key] = { key: o.key, title: o.title, holders: [], since: y, next: y, history: [] });
    // holders who died or left
    const before = off.holders.slice();
    off.holders = off.holders.filter(id => { const p = W.people[id]; return p && isAlive(p) && p.status === 'resident'; });
    W._s = rng.int(0, 3);
    if (o.how === 'heir') {
      const cur = people.find(p => p.occId === o.occ);
      if (cur) { if (!off.holders.includes(cur.id)) { off.holders = [cur.id]; off.since = y; off.history.push({ y, ids: [cur.id], how: 'inherited' }); } }
      else {
        const old = W.people[before[0]] || W.people[(off.history[off.history.length - 1] || { ids: [] }).ids[0]];
        const heirs = old ? old.children.map(id => W.people[id]).filter(c => c && isAlive(c) && c.status === 'resident' && ageOf(c, y) >= 14).sort((a, b) => (a.sex === b.sex ? a.born - b.born : (a.sex === 'm' ? -1 : 1))) : [];
        const heir = heirs[0] || (old && W.people[old.spouse] && isAlive(W.people[old.spouse]) ? W.people[old.spouse] : null) || people.filter(p => ageOf(p, y) >= 25).sort((a, b) => (b.standing || 50) - (a.standing || 50))[0];
        if (heir) {
          const oc = eraOf(W).occupations.find(x => x.id === o.occ);
          if (oc) { leaveJob(W, rng, heir, y, 'took up the title'); heir.occId = oc.id; heir.occupation = oc.name; placeInWorkplace(W, rng, heir, oc, y); }
          off.holders = [heir.id]; off.since = y; off.history.push({ y, ids: [heir.id], how: heirs[0] === heir ? 'inherited' : 'took the title' });
          addEvent(W, heir, y, 'office', `Became ${o.title.toLowerCase()}${old ? ` after @${old.id}` : ''}.`);
          W.log.push({ y, s: W._s, t: 'office', text: `@${heir.id} became ${o.title.toLowerCase()}.` }); R.items.push({ k: 'office', text: `@${heir.id} became ${o.title.toLowerCase()}.` });
          heir.standing = Math.round(clamp((heir.standing ?? 50) + 15, 0, 100));
          enactLaw(W, rng, heir, y, o, true);
        }
      }
      continue;
    }
    const due = off.next == null || y >= off.next || off.holders.length < (o.seats || 1) && before.length > off.holders.length;
    if (!due) continue;
    if (o.how === 'appointment') {
      const by = o.by === 'lord' ? W.soc.offices.lord : o.by === 'mayor' ? W.soc.offices.mayor : null;
      const boss = by && W.people[by.holders[0]];
      const busy = p => Object.values(W.soc.offices).some(x => x.key !== o.key && x.holders.includes(p.id));
      let pool = people.filter(p => ageOf(p, y) >= 25 && ageOf(p, y) <= 65 && !p.record && !busy(p) && (!o.pool || o.pool.test(p.occupation || '')));
      if (!pool.length) pool = people.filter(p => ageOf(p, y) >= 25 && ageOf(p, y) <= 65 && !p.record && !busy(p));
      if (!pool.length) continue;
      const pick = rng.weighted(pool.map(p => [p, Math.max(1, (p.standing || 50) + ((p.skills && p.skills.leadership) || 30) + (boss ? relScore(W, boss.id, p.id) + (closelyRelated(W, boss, p) ? 40 : 0) : 0))]));
      const kept = off.holders.includes(pick.id);
      setOfficeOccs(W, rng, o, [pick.id], off.holders.slice(), y);
      off.holders = [pick.id]; off.since = kept ? off.since : y; off.next = y + (o.term || 4);
      off.history.push({ y, ids: [pick.id], how: kept ? `kept on by ${boss ? '@' + boss.id : o.by}` : `appointed by ${boss ? '@' + boss.id : o.by}` });
      if (!kept) { addEvent(W, pick, y, 'office', `Appointed ${o.title.toLowerCase()}${boss ? ` by @${boss.id}` : ` by ${o.by}`}.`); pick.standing = Math.round(clamp((pick.standing ?? 50) + 8, 0, 100)); if (boss && closelyRelated(W, boss, pick)) { for (const p of people) if (rng.chance(0.1)) mindOf(p).yearStress += 2; } }
      if (o.key === 'admin' && !kept) enactLaw(W, rng, pick, y, o, true);
      continue;
    }
    runElection(W, rng, y, R, o, off);
  }
  // the leader may bring in rules; people judge them
  const lead = W.soc.offices[LEAD_KEY[W.era]];
  const leader = lead && W.people[lead.holders[0]];
  for (const l of W.soc.laws) if (!l.ended && l.by && (!leader || l.by !== leader.id) && !l.lasting) { l.ended = y; W.log.push({ y, t: 'law', text: `The rule that @${l.by} ${l.name} lapsed.` }); }
  if (leader && rng.chance(0.18)) enactLaw(W, rng, leader, y, null, false);
  if (leader) {
    let sum = 0, n = 0;
    for (const p of people) { if (ageOf(p, y) < 16 || p.id === leader.id) continue; sum += 50 + relScore(W, p.id, leader.id) * 0.4 + ((p.mind && p.mind.mood) || 0) * 0.3 + (closelyRelated(W, p, leader) ? 20 : 0); n++; }
    let appr = n ? sum / n : 50;
    for (const l of W.soc.laws) if (!l.ended && l.by === leader.id) appr += l.approval * 0.6;
    if (W._Y && W._Y.famine) appr -= 15;
    appr = Math.round(clamp(appr + ((leader.standing ?? 50) - 50) * 0.3, 0, 100));
    W.soc.approval[y] = { who: leader.id, v: appr };
    if (appr < 30 && rng.chance(0.35)) {
      W._s = rng.int(0, 3);
      const what = { medieval: 'The villagers refused their boon work for the lord until he listened.', fantasy: 'Townsfolk gathered at the keep gate in angry protest.', frontier: 'An angry town meeting demanded the mayor step down.', modern: 'Residents packed a town hall meeting calling for a recall.', scifi: 'Workers staged a slowdown in protest at the administrator.', dropped: 'People shouted down the speaker at the evening meeting.' }[W.era];
      W.log.push({ y, s: W._s, t: 'unrest', text: what }); R.items.push({ k: 'unrest', text: what });
      addEvent(W, leader, y, 'office', `Faced open anger from the people (approval ${appr}%).`);
      mindOf(leader).yearStress += 20;
      if (lead && LEAD_KEY[W.era] !== 'lord' && lead.next != null) lead.next = Math.min(lead.next, y + 1);
      else if (rng.chance(0.5)) { const bad = W.soc.laws.filter(l => !l.ended && l.by === leader.id && l.approval < 0); if (bad.length) { const l = rng.pick(bad); l.ended = y; W.log.push({ y, t: 'law', text: `Under pressure, @${leader.id} undid the rule: ${l.name}.` }); } }
    }
  }
  // reputations drift back towards what people's lives deserve
  for (const p of people) {
    if (p.standing == null) p.standing = baseStanding(W, p);
    const base = baseStanding(W, p) - (p.record ? Math.min(30, p.record.filter(r => !r.wrongful).length * 10) : 0) - ((p.mind && p.mind.drink > 60) ? 8 : 0) + (Object.values(W.soc.offices).some(o => o.holders.includes(p.id)) ? 10 : 0);
    p.standing = Math.round(clamp(p.standing + (base - p.standing) * 0.08, 0, 100));
  }
}
function voteEligible(W, p, y, who) {
  const a = ageOf(p, y); if (a < 18) return false;
  if (who === 'men') return p.sex === 'm' && a >= 21;
  return true;
}
function runElection(W, rng, y, R, o, off) {
  const people = lives(W).filter(p => isAlive(p));
  const seats = o.seats || 1;
  const otherOffice = p => Object.values(W.soc.offices).some(x => x.key !== o.key && x.holders.includes(p.id) && !(x.key === 'council' || o.key === 'council'));
  const pool = people.filter(p => ageOf(p, y) >= 25 && ageOf(p, y) <= 75 && (o.voters !== 'men' || p.sex === 'm') && !p.hermit && p.status === 'resident' && !otherOffice(p));
  if (!pool.length) return;
  const scoreOf = p => (p.standing ?? 50) + ((p.skills && p.skills.leadership) || 30) + p.traits.E / 2 + (off.holders.includes(p.id) ? 25 : 0) + rng.range(0, 40);
  const cands = pool.map(p => [p, scoreOf(p)]).sort((a, b) => b[1] - a[1]).slice(0, Math.min(pool.length, seats + rng.int(1, 3))).map(x => x[0]);
  const votes = new Map(cands.map(c => [c.id, 0]));
  const voters = people.filter(p => voteEligible(W, p, y, o.voters));
  for (const v of voters) {
    const ranked = cands.map(c => {
      let s = (c.standing ?? 50) * 0.5 + relScore(W, v.id, c.id) * 0.6 + (closelyRelated(W, v, c) || v.spouse === c.id ? 35 : 0) + (v.household === c.household ? 30 : 0) + (v.culture === c.culture ? 6 : 0) + (v.faith === c.faith ? 5 : 0) - (feudBetween(W, v, c) ? 40 : 0) + rng.range(-15, 15);
      if (off.holders.includes(c.id) && W.soc.approval[y - 1]) s += (W.soc.approval[y - 1].v - 50) * 0.4;
      return [c, s];
    }).sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < Math.min(seats, ranked.length); i++) votes.set(ranked[i][0].id, votes.get(ranked[i][0].id) + 1);
  }
  const results = [...votes.entries()].sort((a, b) => b[1] - a[1]);
  const winners = results.slice(0, seats).map(r => r[0]);
  const prev = off.holders.slice();
  off.holders = winners; off.next = y + (o.term || 2); if (!winners.every(w => prev.includes(w))) off.since = y;
  off.history.push({ y, ids: winners, how: 'elected' });
  setOfficeOccs(W, rng, o, winners, prev, y);
  W.soc.elections.push({ y, s: W._s, office: o.key, title: o.title, results: results.map(([id, v]) => ({ id, v })), winners, voters: voters.length });
  for (const [id, v] of results) {
    const p = W.people[id]; const won = winners.includes(id);
    addEvent(W, p, y, 'election', `${won ? (prev.includes(id) ? 'Re-elected' : 'Elected') : 'Lost the vote for'} ${o.title.toLowerCase()} (${v} of ${voters.length} votes).`);
    if (won) { mindOf(p).joy += 15; p.standing = Math.round(clamp((p.standing ?? 50) + 6, 0, 100)); ripple(W, rng, p, y, 'pride', 8, null); }
    else { mindOf(p).yearStress += 10; for (const w of winners) if (rng.chance(0.25) && w !== id) { const r = getRel(W, id, w); const nr = setRelIndexed(W, id, w, (r ? r.score : 0) - 20 <= -55 ? 'enemy' : 'rival', (r ? r.score : 0) - rng.int(10, 30), r ? r.since : y, `lost the vote for ${o.title.toLowerCase()} to ${W.people[w].first}`); relNote(nr, y, `@${w} beat @${id} for ${o.title.toLowerCase()}.`); } }
  }
  const txt = `${o.title}: ${winners.map(w => '@' + w).join(', ')} ${prev.length && winners.every(w => prev.includes(w)) ? 'kept the seat' + (seats > 1 ? 's' : '') : 'won the vote'} (${voters.length} voted).`;
  W.log.push({ y, s: W._s, t: 'election', text: txt }); R.items.push({ k: 'election', text: txt });
  if (o.key === LEAD_KEY[W.era] && !prev.includes(winners[0])) enactLaw(W, rng, W.people[winners[0]], y, o, true);
}
function enactLaw(W, rng, leader, y, o, onTakingOffice) {
  if (!leader) return;
  if (!onTakingOffice && W.soc.laws.filter(l => !l.ended && l.by === leader.id).length >= 3) return;
  const opts = LAWS.filter(l => (!l.eras || l.eras.includes(W.era)) && !W.soc.laws.some(x => !x.ended && x.id === l.id));
  if (!opts.length) return;
  const law = rng.weighted(opts.map(l => [l, Math.max(1, l.fit(leader) - 40)]));
  W.soc.laws.push({ id: law.id, name: law.name, fx: law.fx, approval: law.approval, by: leader.id, y });
  addEvent(W, leader, y, 'office', `As leader, ${law.name}.`);
  W.log.push({ y, s: W._s, t: 'law', text: `@${leader.id} ${law.name}.` });
  W._R && W._R.items.push({ k: 'law', text: `@${leader.id} ${law.name}.` });
}
function isOfficeOcc(W, id) { return (OFFICES[W.era] || []).some(o => o.occ === id); }
function setOfficeOccs(W, rng, o, winners, prev, y) {
  if (!o.occ) return;
  const oc = eraOf(W).occupations.find(x => x.id === o.occ); if (!oc) return;
  for (const id of prev) if (!winners.includes(id)) { const p = W.people[id]; if (p && p.occId === o.occ) { leaveJob(W, rng, p, y, 'lost the office'); p.occId = null; p.occupation = W.settings.familySizeLimit ? 'Unemployed (looking for work)' : 'Odd jobs'; } }
  for (const id of winners) { const p = W.people[id]; if (p && p.occId !== o.occ) { leaveJob(W, rng, p, y, 'took office'); p.occId = oc.id; p.occupation = oc.name; p.jobSince = y; placeInWorkplace(W, rng, p, oc, y); } }
}
// apply rules that change other parts of life (called at the start of the year)
function lawsApply(W) {
  const fx = k => lawFx(W, k);
  W._lawMed = fx('medicine'); W._lawSchool = fx('schooling');
}

if (typeof module !== 'undefined') Object.assign(module.exports, { socUpgrade, standingWord });

// ---------- history periods (V10) ----------
CRIME_RATES.victorian = CRIME_RATES.edwardian = Object.assign({}, CRIME_RATES.frontier);
JUSTICE.tudor = Object.assign({}, JUSTICE.medieval, { court: 'the justices at the quarter sessions' });
JUSTICE.georgian = Object.assign({}, JUSTICE.medieval, { court: 'the justices at the quarter sessions', punish: Object.assign({}, JUSTICE.medieval.punish, { theft: [['whipped', 0.45], ['imprisoned', 0.3], ['transported to the colonies', 0.2], ['hanged', 0.05]] }) });
// English courts: no lynching (hanged instead) and no running people out of town (a spell in jail instead)
const IND_PUNISH = (j) => Object.assign({}, j, { court: 'the magistrates\' court', punish: Object.fromEntries(Object.entries(j.punish).map(([k, v]) => {
  const m = new Map(); for (const [w, p] of v) { const w2 = /lynch/.test(w) ? 'hanged' : /run out of town/.test(w) ? 'jailed' : w; m.set(w2, (m.get(w2) || 0) + p); } return [k, [...m.entries()]]; })) });
JUSTICE.victorian = IND_PUNISH(JUSTICE.frontier);
JUSTICE.edwardian = IND_PUNISH(JUSTICE.frontier);
OFFICES.victorian = OFFICES.edwardian = [{ key: 'mayor', title: 'Mayor', how: 'election', term: 1, seats: 1, voters: 'men' }, { key: 'sheriff', title: 'Police inspector', how: 'appointment', term: 5, by: 'mayor', occ: 'sheriff' }];
RUMORS.tudor = ['hearing Mass in secret', 'consorting with a witch', 'carrying on with a married man', 'cheating at the market scales', 'fathering a child in the next parish'];
RUMORS.georgian = ['poaching the squire\'s pheasants', 'running up debts in London', 'carrying on with a married man', 'watering the ale', 'being a Jacobite'];
RUMORS.victorian = RUMORS.edwardian = ['drinking the rent money', 'carrying on with the lodger', 'informing for the mill owners', 'pawning the Sunday best', 'a child born too soon after the wedding'];
periodFill(CRIME_RATES, CRIME_WORDS, JUSTICE, OFFICES, LEAD_KEY, RUMORS);
periodFillLists(LAWS);
