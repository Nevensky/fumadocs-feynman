// The diagram model shared by the DSL parser and the templates. Coordinates are in diagram units with y
// pointing up; one unit is `unit` px (40 by default). The main line of a diagram sits on y = 0, which is
// the height at which the operators of an equation are set.

// ---------- line styles ----------
// pattern: solid | dash | dot | wave | zigzag | coil ; double: two parallel strokes ; heavy: thick stroke
export const LINE_STYLES = {
  fermion: { pattern: 'solid', color: 'electron', arrow: true },
  fermion2: { pattern: 'solid', color: 'electron', arrow: true, double: true },
  phonon: { pattern: 'zigzag', color: 'phonon' },
  phonon2: { pattern: 'zigzag', color: 'phonon', heavy: true },
  photon: { pattern: 'wave', color: 'photon' },
  photon2: { pattern: 'wave', color: 'photon', heavy: true },
  coulomb: { pattern: 'dash', color: 'photon' },
  screened: { pattern: 'dash', color: 'photon', double: true },
  field: { pattern: 'wave', color: 'photon', underlay: 'dash' },
  field2: { pattern: 'wave', color: 'photon', underlay: 'dash', heavy: true },
  gluon: { pattern: 'coil', color: 'c5' },
  gluon2: { pattern: 'coil', color: 'c5', heavy: true },
  scalar: { pattern: 'dash', color: 'ink' },
  scalar2: { pattern: 'dash', color: 'ink', double: true },
  ghost: { pattern: 'dot', color: 'ink', arrow: true },
  plain: { pattern: 'solid', color: 'ink' },
  plain2: { pattern: 'solid', color: 'ink', double: true },
  boson: { pattern: 'wave', color: 'ink' },
  boson2: { pattern: 'wave', color: 'ink', heavy: true },
  impurity: { pattern: 'dash', color: 'muted', marker: 'cross' }
};
export const STYLE_ALIASES = { electron: 'fermion', electron2: 'fermion2', hole: 'fermion', higgs: 'scalar', interaction: 'coulomb' };
const DRESSED = { fermion: 'fermion2', phonon: 'phonon2', photon: 'photon2', coulomb: 'screened', field: 'field2', gluon: 'gluon2', scalar: 'scalar2', plain: 'plain2', boson: 'boson2' };
const BARE = Object.fromEntries(Object.entries(DRESSED).map(([k, v]) => [v, k]));

export const dressedOf = (s) => DRESSED[STYLE_ALIASES[s] || s] || s;
export const bareOf = (s) => BARE[STYLE_ALIASES[s] || s] || s;

// ---------- vertex shapes ----------
// size: px for the small glyphs, units (u) for blobs, boxes and triangles
export const SHAPES = {
  dot: { kind: 'dot', r: 3, color: 'ink' },
  charge: { kind: 'dot', r: 3.4, color: 'ink' },
  current: { kind: 'dot', r: 3.6, color: 'c4' },
  none: { kind: 'none', r: 0 },
  point: { kind: 'none', r: 0 },
  disk: { kind: 'disk', r: 6.5, color: 'muted', trim: true },
  hatched: { kind: 'hatched', r: 8, color: 'muted', trim: true },
  open: { kind: 'open', r: 4.5, color: 'ink', trim: true },
  cross: { kind: 'cross', r: 4.5, color: 'ink' },
  otimes: { kind: 'otimes', r: 6.5, color: 'ink', trim: true },
  square: { kind: 'square', r: 3.4, color: 'ink' },
  blob: { kind: 'blob', ru: 0.42, color: 'muted', trim: true },
  bubble: { kind: 'blob', ru: 0.42, color: 'electron', trim: true },
  box: { kind: 'box', wu: 0.9, hu: 1.3, color: 'muted', trim: true },
  triangle: { kind: 'tri', ru: 0.46, color: 'muted', trim: true }
};

/** Endpoint spec: 'a', 'a.nw', [x, y] (absolute, units) or { rel: [dx, dy] } (relative to the other end). */
export function endpoint(e) {
  if (Array.isArray(e)) return { at: e };
  if (e && typeof e === 'object') return e;
  const s = String(e);
  const k = s.indexOf('.');
  return k > 0 ? { node: s.slice(0, k), anchor: s.slice(k + 1) } : { node: s };
}

export class Term {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.texts = [];
    this.caption = null;
    this.title = null; // set by templates: used for the aria description
    this._anon = 0;
  }
  /** Add a vertex. shape: a key of SHAPES. opts: { label, pos, color, r, w, h, dir, faint } */
  node(name, x, y, shape = 'dot', opts = {}) {
    this.nodes.set(name, { name, x, y, shape, opts });
    return name;
  }
  /** An invisible point (ends of external legs). Its name starts with '#', which the language cannot write. */
  pt(x, y) {
    const name = `#p${this._anon++}`;
    this.nodes.set(name, { name, x, y, shape: 'none', opts: {}, anon: true });
    return name;
  }
  /**
   * Add a line. opts.arrow: 'fwd' (from -> to), 'back' (to -> from) or 'none'; left out, fermion-like
   * styles get 'fwd' and the others none.
   * opts: { arrow, label, side, dist, pos, bend, loop, dir, size, cw, mom, momside, momdir, color, width, amp, wl, faint, dressed, bare }
   */
  edge(from, to, style = 'fermion', opts = {}) {
    this.edges.push({ from: endpoint(from), to: endpoint(to), style, opts: { ...opts } });
    return this;
  }
  text(str, x, y, opts = {}) {
    this.texts.push({ text: str, x, y, opts });
    return this;
  }
}

/** An equation: terms joined by operators. ops[i] is set before terms[i] ('' for none). */
export class Equation {
  constructor() { this.terms = []; this.ops = []; this.title = null; }
  add(op, term) { this.ops.push(op || ''); this.terms.push(term); return this; }
}

/** Placeholder term drawn as an ellipsis (⋯). */
export const ELLIPSIS = { ellipsis: true };
