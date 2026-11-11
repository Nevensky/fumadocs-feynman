// node test/run.mjs  — renders every example, checks conventions and error reporting, writes test/out/*.svg
import { mkdirSync, writeFileSync } from 'node:fs';
import { render, renderSVG, parse, themeCSS, Term, renderModel } from '../src/index.js';
import { parseLabel } from '../src/text.js';
import * as G from '../src/geometry.js';
import { EXAMPLES } from '../examples/examples.js';

let failures = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { failures++; console.error('FAIL', msg); } };
const out = new URL('./out/', import.meta.url);
mkdirSync(out, { recursive: true });

// ---- geometry conventions ----
{
  const c = G.arc([0, 0], [100, 0], 0.4); // left-to-right on screen, positive bend
  const mid = G.at(c, 0.5);
  ok(Math.abs(mid[1] + 40) < 1e-6 && Math.abs(mid[0] - 50) < 1e-6, `positive bend bulges up by bend*chord (got ${mid})`);
  const half = G.arc([0, 0], [100, 0], -0.5);
  ok(Math.abs(G.length(half) - Math.PI * 50) < 1e-6, 'bend 0.5 is a half circle');
  ok(Math.abs(G.at(half, 0.5)[1] - 50) < 1e-6, 'negative bend bulges down');
  const tr = G.trim(G.line([0, 0], [100, 0]), { kind: 'circle', x: 0, y: 0, r: 10 }, { kind: 'rect', x: 100, y: 0, w: 20, h: 20 });
  ok(Math.abs(tr.a[0] - 10) < 1e-3 && Math.abs(tr.b[0] - 90) < 1e-3, 'trim at a circle and a box');
  const lp = G.loop([0, 0], -Math.PI / 2, 40);
  ok(Math.abs(G.at(lp, 0.5)[1] + 40) < 1e-6, 'loop "up" reaches one diameter above its vertex');
  const lt = G.trim(lp, { kind: 'circle', x: 0, y: 0, r: 8 }, { kind: 'circle', x: 0, y: 0, r: 8 });
  ok(lt && G.length(lt) < G.length(lp) && G.length(lt) > 0.6 * G.length(lp), 'a loop trims at both ends on its own vertex');
}

// ---- labels ----
{
  const r = parseLabel('\\Sigma^{ep}');
  ok(r.length === 2 && r[0].t === 'Σ' && !r[0].it && r[1].s === 1 && r[1].t === 'ep' && !r[1].it, 'capital Greek upright, superscript names upright');
  const g = parseLabel('G_0');
  ok(g[0].it && g[1].s === -1 && g[1].t === '0', 'G_0');
  const v = parseLabel('\\bar{v}');
  ok(v[0].t === 'v̄' && v[0].it, '\\bar{v} is v + combining macron, italic');
  const k = parseLabel('m\\,\\mathbf{k}+\\mathbf{q}');
  ok(k.some((x) => x.bf && x.t.includes('k')) && k.some((x) => x.t.includes('+')), '\\mathbf and a thin space');
  const ph = parseLabel('\\Gamma_{\\overline{ph}}');
  ok(ph[1].t === 'ph' && ph[1].over === true, 'one continuous overline over the whole argument');
  const kq = parseLabel('k+q');
  ok(kq.map((r) => r.t).join('') === 'k\u205F+\u205Fq', 'a binary + gets medium spaces; a sign does not');
  ok(parseLabel('-q').map((r) => r.t).join('') === '\u2212q', 'a leading minus is a sign');
}

// ---- examples ----
const index = [];
for (const ex of EXAMPLES) {
  const r = render(ex.source, { id: `t-${ex.id}` });
  ok(r.errors.length === 0, `${ex.id}: ${JSON.stringify(r.errors)}`);
  ok(!/NaN|undefined|Infinity/.test(r.html), `${ex.id}: NaN/undefined/Infinity in output`);
  ok(r.svg.startsWith('<svg') && r.svg.endsWith('</svg>'), `${ex.id}: standalone svg`);
  writeFileSync(new URL(`${ex.id}.svg`, out), r.svg);
  index.push(`<section><h3>${ex.title}</h3>${r.html}</section>`);
}
writeFileSync(new URL('index.html', out), `<!doctype html><meta charset="utf-8"><style>${themeCSS()}</style><body style="font-family:system-ui;max-width:900px;margin:auto">${index.join('\n')}</body>`);

