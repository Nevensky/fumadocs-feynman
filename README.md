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

Plugin options: `{ lang = 'feynman', component = 'Feynman', styles, strict = false, validate = true, source = false }`.
A diagram error becomes a build warning that points at the line in the `.mdx` file, or a build error with
`strict: true`. On the page, an error box lists the errors with line numbers. The fence meta can set `caption="…"`,
`title="…"` (the accessible description), `unit=36` and `id="…"`, and the bare word `source` (below).

### Showing the source, and the same diagram by hand

With `source` in the fence meta (or `source: true` for every block), the diagram is followed by its source. A block
that uses a template gets two code tabs: **Template**, the block as written, and **By hand**, the same diagram
written out vertex by vertex and line by line. They are fumadocs-ui's code-block tabs (`CodeBlockTabs` and its
parts, which `defaultMdxComponents` includes), so they work in either plugin order; each pair switches on its own.
Outside fumadocs-ui, give components of those names to MDX.

````md
```feynman source
fock vertical
```
````

The expansion is `expand(source, { styles })` from the package, and `templatesIn(source)` lists the templates a
block uses. `render(expand(src))` draws the same picture as `render(src)`, so the By hand version is a starting point
when no template quite fits: copy it and change what you need. The block's own `style` statements and `title` are
kept; the site's `styles` are known while expanding and left to the site. The gallery's playground does the same
with **Write out by hand**.

## The language

One statement per line, or several separated by `;`. A `%` or `//` starts a comment. Coordinates are in units
(40 px by default, set with `unit 36`), y points up, and the main line of a diagram sits on y = 0, the height at
which the operators of an equation are set.

| Statement | Example |
| --- | --- |
| vertex | `a at (0, 0)` · `S at (2, 0) blob "\Sigma"` · `K at (1, 0) box label="K" w=1 h=1.4` |
| label or restyle a vertex | `a "\rho_{n\mathbf{k},m\mathbf{k}+\mathbf{q}}(\mathbf{G})" pos=below` · `a current color=c5`: an existing vertex, a template's too, takes a label, shape or options without moving |
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
| equation | a line that starts with `=`, `+`, `−`, `×`, `≈`, `≡`, `→`, `:=` begins the next term; `...` is a ⋯ term; `op "= −i"` sets any text; `\|` sets the next diagram beside the last with no operator; `\\` at the start of a line (as in TeX) starts a new row, and an operator may follow it |

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
`arrowpos=0.3` (where the arrow sits, as a fraction along the line), `marker=cross|none`,
`color=teal`, `width`, `amp`, `wl`, `dash="5 4"`, `faint`, `over` (the line passes over the lines written before
it, so write it after the lines it should cross: a solid or wavy line gets a gap, a dashed one keeps its own gaps,
a dashed `over` line keeps a dash on each crossing, and an arrowhead at a crossing moves off it). A label is a quoted string: `"\Sigma^{ep}"`. A misspelled option is an error that suggests the right
one.

Line styles: `fermion`, `phonon` (zigzag), `photon` (wave), `coulomb` (dashed), `screened` (double dashed),
`field` (wave on dashes: both photon polarizations), `gluon`, `scalar`, `ghost`, `plain`, `boson`, `impurity`.
`dressed` turns `fermion` into `fermion2` (a double line), `coulomb` into `screened`, and the others into their heavy forms.

Vertex shapes: `dot`, `charge` (black, for ρ), `current` (teal, for j), `eph` (amber, the electron–phonon g),
`dipole` (rose, d·E), `spin` (violet, σ·B), `disk` (screened vertex), `hatched`, `open`, `cross`, `otimes`,
`square`, `blob` (self-energy), `bubble` (blue blob), `box` (four-point vertex), `triangle`, `lens` (a response
function χ between two points; upright, or `dir=right`; `w` and `h` are its width and height on the page, as for a
box), `none`. Lines stop at the edge of disks, blobs, boxes and
lenses by themselves. Any vertex takes a label; a template's vertices can be labelled afterwards by name (the By hand
tab and `grid` show the names).

Labels take a TeX subset: `_` and `^` with braces, Greek letters (`\Sigma`, `\chi`), `\mathbf`, `\mathrm`, `\bar`,
`\overline`, `\tilde`, `\hat`, `\dagger`, `\uparrow`, `\downarrow`, `\,`. As in TeX, a space after a command
such as `\delta` only ends it. Capital Greek is upright and Latin letters are italic. Sub- and
superscripts are upright, because they are mostly names (cn, ep, irr); `scriptItalic: true` changes that. A
subscript right after a superscript or a prime goes under it, as in TeX: `\rho^*_{n\mathbf{k}}`, `G'_z`.

## Templates

