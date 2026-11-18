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
// Options: { lang = 'feynman', component = 'Feynman', styles, strict = false, validate = true, source = false }
// The fence meta can carry caption="...", title="...", unit=36 and id="...", and the bare word source.
// Diagram errors are reported against the .mdx file at build time (as errors with strict: true).
//
// source (in the fence meta, or for every block with the option): the diagram is followed by its source. A block
// that uses templates gets two code tabs, Template and By hand: the block as written, and the same diagram written
// out vertex by vertex (expand()). The tabs are fumadocs-ui's CodeBlockTabs, which defaultMdxComponents includes;
// they are emitted ready-made, so they work in either plugin order and without remarkCodeTab. Each pair of tabs
// switches on its own (switching every pair on a long page would move the text under the reader).

import { render, expand, templatesIn } from '../src/index.js';

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

const attr = (name, value) => ({ type: 'mdxJsxAttribute', name, value });
const element = (name, attributes, children) => ({ type: 'mdxJsxFlowElement', name, attributes, children });

/**
 * What shows a chart's source: one code block, or, when the block uses templates, Template / By hand tabs.
 * Returns { nodes, error }: error when the block could not be written out by hand (the Template tab is then shown alone).
 */
function sourceBlocks(chart, lang, styles) {
  const code = (s) => ({ type: 'code', lang: 'md', meta: null, value: `\`\`\`${lang}\n${s}\n\`\`\`` });
  let hand = null, error = null;
  try { if (templatesIn(chart, { styles }).length) hand = expand(chart, { styles }); } catch (e) { error = e; }
  if (!hand) return { nodes: [code(chart)], error };
  const tabs = [['Template', chart], ['By hand', hand]];
  const node = element('CodeBlockTabs', [attr('defaultValue', 'Template')], [
    element('CodeBlockTabsList', [], tabs.map(([v]) => element('CodeBlockTabsTrigger', [attr('value', v)], [{ type: 'text', value: v }]))),
    ...tabs.map(([v, s]) => element('CodeBlockTab', [attr('value', v)], [code(s)]))
  ]);
  // remarkCodeTab leaves an element it has made alone; this one is made already
  node.data = { _code_tab_visited: true };
  return { nodes: [node], error };
}

export function remarkFeynman(options = {}) {
  const lang = options.lang ?? 'feynman';
  const name = options.component ?? 'Feynman';
  return (tree, file) => {
    walk(tree, (node, index, parent) => {
      if (node.type !== 'code' || node.lang !== lang) return;
      const chart = String(node.value ?? '').trim();
      // the fence line is position.start.line; the block's first line is the one after it
      const report = (message, line, fail) => {
        const reason = `feynman diagram: ${message}`;
        const place = node.position ? { line: node.position.start.line + (line ?? 1), column: 1 } : undefined;
        if (fail) file.fail(reason, place, 'fumadocs-feynman');
        file.message(reason, place, 'fumadocs-feynman');
        // MDX loaders (fumadocs-mdx among them) do not print vfile messages, so say it on the console too
        if (options.quiet !== true) console.warn(`[fumadocs-feynman] ${file.path ?? 'mdx'}${place ? `:${place.line}` : ''}: ${message}`);
      };
      let valid = false;
      if (options.validate !== false) {
        const { errors } = render(chart, { styles: options.styles });
        for (const e of errors) report(e.message, e.line, options.strict);
        valid = errors.length === 0;
      }
      const attributes = [{ type: 'mdxJsxAttribute', name: 'chart', value: chart }];
      for (const [k, v] of parseMeta(node.meta)) attributes.push({ type: 'mdxJsxAttribute', name: k, value: v });
      parent.children[index] = { type: 'mdxJsxFlowElement', name, attributes, children: [], position: node.position };
      // the bare word source, not one inside a quoted value such as caption="the source term"
      const bare = String(node.meta || '').replace(/"[^"]*"|'[^']*'/g, '');
      if (options.source || /(^|\s)source(\s|$)/.test(bare)) {
        const { nodes, error } = sourceBlocks(chart, lang, options.styles);
        // a diagram with errors has been reported already; a valid one that cannot be written out is a bug to report
        if (error && valid) report(`the By hand tab is left out: ${error.message}`);
        parent.children.splice(index + 1, 0, ...nodes);
      }
    });
  };
}

export default remarkFeynman;
