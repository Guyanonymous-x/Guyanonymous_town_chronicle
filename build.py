#!/usr/bin/env python3
"""Builds the single-file app: town-chronicle.html"""
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
js = '\n'.join((src / f).read_text() for f in ['cultures.js', 'eras.js', 'engine.js', 'family.js', 'sim.js', 'econ.js', 'society.js', 'census.js', 'edit.js', 'export.js', 'app.js', 'app2.js', 'app3.js', 'app4.js', 'app5.js', 'viz.js', 'forest.js', 'app6.js', 'app7.js', 'app8.js'])
js = js.replace('</script', '<\\/script')
html = (src / 'template.html').read_text().replace('/*CSS*/', (src / 'style.css').read_text()).replace('/*JS*/', js)
out = root / 'town-chronicle.html'
out.write_text(html)
print(out, len(html), 'bytes')
