import Link from 'next/link';
import { Feynman } from 'fumadocs-feynman/react';
import { githubUrl } from '@/lib/shared';

// a block written by hand, shown with what it draws
const SOURCE = `a at (0, 0) disk; b at (2.8, 0) disk
leg a left; leg b right
b -> a fermion dressed "G" below
a -- b phonon dressed bulge=1.2 above "F"`;

// templates: one line each
const SHOWCASE = [
  { chart: 'fock vertical legLabel="n\\mathbf{k}" G="m,\\mathbf{k}+\\mathbf{q}" v="v(\\mathbf{q})" mom="\\mathbf{q}"', source: 'fock vertical mom="\\mathbf{q}" …', caption: 'Fock exchange, standing up' },
  { chart: 'gw gamma="\\Gamma"', source: 'gw gamma="\\Gamma"', caption: 'Σ = iGWΓ' },
  { chart: 'exciton n=3 charge extLabel="W^T"', source: 'exciton n=3 charge', caption: 'An exciton: a ladder inside a bubble' },
  { chart: 'trion negative', source: 'trion negative', caption: 'A negative trion' },
];

const FEATURES: [string, string][] = [
  ['Static SVG', 'Rendered at build time on the server: no client JavaScript and no layout engine, and the same output every time.'],
  ['Templates', 'Self-energies, bubbles, ladders, excitons, trions, GW and GT, each in one line, with options for the labels and the variants.'],
  ['By hand', 'Every template can be written out vertex by vertex. The By hand tab shows how, ready to copy and change.'],
  ['Follows the theme', 'Colours are CSS variables that follow light and dark mode, and labels use the math font of the page.'],
  ['Checked at build time', 'A mistake is a build warning that names the line and suggests the fix, and an error box on the page.'],
  ['Many-body notation', 'Electrons blue, phonons amber, photons and Coulomb lines rose. Arrows mark fermions only.'],
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Feynman diagrams for fumadocs</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-fd-muted-foreground">
          Write diagrams in <code className="font-mono text-fd-foreground">feynman</code> code blocks, the way fumadocs
          uses Mermaid. They become static, theme-aware SVG at build time.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/docs/installation" className="rounded-full bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90">
            Get started
          </Link>
          <Link href="/docs/examples" className="rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent">
            Examples
          </Link>
          <a href={githubUrl} className="rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent">
            GitHub
          </a>
        </div>
        <p className="mt-6">
          <code className="inline-block rounded-lg border bg-fd-card px-4 py-2 font-mono text-sm">npm install fumadocs-feynman</code>
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-5xl items-center gap-6 px-4 pb-16 md:grid-cols-2">
        <pre className="overflow-x-auto rounded-xl border bg-fd-card p-4 text-left font-mono text-[13px] leading-relaxed">
          <span className="text-fd-muted-foreground">```feynman</span>
          {'\n' + SOURCE + '\n'}
          <span className="text-fd-muted-foreground">```</span>
        </pre>
        <div className="rounded-xl border p-4">
          <Feynman chart={SOURCE} unit={52} caption="The Fan–Migdal self-energy, written by hand" />
        </div>
      </section>

      <section className="border-t bg-fd-card/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold">One line for the standard diagrams</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-fd-muted-foreground">
            Templates draw whole diagrams from a name and a few options. Their vertices keep their names, so you can label
            them and attach more lines.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {SHOWCASE.map((d) => (
              <figure key={d.chart} className="flex flex-col rounded-xl border bg-fd-background p-4">
                <div className="flex flex-1 items-center justify-center">
                  <Feynman chart={d.chart} />
                </div>
                <figcaption className="mt-3 border-t pt-3 text-sm">
                  <code className="font-mono text-[13px]">{d.source}</code>
                  <span className="mt-1 block text-fd-muted-foreground">{d.caption}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, text]) => (
            <div key={title}>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap justify-center gap-3">
          <Link href="/docs/quick-start" className="rounded-full bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90">
            Draw your first diagram
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-fd-muted-foreground">
        fumadocs-feynman is released under the MIT license.{' '}
        <a href={githubUrl} className="underline underline-offset-4">
          Source on GitHub
        </a>
        .
      </footer>
    </main>
  );
}
