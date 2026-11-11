// Model -> SVG strings. Pure functions: no DOM, so the same code runs in a React server component, a
// remark plugin at build time, or the browser. Line weights and label sizes are fixed in px and only the
// geometry scales with `unit`, so every diagram on a site has the same strokes and type.

import * as G from './geometry.js';
import { cssColor, cssTextColor } from './theme.js';
import { parseLabel, measureRuns, labelSVG, labelText, labelHTML, escapeXML } from './text.js';
import { LINE_STYLES, STYLE_ALIASES, SHAPES, dressedOf, bareOf } from './model.js';

const THIN = 1.8, HEAVY = 3.2, DOUBLE = 2.2, AMP = 3.6, LABEL = 14, PAD = 6;
export const FONT_INLINE = "'Source Serif 4','STIX Two Text',Cambria,Georgia,'Times New Roman',serif";

const f = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? '0' : String(r); };
const f1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? '0' : String(r); };

class BBox {
  constructor() { this.x0 = Infinity; this.y0 = Infinity; this.x1 = -Infinity; this.y1 = -Infinity; }
  add(x, y, pad = 0) {
    if (!isFinite(x) || !isFinite(y)) return;
    this.x0 = Math.min(this.x0, x - pad); this.x1 = Math.max(this.x1, x + pad);
    this.y0 = Math.min(this.y0, y - pad); this.y1 = Math.max(this.y1, y + pad);
  }
  box(x0, y0, x1, y1) { this.add(x0, y0); this.add(x1, y1); }
  get empty() { return this.x0 === Infinity; }
}

// ---------- styles ----------
/** Resolve a style name (built-in, alias or user-defined) plus edge options into drawing parameters. */
export function resolveStyle(name, opts = {}, userStyles = {}) {
  let base = name, mods = {};
  for (let k = 0; k < 8 && userStyles[base]; k++) { const def = userStyles[base]; mods = { ...def.opts, ...mods }; base = def.base; }
  base = STYLE_ALIASES[base] || base;
  const all = { ...mods, ...opts };
  if (all.dressed) base = dressedOf(base);
  if (all.bare) base = bareOf(base);
  const st0 = LINE_STYLES[base];
  if (!st0) return null;
  const st = { ...st0, base };
  if (all.heavy) st.heavy = true;
  if (all.thin) st.heavy = false;
  if (all.double !== undefined) st.double = !!all.double;
  if (all.color) st.color = all.color;
  st.width = +all.width || (st.heavy ? HEAVY : THIN);
  // a heavy zigzag gets wider, taller teeth so that its V's stay open instead of filling into a band
  const heavyZig = st.pattern === 'zigzag' && st.heavy;
  st.amp = +all.amp || (st.pattern === 'coil' ? 4 : heavyZig ? 4.2 : AMP);
  st.wl = +all.wl || (st.pattern === 'zigzag' ? (heavyZig ? 9.5 : 7) : 9);
  if (all.dash) st.dash = String(all.dash);
  if (all.marker !== undefined) st.marker = all.marker;
  return st;
}

const DOUBLE_HEAD = 1.3, ARROW_CLEAR = 4.5 * 1.3;

/** Label clearance from a line's centre: one value per family, so labels of G and G^0 share a baseline. */
function clearance(st) {
  if (st.pattern === 'wave' || st.pattern === 'zigzag' || st.pattern === 'coil') return st.amp + st.width / 2;
  return DOUBLE + THIN / 2;
}

/** Parameters t (along polyline a, 0..1) where two polylines cross. */
function crossings(a, b) {
  const out = [], n = a.length - 1;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = a[i], [x2, y2] = a[i + 1];
    for (let j = 0; j < b.length - 1; j++) {
      const [x3, y3] = b[j], [x4, y4] = b[j + 1];
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) < 1e-9) continue;
      const ta = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den, tb = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
      if (ta >= 0 && ta <= 1 && tb >= 0 && tb <= 1) out.push((i + ta) / n);
    }
  }
  return out;
}

function halfWidth(st) {
  // mitered corners of a heavy zigzag reach about one stroke width past the tooth
  if (st.pattern === 'zigzag' && st.heavy) return st.amp + st.width * 1.1;
  if (st.pattern === 'wave' || st.pattern === 'zigzag' || st.pattern === 'coil') return st.amp + st.width / 2;
  return (st.double ? DOUBLE : 0) + st.width / 2;
}

// ---------- line patterns ----------
function poly(P, dec = f1) {
  let d = `M${dec(P[0][0])} ${dec(P[0][1])}`;
  for (let i = 1; i < P.length; i++) d += `L${dec(P[i][0])} ${dec(P[i][1])}`;
  return d;
}

