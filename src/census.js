// ================= Stage 3: the census =================
// Each dimension sorts a person into one group (or several, for things like health conditions).
const AGE_BANDS = [[0, 4], [5, 9], [10, 14], [15, 19], [20, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 49], [50, 54], [55, 59], [60, 64], [65, 69], [70, 74], [75, 79], [80, 200]];
const SECTOR_NAMES = { farming: 'Farming and land', craft: 'Crafts and making things', trade: 'Trade, shops and services', learning: 'Learning, religion and office work', healing: 'Healing and care', fighting: 'Law, guarding and soldiering', animals: 'Animals', outdoors: 'Woods, wild and outdoors', arts: 'Arts and entertainment', leadership: 'Leaders and managers', labor: 'Labour', magic: 'Magic' };
function workStatus(W, p) {
  const era = eraOf(W); const o = p.occupation || '';
  if (p.status === 'prison') return W.era === 'dropped' ? 'Banished for a time' : 'In prison';
  if (p.occId) return 'In work';
  if (o === era.youngChild) return 'Young child';
  if (/student|pupil|lessons|learning/i.test(o)) return 'At school or college';
  if (o === era.childWork) return ageOf(p, W.year) < 16 ? 'Child helping at home' : 'Helping at home';
  if (o === era.homemaker) return 'Keeping house';
  if (o === era.retired) return 'Retired or too old to work';
  if (/Unemployed|Odd jobs/.test(o)) return 'Out of work or odd jobs';
  if (/Unable/.test(o)) return 'Unable to work';
  return 'Other';
}
function householdType(W, p) {
  const h = W.households[p.household]; if (!h) return 'No household';
  const mem = h.members.map(id => W.people[id]).filter(q => q && q.status === 'resident' && q.died == null);
  const y = W.year;
  if (mem.length === 1) return 'Living alone';
  const adults = mem.filter(q => ageOf(q, y) >= 18), kids = mem.filter(q => ageOf(q, y) < 18);
  const couple = adults.some(a => a.spouse && mem.some(b => b.id === a.spouse));
  const gens = new Set(mem.map(q => Math.floor(ageOf(q, y) / 22))).size;
  if (gens >= 3 && adults.length >= 3) return 'Three generations';
  if (couple && kids.length) return 'Couple with children';
  if (couple && !kids.length) return adults.length > 2 ? 'Couple with grown family' : 'Couple, no children at home';
  if (!couple && kids.length && adults.length === 1) return 'Single parent';
  return 'Other shared home';
}
const CENSUS_DIMS = [
  { key: 'work', label: 'Work status', fn: (W, p) => workStatus(W, p) },
  { key: 'sector', label: 'Kind of work', fn: (W, p) => { const o = currentOcc(W, p); return o ? (SECTOR_NAMES[o.skill] || 'Other work') : null; } },
  { key: 'occupation', label: 'Work or role', fn: (W, p) => p.occupation || 'None' },
  { key: 'workplace', label: 'Place of work', fn: (W, p) => p.workplace && W.workplaces[p.workplace] ? cap(W.workplaces[p.workplace].name) : null },
  { key: 'sex', label: 'Sex', fn: (W, p) => p.sex === 'm' ? 'Male' : 'Female' },
  { key: 'agegroup', label: 'Age group', fn: (W, p) => { const a = ageOf(p, W.year); return a < 16 ? 'Children (0–15)' : a < 65 ? 'Working age (16–64)' : 'Elders (65+)'; } },
  { key: 'age', label: 'Age (five-year bands)', fn: (W, p) => { const a = ageOf(p, W.year); const b = AGE_BANDS.find(([lo, hi]) => a >= lo && a <= hi); return b[1] >= 200 ? '80+' : `${b[0]}–${b[1]}`; }, order: 'age' },
  { key: 'area', label: 'Where they live', fn: (W, p) => (W.households[p.household] || {}).district || null },
  { key: 'marital', label: 'Marriage', fn: (W, p) => { if (ageOf(p, W.year) < 16) return 'Under 16'; if (p.spouse) { const s = W.people[p.spouse]; if (s && s.status === 'leftBehind') return 'Married (spouse left on Earth)'; return p.union === 'partners' ? 'Living with a partner' : 'Married'; } if (p.widowedOf && p.widowedOf.length) return 'Widowed'; if (p.exes && p.exes.length) return 'Separated or divorced'; return 'Never married'; } },
  { key: 'hhtype', label: 'Kind of household', fn: (W, p) => householdType(W, p) },
  { key: 'hhsize', label: 'Household size', fn: (W, p) => { const h = W.households[p.household]; const n = h ? h.members.filter(id => W.people[id] && W.people[id].status === 'resident').length : 0; return n >= 8 ? '8 or more' : String(n); }, order: 'num' },
  { key: 'means', label: 'Household means', fn: (W, p) => W.era === 'dropped' ? null : wealthWord((W.households[p.household] || {}).wealth || 0), order: ['destitute', 'poor', 'getting by', 'comfortable', 'well-off', 'rich'] },
  { key: 'origin', label: 'Born here or came later', fn: (W, p) => p.arrived && p.arrived > p.born ? 'Came from elsewhere' : 'Born here' },
  { key: 'culture', label: 'Background', fn: (W, p) => (CULTURES[p.culture] || {}).label || p.culture },
  { key: 'faith', label: 'Faith', fn: (W, p) => p.faith || 'None' },
  { key: 'languages', label: 'Languages spoken', multi: true, fn: (W, p) => p.languages },
  { key: 'education', label: 'Schooling', fn: (W, p) => p.education || (p.literate ? 'Can read and write' : 'Cannot read or write') },
  { key: 'health', label: 'Health', fn: (W, p) => p.health >= 80 ? 'Very good' : p.health >= 60 ? 'Good' : p.health >= 40 ? 'Fair' : p.health >= 20 ? 'Poor' : 'Very poor', order: ['Very good', 'Good', 'Fair', 'Poor', 'Very poor'] },
  { key: 'conditions', label: 'Long-term health problems', multi: true, fn: (W, p) => p.conditions.length ? p.conditions : ['None'] },
  { key: 'mood', label: 'Mood', fn: (W, p) => { const m = (p.mind || {}).mood || 0; return m >= 35 ? 'Happy' : m >= 12 ? 'Content' : m >= -8 ? 'So-so' : m >= -30 ? 'Unhappy' : 'Miserable'; }, order: ['Happy', 'Content', 'So-so', 'Unhappy', 'Miserable'] },
  { key: 'mind', label: 'Troubles of the mind', multi: true, fn: (W, p) => { const m = p.mind || {}; const out = []; if (m.depressed) out.push('Depressed'); if (m.drink > 60) out.push('Drinking heavily'); if (m.trauma > 40) out.push('Haunted by the past'); if (m.guilt > 30) out.push('Carrying guilt'); const last = (p.hist || [])[(p.hist || []).length - 1]; if (last && last[4] > 0.5) out.push('Grieving'); return out.length ? out : ['None of these']; } },
  { key: 'standing', label: 'Standing in the town', fn: (W, p) => W.soc ? cap(standingWord(p.standing != null ? p.standing : baseStanding(W, p))) : null, order: ['Highly respected', 'Well thought of', 'Ordinary standing', 'Looked down on', 'Shunned'] },
  { key: 'record', label: 'Criminal record', fn: (W, p) => W.soc ? ((p.record || []).some(r => !r.wrongful) ? 'Has a record' : 'No record') : null },
  { key: 'loner', label: 'Loners', fn: (W, p) => p.hermit ? 'Loner or hermit' : 'Lives among others' }
];

