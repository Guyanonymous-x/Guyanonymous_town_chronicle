// ================= V11 page code: Roles, and the village journal =================
NAV.splice(NAV.findIndex(x => x[0] === 'people') + 1, 0, ['roles', 'Roles']);
NAV.splice(NAV.findIndex(x => x[0] === 'story') + 1, 0, ['journal', 'Journal']);

// ---------- the Roles page: every job in the town, who does it, and a way to give anyone any role ----------
function viewRoles() {
  const roles = allRoles(W), people = lives(W), y = W.year;
  const slots = W.era === 'dropped' ? null : jobSlots(W, people.filter(q => q.occId).length);
  const without = people.filter(p => !p.occId && ageOf(p, y) >= 14).sort((a, b) => a.first.localeCompare(b.first));
  const rows = roles.map(o => {
    const hold = roleHolders(W, o), want = slots ? Math.round(slots.want[o.id] || 0) : null, off = officeFor(W, o);
    return `<tr><td><b>${esc(o.name)}</b>${off ? ' <span class="pill acc">office</span>' : ''}${o.apprentice ? ' <span class="pill">apprentice</span>' : ''}<div class="muted small">${esc(o.skill || '')}${o.min ? ` · from age ${o.min}` : ''}${o.sex && o.sex !== 'any' ? ` · usually ${o.sex === 'm' ? 'men' : 'women'}` : ''}</div></td>
      <td class="num">${hold.length}${want != null ? `<div class="muted small">about ${want} place${want === 1 ? '' : 's'}</div>` : ''}</td>
      <td>${hold.map(p => `<span class="chip">${plink(p.id)} <button class="small" data-unrole="${p.id}" title="Take ${esc(p.first)} off this work">✕</button></span>`).join(' ') || '<span class="muted small">nobody</span>'}</td>
      <td><button class="small" data-roleadd="${esc(o.id)}">+ Give someone this role</button></td></tr>`;
  }).join('');
  return `<h1>Roles</h1>
    <p class="muted">Every kind of work in ${esc(W.name)}, who does it now, and roughly how many the town needs. Give anyone any role: if they wouldn't usually fit (too young, the setting's rules on men's and women's work, an injury), you'll be warned first. The town still changes jobs as years go by (deaths, retirement, new openings), and you can change anyone's role at any time.</p>
    <div class="card" id="roleForm"><h3>Give someone a role</h3><div class="formrow">
      <label>Person<input type="text" id="roleWho" list="dlPeople" placeholder="Type a name…" size="30"></label>
      <label>Role<select id="roleWhat">${roles.map(o => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join('')}</select></label>
      <button class="primary" id="roleGo">Give the role</button></div><div id="roleWarn" class="small"></div>${peopleDatalist()}</div>
    <div class="card"><h3>Every role</h3><div class="mk-wrap"><table class="list"><thead><tr><th>Role</th><th class="num">People</th><th>Who</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <div class="card"><h3>Grown-ups without a role (${without.length})</h3>${without.length ? without.map(p => `<span class="chip">${plink(p.id)} <span class="muted small">${ageOf(p, y)}, ${esc(p.occupation || '')}</span></span>`).join(' ') : '<p class="muted small">Everyone has work.</p>'}</div>`;
}
afterRender.roles = () => {
  const warn = () => { const p = W.people[idFromPick($('#roleWho').value)], o = allRoles(W).find(x => x.id === $('#roleWhat').value); $('#roleWarn').innerHTML = p && o ? roleWarnings(W, p, o).map(w => `<div class="mk-warn" style="padding:.2rem .5rem;border-radius:6px;margin-top:.3rem">⚠ ${esc(w)}</div>`).join('') : ''; };
  $('#roleWho').oninput = warn; $('#roleWhat').onchange = warn;
  $('#roleGo').onclick = () => {
    const p = W.people[idFromPick($('#roleWho').value)], o = allRoles(W).find(x => x.id === $('#roleWhat').value);
    if (!p) { toast('Pick someone from the list.'); return; }
    const ws = roleWarnings(W, p, o);
    if (ws.length && !confirm(`${ws.join('\n')}\n\nGive ${p.first} the role of ${o.name.toLowerCase()} anyway?`)) return;
    snapshotForEdits(); afterEdit(assignRole(W, p, o), `${p.first} is now ${/^[aeiou]/i.test(o.name) ? 'an' : 'a'} ${o.name.toLowerCase()}.`);
  };
  document.querySelectorAll('[data-roleadd]').forEach(b => b.onclick = () => { $('#roleWhat').value = b.dataset.roleadd; $('#roleForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#roleWho').focus(); warn(); });
  document.querySelectorAll('[data-unrole]').forEach(b => b.onclick = () => { const p = W.people[+b.dataset.unrole]; if (!confirm(`Take ${p.first} off the work of ${p.occupation.toLowerCase()}?`)) return; snapshotForEdits(); afterEdit(removeRole(W, p), `${p.first} no longer does that work.`); });
};

