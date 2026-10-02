/**
 * W5 verification — route-level SEO / AEO / structured-data report.
 *
 * Zero-required:
 *   - missing canonical, duplicate canonical, contradictory schema,
 *     indexable test page, broken sitemap URL
 * Plus: unique titles, useful descriptions, OG/Twitter completeness,
 * heading sanity, crawlability, AEO answer-first, sitemap ↔ canonical
 * bidirectional match, no internal-note leakage, no non-canonical hosts.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const manifest = JSON.parse(readFileSync('src/data/route-manifest.json', 'utf8'));
const CANON = manifest.canonical_origin_default ?? 'https://get4dk.com';

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
const unescape = (s) => s?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// ── per-page checks ─────────────────────────────────────────────────────────
const rows = [];
const canonicals = new Map();
const titles = new Map();
for (const page of pages) {
  const rel = relative('dist', page).replaceAll('\\', '/');
  const is404 = rel === '404.html';
  const routePath = is404 ? '/404-not-a-route' : '/' + rel.replace(/index\.html$/, '');
  const html = readFileSync(page, 'utf8');
  const get = (re) => html.match(re)?.[1] ?? null;
  const title = unescape(get(/<title>([^<]*)<\/title>/));
  const desc = unescape(get(/<meta name="description" content="([^"]*)"/));
  const canonical = get(/<link rel="canonical" href="([^"]*)"/);
  const robots = get(/<meta name="robots" content="([^"]*)"/);
  const ogTitle = get(/<meta property="og:title" content="([^"]*)"/);
  const ogDesc = get(/<meta property="og:description" content="([^"]*)"/);
  const ogType = get(/<meta property="og:type" content="([^"]*)"/);
  const ogUrl = get(/<meta property="og:url" content="([^"]*)"/);
  const ogImage = get(/<meta property="og:image" content="([^"]*)"/);
  const ogImageAlt = get(/<meta property="og:image:alt" content="([^"]*)"/);
  const twCard = get(/<meta name="twitter:card" content="([^"]*)"/);
  const twImage = get(/<meta name="twitter:image" content="([^"]*)"/);
  const h1s = (html.match(/<h1[\s>]/gi) ?? []).length;
  const internalLinks = (html.match(/href="\/[^"]*"/g) ?? []).length;

  if (is404) {
    // 404 contract (W5): noindex, no canonical, no OG borrow, own title.
    if (title !== 'Page not found — 4DK') fail(`404: unexpected title "${title}"`);
    if (robots !== 'noindex, nofollow') fail(`404: expected noindex, got "${robots}"`);
    if (canonical) fail(`404: should not carry a canonical (got ${canonical})`);
    if (ogTitle || ogImage) fail('404: should not emit OG tags');
    if (/"@type"/.test(html)) fail('404: should not emit schema');
    if (h1s === 0) fail('404: no h1');
    rows.push({ key: '404', path: '/404', title, desc: null, canonical: null, robots, ogType: '-', h1: h1s, links: internalLinks, indexable: false });
    continue;
  }

  const entry = manifest.routes.find((r) => r.path === routePath);
  const key = entry?.key ?? routePath;

  // canonical requirements
  if (!canonical) fail(`${key}: MISSING canonical`);
  else {
    if (!canonical.startsWith(`${CANON}/`) && canonical !== `${CANON}/`) fail(`${key}: canonical off-origin → ${canonical}`);
    if (!canonical.endsWith('/') && canonical !== CANON) fail(`${key}: canonical missing trailing slash → ${canonical}`);
    if (canonical.includes('www.')) fail(`${key}: canonical uses www → ${canonical}`);
    if (canonical.includes('.html')) fail(`${key}: canonical has .html → ${canonical}`);
    if (canonicals.has(canonical)) fail(`${key}: DUPLICATE canonical with ${canonicals.get(canonical)}`);
    canonicals.set(canonical, key);
  }
  if (canonical && entry && canonical !== `${CANON}${entry.path === '/' ? '/' : entry.path}`) {
    fail(`${key}: canonical ≠ manifest path (${canonical} vs ${entry.path})`);
  }

  // titles unique + useful
  if (!title) fail(`${key}: missing <title>`);
  if (title && entry && title !== entry.title) fail(`${key}: title ≠ manifest ("${title}" vs "${entry.title}")`);
  if (title) {
    if (titles.has(title)) fail(`${key}: DUPLICATE title with ${titles.get(title)}`);
    titles.set(title, key);
  }

  // descriptions — required for every indexable page (W9-R1 §9 closed the
  // homepage G-1 gap; the exemption is retired)
  if (entry?.indexable && !desc) fail(`${key}: indexable page missing meta description`);
  if (desc && /\(W1|shell metadata|TODO/i.test(desc)) fail(`${key}: internal note leaked into description`);

  // robots
  if (entry && entry.indexable && robots !== 'index, follow') fail(`${key}: expected index,follow got "${robots}"`);
  if (entry && !entry.indexable && robots !== 'noindex, nofollow') fail(`${key}: expected noindex got "${robots}"`);
  if (is404 && robots !== 'noindex, nofollow') fail(`404: expected noindex, got "${robots}"`);

  // OG/Twitter completeness (every page incl. shells)
  for (const [k, v] of [['og:title', ogTitle], ['og:description', ogDesc], ['og:type', ogType], ['og:url', ogUrl], ['og:image', ogImage]]) {
    if (!v) fail(`${key}: missing ${k}`);
  }
  if (!twCard) fail(`${key}: missing twitter:card`);
  if (!twImage) fail(`${key}: missing twitter:image`);
  if (ogImage) {
    const imgPath = ogImage.replace(CANON, '');
    if (!existsSync(join('dist', imgPath))) fail(`${key}: og:image missing from dist → ${imgPath}`);
    if (!ogImageAlt) fail(`${key}: og:image:alt missing`);
    if (ogUrl && ogUrl !== canonical) fail(`${key}: og:url ≠ canonical`);
    if (ogDesc && entry && ogDesc !== (entry.description ?? 'Food intelligence for real life.')) {
      fail(`${key}: og:description ≠ approved copy`);
    }
  }

  // headings & crawlability
  if (h1s === 0) fail(`${key}: no h1`);
  if (/href="[^"]*\.html"/.test(html)) fail(`${key}: crawlable .html link present`);

  rows.push({ key, path: routePath, title, desc: desc ? desc.slice(0, 58) : null, canonical, robots, ogType, h1: h1s, links: internalLinks, indexable: entry?.indexable ?? false });
}

// ── sitemap ↔ canonical bidirectional match ────────────────────────────────
const sitemapXml = readFileSync('dist/sitemap-0.xml', 'utf8');
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const expected = manifest.routes.filter((r) => r.indexable).map((r) => `${CANON}${r.path === '/' ? '/' : r.path}`);
for (const u of sitemapUrls) {
  if (!u.startsWith(`${CANON}/`)) fail(`sitemap non-canonical URL: ${u}`);
  if (!u.endsWith('/') && u !== `${CANON}/`) fail(`sitemap URL missing trailing slash: ${u}`);
}
const sitemapSet = new Set(sitemapUrls);
for (const u of expected) if (!sitemapSet.has(u)) fail(`sitemap MISSING indexable route: ${u}`);
for (const u of sitemapUrls) {
  const path = u.replace(CANON, '');
  const entry = manifest.routes.find((r) => (r.path === '/' ? '/' : r.path) === path);
  if (!entry) fail(`sitemap contains non-manifest URL: ${u}`);
  else if (!entry.indexable) fail(`sitemap contains NON-indexable route: ${u}`);
}
// every sitemap URL resolves to a built page
for (const u of sitemapUrls) {
  const p = join('dist', u.replace(CANON, ''), 'index.html');
  if (!existsSync(p)) fail(`BROKEN sitemap URL (no built page): ${u}`);
}

// ── schema truthfulness spot checks ────────────────────────────────────────
const homeHtml = readFileSync('dist/index.html', 'utf8');
if (!/"@type":"WebSite"/.test(homeHtml.replaceAll(' ', ''))) fail('home: WebSite schema missing');
if (!/"@type":"Organization"/.test(homeHtml.replaceAll(' ', ''))) fail('home: Organization schema missing');

const recipeChecks = [
  ['dist/recipes/20-minute-tomato-spinach-pasta/index.html', 'recipeIngredient', '350 g pasta'],
  ['dist/recipes/one-pot-jollof-style-chicken-rice/index.html', 'recipeIngredient', null],
];
for (const [file, field] of recipeChecks) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes(`"${field}"`)) fail(`${file}: Recipe schema missing ${field}`);
  const recipeBlocks = (html.match(/"@type"\s*:\s*"Recipe"/g) ?? []).length;
  if (recipeBlocks !== 1) fail(`${file}: expected exactly 1 Recipe node, got ${recipeBlocks}`);
}
// Article only where the approved set carries it: the technique-intelligence
// explainer (manifest Article) and the C2 cultural article (approved artifact
// @graph, verbatim). A third page would need its own editorial qualification.
const overcrowd = readFileSync('dist/why-does-overcrowding-a-pan-stop-browning/index.html', 'utf8');
if (!/"@type"\s*:\s*"Article"/.test(overcrowd)) fail('overcrowding: Article schema missing');
const ARTICLE_ROUTES = new Set([
  'dist/why-does-overcrowding-a-pan-stop-browning/index.html',
  'dist/the-pass/nigerian-jollof-rice/index.html',
]);
for (const p of pages) {
  const hasArticle = /"@type"\s*:\s*"Article"/.test(readFileSync(p, 'utf8'));
  if (hasArticle && !ARTICLE_ROUTES.has(p.replaceAll('\\', '/'))) fail(`Article schema on non-editorial page: ${p}`);
}

// ── AEO: answer-first present in initial HTML on answer-intent routes ──────
const AEO = [
  ['/what-can-i-cook-with-what-i-have/', 'intelligence-cook-with-what-you-have'],
  ['/what-to-cook-with-spinach-before-it-goes-bad/', 'intelligence-spinach-freshness'],
  ['/what-should-a-meal-planning-app-do/', 'intelligence-meal-planning'],
  ['/how-to-share-a-grocery-list-with-your-household/', 'intelligence-household-list'],
  ['/what-can-i-use-instead-of-panko-in-nigeria/', 'intelligence-panko-nigeria'],
  ['/why-does-overcrowding-a-pan-stop-browning/', 'intelligence-overcrowding'],
  ['/how-long-does-cooked-jollof-rice-last-in-the-fridge/', 'evergreen-jollof-storage'],
];
const textOf = (h) => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
for (const [path, artifact] of AEO) {
  const built = textOf(readFileSync(join('dist', path, 'index.html'), 'utf8'));
  const artifactHtml = readFileSync(`src/page-artifacts/${artifact}.html`, 'utf8');
  const body = artifactHtml.slice(artifactHtml.indexOf('<body'));
  // first substantial paragraph of the approved answer block
  const answer = textOf((body.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]) ?? '');
  if (answer.length > 24 && !built.includes(answer)) {
    fail(`AEO ${path}: approved answer block not found in initial HTML ("${answer.slice(0, 60)}…")`);
  }
}

// ── report ──────────────────────────────────────────────────────────────────
console.log(`pages: ${pages.length} | sitemap URLs: ${sitemapUrls.length} | manifest: ${manifest.routes.length}`);
console.log('\nkey                          title/desc/canonical (first 90 chars)');
for (const r of rows) {
  const flag = r.indexable ? ' ' : 'N';
  console.log(`${flag} ${r.key.padEnd(36)} ${String(r.h1) + 'h1 ' + String(r.links).padStart(3) + 'a'}  ${(r.desc ?? r.title ?? '').slice(0, 84)}`);
}
console.log('\n──────────────────────────────────────────');
if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`W5 VERIFY: FAIL (${failures.length})`);
  process.exit(1);
}
console.log('W5 VERIFY: PASS — canonical/OG/robots/sitemap/schema/AEO all clean');
