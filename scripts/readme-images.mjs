// Renders the picture at the top of the README, in light and dark, into .github/assets/: node scripts/readme-images.mjs
// GitHub shows a README's images as <img>, with no stylesheet, so each colour variable becomes its value for the theme.
import { mkdirSync, writeFileSync } from 'node:fs';
import { render, TOKENS } from '../src/index.js';

// the standalone SVG has no captions (they are HTML, under each term of the page's figure)
const SOURCE = `fan-migdal dressed vertex=disk
| fock vertical legLabel="n\\mathbf{k}" G="m,\\mathbf{k}+\\mathbf{q}" v="v(\\mathbf{q})" mom="\\mathbf{q}"
| exciton n=3 charge extLabel="W^T"`;

const SERIF = "'Source Serif 4','STIX Two Text',Cambria,Georgia,'Times New Roman',serif";
const r = render(SOURCE, { id: 'readme' });
if (r.errors.length) throw new Error(JSON.stringify(r.errors));
const out = new URL('../.github/assets/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const theme of ['light', 'dark']) {
  const t = TOKENS[theme];
  const svg = r.svg
    // fonts: the fallback list without KaTeX's, which an <img> on GitHub cannot load
    .replace(/var\(--feyn-(font-math|font-text)(?:,\s*([^)]*))?\)/g, (m, k, fallback) => fallback || SERIF)
    .replace(/var\(--feyn-([a-z0-9-]+),\s*([^)]*)\)/g, (m, k, fallback) => t[k] ?? fallback);
  writeFileSync(new URL(`readme-${theme}.svg`, out), svg);
}
console.log('wrote .github/assets/readme-light.svg and readme-dark.svg');