// ---------- the village journal ----------
const JMODES = [['random', 'someone chosen at random from the whole village'], ['listRandom', 'someone chosen at random from my list'], ['listTurn', 'the people on my list, taking turns']];
function journalEntryHTML(e, forPrint) {
  const w = W.people[e.w];
  const by = w ? (forPrint ? esc(fullName(w)) : plink(w.id)) : 'someone';
  const sc = e.scribe && W.people[e.scribe] ? `, written down by ${forPrint ? esc(fullName(W.people[e.scribe])) : plink(e.scribe)} as ${w ? esc(w.first) : 'they'} told it` : '';
  const body = forPrint ? esc(plainText(W, e.paras.join(' '))) : linkify(e.paras.join(' '));
  return `<article class="jentry"><h3>${esc(e.date)}</h3><div class="muted small">${by}, ${e.age} · about ${esc(MONTHS[e.m])}${sc}</div><p>${body}</p></article>`;
}
function journalFiltered() {
  const J = journalState(W), f = ui.jWriter ? +ui.jWriter : null;
  const years = [...new Set(J.entries.map(e => e.y))].sort((a, b) => b - a);
  const yr = ui.jYear === 'all' ? null : (ui.jYear != null && years.includes(+ui.jYear) ? +ui.jYear : years[0]);
  return { J, years, yr, list: J.entries.filter(e => (!f || e.w === f) && (yr == null || e.y === yr)).slice().reverse() };
}
function viewJournal() {
  const { J, years, yr, list } = journalFiltered(), y = W.year;
  const writersEver = [...new Set(J.entries.map(e => e.w))].map(id => W.people[id]).filter(Boolean).sort((a, b) => a.first.localeCompare(b.first));
  const named = Object.entries(J.named).filter(([k]) => +k.split('-')[0] >= y).map(([k, id]) => [k, W.people[id]]).filter(([, q]) => q);
  return `<h1>Journal</h1>
    <p class="muted">Each month a villager writes about what happened, in their own words: what they saw, heard and felt, coloured by who they are. Entries are written when you advance a year, one for each month, dated the 2nd of the month after. Someone who can't write has it written down for them.</p>
    <div class="card"><h3>Who writes</h3>
      <div class="formrow"><label>Each month's writer is<select id="jMode">${JMODES.map(([k, l]) => `<option value="${k}" ${J.mode === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <p class="small"><b>My list:</b> ${J.writers.map(id => W.people[id] ? `<span class="chip">${plink(id)} <button class="small" data-jdel="${id}" title="Take off my list">✕</button></span>` : '').join(' ') || '<span class="muted">nobody yet</span>'}</p>
      <div class="formrow"><label>Add to my list<input type="text" id="jAdd" list="dlPeople" placeholder="Type a name…" size="28"></label><button id="jAddBtn">Add</button></div>
      <div class="formrow"><label>Name a writer for one month<select id="jMonth">${MONTHS.map((mn, m) => `<option value="${m}">${mn} ${esc(yl(calYear(m, y)))}</option>`).join('')}</select></label><label>Writer<input type="text" id="jNamedWho" list="dlPeople" placeholder="Type a name…" size="24"></label><button id="jNameBtn">Name them</button></div>
      ${named.length ? `<p class="small"><b>Named for the coming year:</b> ${named.map(([k, q]) => `<span class="chip">${esc(MONTHS[+k.split('-')[1]])}: ${plink(q.id)} <button class="small" data-jnamedel="${k}">✕</button></span>`).join(' ')}</p>` : ''}
      ${peopleDatalist()}</div>
    <div class="card"><div class="formrow" style="justify-content:space-between">
      <span><label>Year<select id="jYear"><option value="all" ${ui.jYear === 'all' ? 'selected' : ''}>all years</option>${years.map(v => `<option value="${v}" ${v === yr ? 'selected' : ''}>${esc(yl(v))}</option>`).join('')}</select></label>
      <label>Writer<select id="jWriter"><option value="">everyone</option>${writersEver.map(q => `<option value="${q.id}" ${+ui.jWriter === q.id ? 'selected' : ''}>${esc(fullName(q))}</option>`).join('')}</select></label></span>
      <span><button id="jPrint">🖨 Print / PDF</button> <button id="jTxt">Save as text</button> <button id="jDoc">Save for Word</button></span></div>
      ${list.length ? list.map(e => journalEntryHTML(e)).join('') : `<p class="muted">No entries yet${J.entries.length ? ' for this choice' : ''}. Advance a year and the first twelve will be written.</p>`}</div>`;
}
function journalDoc(list) { return `<h1>The journal of ${esc(W.name)}</h1>${list.map(e => journalEntryHTML(e, true)).join('')}`; }
afterRender.journal = () => {
  const J = journalState(W), pick = el => W.people[idFromPick($(el).value)];
  $('#jMode').onchange = e => { snapshotForEdits(); J.mode = e.target.value; logEdit(W, 'Changed who writes the journal.'); afterEdit(null, 'Changed.'); };
  $('#jAddBtn').onclick = () => { const q = pick('#jAdd'); if (!q) { toast('Pick someone from the list.'); return; } if (J.writers.includes(q.id)) { toast('Already on the list.'); return; } snapshotForEdits(); J.writers.push(q.id); if (J.mode === 'random') J.mode = 'listRandom'; afterEdit(null, `${q.first} is on your list of writers.`); };
  document.querySelectorAll('[data-jdel]').forEach(b => b.onclick = () => { snapshotForEdits(); J.writers = J.writers.filter(id => id !== +b.dataset.jdel); afterEdit(null, 'Taken off the list.'); });
  $('#jNameBtn').onclick = () => { const q = pick('#jNamedWho'); if (!q) { toast('Pick someone from the list.'); return; } snapshotForEdits(); J.named[`${W.year}-${$('#jMonth').value}`] = q.id; afterEdit(null, `${q.first} will write about ${MONTHS[+$('#jMonth').value]}.`); };
  document.querySelectorAll('[data-jnamedel]').forEach(b => b.onclick = () => { snapshotForEdits(); delete J.named[b.dataset.jnamedel]; afterEdit(null, 'Removed.'); });
  $('#jYear').onchange = e => { ui.jYear = e.target.value; render(); };
  $('#jWriter').onchange = e => { ui.jWriter = e.target.value; render(); };
  const { list } = journalFiltered(), inOrder = list.slice().reverse();
  $('#jPrint').onclick = () => printHTML(`Journal of ${W.name}`, journalDoc(inOrder));
  $('#jTxt').onclick = () => downloadBlob(new Blob([`The journal of ${W.name}\n\n` + inOrder.map(e => `${e.date}\n${W.people[e.w] ? fullName(W.people[e.w]) : ''}, ${e.age}${e.scribe && W.people[e.scribe] ? ` (written down by ${fullName(W.people[e.scribe])})` : ''}\n${plainText(W, e.paras.join(' '))}\n`).join('\n')], { type: 'text/plain' }), `${W.name} journal.txt`);
  $('#jDoc').onclick = () => downloadBlob(new Blob([`<html><head><meta charset="utf-8"><title>Journal of ${esc(W.name)}</title></head><body style="font-family:Georgia,serif">${journalDoc(inOrder)}</body></html>`], { type: 'application/msword' }), `${W.name} journal.doc`);
};
// a writer's own entries, on their page
function journalByHTML(p) {
  const J = W.journal; if (!J) return ''; const mine = J.entries.filter(e => e.w === p.id);
  if (!mine.length) return '';
  return `<div class="card"><h3>${esc(p.first)}'s journal entries (${mine.length})</h3>${mine.slice(-3).reverse().map(e => journalEntryHTML(e)).join('')}${mine.length > 3 ? `<button class="small" data-jwriter="${p.id}">See all ${mine.length} on the Journal page</button>` : ''}</div>`;
}
const v11PersonStory = personStory;
personStory = function (p, y) { return v11PersonStory(p, y) + journalByHTML(p); };
document.addEventListener('click', e => { const b = e.target.closest('[data-jwriter]'); if (!b) return; ui.jWriter = b.dataset.jwriter; ui.jYear = 'all'; go('journal'); });
