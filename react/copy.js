'use client';
// The copy button of a diagram: the one client component, a small island beside the SVG the server rendered. It
// copies the figure as one SVG, built in the browser from the page's own SVGs, so no diagram is sent twice. On the
// clipboard it is a PNG picture (for slides and documents) and the SVG markup as text (for editors, Figma and
// Inkscape), and the SVG itself where the browser can put one there.

import { createElement as h, useEffect, useRef, useState } from 'react';

const f = (v) => String(Math.round(v * 100) / 100);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MUTED = 'var(--feyn-muted,#5a6477)';

/**
 * The figure inside `root` as one standalone SVG: { svg, w, h } in px. A lone diagram is its own SVG; an equation
 * (or diagrams set side by side) is put together from where the page shows its terms, operators and captions, so
 * rows that wrapped come out as they wrapped. The block's caption under the figure is left out. Colours stay CSS
 * variables with their light defaults, which is how the copy looks wherever it is pasted.
 */
export function figureSVG(root) {
  const fig = root.querySelector('figure.feyn') || root;
  const svgs = [...fig.querySelectorAll('svg.feyn-svg')];
  if (!svgs.length) return null;
  const size = (s) => [+s.getAttribute('width'), +s.getAttribute('height')];
  if (svgs.length === 1 && !fig.querySelector('.feyn-eq')) {
    const [w, hh] = size(svgs[0]);
    return { svg: svgs[0].outerHTML, w, h: hh };
  }
  const box = fig.querySelector('.feyn-eq') || fig, R = box.getBoundingClientRect();
  const items = [...box.querySelectorAll('svg.feyn-svg, .feyn-op, .feyn-cap')];
  const rects = items.map((el) => el.getBoundingClientRect());
  const x0 = Math.min(...rects.map((r) => r.left)) - R.left, y0 = Math.min(...rects.map((r) => r.top)) - R.top;
  const x1 = Math.max(...rects.map((r) => r.right)) - R.left, y1 = Math.max(...rects.map((r) => r.bottom)) - R.top;
  const parts = items.map((el, k) => {
    const r = rects[k], x = r.left - R.left - x0, y = r.top - R.top - y0;
    if (el.tagName.toLowerCase() === 'svg') {
      // the term's own SVG, placed where the page shows it (scaled as shown, when a narrow column shrinks it)
      return `<svg x="${f(x)}" y="${f(y)}" width="${f(r.width)}" height="${f(r.height)}" viewBox="${el.getAttribute('viewBox')}" overflow="visible" style="font-family:${esc(el.style.fontFamily)}">${el.innerHTML}</svg>`;
    }
    const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    return `<text x="${f(x + r.width / 2)}" y="${f(y + r.height / 2)}" text-anchor="middle" dominant-baseline="central" font-size="${f(fs)}" style="fill:${MUTED}">${esc(el.textContent)}</text>`;
  });
  const w = Math.ceil(x1 - x0), hh = Math.ceil(y1 - y0), font = getComputedStyle(box).fontFamily;
  const label = fig.getAttribute('aria-label') || '';
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}" role="img"${label ? ` aria-label="${esc(label)}"` : ''} style="font-family:${esc(font)}">${parts.join('')}</svg>`,
    w, h: hh
  };
}

/** The SVG drawn into a PNG at `scale` times its size, on a transparent background. */
function png(svg, w, hh, scale = 3) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * scale); c.height = Math.ceil(hh * scale);
      const g = c.getContext('2d');
      g.scale(scale, scale); g.drawImage(img, 0, 0, w, hh);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('the picture could not be made'))), 'image/png');
    };
    img.onerror = () => reject(new Error('the SVG did not load as a picture'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/** Put the figure in `root` on the clipboard. The items are given as promises, as Safari needs within the click. */
export async function copyFigure(root) {
  const fig = figureSVG(root);
  if (!fig) throw new Error('no diagram to copy');
  const clip = navigator.clipboard;
  if (typeof ClipboardItem !== 'undefined' && clip?.write) {
    const items = { 'image/png': png(fig.svg, fig.w, fig.h), 'text/plain': Promise.resolve(new Blob([fig.svg], { type: 'text/plain' })) };
    if (ClipboardItem.supports?.('image/svg+xml')) items['image/svg+xml'] = Promise.resolve(new Blob([fig.svg], { type: 'image/svg+xml' }));
    try { await clip.write([new ClipboardItem(items)]); return 'picture'; } catch { /* the markup alone, below */ }
  }
  await clip.writeText(fig.svg);
  return 'text';
}

const ICON = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const icons = {
  idle: () => h('svg', ICON, h('rect', { x: 9, y: 9, width: 13, height: 13, rx: 2 }), h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })),
  done: () => h('svg', ICON, h('path', { d: 'M20 6 9 17l-5-5' })),
  failed: () => h('svg', ICON, h('path', { d: 'M18 6 6 18M6 6l12 12' }))
};
const LABEL = { idle: 'Copy diagram', done: 'Copied', failed: 'Could not copy' };

/** The button. It shows on hover or keyboard focus (see the theme's .feyn-copy) and copies the figure it sits on. */
export function FeynmanCopy() {
  const [state, setState] = useState('idle');
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onClick = (e) => {
    const root = e.currentTarget.closest('.feyn-root');
    const show = (s) => { setState(s); clearTimeout(timer.current); timer.current = setTimeout(() => setState('idle'), 1600); };
    copyFigure(root).then(() => show('done'), () => show('failed'));
  };
  return h('button', { type: 'button', className: 'feyn-copy', 'data-state': state, 'aria-label': LABEL[state], title: LABEL[state], onClick }, icons[state]());
}
