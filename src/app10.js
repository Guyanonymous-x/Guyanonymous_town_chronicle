// ================= V10 page code: attitudes, who people are, lasting injuries, photos =================
NAV.splice(NAV.findIndex(x => x[0] === 'grudges') + 1, 0, ['attitudes', 'Attitudes']);
NAV.splice(NAV.findIndex(x => x[0] === 'people') + 1, 0, ['photos', 'Photos']);

const attWord = v => v <= -60 ? 'hostile' : v <= -20 ? 'disapproving' : v < 20 ? 'mixed' : v < 60 ? 'accepting' : 'welcoming';
function attBar(v, wide) {
  const pct = (v + 100) / 2;
  return `<span class="att-bar ${wide ? 'wide' : ''}" title="${v} (${attWord(v)})"><span class="att-mid"></span><span class="att-dot" style="left:${pct}%;background:${v < -20 ? 'var(--bad)' : v > 20 ? 'var(--good)' : 'var(--warn)'}"></span></span>`;
}

// ---------- the Attitudes page ----------
function viewAttitudes() {
  townAtt(W);
  const y = W.year, people = lives(W);
  const maj = { culture: majority(W, p => p.culture), faith: majority(W, p => p.faith) };
  const hist = W.attHistory || {}, years = Object.keys(hist).map(Number).sort((a, b) => a - b);
  const then = years.find(yy => yy >= y - 20);
  const recent = [];
  for (const p of Object.values(W.people)) for (const e of p.events) if (e.y >= y - 5 && (/^Came out, and from now on|^Stopped hiding, and lives openly|jeered at and shunned|turned .* back on .* after .* came out/.test(e.text))) recent.push([e.y, p, e]);
  recent.sort((a, b) => b[0] - a[0]);
  const rows = ISSUES.map(is => {
    const a = W.att[is.key], openN = people.filter(p => marksOf(W, p, y, maj).includes(is.key)).length;
    const hidN = is.key === 'gender' ? people.filter(p => p.inner && p.inner.realised && !p.inner.out).length : is.key === 'samesex' ? people.filter(p => p.so && p.so.realised && !p.so.out).length : null;
    return `<div class="card att-card">
      <div class="att-head"><h3>${esc(is.label)}</h3><span class="pill ${a.v < -20 ? 'bad' : a.v > 20 ? 'good' : 'warn'}">${attWord(a.v)} (${a.v})</span></div>
      <p class="muted small">How the town feels about ${esc(is.about)}.${then != null && then < y ? ` In ${esc(yl(then))} it was ${hist[then][is.key]} (${attWord(hist[then][is.key])}).` : ''}</p>
      ${attBar(a.v, true)}
      <div class="formrow"><label>Set the town's attitude<span><input type="range" min="-100" max="100" step="1" value="${a.v}" data-attset="${is.key}" style="width:240px"> <b data-attshow="${is.key}">${a.v}</b></span></label>
        <label class="small"><span><input type="checkbox" data-attlock="${is.key}" ${a.locked ? 'checked' : ''}> Hold it there: each year people are nudged towards it (like sermons, newspapers or laws). Unticked, it follows what people think.</span></label></div>
      <p class="small">${openN} ${openN === 1 ? 'person' : 'people'} in the town ${is.key === 'samesex' ? 'live openly as gay, lesbian or bisexual' : is.key === 'gender' ? 'live as a gender other than the one they were raised as' : is.key === 'disability' ? 'live with a severe disability or a disfigured face' : is.key === 'outsiders' ? 'are newcomers or from another culture' : is.key === 'faiths' ? 'follow a different faith from most' : 'are women in skilled or leading work'}.${hidN != null && showSecrets ? ` <span class="pill acc">secret</span> ${hidN} more know it about themselves but are hiding it.` : ''}</p>
    </div>`;
  }).join('');
  return `<h1>Attitudes</h1>
    <p class="muted">How ${esc(W.name)} feels about people who are different, from hostile (−100) to welcoming (+100). Everyone has their own attitudes too, shaped by their nature, family, friends and the town; you can see them on each person's page.
    Attitudes change how people treat each other: friendships and family ties cool or warm, reputations rise or fall, and where the town is hostile people are jeered at, shunned or even attacked. They also decide whether people dare to come out.</p>
    <p class="small muted">Starting points are estimates for the period. ${W.settings.attitudesChangeLaws ? `The law on same-sex couples follows the town (it is ${W.settings.sameSexCouples ? 'allowed' : 'not allowed'} now); you can turn that off in Era settings.` : 'The law on same-sex couples does not follow the town (see Era settings).'}</p>
    <div class="att-grid">${rows}</div>
    <div class="card"><h3>In the last five years</h3>${recent.length ? recent.slice(0, 40).map(([yy, p, e]) => `<div class="small" style="padding:.2rem 0;border-bottom:1px solid var(--soft)"><b>${esc(yl(yy))}</b> ${plink(p.id)}: ${linkify(e.text)}</div>`).join('') : '<p class="muted small">Nothing yet.</p>'}</div>`;
}
afterRender.attitudes = () => {
  document.querySelectorAll('[data-attset]').forEach(el => {
    el.oninput = () => { const s = document.querySelector(`[data-attshow="${el.dataset.attset}"]`); if (s) s.textContent = el.value; };
    el.onchange = () => { snapshotForEdits(); const k = el.dataset.attset; W.att[k].v = +el.value; W.att[k].locked = true; logEdit(W, `Set the town's attitude to ${ISSUES.find(i => i.key === k).label.toLowerCase()} to ${el.value} and held it there.`); afterEdit(null, 'Set. People will be nudged towards it each year.'); };
  });
  document.querySelectorAll('[data-attlock]').forEach(el => el.onchange = () => { snapshotForEdits(); W.att[el.dataset.attlock].locked = el.checked; logEdit(W, `${el.checked ? 'Held' : 'Released'} the town's attitude to ${ISSUES.find(i => i.key === el.dataset.attlock).label.toLowerCase()}.`); afterEdit(null, el.checked ? 'Held.' : 'Released: it now follows what people think.'); });
};