| Template | What it draws | Options (defaults) |
| --- | --- | --- |
| `propagator` | one line | `style=fermion label length=1.8 dressed dir=right` |
| `dyson` | full = bare + bare · Σ · full | `style=fermion full=G bare=G^0 self=\Sigma color=muted dir` |
| `sigma` | self-energy blob with stubs | `label=\Sigma color r` |
| `fan-migdal` | electron line spanned by a phonon arc; `vertical` stands it up | `dressed phonon=phonon vertex=dot G F dir width line legLabel`, and the standing options below (inner: Π) |
| `debye-waller` | phonon loop on a hatched vertex | `dressed phonon F vertexLabel=g^{DW}` |
| `gw` | GW self-energy; `gamma="\Gamma"` makes it Σ = iGWΓ, with Γ where the electron enters; `vertical` stands it up | `G=G W=W vertex dir dressed width=2.8 gamma gcolor=c4 line legLabel`; standing: `vertical height flow` |
| `fock` | exchange self-energy; `vertical` stands it up, `inner=chi\|bubble` puts a diagram inside the interaction | `G=G^0` (G with `dressed`) `v=v vertex=dot dressed line dir width=2.8 legLabel`, and the standing options below (inner: χ) |
| `hartree` | tadpole self-energy | `G=G^0` (G with `dressed`) `v=v interaction=coulomb dressed legLabel` |
| `sigma2` | second order: `rainbow`, `crossed`, `sequential` | `type boson=phonon dressed label` |
| `arcs` | one electron line with interaction arcs above and below it, such as the exchange diagrams of Hedin's expansion | `above below` (pairs of vertex numbers; with neither, `above="13 24"`) `boson=screened label spacing=0.9 dressed dir` |
| `gt` | GT self-energy: a T matrix closed by G (particle–hole: a ladder of W between opposite spins, the magnon; or `pp`); forms `arch` (drawn like GW), `box`, `ladder` | `n`: radial rungs of the arch (3, plus the two along the base line), rungs of the ladder (3), rungs before the box (0); `channel=ph\|pp spin up=\uparrow down=\downarrow legs rung=screened rungLabel dressed dir`; arch only: `label`; box and ladder only: `numbers center`; box only: `T color=c5` |
| `gt-bse` | the T matrix in the ladder approximation, closed by G: T = WKWKW + WKT | `channel spin numbers legs T dressed dir` |
| `bubble` | polarization bubble; `gamma="\Gamma"` closes it with Hedin's vertex (P = −iGGΓ) | `vertex left right ext=coulomb extLabel dressed top bottom label ladder rung rungLabel gamma gcolor` |
| `rpa` | chain of n bubbles joined by `link` lines | `n=3 link=coulomb linkLabel=v ext vertex ladder rung rungLabel` |
| `exciton` | bubble with a ladder of screened interactions inside | `n=3 vertex=current ext=photon extLabel=D rung=screened rungLabel=W bubbles link linkLabel`; flags `charge`, `current` |
| `ladder` | two lines exchanging n interactions | `n=3 channel=ph\|pp rung=screened rungLabel=W dressed top bottom h spacing crossed` |
| `crossed` | maximally crossed ladder (Cooperon) | `n=4 rung=impurity top=G^R bottom=G^A` |
| `nbody` | a ladder of any number of particle lines (e, h), with rungs between any two | `lines="e h" rungs="12 12 12" labels=auto rung=screened rungLabel=W gap spacing dressed dir` |
| `trion` | two electrons and a hole (`negative`, X⁻) or two holes and an electron (`positive`, X⁺) | as `nbody`, `rungs="12 23 13 12 23"` |
| `biexciton` | two electrons and two holes, every pair interacting | as `nbody`, `rungs="12+34 13 24 23 14 12+34"` |
| `vertex-correction` | three-point vertex with n interactions across, as a ladder or `crossed` | `n=1 ext=photon rung=phonon rungLabel vertex crossed` |
| `hedin-vertex` | Hedin's vertex equation Γ = 1 + (δΣ/δG) G G Γ | `Gamma kernel ext=screened dressed color gcolor=c4` |
| `box` | four-point vertex with legs | `label=\Gamma channel=ph\|pp color` |
| `bse` | L = L⁰ + L⁰ K L | `L K channel dressed` |
| `tmatrix` | T = V + V G G T | `T V interaction=coulomb channel=pp G` |
| `parquet` | F = Λ + Φ_ph + Φ_p̄h̄ + Φ_pp | `F Lambda dressed captions` |

A template that draws one diagram can be combined with statements in the same term. Its vertices keep their
names (`a`, `b`, `v`, `t1`, …), so you can attach more lines to them.

Some templates in more detail:

- **`arcs`** numbers the vertices of the electron line 1, 2, … from the left and takes the interactions as pairs,
  above or below the line: `arcs above="15 24" below="36"` is one of the four third-order exchange diagrams of
  Hedin's expansion. Arcs on one side that cross pass over one another.
