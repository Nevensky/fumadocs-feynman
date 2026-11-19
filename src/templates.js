// Templates: whole diagrams (or equations) from one line, e.g.  ladder n=4 pp  or  exciton vertex=charge.
// Each template lists its options with defaults (the default fixes the option's type) and builds a Term
// or an Equation in diagram units, main line on y = 0. Bare words in `flags` set several options at once.

import { Term, Equation, ELLIPSIS, SHAPES } from './model.js';
import * as G from './geometry.js';

const term = (title) => { const t = new Term(); t.title = title; return t; };
const flipOf = (dir) => dir === 'left';

// Four-point vertices: boxes BOX_W x BOX_H units. Their corner ports sit 0.2 units in from each corner
// (see render.js), that is PAIR above and below the centre, so two-particle lines run at y = ±PAIR.
const BOX_W = 0.9, BOX_H = 1.3, PAIR = BOX_H / 2 - 0.2;

// external stubs show the same length beyond every kind of vertex: STUB units past its rim (40 px per unit assumed
// for the small glyphs, whose size is fixed in px)
const STUB = 0.5;
const rimUnits = (shape) => { const sh = SHAPES[shape] || SHAPES.dot; return sh.ru ?? (sh.wu != null ? sh.wu / 2 : (sh.r || 0) / 40); };
// a count as drawn, and its noun: 1 rung, 2 rungs
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const stubLen = (shape) => STUB + rimUnits(shape);

/** Short external line with no arrow, from the vertex towards dx (units). */
function stub(t, v, x, y, dx, style = 'fermion', opts = {}) {
  const p = t.pt(x + dx, y);
  if (dx < 0) t.edge(p, v, style, { arrow: 'none', ...opts }); else t.edge(v, p, style, { arrow: 'none', ...opts });
}

/** Two-particle propagation between x0 and x1: top line rightwards, bottom line leftwards (ph) or rightwards (pp). */
function pair(t, A, B, C, D, ch, p, labels = {}) {
  // A -> B on top; bottom between C (left) and D (right)
  t.edge(A, B, p.line, { dressed: p.dressed, label: labels.top || '' });
  if (ch === 'pp') t.edge(C, D, p.line, { dressed: p.dressed, label: labels.bottom || '', side: 'right' });
  else t.edge(D, C, p.line, { dressed: p.dressed, label: labels.bottom || '' });
}

/** A four-point vertex (box) at (x, y) with legs of length `leg` on the requested corners. */
function vertex4(t, name, x, y, p, ch, { label, legs = 'nw sw ne se', leg = 0.7, color } = {}) {
  t.node(name, x, y, 'box', { label, color: color || p.color, w: BOX_W, h: BOX_H });
  const into = { nw: true, ne: false, sw: ch !== 'pp' ? false : true, se: ch !== 'pp' };
  for (const c of legs.split(/\s+/).filter(Boolean)) {
    const west = c.endsWith('w'), cy = y + (c.startsWith('n') ? PAIR : -PAIR);
    const P = t.pt(x + (west ? -BOX_W / 2 - leg : BOX_W / 2 + leg), cy);
    const left = west ? P : `${name}.${c}`, right = west ? `${name}.${c}` : P;
    // a leg written left to right; flip it when the particle runs leftwards
    t.edge(left, right, p.line, { dressed: p.dressed, flip: west ? !into[c] : into[c] });
  }
}

/** A polarization bubble from a (x0) to b (x0 + w), optionally with m ladder rungs inside. Returns [a, b]. */
function bubble(t, x0, w, p, k) {
  const a = t.node(`a${k}`, x0, 0, p.left || p.vertex), b = t.node(`b${k}`, x0 + w, 0, p.right || p.vertex);
  const m = Math.max(0, Math.round(p.ladder || 0));
  if (!m) {
    t.edge(a, b, p.line, { bend: 0.4, dressed: p.dressed, label: k === 0 ? p.top : '' });
    t.edge(b, a, p.line, { bend: 0.4, dressed: p.dressed, label: k === 0 ? p.bottom : '' });
    if (p.label && k === 0) t.text(p.label, x0 + w / 2, 0);
    return [a, b];
  }
  // lens: both lines on one circle through a and b; rungs vertical between them
  const s = Math.max(0.6, 0.2 * w), R = (w * w / 4 + s * s) / (2 * s), cx = x0 + w / 2, cy = s - R;
  const yAt = (x) => cy + Math.sqrt(Math.max(0, R * R - (x - cx) ** 2));
  const top = [{ n: a, x: x0, y: 0 }], bot = [{ n: a, x: x0, y: 0 }];
  for (let i = 1; i <= m; i++) {
    const x = x0 + (w * i) / (m + 1), y = yAt(x);
    top.push({ n: t.node(`t${k}_${i}`, x, y, 'dot'), x, y });
    bot.push({ n: t.node(`u${k}_${i}`, x, -y, 'dot'), x, y: -y });
  }
  top.push({ n: b, x: x0 + w, y: 0 }); bot.push({ n: b, x: x0 + w, y: 0 });
  const bendOf = (P, Q) => { const c = Math.hypot(Q.x - P.x, Q.y - P.y); return (R - Math.sqrt(Math.max(0, R * R - c * c / 4))) / c; };
  for (let i = 0; i <= m; i++) t.edge(top[i].n, top[i + 1].n, p.line, { bend: bendOf(top[i], top[i + 1]), dressed: p.dressed, label: k === 0 && i === 0 ? p.top : '' });
  for (let i = m + 1; i > 0; i--) t.edge(bot[i].n, bot[i - 1].n, p.line, { bend: bendOf(bot[i], bot[i - 1]), dressed: p.dressed, label: k === 0 && i === 1 ? p.bottom : '' });
  for (let i = 1; i <= m; i++) t.edge(top[i].n, bot[i].n, p.rung, { label: k === 0 && i === 1 ? p.rungLabel : '' });
  return [a, b];
}

// ---------- mirror images ----------
// Templates whose two ends differ are built for one direction of travel and mirrored for the other. A mirror
// keeps every line's ends and arrow; it negates x, swaps left and right in sides, anchors and directions,
// and turns a signed bend over (a bend that above / below already places stays as it is).
const MIRROR_DIR = { left: 'right', right: 'left', e: 'w', w: 'e', ne: 'nw', nw: 'ne', se: 'sw', sw: 'se', start: 'end', end: 'start' };
const mirrorDir = (d) => (d == null ? d : MIRROR_DIR[d] ?? (isFinite(parseFloat(d)) ? String(180 - parseFloat(d)) : d));
function mirror(t) {
  for (const n of t.nodes.values()) {
    n.x = -n.x;
    if (n.opts.pos != null) n.opts.pos = mirrorDir(n.opts.pos);
    if (n.opts.dir != null) n.opts.dir = mirrorDir(n.opts.dir);
  }
  for (const x of t.texts) { x.x = -x.x; if (x.opts.anchor) x.opts.anchor = mirrorDir(x.opts.anchor); }
  const ep = (e) => (e.at ? { at: [-e.at[0], e.at[1]] } : e.rel ? { rel: [-e.rel[0], e.rel[1]] } : e.anchor ? { ...e, anchor: mirrorDir(e.anchor) } : e);
  for (const e of t.edges) {
    e.from = ep(e.from); e.to = ep(e.to);
    const o = e.opts;
    if (o.bend && !o.above && !o.below) o.bend = -o.bend;
    if (o.side === 'left' || o.side === 'right') o.side = mirrorDir(o.side);
    // a straight line's label defaults to the left of its written direction, which the mirror makes the right
    else if (o.label && !o.side && !o.above && !o.below && !o.bend && o.bulge == null && !o.loop) o.side = 'right';
    if (o.momside) o.momside = mirrorDir(o.momside);
    if (o.dir != null) o.dir = mirrorDir(o.dir);
  }
  return t;
}

/** Move a whole term up by dy units. */
function shiftY(t, dy) {
  for (const n of t.nodes.values()) n.y += dy;
  for (const x of t.texts) x.y += dy;
  for (const e of t.edges) for (const k of ['from', 'to']) if (e[k].at) e[k] = { at: [e[k].at[0], e[k].at[1] + dy] };
  return t;
}

// A vertex triangle (Hedin's Γ). Lines run into it and end inside, where the triangle (drawn over them) hides
// their ends, so single and double lines alike stop exactly on its edge. The two electron lines enter its far
// side PAIR above and below its axis, the heights at which they leave a box; that side is taller than 2 PAIR.
// Its corners reach well past the lines' outer strands, so that a strand never pokes out of a sloping edge.
const TRI_R = 0.66, INSIDE = 0.07, TIP_IN = 0.25;
/** Line ends at a triangle centred at (x, y) that points left or right: tip (boson), a and b (electrons, h above and below), side. */
function triEnds(x, y, dir, h = PAIR) {
  const s = dir === 'left' ? 1 : -1, side = x + (s * TRI_R) / 2;
  return { tip: [x - s * (TRI_R - TIP_IN), y], a: [side - s * INSIDE, y + h], b: [side - s * INSIDE, y - h], side };
}
/** Arrow and label halfway along the part of a line that shows, when `hidden` units of its `from` end are inside a shape. */
const shown = (hidden, visible, hiddenAtStart = true) => (hiddenAtStart ? hidden + visible / 2 : visible / 2) / (hidden + visible);

