// ================= Stage 4: family trees and maps (drawing code) =================
const TB = { w: 158, h: 52, gx: 16, gy: 64 };
const byBorn = (a, b) => W.people[a].born - W.people[b].born;

// ---------- family tree ----------
function treeOk(o, id) {
  const p = W.people[id]; if (!p) return false;
  if (!o.dead && p.status === 'dead') return false;
  if (!o.gone && (p.status === 'departed' || p.status === 'leftBehind' || p.status === 'prison')) return false;
  return true;
}
function treePartners(o, p) {
  const out = [];
  if (o.spouses && p.spouse && treeOk(o, p.spouse)) out.push(p.spouse);
  if (o.former) for (const x of [...(p.widowedOf || []), ...(p.exes || [])]) if (treeOk(o, x) && !out.includes(x)) out.push(x);
  if (o.spouses) {
    // show the other parent of any shown child, so lines make sense
    for (const c of p.children) { const k = W.people[c]; if (!k) continue; const other = k.father === p.id ? k.mother : k.father; if (other && other !== p.id && !out.includes(other) && treeOk(o, other) && o.down > 0) out.push(other); }
  }
  return out;
}
function buildTree(rootId, o) {
  const pos = new Map(); const edges = []; const root = W.people[rootId];
  const put = (id, x, y) => { if (!pos.has(id)) pos.set(id, { x, y }); };
  const unitW = p => { const n = treePartners(o, p).length; return (1 + n) * TB.w + n * TB.gx; };
  const kidsOf = (p, d) => d > 0 ? p.children.filter(c => treeOk(o, c)).sort(byBorn) : [];
  const memo = new Map();
  function downW(id, d) {
    const key = id + ':' + d; if (memo.has(key)) return memo.get(key);
    const p = W.people[id]; const kids = kidsOf(p, d);
    const kw = kids.reduce((s, c) => s + downW(c, d - 1), 0) + Math.max(0, kids.length - 1) * TB.gx * 2;
    const w = Math.max(unitW(p), kw); memo.set(key, w); return w;
  }
  function placeDown(id, d, left, y, seen) {
    if (seen.has(id)) return; seen.add(id);
    const p = W.people[id]; const w = downW(id, d); const uw = unitW(p);
    const ux = left + (w - uw) / 2;
    put(id, ux, y);
    let cx = ux + TB.w + TB.gx;
    for (const s of treePartners(o, p)) { put(s, cx, y); edges.push({ t: 'couple', a: id, b: s, former: p.spouse !== s }); cx += TB.w + TB.gx; }
    const kids = kidsOf(p, d);
    const total = kids.reduce((s, c) => s + downW(c, d - 1), 0) + Math.max(0, kids.length - 1) * TB.gx * 2;
    let kx = left + (w - total) / 2;
    for (const c of kids) { const cw = downW(c, d - 1); placeDown(c, d - 1, kx, y + TB.h + TB.gy, seen); edges.push({ t: 'child', child: c, parents: [W.people[c].father, W.people[c].mother].filter(Boolean) }); kx += cw + TB.gx * 2; }
  }
  // the root's generation: the root and (optionally) brothers and sisters
  const sibs = o.siblings ? siblingsOf(W, root).filter(id => treeOk(o, id)) : [];
  const row = [rootId, ...sibs].sort(byBorn);
  let x = 0; const seen = new Set();
  const rowSpan = [];
  for (const id of row) { const d = (id === rootId || o.siblingLines) ? o.down : 0; const w = downW(id, d); placeDown(id, d, x, 0, seen); rowSpan.push([x, x + w]); x += w + TB.gx * 3; }
  // ancestors above
  const ancMemo = new Map();
  function ancW(id, k) {
    const key = id + ':' + k; if (ancMemo.has(key)) return ancMemo.get(key);
    const p = W.people[id]; const par = k > 0 ? [p.father, p.mother].filter(pid => treeOk(o, pid)) : [];
    const w = par.length ? Math.max(TB.w, par.reduce((s, q) => s + ancW(q, k - 1), 0) + (par.length - 1) * TB.gx * 2) : TB.w;
    ancMemo.set(key, w); return w;
  }
  function placeUp(childIds, centerX, y, k) {
    const c = W.people[childIds[0]];
    const par = [c.father, c.mother].filter(pid => treeOk(o, pid));
    if (!par.length || k <= 0) return;
    const widths = par.map(q => ancW(q, k - 1));
    const total = widths.reduce((a, b) => a + b, 0) + (par.length - 1) * TB.gx * 2;
    let left = centerX - total / 2;
    par.forEach((q, i) => { const cx = left + widths[i] / 2; put(q, cx - TB.w / 2, y); placeUp([q], cx, y - TB.h - TB.gy, k - 1); left += widths[i] + TB.gx * 2; });
    if (par.length === 2) edges.push({ t: 'couple', a: par[0], b: par[1] });
    for (const id of childIds) edges.push({ t: 'child', child: id, parents: par });
  }
  const rootPos = pos.get(rootId);
  const fullSibs = row.filter(id => { const s = W.people[id]; return s.father === root.father && s.mother === root.mother; });
  const xs = fullSibs.map(id => pos.get(id).x + TB.w / 2);
  placeUp(fullSibs, (Math.min(...xs) + Math.max(...xs)) / 2, -TB.h - TB.gy, o.up);
  // half-siblings' other parents (when siblings are shown)
  for (const id of row) if (!fullSibs.includes(id)) { const s = W.people[id]; for (const pid of [s.father, s.mother]) if (pid && pos.has(pid)) edges.push({ t: 'child', child: id, parents: [pid] }); }
  return { pos, edges };
}
function treeSVG(rootId, o) {
  const { pos, edges } = buildTree(rootId, o);
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const { x, y } of pos.values()) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x + TB.w); maxY = Math.max(maxY, y + TB.h); }
  const pad = 20; const Wd = maxX - minX + pad * 2, H = maxY - minY + pad * 2;
  const X = x => x - minX + pad, Y = y => y - minY + pad;
  let lines = '';
  for (const e of edges) {
    if (e.t === 'couple') { const a = pos.get(e.a), b = pos.get(e.b); if (!a || !b) continue; const [l, r] = a.x < b.x ? [a, b] : [b, a]; lines += `<line x1="${X(l.x + TB.w)}" y1="${Y(l.y + TB.h / 2)}" x2="${X(r.x)}" y2="${Y(r.y + TB.h / 2)}" stroke="var(--accent)" stroke-width="2" ${e.former ? 'stroke-dasharray="5 4"' : ''}/>`; }
    else {
      const c = pos.get(e.child); if (!c) continue;
      const ps = e.parents.map(id => pos.get(id)).filter(Boolean); if (!ps.length) continue;
      let fx, fy;
      if (ps.length === 2 && Math.abs(ps[0].y - ps[1].y) < 1) { const [l, r] = ps[0].x < ps[1].x ? ps : [ps[1], ps[0]]; fx = r.x - Math.min(TB.gx, r.x - l.x - TB.w) / 2; fy = l.y + TB.h / 2; }
      else { fx = ps[0].x + TB.w / 2; fy = ps[0].y + TB.h; }
      const cx = c.x + TB.w / 2, cy = c.y; const my = cy - TB.gy / 2;
      lines += `<path d="M${X(fx)},${Y(fy)} L${X(fx)},${Y(my)} L${X(cx)},${Y(my)} L${X(cx)},${Y(cy)}" fill="none" stroke="var(--muted)" stroke-width="1.3"/>`;
    }
  }
  let boxes = '';
  for (const [id, { x, y }] of pos) {
    const p = W.people[id]; const dead = p.status === 'dead', gone = p.status !== 'resident' && !dead;
    const col = p.sex === 'm' ? 'var(--male)' : 'var(--female)';
    const yrs = dead ? `${p.born}–${p.died}` : gone ? `b. ${p.born} · ${statusWord(p).toLowerCase()}` : `b. ${p.born} · age ${ageOf(p, W.year)}`;
    const nm = fullName(p).length > 21 ? fullName(p).slice(0, 20) + '…' : fullName(p);
    const sub = (p.occupation || '').length > 24 ? p.occupation.slice(0, 23) + '…' : (p.occupation || '');
    boxes += `<g class="tnode" data-tree="${id}" transform="translate(${X(x)},${Y(y)})" style="cursor:pointer"><title>${esc(fullName(p))} — click to centre the tree here</title>
      <rect width="${TB.w}" height="${TB.h}" rx="8" fill="${id === rootId ? 'var(--accent-soft)' : dead ? '#f1ece2' : 'var(--card)'}" stroke="${id === rootId ? 'var(--accent)' : col}" stroke-width="${id === rootId ? 3 : 1.5}" ${gone ? 'stroke-dasharray="4 3"' : ''}/>
      <rect width="6" height="${TB.h}" rx="3" fill="${col}"/>
      <text x="12" y="18" font-size="12" font-weight="600" fill="${dead ? 'var(--muted)' : 'var(--ink)'}">${esc(nm)}${dead ? ' †' : ''}</text>
      <text x="12" y="32" font-size="10" fill="var(--muted)">${esc(yrs)}</text>
      <text x="12" y="45" font-size="10" fill="var(--muted)">${esc(sub)}</text></g>`;
  }
  const rp = pos.get(rootId);
  return { svg: `<svg class="vizsvg" viewBox="0 0 ${Wd} ${H}" width="${Wd}" height="${H}" data-w="${Wd}" data-h="${H}" data-cx="${X(rp.x + TB.w / 2)}" data-cy="${Y(rp.y + TB.h / 2)}" xmlns="http://www.w3.org/2000/svg">${lines}${boxes}</svg>`, count: pos.size };
}

