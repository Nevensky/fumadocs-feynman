export interface RemarkFeynmanOptions {
  /** Code-fence language (default 'feynman'). */
  lang?: string;
  /** MDX component name (default 'Feynman'). */
  component?: string;
  /** Site-wide line-style names, used when validating and when writing a block out by hand. */
  styles?: Record<string, string>;
  /** Fail the build on a diagram error instead of warning. */
  strict?: boolean;
  /** Check diagrams at build time (default true). */
  validate?: boolean;
  /**
   * Follow every diagram by its source (default false; a block can ask with the bare word source in its fence).
   * A block that uses a template gets Template and By hand code tabs: fumadocs-ui's CodeBlockTabs, emitted ready-made.
   */
  source?: boolean;
  /** Do not echo diagram errors on the console. */
  quiet?: boolean;
}

// Typed loosely so that it fits any unified version's plugin type without depending on mdast types.
export function remarkFeynman(options?: RemarkFeynmanOptions): (tree: any, file: any) => void;
export default remarkFeynman;
