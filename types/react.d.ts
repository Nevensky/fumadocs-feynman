import type { ReactElement } from 'react';
import type { RenderOptions } from './index.js';

export interface FeynmanProps extends Omit<RenderOptions, 'unit'> {
  /** The diagram source (what a ```feynman block contains). */
  chart?: string;
  children?: string;
  unit?: number | string;
  className?: string;
  /** Hoist the theme <style> into <head> (React 19). Default true. */
  injectStyle?: boolean;
  /**
   * A copy button that shows when the pointer is over the diagram, or the button has keyboard focus. It copies the
   * diagram as a PNG and as SVG markup. It is a small client component, the only JavaScript the diagrams ship.
   * Default false; the remark plugin's copy option turns it on for every block.
   */
  copy?: boolean;
}

export function Feynman(props: FeynmanProps): ReactElement;
/** A Feynman component with site-wide defaults (notation, unit). */
export function createFeynman(defaults?: Partial<FeynmanProps>): (props: FeynmanProps) => ReactElement;
export default Feynman;
