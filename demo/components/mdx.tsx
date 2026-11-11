import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Feynman } from 'fumadocs-feynman/react';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Feynman,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