function solidD(c, off) {
  if (c.type === 'line') {
    const [p0, p1] = G.sample(c, 1);
    const a = G.offset(p0, off), b = G.offset(p1, off);
    return `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
  }
  const sg = Math.sign(c.span) || 1, R = Math.max(0.1, c.R + off * sg);
  const pt = (th) => [c.cx + R * Math.cos(th), c.cy + R * Math.sin(th)];
  const segs = Math.abs(c.span) > Math.PI * 1.99 ? 2 : 1;
  const p0 = pt(c.th0);
  let d = `M${f(p0[0])} ${f(p0[1])}`;
  for (let k = 1; k <= segs; k++) {
    const p1 = pt(c.th0 + (c.span * k) / segs);
    const large = Math.abs(c.span / segs) > Math.PI ? 1 : 0, sweep = c.span > 0 ? 1 : 0;
    d += `A${f(R)} ${f(R)} 0 ${large} ${sweep} ${f(p1[0])} ${f(p1[1])}`;
  }
  return d;
}

function waveD(c, off, amp, wl) {
  const L = G.length(c), nw = Math.max(1, Math.round(L / wl)), N = Math.max(16, nw * 10);
  return poly(G.sample(c, N).map((p, i) => G.offset(p, off + amp * Math.sin((G.TAU * nw * i) / N))));
}

function zigzagD(c, off, amp, wl) {
  const L = G.length(c), nz = Math.max(2, Math.round(L / wl));
  const pts = G.sample(c, nz * 2);
  return poly(pts.map((p, i) => G.offset(p, off + (i === 0 || i === pts.length - 1 ? 0 : (i % 2 ? 1 : -1) * amp))));
}

// gluon: a helix seen from the side; loops form where the backward swing beats the forward drift.
// theta runs over n turns less half a turn, so the coil is mirror-symmetric: n arches and n - 1 open loops,
// both ends leave the axis on an arch, and the coil never runs past its ends
function coilD(c, amp, wl) {
  const L = G.length(c), n = Math.max(2, Math.round(L / wl)), Th = G.TAU * n - Math.PI;
  let kr = 1.1 * amp, lam = (L - 2 * kr) / Th;
  if (kr < 1.3 * lam) { kr = 1.3 * lam; lam = (L - 2 * kr) / Th; }
  const N = n * 24, P = [];
  for (let i = 0; i <= N; i++) {
    const th = (Th * i) / N;
    const u = lam * th + kr * (1 - Math.cos(th)), v = amp * Math.sin(th);
    const s = u / L, sc = Math.min(1, Math.max(0, s)), p = G.at(c, sc), d = G.tan(c, sc), ex = (s - sc) * L;
    P.push([p[0] + d[0] * ex + d[1] * v, p[1] + d[1] * ex - d[0] * v]);
  }
  return poly(P);
}

// dashes stretched so that a line starts and ends on a full dash
function dashFit(L, spec, scale = 1) {
  const [d, g] = spec.split(/[\s,]+/).map(Number);
  if (!(d > 0) || !(g >= 0)) return spec;
  // keep the dash length and put the rest into the gaps, so that every line of a style has the same rhythm
  // and starts and ends on a full dash; very short lines fall back to scaling both
  let k = Math.max(2, Math.round((L + g) / (d + g))), gap = (L - k * d) / (k - 1);
  while (k > 2 && gap < 0.75 * g) { k--; gap = (L - k * d) / (k - 1); }
  while (gap > 1.4 * g && (L - (k + 1) * d) / k >= 0.75 * g) { k++; gap = (L - k * d) / (k - 1); }
  let dd = d;
  if (gap < 0.75 * g) { const sc = L / (2 * d + g); dd = d * sc; gap = g * sc; }
  // a strand of a double line on an arc is longer or shorter than the centre line: the same dashes, scaled
  return `${f(dd * scale)} ${f(gap * scale)}`;
}
const dotFit = (L) => `0 ${f(L / Math.max(2, Math.round(L / 4.2)))}`;

function arrowHead(x, y, tx, ty, color, scale = 1) {
  const ang = (Math.atan2(ty, tx) * 180) / Math.PI;
  return `<path d="M5 0L-4 -4.5L-2 0L-4 4.5Z" transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})${scale !== 1 ? ` scale(${f(scale)})` : ''}" style="fill:${color}"/>`;
}

// ---------- labels ----------
function placeLabel(out, bb, runs, px, py, nx, ny, gap, color, size = LABEL) {
  const m = measureRuns(runs, size), h = m.bottom - m.top;
  const ext = Math.abs(nx) * (m.w / 2) + Math.abs(ny) * (h / 2);
  const cx = px + nx * (gap + ext), cy = py + ny * (gap + ext);
  const base = cy - (m.top + m.bottom) / 2;
  out.push(labelSVG(runs, cx, base, { size, color }));
  bb.box(cx - m.w / 2, base + m.top, cx + m.w / 2, base + m.bottom);
}

const DIRS = { up: 90, n: 90, above: 90, top: 90, down: -90, s: -90, below: -90, bottom: -90, left: 180, w: 180, right: 0, e: 0, ne: 45, nw: 135, se: -45, sw: -135 };
/** Direction word or degrees (counter-clockwise from east) -> screen unit vector. */
export function dirVec(d, fallback = 90) {
  let deg = typeof d === 'number' ? d : d == null || d === '' ? fallback : DIRS[d] ?? parseFloat(d);
  if (!isFinite(deg)) deg = fallback;
  const r = (deg * Math.PI) / 180;
  return [Math.cos(r), -Math.sin(r)];
}

/**
 * Signed bend (the arc's height divided by its chord; positive = left of the written direction a -> b) of a line:
 *   bend=0.42            ratio; its sign counts from the written direction
 *   bulge=1.2 above      height in diagram units, on the side of the page that above/below names
 * s is the page side resolved from above/below (+1 = left of a -> b, -1 = right, 0 = none given).
 * Returns { bend, error }.
 */