// ---- equations, ids, options ----
{
  const r = render('dyson');
  ok((r.html.match(/<svg/g) || []).length === 3 && r.html.includes('feyn-op'), 'dyson renders three terms with operators');
  const a = render('debye-waller', { id: 'x1' }).svg, b = render('debye-waller', { id: 'x2' }).svg;
  ok(a.includes('id="x1-0-hatch"') && b.includes('id="x2-0-hatch"'), 'SVG ids are prefixed per diagram');
  ok(render('fan-migdal').svg === render('fan-migdal').svg, 'deterministic output (safe for SSR hydration)');
  const styled = render('a at 0,0; b at 2,0\na -- b D "D"', { styles: { D: 'photon' } });
  ok(styled.errors.length === 0 && styled.svg.includes('--feyn-photon'), 'site-wide styles option');
  const unit = render('unit 20\n(0,0) -> (2,0) fermion');
  ok(/width="5\d"/.test(unit.svg), `unit sets px per unit (${unit.svg.match(/width="(\d+)"/)?.[1]})`);
  const lead = render('- fan-migdal');
  ok(lead.errors.length === 0 && lead.html.includes('feyn-op'), 'a leading operator stays in front of the first term');
  const rel = render('a at 0,0\n+(-0.8,0) -> a fermion');
  ok(rel.errors.length === 0, 'a relative point at the start of a line is not an operator');
}

