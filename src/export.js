// ================= Stage 6: exports (family-tree file, Excel, compressed saves) =================
// Everything here works offline inside the one HTML file.

const XSEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const STATUS_WORD = { resident: 'Lives here', dead: 'Died', departed: 'Moved away', leftBehind: 'Left behind on Earth', prison: 'In prison' };
function xStatus(W, p) { return p.status === 'prison' && W.era === 'dropped' ? 'Banished for a time' : (STATUS_WORD[p.status] || p.status); }
function xName(W, id) { const p = W.people[id]; return p ? `${p.first} ${p.last}` : ''; }
// turn "@123" markers into names
function plainText(W, t) { return String(t == null ? '' : t).replace(/@(\d+)/g, (m, id) => xName(W, +id) || 'someone'); }

// ---------- GEDCOM 5.5.1 (the standard file genealogy programs open) ----------
// Who takes part in a family: every couple that married or had children together, plus single parents.
function gedcomFamilies(W, ids) {
  const keep = new Set(ids);
  const fams = new Map(); // key "a-b" (or "a-0") -> { a, b, kids:[], marr, div, union }
  const key = (a, b) => { if (!b) return a + '-0'; return a < b ? `${a}-${b}` : `${b}-${a}`; };
  const get = (a, b) => { const k = key(a, b); if (!fams.has(k)) fams.set(k, { k, a: b && b < a ? b : a, b: b && b < a ? a : b || null, kids: [], marr: null, div: null, union: null }); return fams.get(k); };
  for (const id of ids) {
    const p = W.people[id];
    for (const e of p.events) {
      const m = /@(\d+)/.exec(e.text || ''); if (!m) continue; const o = +m[1];
      if (!keep.has(o) || o === id) continue;
      if (e.t === 'married' || e.t === 'partnered') { const f = get(id, o); if (f.marr == null || e.y < f.marr) { f.marr = e.y; } if (e.t === 'married' || !f.union) f.union = e.t; }
      if (e.t === 'divorced') { const f = get(id, o); f.div = e.y; }
    }
    if (p.spouse && keep.has(p.spouse)) { const f = get(id, p.spouse); if (!f.union) f.union = p.union === 'partners' ? 'partnered' : 'married'; }
    for (const x of [...(p.exes || []), ...(p.widowedOf || [])]) if (keep.has(x)) get(id, x);
  }
  for (const id of ids) {
    const c = W.people[id];
    const fa = keep.has(c.father) ? c.father : null, mo = keep.has(c.mother) ? c.mother : null;
    if (!fa && !mo) continue;
    get(fa || mo, fa && mo ? mo : null).kids.push(id);
  }
  for (const f of fams.values()) f.kids.sort((x, y) => W.people[x].born - W.people[y].born || x - y);
  return [...fams.values()].sort((x, y) => (x.marr ?? 9999) - (y.marr ?? 9999) || x.a - y.a);
}
function gedLine(level, tag, value) {
  // lines are kept under 255 characters; longer text continues with CONC / CONT
  value = value == null ? '' : String(value).replace(/@/g, '@@');
  const out = [];
  const parts = value.split(/\r?\n/);
  parts.forEach((part, i) => {
    let first = true;
    const tg = i === 0 ? tag : 'CONT'; const lv = i === 0 ? level : level + 1;
    do {
      // never split a word in the middle of a "@@"
      let chunk = part.slice(0, 200); if (chunk.endsWith('@') && part.length > 200) chunk = part.slice(0, 199);
      part = part.slice(chunk.length);
      out.push(`${first ? lv : level + 1} ${first ? tg : 'CONC'}${chunk !== '' ? ' ' + chunk : ''}`);
      first = false;
    } while (part.length);
  });
  return out;
}
function exportGedcom(W, opts) {
  opts = opts || {};
  const all = Object.values(W.people);
  const ids = all.filter(p => opts.who === 'living' ? (p.status === 'resident' && p.died == null) : opts.who === 'ids' ? opts.ids.includes(p.id) : true).map(p => p.id).sort((a, b) => a - b);
  const fams = gedcomFamilies(W, ids);
  const famId = new Map(fams.map((f, i) => [f.k, 'F' + (i + 1)]));
  const famsOf = new Map(), famcOf = new Map();
  for (const f of fams) {
    for (const s of [f.a, f.b]) if (s) { if (!famsOf.has(s)) famsOf.set(s, []); famsOf.get(s).push(famId.get(f.k)); }
    for (const c of f.kids) { if (!famcOf.has(c)) famcOf.set(c, []); famcOf.get(c).push(famId.get(f.k)); }
  }
  const era = ERAS[W.era]; const place = W.name;
  const now = new Date(); const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const L = [];
  const add = (lv, tag, val) => L.push(...gedLine(lv, tag, val));
  L.push('0 HEAD');
  add(1, 'SOUR', 'TOWN_CHRONICLE'); add(2, 'NAME', 'Town Chronicle'); add(2, 'VERS', '8');
  add(1, 'DATE', `${now.getDate()} ${MON[now.getMonth()]} ${now.getFullYear()}`);
  L.push('1 SUBM @SUB1@');
  add(1, 'FILE', (opts.fileName || 'community.ged'));
  L.push('1 GEDC'); add(2, 'VERS', '5.5.1'); add(2, 'FORM', 'LINEAGE-LINKED');
  add(1, 'CHAR', 'UTF-8');
  add(1, 'NOTE', `${W.name}: an imaginary ${era.label || W.era} community made with Town Chronicle, as it stood at the start of ${era.yearLabel(W.year)}. Years are given as plain numbers` + (W.era === 'fantasy' ? ' (of the Third Age).' : W.era === 'dropped' ? ` (calendar years; ${W.startYear + 1} is Year 1 of the new world).` : '.') + ' Everyone in this file is invented.');
  L.push('0 @SUB1@ SUBM'); add(1, 'NAME', 'Town Chronicle');
  for (const id of ids) {
    const p = W.people[id];
    L.push(`0 @I${id}@ INDI`);
    const sur = p.birthName && p.birthName !== p.last && p.sex === 'f' ? p.birthName : p.last;
    add(1, 'NAME', `${p.first} /${sur}/`); add(2, 'GIVN', p.first); add(2, 'SURN', sur);
    if (sur !== p.last) { add(1, 'NAME', `${p.first} /${p.last}/`); add(2, 'TYPE', 'married'); }
    add(1, 'SEX', p.sex === 'm' ? 'M' : p.sex === 'f' ? 'F' : 'U');
    L.push('1 BIRT'); add(2, 'DATE', String(p.born)); if (p.arrived == null || p.born >= (p.arrived || 0)) add(2, 'PLAC', p.homeland && p.arrived ? p.homeland : place);
    if (p.died != null) { L.push('1 DEAT'); add(2, 'DATE', String(p.died)); if (p.cause) add(2, 'CAUS', plainText(W, p.cause)); }
    const occ = p.status === 'resident' ? p.occupation : (p.formerOccupation || p.occupation);
    if (occ) add(1, 'OCCU', occ);
    if (p.faith) add(1, 'RELI', p.faith);
    if (p.education) add(1, 'EDUC', p.education);
    if (p.arrived) { L.push('1 IMMI'); add(2, 'DATE', String(p.arrived)); add(2, 'PLAC', place); if (p.homeland) add(2, 'NOTE', `Came from ${p.homeland}.`); }
    const leftEv = p.status === 'departed' || p.status === 'leftBehind' ? (p.events || []).filter(e => e.t === 'left').slice(-1)[0] : null;
    if (p.status === 'departed') { L.push('1 EMIG'); if (leftEv) add(2, 'DATE', String(leftEv.y)); add(2, 'PLAC', place); }
    const h = W.households[p.household];
    if (p.status === 'resident' && h) { L.push('1 RESI'); add(2, 'DATE', 'FROM ' + (h.founded || W.year)); add(2, 'PLAC', `${h.district}, ${place}`); }
    for (const f of (famcOf.get(id) || [])) L.push(`1 FAMC @${f}@`);
    for (const f of (famsOf.get(id) || [])) L.push(`1 FAMS @${f}@`);
    if (opts.notes !== false) {
      const life = (p.events || []).filter(e => !e.secret || opts.secrets).map(e => `${e.y}${e.s != null ? ' ' + XSEASONS[e.s] : ''}: ${plainText(W, e.text)}${e.why ? ' (' + plainText(W, e.why) + ')' : ''}`);
      const head = [`${xStatus(W, p)}.`, p.notes ? `Notes: ${p.notes}` : ''].filter(Boolean).join(' ');
      add(1, 'NOTE', [head, ...life, ...(p.made && typeof makerDetailText === 'function' ? ['', makerDetailText(W, p)] : [])].join('\n'));
    }
  }
  for (const f of fams) {
    const fid = famId.get(f.k);
    L.push(`0 @${fid}@ FAM`);
    const A = W.people[f.a], B = f.b ? W.people[f.b] : null;
    // HUSB/WIFE by sex where it can be told; same-sex couples are listed in ID order
    let h = null, w = null;
    if (A && B) { if (A.sex === 'm' && B.sex !== 'm') { h = A; w = B; } else if (B.sex === 'm' && A.sex !== 'm') { h = B; w = A; } else { h = A; w = B; } }
    else if (A) { if (A.sex === 'm') h = A; else w = A; }
    if (h) L.push(`1 HUSB @I${h.id}@`); if (w) L.push(`1 WIFE @I${w.id}@`);
    for (const c of f.kids) L.push(`1 CHIL @I${c}@`);
    if (f.union === 'married') { L.push('1 MARR'); if (f.marr != null) add(2, 'DATE', String(f.marr)); add(2, 'PLAC', place); }
    else if (f.union === 'partnered') { L.push('1 EVEN'); add(2, 'TYPE', 'Lived together'); if (f.marr != null) add(2, 'DATE', String(f.marr)); }
    if (f.div != null) { L.push('1 DIV'); add(2, 'DATE', String(f.div)); }
  }
  L.push('0 TRLR');
  return { text: L.join('\r\n') + '\r\n', people: ids.length, families: fams.length };
}

