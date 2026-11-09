// ================= Stage 2b: weather, harvests, supply chains, events, money and property =================
// All amounts are starting estimates for each setting, not historical fact.

Object.assign(SETTING_INFO, {
  disasters: { label: 'How often disasters and big events happen (1 = normal)', unit: 'factor', min: 0, max: 5 },
  weatherSwings: { label: 'How wild the weather is (1 = normal)', unit: 'factor', min: 0, max: 3 }
});
for (const k of Object.keys(ERAS)) Object.assign(ERAS[k].settings, { disasters: 1, weatherSwings: 1 });

const ECON = {
  medieval: { unit: 'pence', income: { low: 360, mid: 1000, high: 8000 }, living: { adult: 150, child: 60 }, priceDamp: 1, debtRate: 0.1, pension: 0, rentShare: 0.25, dues: 0.1, inheritance: 'eldest son',
    homes: [['a one-room cottage', 500], ['a cottage and croft', 1400], ['a timber-framed house', 4000], ['the manor house', 30000]], ownChance: 0.25 },
  frontier: { unit: 'dollars', income: { low: 320, mid: 900, high: 6000 }, living: { adult: 150, child: 60 }, priceDamp: 0.7, debtRate: 0.1, pension: 0, rentShare: 0.2, dues: 0, inheritance: 'shared',
    homes: [['a tent and lean-to', 25], ['a log cabin', 200], ['a frame house', 900], ['a fine brick house', 6000]], ownChance: 0.7 },
  modern: { unit: 'dollars', income: { low: 32000, mid: 62000, high: 140000 }, living: { adult: 15500, child: 7000 }, priceDamp: 0.15, debtRate: 0.06, pension: 21000, rentShare: 0.35, dues: 0, inheritance: 'shared',
    homes: [['a rented trailer', 40000], ['an apartment', 90000], ['a small house', 180000], ['a big house', 450000]], ownChance: 0.65 },
  fantasy: { unit: 'silver crowns', income: { low: 36, mid: 100, high: 900 }, living: { adult: 15, child: 6 }, priceDamp: 1, debtRate: 0.12, pension: 0, rentShare: 0.25, dues: 0.1, inheritance: 'eldest child',
    homes: [['a hovel', 50], ['a cottage', 150], ['a townhouse', 500], ['the keep', 8000]], ownChance: 0.35 },
  scifi: { unit: 'credits', income: { low: 42000, mid: 78000, high: 170000 }, living: { adult: 21000, child: 9000 }, priceDamp: 0.8, debtRate: 0.05, pension: 22000, rentShare: 0.3, dues: 0, inheritance: 'shared',
    homes: [['a dormitory bunk', 0], ['a standard hab unit', 0], ['a family hab suite', 0], ['a terrace suite', 0]], ownChance: 0 },
  dropped: null
};
const FOOD = new Set(['grain', 'flour', 'bread', 'livestock', 'dairy', 'fish', 'honey', 'apples', 'food', 'game']);
// what each resource depends on (derived goods follow their inputs)
const DERIVED = { flour: ['grain'], bread: ['flour'], ale: ['grain'], cider: ['apples'], yarn: ['wool'], cloth: ['wool'], leather: ['livestock'], charcoal: ['timber'], tools: ['iron', 'ore'], whiskey: ['grain'] };

// ---------- weather ----------
const WEATHER = {
  land: [
    [['mild', 5], ['a late frost', 1.2], ['wet and cold', 1.2], ['dry', 1]],
    [['warm', 5], ['hot and dry', 1.3], ['a drought', 0.6], ['wet', 1.2], ['violent storms', 0.6]],
    [['mild', 5], ['very wet', 1.2], ['an early frost', 0.8], ['gales', 0.7]],
    [['mild', 3], ['cold', 3], ['harsh and bitter', 1.2], ['deep snow', 0.8]]
  ],
  scifi: [[['stable', 6], ['dust storms', 1], ['a solar flare', 0.4]], [['stable', 6], ['dust storms', 1.2], ['a solar flare', 0.4]], [['stable', 6], ['dust storms', 1], ['a solar flare', 0.4]], [['stable', 6], ['dust storms', 1], ['a deep cold snap', 0.6]]]
};
// how each kind of weather changes each crop or product
const WX_EFFECT = {
  'a late frost': { apples: 0.45, honey: 0.7, grain: 0.9 }, 'wet and cold': { grain: 0.85, livestock: 0.95, honey: 0.85 }, 'dry': { grain: 0.92 },
  'hot and dry': { grain: 0.8, livestock: 0.9, dairy: 0.85, apples: 0.9 }, 'a drought': { grain: 0.5, livestock: 0.75, dairy: 0.6, apples: 0.7, fish: 0.8, game: 0.8, honey: 0.8 },
  'wet': { grain: 0.85, apples: 0.9 }, 'violent storms': { grain: 0.8, apples: 0.7, timber: 1.1, fish: 0.8 },
  'very wet': { grain: 0.7 }, 'an early frost': { grain: 0.85, apples: 0.85 }, 'gales': { fish: 0.7, apples: 0.85 },
  'harsh and bitter': { livestock: 0.8, wool: 0.85, game: 0.8, fish: 0.85 }, 'deep snow': { livestock: 0.85, game: 0.75, timber: 0.85 },
  'warm': { grain: 1.05, apples: 1.05, honey: 1.1 }, 'mild': { grain: 1.02 },
  'dust storms': { food: 0.9, power: 0.85, ore: 0.9 }, 'a solar flare': { power: 0.8, food: 0.92 }, 'a deep cold snap': { power: 0.85, food: 0.9 },
  'perfect': { grain: 1.1, apples: 1.1, honey: 1.1, livestock: 1.05, fish: 1.1, game: 1.15 }
};
const WX_HEALTH = { 'harsh and bitter': 1.6, 'deep snow': 1.4, 'cold': 1.15, 'wet and cold': 1.2, 'a deep cold snap': 1.3, 'hot and dry': 1.1, 'a drought': 1.2 };

