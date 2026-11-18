// Expand a ```feynman block into plain statements: every vertex, line and text that its templates stand for,
// written out by hand. render(expand(source)) draws the same picture as render(source), so the result is a
// starting point for a diagram that no template quite covers.
//
//   expand('fock')  ->  'a at (0, 0)\nb at (2.8, 0)\n(-0.575, 0) -- a fermion\n...'

import { parse } from './parse.js';
import { resolveStyle, renderTerm } from './render.js';

// numbers as the language reads them: no exponents, at most four decimals, no -0
const num = (v) => {
  const r = Math.round(+v * 1e4) / 1e4;
  return Object.is(r, -0) || Math.abs(r) < 1e-9 ? '0' : String(r);
};
const point = (x, y) => `(${num(x)}, ${num(y)})`;
const quote = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
// a value that reads back as the same token: numbers and booleans bare, a plain word bare, any other text quoted
// (so that the text "0" or "true" stays text)
const value = (v) => (typeof v === 'number' ? num(v) : typeof v === 'boolean' ? String(v)
  : /^[A-Za-z_][\w-]*$/.test(String(v)) && v !== 'true' && v !== 'false' ? String(v) : quote(v));

// operators an equation line can start with; any other operator text is written op "..."
const BARE_OPS = new Set(['=', '+', '−', '-', '×', '·', '≈', '≃', '≡', '∝', '→', '⇒', ':=']);

const EDGE_FLAGS = ['dressed', 'bare', 'heavy', 'thin', 'faint', 'over', 'loop', 'cw'];
const EDGE_VALUES = ['bend', 'bulge', 'side', 'dist', 'pos', 'dir', 'size', 'mom', 'momside', 'momdir', 'mompos', 'color', 'width', 'amp', 'wl', 'dash', 'opacity', 'marker'];
const NODE_VALUES = ['pos', 'color', 'r', 'w', 'h', 'dir', 'size'];

function endpoint(term, ep) {
  if (ep.at) return point(ep.at[0], ep.at[1]);
  if (ep.rel) return `+${point(ep.rel[0], ep.rel[1])}`;
  const n = term.nodes.get(ep.node);
  // points a template invents (the free ends of legs, the joints of a line) are written in place
  if (n && n.anon) return point(n.x, n.y);
  return ep.anchor ? `${ep.node}.${ep.anchor}` : ep.node;
}

function vertexLine(n) {
  const o = n.opts || {}, parts = [`${n.name} at ${point(n.x, n.y)}`];
  if (n.shape && n.shape !== 'dot') parts.push(n.shape);
  if (o.label) parts.push(quote(o.label));
  for (const k of NODE_VALUES) if (o[k] != null && o[k] !== '') parts.push(`${k}=${value(o[k])}`);
  if (o.faint) parts.push('faint');
  return parts.join(' ');
}

function lineLine(term, e, styles) {
  const o = e.opts || {};
  const st = resolveStyle(e.style, o, styles);
  // the arrow a template set with flip, or a style's own arrow, becomes the direction of the operator
  const arrow = o.arrow || (st && st.arrow ? (o.flip ? 'back' : 'fwd') : 'none');
  const op = arrow === 'fwd' ? '->' : arrow === 'back' ? '<-' : '--';
  const parts = [`${endpoint(term, e.from)} ${op} ${endpoint(term, e.to)}`, e.style];
  for (const f of EDGE_FLAGS) if (o[f]) parts.push(f);
  if (o.double === true) parts.push('double');
  if (o.above) parts.push('above');
  if (o.below) parts.push('below');
  for (const k of EDGE_VALUES) {
    const v = o[k];
    if (v == null || v === '' || v === false || (k === 'bend' && !+v)) continue;
    parts.push(`${k}=${value(v)}`);
  }
  if (o.arrowAt === 'end' || o.arrowAt === 'start') parts.push(`arrow=${o.arrowAt}`);
  if (o.arrowPos != null) parts.push(`arrowpos=${num(o.arrowPos)}`);
  if (o.label) parts.push(quote(o.label));
  return parts.join(' ');
}

function textLine(x) {
  const o = x.opts || {}, parts = [`text ${quote(x.text)} at ${point(x.x, x.y)}`];
  for (const k of ['size', 'color', 'anchor']) if (o[k] != null && o[k] !== '') parts.push(`${k}=${value(o[k])}`);
  if (o.upright) parts.push('upright');
  return parts.join(' ');
}

/** The statements of one term: its vertices, then its lines in drawing order, then its texts. */
function termLines(term, styles) {
  const out = [];
  for (const n of term.nodes.values()) if (!n.anon) out.push(vertexLine(n));
  for (const e of term.edges) out.push(lineLine(term, e, styles));
  for (const x of term.texts) out.push(textLine(x));
  // a template's title (the accessible description) is left out, as it would go stale once the copy is changed;
  // a title the author wrote is kept
  if (term.caption) out.push(`caption ${quote(term.caption)}`);
  if (term.titleGiven && term.title) out.push(`title ${quote(term.title)}`);
  return out;
}

/**
 * Write a block out by hand. Returns the expanded source; throws if the block has errors. The statements that
 * set up a whole block (unit, grid, style) are kept; templates become their vertices, lines and texts.
 */
export function expand(source, options = {}) {
  // the site's styles (as given to the remark plugin) are known while expanding, but not written out
  // the site's unit too (a fence's unit=), which a template may size itself by, as a render would
  const doc = parse(source, { styles: options.styles, unit: options.unit });
  // the errors a render would report too (an unknown vertex is only found when the lines are drawn)
  const errors = [...doc.errors];
  for (const it of doc.items) if (it.term) renderTerm(it.term, { unit: doc.unit || 40, uid: 'expand', styles: doc.styles, errors });
  if (errors.length) throw new Error(errors.map((e) => `${e.line ? `line ${e.line}: ` : ''}${e.message}`).join('\n'));
  const out = [];
  if (doc.unitGiven) out.push(`unit ${num(doc.unit)}`);
  if (doc.grid) out.push('grid');
  for (const [name, def] of Object.entries(doc.styles)) {
    if (def.line == null) continue;
    const extra = Object.entries(def.opts).map(([k, v]) => (v === true ? k : `${k}=${value(v)}`));
    out.push(['style', name, '=', def.base, ...extra].join(' '));
  }
  doc.items.forEach((it, i) => {
    // the operator before a term goes on a line of its own; | sets a term beside the last, \\ starts a new row
    const op = it.op ? (BARE_OPS.has(it.op) ? it.op : `op ${quote(it.op)}`) : '';
    const head = [it.br ? '\\\\' : '', op || (i > 0 && !it.br ? '|' : '')].filter(Boolean).join(' ');
    if (it.ellipsis) { out.push(head ? `${head} ...` : '...'); return; }
    if (head) out.push(head);
    out.push(...termLines(it.term, doc.styles));
  });
  return out.join('\n');
}

/** The names of the templates a block uses (none for a block written by hand). */
export function templatesIn(source, options = {}) {
  return parse(source, { styles: options.styles }).templates;
}
