export interface RemarkFeynmanOptions {
  /** Code-fence language (default 'feynman'). */
  lang?: string;
  /** MDX component name (default 'Feynman'). */
  component?: string;
  /** Site-wide line-style names, used when validating and when writing a block out by hand. */
  styles?: Record<string, string>;
  /**
   * The site's px per unit, when the component is given one (createFeynman({ unit })): pass the same here, for some
   * templates size themselves by it, and so must the build's check and the By hand tab. A fence's unit= wins when it
   * is a positive number; one that is not is left out, so that the component keeps the site's too.
   */
  unit?: number;
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
