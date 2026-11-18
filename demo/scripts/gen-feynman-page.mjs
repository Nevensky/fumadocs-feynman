// Writes content/docs/feynman.mdx from the package's examples: node scripts/gen-feynman-page.mjs
import { writeFileSync } from 'node:fs';
import { EXAMPLES } from '../../examples/examples.js';

const groups = [...new Set(EXAMPLES.map((e) => e.group))];
// a note as MDX: plain text with `code` spans, as the gallery shows it. Outside the spans, MDX would read { as an
// expression, < as a tag, \ as an escape and * _ [ ] as markup, so those are escaped.
const mdxNote = (s) => s.split(/(`[^`]*`)/).map((part, i) => (i % 2 ? part : part.replace(/[\\{}<>*_[\]]/g, '\\$&'))).join('');
let out = `---
title: Feynman diagrams
description: "Feynman code blocks, rendered to static SVG at build time by fumadocs-feynman."
---

Write a diagram in a code block whose language is \`feynman\`, the way fumadocs uses \`mermaid\` blocks. The remark plugin turns the
block into \`<Feynman chart="..." />\`, a server component that emits static SVG: no client JavaScript, and the
colours follow the light/dark theme through CSS variables.

Every example below is a block with \`source\` in its fence: the diagram is followed by what was written. Where that
is a template, the **By hand** tab shows the same diagram written out vertex by vertex, line by line: the place to
start from when no template quite fits.

`;
for (const g of groups) {
  out += `## ${g}\n\n`;
  for (const ex of EXAMPLES.filter((e) => e.group === g)) {
    out += `### ${ex.title}\n\n${ex.note ? mdxNote(ex.note) + '\n\n' : ''}\`\`\`feynman source\n${ex.source}\n\`\`\`\n\n`;
  }
}
out += `## Fence options and the component

\`source\` in the fence meta shows the block's source under the diagram, with a By hand tab when it uses a template:

\`\`\`\`md
\`\`\`feynman source
fock vertical
\`\`\`
\`\`\`\`

A caption from the fence meta:

\`\`\`feynman caption="The Fan–Migdal self-energy, with screened vertices"
fan-migdal dressed vertex=disk
\`\`\`

The component can also be used directly:

<Feynman chart="ladder n=2 pp rung=photon rungLabel=D" caption="Photon exchange in the particle–particle channel" />
`;
writeFileSync(new URL('../content/docs/feynman.mdx', import.meta.url), out);
console.log(`wrote content/docs/feynman.mdx (${EXAMPLES.length} examples)`);
