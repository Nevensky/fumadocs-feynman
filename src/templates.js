// Templates: whole diagrams (or equations) from one line, e.g.  ladder n=4 pp  or  exciton vertex=charge.
// Each template lists its options with defaults (the default fixes the option's type) and builds a Term
// or an Equation in diagram units, main line on y = 0. Bare words in `flags` set several options at once.

import { Term, Equation, ELLIPSIS, SHAPES } from './model.js';

const term = (title) => { const t = new Term(); t.title = title; return t; };
const flipOf = (dir) => dir === 'left';

// Four-point vertices: boxes BOX_W x BOX_H units. Their corner ports sit 0.2 units in from each corner
// (see render.js), that is PAIR above and below the centre, so two-particle lines run at y = ±PAIR.
const BOX_W = 0.9, BOX_H = 1.3, PAIR = BOX_H / 2 - 0.2;

// external stubs show the same length beyond every kind of vertex: STUB units past its rim (40 px per unit assumed
// for the small glyphs, whose size is fixed in px)
const STUB = 0.5;
const rimUnits = (shape) => { const sh = SHAPES[shape] || SHAPES.dot; return sh.ru ?? (sh.r || 0) / 40; };
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

/** Chain of n bubbles joined by `link` lines, with `ext` legs at both ends. */
function chain(t, p) {
  const n = Math.max(1, Math.round(p.n));
  const w = p.ladder ? 0.95 * (Math.round(p.ladder) + 1) : 1.6, gap = 1.0, leg = 0.9;
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
    params: { dressed: false, phonon: 'phonon', vertex: 'dot', G: '', F: '', dir: 'right', width: 2.8 },
    build(p) {
      const t = term('Fan–Migdal self-energy');
      const w = p.width, a = t.node('a', 0, 0, p.vertex), b = t.node('b', w, 0, p.vertex);
      stub(t, a, 0, 0, -stubLen(p.vertex)); stub(t, b, w, 0, stubLen(p.vertex));
      t.edge(a, b, 'fermion', { dressed: p.dressed, label: p.G || (p.dressed ? 'G' : 'G^0'), side: 'right', flip: flipOf(p.dir) });
      t.edge(a, b, p.phonon, { dressed: p.dressed, bend: 0.42, label: p.F || (p.dressed ? 'F' : 'F^0') });
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
    title: 'GW self-energy: an electron line spanned by the screened interaction', example: 'gw',
    params: { dressed: true, G: 'G', W: 'W', vertex: 'dot', dir: 'right', width: 2.8 },
    build(p) {
      const t = term('GW self-energy');
      const w = p.width, a = t.node('a', 0, 0, p.vertex), b = t.node('b', w, 0, p.vertex);
      stub(t, a, 0, 0, -stubLen(p.vertex)); stub(t, b, w, 0, stubLen(p.vertex));
      t.edge(a, b, 'fermion', { dressed: p.dressed, label: p.G, side: 'right', flip: flipOf(p.dir) });
      t.edge(a, b, 'screened', { bend: 0.45, label: p.W });
      return t;
    }
  },
  fock: {
    title: 'Fock (exchange) self-energy', example: 'fock',
    params: { G: 'G^0', v: 'v', dir: 'right', width: 2.8 },
    build(p) {
      const t = term('Fock exchange self-energy');
      const w = p.width, a = t.node('a', 0, 0), b = t.node('b', w, 0);
      stub(t, a, 0, 0, -stubLen('dot')); stub(t, b, w, 0, stubLen('dot'));
      t.edge(a, b, 'fermion', { label: p.G, side: 'right', flip: flipOf(p.dir) });
      t.edge(a, b, 'coulomb', { bend: 0.45, label: p.v });
      return t;
    }
  },
  hartree: {
    title: 'Hartree (tadpole) self-energy', example: 'hartree',
    params: { G: 'G^0', v: 'v', interaction: 'coulomb', dressed: false },
    build(p) {
      const t = term('Hartree tadpole self-energy');
      const a = t.node('a', 0, 0), b = t.node('b', 0, 0.95);
      stub(t, a, 0, 0, -0.9); stub(t, a, 0, 0, 0.9);
      t.edge(b, a, p.interaction, { label: p.v });
      t.edge(b, b, 'fermion', { loop: true, dir: 'up', size: 1.05, dressed: p.dressed, label: p.G });
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
      pairs.forEach(([i, j, bend], k) => t.edge(v[i], v[j], p.boson, { bend, dressed: p.dressed, label: k === 0 ? p.label : '' }));
      return t;
    }
  },

  // ---------------- polarization, RPA, excitons ----------------
  bubble: {
    title: 'Polarization bubble', example: 'bubble ext=photon vertex=current',
    params: { vertex: 'dot', left: '', right: '', ext: 'coulomb', extLabel: '', line: 'fermion', dressed: false, top: '', bottom: '', label: '', width: 1.6, ladder: 0, rung: 'screened', rungLabel: 'W' },
    build(p) {
      const t = term(`polarization bubble${p.ladder ? ` with ${p.ladder} ladder rungs` : ''}`);
      chain(t, { ...p, n: 1, link: p.ext, linkLabel: '' });
      return t;
    }
  },
  rpa: {
    title: 'RPA chain: bubbles joined by interaction lines', example: 'rpa n=3',
    params: { n: 3, link: 'coulomb', linkLabel: 'v', ext: '', extLabel: '', vertex: 'dot', line: 'fermion', dressed: false, ladder: 0, rung: 'screened', rungLabel: 'W', top: '', bottom: '', left: '', right: '', label: '' },
    build(p) {
      const t = term(`RPA chain of ${p.n} bubbles${p.ladder ? ` with ${p.ladder} ladder rungs each` : ''}`);
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
    title: 'First-order vertex correction', example: 'vertex-correction ext=photon rung=phonon',
    params: { ext: 'photon', extLabel: '', rung: 'phonon', rungLabel: '', vertex: 'dot', line: 'fermion', dressed: false },
    build(p) {
      const t = term(`vertex correction: ${p.ext} vertex with a ${p.rung} across the electron lines`);
      const v = t.node('v', 0, 0, p.vertex), A = t.node('A', 0.95, 0.55), B = t.node('B', 0.95, -0.55);
      t.edge(t.pt(-1.1, 0), v, p.ext, { label: p.extLabel });
      t.edge(v, A, p.line, { dressed: p.dressed }); t.edge(A, t.pt(1.75, 1.013), p.line, { dressed: p.dressed });
      t.edge(t.pt(1.75, -1.013), B, p.line, { dressed: p.dressed }); t.edge(B, v, p.line, { dressed: p.dressed });
      t.edge(A, B, p.rung, { label: p.rungLabel });
      return t;
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
  }
};

export { ELLIPSIS };
