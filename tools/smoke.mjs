/**
 * W1 route smoke test — verifies the production build against the route manifest.
 *
 * Checks:
 *   1. Every manifest route exists in dist/ (direct URL load works, static host)
 *   2. 404 page exists
 *   3. Every built page carries canonical + robots meta
 *   4. Production build carries no noindex on indexable routes
 *   5. Every internal <a href> on every built page resolves to a real file/route
 *   6. No iframe/srcdoc architecture anywhere in the build
 *   7. sitemap seam output exists and covers all routes
 *   8. Reserved future routes are absent
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const manifest = JSON.parse(readFileSync(join(ROOT, 'src/data/route-manifest.json'), 'utf8'));

let failures = 0;
const fail = (msg) => { failures++; console.error(`  FAIL ${msg}`); };
const ok = (msg) => console.log(`  ok   ${msg}`);

function pathToFile(p) {
  if (p === '/') return join(DIST, 'index.html');
  return join(DIST, p.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
}

function walkHtml(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkHtml(full, acc);
    else if (extname(full) === '.html') acc.push(full);
  }
  return acc;
}

// ── 1. routes exist ────────────────────────────────────────────────
console.log('\n[1] manifest routes resolve to built files');
for (const route of manifest.routes) {
  const file = pathToFile(route.path);
  existsSync(file) ? ok(route.path) : fail(`${route.path} → missing ${file}`);
}

// ── 2. 404 ─────────────────────────────────────────────────────────
console.log('\n[2] 404 page');
existsSync(join(DIST, '404.html')) ? ok('404.html') : fail('404.html missing');

// ── 3/4. canonical + robots per page ───────────────────────────────
console.log('\n[3] canonical + robots meta on every page');
const htmlFiles = walkHtml(DIST);
const routeFileMap = new Map(manifest.routes.map((r) => [pathToFile(r.path), r]));
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(DIST.length + 1);
  // W5 404 contract: a not-found response is noindex and must NOT be
  // canonicalized — every other page carries the production canonical.
  const is404 = rel === '404.html';
  if (!is404 && !/<link rel="canonical" href="https:\/\/get4dk\.com\//.test(html)) {
    fail(`${rel}: missing production canonical`);
  }
  if (!/<meta name="robots" content="[^"]+"/.test(html)) {
    fail(`${rel}: missing robots meta`);
  }
  if (is404 && !/noindex/.test(html)) fail(`${rel}: 404 must be noindex`);
  const route = routeFileMap.get(file);
  const noindex = /noindex/.test(html);
  if (route && route.indexable && noindex) fail(`${rel}: indexable route is noindex`);
}
ok(`checked ${htmlFiles.length} built HTML files`);

// ── 3b. placeholder detection (W9-R1 §11) ─────────────────────────
// No indexable route may ship W1 RouteShell scaffolding. Detected
// structurally: the shell class, its note copy, and the RouteShell mount.
console.log('\n[3b] placeholder detection on indexable routes');
const PLACEHOLDER_MARKERS = [/class="w1-shell/, /W1 shell/, /approved page implementation pending/, /route <code>/];
let placeholderHits = 0;
for (const file of htmlFiles) {
  const rel = file.slice(DIST.length + 1);
  if (rel === '404.html') continue;
  const html = readFileSync(file, 'utf8');
  const route = routeFileMap.get(file);
  if (route && route.indexable) {
    for (const marker of PLACEHOLDER_MARKERS) {
      if (marker.test(html)) { fail(`${rel}: placeholder marker ${marker}`); placeholderHits++; }
    }
  }
}
ok(placeholderHits === 0 ? 'no placeholder markers on indexable routes' : `${placeholderHits} placeholder hits`);

// ── 5. internal links resolve ──────────────────────────────────────
console.log('\n[5] internal navigation resolves');
const validPaths = new Set(manifest.routes.map((r) => r.path));
let linkCount = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(DIST.length + 1);
  const hrefs = [...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (/^(https?:|mailto:|#|tel:)/.test(href)) continue;
    linkCount++;
    const normalized = href.split('#')[0].split('?')[0];
    if (!validPaths.has(normalized)) {
      fail(`${rel}: internal link → ${href} (no such route)`);
    }
  }
}
ok(`${linkCount} internal links checked against manifest`);

// ── 6. no iframe/srcdoc architecture ───────────────────────────────
console.log('\n[6] no iframe/srcdoc architecture');
let iframeHits = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  if (/<iframe|srcdoc/i.test(html)) { iframeHits++; fail(`${file}: iframe/srcdoc found`); }
}
iframeHits === 0 && ok('no iframe/srcdoc in any built page');

// ── 7. sitemap seam ────────────────────────────────────────────────
console.log('\n[7] sitemap seam');
const sitemapIndex = join(DIST, 'sitemap-index.xml');
if (!existsSync(sitemapIndex)) fail('sitemap-index.xml missing');
else {
  const sitemapFiles = readdirSync(DIST).filter((f) => f.startsWith('sitemap') && f.endsWith('.xml'));
  let urls = '';
  for (const f of sitemapFiles) urls += readFileSync(join(DIST, f), 'utf8');
  for (const route of manifest.routes) {
    const url = `https://get4dk.com${route.path}`;
    if (route.indexable) {
      urls.includes(`<loc>${url}</loc>`) ? ok(`sitemap: ${route.path}`) : fail(`sitemap missing ${url}`);
    } else {
      urls.includes(`<loc>${url}</loc>`) ? fail(`sitemap includes non-indexable ${route.path}`) : ok(`sitemap excludes ${route.path} (non-indexable)`);
    }
  }
}

// ── 8. reserved routes absent ──────────────────────────────────────
console.log('\n[8] reserved future routes absent');
for (const reserved of manifest.reserved_future) {
  const file = pathToFile(reserved);
  !existsSync(file) ? ok(`${reserved} not published`) : fail(`${reserved} WAS published`);
}

// ── result ─────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────');
if (failures > 0) {
  console.error(`SMOKE RESULT: FAIL (${failures} failure${failures === 1 ? '' : 's'})`);
  process.exit(1);
}
console.log(`SMOKE RESULT: PASS — ${manifest.routes.length} routes + 404, ${htmlFiles.length} HTML files, ${linkCount} internal links`);