/** Spin labels for the GT diagrams, or none. */
const spins = (p) => (p.spin ? { up: p.up, down: p.down } : { up: '', down: '' });
const lab = (label, where) => (label ? { label, [where]: true } : {});
// labels under the arrowless legs sit as far from the line as those beside an arrowhead, so that the spin labels
// along a base line share one height (ARROW_CLEAR + 4 px in render.js)
const legLab = (label) => (label ? { label, below: true, dist: 9.85 } : {});

// GT self-energies, built for an electron that runs from right to left (the paper's figures) and mirrored
// for dir=right. Points are numbered as in Müller, Blügel and Friedrich, PRB 100, 045130 (2019):
// Σ(13) = −i T(12,34) G(24), the T matrix a ladder between the line 1–3 (spin σ, the external electron) and
// the line 2–4 (spin σ′ = −σ), closed by the G from 4 back to 2. (The paper's Eq. 1 prints G(42); with its
// K(12,34) = iG(13)G(42) the line 2–4 inside T already runs from 2 to 4, so the loop closes with G(24), as its
// Fig. 3 draws.)
function gtArch(t, p, ph, n) {
  // the arch widens with the number of rungs, so that the inner rail keeps room for its arrow between them
  const Ro = 2.0 + 0.2 * Math.max(0, n - 3), Ri = Ro - 0.8, d = Math.PI / (n + 1), sp = spins(p);
  const ang = Array.from({ length: n + 2 }, (_, k) => k * d);
  const name = (outer, k) => (k === 0 ? (outer ? 'D' : 'C') : k === n + 1 ? (outer ? 'A' : 'B') : `${outer ? 'o' : 'i'}${k}`);
  const O = ang.map((th, k) => t.node(name(true, k), Ro * Math.cos(th), Ro * Math.sin(th)));
  const I = ang.map((th, k) => t.node(name(false, k), Ri * Math.cos(th), Ri * Math.sin(th)));
  const dl = { dressed: p.dressed };
  // each rail is one half circle through its rung vertices, as in the paper, with one arrow at the top (just
  // past the top rung when there is one)
  const ta = n % 2 ? 0.5 + 0.5 / (n + 1) : 0.5;
  // the outer rail continues the external electron (σ) from D over the top to A
  t.edge(O[0], O[n + 1], p.line, { ...dl, bend: -0.5, arrowPos: ta, ...(sp.up ? { label: sp.up, side: 'out', pos: 0.85 } : {}) });
  // the inner rail (σ′) runs against it for a particle–hole T matrix (B → C), with it for particle–particle
  const [i0, i1] = ph ? [I[n + 1], I[0]] : [I[0], I[n + 1]];
  t.edge(i0, i1, p.line, { ...dl, bend: ph ? 0.5 : -0.5, arrowPos: ta, ...(sp.down ? { label: sp.down, side: 'in', pos: ph ? 0.15 : 0.85 } : {}) });
  // the two end rungs lie along the base line, the others are radial
  t.edge(O[n + 1], I[n + 1], p.rung, lab(p.rungLabel, 'below'));
  for (let k = 1; k <= n; k++) t.edge(O[k], I[k], p.rung);
  t.edge(I[0], O[0], p.rung);
  // the electron after the spin flip (σ′) closes the T matrix along the base line: C → B, or B → C (a hole) for pp
  const [g0, g1] = ph ? [I[0], I[n + 1]] : [I[n + 1], I[0]];
  t.edge(g0, g1, p.line, { ...dl, ...lab(sp.down, 'below') });
  if (p.legs) {
    stub(t, O[n + 1], -Ro, 0, -stubLen('dot'), 'fermion', legLab(sp.up));
    stub(t, O[0], Ro, 0, stubLen('dot'), 'fermion', legLab(sp.up));
  }
  if (p.label) t.text(p.label, 0, 0.42 * Ri);
}

/** Closed ladder (form=ladder, n rungs) or closed T box (form=box, after n rungs). */
function gtClosed(t, p, ph, n, box) {
  const y = PAIR, s = box ? 0.9 : 1.0, TW = 1.3, sp = spins(p), dl = { dressed: p.dressed };
  const xs = Array.from({ length: n }, (_, k) => k * s);
  const bot = xs.map((x, k) => t.node(`b${k + 1}`, x, -y)), top = xs.map((x, k) => t.node(`t${k + 1}`, x, y));
  const xT = n ? xs[n - 1] + 0.9 + TW / 2 : 0;
  if (box) t.node('T', xT, 0, 'box', { label: p.T, color: p.color, w: TW, h: BOX_H });
  // line 1–3 (σ): from the right end leftwards; line 2–4 (σ′): rightwards for ph, leftwards for pp
  const B = box ? [...bot, 'T.sw'] : bot, U = box ? [...top, 'T.nw'] : top;
  for (let k = B.length - 1; k > 0; k--) t.edge(B[k], B[k - 1], p.line, dl);
  for (let k = 0; k + 1 < U.length; k++) { if (ph) t.edge(U[k], U[k + 1], p.line, dl); else t.edge(U[k + 1], U[k], p.line, dl); }
  for (let k = 0; k < n; k++) t.edge(bot[k], top[k], p.rung, { label: k === 0 ? p.rungLabel : '' });
  // the closing G (σ′) from 4 over the top to 2
  const four = box ? 'T.ne' : top[n - 1], two = n ? top[0] : 'T.nw';
  // a double closing line leaves the corner dot more steeply, so that its strands clear the rail's
  const arc = { ...dl, above: true, bend: !n ? 0.5 : p.dressed ? 0.42 : box ? 0.36 : 0.33, ...(sp.down ? { label: sp.down } : {}) };
  if (ph) t.edge(four, two, p.line, arc); else t.edge(two, four, p.line, arc);
  const x1 = n ? 0 : -TW / 2, x3 = box ? xT + TW / 2 : xs[n - 1];
  if (p.legs) {
    stub(t, n ? bot[0] : 'T.sw', x1, -y, -stubLen('dot'), 'fermion', legLab(sp.up));
    stub(t, box ? 'T.se' : bot[n - 1], x3, -y, stubLen('dot'), 'fermion', legLab(sp.up));
  }
  if (!p.numbers) return;
  // the paper's numbers: 1, 2 at the left end, 3, 4 at the right end, 5, 6, ... inside, bottom before top
  const num = (nd, label, pos) => { const o = t.nodes.get(nd).opts; o.label = label; o.pos = pos; o.size = 12.5; };
  const corner = (label, x, yy, anchor) => t.text(label, x, yy, { size: 12.5, anchor });
  let next = 5;
  for (let k = 0; k < n; k++) {
    const end = k === 0 ? 'w' : !box && k === n - 1 ? 'e' : null;
    const [lb, lt] = k === 0 ? ['1', '2'] : !box && k === n - 1 ? ['3', '4'] : [String(next++), String(next++)];
    num(bot[k], lb, end ? (p.legs ? `n${end}` : end) : 's');
    num(top[k], lt, end || 'n');
  }
  if (box) {
    const L = xT - TW / 2, R = xT + TW / 2, h = BOX_H / 2, low = p.legs ? -h + 0.43 : -h + 0.02;
    if (n) { corner(String(next++), L, -h - 0.28, 'middle'); corner(String(next++), L, h + 0.25, 'middle'); }
    else { corner('1', L - 0.1, low, 'end'); corner('2', L - 0.1, h - 0.02, 'end'); }
    corner('3', R + 0.1, low, 'start'); corner('4', R + 0.1, h - 0.02, 'start');
  }
}

// ---------- ladders of any number of lines (excitons, trions, biexcitons) ----------
/**
 * Parallel lines (e: electron, arrow along dir; h: hole, against it) with interaction rungs in columns. A
 * column is one pair of line numbers (12) or several that do not overlap (12+34). A rung between lines that
 * are not neighbours passes over the lines between them.
 */
