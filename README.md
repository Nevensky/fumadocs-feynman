# fumadocs-feynman

Feynman diagrams for fumadocs, written in ```` ```feynman ```` code blocks the way fumadocs uses Mermaid.
The diagrams are rendered to static SVG at build time. They need no client JavaScript and no layout engine, and
their colours follow the light and dark themes through CSS variables. The default palette is the one of the EPP
primer: electrons blue, phonons amber, photons and Coulomb lines rose, current vertices teal.

````md
```feynman
fan-migdal dressed vertex=disk
```

```feynman
exciton n=3 charge extLabel="W^T"
```

```feynman
a at (0, 0) disk; b at (2.8, 0) disk
leg a left; leg b right
b -> a fermion dressed "G" below
a -- b phonon dressed bulge=1.2 above "F"
```
````

## Setup in fumadocs

1. Install the package (for now from a folder or a tarball made with `npm pack`).
2. Add the remark plugin. With fumadocs-mdx 15 (the `fumadocs-mdx/macro` API in `lib/source.ts`):

   ```ts
   import { applyMdxPreset } from 'fumadocs-mdx/config';
   import { remarkFeynman } from 'fumadocs-feynman/remark';

   const docs = defineDocs({
     dir: 'content/docs',
     docs: {
       // a collection-level mdxOptions replaces the defaults, so wrap it in applyMdxPreset
       mdxOptions: applyMdxPreset({ remarkPlugins: (defaults) => [remarkFeynman, ...defaults] }),
       // ...
     },
   });
   ```

   With fumadocs-mdx 11–14 (`source.config.ts`): `defineConfig({ mdxOptions: { remarkPlugins: [remarkFeynman] } })`.
3. Register the component in `components/mdx.tsx`:

   ```tsx
   import { Feynman } from 'fumadocs-feynman/react';
   // return { ...defaultMdxComponents, Feynman, ...components }
   ```

`<Feynman>` has no hooks and no `'use client'`, so on Next.js it renders on the server and ships no JavaScript.
It puts the theme stylesheet in `<head>` once, through React 19's `<style href precedence>`. If you would rather
import it yourself, add `@import 'fumadocs-feynman/style.css';` to `global.css` and pass `injectStyle={false}`.

For site-wide notation, make your own component with `createFeynman({ styles: { D: 'photon', F: 'phonon dressed' } })`,
and pass the same `styles` to `remarkFeynman({ styles })` so that build-time validation knows them.

Plugin options: `{ lang = 'feynman', component = 'Feynman', styles, strict = false, validate = true }`. A diagram
error becomes a build warning that points at the line in the `.mdx` file, or a build error with `strict: true`. On
the page, an error box lists the errors with line numbers. The fence meta can set `caption="…"`, `title="…"`
(the accessible description), `unit=36` and `id="…"`.

## The language

One statement per line, or several separated by `;`. A `%` or `//` starts a comment. Coordinates are in units
(40 px by default, set with `unit 36`), y points up, and the main line of a diagram sits on y = 0, the height at
which the operators of an equation are set.

| Statement | Example |
| --- | --- |
| vertex | `a at (0, 0)` · `S at (2, 0) blob "\Sigma"` · `K at (1, 0) box label="K" w=1 h=1.4` |
| line | `a -> b fermion "G_0"` (arrow a→b) · `a <- b ...` (b→a) · `a -- b phonon` (no arrow) |
| chain | `a -> b -> c fermion` |
| inline points | `(-0.6,0) -- a fermion` · `+(0.6,0)` is relative to the other end |
| anchors | `K.nw`, `K.se`, … corners of a box or compass points of a blob; `S.30` is an angle |
| external leg | `leg a left fermion in "n\mathbf{k}"` (direction, optional length, in/out arrow) |
| self-loop | `v -- v phonon loop dir=up size=1.2` |
| text | `text "g^{DW}" at 0,-0.5 size=12 color=muted` |
| caption | `caption "Fan–Migdal"` (under the current term) |
| style | `style D = photon` · `style F = phonon dressed` (how a line looks; where it goes stays on the line) |
| grid | `grid` alone on a line: the unit grid and vertex names, for drafting |
| template | `ladder n=4 pp rung=phonon` (see below) |
| equation | a line that starts with `=`, `+`, `−`, `×`, `≈`, `≡`, `→`, `:=` begins the next term; `...` is a ⋯ term; `op "= −i"` sets any text; `\|` sets the next diagram beside the last with no operator |

### Coordinates and curvature

The hand-written Fan–Migdal block:

```feynman
a at (0, 0) disk; b at (2.8, 0) disk
leg a left; leg b right
b -> a fermion dressed "G" below
a -- b phonon dressed bulge=1.2 above "F"
```

