// ================= V11: months, and the village journal =================
// The chronicle year runs spring to winter, so its months run March to February (January and February fall in the next calendar year).
const MONTHS = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'];
function monthOf(e, p, i) { if (e.m != null) return e.m; const h = (p.id * 7 + i * 13 + e.y) % 12; return e.s != null ? e.s * 3 + (h % 3) : h; }
const calYear = (mi, y) => mi >= 10 ? y + 1 : y;
const jyl = (W, n) => { const e = eraOf(W); return e.yearLabel ? e.yearLabel(n) : String(n); };
// An entry about month m of year y is written on the 2nd of the next month.
function journalDate(W, y, m) { const nm = (m + 1) % 12, ny = m === 11 ? y + 1 : y; return `2nd ${MONTHS[nm]} ${jyl(W, calYear(nm, ny))}`; }
function monthLabel(W, y, m) { return `${MONTHS[m]} ${jyl(W, calYear(m, y))}`; }

function journalState(W) { W.journal = W.journal || { mode: 'random', writers: [], named: {}, entries: [], turn: 0 }; return W.journal; }

// Who writes this month: a writer you named for it, else by the way you chose (random from the village, random from your list, or your list in turn).
function pickWriter(W, rng, y, m) {
  const J = journalState(W), can = q => q && isAlive(q) && q.status === 'resident' && ageOf(q, y) >= 12;
  const named = W.people[J.named[`${y}-${m}`]]; if (can(named)) return named;
  const list = J.writers.map(id => W.people[id]).filter(can);
  if (J.mode === 'listTurn' && list.length) { const q = list[(J.turn || 0) % list.length]; J.turn = (J.turn || 0) + 1; return q; }
  if (J.mode === 'listRandom' && list.length) return rng.pick(list);
  const all = lives(W).filter(can); return all.length ? rng.pick(all) : null;
}