const NORM_CACHE = {};
function weatherNorms(W) {
  const key = W.era + ':' + W.settings.weatherSwings;
  if (NORM_CACHE[key]) return NORM_CACHE[key];
  const table = W.era === 'scifi' ? WEATHER.scifi : WEATHER.land;
  const out = {};
  for (let s = 0; s < 4; s++) {
    const opts = table[s].map(([w, p], i) => [w, i === 0 ? p : p * W.settings.weatherSwings]);
    const tot = opts.reduce((a, b) => a + b[1], 0);
    const exp = {};
    for (const [w, p] of opts) for (const [r, f] of Object.entries(WX_EFFECT[w] || {})) exp[r] = (exp[r] || 0) + (f - 1) * p / tot;
    for (const [r, d] of Object.entries(exp)) out[r] = (out[r] || 1) * (1 + d);
  }
  return (NORM_CACHE[key] = out);
}
// ---------- pests and blights (one crop at a time) ----------
const PESTS = {
  medieval: [['grain', 'rust in the wheat'], ['apples', 'codling moth in the orchards'], ['livestock', 'murrain among the cattle'], ['wool', 'sheep rot'], ['honey', 'the bees dying off'], ['fish', 'the fish failing to run']],
  frontier: [['grain', 'a grasshopper plague'], ['livestock', 'tick fever in the herds'], ['apples', 'apple scab'], ['ore', 'the silver vein running thin'], ['timber', 'beetle-killed timber']],
  modern: [['grain', 'a corn rootworm outbreak'], ['livestock', 'bird flu on the poultry farms'], ['apples', 'fire blight in the orchard'], ['dairy', 'collapsing milk prices']],
  fantasy: [['grain', 'black rot in the barley'], ['apples', 'canker in the apple trees'], ['livestock', 'a cattle murrain'], ['wool', 'sheep rot'], ['iron', 'flooding in the Deepdelve mine'], ['honey', 'the bees dying off']],
  scifi: [['food', 'a fungal bloom in the hydroponics'], ['apples', 'a root virus in Orchard Dome 2'], ['ore', 'drill failures in the Mining Annex'], ['water', 'a fault in water reclamation']],
  dropped: [['grain', 'insects stripping the gardens'], ['game', 'the herds moving away'], ['fish', 'the fish failing to run']]
};

// ---------- big events ----------
// kind: what happens; p: yearly chance (scaled by the "disasters" setting)
const EVENTS = {
  medieval: [
    { k: 'fire', p: 0.05, name: 'a great fire' }, { k: 'flood', p: 0.04, name: 'the river flooding' }, { k: 'storm', p: 0.05, name: 'a great storm' },
    { k: 'war', p: 0.04, name: "the King's war across the sea", what: 'the lord\'s levy' }, { k: 'raid', p: 0.025, name: 'an outlaw band from the forest' },
    { k: 'tax', p: 0.06, name: 'the lord raising his dues' }, { k: 'boom', p: 0.025, name: 'a weekly market charter granted to the village' },
    { k: 'bumper', p: 0.06, name: 'a golden harvest' }, { k: 'feast', p: 0.05, name: 'a great feast given by the lord' }, { k: 'wolves', p: 0.03, name: 'wolves from the Old Wood' }
  ],
  frontier: [
    { k: 'fire', p: 0.07, name: 'a fire on Main Street' }, { k: 'flood', p: 0.04, name: 'a flash flood down the creek' }, { k: 'storm', p: 0.05, name: 'a tornado' },
    { k: 'raid', p: 0.04, name: 'a gang of outlaws' }, { k: 'boom', p: 0.05, name: 'the railroad reaching town' }, { k: 'boom', p: 0.04, name: 'a new silver strike' },
    { k: 'bust', p: 0.04, name: 'the silver price collapsing' }, { k: 'bumper', p: 0.05, name: 'a bumper harvest' }, { k: 'war', p: 0.015, name: 'the territorial militia being called up', what: 'the militia' }
  ],
  modern: [
    { k: 'fire', p: 0.03, name: 'a house fire that spread' }, { k: 'flood', p: 0.03, name: 'a flood' }, { k: 'storm', p: 0.05, name: 'a tornado' },
    { k: 'boom', p: 0.03, name: 'a new distribution center opening' }, { k: 'bust', p: 0.035, name: 'the plastics plant cutting jobs' }, { k: 'bust', p: 0.03, name: 'a national recession' },
    { k: 'bumper', p: 0.04, name: 'a record crop year' }, { k: 'war', p: 0.012, name: 'a National Guard deployment overseas', what: 'the National Guard' }, { k: 'feast', p: 0.05, name: 'the town\'s anniversary festival' }
  ],
  fantasy: [
    { k: 'fire', p: 0.05, name: 'dragonfire on the hills' }, { k: 'flood', p: 0.035, name: 'the river bursting its banks' }, { k: 'storm', p: 0.04, name: 'a storm out of the mountains' },
    { k: 'raid', p: 0.05, name: 'a goblin raid' }, { k: 'war', p: 0.04, name: 'the war against the Iron Duke', what: 'the lord\'s muster' }, { k: 'tax', p: 0.05, name: 'the crown demanding a war tax' },
    { k: 'boom', p: 0.03, name: 'a new trade road through the pass' }, { k: 'bumper', p: 0.06, name: 'a blessed harvest' }, { k: 'feast', p: 0.05, name: 'the midsummer fair' }, { k: 'wolves', p: 0.04, name: 'direwolves out of the Whisperwood' }
  ],
  scifi: [
    { k: 'fire', p: 0.03, name: 'a fire in a hab ring' }, { k: 'breach', p: 0.03, name: 'a dome breach' }, { k: 'boom', p: 0.035, name: 'a rich ore seam discovered' },
    { k: 'bust', p: 0.03, name: 'the supply ship being delayed a year' }, { k: 'bumper', p: 0.04, name: 'a record harvest in the Agri-Domes' }, { k: 'feast', p: 0.05, name: 'Landing Day celebrations' }
  ],
  dropped: [
    { k: 'fire', p: 0.05, name: 'a wildfire' }, { k: 'flood', p: 0.04, name: 'a flood' }, { k: 'storm', p: 0.06, name: 'a terrible storm' }, { k: 'wolves', p: 0.05, name: 'a pack of predators' }, { k: 'bumper', p: 0.06, name: 'a season of plenty' }
  ]
};

// the empty world: what the settlement can learn
const DISCOVERIES = [
  { id: 'pots', name: 'making clay pots for storing food and water', needs: [], skill: 'craft', boost: { food: 0.05, health: 0.02 } },
  { id: 'smoking', name: 'smoking fish and meat to keep through winter', needs: [], skill: 'craft', boost: { food: 0.08 } },
  { id: 'stone', name: 'shaping good stone axes and blades', needs: [], skill: 'craft', boost: { tools: 0.15 } },
  { id: 'willow', name: 'a bark that eases pain and fever', needs: [], skill: 'healing', boost: { medicine: 0.08 } },
  { id: 'salt', name: 'a salt lick in the hills', needs: [], skill: 'outdoors', boost: { food: 0.04 } },
  { id: 'grain', name: 'a wild grass with seeds that can be planted', needs: [], skill: 'farming', boost: { farming: 0.15 }, role: 'Farmer' },
  { id: 'fields', name: 'clearing and planting the first fields', needs: ['grain', 'stone'], skill: 'farming', boost: { farming: 0.25 } },
  { id: 'flax', name: 'a plant with fibres for rope and cloth', needs: [], skill: 'craft', boost: { shelter: 0.05 }, role: 'Weaver' },
  { id: 'goats', name: 'taming wild goats', needs: [], skill: 'animals', boost: { food: 0.08 }, role: 'Herder' },
  { id: 'kiln', name: 'a kiln for bricks and better pots', needs: ['pots'], skill: 'craft', boost: { shelter: 0.1 }, role: 'Potter' },
  { id: 'herbs', name: 'a garden of healing herbs', needs: ['willow', 'grain'], skill: 'healing', boost: { medicine: 0.1 } },
  { id: 'copper', name: 'smelting copper from green rock', needs: ['kiln'], skill: 'craft', boost: { tools: 0.25 }, role: 'Smith' },
  { id: 'mill', name: 'a water-driven grinding stone', needs: ['fields', 'stone'], skill: 'craft', boost: { food: 0.1 } },
  { id: 'brew', name: 'brewing a rough beer', needs: ['grain', 'pots'], skill: 'craft', boost: { mood: 3 } },
  { id: 'boats', name: 'building boats for the lake', needs: ['stone'], skill: 'craft', boost: { food: 0.06 } },
  { id: 'writing', name: 'a shared way of writing things down', needs: [], skill: 'learning', boost: { medicine: 0.03 } }
];