// ---------- who they are, on a person's page ----------
function whoTheyAreHTML(p) {
  const lines = [];
  const raised = p.sex === 'm' ? 'a boy' : 'a girl';
  if (p.gender && p.gender !== (p.sex === 'm' ? 'man' : 'woman')) lines.push(`Lives as ${GENDER_WORD[p.gender]}${p.inner && p.inner.out ? ` (since ${esc(yl(p.inner.out))})` : ''}. Raised as ${raised}${p.firstAtBirth && p.firstAtBirth !== p.first ? `, named ${esc(p.firstAtBirth)}` : ''}.`);
  if (p.so && p.so.out) lines.push(`Lives openly as ${p.orientation === 'gay' ? (genderOf(p) === 'man' ? 'a gay man' : genderOf(p) === 'woman' ? 'a lesbian' : 'gay') : 'bisexual'} (since ${esc(yl(p.so.out))}).`);
  if (showSecrets) {
    if (p.inner && p.inner.realised && !p.inner.out) lines.push(`<span class="pill acc">secret</span> Knows, since ${esc(yl(p.inner.realised))}, that ${heShe(p)} is ${GENDER_WORD[p.inner.felt]}, but hides it.`);
    if (p.so && p.so.realised && !p.so.out) lines.push(`<span class="pill acc">secret</span> Knows, since ${esc(yl(p.so.realised))}, that ${heShe(p)} is ${p.orientation === 'gay' ? 'gay' : 'bisexual'}, but hides it.`);
  }
  const SK = { craft: 'crafts', trade: 'trade', animals: 'work with animals', farming: 'farming', outdoors: 'outdoor work', fighting: 'fighting', labor: 'heavy labour', healing: 'healing', leadership: 'leading others' };
  for (const c of p.conditions || []) { const e = CONDITION_EFFECTS[c]; if (!e) continue; const bits = []; if (e.cannot) bits.push('can no longer do ' + e.cannot.map(k => SK[k] || k).join(', ')); if (e.prone && e.prone > 1.01) bits.push(`more likely to be hurt (×${e.prone})`); if (e.disfigured) bits.push('some people are frightened or put off by it'); if (e.disabled) bits.push('how people treat this depends on their attitudes'); lines.push(`${esc(cap(c))}: ${bits.join('; ')}.`); }
  const att = p.att ? `<div class="att-person">${ISSUES.map(is => `<div class="small"><span class="att-lab">${esc(is.label)}</span>${attBar(p.att[is.key])} <span class="muted">${attWord(p.att[is.key])}</span></div>`).join('')}</div>` : '';
  if (!lines.length && !att) return '';
  return `<div class="card"><h3>Who ${esc(p.first)} is</h3>${lines.map(l => `<p class="small" style="margin:.2rem 0">${l}</p>`).join('')}${att ? `<h4 class="small muted" style="margin:.6rem 0 .2rem">${esc(p.first)}'s own attitudes</h4>${att}` : ''}</div>`;
}
const v10PersonStory = personStory;
personStory = function (p, y) { return v10PersonStory(p, y) + photoStrip(p) + whoTheyAreHTML(p); };