// ---------- Excel workbook (.xlsx) ----------
function xmlEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
function colName(i) { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function sheetXml(rows) {
  const head = rows[0] || [];
  const widths = head.map((h, i) => Math.min(60, Math.max(8, ...rows.slice(0, 200).map(r => String(r[i] == null ? '' : r[i]).length + 2))));
  const out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>',
    `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`, '<sheetData>'];
  rows.forEach((r, ri) => {
    const cells = r.map((v, ci) => {
      const ref = colName(ci) + (ri + 1); const st = ri === 0 ? ' s="1"' : '';
      if (v == null || v === '') return ri === 0 ? `<c r="${ref}"${st}/>` : '';
      if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
      if (typeof v === 'boolean') return `<c r="${ref}" t="b"${st}><v>${v ? 1 : 0}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xmlEsc(String(v).slice(0, 32000))}</t></is></c>`;
    }).join('');
    out.push(`<row r="${ri + 1}">${cells}</row>`);
  });
  out.push('</sheetData>');
  if (rows.length > 1 && head.length) out.push(`<autoFilter ref="A1:${colName(head.length - 1)}${rows.length}"/>`);
  out.push('</worksheet>');
  return out.join('');
}
function workbookFiles(sheets) {
  const names = sheets.map(s => s.name.replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31));
  const f = {};
  f['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>';
  f['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  f['xl/workbook.xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + names.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets>' + (dn => dn ? '<definedNames>' + dn + '</definedNames>' : '')(names.map((n, i) => sheets[i].rows.length > 1 && sheets[i].rows[0].length ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlEsc(n.replace(/'/g, "''"))}'!$A$1:$${colName(sheets[i].rows[0].length - 1)}$${sheets[i].rows.length}</definedName>` : '').join('')) + '</workbook>';
  f['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  f['xl/styles.xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1E7D6"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  sheets.forEach((s, i) => { f[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(s.rows); });
  return f;
}
// ---------- a small zip writer (what .xlsx files are made of) ----------
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function deflateRaw(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  try { const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); } catch (e) { return null; }
}
async function makeZip(files) {
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const d = new Date(); const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  for (const [name, text] of Object.entries(files)) {
    const raw = typeof text === 'string' ? enc.encode(text) : text; const nm = enc.encode(name);
    const crc = crc32(raw); const def = await deflateRaw(raw);
    const method = def && def.length < raw.length ? 8 : 0; const data = method ? def : raw;
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(method), ...u16(tm), ...u16(dt), ...u32(crc), ...u32(data.length), ...u32(raw.length), ...u16(nm.length), ...u16(0)]);
    parts.push(local, nm, data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(method), ...u16(tm), ...u16(dt), ...u32(crc), ...u32(data.length), ...u32(raw.length), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nm);
    offset += local.length + nm.length + data.length;
  }
  const cdSize = central.reduce((t, b) => t + b.length, 0);
  const n = Object.keys(files).length;
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(n), ...u16(n), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// the tables in the workbook
function workbookSheets(W, opts) {
  opts = opts || {};
  const people = Object.values(W.people).filter(p => !opts.ids || opts.ids.includes(p.id)).sort((a, b) => a.id - b.id);
  const idset = new Set(people.map(p => p.id));
  const yl = y => y == null ? '' : ERAS[W.era].yearLabel(y);
  const S = [];
  S.push({ name: 'People', rows: [['ID', 'First name', 'Last name', 'Surname at birth', 'Sex', 'Born', 'Died', 'Age (now or at death)', 'Cause of death', 'Status', 'Work or role', 'Place of work', 'Household', 'Area', 'Father ID', 'Father', 'Mother ID', 'Mother', 'Partner ID', 'Partner', 'Married or partners', 'Former partners', 'Number of children', 'Children', 'Faith', 'Background', 'Came from', 'Arrived', 'Languages', 'Schooling', 'Can read', 'Who they love', 'Loner', 'Health (1–100)', 'Cleverness (1–99)', 'Standing (0–100)', 'Mood (−100 to 100)', 'Under strain (0–100)', 'Hair', 'Eyes', 'Build', 'Height (cm)', 'Quirk', 'Hobbies', 'Goal', 'Fear', 'Values', 'Notes'],
    ...people.map(p => { const h = W.households[p.household]; const wp = W.workplaces[p.workplace]; const live = p.status === 'resident';
      const st = p.standing != null ? p.standing : (W.soc && typeof baseStanding === 'function' ? baseStanding(W, p) : '');
      return [p.id, p.first, p.last, p.birthName || p.last, p.sex === 'm' ? 'Male' : 'Female', p.born, p.died, (p.died != null ? p.died : W.year) - p.born, p.cause ? plainText(W, p.cause) : '', xStatus(W, p),
        live ? p.occupation || '' : p.formerOccupation || p.occupation || '', live && wp ? wp.name : '', live && h ? h.name : '', live && h ? h.district : '',
        p.father, xName(W, p.father), p.mother, xName(W, p.mother), p.spouse, xName(W, p.spouse), p.spouse ? (p.union === 'partners' ? 'Partners' : 'Married') : '',
        [...(p.exes || []), ...(p.widowedOf || [])].map(id => xName(W, id)).join('; '), p.children.length, p.children.map(id => xName(W, id)).join('; '),
        p.faith || '', p.culture || '', p.homeland || '', p.arrived, (p.languages || []).join('; '), p.education || '', p.literate ? 'Yes' : 'No', p.orientation || '', p.hermit ? 'Yes' : 'No',
        p.health, p.intellect, st === '' ? '' : Math.round(st), p.mind ? Math.round(p.mind.mood) : '', p.mind ? Math.round(p.mind.stress) : '',
        p.appearance ? p.appearance.hair : '', p.appearance ? p.appearance.eyes : '', p.appearance ? p.appearance.build : '', p.appearance ? p.appearance.height : '', p.quirk || '', (p.hobbies || []).join('; '), p.goal || '', p.fear || '', (p.values || []).join('; '), p.notes || ''];
    })] });
  const evRows = [['Person ID', 'Person', 'Year', 'Year (as shown)', 'Season', 'Kind', 'What happened', 'Why', 'Secret']];
  for (const p of people) for (const e of (p.events || [])) { if (e.secret && !opts.secrets) continue; evRows.push([p.id, `${p.first} ${p.last}`, e.y, yl(e.y), e.s != null ? XSEASONS[e.s] : '', e.t, plainText(W, e.text), e.why ? plainText(W, e.why) : '', e.secret ? 'Yes' : '']); }
  S.push({ name: 'Life events', rows: evRows });
  const hh = Object.values(W.households).filter(h => !opts.ids || h.members.some(id => idset.has(id)));
  S.push({ name: 'Households', rows: [['ID', 'Name', 'Area', 'Head', 'People', 'Members', 'Founded', 'Ended', 'Home', 'Own it', 'Savings', 'Means'],
    ...hh.sort((a, b) => a.id - b.id).map(h => [h.id, h.name, h.district, xName(W, h.head), h.members.length, h.members.map(id => xName(W, id)).join('; '), h.founded, h.dissolved, h.home || '', h.owned == null ? '' : h.owned ? 'Yes' : 'No', h.savings == null ? '' : Math.round(h.savings), h.wealth != null && typeof wealthWord === 'function' ? wealthWord(h.wealth) : ''])] });
  const relRows = [['Person A ID', 'Person A', 'Person B ID', 'Person B', 'Kind of tie', 'Feeling (−100 to 100)', 'Since', 'Ended', 'How it began', 'What happened between them']];
  for (const r of Object.values(W.rels)) { if (!idset.has(r.a) || !idset.has(r.b)) continue; relRows.push([r.a, xName(W, r.a), r.b, xName(W, r.b), r.type, Math.round(r.score), r.since, r.ended, plainText(W, r.reason || ''), (r.history || []).filter(h => h && h.text).map(h => `${h.y}: ${plainText(W, h.text)}`).join(' | ')]); }
  S.push({ name: 'Relationships', rows: relRows });
  if (opts.ids) return S;
  const years = Object.keys(W.yearStats || {}).map(Number).sort((a, b) => a - b);
  const ysKeys = ['population', 'births', 'deaths', 'infantDeaths', 'marriages', 'divorces', 'arrivals', 'departures', 'illnesses', 'injuries', 'miscarriages', 'newFriends', 'quarrels', 'reconciled', 'jobsStarted', 'jobsLost', 'retired'];
  const ysLabel = ['Population at end', 'Births', 'Deaths', 'Baby deaths', 'Weddings', 'Separations', 'Newcomers', 'Moved away', 'Illnesses', 'Injuries', 'Lost pregnancies', 'New friendships', 'Quarrels', 'Made peace', 'Started work', 'Lost work', 'Retired'];
  S.push({ name: 'Town by year', rows: [['Year', 'Year (as shown)', ...ysLabel, 'Town mood', 'Weather (spring; summer; autumn; winter)', 'Harvest %', 'Food prices %', 'Summary'],
    ...years.map(y => { const s = W.yearStats[y] || {}; const c = W.chronicle && W.chronicle[y]; const e = W.econ && W.econ.history && W.econ.history[y];
      return [y, yl(y), ...ysKeys.map(k => s[k]), c ? c.mood : '', c && c.weather ? c.weather.join('; ') : e && e.weather ? e.weather.join('; ') : '', c && c.food != null ? Math.round(c.food * 100) : e && e.food != null ? Math.round(e.food * 100) : '', c && c.price != null ? Math.round(c.price * 100) : e && e.price != null ? Math.round(e.price * 100) : '', c ? plainText(W, c.summary) : '']; })] });
  const cy = Object.keys(W.census || {}).map(Number).sort((a, b) => a - b);
  const cKeys = ['population', 'male', 'female', 'children', 'adults', 'elders', 'married', 'households', 'employed', 'hermits'];
  S.push({ name: 'Census', rows: [['Start of year', 'Year (as shown)', 'People', 'Male', 'Female', 'Children', 'Adults', 'Elders', 'Married', 'Households', 'In work', 'Loners'], ...cy.map(y => [y, yl(y), ...cKeys.map(k => (W.census[y] || {})[k])])] });
  S.push({ name: 'Town events', rows: [['Year', 'Year (as shown)', 'Season', 'Kind', 'What happened'], ...(W.log || []).map(l => [l.y, yl(l.y), l.s != null ? XSEASONS[l.s] : '', l.t || '', plainText(W, l.text)])] });
  S.push({ name: 'Places of work', rows: [['ID', 'Name', 'Kind', 'Owner', 'Workers now', 'Workers', 'Closed'], ...Object.values(W.workplaces).sort((a, b) => a.id - b.id).map(w => [w.id, w.name, w.kind || '', xName(W, w.owner), w.members.length, w.members.map(id => xName(W, id)).join('; '), w.closed])] });
  S.push({ name: 'Groups', rows: [['ID', 'Name', 'Kind', 'Since', 'Ended', 'Members now', 'Members', 'Past members'], ...Object.values(W.groups).sort((a, b) => a.id - b.id).map(g => [g.id, g.name, g.type || '', g.since, g.ended, g.members.length, g.members.map(id => xName(W, id)).join('; '), (g.past || []).map(x => `${xName(W, x.id)} (${x.y}, ${x.why})`).join('; ')])] });
  S.push({ name: 'Feuds', rows: [['ID', 'Side A', 'Side B', 'Over', 'Since', 'Status', 'Ended', 'Bitterness', 'History'], ...Object.values(W.feuds).sort((a, b) => a.id - b.id).map(f => [f.id, f.sideA.name, f.sideB.name, f.reason, f.since, f.status, f.ended, f.intensity, (f.history || []).map(h => `${h.y}: ${plainText(W, h.text)}`).join(' | ')])] });
  if (W.soc) {
    S.push({ name: 'Crimes', rows: [['ID', 'Year', 'Season', 'Crime', 'Culprit', 'Victim', 'Why', 'Solved', 'How found out', 'Punishment'], ...(W.soc.crimes || []).map(c => [c.id, c.y, c.s != null ? XSEASONS[c.s] : '', c.type, xName(W, c.culprit), xName(W, c.victim), c.motive || '', c.solved, c.how || '', c.punishment || ''])] });
    const off = []; for (const o of Object.values(W.soc.offices || {})) for (const h of (o.history || [])) off.push([o.title, h.y, (h.ids || []).map(id => xName(W, id)).join('; '), h.how || '']);
    S.push({ name: 'Leaders', rows: [['Office', 'Year', 'Held by', 'How'], ...off.sort((a, b) => a[1] - b[1])] });
    S.push({ name: 'Elections', rows: [['Year', 'Season', 'Office', 'Winner(s)', 'Votes cast', 'Results'], ...(W.soc.elections || []).map(e => [e.y, e.s != null ? XSEASONS[e.s] : '', e.title, (e.winners || []).map(id => xName(W, id)).join('; '), e.voters, (e.results || []).map(r => `${xName(W, r.id)} ${r.v}`).join('; ')])] });
    S.push({ name: 'Laws', rows: [['Year', 'Law', 'Made by', 'How popular'], ...(W.soc.laws || []).map(l => [l.y, l.name, xName(W, l.by), l.approval])] });
    if (opts.secrets) S.push({ name: 'Secrets', rows: [['ID', 'Year', 'Kind', 'About', 'Secret', 'True', 'Known by', 'Out in the open'], ...Object.values(W.soc.secrets || {}).map(s => [s.id, s.y, s.kind, (s.about || []).map(id => xName(W, id)).join('; '), plainText(W, s.text), s.truth === false ? 'No' : 'Yes', (s.knownBy || []).length, s.public ? 'Yes' : 'No'])] });
  }
  if (W.econ && W.econ.history) {
    const ey = Object.keys(W.econ.history).map(Number).sort((a, b) => a - b);
    const goods = [...new Set(ey.flatMap(y => Object.keys(W.econ.history[y].yields || {})))];
    S.push({ name: 'Economy', rows: [['Year', 'Weather', 'Food %', 'Prices %', 'Economy %', 'Famine', 'Pests and blights', 'Hit hardest', 'Good year for', ...goods.map(g => g + ' yield %')],
      ...ey.map(y => { const e = W.econ.history[y]; return [y, (e.weather || []).join('; '), e.food != null ? Math.round(e.food * 100) : '', e.price != null ? Math.round(e.price * 100) : '', e.economy != null ? Math.round(e.economy * 100) : '', e.famine ? 'Yes' : '', (e.pests || []).map(x => typeof x === 'string' ? x : x.name || JSON.stringify(x)).join('; '), (e.hardHit || []).map(x => x.job).join('; '), (e.goodYear || []).map(x => x.job || x).join('; '), ...goods.map(g => e.yields && e.yields[g] != null ? Math.round(e.yields[g] * 100) : '')]; })] });
  }
  if (typeof makerSheet === 'function') { const ms = makerSheet(W, people); if (ms) S.push(ms); }
  return S;
}
async function exportWorkbook(W, opts) { const sheets = workbookSheets(W, opts); return { blob: await makeZip(workbookFiles(sheets)), sheets }; }

// ---------- compressed saves (.town.json.gz) ----------
async function gzipText(text) { const s = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip')); return new Uint8Array(await new Response(s).arrayBuffer()); }
async function readSaveBytes(buf) {
  const b = new Uint8Array(buf);
  if (b[0] === 0x1f && b[1] === 0x8b) { const s = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip')); return await new Response(s).text(); }
  return new TextDecoder().decode(b);
}
if (typeof module !== 'undefined') Object.assign(module.exports, { exportGedcom, gedcomFamilies, workbookSheets, workbookFiles, makeZip, exportWorkbook, gzipText, readSaveBytes, plainText, crc32 });
