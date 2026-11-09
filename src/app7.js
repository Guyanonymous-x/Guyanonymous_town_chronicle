// ================= Stage 5 page code: the storyteller =================
function snapshotForEdits() {
  const last = undoStack[undoStack.length - 1];
  if (last && last.kind === 'edit' && last.year === W.year) return;
  undoStack.push({ year: W.year, json: JSON.stringify(W), kind: 'edit' });
  while (undoStack.length > UNDO_KEEP) undoStack.shift();
}
function afterEdit(err, okMsg) {
  if (err) { toast('Not changed: ' + err, 4500); return false; }
  dirty = true; HIST_CACHE = null; render(); if (okMsg) toast(okMsg); return true;
}
function peopleDatalist() {
  const list = residentsAlive(W).sort((a, b) => (a.last + a.first).localeCompare(b.last + b.first));
  return `<datalist id="dlPeople">${list.map(p => `<option value="${esc(fullName(p))} (${ageOf(p, W.year)}) #${p.id}">`).join('')}</datalist>`;
}
function idFromPick(v) { const m = /#(\d+)\s*$/.exec(v || ''); return m ? +m[1] : null; }
const personPick = (id, ph) => `<input type="text" id="${id}" list="dlPeople" placeholder="${ph || 'Type a name…'}" size="28">`;
function seasonSel(id) { return `<select id="${id}">${SEASONS.map((s, i) => `<option value="${i}">${s}</option>`).join('')}</select>`; }

// ---------- the person tab ----------
function personEdit(p) {
  if (p.status !== 'resident' || p.died != null) return `<p class="muted">Only people living here can be changed or given plans. You can still keep notes:</p>${notesBlock(p)}`;
  const m = mindOf(p);
  const roles = NONWORK_ROLES(W); const jobs = jobChoices(W, p);
  const hh = Object.values(W.households).filter(h => h.members.some(id => W.people[id] && W.people[id].status === 'resident' && W.people[id].died == null)).sort((a, b) => a.name.localeCompare(b.name));
  const num = (f, label, v, lo, hi) => `<label class="ednum">${label}<input type="number" data-ed="${f}" value="${v}" min="${lo}" max="${hi}" style="width:70px"></label>`;
  const myPlans = (W.plans || []).filter(pl => (pl.who === p.id || pl.target === p.id) && pl.y === W.year);
  return `${peopleDatalist()}
  <div class="grid g2">
  <div class="card"><h3>Change now</h3><p class="small muted">Changes take effect straight away and shape how ${esc(p.first)}'s next year goes. You can undo them with Undo at the top.</p>
    <div class="formrow"><label>First name<input type="text" data-ed="first" value="${esc(p.first)}" size="14"></label><label>Family name<input type="text" data-ed="last" value="${esc(p.last)}" size="14"></label></div>
    <div class="formrow"><label>Work or role<select data-ed="occupation">${roles.map(r => `<option value="${esc(r)}" ${p.occupation === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}<optgroup label="Work">${jobs.map(o => `<option value="${o.id}" ${p.occId === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</optgroup></select></label></div>
    <div class="formrow"><label>Lives in<select data-ed="household">${hh.map(h => `<option value="${h.id}" ${p.household === h.id ? 'selected' : ''}>${esc(cap(h.name))} — ${esc(h.district)}</option>`).join('')}<option value="new">A new home of ${hisHer(p)} own</option></select></label></div>
    <div class="formrow"><label>Faith<select data-ed="faith">${Object.keys(eraOf(W).faiths).map(f => `<option ${p.faith === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
      <label>Attracted to<select data-ed="orientation">${[['straight', p.sex === 'm' ? 'women' : 'men'], ['gay', p.sex === 'm' ? 'men' : 'women'], ['bisexual', 'men and women']].map(([k, l]) => `<option value="${k}" ${p.orientation === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label><span><input type="checkbox" data-ed="hermit" ${p.hermit ? 'checked' : ''}> Lives alone as a loner</span></label></div>
    <h4 class="edh">Body and character</h4>
    <div class="formrow">${num('health', 'Health', p.health, 1, 100)}${num('intellect', 'Quick-witted', p.intellect, 1, 99)}${W.soc ? num('standing', 'Standing', p.standing ?? 50, 0, 100) : ''}</div>
    <div class="formrow">${Object.keys(TRAIT_NAMES).map(k => num('traits.' + k, TRAIT_NAMES[k], p.traits[k], 1, 99)).join('')}</div>
    <h4 class="edh">State of mind</h4>
    <div class="formrow">${num('mind.mood', 'Mood (−100 to 100)', m.mood, -100, 100)}${num('mind.stress', 'Strain', m.stress, 0, 100)}${num('mind.trauma', 'Haunted', m.trauma, 0, 100)}${num('mind.guilt', 'Guilt', m.guilt, 0, 100)}${num('mind.drink', 'Drinking', m.drink, 0, 100)}
      <label><span><input type="checkbox" data-ed="mind.depressed" ${m.depressed ? 'checked' : ''}> Depressed</span></label></div>
    <h4 class="edh">A connection with someone</h4>
    <div class="formrow">${personPick('relWho')}<select id="relType">${REL_TYPES.map(t => `<option>${t}</option>`).join('')}<option value="end">end the connection</option></select>
      <label>Strength<input type="number" id="relScore" value="60" min="0" max="100" style="width:64px"></label><input type="text" id="relWhy" placeholder="Why (optional)" size="22"><button class="small primary" id="relSet">Set</button></div>
    <h4 class="edh">Notes</h4>${notesBlock(p)}
  </div>
  <div class="card"><h3>Make something happen in ${esc(yl(W.year))}</h3><p class="small muted">It happens during the next year you advance, in the season you choose, and becomes part of the story with all its ripples.</p>
    <div class="formrow"><label>What happens<select id="plKind">${Object.entries(PLAN_KINDS).filter(([, v]) => v.who === 'person').map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select></label><label>When${seasonSel('plSeason')}</label></div>
    <div id="plFields"></div>
    <button class="primary" id="plAdd">Add to the plan</button>
    ${myPlans.length ? `<h4 class="edh">Planned for ${esc(yl(W.year))}</h4>${myPlans.map(planRow).join('')}` : ''}
  </div></div>`;
}
function notesBlock(p) { return `<textarea id="edNotes" rows="4" style="width:100%" placeholder="Your own notes about ${esc(p.first)}…">${esc(p.notes || '')}</textarea><p class="small muted">Notes are saved with the community and never change the story.</p>`; }
function planRow(pl) {
  const col = pl.status === 'done' ? 'good' : pl.status === 'failed' ? 'bad' : pl.status === 'cancelled' ? '' : 'acc';
  return `<div class="small" style="padding:.25rem 0;border-bottom:1px solid var(--soft)"><span class="pill ${col}">${pl.status}</span> ${esc(SEASONS[pl.s])} ${esc(yl(pl.y))}: ${linkify(planText(W, pl))}${pl.result ? ` — <span class="muted">${linkify(pl.result)}</span>` : ''} ${pl.status === 'waiting' ? `<button class="small" data-plcancel="${pl.id}">Cancel</button>` : ''}</div>`;
}
function planFields(kind) {
  const occs = jobChoices(W, W.people[nav.cur.params.id] || {});
  const F = {
    die: `<label>How<select id="pf_cause"><option value="illness">a sudden illness</option><option value="heart">a failing heart</option><option value="accident">an accident</option><option value="old">old age</option><option value="violence">attacked by a stranger</option><option value="murder">murdered by someone…</option></select></label><label>Murderer (if murdered)${personPick('pf_target')}</label><label>Caught?<select id="pf_caught"><option value="">leave it to chance</option><option value="yes">caught</option><option value="no">gets away with it</option></select></label><label>Or describe the cause<input type="text" id="pf_causeText" size="22" placeholder="optional"></label>`,
    marry: `<label>Marries${personPick('pf_target')}</label><label><span><input type="checkbox" id="pf_force"> even if either is married (they leave their spouse)</span></label><label>Why<input type="text" id="pf_reason" size="22" placeholder="optional"></label>`,
    children: `<label>How many<select id="pf_n">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<option>${n}</option>`).join('')}</select></label><label>With (other parent; blank = husband or wife)${personPick('pf_target')}</label><p class="small muted">More than one are born together as twins, triplets and so on.</p>`,
    affair: `<label>With${personPick('pf_target')}</label>`,
    crime: `<label>Crime<select id="pf_crime">${Object.keys(CRIME_RATES[W.era]).map(c => `<option>${c}</option>`).join('')}</select></label><label>Against${personPick('pf_target')}</label><label>Caught?<select id="pf_caught"><option value="">leave it to chance</option><option value="yes">caught</option><option value="no">gets away with it</option></select></label><label>Why<input type="text" id="pf_motive" size="22" placeholder="optional"></label>`,
    injury: `<label>What happens<input type="text" id="pf_what" size="24" placeholder="e.g. a fall from the roof"></label><label><span><input type="checkbox" id="pf_lasting"> leaves a lasting injury</span></label>`,
    illness: `<label>Illness<select id="pf_disease">${diseasesFor(W).map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></label>`,
    job: `<label>New work<select id="pf_job">${occs.filter(o => W.era === 'dropped' || !isOfficeOcc(W, o.id)).map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></label><label>Why<input type="text" id="pf_reason" size="22" placeholder="optional"></label>`,
    loseJob: `<label>Why<input type="text" id="pf_reason" size="22" placeholder="optional"></label>`,
    moveAway: `<label><span><input type="checkbox" id="pf_withHousehold"> with the whole household</span></label>`,
    friend: `<label>With${personPick('pf_target')}</label><label>Why<input type="text" id="pf_reason" size="22" placeholder="optional"></label>`,
    enemy: `<label>With${personPick('pf_target')}</label><label>Over<input type="text" id="pf_reason" size="22" placeholder="optional"></label>`,
    money: `<label>Amount (${ECON[W.era] ? esc(ECON[W.era].unit) : '—'}; minus for a loss)<input type="number" id="pf_amount" value="${ECON[W.era] ? ECON[W.era].income.mid : 0}" style="width:110px"></label><label>Why<input type="text" id="pf_reason" size="22" placeholder="optional, e.g. an inheritance"></label>`,
    office: `<label>Office<select id="pf_office">${(OFFICES[W.era] || []).map(o => `<option value="${o.key}">${esc(o.title)}</option>`).join('')}</select></label><label>How<input type="text" id="pf_reason" size="22" placeholder="optional"></label>`
  };
  return `<div class="formrow">${F[kind] || `<label>Why<input type="text" id="pf_reason" size="26" placeholder="optional"></label>`}</div>`;
}
function readPlanFields(base) {
  const v = id => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
  const pl = Object.assign({}, base);
  for (const k of ['cause', 'caught', 'causeText', 'n', 'crime', 'motive', 'what', 'disease', 'job', 'reason', 'amount', 'office']) { const x = v('pf_' + k); if (x !== undefined && x !== '') pl[k] = x; }
  for (const k of ['force', 'lasting', 'withHousehold']) { const x = v('pf_' + k); if (x !== undefined) pl[k] = x; }
  const t = v('pf_target'); if (t) pl.target = idFromPick(t);
  return pl;
}
afterRender.person = (orig => p => {
  orig(p);
  if (ui.personTab !== 'edit') return;
  const id = p.id;
  const apply = (f, val) => { snapshotForEdits(); afterEdit(editPerson(W, id, f, val)); };
  document.querySelectorAll('[data-ed]').forEach(el => el.onchange = () => apply(el.dataset.ed, el.type === 'checkbox' ? el.checked : el.value));
  if ($('#edNotes')) $('#edNotes').onchange = e => { snapshotForEdits(); editPerson(W, id, 'notes', e.target.value); dirty = true; toast('Notes saved.'); };
  if ($('#relSet')) $('#relSet').onclick = () => { const other = idFromPick($('#relWho').value); if (!other) { toast('Pick someone from the list.'); return; } snapshotForEdits(); afterEdit(editRelationship(W, id, other, $('#relType').value, $('#relScore').value, $('#relWhy').value.trim()), 'Connection set.'); };
  const showFields = () => { $('#plFields').innerHTML = planFields($('#plKind').value); };
  if ($('#plKind')) { $('#plKind').onchange = showFields; showFields(); }
  if ($('#plAdd')) $('#plAdd').onclick = () => { const pl = readPlanFields({ kind: $('#plKind').value, who: id, s: +$('#plSeason').value }); snapshotForEdits(); afterEdit(addPlan(W, pl), 'Added to the plan for ' + yl(W.year) + '.'); };
  wirePlanCancel();
})(afterRender.person);
function wirePlanCancel() { document.querySelectorAll('[data-plcancel]').forEach(b => b.onclick = () => { snapshotForEdits(); afterEdit(cancelPlan(W, +b.dataset.plcancel), 'Plan cancelled.'); }); }

// ---------- the storyteller page ----------
function viewStory() {
  const hh = Object.values(W.households).filter(h => h.members.some(id => W.people[id] && W.people[id].status === 'resident' && W.people[id].died == null)).sort((a, b) => a.name.localeCompare(b.name));
  const plans = (W.plans || []).slice().reverse();
  const waiting = plans.filter(p => p.status === 'waiting' && p.y === W.year);
  const past = plans.filter(p => !(p.status === 'waiting' && p.y === W.year));
  const edits = (W.edits || []).slice().reverse();
  return `${peopleDatalist()}<h1>Storyteller</h1>
  <p class="muted">Shape what happens. Plans for ${esc(yl(W.year))} happen when you next advance, in the season you choose, and their effects ripple out like anything else. To change or plan for one person, open their page and use the <b>Edit & plan</b> tab.</p>
  <div class="grid g2">
    <div class="card"><h3>Make something happen to the town in ${esc(yl(W.year))}</h3>
      <div class="formrow"><label>What<select id="tpKind">${Object.entries(PLAN_KINDS).filter(([, v]) => v.who === 'town').map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select></label><label>When${seasonSel('tpSeason')}</label></div>
      <div id="tpFields"></div><button class="primary" id="tpAdd">Add to the plan</button></div>
    <div class="card"><h3>Waiting to happen (${waiting.length})</h3>${waiting.map(planRow).join('') || '<p class="muted small">Nothing planned yet.</p>'}</div>
  </div>
  <div class="card"><h3>Earlier plans and what came of them (${past.length})</h3>${past.slice(0, 200).map(planRow).join('') || '<p class="muted small">None yet.</p>'}</div>
  <div class="card"><h3>Every change you have made (${edits.length})</h3>${edits.slice(0, 300).map(e => `<div class="small">• ${esc(yl(e.y))}: ${linkify(e.text)}</div>`).join('') || '<p class="muted small">None yet.</p>'}</div>`;
}
function townFields(kind) {
  const hh = Object.values(W.households).filter(h => h.members.some(id => W.people[id] && W.people[id].status === 'resident' && W.people[id].died == null)).sort((a, b) => a.name.localeCompare(b.name));
  const hhSel = id => `<select id="${id}">${hh.map(h => `<option value="${h.id}">${esc(cap(h.name))} (${esc(h.district)})</option>`).join('')}</select>`;
  const districts = [...new Set(hh.map(h => h.district))];
  const table = W.era === 'scifi' ? WEATHER.scifi : WEATHER.land;
  const F = {
    event: `<label>What happens<select id="tf_event">${(EVENTS[W.era] || []).map(e => `<option>${esc(e.name)}</option>`).join('')}</select></label><label>Where (for fires, floods and storms)<select id="tf_where"><option value="">anywhere</option>${districts.map(d => `<option>${esc(d)}</option>`).join('')}</select></label>`,
    outbreak: `<label>Illness<select id="tf_disease">${diseasesFor(W).map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select></label>`,
    weather: `<label>Weather (for the season chosen above)<select id="tf_weather">${[...new Set(table.flat().map(x => x[0]))].map(w => `<option>${esc(w)}</option>`).join('')}<option>perfect</option></select></label>`,
    blight: `<label>Blight<select id="tf_pest">${(PESTS[W.era] || []).map(x => `<option>${esc(x[1])}</option>`).join('')}</select></label>`,
    newcomers: `<label>How many households<input type="number" id="tf_n" value="5" min="1" max="30" style="width:70px"></label><label>Why they come<input type="text" id="tf_reason" size="24" placeholder="optional"></label>`,
    feud: `<label>Between${hhSel('tf_a')}</label><label>and${hhSel('tf_b')}</label><label>Over<input type="text" id="tf_reason" size="24" placeholder="optional"></label>`,
    endFeud: `<label>Feud<select id="tf_feud">${Object.values(W.feuds).filter(f => f.status === 'active').map(f => `<option value="${f.id}">${esc(f.sideA.name)} v ${esc(f.sideB.name)}</option>`).join('')}</select></label><label>How it ends<input type="text" id="tf_reason" size="24" placeholder="optional"></label>`,
    election: `<label>Office<select id="tf_office">${(OFFICES[W.era] || []).filter(o => o.how === 'election').map(o => `<option value="${o.key}">${esc(o.title)}</option>`).join('')}</select></label>`,
    law: `<label>Rule<select id="tf_law">${LAWS.filter(l => !l.eras || l.eras.includes(W.era)).map(l => `<option value="${l.id}">${esc(cap(l.name))}</option>`).join('')}</select></label>`,
    discovery: `<label>Discovery<select id="tf_disc">${DISCOVERIES.filter(d => !(W.settle && W.settle.discoveries.some(x => x.id === d.id))).map(d => `<option value="${d.id}">${esc(cap(d.name))}</option>`).join('')}</select></label><label>Who works it out (optional)${personPick('tf_who')}</label>`
  };
  return `<div class="formrow">${F[kind] || ''}</div>`;
}
afterRender.story = () => {
  const show = () => { $('#tpFields').innerHTML = townFields($('#tpKind').value); };
  $('#tpKind').onchange = show; show();
  $('#tpAdd').onclick = () => {
    const v = id => { const el = document.getElementById(id); return el ? el.value : undefined; };
    const pl = { kind: $('#tpKind').value, s: +$('#tpSeason').value };
    for (const k of ['event', 'where', 'disease', 'weather', 'pest', 'n', 'reason', 'a', 'b', 'feud', 'office', 'law', 'disc']) { const x = v('tf_' + k); if (x !== undefined && x !== '') pl[k] = ['a', 'b', 'feud'].includes(k) ? +x : x; }
    if (v('tf_who')) pl.who = idFromPick(v('tf_who'));
    snapshotForEdits(); afterEdit(addPlan(W, pl), 'Added to the plan for ' + yl(W.year) + '.');
  };
  wirePlanCancel();
};
// household changes
function householdEdit(h) {
  if (!h.members.some(id => W.people[id] && W.people[id].status === 'resident')) return '';
  const E = ECON[W.era];
  return `<details style="margin-top:1rem"><summary>Change this household</summary><div class="formrow">
    <label>Area<select data-hed="district">${[...eraOf(W).districts, eraOf(W).outskirts].map(d => `<option ${h.district === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label>
    ${E ? `<label>Home<select data-hed="home">${E.homes.map(x => `<option ${h.home === x[0] ? 'selected' : ''}>${esc(x[0])}</option>`).join('')}</select></label><label><span><input type="checkbox" data-hed="owned" ${h.owned ? 'checked' : ''}> Owned</span></label><label>Savings (${esc(E.unit)})<input type="number" data-hed="savings" value="${h.savings || 0}" style="width:110px"></label>` : ''}
  </div></details>`;
}
afterRender.household = (orig => p => { orig && orig(p); document.querySelectorAll('[data-hed]').forEach(el => el.onchange = () => { snapshotForEdits(); afterEdit(editHousehold(W, p.id, el.dataset.hed, el.type === 'checkbox' ? el.checked : el.value)); }); })(afterRender.household);
