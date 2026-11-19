// Compiles docs pages with the MDX compiler and the feynman remark plugin in strict mode, and reports any error with
// its file and line: a quick check before a full build. node scripts/check-pages.mjs [file.mdx ...] (default: all)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { VFile } from 'vfile';
import { remarkFeynman } from 'fumadocs-feynman/remark';

const root = new URL('../content/docs/', import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.mdx') ? [join(d, f)] : []));
const files = process.argv.length > 2 ? process.argv.slice(2) : walk(root);
// the errors page shows broken diagrams on purpose
const expectErrors = (f) => f.endsWith('guides/errors.mdx');
let bad = 0;
for (const f of files) {
  // the frontmatter is kept as blank lines, so that line numbers are the file's
  const file = new VFile({ path: f, value: readFileSync(f, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, (m) => '\n'.repeat(m.split('\n').length - 1)) });
  try {
    await compile(file, { remarkPlugins: [remarkGfm, [remarkFeynman, { quiet: true, strict: !expectErrors(f) }]] });
    // what the plugin reports without failing: a By hand tab left out, or an error on the errors page
    const notes = file.messages.filter((m) => !expectErrors(f) || !/feynman diagram: /.test(m.reason) || /By hand/.test(m.reason));
    if (notes.length) { bad++; for (const m of notes) console.log(`${relative(process.cwd(), f)}:${m.line ?? '?'}: ${m.reason}`); }
  } catch (e) {
    bad++;
    console.log(`${relative(process.cwd(), f)}:${e.line ?? e.place?.line ?? '?'}: ${e.reason ?? e.message}`);
  }
}
console.log(`${files.length - bad}/${files.length} pages compile`);
process.exit(bad ? 1 : 0);
