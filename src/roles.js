// ================= V11: roles (who does which work) and villages of your own characters =================

// A fresh report for changes made outside a year's run (the year's own report is made in advanceYear).
const blankReport = y => ({ y, births: 0, deaths: 0, infantDeaths: 0, causes: {}, marriages: 0, divorces: 0, arrivals: 0, departures: 0, outbreaks: [], illnesses: 0, injuries: 0, miscarriages: 0, newFriends: 0, quarrels: 0, reconciled: 0, jobsStarted: 0, jobsLost: 0, retired: 0, items: [] });
const editRng = W => new Rng((W.seed * 9301 + W.year * 49297 + (W.edits ? W.edits.length : 0) * 233) >>> 0);

// Every role in the town: its jobs, or in a dropped world the roles people have taken on.
function allRoles(W) {
  if (W.era === 'dropped') return droppedRoles(W).map(r => ({ id: 'role_' + r.name.toLowerCase().replace(/[^a-z]+/g, '_'), name: r.name, skill: r.skill, min: 12, sex: 'any', dropped: true }));
  return eraOf(W).occupations.filter(o => !o.spouseOf);
}
function officeFor(W, o) { return (OFFICES[W.era] || []).find(x => x.occ === o.id || (x.how === 'heir' && x.occ === o.id)); }
function roleHolders(W, o) { return lives(W).filter(p => p.occId === o.id); }

// Why someone might not fit a role. You can still put them there (agreed): these are only warnings.
function roleWarnings(W, p, o) {
  const y = W.year, a = ageOf(p, y), S = W.settings, out = [];
  if (a < (o.min || 0)) out.push(`${p.first} is ${a}; this work usually starts at ${o.min}.`);
  if (o.max && a > o.max) out.push(`${p.first} is ${a}, older than people usually do this work (${o.max}).`);
  if (o.sex && o.sex !== 'any' && o.sex !== p.sex && S.genderRoles === 'strict') out.push(`In this setting only ${o.sex === 'm' ? 'men' : 'women'} do this work.`);
  if (o.celibate && (p.spouse || p.children.length)) out.push('This work is for someone unmarried and without children.');
  if (o.lit && !p.literate) out.push(`${p.first} can't read or write, which this work needs.`);
  if (typeof canDoWork === 'function' && !canDoWork(p, o)) out.push(`${p.first}'s ${(p.conditions || []).find(c => CONDITION_EFFECTS[c] && CONDITION_EFFECTS[c].cannot && CONDITION_EFFECTS[c].cannot.includes(o.skill))} rules this work out.`);
  if (p.status !== 'resident' || !isAlive(p)) out.push(`${p.first} is not living in the town.`);
  return out;
}
// Put someone in a role now. Offices go through the town's own office rules; ordinary work skips the usual limits.
function assignRole(W, p, o, why) {
  const y = W.year, rng = editRng(W), R = blankReport(y);
  if (p.occId === o.id) return `${p.first} already does that.`;
  const off = officeFor(W, o);
  if (off && !o.dropped) { doPlan(W, rng, y, 0, R, { kind: 'office', who: p.id, office: off.key, reason: why || 'given the role by the storyteller' }); }
  else if (o.dropped) { if (p.workplace) leaveJob(W, rng, p, y, 'moved to other work'); p.occId = o.id; p.occupation = o.name; addEvent(W, p, y, 'work', `Took on work as ${/^[aeiou]/i.test(o.name) ? 'an' : 'a'} ${o.name.toLowerCase()}.`); }
  else {
    if (p.occId) { leaveJob(W, rng, p, y, 'moved to other work'); p.formerOccupation = p.occupation; }
    startJob(W, rng, p, o, y, why || 'given the work by the storyteller', R, true);
  }
  if (p.occId !== o.id) return `${p.first} could not be given that role.`;
  p.chosenRole = o.id;
  logEdit(W, `Gave @${p.id} the role of ${o.name.toLowerCase()}.`);
  return null;
}
function removeRole(W, p) {
  if (!p.occId) return `${p.first} has no role.`;
  const was = p.occupation, rng = editRng(W);
  leaveJob(W, rng, p, W.year, 'was taken off the work'); p.formerOccupation = was; p.occId = null;
  p.occupation = W.settings.familySizeLimit ? 'Unemployed (looking for work)' : 'Odd jobs';
  addEvent(W, p, W.year, 'work', `Stopped working as ${/^[aeiou]/i.test(was) ? 'an' : 'a'} ${was.toLowerCase()}.`);
  logEdit(W, `Took @${p.id} off the role of ${was.toLowerCase()}.`);
  return null;
}

// A village with nobody in it yet: the buildings, venues, jobs and offices stay; every person goes.
// No strangers arrive by themselves (arrivals set to 0; change it in Era settings). Births, deaths and everything else carry on.
function emptyVillage(W) {
  W.people = {}; W.households = {}; W.rels = {}; W.groups = {}; W.feuds = {};
  REL_INDEX = null;
  for (const w of Object.values(W.workplaces)) { w.members = []; w.owner = null; }
  for (const o of Object.values(W.soc.offices)) { o.holders = []; o.history = []; o.next = W.year; o.since = W.year; }
  W.soc.secrets = {}; W.soc.crimes = []; W.soc.elections = []; W.soc.approval = {};
  W.log = []; W.yearStats = {}; W.census = {}; W.censusDetail = {}; W.chronicle = {}; W.edits = [];
  W.settings.arrivals = 0; W.onlyMine = true; W._livesReady = false;
  W.targetPopulation = 0;
  upgradeWorld(W);
  return W;
}
// Move a made person in straight away (instead of as a plan), for example into an empty village.
function makerMoveInNow(W, P, sexes, s) {
  const err = makerMoveProblems(W, P, sexes); if (err.length) return err[0];
  W.nextMadeNow = (W.nextMadeNow || 0) + 1;
  const pl = { id: 'now' + W.nextMadeNow, kind: 'madePerson', s: s || 0, person: JSON.parse(JSON.stringify(P)), sexes: Object.assign({}, sexes || {}) };
  const was = W._s; W._s = s || 0; // the arrival happens in the chosen season, so the journal can place it
  let msg; try { msg = makerMoveIn(W, editRng(W), W.year, s || 0, blankReport(W.year), pl); } finally { W._s = was; }
  logEdit(W, `${makerPersonName(P)} moved in straight away.`);
  return /could not come/.test(msg) ? msg : null;
}
if (typeof module !== 'undefined') Object.assign(module.exports, { allRoles, roleHolders, roleWarnings, assignRole, removeRole, emptyVillage, makerMoveInNow, officeFor });
