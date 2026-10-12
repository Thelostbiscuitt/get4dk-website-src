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
 *   9. No known internal/prototype incident copy ships
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, process.env.SMOKE_DIST_DIR ?? 'dist');
const HOLD = process.env.SMOKE_HELD === 'true';
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

function visibleText(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|rarr|amp|quot|#39);/g, ' ')
    .replace(/\s+/g, ' ');
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

// Every public route uses the same shell. The desktop nav alone carries an
// active item; the mobile menu mirrors those destinations inside that shell.
console.log('\n[3c] shared public header');
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(DIST.length + 1);
  if (/<a\b[^>]*href="#"/i.test(html)) fail(`${rel}: dead placeholder link`);
  if (/\bC[23] (?:pages should|works when|should turn)/.test(visibleText(html))) fail(`${rel}: internal editorial instructions`);
  const headers = [...html.matchAll(/<header\b[^>]*class="[^"]*\bsite-header\b[^"]*"[^>]*>[\s\S]*?<\/header>/g)];
  if (headers.length !== 1) { fail(`${rel}: expected one shared site header, found ${headers.length}`); continue; }
  const header = headers[0][0];
  if (!/<a\b[^>]*class="site-brand"[^>]*href="\/"/.test(header)) fail(`${rel}: brand must link home`);
  if (!header.includes('href="https://app.get4dk.com/login"') || !header.includes('href="https://app.get4dk.com/"')) fail(`${rel}: missing real account or app CTA`);
  for (const item of manifest.primary_nav) {
    if (!header.includes(`href="${item.href}"`)) fail(`${rel}: missing primary nav route ${item.href}`);
  }
  for (const navClass of ['site-links', 'site-menu']) {
    const nav = navClass === 'site-menu'
      ? header.match(/<details\b[^>]*class="site-menu"[^>]*>([\s\S]*?)<\/details>/)?.[1] ?? ''
      : header.match(/<nav\b[^>]*class="site-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
    const navRoutes = [...nav.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    if (!manifest.primary_nav.every((item) => navRoutes.includes(item.href))) fail(`${rel}: ${navClass} does not contain the locked nav set`);
  }
  const route = routeFileMap.get(file);
  const expectedActive = route && manifest.primary_nav.find((item) => route.path === item.href || (item.href !== '/' && route.path.startsWith(item.href)));
  const desktopNav = header.match(/<nav\b[^>]*class="site-links"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  const activeLinks = [...desktopNav.matchAll(/<a\b[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/a>/g)];
  if (activeLinks.length !== (expectedActive ? 1 : 0)) fail(`${rel}: expected ${expectedActive ? 1 : 0} active primary item, found ${activeLinks.length}`);
  else if (expectedActive && !activeLinks[0][1].includes(expectedActive.label)) fail(`${rel}: wrong active primary item`);
}
ok('one responsive header, route set and active state verified on every built page');
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
  if (route && route.indexable && noindex !== HOLD) {
    fail(`${rel}: expected ${HOLD ? 'noindex' : 'indexable'} robots policy`);
  }
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

// ── 4b. public release guard ────────────────────────────────────────
console.log('\n[4b] internal/prototype copy and homepage destinations');
const INTERNAL_COPY = [
  /will be wired/i,
  /product-page target/i,
  /real anchor/i,
  /screenshot hotspot/i,
  /authentication flow is intentionally not wired yet/i,
  /sign in placeholder/i,
  /back to landing/i,
  /buyer stage/i,
  /primary intent/i,
  /title tag/i,
  /structured data/i,
  /information gain \/ 4DK angle/i,
  /prototype CTA/i,
  /skip for now/i,
  /future route/i,
  /production (?:should|can) connect/i,
  /campaign analytics endpoint/i,
  /public recipe template/i,
  /reference record, not a lifestyle article/i,
  /conversion landing system/i,
  /acquisition pages/i,
  /\bC[123] \/ /i,
  /\bStage \d+ \/ /i,
  /\bnominal\b/i,
  /editorial system/i,
  /the pass \/ not content/i,
  /what shows up here/i,
  /read it then cook/i,
  /zero polite lifestyle nonsense/i,
  /the pass should earn the click/i,
  /enough telemetry to fix the kitchen loop/i,
  /intentional regional pricing/i,
  /priority access under capacity pressure/i,
];
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(DIST.length + 1);
  const text = visibleText(html);
  for (const marker of INTERNAL_COPY) {
    if (marker.test(text)) fail(`${rel}: internal/prototype copy ${marker}`);
  }
  if (rel === 'pricing/index.html' && /\bunlimited\b/i.test(text)) fail(`${rel}: unsupported uncapped usage claim`);
  const logoLinks = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?<img\b[^>]*\balt="4DK"[^>]*>(?:(?!<\/a>)[\s\S])*?<\/a>/gi)];
  for (const [, href] of logoLinks) {
    if (href !== '/') fail(`${rel}: navigational 4DK logo points to ${href}`);
  }
}
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
for (const marker of [
  /href="#(?:start|pantry|ask|plan|shop|recipes|freshness|top|m-top|m-start|login)"/i,
  /class="logo" href="#/i,
  /class="m-logo" href="#/i,
  /class="signin" href="#"/i,
  /class="m-sign" href="#"/i,
]) {
  if (marker.test(home)) fail(`index.html: prototype destination ${marker}`);
}
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(DIST.length + 1);
  for (const [label, marker] of [
  ['reference overlay markup', /class="(?:mobile-)?reference"/i],
  ['reference overlay styles', /\.show-ref|\.reference\{/i],
  ['review reference images', /reference-(?:desktop|mobile)\.png/i],
  ['master review bridge', /\bROUTE_MAP\b/],
  ['R-key debug toggle', /key\.toLowerCase\(\)\s*===\s*['"]r['"]/i],
  ]) {
    if (marker.test(html)) fail(`${rel}: review-only mechanic: ${label}`);
  }
}
for (const expected of [
  'class="site-brand" href="/"',
  'href="https://app.get4dk.com/"',
  'href="https://app.get4dk.com/login"',
  'class="feature" href="/features/pantry/"',
  'class="feature" href="/features/ask/"',
  'class="feature" href="/features/plan/"',
  'class="feature" href="/features/shop/"',
  'class="feature" href="/features/freshness/"',
]) {
  if (!home.includes(expected)) fail(`index.html: missing expected destination ${expected}`);
}
ok('no incident copy or review/debug mechanics; logos, product CTAs and feature destinations resolve');

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

// ── 7. sitemap seam / held build ───────────────────────────────────
console.log('\n[7] sitemap seam');
const sitemapIndex = join(DIST, 'sitemap-index.xml');
if (HOLD) {
  if (existsSync(sitemapIndex)) fail('held build must not publish sitemap-index.xml');
  const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
  if (!/Disallow:\s*\//.test(robots)) fail('held robots.txt must disallow crawling');
  else ok('held build has no sitemap and disallows crawling');
} else if (!existsSync(sitemapIndex)) fail('sitemap-index.xml missing');
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
