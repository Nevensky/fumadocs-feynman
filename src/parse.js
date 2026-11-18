// The text language of a ```feynman block.
//
//   % comment (also //)                       statements end at a newline or ';'
//   a at 0,0                                  vertex (shape: dot, current, disk, blob, box, ... ; "label")
//   S at 2,0 blob "\Sigma"                   a self-energy blob
//   a -> b fermion "G_0"                      line with an arrow from a to b; <- reverses it, -- has none
//   a -- b phonon dressed bend=0.4 "F"        options: bend, dressed, side, dist, pos, mom="k", color, ...
//   a -- a phonon loop dir=up size=1.2        self-loop
//   (-0.6,0) -- a fermion                     inline points; +(dx,dy) is relative to the other end
//   leg a left fermion in                     external leg (in / out set the arrow)
//   K.nw -> L.sw fermion                      anchors on blobs and boxes: n s e w ne nw se sw or an angle
//   style D = photon                          name your own line styles
//   fan-migdal dressed                        a template (see templates.js)
//   = / + / − / × / ... at the start of a line split an equation into terms; op "= −i" for any text;
//   | sets the next diagram beside the last with no operator
//   caption "Fan–Migdal"                      caption under the current term

import { Term, Equation, ELLIPSIS, LINE_STYLES, STYLE_ALIASES, SHAPES } from './model.js';
import { TEMPLATES } from './templates.js';
import { dirVec } from './render.js';

const OP_RE = /^(:=|=|\+(?!\()|−|-(?![->\d.])|×|·|≈|≃|≡|∝|→|⇒|\|)(\s*)(.*)$/;
const ELLIPSIS_RE = /^(\.\.\.|…|⋯|\\cdots|\\ldots)$/;
const EDGE_FLAGS = new Set(['dressed', 'bare', 'heavy', 'thin', 'double', 'bend', 'arc', 'loop', 'cw', 'ccw', 'faint', 'over']);
const NODE_FLAGS = new Set(['faint']);

function stripComment(line) {
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i - 1] !== '\\') inStr = !inStr;
    if (inStr) continue;
    if (c === '%') return line.slice(0, i);
    if (c === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

function splitStatements(line) {
  const out = [];
  let inStr = false, depth = 0, cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i - 1] !== '\\') inStr = !inStr;
    if (!inStr) { if (c === '(') depth++; if (c === ')') depth--; }
    if (c === ';' && !inStr && depth <= 0) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

const TOKEN_RE = new RegExp([
  '("(?:[^"\\\\]|\\\\.)*")', // 1 string
  '(\\+?\\(\\s*-?[\\d.]+\\s*,\\s*-?[\\d.]+\\s*\\))', // 2 point (x,y) or +(dx,dy)
  '(<-|->|--)', // 3 line operator
  '([A-Za-z_][\\w]*(?:-[A-Za-z0-9_]\\w*)*)=("(?:[^"\\\\]|\\\\.)*"|\\+?\\([^)]*\\)|[^\\s;]+)', // 4,5 key=value
  '(-?\\d*\\.?\\d+(?:e-?\\d+)?)(?![\\w.])', // 6 number
  "([A-Za-z_\\u0370-\\u03ff][\\w.\\u0370-\\u03ff′']*(?:-[A-Za-z0-9_\\u0370-\\u03ff][\\w.\\u0370-\\u03ff′']*)*)", // 7 word
  '(,)', // 8 comma
  '(\\S)' // 9 anything else
].map((s) => `\\s*${s}`).join('|'), 'y');