function rails(t, p) {
  const sp = String(p.lines).trim().split(/\s+/).filter(Boolean);
  if (sp.length < 2) throw new Error('lines needs two particles at least, as in lines="e h"');
  const bad = sp.find((s) => s !== 'e' && s !== 'h');
  if (bad) throw new Error(`lines: "${bad}" is not e (an electron) or h (a hole)`);
  const m = sp.length;
  const cols = String(p.rungs).trim().split(/\s+/).filter(Boolean).map((tok) => {
    const col = tok.split('+').map((pr) => {
      const mm = /^(\d)-?(\d)$/.exec(pr);
      if (!mm) throw new Error(`rungs: "${pr}" is not two line numbers, as in 12 or 13 (lines count from the top)`);
      const i = Math.min(+mm[1], +mm[2]), j = Math.max(+mm[1], +mm[2]);
      if (i === j || i < 1 || j > m) throw new Error(`rungs: "${pr}" needs two different lines between 1 and ${m}`);
      return [i - 1, j - 1];
    }).sort((a, b) => a[0] - b[0]);
    for (let q = 1; q < col.length; q++) if (col[q][0] <= col[q - 1][1]) throw new Error(`rungs: the rungs of "${tok}" overlap; a column can only hold rungs side by side, as in 12+34`);
    return col;
  });
  const leg = 0.6, s = p.spacing, ys = sp.map((_, i) => ((m - 1) / 2 - i) * p.gap);
  const xs = cols.map((_, k) => leg + k * s), xe = cols.length ? xs[xs.length - 1] + leg : 2 * leg;
  const at = sp.map(() => new Map()), crossed = sp.map(() => new Set());
  cols.forEach((col, k) => col.forEach(([i, j]) => {
    for (const r of [i, j]) at[r].set(k, t.node(`v${r + 1}_${k + 1}`, xs[k], ys[r]));
    for (let r = i + 1; r < j; r++) crossed[r].add(k);
  }));
  // each line is cut at its vertices and where a rung passes over it, so that one arrow sits on each piece
  // and never under a crossing rung
  sp.forEach((kind, i) => {
    const P = [{ n: t.pt(0, ys[i]), x: 0, real: true }];
    xs.forEach((x, k) => { if (at[i].has(k)) P.push({ n: at[i].get(k), x, real: true }); else if (crossed[i].has(k)) P.push({ n: t.pt(x, ys[i]), x, real: false }); });
    P.push({ n: t.pt(xe, ys[i]), x: xe, real: true });
    const flip = (kind === 'h') !== flipOf(p.dir);
    // the pieces between two vertices are one propagator: one arrow, on the longest piece
    for (let q = 0; q + 1 < P.length;) {
      let r = q + 1;
      while (!P[r].real) r++;
      let best = q;
      for (let s = q; s < r; s++) if (P[s + 1].x - P[s].x > P[best + 1].x - P[best].x + 1e-9) best = s;
      for (let s = q; s < r; s++) t.edge(P[s].n, P[s + 1].n, p.line, { dressed: p.dressed, flip, ...(s === best ? {} : { arrow: 'none' }) });
      q = r;
    }
  });
  let labels = String(p.labels).trim();
  if (labels === 'auto') labels = sp.map((s, i) => (sp.filter((x) => x === s).length > 1 ? `${s}_${sp.slice(0, i + 1).filter((x) => x === s).length}` : s)).join(' ');
  if (labels && labels !== 'none') labels.split(/\s+/).forEach((l, i) => { if (i < m) t.text(l, -0.15, ys[i], { anchor: 'end' }); });
  // the rung label goes on the first rung between neighbouring lines; on a rung that skips lines it sits between
  // the first two, never on a line the rung passes over
  const all = cols.flat(), lab0 = all.find(([i, j]) => j - i === 1) || all[0];
  cols.forEach((col, k) => col.forEach((pr) => {
    const [i, j] = pr, labelled = pr === lab0 && p.rungLabel;
    t.edge(at[i].get(k), at[j].get(k), p.rung, { over: j - i > 1, ...(labelled ? { label: p.rungLabel, ...(j - i > 1 ? { pos: 0.5 / (j - i) } : {}) } : {}) });
  }));
}

/** Accessible name of a ladder of lines, from its particles. */
function nameOf(lines) {
  const sp = String(lines).trim().split(/\s+/).filter(Boolean), ne = sp.filter((s) => s === 'e').length, nh = sp.length - ne;
  if (sp.length === 3 && ne === 2) return 'trion X⁻: ladder of two electrons and a hole';
  if (sp.length === 3 && nh === 2) return 'trion X⁺: ladder of two holes and an electron';
  if (sp.length === 4 && ne === 2) return 'biexciton: ladder of two electrons and two holes';
  return `ladder of the lines ${sp.join(' ')}`;
}

// ---------- self-energies standing up ----------
/**
 * A self-energy with its two vertices one above the other (vertical): the interaction runs straight up from a
 * (bottom) to b (top) and the electron arcs round on the right, in at the bottom from the left and out at the top
 * to the right (dir=left reverses the arrows). inner= puts a diagram inside the interaction, between c (below)
 * and d (above): chi, a response-function lens X, or bubble, a polarization bubble of two electron lines with
 * ladder= rungs inside. The interaction carries no arrow: an arrow marks a fermion, and a Coulomb line, W or a
 * phonon is none. The momentum it carries goes in its label, or beside it as a grey arrow with mom= (momOpts).
 */
function standing(t, p, { boson, label, innerLabel, bosonDressed = false, unit = 40 }) {
  const inner = p.inner || '', n = Math.max(0, Math.round(p.ladder || 0));
  if (inner && inner !== 'chi' && inner !== 'bubble') throw new Error(`inner=${inner}: the inner diagrams are chi (a lens) and bubble (two electron lines)`);
  // a momentum arrow beside the interaction makes it longer (MOM_ROOM): room for an arrow and a label whose size is
  // fixed in px, so that below 40 px per unit the interaction and its inner diagram take more units, and keep their size in px
  const k = p.mom ? momScale(unit) : 1;
  // a bubble's rungs are spaced as in the bubbles lying down (chain()), so that a rung's label clears the next rung
  const mid = k * (!inner ? 0 : inner === 'chi' ? 1.4 : Math.max(1.4, 0.95 * (n + 1)));
  // (without mom=, a piece is 0.4 units at least, and 12 px, so that it still shows outside its vertices)
  const room = p.mom ? Object.fromEntries(Object.entries(MOM_ROOM).map(([key, v]) => [key, +(v * k).toFixed(2)])) : { h: 2.2, seg: 0.9, segOut: 0.9, segMin: Math.max(0.4, 12 / unit), hMin: 0 };
  const H = +p.height > 0 ? +p.height : inner ? mid + 2 * (p.momside === 'out' ? room.segOut : room.seg) : room.h, seg = (H - mid) / 2;
  if (inner && seg < room.segMin - 1e-9) throw new Error(`height=${p.height} leaves no room for the interaction around the inner diagram${p.mom ? ' and the momentum arrow beside it' : ''}: give it ${Math.ceil((mid + 2 * room.segMin) * 100 - 1e-6) / 100} at least`);
  if (!inner && H < room.hMin - 1e-9) throw new Error(`height=${p.height} leaves no room for the momentum arrow beside the interaction: give it ${room.hMin} at least`);
  const dl = { dressed: p.dressed }, bo = bosonDressed ? { dressed: true } : {};
  if (inner === 'chi') t.node('X', 0, H / 2, 'lens', { label: innerLabel, h: mid, w: 0.8 * k, pos: 'left' });
  const a = t.node('a', 0, 0, p.vertex), b = t.node('b', 0, H, p.vertex);
  // the legs are longer than a stub, so that their labels clear labels written on the vertices
  const leg = 1.1 + rimUnits(p.vertex);
  stub(t, a, 0, 0, -leg, 'fermion', p.legLabel ? { label: p.legLabel, below: true } : {});
  stub(t, b, 0, H, leg, 'fermion', p.legLabel ? { label: p.legLabel, above: true } : {});
  // the electron: up the right-hand side, its label outside the arc
  t.edge(a, b, p.line, { ...dl, bend: -0.36, label: p.G, flip: flipOf(p.dir) });
  // the electron enters at a, or at b with dir=left: the momentum arrow points there
  const inA = !flipOf(p.dir);
  if (!inner) { t.edge(a, b, boson, { ...bo, label, ...momOpts(p, inA, { label, along: [0.3, 0.7] }) }); return; }
  // the interaction in two pieces, written upwards so that their labels sit on the left; it meets the inner diagram
  // through the same coupling as the electron at a and b (a vertex of the dot kind; a dot otherwise)
  const vk = (SHAPES[p.vertex] || SHAPES.dot).kind === 'dot' ? p.vertex : 'dot';
  const c = t.node('c', 0, seg, vk), d = t.node('d', 0, H - seg, vk);
  // with momside=out each piece has its label near a or b, and its arrow near the inner diagram
  t.edge(a, c, boson, { ...bo, label, ...momOpts(p, inA, { label, along: [0.25, 0.7] }) });
  t.edge(d, b, boson, { ...bo, label: p.vtop || label, ...momOpts(p, inA, { mom: p.momtop || p.mom, label: p.vtop || label, along: [0.75, 0.3] }) });
  if (inner === 'chi') return;
  // a bubble of two electron lines from c to d, the left one up, the right one down; rungs straight across
  const L = mid, s = Math.max(0.45, 0.32 * L), R = (L * L / 4 + s * s) / (2 * s), cy = seg + L / 2;
  const xAt = (y) => s - R + Math.sqrt(Math.max(0, R * R - (y - cy) ** 2));
  const ys = Array.from({ length: n }, (_, k) => seg + (L * (k + 1)) / (n + 1));
  const left = [c, ...ys.map((y, k) => t.node(`l${k + 1}`, -xAt(y), y)), d];
  const right = [c, ...ys.map((y, k) => t.node(`r${k + 1}`, xAt(y), y)), d];
  const P = (nm) => t.nodes.get(nm);
  const bendOf = (A, B) => { const q = Math.hypot(P(B).x - P(A).x, P(B).y - P(A).y); return (R - Math.sqrt(Math.max(0, R * R - q * q / 4))) / q; };
  for (let k = 0; k + 1 < left.length; k++) t.edge(left[k], left[k + 1], p.line, { ...dl, bend: bendOf(left[k], left[k + 1]), ...(k === 0 && innerLabel ? { label: innerLabel } : {}) });
  for (let k = right.length - 1; k > 0; k--) t.edge(right[k], right[k - 1], p.line, { ...dl, bend: bendOf(right[k], right[k - 1]) });
  for (let k = 1; k <= n; k++) t.edge(left[k], right[k], p.rung, { label: k === 1 ? p.rungLabel : '' });
}

