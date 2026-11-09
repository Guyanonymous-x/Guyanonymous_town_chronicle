# Reads the exported family-tree file and Excel workbook back and checks every person and every row.
import json, sys, re
import openpyxl
era = sys.argv[1]; d = sys.argv[2] if len(sys.argv) > 2 else '/tmp/exp'
exp = json.load(open(f'{d}/{era}.json'))
raw = open(f'{d}/{era}.ged', encoding='utf-8', newline='').read()
lines = raw.split('\r\n'); assert lines[-1] == ''; lines = lines[:-1]
prob = []
recs = []; prev = -1
for n, ln in enumerate(lines):
    if len(ln) > 255: prob.append(f'line {n} too long')
    m = re.match(r'^(\d+) (?:(@[^@]+@) )?([A-Z_][A-Z0-9_]*)(?: (.*))?$', ln)
    if not m: prob.append(f'bad line {n}: {ln[:60]}'); continue
    lv = int(m.group(1))
    if lv > prev + 1: prob.append(f'level jump at {n}')
    prev = lv
    recs.append((lv, m.group(2), m.group(3), m.group(4) or ''))
if recs[0][2] != 'HEAD' or recs[-1][2] != 'TRLR': prob.append('head/trailer')
# group into records
top = []
for r in recs:
    if r[0] == 0: top.append([r])
    else: top[-1].append(r)
defined = {t[0][1] for t in top if t[0][1]}
for r in recs:
    v = r[3]
    for ptr in re.findall(r'(?<!@)@([A-Z]+\d+)@(?!@)', v) if re.fullmatch(r'@[A-Z]+\d+@', v) else []:
        if '@' + ptr + '@' not in defined: prob.append('undefined pointer ' + ptr)
def unesc(s): return s.replace('@@', '@')
def text_of(rec, i):
    # value of line i plus following CONC/CONT
    lv = rec[i][0]; s = unesc(rec[i][3]); j = i + 1
    while j < len(rec) and rec[j][0] == lv + 1 and rec[j][2] in ('CONC', 'CONT'):
        s += ('' if rec[j][2] == 'CONC' else '\n') + unesc(rec[j][3]); j += 1
    return s
indi = {}; fam = {}
for t in top:
    if t[0][2] == 'INDI': indi[t[0][1]] = t
    if t[0][2] == 'FAM': fam[t[0][1]] = t
people = exp['people']
if len(indi) != len(people): prob.append(f'people {len(indi)} vs {len(people)}')
if len(fam) != exp['families']: prob.append(f'families {len(fam)} vs {exp["families"]}')
famsx = {k: {'HUSB': [], 'WIFE': [], 'CHIL': []} for k in fam}
for k, t in fam.items():
    for r in t[1:]:
        if r[0] == 1 and r[2] in ('HUSB', 'WIFE', 'CHIL'): famsx[k][r[2]].append(r[3])
checked = 0; notes_ok = 0; parents_ok = 0; spouse_ok = 0
for pid, e in people.items():
    t = indi.get(f'@I{pid}@')
    if not t: prob.append('missing ' + pid); continue
    checked += 1
    name = [text_of(t, i) for i, r in enumerate(t) if r[0] == 1 and r[2] == 'NAME'][0]
    if name != f"{e['first']} /{e['birth']}/": prob.append(f'name {pid}: {name}')
    sex = [r[3] for r in t if r[0] == 1 and r[2] == 'SEX'][0]
    if sex != e['sex']: prob.append(f'sex {pid}')
    def ev_date(tag):
        for i, r in enumerate(t):
            if r[0] == 1 and r[2] == tag:
                for r2 in t[i + 1:]:
                    if r2[0] <= 1: break
                    if r2[0] == 2 and r2[2] == 'DATE': return r2[3]
                return ''
        return None
    if ev_date('BIRT') != str(e['born']): prob.append(f'born {pid}')
    if (ev_date('DEAT') or None) != (str(e['died']) if e['died'] is not None else None): prob.append(f'died {pid}')
    # note = status line then every life event, one per line
    notes = [text_of(t, i) for i, r in enumerate(t) if r[0] == 1 and r[2] == 'NOTE']
    if notes and notes[0].split('\n')[1:] == e['note'][1:]: notes_ok += 1
    else: prob.append(f'note {pid}')
    # parents: the family they're a child of has the right father and mother
    famc = [r[3] for r in t if r[0] == 1 and r[2] == 'FAMC']
    par = set()
    for f in famc: par |= set(famsx[f]['HUSB'] + famsx[f]['WIFE']); 
    want = {f'@I{x}@' for x in (e['father'], e['mother']) if x}
    if par == want: parents_ok += 1
    else: prob.append(f'parents {pid}: {par} vs {want}')
    for f in famc:
        if f'@I{pid}@' not in famsx[f]['CHIL']: prob.append(f'famc not reciprocal {pid}')
    fams = [r[3] for r in t if r[0] == 1 and r[2] == 'FAMS']
    for f in fams:
        if f'@I{pid}@' not in famsx[f]['HUSB'] + famsx[f]['WIFE']: prob.append(f'fams not reciprocal {pid}')
    if e['spouse']:
        if any(f'@I{e["spouse"]}@' in famsx[f]['HUSB'] + famsx[f]['WIFE'] for f in fams): spouse_ok += 1
        else: prob.append(f'spouse {pid}')
# each family's members point back
for k, f in famsx.items():
    for role in ('HUSB', 'WIFE'):
        for x in f[role]:
            if k not in [r[3] for r in indi[x] if r[0] == 1 and r[2] == 'FAMS']: prob.append(f'{k} {role} not reciprocal')
    for x in f['CHIL']:
        if k not in [r[3] for r in indi[x] if r[0] == 1 and r[2] == 'FAMC']: prob.append(f'{k} CHIL not reciprocal')
print(f'{era} family-tree file: {len(lines)} lines, {checked} people checked (names, sex, born, died), life notes match {notes_ok}, parents match {parents_ok}, partners linked {spouse_ok}, problems {len(prob)}', prob[:5])
# Excel: every cell read back equals what was written
wb = openpyxl.load_workbook(f'{d}/{era}.xlsx', read_only=True)
want = json.load(open(f'{d}/{era}.sheets.json'))
xp = 0; cells = 0; rowsn = 0
names = wb.sheetnames
if names != [s['name'] for s in want]: xp += 1; print('sheet names differ', names)
for s in want:
    ws = wb[s['name']]; got = list(ws.iter_rows(values_only=True))
    if len(got) != len(s['rows']): xp += 1; print('rows', s['name'], len(got), len(s['rows'])); continue
    for gr, wr in zip(got, s['rows']):
        rowsn += 1
        for i, w in enumerate(wr):
            gv = gr[i] if i < len(gr) else None
            w2 = None if w is None or w == '' else w
            if isinstance(w2, str): w2 = w2[:32000]
            if isinstance(w2, bool): w2 = w2
            if gv != w2 and not (isinstance(gv, (int, float)) and isinstance(w2, (int, float)) and abs(gv - w2) < 1e-9):
                xp += 1
                if xp < 5: print('cell', s['name'], i, repr(gv)[:60], repr(w2)[:60])
            cells += 1
print(f'{era} Excel: {len(want)} sheets, {rowsn} rows, {cells} cells read back, mismatches {xp}')
