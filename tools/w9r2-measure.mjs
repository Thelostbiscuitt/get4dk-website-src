/**
 * W9-R2 §1 — measure ACTUAL rendered dimensions of every raster asset at
 * 360/390/768/1280/1440/1900 and compare against intrinsic source size.
 *
 * For each <img> on every built page: naturalW/H (intrinsic) vs clientW/H
 * (rendered CSS px). Aggregates per asset: source dims, max rendered dims,
 * source/render ratio. Writes .w9/rendered-sizes.json.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const WIDTHS = [360, 390, 768, 1280, 1440, 1900];
const BASE = 'http://127.0.0.1:4321';

function htmlFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = htmlFiles(DIST).map((p) => '/' + relative(DIST, p).replace(/index\.html$/, '').replace(/\.html$/, ''));
const browser = await chromium.launch();
const results = {}; // asset -> { natural, maxRendered, pages:Set, minRatio }

for (const route of pages) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    const imgs = await page.evaluate(() =>
      Array.from(document.images).map((i) => ({
        src: i.currentSrc || i.src,
        natural: [i.naturalWidth, i.naturalHeight],
        rendered: [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)],
      }))
    );
    for (const im of imgs) {
      if (!im.src.includes('/assets/')) continue;
      const key = im.src.split('/assets/')[1].split('?')[0];
      if (im.natural[0] === 0) continue; // failed load — smoke covers this
      const rec = (results[key] ??= { natural: im.natural, maxRendered: [0, 0], minRatio: 99, routes: new Set() });
      rec.routes.add(route);
      if (im.rendered[0] > rec.maxRendered[0]) rec.maxRendered = im.rendered;
      else if (im.rendered[0] === rec.maxRendered[0] && im.rendered[1] > rec.maxRendered[1]) rec.maxRendered = im.rendered;
      const ratio = Math.min(im.natural[0] / Math.max(1, im.rendered[0]), im.natural[1] / Math.max(1, im.rendered[1]));
      if (ratio < rec.minRatio) rec.minRatio = +ratio.toFixed(2);
    }
    await ctx.close();
  }
}
await browser.close();

const table = Object.entries(results)
  .map(([k, v]) => ({
    asset: k,
    source: v.natural.join('x'),
    maxRendered: v.maxRendered.join('x'),
    ratio: v.minRatio,
    routes: v.routes.size,
  }))
  .sort((a, b) => a.ratio - b.ratio);

mkdirSync(new URL('../.w9', import.meta.url).pathname, { recursive: true });
writeFileSync(new URL('../.w9/rendered-sizes.json', import.meta.url).pathname, JSON.stringify(table, null, 1));
console.log('asset'.padEnd(46), 'source'.padEnd(11), 'maxRendered'.padEnd(12), 'ratio  routes');
for (const r of table) {
  console.log(r.asset.padEnd(46), r.source.padEnd(11), r.maxRendered.padEnd(12), String(r.ratio).padEnd(6), r.routes);
}
const worst = table.filter((r) => r.ratio < 1.5 && !r.asset.startsWith('icons/'));
console.log('\nassets below 1.5x at any width (excl. icons):', worst.length);