// ---------- the momentum through the interaction ----------
// mom= draws the momentum an interaction carries as a grey arrow beside it (an arrowhead on the line would make it
// a fermion). The arrow points towards the vertex where the electron enters, the way q runs when the inner
// electron carries k+q, as in Σ(k) = i Σ_q v(q) G(k+q); momdir=back turns it round, for k−q. It sits inside, between
// the interaction and the electron, opposite the interaction's label, where a short momentum (q, Q) fits. momside=out
// puts it outside, for a longer one, and the label makes way: inside an arc, which has room for it, or along a
// straight interaction standing up, where the electron passes too close for a label inside.
// Standing up, the interaction is longer with mom=, so that the arrow and its label clear the electron, which
// runs close to the interaction near a and b, and so that with momside=out the label and the arrow fit one above
// the other: h for a single line, seg for each piece around an inner diagram (2.2 and 0.9 without mom=).
const MOM_ROOM = { h: 2.8, seg: 1.45, segOut: 1.6, segMin: 1.35, hMin: 2.6 };
/** How much larger, in units, a self-energy with a momentum arrow is drawn at `unit` px per unit: 1 from 40 px up. */
const momScale = (unit = 40) => Math.max(1, 40 / unit);
/** The width of a self-energy lying down: with a momentum arrow and no width= given, as wide in px as at 40 px per unit. */
const momWidth = (p, env) => (p.mom && !env.given?.has('width') ? +(p.width * momScale(env.unit)).toFixed(2) : p.width);
/**
 * Options for the momentum arrow of an interaction line: `toFrom` when the electron enters at the line's first
 * end, `label` the line's label; `along` (a straight line standing up) the label's and the arrow's places along
 * it with momside=out.
 */
function momOpts(p, toFrom, { mom = p.mom, label = '', along = null } = {}) {
  if (!mom) return {};
  const o = { mom };
  if (toFrom !== (p.momdir === 'back')) o.momdir = 'back';
  if (p.momside === 'out') {
    // outside is the left of the written direction: the convex side of these arcs, the left of a line written upwards
    o.momside = 'left';
    if (label && along) { o.pos = along[0]; o.mompos = along[1]; } else if (label) o.side = 'in';
  }
  return o;
}
/** Errors for momdir=, momside= and momtop= where they mean nothing. */
function checkMom(p) {
  if (p.momdir && p.momdir !== 'back') throw new Error(`momdir=${p.momdir}: the momentum arrow points towards the vertex where the electron enters (k+q on the inner line); momdir=back turns it round (k−q)`);
  if (p.momside && p.momside !== 'in' && p.momside !== 'out') throw new Error(`momside=${p.momside}: the momentum arrow goes in, between the interaction and the electron, or out, where the interaction's label makes way for it`);
  const lone = ['momdir', 'momside', 'momtop'].filter((k) => p[k]);
  if (lone.length && !p.mom) throw new Error(`${optionNames(lone)} ${lone.length > 1 ? 'need' : 'needs'} mom=: mom="\\mathbf{q}" draws the momentum arrow, with its label`);
}

// the options only the standing forms use, with their defaults
const STANDING_ONLY = { height: 0, inner: '', chi: '', vtop: '', momtop: '', ladder: 0, rung: 'screened', rungLabel: '' };
const optionNames = (ks) => ks.map((k) => (typeof STANDING_ONLY[k] === 'boolean' ? k : `${k}=`)).join(', ');
/** Errors for standing-only options given where they would do nothing. */
function checkStanding(p) {
  const given = (k) => k in p && p[k] !== STANDING_ONLY[k];
  if (+p.height < 0) throw new Error(`height=${p.height}: the height is in units, and above 0`);
  const off = Object.keys(STANDING_ONLY).filter(given);
  if (!p.vertical && off.length) {
    throw new Error(`${optionNames(off)} ${off.length > 1 ? 'need' : 'needs'} vertical: ${off.includes('inner') ? 'the inner diagram sits on the straight interaction of the standing self-energy' : `only the self-energy standing up uses ${off.length > 1 ? 'them' : 'it'}`}`);
  }
  const rungs = ['ladder', 'rung', 'rungLabel'].filter(given);
  if (rungs.length && p.inner !== 'bubble') throw new Error(`${optionNames(rungs)} ${rungs.length > 1 ? 'need' : 'needs'} inner=bubble: the rungs go inside the bubble`);
  const around = ['chi', 'vtop', 'momtop'].filter(given);
  if (around.length && !p.inner) throw new Error(`${optionNames(around)} ${around.length > 1 ? 'need' : 'needs'} inner=chi or inner=bubble: without an inner diagram there is nothing for ${around.length > 1 ? 'them' : 'it'} to label`);
}
// the external legs' label, below them
const legOpts = (p) => (p.legLabel ? { label: p.legLabel, below: true } : {});

/** Chain of n bubbles joined by `link` lines, with `ext` legs at both ends. */
function chain(t, p) {
  const n = Math.max(1, Math.round(p.n));
  // a bubble's width= (rpa and exciton have none), and with rungs wide enough to keep a rung's label clear of the next
  const w = p.ladder ? Math.max(p.width ?? 0, 0.95 * (Math.round(p.ladder) + 1)) : p.width ?? 1.6, gap = 1.0, leg = 0.9;
  const ext = p.ext || p.link;
  const rimL = rimUnits(p.left || p.vertex), rimR = rimUnits(p.right || p.vertex);
  let prev = t.pt(0, 0), x = leg + rimL;
  for (let k = 0; k < n; k++) {
    const [a, b] = bubble(t, x, w, p, k);
    if (ext !== 'none' || k > 0) t.edge(prev, a, k === 0 ? ext : p.link, { label: k === 0 ? p.extLabel : k === 1 ? p.linkLabel : '' });
    prev = b; x += w + gap;
  }
  if (ext !== 'none') t.edge(prev, t.pt(x - gap + leg + rimR, 0), ext);
}