// ---------- set-up for older saves ----------
function econUpgrade(W) {
  if (W.econ) return;
  const E = ECON[W.era];
  W.econ = { economy: 1, boomYears: 0, yields: {}, history: {} };
  if (W.era === 'dropped') {
    W.settle = W.settle || { shelter: 0.15, tools: 0.1, farming: 0, food: 1, stores: 0.3, discoveries: [], roles: [], medicineBase: W.settings.medicine };
    for (const h of Object.values(W.households)) h.wealth = 30; // no money here: everyone starts with nothing
    return;
  }
  const r = new Rng((W.seed * 97 + 3) >>> 0);
  for (const h of Object.values(W.households)) {
    if (h.dissolved != null || !h.members.length) continue;
    const inc = h.members.reduce((s, id) => s + personIncome(W, W.people[id], null), 0);
    const w = h.wealth || 30;
    const tier = w >= 80 ? 3 : w >= 50 ? 2 : w >= 25 ? 1 : 0;
    h.home = E.homes[tier][0];
    h.owned = E.ownChance > 0 && r.chance(clamp(E.ownChance * (0.4 + w / 70), 0, 0.98));
    h.property = h.owned ? Math.round(E.homes[tier][1] * r.range(0.7, 1.3)) : 0;
    h.savings = Math.round(inc * r.range(0.1, 1.2) * (0.3 + w / 50));
    if (W.era === 'modern' && h.owned && r.chance(0.6)) h.savings -= Math.round(h.property * r.range(0.2, 0.7)); // mortgages
    h.money = [];
    setWealth(W, h);
  }
}
function setWealth(W, h) {
  const E = ECON[W.era]; if (!E) return;
  const worth = (h.savings || 0) + (h.property || 0);
  const ref = E.income.low;
  const v = worth <= 0 ? 22 + worth / ref * 10 : 22 + 13 * Math.log2(1 + worth / ref);
  h.wealth = Math.round(clamp(v, 1, 99));
}

// ---------- income ----------
function personIncome(W, p, Y) {
  const E = ECON[W.era]; if (!E || !p || p.status !== 'resident' || p.died != null) return 0;
  const a = ageOf(p, W._y || W.year);
  const o = currentOcc(W, p);
  if (!o) {
    if (E.pension && a >= 62 && /Retired|Unable/.test(p.occupation || '')) return E.pension;
    if (/College/.test(p.occupation || '')) return Math.round(E.income.low * 0.25);
    // in older times the home, the holding and children's help all count
    if (!W.settings.familySizeLimit) {
      if (p.occupation === eraOf(W).homemaker) return Math.round(E.income.low * 0.45);
      if (p.occupation === eraOf(W).childWork && a >= 8) return Math.round(E.income.low * 0.2);
      if (/Odd jobs/.test(p.occupation || '')) return Math.round(E.income.low * 0.4);
    }
    return 0;
  }
  let base = E.income[o.cls || 'low'] * (0.7 + ((p.skills && p.skills[o.skill]) || 40) / 100 * 0.6);
  if (o.id === 'apprentice') base = E.income.low * 0.2;
  if (a < 16) base *= 0.3;
  if (Y) base *= sectorMult(W, o, Y, p);
  return Math.round(base);
}
function sectorMult(W, o, Y, p) {
  let m = 1;
  const prod = (o.produces || []).filter(r => Y.yields[r] != null);
  const uses = (o.uses || []).filter(r => Y.yields[r] != null);
  if (prod.length) m *= prod.reduce((s, r) => s + Math.pow(Y.yields[r], 0.55), 0) / prod.length; // prices make up for some of a poor crop
  if (uses.length) m *= Math.min(1.15, uses.reduce((s, r) => s + Y.yields[r], 0) / uses.length);
  if (/trade|arts|craft|leadership/.test(o.skill) || o.wp === 'own') m *= W.econ.economy;
  if (W.workplaces[p.workplace] && W.workplaces[p.workplace].owner === p.id) m = Math.pow(m, 1.5); // owners take the swings
  if (Y.laidOff && Y.laidOff.has(p.id)) m *= 0.5;
  return m;
}

