// ================= Stage 4 page code: trees and maps =================
ui.tree = { up: 2, down: 2, spouses: true, former: false, siblings: true, siblingLines: false, dead: true, gone: true };
ui.map = { family: true, household: true, friends: true, enemies: true, work: true, regulars: false, past: false, between: true };
const TREE_OPTS = [['spouses', 'Husbands, wives and partners'], ['former', 'Former and late partners'], ['siblings', 'Brothers and sisters'], ['siblingLines', 'Their children too'], ['dead', 'People who have died'], ['gone', 'People who moved away']];
function personTree(p) {
  const o = ui.tree;
  const { svg, count } = treeSVG(p.id, o);
  return `<div class="filters small">
    Generations up <select id="tUp">${[0, 1, 2, 3, 4, 5, 6].map(n => `<option ${o.up === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
    down <select id="tDown">${[0, 1, 2, 3, 4, 5, 6].map(n => `<option ${o.down === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
    ${TREE_OPTS.map(([k, l]) => `<label><input type="checkbox" data-topt="${k}" ${o[k] ? 'checked' : ''}> ${l}</label>`).join(' ')}
  </div>
  <p class="small muted">${count} people shown. Click anyone to centre the tree on them. Dashed boxes have moved away; dashed lines are former or late partners. † = died.</p>
  ${vizFrame(svg, 600)}`;
}
function connectionGraph(p) {
  const o = ui.map; const nodes = new Map(); const links = [];
  const y = W.year;
  const add = (id, cat, label) => {
    const q = W.people[id]; if (!q || id === p.id) return false;
    if (!o.past && q.status !== 'resident') return false;
    if (!nodes.has(id)) nodes.set(id, { id, cat, why: [label] }); else nodes.get(id).why.push(label);
    return true;
  };
  const COL = { family: '#4b6f9e', household: '#7a5aa8', friends: '#3d7a4f', love: '#c0558a', enemies: '#b0403a', work: '#b07a1f', regulars: '#8a8070' };
  const link = (a, b, cat, title, extra) => links.push(Object.assign({ a, b, color: COL[cat], title, len: cat === 'regulars' ? 170 : 110, str: 0.05 }, extra || {}));
  if (o.family) {
    const f = familyOf(W, p);
    for (const [ids, word] of [[f.parents, 'parent'], [f.children, 'child'], [f.siblings, 'brother or sister'], [f.halfSiblings, 'half-sibling'], [f.spouse, 'partner'], [f.grandparents, 'grandparent'], [f.grandchildren, 'grandchild'], [f.former, 'former partner'], [f.stepParents, 'step-parent']])
      for (const id of ids) if (add(id, word === 'partner' ? 'love' : 'family', relationWord(W, p, W.people[id]) || word)) link(p.id, id, word === 'partner' ? 'love' : 'family', relationWord(W, p, W.people[id]) || word, { w: 2.2 });
  }
  if (o.household) { const h = W.households[p.household]; if (h && p.status === 'resident') for (const id of h.members) if (add(id, 'household', 'shares a home')) link(p.id, id, 'household', 'shares a home'); }
  for (const r of socialOf(p)) {
    if (r.ended && !o.past) continue;
    const cat = r.score < 0 && r.type !== 'ex' ? 'enemies' : /courting|crush|spouse/.test(r.type) ? 'love' : /friend|mentor|acquaint/.test(r.type) ? 'friends' : r.type === 'ex' ? 'love' : 'friends';
    if ((cat === 'enemies' && !o.enemies) || ((cat === 'friends' || cat === 'love') && !o.friends && r.type !== 'spouse')) continue;
    if (r.type === 'spouse' && !o.family) continue;
    if (add(r.other, cat, r.type)) link(p.id, r.other, cat, `${r.type}: ${r.reason || ''}`, { w: 1 + Math.abs(r.score) / 30, dash: cat === 'enemies' });
  }
  if (o.work && p.workplace && W.workplaces[p.workplace]) for (const id of W.workplaces[p.workplace].members.slice(0, 30)) if (add(id, 'work', 'works with')) link(p.id, id, 'work', 'works with');
  if (o.regulars) {
    const live = residentsAlive(W).filter(q => q.id !== p.id && q.venues && p.venues && q.venues.filter(v => p.venues.includes(v)).length >= 2);
    const h = W.households[p.household];
    const nb = h ? residentsAlive(W).filter(q => q.id !== p.id && q.household !== p.household && W.households[q.household] && W.households[q.household].district === h.district) : [];
    for (const q of [...live, ...nb].sort((a, b) => Math.abs(ageOf(a, y) - ageOf(p, y)) - Math.abs(ageOf(b, y) - ageOf(p, y))).slice(0, 25)) if (add(q.id, 'regulars', 'sees regularly')) link(p.id, q.id, 'regulars', 'sees regularly', { op: 0.5 });
  }
  // ties among the people shown
  if (o.between) {
    const ids = [...nodes.keys()]; const set = new Set(ids);
    for (const id of ids) for (const r of socialOf(W.people[id])) if (set.has(r.other) && id < r.other && (!r.ended || o.past)) {
      const cat = r.score < 0 && r.type !== 'ex' ? 'enemies' : /courting|crush|spouse/.test(r.type) ? 'love' : 'friends';
      if ((cat === 'enemies' && !o.enemies) || (cat !== 'enemies' && !o.friends && r.type !== 'spouse')) continue;
      links.push({ a: id, b: r.other, color: COL[cat], title: `${fullName(W.people[id])} – ${fullName(W.people[r.other])}: ${r.type}`, op: 0.35, w: 1, dash: cat === 'enemies', len: 120, str: 0.02 });
    }
  }
  const arr = [{ id: p.id, x: 0, y: 0, fixed: true, fx: 0, fy: 0, r: 16, fill: 'var(--accent)', stroke: 'var(--accent)', label: fullName(p), bold: true, fs: 12, title: fullName(p), attr: `data-pid="${p.id}"` }];
  // each kind of tie gets its own side of the picture, so you can see at a glance who is what
  const ORDER = ['family', 'love', 'friends', 'enemies', 'work', 'regulars', 'household'];
  const byCat = {};
  for (const n of nodes.values()) (byCat[n.cat] = byCat[n.cat] || []).push(n);
  const cats = ORDER.filter(c => byCat[c]); const total = cats.reduce((t, c) => t + byCat[c].length, 0) || 1;
  const gapDeg = cats.length > 1 ? 8 : 0; const free = 360 - gapDeg * cats.length;
  const share = cats.map(c => Math.max(28, free * byCat[c].length / total)); const k0 = free / share.reduce((a, b) => a + b, 0);
  let start = -90 - share[0] * k0 / 2;
  cats.forEach((cat, ci) => {
    const list = byCat[cat].sort((a, b) => W.people[a.id].born - W.people[b.id].born);
    const span = Math.min(359, share[ci] * k0) * Math.PI / 180; const a0 = start * Math.PI / 180;
    let i = 0, ring = 0;
    while (i < list.length) {
      const R = 200 + ring * 75; const cap = Math.max(1, Math.floor(R * span / 120) + 1);
      const row = list.slice(i, i + cap);
      row.forEach((n, k) => {
        const q = W.people[n.id]; const a = a0 + span * (row.length > 1 ? k / (row.length - 1) * 0.9 + 0.05 : 0.5);
        const why = [...new Set(n.why)];
        arr.push({ id: n.id, x: Math.cos(a) * R, y: Math.sin(a) * R, r: 7, fill: q.status === 'dead' ? '#ddd5c7' : 'var(--card)', stroke: COL[n.cat], sw: 2.5, dash: q.status !== 'resident', label: q.first + ' ' + q.last, sub: why[0] + (q.status === 'dead' ? ' †' : ''), scol: COL[n.cat], title: `${fullName(q)} — ${why.join(', ')}`, attr: `data-mapp="${n.id}"`, tcol: q.status === 'dead' ? 'var(--muted)' : 'var(--ink)' });
      });
      i += cap; ring++;
    }
    start += share[ci] * k0 + gapDeg;
  });
  spreadOut(arr, 8);
  return { svg: graphSVG(arr, links), count: nodes.size, COL };
}
function personMap(p) {
  const o = ui.map; const { svg, count, COL } = connectionGraph(p);
  const cats = [['family', 'Family', COL.family], ['household', 'Home', COL.household], ['friends', 'Friends and sweethearts', COL.friends], ['enemies', 'Rivals and enemies', COL.enemies], ['work', 'Work', COL.work], ['regulars', 'Neighbours and regulars', COL.regulars]];
  return `<div class="filters small">${cats.map(([k, l, c]) => `<label><input type="checkbox" data-mopt="${k}" ${o[k] ? 'checked' : ''}> <span style="color:${c}">●</span> ${l}</label>`).join(' ')}
    <label><input type="checkbox" data-mopt="between" ${o.between ? 'checked' : ''}> Ties between them</label>
    <label><input type="checkbox" data-mopt="past" ${o.past ? 'checked' : ''}> Include the dead and those gone</label></div>
  <p class="small muted">${count} people connected to ${esc(p.first)}. <span style="color:${COL.love}">●</span> pink lines are love and marriage; dashed red lines are bad blood. Click a person to centre the map on them; click ${esc(p.first)} to open the full life page.</p>
  ${vizFrame(svg, 620)}`;
}
afterRender.person = (orig => p => {
  orig(p);
  const o = ui.tree, m = ui.map;
  if ($('#tUp')) $('#tUp').onchange = e => { o.up = +e.target.value; render(); };
  if ($('#tDown')) $('#tDown').onchange = e => { o.down = +e.target.value; render(); };
  document.querySelectorAll('[data-topt]').forEach(c => c.onchange = () => { o[c.dataset.topt] = c.checked; render(); });
  document.querySelectorAll('[data-mopt]').forEach(c => c.onchange = () => { m[c.dataset.mopt] = c.checked; render(); });
  vizWire();
})(afterRender.person);
document.addEventListener('click', e => {
  if (window._vizMoved && e.target.closest('.viz')) { e.preventDefault(); e.stopPropagation(); return; }
  const t = e.target.closest('[data-tree]'); if (t) { e.preventDefault(); e.stopPropagation(); ui.personTab = 'tree'; go('person', { id: +t.dataset.tree }); return; }
  const m = e.target.closest('[data-mapp]'); if (m) { e.preventDefault(); e.stopPropagation(); ui.personTab = 'map'; go('person', { id: +m.dataset.mapp }); }
}, true);

// ---------- family trees page: the whole community ----------
function familyClusters() {
  // group everyone living here by the surname they were born with
  const fam = new Map();
  for (const p of residentsAlive(W)) { const k = p.birthName || p.last; if (!fam.has(k)) fam.set(k, []); fam.get(k).push(p); }
  return fam;
}
function viewTrees() {
  const fam = familyClusters();
  const names = [...fam.keys()];
  const nodes = [], links = [], wmap = new Map();
  const big = names.filter(n => fam.get(n).length >= (residentsAlive(W).length > 500 ? 3 : 2));
  const set = new Set(big);
  for (const n of big) nodes.push({ id: n, r: Math.min(12, 4 + Math.sqrt(fam.get(n).length) * 1.2), label: n, sub: fam.get(n).length + ' here', fill: n === ui.famSel ? 'var(--accent)' : 'var(--accent-soft)', stroke: 'var(--accent)', title: `The ${n} family: ${fam.get(n).length} living here. Point at it to see who they married into; click to show their tree.`, attr: `data-fam="${esc(n)}"`, fs: 10.5, bold: n === ui.famSel });
  for (const p of residentsAlive(W)) {
    if (!p.spouse || p.id > p.spouse) continue; const s = W.people[p.spouse]; if (!s) continue;
    const a = p.birthName || p.last, b = s.birthName || s.last; if (a === b || !set.has(a) || !set.has(b)) continue;
    const k = a < b ? a + '|' + b : b + '|' + a; wmap.set(k, (wmap.get(k) || 0) + 1);
  }
  for (const [k, v] of wmap) { const [a, b] = k.split('|'); links.push({ a, b, w: 1 + v, color: 'var(--accent)', op: 0.45, title: `${v} marriage${v > 1 ? 's' : ''} between the ${a} and ${b} families`, len: 150, str: 0.03 }); }
  forceLayout(nodes, links, { seed: 3, repel: 9000, gap: 10 });
  const sel = ui.famSel && fam.get(ui.famSel) ? ui.famSel : null;
  let famBlock = '';
  if (sel) {
    // the oldest known ancestors who carried this name, with the most descendants
    const carriers = Object.values(W.people).filter(p => (p.birthName || p.last) === sel);
    const roots = carriers.filter(p => !carriers.some(q => q.id === p.father || q.id === p.mother));
    const descCount = p => { let n = 0; const st = [p]; const seen = new Set(); while (st.length) { const x = st.pop(); for (const c of x.children) if (!seen.has(c)) { seen.add(c); n++; st.push(W.people[c]); } } return n; };
    const ranked = roots.map(p => [p, descCount(p)]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    famBlock = `<div class="card"><h3>The ${esc(sel)} family</h3><p class="small">${fam.get(sel).length} living here. <a data-filter='${esc(JSON.stringify({ ids: fam.get(sel).map(p => p.id), label: 'born ' + sel }))}'>List them</a></p>
      <p class="small muted">Start a tree from the family's oldest known ancestors (it opens with three generations down; you can show more):</p>
      <div class="chips">${ranked.map(([p, n]) => `<span class="chip" data-treefrom="${p.id}"><span class="nm">${esc(fullName(p))}${p.status === 'dead' ? ' †' : ''}</span><span class="sub">b. ${p.born} · ${n} descendants</span></span>`).join('')}</div></div>`;
  }
  // the traditional box tree: one family, or everyone who ever lived here
  const o = ui.ftree;
  const carriers = sel ? Object.values(W.people).filter(p => (p.birthName || p.last) === sel).map(p => p.id) : Object.keys(W.people).map(Number);
  const t0 = Date.now(); const ft = forestSVG(carriers, { spouses: true, former: o.former, dead: o.dead, gone: o.gone, down: o.down }, null);
  const famOpts = [...fam.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const boxCard = `<div class="card"><h3>${sel ? `The ${esc(sel)} family tree` : 'The whole community’s family tree'}</h3>
    <div class="filters small">Show <select id="ftFam"><option value="">Everyone — the whole community</option>${famOpts.map(([n, l]) => `<option value="${esc(n)}" ${n === sel ? 'selected' : ''}>The ${esc(n)} family (${l.length} living here)</option>`).join('')}</select>
      Generations <select id="ftDown">${[['99', 'All'], ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => [String(n), String(n)])].map(([v, l]) => `<option value="${v}" ${String(o.down) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label><input type="checkbox" data-ft="dead" ${o.dead ? 'checked' : ''}> People who have died</label>
      <label><input type="checkbox" data-ft="gone" ${o.gone ? 'checked' : ''}> People who moved away</label>
      <label><input type="checkbox" data-ft="former" ${o.former ? 'checked' : ''}> Former and late partners</label></div>
    <p class="small muted">${ft.count} people. Each person has one full box. A light dashed box is a copy — for example a wife shown beside her husband while her full box sits with her own parents. Click a copy to jump to the full box; click a full box to open that person's own tree. Lines down come from the couple; dashed lines are former or late partners. † = died.</p>
    ${ft.count ? vizFrame(ft.svg, 660) : '<p class="muted">Nobody to show with these choices.</p>'}</div>`;
  return `<h1>Family trees</h1>
  <p class="muted">Open any person's <b>Family tree</b> tab to see their tree, or start here. Below is the family tree drawn as boxes, then a map of how the families are joined by marriage.</p>
  <div class="filters"><input type="search" id="treeQ" placeholder="Find a person to start a tree…" size="30"><span id="treeHits" class="chips"></span></div>
  ${famBlock}
  ${boxCard}
  <div class="card"><h3>How the families are joined by marriage</h3><p class="small muted">Each dot is a family (by the surname people were born with); a bigger dot means more of them live here. Lines are marriages between families: thicker means more marriages. Point at a family to light up who they married into. Click a family to show its tree above.</p>${vizFrame(graphSVG(nodes, links), 620)}</div>`;
}
ui.ftree = { down: 99, dead: true, gone: true, former: true };
afterRender.trees = () => {
  vizWire();
  if ($('#ftFam')) $('#ftFam').onchange = e => { ui.famSel = e.target.value || null; render(); };
  if ($('#ftDown')) $('#ftDown').onchange = e => { ui.ftree.down = +e.target.value; render(); };
  document.querySelectorAll('[data-ft]').forEach(c => c.onchange = () => { ui.ftree[c.dataset.ft] = c.checked; render(); });
  document.querySelectorAll('[data-fam]').forEach(g => g.addEventListener('click', e => { e.stopPropagation(); ui.famSel = g.dataset.fam; render(); }));
  document.querySelectorAll('[data-treefrom]').forEach(c => c.onclick = () => { ui.tree.up = 0; ui.tree.down = 3; ui.personTab = 'tree'; go('person', { id: +c.dataset.treefrom }); });
  const q = $('#treeQ');
  if (q) q.oninput = () => { const v = q.value.toLowerCase().trim(); const hits = v.length < 2 ? [] : Object.values(W.people).filter(p => fullName(p).toLowerCase().includes(v)).slice(0, 12); $('#treeHits').innerHTML = hits.map(p => `<span class="chip" data-treefrom2="${p.id}"><span class="nm">${esc(fullName(p))}</span><span class="sub">${esc(ageText(p))}</span></span>`).join(''); document.querySelectorAll('[data-treefrom2]').forEach(c => c.onclick = () => { ui.personTab = 'tree'; go('person', { id: +c.dataset.treefrom2 }); }); };
};

// ---------- group and grudge maps ----------
function peopleGraph(ids, opts) {
  const set = new Set(ids); const nodes = [], links = [];
  for (const id of ids) { const p = W.people[id]; if (!p) continue; nodes.push({ id, r: 6, label: p.first + ' ' + p.last, fill: (opts.fillFn && opts.fillFn(p)) || 'var(--card)', stroke: p.sex === 'm' ? 'var(--male)' : 'var(--female)', title: fullName(p) + (opts.titleFn ? ' — ' + opts.titleFn(p) : ''), attr: `data-pid="${id}"`, dash: p.status !== 'resident' }); }
  for (const r of Object.values(W.rels)) {
    if (!set.has(r.a) || !set.has(r.b) || (r.ended && !opts.past)) continue;
    if (opts.onlyBad && !(r.score < 0 && r.type !== 'ex')) continue;
    const bad = r.score < 0 && r.type !== 'ex';
    links.push({ a: r.a, b: r.b, color: bad ? '#b0403a' : /courting|spouse|crush/.test(r.type) ? '#c0558a' : '#3d7a4f', w: 1 + Math.abs(r.score) / 30, dash: bad, title: `${fullName(W.people[r.a])} – ${fullName(W.people[r.b])}: ${r.type} (${r.reason || ''})`, len: bad ? 140 : 80, str: 0.05 });
  }
  if (opts.family) for (const id of ids) { const p = W.people[id]; for (const c of p.children) if (set.has(c)) links.push({ a: id, b: c, color: '#4b6f9e', w: 2, title: 'parent and child', len: 60, str: 0.08 }); if (p.spouse && set.has(p.spouse) && id < p.spouse) links.push({ a: id, b: p.spouse, color: '#c0558a', w: 2.5, title: 'married', len: 50, str: 0.1 }); }
  forceLayout(nodes, links, { seed: ids.length, repel: opts.repel || 2400 });
  return graphSVG(nodes, links);
}
function groupMap(g) { return vizFrame(peopleGraph(g.members, { family: true }), 420) + '<p class="small muted"><span style="color:#3d7a4f">●</span> friendship &nbsp; <span style="color:#c0558a">●</span> love or marriage &nbsp; <span style="color:#4b6f9e">●</span> parent and child &nbsp; <span style="color:#b0403a">●</span> bad blood (dashed)</p>'; }
function grudgeMap() {
  const bad = Object.values(W.rels).filter(r => !r.ended && r.score < 0 && r.type !== 'ex' && W.people[r.a] && W.people[r.b] && W.people[r.a].status === 'resident' && W.people[r.b].status === 'resident');
  const ids = [...new Set(bad.flatMap(r => [r.a, r.b]))].slice(0, 260);
  const feudHH = new Map(); for (const f of Object.values(W.feuds)) if (f.status === 'active') { feudHH.set(f.sideA.id, '#f3d6c4'); feudHH.set(f.sideB.id, '#d9e4f1'); }
  return vizFrame(peopleGraph(ids, { onlyBad: true, repel: 1800, fillFn: p => feudHH.get(p.household) || 'var(--card)', titleFn: p => (W.households[p.household] || {}).name || '' }), 620) + `<p class="small muted">Everyone with a grudge (${ids.length} people). Line thickness shows how bitter it is. People in households with an active family feud are shaded.</p>`;
}
function feudMap(f) {
  const A = W.households[f.sideA.id], B = W.households[f.sideB.id];
  const ids = [...(A ? A.members : []), ...(B ? B.members : [])].filter(id => W.people[id]);
  return vizFrame(peopleGraph(ids, { family: true, repel: 2600, fillFn: p => A && A.members.includes(p.id) ? '#f3d6c4' : '#d9e4f1' }), 380);
}
