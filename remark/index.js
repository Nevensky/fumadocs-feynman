// remark plugin: ```feynman code blocks -> <Feynman chart="..." /> MDX elements.
// It mirrors fumadocs' remarkMdxMermaid: the component does the rendering (on the server, to static SVG).
//
//   // fumadocs-mdx 15 (lib/source.ts, macro API)
//   import { applyMdxPreset } from 'fumadocs-mdx/config';
//   import { remarkFeynman } from 'fumadocs-feynman/remark';
//   defineDocs({ docs: { mdxOptions: applyMdxPreset({ remarkPlugins: (v) => [remarkFeynman, ...v] }) } });
//
//   // fumadocs-mdx 11–14 (source.config.ts)
//   export default defineConfig({ mdxOptions: { remarkPlugins: [remarkFeynman] } });
//
// Options: { lang = 'feynman', component = 'Feynman', styles, strict = false, validate = true }
// The fence meta can carry caption="...", title="...", unit=36 and id="...".
// Diagram errors are reported against the .mdx file at build time (as errors with strict: true).

import { render } from '../src/index.js';

const META_KEYS = new Set(['caption', 'title', 'unit', 'id']);

function parseMeta(meta) {
  const out = [];
  if (!meta) return out;
  const re = /([A-Za-z]\w*)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let m;
  while ((m = re.exec(meta))) if (META_KEYS.has(m[1])) out.push([m[1], m[2] ?? m[3] ?? m[4]]);
  return out;
}

function walk(node, visit) {
  const kids = node.children;
  if (!Array.isArray(kids)) return;
  for (let i = 0; i < kids.length; i++) {
    visit(kids[i], i, node);
    walk(kids[i], visit);
  }
}

export function remarkFeynman(options = {}) {
  const lang = options.lang ?? 'feynman';
  const name = options.component ?? 'Feynman';
  return (tree, file) => {
    walk(tree, (node, index, parent) => {
      if (node.type !== 'code' || node.lang !== lang) return;
      const chart = String(node.value ?? '').trim();
      if (options.validate !== false) {
        const { errors } = render(chart, { styles: options.styles });
        for (const e of errors) {
          const reason = `feynman diagram: ${e.message}`;
          // the fence line is position.start.line; the block's first line is the one after it
          const place = node.position ? { line: node.position.start.line + (e.line ?? 1), column: 1 } : undefined;
          if (options.strict) file.fail(reason, place, 'fumadocs-feynman');
          file.message(reason, place, 'fumadocs-feynman');
          // MDX loaders (fumadocs-mdx among them) do not print vfile messages, so say it on the console too
          if (options.quiet !== true) console.warn(`[fumadocs-feynman] ${file.path ?? 'mdx'}${place ? `:${place.line}` : ''}: ${e.message}`);
        }
      }
      const attributes = [{ type: 'mdxJsxAttribute', name: 'chart', value: chart }];
      for (const [k, v] of parseMeta(node.meta)) attributes.push({ type: 'mdxJsxAttribute', name: k, value: v });
      parent.children[index] = { type: 'mdxJsxFlowElement', name, attributes, children: [], position: node.position };
    });
  };
}

export default remarkFeynman;