// ---- page words and bulge: sides of the page and heights in units, whatever the typing order ----
{
  const { bendOf } = await import('../src/render.js');
  const u = 40, a = [0, 0], b = [112, 0]; // a 2.8-unit chord, left to right
  ok(Math.abs(bendOf({ bend: 0.42 }, a, b, u).bend - 0.42) < 1e-12, 'bend keeps its meaning');
  ok(Math.abs(bendOf({ bulge: 1.176, above: true }, a, b, u, 1).bend - 0.42) < 1e-12, 'bulge 1.176 units over a 2.8-unit chord is bend 0.42');
  ok(/needs above or below/.test(bendOf({ bulge: 1 }, a, b, u).error), 'bulge never takes its side from the typing order');
  ok(/more than half/.test(bendOf({ bulge: 1.5, above: true }, a, b, u, 1).error), 'a bulge wider than the gap is an error');
  ok(/drop the minus sign/.test(bendOf({ bulge: -1, above: true }, a, b, u, 1).error), 'a negative bulge with a page word is an error');
  const top = (src) => +render(src).svg.match(/viewBox="-?[\d.]+ (-?[\d.]+)/)[1];
  ok(top('a at 0,0; b at 2.8,0\nb -- a phonon bulge=1.2 above "F"') === top('a at 0,0; b at 2.8,0\na -- b phonon bulge=1.2 above "F"'), 'above draws the same arc in either typing order');
  ok(top('a at 0,0; b at 2.8,0\nb -- a phonon arc above') < -50, 'arc above on a right-to-left line still bulges up');
  // straight lines: the page word places the label
  const lab = (src) => +render(src).svg.match(/<text[^>]*y="(-?[\d.]+)"/)[1];
  ok(lab('(2,0) -> (0,0) fermion "G" below') > 0 && lab('(0,0) -> (2,0) fermion "G" below') > 0, '"G" below sits under a straight line in either typing order');
  ok(lab('(2,0) -> (0,0) fermion "G" above') < 0, '"G" above sits over it');
  // the same picture as the old forms
  ok(render('a at 0,0 disk; b at 2.8,0 disk\na <- b fermion dressed "G" below\na -- b phonon dressed bend=0.42 above "F"').svg ===
     render('a at 0,0 disk; b at 2.8,0 disk\na <- b fermion dressed "G" side=right\na -- b phonon dressed bend=0.42 "F"').svg, 'the page words reproduce the original fm-hand block exactly');
  // loops
  ok(render('v at 0,0 hatched\nv -- v phonon loop above size=1.2 "F"', { id: 'L' }).svg === render('v at 0,0 hatched\nv -- v phonon loop dir=up size=1.2 "F"', { id: 'L' }).svg, 'loop above is loop dir=up');
  // side=in / out
  const inLab = lab('(0,0) -- (2,0) phonon bulge=0.8 above "F" side=in'), outLab = lab('(0,0) -- (2,0) phonon bulge=0.8 above "F"');
  ok(inLab > -32 && outLab < -32, `side=in puts the label inside the arc (${inLab}), outside by default (${outLab})`);
  // errors that say what to write instead
  const e = (src) => render(src).errors.map((x) => x.message).join(' | ');
  ok(/bulge=, measured on the page/.test(e('(0,0) -- (2,0) phonon height=1')), 'height= names its replacement');
  ok(/bare above or below/.test(e('(0,0) -- (2,0) phonon bend toward=up')), 'toward= names its replacement');
  ok(/not both/.test(e('(0,0) -- (2,0) phonon arc above below')), 'above and below together is an error');
  ok(/steeper than 45/.test(e('(0,0) -- (0.5,2) phonon arc above')), 'a steep line has no above or below');
  ok(/has none/.test(e('(0,0) -- (2,0) phonon above')), 'a page word on a straight line with no label is an error');
  ok(/side=in or side=out/.test(e('(0,0) -- (2,0) phonon arc above side=left "F"')), 'side=left on an arc with a page word points to side=in|out');
  ok(/bare word below/.test(e('(0,0) -- (2,0) fermion "G" pos=below')), 'pos=below on a line points to the bare word');
  ok(/did you mean bend=/.test(e('(0,0) -- (2,0) phonon bnd=0.4')), 'a misspelled option suggests the right one');
  ok(/a style only says how a line looks/.test(e('style F = phonon above\n(0,0) -- (2,0) F')), 'a style cannot say where a line goes');
  ok(/write pos=below/.test(e('a at 0,0 "x" below')), 'a page word on a vertex points to pos=');
  ok(/write the direction first/.test(e('a at 0,0\nleg a "q" below')), 'a leg needs its direction before a page word');
  ok(/grid takes no options/.test(e('grid fine\n(0,0) -- (1,0) plain')), 'grid takes no options');
  // leg: a bare bend means 0.35, as on a line
  const pathOf = (src) => render(src).svg.match(/<path d="([^"]+)"/)[1];
  ok(pathOf('a at 0,0\nleg a left 1 phonon bend') === pathOf('a at 0,0\n(-1,0) -- a phonon bend=0.35'), 'bend on a leg is 0.35, not 1');
  // grid: names of the vertices you wrote, never of points the parser invents
  const grid = render('grid\na at 0,0; b at 2,0\nleg a left\na -- b phonon arc above').svg;
  ok(grid.includes('class="feyn-grid"') && />a<\/text>/.test(grid) && />b<\/text>/.test(grid) && !/#p/.test(grid), 'grid draws whole units and labels a and b, not the invented leg end');
  ok(render('grid at 0,0\n(1,0) -- grid plain').errors.length === 0, 'a vertex called grid still works');
  // template merge: its invented points never replace the term's own
  const merged = render('a at 0,0; b at 2,0\nleg a left\nfan-migdal');
  ok(merged.errors.length === 0 && (merged.svg.match(/<path d="M/g) || []).length >= 6, 'a template merged after a leg keeps the leg');
}

// ---- box ports: lines enter a face 0.2 units in from the corner, not the (rounded) corner itself ----
{
  // box 0.9 x 1.3 units at the origin = 36 x 52 px: west face at x = -18, ports 26 - 8 = 18 px above and below
  const side = render('K at 0,0 box\n(-1.2,0.45) -> K.nw fermion\nK.se -> (1.2,-0.45) fermion').svg;
  ok(/M-48 -18L-18 -18/.test(side), 'a horizontal line enters the west face at the port (-18, -18)');
  ok(/M18 18L48 18/.test(side), 'and leaves the east face at (18, 18)');
  const top = render('K at 0,0 box\n(-0.25,1.5) -> K.nw fermion').svg;
  ok(/M-10 -60L-10 -26/.test(top), 'a vertical line enters the north face at (-10, -26)');
  const rel = render('K at 0,0 box\nK.nw -- +(-0.8,0) fermion').svg;
  ok(/M-18 -18L-50 -18/.test(rel), 'a relative end follows the port, so the leg stays horizontal');
  const dbl = render('box').svg;
  ok(!/-26(\.\d+)? /.test(dbl.match(/<g fill="none"[^]*?<\/g>/)[0]), 'no leg of the box template runs along the top or bottom edge');
}

// ---- programmatic API ----
{
  const t = new Term();
  t.node('a', 0, 0); t.node('b', 2, 0);
  t.edge('a', 'b', 'fermion', { label: 'G' }).edge('a', 'b', 'phonon', { bend: 0.4 });
  const r = renderModel(t);
  ok(r.errors.length === 0 && r.svg.includes('<path'), 'Term builder renders');
}

// ---- errors carry line numbers ----
{
  const bad = render('a at 0,0\na -> c fermion\nwiggle');
  ok(bad.errors.length === 2, `two errors expected, got ${JSON.stringify(bad.errors)}`);
  ok(bad.errors.some((e) => e.line === 2 && /unknown vertex "c"/.test(e.message)), 'unknown vertex on line 2');
  ok(bad.errors.some((e) => e.line === 3), 'unknown statement on line 3');
  ok(bad.html.includes('feyn-error') && bad.svg === '', 'error box instead of a diagram');
  const opt = render('ladder n=3 wobble=2');
  ok(opt.errors.length === 1 && /unknown option "wobble"/.test(opt.errors[0].message), 'unknown template option is named');
  let threw = false; try { renderSVG('nonsense'); } catch { threw = true; }
  ok(threw, 'renderSVG throws on errors');
  const p = parse('fan-migdal\n= sigma\n+');
  ok(p.errors.some((e) => /operator "\+" has no term/.test(e.message)), 'dangling operator');
}

console.log(`${checks - failures}/${checks} checks passed; ${EXAMPLES.length} examples written to test/out/`);
process.exit(failures ? 1 : 0);