- **Positions** are `(x, y)` in units of 40 px, with x to the right and y up (`unit 36` changes the size of a
  unit for one block). The main line of a diagram sits on y = 0, because that is where an equation sets its `=`
  and `+`. So a and b are on that line, 2.8 units (112 px) apart. `a at 0,0` without brackets works too.
- **`above` and `below`** name a side of the page, whatever order the ends are written in and wherever the arrow
  points. On a straight line they place the label (`"G" below`); on an arc they say which way it bulges; on a loop,
  where the loop goes. They work on lines within 45° of horizontal; steeper lines use `side=`.
- **`bulge=1.2 above`** makes the line an arc that rises 1.2 units, in the same units as the positions, so it keeps
  its height when a vertex moves. `arc above` is a half circle and `bend above` a gentler arc. A bulge must not be
  more than half the distance between the ends.
- **The arrow never changes the shape.** `b -> a` and `a <- b` draw the same line.
- **`grid`** on a line of its own draws the unit grid and the name of every vertex while you draft.

`bend=0.42` is the older, compact form: the arc's height divided by the distance between its ends
(0.42 × 2.8 ≈ 1.18 units; 0.5 is a half circle). Without a page word its sign counts from the written direction:
a positive bend bulges to the left of a → b, so `a -- b` bulges up when a is left of b, and `b -- a` bulges down.
That is also how `side=left|right` counts, and why `side=right` put G below in the first version of this block.
These lines draw the same picture:

```
b -> a fermion dressed "G" below          a <- b fermion dressed "G" side=right
a -- b phonon dressed bend=0.42 above "F"  a -- b phonon dressed bend=0.42 "F"
```

Line options: `above` / `below` (a side of the page), `bulge=1.2` (an arc's height in units, with `above` or
`below`), `arc` (half circle), `bend` (0.35) or `bend=0.42` (height ÷ distance), `side=in|out` (label inside or
outside an arc or loop), `side=left|right` (along the written direction, for steep lines), `dist=…` (label
distance in px), `pos=0.3` (label position along the line), `mom="\mathbf{q}"` (crystal-momentum arrow beside the
line, with `momside` and `momdir=back`), `dressed` / `bare`, `heavy` / `thin`, `arrow=end|start|none`,
`color=teal`, `width`, `amp`, `wl`, `dash="5 4"`, `faint`. A label is a quoted string: `"\Sigma^{ep}"`. A
misspelled option is an error that suggests the right one.

Line styles: `fermion`, `phonon` (zigzag), `photon` (wave), `coulomb` (dashed), `screened` (double dashed),
`field` (wave on dashes: both photon polarizations), `gluon`, `scalar`, `ghost`, `plain`, `boson`, `impurity`.
`dressed` turns `fermion` into `fermion2` (a double line), `coulomb` into `screened`, and the others into their heavy forms.

Vertex shapes: `dot`, `current` (teal), `charge`, `disk` (screened vertex), `hatched`, `open`, `cross`,
`otimes`, `square`, `blob` (self-energy), `bubble` (blue blob), `box` (four-point vertex), `triangle`, `none`.
Lines stop at the edge of disks, blobs and boxes by themselves.

Labels take a TeX subset: `_` and `^` with braces, Greek letters (`\Sigma`, `\chi`), `\mathbf`, `\mathrm`, `\bar`,
`\overline`, `\tilde`, `\hat`, `\dagger`, `\,`. Capital Greek is upright and Latin letters are italic. Sub- and
superscripts are upright, because they are mostly names (cn, ep, irr); `scriptItalic: true` changes that.

## Templates

| Template | What it draws | Options (defaults) |
| --- | --- | --- |
| `propagator` | one line | `style=fermion label length=1.8 dressed dir=right` |
| `dyson` | full = bare + bare · Σ · full | `style=fermion full=G bare=G^0 self=\Sigma color=muted dir` |
| `sigma` | self-energy blob with stubs | `label=\Sigma color r` |
| `fan-migdal` | electron line spanned by a phonon arc | `dressed phonon=phonon vertex=dot G F dir width` |
| `debye-waller` | phonon loop on a hatched vertex | `dressed phonon F vertexLabel=g^{DW}` |
| `gw`, `fock`, `hartree` | GW, exchange and tadpole self-energies | `G W/v vertex dir` |
| `sigma2` | second order: `rainbow`, `crossed`, `sequential` | `type boson=phonon dressed label` |
| `bubble` | polarization bubble | `vertex left right ext=coulomb extLabel dressed top bottom label ladder rung rungLabel` |
| `rpa` | chain of n bubbles joined by `link` lines | `n=3 link=coulomb linkLabel=v ext vertex ladder rung rungLabel` |
| `exciton` | bubble with a ladder of screened interactions inside | `n=3 vertex=current ext=photon extLabel=D rung=screened rungLabel=W bubbles link linkLabel`; flags `charge`, `current` |
| `ladder` | two lines exchanging n interactions | `n=3 channel=ph\|pp rung=screened rungLabel=W dressed top bottom h spacing crossed` |
| `crossed` | maximally crossed ladder (Cooperon) | `n=4 rung=impurity top=G^R bottom=G^A` |
| `vertex-correction` | three-point vertex with an interaction across | `ext=photon rung=phonon rungLabel vertex` |
| `box` | four-point vertex with legs | `label=\Gamma channel=ph\|pp color` |
| `bse` | L = L⁰ + L⁰ K L | `L K channel dressed` |
| `tmatrix` | T = V + V G G T | `T V interaction=coulomb channel=pp G` |
| `parquet` | F = Λ + Φ_ph + Φ_p̄h̄ + Φ_pp | `F Lambda dressed captions` |