// ---------- the year's weather, harvests and events (before the seasons run) ----------
function econStart(W, rng, y, R) {
  econUpgrade(W);
  const S = W.settings;
  const Y = { y, weather: [], yields: {}, events: [], pests: [], famine: 0, priceIndex: 1, healthMult: [1, 1, 1, 1], pending: [], notes: [] };
  // weather
  const table = W.era === 'scifi' ? WEATHER.scifi : WEATHER.land;
  for (let s = 0; s < 4; s++) {
    if (W.era === 'dropped' && W.options && W.options.perfectFirstYear !== false && y === W.startYear) { Y.weather.push('perfect'); continue; }
    const opts = table[s].map(([w, p], i) => [w, i === 0 ? p : p * S.weatherSwings]);
    Y.weather.push(rng.weighted(opts));
    Y.healthMult[s] = WX_HEALTH[Y.weather[s]] || 1;
  }
  plansForEcon(W, Y);
  // which resources matter here
  const res = new Set();
  const occs = W.era === 'dropped' ? [] : eraOf(W).occupations;
  for (const o of occs) for (const r of [...(o.produces || []), ...(o.uses || [])]) res.add(r);
  if (W.era === 'dropped') ['grain', 'game', 'fish'].forEach(r => res.add(r));
  for (const r of res) Y.yields[r] = rng.range(0.9, 1.1);
  for (const w of Y.weather) { const fx = WX_EFFECT[w] || {}; for (const [r, f] of Object.entries(fx)) if (Y.yields[r] != null) Y.yields[r] *= f; }
  // weather averages out to a normal year over time
  const norm = weatherNorms(W);
  for (const r of Object.keys(Y.yields)) if (norm[r]) Y.yields[r] /= norm[r];
  // pests
  for (const [r, name] of (PESTS[W.era] || [])) if (Y.yields[r] != null && rng.chance(0.06 * S.disasters)) { const f = rng.range(0.15, 0.6); Y.yields[r] *= f; Y.pests.push({ r, name, f }); }
  // events
  const evs = EVENTS[W.era] || [];
  for (const e of evs) if (rng.chance(e.p * S.disasters)) Y.events.push(Object.assign({ s: rng.int(0, 3) }, e));
  if (Y.events.some(e => e.k === 'bumper')) for (const r of Object.keys(Y.yields)) if (FOOD.has(r)) Y.yields[r] *= rng.range(1.15, 1.35);
  if (Y.events.some(e => e.k === 'flood')) { if (Y.yields.grain != null) Y.yields.grain *= 0.75; }
  plansForEcon2(W, rng, Y);
  // derived goods follow their inputs
  for (const [r, ins] of Object.entries(DERIVED)) if (Y.yields[r] != null) { const v = ins.filter(i => Y.yields[i] != null).map(i => Y.yields[i]); if (v.length) Y.yields[r] = Math.min(Y.yields[r], v.reduce((a, b) => a + b, 0) / v.length * rng.range(0.95, 1.05)); }
  for (const r of Object.keys(Y.yields)) Y.yields[r] = Math.round(clamp(Y.yields[r], 0.05, 1.6) * 100) / 100;
  // economy drifts; booms and busts push it
  W.econ.economy = clamp(W.econ.economy + rng.normal(0, 0.04) + (1 - W.econ.economy) * 0.15 + (W.soc ? lawFx(W, 'economy') * 0.3 : 0), 0.6, 1.5);
  for (const e of Y.events) {
    if (e.k === 'boom') { W.econ.economy = clamp(W.econ.economy + rng.range(0.15, 0.35), 0.6, 1.6); W.econ.boomYears = 3; }
    if (e.k === 'bust') W.econ.economy = clamp(W.econ.economy - rng.range(0.15, 0.35), 0.5, 1.5);
  }
  if (W.econ.boomYears > 0) { W.econ.boomYears--; Y.arrivalsMult = 2.2; }
  if (Y.events.some(e => e.k === 'bust')) Y.arrivalsMult = 0.4;
  // food
  const foods = Object.keys(Y.yields).filter(r => FOOD.has(r) && !['flour', 'bread'].includes(r));
  const food = foods.length ? foods.reduce((s, r) => s + Y.yields[r], 0) / foods.length : 1;
  Y.food = Math.round(food * 100) / 100;
  if (W.era === 'dropped') droppedFood(W, rng, y, Y);
  const E = ECON[W.era];
  Y.priceIndex = E ? Math.round(clamp(1 + (Math.pow(1 / Math.max(0.3, Y.food), 0.8) - 1) * E.priceDamp, 0.7, 3) * 100) / 100 : 1;
  const famineLine = W.era === 'modern' ? 0 : W.era === 'scifi' ? 0.7 : 0.75;
  Y.famine = Y.food < famineLine ? Math.round((famineLine - Y.food) / famineLine * 100) / 100 : 0;
  if (Y.famine && W.soc) Y.famine = Math.max(0, Math.round(Y.famine * (1 + lawFx(W, 'famine')) * 100) / 100);
  W._Y = Y;
  return Y;
}

