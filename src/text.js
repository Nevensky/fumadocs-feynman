// Labels: a small TeX-like subset typeset as SVG <tspan>s, with no DOM needed (so it runs at build time).
//   G_0  G^{cn}  \Sigma^{ep}  \chi^{irr}  W^{e,\mathrm{cn}}  \bar{v}  \Gamma_{\overline{ph}}  k+q  G'
// Conventions (those of the EPP primer): Latin letters italic, capital Greek upright, lower-case Greek
// italic, digits and symbols upright. Sub- and superscripts are names (cn, ep, irr, RPA), so their Latin
// letters are upright; \mathit{} forces italic, \mathrm{} / \text{} force upright.

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ',
  varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω'
};
const SYMBOL = {
  dagger: '†', ddagger: '‡', prime: '′', infty: '∞', pm: '±', mp: '∓', times: '×', cdot: '·', partial: '∂', nabla: '∇',
  ell: 'ℓ', hbar: 'ℏ', to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔', uparrow: '↑', downarrow: '↓',
  sim: '∼', approx: '≈', equiv: '≡', neq: '≠', ne: '≠', le: '≤', leq: '≤', ge: '≥', geq: '≥', star: '⋆', ast: '∗',
  circ: '∘', bullet: '•', cdots: '⋯', ldots: '…', dots: '…', perp: '⊥', parallel: '∥', otimes: '⊗', oplus: '⊕',
  langle: '⟨', rangle: '⟩', minus: '−', Uparrow: '⇑', Downarrow: '⇓',
  ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ', '{': '{', '}': '}', '_': '_', '^': '^', '%': '%',
  '#': '#', '&': '&', '\\': '\\', '|': '‖'
};
// symbols set with space on both sides when the source has it (binary operators and relations)
const OPERATOR = new Set(['times', 'cdot', 'pm', 'mp', 'to', 'rightarrow', 'leftarrow', 'leftrightarrow', 'sim', 'approx', 'equiv', 'neq', 'ne', 'le', 'leq', 'ge', 'geq', 'star', 'ast', 'circ', 'bullet', 'otimes', 'oplus', 'perp', 'parallel', 'minus']);
const ACCENT = { bar: '̄', overline: '̅', tilde: '̃', widetilde: '̃', hat: '̂', widehat: '̂', dot: '̇', ddot: '̈', vec: '⃗', check: '̌', breve: '̆' };
const FONT = { mathrm: 'rm', text: 'rm', textrm: 'rm', operatorname: 'rm', mathsf: 'rm', mathit: 'it', textit: 'it', mathbf: 'bf', textbf: 'bf', boldsymbol: 'bi', bm: 'bi' };

const LOWER_GREEK = /[α-ωϵϑϖϱςϕ]/;

/**
 * Parse a label into runs { t, s (-1 sub | 0 | 1 sup), it (italic), bf (bold) }. Primes from ' get a run of their
 * own with pr: true; the layout sets them as TeX sets ^{\prime} (see layoutRuns).
 */
