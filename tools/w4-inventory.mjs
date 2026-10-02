/**
 * W4 inventory — every image the built site actually ships.
 *
 * Walks public/ for image files, reads intrinsic metadata (sharp), scans
 * dist/*.html for references, and reports: format, bytes, intrinsic px,
 * referencing routes, alt/loading attrs in the built HTML.
 * Output: .w4/inventory.json (+ human table on stdout).
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import sharp from 'sharp';

const PUB = 'public';
const DIST = 'dist';

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const IMAGE_RE = /\.(png|jpe?g|webp|avif|gif|svg)$/i;
const files = walk(PUB).filter((f) => IMAGE_RE.test(f));

const entries = [];
for (const f of files) {
  const rel = '/' + relative(PUB, f).replaceAll('\\', '/');
  const bytes = statSync(f).size;
  let width = null, height = null, format = 'svg';
  if (!f.endsWith('.svg')) {
    const m = await sharp(f).metadata();
    width = m.width; height = m.height; format = m.format;
  } else {
    const svg = readFileSync(f, 'utf8');
    const vb = svg.match(/viewBox=["']([^"']+)["']/i);
    if (vb) { const n = vb[1].trim().split(/\s+/).map(Number); width = n[2]; height = n[3]; }
  }
  entries.push({ asset: rel, format, bytes, width, height });
}

// Reference scan over built HTML.
const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
const usage = new Map(entries.map((e) => [e.asset, { routes: [], imgTags: 0, altsMissing: 0, loadingAttr: new Set() }]));
for (const hf of htmlFiles) {
  const route = '/' + relative(DIST, hf).replace(/index\.html$/, '').replaceAll('\\', '/');
  const html = readFileSync(hf, 'utf8');
  for (const e of entries) {
    const needle = `"${e.asset}"`;
    if (!html.includes(e.asset)) continue;
    const u = usage.get(e.asset);
    if (!u.routes.includes(route)) u.routes.push(route);
    // count <img> tags using it and inspect their attrs
    const tagRe = /<img\b[^>]*>/gi;
    let tag;
    while ((tag = tagRe.exec(html))) {
      if (!tag[0].includes(e.asset)) continue;
      u.imgTags++;
      if (!/\balt=/.test(tag[0])) u.altsMissing++;
      const load = tag[0].match(/\bloading=["']([^"']+)["']/i);
      u.loadingAttr.add(load ? load[1] : '(none)');
    }
  }
}

const report = entries.map((e) => ({
  ...e,
  usedBy: usage.get(e.asset).routes,
  imgTags: usage.get(e.asset).imgTags,
  altsMissing: usage.get(e.asset).altsMissing,
  loadingAttrs: [...usage.get(e.asset).loadingAttr],
}));

mkdirSync('.w4', { recursive: true });
writeFileSync('.w4/inventory.json', JSON.stringify(report, null, 2));

const kb = (b) => (b / 1024).toFixed(0) + 'K';
const unreferenced = report.filter((e) => e.usedBy.length === 0);
console.log(`assets: ${report.length} | referenced: ${report.length - unreferenced.length} | unreferenced: ${unreferenced.length}`);
console.log(`total shipped image weight: ${(report.reduce((s, e) => s + e.bytes, 0) / 1048576).toFixed(1)} MB`);
console.log('\n— raster assets (png/jpg/webp) —');
for (const e of report.filter((e) => e.format !== 'svg').sort((a, b) => b.bytes - a.bytes)) {
  console.log(`${e.asset.padEnd(58)} ${String(e.width + '×' + e.height).padEnd(11)} ${kb(e.bytes).padStart(6)}  imgs:${e.imgTags} alt-miss:${e.altsMissing} load:${e.loadingAttrs.join('|')}  ${e.usedBy.length}r`);
}
console.log('\n— svg assets —');
for (const e of report.filter((e) => e.format === 'svg').sort((a, b) => b.bytes - a.bytes)) {
  console.log(`${e.asset.padEnd(58)} ${String((e.width ?? '?') + '×' + (e.height ?? '?')).padEnd(11)} ${kb(e.bytes).padStart(6)}  imgs:${e.imgTags} alt-miss:${e.altsMissing}  ${e.usedBy.length}r`);
}
if (unreferenced.length) {
  console.log('\n— UNREFERENCED (shipped but never used by built HTML) —');
  for (const e of unreferenced) console.log(`  ${e.asset} (${kb(e.bytes)})`);
}