// ---------- writing an entry ----------
const lcFirst = s => s ? s[0].toLowerCase() + s.slice(1) : s;
const PUBLIC = new Set(['died', 'arrived', 'married', 'partnered', 'divorced', 'child_born', 'left', 'setback', 'success', 'conflict', 'feud', 'peace', 'injury', 'ill']);
const SEASON_LINES = [
  ['The days are drawing out and the mud is drying.', 'Spring at last, and everything green again.', 'Showers one hour, sunshine the next.'],
  ['Long hot days, and dust on everything.', 'High summer, and the evenings are light till late.', 'A close, heavy month, with thunder about.'],
  ['The leaves are turning and the mornings are sharp.', 'Mist on the fields most mornings now.', 'Wind and rain; the year is going down.'],
  ['Bitter cold, and short grey days.', 'Frost on the inside of the window this morning.', 'A long dark month; we keep close to the fire.']
];
// How the writer refers to someone: "my wife @12", "my son @40", or just "@12"
function refTo(W, w, id) {
  if (id === w.id) return 'me';
  const q = W.people[id]; if (!q) return 'someone';
  if (w.spouse === id) return `my ${rel3(q, 'husband', 'wife', 'partner')} @${id}`;
  if (w.children.includes(id)) return `my ${rel3(q, 'son', 'daughter', 'child')} @${id}`;
  if (w.father === id || w.mother === id) return `my ${rel3(q, 'father', 'mother', 'parent')}`;
  if ((q.father && q.father === w.father) || (q.mother && q.mother === w.mother)) return `my ${rel3(q, 'brother', 'sister', 'sibling')} @${id}`;
  return `@${id}`;
}
function firstPerson(W, w, text) {
  let t = text.replace(/^Badly hurt/, 'Was badly hurt').replace(/@(\d+)/g, (_, id) => refTo(W, w, +id)).replace(/\.$/, '');
  if (/^[A-Z][a-z]/.test(t) && !/^(The|A|An|My|Their|His|Her|Children|People|Nobody|Everyone)\b/.test(t)) t = 'I ' + lcFirst(t);
  if (genderOf(w) === 'man') t = t.replace(/\bhis\b/g, 'my').replace(/\bhimself\b/g, 'myself').replace(/\bhe\b/g, 'I');
  else if (genderOf(w) === 'woman') t = t.replace(/\bherself\b/g, 'myself').replace(/\bshe\b/g, 'I');
  return t.replace(/\bI was born\b/, 'I came into the world') + '.';
}
function aboutOther(W, w, q, text) {
  let t = text.replace(/^Badly hurt/, 'Was badly hurt').replace(/@(\d+)/g, (_, id) => refTo(W, w, +id)).replace(/\.$/, '');
  if (/^(Son|Daughter|Child) /.test(t)) t = `${refTo(W, w, q.id)}'s ${lcFirst(t)}`; // "Avice's son Alan was born"
  else if (!/^@|^my /.test(t) && /^[A-Z]/.test(t)) t = `${refTo(W, w, q.id)} ${lcFirst(t)}`;
  return t[0].toUpperCase() + t.slice(1) + '.';
}
function feeling(W, rng, w, q, e) {
  const r = relScore(W, w.id, q.id), close = r > 40 || w.spouse === q.id || w.children.includes(q.id) || w.father === q.id || w.mother === q.id, foe = r < -30;
  if (e.t === 'died') return close ? rng.pick(['I cannot stop weeping.', 'The house feels empty already.', 'I keep turning to tell them something.']) : foe ? rng.pick(['I will not pretend to mourn.', 'I felt nothing, and I am not proud of it.']) : rng.pick(['May they rest in peace.', 'Half the town came to the burial.', '']);
  if (e.t === 'married' || e.t === 'partnered') return foe ? rng.pick(['I give it a year.', 'Well, they deserve each other.']) : close ? 'I danced till my feet ached.' : rng.pick(['I wish them well.', '']);
  if (e.t === 'child_born') return close ? 'A fine, loud baby.' : '';
  if (e.t === 'conflict' || e.t === 'feud') return foe ? 'Serves them right, some would say.' : rng.pick(['A shameful business.', 'People should be kinder.', '']);
  if (e.t === 'injury' || e.t === 'ill') return close ? 'I have been sitting with them.' : rng.pick(['I hope they mend.', '', '', '']);
  return '';
}
function writeEntry(W, rng, w, y, m) {
  const era = eraOf(W), m3 = Math.floor(m / 3), pop = lives(W).length, out = [], name = q => `@${q.id}`;
  const circle = new Set([w.father, w.mother, w.spouse, ...w.children]);
  const h = W.households[w.household]; if (h) h.members.forEach(id => circle.add(id));
  for (const r of relsOf(W, w.id)) if (!r.ended && Math.abs(r.score) >= 30) circle.add(r.a === w.id ? r.b : r.a);
  // what happened this month that they would know of
  const mine = [], others = [], seen = new Set();
  for (const q of Object.values(W.people)) {
    q.events.forEach((e, i) => {
      if (e.y !== y || monthOf(e, q, i) !== m || e.minor) return;
      if (q === w) { if (e.t !== 'born' && !e.lw) mine.push(e); return; }
      if (e.secret || e.t === 'born' || e.t === 'ripple') return; // a birth is told once, from the parents' side
      const ids = [q.id, ...[...e.text.matchAll(/@(\d+)/g)].map(x => +x[1])].sort((a, b) => a - b);
      const key = e.t === 'child_born' || /gave birth|became a (father|mother|parent)/.test(e.text) ? 'birth:' + (ids.filter(id => W.people[id] && W.people[id].born === y && id !== q.id)[0] ?? ids.join(',')) : e.t + ':' + ids.join(',');
      if (seen.has(key)) return; seen.add(key);
      if (!circle.has(q.id) && e.t === 'ill' && !/nearly died/.test(e.text)) return; // other people's colds are not news
      if (circle.has(q.id) ? e.t !== 'ripple' : PUBLIC.has(e.t) && (pop < 400 || relScore(W, w.id, q.id) !== 0)) others.push([q, e]);
    });
  }
  const rank = e => { const i = ['died', 'married', 'child_born', 'arrived', 'divorced', 'left', 'injury', 'ill', 'conflict', 'feud', 'success', 'setback', 'work'].indexOf(e.t); return i < 0 ? 99 : i; };
  others.sort((a, b) => (circle.has(b[0].id) - circle.has(a[0].id)) || rank(a[1]) - rank(b[1]));
  // opening: the season, the town's news, their spirits
  const mind = mindOf(w), spirits = (mind.mood || 0) + (mind.joy || 0) - (mind.stress || 0) / 2 - (mind.yearStress || 0) / 3;
  out.push(rng.pick(SEASON_LINES[m3]) + (spirits < -15 ? rng.pick([' I have been low in spirits.', ' My heart has been heavy.', '']) : spirits > 25 ? rng.pick([' I have been in good heart.', ' Life has been kind to me lately.', '']) : ''));
  if (m % 3 === 0) for (const l of (W.log || []).filter(l => l.y === y && (l.s == null || l.s === m3) && /weather|event|outbreak|law|election|econ|disaster/.test(l.t || '')).slice(0, 2)) out.push(`News in ${W.name}: ${lcFirst(String(l.text).replace(/\.$/, ''))}.`);
  // their own month
  for (const e of mine.slice(0, 4)) out.push(firstPerson(W, w, e.text) + (e.secret ? ' I have told no one.' : ''));
  // other people
  for (const [q, e] of others.slice(0, mine.length ? 4 : 6)) {
    const f = feeling(W, rng, w, q, e), told = aboutOther(W, w, q, e.text);
    const pre = circle.has(q.id) ? '' : rng.pick(['', '', 'I hear that ', 'Word is that ', 'They say ']);
    out.push((pre ? pre + (/^My /.test(told) ? 'my' + told.slice(2) : told) : told) + (f ? ' ' + f : ''));
  }
  // a quiet month
  if (!mine.length && !others.length) {
    const v = (w.venues || []).map(id => (W.venues || []).find(x => x.id === id)).filter(Boolean)[0];
    out.push(rng.pick([
      w.traits.E > 60 && v ? `Most evenings I was at ${v.name}, hearing everyone's news.` : `A quiet month. I kept to myself.`,
      w.workplace && W.workplaces[w.workplace] ? `Work at ${W.workplaces[w.workplace].name} goes on as ever.` : `Nothing much to tell; the days went by.`,
      w.traits.N > 65 ? 'Nothing happened, and still I lay awake worrying.' : 'Nothing worth writing down, which is a blessing of its own.']));
  }
  // closing thought, coloured by who they are
  const close = [];
  if (w.goal && rng.chance(0.3)) close.push(`I still hope one day ${w.goal.replace(/\.$/, '').replace(/\btheir\b/g, 'my').replace(/\bthemselves\b/g, 'myself').replace(/\bthem\b/g, 'me').replace(/\bthey\b/g, 'I')}.`);
  if (w.att) for (const [k, words] of [['outsiders', 'There are more strangers about than I care for.'], ['faiths', 'Some here do not worship as they ought.']]) if (w.att[k] < -50 && rng.chance(0.15)) close.push(words);
  if (w.traits.O > 70 && rng.chance(0.2)) close.push('I wonder what the world beyond here is like.');
  if (close.length) out.push(rng.pick(close));
  // someone who cannot write has it set down for them
  let scribe = null;
  if (!w.literate && !W.settings.familySizeLimit) { const lit = lives(W).filter(q => q.literate && q !== w && ageOf(q, y) >= 14); scribe = lit.find(q => /priest|parson|vicar|clerk|minister|teacher|schoolmaster/i.test(q.occupation || '')) || (lit.length ? rng.pick(lit) : null); }
  return { y, m, w: w.id, date: journalDate(W, y, m), paras: out.filter(Boolean), scribe: scribe ? scribe.id : null, age: ageOf(w, y) };
}
// Each year, after its seasons: one entry for each month, from a different writer where possible.
function journalYear(W, y) {
  const J = journalState(W), rng = new Rng((W.seed * 6151 + y * 389 + 17) >>> 0), used = new Set();
  for (let m = 0; m < 12; m++) {
    let w = pickWriter(W, rng, y, m);
    if (w && used.has(w.id) && J.mode === 'random' && !J.named[`${y}-${m}`]) { for (let k = 0; k < 5 && w && used.has(w.id); k++) w = pickWriter(W, rng, y, m); }
    if (!w) continue;
    used.add(w.id);
    J.entries.push(writeEntry(W, rng, w, y, m));
  }
}
if (typeof module !== 'undefined') Object.assign(module.exports, { MONTHS, journalYear, journalState, writeEntry, pickWriter, journalDate, monthOf });
