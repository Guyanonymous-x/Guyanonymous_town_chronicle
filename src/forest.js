// ================= Box family trees for a whole family or the whole community =================
// Each person is drawn in full once. Anywhere else they belong (beside a husband or wife from
// another family, or under their other parent) they get a light "copy" box: click it to jump
// to the full one.
function forestLayout(carrierIds, o) {
  const carriers = new Set(carrierIds.filter(id => treeOk(o, id)));
  const shown = id => id && treeOk(o, id);
  const pmemo = new Map();
  const partnersOf = p => {
    if (pmemo.has(p.id)) return pmemo.get(p.id);
    const out = treePartners(Object.assign({}, o, { down: 1 }), p);
    pmemo.set(p.id, out); return out;
  };
  const kidsSorted = p => {
    const ps = partnersOf(p);
    return p.children.filter(c => shown(c)).sort((a, b) => {
      const A = W.people[a], B = W.people[b];
      const ia = ps.indexOf(A.father === p.id ? A.mother : A.father), ib = ps.indexOf(B.father === p.id ? B.mother : B.father);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || A.born - B.born;
    });
  };
  // where the family starts: carriers whose own parents are not drawn
  const isRoot = id => { const p = W.people[id]; return ![p.father, p.mother].some(x => x && carriers.has(x)); };
  const descCount = id => { let n = 0; const st = [id], seen = new Set(); while (st.length) { const x = W.people[st.pop()]; for (const c of x.children) if (!seen.has(c) && shown(c)) { seen.add(c); n++; st.push(c); } } return n; };
  const hasParents = id => { const p = W.people[id]; return [p.father, p.mother].some(x => x && shown(x)); };
  let roots = [...carriers].filter(isRoot).map(id => [id, descCount(id)]).sort((a, b) => b[1] - a[1] || W.people[a[0]].born - W.people[b[0]].born).map(x => x[0]);
  // people who married into a family that is already drawn come last, so the family line is drawn first
  const joined = id => partnersOf(W.people[id]).some(s => hasParents(s) || !roots.includes(s));
  roots = [...roots.filter(id => !joined(id)), ...roots.filter(joined)];
  const lim = o.down;
  const owner = new Map();
  function claim(id, by, d) {
    if (owner.has(id)) return; owner.set(id, by);
    if (d <= 0) return;
    for (const c of kidsSorted(W.people[id])) claim(c, id, d - 1);
  }
  const drawn = [];
  for (const r of roots) {
    if (owner.has(r)) continue;
    const kidsFree = kidsSorted(W.people[r]).some(c => !owner.has(c));
    // a married-in person with nothing new to show appears beside their partner instead
    if (joined(r) && !kidsFree && partnersOf(W.people[r]).some(s => owner.has(s) && partnersOf(W.people[s]).includes(r))) continue;
    claim(r, 'root', lim); drawn.push(r);
  }
  const otherOf = (k, id) => k.father === id ? k.mother : k.father;
  function slots(id, d) {
    const p = W.people[id]; const kids = d > 0 ? kidsSorted(p) : []; const out = [];
    const groups = new Map(); for (const c of kids) { const k = otherOf(W.people[c], id) || 0; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
    for (const [other, cs] of groups) {
      const elsewhere = cs.filter(c => owner.get(c) !== id);
      if (elsewhere.length >= 2 && elsewhere.length === cs.length) { out.push({ t: 'kids', ids: cs, other }); continue; }
      for (const c of cs) out.push({ t: owner.get(c) === id ? 'full' : 'copy', c, other });
    }
    return out;
  }
  const slotW = (sl, d) => sl.t === 'full' ? downW(sl.c, d - 1) : TB.w;
  const unitW = p => { const n = partnersOf(p).length; return (1 + n) * TB.w + n * TB.gx; };
  const memo = new Map();
  function downW(id, d) {
    const key = id + ':' + d; if (memo.has(key)) return memo.get(key);
    const p = W.people[id]; const sl = slots(id, d);
    const kw = sl.reduce((s, x) => s + slotW(x, d), 0) + Math.max(0, sl.length - 1) * TB.gx * 2;
    const w = Math.max(unitW(p), kw); memo.set(key, w); return w;
  }
  const boxes = [], lines = [], main = new Map();
  function place(id, d, left, y) {
    const p = W.people[id]; const w = downW(id, d); const ux = left + (w - unitW(p)) / 2;
    boxes.push({ id, x: ux, y, kind: 'main' }); main.set(id, { x: ux, y });
    const at = new Map([[id, ux]]);
    let cx = ux + TB.w + TB.gx;
    for (const s of partnersOf(p)) {
      boxes.push({ id: s, x: cx, y, kind: 'partner' }); at.set(s, cx);
      lines.push({ t: 'couple', x1: ux + TB.w, x2: cx, y: y + TB.h / 2, former: p.spouse !== s });
      cx += TB.w + TB.gx;
    }
    const sl = slots(id, d);
    const total = sl.reduce((s, x) => s + slotW(x, d), 0) + Math.max(0, sl.length - 1) * TB.gx * 2;
    let kx = left + (w - total) / 2;
    for (const x of sl) {
      const other = x.other;
      let topX;
      if (x.t === 'full') { const cw = downW(x.c, d - 1); topX = place(x.c, d - 1, kx, y + TB.h + TB.gy) + TB.w / 2; kx += cw + TB.gx * 2; }
      else if (x.t === 'copy') { boxes.push({ id: x.c, x: kx, y: y + TB.h + TB.gy, kind: 'copy' }); topX = kx + TB.w / 2; kx += TB.w + TB.gx * 2; }
      else { boxes.push({ id: x.ids[0], ids: x.ids, under: owner.get(x.ids[0]), x: kx, y: y + TB.h + TB.gy, kind: 'kids' }); topX = kx + TB.w / 2; kx += TB.w + TB.gx * 2; }
      const fx = at.has(other) ? at.get(other) - TB.gx / 2 : ux + TB.w / 2;
      const fy = at.has(other) ? y + TB.h / 2 : y + TB.h;
      lines.push({ t: 'child', fx, fy, cx: topX, cy: y + TB.h + TB.gy });
    }
    return ux;
  }
  // families are laid out in rows (like lines of text), so a big town makes a picture of sensible shape
  const levels = r => { let d = 0; const st = [[r, 0]]; while (st.length) { const [id, k] = st.pop(); d = Math.max(d, k); if (k < lim) for (const x of slots(id, lim - k)) if (x.t === 'full') st.push([x.c, k + 1]); } return d + 1; };
  const area = drawn.reduce((t, r) => t + (downW(r, lim) + TB.gx * 5) * levels(r) * (TB.h + TB.gy), 0);
  const rowW = Math.max(...drawn.map(r => downW(r, lim)), Math.sqrt(area * 1.6));
  let x = 0, rowTop = 0, rowBottom = 0;
  for (const r of drawn) {
    const w = downW(r, lim);
    if (x > 0 && x + w > rowW) { x = 0; rowTop = rowBottom + TB.gy * 2; }
    const before = boxes.length; place(r, lim, x, rowTop);
    for (let i = before; i < boxes.length; i++) rowBottom = Math.max(rowBottom, boxes[i].y + TB.h);
    x += w + TB.gx * 5;
  }
  return { boxes, lines, main, drawnRoots: drawn };
}
function forestSVG(carrierIds, o, focusId) {
  const { boxes, lines, main } = forestLayout(carrierIds, o);
  if (!boxes.length) return { svg: '', count: 0, copies: 0 };
  let maxX = 0, maxY = 0;
  for (const b of boxes) { maxX = Math.max(maxX, b.x + TB.w); maxY = Math.max(maxY, b.y + TB.h); }
  const pad = 24, Wd = maxX + pad * 2, H = maxY + pad * 2; const X = v => v + pad;
  let s = '';
  for (const l of lines) {
    if (l.t === 'couple') s += `<line x1="${X(l.x1)}" y1="${X(l.y)}" x2="${X(l.x2)}" y2="${X(l.y)}" stroke="var(--accent)" stroke-width="2" ${l.former ? 'stroke-dasharray="5 4"' : ''}/>`;
    else { const my = l.cy - TB.gy / 2; s += `<path d="M${X(l.fx)},${X(l.fy)} L${X(l.fx)},${X(my)} L${X(l.cx)},${X(my)} L${X(l.cx)},${X(l.cy)}" fill="none" stroke="var(--muted)" stroke-width="1.3"/>`; }
  }
  let copies = 0;
  for (const b of boxes) {
    const p = W.people[b.id]; const dead = p.status === 'dead', gone = p.status !== 'resident' && !dead;
    if (b.kind === 'kids') {
      copies++;
      const m0 = main.get(b.id); const u = W.people[b.under];
      const names = b.ids.map(i => W.people[i].first).join(', ');
      s += `<g class="tnode tcopy" ${m0 ? `data-jump="${X(m0.x + TB.w / 2)},${X(m0.y + TB.h / 2)},${b.id}"` : `data-tree="${b.id}"`} transform="translate(${X(b.x)},${X(b.y)})" style="cursor:pointer"><title>${esc(names)} — drawn in full under ${esc(u ? fullName(u) : 'their other parent')}. Click to jump there.</title>
        <rect width="${TB.w}" height="${TB.h}" rx="8" fill="#f7f3ea" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="3 3"/>
        <text x="10" y="20" font-size="11.5" fill="var(--ink)">${b.ids.length} children</text>
        <text x="10" y="37" font-size="9.5" fill="var(--muted)">↪ drawn under ${esc(u ? (u.first + ' ' + u.last).slice(0, 22) : 'other parent')}</text></g>`;
      continue;
    }
    const isCopy = b.kind === 'copy' || (b.kind === 'partner' && main.has(b.id));
    const col = p.sex === 'm' ? 'var(--male)' : 'var(--female)';
    const yrs = dead ? `${p.born}–${p.died}` : gone ? `b. ${p.born} · ${statusWord(p).toLowerCase()}` : `b. ${p.born} · age ${ageOf(p, W.year)}`;
    const nm = fullName(p).length > 21 ? fullName(p).slice(0, 20) + '…' : fullName(p);
    const m = main.get(b.id);
    if (isCopy) {
      copies++;
      const where = b.kind === 'copy' ? 'their full place is under their other parent' : 'their full place is with their own parents';
      s += `<g class="tnode tcopy" ${m ? `data-jump="${X(m.x + TB.w / 2)},${X(m.y + TB.h / 2)},${b.id}"` : `data-tree="${b.id}"`} transform="translate(${X(b.x)},${X(b.y)})" style="cursor:pointer"><title>${esc(fullName(p))} — ${where}. Click to jump there.</title>
        <rect width="${TB.w}" height="${TB.h}" rx="8" fill="#f7f3ea" stroke="${col}" stroke-width="1.2" stroke-dasharray="3 3"/>
        <text x="10" y="20" font-size="11.5" fill="var(--muted)">${esc(nm)}${dead ? ' †' : ''}</text>
        <text x="10" y="37" font-size="9.5" fill="var(--muted)">↪ ${b.kind === 'copy' ? 'shown in full elsewhere' : 'see their own family'}</text></g>`;
      continue;
    }
    const sub = (p.occupation || '').length > 24 ? p.occupation.slice(0, 23) + '…' : (p.occupation || '');
    const focus = b.id === focusId;
    s += `<g class="tnode" data-tree="${b.id}" transform="translate(${X(b.x)},${X(b.y)})" style="cursor:pointer"><title>${esc(fullName(p))} — click to open their own tree</title>
      <rect width="${TB.w}" height="${TB.h}" rx="8" fill="${focus ? 'var(--accent-soft)' : dead ? '#f1ece2' : 'var(--card)'}" stroke="${focus ? 'var(--accent)' : col}" stroke-width="${focus ? 3 : 1.5}" ${gone ? 'stroke-dasharray="4 3"' : ''}/>
      <rect width="6" height="${TB.h}" rx="3" fill="${col}"/>
      <text x="12" y="18" font-size="12" font-weight="600" fill="${dead ? 'var(--muted)' : 'var(--ink)'}">${esc(nm)}${dead ? ' †' : ''}</text>
      <text x="12" y="32" font-size="10" fill="var(--muted)">${esc(yrs)}</text>
      <text x="12" y="45" font-size="10" fill="var(--muted)">${esc(sub)}</text></g>`;
  }
  const f = (focusId && main.get(focusId)) || boxes[0];
  return { svg: `<svg class="vizsvg" viewBox="0 0 ${Wd} ${H}" width="${Wd}" height="${H}" data-w="${Wd}" data-h="${H}" data-cx="${X(f.x + TB.w / 2)}" data-cy="${X(f.y + TB.h / 2)}" data-top="1" xmlns="http://www.w3.org/2000/svg">${s}</svg>`, count: main.size, copies };
}
