/**
 * W9-R1 feature-route verifier — the eight exploded PRODUCT routes.
 *
 * Static (dist):
 *   - unique title/description per route (≠ siblings)
 *   - canonical, indexable robots, OG metadata, WebPage+Breadcrumb schema
 *   - visible h1; crawlable <a> to all 8 feature routes (cross-linking)
 *   - baked approved detail state: kicker, title, body, all points, note in
 *     the initial HTML (from src/data/feature-pages.json — the approved hub copy)
 *   - detail image = this feature's canonical current-4DK screen (W4 set)
 *   - locked five-item nav present
 *   - no placeholder markers, no 'Future route' stub, no Chef4Me strings
 *
 * Browser (preview server): 360/390/768/1280/1440/1900 —
 *   - 200 load, 0 console/page errors, 0 broken images
 *   - horizontal overflow === 0 at every width (W9 finding: 11px @390)
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const BASE = process.env.W9R1_BASE ?? 'http://localhost:4321';
const features = JSON.parse(readFileSync('src/data/feature-pages.json', 'utf8'));
const ROUTE_KEY = { steal: 'steal-it' };
const routeOf = (f) => `/features/${ROUTE_KEY[f.key] ?? f.key}/`;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

let failures = 0;
const fail = (m) => { failures++; console.error(`FAIL ${m}`); };
const textOf = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

// ── static ───────────────────────────────────────────────────────────────────
const titles = new Map(), descs = new Map();
const lockedHrefs = ['/how-it-works/', '/features/', '/the-pass/', '/food-atlas/', '/pricing/'];
for (const f of features) {
  const file = join('dist', routeOf(f).replace(/^\//, ''), 'index.html');
  const html = readFileSync(file, 'utf8');
  const key = `features-${ROUTE_KEY[f.key] ?? f.key}`;
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1];

  if (!title || /4DK Features/.test(title) === false) fail(`${key}: title missing/not manifest ("${title}")`);
  if (titles.has(title)) fail(`${key}: duplicate title with ${titles.get(title)}`);
  titles.set(title, key);
  if (!desc || desc.length < 20) fail(`${key}: description missing/thin`);
  if (descs.has(desc)) fail(`${key}: duplicate description with ${descs.get(desc)}`);
  descs.set(desc, key);
  if (canonical !== `https://get4dk.com${routeOf(f)}`) fail(`${key}: canonical ${canonical}`);
  if (robots !== 'index, follow') fail(`${key}: robots "${robots}"`);
  for (const og of ['og:title', 'og:description', 'og:image']) {
    if (!html.includes(`property="${og}"`)) fail(`${key}: missing ${og}`);
  }
  if (!/"@type":\s*"WebPage"/.test(html) || !/"@type":\s*"BreadcrumbList"/.test(html)) fail(`${key}: WebPage/Breadcrumb schema missing`);
  if (!/<h1[\s>]/i.test(html)) fail(`${key}: no h1`);
  for (const h of lockedHrefs) if (!html.includes(`href="${h}"`)) fail(`${key}: locked nav missing ${h}`);

  // baked approved state in initial HTML
  const flat = textOf(html);
  if (!flat.includes(textOf(f.kick))) fail(`${key}: kicker not in initial HTML`);
  if (!flat.includes(textOf(f.title).trim())) fail(`${key}: approved title not in initial HTML`);
  if (!flat.includes(f.body)) fail(`${key}: approved body not in initial HTML`);
  for (const [i, pt] of f.points.entries()) {
    if (!flat.includes(pt)) fail(`${key}: approved point ${i + 1} not in initial HTML`);
  }
  if (!flat.includes(f.note)) fail(`${key}: annotation note not in initial HTML`);

  // cross-links: crawlable anchors to all eight feature routes
  for (const g of features) {
    if (!html.includes(`href="${routeOf(g)}"`)) fail(`${key}: missing cross-link ${routeOf(g)}`);
  }

  // detail image = this feature's canonical screen (attrs may precede id/src)
  const img = html.match(/<img[^>]*id="detail-image"[^>]*src="([^"]*)"/)?.[1];
  const want = { pantry: '4dk-pantry', freshness: '4dk-pantry', ask: '4dk-ask', steal: '4dk-tools', house: '4dk-profile', plan: '4dk-plan', shop: '4dk-shop', memory: '4dk-profile' }[f.key];
  if (!img?.includes(`${want}.webp`)) fail(`${key}: detail image ${img} (want ${want})`);

  if (/Future route/.test(html)) fail(`${key}: 'Future route' stub shipped`);
  if (/chef4me/i.test(html)) fail(`${key}: CHEF4ME string`);
  if (/class="w1-shell|W1 shell/.test(html)) fail(`${key}: placeholder marker`);
  console.log(`static ok  ${key.padEnd(20)} "${title}"`);
}

// ── browser: overflow + console ──────────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage();
const consoleIssues = [];
page.on('console', (m) => { if (m.type() === 'error') consoleIssues.push(`${page.url().replace(BASE, '')}: ${m.text().slice(0, 100)}`); });
page.on('pageerror', (e) => consoleIssues.push(`${page.url().replace(BASE, '')}: PAGEERROR ${String(e).slice(0, 100)}`));

const WIDTHS = [360, 390, 768, 1280, 1440, 1900];
for (const f of features) {
  const route = routeOf(f);
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w > 800 ? 900 : 780 });
    const resp = await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => {
      const se = document.scrollingElement || document.documentElement;
      return {
        overflow: se.scrollWidth - se.clientWidth,
        broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
        h1: document.querySelectorAll('h1').length,
      };
    });
    const key = `features-${ROUTE_KEY[f.key] ?? f.key}`;
    if (resp.status() !== 200) fail(`${key} ${w}px: status ${resp.status()}`);
    if (m.overflow !== 0) fail(`${key} ${w}px: horizontal overflow ${m.overflow}px`);
    if (m.broken) fail(`${key} ${w}px: ${m.broken} broken images`);
    if (m.h1 === 0) fail(`${key} ${w}px: no h1`);
    console.log(`${key.padEnd(20)} ${w}px  overflow ${m.overflow}px  ✓`);
  }
}
await browser.close();

// homepage description now required (W9-R1 §9)
const home = readFileSync('dist/index.html', 'utf8');
const homeDesc = home.match(/<meta name="description" content="([^"]*)"/)?.[1];
if (!homeDesc || homeDesc.length < 40) fail(`home: meta description missing/thin after W9-R1 §9`);
else console.log(`home description: "${homeDesc.slice(0, 60)}…"`);

if (consoleIssues.length) {
  for (const c of consoleIssues) console.error(`CONSOLE ${c}`);
  fail(`${consoleIssues.length} console errors`);
}
console.log('──────────────────────────────────────────');
if (failures) { console.error(`W9-R1 FEATURE VERIFY: FAIL (${failures})`); process.exit(1); }
console.log('W9-R1 FEATURE VERIFY: PASS — 8 feature routes real, SEO-complete, 0 overflow at 6 widths');
