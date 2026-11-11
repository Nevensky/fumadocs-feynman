// Writes style.css from the theme tokens: node scripts/build-css.mjs
import { writeFileSync } from 'node:fs';
import { themeCSS } from '../src/theme.js';

writeFileSync(new URL('../style.css', import.meta.url), themeCSS());
console.log('style.css written');