const unquote = (s) => s.slice(1, -1).replace(/\\"/g, '"');
const parsePoint = (s) => {
  const rel = s.startsWith('+');
  const [x, y] = s.replace(/^\+?\(|\)$/g, '').split(',').map((v) => parseFloat(v));
  return rel ? { rel: [x, y] } : { at: [x, y] };
};
const value = (v) => {
  if (v.startsWith('"')) return unquote(v);
  if (/^\+?\(/.test(v)) return parsePoint(v);
  if (/^-?\d*\.?\d+(e-?\d+)?$/.test(v)) return parseFloat(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
};

export function tokenize(stmt) {
  const toks = [];
  TOKEN_RE.lastIndex = 0;
  let m;
  while (TOKEN_RE.lastIndex < stmt.length && (m = TOKEN_RE.exec(stmt))) {
    if (m[1] !== undefined) toks.push({ k: 'str', v: unquote(m[1]) });
    else if (m[2] !== undefined) toks.push({ k: 'pt', v: parsePoint(m[2]) });
    else if (m[3] !== undefined) toks.push({ k: 'op', v: m[3] });
    else if (m[4] !== undefined) toks.push({ k: 'kv', key: m[4], v: value(m[5]) });
    else if (m[6] !== undefined) toks.push({ k: 'num', v: parseFloat(m[6]) });
    else if (m[7] !== undefined) toks.push({ k: 'word', v: m[7] });
    else if (m[8] !== undefined) toks.push({ k: 'comma' });
    else if (m[9] !== undefined) toks.push({ k: 'other', v: m[9] });
    if (/^\s*$/.test(stmt.slice(TOKEN_RE.lastIndex))) break;
  }
  return toks;
}

// ---------- option checking ----------
const EDGE_KEYS = ['label', 'side', 'dist', 'pos', 'bend', 'bulge', 'dir', 'size', 'mom', 'momside', 'momdir', 'color', 'width', 'amp', 'wl', 'dash', 'arrow', 'arrowpos', 'marker', 'opacity'];
const NODE_KEYS = ['label', 'pos', 'color', 'r', 'w', 'h', 'dir', 'size'];
const TEXT_KEYS = ['size', 'color', 'anchor'];
// keys of the unreleased draft: an error that names the replacement, never silently ignored
const RETIRED = {
  height: 'height= is now bulge=, measured on the page: write bulge=1.2 above (or below)',
  toward: 'toward= is now a bare above or below, as in "arc above" or "bulge=1.2 below"'
};
const PAGE_HINT = { above: 'above', top: 'above', up: 'above', below: 'below', bottom: 'below', down: 'below' };
// a style says how a line looks; where it goes and what it says belong to the line itself
const STYLE_LOOKS = new Set(['dressed', 'bare', 'heavy', 'thin', 'double', 'faint', 'color', 'width', 'amp', 'wl', 'dash', 'marker', 'opacity']);

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function unknownKey(key, keys, what) {
  let best = null, bd = 3;
  for (const k of keys) { const dd = editDistance(key, k); if (dd < bd) { bd = dd; best = k; } }
  return `unknown option "${key}=" on ${what}${best ? `; did you mean ${best}=?` : ` (options: ${keys.join(', ')})`}`;
}

/** Check one key=value of a line or leg and store it in opts. Returns an error message or null. */
function edgeOption(key, v, opts) {
  if (RETIRED[key]) return RETIRED[key];
  if (key === 'above' || key === 'below') return `${key} is a bare word: write ${key}, not ${key}=${v}`;
  if (!EDGE_KEYS.includes(key)) return unknownKey(key, EDGE_KEYS, 'a line');
  if (key === 'side' && !['left', 'right', 'in', 'out'].includes(v)) {
    const w = PAGE_HINT[v];
    return `side=${v}: side is left or right of the written direction, or in or out of a curve${w ? `; to put the label ${w} a straight line, write the bare word ${w}` : ''}`;
  }
  if (key === 'momside' && !['left', 'right'].includes(v)) return `momside=${v}: momside is left or right of the written direction`;
  if (key === 'pos' && !(typeof v === 'number' && v >= 0 && v <= 1)) {
    const w = PAGE_HINT[v];
    return `pos=${v}: on a line, pos= is a fraction along it, from 0 to 1${w ? `; to put the label ${w} the line, write the bare word ${w}` : ''}`;
  }
  if (key === 'bulge' && typeof v !== 'number') return `bulge expects a number of units, as in bulge=1.2 above`;
  if (key === 'bend' && typeof v !== 'number') return 'bend expects a number: the height of the arc divided by the distance between its ends (0.5 is a half circle)';
  if (key === 'marker' && v !== 'none' && v !== 'cross') return `marker=${v}: a line's marker is cross or none`;
  if (key === 'arrowpos') {
    if (!(typeof v === 'number' && v >= 0 && v <= 1)) return `arrowpos=${v}: where the arrow sits, as a fraction along the line from 0 to 1`;
    opts.arrowPos = v;
    return null;
  }
  opts[key] = v;
  return null;
}
function pageWord(opts, w) {
  if (opts[w === 'above' ? 'below' : 'above']) return 'a line is above or below, not both';
  opts[w] = true;
  return null;
}
// where a vertex label can go: a direction word or an angle (a number, or a number written as text)
const POS_WORDS = ['below', 'above', 'left', 'right', 'ne', 'nw', 'se', 'sw', 'n', 's', 'e', 'w', 'up', 'down', 'top', 'bottom', 'center'];
function posError(v) {
  if (typeof v === 'number' ? isFinite(v) : POS_WORDS.includes(v) || /^-?\d*\.?\d+$/.test(String(v))) return null;
  let best = null, bd = 3;
  for (const w of POS_WORDS) { const d = editDistance(String(v), w); if (d < bd) { bd = d; best = w; } }
  return `pos=${v}: a vertex label goes below, above, left, right, ne, nw, se, sw, center or at an angle${best ? `; did you mean pos=${best}?` : ''}`;
}

/** A vertex's shape, options and label, from tokens t[k0..]: { shape, opts } or { error }. */
function vertexTokens(name, t, k0, shape, opts, existing) {
  let labelled = false;
  for (let k = k0; k < t.length; k++) {
    const x = t[k];
    if (x.k === 'str' || (x.k === 'kv' && x.key === 'label')) {
      if (labelled) return { error: `vertex "${name}": a vertex takes one label` };
      labelled = true; opts.label = String(x.v);
    } else if (x.k === 'kv') {
      if (!NODE_KEYS.includes(x.key)) return { error: `vertex "${name}": ${unknownKey(x.key, NODE_KEYS, 'a vertex')}` };
      if (x.key === 'pos') { const pe = posError(x.v); if (pe) return { error: `vertex "${name}": ${pe}` }; }
      opts[x.key] = x.v;
    } else if (x.k === 'word' && SHAPES[x.v]) shape = x.v;
    else if (x.k === 'word' && NODE_FLAGS.has(x.v)) opts[x.v] = true;
    else if (x.k === 'word' && PAGE_HINT[x.v]) return { error: `vertex "${name}": to put its label ${PAGE_HINT[x.v]} it, write pos=${PAGE_HINT[x.v]}` };
    else return { error: existing ? `vertex "${name}": unexpected "${x.v ?? x.k}" (an existing vertex takes a shape, options and a label; "${name} at x,y" would replace it, shape and label included)` : `vertex "${name}": unexpected "${x.v ?? x.k}" (shapes: ${Object.keys(SHAPES).join(', ')})` };
  }
  return { shape, opts };
}

function styleWordError(name, w) {
  if (STYLE_LOOKS.has(w)) return null;
  return `style "${name}": a style only says how a line looks (${[...STYLE_LOOKS].join(', ')}); write ${w} on the line itself`;
}

/** Parse style definitions given as options: { D: 'photon', F: 'phonon dressed' }. */
function styleDefs(map, errors) {
  const out = {};
  for (const [name, def] of Object.entries(map || {})) {
    const toks = tokenize(String(def));
    if (!toks.length || toks[0].k !== 'word') { errors.push({ message: `style "${name}": expected a base style` }); continue; }
    const opts = {};
    for (const t of toks.slice(1)) {
      const w = t.k === 'word' ? t.v : t.k === 'kv' ? t.key : null;
      const se = w && styleWordError(name, w);
      if (se) { errors.push({ message: se }); continue; }
      const oe = t.k === 'kv' && EDGE_KEYS.includes(t.key) && edgeOption(t.key, t.v, {});
      if (oe) { errors.push({ message: `style "${name}": ${oe}` }); continue; }
      if (t.k === 'word') opts[t.v] = true; else if (t.k === 'kv') opts[t.key] = t.v;
    }
    out[name] = { base: toks[0].v, opts };
  }
  return out;
}

/**
 * Parse a ```feynman block. Returns { items: [{ op, term | equation | ellipsis }], styles, unit, errors }.
 * Errors carry a 1-based line number.
 */
export function parse(source, options = {}) {
  const errors = [];
  const styles = styleDefs(options.styles, errors);
  let unit = options.unit;
  let grid = !!options.grid;
  const isStyle = (w) => !!(LINE_STYLES[w] || STYLE_ALIASES[w] || styles[w]);

  // 1. lines -> groups of statements separated by operators
  const groups = [];
  let cur = { op: '', stmts: [] };
  groups.push(cur);
  String(source ?? '').split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    let text = stripComment(raw).trim();
    if (!text) return;
    // as in TeX, \\ at the start of a line starts a new row of the equation; an operator may follow it
    let br = false;
    if (text.startsWith('\\\\')) { br = true; text = text.slice(2).trim(); }
    const custom = /^op\s+"((?:[^"\\]|\\.)*)"\s*(.*)$/.exec(text);
    const m = custom ? null : OP_RE.exec(text);
    if (custom || m || br) {
      // '|' separates diagrams set side by side with no operator between them; a row break alone on its line
      // carries over to the operator line after it
      if (cur.br && !cur.stmts.length) { br = true; groups.pop(); }
      cur = { op: custom ? custom[1] : m ? (m[1] === '|' ? '' : m[1]) : '', stmts: [], line, br };
      groups.push(cur);
      text = (custom ? custom[2] : m ? m[3] : text).trim();
      if (!text) return;
    }
    for (const s of splitStatements(text)) cur.stmts.push({ text: s, line });
  });

  // 2. global statements first (unit, style, grid), wherever they appear
  for (const g of groups) {
    g.stmts = g.stmts.filter((s) => {
      const t = tokenize(s.text);
      // a lone `grid` draws the unit grid under every term; `grid at 0,0` is still a vertex and `grid -- b` a line
      if (t[0]?.k === 'word' && t[0].v === 'grid' && !(t[1]?.k === 'word' && t[1].v === 'at') && t[1]?.k !== 'op') {
        if (t.length === 1) grid = true; else errors.push({ message: 'grid takes no options: write it alone on its own line', line: s.line });
        return false;
      }
      if (t[0]?.k === 'word' && t[0].v === 'unit') {
        if (t[1]?.k === 'num' && t[1].v > 0) unit = t[1].v; else errors.push({ message: 'unit expects a positive number (px per unit)', line: s.line });
        return false;
      }
      if (t[0]?.k === 'word' && t[0].v === 'style') {
        let k = 1;
        const name = t[k]?.k === 'word' ? t[k++].v : null;
        if (t[k]?.k === 'other' && t[k].v === '=') k++;
        const base = t[k]?.k === 'word' ? t[k++].v : null;
        if (!name || !base) { errors.push({ message: 'style expects: style NAME = BASE [options]', line: s.line }); return false; }
        const opts = {};
        for (; k < t.length; k++) {
          const w = t[k].k === 'word' ? t[k].v : t[k].k === 'kv' ? t[k].key : null;
          const se = w ? styleWordError(name, w) : `style "${name}": unexpected "${t[k].v ?? t[k].k}"`;
          if (se) { errors.push({ message: se, line: s.line }); continue; }
          const oe = t[k].k === 'kv' && EDGE_KEYS.includes(t[k].key) && edgeOption(t[k].key, t[k].v, {});
          if (oe) { errors.push({ message: `style "${name}": ${oe}`, line: s.line }); continue; }
          if (t[k].k === 'word') opts[t[k].v] = true; else opts[t[k].key] = t[k].v;
        }
        // line: written in the block (expand() writes these back; the site's styles it leaves to the site)
        styles[name] = { base, opts, line: s.line };
        return false;
      }
      return true;
    });
  }

  // 3. build the terms
  const items = [];
  const ctx = { errors, isStyle, templates: [] };
  for (const g of groups) {
    if (!g.stmts.length) {
      if (g.op && items.length === 0 && groups.indexOf(g) === 0) continue;
      if (g.op) errors.push({ message: `operator "${g.op}" has no term after it`, line: g.line });
      continue;
    }
    if (g.stmts.length === 1 && ELLIPSIS_RE.test(g.stmts[0].text)) { items.push({ op: g.op, br: !!g.br, ellipsis: true }); continue; }
    const term = new Term();
    let equation = null;
    for (const s of g.stmts) {
      const r = statement(term, s, ctx);
      if (r instanceof Equation) {
        if (g.stmts.length > 1) errors.push({ message: 'an equation template must stand alone in its term', line: s.line });
        equation = r;
      }
    }
    if (equation) {
      equation.terms.forEach((t, i) => items.push({ op: i === 0 ? g.op || equation.ops[0] : equation.ops[i], br: i === 0 && !!g.br, ...(t.ellipsis ? { ellipsis: true } : { term: t }) }));
    } else items.push({ op: g.op, br: !!g.br, term });
  }
  return { items, styles, unit, grid, errors, templates: [...new Set(ctx.templates)] };
}

