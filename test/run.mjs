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
  ok(parseLabel('\\delta G').map((r) => r.t).join('') === '\u03b4G', 'a space after a control word ends it and is not typeset (TeX)');
  ok(parseLabel('\\Sigma = x', { text: true }).map((r) => r.t).join('') === '\u03a3 = x', 'text (captions) keeps its spaces');
  const txt = (s) => parseLabel(s).map((r) => r.t).join('');
  ok(txt('A \\times B') === 'A × B' && txt('n \\pm 1') === 'n ± 1' && txt('\\omega \\approx 0') === 'ω ≈ 0', 'a space beside an operator stays, on both sides');
  ok(txt('\\Sigma = x') === 'Σ = x' && txt('\\delta\\Sigma/\\delta G') === 'δΣ/δG', 'a space before an operator stays too; one before a letter goes');
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

// ---- lines that pass over others: a gap where a later line marked over crosses an earlier one ----
{
  const halos = (src) => (render(src).svg.match(/stroke:var\(--feyn-surface[^;]*;stroke-width/g) || []).length;
  ok(halos('(-1,0) -> (1,0) fermion\n(0,-1) -- (0,1) coulomb') === 0, 'a dashed line crossing a solid one cuts no gap by default');
  ok(halos('(-1,0) -> (1,0) fermion\n(0,-1) -- (0,1) coulomb over') === 1, 'over cuts one gap where it crosses');
  ok(halos('a at 0,0\n(-1,0) -> a fermion\na -- (0,1) coulomb over') === 0, 'lines that meet at a vertex do not cross there');
  ok(halos('nbody lines="e h e" rungs="13"') === 1, 'a rung from line 1 to line 3 passes over line 2, even where that line is split');
  ok(halos('nbody lines="e h e" rungs="12 23"') === 0, 'rungs between neighbours cross nothing');
  ok(halos('biexciton') === 4, 'biexciton: 13 and 24 skip one line each, 14 skips two');
  ok(halos('vertex-correction n=2 crossed rung=phonon') === 1 && halos('vertex-correction n=2 rung=phonon') === 0, 'crossed rungs: the second passes over the first');
  ok(halos('arcs above="13 24" boson=phonon') === 1 && halos('arcs above="14 23" boson=phonon') === 0, 'crossing arcs on one side get a gap, nested ones do not');
  ok(halos('arcs above="13 24"') === 0 && halos('vertex-correction n=2 crossed rung=screened') === 0, 'a dashed line crossed by another keeps its own gaps: no cut, so no slivers of dashes');
  // a line that passes over others keeps a dash on each crossing
  const { dashFit } = await import('../src/render.js');
  const dashes = (L, pat) => { const [d, g] = pat.split(' ').map(Number); return Math.round((L + g) / (d + g)); };
  ok(dashFit(64, '5 4') === '5 3.43' && dashes(64, dashFit(64, '5 4')) === 8, 'dashFit: 8 dashes on 64 px by default');
  ok(dashes(64, dashFit(64, '5 4', 1, [32])) % 2 === 1, 'dashFit: an odd number of dashes puts one on a crossing at the middle');
  const rung = render('nbody lines="e h e" rungs="13"').svg.match(/stroke-dasharray:([\d.]+) ([\d.]+)/);
  ok(rung && Math.abs((+rung[1] + +rung[2]) * Math.floor(dashes(68, `${rung[1]} ${rung[2]}`) / 2) + +rung[1] / 2 - 34) < 3.5, 'the rung that skips line 2 has a dash where it crosses it');
}

// ---- equations: rows and captions ----
{
  const rb = parse('gw\n| gw\n\\\\ gw');
  ok(rb.items.map((x) => !!x.br).join() === 'false,false,true' && render('gw\n| gw\n\\\\ gw').html.includes('<br><span class="feyn-pair"'), '\\\\ at the start of a line starts a new row');
  const lone = parse('gw\n\\\\\n+ gw');
  ok(lone.items.length === 2 && lone.items[1].br && lone.items[1].op === '+', 'a \\\\ alone on its line breaks before the next term, which keeps its operator');
  const h = (src) => +render(src).svg.match(/height="(\d+)"/)[1];
  ok(h('gw\n\\\\ gw') > h('gw\n| gw') + 40, 'the standalone SVG stacks the rows');
  // captions of a row of gently deepening terms share one baseline
  const html = render('nbody\ncaption "a"\n| trion\ncaption "b"\n| biexciton\ncaption "c"').html;
  const bottoms = [...html.matchAll(/vertical-align:(-?[\d.]+)px;padding-bottom:([\d.]+)px/g)].map((m) => 0.27 * 22 - +m[1] + +m[2]);
  ok(bottoms.length === 3 && Math.max(...bottoms) - Math.min(...bottoms) < 0.05, `exciton, trion and biexciton captions share a baseline (${bottoms.map((b) => b.toFixed(1))})`);
}

// ---- under a CSS reset (fumadocs' Tailwind preflight makes svg display:block) the diagrams stay inline ----
{
  const r = render('nbody\ncaption "a"\n| trion\ncaption "b"');
  ok((r.html.match(/<svg [^>]*style="display:inline;vertical-align:baseline;/g) || []).length === 2 && r.svg.includes('style="display:inline;vertical-align:baseline;'), 'every svg says display:inline and vertical-align:baseline itself');
  ok(/class="feyn-eq" style="[^"]*text-wrap:balance/.test(r.html), 'a wrapping equation balances its lines');
}

// ---- box ports and arcs: an arc leaves a port along its tangent ----
{
  const s = render('K at 0,0 box\nK.ne -> K.nw fermion arc above').svg;
  ok(/<path d="M10 -26A10 10 0 0 0 -10 -26"/.test(s), 'a half circle over a box leaves and enters its top face, 8 px in from the corners');
  ok(/M18 -18L48 -18/.test(render('K at 0,0 box\nK.ne -- (1.2,0.45) plain').svg), 'a straight line still leaves the side face');
  const fit = render('K at 0,0 box\nK.ne -> K.nw fermion bulge=0.3 above');
  ok(fit.errors.length === 0 && /<path d="M18 -18A/.test(fit.svg), 'a bulge too wide for the top-face ports leaves from the side faces, as before');
  // an arrowhead at a crossing moves off it, to the middle of the longer piece of its line
  const xing = render('(-1,0) -> (1,0) fermion\n(0,-1) -- (0,1) coulomb over').svg.match(/translate\((-?[\d.]+) /);
  ok(xing && Math.abs(+xing[1]) > 15, `the arrow under an over line moves off the crossing (x = ${xing && xing[1]})`);
}

// ---- new templates ----
{
  const term = (src, k = 0) => parse(src).items[k].term;
  const count = (t, style) => t.edges.filter((e) => e.style === style).length;
  const xOf = (t, name) => t.nodes.get(name).x;
  // GT drawn like GW (the paper's Fig. 2): two half-circle rails, n radial rungs plus the two along the base line
  const arch = term('gt dir=left');
  ok(count(arch, 'screened') === 5 && count(arch, 'fermion') === 5, 'gt: 5 rungs W; outer rail, inner rail, base line and two legs');
  const rail = (t, a, b) => t.edges.find((e) => e.from.node === a && e.to.node === b);
  ok(rail(arch, 'D', 'A') && rail(arch, 'B', 'C') && rail(arch, 'C', 'B'), 'gt (ph): outer rail D → A, inner rail B → C against it, the spin-flipped G C → B along the base');
  ok(xOf(arch, 'D') > 0 && xOf(arch, 'A') < 0, 'dir=left is the paper’s orientation: the electron enters on the right');
  const pp = term('gt pp dir=left');
  ok(rail(pp, 'D', 'A') && rail(pp, 'C', 'B') && rail(pp, 'B', 'C'), 'gt pp: both rails run the same way and the base line is a hole');
  ok(term('gt n=5').nodes.size >= 14, 'n radial rungs');
  // dir=right is the mirror image, with the same lines
  const L = term('gt box n=1 dir=left'), R = term('gt box n=1');
  ok([...L.nodes.values()].every((n) => Math.abs(R.nodes.get(n.name).x + n.x) < 1e-9 && R.nodes.get(n.name).y === n.y), 'gt dir=right mirrors every vertex of dir=left');
  ok(L.edges.length === R.edges.length && L.edges.every((e, i) => e.from.node === R.edges[i].from.node && e.to.node === R.edges[i].to.node), 'the mirror keeps every line and its direction');
  ok(R.edges.find((e) => e.from.anchor === 'nw' || e.to.anchor === 'nw') && !L.edges.some((e) => e.from.anchor === 'nw' && e.to.node === 'b1'), 'mirrored box anchors swap east and west');
  // main line on y = 0: the external electron, unless center
  const lad = term('gt ladder');
  ok([...lad.nodes.values()].filter((n) => /^b\d/.test(n.name)).every((n) => Math.abs(n.y) < 1e-9), 'gt ladder: the external line 1–3 lies on y = 0');
  ok(Math.abs(term('gt box center').nodes.get('T').y) < 1e-9, 'center puts the T box on the axis');
  // the paper's Fig. 3
  const bse = parse('gt-bse dir=left');
  ok(bse.items.length === 3 && bse.items[1].op === '=' && bse.items[2].op === '+', 'gt-bse: T box = closed WKWKW + closed WKT');
  const t3 = bse.items[2].term, labels = [...t3.nodes.values()].map((n) => n.opts.label).filter(Boolean).concat(t3.texts.map((x) => x.text));
  ok(['1', '2', '3', '4', '5', '6'].every((k) => labels.includes(k)), 'gt-bse numbers the points 1–6 as in the paper');
  const e = (src) => render(src).errors.map((x) => x.message).join(' | ');
  ok(/n=2 rungs at least/.test(e('gt ladder n=1')), 'a closed ladder needs two rungs');
  ok(/forms are arch, box and ladder/.test(e('gt form=ring')), 'unknown gt form');
  // Hedin's expansion: arcs above and below
  const ex = term('arcs above="15 24" below="36"');
  ok(count(ex, 'screened') === 3 && ex.nodes.has('v6') && !ex.nodes.has('v7'), 'arcs: 3 arcs on 6 vertices');
  ok(ex.edges.filter((x) => x.style === 'screened').every((x) => x.opts.over), 'arcs pass over the arcs they cross');
  ok(/vertex 3 has no arc/.test(e('arcs above="12 45"')), 'arcs: every vertex ends an arc');
  ok(/ends 2 arcs/.test(e('arcs above="12 13"')), 'arcs: no vertex ends two');
  // vertex corrections
  ok(term('vertex-correction').nodes.has('A') && term('vertex-correction n=2').nodes.has('A2'), 'vertex-correction keeps A and B at first order, A1, A2, ... beyond');
  const hv = render('hedin-vertex');
  ok(hv.errors.length === 0 && (hv.html.match(/<svg/g) || []).length === 3 && (hv.html.match(/<polygon/g) || []).length === 4, 'hedin-vertex: three terms, Γ in two of them');
  const t3svg = render('hedin-vertex').html.split('<svg')[3];
  ok(/M[\d.]+ -15\.8L[\d.]+ -15\.8/.test(t3svg) && /M[\d.]+ -20\.2L[\d.]+ -20\.2/.test(t3svg), 'Γ’s corners sit level with the kernel’s ports: both strands of the dressed G run horizontally, 2.2 px either side of y = −18');
  const gg = term('gw gamma="\\Gamma"'), gl = term('gw gamma="\\Gamma" dir=left');
  ok(xOf(gg, 'Gam') < xOf(gg, 'b') && xOf(gl, 'Gam') > xOf(gl, 'b'), 'Σ = iGWΓ: the electron enters through Γ and leaves at the bare vertex, for either dir');
  ok((render('gw gamma="\\Gamma"').svg.match(/<polygon/g) || []).length === 2 && (render('bubble gamma="\\Gamma"').svg.match(/<polygon/g) || []).length === 2, 'gamma= puts a vertex triangle in gw and bubble');
  // trions and biexcitons
  const tr = term('trion');
  ok(tr.texts.map((x) => x.text).join(' ') === 'e_1 h e_2', 'trion: lines e_1, h, e_2');
  ok(term('trion positive').texts.map((x) => x.text).join(' ') === 'h_1 e h_2', 'trion positive: h_1, e, h_2');
  ok(term('biexciton').texts.map((x) => x.text).join(' ') === 'e_1 h_1 e_2 h_2', 'biexciton: e_1, h_1, e_2, h_2');
  const holes = tr.edges.filter((x) => x.style === 'fermion' && Math.abs(tr.nodes.get(x.from.node).y) < 1e-9);
  ok(holes.length > 0 && holes.every((x) => x.opts.flip), 'the hole line runs against the electrons');
  ok((render('trion').svg.match(/M5 0L-4 -4\.5L-2 0L-4 4\.5Z/g) || []).length === 13, 'trion: one arrow per propagator, also where a rung splits a line');
  ok(e('arcs below="13 24"') === '' && e('arcs') === '', 'arcs: below= alone works, and with neither the default is above="13 24"');
  const lab1 = term('nbody lines="e h e" rungs="13 12"').edges.find((x) => x.opts.label === 'W');
  ok(lab1 && lab1.from.node === 'v1_2' && lab1.to.node === 'v2_2', 'the rung label goes on the first rung between neighbours, not on one that skips a line');
  const lab2 = term('nbody lines="e h e" rungs="13"').edges.find((x) => x.opts.label === 'W');
  ok(lab2 && Math.abs(lab2.opts.pos - 0.25) < 1e-9, 'with only a skipping rung, its label sits between the first two lines');
  ok(term('gt ladder rungLabel=W').edges.find((x) => x.opts.label === 'W').opts.side === 'right' && !term('gt ladder rungLabel=W dir=left').edges.find((x) => x.opts.label === 'W').opts.side, 'the mirror turns the default side of a straight line’s label over');
  ok(/X⁻/.test(term('trion').title) && /X⁺/.test(term('trion lines="e h h"').title) && /^ladder/.test(term('trion lines="e e e"').title) && /biexciton/.test(term('biexciton').title), 'trion and biexciton are named by their particles');
  ok(term('gt ladder numbers').nodes.get('b1').opts.pos === 'ne' && term('gt ladder numbers legs=false').nodes.get('b1').opts.pos === 'e', 'with legs, the end numbers go above the legs (the spin labels sit below)');
  ok(/overlap/.test(e('nbody lines="e h e" rungs="12+23"')) && /between 1 and 3/.test(e('nbody lines="e h e" rungs="14"')) && /not e/.test(e('nbody lines="e x"')), 'nbody explains bad lines and rungs');
}

// ---- by hand: expand() writes a block out vertex by vertex, and draws the same picture ----
{
  const { expand, templatesIn } = await import('../src/index.js');
  // the same markup, numbers within a tolerance (a bend written to four decimals moves a large arc radius a little)
  const differ = (A, B) => {
    // the accessible description is not part of the picture (expand leaves a template's title out)
    A = A.replace(/aria-label="[^"]*"/g, ''); B = B.replace(/aria-label="[^"]*"/g, '');
    const re = /-?\d+(?:\.\d+)?/g, ta = A.split(re), tb = B.split(re), na = A.match(re) || [], nb = B.match(re) || [];
    if (ta.length !== tb.length || ta.some((x, i) => x !== tb[i])) return 'markup';
    for (let i = 0; i < na.length; i++) if (Math.abs(+na[i] - +nb[i]) > Math.max(0.15, 2e-3 * Math.abs(+na[i]))) return `${na[i]} vs ${nb[i]}`;
    return null;
  };
  for (const ex of EXAMPLES) {
    let hand = null, why = 'threw';
    try { hand = expand(ex.source); const b = render(hand, { id: 'x' }); why = b.errors.length ? JSON.stringify(b.errors) : differ(render(ex.source, { id: 'x' }).html, b.html); } catch (e) { why = e.message; }
    ok(!why, `${ex.id}: expand() draws the same picture (${why})`);
    if (templatesIn(ex.source).length) ok(!templatesIn(hand).length, `${ex.id}: the expansion uses no template`);
  }
  // the momentum arrow written out: its direction and sides, and the mirrored GWΓ
  for (const src of ['gw gamma="\\Gamma" mom=q dir=left momside=out', 'fan-migdal mom=q dir=left momdir=back', 'fock vertical inner=bubble ladder=1 mom=q momside=out dir=left', 'gw vertical mom="\\mathbf{q}" W=""']) {
    let why = 'threw';
    try { const b = render(expand(src), { id: 'x' }); why = b.errors.length ? JSON.stringify(b.errors) : differ(render(src, { id: 'x' }).html, b.html); } catch (e) { why = e.message; }
    ok(!why, `${src}: expand() draws the same picture (${why})`);
  }
  {
    const src = 'fock vertical inner=chi mom=q momside=out', hand = expand(src, { unit: 30 }), b = render(hand, { id: 'x', unit: 30 });
    const why = b.errors.length ? JSON.stringify(b.errors) : differ(render(src, { id: 'x', unit: 30 }).html, b.html);
    ok(!why && !/^unit/m.test(hand) && /^b at \(0, 6\.1267\)$/m.test(hand) && /^X at .* w=1\.0667 h=1\.8667$/m.test(hand), `expand() at the site's unit sizes the templates by it, and leaves the unit to the site (${why})`);
  }
  ok(/^unit 30$/m.test(expand('unit 30\nfock vertical mom=q', { unit: 30 })) && !/^unit/m.test(expand('fock vertical mom=q', { unit: 30 })), "the block's own unit is kept, the site's left to the site");
  ok(templatesIn('fock\n+ gw').join() === 'fock,gw' && templatesIn('a at 0,0; b at 1,0\na -> b fermion').length === 0, 'templatesIn names the templates a block uses');
  const fock = expand('fock');
  ok(/^a at \(0, 0\)$/m.test(fock) && /^a -> b fermion side=right "G\^0"$/m.test(fock) && /^a -- b coulomb bend=0.45 "v"$/m.test(fock), 'expand writes vertices and lines');
  ok(/^unit 30$/m.test(expand('unit 30\nfock')) && /^style D = photon$/m.test(expand('style D = photon\na at 0,0; b at 2,0\na -- b D')), 'unit and style are kept');
  const eq = expand('gw\n| fock\n\\\\ + hartree');
  ok(/^\|$/m.test(eq) && /^\\\\ \+$/m.test(eq), 'an equation keeps its operators, | and \\\\, each on a line of its own');
  ok(/^\(0, 0\) -> \(2, 0\) fermion arrowpos=0.25$/m.test(expand('(0,0) -> (2,0) fermion arrowpos=0.25')), 'arrowpos= is written back');
  let threw = false; try { expand('a at 0,0\na -> c fermion'); } catch { threw = true; }
  ok(threw, 'expand throws on a block with errors');
}

// ---- vertices: labelled or restyled after the fact, new kinds, the lens ----
{
  const term = (src) => parse(src).items[0].term;
  const e = (src) => render(src).errors.map((x) => x.message).join(' | ');
  const a = term('fock\na "\\rho_{n\\mathbf{k}}" pos=below color=c5').nodes.get('a');
  ok(a.opts.label === '\\rho_{n\\mathbf{k}}' && a.opts.pos === 'below' && a.opts.color === 'c5' && a.x === 0, 'a template vertex takes a label, pos and colour after the fact, and stays put');
  ok(term('fock\na current').nodes.get('a').shape === 'current', 'and a shape');
  ok(/write pos=below/.test(e('fock\na "x" below')), 'a page word on an existing vertex points to pos=');
  ok(/an existing vertex takes/.test(e('fock\na wobble')), 'an unknown word on an existing vertex is an error');
  ok(term('(0,0) -> (2,0) fermion arrowpos=0.25').edges[0].opts.arrowPos === 0.25 && /fraction along the line/.test(e('(0,0) -> (2,0) fermion arrowpos=2')), 'arrowpos= places the arrow');
  ok(term('(0,0) -- (2,0) impurity marker=none').edges[0].opts.marker === 'none' && /cross or none/.test(e('(0,0) -- (2,0) impurity marker=x')), 'marker= is cross or none');
  for (const [s, tok] of [['eph', 'phonon'], ['dipole', 'photon'], ['spin', 'c5']]) ok(render(`a at 0,0 ${s}`).svg.includes(`fill:var(--feyn-${tok},`), `${s} vertices are ${tok}`);
  const lens = render('X at (0,0) lens "\\chi"\n(-1.5,0) -- X coulomb').svg;
  ok(/<path d="M0 -28A32.5 32.5 0 0 0 0 28A32.5 32.5 0 0 0 0 -28Z"/.test(lens) && lens.includes('fill:var(--feyn-electron,'), 'an upright lens 0.8 x 1.4 units, tinted like the bubble');
  ok(/<path d="M-60 0L-16 0"/.test(lens), 'a line stops at the edge of a lens');
  ok(/<path d="M-28 0A32.5 32.5 0 0 1 28 0/.test(render('X at (0,0) lens dir=right').svg), 'dir=right lays it down');
}

// ---- self-energies standing up ----
{
  const term = (src) => parse(src).items[0].term;
  const e = (src) => render(src).errors.map((x) => x.message).join(' | ');
  const up = term('fock vertical'), arc = up.edges.find((x) => x.style === 'fermion' && x.opts.bend);
  ok(up.nodes.get('a').x === up.nodes.get('b').x && up.nodes.get('b').y > up.nodes.get('a').y, 'vertical puts b straight above a');
  ok(arc && arc.from.node === 'a' && arc.to.node === 'b' && arc.opts.bend < 0, 'the electron runs up, arcing round on the right');
  ok(term('fock vertical dir=left').edges.find((x) => x.style === 'fermion' && x.opts.bend).opts.flip === true, 'dir=left reverses it');
  ok(['fock vertical', 'fock vertical inner=chi', 'gw vertical', 'fan-migdal vertical inner=bubble'].every((s2) => term(s2).edges.filter((x) => x.style !== 'fermion').every((x) => !x.opts.arrow || x.opts.arrow === 'none')),
    'a standing interaction carries no arrow: an arrow marks a fermion');
  const chi = term('fock vertical inner=chi');
  ok(chi.nodes.get('X').shape === 'lens' && chi.nodes.has('c') && chi.nodes.has('d') && chi.nodes.get('X').opts.label === '\\chi', 'inner=chi: the lens X between c and d');
  const bub = term('fock vertical inner=bubble ladder=2');
  ok(bub.edges.filter((x) => x.style === 'screened').length === 2 && bub.nodes.has('l2') && bub.nodes.has('r2'), 'inner=bubble ladder=2: two rungs across the bubble');
  ok(term('fan-migdal vertical inner=chi').nodes.get('X').opts.label === '\\Pi', 'in a phonon line the inner response is Π');
  ok(/needs vertical/.test(e('fock inner=chi')) && /chi \(a lens\) and bubble/.test(e('fock vertical inner=loop')) && /room/.test(e('fock vertical inner=chi height=1')), 'inner= is checked');
  ok(/do not go together/.test(e('gw vertical gamma="\\Gamma"')), 'gw: vertical and gamma= together is an error');
  // dressed: the line drawn and its label agree
  const phon = (src) => term(src).edges.filter((x) => x.style === 'phonon');
  ok(phon('fan-migdal vertical dressed').every((x) => x.opts.dressed && x.opts.label === 'F'), 'fan-migdal vertical dressed: the dressed phonon F');
  ok(phon('fan-migdal vertical dressed inner=chi').every((x) => !x.opts.dressed && x.opts.label === 'F^0'), 'around an inner diagram the phonon pieces stay F^0 (F holds every Π)');
  const el = (src) => term(src).edges.find((x) => x.style === 'fermion' && x.opts.label && !x.opts.below);
  ok(['fock vertical dressed', 'fock dressed', 'hartree dressed'].every((s2) => el(s2).opts.dressed && el(s2).opts.label === 'G'), 'fock and hartree dressed: a double line labelled G');
  ok(el('fock vertical').opts.label === 'G^0' && el('fock G=H dressed').opts.label === 'H', "G^0 stays for a bare line, and a G the author gives is kept");
  ok(term('fock vertex=current').nodes.get('a').shape === 'current' && term('fock line=hole').edges.some((x) => x.style === 'hole'), 'fock lying down takes vertex= and line=');
  ok(term('fan-migdal vertical inner=bubble vertex=eph').nodes.get('c').shape === 'eph' && term('fock vertical inner=chi vertex=disk').nodes.get('c').shape === 'dot', 'c and d take the coupling of a and b when it is a dot kind');
  const rungs = term('fock vertical inner=bubble ladder=2');
  ok(rungs.nodes.get('l2').y - rungs.nodes.get('l1').y > 0.9, 'the rungs inside a standing bubble are spaced as lying down');
  ok(!e('fock vertical inner=bubble ladder=2 height=3.65') && /room/.test(e('fock vertical inner=bubble ladder=2 height=3.6')), 'the minimum height the error asks for is accepted');
  ok(/height= needs vertical/.test(e('fock height=3')) && /height= needs vertical/.test(e('gw height=3')) && /ladder= needs inner=bubble/.test(e('fock vertical ladder=2'))
    && /rungLabel= needs inner=bubble/.test(e('fock vertical inner=chi rungLabel=W')) && /chi=, vtop= need inner=/.test(e('fock vertical chi=x vtop=y')) && /above 0/.test(e('fock vertical height=-1')),
    'standing-only options are errors where they would do nothing');
  ok(term('gw legLabel=n').edges.filter((x) => x.opts.label === 'n').length === 2 && term('fan-migdal legLabel=n').edges.filter((x) => x.opts.label === 'n').length === 2
    && term('gw gamma="\\Gamma" legLabel=n').edges.filter((x) => x.opts.label === 'n').length === 2, 'legLabel labels the legs lying down too');
  ok(term('rpa n=1 ladder=1').title === 'RPA chain of 1 bubble with 1 ladder rung' && term('bubble ladder=2.4').title === 'polarization bubble with 2 ladder rungs'
    && /bubble with 1 rung in/.test(term('fock vertical inner=bubble ladder=1').title) && /response function inside the interaction/.test(term('fock vertical inner=chi').title), 'titles count what is drawn');
}

// ---- arrows mark fermions: phonon, photon and interaction lines carry none ----
{
  const e = (src) => render(src).errors;
  const no = (src) => e(src).some((x) => /carries no arrow/.test(x.message));
  const two = 'a at 0,0; b at 2,0\n';
  ok(e(two + 'a -> b coulomb').some((x) => x.line === 2 && /a coulomb line carries no arrow/.test(x.message) && /mom=/.test(x.message)), 'an arrow on a Coulomb line is an error, on its line, pointing to mom=');
  ok(['a <- b photon', 'a -> b screened', 'a -> b phonon dressed', 'a -> b gluon', 'a -> b impurity', 'a -> b interaction', 'a -> b field'].every((l) => no(two + l)), 'photons, W, dressed phonons, gluons, impurity lines and aliases take no arrow');
  ok(no('style D = photon\n' + two + 'a -> b D') && no(two + 'leg a left phonon in'), "a style's base counts, and so does a leg's in or out");
  ok(['a -> b fermion', 'a <- b hole', 'a -> b ghost', 'a -> b scalar', 'a -> b boson', 'a -> b plain', 'a -- b phonon', 'a -- b photon mom="q"', 'leg a left phonon'].every((l) => !e(two + l).length), 'fermions, ghosts and charged lines keep their arrows; undirected lines and momentum arrows are fine');
  // every template, with its example and each of its flags, draws no arrow on a boson line
  const { TEMPLATES } = await import('../src/index.js');
  const bad = [];
  for (const [name, spec] of Object.entries(TEMPLATES)) {
    for (const src of [name, spec.example, ...Object.keys(spec.flags || {}).map((f) => `${name} ${f}`)]) if (no(src)) bad.push(src);
  }
  for (const src of ['fock vertical', 'fock vertical inner=chi', 'fock vertical inner=bubble ladder=2', 'gw vertical', 'fan-migdal vertical dressed', 'fan-migdal vertical inner=bubble dir=left',
    'fock mom=q', 'gw gamma="\\Gamma" mom=q momdir=back', 'fan-migdal vertical inner=chi mom=q momside=out', 'fock vertical inner=bubble mom=q dir=left']) if (no(src)) bad.push(src);
  ok(!bad.length, `no template puts an arrow on a boson line (${bad.join('; ')})`);
  ok(EXAMPLES.every((ex) => !no(ex.source)), 'no example does');
}

// ---- the momentum through the interaction: mom= beside it, towards the vertex where the electron enters ----
{
  const term = (src) => parse(src).items[0].term;
  const e = (src) => render(src).errors.map((x) => x.message).join(' | ');
  // which way each interaction's momentum arrow runs, along its written direction or back
  const way = (src) => term(src).edges.filter((x) => x.style !== 'fermion').map((x) => (!x.opts.mom ? '-' : x.opts.momdir === 'back' ? 'back' : 'fwd')).join(' ');
  ok(way('fock mom=q') === 'back' && way('gw mom=q') === 'back' && way('fan-migdal mom=q') === 'back', 'lying down, the arrow runs back along a -> b, to a, where the electron enters (k+q on the inner line)');
  ok(way('fock mom=q dir=left') === 'fwd' && way('gw mom=q dir=left') === 'fwd' && way('fan-migdal mom=q dir=left') === 'fwd', 'dir=left: to b, where the electron enters then');
  ok(way('fock mom=q momdir=back') === 'fwd' && way('fock mom=q dir=left momdir=back') === 'back', 'momdir=back turns it round (k−q)');
  ok(way('gw gamma="\\Gamma" mom=q') === 'back' && way('gw gamma="\\Gamma" mom=q dir=left') === 'back', 'GWΓ: to the triangle, mirrored or not');
  ok(way('fock vertical mom=q') === 'back' && way('fock vertical mom=q dir=left') === 'fwd' && way('gw vertical mom=q') === 'back' && way('fan-migdal vertical inner=bubble mom=q') === 'back back',
    'standing up: down to a, up to b with dir=left, and through both pieces around an inner diagram');
  ok(term('fock vertical inner=chi mom=Q momtop="Q+G"').edges.filter((x) => x.style === 'coulomb').map((x) => x.opts.mom).join() === 'Q,Q+G'
    && term('fock vertical inner=chi mom=Q').edges.filter((x) => x.style === 'coulomb').every((x) => x.opts.mom === 'Q'), 'momtop= labels the upper piece, which carries mom= otherwise');
  ok(['fock', 'gw', 'fan-migdal vertical', 'gw gamma="\\Gamma"'].every((s) => term(s).edges.every((x) => !x.opts.mom)), 'no mom=, no momentum arrow');
  // inside (opposite the label) by default; momside=out swaps arrow and label
  const opt = (src) => term(src).edges.find((x) => x.style !== 'fermion' && x.opts.mom).opts;
  ok(opt('fock mom=q').momside == null && opt('fock mom=q').side == null && opt('fock mom=q momside=in').momside == null, 'the arrow sits inside by default, and momside=in says so');
  ok(opt('fock mom=q momside=out').momside === 'left' && opt('fock mom=q momside=out').side === 'in', 'momside=out on an arc: the arrow outside, the label inside');
  const so = opt('fock vertical mom=q momside=out');
  ok(so.momside === 'left' && so.side == null && so.pos === 0.3 && so.mompos === 0.7 && opt('gw vertical mom=q momside=out W=""').mompos == null,
    'momside=out standing up: the label stays outside, low on the line, and the arrow goes above it (with no label, the arrow keeps the middle)');
  ok(term('fock vertical inner=chi mom=q momside=out').edges.filter((x) => x.style === 'coulomb').map((x) => `${x.opts.pos}/${x.opts.mompos}`).join(' ') === '0.25/0.7 0.75/0.3',
    'around an inner diagram, each label near a or b and each arrow near the inner diagram');
  // standing up, the interaction is longer with mom=, so that the arrow clears the electron, and the label with momside=out
  const tall = (src) => { const t = term(src); return +(t.nodes.get('b').y - t.nodes.get('a').y).toFixed(3); };
  ok(tall('fock vertical') === 2.2 && tall('fock vertical mom=q') === 2.8 && tall('fock vertical inner=chi') === 3.2 && tall('fock vertical inner=chi mom=q') === 4.3
    && tall('fock vertical inner=chi mom=q momside=out') === 4.6 && tall('fock vertical inner=chi mom=q height=4.5') === 4.5 && tall('fock mom=q') === 0, 'mom= lengthens a standing interaction, unless height= says otherwise');
  ok(/momentum arrow beside it: give it 4.1 at least/.test(e('fock vertical inner=chi mom=q height=3.9')) && !e('fock vertical inner=chi mom=q height=4.1')
    && /give it 2.6 at least/.test(e('gw vertical mom=q height=2.5')) && !e('gw vertical height=2') && !e('fock vertical inner=chi height=2.2'), 'a height too short for the momentum arrow is an error, and only with mom=');
  // that room is for an arrow and a label of fixed size in px: below 40 px per unit it takes more units
  const tallAt = (src, unit) => { const t = parse(src, { unit }).items[0].term; return +(t.nodes.get('b').y - t.nodes.get('a').y).toFixed(3); };
  ok(tall('unit 30\nfock vertical mom=q') === 3.73 && tallAt('fock vertical mom=q', 30) === 3.73 && tallAt('fock vertical mom=q', 48) === 2.8 && tallAt('fock vertical', 30) === 2.2,
    'the momentum room grows by 40/unit below 40 px, from the block or the site, and only with mom=');
  ok(/give it 3.47 at least/.test(e('unit 30\ngw vertical mom=q height=3.4')) && !e('unit 30\ngw vertical mom=q height=3.47'), 'and so does the shortest height it accepts');
  // the label keeps clear of the arrowhead whatever the font: it is anchored at its near edge, beside a line that runs up the page
  const momText = (src) => (render(src).svg.match(/<text class="feyn-lab" x="(-?[\d.]+)" y="[^"]*" font-size="12.5"( text-anchor="(\w+)")?/) || []).slice(1);
  const [xin, , ain] = momText('fock vertical mom=q'), [xout, , aout] = momText('fock vertical mom=q momside=out');
  ok(ain == null && +xin > 12 && aout === 'end' && +xout < -12, 'the momentum label starts at its edge nearest the line, at least 12 px from it');
  // a line's own momentum arrow: mompos= moves it along the line, and it stays an arrow on a short line
  ok(term('(0,0) -- (0,2) photon mom=q mompos=0.8').edges[0].opts.mompos === 0.8 && /mompos=2: .*fraction along the line/.test(e('(0,0) -- (0,2) photon mom=q mompos=2')), 'mompos= is a fraction along the line');
  const shaft = (src) => { const d = render(src).svg.match(/<path d="([^"]+)" style="stroke:var\(--feyn-muted[^;]*;stroke-width:1\.2;fill:none"/)[1]; const n = d.match(/-?[\d.]+/g).map(Number); return Math.hypot(n[n.length - 2] - n[0], n[n.length - 1] - n[1]); };
  ok(shaft('(0,0) -- (0,0.5) photon mom=q') > 12, 'on a line 20 px long the arrow is no mere arrowhead');
  // on a loop the arrow goes outside: on top with no label or one inside, a sixth of the way round from one outside
  const grey = (src) => { const d = render(src).svg.match(/<path d="([^"]+)" style="stroke:var\(--feyn-muted[^;]*;stroke-width:1\.2;fill:none"/)[1]; const n = d.match(/-?[\d.]+/g).map(Number); return n.reduce((acc, v, i) => (i % 2 ? acc : [...acc, [v, n[i + 1]]]), []); };
  const loopAt = (lab) => grey(`a at (0,0)\na -- a photon loop size=1.2 ${lab} mom=q`), r0 = (p) => Math.hypot(p[0], p[1] + 24);
  const onTop = loopAt(''), beside = loopAt('"\\gamma"'), insideLab = loopAt('side=in "\\gamma"');
  ok(onTop.every((p) => r0(p) > 28) && insideLab.every((p) => r0(p) > 28) && beside.every((p) => r0(p) > 28), 'on a loop the momentum arrow runs outside it');
  ok(Math.abs(onTop[6][0]) < 3 && Math.abs(insideLab[6][0]) < 3 && Math.abs(beside[6][0]) > 15, 'on top of the loop, unless an outside label is there');
  // clear of the line's own arrowhead wherever they overlap along the line, and of the line's ends
  const offAt = (src) => { const p = grey(src); return Math.min(...p.map((q) => Math.abs(q[1]))); };
  ok(offAt('a at (0,0); b at (2,0)\na -> b fermion "G" mom=k mompos=0.35') > 9 && offAt('a at (0,0); b at (2,0)\na -> b fermion "G" mom=k mompos=0.85') < 8, 'mompos= beside the arrowhead of the line keeps out of its way');
  ok(Math.min(...grey('(0,0) -- (0,1.5) photon mom=q mompos=0.9').map((q) => -q[1])) >= 0 && Math.max(...grey('(0,0) -- (0,1.5) photon mom=q mompos=0.9').map((q) => -q[1])) <= 60 - 7, 'the arrow keeps clear of the end of the line');
  // moved in from an end of the line rather than cut short or run into the vertex, with its label beside it as drawn
  const span = (src) => { const p = grey(src); return { x0: Math.min(...p.map((q) => q[0])), x1: Math.max(...p.map((q) => q[0])) }; };
  const nearEnd = span('a at (0,0); b at (5,0)\na -> b fermion "G" mom=q mompos=0.95'), atEnd = span('a at (0,0); b at (5,0)\na -> b fermion "G" mom=q mompos=1');
  ok(nearEnd.x1 <= 191 && nearEnd.x1 - nearEnd.x0 > 12 && atEnd.x1 <= 191 && atEnd.x1 - atEnd.x0 > 12, 'near an end the arrow keeps 9 px off the vertex, and its length');
  const lab9 = +render('a at (0,0); b at (2,0)\na -> b fermion "G" mom=q mompos=0.05').svg.match(/<text class="feyn-lab" x="(-?[\d.]+)" y="[^"]*" font-size="12.5"/)[1], sp9 = span('a at (0,0); b at (2,0)\na -> b fermion "G" mom=q mompos=0.05');
  ok(lab9 > sp9.x0 && lab9 < sp9.x1 && sp9.x0 >= 8.9, 'and its label goes beside the arrow as drawn');
  const long = span('a at (0,0); b at (12,0)\na -> b fermion "G" mom=k');
  ok(Math.abs(long.x1 - long.x0 - 27) < 3, 'on a long line the arrow keeps its 30 px');
  // a loop's arrow goes outside whatever side= puts its label on, and keeps to the far half of the loop
  const loopR = (src, R, cy) => grey(src).every((p) => Math.hypot(p[0], p[1] - cy) > R + 3);
  ok(loopR('a at (0,0)\na -- a photon loop size=1 side=right "\\gamma" mom=q', 20, -20) && loopR('a at (0,0)\na -- a photon loop size=1 cw side=left "\\gamma" mom=q', 20, -20), 'side=left|right on a loop still puts the arrow outside');
  ok(grey('a at (0,0)\na -- a photon loop size=1.2 side=in pos=0.2 "\\gamma" mom=q').every((p) => p[1] < -12), 'a label moved down the loop does not drag the arrow down to its vertex');
  // the line's arrowhead, moved by a line passing over it, still pushes the momentum arrow out
  ok(offAt('a at (0,0); b at (4,0)\na -> b fermion "G" mom=k mompos=0.125\n(2,1) -- (2,-1) photon over') > 9, 'an arrowhead moved by a line passing over pushes the momentum arrow out');
  // the shortest height the error asks for is accepted, at any unit
  const hint = (src) => +(e(src).match(/give it ([\d.]+) at least/) || [])[1];
  const h30 = hint('unit 30\nfock vertical inner=bubble ladder=1 mom=q height=5'), h20 = hint('unit 20\nfock vertical inner=bubble ladder=1 height=1');
  ok(h30 > 5 && !e(`unit 30\nfock vertical inner=bubble ladder=1 mom=q height=${h30}`) && h20 > 1 && !e(`unit 20\nfock vertical inner=bubble ladder=1 height=${h20}`), 'the height the error suggests is accepted, with mom= and without');
  // lying down, the default width grows below 40 px per unit too, with mom= only
  const wAt = (src, unit) => parse(src, { unit }).items[0].term.nodes.get('b').x;
  ok(wAt('fock mom=q', 30) === 3.73 && wAt('fock', 30) === 2.8 && wAt('fan-migdal mom=q width=3', 30) === 3 && wAt('fock mom=q width=2.8', 30) === 2.8 && wAt('gw mom=q', 40) === 2.8, 'lying down, the default width keeps its size in px with mom=, and a width= given is kept');
  // drawn: the head of the grey arrow, where it is and which way it points (0 = right, 90 = down the page)
  const head = (src) => { const m = render(src).svg.match(/translate\((-?[\d.]+) (-?[\d.]+)\) rotate\((-?[\d.]+)\) scale\(0\.8\)/); return m ? { x: +m[1], y: +m[2], ang: +m[3] } : null; };
  const st = head('fock vertical mom=q'), stL = head('fock vertical mom=q dir=left'), stO = head('fock vertical mom=q momside=out');
  ok(head('(0,0) -- (0,2) photon mom=q mompos=0.8').y < head('(0,0) -- (0,2) photon mom=q').y - 15, 'mompos=0.8 moves the arrow up a line written upwards');
  ok(st && st.x > 0 && st.ang === 90 && stL.ang === -90 && stO.x < 0 && stO.ang === 90, 'standing up: the arrow right of v and pointing down to a, up to b with dir=left; momside=out puts it left');
  const ly = head('fock mom=q'), lyL = head('fock mom=q dir=left'), lyO = head('fock mom=q momside=out'), top = -0.45 * 2.8 * 40;
  ok(ly && ly.y > top && ly.x < 56 && Math.abs(ly.ang) > 135 && lyL.x > 56 && Math.abs(lyL.ang) < 45 && lyO.y < top, 'lying down: under the arc, pointing back to a (to b with dir=left); momside=out puts it above');
  // errors
  ok(/momdir=sideways: .*momdir=back turns it round/.test(e('fock mom=q momdir=sideways')) && /momside=up: .*\bin\b.*\bout\b/.test(e('fock mom=q momside=up')), 'momdir= and momside= are checked');
  ok(/momdir= needs mom=/.test(e('fock momdir=back')) && /momside= needs mom=/.test(e('gw momside=out')) && /momtop= needs mom=/.test(e('fock vertical inner=chi momtop=x'))
    && /momdir=, momside= need mom=/.test(e('fan-migdal momdir=back momside=out')), 'momdir, momside and momtop need mom=');
  ok(/momtop= needs vertical/.test(e('fock momtop=x')) && /momtop= needs inner=/.test(e('fock vertical momtop=x')) && /unknown option "momtop"/.test(e('gw momtop=x')), 'momtop= needs a standing interaction in two pieces');
  ok(/momdir=forward: .*momdir=back turns it round/.test(e('(0,0) -- (2,0) phonon mom=q momdir=forward')) && !e('(0,0) -- (2,0) phonon mom=q momdir=back'), "a line's momdir= is back, or left out");
}

// ---- lens extents, label reach, stacked scripts, the | gap ----
{
  const vb = (src) => render(src).svg.match(/viewBox="([^"]*)"/)[1];
  ok(vb('a at 0,0 lens dir=right w=2 h=0.6') === '-46 -18 92 36' && vb('a at 0,0 lens w=0.6 h=2') === '-18 -46 36 92', 'a lens is w wide and h high on the page, lying or standing');
  ok(vb('a at 0,0 lens w=2 h=1') === '-26 -26 52 52', 'a lens is never thicker than it is long');
  const sh = { kind: 'lens', x: 0, y: 0, horiz: false, w: 32, h: 56 }, d = Math.SQRT1_2;
  ok(Math.abs(G.lensReach(sh, 1, 0) - 16) < 0.01 && Math.abs(G.lensReach(sh, 0, 1) - 28) < 0.01 && G.lensReach(sh, d, d) < (16 + 28) * d - 5, 'a lens reaches less far diagonally than its box');
  const { measureRuns, labelSVG } = await import('../src/text.js');
  const w = (L) => measureRuns(parseLabel(L), 14).w;
  ok(Math.abs(w('G^0_{ab}') - w('G_{ab}')) < 1e-9 && Math.abs(w('G_{ab}^{0}') - w('G_{ab}')) < 1e-9 && Math.abs(w("G'_z") - w('G_z')) < 1e-9 && Math.abs(w("G'_{\\,}") - w("G'")) < 1e-9, 'a subscript and a superscript (or prime) stack: the wider sets the width');
  ok(/dx="-7.17"/.test(labelSVG(parseLabel('\\rho^*_{nk}'), 0, 0, { color: 'x' })) && /dx="-3.92"/.test(labelSVG(parseLabel("G'_z"), 0, 0, { color: 'x' })), 'the subscript moves back under the superscript or prime');
  ok(measureRuns(parseLabel('spin'), 14).top === -0.66 * 14 && measureRuns(parseLabel('\\mathbf{q}'), 14).top === -0.47 * 14, 'the dots of i and j count, bold does not make a letter tall');
  const eq = render('fock\n| gw').html;
  ok(eq.includes('word-spacing:28px') && !eq.includes('8px 0 8px 28px'), 'the | gap is a space that a line break swallows');
}

// ---- friendlier parser messages, expand's values and title ----
{
  const e = (src) => render(src).errors.map((x) => x.message).join(' | ');
  ok(/no vertex "c" here; did you mean a\?/.test(e('fock\nc "x" pos=below')) && /an anchor of a vertex/.test(e('fock\na.nw "x"')), 'a label for a name that is not a vertex says so');
  ok(/did you mean pos=below/.test(e('a at 0,0 "x" pos=bellow')) && !e('a at 0,0 "x" pos=30') && !e('a at 0,0 "x" pos=center') && /did you mean pos=below/.test(e('fock\na pos=bellow')), 'pos= is checked, in both statements');
  ok(/one label/.test(e('a at 0,0 "x" "y"')) && /one label/.test(e('fock\na "x" label=y')), 'a vertex takes one label');
  ok(/style "I": marker=x/.test(e('style I = impurity marker=x\na at 0,0; b at 1,0\na -- b I')), 'style values are checked like a line\'s');
  ok(/replace it, shape and label included/.test(e('fock\na wobble')), 'the hint for an existing vertex says that at x,y replaces it');
  const { expand } = await import('../src/index.js');
  ok(expand('(0,0) -- (2,0) phonon mom="0"').includes('mom="0"') && expand('(0,0) -- (2,0) phonon mom="true"').includes('mom="true"'), 'text that reads like a number or a boolean stays quoted');
  ok(/^title "My GW"$/m.test(expand('title "My GW"\ngw')) && !/^title/m.test(expand('gw')), "the author's title is kept, a template's is not");
  const site = expand('gw\nb -- (3,1) D', { styles: { D: 'photon' } });
  ok(site.includes('b -- (3, 1) D') && !site.includes('style D'), "the site's styles are known to expand and left to the site");
  ok(expand('style D = photon dressed\ngw\nb -- (3,1) D').startsWith('style D = photon dressed'), "the block's own styles are written out");
}

// ---- remark: source shows the block, and By hand when it uses a template ----
{
  const { remarkFeynman } = await import('../remark/index.js');
  const run = (meta, value, opts = {}) => { const tree = { type: 'root', children: [{ type: 'code', lang: 'feynman', meta, value }] }; remarkFeynman({ quiet: true, ...opts })(tree, { message() {}, fail() {} }); return tree.children; };
  const k = run('source', 'fock');
  const tabs = k[1], [list, tpl, hand] = tabs?.children ?? [];
  ok(k.length === 2 && k[0].name === 'Feynman' && tabs.name === 'CodeBlockTabs' && tabs.data?._code_tab_visited
    && tabs.attributes.some((a) => a.name === 'defaultValue' && a.value === 'Template') && !tabs.attributes.some((a) => a.name === 'groupId'),
    'source: the diagram, then a finished CodeBlockTabs element of its own (no tab group)');
  ok(list.name === 'CodeBlockTabsList' && list.children.map((t) => t.name + ':' + t.attributes[0].value + ':' + t.children[0].value).join() === 'CodeBlockTabsTrigger:Template:Template,CodeBlockTabsTrigger:By hand:By hand',
    'the tab list has a Template and a By hand trigger');
  ok(tpl.name === 'CodeBlockTab' && tpl.attributes[0].value === 'Template' && tpl.children[0].value === '```feynman\nfock\n```'
    && hand.attributes[0].value === 'By hand' && hand.children[0].type === 'code' && hand.children[0].value.includes('a at (0, 0)'), 'the tabs hold the block as written and the block by hand');
  const h = run('source', 'a at 0,0; b at 1,0\na -> b fermion');
  ok(h.length === 2 && h[1].type === 'code' && !h[1].meta && h[1].value.includes('a -> b'), 'a block written by hand: one source block, no tabs');
  ok(run('caption="the source term"', 'fock').length === 1 && run(null, 'fock', { source: true }).length === 2, 'source inside a quoted value does not count; the option turns it on for every block');
  const u30 = run('source unit=30', 'fock vertical mom=q');
  ok(/^b at \(0, 3\.73\)$/m.test(u30[1].children[2].children[0].value) && u30[0].attributes.some((a) => a.name === 'unit' && a.value === '30'), "the fence's unit= reaches the component and the By hand tab");
  ok(/^b at \(0, 3\.73\)$/m.test(run('source', 'fock vertical mom=q', { unit: 30 })[1].children[2].children[0].value), "the site's unit (the remark option) reaches the By hand tab when the fence has none");
  const unitAttr = (meta, opts) => run(meta, 'fock vertical mom=q', opts)[0].attributes.filter((x) => x.name === 'unit').map((x) => x.value).join();
  ok(unitAttr('unit=30 unit=abc') === '30' && unitAttr('unit=abc') === '' && unitAttr('unit=36 unit=30') === '30' && /^b at \(0, 3\.73\)$/m.test(run('source unit=abc', 'fock vertical mom=q', { unit: 30 })[1].children[2].children[0].value),
    "the component gets the fence's last unit= that is a positive number, or none, so that it draws at the unit checked");
  const said = (meta, value) => { const m = []; remarkFeynman({ quiet: true })({ type: 'root', children: [{ type: 'code', lang: 'feynman', meta, value }] }, { message(x) { m.push(x); }, fail() {} }); return m; };
  ok(['unit=-30', 'unit=Infinity', 'unit=abc'].every((meta) => !said(meta, 'a at 0,0; b at 2,0\na -- b photon bulge=0.8 above "D"').length) && said('unit=30', 'gw vertical mom=q height=3').length === 1,
    "a fence's unit is used as the component uses it: a positive number, else none");
  const site = run('source', 'gw\nb -- (3,1) D', { styles: { D: 'photon' } });
  ok(site[1].name === 'CodeBlockTabs' && /b -- \(3, 1\) D/.test(site[1].children[2].children[0].value) && !/style D/.test(site[1].children[2].children[0].value),
    "the site's styles are known to By hand, and left to the site");
  const msgs = [], tree2 = { type: 'root', children: [{ type: 'code', lang: 'feynman', meta: 'source', value: 'fock\na -- (3,0) wobbly' }] };
  remarkFeynman({ quiet: true })(tree2, { message(m) { msgs.push(m); }, fail() {} });
  ok(msgs.length === 1 && tree2.children.length === 2 && tree2.children[1].type === 'code', 'a block with errors is reported once, and its source shown without a By hand tab');
}

// ---- what the docs writers found: consistency, accessibility, messages ----
{
  const e = (src) => render(src).errors.map((x) => x.message).join(' | ');
  const { expand, renderModel: rm, Term: T } = await import('../src/index.js');
  // a style's dressed is kept inside a template, so the template and its By hand form draw the same
  for (const src of ['style F = phonon dressed\nfan-migdal phonon=F', 'style S = coulomb dressed\nsigma2 boson=S']) {
    const a = render(src, { id: 'x' }).svg.replace(/aria-label="[^"]*"/, ''), b = render(expand(src), { id: 'x' }).svg.replace(/aria-label="[^"]*"/, '');
    ok(a === b && (src.includes('phonon') ? /stroke-width:3\.2/.test(a) : (a.match(/stroke-dasharray/g) || []).length >= 4), `${src.split('\n')[1]}: a style's dressed holds in the template, as By hand draws it`);
  }
  // renderModel takes styles as render() does; render() keeps the default unit for one that is not positive
  const tm = new T(); tm.node('a', 0, 0); tm.node('b', 2, 0); tm.edge('a', 'b', 'D', {});
  ok(!rm(tm, { styles: { D: 'photon' } }).errors.length, 'renderModel takes { D: "photon" } styles');
  ok(render('fock', { unit: -5 }).svg === render('fock').svg && render('fock', { unit: 'abc' }).svg === render('fock').svg, 'a unit that is not a positive number leaves the default');
  // accessible descriptions: TeX read as text, and vertices when there are no lines
  const aria = (src) => (render(src).svg.match(/aria-label="([^"]*)"/) || [])[1];
  ok(!/\\/.test(aria('dyson')) && /G sup 0/.test(aria('dyson')) && aria('a at 0,0 blob "\\Sigma"; b at 2,0 box "K"') === 'blob Σ, box K', 'descriptions read TeX as text, and list the vertices of a diagram without lines');
  // the drafting grid names its vertices on top of everything
  const gsvg = render('fock vertical inner=chi\ngrid').svg;
  ok(gsvg.lastIndexOf('feyn-grid') > gsvg.lastIndexOf('<path d="M0 -'), 'the grid writes the vertex names over the shapes');
  // drawing
  const coils = (render('(0,0) -- (2,0) gluon double').svg.match(/<path d="M[^"]+"/g) || []).slice(0, 2);
  ok(coils.length === 2 && coils[0] !== coils[1], 'a double gluon draws two strands');
  ok(/opacity:0[;"]/.test(render('(0,0) -- (2,0) phonon opacity=0').svg), 'opacity=0 is an opacity');
  const startHead = +render('(0,0) -> (2,0) fermion arrow=start').svg.match(/translate\((-?[\d.]+) /)[1];
  ok(startHead > 0 && startHead < 10, 'arrow=start puts the head inside the line, at its start');
  // messages
  ok(/loop draws a line from a vertex back to itself/.test(e('a at 0,0; b at 2,0\na -- b phonon loop')), 'a loop between two vertices is an error');
  ok(/anchor is start, middle or end/.test(e('text "x" at 0,0 anchor=foo')), "a text's anchor is checked");
  ok(/takes its arrow from in or out/.test(e('a at 0,0\nleg a left arrow=end')) && /leg: unknown word "D"/.test(e('a at 0,0\nleg a left D')), 'a leg rejects arrow= and names an unknown word as a line does');
  ok(/give the line one with mom=/.test(e('(0,0) -- (2,0) phonon momside=left')) && /leg: momside=/.test(e('a at 0,0\nleg a left phonon mompos=0.3')), 'momentum options need mom= on a line too');
  ok(/unknown option "rungs"; did you mean rung\?/.test(e('ladder rungs=3')) && /n expects a number, as in n=/.test(e('ladder n')), 'a template suggests the option meant, and a number option wants a number');
  ok(/unknown template "fok"; did you mean fock\?/.test(e('fok vertical')) && /unknown template "fok"; did you mean fock\?/.test(e('fok mom=q')) && /did you mean ladder\?/.test(e('ladderr')), 'a misspelt template is named, with options or alone');
  ok(parse('\n\nfock').items[0].term.nodes.get('a').line === 3, "a template's vertices carry the line of its statement");
  const eq = render('a at 0,0\n\ndyson style=D').errors;
  ok(eq.filter((x) => /unknown line style/.test(x.message)).length === 1 && eq.every((x) => x.line === 3), "an equation template's errors carry its line, each message once");
  ok(/write a -- a … loop/.test(e('a at 0,0\nleg a left loop')), 'a loop on a leg names the vertex, not a point the leg invented');
  ok(render('fock\n- hartree').html.includes('−') && !/>-</.test(render('fock\n- hartree').html), 'a - operator is set as a minus');
  ok(parseLabel('\\Uparrow')[0].t === '⇑', '\\Uparrow is ⇑');
  let order = ''; try { expand('a at 0,0\na -> c fermion\nb -- d photon\nwiggle'); } catch (x) { order = x.message; }
  ok(order.indexOf('line 2') < order.indexOf('line 3'), 'expand() lists its errors in the order of the lines');
  ok(parse('bubble width=2.4').items[0].term.nodes.get('b0').x - parse('bubble width=2.4').items[0].term.nodes.get('a0').x === 2.4, 'bubble width= sets its width');
}
// ---- remark: line numbers and strict ----
{
  const { remarkFeynman } = await import('../remark/index.js');
  const msgs = [], tree = { type: 'root', children: [{ type: 'code', lang: 'feynman', meta: null, value: '\n\na at 0,0\na -> c fermion', position: { start: { line: 10 } } }] };
  remarkFeynman({ quiet: true })(tree, { message(r, place) { msgs.push(place?.line); }, fail() {} });
  ok(msgs[0] === 14, `blank lines at the top of a block still count for the line reported (got ${msgs[0]})`);
  const seen = []; let threw = false;
  const two = { type: 'root', children: [1, 2].map(() => ({ type: 'code', lang: 'feynman', meta: null, value: 'a at 0,0\na -> c fermion', position: { start: { line: 1 } } })) };
  try { remarkFeynman({ quiet: true, strict: true })(two, { message(r) { seen.push(r); }, fail(r) { threw = r; throw new Error(r); } }); } catch {}
  ok(seen.length === 2 && /1 more/.test(threw), 'strict reports every error, then fails once');
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