// ---------- each season: events land, hunger bites, the cold kills ----------
function econSeason(W, rng, y, s, R, Y) {
  const people = lives(W);
  for (const e of Y.events.filter(e => e.s === s)) applyEvent(W, rng, y, s, R, Y, e);
  // hunger: the poor go short first
  if (Y.famine > 0 && (s === 3 || s === 0)) {
    for (const p of people) {
      const h = W.households[p.household]; const poor = !h || h.wealth < 35 || W.era === 'dropped';
      if (!poor && Y.famine < 0.4) continue;
      const a = ageOf(p, y);
      const hit = Y.famine * (poor ? 1 : 0.4);
      p.health = Math.round(clamp(p.health - hit * rng.int(4, 12), 1, 100));
      mindOf(p).yearStress += hit * 25;
      const risk = hit * (a < 5 ? 0.05 : a >= 65 ? 0.06 : 0.008) * (1.4 - p.health / 100) * (1 - W.settings.medicine * 0.5);
      if (rng.chance(risk)) die(W, rng, p, y, Y.famine > 0.4 ? 'starvation' : 'hunger and weakness', 'illness', R);
    }
    if (!Y.hungerNoted) { Y.hungerNoted = true; W.log.push({ y, s, t: 'famine', text: Y.famine > 0.4 ? `Famine: there was not enough food, and the poor starved.` : `A hungry season: food ran short for the poorer households.` }); }
  }
  // the empty world: exposure if shelter is poor
  if (W.era === 'dropped' && s === 3 && W.settle && W.settle.shelter < 0.7) {
    const exp = (0.7 - W.settle.shelter) * (Y.weather[3] === 'harsh and bitter' || Y.weather[3] === 'deep snow' ? 2 : 1);
    for (const p of people) { const a = ageOf(p, y); if (rng.chance(exp * (a < 5 || a >= 70 ? 0.04 : 0.004))) die(W, rng, p, y, 'cold and exposure', 'illness', R); }
  }
}
function districtOf(W, rng) { const ds = Object.values(W.households).filter(h => h.dissolved == null && h.members.length).map(h => h.district); return ds.length ? rng.pick(ds) : null; }
function applyEvent(W, rng, y, s, R, Y, e) {
  const people = lives(W); W._s = s;
  const note = text => { W.log.push({ y, s, t: e.k, text }); Y.notes.push(text); };
  const hhIn = d => Object.values(W.households).filter(h => h.dissolved == null && h.district === d && h.members.some(id => W.people[id] && W.people[id].status === 'resident'));
  const residentsOf = h => h.members.map(id => W.people[id]).filter(p => p && isAlive(p) && p.status === 'resident');
  if (e.k === 'fire' || e.k === 'flood' || e.k === 'storm' || e.k === 'breach') {
    const d = (e.where && Object.values(W.households).some(h => h.district === e.where)) ? e.where : districtOf(W, rng); if (!d) return;
    const hs = rng.sample(hhIn(d), e.k === 'storm' ? rng.int(3, 10) : rng.int(2, 8));
    let dead = 0, hurt = 0;
    for (const h of hs) {
      const loss = rng.range(0.3, 0.9) * (e.k === 'storm' ? 0.5 : 1);
      if (h.property) h.property = Math.round(h.property * (1 - loss));
      if (h.savings > 0) h.savings = Math.round(h.savings * (1 - loss * 0.5));
      for (const p of residentsOf(h)) {
        mindOf(p).yearStress += 30; mindOf(p).trauma = clamp(mindOf(p).trauma + 12, 0, 100);
        addEvent(W, p, y, 'disaster', `Lost much of ${hisHer(p)} home to ${e.name}.`, { why: `${cap(e.name)} struck ${d}.` });
        const a = ageOf(p, y);
        if (rng.chance((e.k === 'breach' ? 0.05 : 0.025) * (a < 6 || a > 70 ? 2 : 1))) { die(W, rng, p, y, e.k === 'fire' ? 'burned in ' + e.name : e.k === 'flood' ? 'drowned in ' + e.name : e.k === 'breach' ? 'killed in ' + e.name : 'killed in ' + e.name, 'accident', R); dead++; }
        else if (rng.chance(0.08)) { injure(W, rng, p, y, s, R, 'labor'); hurt++; }
      }
      setWealth(W, h);
    }
    note(`${cap(e.name)} struck ${d} in ${SEASONS[s].toLowerCase()}: ${hs.length} households lost much of what they had${dead ? `, and ${dead} died` : ''}.`);
    for (const p of people) if (isAlive(p) && !hs.some(h => h.id === p.household)) mindOf(p).worry += 4;
  } else if (e.k === 'war') {
    const men = rng.shuffle(people.filter(p => p.sex === 'm' && ageOf(p, y) >= 17 && ageOf(p, y) <= 40 && p.health > 40 && isAlive(p)));
    const n = Math.max(1, Math.round(people.length * rng.range(0.01, 0.03)));
    const taken = men.slice(0, n); let killed = 0, wounded = 0;
    for (const p of taken) {
      addEvent(W, p, y, 'war', `Went to fight in ${e.name}, called up by ${e.what}.`);
      ripple(W, rng, p, y, 'worry', 20, null);
      const roll = rng.next();
      if (roll < 0.18) { die(W, rng, p, y, `killed in ${e.name}`, 'violence', R); killed++; }
      else {
        const m = mindOf(p); m.trauma = clamp(m.trauma + rng.int(20, 60), 0, 100);
        if (roll < 0.45) { const l = rng.pick(LASTING.filter(x => !p.conditions.includes(x))); if (l) p.conditions.push(l); p.health = Math.round(clamp(p.health - rng.int(10, 25), 1, 100)); addEvent(W, p, y, 'war', `Came home from the war wounded${l ? `, with ${l}` : ''}.`); wounded++; }
        else addEvent(W, p, y, 'war', 'Came home from the war, changed by what he had seen.');
      }
    }
    note(`${e.what ? cap(e.what) : 'The call-up'} took ${taken.length} men to ${e.name}: ${killed} never came home${wounded ? `, ${wounded} came back wounded` : ''}.`);
  } else if (e.k === 'raid') {
    const hs = rng.sample(Object.values(W.households).filter(h => h.dissolved == null && h.members.length), rng.int(2, 6));
    let dead = 0;
    for (const h of hs) {
      if (h.savings > 0) h.savings = Math.round(h.savings * rng.range(0.3, 0.8));
      for (const p of residentsOf(h)) {
        mindOf(p).yearStress += 25; mindOf(p).trauma = clamp(mindOf(p).trauma + 15, 0, 100);
        addEvent(W, p, y, 'disaster', `Robbed and terrorised by ${e.name}.`);
        if (ageOf(p, y) >= 16 && rng.chance(0.06)) { die(W, rng, p, y, `killed by ${e.name}`, 'violence', R); dead++; }
      }
      setWealth(W, h);
    }
    note(`${cap(e.name)} fell on ${hs.length} households in ${SEASONS[s].toLowerCase()}${dead ? `, killing ${dead}` : ''}.`);
    for (const p of people) if (isAlive(p)) mindOf(p).worry += 6;
  } else if (e.k === 'wolves') {
    if (Y.yields.livestock != null) Y.yields.livestock = Math.round(Y.yields.livestock * 0.85 * 100) / 100;
    const victims = people.filter(p => isAlive(p) && (ageOf(p, y) < 12 || /shepherd|herd|hunter|woodcutter|forager|scout/i.test(p.occupation || '')));
    let dead = 0;
    if (victims.length && rng.chance(0.4)) { const v = rng.pick(victims); if (rng.chance(0.5)) { die(W, rng, v, y, `killed by ${e.name}`, 'violence', R); dead++; } else injure(W, rng, v, y, s, R, 'outdoors'); }
    note(`${cap(e.name)} preyed on the flocks${dead ? ' and killed a person' : ''}.`);
  } else if (e.k === 'tax') {
    for (const h of Object.values(W.households)) if (h.dissolved == null && h.savings > 0) { h.savings = Math.round(h.savings * 0.85); setWealth(W, h); }
    for (const p of people) if (ageOf(p, y) >= 18) mindOf(p).yearStress += 8;
    note(`${cap(e.name)}: every household paid more, and there was grumbling.`);
  } else if (e.k === 'feast') {
    for (const p of people) mindOf(p).joy += 8;
    note(`${cap(e.name)} lifted spirits.`);
  } else if (e.k === 'boom') {
    note(`${cap(e.name)} brought new money and new people.`);
    for (const p of people) if (p.occId) mindOf(p).joy += 5;
  } else if (e.k === 'bust') {
    const pool = people.filter(p => p.occId && W.workplaces[p.workplace] && W.workplaces[p.workplace].kind === 'shared' && !W.workplaces[p.workplace].owner);
    Y.laidOff = new Set();
    for (const p of rng.sample(pool, Math.round(pool.length * rng.range(0.1, 0.3)))) {
      Y.laidOff.add(p.id);
      if (W.settings.familySizeLimit || rng.chance(0.5)) {
        const was = p.occupation; leaveJob(W, rng, p, y, 'was laid off'); p.occId = null; p.occupation = W.settings.familySizeLimit ? 'Unemployed (looking for work)' : 'Odd jobs';
        addEvent(W, p, y, 'work', `Lost ${hisHer(p)} work as ${/^[aeiou]/i.test(was) ? 'an' : 'a'} ${was.toLowerCase()}.`, { why: cap(e.name) + '.' });
        mindOf(p).yearStress += 25; R.jobsLost++;
      }
    }
    note(`${cap(e.name)}: hard times, and ${Y.laidOff.size} people lost work or wages.`);
  } else if (e.k === 'bumper') note(`${cap(e.name)}: the stores were full.`);
}