function statement(term, s, ctx) {
  const { errors, isStyle } = ctx;
  const err = (message) => errors.push({ message, line: s.line });
  const t = tokenize(s.text);
  if (!t.length) return;
  const bad = t.find((x) => x.k === 'other');
  const w0 = t[0].k === 'word' ? t[0].v : null;

  // coordinate after 'at': (x,y) or x , y
  const readAt = (k) => {
    if (t[k]?.k === 'pt' && t[k].v.at) return [t[k].v.at, k + 1];
    if (t[k]?.k === 'num' && t[k + 1]?.k === 'comma' && t[k + 2]?.k === 'num') return [[t[k].v, t[k + 2].v], k + 3];
    return [null, k];
  };

  if (w0 === 'caption' || w0 === 'title') {
    if (t[1]?.k !== 'str') return err(`${w0} expects a quoted string`);
    if (w0 === 'caption') term.caption = t[1].v; else { term.title = t[1].v; term.titleGiven = true; }
    return;
  }

  if (w0 === 'text') {
    let k = 1, str = null, at = null;
    const opts = {};
    for (; k < t.length; k++) {
      if (t[k].k === 'str') str = t[k].v;
      else if (t[k].k === 'word' && t[k].v === 'at') { const [p, nk] = readAt(k + 1); at = p; k = nk - 1; }
      else if (t[k].k === 'kv') { if (!TEXT_KEYS.includes(t[k].key)) return err(unknownKey(t[k].key, TEXT_KEYS, 'text')); opts[t[k].key] = t[k].v; }
      else if (t[k].k === 'word' && t[k].v === 'upright') opts.upright = true;
      else return err(`text: unexpected "${t[k].v ?? t[k].k}" (write: text "..." at x,y [size=…] [color=…] [anchor=start|middle|end] [upright])`);
    }
    if (str == null || !at) return err('text expects: text "..." at x,y');
    term.text(str, at[0], at[1], opts);
    return;
  }

  if (w0 === 'leg') {
    const node = t[1]?.k === 'word' ? t[1].v : null;
    if (!node || !term.nodes.has(node)) return err(`leg expects an existing vertex, got "${t[1]?.v ?? ''}"`);
    let k = 2, dir = 'left', len = 0.6, style = null, label = '', inout = null, dirGiven = false;
    const opts = {};
    // the first word after the vertex is the leg's direction: leg a below is a leg pointing down
    if ((t[k]?.k === 'word' && !isStyle(t[k].v) && !EDGE_FLAGS.has(t[k].v) && t[k].v !== 'in' && t[k].v !== 'out') || t[k]?.k === 'num') {
      dir = t[k++].v;
      dirGiven = isFinite(dirVec(dir, NaN)[0]);
      if (!dirGiven) return err(`leg: "${dir}" is not a direction (left, right, up, down, above, below, ne, nw, se, sw or an angle)`);
    }
    if (t[k]?.k === 'num') len = t[k++].v;
    for (; k < t.length; k++) {
      const x = t[k];
      if (x.k === 'str') label = x.v;
      else if (x.k === 'kv') {
        if (x.key === 'label') { label = String(x.v); continue; }
        const oe = edgeOption(x.key, x.v, opts);
        if (oe) return err(`leg: ${oe}`);
      } else if (x.k === 'word' && (x.v === 'in' || x.v === 'out')) inout = x.v;
      else if (x.k === 'word' && !style && isStyle(x.v)) style = x.v;
      else if (x.k === 'word' && EDGE_FLAGS.has(x.v)) {
        // the same meanings as on a line
        if (x.v === 'bend') opts.bend = opts.bend ?? 0.35;
        else if (x.v === 'arc') opts.bend = 0.5;
        else if (x.v === 'ccw') opts.cw = false;
        else opts[x.v] = true;
      } else if (x.k === 'word' && (x.v === 'above' || x.v === 'below')) {
        if (!dirGiven) return err(`leg: write the direction first, as in "leg ${node} left ${x.v}"; "leg ${node} ${x.v}" alone is a leg pointing ${x.v === 'above' ? 'up' : 'down'}`);
        const pe = pageWord(opts, x.v);
        if (pe) return err(`leg: ${pe}`);
      } else return err(`leg: unexpected "${x.v ?? x.k}"`);
    }
    const n = term.nodes.get(node);
    const [dx, dy] = dirVec(typeof dir === 'number' ? dir : dir, 180);
    const p = term.pt(n.x + dx * len, n.y - dy * len);
    // write the leg left to right (bottom to top when vertical) so that its label sits above / left
    const outerFirst = dx < -1e-9 || (Math.abs(dx) < 1e-9 && dy > 0);
    const [a, b] = outerFirst ? [p, node] : [node, p];
    const arrow = !inout ? 'none' : (inout === 'in') === outerFirst ? 'fwd' : 'back';
    term.edge(a, b, style || 'fermion', { ...opts, label, arrow });
    term.edges[term.edges.length - 1].line = s.line;
    return;
  }

  // vertex: NAME at x,y [shape] [options] ["label"]
  if (w0 && t[1]?.k === 'word' && t[1].v === 'at') {
    const [p, k0] = readAt(2);
    if (!p) return err(`vertex "${w0}": expected a position, as in "${w0} at 1,0" (x right, y up, in units of 40 px)`);
    const vt = vertexTokens(w0, t, k0, 'dot', {}, false);
    if (vt.error) return err(vt.error);
    const { shape, opts } = vt;
    if (w0.includes('.')) return err(`vertex names cannot contain "." (it marks an anchor): "${w0}"`);
    term.node(w0, p[0], p[1], shape, opts);
    term.nodes.get(w0).line = s.line;
    return;
  }

  // line(s): EP op EP (op EP)* [style] [options] ["label"]
  if (t[1]?.k === 'op') {
    const eps = [], ops = [];
    let k = 0;
    const isEP = (x) => x && (x.k === 'word' || x.k === 'pt');
    if (!isEP(t[0])) return err('a line starts with a vertex name or a point (x,y)');
    eps.push(t[k++]);
    while (t[k]?.k === 'op') { ops.push(t[k++].v); if (!isEP(t[k])) return err(`expected a vertex or point after "${ops[ops.length - 1]}"`); eps.push(t[k++]); }
    let style = null, label;
    const opts = {};
    for (; k < t.length; k++) {
      const x = t[k];
      if (x.k === 'str') { if (label !== undefined) return err('a line takes one label'); label = x.v; }
      else if (x.k === 'kv') {
        if (x.key === 'label') label = String(x.v);
        else if (x.key === 'arrow') { if (x.v === 'none') opts.arrow = 'none'; else if (x.v === 'end' || x.v === 'start') opts.arrowAt = x.v; else if (x.v === 'mid') opts.arrowAt = 'mid'; else return err('arrow: mid, end, start or none'); }
        else { const oe = edgeOption(x.key, x.v, opts); if (oe) return err(oe); }
      } else if (x.k === 'word' && !style && isStyle(x.v)) style = x.v;
      else if (x.k === 'word' && EDGE_FLAGS.has(x.v)) {
        if (x.v === 'bend') opts.bend = opts.bend ?? 0.35;
        else if (x.v === 'arc') opts.bend = 0.5;
        else if (x.v === 'ccw') opts.cw = false;
        else opts[x.v] = true;
      } else if (x.k === 'word' && (x.v === 'above' || x.v === 'below')) { const pe = pageWord(opts, x.v); if (pe) return err(pe); }
      else if (x.k === 'word' && isStyle(x.v)) return err(`a line has one style; got "${style}" and "${x.v}"`);
      else return err(`unknown word "${x.v ?? x.k}" (line styles: ${Object.keys(LINE_STYLES).join(', ')})`);
    }
    if (eps.length > 2 && label) return err('a chain of lines (a -> b -> c) cannot take a label; write the lines separately');
    const ep = (x) => (x.k === 'pt' ? x.v : x.v);
    for (let i = 0; i < ops.length; i++) {
      const arrow = opts.arrow === 'none' ? 'none' : ops[i] === '->' ? 'fwd' : ops[i] === '<-' ? 'back' : 'none';
      term.edge(ep(eps[i]), ep(eps[i + 1]), style || (ops[i] === '--' ? 'plain' : 'fermion'), { ...opts, label, arrow });
      term.edges[term.edges.length - 1].line = s.line;
    }
    return;
  }

  // an existing vertex, a template's too, restyled or labelled: NAME [shape] [options] ["label"]
  if (w0 && t.length > 1 && term.nodes.has(w0) && !term.nodes.get(w0).anon) {
    const n = term.nodes.get(w0), vt = vertexTokens(w0, t, 1, n.shape, { ...n.opts }, true);
    if (vt.error) return err(vt.error);
    term.nodes.set(w0, { ...n, shape: vt.shape, opts: vt.opts });
    return;
  }

  // template
  if (w0 && TEMPLATES[w0]) {
    const tpl = TEMPLATES[w0];
    ctx.templates.push(w0);
    const params = { ...tpl.params };
    for (const x of t.slice(1)) {
      let key, v;
      if (x.k === 'word' && tpl.flags?.[x.v]) { Object.assign(params, tpl.flags[x.v]); continue; }
      if (x.k === 'kv') { key = x.key; v = x.v; }
      else if (x.k === 'word') { key = x.v; v = true; }
      else if (x.k === 'str' && 'label' in params) { key = 'label'; v = x.v; }
      else { err(`${w0}: unexpected "${x.v ?? x.k}"`); continue; }
      if (!(key in params)) { err(`${w0}: unknown option "${key}" (options: ${Object.keys(tpl.params).join(', ')})`); continue; }
      const def = tpl.params[key];
      if (typeof def === 'number') { const n = Number(v); if (!isFinite(n)) { err(`${w0}: ${key} expects a number`); continue; } params[key] = n; }
      else if (typeof def === 'boolean') params[key] = v === true || v === 'true';
      else if (v === true) { err(`${w0}: ${key} expects a value, as in ${key}=...`); continue; }
      else params[key] = String(v);
    }
    let out;
    try { out = tpl.build(params); } catch (e) { return err(`${w0}: ${e.message}`); }
    if (out instanceof Equation) return out;
    // merge a diagram template into the current term (its named vertices can be referenced afterwards);
    // its invented points are renumbered so that they cannot replace points the term already has
    const rename = new Map();
    for (const [k, n] of out.nodes) {
      if (n.anon) { const nk = `#p${term._anon++}`; rename.set(k, nk); term.nodes.set(nk, { ...n, name: nk }); }
      else term.nodes.set(k, n);
    }
    const re = (ep) => (ep.node && rename.has(ep.node) ? { ...ep, node: rename.get(ep.node) } : ep);
    term.edges.push(...out.edges.map((e) => ({ ...e, from: re(e.from), to: re(e.to) })));
    term.texts.push(...out.texts);
    if (!term.title) term.title = out.title;
    if (out.caption && !term.caption) term.caption = out.caption;
    return;
  }

  if (bad) return err(`cannot read "${s.text}"`);
  // a vertex label or restyle for a name that is not a vertex of this term (a typo, or a label before its vertex)
  if (w0 && t.length > 1 && t.slice(1).every((x) => x.k === 'str' || x.k === 'kv' || (x.k === 'word' && (SHAPES[x.v] || NODE_FLAGS.has(x.v) || PAGE_HINT[x.v])))) {
    if (w0.includes('.')) return err(`"${w0}" is an anchor of a vertex: label the vertex itself`);
    const names = [...term.nodes.values()].filter((n) => !n.anon).map((n) => n.name);
    let best = null, bd = 3;
    for (const nm of names) { const d = editDistance(w0, nm); if (d < bd) { bd = d; best = nm; } }
    return err(`no vertex "${w0}" here${best ? `; did you mean ${best}?` : ''} (a vertex is labelled after it is placed${names.length ? `; the vertices so far: ${names.join(', ')}` : ''})`);
  }
  if (w0 && t.length === 1) return err(`unknown template or statement "${w0}" (templates: ${Object.keys(TEMPLATES).join(', ')})`);
  return err(`cannot read "${s.text}": expected a vertex (a at 0,0), a line (a -> b fermion) or a template`);
}