// ---------- force-directed maps ----------
function forceLayout(nodes, links, opts) {
  opts = opts || {};
  const r = mulberry32(opts.seed || 7);
  const n = nodes.length; const idx = new Map(nodes.map((d, i) => [d.id, i]));
  for (const d of nodes) { if (d.x == null) { const a = r() * Math.PI * 2, rad = 80 + r() * 200; d.x = Math.cos(a) * rad; d.y = Math.sin(a) * rad; } d.vx = 0; d.vy = 0; }
  const L = links.map(l => [idx.get(l.a), idx.get(l.b), l.len || 90, l.str || 0.06]).filter(l => l[0] != null && l[1] != null);
  const iters = opts.iters || (n > 150 ? 220 : 320);
  for (let it = 0; it < iters; it++) {
    const alpha = 1 - it / iters;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y; let d2 = dx * dx + dy * dy + 0.01;
      if (d2 > 160000) continue;
      const f = (opts.repel || 2200) / d2 * alpha; const d = Math.sqrt(d2);
      dx /= d; dy /= d; nodes[i].vx -= dx * f; nodes[i].vy -= dy * f; nodes[j].vx += dx * f; nodes[j].vy += dy * f;
    }
    for (const [a, b, len, str] of L) {
      const A = nodes[a], B = nodes[b]; const dx = B.x - A.x, dy = B.y - A.y; const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - len) * str * alpha; const ux = dx / d, uy = dy / d;
      A.vx += ux * f; A.vy += uy * f; B.vx -= ux * f; B.vy -= uy * f;
    }
    for (const d of nodes) {
      if (d.fixed) { d.x = d.fx || 0; d.y = d.fy || 0; d.vx = d.vy = 0; continue; }
      d.vx -= d.x * 0.004 * alpha; d.vy -= d.y * 0.004 * alpha; // gentle pull to the middle
      if (d.ring) { const rr = Math.sqrt(d.x * d.x + d.y * d.y) || 1; const f = (d.ring - rr) * 0.05; d.vx += d.x / rr * f; d.vy += d.y / rr * f; }
      d.x += clamp(d.vx, -30, 30); d.y += clamp(d.vy, -30, 30); d.vx *= 0.55; d.vy *= 0.55;
    }
  }
  if (opts.noOverlap !== false) spreadOut(nodes, opts.gap || 6);
  return nodes;
}
// push apart any dots whose circle or name overlaps another's, so every name can be read
function nodeBox(d) {
  const r = d.r || 9, fs = d.fs || 10.5;
  const tw = Math.max((d.label || '').length * fs * 0.62 + 4, (d.sub || '').length * 9 * 0.6 + 4);
  const w = Math.max(r * 2, tw); const h = r * 2 + (d.label ? fs + 6 : 0) + (d.sub ? 11 : 0);
  return { w, h, cy: (h / 2) - r }; // the box's centre sits this far below the dot's centre
}
function spreadOut(nodes, gap) {
  const B = nodes.map(nodeBox);
  // a crowded map is first stretched out so there is room for every name
  if (nodes.length > 2) {
    const need = B.reduce((t, b) => t + (b.w + gap) * (b.h + gap), 0) * 2.5;
    const xs = nodes.map(d => d.x), ys = nodes.map(d => d.y);
    const have = Math.max(1, (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)));
    if (have < need) { const k = Math.sqrt(need / have); for (const d of nodes) if (!d.fixed) { d.x *= k; d.y *= k; } }
  }
  for (let pass = 0; pass < 400; pass++) {
    let moved = 0;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = (b.y + B[j].cy) - (a.y + B[i].cy);
      const ox = (B[i].w + B[j].w) / 2 + gap - Math.abs(dx), oy = (B[i].h + B[j].h) / 2 + gap - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      moved++;
      const fa = a.fixed ? 0 : b.fixed ? 1 : 0.5, fb = 1 - fa;
      if (ox < oy) { const s = (dx >= 0 ? 1 : -1) * ox; a.x -= s * fa; b.x += s * fb; }
      else { const s = (dy >= 0 ? 1 : -1) * oy; a.y -= s * fa; b.y += s * fb; }
    }
    if (!moved) break;
  }
}
function graphSVG(nodes, links, opts) {
  opts = opts || {};
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const d of nodes) { const r = d.r || 9, bx = nodeBox(d); minX = Math.min(minX, d.x - bx.w / 2 - 20); maxX = Math.max(maxX, d.x + bx.w / 2 + 20); minY = Math.min(minY, d.y - r - 20); maxY = Math.max(maxY, d.y - r + bx.h + 20); }
  if (!nodes.length) { minX = minY = 0; maxX = maxY = 100; }
  const Wd = maxX - minX, H = maxY - minY;
  const byId = new Map(nodes.map(d => [d.id, d]));
  let s = '';
  const ni = new Map(nodes.map((d, i) => [d.id, i]));
  for (const l of links) {
    const a = byId.get(l.a), b = byId.get(l.b); if (!a || !b) continue;
    s += `<line data-la="${ni.get(l.a)}" data-lb="${ni.get(l.b)}" x1="${(a.x - minX).toFixed(1)}" y1="${(a.y - minY).toFixed(1)}" x2="${(b.x - minX).toFixed(1)}" y2="${(b.y - minY).toFixed(1)}" stroke="${l.color || 'var(--line)'}" stroke-width="${l.w || 1.4}" ${l.dash ? 'stroke-dasharray="5 4"' : ''} opacity="${l.op || 0.85}"><title>${esc(l.title || '')}</title></line>`;
  }
  for (const [i, d] of nodes.entries()) {
    const r = d.r || 9;
    s += `<g data-ni="${i}" ${d.attr || ''} style="cursor:pointer" transform="translate(${(d.x - minX).toFixed(1)},${(d.y - minY).toFixed(1)})"><title>${esc(d.title || d.label || '')}</title>
      <circle r="${r}" fill="${d.fill || 'var(--card)'}" stroke="${d.stroke || 'var(--accent)'}" stroke-width="${d.sw || 2}" ${d.dash ? 'stroke-dasharray="3 2"' : ''}/>
      ${d.label ? `<text class="lbl" y="${r + (d.fs || 10.5) + 2}" font-size="${d.fs || 10.5}" text-anchor="middle" fill="${d.tcol || 'var(--ink)'}" ${d.bold ? 'font-weight="600"' : ''}>${esc(d.label)}</text>` : ''}
      ${d.sub ? `<text class="lbl" y="${r + (d.fs || 10.5) + 13}" font-size="9" text-anchor="middle" fill="${d.scol || 'var(--muted)'}">${esc(d.sub)}</text>` : ''}</g>`;
  }
  return `<svg class="vizsvg" viewBox="0 0 ${Wd.toFixed(0)} ${H.toFixed(0)}" width="${Wd.toFixed(0)}" height="${H.toFixed(0)}" data-w="${Wd.toFixed(0)}" data-h="${H.toFixed(0)}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// ---------- pan and zoom for any drawing ----------
function vizFrame(inner, height) {
  return `<div class="vizwrap"><div class="vizbtns"><button class="small" data-vz="in" title="Zoom in">+</button><button class="small" data-vz="out" title="Zoom out">−</button><button class="small" data-vz="fit" title="Show everything">Fit all</button></div><div class="viz" style="height:${height || 560}px">${inner}</div><p class="small muted">Drag to move around, scroll or use + and − to zoom.</p></div>`;
}
function vizWire() {
  document.querySelectorAll('.vizwrap').forEach(wrap => {
    const box = wrap.querySelector('.viz'), svg = box.querySelector('svg'); if (!svg) return;
    const W0 = +svg.dataset.w, H0 = +svg.dataset.h;
    svg.removeAttribute('width'); svg.removeAttribute('height'); svg.style.width = '100%'; svg.style.height = '100%';
    let vb = { x: 0, y: 0, w: W0, h: H0 };
    const set = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const fit = () => { const bw = box.clientWidth || 800, bh = box.clientHeight || 560; const s = Math.max(W0 / bw, H0 / bh, 0.6); vb = { w: bw * s, h: bh * s, x: (W0 - bw * s) / 2, y: (H0 - bh * s) / 2 }; set(); };
    const zoom = (f, cx, cy) => { cx = cx ?? vb.x + vb.w / 2; cy = cy ?? vb.y + vb.h / 2; vb.x = cx - (cx - vb.x) * f; vb.y = cy - (cy - vb.y) * f; vb.w *= f; vb.h *= f; set(); };
    const start = () => {
      const bw = box.clientWidth || 800, bh = box.clientHeight || 560;
      if (svg.dataset.cx && (W0 > bw * 1.4 || H0 > bh * 1.4)) { const s = 1.05; vb = { w: bw * s, h: bh * s, x: +svg.dataset.cx - bw * s / 2, y: svg.dataset.top ? +svg.dataset.cy - 70 : +svg.dataset.cy - bh * s / 2 }; set(); }
      else fit();
    };
    start();
    wrap.querySelectorAll('[data-vz]').forEach(b => b.onclick = () => b.dataset.vz === 'in' ? zoom(0.8) : b.dataset.vz === 'out' ? zoom(1.25) : fit());
    box.addEventListener('wheel', e => { e.preventDefault(); const r = svg.getBoundingClientRect(); const cx = vb.x + (e.clientX - r.left) / r.width * vb.w, cy = vb.y + (e.clientY - r.top) / r.height * vb.h; zoom(e.deltaY < 0 ? 0.88 : 1.14, cx, cy); }, { passive: false });
    let drag = null;
    box.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, id: e.pointerId }; window._vizMoved = false; });
    box.addEventListener('pointermove', e => { if (!drag) return; const r = svg.getBoundingClientRect(); const dx = (e.clientX - drag.x) / r.width * vb.w, dy = (e.clientY - drag.y) / r.height * vb.h; if (!window._vizMoved && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 5) { window._vizMoved = true; box.setPointerCapture(drag.id); } if (window._vizMoved) { vb.x = drag.vx - dx; vb.y = drag.vy - dy; set(); } });
    box.addEventListener('pointerup', () => { drag = null; setTimeout(() => { window._vizMoved = false; }, 0); });
    // copy boxes in big trees: jump to the person's full place
    box.addEventListener('click', e => {
      const j = e.target.closest('[data-jump]'); if (!j || window._vizMoved) return;
      e.preventDefault(); e.stopPropagation();
      const [cx, cy, id] = j.dataset.jump.split(',').map(Number); vb.x = cx - vb.w / 2; vb.y = cy - vb.h / 2; set();
      const t = svg.querySelector(`g.tnode[data-tree="${id}"]`);
      if (t) { t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1600); }
    });
    // hover a dot: light up its lines and the dots it joins, fade the rest
    const lines = [...svg.querySelectorAll('line[data-la]')];
    if (lines.length) {
      const nbr = new Map();
      for (const l of lines) for (const [a, b] of [[l.dataset.la, l.dataset.lb], [l.dataset.lb, l.dataset.la]]) { if (!nbr.has(a)) nbr.set(a, { l: [], n: new Set() }); nbr.get(a).l.push(l); nbr.get(a).n.add(b); }
      svg.querySelectorAll('g[data-ni]').forEach(g => {
        g.addEventListener('mouseenter', () => { const k = nbr.get(g.dataset.ni); svg.classList.add('hl'); g.classList.add('on'); if (k) { k.l.forEach(l => l.classList.add('on')); k.n.forEach(i => { const o = svg.querySelector(`g[data-ni="${i}"]`); if (o) o.classList.add('on'); }); } });
        g.addEventListener('mouseleave', () => { svg.classList.remove('hl'); svg.querySelectorAll('.on').forEach(x => x.classList.remove('on')); });
      });
    }
  });
}