export const TEMPLATES = {
  // ---------------- propagators and Dyson equations ----------------
  propagator: {
    title: 'A propagator line', example: 'propagator style=phonon dressed label="F"',
    params: { style: 'fermion', label: '', length: 1.8, dressed: false, dir: 'right' },
    build(p) {
      const t = term(`${p.dressed ? 'dressed ' : ''}${p.style} line ${p.label}`.trim());
      t.edge(t.pt(0, 0), t.pt(p.length, 0), p.style, { label: p.label, dressed: p.dressed, flip: flipOf(p.dir) });
      return t;
    }
  },
  dyson: {
    title: 'Dyson equation: full = bare + bare · self-energy · full', example: 'dyson style=photon full=D bare="D^0" self="\\Pi"',
    params: { style: 'fermion', full: 'G', bare: 'G^0', self: '\\Sigma', color: 'muted', dir: 'right' },
    build(p) {
      const flip = flipOf(p.dir), eq = new Equation();
      eq.title = `Dyson equation for ${p.full}`;
      const t1 = term(`full propagator ${p.full}`); t1.edge(t1.pt(0, 0), t1.pt(1.8, 0), p.style, { dressed: true, label: p.full, flip });
      const t2 = term(`bare propagator ${p.bare}`); t2.edge(t2.pt(0, 0), t2.pt(1.8, 0), p.style, { bare: true, label: p.bare, flip });
      const t3 = term(`${p.bare}, self-energy ${p.self}, ${p.full}`);
      const S = t3.node('S', 2.05, 0, 'blob', { label: p.self, color: p.color });
      t3.edge(t3.pt(0, 0), S, p.style, { bare: true, label: p.bare, flip });
      t3.edge(S, t3.pt(4.1, 0), p.style, { dressed: true, label: p.full, flip });
      return eq.add('', t1).add('=', t2).add('+', t3);
    }
  },
  sigma: {
    title: 'A self-energy blob with two stubs', example: 'sigma label="\\Sigma^{ep}"',
    params: { label: '\\Sigma', color: 'muted', line: 'fermion', r: 0.45 },
    build(p) {
      const t = term(`self-energy ${p.label}`);
      const S = t.node('S', 0, 0, 'blob', { label: p.label, color: p.color, r: p.r });
      stub(t, S, 0, 0, -(p.r + 0.5), p.line); stub(t, S, 0, 0, p.r + 0.5, p.line);
      return t;
    }
  },

  // ---------------- electron self-energies ----------------
  'fan-migdal': {
    title: 'Fan–Migdal self-energy: an electron line spanned by a phonon arc', example: 'fan-migdal dressed vertex=disk',
    params: { dressed: false, phonon: 'phonon', vertex: 'dot', G: '', F: '', mom: '', momdir: '', momside: '', dir: 'right', width: 2.8, vertical: false, height: 0, inner: '', chi: '', vtop: '', momtop: '', ladder: 0, rung: 'screened', rungLabel: '', legLabel: '', line: 'fermion' },
    build(p, env = {}) {
      checkStanding(p); checkMom(p);
      const t = term(`Fan–Migdal self-energy${p.vertical ? ', standing up' : ''}${p.inner ? ` with ${p.inner === 'chi' ? 'a phonon self-energy' : 'a bubble'} inside the phonon line` : ''}`);
      if (p.vertical) {
        // around an inner diagram the phonon pieces stay bare: F holds every Π insertion already, and F Π F counts one twice
        const bareF = !p.dressed || !!p.inner;
        standing(t, { ...p, G: p.G || (p.dressed ? 'G' : 'G^0') }, { boson: p.phonon, bosonDressed: !bareF, label: p.F || (bareF ? 'F^0' : 'F'), innerLabel: p.chi || (p.inner === 'chi' ? '\\Pi' : ''), unit: env.unit });
        return t;
      }
      const w = momWidth(p, env), a = t.node('a', 0, 0, p.vertex), b = t.node('b', w, 0, p.vertex);
      stub(t, a, 0, 0, -stubLen(p.vertex), 'fermion', legOpts(p)); stub(t, b, w, 0, stubLen(p.vertex), 'fermion', legOpts(p));
      t.edge(a, b, p.line, { dressed: p.dressed, label: p.G || (p.dressed ? 'G' : 'G^0'), side: 'right', flip: flipOf(p.dir) });
      const F = p.F || (p.dressed ? 'F' : 'F^0');
      t.edge(a, b, p.phonon, { dressed: p.dressed, bend: 0.42, label: F, ...momOpts(p, !flipOf(p.dir), { label: F }) });
      return t;
    }
  },
  'debye-waller': {
    title: 'Debye–Waller self-energy: a phonon loop on one second-order vertex', example: 'debye-waller',
    params: { dressed: false, phonon: 'phonon', F: '', vertexLabel: 'g^{DW}' },
    build(p) {
      const t = term('Debye–Waller self-energy');
      const v = t.node('v', 0, 0, 'hatched', { label: p.vertexLabel, pos: 'below' });
      stub(t, v, 0, 0, -stubLen('hatched')); stub(t, v, 0, 0, stubLen('hatched'));
      t.edge(v, v, p.phonon, { loop: true, dir: 'up', size: 1.2, dressed: p.dressed, label: p.F || (p.dressed ? 'F' : 'F^0') });
      return t;
    }
  },
  gw: {
    title: 'GW self-energy: an electron line spanned by the screened interaction; gamma= puts Hedin’s vertex at one end (Σ = GWΓ)', example: 'gw',
    params: { dressed: true, G: 'G', W: 'W', mom: '', momdir: '', momside: '', vertex: 'dot', dir: 'right', width: 2.8, gamma: '', gcolor: 'c4', vertical: false, height: 0, legLabel: '', line: 'fermion' },
    build(p, env = {}) {
      checkStanding(p); checkMom(p);
      const w = momWidth(p, env);
      if (p.vertical) {
        if (p.gamma) throw new Error('gamma= and vertical do not go together yet: draw Σ = GWΓ lying down');
        const t = term('GW self-energy, standing up');
        standing(t, { ...p, inner: '', ladder: 0 }, { boson: 'screened', label: p.W, innerLabel: '', unit: env.unit });
        return t;
      }
      if (p.gamma) {
        // Σ(12) = i G(13) W(1⁺4) Γ(32;4): the electron enters through the vertex triangle, which stands on the
        // line with W arriving at its tip, runs to the bare vertex and leaves there. Built for dir=right, mirrored.
        // the triangle stands on the line with its base a little below it, and the lines end inside it
        const t = term('GWΓ self-energy');
        const yc = TRI_R / 2 - 0.09, c = Math.cos(Math.PI / 6) * TRI_R, tip = [0, yc + TRI_R - 0.3];
        t.node('Gam', 0, yc, 'triangle', { label: p.gamma, dir: 'up', r: TRI_R, color: p.gcolor });
        const b = t.node('b', w, 0, p.vertex), inR = c - 0.25, edge = c - 0.09 / Math.tan(Math.PI / 3);
        // a leg label sits under the part of the incoming line that shows, left of the triangle
        const x0 = -c - STUB, legIn = p.legLabel ? { label: p.legLabel, below: true, pos: (-edge - x0) / 2 / (-inR - x0) } : {};
        t.edge([x0, 0], [-inR, 0], 'fermion', { arrow: 'none', ...legIn });
        const tv = shown(edge - inR, w - edge);
        t.edge([inR, 0], b, p.line, { dressed: p.dressed, label: p.G, side: 'right', pos: tv, arrowPos: tv });
        stub(t, b, w, 0, stubLen(p.vertex), 'fermion', legOpts(p));
        // W's label over the highest point of its arc, which leans towards the triangle
        const arc = G.arc([0, -tip[1]], [w, 0], 0.42);
        let tTop = 0.5, yTop = Infinity;
        for (let k = 0; k <= 60; k++) { const q = G.at(arc, k / 60); if (q[1] < yTop) { yTop = q[1]; tTop = k / 60; } }
        // the electron enters through the triangle, at W's first end, mirrored or not
        t.edge(tip, b, 'screened', { bend: 0.42, label: p.W, pos: tTop, ...momOpts(p, true, { label: p.W }) });
        return flipOf(p.dir) ? mirror(t) : t;
      }
      const t = term('GW self-energy');
      const a = t.node('a', 0, 0, p.vertex), b = t.node('b', w, 0, p.vertex);
      stub(t, a, 0, 0, -stubLen(p.vertex), 'fermion', legOpts(p)); stub(t, b, w, 0, stubLen(p.vertex), 'fermion', legOpts(p));
      t.edge(a, b, p.line, { dressed: p.dressed, label: p.G, side: 'right', flip: flipOf(p.dir) });
      t.edge(a, b, 'screened', { bend: 0.45, label: p.W, ...momOpts(p, !flipOf(p.dir), { label: p.W }) });
      return t;
    }
  },
  fock: {
    title: 'Fock (exchange) self-energy', example: 'fock',
    params: { G: 'G^0', v: 'v', mom: '', momdir: '', momside: '', dir: 'right', width: 2.8, vertical: false, height: 0, inner: '', chi: '', vtop: '', momtop: '', ladder: 0, rung: 'screened', rungLabel: '', legLabel: '', vertex: 'dot', dressed: false, line: 'fermion' },
    build(p, env = {}) {
      checkStanding(p); checkMom(p);
      // a dressed line is G: the default's bare G^0 goes with it
      const G = p.dressed && p.G === 'G^0' ? 'G' : p.G;
      if (p.vertical) {
        const n = Math.max(0, Math.round(p.ladder || 0));
        const t = term(`Fock exchange self-energy, standing up${p.inner === 'chi' ? ', with a response function inside the interaction' : p.inner === 'bubble' ? `, a polarization bubble${n ? ` with ${plural(n, 'rung')}` : ''} in the interaction` : ''}`);
        standing(t, { ...p, G }, { boson: 'coulomb', label: p.v, innerLabel: p.chi || (p.inner === 'chi' ? '\\chi' : ''), unit: env.unit });
        return t;
      }
      const t = term('Fock exchange self-energy');
      const w = momWidth(p, env), a = t.node('a', 0, 0, p.vertex), b = t.node('b', w, 0, p.vertex);
      stub(t, a, 0, 0, -stubLen(p.vertex), 'fermion', legOpts(p)); stub(t, b, w, 0, stubLen(p.vertex), 'fermion', legOpts(p));
      t.edge(a, b, p.line, { dressed: p.dressed, label: G, side: 'right', flip: flipOf(p.dir) });
      t.edge(a, b, 'coulomb', { bend: 0.45, label: p.v, ...momOpts(p, !flipOf(p.dir), { label: p.v }) });
      return t;
    }
  },
  hartree: {
    title: 'Hartree (tadpole) self-energy', example: 'hartree',
    params: { G: 'G^0', v: 'v', interaction: 'coulomb', dressed: false, legLabel: '' },
    build(p) {
      const t = term('Hartree tadpole self-energy');
      const a = t.node('a', 0, 0), b = t.node('b', 0, 0.95), leg = p.legLabel ? { label: p.legLabel, below: true } : {};
      stub(t, a, 0, 0, -0.9, 'fermion', leg); stub(t, a, 0, 0, 0.9, 'fermion', leg);
      t.edge(b, a, p.interaction, { label: p.v });
      t.edge(b, b, 'fermion', { loop: true, dir: 'up', size: 1.05, dressed: p.dressed, label: p.dressed && p.G === 'G^0' ? 'G' : p.G });
      return t;
    }
  },
  sigma2: {
    title: 'Second-order self-energy with two boson lines: rainbow, crossed or sequential', example: 'sigma2 crossed',
    flags: { rainbow: { type: 'rainbow' }, crossed: { type: 'crossed' }, sequential: { type: 'sequential' } },
    params: { type: 'crossed', boson: 'phonon', dressed: false, label: '', dir: 'right' },
    build(p) {
      const t = term(`second-order ${p.type} self-energy`);
      const xs = [0, 1.15, 2.3, 3.45], v = xs.map((x, i) => t.node(`v${i}`, x, 0));
      stub(t, v[0], 0, 0, -stubLen('dot')); stub(t, v[3], 3.45, 0, stubLen('dot'));
      for (let i = 0; i < 3; i++) t.edge(v[i], v[i + 1], 'fermion', { dressed: p.dressed, flip: flipOf(p.dir) });
      const pairs = p.type === 'rainbow' ? [[0, 3, 0.4], [1, 2, 0.5]] : p.type === 'sequential' ? [[0, 1, 0.5], [2, 3, 0.5]] : [[0, 2, 0.5], [1, 3, 0.5]];
      pairs.forEach(([i, j, bend], k) => t.edge(v[i], v[j], p.boson, { bend, dressed: p.dressed, label: k === 0 ? p.label : '', ...(p.type === 'crossed' && k > 0 ? { over: true } : {}) }));
      return t;
    }
  },
  arcs: {
    title: 'Self-energy with interaction arcs above and below one electron line (such as the exchange diagrams of Hedin’s expansion)', example: 'arcs above="15 24" below="36"',
    params: { above: '', below: '', boson: 'screened', label: '', spacing: 0.9, dressed: false, line: 'fermion', vertex: 'dot', dir: 'right' },
    build(p) {
      const pairs = [];
      // with neither above= nor below=, the second-order exchange diagram
      const given = { above: String(p.above).trim(), below: String(p.below).trim() };
      if (!given.above && !given.below) given.above = '13 24';
      for (const side of ['above', 'below']) {
        for (const tok of given[side].split(/\s+/).filter(Boolean)) {
          const mm = /^(\d)-?(\d)$/.exec(tok);
          if (!mm) throw new Error(`${side}: "${tok}" is not two vertex numbers, as in 13 (vertices count from the left)`);
          const i = Math.min(+mm[1], +mm[2]), j = Math.max(+mm[1], +mm[2]);
          if (i === j || i < 1) throw new Error(`${side}: "${tok}" needs two different vertices, counted from 1`);
          pairs.push({ i, j, side });
        }
      }
      if (!pairs.length) throw new Error('arcs needs a pair of vertices at least, as in above="13 24"');
      const m = Math.max(...pairs.map((q) => q.j)), used = Array(m + 1).fill(0);
      for (const q of pairs) { used[q.i]++; used[q.j]++; }
      for (let k = 1; k <= m; k++) {
        if (!used[k]) throw new Error(`vertex ${k} has no arc: number the vertices 1 to ${m} from the left, each the end of one arc`);
        if (used[k] > 1) throw new Error(`vertex ${k} ends ${used[k]} arcs; each vertex ends one`);
      }
      const t = term(`self-energy with ${pairs.length} ${p.boson} arcs`);
      const xs = Array.from({ length: m }, (_, k) => k * p.spacing), v = xs.map((x, k) => t.node(`v${k + 1}`, x, 0, p.vertex));
      stub(t, v[0], 0, 0, -stubLen(p.vertex)); stub(t, v[m - 1], xs[m - 1], 0, stubLen(p.vertex));
      for (let k = 0; k + 1 < m; k++) t.edge(v[k], v[k + 1], p.line, { dressed: p.dressed, flip: flipOf(p.dir) });
      // arcs of one side that cross: the later one passes over the earlier
      pairs.forEach((q, k) => t.edge(v[q.i - 1], v[q.j - 1], p.boson, { bend: 0.33, [q.side]: true, over: true, ...(k === 0 && p.label ? { label: p.label } : {}) }));
      return t;
    }
  },

  // ---------------- polarization, RPA, excitons ----------------
  bubble: {
    title: 'Polarization bubble', example: 'bubble ext=photon vertex=current',
    params: { vertex: 'dot', left: '', right: '', ext: 'coulomb', extLabel: '', line: 'fermion', dressed: false, top: '', bottom: '', label: '', width: 1.6, ladder: 0, rung: 'screened', rungLabel: 'W', gamma: '', gcolor: 'c4' },
    build(p) {
      if (p.gamma) {
        // P = G G Γ: Hedin's vertex triangle closes the bubble on the right
        const t = term(`polarization bubble closed by the vertex ${p.gamma}`);
        const w = p.width, a = t.node('a', 0, 0, p.left || p.vertex), cx = w + TRI_R / 2, c = triEnds(cx, 0, 'right', 0.42);
        t.node('Gam', cx, 0, 'triangle', { label: p.gamma, dir: 'right', r: TRI_R, color: p.gcolor });
        t.edge(a, c.a, p.line, { bend: 0.32, dressed: p.dressed, label: p.top });
        t.edge(c.b, a, p.line, { bend: 0.32, dressed: p.dressed, label: p.bottom });
        if (p.ext !== 'none') {
          t.edge(t.pt(-0.9 - rimUnits(p.left || p.vertex), 0), a, p.ext, { label: p.extLabel });
          t.edge(c.tip, [cx + TRI_R + 0.9, 0], p.ext);
        }
        return t;
      }
      const n = Math.max(0, Math.round(p.ladder || 0));
      const t = term(`polarization bubble${n ? ` with ${plural(n, 'ladder rung')}` : ''}`);
      chain(t, { ...p, n: 1, link: p.ext, linkLabel: '' });
      return t;
    }
  },
  rpa: {
    title: 'RPA chain: bubbles joined by interaction lines', example: 'rpa n=3',
    params: { n: 3, link: 'coulomb', linkLabel: 'v', ext: '', extLabel: '', vertex: 'dot', line: 'fermion', dressed: false, ladder: 0, rung: 'screened', rungLabel: 'W', top: '', bottom: '', left: '', right: '', label: '' },
    build(p) {
      const n = Math.max(0, Math.round(p.ladder || 0));
      const t = term(`RPA chain of ${plural(Math.max(1, Math.round(p.n)), 'bubble')}${n ? ` with ${plural(n, 'ladder rung')}${Math.round(p.n) > 1 ? ' each' : ''}` : ''}`);
      chain(t, p);
      return t;
    }
  },
  exciton: {
    title: 'Polarization bubble with a ladder of screened interactions inside (excitons)', example: 'exciton n=3 vertex=charge ext=screened extLabel="W^T"',
    flags: { charge: { vertex: 'charge', ext: 'screened', extLabel: 'W' }, current: { vertex: 'current', ext: 'photon', extLabel: 'D' } },
    params: { n: 3, vertex: 'current', ext: 'photon', extLabel: 'D', rung: 'screened', rungLabel: 'W', line: 'fermion', dressed: false, top: '', bottom: '', left: '', right: '', bubbles: 1, link: '', linkLabel: '' },
    build(p) {
      const t = term(`exciton: polarization bubble with ${p.n} rungs ${p.rung}, ${p.vertex} vertices, external ${p.ext}`);
      chain(t, { ...p, ladder: p.n, n: p.bubbles, link: p.link || p.ext, linkLabel: p.linkLabel || p.extLabel });
      return t;
    }
  },

  // ---------------- two-particle ladders ----------------
  ladder: {
    title: 'Ladder: two lines exchanging n interactions', example: 'ladder n=4 pp rung=phonon',
    flags: { ph: { channel: 'ph' }, pp: { channel: 'pp' } },
    params: { n: 3, channel: 'ph', rung: 'screened', rungLabel: 'W', line: 'fermion', dressed: false, top: '', bottom: '', h: 1.3, spacing: 0.9, crossed: false },
    build(p) {
      const n = Math.max(1, Math.round(p.n)), y = p.h / 2, leg = 0.7;
      const t = term(`${p.crossed ? 'maximally crossed' : ''} ${p.channel} ladder with ${n} ${p.rung} rungs`.trim());
      const xs = Array.from({ length: n }, (_, i) => leg + i * p.spacing), xe = xs[n - 1] + leg;
      const top = [t.pt(0, y), ...xs.map((x, i) => t.node(`t${i + 1}`, x, y)), t.pt(xe, y)];
      const bot = [t.pt(0, -y), ...xs.map((x, i) => t.node(`u${i + 1}`, x, -y)), t.pt(xe, -y)];
      const mid = Math.min(1, n - 1) + (n > 2 ? Math.floor((n - 2) / 2) : 0);
      for (let i = 0; i <= n; i++) {
        t.edge(top[i], top[i + 1], p.line, { dressed: p.dressed, label: i === mid ? p.top : '' });
        if (p.channel === 'pp') t.edge(bot[i], bot[i + 1], p.line, { dressed: p.dressed, label: i === mid ? p.bottom : '', side: 'right' });
        else t.edge(bot[i + 1], bot[i], p.line, { dressed: p.dressed, label: i === mid ? p.bottom : '' });
      }
      for (let i = 1; i <= n; i++) t.edge(top[i], bot[p.crossed ? n + 1 - i : i], p.rung, { label: i === 1 && !p.crossed ? p.rungLabel : '', ...(p.crossed ? { marker: 'none' } : {}) });
      return t;
    }
  },
  crossed: {
    title: 'Maximally crossed ladder (Cooperon)', example: 'crossed n=4',
    flags: { ph: { channel: 'ph' }, pp: { channel: 'pp' } },
    params: { n: 4, channel: 'ph', rung: 'impurity', line: 'fermion', dressed: false, top: 'G^R', bottom: 'G^A', h: 1.6, spacing: 0.8 },
    build(p) { return TEMPLATES.ladder.build({ ...TEMPLATES.ladder.params, ...p, crossed: true, rungLabel: '' }); }
  },
  'vertex-correction': {
    title: 'Vertex correction: interactions across a three-point vertex (n of them, as a ladder or crossed)', example: 'vertex-correction ext=photon rung=phonon',
    flags: { crossed: { crossed: true }, ladder: { crossed: false } },
    params: { ext: 'photon', extLabel: '', rung: 'phonon', rungLabel: '', vertex: 'dot', line: 'fermion', dressed: false, n: 1, crossed: false },
    build(p) {
      const n = Math.max(1, Math.round(p.n)), k = 0.55 / 0.95, X = p.crossed && n > 1;
      const t = term(`vertex correction: ${p.ext} vertex with ${n === 1 ? `a ${p.rung}` : `${n} ${X ? 'crossed ' : ''}${p.rung} lines`} across the electron lines`);
      // first order: rung at x = 0.95; more rungs follow 0.55 apart along the two electron lines
      const xs = n === 1 ? [0.95] : X && n > 2 ? Array.from({ length: n }, (_, i) => 1.1 + i * 0.7) : Array.from({ length: n }, (_, i) => 0.85 + i * 0.5);
      const xe = xs[n - 1] + 0.8, ye = n === 1 ? 1.013 : k * xe, dl = { dressed: p.dressed };
      const v = t.node('v', 0, 0, p.vertex);
      t.edge(t.pt(-1.1, 0), v, p.ext, { label: p.extLabel });
      const A = xs.map((x, i) => t.node(n === 1 ? 'A' : `A${i + 1}`, x, k * x)), B = xs.map((x, i) => t.node(n === 1 ? 'B' : `B${i + 1}`, x, -k * x));
      // arrows on the legs only: the short pieces between the feet of the rungs stay clear of them
      const bare = { ...dl, arrow: 'none' };
      const up = [v, ...A]; for (let i = 0; i < up.length; i++) t.edge(up[i], i + 1 < up.length ? up[i + 1] : t.pt(xe, ye), p.line, i > 0 && i + 1 < up.length ? bare : dl);
      const down = [t.pt(xe, -ye), ...B.slice().reverse(), v]; for (let i = 0; i + 1 < down.length; i++) t.edge(down[i], down[i + 1], p.line, i > 0 && i < n ? bare : dl);
      // crossed rungs: each passes over the ones before it; the label goes outside, on the last rung
      for (let i = 0; i < n; i++) t.edge(A[i], B[X ? n - 1 - i : i], p.rung, { label: i === n - 1 ? p.rungLabel : '', ...(X ? { over: true } : {}) });
      return t;
    }
  },
  'hedin-vertex': {
    title: 'Hedin’s vertex equation: Γ = 1 + (δΣ/δG) G G Γ', example: 'hedin-vertex',
    params: { Gamma: '\\Gamma', kernel: '\\delta\\Sigma/\\delta G', ext: 'screened', line: 'fermion', dressed: true, color: 'muted', gcolor: 'c4' },
    build(p) {
      const eq = new Equation();
      eq.title = 'Hedin’s vertex equation';
      const dl = { dressed: p.dressed }, leg = 0.8;
      // Γ(12;3): W (or whatever ext names) arrives at the tip, the electron leaves at the top and returns at the bottom
      const gamma = (t, x) => {
        t.node('Gam', x, 0, 'triangle', { label: p.Gamma, dir: 'left', r: TRI_R, color: p.gcolor });
        const c = triEnds(x, 0, 'left');
        if (p.ext !== 'none') t.edge([x - TRI_R - 0.7, 0], c.tip, p.ext);
        return c;
      };
      const t1 = term(`vertex function ${p.Gamma}`), c1 = gamma(t1, 0);
      t1.edge(c1.a, [c1.side + leg, PAIR], p.line, { ...dl, arrowPos: shown(INSIDE, leg) });
      t1.edge([c1.side + leg, -PAIR], c1.b, p.line, { ...dl, arrowPos: shown(INSIDE, leg, false) });
      // the bare vertex: its two legs leave the dot steeply and level out, so that double lines part cleanly
      const t2 = term('bare vertex'), v = t2.node('v', 0, 0);
      if (p.ext !== 'none') t2.edge(t2.pt(-0.7, 0), v, p.ext);
      t2.edge(v, [0.9, PAIR], p.line, { ...dl, bend: 0.12 }); t2.edge([0.9, -PAIR], v, p.line, { ...dl, bend: 0.12 });
      const t3 = term(`${p.Gamma}, two electron lines, then the kernel ${p.kernel}`), c3 = gamma(t3, 0);
      const KW = 1.5, xK = c3.side + 1.0 + KW / 2, xo = xK + KW / 2 + leg;
      t3.node('K', xK, 0, 'box', { label: p.kernel, color: p.color, w: KW, h: BOX_H });
      t3.edge(c3.a, 'K.nw', p.line, { ...dl, arrowPos: shown(INSIDE, 1.0) }); t3.edge('K.sw', c3.b, p.line, { ...dl, arrowPos: shown(INSIDE, 1.0, false) });
      t3.edge('K.ne', [xo, PAIR], p.line, dl); t3.edge([xo, -PAIR], 'K.se', p.line, dl);
      return eq.add('', t1).add('=', t2).add('+', t3);
    }
  },
  box: {
    title: 'A four-point vertex with four legs', example: 'box label="\\Gamma" pp',
    flags: { ph: { channel: 'ph' }, pp: { channel: 'pp' } },
    params: { label: '\\Gamma', channel: 'ph', color: 'muted', line: 'fermion', dressed: true },
    build(p) {
      const t = term(`four-point vertex ${p.label} (${p.channel})`);
      vertex4(t, 'K', 0, 0, p, p.channel, { label: p.label });
      return t;
    }
  },

  // ---------------- two-particle equations ----------------
  bse: {
    title: 'Bethe–Salpeter equation L = L0 + L0 K L', example: 'bse',
    flags: { ph: { channel: 'ph' }, pp: { channel: 'pp' } },
    params: { L: 'L', K: 'K', channel: 'ph', line: 'fermion', dressed: true, color: 'muted' },
    build(p) {
      const ch = p.channel, eq = new Equation();
      eq.title = 'Bethe–Salpeter equation';
      const t1 = term(`two-particle correlation function ${p.L}`); vertex4(t1, 'L', 0, 0, p, ch, { label: p.L });
      const t2 = term('two independent propagators'); pair(t2, t2.pt(0, PAIR), t2.pt(1.6, PAIR), t2.pt(0, -PAIR), t2.pt(1.6, -PAIR), ch, p);
      const t3 = term(`${p.K} kernel followed by ${p.L}`);
      vertex4(t3, 'K', 1.2, 0, p, ch, { label: p.K, legs: 'nw sw', leg: 0.75 });
      vertex4(t3, 'L', 3.0, 0, p, ch, { label: p.L, legs: 'ne se' });
      pair(t3, 'K.ne', 'L.nw', 'K.se', 'L.sw', ch, p);
      return eq.add('', t1).add('=', t2).add('+', t3);
    }
  },
  tmatrix: {
    title: 'T-matrix equation T = V + V G G T', example: 'tmatrix',
    flags: { ph: { channel: 'ph' }, pp: { channel: 'pp' } },
    params: { T: 'T', V: 'V', interaction: 'coulomb', channel: 'pp', line: 'fermion', dressed: false, color: 'muted', G: '' },
    build(p) {
      const ch = p.channel, eq = new Equation();
      eq.title = 'T-matrix equation';
      const t1 = term(`T-matrix ${p.T}`); vertex4(t1, 'T', 0, 0, p, ch, { label: p.T });
      const t2 = term(`bare interaction ${p.V}`);
      const v1 = t2.node('v1', 0.8, PAIR), v2 = t2.node('v2', 0.8, -PAIR);
      pair(t2, t2.pt(0, PAIR), v1, t2.pt(0, -PAIR), v2, ch, p); pair(t2, v1, t2.pt(1.6, PAIR), v2, t2.pt(1.6, -PAIR), ch, p);
      t2.edge(v1, v2, p.interaction, { label: p.V });
      const t3 = term(`${p.V}, two propagators, then ${p.T}`);
      const w1 = t3.node('v1', 0.8, PAIR), w2 = t3.node('v2', 0.8, -PAIR);
      pair(t3, t3.pt(0, PAIR), w1, t3.pt(0, -PAIR), w2, ch, p);
      t3.edge(w1, w2, p.interaction, { label: p.V });
      vertex4(t3, 'T', 2.15, 0, p, ch, { label: p.T, legs: 'ne se' });
      pair(t3, w1, 'T.nw', w2, 'T.sw', ch, p, { top: p.G, bottom: p.G });
      return eq.add('', t1).add('=', t2).add('+', t3);
    }
  },
  parquet: {
    title: 'Parquet decomposition F = Λ + Φ_ph + Φ_ph̄ + Φ_pp', example: 'parquet',
    params: { F: 'F', Lambda: '\\Lambda', line: 'fermion', dressed: true, color: 'muted', captions: true },
    build(p) {
      const eq = new Equation();
      eq.title = 'Parquet equation';
      const tF = term(`full vertex ${p.F}`); vertex4(tF, 'F', 0, 0, p, 'ph', { label: p.F, leg: 0.6 });
      const tL = term(`fully irreducible vertex ${p.Lambda}`); vertex4(tL, 'L', 0, 0, p, 'ph', { label: p.Lambda, color: 'c5', leg: 0.6 });
      const horiz = (ch, gl, cap) => {
        const t = term(`${cap}: ${gl} and ${p.F} joined by two lines in the ${ch} channel`);
        vertex4(t, 'G', 0, 0, p, ch, { label: gl, legs: 'nw sw', leg: 0.6 });
        vertex4(t, 'F', 1.8, 0, p, ch, { label: p.F, legs: 'ne se', leg: 0.6 });
        pair(t, 'G.ne', 'F.nw', 'G.se', 'F.sw', ch, p);
        if (p.captions) t.caption = cap;
        return t;
      };
      const tph = horiz('ph', '\\Gamma_{ph}', '\\Phi_{ph}');
      const tpp = horiz('pp', '\\Gamma_{pp}', '\\Phi_{pp}');
      // transverse particle-hole channel: the two vertices stacked, joined by two vertical lines
      const tv = term(`Φ_ph̄: ${p.F} below the transverse-channel vertex, joined by two vertical lines`);
      const Y = 1.0, legX = BOX_W / 2 + 0.6;
      tv.node('G', 0, Y, 'box', { label: '\\Gamma_{\\overline{ph}}', color: p.color, w: BOX_W, h: BOX_H });
      tv.node('F', 0, -Y, 'box', { label: p.F, color: p.color, w: BOX_W, h: BOX_H });
      tv.edge(tv.pt(-legX, Y + PAIR), 'G.nw', p.line, { dressed: p.dressed });
      tv.edge('G.ne', tv.pt(legX, Y + PAIR), p.line, { dressed: p.dressed });
      tv.edge(tv.pt(-legX, -Y - PAIR), 'F.sw', p.line, { dressed: p.dressed, flip: true });
      tv.edge('F.se', tv.pt(legX, -Y - PAIR), p.line, { dressed: p.dressed, flip: true });
      tv.edge('G.sw', 'F.nw', p.line, { dressed: p.dressed });
      tv.edge('F.ne', 'G.se', p.line, { dressed: p.dressed });
      if (p.captions) tv.caption = '\\Phi_{\\overline{ph}}';
      return eq.add('', tF).add('=', tL).add('+', tph).add('+', tv).add('+', tpp);
    }
  },

  // ---------------- GT: the T matrix closed into a self-energy ----------------
  gt: {
    title: 'GT self-energy: a T matrix closed by G (ph: a ladder of W between opposite spins, the magnon; pp: a particle–particle ladder)', example: 'gt label="GT"',
    flags: { arch: { form: 'arch' }, box: { form: 'box' }, ladder: { form: 'ladder' }, ph: { channel: 'ph' }, pp: { channel: 'pp' } },
    params: { form: 'arch', n: -1, channel: 'ph', rung: 'screened', rungLabel: '', T: 'T', label: '', spin: true, up: '\\uparrow', down: '\\downarrow', numbers: false, legs: true, center: false, dressed: false, line: 'fermion', color: 'c5', dir: 'right' },
    build(p) {
      const form = p.form, ph = p.channel !== 'pp';
      if (!['arch', 'box', 'ladder'].includes(form)) throw new Error(`form=${form}: the forms are arch, box and ladder`);
      // n counts rungs: radial ones in the arch (3), all of them in the ladder (3), those before the box (0)
      const n = p.n >= 0 ? Math.round(p.n) : form === 'box' ? 0 : 3;
      if (form === 'ladder' && n < 2) throw new Error('a closed ladder needs n=2 rungs at least (n=3 is where the T matrix starts)');
      const t = term(`GT self-energy (${ph ? 'particle–hole' : 'particle–particle'} T matrix, ${form === 'arch' ? `drawn like GW with ${n + 2} rungs` : form === 'box' ? `as a box${n ? ` after ${n} rung${n > 1 ? 's' : ''}` : ''}` : `as a ladder of ${n} rungs`}), closed by G`);
      if (form === 'arch') gtArch(t, p, ph, n); else gtClosed(t, p, ph, n, form === 'box');
      // the external electron is the main line, on y = 0 (it lines up with GW); center puts the middle of the
      // ladder there instead, for equations between T matrices
      if (form !== 'arch' && !p.center) shiftY(t, PAIR);
      return p.dir === 'left' ? t : mirror(t);
    }
  },
  'gt-bse': {
    title: 'GT self-energy with the T matrix in the ladder approximation: T = WKWKW + WKT, each closed by G', example: 'gt-bse dir=left',
    flags: { ph: { channel: 'ph' }, pp: { channel: 'pp' } },
    params: { channel: 'ph', rung: 'screened', T: 'T', spin: false, up: '\\uparrow', down: '\\downarrow', numbers: true, legs: false, dressed: false, line: 'fermion', color: 'c5', dir: 'right' },
    build(p) {
      const eq = new Equation();
      eq.title = 'GT self-energy with the T matrix in the ladder approximation';
      const base = { ...TEMPLATES.gt.params, ...p, rungLabel: '', label: '', center: true };
      return eq.add('', TEMPLATES.gt.build({ ...base, form: 'box', n: 0 }))
        .add('=', TEMPLATES.gt.build({ ...base, form: 'ladder', n: 3 }))
        .add('+', TEMPLATES.gt.build({ ...base, form: 'box', n: 1 }));
    }
  },

  // ---------------- three and four particles: ladders of more lines ----------------
  nbody: {
    title: 'Ladder of any number of particle lines, with rungs between any two of them', example: 'nbody lines="e h e" rungs="12 23 13"',
    params: { lines: 'e h', rungs: '12 12 12', labels: 'auto', rung: 'screened', rungLabel: 'W', gap: 0.9, spacing: 0.8, line: 'fermion', dressed: false, dir: 'right' },
    build(p) { const t = term(`ladder of the lines ${p.lines} with rungs ${p.rungs}`); rails(t, p); return t; }
  },
  trion: {
    title: 'Trion: two electrons and a hole (X⁻), or two holes and an electron (X⁺), every pair interacting', example: 'trion',
    flags: { negative: { lines: 'e h e' }, positive: { lines: 'h e h' } },
    params: { lines: 'e h e', rungs: '12 23 13 12 23', labels: 'auto', rung: 'screened', rungLabel: 'W', gap: 0.85, spacing: 0.8, line: 'fermion', dressed: false, dir: 'right' },
    build(p) { const t = term(`${nameOf(p.lines)} with rungs ${p.rungs}`); rails(t, p); return t; }
  },
  biexciton: {
    title: 'Biexciton: two electrons and two holes, every pair interacting', example: 'biexciton',
    params: { lines: 'e h e h', rungs: '12+34 13 24 23 14 12+34', labels: 'auto', rung: 'screened', rungLabel: 'W', gap: 0.85, spacing: 0.8, line: 'fermion', dressed: false, dir: 'right' },
    build(p) { const t = term(`${nameOf(p.lines)} with rungs ${p.rungs}`); rails(t, p); return t; }
  }
};

export { ELLIPSIS };
