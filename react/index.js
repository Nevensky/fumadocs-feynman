// <Feynman chart="..." /> for MDX. No hooks and no 'use client': in a React Server Component setup
// (fumadocs on Next.js) the diagram becomes static SVG at build time and ships no JavaScript. The one exception is
// opt-in: with copy, a copy button (./copy.js, a small client component) shows on hover.
// Colours are CSS variables, so the light/dark switch needs no re-render either.

import { createElement as h, Fragment } from 'react';
import { render, themeCSS } from '../src/index.js';
import { FeynmanCopy } from './copy.js';

const CSS = themeCSS();

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Props: chart (the block source; a string child works too), caption, title, unit, styles, id, className, grid,
 * injectStyle (default true: React 19 hoists one <style> with the theme into <head>; set it to false if you
 * import 'fumadocs-feynman/style.css' yourself), copy (default false: a copy button that shows on hover; the remark
 * plugin's copy option, or a fence's bare word copy, turns it on).
 */
export function Feynman({ chart, children, caption, title, unit, styles, id, className, injectStyle = true, scriptItalic, grid, copy = false }) {
  const source = typeof chart === 'string' ? chart : typeof children === 'string' ? children : '';
  const out = render(source, { caption, title, unit: num(unit), styles, id, scriptItalic, grid });
  // an error box alone has nothing to copy
  // MDX passes a fence's copy=true as text, and the plugin's bare copy as true
  const button = (copy === true || copy === 'true') && out.html.includes('<svg');
  return h(Fragment, null,
    injectStyle ? h('style', { href: 'fumadocs-feynman-theme', precedence: 'medium' }, CSS) : null,
    button
      ? h('div', { className: ['feyn-root', className].filter(Boolean).join(' ') }, h('div', { dangerouslySetInnerHTML: { __html: out.html } }), h(FeynmanCopy))
      : h('div', { className: ['feyn-root', className].filter(Boolean).join(' '), dangerouslySetInnerHTML: { __html: out.html } }));
}

/** A Feynman component with site-wide defaults, e.g. createFeynman({ styles: { D: 'photon', F: 'phonon dressed' } }). */
export function createFeynman(defaults = {}) {
  function SiteFeynman(props) {
    // a unit that is not a positive number (a fence's unit=abc) leaves the site's
    return h(Feynman, { ...defaults, ...props, unit: num(props.unit) ?? defaults.unit, styles: { ...defaults.styles, ...props.styles } });
  }
  return SiteFeynman;
}

export default Feynman;