export function parseLabel(src, opts = {}) {
  const s = String(src ?? '');
  const n = s.length;
  let i = 0;

  const styleOf = (ch, ctx) => {
    const bf = ctx.font === 'bf' || ctx.font === 'bi';
    let it;
    if (ctx.font === 'rm' || ctx.font === 'bf') it = false;
    else if (ctx.font === 'it' || ctx.font === 'bi') it = true;
    else if (/[A-Za-z]/.test(ch)) it = ctx.s === 0 || !!opts.scriptItalic;
    else it = LOWER_GREEK.test(ch);
    return { it, bf };
  };
  const emit = (out, ch, ctx) => {
    const st = styleOf(ch, ctx);
    const last = out[out.length - 1];
    if (last && last.s === ctx.s && last.it === st.it && last.bf === st.bf && !last.over && !last.pr === !ctx.pr) last.t += ch;
    else out.push({ t: ch, s: ctx.s, it: st.it, bf: st.bf, ...(ctx.pr && { pr: true }) });
  };
  // a binary operator between two operands gets TeX's medium space on both sides (k + q); a sign does not (−q)
  const BINOP = /[+−=×±∓·<>≤≥≈≡]/;
  const OPERAND_END = /[\p{L}\p{N}\p{M})\]′]$/u;
  const emitChar = (out, ch, ctx) => {
    // ' is TeX's ^{\prime}: an upright prime, set as a superscript by the layout
    if (!ctx.text && ch === "'") { emit(out, '′', { ...ctx, font: ctx.font === 'bf' || ctx.font === 'bi' ? 'bf' : 'rm', pr: true }); return; }
    if (!ctx.text) { if (ch === '-') ch = '−'; else if (ch === '*') ch = '∗'; }
    const last = out[out.length - 1];
    if (!ctx.text && ctx.s === 0 && BINOP.test(ch) && last && last.s === 0 && OPERAND_END.test(last.t)) {
      const sp = { ...ctx, font: 'rm' };
      emit(out, '\u205F', sp); emit(out, ch, ctx); emit(out, '\u205F', sp);
      return;
    }
    emit(out, ch, ctx);
  };

  function readArg(out, ctx) {
    while (i < n && s[i] === ' ') i++;
    if (i >= n) return;
    if (s[i] === '{') { i++; parseUntil(out, '}', ctx); i++; }
    else if (s[i] === '\\') parseMacro(out, ctx);
    else emitChar(out, s[i++], ctx);
  }
  function parseUntil(out, close, ctx) {
    while (i < n && s[i] !== close) parseOne(out, ctx);
  }
  function parseOne(out, ctx) {
    const ch = s[i];
    if (ch === '\\') parseMacro(out, ctx);
    else if (ch === '_' || ch === '^') { i++; readArg(out, { ...ctx, s: ch === '_' ? -1 : 1 }); }
    else if (ch === '{') { i++; parseUntil(out, '}', ctx); i++; }
    else { i++; emitChar(out, ch, ctx); }
  }
  function parseMacro(out, ctx) {
    i++;
    let name;
    const m = /^[A-Za-z]+/.exec(s.slice(i));
    if (m) {
      name = m[0]; i += name.length;
      // as in TeX, a space after a control word only ends it (\delta G is δG). A space beside an operator stays, so
      // that A \times B and \Sigma = x keep one space on each side, and text keeps every space.
      if (!ctx.text && !OPERATOR.has(name)) {
        let j = i;
        while (s[j] === ' ') j++;
        const nextWord = s[j] === '\\' ? (/^[A-Za-z]+/.exec(s.slice(j + 1)) || [''])[0] : '';
        if (j > i && j < n && !/[+\-=<>−]/.test(s[j]) && !OPERATOR.has(nextWord)) i = j;
      }
    } else { name = s[i] ?? ''; i++; }
    if (FONT[name]) { readArg(out, { ...ctx, font: FONT[name], text: name.startsWith('text') || name === 'operatorname' }); return; }
    if (ACCENT[name]) {
      const tmp = [];
      readArg(tmp, ctx);
      const total = tmp.reduce((k, r) => k + [...r.t].length, 0);
      if (name === 'overline' || (name === 'bar' && total > 1)) {
        // one continuous bar over the whole argument (\overline{ph}), not a mark per letter
        for (const r of tmp) { r.over = true; out.push(r); }
        return;
      }
      // a one-letter argument gets a combining accent on its letter
      for (const r of tmp) r.t = [...r.t].map((c, k) => (total > 1 || k === [...r.t].length - 1 ? c + ACCENT[name] : c)).join('');
      for (const r of tmp) { const last = out[out.length - 1]; if (last && last.s === r.s && last.it === r.it && last.bf === r.bf && !last.over && !last.pr === !r.pr) last.t += r.t; else out.push(r); }
      return;
    }
    if (GREEK[name]) { emit(out, GREEK[name], ctx); return; }
    if (SYMBOL[name] !== undefined) { for (const c of SYMBOL[name]) emit(out, c, { ...ctx, font: ctx.font === 'bf' || ctx.font === 'bi' ? 'bf' : 'rm' }); return; }
    for (const c of '\\' + name) emit(out, c, { ...ctx, font: 'rm' });
  }

  const out = [];
  const ctx = { s: 0, font: opts.text ? 'rm' : null, text: !!opts.text };
  while (i < n) {
    if (s[i] === '}') { i++; continue; } // stray brace
    parseOne(out, ctx);
  }
  return out;
}

