// Builds gallery/index.html: a static gallery (pre-rendered SVG) plus a live playground that imports ./src.
// node gallery/build.mjs
import { writeFileSync } from 'node:fs';
import { render, TEMPLATES } from '../src/index.js';
import { EXAMPLES } from '../examples/examples.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => 'g-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const byId = Object.fromEntries(EXAMPLES.map((e) => [e.id, e]));

const DEFAULT_SRC = `% two exciton bubbles: screened W rungs inside, the exchange v̄ between them
exciton charge n=3 bubbles=2 link=coulomb linkLabel="\\bar{v}" ext=coulomb extLabel=v`;

const PRESETS = [
  ['Exciton chain', DEFAULT_SRC],
  ['Exciton · current, D', byId['exciton-current'].source],
  ['Exciton · charge, Wᵀ', byId['exciton-charge'].source],
  ['Fan–Migdal', byId['fm-hand'].source],
  ['Σᵉᵖ', byId['sigma-ep'].source],
  ['Polaritons', byId['dyson-d'].source],
  ['Cooper ladder', byId['ladder-pp'].source],
  ['Cooperon', byId['crossed'].source],
  ['BSE', byId['bse'].source],
  ['T-matrix', byId['tmatrix'].source],
  ['Parquet', byId['parquet'].source]
];

// particle legend for the header, drawn by the renderer itself
const legend = [
  ['electron', '(0,0) -> (1.3,0) fermion'],
  ['phonon', '(0,0) -- (1.3,0) phonon'],
  ['photon', '(0,0) -- (1.3,0) photon'],
  ['Coulomb v', '(0,0) -- (1.3,0) coulomb'],
  ['screened W', '(0,0) -- (1.3,0) screened'],
  ['current vertex', 'a at 0,0 current; (-0.6,0) -- a photon; a -- (0.6,0) fermion']
].map(([name, src]) => `<span class="lg-item">${render(src, { id: 'lg-' + name.replace(/\W/g, '') }).svg}<span>${esc(name)}</span></span>`).join('');

// geometry explainer: the hand-written Fan–Migdal block with the `grid` statement, at 60 px per unit
const explainer = render(byId['grid'].source, { unit: 60, id: 'explain' }).svg.replace('class="feyn-svg"', 'class="feyn-svg explain"');

const groups = [...new Set(EXAMPLES.map((e) => e.group))];
const gallery = groups.map((g) => {
  const cards = EXAMPLES.filter((e) => e.group === g).map((ex) => {
    const r = render(ex.source, { id: 'g-' + ex.id });
    const w = +(r.svg.match(/width="(\d+)"/) || [0, 0])[1];
    const wide = w > 330 || r.html.includes('feyn-eq');
    return `<article class="card${wide ? ' wide' : ''}">
  <div class="card-head"><h4>${esc(ex.title)}</h4><button type="button" class="btn ghost edit" data-src="${esc(ex.source)}">Edit in playground</button></div>
  ${ex.note ? `<p class="note">${esc(ex.note).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>` : ''}
  <div class="fig">${r.html}</div>
  <pre class="src"><code>${esc(ex.source)}</code></pre>
</article>`;
  }).join('\n');
  return `<h3 class="group" id="${slug(g)}">${esc(g)}</h3>\n<div class="cards">${cards}</div>`;
}).join('\n');

const groupNav = groups.map((g) => `<a href="#${slug(g)}">${esc(g)}</a>`).join('');

const statements = [
  ['vertex', 'a at 0,0 · S at 2,0 blob "\\Sigma" · K at 1,0 box label="K"'],
  ['line', 'a -> b fermion "G_0" · a <- b … · a -- b phonon'],
  ['options', 'bend=0.4 · dressed · side=right · mom="\\mathbf{q}" · arrow=end · color=teal'],
  ['inline point', '(-0.6,0) -- a fermion · +(0.6,0) is relative'],
  ['anchor', 'K.nw · K.se · S.e · S.30'],
  ['external leg', 'leg a left fermion in "n\\mathbf{k}"'],
  ['self-loop', 'v -- v phonon loop dir=up size=1.2'],
  ['text, caption', 'text "g^{DW}" at 0,-0.5 · caption "Fock"'],
  ['notation', 'style D = photon · style F = phonon dressed'],
  ['equation', 'a line starting with = + − × ≈ → begins a term · ... · | for no operator']
].map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td><code>${esc(v)}</code></td></tr>`).join('');

const templateRows = Object.entries(TEMPLATES).map(([name, t]) => {
  const opts = Object.entries(t.params).map(([k, v]) => (typeof v === 'boolean' ? k : `${k}=${v === '' ? '…' : v}`)).join(' ');
  const flags = t.flags ? Object.keys(t.flags).join(' · ') : '';
  return `<tr><th scope="row"><button type="button" class="tpl" data-src="${esc(t.example)}">${esc(name)}</button></th><td>${esc(t.title)}${flags ? `<span class="flags">flags: ${esc(flags)}</span>` : ''}</td><td><code class="opts">${esc(opts)}</code></td></tr>`;
}).join('');

const setup = [
  ['Install', 'npm install ./fumadocs-feynman-0.1.0.tgz'],
  ['lib/source.ts (fumadocs-mdx 15)', `import { applyMdxPreset } from 'fumadocs-mdx/config';
import { remarkFeynman } from 'fumadocs-feynman/remark';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    mdxOptions: applyMdxPreset({
      remarkPlugins: (defaults) => [remarkFeynman, ...defaults],
    }),
  },
});`],
  ['components/mdx.tsx', `import { Feynman } from 'fumadocs-feynman/react';

