// Compiles MDX with the real MDX compiler and the remark plugin: node scripts/test-remark.mjs
import { compile } from '@mdx-js/mdx';
import { VFile } from 'vfile';
import { remarkFeynman } from 'fumadocs-feynman/remark';

const good = '# Title\n\n```feynman caption="Fan–Migdal"\nfan-migdal dressed\n```\n\ntext\n';
const bad = '# Title\n\n```feynman\na at 0,0\na -> c fermion\n```\n';

const js = String(await compile(good, { remarkPlugins: [remarkFeynman] }));
console.log('component element emitted:', /_components\.Feynman|Feynman/.test(js) && js.includes('fan-migdal dressed'));
console.log('caption passed through:', js.includes('Fan–Migdal'));

const file = new VFile({ path: 'content/docs/x.mdx', value: bad });
await compile(file, { remarkPlugins: [[remarkFeynman, { quiet: true }]] });
console.log('warning recorded:', file.messages.map((m) => `${m.line}:${m.reason}`));

try {
  await compile(new VFile({ path: 'content/docs/x.mdx', value: bad }), { remarkPlugins: [[remarkFeynman, { strict: true, quiet: true }]] });
  console.log('strict: did NOT throw');
} catch (e) {
  console.log('strict throws:', e.line, e.reason ?? e.message);
}