export function bendOf(o, a, b, u, s = 0) {
  if (o.height != null) return { bend: 0, error: 'height= is now bulge=, measured on the page: write bulge=1.2 above (or below)' };
  if (o.toward != null) return { bend: 0, error: 'toward= is now a bare above or below, as in "arc above" or "bulge=1.2 below"' };
  const c = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (c < 1e-9) return { bend: 0 };
  let v;
  if (o.bulge != null) {
    if (o.bend != null) return { bend: 0, error: 'bulge= and bend= (or bend, arc) all set the size of the arc: keep one' };
    const h = +o.bulge;
    if (!isFinite(h)) return { bend: 0, error: 'bulge expects a number of units, as in bulge=1.2 above' };
    // bulge never takes its side from the order the ends are written in
    if (!s) return { bend: 0, error: `bulge=${o.bulge} needs above or below, as in bulge=${o.bulge} above` };
    if (h < 0) return { bend: 0, error: `bulge=${o.bulge}: ${o.above ? 'above' : 'below'} already gives the side, so drop the minus sign` };
    if (h * u > c / 2 + 1e-6) {
      return { bend: 0, error: `bulge=${o.bulge} is more than half the ${+(c / u).toFixed(2)}-unit distance between the ends, so the arc would be wider than the gap; use arc for a half circle, a smaller bulge, or bend= for more than a half circle` };
    }
    v = (h * u) / c;
  } else if (o.bend != null) {
    v = +o.bend;
    if (!isFinite(v)) return { bend: 0, error: 'bend expects a number: the arc’s height divided by the distance between its ends' };
  } else return { bend: 0 };
  if (s && v) {
    if (v < 0) return { bend: 0, error: `bend=${o.bend}: ${o.above ? 'above' : 'below'} already gives the side, so drop the minus sign` };
    v *= s;
  }
  return { bend: v };
}