// ---------- metrics (no DOM): advance widths in em, good to a few per cent for serif faces ----------
function advance(ch) {
  if (/\p{M}/u.test(ch)) return 0;
  if (ch === ' ') return 0.26;
  if (ch === '\u205F') return 0.22;
  if (ch === ' ') return 0.17;
  if (ch === ' ') return 0.25;
  if (/[A-Z]/.test(ch)) return /[MW]/.test(ch) ? 0.85 : 0.66;
  if (/[a-z]/.test(ch)) return /[mw]/.test(ch) ? 0.75 : /[ijlrtf]/.test(ch) ? 0.33 : 0.5;
  if (/[0-9]/.test(ch)) return 0.5;
  if (/[Α-Ω]/.test(ch)) return 0.68;
  if (/[α-ωϵϑϖϱςϕ]/.test(ch)) return 0.56;
  if (/[.,:;′'!|]/.test(ch)) return 0.28;
  if (/[()[\]{}]/.test(ch)) return 0.34;
  if (/[+−=×<>≤≥≈≡∼→←↔⊗⊕]/.test(ch)) return 0.66;
  return 0.6;
}

export const SCRIPT = 0.72;
const SUB = 0.27, SUP = 0.4;
// A prime is a superscript, as TeX sets ' (^{\prime}): KaTeX_Main's U+2032 is TeX's \prime, a large glyph that
// sits low (0.03–0.56 em) and only reads as a prime when made small and raised. Full size on the baseline it reads
// as a slash (G/). Text fonts draw it already raised (0.4–0.75 em), so there it sits a little higher than theirs.
// Inside a script a prime is that script's superscript, a size smaller again.
const asScripts = (runs) => runs.map((r) => (r.pr && !r.s ? { ...r, s: 1, pr: false } : r));
const scale = (r) => (r.s ? SCRIPT : 1) * (r.pr ? SCRIPT : 1);
const rise = (r) => (r.s === -1 ? SUB : r.s === 1 ? -SUP : 0) - (r.pr ? SUP * SCRIPT : 0); // baseline, + downwards
// TeX's italic correction: a superscript after an italic letter moves right, more after F, P, T, V, W, Y
const italicCorrection = (prev, r) => (r.s === 1 && prev && prev.s === 0 && prev.it ? (/[FPTVWY]$/.test(prev.t) ? 0.12 : 0.08) : 0);

// which glyphs reach the cap height (or above) and which go below the baseline
const TALL = /[A-Z0-9bdfhkltΑ-Ωβδζθλξϑħℏ∂()[\]{}′]/;
const DEEP = /[gjpqyβγζημξρφχψς()[\]{},;]/;

/**
 * Where the runs go along the line: the shift before each run and the total advance (in px at `size`). A
 * superscript after an italic letter gets TeX's italic correction. A subscript right after a superscript (a prime is
 * one, as in G'_z) is set under it, and a superscript right after a subscript over it, as TeX stacks
 * ρ^*_{nk}; what follows starts after the wider of the two.
 */
function layoutRuns(runs, size) {
  runs = asScripts(runs);
  const dx = runs.map(() => 0);
  const width = (r) => { let w = 0; for (const ch of r.t) w += advance(ch) * scale(r) * size * (r.bf ? 1.06 : 1); return w; };
  let x = 0, stack = null;   // stack: the scripts on one base { base: x at the base's end, baseRun, end, levels }
  for (let k = 0; k < runs.length;) {
    let j = k, w = 0;
    while (j < runs.length && runs[j].s === runs[k].s) w += width(runs[j++]);
    const s = runs[k].s;
    if (s !== 0 && stack && !stack.levels.has(s)) {
      // the other script of the same base: back to the base's end (a superscript keeps its italic correction)
      const start = stack.base + (s === 1 ? italicCorrection(stack.baseRun, runs[k]) * size : 0);
      dx[k] = start - x; x = start + w;
      stack.levels.add(s); stack.end = Math.max(stack.end, x);
    } else {
      // past the wider script of the last stack, then on along the line
      if (stack && stack.end > x) { dx[k] += stack.end - x; x = stack.end; }
      stack = null;
      if (s !== 0) {
        const ic = italicCorrection(runs[k - 1], runs[k]) * size;
        stack = { base: x, baseRun: runs[k - 1], levels: new Set([s]) };
        dx[k] += ic; x += ic + w; stack.end = x;
      } else {
        x += w;
        // a \prime at the end of the base counts as a superscript: a subscript after it goes under it
        const primes = runs[j - 1].t.match(/′+$/);
        if (primes) stack = { base: x - primes[0].length * advance('′') * size, baseRun: null, levels: new Set([1]), end: x };
      }
    }
    k = j;
  }
  return { dx, w: Math.max(x, stack ? stack.end : x) };
}

/**
 * Width and vertical extent (relative to the baseline, + downwards) of a label at font size `size`. The extent
 * follows the glyphs: x-height or cap height on top, descenders only when there are some. A label above a line
 * and one below it then sit at the same visible distance from it.
 */
export function measureRuns(runs, size) {
  const { w } = layoutRuns(runs, size);
  let top = -0.47 * size, bottom = 0;
  asScripts(runs).forEach((r) => {
    const fs = size * scale(r);
    const base = rise(r) * size;
    const visible = r.t.replace(/[\s   ]/g, '');
    if (!visible) return;
    // bold changes the width, not the height; the dots of i and j reach above the x-height
    const up = (TALL.test(visible) ? 0.7 : /[ij]/.test(visible) ? 0.66 : 0.47) * fs, down = DEEP.test(visible) ? 0.22 * fs : 0.02 * fs;
    top = Math.min(top, base - up);
    bottom = Math.max(bottom, base + down);
    if (/\p{M}/u.test(r.t)) top = Math.min(top, base - 0.92 * fs);
    if (r.over) top = Math.min(top, base - 0.95 * fs);
  });
  return { w, top, bottom };
}

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (v) => String(Math.round(v * 100) / 100);

/**
 * <text> element for a label. (x, y) is the baseline anchor; anchor: start | middle | end.
 * Italic runs use --feyn-font-math with no fallback, so without the stylesheet they inherit the
 * root font and stay italic through font-style.
 */
export function labelSVG(runs, x, y, { size = 14, anchor = 'middle', color, cls = 'feyn-lab', weight } = {}) {
  let shift = 0;
  const { dx: shifts } = layoutRuns(runs, size);
  const parts = asScripts(runs).map((r, k) => {
    const target = rise(r) * size;
    const dy = target - shift; shift = target;
    const a = [];
    const dx = shifts[k];
    if (Math.abs(dx) > 0.004) a.push(`dx="${num(dx)}"`);
    if (dy) a.push(`dy="${num(dy)}"`);
    if (r.over) a.push('text-decoration="overline"');
    if (r.s) a.push(`font-size="${num(size * scale(r))}"`);
    a.push(`font-style="${r.it ? 'italic' : 'normal'}"`);
    if (r.bf) a.push('font-weight="700"');
    if (r.it) a.push('style="font-family:var(--feyn-font-math)"');
    return `<tspan ${a.join(' ')}>${esc(r.t)}</tspan>`;
  });
  const attrs = [`x="${num(x)}"`, `y="${num(y)}"`, `font-size="${num(size)}"`];
  if (anchor !== 'start') attrs.push(`text-anchor="${anchor}"`);
  if (weight) attrs.push(`font-weight="${weight}"`);
  return `<text class="${cls}" ${attrs.join(' ')} style="fill:${color}">${parts.join('')}</text>`;
}

/** Plain-text form of a label, for aria descriptions. */
export function labelText(src) {
  return parseLabel(src).map((r) => (r.pr ? '' : r.s === -1 ? ' sub ' : r.s === 1 ? ' sup ' : '') + r.t.replace(/\p{M}/gu, ' bar') + (r.over ? ' bar ' : '')).join('').replace(/\s+/g, ' ').trim();
}

export const escapeXML = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML for a label (captions): <i>, <sub>, <sup>. */
export function labelHTML(src, opts) {
  return parseLabel(src, opts).map((r) => {
    let h = r.t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (r.it) h = `<i>${h}</i>`;
    if (r.bf) h = `<b>${h}</b>`;
    if (r.over) h = `<span style="text-decoration:overline">${h}</span>`;
    return r.s === -1 ? `<sub>${h}</sub>` : r.s === 1 ? `<sup>${h}</sup>` : h;
  }).join('');
}
