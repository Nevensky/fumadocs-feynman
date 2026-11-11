// Writes content/docs/feynman.mdx from the package's examples: node scripts/gen-feynman-page.mjs
import { writeFileSync } from 'node:fs';
import { EXAMPLES } from '../../examples/examples.js';

const groups = [...new Set(EXAMPLES.map((e) => e.group))];
let out = `---
title: Feynman diagrams
description: "Feynman code blocks, rendered to static SVG at build time by fumadocs-feynman."
---

Write a diagram in a code block whose language is \`feynman\`, the way fumadocs uses \`mermaid\` blocks. The remark plugin turns the
block into \`<Feynman chart="..." />\`, a server component that emits static SVG: no client JavaScript, and the
colours follow the light/dark theme through CSS variables.

`;
for (const g of groups) {
  out += `## ${g}\n\n`;
  for (const ex of EXAMPLES.filter((e) => e.group === g)) {
    out += `### ${ex.title}\n\n${ex.note ? ex.note + '\n\n' : ''}\`\`\`\`md\n\`\`\`feynman\n${ex.source}\n\`\`\`\n\`\`\`\`\n\n\`\`\`feynman\n${ex.source}\n\`\`\`\n\n`;
  }
}
out += `## Fence options and the component

A caption from the fence meta:

\`\`\`feynman caption="The Fan–Migdal self-energy, with screened vertices"
fan-migdal dressed vertex=disk
\`\`\`

The component can also be used directly:

<Feynman chart="ladder n=2 pp rung=photon rungLabel=D" caption="Photon exchange in the particle–particle channel" />
`;
writeFileSync(new URL('../content/docs/feynman.mdx', import.meta.url), out);
console.log(`wrote content/docs/feynman.mdx (${EXAMPLES.length} examples)`);
