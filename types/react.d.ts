import type { ReactElement } from 'react';
import type { RenderOptions } from './index';

export interface FeynmanProps extends Omit<RenderOptions, 'unit'> {
  /** The diagram source (what a ```feynman block contains). */
  chart?: string;
  children?: string;
  unit?: number | string;
  className?: string;
  /** Hoist the theme <style> into <head> (React 19). Default true. */
  injectStyle?: boolean;
}

export function Feynman(props: FeynmanProps): ReactElement;
/** A Feynman component with site-wide defaults (notation, unit). */
export function createFeynman(defaults?: Partial<FeynmanProps>): (props: FeynmanProps) => ReactElement;
export default Feynman;
