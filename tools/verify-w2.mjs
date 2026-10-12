/**
 * W2 verification — core public pages, ported vs approved originals.
 *
 * For every core route × width (360/390/768/1280/1440/1900):
 *   - HTTP 200 on direct load
 *   - console errors / page errors (ported build only)
 *   - broken images / failed requests (ported build only)
 *   - legacy scattered CTA destinations (must be zero)
 *   - h1 presence
 *   - horizontal overflow must MATCH THE ORIGINAL ARTIFACT at the same width
 *     (approved composition is the baseline; e.g. the pricing marquee ticker
 *     intentionally produces +6px scrollWidth at 360px in the approved file)
 * Screenshots per route (desktop 1440 + mobile 390) land in .w2-shots/.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.VERIFY_BASE ?? 'http://localhost:4321';
const WIDTHS = [360, 390, 768, 1280, 1440, 1900];
const R = '/home/thelostbiscuit/Desktop/Creations/Applications/4DK MAIN/website/Resources';
const ROUTES = [
  ['home', '/', `file:///tmp/4dk_w2/landing.html`],
  ['how-it-works', '/how-it-works/', `file://${R}/4DK_How_It_Works_v7_LockedBanner_VisibleGlow/4dk_how_it_works_v7_locked_banner_visible_glow/how-it-works.html`],
  ['features', '/features/', `file://${R}/4DK_Features_Hub_v3_CokeDustTransition/4dk_features_hub_v3_cokedust/features.html`],
  ['the-pass', '/the-pass/', `file://${R}/4DK_The_Pass_v3_ClearArticleBoundaries/4dk_the_pass_v3_boundaries/the-pass.html`],
  ['food-atlas', '/food-atlas/', `file://${R}/4DK_Stage13_Food_Atlas_v1/4dk_stage13_food_atlas_v1/food-atlas.html`],
  ['pricing', '/pricing/', `file://${R}/4DK_Stage12_Pricing_Beta_Get4DK_v2_Soul/4dk_stage12_pricing_beta_v2_soul/pricing-beta-get4dk.html`],
];
const SHOTS = '.w2-shots';

mkdirSync(SHOTS, { recursive: true });
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

async function measure(url, waitUntil = 'networkidle') {
  await page.goto(url, { waitUntil });
  await page.waitForTimeout(120);
  return page.evaluate(() => {
    const se = document.scrollingElement || document.documentElement;
    const anchors = [...document.querySelectorAll('a')];
    return {
      overflowPx: se.scrollWidth - se.clientWidth,
      brokenImgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      legacyMailto: anchors.filter((a) => (a.getAttribute('href') || '').includes('mailto:hello@get4dk')).length,
      h1: document.querySelectorAll('h1').length,
    };
  });
}

let failures = 0;
const fail = (msg) => { failures++; console.error(`  FAIL ${msg}`); };

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
        h1: document.querySelectorAll('h1').length,
      };
    });
    const tag = `${w}px`;
    if (resp.status() !== 200) fail(`${name} ${tag} status ${resp.status()}`);
    if (ported.overflowPx !== original.overflowPx) {
      fail(`${name} ${tag} overflow ${ported.overflowPx}px ≠ approved ${original.overflowPx}px`);
    }
    if (ported.brokenImgs.length) fail(`${name} ${tag} broken imgs: ${ported.brokenImgs.join(', ')}`);
    if (ported.legacyMailto) fail(`${name} ${tag} ${ported.legacyMailto} scattered legacy CTA href(s)`);
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
  console.error(`W2 VERIFY: FAIL (${failures} check failures, ${consoleIssues.length} console, ${badReqs.length} bad requests)`);
  process.exit(1);
}
console.log('W2 VERIFY: PASS — 6 routes × 6 widths, overflow parity with approved artifacts, 0 console errors, 0 broken assets, 0 scattered CTAs');
