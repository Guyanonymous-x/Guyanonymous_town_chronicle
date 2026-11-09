// Makes the family-tree file and Excel workbook for a community, plus what they should contain. Usage: node export_check.js era years seed
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['cultures.js', 'eras.js', 'engine.js', 'family.js', 'sim.js', 'econ.js', 'society.js', 'lives.js', 'census.js', 'edit.js', 'export.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const ctx = { module: { exports: {} }, console, Date, Math, JSON, Blob, Response, CompressionStream, DecompressionStream, TextEncoder, TextDecoder, Uint8Array, Uint32Array }; vm.createContext(ctx); vm.runInContext('var W;' + src, ctx);
const E = ctx.module.exports;
const era = process.argv[2] || 'medieval', years = +(process.argv[3] || 10), seed = +(process.argv[4] || 5), out = process.argv[5] || '/tmp/exp';
(async () => {
  const W = E.createCommunity({ era, population: 700, seed, name: 'Test Town', options: { gathering: 'families' } });
  for (let i = 0; i < years; i++) E.advanceYear(W);
  const g = E.exportGedcom(W, { secrets: false });
  fs.writeFileSync(`${out}/${era}.ged`, g.text);
  // what every person should look like in the file
  const exp = { people: {}, families: g.families };
  for (const p of Object.values(W.people)) {
    const life = (p.events || []).filter(e => !e.secret).map(e => `${e.y}${e.s != null ? ' ' + ['Spring', 'Summer', 'Autumn', 'Winter'][e.s] : ''}: ${E.plainText(W, e.text)}${e.why ? ' (' + E.plainText(W, e.why) + ')' : ''}`);
    exp.people[p.id] = { first: p.first, last: p.last, birth: p.birthName && p.birthName !== p.last && p.sex === 'f' ? p.birthName : p.last, sex: p.sex === 'm' ? 'M' : 'F', born: p.born, died: p.died, father: p.father && W.people[p.father] ? p.father : null, mother: p.mother && W.people[p.mother] ? p.mother : null,
      spouse: p.spouse || null, note: [`${E.plainText(W, '')}`.length ? '' : '', ...life], lifeCount: life.length, status: p.status };
  }
  fs.writeFileSync(`${out}/${era}.json`, JSON.stringify(exp));
  const { blob, sheets } = await E.exportWorkbook(W, { secrets: false });
  fs.writeFileSync(`${out}/${era}.xlsx`, Buffer.from(await blob.arrayBuffer()));
  fs.writeFileSync(`${out}/${era}.sheets.json`, JSON.stringify(sheets.map(s => ({ name: s.name, rows: s.rows }))));
  // compressed save round trip
  const text = JSON.stringify(W); const gz = await E.gzipText(text); const back = await E.readSaveBytes(gz.buffer);
  const plain = await E.readSaveBytes(new TextEncoder().encode(text).buffer);
  console.log(`${era}: ${g.people} people, ${g.families} families in the family-tree file; ${sheets.length} sheets (${sheets.map(s => s.name + ' ' + (s.rows.length - 1)).join(', ')}); save ${(text.length / 1e6).toFixed(1)} MB -> compressed ${(gz.length / 1e6).toFixed(2)} MB, opens back identical: ${back === text}, plain save still opens: ${plain === text}`);
})();
