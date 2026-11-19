# Changelog

All notable changes to fumadocs-feynman are listed here. The project follows [semantic versioning](https://semver.org).

## 0.1.0

The first release.

- **Feynman code blocks.** ```` ```feynman ```` blocks in MDX become static SVG at build time. The remark plugin
  (`fumadocs-feynman/remark`) checks every block and turns it into a `<Feynman>` server component
  (`fumadocs-feynman/react`). No client JavaScript is shipped.
- **A small language.** Vertices on a coarse grid, lines with styles and labels, legs, loops, arcs placed with
  `above` / `below` and `bulge=`, anchors on boxes and blobs, text and captions, and equations with `=`, `+` and rows.
  Labels take a TeX subset.
- **Templates** for the standard diagrams:
  - propagators and Dyson equations;
  - the Fan–Migdal, Debye–Waller, Hartree, Fock and GW self-energies, lying down or standing up, with response
    functions and bubbles inside the interaction;
  - GWΓ, second-order diagrams and the exchange diagrams of Hedin's expansion;
  - bubbles, RPA chains and excitons;
  - ladders of any number of lines (trions, biexcitons);
  - the T matrix, Bethe–Salpeter and parquet equations, vertex corrections and Hedin's vertex;
  - the GT self-energy;
  - for particle physics: tree-level scattering in the s, t and u channels, Compton scattering, pair annihilation,
    and triangle and box loops.
- **Momentum arrows.** `mom=` puts a grey arrow beside a line, never on it: arrowheads mark fermions only. On the
  self-energy templates it points towards the vertex where the electron enters (the k+q convention); `momdir=back`
  turns it round.
- **Copy button.** With the plugin's `copy` option (or a fence's bare word `copy`), a button at the top right of a
  diagram shows on hover and copies it as a PNG and as SVG markup. It is a small client component and off by
  default, so that out of the box no JavaScript ships.
- **By hand.** `expand()` writes any block out vertex by vertex. With `source` in the fence meta, a block shows its
  source in Template and By hand tabs.
- **Checked at build time.** An error becomes a build warning that names the file and line and suggests the fix,
  and an error box on the page. `strict: true` turns warnings into build errors.
- **Theming.** Every colour is a CSS variable that follows the fumadocs light and dark themes. Labels use the KaTeX
  fonts when the page loads them, and a prime is set as TeX sets it (`G'` is `G^{\prime}`, raised and smaller), so
  it reads as a prime in KaTeX's fonts as well as in text fonts. Strokes and type keep their size at any `unit`.
- **Documentation site** in `docs/`, with installation, a quick start, guides, a reference generated from the code,
  and every example.