// ---------- changing who someone is (Edit & plan tab) ----------
const v10PersonEdit = personEdit;
personEdit = function (p) {
  const h = v10PersonEdit(p);
  if (p.status !== 'resident' || p.died != null) return h;
  const g = genderOf(p), orient = p.orientation || 'straight', open = !!(p.so && p.so.out);
  return `<div class="card"><h3>Who ${esc(p.first)} is</h3><div class="formrow">
    <label>Lives as<select id="edGender">${['man', 'woman', 'nonbinary'].map(x => `<option value="${x}" ${x === g ? 'selected' : ''}>${x === 'nonbinary' ? 'non-binary' : 'a ' + x}</option>`).join('')}</select></label>
    <label>Drawn to<select id="edOrient">${[['straight', 'the other sex'], ['gay', 'the same sex'], ['bisexual', 'both']].map(([k, l]) => `<option value="${k}" ${k === orient ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="small"><span><input type="checkbox" id="edOpen" ${open ? 'checked' : ''} ${orient === 'straight' ? 'disabled' : ''}> Open about it</span></label>
    <button id="edWhoSave">Change</button></div>
    <p class="small muted">Changing these here is immediate. Left alone, the town decides: people realise who they are, and come out or hide it depending on the people around them.</p></div>` + h;
};
document.addEventListener('click', e => {
  if (!e.target.closest('#edWhoSave')) return;
  const p = W.people[nav.cur.params.id]; if (!p) return;
  const g = $('#edGender').value, o = $('#edOrient').value, open = $('#edOpen').checked, y = W.year;
  snapshotForEdits();
  const changes = [];
  if (g !== genderOf(p)) {
    const raisedAs = p.sex === 'm' ? 'man' : 'woman';
    if (g === raisedAs) { p.gender = undefined; if (p.inner) p.inner.out = null; }
    else { p.inner = p.inner || { felt: g, realise: p.born, realised: y, out: null }; p.inner.felt = g; p.inner.realised = p.inner.realised || y; p.inner.out = y; p.gender = g; addEvent(W, p, y, 'mind', `Came out, and from now on lives as ${GENDER_WORD[g]}.`); }
    changes.push(`lives as ${g === 'nonbinary' ? 'non-binary' : 'a ' + g}`);
  }
  if (o !== (p.orientation || 'straight')) { p.orientation = o; if (o === 'straight') delete p.so; else p.so = p.so || { realise: p.born + 14, realised: y, out: null }; changes.push(`drawn to ${o === 'gay' ? 'the same sex' : o === 'bisexual' ? 'both' : 'the other sex'}`); }
  if (p.so) { if (open && !p.so.out) { p.so.realised = p.so.realised || y; p.so.out = y; addEvent(W, p, y, 'mind', `Stopped hiding, and lives openly as ${o === 'gay' ? (p.sex === 'm' ? 'a gay man' : 'a lesbian') : 'bisexual'}.`); changes.push('open about it'); } else if (!open && p.so.out) { p.so.out = null; changes.push('hiding it'); } }
  if (!changes.length) { toast('Nothing changed.'); return; }
  logEdit(W, `Changed who @${p.id} is: ${changes.join(', ')}.`);
  afterEdit(null, 'Changed.');
});

// ---------- photos ----------
// Photos live inside the save, shrunk to at most 1000 pixels across, so one file holds the whole town.
function photosOf(id) { return Object.values(W.photos || {}).filter(ph => ph.people.includes(id)).sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || a.id - b.id); }
function photoStrip(p) {
  const ph = photosOf(p.id);
  return `<div class="card"><h3>Photos of ${esc(p.first)} ${ph.length ? `<span class="muted small">(${ph.length})</span>` : ''}</h3>
    ${ph.length ? `<div class="ph-strip">${ph.map(x => `<figure class="ph-thumb" data-photo="${x.id}"><img src="${x.data}" alt=""><figcaption>${x.y != null ? esc(yl(x.y)) + (x.y - p.born >= 0 ? ` · age ${x.y - p.born}` : '') : ''}${x.people.length > 1 ? ` · with ${x.people.length - 1} other${x.people.length > 2 ? 's' : ''}` : ''}</figcaption></figure>`).join('')}</div>` : '<p class="muted small">No photos yet.</p>'}
    <button class="small" data-addphoto="${p.id}">+ Add a photo</button></div>`;
}
function viewPhotos() {
  const all = Object.values(W.photos || {}).sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || a.id - b.id);
  return `<h1>Photos</h1><p class="muted">Every photo in ${esc(W.name)}. A photo can show one person or several (a group photo), and belong to any year. Add photos from a person's page; click one to see it, add or remove people, or make it someone's main picture.</p>
    <div class="card">${all.length ? `<div class="ph-strip">${all.map(x => `<figure class="ph-thumb" data-photo="${x.id}"><img src="${x.data}" alt=""><figcaption>${x.y != null ? esc(yl(x.y)) : ''} · ${x.people.map(id => W.people[id] ? esc(W.people[id].first + ' ' + W.people[id].last) : '').filter(Boolean).slice(0, 3).join(', ')}${x.people.length > 3 ? '…' : ''}</figcaption></figure>`).join('')}</div>` : '<p class="muted">No photos yet. Open someone\'s page and use “Add a photo”.</p>'}</div>`;
}
function shrinkImage(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve({ data: c.toDataURL('image/jpeg', 0.85), w: c.width, h: c.height }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as a picture.')); };
    img.src = url;
  });
}
function addPhotoData(data, y, caption, ids) {
  W.photos = W.photos || {}; W.nextPhoto = W.nextPhoto || 1;
  const id = W.nextPhoto++;
  W.photos[id] = { id, data, y: y == null || y === '' ? null : +y, caption: caption || '', people: [...new Set(ids)], added: new Date().toISOString() };
  for (const pid of ids) { const q = W.people[pid]; if (q && !q.photo) q.photo = id; }
  return id;
}
function photoOverlay(id) {
  const x = W.photos[id]; if (!x) return;
  document.querySelectorAll('.ph-overlay').forEach(o => o.remove());
  const o = document.createElement('div'); o.className = 'overlay ph-overlay';
  o.innerHTML = `<div class="box ph-box"><button class="small ph-close" title="Close">✕</button><img src="${x.data}" alt="">
    <div class="formrow"><label>Year<input type="number" id="phYear" value="${x.y ?? ''}" style="width:90px"></label><label style="flex:1">Caption<input type="text" id="phCap" value="${esc(x.caption)}" style="width:100%"></label><button id="phSave">Save</button></div>
    <p class="small"><b>In this photo:</b> ${x.people.map(pid => W.people[pid] ? `<span class="chip"><span class="nm" data-pid="${pid}">${esc(fullName(W.people[pid]))}</span> <button class="small" data-phmain="${pid}" title="Make this ${esc(W.people[pid].first)}'s main picture">${W.people[pid].photo === id ? '★ main picture' : '☆ make main'}</button> <button class="small" data-phunlink="${pid}" title="Take ${esc(W.people[pid].first)} out of this photo">✕</button></span>` : '').join(' ')}</p>
    <div class="formrow"><label>Add someone to this photo<input type="text" id="phAdd" list="dlPeople" placeholder="Type a name…" size="28"></label><button id="phAddBtn">Add</button><span style="flex:1"></span><button id="phDel" class="small">Delete photo</button></div>
    ${peopleDatalist()}</div>`;
  document.body.appendChild(o);
  const done = msg => { o.remove(); dirty = true; render(); if (msg) toast(msg); };
  o.onclick = ev => { if (ev.target === o) o.remove(); };
  o.querySelector('.ph-close').onclick = () => o.remove();
  o.querySelector('#phSave').onclick = () => { snapshotForEdits(); x.y = o.querySelector('#phYear').value === '' ? null : +o.querySelector('#phYear').value; x.caption = o.querySelector('#phCap').value; done('Saved.'); };
  o.querySelector('#phAddBtn').onclick = () => { const pid = idFromPick(o.querySelector('#phAdd').value); if (!pid || !W.people[pid]) { toast('Pick someone from the list.'); return; } snapshotForEdits(); if (!x.people.includes(pid)) x.people.push(pid); if (!W.people[pid].photo) W.people[pid].photo = id; done(); photoOverlay(id); };
  o.querySelectorAll('[data-phmain]').forEach(b => b.onclick = () => { snapshotForEdits(); W.people[+b.dataset.phmain].photo = id; done(); photoOverlay(id); });
  o.querySelectorAll('[data-phunlink]').forEach(b => b.onclick = () => { const pid = +b.dataset.phunlink; if (x.people.length === 1 && !confirm('This is the only person in the photo. Delete the photo?')) return; snapshotForEdits(); x.people = x.people.filter(q => q !== pid); if (W.people[pid].photo === id) W.people[pid].photo = photosOf(pid)[0]?.id || null; if (!x.people.length) delete W.photos[id]; done(); if (W.photos[id]) photoOverlay(id); });
  o.querySelector('#phDel').onclick = () => { if (!confirm('Delete this photo from the town? (Undo can bring it back.)')) return; snapshotForEdits(); for (const pid of x.people) if (W.people[pid] && W.people[pid].photo === id) W.people[pid].photo = null; delete W.photos[id]; for (const pid of x.people) if (W.people[pid] && !W.people[pid].photo) W.people[pid].photo = photosOf(pid)[0]?.id || null; done('Photo deleted.'); };
}
document.addEventListener('click', async e => {
  if (e.target.closest('.ph-overlay [data-pid]')) { document.querySelectorAll('.ph-overlay').forEach(o => o.remove()); return; } // going to someone's page closes the photo
  const th = e.target.closest('[data-photo]'); if (th && !e.target.closest('.ph-overlay')) { e.preventDefault(); photoOverlay(+th.dataset.photo); return; }
  const add = e.target.closest('[data-addphoto]'); if (!add) return;
  const pid = +add.dataset.addphoto, inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try { const im = await shrinkImage(f, 1000); snapshotForEdits(); const id = addPhotoData(im.data, W.year, '', [pid]); dirty = true; render(); photoOverlay(id); toast('Photo added. Set its year, a caption and anyone else in it.'); }
    catch (err) { toast(err.message, 4000); }
  };
  inp.click();
});

// the main photo at the top of a printed life story
const v10PrintLife = printLife;
printLife = function (p, o) {
  const h = v10PrintLife(p, o); const ph = p.photo && W.photos && W.photos[p.photo]; if (!ph) return h;
  const at = h.indexOf('</h2>'); return at < 0 ? h : h.slice(0, at + 5) + `<img class="pphoto" src="${ph.data}" alt="">` + h.slice(at + 5);
};