A template that draws one diagram can be combined with statements in the same term. Its vertices keep their
names (`a`, `b`, `v`, `t1`, …), so you can attach more lines to them.

## Theming

Every colour is `var(--feyn-<token>, <light default>)`: `electron`, `phonon`, `photon`, `c4` (teal), `c5`
(violet), their `-text` variants for labels, and `ink`, `muted`, `surface`. In fumadocs, `ink`, `muted` and
`surface` follow `--color-fd-foreground`, `--color-fd-muted-foreground` and `--color-fd-background`, and dark mode
follows the `.dark` class. Fonts: `--feyn-font-math` (italic) and `--feyn-font-text` (upright). They start with
KaTeX's fonts, so on a site that loads KaTeX the diagram labels match the math in the text.

## Without fumadocs

```js
import { render, renderSVG, Term, renderModel } from 'fumadocs-feynman';
const { html, svg, errors } = render('ladder n=4 pp');
const t = new Term();
t.node('a', 0, 0); t.node('b', 2, 0);
t.edge('a', 'b', 'fermion', { label: 'G' }).edge('a', 'b', 'phonon', { bend: 0.4 });
renderModel(t).svg;
```

`render` returns `{ html, svg, errors }`: `html` is a `<figure>` (equations wrap responsively, each operator stays
with the term after it), and `svg` is one standalone SVG, for export.

## Design notes

- There is no automatic layout. Vertices are placed on a coarse grid, and templates cover the standard
  topologies. Layout is the hard part of general Feynman-diagram tools, and hand placement keeps every diagram
  predictable and diffable.
- Strokes and labels have a fixed size in px, and only the geometry scales with `unit`, so every diagram on a site
  has the same line weights and type.
- Lines stop where they can be seen ending. Every line stops at the edge of disks, blobs and boxes. Wavy, zigzag,
  dashed and double lines also stop at the rim of a small dot; plain lines run into the dot's centre. Where a
  double line meets a dot, the dots of that diagram grow a little, so that both strands land on the rim.
- Lines that enter a box use ports on its faces, 0.2 units in from each corner, not the (rounded) corners.
- Arrows and labels sit halfway between two vertices. Labels keep clear of the arrowhead, and their box follows the
  glyphs, so a label above a line and one below it sit at the same visible distance.
- Where two wavy or zigzag lines cross, the one drawn later passes over the other, with a short gap in the line
  underneath.
- The output is deterministic, which keeps server-rendered and hydrated HTML identical. SVG ids are prefixed per
  diagram.
- `npm test` (`node test/run.mjs`) checks the geometry conventions, the label typesetting, every example and the
  error reporting.

## Repository layout and development

| Path | What it is |
| --- | --- |
| `src/` | the renderer: `parse.js` (the language), `templates.js`, `render.js` (SVG), `geometry.js`, `text.js` (labels), `theme.js` |
| `react/`, `remark/`, `types/`, `style.css` | the fumadocs integration and its type declarations |
| `examples/examples.js` | the example blocks, shared by the tests, the gallery and the demo |
| `test/run.mjs` | unit checks and example rendering; `test/shots.mjs` renders every example to PNG (light and dark) |
| `gallery/build.mjs` | builds `gallery/index.html`, the static gallery with a live playground |
| `demo/` | a fumadocs (Next.js) site that uses the packed package, with every example on one page |

Node is not needed on the host. Everything runs in Docker:

```bash
docker run --rm -v "$PWD":/pkg -w /pkg node:22-bookworm-slim node test/run.mjs
```

```bash
docker run --rm -v "$PWD":/pkg -w /pkg mcr.microsoft.com/playwright:v1.63.0-noble sh -c 'cd /tmp && npm i -s playwright-core@1.63.0 >/dev/null && cd /pkg && NODE_PATH=/tmp/node_modules node test/shots.mjs'
```

The demo installs the package from a tarball. A symlink would point outside the Next.js project, which Turbopack
refuses to resolve:

```bash
docker run --rm -v "$PWD":/work -w /work node:22-bookworm-slim sh -c 'npm run demo:pack && cd demo && npm install ./fumadocs-feynman-0.1.0.tgz && node scripts/gen-feynman-page.mjs && npm run build'
```
