import type { SVGProps } from 'react';

/** The site's mark: an electron line through a vertex, and a photon leaving it. The vertex follows the text colour. */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true" {...props}>
      <path d="M3 24H29" stroke="#2350c8" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M11.5 24l-4-2.9v5.8zM24.5 24l-4-2.9v5.8z" fill="#2350c8" />
      <path d="M16 22q3.2-2.4 0-4.8t0-4.8 0-4.8 0-4.6" stroke="#b5306c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="24" r="2.6" fill="currentColor" />
    </svg>
  );
}
