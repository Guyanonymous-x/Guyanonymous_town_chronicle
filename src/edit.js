// ================= Stage 5: the storyteller — edits now, plans for the coming year =================
function logEdit(W, text) { W.edits = W.edits || []; W.edits.push({ y: W.year, at: new Date().toISOString(), text }); }
function livingResident(W, id) { const p = W.people[id]; return p && p.died == null && p.status === 'resident' ? p : null; }
const NONWORK_ROLES = W => { const e = eraOf(W); const m = !!W.settings.familySizeLimit; return [e.youngChild, e.childWork, m ? 'Student (grade school)' : `Pupil at ${e.schoolName}`, ...(m ? ['Student (high school)', 'College student'] : []), e.homemaker, e.retired, m ? 'Unemployed (looking for work)' : 'Odd jobs', ...(m ? ['Unable to work (disability)'] : [])]; };
function jobChoices(W, p) {
  if (W.era === 'dropped') return droppedRoles(W).map(r => ({ id: 'role_' + r.name.toLowerCase().replace(/[^a-z]+/g, '_'), name: r.name, skill: r.skill }));
  const a = ageOf(p, W.year);
  return eraOf(W).occupations.filter(o => !o.apprentice && !o.spouseOf && a >= Math.min(o.min, 12) && !(o.celibate && (p.spouse || p.children.length)));
}

