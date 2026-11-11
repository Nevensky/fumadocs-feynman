// fumadocs-feynman: Feynman diagrams from a small text language, rendered to static SVG with no DOM.
//
//   import { render } from 'fumadocs-feynman';
//   const { html, svg, errors } = render('fan-migdal dressed');

import { parse } from './parse.js';
import { renderTerm, svgWrap, equationHTML, equationSVG, FONT_INLINE } from './render.js';
import { labelHTML, escapeXML } from './text.js';
import { Term, Equation } from './model.js';

export { parse } from './parse.js';
export { themeCSS, TOKENS, cssColor } from './theme.js';
export { TEMPLATES } from './templates.js';
export { LINE_STYLES, SHAPES, Term, Equation } from './model.js';

function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

const FIG_STYLE = 'margin:1.25rem 0;display:flex;flex-direction:column;align-items:center;gap:6px;max-width:100%';
const CAP_STYLE = `font-size:0.875rem;line-height:1.45;color:var(--feyn-muted,#5a6477);text-align:center;margin:0`;
const ERR_STYLE = 'border:1px solid #c2410c;border-radius:6px;padding:0.6rem 0.8rem;margin:1rem 0;font:0.8rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;color:#c2410c;overflow-x:auto';

function figure(content, caption, extra = '') {
  const cap = caption ? `<figcaption class="feyn-caption" style="${CAP_STYLE}">${labelHTML(caption, { text: true })}</figcaption>` : '';
  return `<figure class="feyn"${extra} style="${FIG_STYLE}">${content}${cap}</figure>`;
}

function errorHTML(errors, source) {
  const lines = String(source ?? '').split(/\r?\n/);
  const list = errors.map((e) => `  ${e.line ? `line ${e.line}: ` : ''}${e.message}`).join('\n');
  const src = lines.map((l, i) => `${String(i + 1).padStart(3)} │ ${l}`).join('\n');
  return `<div class="feyn-error" role="alert" style="${ERR_STYLE}">${escapeXML(`Feynman diagram: ${errors.length} error${errors.length > 1 ? 's' : ''}\n${list}\n\n${src}`)}</div>`;
}

function renderItems(items, { unit, uid, styles, errors, scriptItalic, grid }) {
  return items.map((it, i) => (it.ellipsis ? { ellipsis: true } : renderTerm(it.term, { unit, uid: `${uid}-${i}`, styles, errors, scriptItalic, grid })));
}

function assemble(results, ops, { caption, title }) {
  if (results.length === 1 && !ops[0] && !results[0].ellipsis) {
    const r = results[0];
    const desc = title || r.desc;
    return { html: figure(svgWrap(r, desc), caption ?? r.caption), svg: svgWrap(r, desc) };
  }
  const desc = title || `Equation: ${results.map((r, i) => `${ops[i] ? ops[i] + ' ' : ''}${r.ellipsis ? '…' : `(${r.desc})`}`).join(' ')}`;
  const html = figure(equationHTML(results, ops), caption, ` role="group" aria-label="${escapeXML(desc)}"`);
  return { html, svg: svgWrap(equationSVG(results, ops), desc) };
}

/**
 * Render a ```feynman block.
 * options: { unit (px per unit, 40), styles ({ D: 'photon' }), caption, title, id (prefix for SVG ids), scriptItalic, grid }
 * Returns { html, svg, errors }. html is a <figure> (responsive for equations); svg is one standalone SVG.
 * With errors, html is an error box that lists them with line numbers and svg is ''.
 */
export function render(source, options = {}) {
  const doc = parse(source, options);
  const errors = [...doc.errors];
  const unit = doc.unit || options.unit || 40;
  const uid = options.id || `feyn-${hash(String(source))}`;
  const results = renderItems(doc.items, { unit, uid, styles: doc.styles, errors, scriptItalic: options.scriptItalic, grid: doc.grid });
  if (!doc.items.length) errors.push({ message: 'empty diagram' });
  errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  if (errors.length) return { html: errorHTML(errors, source), svg: '', errors };
  const ops = doc.items.map((it) => it.op || '');
  return { ...assemble(results, ops, options), errors };
}

/** Standalone SVG string (throws on errors). */
export function renderSVG(source, options = {}) {
  const out = render(source, options);
  if (out.errors.length) throw new Error(out.errors.map((e) => `${e.line ? `line ${e.line}: ` : ''}${e.message}`).join('\n'));
  return out.svg;
}

/** Render a diagram built in code with Term / Equation. */
export function renderModel(model, options = {}) {
  const errors = [];
  const items = model instanceof Equation
    ? model.terms.map((t, i) => (t.ellipsis ? { op: model.ops[i], ellipsis: true } : { op: model.ops[i], term: t }))
    : [{ op: '', term: model }];
  const results = renderItems(items, { unit: options.unit || 40, uid: options.id || 'feyn-model', styles: options.styles || {}, errors, scriptItalic: options.scriptItalic, grid: !!options.grid });
  if (errors.length) return { html: errorHTML(errors, ''), svg: '', errors };
  return { ...assemble(results, items.map((it) => it.op || ''), { title: model.title, ...options }), errors };
}

export { FONT_INLINE };