// ---------- the empty world: food, shelter and discoveries ----------
function droppedRoles(W) {
  const era = ERAS.dropped;
  const extra = ((W.settle && W.settle.roles) || []).map(n => ({ name: n, skill: n === 'Farmer' ? 'farming' : n === 'Herder' ? 'animals' : 'craft', n: n === 'Farmer' ? 0.12 + (W.settle.farming || 0) * 0.15 : 0.04 }));
  return era.survivalRoles.concat(extra);
}
function droppedFood(W, rng, y, Y) {
  const st = W.settle; const people = lives(W);
  const count = name => people.filter(p => p.occupation === name).length;
  const workers = people.filter(p => p.occId).length || 1;
  const need = people.reduce((s, p) => s + (ageOf(p, y) < 12 ? 0.6 : 1), 0) || 1;
  const wild = Math.max(0.35, 1.15 - (y - W.startYear) * 0.025); // easy wild food gets scarcer near camp
  const produce = (count('Forager') * 3.6 * wild + count('Hunter and fisher') * 4.4 * ((Y.yields.game || 1) + (Y.yields.fish || 1)) / 2 + count('Gatherer of seeds and plants') * 2.6 * wild + count('Farmer') * 7 * Math.max(0.15, st.farming) * (Y.yields.grain || 1) + count('Herder') * 5 + count('Cook') * 0.8) * (0.7 + st.tools * 0.6);
  const food = clamp(produce / need + st.stores * 0.3 + (st.foodBoost || 0), 0.2, 1.5);
  st.food = Math.round(food * 100) / 100;
  st.stores = clamp(st.stores * 0.5 + Math.max(0, food - 1) * 0.6, 0, 1);
  Y.food = Math.min(Y.food, st.food) || st.food;
  // shelter and tools grow with hands
  st.shelter = Math.round(clamp(st.shelter + count('Shelter builder') / need * 1.6 * (0.6 + st.tools) - 0.03, 0, 1) * 100) / 100;
  if (st.farming > 0) st.farming = Math.round(clamp(st.farming + count('Farmer') / need * 0.6, 0, 1) * 100) / 100;
  st.tools = Math.round(clamp(st.tools + count('Toolmaker') / need * 1.4 + count('Smith') / need * 2 - 0.02, 0, 1) * 100) / 100;
  // discoveries
  const known = new Set(st.discoveries.map(d => d.id));
  const open = DISCOVERIES.filter(d => !known.has(d.id) && d.needs.every(n => known.has(n)));
  const tries = 1 + Math.floor(people.length / 300);
  for (let i = 0; i < tries && open.length; i++) {
    if (!rng.chance(0.45)) continue;
    const d = open.splice(Math.floor(rng.next() * open.length), 1)[0];
    const cands = people.filter(p => ageOf(p, y) >= 12 && p.skills).sort((a, b) => (b.skills[d.skill] + b.intellect / 2) - (a.skills[d.skill] + a.intellect / 2));
    const who = cands.length ? rng.pick(cands.slice(0, 8)) : null;
    st.discoveries.push({ id: d.id, y, name: d.name, by: who ? who.id : null });
    for (const [k, v] of Object.entries(d.boost)) {
      if (k === 'medicine') W.settings.medicine = Math.round(clamp(W.settings.medicine + v, 0, 0.6) * 100) / 100;
      else if (k === 'food') st.foodBoost = (st.foodBoost || 0) + v;
      else if (k === 'mood') st.moodBoost = (st.moodBoost || 0) + v;
      else if (k === 'health') st.healthBoost = (st.healthBoost || 0) + v;
      else st[k] = Math.round(clamp((st[k] || 0) + v, 0, 1) * 100) / 100;
    }
    if (d.role && !st.roles.includes(d.role)) st.roles.push(d.role);
    W._s = rng.int(0, 3);
    if (who) { addEvent(W, who, y, 'discovery', `Worked out ${d.name}.`); mindOf(who).joy += 20; ripple(W, rng, who, y, 'pride', 10, null); }
    W.log.push({ y, s: W._s, t: 'discovery', text: `A discovery: ${d.name}${who ? `, thanks to @${who.id}` : ''}.` });
    Y.notes.push(`A discovery: ${d.name}${who ? `, thanks to @${who.id}` : ''}.`);
  }
}

