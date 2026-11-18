// Example blocks, used by the tests, the gallery and the fumadocs demo page.
export const EXAMPLES = [
  // ---------------- vocabulary ----------------
  { group: 'Vocabulary', id: 'styles', title: 'Line styles',
    note: 'Built-in styles. `dressed` turns each into its "2" form: double for fermions and the Coulomb line, heavy for the others.',
    source: `(0,0) -> (2.2,0) fermion "fermion"
(3.2,0) -> (5.4,0) fermion2 "fermion2"
(0,-1) -- (2.2,-1) phonon "phonon"
(3.2,-1) -- (5.4,-1) phonon2 "phonon2"
(0,-2) -- (2.2,-2) photon "photon"
(3.2,-2) -- (5.4,-2) photon2 "photon2"
(0,-3) -- (2.2,-3) coulomb "coulomb"
(3.2,-3) -- (5.4,-3) screened "screened"
(0,-4) -- (2.2,-4) field "field"
(3.2,-4) -- (5.4,-4) gluon "gluon"
(0,-5) -- (2.2,-5) scalar "scalar"
(3.2,-5) -> (5.4,-5) ghost "ghost"` },
  { group: 'Vocabulary', id: 'shapes', title: 'Vertex shapes',
    note: 'Lines stop at the edge of disks, blobs and boxes on their own.',
    source: `a at (0, 0) dot "dot"
b at (1.1, 0) current "current"
c at (2.2, 0) disk "disk"
d at (3.3, 0) hatched "hatched"
e at (4.4, 0) open "open"
f at (5.5, 0) cross "cross"
g at (0.4, -1.5) blob label="\\Sigma"
h at (2, -1.5) bubble label="\\chi"
i at (3.6, -1.5) box label="\\Gamma"
j at (5.2, -1.5) triangle label="\\Lambda" dir=left
k at (0, -3) charge "charge"
l at (1.1, -3) eph "eph"
m at (2.2, -3) dipole "dipole"
n at (3.3, -3) spin "spin"
o at (4.8, -3) lens label="\\chi" dir=right` },
  { group: 'Vocabulary', id: 'labelled-vertices', title: 'Vertices with their matrix elements',
    note: 'Any vertex can be labelled once it exists, a template’s too: write its name, then a label and where it goes (pos=), a shape or a colour. The names are on the By hand tab, and grid shows them. Charge vertices carry ρ, current vertices j; eph, dipole and spin are the other couplings, each in its particle’s hue.',
    source: `bubble vertex=charge ext=coulomb extLabel=v
a0 "\\rho_{n\\mathbf{k},m\\mathbf{k}+\\mathbf{q}}(\\mathbf{G})" pos=sw
b0 "\\rho^*_{n\\mathbf{k},m\\mathbf{k}+\\mathbf{q}}(\\mathbf{G}')" pos=se
| bubble vertex=current ext=photon extLabel=D
a0 "j_{n\\mathbf{k},m\\mathbf{k}+\\mathbf{q}}(\\mathbf{G})" pos=sw
b0 "j^*_{n\\mathbf{k},m\\mathbf{k}+\\mathbf{q}}(\\mathbf{G}')" pos=se` },
  { group: 'Vocabulary', id: 'grid', title: 'Drafting grid',
    note: 'A line that says grid draws the unit grid and the name of every vertex. Positions are (x, y) in units of 40 px, y up; the main line sits on y = 0, where an equation sets = and +. Delete the line when the diagram is done.',
    source: `grid
a at (0, 0) disk; b at (2.8, 0) disk
leg a left; leg b right
b -> a fermion dressed "G" below
a -- b phonon dressed bulge=1.2 above "F"` },

  // ---------------- self-energies ----------------
  { group: 'Self-energies', id: 'fm-hand', title: 'Fan–Migdal, written by hand',
    note: 'The EPP-primer look: the electron enters on the right, screened vertices are grey disks. below and above name sides of the page, whatever order the ends are written in; bulge=1.2 is the height of the arc in units.',
    source: `a at (0, 0) disk; b at (2.8, 0) disk
leg a left; leg b right
b -> a fermion dressed "G" below
a -- b phonon dressed bulge=1.2 above "F"` },
  { group: 'Self-energies', id: 'dw-hand', title: 'Debye–Waller, written by hand',
    note: 'On a loop, above and below say where it goes; size= is its diameter in units.',
    source: `v at (0, 0) hatched "g^{DW}" pos=below
leg v left 0.7; leg v right 0.7
v -- v phonon dressed loop above size=1.2 "F"` },
  { group: 'Self-energies', id: 'rainbow-hand', title: 'Rainbow, written by hand',
    note: 'A chain draws three electron lines at once; the outer phonon rises 1.4 units, the inner one is a half circle.',
    source: `v0 at (0, 0); v1 at (1.15, 0); v2 at (2.3, 0); v3 at (3.45, 0)
leg v0 left 0.55; leg v3 right 0.55
v0 -> v1 -> v2 -> v3 fermion
v0 -- v3 phonon bulge=1.4 above
v1 -- v2 phonon arc above` },
  { group: 'Self-energies', id: 'sigma-ep', title: 'Σ^ep = Fan–Migdal + Debye–Waller',
    note: 'Templates are terms of an equation: a line that starts with = or + begins the next term.',
    source: `sigma label="\\Sigma^{ep}"
= fan-migdal dressed vertex=disk
+ debye-waller dressed` },
  { group: 'Self-energies', id: 'gw', title: 'Hartree, Fock and GW',
    note: 'A line that starts with | sets the next diagram beside the last, with no operator.',
    source: `hartree
caption "Hartree"
| fock
caption "Fock"
| gw
caption "GW"` },
  { group: 'Self-energies', id: 'migdal', title: 'Second order: rainbow and crossed',
    note: 'Migdal’s theorem: the crossed diagram is smaller by a factor √(m/M).',
    source: `sigma2 rainbow
caption "rainbow (non-crossing)"
| sigma2 crossed
caption "crossed (vertex correction)"` },
  { group: 'Self-energies', id: 'standing', title: 'Fock and GW, standing up',
    note: 'vertical stands a self-energy up: the interaction runs straight from the lower vertex to the upper one, and the electron arcs round on the right, in at the bottom and out at the top (dir=left reverses it). The interaction carries no arrow, as a phonon or a photon line carries none: mom= draws the momentum it carries as an arrow beside it, down towards the vertex where the electron enters, the way q runs when the inner electron carries k+q; standing up, it also lengthens the interaction a little, to give the arrow room.',
    source: `fock vertical legLabel="n\\mathbf{k}" G="m,\\mathbf{k}+\\mathbf{q}" v="v(\\mathbf{q})" mom="\\mathbf{q}"
| gw vertical legLabel="n\\mathbf{k}" mom="\\mathbf{q}"` },
  { group: 'Self-energies', id: 'momentum', title: 'The momentum through the interaction',
    note: 'mom= puts the momentum beside the interaction, as an arrow that points towards the vertex where the electron enters: the way q runs when the inner electron carries k+q, as in Σ(k) = i Σ_q v(q) G(k+q). momdir=back turns it round, for k−q. Around an inner diagram both pieces carry it, and momtop= labels the upper one. The arrow sits inside, opposite the label, where a short momentum such as q fits; momside=out puts it outside, for a longer one such as Q+G′∥, and the label makes way. By hand, a line\u2019s arrow runs from its first end to its second: the interaction is written from a, so the arrow towards a reads momdir=back there.',
    source: `fock legLabel="\\mathbf{k}" G="\\mathbf{k}+\\mathbf{q}" mom="\\mathbf{q}"
caption "inner line \\mathbf{k}+\\mathbf{q}"
| fock legLabel="\\mathbf{k}" G="\\mathbf{k}-\\mathbf{q}" mom="\\mathbf{q}" momdir=back
caption "inner line \\mathbf{k}−\\mathbf{q}: momdir=back"
| fock vertical inner=chi mom="\\mathbf{Q}" momtop="\\mathbf{Q}+\\mathbf{G}'_\\parallel" momside=out
caption "momtop=, momside=out"` },
  { group: 'Self-energies', id: 'screened-exchange', title: 'The correlation self-energy: a response function inside the interaction',
    note: 'inner=chi splits the interaction around a response function χ, so that it reads v χ v = W − v, the correlation part of the screened interaction (with the plain Fock diagram it makes GW). Its points are c and d, the lens is X; here every point carries its plane-wave label.',
    source: `fock vertical inner=chi legLabel="n,\\mathbf{K}" G="m,\\mathbf{K}+\\mathbf{Q}" v="v(\\mathbf{Q})" vtop="v(\\mathbf{Q}+\\mathbf{G}'_\\parallel)" chi="\\chi(\\omega-E_{m\\mathbf{K}+\\mathbf{Q}})"
a "G_z" pos=below
c "G_{z1}" pos=right
d "G_{z2}" pos=right
b "G'_z" pos=above` },
  { group: 'Self-energies', id: 'rpa-exchange', title: 'A polarization bubble inside, and a ladder inside that',
    note: 'inner=bubble puts the polarization bubble itself into the interaction, two electron lines from c to d: the first term of the RPA screening. ladder= adds W rungs inside it, the electron–hole attraction that excitons come from.',
    source: `fock vertical inner=bubble
| fock vertical inner=bubble ladder=2 rungLabel=W` },
  { group: 'Self-energies', id: 'hartree-fock', title: 'Hartree and Fock, their points labelled',
    note: 'The Hartree tadpole and the Fock exchange with the points r and r′ written on their vertices; dir=left runs the electron right to left.',
    source: `hartree G="-iG(\\mathbf{r}';\\mathbf{r}',0^+)" legLabel=n
a "\\mathbf{r}" pos=below
b "\\mathbf{r}'" pos=sw
caption "H"
+ fock vertical dir=left G=m legLabel=n
a "\\mathbf{r}" pos=below
b "\\mathbf{r}'" pos=above
caption "F"` },

  // ---------------- Hedin's expansion and GT ----------------
  { group: 'Hedin’s expansion and GT', id: 'hedin3', title: 'Hedin’s self-energy to third order in W',
    note: 'Müller, Blügel and Friedrich, PRB 100, 045130 (2019), Fig. 1. First row: GW; the second-order screened exchange (the first vertex correction, also called G3W2); the two direct third-order diagrams, a particle–hole and a particle–particle ladder closed by G: the lowest terms of the two T-matrix self-energies beyond Hartree and GW (their one- and two-rung terms, the tadpole and the second-order direct diagram, are already there, which is why the paper’s T starts at third order; its GT keeps the particle–hole one, with opposite spins on its rails). Second row: the four third-order exchange diagrams. G and W are the full propagators, so the lines are double: the expansion is in G and W, which is why no diagram carries a self-energy insertion (no rainbow). arcs numbers the vertices from the left and puts each W above or below the line; dir=left runs the electron right to left, as in the paper; a line that starts with `\\\\` begins a new row, as in TeX.',
    source: `gw G="" W="" dir=left
| arcs above="13 24" dressed dir=left
| gt ladder spin=false dressed dir=left
| gt ladder pp spin=false dressed dir=left
\\\\ arcs above="15 24" below="36" dressed dir=left
| arcs above="13 46" below="25" dressed dir=left
| arcs above="26 35" below="14" dressed dir=left
| arcs above="14 36" below="25" dressed dir=left` },
  { group: 'Hedin’s expansion and GT', id: 'gt-gw', title: 'GT drawn like GW: the magnon in place of the plasmon',
    note: 'Fig. 2 of the same paper. W carries plasmons (and electron–hole pairs); the T matrix, a ladder of W between an electron and a hole of opposite spin, carries magnons (spin waves and Stoner excitations). Read as in GW, with T as the boson, the electron that emits one flips its spin (↓ on the base line) and flips back when it absorbs it; following the arrows, the ↑ line runs on along the outer rail and the ↓ base line closes a loop with the inner rail. Single lines: the paper evaluates GT with the Kohn–Sham G.',
    source: `gw dressed=false G="\\uparrow" dir=left
| gt n=5 label="GT" dir=left` },
  { group: 'Hedin’s expansion and GT', id: 'gt-bse', title: 'The T matrix in the ladder approximation',
    note: 'Fig. 3: T starts at third order in W, T = WKWKW + WKT with K(12,34) = iG(13)G(42) the free electron–hole pair, and GT closes it with the G from 4 back to 2, Σ(13) = −i T(12,34) G(24). (The paper’s Eq. 1 prints G(42); with its K the line that closes the loop is G(24), as its Fig. 3 draws.) Lines joined only by W carry opposite spins. The violet box is the T matrix.',
    source: 'gt-bse dir=left' },
  { group: 'Hedin’s expansion and GT', id: 'gt-forms', title: 'GT as a box and as a ladder; the particle–particle T matrix',
    note: 'form = arch (the default), box or ladder. For a particle–particle T matrix (pp) the two rails run the same way, and the line that closes it runs against both: a hole when the pair is two electrons, an electron when it is two holes. A pp T matrix carries no magnon.',
    source: `gt box
| gt ladder
| gt pp` },

  // ---------------- Dyson equations ----------------
  { group: 'Dyson equations', id: 'dyson-g', title: 'Electron', source: 'dyson' },
  { group: 'Dyson equations', id: 'dyson-f', title: 'Phonon (EPP notation)', source: 'dyson style=phonon full=F bare="F^0" self="\\Pi^{ph}"' },
  { group: 'Dyson equations', id: 'dyson-d', title: 'Photon: polaritons', source: 'dyson style=photon full=D bare="D^0" self="\\Pi" color=electron' },
  { group: 'Dyson equations', id: 'rpa-series', title: 'Screening: W as an RPA series',
    source: `propagator style=coulomb dressed label=W
= propagator style=coulomb label=v
+ rpa n=1 extLabel=v
+ rpa n=2 extLabel=v
+ ...` },

  // ---------------- bubbles and excitons ----------------
  { group: 'Bubbles and excitons', id: 'bubble-phonon', title: 'Phonon self-energy (bare and screened vertex)',
    source: 'bubble ext=phonon left=dot right=disk dressed top=G bottom=G' },
  { group: 'Bubbles and excitons', id: 'exciton-current', title: 'Exciton: current vertices, photon propagator D',
    note: 'A bubble with a ladder of screened interactions inside; teal dots are current vertices.',
    source: 'exciton n=3' },
  { group: 'Bubbles and excitons', id: 'exciton-charge', title: 'Exciton: charge vertices, screened Coulomb',
    source: 'exciton n=3 charge extLabel="W^T"' },
  { group: 'Bubbles and excitons', id: 'exciton-chain', title: 'RPA chain of ladder bubbles (exchange v̄)',
    source: 'exciton charge n=2 bubbles=2 link=coulomb linkLabel="\\bar{v}" ext=coulomb extLabel=v' },
  { group: 'Bubbles and excitons', id: 'rpa', title: 'Plain RPA chain', source: 'rpa n=3' },

  // ---------------- trions and biexcitons ----------------
  { group: 'Trions and biexcitons', id: 'ladders-n', title: 'Exciton, trion, biexciton: ladders of two, three and four lines',
    note: 'The exciton is a bound state of the two-line ladder, the screened direct part (W) of the Bethe–Salpeter kernel; its exchange part v̄, in which the pair annihilates into a bare Coulomb line, is not drawn. A trion adds a third line, a biexciton a fourth. The rungs (W) now join every pair of lines, not only neighbours: a rung that skips a line passes over it, and the gap shows it. Arrows run with the electrons and against the holes, so one W serves for all pairs: e–h attracts, e–e and h–h repel.',
    source: `nbody
caption "exciton"
| trion
caption "trion X^{−}"
| biexciton
caption "biexciton"` },
  { group: 'Trions and biexcitons', id: 'trions', title: 'Negative and positive trions',
    note: 'rungs lists the columns left to right as pairs of lines, counted from the top: 13 joins the two electrons (or the two holes) over the line between them. Not drawn: exchange. Two identical particles (same spin and valley) also need the same ladders with the outgoing ends of their two lines swapped, each with a minus sign; and an electron–hole pair that can annihilate (its electron has the spin of the missing one) also has the exciton’s exchange term v̄. Which exchange terms a trion has depends on its spins and valleys, and they, electron–hole and electron–electron together, set its fine structure.',
    source: `trion
caption "X^{−} = e h e"
| trion positive
caption "X^{+} = h e h"` },
  { group: 'Trions and biexcitons', id: 'biexciton', title: 'Biexciton: two electrons and two holes, every pair interacting',
    note: '12+34 puts two rungs in one column. Rungs 12 and 34 bind each exciton. Between the excitons, 13 and 24 (electron–electron, hole–hole) repel and 23 and 14 attract; at first order they nearly cancel. Summed to all orders, with each electron also correlating with the other hole, they bind the two excitons, as in H₂, when the two electrons (and the two holes) are not in the same spin and valley state: a spin singlet within one valley, or two different valleys whatever the spins. For two electrons of the same spin and valley the exchange diagrams, not drawn, give Pauli repulsion instead.',
    source: 'biexciton' },
  { group: 'Trions and biexcitons', id: 'nbody', title: 'Your own: an exciton scattering off an electron',
    note: 'nbody takes any lines (e or h, from the top) and any rungs. Here an exciton (lines 1 and 2) meets the electron on line 3, which attracts its hole (23) and repels its electron (13), and goes on.',
    source: 'nbody lines="e h e" rungs="12 12 23 13 12 12"' },

  // ---------------- two-particle ----------------
  { group: 'Two-particle', id: 'ladder-ph', title: 'Particle–hole ladder', source: 'ladder n=4 top=G bottom=G' },
  { group: 'Two-particle', id: 'ladder-pp', title: 'Particle–particle ladder with phonons', source: 'ladder n=3 pp rung=phonon rungLabel=F' },
  { group: 'Two-particle', id: 'crossed', title: 'Maximally crossed (Cooperon)', source: 'crossed n=4' },
  { group: 'Two-particle', id: 'bse', title: 'Bethe–Salpeter equation', source: 'bse' },
  { group: 'Two-particle', id: 'tmatrix', title: 'T-matrix', source: 'tmatrix' },
  { group: 'Two-particle', id: 'parquet', title: 'Parquet decomposition', source: 'parquet' },

  // ---------------- vertex corrections ----------------
  { group: 'Vertex corrections', id: 'vertex', title: 'First order: a phonon or W across the vertex',
    note: 'Left, the electron–photon vertex dressed by a phonon; right, the Coulomb vertex dressed by W. Migdal’s theorem, which makes phonon vertex corrections small, holds at large momentum transfer (v_F q ≫ ω); a photon brings q ≈ 0, where it fails. There the Ward identity fixes the charge vertex, Γ = 1 + λ, as large as the self-energy’s renormalization, but not the current vertex a photon couples to: its phonon correction carries the cosine of the scattering angle, vanishes for isotropic coupling, and in transport turns the quasiparticle lifetime into the transport one.',
    source: `vertex-correction ext=photon rung=phonon rungLabel=F
| vertex-correction ext=coulomb rung=screened rungLabel=W` },
  { group: 'Vertex corrections', id: 'vertex2', title: 'Second order, both W across the vertex: ladder and crossed',
    note: 'n sets the number of interactions across the vertex; crossed crosses them. Hedin’s vertex has two more second-order diagrams of this kind, in which one W crosses the vertex and the other sits on one leg, crossing it; put into Σ = iGWΓ, the four give the four third-order exchange diagrams of Hedin’s expansion.',
    source: `vertex-correction n=2 ext=screened rung=screened rungLabel=W
caption "ladder"
| vertex-correction n=2 crossed ext=screened rung=screened
caption "crossed"` },
  { group: 'Vertex corrections', id: 'hedin-vertex', title: 'Hedin’s vertex: Γ = 1 + (δΣ/δG) GGΓ',
    note: 'The Bethe–Salpeter equation for the vertex function. With Σ = iGW, δΣ/δG = iW + iG δW/δG. Dropping δW/δG leaves Γ = 1 + iWGGΓ, whose first iteration is the first-order correction above; the δW/δG term is where the direct (closed-ladder) diagrams of Hedin’s expansion come from.',
    source: 'hedin-vertex' },
  { group: 'Vertex corrections', id: 'gw-gamma', title: 'The vertex in Σ and P: Σ = iGWΓ, P = −iGGΓ',
    note: 'gamma= on gw and bubble closes the diagram with Hedin’s vertex instead of a bare one; Γ = 1 gives back GW and the RPA bubble. In Σ(12) = i G(13) W(1⁺4) Γ(32;4) the electron enters through Γ and leaves at the bare vertex.',
    source: `gw gamma="\\Gamma"
caption "\\Sigma = iGW\\Gamma"
| bubble gamma="\\Gamma" top=G bottom=G dressed ext=screened
caption "P = −iGG\\Gamma"` },

  // ---------------- hand-written ----------------
  { group: 'Written by hand', id: 'hedin-baym', title: 'Hedin–Baym: W = Wᵉ + Wᵉ χⁱᵒⁿ Wᵉ',
    source: `(0, 0) -- (1.8, 0) screened "W" above
= (0, 0) -- (1.8, 0) screened "W^{e}" above
+ p3 at (1.5, 0); p4 at (3.3, 0)
  (0, 0) -- p3 screened "W^{e}" above
  p3 -- p4 phonon dressed "\\chi^{ion}" above
  p4 -- (4.8, 0) screened "W^{e}" above` },
  { group: 'Written by hand', id: 'vertex-k', title: 'Electron–phonon vertex with crystal momenta',
    note: 'A vertical line has no above or below: side=right counts along the written direction, here upwards, so it is the page\u2019s right.',
    source: `v at (0, 0)
(-1.5, 0) -> v fermion "n\\mathbf{k}" above
v -> (1.5, 0) fermion "m\\,\\mathbf{k}+\\mathbf{q}" above
(0, -1.3) -- v phonon "\\mathbf{q}\\nu" side=right mom="\\mathbf{q}"` },
  { group: 'Written by hand', id: 'indirect', title: 'Phonon-assisted absorption',
    source: `a at (0, 0); b at (1.6, 0)
leg a left 1 fermion in "n\\mathbf{k}" below
a -> b fermion "n'\\mathbf{k}" below
leg b right 1 fermion out "m\\,\\mathbf{k}+\\mathbf{q}" below
(-0.7, 1.1) -- a photon "\\hbar\\omega"
b -- (2.3, 1.1) phonon "\\mathbf{q}\\nu"` },
  { group: 'Written by hand', id: 'qed', title: 'Other fields: e⁺e⁻ → μ⁺μ⁻ and a gluon',
    source: `a at (0, 0); b at (2, 0)
(-1, 0.9) -> a fermion "e^-" above
a -> (-1, -0.9) fermion "e^+" below
a -- b photon "\\gamma" above
b -> (3, 0.9) fermion "\\mu^-" above
(3, -0.9) -> b fermion "\\mu^+" below
| (0, 0) -- (2, 0) gluon "g" above` },
  { group: 'Written by hand', id: 'custom-style', title: 'Your own notation',
    note: 'style names how a line looks, once; the remark plugin also takes styles for the whole site. Where a line goes stays on the line.',
    source: `style D = photon
style F = phonon dressed
a at (0, 0) current; b at (2.4, 0) current
leg a left D; leg b right D
a -> b fermion dressed bulge=1.1 above "G"
b -> a fermion dressed bulge=1.1 below "G"
a -- b F "F"` }
];