// ---------- direct changes (take effect now) ----------
const EDIT_NUM = { health: [1, 100], intellect: [1, 99], standing: [0, 100], 'traits.O': [1, 99], 'traits.C': [1, 99], 'traits.E': [1, 99], 'traits.A': [1, 99], 'traits.N': [1, 99], 'mind.mood': [-100, 100], 'mind.stress': [0, 100], 'mind.trauma': [0, 100], 'mind.guilt': [0, 100], 'mind.drink': [0, 100] };
function editPerson(W, id, field, value) {
  const p = W.people[id]; if (!p) return 'That person is not in the records.';
  const rng = new Rng((Date.now() ^ id) >>> 0);
  const was = (() => { try { return field.split('.').reduce((o, k) => o[k], p); } catch (e) { return undefined; } })();
  if (field === 'first' || field === 'last') { const v = String(value).trim(); if (!v) return 'A name cannot be empty.'; p[field] = v.slice(0, 40); for (const h of Object.values(W.households)) if (h.head === p.id) recomputeHead(W, h); logEdit(W, `Renamed @${id}: ${field === 'first' ? 'first' : 'family'} name from "${was}" to "${p[field]}".`); return null; }
  if (field === 'notes') { p.notes = String(value).slice(0, 4000); return null; }
  if (EDIT_NUM[field]) {
    const [lo, hi] = EDIT_NUM[field]; const v = Math.round(+value); if (!Number.isFinite(v)) return 'Please give a number.';
    const nv = clamp(v, lo, hi); const parts = field.split('.');
    if (parts.length === 2) { if (parts[0] === 'mind') mindOf(p); p[parts[0]][parts[1]] = nv; } else p[field] = nv;
    logEdit(W, `Set @${id}'s ${field.replace('traits.', '').replace('mind.', '')} from ${was} to ${nv}.`); return null;
  }
  if (p.status !== 'resident' || p.died != null) return 'Only people living here can be changed this way.';
  if (field === 'mind.depressed') { mindOf(p).depressed = value ? W.year : false; logEdit(W, `${value ? 'Made' : 'Lifted'} @${id}'s depression.`); return null; }
  if (field === 'faith') { if (!Object.keys(eraOf(W).faiths).includes(value)) return 'Not a faith in this setting.'; p.faith = value; logEdit(W, `Changed @${id}'s faith to ${value}.`); return null; }
  if (field === 'orientation') { if (!['straight', 'gay', 'bisexual'].includes(value)) return 'Not a valid choice.'; p.orientation = value; logEdit(W, `Changed who @${id} is attracted to.`); return null; }
  if (field === 'hermit') {
    if (!!value === !!p.hermit) return null;
    p.hermit = !!value; p.hermitReason = value ? 'chose to live apart' : null;
    if (value) { const h = W.households[p.household]; const others = h ? h.members.filter(x => x !== p.id) : []; if (others.some(x => ageOf(W.people[x], W.year) < 16) && !others.some(x => ageOf(W.people[x], W.year) >= 16)) { p.hermit = false; return 'They are the only grown-up caring for a child, so they cannot leave.'; } newHousehold(W, rng, [p], W.year, eraOf(W).outskirts); }
    else newHousehold(W, rng, [p], W.year);
    addEvent(W, p, W.year, value ? 'withdrew' : 'returned', value ? 'Went off to live alone.' : 'Came back to live among people.', { byHand: true });
    logEdit(W, `${value ? 'Sent' : 'Brought back'} @${id} ${value ? 'to live alone' : 'among people'}.`); return null;
  }
  if (field === 'occupation') {
    const roles = NONWORK_ROLES(W);
    if (roles.includes(value)) { leaveJob(W, rng, p, W.year, 'stopped'); p.occId = null; p.occupation = value; logEdit(W, `Set @${id} to "${value}".`); return null; }
    const o = jobChoices(W, p).find(x => x.id === value); if (!o) return 'That work is not open to this person.';
    if (W.era === 'dropped') { p.occId = o.id; p.occupation = o.name; p.jobSince = W.year; logEdit(W, `Gave @${id} work as ${o.name}.`); return null; }
    if (isOfficeOcc(W, o.id)) return 'That is an office: use “Put in office” in the plans instead.';
    leaveJob(W, rng, p, W.year, 'changed work'); p.occId = o.id; p.occupation = o.name; p.jobSince = W.year; placeInWorkplace(W, rng, p, o, W.year);
    addEvent(W, p, W.year, 'work', `Took up work as ${/^[aeiou]/i.test(o.name) ? 'an' : 'a'} ${o.name.toLowerCase()}.`, { byHand: true });
    logEdit(W, `Gave @${id} work as ${o.name}.`); return null;
  }
  if (field === 'household') {
    if (value === 'new') { const old = W.households[p.household]; newHousehold(W, rng, [p], W.year, old ? old.district : null); addEvent(W, p, W.year, 'moved', 'Moved to a home of their own.'.replace('their', hisHer(p)), { byHand: true }); logEdit(W, `Moved @${id} into a new home.`); return null; }
    const h = W.households[+value]; if (!h || !h.members.some(x => livingResident(W, x))) return 'That household is not living here.';
    if (h.id === p.household) return null;
    moveToHousehold(W, p, h); recomputeHead(W, h); addEvent(W, p, W.year, 'moved', `Moved into ${h.name}.`, { byHand: true }); logEdit(W, `Moved @${id} into ${h.name}.`); return null;
  }
  return 'That cannot be changed here.';
}
function editHousehold(W, hid, field, value) {
  const h = W.households[hid]; if (!h) return 'Household not found.';
  if (field === 'district') { if (!eraOf(W).districts.includes(value) && value !== eraOf(W).outskirts) return 'Not an area of this town.'; const was = h.district; h.district = value; logEdit(W, `Moved ${h.name} from ${was} to ${value}.`); return null; }
  const E = ECON[W.era];
  if (field === 'savings') { if (!E) return 'There is no money in this setting.'; const v = Math.round(+value); if (!Number.isFinite(v)) return 'Please give a number.'; const was = h.savings; h.savings = v; setWealth(W, h); logEdit(W, `Set ${h.name}'s savings from ${was} to ${v}.`); return null; }
  if (field === 'home') { if (!E) return 'There is no money in this setting.'; const hm = E.homes.find(x => x[0] === value); if (!hm) return 'Not a kind of home here.'; h.home = hm[0]; if (h.owned) h.property = hm[1]; setWealth(W, h); logEdit(W, `${cap(h.name)} now lives in ${hm[0]}.`); return null; }
  if (field === 'owned') { if (!E) return 'There is no money in this setting.'; h.owned = !!value; const hm = E.homes.find(x => x[0] === h.home); h.property = h.owned && hm ? hm[1] : 0; setWealth(W, h); logEdit(W, `${cap(h.name)} ${h.owned ? 'now owns' : 'now rents'} its home.`); return null; }
  return 'That cannot be changed here.';
}
const REL_TYPES = ['friend', 'close friend', 'courting', 'crush', 'mentor', 'acquaintance', 'rival', 'enemy', 'strained', 'estranged'];
function editRelationship(W, a, b, type, score, reason) {
  const A = livingResident(W, a), B = livingResident(W, b);
  if (!A || !B) return 'Both people must be alive and living here.';
  if (a === b) return 'Pick two different people.';
  if (type === 'end') { const r = getRel(W, a, b); if (!r) return 'They have no connection to end.'; r.ended = W.year; relNote(r, W.year, `The connection between @${a} and @${b} ended.`); logEdit(W, `Ended the connection between @${a} and @${b}.`); return null; }
  if (!REL_TYPES.includes(type)) return 'Not a kind of connection.';
  if ((type === 'courting' || type === 'crush') && (closelyRelated(W, A, B))) return 'They are close family.';
  if ((type === 'strained' || type === 'estranged') && !closelyRelated(W, A, B)) return '“Strained” and “estranged” are for family; use rival or enemy.';
  let sc = Math.round(+score); if (!Number.isFinite(sc)) sc = /rival|enemy|strained|estranged/.test(type) ? -50 : 50;
  if (/rival|enemy|strained|estranged/.test(type)) sc = -Math.abs(sc); else sc = Math.abs(sc);
  const r = setRel(W, a, b, type, sc, W.year, reason || 'the storyteller decided so', type === 'crush' || type === 'mentor' ? { from: a } : null);
  r.ended = null; relNote(r, W.year, `@${a} and @${b}: ${type}${reason ? ' — ' + reason : ''}.`);
  logEdit(W, `Set @${a} and @${b} as ${type} (${sc}).`); return null;
}