// ---------- money, at the end of the year ----------
function yearMoney(W, rng, y, R, Y) {
  const E = ECON[W.era];
  if (W.era === 'dropped') { for (const p of lives(W)) { if (W.settle.moodBoost) mindOf(p).joy += W.settle.moodBoost; } W.econ.history[y] = { food: W.settle.food, shelter: W.settle.shelter, tools: W.settle.tools, farming: W.settle.farming, weather: Y.weather, yields: Y.yields }; return; }
  // people's incomes
  for (const p of lives(W)) { p.income = personIncome(W, p, Y); }
  // owners of empty homes: pass the estate on
  for (const h of Object.values(W.households)) {
    const live = h.members.map(id => W.people[id]).filter(p => p && isAlive(p) && p.status === 'resident');
    if (live.length) { h.owner = h.head || h.owner; continue; }
    const worth = (h.savings || 0) + (h.property || 0);
    if (!worth || h.settled) continue;
    h.settled = y;
    const owner = W.people[h.owner];
    if (!owner) continue;
    if (owner.status === 'resident' && isAlive(owner)) { const nh = W.households[owner.household]; if (nh && nh !== h) { nh.savings = (nh.savings || 0) + (h.savings || 0); if (h.property > 0) { nh.savings += h.property; } h.savings = 0; h.property = 0; setWealth(W, nh); addEvent(W, owner, y, 'money', `Sold up ${hisHer(owner)} old home and brought what was left.`, { minor: true }); } continue; }
    if (owner.status === 'dead') settleEstate(W, rng, owner, h, y);
    else { h.savings = 0; h.property = 0; } // left town: took it with them
  }
  // households: earn, spend, save, borrow
  for (const h of Object.values(W.households)) {
    const live = h.members.map(id => W.people[id]).filter(p => p && isAlive(p) && p.status === 'resident');
    if (!live.length) continue;
    if (h.savings == null) { const par = live.map(p => W.people[p.father] || W.people[p.mother]).find(q => q && W.households[q.household] && W.households[q.household] !== h); seedNewHousehold(W, h, par ? W.households[par.household] : null); }
    const income = live.reduce((s, p) => s + (p.income || 0), 0);
    let costs = live.reduce((s, p) => s + (ageOf(p, y) < 16 ? E.living.child : E.living.adult), 0);
    costs = costs * 0.5 + costs * 0.5 * Y.priceIndex;
    if (!h.owned) costs += costs * E.rentShare;
    const dues = (E.dues || lawFx(W, 'dues') > 0) ? income * Math.max(0, (E.dues || 0) + lawFx(W, 'dues')) : 0;
    if (h.savings < 0) costs += -h.savings * E.debtRate;
    // people spend most of what is left over; a little is saved
    const surplus = income - costs - dues;
    if (surplus > 0) costs += surplus * (h.savings > E.income.mid * 3 ? 0.92 : 0.82);
    h.savings = Math.round(h.savings + income - costs - dues);
    // family help: grown children or brothers and sisters who can afford it
    if (h.savings < 0 && income - costs - dues < 0) {
      const need = Math.min(-h.savings, costs - income + dues);
      const kin = [];
      for (const p of live) for (const id of [...p.children, ...siblingsOf(W, p), p.father, p.mother]) { const q = W.people[id]; const qh = q && q.status === 'resident' && isAlive(q) ? W.households[q.household] : null; if (qh && qh !== h && qh.savings > E.income.low * 2 && !kin.includes(qh)) kin.push(qh); }
      if (kin.length) { const helper = kin.sort((a, b) => b.savings - a.savings)[0]; const amt = Math.round(Math.min(need, helper.savings * 0.15)); helper.savings -= amt; h.savings += amt; const hp = W.people[helper.head]; const head = W.people[h.head]; if (hp && head && amt > E.income.low * 0.2) { addEvent(W, head, y, 'money', `Got through the year with money from @${hp.id}.`, { minor: true }); addEvent(W, hp, y, 'money', `Helped @${head.id}'s household get through a hard year.`, { minor: true }); } setWealth(W, helper); }
      // the church, the lord or the state stops the worst
      if (h.savings < -E.income.low * 1.5) { h.savings = Math.round(-E.income.low * 1.5); h.onCharity = y; }
    }
    // the lord's household collects the dues
    if (dues) { const lordH = Object.values(W.households).find(x => x.members.some(id => W.people[id] && /^lord/i.test(W.people[id].occupation || ''))); if (lordH && lordH !== h) lordH.savings = (lordH.savings || 0) + Math.round(dues * 0.6); }
    // trouble with debt
    if (h.savings < -income * 1.5 && income > 0 || (h.savings < -E.income.low * 2)) {
      const head = W.people[h.head];
      if (h.owned && h.property > 0 && rng.chance(0.5)) {
        h.savings += Math.round(h.property * 0.85); const was = h.home; h.property = 0; h.owned = false; h.home = E.homes[Math.max(0, E.homes.findIndex(x => x[0] === was) - 1)][0];
        for (const p of live) if (ageOf(p, y) >= 14) { addEvent(W, p, y, 'money', `The household had to sell ${was} to pay its debts.`); mindOf(p).yearStress += 25; }
        R.items.push({ k: 'sold', ids: [h.head] });
      } else if (head && !h.debtNoted) {
        h.debtNoted = y;
        for (const p of live) if (ageOf(p, y) >= 14) { addEvent(W, p, y, 'money', 'The household fell deep into debt.'); mindOf(p).yearStress += 20; }
      }
    } else if (h.savings > 0) h.debtNoted = null;
    // buying a home when there is money for it
    if (!h.owned && E.ownChance > 0) {
      const tier = Math.min(E.homes.length - 1, Math.max(0, E.homes.findIndex(x => x[0] === h.home)));
      const price = E.homes[Math.max(1, tier)][1];
      const canBuy = W.era === 'modern' ? h.savings > price * 0.2 : h.savings > price * 1.1;
      if (price > 0 && canBuy && rng.chance(0.4)) { h.owned = true; h.property = price; h.home = E.homes[Math.max(1, tier)][0]; h.savings -= W.era === 'modern' ? price : price; const head = W.people[h.head]; if (head) addEvent(W, head, y, 'money', `Bought ${h.home}.`); }
    }
    // moving up in the world
    const tierNow = Math.max(0, E.homes.findIndex(x => x[0] === h.home));
    if (h.owned && tierNow < E.homes.length - 2 && h.savings > E.homes[tierNow + 1][1] * 1.2 && rng.chance(0.25)) {
      const nb = E.homes[tierNow + 1]; h.savings -= nb[1] - (h.property || 0); h.property = nb[1]; h.home = nb[0];
      const head = W.people[h.head]; if (head) { addEvent(W, head, y, 'money', `Moved the household up to ${nb[0]}.`); mindOf(head).joy += 12; }
    }
    if (h.property > 0 && W.era === 'modern') h.property = Math.round(h.property * (1 + rng.normal(0.02, 0.03) * W.econ.economy));
    setWealth(W, h);
    h.money = h.money || [];
    h.money.push([y, income, Math.round(costs + dues), h.savings, h.property || 0]);
    if (h.money.length > 200) h.money.shift();
    h.lastIncome = income;
  }
  // good and bad years in particular trades: tell the people involved
  const hit = {};
  for (const p of lives(W)) {
    const o = currentOcc(W, p); if (!o || !p.occId) continue;
    const m = sectorMult(W, o, Y, p);
    if (m < 0.75 || m > 1.25) (hit[o.name] = hit[o.name] || { m, ids: [] }).ids.push(p.id);
    if (m < 0.75) {
      const r = [...(o.uses || []), ...(o.produces || [])].find(r => Y.yields[r] != null && Y.yields[r] < 0.8);
      const pest = Y.pests.find(x => x.r === r || (DERIVED[r] || []).includes(x.r) || (DERIVED[r] || []).some(d => (DERIVED[d] || []).includes(x.r)));
      addEvent(W, p, y, 'setback', `A hard year for ${/^[aeiou]/i.test(o.name) ? 'an' : 'a'} ${o.name.toLowerCase()}: ${hisHer(p)} earnings fell${r ? ` because the ${r} ${(o.uses || []).includes(r) ? 'supply' : 'crop'} was poor` : ''}.`, { why: pest ? `${cap(pest.name)}.` : (r ? `Bad weather (${Y.weather.filter(w => WX_EFFECT[w] && WX_EFFECT[w][r] < 1).join(', ') || 'a poor year'}).` : 'Hard times in trade.') });
      mindOf(p).yearStress += 15;
    } else if (m > 1.25) { addEvent(W, p, y, 'success', `A good year for ${/^[aeiou]/i.test(o.name) ? 'an' : 'a'} ${o.name.toLowerCase()}: earnings were up.`, { minor: true }); mindOf(p).joy += 8; }
  }
  Y.hardHit = Object.entries(hit).filter(([, v]) => v.m < 0.75).map(([k, v]) => ({ job: k, n: v.ids.length, m: Math.round(v.m * 100) }));
  Y.goodYear = Object.entries(hit).filter(([, v]) => v.m > 1.25).map(([k, v]) => ({ job: k, n: v.ids.length, m: Math.round(v.m * 100) }));
  W.econ.history[y] = { weather: Y.weather, yields: Y.yields, food: Y.food, price: Y.priceIndex, economy: Math.round(W.econ.economy * 100) / 100, famine: Y.famine, pests: Y.pests.map(p => p.name), hardHit: Y.hardHit, goodYear: Y.goodYear };
}
function settleEstate(W, rng, dead, h, y) {
  const E = ECON[W.era];
  const kids = dead.children.map(id => W.people[id]).filter(c => c && isAlive(c) && (c.status === 'resident' || c.status === 'departed')).sort((a, b) => a.born - b.born);
  let heirs = kids.filter(c => c.status === 'resident');
  if (!heirs.length) heirs = siblingsOf(W, dead).map(id => W.people[id]).filter(s => s && isAlive(s) && s.status === 'resident');
  const savings = Math.max(0, h.savings || 0), prop = h.property || 0;
  h.savings = 0; h.property = 0;
  if (!heirs.length || savings + prop <= 0) return;
  const rule = E.inheritance;
  const main = rule === 'eldest son' ? (heirs.find(c => c.sex === 'm') || heirs[0]) : rule === 'eldest child' ? heirs[0] : null;
  const give = (p, amt, what) => { const hh = W.households[p.household]; if (!hh) return; hh.savings = (hh.savings || 0) + Math.round(amt); setWealth(W, hh); addEvent(W, p, y, 'inherited', `Inherited ${what} from @${dead.id}.`); mindOf(p).joy += 5; };
  if (main) {
    give(main, prop + savings * (heirs.length > 1 ? 0.6 : 1), prop ? `the family home and most of what there was` : 'most of what there was');
    const rest = heirs.filter(c => c !== main);
    for (const c of rest) give(c, savings * 0.4 / rest.length, 'a small share');
  } else for (const c of heirs) give(c, (prop + savings) / heirs.length, `an equal share (about ${Math.round((prop + savings) / heirs.length).toLocaleString()} ${E.unit})`);
  // quarrels over the will
  if (heirs.length >= 2 && savings + prop > E.income.mid && rng.chance(main ? 0.35 : 0.15)) {
    const [a, b] = rng.sample(heirs, 2);
    const r = getRel(W, a.id, b.id); const sc = (r ? r.score : 0) - rng.int(25, 60);
    const nr = setRelIndexed(W, a.id, b.id, sc <= -55 ? 'estranged' : 'strained', sc, y, `bitter words over ${dead.first}'s estate`);
    relNote(nr, y, `@${a.id} and @${b.id} fell out over the inheritance from @${dead.id}.`);
    addEvent(W, a, y, 'quarrel', `Fell out with @${b.id} over what @${dead.id} left.`); addEvent(W, b, y, 'quarrel', `Fell out with @${a.id} over what @${dead.id} left.`);
  }
}
// new homes start with a little help from family
function seedNewHousehold(W, h, from) {
  const E = ECON[W.era]; if (!E || h.savings != null) return;
  h.savings = 0; h.property = 0; h.owned = false; h.home = E.homes[W.era === 'modern' ? 1 : 0][0]; h.money = [];
  if (from && from.savings > 0) { const gift = Math.round(from.savings * 0.08); from.savings -= gift; h.savings += gift; }
  setWealth(W, h);
}

