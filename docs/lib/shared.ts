import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'fumadocs-feynman';
export const appDescription =
  'Feynman diagrams for fumadocs: write them in feynman code blocks, get static, theme-aware SVG at build time.';
export const docsRoute = '/docs';
// a sub-path the site is served from (GitHub Pages), for URLs that do not go through next/link
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
  user: 'Nevensky',
  repo: 'fumadocs-feynman',
  branch: 'main',
};
export const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: basePath + getContentUrl(segments, page.locale) };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: basePath + getImageUrl(segments, page.locale) };
}