export function getMDXComponents(components) {
  return { ...defaultMdxComponents, Feynman, ...components };
}`]
].map(([h, c]) => `<div class="step"><p class="step-h">${esc(h)}</p><pre class="src"><code>${esc(c)}</code></pre></div>`).join('');

const initial = render(DEFAULT_SRC, { id: 'pg' }).html;

const html = `<meta charset="utf-8">
<title>fumadocs-feynman</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=IBM+Plex+Sans+Condensed:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root {
  /* Layout: one 1120px column; the playground band opens the page, specimen cards follow two-up, a reference sheet closes it.
     Tokens are the EPP primer's: its neutrals, its three particle hues and its type. */
  --bg: #f4f6f9; --surface: #ffffff; --surface-2: #eaeef4; --fg: #151b29; --fg-2: #2c3446; --muted: #5a6477; --rule: #d3d9e3;
  --accent: #2350c8; --accent-text: #2350c8; --bad: #b42318; --hl: rgba(35, 80, 200, 0.08);
  --font-text: "Source Serif 4", "Source Serif Pro", Georgia, serif;
  --font-ui: "IBM Plex Sans Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --feyn-electron: #2350c8; --feyn-phonon: #c26a00; --feyn-photon: #b5306c; --feyn-c4: #0b8aa3; --feyn-c5: #6d45c4;
  --feyn-electron-text: #2350c8; --feyn-phonon-text: #92500a; --feyn-photon-text: #a1295f; --feyn-c4-text: #076a80; --feyn-c5-text: #5a37a8;
  --feyn-ink: var(--fg); --feyn-muted: var(--muted); --feyn-surface: var(--surface);
  --feyn-font-math: var(--font-text); --feyn-font-text: var(--font-text);
  --radius: 6px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0d1119; --surface: #141a26; --surface-2: #1a2131; --fg: #e3e8f1; --fg-2: #c3cad8; --muted: #96a0b3; --rule: #2a3346;
    --accent: #6688f2; --accent-text: #93adff; --bad: #f97066; --hl: rgba(134, 166, 255, 0.10);
    --feyn-electron: #6688f2; --feyn-phonon: #c67c18; --feyn-photon: #d95e94; --feyn-c4: #169fb6; --feyn-c5: #9372ee;
    --feyn-electron-text: #93adff; --feyn-phonon-text: #f0aa4f; --feyn-photon-text: #f286b5; --feyn-c4-text: #5cc8dc; --feyn-c5-text: #b9a2ff;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0d1119; --surface: #141a26; --surface-2: #1a2131; --fg: #e3e8f1; --fg-2: #c3cad8; --muted: #96a0b3; --rule: #2a3346;
  --accent: #6688f2; --accent-text: #93adff; --bad: #f97066; --hl: rgba(134, 166, 255, 0.10);
  --feyn-electron: #6688f2; --feyn-phonon: #c67c18; --feyn-photon: #d95e94; --feyn-c4: #169fb6; --feyn-c5: #9372ee;
  --feyn-electron-text: #93adff; --feyn-phonon-text: #f0aa4f; --feyn-photon-text: #f286b5; --feyn-c4-text: #5cc8dc; --feyn-c5-text: #b9a2ff;
  color-scheme: dark;
}
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body { background: var(--bg); color: var(--fg); font-family: var(--font-text); font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
.wrap { max-width: 1120px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 64px; }
a { color: var(--accent-text); text-underline-offset: 2px; }
code { font-family: var(--font-mono); font-size: 0.86em; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
h1, h2, h3, h4 { text-wrap: balance; }

/* header */
.top { display: grid; gap: 14px; padding-block: 40px 28px; }
.top-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.kicker { margin: 0; font-family: var(--font-ui); font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
h1 { margin: 0; font-size: clamp(2rem, 5.4vw, 2.9rem); line-height: 1.08; font-weight: 600; letter-spacing: -0.015em; max-width: 22ch; }
h1 .e { color: var(--feyn-electron-text); }
.lede { margin: 0; max-width: 64ch; font-size: 1.12rem; color: var(--fg-2); }
.legend { display: flex; flex-wrap: wrap; gap: 6px 20px; align-items: center; font-family: var(--font-ui); font-size: 0.86rem; color: var(--fg-2); margin-top: 4px; }
.lg-item { display: inline-flex; align-items: center; gap: 6px; }
.lg-item svg { height: 22px; width: auto; }

/* controls */
.seg { display: inline-flex; border: 1px solid var(--rule); border-radius: 5px; overflow: hidden; background: var(--surface); }
.seg button { font: 500 0.8rem var(--font-ui); border: 0; background: transparent; color: var(--fg-2); padding: 4px 10px; cursor: pointer; border-right: 1px solid var(--rule); }
.seg button:last-child { border-right: 0; }
.seg button[aria-pressed="true"] { background: var(--accent); color: var(--surface); }
.btn { font: 500 0.82rem var(--font-ui); border: 1px solid var(--rule); background: var(--surface); color: var(--fg); border-radius: 5px; padding: 5px 12px; cursor: pointer; }
.btn:hover { border-color: var(--accent); color: var(--accent-text); }
.btn.ghost { background: transparent; padding: 3px 9px; font-size: 0.78rem; color: var(--muted); }
.btn.ghost:hover { color: var(--accent-text); }

/* playground */
.pg { background: var(--surface); border: 1px solid var(--rule); border-radius: var(--radius); padding: 16px; display: grid; gap: 12px; }
.pg-head { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: baseline; justify-content: space-between; }
h2 { font-size: 1.5rem; line-height: 1.2; margin: 0; font-weight: 600; }
.pg h2 { font-size: 1.2rem; }
.presets { display: flex; flex-wrap: wrap; gap: 6px; }
.presets button { font: 500 0.78rem var(--font-ui); border: 1px solid var(--rule); background: var(--bg); color: var(--fg-2); border-radius: 999px; padding: 3px 10px; cursor: pointer; }
.presets button:hover, .presets button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent-text); background: var(--hl); }
.pg-grid { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .pg-grid { grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); } }
.pg-edit { display: grid; gap: 8px; align-content: start; min-width: 0; }
.lab { font: 600 0.72rem var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
textarea { width: 100%; box-sizing: border-box; min-height: 12.5em; resize: vertical; font: 0.85rem/1.55 var(--font-mono); color: var(--fg); background: var(--bg); border: 1px solid var(--rule); border-radius: 5px; padding: 10px 12px; tab-size: 2; }
textarea:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px var(--hl); }
.pg-bar { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; font-family: var(--font-ui); font-size: 0.82rem; color: var(--fg-2); }
.pg-bar label { display: inline-flex; gap: 8px; align-items: center; }
.pg-bar output { font-family: var(--font-mono); font-size: 0.76rem; color: var(--fg); min-width: 9ch; }
.pg-bar input[type="range"] { accent-color: var(--accent); width: 130px; }
.pg-bar .btn { margin-left: auto; }
.errors { margin: 0; padding: 8px 12px 8px 30px; border-left: 3px solid var(--bad); background: var(--bg); border-radius: 0 5px 5px 0; font: 0.8rem/1.5 var(--font-mono); color: var(--bad); }
.errors .ln { font-weight: 500; margin-right: 6px; }
.pg-view { min-width: 0; min-height: 220px; display: grid; place-items: center; border: 1px dashed var(--rule); border-radius: 5px; padding: 8px 12px; overflow-x: auto; transition: opacity 0.15s; }
.pg-view.stale { opacity: 0.4; }
@media (prefers-reduced-motion: reduce) { .pg-view { transition: none; } }
.status { font-family: var(--font-ui); font-size: 0.8rem; color: var(--muted); min-height: 1.2em; }