// ---------- the year's weather and money in words ----------
function econSummary(W, y, Y) {
  const out = [];
  const wx = Y.weather; const seasonsTxt = wx.map((w, i) => `${SEASONS[i].toLowerCase()} ${w}`).filter((x, i) => !['mild', 'warm', 'stable', 'cold'].includes(wx[i]) || i === 3 && wx[i] !== 'mild');
  if (wx.every(w => w === 'perfect')) out.push('The weather was perfect all year.');
  else if (seasonsTxt.length) out.push(`Weather: ${seasonsTxt.join(', ')}.`);
  else out.push('The weather was kind.');
  for (const p of Y.pests) out.push(`${cap(p.name)} cut the ${p.r === 'food' ? 'food' : p.r} yield to ${Math.round(Y.yields[p.r] * 100)}%.`);
  if (W.era !== 'dropped') {
    if (Y.food < 0.85) out.push(`The harvest was poor (${Math.round(Y.food * 100)}% of normal) and food prices rose ${Math.round((Y.priceIndex - 1) * 100)}%.`);
    else if (Y.food > 1.12) out.push(`The harvest was plentiful and food was cheap.`);
    if (Y.hardHit && Y.hardHit.length) out.push(`Hit hardest: ${Y.hardHit.slice(0, 3).map(h => `${h.job.toLowerCase()}s`).join(', ')}.`);
  } else if (W.settle) {
    out.push(`Food: ${W.settle.food >= 1 ? 'enough for everyone' : W.settle.food >= 0.8 ? 'a little short' : 'not enough'}; shelter ${Math.round(W.settle.shelter * 100)}% built; tools ${Math.round(W.settle.tools * 100)}%.`);
  }
  for (const n of Y.notes) out.push(n);
  return out.join(' ');
}

if (typeof module !== 'undefined') Object.assign(module.exports, { econStart, econUpgrade, ECON });

// ---------- history periods (V10) ----------
ECON.victorian = Object.assign({}, ECON.frontier, { unit: 'pounds', homes: [['a cellar dwelling', 25], ['a back-to-back house', 200], ['a terraced house', 900], ['a villa on the park', 6000]], ownChance: 0.2 });
ECON.edwardian = Object.assign({}, ECON.frontier, { unit: 'pounds', homes: [['a cellar dwelling', 25], ['a back-to-back house', 200], ['a through terrace with a yard', 900], ['a villa on the park', 6000]], ownChance: 0.25 });
ECON.georgian = Object.assign({}, ECON.medieval, { homes: [['a one-room cottage', 500], ['a cottage and garden', 1400], ['a brick townhouse', 4000], ['the Hall', 30000]] });
ECON.tudor = Object.assign({}, ECON.medieval, { homes: [['a one-room cottage', 500], ['a cottage and croft', 1400], ['a timber-framed house with a chimney', 4000], ['the manor house', 30000]] });
PESTS.victorian = PESTS.edwardian = [['grain', 'the wheat rust'], ['livestock', 'foot-and-mouth in the herds'], ['apples', 'apple scab'], ['ore', 'the coal seam running thin'], ['timber', 'a wet year at the timber yard']];
EVENTS.tudor = [
  { k: 'fire', p: 0.05, name: 'a great fire in the Market Place' }, { k: 'flood', p: 0.04, name: 'the river flooding' }, { k: 'storm', p: 0.05, name: 'a great storm' },
  { k: 'war', p: 0.035, name: 'the Queen\'s war against Spain', what: 'the trained bands' }, { k: 'raid', p: 0.02, name: 'a band of sturdy beggars' },
  { k: 'tax', p: 0.06, name: 'a new subsidy granted to the Crown' }, { k: 'boom', p: 0.04, name: 'the cloth trade booming' }, { k: 'bust', p: 0.03, name: 'the cloth trade with Antwerp failing' },
  { k: 'bumper', p: 0.05, name: 'a bumper harvest' }
];
EVENTS.georgian = [
  { k: 'fire', p: 0.04, name: 'a fire at the coaching inn' }, { k: 'flood', p: 0.04, name: 'the river flooding' }, { k: 'storm', p: 0.05, name: 'a great storm' },
  { k: 'war', p: 0.04, name: 'the war with France', what: 'the militia' }, { k: 'raid', p: 0.02, name: 'a gang of highwaymen' },
  { k: 'tax', p: 0.05, name: 'a new tax on windows and candles' }, { k: 'boom', p: 0.05, name: 'the canal reaching town' }, { k: 'boom', p: 0.03, name: 'a cotton mill opening' },
  { k: 'bust', p: 0.03, name: 'the price of corn collapsing' }, { k: 'bumper', p: 0.05, name: 'a bumper harvest' }
];
EVENTS.victorian = [
  { k: 'fire', p: 0.06, name: 'a fire at the mill' }, { k: 'flood', p: 0.04, name: 'the river bursting its banks' }, { k: 'storm', p: 0.05, name: 'a great gale' },
  { k: 'raid', p: 0.02, name: 'a gang of garotters' }, { k: 'boom', p: 0.05, name: 'a new mill opening' }, { k: 'boom', p: 0.04, name: 'a rich new coal seam' },
  { k: 'bust', p: 0.05, name: 'the cotton famine' }, { k: 'bumper', p: 0.04, name: 'a bumper harvest' }, { k: 'war', p: 0.015, name: 'the war in the Crimea', what: 'the regiment' }
];
EVENTS.edwardian = [
  { k: 'fire', p: 0.05, name: 'a fire at the mill' }, { k: 'flood', p: 0.04, name: 'the river bursting its banks' }, { k: 'storm', p: 0.05, name: 'a great gale' },
  { k: 'raid', p: 0.015, name: 'a gang of burglars' }, { k: 'boom', p: 0.05, name: 'a new factory opening' }, { k: 'boom', p: 0.03, name: 'the tramway reaching town' },
  { k: 'bust', p: 0.05, name: 'a long strike at the pit' }, { k: 'bumper', p: 0.04, name: 'a bumper harvest' }, { k: 'war', p: 0.03, name: 'the Great War', what: 'the Pals battalion' }
];
periodFill(ECON, PESTS, EVENTS);
