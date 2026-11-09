// ================= Stage 7 page code: "Make a person" (LifeWeaver's person maker) =================
NAV.splice(NAV.findIndex(x => x[0] === 'story') + 1, 0, ['maker', 'Make a person']);

const MAKER_TABS = [['person', 'Person'], ['family', 'Family & friends'], ['record', 'Life record'], ['turning', 'Turning points'], ['timeline', 'Timeline'], ['story', 'Life story']];
let makerRowId = 0;

// The person being made is kept in the community itself (W.makerDraft), so it is saved with it.
function makerState() {
  if (!ui.maker || ui.maker.town !== W) ui.maker = { town: W, tab: 'person', autoLock: true, lastDeleted: null };
  if (!W.makerDraft) W.makerDraft = makerBlank(W);
  ui.maker.P = W.makerDraft;
  return ui.maker;
}
function makerDirty() { if (!dirty) { dirty = true; renderFrame(); } }
const makerAge = (b, y) => b == null ? '' : `${y - b}`;
function makerMoveCard(P) {
  if (makerIsEmpty(P)) return '';
  const y = makerYear(W), { partner, kids } = makerParty(W, P), sexes = P.tcSexes || {};
  const fitProblems = makerProblems(W, P), move = makerMoveProblems(W, P, sexes).filter(x => !fitProblems.includes(x));
  const who = r => {
    const known = makerRowSex(W, P, r), b = makerNum(r.born);
    const pick = known ? '' : ` <select data-msex="${esc(r.id)}"><option value="">man or woman?</option><option value="m" ${sexes[r.id] === 'm' ? 'selected' : ''}>Man</option><option value="f" ${sexes[r.id] === 'f' ? 'selected' : ''}>Woman</option></select>`;
    const older = r !== partner && b != null && y - b >= 18 ? ' <span class="muted small">(18 or over: like other newcomer families, may stay behind — 15% come)</span>' : '';
    return `<li>${esc(String(r.name || '').trim() || '(no name)')} <span class="muted">· ${esc(r.relation || '')}${b != null ? ' · ' + makerAge(b, y) : ''}</span>${pick}${older}</li>`;
  };
  const coming = [partner, ...kids].filter(Boolean);
  const dl = P.f.deathYear;
  const death = dl.l && String(dl.v).trim() ? `<p class="small">Their death year stays locked at <b>${esc(yl(+dl.v))}</b>: nothing in the town can kill them before then, and they die in that year. You can unlock it later on their page (Edit & plan).</p>` : '';
  return `<div class="card"><h3>Move them into ${esc(W.name)}</h3>
    <p class="muted small">They arrive in ${esc(yl(y))} when you next advance. It goes on the plan, so you can still cancel it on the Storyteller page.</p>
    ${coming.length ? `<p style="margin:.3rem 0 0"><b>Coming with them</b></p><ul style="margin:.2rem 0 .5rem">${coming.map(who).join('')}</ul>` : '<p class="small">They come alone (no living partner or children in their Family & friends list).</p>'}
    ${death}
    ${move.length ? `<div class="mk-warn" style="padding:.4rem .7rem;border-radius:8px;margin:.4rem 0"><b>Before they can come:</b><ul style="margin:.2rem 0 0">${move.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    <div class="formrow"><label>Season they arrive${seasonSel('mkSeason')}</label><button class="primary" id="mkPlan" ${fitProblems.length || move.length ? 'disabled' : ''}>Plan their arrival in ${esc(yl(y))}</button></div></div>`;
}
function makerIsEmpty(P) { return LW.FIELDS.every(d => !P.f[d.key].v) && LW.LISTNAMES.every(n => !P.lists[n].length); }
function makerLockBtn(path, on) {
  return `<button class="mk-lock ${on ? 'on' : ''}" data-mlock="${path}" title="${on ? 'Locked: Generate will keep this. Click to unlock.' : 'Unlocked: Generate may change this. Click to lock.'}">${on ? '🔒' : '🔓'}</button>`;
}
function makerField(P, d) {
  const st = P.f[d.key], path = 'f.' + d.key;
  let inp;
  if (d.type === 'area') inp = `<textarea data-mpath="${path}" rows="2">${esc(st.v)}</textarea>`;
  else if (d.type === 'select') inp = `<select data-mpath="${path}"><option value=""></option>${d.options.map(o => `<option ${o === st.v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else inp = `<input type="text" data-mpath="${path}" value="${esc(st.v)}" ${d.num ? 'inputmode="numeric"' : ''}>`;
  const hint = d.key === 'deathYear' ? 'Blank lets the town decide. Lock a year to fix it: nothing in the town can kill them before then.' : d.hint;
  return `<div class="mk-field ${st.l ? 'locked' : ''}" data-mwrap="${path}"><label>${esc(d.label)}</label><div class="mk-fi">${inp}${makerLockBtn(path, st.l)}</div>${hint ? `<small class="muted">${esc(hint)}</small>` : ''}</div>`;
}
function makerGroup(P, g, title, hint) {
  return `<div class="card"><h3>${title}</h3><p class="muted small">${hint}</p><div class="mk-grid">${LW.FIELDS.filter(d => d.g === g).map(d => makerField(P, d)).join('')}</div></div>`;
}
function makerList(P, name) {
  const d = LW.LISTS[name], rows = P.lists[name];
  const cell = (i, c, val) => { const path = `l.${name}.${i}.${c.k}`; return c.area ? `<textarea data-mpath="${path}" rows="2">${esc(val)}</textarea>` : `<input type="text" data-mpath="${path}" value="${esc(val)}" ${c.dl ? `list="mk-${c.dl}"` : ''}>`; };
  return `<div class="card"><h3>${esc(d.title)}</h3><p class="muted small">${esc(d.hint)}</p><div class="mk-wrap"><table class="mk-table"><thead><tr>${d.cols.map(c => `<th style="${c.w ? 'width:' + c.w : ''}">${esc(c.label)}</th>`).join('')}<th class="mk-act"></th></tr></thead><tbody>
    ${rows.length ? rows.map((r, i) => `<tr class="${r.locked ? 'locked' : ''}" data-mwrap="l.${name}.${i}">${d.cols.map(c => `<td>${cell(i, c, r[c.k])}</td>`).join('')}<td class="mk-act">${makerLockBtn(`l.${name}.${i}`, r.locked)} <button class="small" data-mdel="${name}.${i}" title="Remove this row">✕</button></td></tr>`).join('') : `<tr><td colspan="${d.cols.length + 1}" class="muted">Nothing here yet.</td></tr>`}
    </tbody></table></div><button class="small" data-madd="${name}">+ Add ${esc(d.one)}</button></div>`;
}
function makerSummary(P) {
  const v = k => (P.f[k].v || '').trim(), y = makerYear(W);
  const name = [v('firstName'), v('lastName')].filter(Boolean).join(' ') || 'Unnamed person';
  const b = v('birthYear') === '' ? null : +v('birthYear');
  return `<h2 style="margin:0">${esc(name)}</h2><p class="muted" style="margin:.2rem 0 0">${b != null && Number.isFinite(b) ? `Born ${esc(yl(b))} · ${y - b} when they arrive in ${esc(yl(y))}` : `Would arrive in ${esc(yl(y))}`}</p>`;
}
function makerPanel(s) {
  const P = s.P;
  if (s.tab === 'person') {
    let h = makerIsEmpty(P) ? `<div class="card mk-how"><b>How it works</b><ol>
      <li>Fill in anything you already know: a name, a job, a turning point, a marriage year. Whatever you type is locked 🔒.</li>
      <li>Click <b>✨ Generate</b>. Everything else is made up to fit around what you locked, and to fit ${esc(W.name)} in ${esc(yl(makerYear(W)))}.</li>
      <li>Change anything afterwards, lock what you like, and generate again for new ideas.</li></ol></div>` : '';
    return h + makerGroup(P, 'basics', 'Basics', 'Name, dates and places.') + makerGroup(P, 'looks', 'Looks', 'How they look.') + makerGroup(P, 'personality', 'Personality', 'Who they are inside: traits, hopes and dreams. Separate several items with commas.');
  }
  if (s.tab === 'family') return makerList(P, 'family');
  if (s.tab === 'record') return makerList(P, 'edu') + makerList(P, 'work') + makerList(P, 'social');
  if (s.tab === 'turning') return makerList(P, 'turning');
  if (s.tab === 'timeline') {
    const ev = withTown(W, null, () => LW.buildTimeline(P));
    return `<div class="card"><h3>Timeline</h3><p class="muted small">Built from everything in the other tabs. To change it, edit those tabs or add your own events below.</p>${ev.length ? `<ul class="mk-tl">${ev.map(e => `<li><span class="mk-yr">${esc(yl(e.year))}</span><span class="muted mk-ag">${e.age != null ? 'age ' + e.age : ''}</span><span class="pill">${e.cat === 'custom' ? 'yours' : esc(e.cat)}</span> <span>${esc(e.text)}</span></li>`).join('')}</ul>` : '<p class="muted">Nothing yet. Click ✨ Generate or fill in some details.</p>'}</div>` + makerList(P, 'custom');
  }
  return `<div class="mk-storybar"><button id="mkRestory2">Rewrite story from current details</button>${makerLockBtn('story', P.story.l)}<span class="muted small">${P.story.l ? 'Locked: the story will not be rewritten until you unlock it.' : 'You can edit the story directly. Editing locks it so your changes are kept.'}</span></div>
    <textarea id="mkStory" data-mpath="story" class="mk-story ${P.story.l ? 'locked' : ''}" placeholder="Click ✨ Generate, or “Rewrite story” after filling in details.">${esc(P.story.v)}</textarea>`;
}
function makerChecks(P) {
  if (makerIsEmpty(P)) return '';
  const pr = makerProblems(W, P);
  return pr.length ? `<div class="card mk-warn"><b>Things that don’t quite fit:</b><ul>${pr.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`
    : `<div class="card mk-ok">Everything fits together. They could arrive in ${esc(yl(makerYear(W)))}.</div>`;
}

function viewMaker() {
  if (!makerAvailable(W)) return `<h1>Make a person</h1><div class="card"><p>Making a person isn’t ready yet for the ${esc(eraOf(W).label || W.era)} setting. It will come with the step that combines LifeWeaver’s and Town Chronicle’s lists of names, jobs and places.</p></div>`;
  const s = makerState(), P = s.P;
  return `<h1>Make a person</h1>
    <p class="muted">Design someone who could move to ${esc(W.name)}: lock the details you want, and let the rest be made up to fit the town and its time. This uses LifeWeaver’s person maker. When they fit, plan their arrival in the box below.</p>
    <div class="card mk-top">
      <div id="mkSummary">${makerSummary(P)}</div>
      <div class="mk-btns">
        <button class="primary" id="mkGen" title="Makes up everything that is not locked">✨ Generate</button>
        <button id="mkRestory" title="Rebuild the life story from the details as they are now">Rewrite story</button>
        <button id="mkLockAll">🔒 Lock all</button><button id="mkUnlockAll">🔓 Unlock all</button>
        <button id="mkClear">Clear unlocked</button><button id="mkNew">New blank person</button>
        <label class="small muted"><input type="checkbox" id="mkAuto" ${s.autoLock ? 'checked' : ''}> Lock what I type</label>
      </div>
    </div>
    <div id="mkChecks">${makerChecks(P)}</div>
    <div id="mkMove">${makerMoveCard(P)}</div>
    <div class="tabs" id="mkTabs">${MAKER_TABS.map(([k, l]) => `<button data-mtab="${k}" class="${k === s.tab ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="mkPanel">${makerPanel(s)}</div>
    <datalist id="mk-relOptions">${(LW.REL_OPTIONS || []).map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
}

afterRender.maker = () => {
  if (!makerAvailable(W)) return;
  const s = makerState(), main = $('#main');
  const P = () => s.P;
  const refreshTop = () => { $('#mkSummary').innerHTML = makerSummary(P()); $('#mkChecks').innerHTML = makerChecks(P()); const sv = $('#mkSeason') ? $('#mkSeason').value : null; $('#mkMove').innerHTML = makerMoveCard(P()); if (sv != null && $('#mkSeason')) $('#mkSeason').value = sv; };
  const refreshPanel = () => { $('#mkPanel').innerHTML = makerPanel(s); refreshTop(); };
  const wrapOf = path => path.split('.').length === 4 ? path.split('.').slice(0, 3).join('.') : path;
  const setPath = (path, val) => { if (path === 'story') { P().story.v = val; return; } const p = path.split('.'); if (p[0] === 'f') P().f[p[1]].v = val; else P().lists[p[1]][+p[2]][p[3]] = val; };
  const lockState = path => { if (path === 'story') return P().story.l; const p = path.split('.'); return p[0] === 'f' ? P().f[p[1]].l : P().lists[p[1]][+p[2]].locked; };
  const setLock = (path, on) => {
    if (path === 'story') P().story.l = on; else { const p = path.split('.'); if (p[0] === 'f') P().f[p[1]].l = on; else P().lists[p[1]][+p[2]].locked = on; }
    main.querySelectorAll(`[data-mlock="${path}"]`).forEach(b => { b.outerHTML = makerLockBtn(path, on); });
    const w = main.querySelector(`[data-mwrap="${path}"]`); if (w) w.classList.toggle('locked', on);
    if (path === 'story' && $('#mkStory')) $('#mkStory').classList.toggle('locked', on);
  };
  const lockAll = on => { LW.FIELDS.forEach(d => P().f[d.key].l = on); LW.LISTNAMES.forEach(n => P().lists[n].forEach(r => r.locked = on)); P().story.l = on; refreshPanel(); };
  const restory = () => {
    if (P().story.l) { toast('The story is locked. Unlock it 🔒 to rewrite it.'); return; }
    P().story.v = withTown(W, null, () => LW.buildStory(P())); s.tab = 'story'; render(); toast('Story rewritten from the current details.');
  };
  main.oninput = e => {
    if (!nav.cur || nav.cur.view !== 'maker') return; 
    const path = e.target.dataset && e.target.dataset.mpath; if (!path) return;
    setPath(path, e.target.value); makerDirty();
    if (s.autoLock && !lockState(wrapOf(path))) setLock(wrapOf(path), true);
  };
  main.onchange = e => {
    if (!nav.cur || nav.cur.view !== 'maker') return;
    if (e.target.dataset && e.target.dataset.msex != null) { P().tcSexes = P().tcSexes || {}; P().tcSexes[e.target.dataset.msex] = e.target.value; makerDirty(); refreshTop(); return; }
    if (e.target.dataset && e.target.dataset.mpath) refreshTop();
  };
  main.onclick = e => {
    if (!nav.cur || nav.cur.view !== 'maker') return; 
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.mlock || t.dataset.madd || t.dataset.mdel || /^mk(UndoDel|Restory2?|LockAll|UnlockAll)$/.test(t.id)) makerDirty();
    if (t.dataset.mtab) { s.tab = t.dataset.mtab; render(); return; }
    if (t.dataset.mlock) { const p = t.dataset.mlock; setLock(p, !lockState(p)); if (p === 'story') refreshPanel(); else refreshTop(); return; }
    if (t.dataset.madd) { const n = t.dataset.madd, row = { id: 'tc' + (++makerRowId), locked: true }; LW.LISTS[n].cols.forEach(c => row[c.k] = ''); P().lists[n].push(row); refreshPanel(); const f = main.querySelector(`[data-mwrap="l.${n}.${P().lists[n].length - 1}"] input, [data-mwrap="l.${n}.${P().lists[n].length - 1}"] textarea`); if (f) f.focus(); return; }
    if (t.dataset.mdel) { const [n, i] = t.dataset.mdel.split('.'); s.lastDeleted = { n, i: +i, row: P().lists[n].splice(+i, 1)[0] }; refreshPanel(); toast('Row removed. Click “Undo” on the Make a person page to bring it back.'); $('#mkPanel').insertAdjacentHTML('afterbegin', `<p><button class="small" id="mkUndoDel">Undo: bring the removed row back</button></p>`); return; }
    if (t.id === 'mkUndoDel') { const d = s.lastDeleted; if (d) { P().lists[d.n].splice(d.i, 0, d.row); s.lastDeleted = null; } refreshPanel(); return; }
    if (t.id === 'mkPlan') {
      const pl = { kind: 'madePerson', s: +$('#mkSeason').value, person: JSON.parse(JSON.stringify(P())), sexes: Object.assign({}, P().tcSexes || {}) };
      snapshotForEdits();
      const err = addPlan(W, pl); if (err) { toast('Not planned: ' + err, 5000); return; }
      W.makerDraft = makerBlank(W); s.tab = 'person'; dirty = true; render();
      toast(`${makerPersonName(pl.person)} will arrive in ${SEASONS[pl.s].toLowerCase()} ${yl(W.year)}. You can cancel it on the Storyteller page.`, 5000); return;
    }
    if (t.id === 'mkGen') { makerGenerate(W, P()); makerDirty(); render(); toast('Done. Anything locked was kept.'); return; }
    if (t.id === 'mkRestory' || t.id === 'mkRestory2') { restory(); return; }
    if (t.id === 'mkLockAll') { lockAll(true); return; }
    if (t.id === 'mkUnlockAll') { lockAll(false); return; }
    if (t.id === 'mkClear') {
      const p = P(), nf = LW.FIELDS.filter(d => !p.f[d.key].l && p.f[d.key].v).length, nr = LW.LISTNAMES.reduce((a, n) => a + p.lists[n].filter(r => !r.locked).length, 0), ns = (!p.story.l && p.story.v) ? 1 : 0;
      if (!nf && !nr && !ns) { toast('Nothing unlocked to clear.'); return; }
      if (!confirm(`This will empty ${nf} unlocked detail${nf === 1 ? '' : 's'}, remove ${nr} unlocked row${nr === 1 ? '' : 's'}${ns ? ' and clear the unlocked story' : ''}. Locked items stay. Go ahead?`)) return;
      LW.FIELDS.forEach(d => { if (!p.f[d.key].l) p.f[d.key].v = ''; }); LW.LISTNAMES.forEach(n => p.lists[n] = p.lists[n].filter(r => r.locked)); if (!p.story.l) p.story.v = ''; makerDirty(); render(); return;
    }
    if (t.id === 'mkNew') { if (!makerIsEmpty(P()) && !confirm('Start a new blank person? The one you are making now will be lost.')) return; W.makerDraft = makerBlank(W); s.tab = 'person'; makerDirty(); render(); return; }
  };
  $('#mkAuto').onchange = e => { s.autoLock = e.target.checked; };
};

// ---------- a locked death year, on the person's Edit & plan tab ----------
const tcPersonEdit = personEdit;
personEdit = function (p) {
  const h = tcPersonEdit(p);
  if (!p.lockedDeath || p.died != null) return h;
  return `<div class="card mk-warn"><b>Death year locked: ${esc(yl(p.lockedDeath.y))}</b>
    <p class="small" style="margin:.3rem 0">Nothing in the town can kill ${esc(p.first)} before then, and ${esc(p.first)} dies in that year. Unlock it to let the town decide instead.</p>
    <button data-unlockdeath="${p.id}">🔓 Unlock death year</button></div>` + h;
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-unlockdeath]'); if (!b) return;
  const p = W.people[+b.dataset.unlockdeath]; if (!p) return;
  if (!confirm(`Unlock ${p.first}'s death year? The town will decide when they die, like anyone else.`)) return;
  snapshotForEdits(); afterEdit(makerUnlockDeath(W, p), 'Unlocked. The town now decides when they die.');
});

// ---------- what LifeWeaver knew, on a made person's page and in their printed life ----------
function makerMadeHTML(p, forPrint) {
  if (!p.made) return '';
  const d = makerDetails(W, p);
  const dl = d.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v).replace(/\n/g, '<br>')}</dd>`).join('');
  const story = p.made.story ? (forPrint ? `<h4>Life story before coming to ${esc(W.name)}</h4>${esc(p.made.story).split(/\n\s*\n/).map(x => `<p>${x}</p>`).join('')}`
    : `<details class="mk-before"><summary>Life story before coming to ${esc(W.name)}</summary>${esc(p.made.story).split(/\n\s*\n/).map(x => `<p>${x}</p>`).join('')}</details>`) : '';
  return forPrint ? `<h3>Before coming to ${esc(W.name)}</h3>${dl ? `<dl class="kv">${dl}</dl>` : ''}${story}`
    : `<div class="card mk-made"><h3>Before coming to ${esc(W.name)} <span class="pill acc">made with the person maker</span></h3>${dl ? `<dl class="kv">${dl}</dl>` : ''}${story}</div>`;
}
const tcPersonStory = personStory;
personStory = function (p, y) { return tcPersonStory(p, y) + makerMadeHTML(p, false); };
const tcPrintLife = printLife;
printLife = function (p, o) {
  const h = tcPrintLife(p, o); if (!p.made) return h;
  const at = h.indexOf('<h3>Year by year</h3>');
  return at < 0 ? h + makerMadeHTML(p, true) : h.slice(0, at) + makerMadeHTML(p, true) + h.slice(at);
};
