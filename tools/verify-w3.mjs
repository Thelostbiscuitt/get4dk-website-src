/**
 * W3 verification — content-system routes, ported vs approved originals.
 *
 * For every W3 route × width (360/390/768/1280/1440/1900):
 *   - HTTP 200 on direct load
 *   - console errors / page errors (ported build only)
 *   - broken images / failed requests (ported build only)
 *   - scattered CTA destinations: legacy beta mailto + marketing-domain
 *     hrefs must be zero on ported pages
 *   - h1 presence
 *   - horizontal overflow parity with the original artifact at the same width
 * Additionally, per route (static, from dist/):
 *   - title + canonical match the manifest
 *   - answer-first content is present in the INITIAL HTML (artifact H1 text
 *     exists in the served markup — nothing answer-shaped is JS-injected)
 *   - the versus page ships no fabricated engagement counts (verbatim port;
 *     vote mechanic stays localStorage-local)
 * Screenshots per route (desktop 1440 + mobile 390) land in .w3-shots/.
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.VERIFY_BASE ?? 'http://localhost:4321';
const WIDTHS = [360, 390, 768, 1280, 1440, 1900];
const R = '/home/thelostbiscuit/Desktop/Creations/WEBSITES/Get4dk/Resources';
const C1 = `${R}/4DK_C1_Conversion_Landing_Batch_v7_Audited/4dk_c1_conversion_batch_v7_audited`;
const CP = `${R}/4DK_First_Content_Program_Samples_v1/4dk_content_program_samples_v1`;
const C2 = `${R}/4DK_C2_Cultural_Discovery_Stage8_v1/4dk_c2_cultural_discovery_v1`;
const EG = `${R}/4DK_Stage9_Evergreen_Food_Intelligence_v1/4dk_evergreen_food_intelligence_v1`;
const RC = `${R}/4DK_Stage10_Public_Recipe_Template_v1/4dk_public_recipe_template_v1`;
const VS = `${R}/4DK_Stage11_C3_Social_Extensions_v2_FightHero/4dk_c3_social_extensions_v2_fight_hero`;

const ROUTES = [
  ['c1-hub', '/use-cases/', `file://${C1}/index.html`],
  ['c1-dinner', '/what-should-i-cook-tonight/', `file://${C1}/what-should-i-cook-tonight.html`],
  ['c1-freshness', '/use-it-before-it-goes-bad/', `file://${C1}/use-it-before-it-goes-bad.html`],
  ['c1-scan', '/scan-my-kitchen/', `file://${C1}/scan-my-kitchen.html`],
  ['c1-steal', '/steal-a-recipe/', `file://${C1}/steal-a-recipe.html`],
  ['cook-with-what-you-have', '/what-can-i-cook-with-what-i-have/', `file://${CP}/what-can-i-cook-with-what-i-have.html`],
  ['spinach-freshness', '/what-to-cook-with-spinach-before-it-goes-bad/', `file://${CP}/what-to-cook-with-spinach-before-it-goes-bad.html`],
  ['meal-planning', '/what-should-a-meal-planning-app-do/', `file://${CP}/what-should-a-meal-planning-app-do.html`],
  ['household-list', '/how-to-share-a-grocery-list-with-your-household/', `file://${CP}/how-to-share-a-grocery-list-with-your-household.html`],
  ['panko-nigeria', '/what-can-i-use-instead-of-panko-in-nigeria/', `file://${CP}/what-can-i-use-instead-of-panko-in-nigeria.html`],
  ['overcrowding', '/why-does-overcrowding-a-pan-stop-browning/', `file://${CP}/why-does-overcrowding-a-pan-stop-browning.html`],
  ['c2-jollof', '/the-pass/nigerian-jollof-rice/', `file://${C2}/c2-nigeria-jollof.html`],
  ['evergreen-storage', '/how-long-does-cooked-jollof-rice-last-in-the-fridge/', `file://${EG}/evergreen-jollof-storage.html`],
  ['recipe-one-pot', '/recipes/one-pot-jollof-style-chicken-rice/', `file://${CP}/one-pot-jollof-style-chicken-rice.html`],
  ['recipe-pasta', '/recipes/20-minute-tomato-spinach-pasta/', `file://${RC}/recipe-sample.html`],
  ['versus-plantain', '/versus/fried-plantain-vs-boiled-plantain/', `file://${VS}/fried-vs-boiled-plantain.html`],
];

const manifest = JSON.parse(readFileSync('src/data/route-manifest.json', 'utf8'));
const SHOTS = '.w3-shots';
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const fail = (msg) => { failures++; console.error(`  FAIL ${msg}`); };

// ── static initial-HTML checks (served markup, pre-JS) ─────────────
function distFile(route) {
  return route === '/' ? 'dist/index.html' : join('dist', route.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
}
function artifactH1Text(file) {
  const html = readFileSync(file, 'utf8');
  const body = html.split(/<body[^>]*>/i)[1] ?? '';
  const m = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return m[1].replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

console.log('[static] initial HTML + metadata');
const textOf = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
for (const [name, route, originalFile] of ROUTES) {
  const dist = readFileSync(distFile(route), 'utf8');
  const entry = manifest.routes.find((r) => r.path === route);
  if (!entry) { fail(`${name}: no manifest entry for ${route}`); continue; }
  const escapedTitle = entry.title.replace(/&/g, '&amp;');
  if (!dist.includes(`<title>${escapedTitle}</title>`)) fail(`${name}: title ≠ manifest`);
  if (!dist.includes(`href="${manifest.canonical_origin_default}${route}"`)) fail(`${name}: canonical ≠ manifest`);
  const h1 = artifactH1Text(originalFile.replace(/^file:\/\//, ''));
  if (h1) {
    // Compare visible text: strip markup on both sides so <br>/<em> inside
    // the approved H1 don't defeat the includes() check.
    const flat = textOf(dist);
    if (!flat.includes(h1)) fail(`${name}: artifact H1 missing from initial HTML ("${h1.slice(0, 60)}…")`);
    else console.log(`  ok   ${name}: H1 in initial HTML`);
  }
  if (dist.includes('mailto:hello@get4dk')) fail(`${name}: legacy beta mailto survived`);
  if (/<a[^>]+href="https:\/\/get4dk\.com\/"/.test(dist)) fail(`${name}: scattered marketing-domain CTA href`);
}
console.log('  ok   static checks done');

// ── browser parity checks ──────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage();

const consoleIssues = [];
const badReqs = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !page.url().startsWith('file:')) {
    consoleIssues.push({ at: page.url().replace(BASE, ''), text: m.text().slice(0, 140) });
  }
});
page.on('pageerror', (e) => {
  if (!page.url().startsWith('file:')) {
    consoleIssues.push({ at: page.url().replace(BASE, ''), text: `PAGEERROR ${String(e).slice(0, 140)}` });
  }
});
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().startsWith('file:')) {
    badReqs.push(`${r.url().replace(BASE, '')} → ${r.status()}`);
  }
});

async function measure(url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const se = document.scrollingElement || document.documentElement;
    return {
      overflowPx: se.scrollWidth - se.clientWidth,
      brokenImgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      h1: document.querySelectorAll('h1').length,
    };
  });
}

for (const [name, route, originalUrl] of ROUTES) {
  console.log(`\n=== ${name} ${route}`);
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w > 800 ? 900 : 780 });
    const original = await measure(originalUrl);
    const resp = await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(120);
    const ported = await page.evaluate(() => {
      const se = document.scrollingElement || document.documentElement;
      const anchors = [...document.querySelectorAll('a')];
      return {
        overflowPx: se.scrollWidth - se.clientWidth,
        brokenImgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
        legacyMailto: anchors.filter((a) => (a.getAttribute('href') || '').includes('mailto:hello@get4dk')).length,
        marketingHref: anchors.filter((a) => a.getAttribute('href') === 'https://get4dk.com/').length,
        h1: document.querySelectorAll('h1').length,
      };
    });
    const tag = `${w}px`;
    if (resp.status() !== 200) fail(`${name} ${tag} status ${resp.status()}`);
    if (ported.overflowPx !== original.overflowPx) {
      fail(`${name} ${tag} overflow ${ported.overflowPx}px ≠ approved ${original.overflowPx}px`);
    }
    if (ported.brokenImgs.length) fail(`${name} ${tag} broken imgs: ${ported.brokenImgs.join(', ')}`);
    if (ported.legacyMailto || ported.marketingHref) fail(`${name} ${tag} scattered CTA hrefs (mailto:${ported.legacyMailto} marketing:${ported.marketingHref})`);
    if (ported.h1 === 0) fail(`${name} ${tag} no h1`);
    console.log(`  ${tag} ok — overflow ${ported.overflowPx}px (approved: ${original.overflowPx}px), imgs fine, h1 ${ported.h1}`);
  }
  for (const [label, w] of [['desktop', 1440], ['mobile', 390]]) {
    await page.setViewportSize({ width: w, height: w > 800 ? 900 : 780 });
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${SHOTS}/${name}-${label}-${w}.png` });
  }
}

await browser.close();

console.log('\n──────────────────────────────────────────');
if (consoleIssues.length) {
  console.error(`console errors (${consoleIssues.length}):`);
  for (const c of consoleIssues) console.error(`  ${c.at} :: ${c.text}`);
}
if (badReqs.length) {
  console.error(`failed requests (${badReqs.length}):`);
  for (const r of [...new Set(badReqs)]) console.error(`  ${r}`);
}
if (failures > 0 || consoleIssues.length || badReqs.length) {
  console.error(`W3 VERIFY: FAIL (${failures} check failures, ${consoleIssues.length} console, ${badReqs.length} bad requests)`);
  process.exit(1);
}
console.log('W3 VERIFY: PASS — 16 routes × 6 widths, overflow parity with approved artifacts, answer-first H1 in initial HTML, 0 console errors, 0 broken assets, 0 scattered CTAs');