// ---------- plans for the coming year ----------
const PLAN_KINDS = {
  die: { label: 'Dies', who: 'person' }, marry: { label: 'Marries someone', who: 'person', target: true }, children: { label: 'Has children', who: 'person' },
  affair: { label: 'Has a secret affair with someone', who: 'person', target: true }, crime: { label: 'Commits a crime', who: 'person' },
  injury: { label: 'Is badly hurt', who: 'person' }, illness: { label: 'Falls ill', who: 'person' }, job: { label: 'Takes up new work', who: 'person' }, loseJob: { label: 'Loses their work', who: 'person' },
  moveAway: { label: 'Moves away', who: 'person' }, friend: { label: 'Becomes friends with someone', who: 'person', target: true }, enemy: { label: 'Falls out bitterly with someone', who: 'person', target: true },
  money: { label: 'Gains or loses money', who: 'person' }, hermit: { label: 'Withdraws to live alone', who: 'person' }, depression: { label: 'Falls into a deep low', who: 'person' }, drinking: { label: 'Starts drinking heavily', who: 'person' },
  recover: { label: 'Recovers (mind and body)', who: 'person' }, office: { label: 'Is put in office', who: 'person' }, success: { label: 'Has a great success at work', who: 'person' },
  event: { label: 'Something happens to the town', who: 'town' }, outbreak: { label: 'An outbreak of disease', who: 'town' }, weather: { label: 'Weather for a season', who: 'town' }, blight: { label: 'A crop fails', who: 'town' },
  newcomers: { label: 'Newcomers arrive', who: 'town' }, feud: { label: 'A feud starts between two households', who: 'town' }, endFeud: { label: 'A feud ends', who: 'town' },
  election: { label: 'An election is called', who: 'town' }, law: { label: 'The leader makes a rule', who: 'town' }, discovery: { label: 'The settlement works something out', who: 'town' }
};
function planCheck(W, pl) {
  const y = W.year;
  const P = id => livingResident(W, id);
  if (PLAN_KINDS[pl.kind] && PLAN_KINDS[pl.kind].who === 'person' && !P(pl.who)) return 'Pick someone alive and living here.';
  const p = P(pl.who), t = P(pl.target);
  switch (pl.kind) {
    case 'marry': {
      if (!t) return 'Pick who they marry (alive and living here).';
      if (p.id === t.id) return 'Pick someone else.';
      if (closelyRelated(W, p, t)) return 'They are close family and cannot marry.';
      const minA = s => s === 'f' ? Math.max(12, W.settings.marriageAgeWomen - 2) : Math.max(12, W.settings.marriageAgeMen - 2);
      if (ageOf(p, y) < minA(p.sex) || ageOf(t, y) < minA(t.sex)) return 'One of them is too young to marry in this setting.';
      if (p.sex === t.sex && !W.settings.sameSexCouples && !pl.force) return 'Same-sex marriage is not possible in this setting (tick “anyway” to allow it as a secret partnership).';
      if ((p.spouse === t.id)) return 'They are already together.';
      if ((p.spouse || t.spouse) && !pl.force) return 'One of them is already married. Tick “even if married” to have them leave their spouse.';
      return null;
    }
    case 'children': {
      const n = Math.round(+pl.n); if (!(n >= 1 && n <= 8)) return 'Choose 1 to 8 children.';
      if (p.sex !== 'f') { if (!t || t.sex !== 'f') return 'Pick the mother (a woman alive and living here).'; }
      const mom = p.sex === 'f' ? p : t; const a = ageOf(mom, y);
      if (a < 14 || a > 50) return `${mom.first} is ${a}: too ${a < 14 ? 'young' : 'old'} to have children.`;
      if (mom.preg) return `${mom.first} is already expecting.`;
      const dad = p.sex === 'f' ? (t || W.people[p.spouse]) : p;
      if (dad && (dad.sex !== 'm' || closelyRelated(W, mom, dad))) return 'The father must be a man who is not close family.';
      if (dad && (ageOf(dad, y) < 14 || ageOf(dad, y) > 90)) return `${dad.first} is ${ageOf(dad, y)}: too ${ageOf(dad, y) < 14 ? 'young' : 'old'} to be the father.`;
      return null;
    }
    case 'affair': if (!t || t.id === p.id) return 'Pick who the affair is with.'; if (closelyRelated(W, p, t)) return 'They are close family.'; if (ageOf(p, y) < 16 || ageOf(t, y) < 16) return 'Both must be grown.'; return null;
    case 'crime': if (!CRIME_RATES[W.era][pl.crime]) return 'Pick a crime.'; if (['theft', 'assault', 'fraud', 'murder', 'arson'].includes(pl.crime) && (!t || t.id === p.id)) return 'Pick the victim.'; if (ageOf(p, y) < 10) return 'Too young.'; return null;
    case 'friend': case 'enemy': if (!t || t.id === p.id) return 'Pick the other person.'; return null;
    case 'job': { const o = jobChoices(W, p).find(x => x.id === pl.job); if (!o) return 'Pick work open to this person.'; if (W.era !== 'dropped' && isOfficeOcc(W, o.id)) return 'That is an office: use “Is put in office”.'; return null; }
    case 'loseJob': if (!p.occId) return 'They have no work to lose.'; return null;
    case 'illness': if (!diseasesFor(W).some(d => d.id === pl.disease)) return 'Pick an illness.'; return null;
    case 'money': if (!ECON[W.era]) return 'There is no money in this setting.'; if (!Number.isFinite(+pl.amount) || +pl.amount === 0) return 'Give an amount (minus for a loss).'; return null;
    case 'office': if (!(OFFICES[W.era] || []).some(o => o.key === pl.office)) return 'Pick an office.'; if (ageOf(p, y) < 16) return 'Too young.'; return null;
    case 'event': if (!(EVENTS[W.era] || []).some(e => e.name === pl.event)) return 'Pick something that can happen here.'; return null;
    case 'outbreak': if (!diseasesFor(W).some(d => d.id === pl.disease)) return 'Pick an illness.'; return null;
    case 'weather': { const table = W.era === 'scifi' ? WEATHER.scifi : WEATHER.land; if (!(pl.s >= 0 && pl.s <= 3) || !table[pl.s].some(w => w[0] === pl.weather) && pl.weather !== 'perfect') return 'Pick weather for that season.'; return null; }
    case 'blight': if (!(PESTS[W.era] || []).some(x => x[1] === pl.pest)) return 'Pick a blight.'; return null;
    case 'newcomers': if (!(+pl.n >= 1 && +pl.n <= 30)) return 'Choose 1 to 30 households.'; if (W.era === 'dropped') return 'No other people exist in this world.'; return null;
    case 'feud': { const A = W.households[pl.a], B = W.households[pl.b]; if (!A || !B || A === B) return 'Pick two different households.'; if (!A.members.some(id => livingResident(W, id)) || !B.members.some(id => livingResident(W, id))) return 'Both households must be living here.'; return null; }
    case 'endFeud': { const f = W.feuds[pl.feud]; if (!f || f.status !== 'active') return 'Pick a feud that is still going.'; return null; }
    case 'election': { const o = (OFFICES[W.era] || []).find(x => x.key === pl.office); if (!o || o.how !== 'election') return 'Pick an elected office.'; return null; }
    case 'law': if (!LAWS.some(l => l.id === pl.law)) return 'Pick a rule.'; { const lead = W.soc && W.soc.offices[LEAD_KEY[W.era]]; if (!lead || !lead.holders.length) return 'There is no leader in office to make it.'; } return null;
    case 'discovery': if (W.era !== 'dropped') return 'Only in the empty world.'; if (!DISCOVERIES.some(d => d.id === pl.disc)) return 'Pick a discovery.'; if (W.settle && W.settle.discoveries.some(d => d.id === pl.disc)) return 'Already discovered.'; return null;
  }
  return PLAN_KINDS[pl.kind] ? null : 'Unknown plan.';
}
function addPlan(W, pl) {
  pl.s = clamp(Math.round(+pl.s || 0), 0, 3);
  const err = planCheck(W, pl); if (err) return err;
  W.plans = W.plans || []; W.nextPlan = W.nextPlan || 1;
  pl.id = W.nextPlan++; pl.y = W.year; pl.status = 'waiting'; pl.made = new Date().toISOString();
  W.plans.push(pl);
  logEdit(W, `Planned for ${SEASONS[pl.s].toLowerCase()} ${W.year}: ${planText(W, pl)}.`);
  return null;
}
function cancelPlan(W, id) { const pl = (W.plans || []).find(x => x.id === id); if (!pl || pl.status !== 'waiting') return 'Only waiting plans can be cancelled.'; pl.status = 'cancelled'; logEdit(W, `Cancelled the plan: ${planText(W, pl)}.`); return null; }
function planText(W, pl) {
  const n = id => id && W.people[id] ? `@${id}` : 'someone';
  switch (pl.kind) {
    case 'die': return `${n(pl.who)} dies (${pl.cause || 'illness'}${pl.cause === 'murder' && pl.target ? ' by ' + n(pl.target) : ''})`;
    case 'marry': return `${n(pl.who)} marries ${n(pl.target)}`;
    case 'children': return `${n(pl.who)} has ${pl.n} ${+pl.n === 1 ? 'child' : 'children'}${pl.target ? ' with ' + n(pl.target) : ''}`;
    case 'affair': return `${n(pl.who)} begins a secret affair with ${n(pl.target)}`;
    case 'crime': return `${n(pl.who)} commits ${pl.crime}${pl.target ? ' against ' + n(pl.target) : ''}${pl.caught === 'yes' ? ' and is caught' : pl.caught === 'no' ? ' and gets away with it' : ''}`;
    case 'injury': return `${n(pl.who)} is badly hurt${pl.lasting ? ', for life' : ''}`;
    case 'illness': return `${n(pl.who)} falls ill with ${(DISEASES.find(d => d.id === pl.disease) || {}).name || 'an illness'}`;
    case 'job': return `${n(pl.who)} becomes ${(jobChoices(W, W.people[pl.who] || {}).find(x => x.id === pl.job) || { name: 'something new' }).name.toLowerCase()}`;
    case 'loseJob': return `${n(pl.who)} loses their work`;
    case 'moveAway': return `${n(pl.who)} moves away${pl.withHousehold ? ' with the household' : ''}`;
    case 'friend': return `${n(pl.who)} and ${n(pl.target)} become friends`;
    case 'enemy': return `${n(pl.who)} and ${n(pl.target)} fall out bitterly`;
    case 'money': return `${n(pl.who)}'s household ${+pl.amount > 0 ? 'gains' : 'loses'} ${Math.abs(+pl.amount)} ${ECON[W.era] ? ECON[W.era].unit : ''}`;
    case 'hermit': return `${n(pl.who)} withdraws to live alone`;
    case 'depression': return `${n(pl.who)} falls into a deep low`;
    case 'drinking': return `${n(pl.who)} starts drinking heavily`;
    case 'recover': return `${n(pl.who)} recovers`;
    case 'office': return `${n(pl.who)} is put in office (${((OFFICES[W.era] || []).find(o => o.key === pl.office) || {}).title || ''})`;
    case 'success': return `${n(pl.who)} has a great success at work`;
    case 'event': return pl.event + (pl.where ? ` (in ${pl.where})` : '');
    case 'outbreak': return `an outbreak of ${(DISEASES.find(d => d.id === pl.disease) || {}).name}`;
    case 'weather': return `${SEASONS[pl.s].toLowerCase()} weather: ${pl.weather}`;
    case 'blight': return pl.pest;
    case 'newcomers': return `${pl.n} new households arrive`;
    case 'feud': return `a feud between ${(W.households[pl.a] || {}).name} and ${(W.households[pl.b] || {}).name}${pl.reason ? ' over ' + pl.reason : ''}`;
    case 'endFeud': { const f = W.feuds[pl.feud]; return `the feud between ${f ? f.sideA.name + ' and ' + f.sideB.name : '?'} ends`; }
    case 'election': return `an early vote for ${((OFFICES[W.era] || []).find(o => o.key === pl.office) || {}).title}`;
    case 'law': return `the leader ${(LAWS.find(l => l.id === pl.law) || {}).name}`;
    case 'discovery': return `the settlement works out ${(DISCOVERIES.find(d => d.id === pl.disc) || {}).name}`;
  }
  return pl.kind;
}
const MULTIPLES = ['', 'a baby', 'twins', 'triplets', 'quadruplets', 'quintuplets', 'sextuplets', 'septuplets', 'octuplets'];
// plans that shape the year's weather, harvest and events (called from the year's start)
function plansForEcon(W, Y) {
  for (const pl of (W.plans || [])) {
    if (pl.status !== 'waiting' || pl.y !== Y.y) continue;
    if (pl.kind === 'weather') { Y.weather[pl.s] = pl.weather; Y.healthMult[pl.s] = WX_HEALTH[pl.weather] || 1; pl.status = 'done'; pl.result = `${SEASONS[pl.s]} was ${pl.weather}.`; }
  }
}
function plansForEcon2(W, rng, Y) {
  for (const pl of (W.plans || [])) {
    if (pl.status !== 'waiting' || pl.y !== Y.y) continue;
    if (pl.kind === 'blight') { const pe = (PESTS[W.era] || []).find(x => x[1] === pl.pest); if (pe && Y.yields[pe[0]] != null) { const f = 0.25; Y.yields[pe[0]] = Math.round(Y.yields[pe[0]] * f * 100) / 100; for (const [r, ins] of Object.entries(DERIVED)) if (Y.yields[r] != null && ins.includes(pe[0])) Y.yields[r] = Math.min(Y.yields[r], Y.yields[pe[0]]); Y.pests.push({ r: pe[0], name: pe[1], f }); pl.status = 'done'; pl.result = `${cap(pe[1])} cut the ${pe[0]} crop to ${Math.round(Y.yields[pe[0]] * 100)}%.`; } else { pl.status = 'failed'; pl.result = 'Nothing here grows that crop.'; } }
    if (pl.kind === 'event') { const ev = (EVENTS[W.era] || []).find(e => e.name === pl.event); if (ev) { Y.events.push(Object.assign({ s: pl.s, planned: pl.id, where: pl.where || null }, ev)); if (ev.k === 'bumper') for (const r of Object.keys(Y.yields)) if (FOOD.has(r)) Y.yields[r] = Math.round(Y.yields[r] * 1.25 * 100) / 100; if (ev.k === 'boom') { W.econ.economy = clamp(W.econ.economy + 0.25, 0.6, 1.6); W.econ.boomYears = 3; } if (ev.k === 'bust') W.econ.economy = clamp(W.econ.economy - 0.25, 0.5, 1.5); pl.status = 'done'; pl.result = `${cap(ev.name)} happened in ${SEASONS[pl.s].toLowerCase()}.`; } }
  }
}
function planOutbreak(W, y) {
  const pl = (W.plans || []).find(x => x.status === 'waiting' && x.y === y && x.kind === 'outbreak');
  if (!pl) return null;
  const d = DISEASES.find(x => x.id === pl.disease); if (!d) return null;
  pl.status = 'done'; pl.result = `${cap(d.name)} broke out in ${SEASONS[pl.s].toLowerCase()}.`;
  return { d, season: pl.s, boost: 4, cases: 0, deaths: 0, planned: true };
}
// person and town plans, run at the start of their season
function runPlans(W, rng, y, s, R) {
  for (const pl of (W.plans || [])) {
    if (pl.status !== 'waiting' || pl.y !== y || pl.s !== s) continue;
    W._s = s;
    const err = planCheck(W, pl);
    if (err) { pl.status = 'failed'; pl.result = `Could not happen: ${err}`; continue; }
    try { pl.result = doPlan(W, rng, y, s, R, pl) || 'Done.'; pl.status = 'done'; }
    catch (e) { pl.status = 'failed'; pl.result = 'Could not happen: ' + e.message; }
  }
}
function doPlan(W, rng, y, s, R, pl) {
  const p = W.people[pl.who], t = W.people[pl.target];
  switch (pl.kind) {
    case 'die': {
      if (pl.cause === 'murder' && t && livingResident(W, t.id) && t.id !== p.id) { const c = commitCrime(W, rng, y, R, 'murder', t, p, pl.motive || null, pl.caught === 'yes' ? true : pl.caught === 'no' ? false : null); return `${p.first} was murdered by ${t.first}${c && c.solved ? ', who was caught' : ''}.`; }
      const causes = { illness: [rng.pick(eraOf(W).illnesses.filter(c => !/fall|drown|kick|crash|fight|brawl|duel|raid/i.test(c))) || 'a sudden illness', 'illness'], accident: [rng.pick(['a fall', 'an accident at work', 'drowning', ...(INJURIES.travel[W.era] ? [INJURIES.travel[W.era]] : [])]), 'accident'], old: ['old age', 'old'], heart: ['a failing heart', 'illness'], violence: ['a violent attack by a stranger', 'violence'] };
      const [cause, kind] = causes[pl.cause] || [pl.causeText || 'a sudden illness', 'illness'];
      die(W, rng, p, y, pl.causeText || cause, kind, R); return `${p.first} died (${pl.causeText || cause}).`;
    }
    case 'marry': {
      for (const x of [p, t]) if (x.spouse && x.spouse !== (x === p ? t.id : p.id)) { const sp = W.people[x.spouse]; if (sp && sp.died == null) { separate(W, rng, x, sp, y); const rr = getRel(W, x.id, sp.id); if (rr) { rr.type = 'ex'; rr.score = Math.min(rr.score, -20); } addEvent(W, sp, y, 'heartbreak', `Was left by @${x.id}, who went to @${x === p ? t.id : p.id}.`); } }
      unite(W, rng, p, t, y, pl.reason || null);
      const r = setRelIndexed(W, p.id, t.id, 'spouse', 65, y, p.union === 'partners' ? 'partners' : 'married'); r.ended = null;
      R.marriages++; mindOf(p).joy += 25; mindOf(t).joy += 25; ripple(W, rng, p, y, 'joy', 10, null);
      return `${p.first} and ${t.first} ${p.union === 'partners' ? 'set up home together' : 'married'}.`;
    }
    case 'children': {
      const mom = p.sex === 'f' ? p : t; const dad = p.sex === 'f' ? (t || W.people[p.spouse] || null) : p;
      const n = Math.round(+pl.n); const born = [];
      for (let i = 0; i < n; i++) {
        const c = makePerson(W, rng, { born: y, father: dad ? dad.id : null, mother: mom.id, culture: dad ? dad.culture : mom.culture });
        mom.children.push(c.id); if (dad) dad.children.push(c.id);
        moveToHousehold(W, c, W.households[mom.household]); mindOf(c); c.skills = {}; for (const k of Object.keys(c.aptitude)) c.skills[k] = 0; c.hist = []; c.occupation = eraOf(W).youngChild;
        addEvent(W, c, y, 'born', `Born in ${SEASONS[s].toLowerCase()} to ${dad ? `@${mom.id} and @${dad.id}` : `@${mom.id}`}${n > 1 ? ` — one of ${MULTIPLES[n]}` : ''}.`);
        born.push(c); R.births++;
      }
      const what = n === 1 ? (born[0].sex === 'm' ? 'a son' : 'a daughter') : MULTIPLES[n];
      addEvent(W, mom, y, 'child_born', `Gave birth to ${what}: ${born.map(c => '@' + c.id).join(', ')}.`);
      if (dad) addEvent(W, dad, y, 'child_born', `Became a father to ${what}: ${born.map(c => '@' + c.id).join(', ')}.`);
      mom.lastBirth = y * 4 + s; mindOf(mom).joy += 25; mindOf(mom).yearStress += n * 6; if (dad) mindOf(dad).joy += 18;
      ripple(W, rng, born[0], y, 'joy', 15, null);
      if (n >= 3) { W.log.push({ y, s, t: 'wonder', text: `@${mom.id} gave birth to ${what}, the talk of the whole town.` }); R.items.push({ k: 'wonder', text: `@${mom.id} gave birth to ${what}.` }); }
      return `${mom.first} had ${what}.`;
    }
    case 'affair': {
      p.affair = t.id; if (!t.spouse) t.affair = p.id;
      addEvent(W, p, y, 'secret', `Began a secret affair with @${t.id}.`, { secret: true }); addEvent(W, t, y, 'secret', `Began a secret affair with @${p.id}.`, { secret: true });
      if (W.soc) addSecret(W, 'affair', [p.id, t.id], `@${p.id} is having an affair with @${t.id}.`, true, [p.id, t.id], y);
      return `${p.first} and ${t.first} began an affair.`;
    }
    case 'crime': { const c = commitCrime(W, rng, y, R, pl.crime, p, t || null, pl.motive || null, pl.caught === 'yes' ? true : pl.caught === 'no' ? false : null); return `${p.first} committed ${pl.crime}${c.solved ? ' and was caught' : ' and was not caught'}.`; }
    case 'injury': {
      const what = pl.what || rng.pick(INJURIES.labor);
      p.health = Math.round(clamp(p.health - rng.int(10, 25), 1, 100)); mindOf(p).yearStress += 20; mindOf(p).trauma = clamp(mindOf(p).trauma + 10, 0, 100);
      let lasting = null; if (pl.lasting) { lasting = rng.pick(LASTING.filter(l => !p.conditions.includes(l))); if (lasting) p.conditions.push(lasting); }
      addEvent(W, p, y, 'injury', `Badly hurt: ${what}${lasting ? `, leaving ${himHer(p)} with ${lasting}` : ''}.`); ripple(W, rng, p, y, 'worry', 18, `Worried over {who}, badly hurt.`); R.injuries++;
      return `${p.first} was badly hurt${lasting ? ` and left with ${lasting}` : ''}.`;
    }
    case 'illness': { const d = DISEASES.find(x => x.id === pl.disease); catchIll(W, rng, p, d, y, s, R, null); return isAlive(p) ? `${p.first} fell ill with ${d.name} and survived.` : `${p.first} fell ill with ${d.name} and died.`; }
    case 'job': {
      const o = jobChoices(W, p).find(x => x.id === pl.job);
      if (W.era === 'dropped') { p.occId = o.id; p.occupation = o.name; addEvent(W, p, y, 'work', `Took on work as ${/^[aeiou]/i.test(o.name) ? 'an' : 'a'} ${o.name.toLowerCase()}.`); return `${p.first} became ${o.name.toLowerCase()}.`; }
      startJob(W, rng, p, o, y, pl.reason || null, R); return `${p.first} became ${o.name.toLowerCase()}.`;
    }
    case 'loseJob': { const was = p.occupation; leaveJob(W, rng, p, y, 'lost the job'); p.occId = null; p.occupation = W.settings.familySizeLimit ? 'Unemployed (looking for work)' : 'Odd jobs'; addEvent(W, p, y, 'work', `Lost ${hisHer(p)} work as ${/^[aeiou]/i.test(was) ? 'an' : 'a'} ${was.toLowerCase()}.`, pl.reason ? { why: pl.reason } : null); mindOf(p).yearStress += 25; R.jobsLost++; return `${p.first} lost the work.`; }
    case 'moveAway': {
      if (W.era === 'dropped') { return 'Nowhere to go in the empty world.'; }
      const h = W.households[p.household]; const who = pl.withHousehold && h ? h.members.map(id => W.people[id]).filter(q => q && livingResident(W, q.id)) : [p];
      if (!pl.withHousehold) { const others = h ? h.members.filter(id => id !== p.id).map(id => W.people[id]) : []; if (others.some(q => ageOf(q, y) < 16) && !others.some(q => ageOf(q, y) >= 16)) throw new Error(`${p.first} is the only grown-up caring for a child; choose “with the household”.`); }
      for (const q of who) { leaveJob(W, rng, q, y, 'moved away'); departPerson(W, q, y, rng); R.departures++; for (const r of relsOf(W, q.id)) r.ended = r.ended || y; for (const g of Object.values(W.groups)) if (g.members.includes(q.id)) { g.members = g.members.filter(x => x !== q.id); g.past.push({ id: q.id, y, why: 'left town' }); } }
      return `${who.length === 1 ? p.first + ' moved' : who.length + ' people moved'} away.`;
    }
    case 'friend': { const r = getRel(W, p.id, t.id); const nr = setRelIndexed(W, p.id, t.id, 'close friend', Math.max(65, r ? r.score : 0), r ? r.since : y, pl.reason || 'thrown together by events'); nr.ended = null; relNote(nr, y, `@${p.id} and @${t.id} became close friends.`); addEvent(W, p, y, 'friend', `Became close friends with @${t.id}.`); addEvent(W, t, y, 'friend', `Became close friends with @${p.id}.`); return 'They became close friends.'; }
    case 'enemy': { const r = getRel(W, p.id, t.id); const nr = setRelIndexed(W, p.id, t.id, 'enemy', Math.min(-70, r ? r.score - 50 : -70), r ? r.since : y, pl.reason || 'a bitter falling-out'); nr.ended = null; relNote(nr, y, `@${p.id} and @${t.id} fell out bitterly${pl.reason ? ' over ' + pl.reason : ''}.`); addEvent(W, p, y, 'quarrel', `Fell out bitterly with @${t.id}${pl.reason ? ' over ' + pl.reason : ''}.`); addEvent(W, t, y, 'quarrel', `Fell out bitterly with @${p.id}${pl.reason ? ' over ' + pl.reason : ''}.`); mindOf(p).yearStress += 15; mindOf(t).yearStress += 15; return 'They became enemies.'; }
    case 'money': { const h = W.households[p.household]; const v = Math.round(+pl.amount); h.savings = (h.savings || 0) + v; setWealth(W, h); addEvent(W, p, y, 'money', v > 0 ? `Came into money: ${fmtMoneyPlain(W, v)}${pl.reason ? ' (' + pl.reason + ')' : ''}.` : `Lost ${fmtMoneyPlain(W, -v)}${pl.reason ? ' (' + pl.reason + ')' : ''}.`); if (v > 0) mindOf(p).joy += 15; else mindOf(p).yearStress += 20; return 'Done.'; }
    case 'hermit': { if (p.hermit) return 'Already lives alone.'; const err = editPerson(W, p.id, 'hermit', true); if (err) throw new Error(err); return `${p.first} withdrew.`; }
    case 'depression': { mindOf(p).depressed = y; mindOf(p).mood = Math.min(mindOf(p).mood, -40); addEvent(W, p, y, 'mind', 'Sank into a deep, lasting low.', pl.reason ? { why: pl.reason } : null); ripple(W, rng, p, y, 'worry', 10, null); return 'Done.'; }
    case 'drinking': { mindOf(p).drink = Math.max(mindOf(p).drink, 70); addEvent(W, p, y, 'mind', 'Began drinking heavily.', pl.reason ? { why: pl.reason } : null); return 'Done.'; }
    case 'recover': { const m = mindOf(p); m.depressed = false; m.drink = Math.min(m.drink, 15); m.trauma = Math.round(m.trauma / 3); m.guilt = Math.round(m.guilt / 3); p.health = Math.max(p.health, 70); addEvent(W, p, y, 'mind', 'Recovered in body and spirit.', pl.reason ? { why: pl.reason } : null); return 'Done.'; }
    case 'success': { addEvent(W, p, y, 'success', pl.reason ? cap(pl.reason) + '.' : 'Had a great success at work that everyone talked about.'); mindOf(p).joy += 25; p.standing = Math.round(clamp((p.standing ?? 50) + 12, 0, 100)); ripple(W, rng, p, y, 'pride', 15, 'Proud of {who}\'s success.'); const h = W.households[p.household]; if (h && ECON[W.era]) { h.savings = (h.savings || 0) + ECON[W.era].income.mid; setWealth(W, h); } return 'Done.'; }
    case 'office': {
      const o = OFFICES[W.era].find(x => x.key === pl.office); const off = W.soc.offices[o.key];
      const prev = off.holders.slice(); const seats = o.seats || 1;
      const holders = off.holders.filter(id => id !== p.id); holders.unshift(p.id); off.holders = holders.slice(0, seats);
      if (o.how === 'heir' && o.occ) { const oc = eraOf(W).occupations.find(x => x.id === o.occ); for (const id of prev) if (!off.holders.includes(id)) { const q = W.people[id]; if (q && q.occId === o.occ) { leaveJob(W, rng, q, y, 'lost the title'); q.occId = null; q.occupation = W.settings.familySizeLimit ? 'Unemployed (looking for work)' : 'Odd jobs'; } } if (oc && p.occId !== oc.id) { leaveJob(W, rng, p, y, 'took the title'); p.occId = oc.id; p.occupation = oc.name; placeInWorkplace(W, rng, p, oc, y); } }
      else setOfficeOccs(W, rng, o, off.holders, prev, y);
      off.since = y; off.history.push({ y, ids: off.holders.slice(), how: pl.reason || 'put in office by sudden turn of events' });
      if (o.how !== 'heir') off.next = y + (o.term || 2);
      addEvent(W, p, y, 'office', `Became ${o.title.toLowerCase()}${pl.reason ? ': ' + pl.reason : ''}.`); W.log.push({ y, s, t: 'office', text: `@${p.id} became ${o.title.toLowerCase()}.` }); R.items.push({ k: 'office', text: `@${p.id} became ${o.title.toLowerCase()}.` });
      return `${p.first} became ${o.title.toLowerCase()}.`;
    }
    case 'newcomers': {
      let n = 0; for (let i = 0; i < +pl.n; i++) { const u = makeImmigrantUnit(W, rng, y, rng.chance(0.6) ? 'family' : 'single', 16, 50); for (const q of u) { mindOf(q); q.skills = {}; for (const k of Object.keys(q.aptitude)) q.skills[k] = Math.round(q.aptitude[k] * 0.35 + Math.min(20, ageOf(q, y) - 10)); q.hist = []; if (pl.reason) { const ev = q.events.filter(e => e.t === 'arrived').pop(); if (ev) ev.why = pl.reason; } } assignNewcomerJobs(W, rng, u, y, R); n += u.length; R.arrivals += u.length; }
      W.log.push({ y, s, t: 'arrivals', text: `${n} newcomers arrived together${pl.reason ? ': ' + pl.reason : ''}.` }); return `${n} people arrived.`;
    }
    case 'feud': {
      const A = W.households[pl.a], B = W.households[pl.b]; const id = W.next.f++;
      const hA = W.people[A.head], hB = W.people[B.head];
      const nmA = A.name === B.name && hA ? `${hA.first} ${hA.last}'s household` : A.name, nmB = A.name === B.name && hB ? `${hB.first} ${hB.last}'s household` : B.name;
      const reason = pl.reason || rng.pick(eraOf(W).feudReasons);
      W.feuds[id] = { id, sideA: { kind: 'household', id: A.id, name: nmA }, sideB: { kind: 'household', id: B.id, name: nmB }, reason, since: y, intensity: 70, status: 'active', history: [{ y, text: `Began over ${reason}.` }] };
      for (const x of A.members) for (const z of B.members) { const px = livingResident(W, x), pz = livingResident(W, z); if (px && pz && ageOf(px, y) >= 14 && ageOf(pz, y) >= 14) setRelIndexed(W, x, z, 'enemy', -rng.int(55, 85), y, `family feud: ${reason}`, { feud: id }).ended = null; }
      if (hA) addEvent(W, hA, y, 'feud', `A feud began with ${nmB} over ${reason}.`); if (hB) addEvent(W, hB, y, 'feud', `A feud began with ${nmA} over ${reason}.`);
      R.items.push({ k: 'feudStart', text: `A feud began between ${nmA} and ${nmB}.` }); return 'The feud began.';
    }
    case 'endFeud': {
      const f = W.feuds[pl.feud]; f.status = 'ended'; f.ended = y; const why = pl.reason || 'the two families made peace';
      f.history.push({ y, text: `Ended: ${why}.` });
      for (const r of Object.values(W.rels)) if (r.feud === f.id && !r.ended && r.score < 0) { r.score = Math.round(r.score / 3); if (r.score > -10) r.type = 'old grudge'; r.feud = null; relNote(r, y, 'The family feud ended.'); }
      R.items.push({ k: 'feudEnd', text: `The feud between ${f.sideA.name} and ${f.sideB.name} ended: ${why}.` }); return 'The feud ended.';
    }
    case 'election': { W.soc.offices[pl.office].next = y; return 'An early vote was called; it takes place this year.'; }
    case 'law': { const lead = W.people[W.soc.offices[LEAD_KEY[W.era]].holders[0]]; const law = LAWS.find(l => l.id === pl.law); W.soc.laws = W.soc.laws.filter(l => !(l.id === law.id && !l.ended)); W.soc.laws.push({ id: law.id, name: law.name, fx: law.fx, approval: law.approval, by: lead.id, y }); addEvent(W, lead, y, 'office', `As leader, ${law.name}.`); W.log.push({ y, s, t: 'law', text: `@${lead.id} ${law.name}.` }); return `${lead.first} ${law.name}.`; }
    case 'discovery': {
      const d = DISCOVERIES.find(x => x.id === pl.disc); const st = W.settle; const who = livingResident(W, pl.who) || null;
      st.discoveries.push({ id: d.id, y, name: d.name, by: who ? who.id : null });
      for (const [k, v] of Object.entries(d.boost)) { if (k === 'medicine') W.settings.medicine = Math.round(clamp(W.settings.medicine + v, 0, 0.6) * 100) / 100; else if (k === 'food') st.foodBoost = (st.foodBoost || 0) + v; else if (k === 'mood') st.moodBoost = (st.moodBoost || 0) + v; else if (k === 'health') st.healthBoost = (st.healthBoost || 0) + v; else st[k] = Math.round(clamp((st[k] || 0) + v, 0, 1) * 100) / 100; }
      if (d.role && !st.roles.includes(d.role)) st.roles.push(d.role);
      if (who) { addEvent(W, who, y, 'discovery', `Worked out ${d.name}.`); mindOf(who).joy += 20; }
      W.log.push({ y, s, t: 'discovery', text: `A discovery: ${d.name}${who ? `, thanks to @${who.id}` : ''}.` }); return 'Discovered.';
    }
  }
  return 'Done.';
}
function fmtMoneyPlain(W, v) { const E = ECON[W.era]; return E ? `${Math.round(v).toLocaleString()} ${E.unit}` : String(v); }
if (typeof module !== 'undefined') Object.assign(module.exports, { editPerson, editHousehold, editRelationship, addPlan, cancelPlan, planCheck, PLAN_KINDS, jobChoices });
