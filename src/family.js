// ---------- family lookups used by the pages ----------
function P(W, id) { return id ? W.people[id] : null; }
function uniqIds(arr) { return [...new Set(arr.filter(Boolean))]; }

function familyOf(W, p) {
  const f = {};
  const parents = [p.father, p.mother].filter(id => W.people[id]);
  f.parents = parents;
  // step-parents: current or past partners of a parent who are not a parent
  const step = [];
  for (const pid of parents) { const par = W.people[pid]; for (const s of [par.spouse, ...(par.exes || []), ...(par.widowedOf || [])]) if (s && !parents.includes(s) && W.people[s]) step.push(s); }
  f.stepParents = uniqIds(step);
  f.spouse = p.spouse && W.people[p.spouse] ? [p.spouse] : [];
  f.former = uniqIds([...(p.exes || []), ...(p.widowedOf || [])]).filter(id => W.people[id]);
  f.children = p.children.filter(id => W.people[id]);
  const sibs = siblingsOf(W, p);
  f.siblings = sibs.filter(id => { const s = W.people[id]; return s.father === p.father && s.mother === p.mother; });
  f.halfSiblings = sibs.filter(id => !f.siblings.includes(id));
  const gp = [];
  for (const pid of parents) { const par = W.people[pid]; gp.push(par.father, par.mother); }
  f.grandparents = uniqIds(gp).filter(id => W.people[id]);
  const gc = [];
  for (const cid of f.children) gc.push(...W.people[cid].children);
  f.grandchildren = uniqIds(gc).filter(id => W.people[id]);
  const au = [];
  for (const pid of parents) au.push(...siblingsOf(W, W.people[pid]));
  f.auntsUncles = uniqIds(au).filter(id => W.people[id]);
  const cz = [];
  for (const id of f.auntsUncles) cz.push(...W.people[id].children);
  f.cousins = uniqIds(cz).filter(id => W.people[id] && id !== p.id && !sibs.includes(id));
  const nn = [];
  for (const id of sibs) nn.push(...W.people[id].children);
  f.niecesNephews = uniqIds(nn).filter(id => W.people[id]);
  f.inLaws = [];
  if (p.spouse && W.people[p.spouse]) { const s = W.people[p.spouse]; f.inLaws = uniqIds([s.father, s.mother, ...siblingsOf(W, s)]).filter(id => W.people[id]); }
  f.guardian = p.guardian && W.people[p.guardian] ? [p.guardian] : [];
  return f;
}

function relationWord(W, p, q) {
  // how q is related to p, in one word (for household lists)
  if (p.id === q.id) return 'self';
  if (p.spouse === q.id) return q.union === 'partners' ? 'partner' : rel3(q, 'husband', 'wife', 'spouse');
  if (p.children.includes(q.id)) return rel3(q, 'son', 'daughter', 'child');
  if (q.children.includes(p.id)) return rel3(q, 'father', 'mother', 'parent');
  if (siblingsOf(W, p).includes(q.id)) return rel3(q, 'brother', 'sister', 'sibling');
  const sp = W.people[p.spouse];
  if (sp && sp.children.includes(q.id)) return rel3(q, 'stepson', 'stepdaughter', 'stepchild');
  if (sp && q.children.includes(sp.id)) return rel3(q, 'father-in-law', 'mother-in-law', 'parent-in-law');
  for (const c of p.children) { const k = W.people[c]; if (k && k.children.includes(q.id)) return rel3(q, 'grandson', 'granddaughter', 'grandchild'); if (k && k.spouse === q.id) return rel3(q, 'son-in-law', 'daughter-in-law', 'child-in-law'); }
  for (const pid of [p.father, p.mother]) { const par = W.people[pid]; if (par && (par.father === q.id || par.mother === q.id)) return rel3(q, 'grandfather', 'grandmother', 'grandparent'); if (par && siblingsOf(W, par).includes(q.id)) return rel3(q, 'uncle', 'aunt', 'relative'); }
  for (const s of siblingsOf(W, p)) { const sb = W.people[s]; if (sb && sb.children.includes(q.id)) return rel3(q, 'nephew', 'niece', 'relative'); }
  for (const pid of [p.father, p.mother]) { const par = W.people[pid]; if (par && (par.spouse === q.id || (par.exes || []).includes(q.id) || (par.widowedOf || []).includes(q.id))) return rel3(q, 'stepfather', 'stepmother', 'step-parent'); }
  if (sp && siblingsOf(W, sp).includes(q.id)) return rel3(q, 'brother-in-law', 'sister-in-law', 'sibling-in-law');
  for (const s of siblingsOf(W, p)) { const sb = W.people[s]; if (sb && sb.spouse === q.id) return rel3(q, 'brother-in-law', 'sister-in-law', 'sibling-in-law'); }
  if (q.guardian === p.id) return 'ward';
  if (p.guardian === q.id) return 'guardian';
  if (closelyRelated(W, p, q)) return 'relative';
  return null;
}

function wealthWord(w) { return w >= 85 ? 'rich' : w >= 65 ? 'well-off' : w >= 45 ? 'comfortable' : w >= 28 ? 'getting by' : w >= 12 ? 'poor' : 'destitute'; }
function traitWord(k, v) {
  const words = { O: ['very traditional', 'traditional', 'balanced', 'curious', 'very curious'], C: ['very careless', 'easy-going', 'balanced', 'dependable', 'very hard-working'], E: ['very shy', 'reserved', 'balanced', 'outgoing', 'very outgoing'], A: ['very prickly', 'blunt', 'balanced', 'kind', 'very kind'], N: ['very calm', 'calm', 'balanced', 'worrier', 'very anxious'] };
  return words[k][v < 20 ? 0 : v < 40 ? 1 : v < 60 ? 2 : v < 80 ? 3 : 4];
}
const TRAIT_NAMES = { O: 'Open to new things', C: 'Hard-working', E: 'Outgoing', A: 'Kind', N: 'Worried / moody' };

if (typeof module !== 'undefined') Object.assign(module.exports, { familyOf, relationWord });