/* geometry explainer */
.geo { display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 900px) { .geo { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); } }
.geo-fig { margin: 0; background: var(--surface); border: 1px solid var(--rule); border-radius: var(--radius); padding: 14px; overflow-x: auto; display: grid; justify-items: center; }
.geo-fig svg { max-width: 100%; height: auto; overflow: visible; }
.geo-text { display: grid; gap: 10px; min-width: 0; }
.geo-text p { margin: 0; max-width: 62ch; color: var(--fg-2); }

/* gallery */
.sec { margin-top: 56px; display: grid; gap: 12px; }
.sec > p { margin: 0; max-width: 66ch; color: var(--fg-2); }
.groupnav { display: flex; flex-wrap: wrap; gap: 6px 16px; font-family: var(--font-ui); font-size: 0.9rem; }
.group { font-family: var(--font-ui); font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 26px 0 0; font-weight: 600; scroll-margin-top: 16px; }
.cards { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 760px) { .cards { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .card.wide { grid-column: 1 / -1; } }
.card { background: var(--surface); border: 1px solid var(--rule); border-radius: var(--radius); padding: 12px 14px; display: grid; gap: 8px; align-content: start; min-width: 0; }
.card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.card h4 { margin: 0; font-family: var(--font-ui); font-size: 0.98rem; font-weight: 600; }
.note { margin: 0; font-size: 0.92rem; color: var(--fg-2); max-width: 70ch; }
.note code { font-size: 0.82em; }
.fig { overflow-x: auto; display: grid; justify-items: center; padding: 4px 0; }
.fig .feyn { margin: 6px 0 !important; }
pre.src { margin: 0; background: var(--bg); border: 1px solid var(--rule); border-radius: 5px; padding: 8px 10px; overflow-x: auto; font: 0.78rem/1.5 var(--font-mono); color: var(--fg-2); }
pre.src code { font-size: 1em; }

/* reference */
.ref-grid { display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .ref-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.ref-grid > div { min-width: 0; display: grid; gap: 10px; align-content: start; }
.ref-grid h3, .sec h3.sub { margin: 0; font-size: 1.1rem; font-weight: 600; }
.step { display: grid; gap: 4px; }
.step-h { margin: 0; font-family: var(--font-ui); font-size: 0.85rem; font-weight: 600; color: var(--fg-2); }
.tbl { overflow-x: auto; border: 1px solid var(--rule); border-radius: var(--radius); background: var(--surface); }
table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
th, td { text-align: left; vertical-align: top; padding: 7px 10px; border-bottom: 1px solid var(--rule); }
tr:last-child th, tr:last-child td { border-bottom: 0; }
th { font-family: var(--font-ui); font-weight: 600; white-space: nowrap; }
td code { font-size: 0.8rem; color: var(--fg-2); }
.tpl { font: 600 0.86rem var(--font-mono); color: var(--accent-text); background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
.flags { display: block; font-family: var(--font-ui); font-size: 0.78rem; color: var(--muted); }
code.opts { display: block; min-width: 26ch; }
footer { margin-top: 56px; padding-top: 16px; border-top: 1px solid var(--rule); font-family: var(--font-ui); font-size: 0.85rem; color: var(--muted); }
</style>

<div class="wrap">
<header class="top">
  <div class="top-row">
    <p class="kicker">fumadocs-feynman · prototype 0.1 · not on npm</p>
    <div class="seg" role="group" aria-label="Theme">
      <button type="button" data-theme-set="system" aria-pressed="true">System</button>
      <button type="button" data-theme-set="light" aria-pressed="false">Light</button>
      <button type="button" data-theme-set="dark" aria-pressed="false">Dark</button>
    </div>
  </div>
  <h1>Feynman diagrams as <span class="e">code blocks</span></h1>
  <p class="lede">Write a diagram in a <code>\`\`\`feynman</code> block, the way fumadocs uses Mermaid. The remark plugin hands it to a server component that emits static SVG at build time, in the EPP primer’s colours, following the site’s light and dark theme. No layout engine and no client JavaScript.</p>
  <div class="legend" aria-label="Line vocabulary">${legend}</div>
</header>

<section class="pg" aria-labelledby="pg-h">
  <div class="pg-head">
    <h2 id="pg-h">Playground</h2>
    <div class="presets" role="group" aria-label="Load an example">${PRESETS.map(([n, s], i) => `<button type="button" data-src="${esc(s)}" aria-pressed="${i === 0}">${esc(n)}</button>`).join('')}</div>
  </div>
  <div class="pg-grid">
    <div class="pg-edit">
      <label class="lab" for="pg-src">Block source</label>
      <textarea id="pg-src" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off">${esc(DEFAULT_SRC)}</textarea>
      <div class="pg-bar">
        <label for="pg-unit">Scale <input type="range" id="pg-unit" min="28" max="60" step="2" value="40"><output id="pg-unit-out" for="pg-unit">40 px/unit</output></label>
        <button type="button" class="btn" id="pg-copy">Copy as MDX</button>
      </div>
      <ol class="errors" id="pg-errors" hidden></ol>
      <p class="status" id="pg-status" aria-live="polite"></p>
    </div>
    <div class="pg-view" id="pg-out">${initial}</div>
  </div>
</section>

<section class="sec" aria-labelledby="geo-h" id="geometry">
  <h2 id="geo-h">Coordinates and curvature</h2>
  <div class="geo">
    <figure class="geo-fig">${explainer}</figure>
    <div class="geo-text">
      <p>Positions are <code>(x, y)</code> in units of 40 px, with y pointing up. The main line of a diagram sits on y = 0, where an equation sets its = and + signs. Here a and b are on that line, 2.8 units apart. A line that says <code>grid</code> draws this grid and the vertex names while you draft.</p>
      <p><code>above</code> and <code>below</code> name a side of the page, whatever order the ends are written in. On a straight line they place the label (<code>"G" below</code>); on an arc they say which way it bulges; on a loop, where it goes. The arrow never changes the shape.</p>
      <p><code>bulge=1.2 above</code> gives the height of the arc in the same units as the positions, so it stays 1.2 when a vertex moves. <code>arc above</code> is a half circle.</p>
      <pre class="src"><code>${esc(byId['grid'].source)}</code></pre>
      <p>The older <code>bend=0.42</code> gives the height as a fraction of the distance between the ends (0.42 × 2.8 ≈ 1.18 units). Without a page word, its sign counts from the written direction: positive bulges to the left of a → b.</p>
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="gal-h">
  <h2 id="gal-h">Gallery</h2>
  <p>Every diagram below is one block, rendered by the same code that runs in a fumadocs build. The templates cover the standard topologies; the last group is written by hand.</p>
  <nav class="groupnav" aria-label="Gallery groups">${groupNav}</nav>
  ${gallery}
</section>

<section class="sec" aria-labelledby="ref-h" id="reference">
  <h2 id="ref-h">Reference</h2>
  <div class="ref-grid">
    <div><h3>In a fumadocs site</h3>${setup}</div>
    <div><h3>Statements</h3><div class="tbl"><table><tbody>${statements}</tbody></table></div>
      <p class="note">Coordinates are units of 40 px with y up; the main line sits on y = 0, where an equation’s operators are set. Labels take a TeX subset: <code>G^{cn}</code>, <code>\\Sigma^{ep}</code>, <code>\\bar{v}</code>, <code>\\mathbf{k}</code>.</p></div>
  </div>
  <h3 class="sub">Templates</h3>
  <div class="tbl"><table><thead><tr><th scope="col">Name</th><th scope="col">Draws</th><th scope="col">Options and defaults</th></tr></thead><tbody>${templateRows}</tbody></table></div>
</section>

<footer>Built from the fumadocs-feynman prototype. The diagrams here and in a fumadocs page come from the same renderer.</footer>
</div>

<script type="module">
import { render } from './src/index.js';
const $ = (s) => document.querySelector(s);
const src = $('#pg-src'), out = $('#pg-out'), errs = $('#pg-errors'), unit = $('#pg-unit'), unitOut = $('#pg-unit-out'), status = $('#pg-status');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

let queued = false;
function update() {
  queued = false;
  const r = render(src.value, { unit: +unit.value, id: 'pg' });
  unitOut.textContent = unit.value + ' px/unit';
  if (r.errors.length) {
    errs.innerHTML = r.errors.map((e) => '<li>' + (e.line ? '<span class="ln">line ' + e.line + '</span>' : '') + esc(e.message) + '</li>').join('');
    errs.hidden = false;
    out.classList.add('stale');
  } else {
    errs.hidden = true;
    out.classList.remove('stale');
    out.innerHTML = r.html;
  }
  store.set('feyn-draft', src.value);
}
const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
src.addEventListener('input', schedule);
unit.addEventListener('input', schedule);

const presets = [...document.querySelectorAll('.presets button')];
function load(text, from) {
  src.value = text;
  presets.forEach((b) => b.setAttribute('aria-pressed', String(b === from)));
  update();
}
presets.forEach((b) => b.addEventListener('click', () => load(b.dataset.src, b)));
document.querySelectorAll('[data-src]:not(.presets button)').forEach((b) => b.addEventListener('click', () => {
  load(b.dataset.src, null);
  document.querySelector('.pg').scrollIntoView({ block: 'start' });
  src.focus({ preventScroll: true });
}));

$('#pg-copy').addEventListener('click', () => {
  const text = '\`\`\`feynman\\n' + src.value.trim() + '\\n\`\`\`';
  const done = () => { status.textContent = 'Copied the block as MDX.'; };
  const fallback = () => { src.focus(); src.select(); status.textContent = 'Copy is blocked here: the source is selected, press Ctrl+C or ⌘C.'; };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch { fallback(); }
});

const draft = store.get('feyn-draft');
if (draft && draft !== src.value) { src.value = draft; presets.forEach((b) => b.setAttribute('aria-pressed', 'false')); update(); }

// theme: system / light / dark on the root element
const themeBtns = [...document.querySelectorAll('[data-theme-set]')];
function setTheme(t) {
  if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  themeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
  store.set('feyn-theme', t);
}
themeBtns.forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));
const saved = store.get('feyn-theme');
if (saved === 'light' || saved === 'dark') setTheme(saved);
</script>
`;

writeFileSync(new URL('./index.html', import.meta.url), html);
console.log(`gallery/index.html written (${(html.length / 1024).toFixed(0)} KB, ${EXAMPLES.length} examples)`);
