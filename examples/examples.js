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
j at (5.2, -1.5) triangle label="\\Lambda" dir=left` },
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

  // ---------------- two-particle ----------------
  { group: 'Two-particle', id: 'ladder-ph', title: 'Particle–hole ladder', source: 'ladder n=4 top=G bottom=G' },
  { group: 'Two-particle', id: 'ladder-pp', title: 'Particle–particle ladder with phonons', source: 'ladder n=3 pp rung=phonon rungLabel=F' },
  { group: 'Two-particle', id: 'crossed', title: 'Maximally crossed (Cooperon)', source: 'crossed n=4' },
  { group: 'Two-particle', id: 'vertex', title: 'Vertex corrections', source: `vertex-correction ext=photon rung=phonon rungLabel=F
| vertex-correction ext=coulomb rung=screened rungLabel=W` },
  { group: 'Two-particle', id: 'bse', title: 'Bethe–Salpeter equation', source: 'bse' },
  { group: 'Two-particle', id: 'tmatrix', title: 'T-matrix', source: 'tmatrix' },
  { group: 'Two-particle', id: 'parquet', title: 'Parquet decomposition', source: 'parquet' },

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