// ---------- the term ----------
export function renderTerm(term, ctx) {
  const u = ctx.unit, uid = ctx.uid, styles = ctx.styles || {}, errors = ctx.errors;
  const lopt = { scriptItalic: ctx.scriptItalic };
  const bb = new BBox();
  const lines = [], marks = [], nodes = [], labels = [], defs = [];
  const err = (msg, line) => errors.push({ message: msg, line });

  // vertices in px
  const N = new Map();
  for (const nd of term.nodes.values()) {
    const sh = SHAPES[nd.shape];
    if (!sh) { err(`unknown vertex shape "${nd.shape}"`, nd.line); continue; }
    const o = nd.opts || {}, x = nd.x * u, y = -nd.y * u;
    let shape;
    if (sh.kind === 'box') shape = { kind: 'rect', x, y, w: (+o.w || sh.wu) * u, h: (+o.h || sh.hu) * u };
    else shape = { kind: 'circle', x, y, r: o.r != null ? +o.r * u : sh.ru ? sh.ru * u : sh.r };
    N.set(nd.name, { ...nd, px: x, py: y, sh, shape, o });
  }
  // a double line is wider than a plain dot: where one ends on a dot, every dot of the term grows so that
  // both strands end on its rim, and all dots keep one size
  const doubleAtDot = term.edges.some((e) => {
    const st = resolveStyle(e.style, e.opts || {}, styles);
    return st && st.double && [e.from.node, e.to.node].some((nm) => nm && N.get(nm)?.sh.kind === 'dot');
  });
  if (doubleAtDot) for (const n of N.values()) if (n.sh.kind === 'dot' && n.o.r == null) n.shape.r = Math.max(n.shape.r, DOUBLE + THIN / 2 + 1.2);

  const NAMED = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1], c: [0, 0], center: [0, 0] };
  const CORNERS = { ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };
  const anchorPoint = (n, a, line) => {
    let d = NAMED[a];
    if (!d) {
      const deg = parseFloat(a);
      if (!isFinite(deg)) { err(`unknown anchor ".${a}" on vertex "${n.name}"`, line); d = [0, 0]; }
      else d = [Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)];
    }
    if (!d[0] && !d[1]) return [n.px, n.py];
    if (n.shape.kind === 'rect' && NAMED[a]) return [n.px + (d[0] * n.shape.w) / 2, n.py + (d[1] * n.shape.h) / 2];
    const L = Math.hypot(d[0], d[1]);
    return G.boundary(n.shape, d[0] / L, d[1] / L);
  };
  // The corner names of a box (nw, ne, sw, se) are ports: points on a face, 0.2 units in from that corner.
  // A line that arrives more horizontally enters the side face, one that arrives more vertically the top or
  // bottom face, so single and double lines meet the face squarely instead of grazing the rounded corner.
  const port = (n, a, otherEnd) => {
    const [sx, sy] = CORNERS[a], hw = n.shape.w / 2, hh = n.shape.h / 2;
    const cx = n.px + sx * hw, cy = n.py + sy * hh;
    const inset = Math.min(0.2 * u, hw / 2, hh / 2);
    const horizontal = Math.abs(otherEnd[0] - cx) >= Math.abs(otherEnd[1] - cy);
    return horizontal ? [cx, cy - sy * inset] : [cx - sx * inset, cy];
  };
  const resolve = (ep, line) => {
    if (ep.node) {
      const n = N.get(ep.node);
      if (!n) { err(`unknown vertex "${ep.node}"`, line); return null; }
      if (ep.anchor && n.shape.kind === 'rect' && CORNERS[ep.anchor]) {
        const [sx, sy] = CORNERS[ep.anchor];
        return { p: [n.px + (sx * n.shape.w) / 2, n.py + (sy * n.shape.h) / 2], shape: null, node: n, port: ep.anchor };
      }
      if (ep.anchor) return { p: anchorPoint(n, ep.anchor, line), shape: null, node: n };
      // small dots do not stop plain lines (they meet at the centre), but patterned, dashed and double lines stop at
      // the rim, so that their pattern starts where it can be seen
      const rim = n.sh.kind === 'dot' || n.sh.kind === 'square' ? n.shape : null;
      return { p: [n.px, n.py], shape: n.sh.trim ? n.shape : null, rim, node: n };
    }
    if (ep.at) return { p: [ep.at[0] * u, -ep.at[1] * u], shape: null };
    return null;
  };
  const place = (ep, other) => ({ p: [other.p[0] + ep.rel[0] * u, other.p[1] - ep.rel[1] * u], shape: null });

  // lines
  const desc = [];
  const crossables = []; // sampled patterned lines drawn so far
  for (const e of term.edges) {
    const o = e.opts || {};
    const st = resolveStyle(e.style, o, styles);
    if (!st) { err(`unknown line style "${e.style}"`, e.line); continue; }
    let A = e.from.rel ? null : resolve(e.from, e.line);
    let B = e.to.rel ? null : resolve(e.to, e.line);
    if (e.from.rel && e.to.rel) { err('a line needs a vertex or a point at one end at least; both ends are relative +(dx,dy)', e.line); continue; }
    if (e.from.rel && B) A = place(e.from, B);
    if (e.to.rel && A) B = place(e.to, A);
    if (!A || !B) continue;
    // box ports take their face from where the other end lies; a relative end then follows the port
    const Ap = A.p, Bp = B.p;
    if (A.port) { A.p = port(A.node, A.port, Bp); if (e.to.rel) B = place(e.to, A); }
    if (B.port) { B.p = port(B.node, B.port, Ap); if (e.from.rel) A = place(e.from, B); }

    const isLoop = o.loop || (A.node && A.node === B.node && !e.from.anchor && !e.to.anchor);
    // above / below name a side of the page, whatever order the ends are written in
    if (o.above && o.below) err('a line is above or below, not both', e.line);
    const pageW = o.above ? 'above' : o.below ? 'below' : null;
    let curve, bend = 0, s = 0;
    if (isLoop) {
      if (pageW && o.dir != null) err(`${pageW} already gives the loop's direction: drop dir=${o.dir}`, e.line);
      if (o.bulge != null || o.bend != null) err("a loop's size is size=, its diameter in units", e.line);
      if (pageW && o.size != null && !(+o.size > 0)) err(`size=${o.size}: ${pageW} already gives the loop's side, so the size must be positive`, e.line);
      if (o.side === 'left' || o.side === 'right') { if (pageW) err(`${pageW} places the loop; put its label with side=in or side=out`, e.line); }
      const [dx, dy] = dirVec(pageW ? (pageW === 'above' ? 'up' : 'down') : o.dir, 90);
      const sz = (+o.size || 1) * u;
      if (A.shape) {
        // a loop on a disk, blob or box starts inside it and is trimmed, so it enters the shape symmetrically
        const b = G.boundary(A.shape, dx, dy), r = Math.hypot(b[0] - A.p[0], b[1] - A.p[1]);
        const p = [A.p[0] + dx * 0.55 * r, A.p[1] + dy * 0.55 * r];
        curve = G.trim(G.loop(p, Math.atan2(dy, dx), sz + 0.45 * r, !!o.cw), A.shape, A.shape) || G.loop(b, Math.atan2(dy, dx), sz, !!o.cw);
      } else curve = G.loop(A.p, Math.atan2(dy, dx), sz, !!o.cw);
    } else {
      if (pageW) {
        // resolved once against the chord: centres after anchors, box ports and relative ends, before trimming
        const cdx = B.p[0] - A.p[0], cdy = B.p[1] - A.p[1];
        if (Math.hypot(cdx, cdy) < 1e-9) err(`${pageW}: this line has no length`, e.line);
        else if (Math.abs(cdy) > Math.abs(cdx) + 1e-6) err(`${pageW}: this line is steeper than 45°, so it has no above or below; use side=left or side=right, counted along the written direction (written upwards, left is the page's left)`, e.line);
        else s = (pageW === 'above' ? 1 : -1) * Math.sign(cdx);
      }
      const bo = bendOf(o, A.p, B.p, u, s);
      if (bo.error) err(bo.error, e.line);
      bend = bo.bend;
      if (s && !bend) {
        // on a straight line a page word places the label, so there has to be one
        if (!o.label && !o.mom) err(`${pageW} places the label of a straight line, and this line has none; to curve it write arc ${pageW}, bend ${pageW} or bulge=1 ${pageW}`, e.line);
        if (o.side) err(`${pageW} already places the label: drop side=${o.side}`, e.line);
      }
      if (bend && s && (o.side === 'left' || o.side === 'right')) err(`${pageW} places the arc; put its label with side=in or side=out`, e.line);
      if (!bend && (o.side === 'in' || o.side === 'out')) err(`side=${o.side} is for arcs and loops; a straight line has no inside`, e.line);
      const soft = st.pattern !== 'solid' || st.double;
      // a double line is trimmed where its strands (not its centre line) meet the rim
      const rimOf = (X) => (X.shape || !soft || !X.rim ? X.shape : { ...X.rim, r: st.double ? Math.sqrt(Math.max(0, X.rim.r ** 2 - DOUBLE ** 2)) + 0.2 : X.rim.r + 0.4 });
      curve = G.trim(G.arc(A.p, B.p, bend), rimOf(A), rimOf(B));
      if (!curve) continue;
    }
    const L = G.length(curve);
    // arrows and labels sit halfway between two vertices, even when only one end was trimmed;
    // with a free end (a leg), halfway along what is drawn
    const bothVertices = !isLoop && A.node && B.node && !A.node.anon && !B.node.anon && curve.t1 != null;
    const tMid = bothVertices ? Math.min(0.9, Math.max(0.1, (0.5 - curve.t0) / (curve.t1 - curve.t0))) : 0.5;
    const col = cssColor(st.color);
    const fade = o.faint ? ';opacity:.35' : o.opacity ? `;opacity:${+o.opacity}` : '';
    const hw = halfWidth(st);

    const patterned = st.pattern === 'wave' || st.pattern === 'zigzag' || st.pattern === 'coil';
    if (patterned) {
      const mine = G.sample(curve, 48).map((p) => [p.x, p.y]);
      for (const other of crossables) {
        for (const t of crossings(mine, other.pts)) {
          const pt = G.at(curve, t), near = (q) => Math.hypot(pt[0] - q[0], pt[1] - q[1]) < 10;
          if (near(mine[0]) || near(mine[mine.length - 1]) || near(other.pts[0]) || near(other.pts[other.pts.length - 1])) continue;
          const dt = 11 / L;
          lines.push(`<path d="${solidD(G.sub(curve, Math.max(0, t - dt), Math.min(1, t + dt)), 0)}" style="stroke:${cssColor('surface')};stroke-width:${f(2 * st.amp + st.width + 3)}"/>`);
        }
      }
      crossables.push({ pts: mine });
    }
    if (st.underlay === 'dash') {
      // the dashes under a field line follow the wave: one dash per period, centred where the wave rises through the axis
      const per = L / Math.max(1, Math.round(L / st.wl));
      lines.push(`<path d="${solidD(curve, 0)}" style="stroke:${col};stroke-width:1.2;stroke-dasharray:${f(per / 2)} ${f(per / 2)};stroke-dashoffset:${f(per / 4)}${fade}"/>`);
    }
    for (const off of st.double ? [-DOUBLE, DOUBLE] : [0]) {
      let d, extra = '';
      const strand = curve.type === 'circ' ? (Math.abs(curve.span) * Math.max(0.1, curve.R + off * (Math.sign(curve.span) || 1))) / L : 1;
      switch (st.pattern) {
        case 'dash': d = solidD(curve, off); extra = `;stroke-dasharray:${dashFit(L, st.dash || '5 4', strand)}`; break;
        case 'dot': {
          const aMid = (o.arrow || (st.arrow ? 'fwd' : 'none')) !== 'none' && o.arrowAt !== 'end' && o.arrowAt !== 'start';
          if (aMid) {
            const tc = o.arrowPos != null ? +o.arrowPos : tMid, dt = 8 / L;
            for (const [t0, t1] of [[0, tc - dt], [tc + dt, 1]]) {
              if (t1 - t0 <= 0.02) continue;
              const part = G.sub(curve, Math.max(0, t0), Math.min(1, t1));
              lines.push(`<path d="${solidD(part, off)}" style="stroke:${col};stroke-width:${f(st.width)};stroke-dasharray:${dotFit(G.length(part))}${fade}"/>`);
            }
            continue;
          }
          d = solidD(curve, off); extra = `;stroke-dasharray:${dotFit(L)}`; break;
        }
        case 'wave': d = waveD(curve, off, st.amp, st.wl); break;
        case 'zigzag': d = zigzagD(curve, off, st.amp, st.wl); break;
        case 'coil': d = coilD(curve, st.amp, st.wl); break;
        default: d = solidD(curve, off);
      }
      const join = st.pattern === 'zigzag' && st.heavy ? ';stroke-linejoin:miter;stroke-miterlimit:3' : '';
      lines.push(`<path d="${d}" style="stroke:${col};stroke-width:${f(st.width)}${extra}${join}${fade}"/>`);
    }
    for (const p of G.sample(curve, 24)) bb.add(p.x, p.y, hw + 0.5);

    // arrow
    // explicit arrows come from the DSL (-> <- --); templates set flip to reverse a fermion's default arrow
    const arrow = o.arrow || (st.arrow ? (o.flip ? 'back' : 'fwd') : 'none');
    let arrowMid = null;
    if (arrow === 'fwd' || arrow === 'back') {
      const sgn = arrow === 'back' ? -1 : 1;
      if (o.arrowAt === 'end' || o.arrowAt === 'start') {
        const t = (o.arrowAt === 'end') === (sgn === 1) ? 1 : 0;
        const p = G.at(curve, t), d = G.tan(curve, t), tx = d[0] * sgn, ty = d[1] * sgn;
        marks.push(arrowHead(p[0] - tx * 5, p[1] - ty * 5, tx, ty, col));
      } else {
        const t = o.arrowPos != null ? +o.arrowPos : tMid;
        const p = G.at(curve, t), d = G.tan(curve, t), tx = d[0] * sgn, ty = d[1] * sgn;
        // a double line needs a head that clears both strands, but a short leg should not be all arrow
        const head = st.double ? Math.min(DOUBLE_HEAD, Math.max(1.15, L / 24)) : 1;
        arrowMid = { t, half: ARROW_CLEAR };
        marks.push(arrowHead(p[0] - tx * 0.5, p[1] - ty * 0.5, tx, ty, col, head));
      }
    }
    if (st.marker === 'cross') {
      const p = G.at(curve, tMid), r = 4.2;
      marks.push(`<path d="M${f(p[0] - r)} ${f(p[1] - r)}L${f(p[0] + r)} ${f(p[1] + r)}M${f(p[0] - r)} ${f(p[1] + r)}L${f(p[0] + r)} ${f(p[1] - r)}" style="stroke:${cssColor('ink')};stroke-width:1.8;fill:none" stroke-linecap="round"/>`);
    }

    // label: the page side of above/below; else outside of an arc or a loop (side=in puts it inside);
    // else the left of the written direction (side=right for the other side)
    const convex = Math.sign(bend) || 1;
    let side = o.side === 'right' ? -1 : o.side === 'left' ? 1 : o.side === 'out' ? convex : o.side === 'in' ? -convex : s || convex;
    const tl = o.pos != null ? +o.pos : tMid;
    const pm = G.at(curve, tl), dm = G.tan(curve, tl);
    let nx = dm[1] * side, ny = -dm[0] * side;
    if (isLoop && o.side !== 'left' && o.side !== 'right') {
      const L2 = Math.hypot(pm[0] - curve.cx, pm[1] - curve.cy) || 1, k = o.side === 'in' ? -1 : 1;
      nx = (k * (pm[0] - curve.cx)) / L2; ny = (k * (pm[1] - curve.cy)) / L2;
    }
    const near = arrowMid && Math.abs(tl - arrowMid.t) * L < 12 ? arrowMid.half : 0;
    if (o.label) placeLabel(labels, bb, parseLabel(o.label, lopt), pm[0], pm[1], nx, ny, o.dist != null ? +o.dist : Math.max(clearance(st), near) + 4, cssTextColor(st.color));

    // crystal-momentum arrow beside the line
    if (o.mom) {
      // opposite the label; on a straight line with no label, a page word places the arrow itself
      const ms = o.momside === 'left' ? 1 : o.momside === 'right' ? -1 : s && !bend && !o.label ? s : -side;
      const off = (Math.max(hw, near) + 6) * ms, half = Math.min(0.24, 15 / Math.max(L, 1));
      let pts = G.sample(G.sub(curve, Math.max(0, tl - half), Math.min(1, tl + half)), 12).map((p) => G.offset(p, off));
      if (o.momdir === 'back') pts = pts.reverse();
      const a = pts[pts.length - 2], b = pts[pts.length - 1], dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const tx = (b[0] - a[0]) / dl, ty = (b[1] - a[1]) / dl;
      pts[pts.length - 1] = [b[0] - tx * 3, b[1] - ty * 3];
      marks.push(`<path d="${poly(pts, f)}" style="stroke:${cssColor('muted')};stroke-width:1.2;fill:none" stroke-linecap="round"/>`);
      marks.push(arrowHead(b[0] - tx * 4, b[1] - ty * 4, tx, ty, cssColor('muted'), 0.8));
      pts.forEach((p) => bb.add(p[0], p[1], 2));
      const mx = dm[1] * ms, my = -dm[0] * ms;
      placeLabel(labels, bb, parseLabel(o.mom, lopt), pm[0], pm[1], isLoop ? -nx : mx, isLoop ? -ny : my, Math.abs(off) + 4, cssColor('ink'), 12.5);
    }
    desc.push(`${st.base}${o.label ? ' ' + labelText(o.label) : ''}${isLoop ? ' loop' : bend ? ' arc' : ''}`);
  }

  // vertices on top of the lines (blobs have an opaque base that hides line ends)
  let hatchId = null;
  const surface = cssColor('surface');
  for (const n of N.values()) {
    const { sh, shape, o } = n, x = n.px, y = n.py;
    const c = cssColor(o.color || sh.color);
    const fade = o.faint ? ' opacity="0.35"' : '';
    const r = shape.r;
    switch (sh.kind) {
      case 'dot': nodes.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="fill:${c}"${fade}/>`); break;
      case 'square': nodes.push(`<rect x="${f(x - r)}" y="${f(y - r)}" width="${f(2 * r)}" height="${f(2 * r)}" style="fill:${c}"${fade}/>`); break;
      case 'disk':
        nodes.push(`<g${fade}><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="fill:${surface}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="fill:${c};fill-opacity:.55;stroke:${c};stroke-width:1.3"/></g>`);
        break;
      case 'hatched':
        if (!hatchId) {
          hatchId = `${uid}-hatch`;
          defs.push(`<pattern id="${hatchId}" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0.85" y1="0" x2="0.85" y2="3.4" style="stroke:${cssColor('muted')};stroke-width:1.2"/></pattern>`);
        }
        nodes.push(`<g${fade}><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="fill:${surface}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${hatchId})" style="stroke:${c};stroke-width:1.4"/></g>`);
        break;
      case 'open': nodes.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="fill:${surface};stroke:${c};stroke-width:1.6"${fade}/>`); break;
      case 'cross': case 'otimes': {
        const k = sh.kind === 'otimes' ? r * 0.62 : r;
        const ring = sh.kind === 'otimes' ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="fill:${surface};stroke:${c};stroke-width:1.5"/>` : '';
        nodes.push(`<g${fade}>${ring}<path d="M${f(x - k)} ${f(y - k)}L${f(x + k)} ${f(y + k)}M${f(x - k)} ${f(y + k)}L${f(x + k)} ${f(y - k)}" style="stroke:${c};stroke-width:1.7;fill:none" stroke-linecap="round"/></g>`);
        break;
      }
      case 'blob':
        nodes.push(`<g${fade}><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="fill:${surface}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" style="fill:${c};fill-opacity:.13;stroke:${c};stroke-width:1.6"/></g>`);
        break;
      case 'box': {
        const { w, h } = shape;
        const rect = (style) => `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="3" style="${style}"/>`;
        nodes.push(`<g${fade}>${rect(`fill:${surface}`)}${rect(`fill:${c};fill-opacity:.13;stroke:${c};stroke-width:1.6`)}</g>`);
        break;
      }
      case 'tri': {
        const [dx, dy] = dirVec(o.dir, 0);
        const pts = [0, 120, 240].map((a) => { const t = (a * Math.PI) / 180; return [x + r * (dx * Math.cos(t) - dy * Math.sin(t)), y + r * (dx * Math.sin(t) + dy * Math.cos(t))]; });
        const pp = pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');
        nodes.push(`<g${fade}><polygon points="${pp}" style="fill:${surface}"/><polygon points="${pp}" style="fill:${c};fill-opacity:.13;stroke:${c};stroke-width:1.6;stroke-linejoin:round"/></g>`);
        break;
      }
      default: break;
    }
    if (sh.kind === 'box') bb.box(x - shape.w / 2, y - shape.h / 2, x + shape.w / 2, y + shape.h / 2);
    else if (sh.kind !== 'none') bb.add(x, y, r + 1);
    else bb.add(x, y, 0);

    if (o.label) {
      const runs = parseLabel(o.label, lopt);
      const inside = (sh.kind === 'blob' || sh.kind === 'box' || sh.kind === 'tri') && (!o.pos || o.pos === 'center');
      const sc = o.color || sh.color;
      const tc = sc === 'muted' || sc === 'ink' ? cssColor('ink') : cssTextColor(sc);
      if (inside) {
        const m = measureRuns(runs, LABEL);
        labels.push(labelSVG(runs, x, y - (m.top + m.bottom) / 2, { size: LABEL, color: tc }));
      } else {
        const [dx, dy] = dirVec(o.pos || 'below', -90);
        const gap = sh.kind === 'box' ? Math.abs(dx) * shape.w / 2 + Math.abs(dy) * shape.h / 2 + 4 : (sh.kind === 'none' ? 0 : r) + 4;
        placeLabel(labels, bb, runs, x, y, dx, dy, gap, sh.kind === 'none' || sh.kind === 'dot' ? cssColor('ink') : tc, o.size ? +o.size : 13);
      }
    }
  }

  // free text
  for (const t of term.texts) {
    const o = t.opts || {}, size = +o.size || LABEL, runs = parseLabel(t.text, lopt);
    if (o.upright) runs.forEach((r) => { r.it = false; });
    const m = measureRuns(runs, size), x = t.x * u, y = -t.y * u, anchor = o.anchor || 'middle';
    const base = y - (m.top + m.bottom) / 2;
    labels.push(labelSVG(runs, x, base, { size, anchor, color: o.color ? cssTextColor(o.color) : cssColor('ink') }));
    const x0 = anchor === 'start' ? x : anchor === 'end' ? x - m.w : x - m.w / 2;
    bb.box(x0, base + m.top, x0 + m.w, base + m.bottom);
  }

  // drafting grid (the `grid` statement): whole units under everything, with each vertex's name
  let gridSVG = '';
  if (ctx.grid && !bb.empty) {
    const gx0 = Math.floor(bb.x0 / u), gx1 = Math.ceil(bb.x1 / u);
    const gyTop = Math.ceil(-bb.y0 / u), gyBot = Math.floor(-bb.y1 / u);
    const X = (i) => i * u, Y = (j) => -j * u, muted = cssColor('muted'), teal = cssColor('c4-text');
    const num = (v) => String(v).replace('-', '−');
    const g = [];
    // hairlines in the muted ink, so they never read as part of a line; y = 0 a little stronger
    for (let i = gx0; i <= gx1; i++) g.push(`<path d="M${f(X(i))} ${f(Y(gyTop))}V${f(Y(gyBot))}" style="stroke:${muted};stroke-width:0.6;opacity:0.3"/>`);
    for (let j = gyBot; j <= gyTop; j++) g.push(`<path d="M${f(X(gx0))} ${f(Y(j))}H${f(X(gx1))}" style="stroke:${muted};stroke-width:${j === 0 ? 1 : 0.6};opacity:${j === 0 ? 0.55 : 0.3}"/>`);
    const tick = (x, y, t, anchor, col = muted) => `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" font-size="9.5" style="fill:${col};font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${t}</text>`;
    for (let i = gx0; i <= gx1; i++) g.push(tick(X(i), Y(gyBot) + 12, num(i), 'middle'));
    for (let j = gyBot; j <= gyTop; j++) g.push(tick(X(gx0) - 5, Y(j) + 3.5, j === 0 ? 'y=0' : num(j), 'end'));
    for (const n of N.values()) {
      if (n.anon) continue;
      const ox = n.shape.kind === 'rect' ? n.shape.w / 2 : (n.shape.r || 0) * 0.7, oy = n.shape.kind === 'rect' ? n.shape.h / 2 : (n.shape.r || 0) * 0.7;
      g.push(tick(n.px + ox + 3, n.py - oy - 3, escapeXML(n.name), 'start', teal));
    }
    gridSVG = `<g class="feyn-grid">${g.join('')}</g>`;
    bb.box(X(gx0) - 28, Y(gyTop) - 2, X(gx1) + 2, Y(gyBot) + 15);
  }

  if (bb.empty) bb.box(0, -10, 20, 10);
  const x0 = Math.floor(bb.x0 - PAD), y0 = Math.floor(bb.y0 - PAD);
  const W = Math.ceil(bb.x1 + PAD) - x0, H = Math.ceil(bb.y1 + PAD) - y0;
  const inner = (defs.length ? `<defs>${defs.join('')}</defs>` : '') + gridSVG +
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${lines.join('')}</g>` + marks.join('') + nodes.join('') + labels.join('');
  const description = term.title || (desc.length ? `${desc.join(', ')}` : 'empty diagram');
  return { inner, x0, y0, W, H, axis: -y0, desc: description, caption: term.caption };
}

export function svgWrap(r, desc, cls = 'feyn-svg') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="${r.x0} ${r.y0} ${r.W} ${r.H}" width="${r.W}" height="${r.H}" role="img" aria-label="${escapeXML(desc)}" style="font-family:var(--feyn-font-text,${FONT_INLINE});max-width:100%;height:auto;overflow:visible">${r.inner}</svg>`;
}

