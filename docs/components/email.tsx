'use client';

import { type ComponentProps, useEffect, useState } from 'react';

// The address is put together in the browser, after the page has loaded. So it is not in the static HTML, the page
// data, the search index or the llms.txt files, where spam harvesters look for addresses, and no address-like text
// is in the JavaScript either: it is stored base64-encoded.
const ENCODED = 'bmV2ZW4uZ29sZW5pY0BnbWFpbC5jb20=';

/**
 * A mailto link to the author. Until the page has hydrated, and without JavaScript, it is plain text (a span), so it
 * never looks like a link that does nothing.
 */
export function Email({ children = 'Email', ...props }: ComponentProps<'a'>) {
  const [href, setHref] = useState<string>();
  useEffect(() => setHref(`mailto:${atob(ENCODED)}`), []);
  if (!href) return <span>{children}</span>;
  return (
    <a {...props} href={href}>
      {children}
    </a>
  );
}
