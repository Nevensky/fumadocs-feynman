// Colour tokens. The particle hues are the ones of the EPP primer: electron blue, phonon amber,
// photon rose, with teal and violet as the fourth and fifth hues. Every colour reaches the SVG as
// `var(--feyn-<token>, <light default>)`, so a diagram is legible with no stylesheet at all and
// follows the site's theme once style.css (or themeCSS()) is loaded.

export const TOKENS = {
  light: {
    electron: '#2350c8', phonon: '#c26a00', photon: '#b5306c', c4: '#0b8aa3', c5: '#6d45c4',
    'electron-text': '#2350c8', 'phonon-text': '#92500a', 'photon-text': '#a1295f', 'c4-text': '#076a80', 'c5-text': '#5a37a8',
    ink: '#151b29', muted: '#5a6477', surface: '#ffffff'
  },
  dark: {
    electron: '#6688f2', phonon: '#c67c18', photon: '#d95e94', c4: '#169fb6', c5: '#9372ee',
    'electron-text': '#93adff', 'phonon-text': '#f0aa4f', 'photon-text': '#f286b5', 'c4-text': '#5cc8dc', 'c5-text': '#b9a2ff',
    ink: '#e3e8f1', muted: '#96a0b3', surface: '#141a26'
  }
};

// Friendly aliases accepted wherever a colour is expected (color=teal, color=blue ...).
const ALIAS = {
  fermion: 'electron', blue: 'electron', amber: 'phonon', orange: 'phonon', rose: 'photon', pink: 'photon',
  teal: 'c4', current: 'c4', violet: 'c5', purple: 'c5', fg: 'ink', grey: 'muted', gray: 'muted', bg: 'surface'
};

export const FONT_MATH = '"KaTeX_Math", "Source Serif 4", "STIX Two Text", Cambria, Georgia, "Times New Roman", serif';
export const FONT_TEXT = '"KaTeX_Main", "Source Serif 4", "STIX Two Text", Cambria, Georgia, "Times New Roman", serif';

export function tokenName(c) {
  if (!c) return null;
  const k = ALIAS[c] || c;
  return TOKENS.light[k] !== undefined ? k : null;
}

// CSS value for a colour: a token (or alias) becomes a variable with its light fallback; anything
// else (#hex, rgb(), currentColor, var(--x)) passes through untouched.
export function cssColor(c) {
  const k = tokenName(c);
  return k ? `var(--feyn-${k},${TOKENS.light[k]})` : c;
}

// Text colour paired with a mark colour: the darker "-text" variant of a particle hue.
export function cssTextColor(c) {
  const k = tokenName(c);
  if (k && TOKENS.light[k + '-text']) return cssColor(k + '-text');
  return cssColor(c || 'ink');
}

function block(sel, vars) {
  return `${sel} {\n${Object.entries(vars).map(([k, v]) => `  --feyn-${k}: ${v};`).join('\n')}\n}`;
}

/**
 * The theme stylesheet. With `fumadocs: true` (default) ink, muted and surface follow the
 * fumadocs colour variables, so diagrams sit on any fumadocs theme; the particle hues stay fixed.
 * Dark mode follows `.dark` on <html> (next-themes, as fumadocs uses it), `[data-theme="dark"]`,
 * and the OS setting when the page does not force light.
 */
export function themeCSS({ fumadocs = true, media = true } = {}) {
  const fd = (name, fallback) => (fumadocs ? `var(--color-fd-${name}, ${fallback})` : fallback);
  const mk = (t) => ({
    ...Object.fromEntries(Object.entries(t).filter(([k]) => !['ink', 'muted', 'surface'].includes(k))),
    ink: fd('foreground', t.ink), muted: fd('muted-foreground', t.muted), surface: fd('background', t.surface)
  });
  const L = mk(TOKENS.light), D = mk(TOKENS.dark);
  return [
    '/* fumadocs-feynman theme: particle hues of the EPP primer */',
    block(':root', { ...L, 'font-math': FONT_MATH, 'font-text': FONT_TEXT }),
    media ? `@media (prefers-color-scheme: dark) {\n${block(':root:not(.light):not([data-theme="light"])', D).replace(/^/gm, '  ')}\n}` : '',
    block('.dark, [data-theme="dark"]', D),
    '.feyn { margin: 1.25rem 0; }',
    '.feyn svg { max-width: 100%; height: auto; overflow: visible; }',
    '.feyn figcaption, .feyn .feyn-cap { font-size: 0.85em; color: var(--feyn-muted); text-align: center; margin-top: 0.4rem; }',
    '.feyn-error { border: 1px solid #c2410c; border-radius: 6px; padding: 0.6rem 0.8rem; font: 0.8rem/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; color: #c2410c; overflow-x: auto; }'
  ].filter(Boolean).join('\n\n') + '\n';
}
