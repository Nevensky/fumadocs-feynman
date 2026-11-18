export interface RenderOptions {
  /** px per diagram unit (default 40). Strokes and labels keep their size. */
  unit?: number;
  /** Your own line-style names, e.g. { D: 'photon', F: 'phonon dressed' }. */
  styles?: Record<string, string>;
  caption?: string;
  /** Accessible description; defaults to one generated from the diagram. */
  title?: string;
  /** Prefix for SVG ids (hatch patterns); defaults to a hash of the source. */
  id?: string;
  /** Italic Latin letters in sub- and superscripts (default: upright, as names like cn, ep, irr). */
  scriptItalic?: boolean;
  /** Draw the drafting grid (whole units and vertex names), as the `grid` statement does. */
  grid?: boolean;
}

export interface DiagramError {
  message: string;
  /** 1-based line in the block. */
  line?: number;
}

export interface RenderResult {
  /** A <figure>; equations wrap responsively. With errors: an error box listing them. */
  html: string;
  /** One standalone SVG ('' with errors). */
  svg: string;
  errors: DiagramError[];
}

export function render(source: string, options?: RenderOptions): RenderResult;
/** Standalone SVG; throws on errors. */
export function renderSVG(source: string, options?: RenderOptions): string;
/** Render a diagram built in code with Term / Equation. */
export function renderModel(model: Term | Equation, options?: RenderOptions): RenderResult;
export function parse(source: string, options?: Pick<RenderOptions, 'unit' | 'styles'>): {
  items: Array<{ op: string; br?: boolean; term?: Term; ellipsis?: boolean }>;
  /** line: where the block defines the style (the site's styles from options have none). */
  styles: Record<string, { base: string; opts: Record<string, unknown>; line?: number }>;
  unit?: number;
  grid?: boolean;
  errors: DiagramError[];
  /** The templates the block uses. */
  templates: string[];
};
/**
 * The block written out by hand: every vertex, line and text its templates stand for, as plain statements.
 * render(expand(src)) draws the same picture as render(src). Throws if the block has errors. The block's own
 * style statements and title are kept; `styles` (the site's, as given to the remark plugin) and `unit` (the
 * site's or the fence's, which a template may size itself by) are known while expanding and not written out.
 */
export function expand(source: string, options?: Pick<RenderOptions, 'styles' | 'unit'>): string;
/** The names of the templates a block uses (none for a block written by hand). */
export function templatesIn(source: string, options?: Pick<RenderOptions, 'styles'>): string[];

export function themeCSS(options?: { fumadocs?: boolean; media?: boolean }): string;
export const TOKENS: { light: Record<string, string>; dark: Record<string, string> };
/** A token (electron, phonon, photon, c4, c5, ink, muted, surface, or teal, violet, ...) as a CSS value. */
export function cssColor(color: string): string;

export type BuiltinLineStyle =
  | 'fermion' | 'fermion2' | 'phonon' | 'phonon2' | 'photon' | 'photon2' | 'coulomb' | 'screened'
  | 'field' | 'field2' | 'gluon' | 'gluon2' | 'scalar' | 'scalar2' | 'ghost' | 'plain' | 'plain2'
  | 'boson' | 'boson2' | 'impurity' | 'electron' | 'electron2' | 'hole' | 'higgs' | 'interaction';
export type BuiltinShape =
  | 'dot' | 'charge' | 'current' | 'eph' | 'dipole' | 'spin' | 'none' | 'point' | 'disk' | 'hatched' | 'open'
  | 'cross' | 'otimes' | 'square' | 'blob' | 'bubble' | 'box' | 'triangle' | 'lens';

export const LINE_STYLES: Record<string, { pattern: string; color: string; arrow?: boolean; double?: boolean; heavy?: boolean }>;
export const SHAPES: Record<string, { kind: string; color?: string; r?: number; ru?: number; wu?: number; hu?: number; trim?: boolean }>;

export interface TemplateSpec {
  title: string;
  example: string;
  params: Record<string, string | number | boolean>;
  flags?: Record<string, Record<string, string | number | boolean>>;
  /**
   * env.unit: the px per unit it will be drawn at (40 by default), as some templates keep room, in units, for labels of
   * fixed size; env.given: the options the block wrote, which such a template keeps as written.
   */
  build(params: Record<string, string | number | boolean>, env?: { unit?: number; given?: Set<string> }): Term | Equation;
}
export const TEMPLATES: Record<string, TemplateSpec>;

/** 'a', 'a.nw' (anchor), [x, y] in units, or { rel: [dx, dy] } relative to the other end. */
export type Endpoint = string | [number, number] | { rel: [number, number] };

export interface EdgeOptions {
  arrow?: 'fwd' | 'back' | 'none';
  /** Reverse the default arrow of a fermion-like style. */
  flip?: boolean;
  arrowAt?: 'mid' | 'end' | 'start';
  /** Where a middle arrow sits, as a fraction along the line (arrowpos= in the language). */
  arrowPos?: number;
  /** A mark in the middle of the line: cross (impurity lines) or none. */
  marker?: 'cross' | 'none';
  label?: string;
  /** left / right of the written direction; in / out of an arc or a loop. */
  side?: 'left' | 'right' | 'in' | 'out';
  /** A side of the page: on a straight line it places the label, on an arc the bulge, on a loop the loop. */
  above?: boolean;
  below?: boolean;
  dist?: number;
  pos?: number;
  /** Arc height as a fraction of the chord (0.5 = half circle); positive bulges left of from -> to. */
  bend?: number;
  /** Arc height in diagram units, the same units as vertex positions; needs above or below. */
  bulge?: number;
  loop?: boolean;
  dir?: string | number;
  size?: number;
  cw?: boolean;
  /** A momentum arrow beside the line, with this label; it runs along the written direction (from -> to). */
  mom?: string;
  /** The side of the written direction the momentum arrow goes on; by default the side opposite the label (on a loop, outside). */
  momside?: 'left' | 'right';
  /** back turns the momentum arrow round, against the written direction. */
  momdir?: 'back';
  /** Where the momentum arrow sits, as a fraction along the line: by default beside the label (on a loop, a sixth of the way round from a label outside). */
  mompos?: number;
  color?: string;
  width?: number;
  amp?: number;
  wl?: number;
  dash?: string;
  dressed?: boolean;
  bare?: boolean;
  heavy?: boolean;
  thin?: boolean;
  double?: boolean;
  faint?: boolean;
  opacity?: number;
  /** The line passes over the lines drawn before it: each one it crosses gets a gap (rungs between rails that are not neighbours, crossed interactions). */
  over?: boolean;
}

export interface NodeOptions {
  label?: string;
  pos?: string;
  color?: string;
  /** Radius in units (blob, triangle, small glyphs). */
  r?: number;
  /** Width and height in units of a box or a lens, as drawn on the page (a lens is never thicker than it is long). */
  w?: number;
  h?: number;
  dir?: string | number;
  size?: number;
  faint?: boolean;
}

export class Term {
  title: string | null;
  caption: string | null;
  node(name: string, x: number, y: number, shape?: BuiltinShape | string, opts?: NodeOptions): string;
  /** An invisible point; returns its generated name. */
  pt(x: number, y: number): string;
  edge(from: Endpoint, to: Endpoint, style?: BuiltinLineStyle | string, opts?: EdgeOptions): this;
  text(str: string, x: number, y: number, opts?: { size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; upright?: boolean }): this;
}

export class Equation {
  terms: Array<Term | { ellipsis: true }>;
  ops: string[];
  title: string | null;
  add(op: string, term: Term | { ellipsis: true }): this;
}