// Equations are laid out as text: each term is an inline box whose diagram axis (y = 0) sits on the
// math axis of the line (0.27 em above the baseline, where = and + are centred). Rows that wrap
// align on their own, and an operator stays with the term after it.
const OP_PX = 22, MATH_AXIS = 0.27 * OP_PX, CAP_H = 21;
const OP_STYLE = 'color:var(--feyn-muted,#5a6477);margin:0 12px';
const CAP_STYLE = 'position:absolute;left:50%;bottom:0;transform:translateX(-50%);white-space:nowrap;font-size:12.5px;line-height:1.35;color:var(--feyn-muted,#5a6477)';

/** Responsive HTML for an equation. */
export function equationHTML(results, ops) {
  const depths = results.filter((r) => !r.ellipsis && r.caption).map((r) => r.H - r.axis);
  const pairs = results.map((r, i) => {
    const op = ops[i] ? `<span class="feyn-op" style="${OP_STYLE}">${escapeXML(ops[i])}</span>` : '';
    let body;
    if (r.ellipsis) body = '<span class="feyn-op" style="color:var(--feyn-muted,#5a6477)">⋯</span>';
    else {
      const below = r.H - r.axis;
      // a captioned term is padded down to the deepest captioned term at most 24 px deeper than itself, so
      // captions of terms of similar depth share a line, and an unusually deep term does not strand the others'
      const near = Math.max(below, ...depths.filter((d) => d - below <= 24));
      const pad = r.caption ? near - below + CAP_H : 0;
      const cap = r.caption ? `<span class="feyn-cap" style="${CAP_STYLE}">${labelHTML(r.caption, { text: true })}</span>` : '';
      body = `<span class="feyn-term" style="display:inline-block;position:relative;font-size:0;line-height:0;vertical-align:${f(MATH_AXIS - below)}px${pad ? `;padding-bottom:${f(pad)}px` : ''}">${svgWrap(r, r.desc)}${cap}</span>`;
    }
    // pairs touch (atomic inlines still wrap between them); a diagram set beside another with | gets a fixed gap
    const gap = !ops[i] && i > 0 ? 'margin:8px 0 8px 28px' : 'margin:8px 0';
    return `<span class="feyn-pair" style="display:inline-block;white-space:nowrap;${gap}">${op}${body}</span>`;
  });
  return `<div class="feyn-eq" style="text-align:center;font-family:var(--feyn-font-text,${FONT_INLINE});font-size:${OP_PX}px;line-height:1.1;max-width:100%;overflow-x:auto;overflow-y:hidden">${pairs.join('')}</div>`;
}

/** One SVG for a whole equation (for export); the operators sit on the shared axis y = 0. */
export function equationSVG(results, ops) {
  let x = 0, y0 = Infinity, y1 = -Infinity;
  const parts = [];
  const opText = (t) => {
    const w = 22 * 0.62 * [...t].length + 8;
    parts.push(`<text x="${f(x + w / 2)}" y="${f(MATH_AXIS)}" text-anchor="middle" font-size="22" style="fill:var(--feyn-muted,#5a6477)">${escapeXML(t)}</text>`);
    x += w + 4; y0 = Math.min(y0, -16); y1 = Math.max(y1, 10);
  };
  results.forEach((r, i) => {
    if (ops[i]) opText(ops[i]);
    if (r.ellipsis) { opText('⋯'); return; }
    parts.push(`<g transform="translate(${f(x - r.x0)} 0)">${r.inner}</g>`);
    x += r.W + 4; y0 = Math.min(y0, r.y0); y1 = Math.max(y1, r.y0 + r.H);
  });
  const W = Math.ceil(x), H = Math.ceil(y1 - y0);
  return { inner: parts.join(''), x0: 0, y0: Math.floor(y0), W, H };
}