// ---------- a yearly snapshot, kept for trends ----------
const SNAP_DIMS = ['work', 'sector', 'agegroup', 'marital', 'hhtype', 'means', 'health', 'mood', 'origin', 'faith', 'standing', 'record'];
function censusPeople(W) { return Object.values(W.people).filter(p => (p.status === 'resident' || p.status === 'prison') && p.died == null); }
function takeCensus(W) {
  const y = W.year; const ppl = censusPeople(W);
  const snap = { y, n: ppl.length, dims: {} };
  for (const key of SNAP_DIMS) {
    const d = CENSUS_DIMS.find(x => x.key === key); const c = {};
    for (const p of ppl) { const v = d.fn(W, p); if (v == null) continue; c[v] = (c[v] || 0) + 1; }
    snap.dims[key] = c;
  }
  const ages = ppl.map(p => ageOf(p, y)).sort((a, b) => a - b);
  snap.medianAge = ages[ages.length >> 1] || 0;
  snap.households = Object.values(W.households).filter(h => h.members.some(id => W.people[id] && W.people[id].status === 'resident' && W.people[id].died == null)).length;
  W.censusDetail = W.censusDetail || {};
  W.censusDetail[y] = snap;
  return snap;
}
if (typeof module !== 'undefined') Object.assign(module.exports, { takeCensus, CENSUS_DIMS });
