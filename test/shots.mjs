// Renders every example to PNG (3x, light and dark) with headless Chromium, for visual review and regression:
//   docker run --rm -v "$PWD":/pkg -w /pkg mcr.microsoft.com/playwright:v1.63.0-noble \
//     sh -c 'cd /tmp && npm i -s playwright-core@1.63.0 >/dev/null && cd /pkg && NODE_PATH=/tmp/node_modules node test/shots.mjs [ids...]'
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { render, TOKENS } from '../src/index.js';
import { EXAMPLES } from '../examples/examples.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const vars = (t) => Object.entries(t).map(([k, v]) => `--feyn-${k}:${v}`).join(';');
const only = process.argv.slice(2);
const list = only.length ? EXAMPLES.filter((e) => only.includes(e.id)) : EXAMPLES;
// SHOTS_DIR=after renders into test/out/after/ (keeps an earlier set for comparison)
const out = new URL(`./out/${process.env.SHOTS_DIR || 'png'}/`, import.meta.url);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2600, height: 1400 }, deviceScaleFactor: 3 });
const index = [];
for (const ex of list) {
  const r = render(ex.source, { id: 'shot' });
  for (const theme of ['light', 'dark']) {
    const t = TOKENS[theme];
    await page.setContent(`<!doctype html><meta charset="utf-8">
<style>
  :root { ${vars(t)}; --feyn-font-math: "DejaVu Serif", serif; --feyn-font-text: "DejaVu Serif", serif; }
  body { margin: 0; background: ${t.surface}; }
  #stage { display: inline-block; width: max-content; padding: 14px 18px; background: ${t.surface}; }
</style><div id="stage">${r.html}</div>`);
    const file = `${ex.id}${theme === 'dark' ? '-dark' : ''}.png`;
    await page.locator('#stage').screenshot({ path: new URL(file, out).pathname });
    index.push({ id: ex.id, theme, file: `test/out/${process.env.SHOTS_DIR || "png"}/${file}`, errors: r.errors.length });
  }
}
await browser.close();
writeFileSync(new URL('index.json', out), JSON.stringify(index, null, 1));
console.log(`${index.length} screenshots in test/out/${process.env.SHOTS_DIR || "png"}/`);
