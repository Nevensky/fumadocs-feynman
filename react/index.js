// <Feynman chart="..." /> for MDX. No hooks and no 'use client': in a React Server Component setup
// (fumadocs on Next.js) the diagram becomes static SVG at build time and ships no JavaScript.
// Colours are CSS variables, so the light/dark switch needs no re-render either.

import { createElement as h, Fragment } from 'react';
import { render, themeCSS } from '../src/index.js';

const CSS = themeCSS();

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Props: chart (the block source; a string child works too), caption, title, unit, styles, id, className,
 * injectStyle (default true: React 19 hoists one <style> with the theme into <head>; set it to false if you
 * import 'fumadocs-feynman/style.css' yourself).
 */
export function Feynman({ chart, children, caption, title, unit, styles, id, className, injectStyle = true, scriptItalic }) {
  const source = typeof chart === 'string' ? chart : typeof children === 'string' ? children : '';
  const out = render(source, { caption, title, unit: num(unit), styles, id, scriptItalic });
  return h(Fragment, null,
    injectStyle ? h('style', { href: 'fumadocs-feynman-theme', precedence: 'medium' }, CSS) : null,
    h('div', { className: ['feyn-root', className].filter(Boolean).join(' '), dangerouslySetInnerHTML: { __html: out.html } }));
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
