import { llms, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { basePath, docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { defineDocs } from 'fumadocs-mdx/macro';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { remarkFeynman } from 'fumadocs-feynman/remark';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // keep the fumadocs defaults and add ```feynman blocks (a collection-level mdxOptions replaces the defaults)
    mdxOptions: applyMdxPreset({ remarkPlugins: (defaults) => [remarkFeynman, ...defaults] }),
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

// The llms files and the Markdown copies of the pages hold plain links, which nothing else prefixes with the base path
// the site is served under (GitHub Pages), so they get it here: in the index, in each page's heading and in its links.
const withBasePath = (markdown: string) => markdown.replace(/\]\(\/(?!\/)/g, `](${basePath}/`);

export const docsLlms = llms(source, {
  renderUrl: (item) => basePath + item.url,
  renderPage: async (page) => `# ${page.data.title} (${basePath}${page.url})

${withBasePath(await page.data.getText('processed'))}`,
});