- **`gt`** follows Müller, Blügel and Friedrich, PRB 100, 045130 (2019): Σ^σ(13) = −i T^{σσ′}(12,34) G^{σ′}(24),
  with T the ladder of W between the electron (σ) and a line of opposite spin (σ′), closed by the G from 4 back
  to 2. (The paper's Eq. 1 prints G(42); with its K(12,34) = iG(13)G(42), the loop closes with G(24), as its
  Fig. 3 draws.) `gt` alone draws it like GW (their Fig. 2), with spin labels and `n` radial rungs besides the two
  along the base line; `gt box` closes a T box (after `n` rungs, 0 by default) and `gt ladder` a ladder of `n`
  rungs; `pp` uses a particle–particle T matrix, closed by a line that runs against both rails. `dir=left` runs the
  electron right to left, as in the paper. In the box and ladder forms, `numbers` labels the points 1–6 as in their
  Fig. 3, and the external electron lies on y = 0, so that `gt` lines up with `gw` in a row; `center` puts the
  middle of the ladder there instead, which is what `gt-bse` does. `label` writes a name inside the arch.
- **Self-energies standing up.** `fock`, `gw` and `fan-migdal` take `vertical`: the interaction runs straight
  from the lower vertex `a` to the upper one `b`, and the electron arcs round on the right, in at the bottom and out
  at the top (`dir=left` reverses it). `flow` draws the interaction's arrows downwards, along the momentum it
  carries; `legLabel` labels the external electron, `height` sets the distance from `a` to `b`. `fock` and
  `fan-migdal` take `inner=`: `chi` splits the interaction around a response-function lens `X` (labelled with
  `chi=`, χ or Π by default), `bubble` around a polarization bubble of two electron lines, with `ladder=` rungs
  (`rung`, `rungLabel`) inside it. The inner diagram runs from `c` (below) to `d` (above), which take the vertex
  kind of `a` and `b` when it is one of the dots (`charge`, `current`, `eph`, ...), and `vtop=` labels the upper
  piece of the interaction when it differs from the lower one. `fan-migdal vertical dressed` draws the dressed
  phonon F; around an inner diagram its pieces stay F⁰, because F already holds every Π insertion (`F=` and `vtop=`
  set other labels). These standing options are errors where they would do nothing: without `vertical`, and
  `ladder`, `rung` and `rungLabel` without `inner=bubble`, `chi` and `vtop` without `inner`.
- **`nbody`** draws a ladder of any number of lines, given from the top as `e` (electron, arrow along `dir`) and `h`
  (hole, arrow against it), with `rungs` given column by column as pairs of line numbers: `13` joins lines 1 and 3
  and passes over line 2; `12+34` puts two rungs in one column. `trion` and `biexciton` are ready-made ladders of
  three and four lines.

## Theming

Every colour is `var(--feyn-<token>, <light default>)`: `electron`, `phonon`, `photon`, `c4` (teal), `c5`
(violet), their `-text` variants for labels, and `ink`, `muted`, `surface`. In fumadocs, `ink`, `muted` and
`surface` follow `--color-fd-foreground`, `--color-fd-muted-foreground` and `--color-fd-background`, and dark mode
follows the `.dark` class. Fonts: `--feyn-font-math` (italic) and `--feyn-font-text` (upright). They start with
KaTeX's fonts, so on a site that loads KaTeX the diagram labels match the math in the text.

## Without fumadocs

```js
import { render, renderSVG, expand, Term, renderModel } from 'fumadocs-feynman';
const { html, svg, errors } = render('ladder n=4 pp');
expand('ladder n=4 pp'); // the same diagram as plain statements: vertices, lines, texts
expand('gw\nb -- (3,1) D', { styles: { D: 'photon' } }); // the site's styles are known, and not written out
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
  underneath. A line marked `over` does the same to every solid or wavy line written before it that it crosses (a
  dashed line already has gaps, and a cut would leave slivers of dashes); if it is dashed itself it keeps a dash on
  each crossing, and an arrowhead of the line underneath moves off the crossing. `nbody`, `trion` and `biexciton`
  use it for rungs that skip a line, `vertex-correction crossed` for its rungs, and `arcs` and `sigma2 crossed`
  for crossing arcs.
- Lines that meet Hedin's vertex triangle end inside it, and the triangle, drawn over them, hides their ends, so
  single and double lines stop exactly on its edge.
- The captions under the terms of an equation share a baseline when the terms' depths below the axis differ by
  steps of at most 36 px; a much deeper term keeps its caption to itself.
- Every diagram's SVG says `display:inline; vertical-align:baseline` itself, so CSS resets that make all SVGs
  blocks (Tailwind's preflight, which fumadocs uses) cannot shift the terms of an equation off its axis. An
  equation too wide for the column wraps into lines of even length (`text-wrap: balance`).
- An arc that ends on a box port leaves from the face its tangent points through, so an arc over the top of a box
  starts on its top face.
- The output is deterministic, which keeps server-rendered and hydrated HTML identical. SVG ids are prefixed per
  diagram.
- `npm test` (`node test/run.mjs`) checks the geometry conventions, the label typesetting, every example and the
  error reporting.

## Repository layout and development

| Path | What it is |
| --- | --- |
| `src/` | the renderer: `parse.js` (the language), `templates.js`, `expand.js` (templates written out by hand), `render.js` (SVG), `geometry.js`, `text.js` (labels), `theme.js` |
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
