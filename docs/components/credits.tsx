import Link from 'next/link';
import { cn } from '@/lib/cn';
import { author, copyrightYear, fundingUrl, licenseUrl } from '@/lib/shared';
import { Email } from './email';

const link = 'underline-offset-4 transition-colors hover:text-fd-foreground hover:underline';
const dot = <span aria-hidden="true"> · </span>;

/** The copyright line under every page: the author, the licence, and how to cite the package, write and support it. */
export function Credits({ className }: { className?: string }) {
  return (
    <p className={cn('text-sm text-fd-muted-foreground', className)}>
      © {copyrightYear}{' '}
      <a href={author.url} className={link}>
        {author.displayName}
      </a>
      {dot}
      <a href={licenseUrl} className={link}>
        MIT License
      </a>
      {dot}
      <Link href="/docs/about#citing" className={link}>
        Cite
      </Link>
      {dot}
      <Email className={link}>Email</Email>
      {dot}
      <a href={fundingUrl} className={link}>
        Support
      </a>
    </p>
  );
}
