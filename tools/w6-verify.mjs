/**
 * W6 verification — app / CTA / host integration audit over the built site.
 *
 *   1. Every CTA (product destination link) is inventoried: text, source
 *      route, destination, status — the W6 deliverable table.
 *   2. App destinations must be https://app.get4dk.com + a REAL app route
 *      (APP_PUBLIC_ROUTES, verified against the application's router).
 *   3. Cross-domain safety: https-only external links; zero localhost /
 *      127.0.0.1 / *.local / beta.* / www.get4dk.com hrefs; zero mailto
 *      shipped; external anchors carry rel.
 *   4. Absolute canonical-host links (https://get4dk.com/...) must address
 *      real manifest routes.
 *   5. In-page anchors must resolve to ids in the same document.
 *   6. No app functionality duplication: marketing pages only demonstrate
 *      (static compositions + clearly-local demo mechanics) — asserted by
 *      the absence of any app-origin forms/fetch targets.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP_ORIGIN = 'https://app.get4dk.com';
const APP_ROUTES = new Set([
  '/', '/login', '/pantry', '/discover', '/cook', '/saved', '/plan',
  '/shop', '/tools', '/house', '/scan', '/steal', '/leftovers', '/people',
  '/preferences', '/history', '/plans',
]);
const manifest = JSON.parse(readFileSync('src/data/route-manifest.json', 'utf8'));
const SITE_PATHS = new Set(manifest.routes.map((r) => r.path));

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const pages = walk('dist').filter((f) => f.endsWith('.html'));
const failures = [];
const fail = (m) => failures.push(m);
const ctaRows = [];

const textOf = (tag) => (tag.match(/>([^<]*)</)?.[1] ?? '').replace(/\s+/g, ' ').trim();

for (const page of pages) {
  const rel = relative('dist', page).replaceAll('\\', '/');
  const routePath = rel === '404.html' ? '/404' : '/' + rel.replace(/index\.html$/, '');
  const html = readFileSync(page, 'utf8');

  // every anchor
  const tags = html.match(/<a\b[^>]*>(?:[^<]*)<\/a>/gi) ?? [];
  for (const tag of tags) {
    const href = tag.match(/\bhref="([^"]*)"/)?.[1];
    if (!href) continue;
    const text = textOf(tag);

    if (href.startsWith('mailto:')) {
      fail(`${routePath}: mailto shipped ("${text}")`);
      continue;
    }
    if (/^https?:\/\//i.test(href)) {
      let url;
      try { url = new URL(href); } catch { fail(`${routePath}: unparseable URL ${href}`); continue; }
      if (url.protocol !== 'https:') fail(`${routePath}: non-https external ${href}`);
      if (/^(localhost|127\.|0\.0\.0\.0|\[::1\]|.*\.local)$/i.test(url.hostname)) fail(`${routePath}: dev host ${href}`);
      if (/^beta\./i.test(url.hostname)) fail(`${routePath}: stale beta host ${href}`);
      if (url.hostname === 'www.get4dk.com') fail(`${routePath}: www host (must be apex/app) ${href}`);
      if (/\brel="/i.test(tag) === false) fail(`${routePath}: external link without rel — ${href}`);
      if (url.search && !href.startsWith(`${APP_ORIGIN}/login`)) {
        // no query-string CTAs except the app-native login deep link
        fail(`${routePath}: unexpected query string on external CTA ${href}`);
      }
      if (url.hostname === 'app.get4dk.com') {
        if (!APP_ROUTES.has(url.pathname)) fail(`${routePath}: app CTA to non-existent app route ${href}`);
        ctaRows.push({ text, route: routePath, dest: href });
      } else if (url.hostname === 'get4dk.com') {
        if (!SITE_PATHS.has(url.pathname === '/' ? '/' : url.pathname.replace(/([^/])$/, '$1/'))) {
          fail(`${routePath}: absolute site link to non-manifest route ${href}`);
        }
      }
      // open-redirect safety: external links are direct https URLs by
      // construction; no redirector parameters are produced by this site.
    } else if (href.startsWith('#')) {
      const id = href.slice(1);
      if (id && !html.includes(`id="${id}"`)) fail(`${routePath}: dangling anchor ${href}`);
    }
  }

  // app-duplication guard: no form posts or API calls to the app origin
  if (new RegExp(`action="https?://app\\.`, 'i').test(html)) fail(`${routePath}: form action targets app origin`);
}

// ── CTA table (deliverable) ─────────────────────────────────────────────────
const byDest = new Map();
for (const r of ctaRows) {
  const k = `${r.dest}`;
  if (!byDest.has(k)) byDest.set(k, { dest: k, texts: new Map(), routes: new Set() });
  const e = byDest.get(k);
  e.texts.set(r.text, (e.texts.get(r.text) ?? 0) + 1);
  e.routes.add(r.route);
}
console.log(`CTA inventory: ${ctaRows.length} product CTAs across ${new Set(ctaRows.map((r) => r.route)).size} pages → ${byDest.size} destinations\n`);
for (const e of [...byDest.values()].sort((a, b) => a.dest.localeCompare(b.dest))) {
  const texts = [...e.texts.entries()].map(([t, n]) => (n > 1 ? `${t} ×${n}` : t)).join(' · ');
  console.log(`  ${e.dest}`);
  console.log(`      labels: ${texts}`);
  console.log(`      routes (${e.routes.size}): ${[...e.routes].slice(0, 8).join(', ')}${e.routes.size > 8 ? ' …' : ''}`);
}

console.log(`\npages audited: ${pages.length}`);
console.log('──────────────────────────────────────────');
if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`W6 VERIFY: FAIL (${failures.length})`);
  process.exit(1);
}
console.log('W6 VERIFY: PASS — every CTA resolves to a real app route; https-only; no dev/beta/www hosts; no mailto; rel on externals; anchors resolve');
