export interface RemarkFeynmanOptions {
  /** Code-fence language (default 'feynman'). */
  lang?: string;
  /** MDX component name (default 'Feynman'). */
  component?: string;
  /** Site-wide line-style names, used when validating. */
  styles?: Record<string, string>;
  /** Fail the build on a diagram error instead of warning. */
  strict?: boolean;
  /** Check diagrams at build time (default true). */
  validate?: boolean;
}

// Typed loosely so that it fits any unified version's plugin type without depending on mdast types.
export function remarkFeynman(options?: RemarkFeynmanOptions): (tree: any, file: any) => void;
export default remarkFeynman;
