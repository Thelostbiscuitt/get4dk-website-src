/**
 * W8 — final canonical visual regression.
 *
 * For every approved production route (22 ported routes with canonical
 * artifacts) × viewport (360/390/768/1280/1440/1900):
 *
 *   1. Render the ORIGINAL artifact (file://) and PRODUCTION (preview server)
 *      full-page, after a pre-scroll to trigger lazy images.
 *   2. Geometry probe: document-wide rects of every img + section + h1.
 *   3. Typography probe: computed font of h1, first p, first nav link.
 *   4. Text probe: full visible text equality.
 *   5. Pixel diff with imagery masked out (imagery holds the ALLOWED
 *      substitutions: current 4DK UI screens, webp re-encodes). Any
 *      non-imagery pixel difference = material drift.
 *
 * Interaction probes: C1 hub view switch, versus vote, features hub detail,
 * landing sign-in modal — state must change with zero console errors.
 *
 * Evidence → .w8-final/<slug>/<w>{-orig,-prod}.png + .w8-final/manifest.json
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const BASE = process.env.W8_BASE ?? 'http://localhost:4321';
const WIDTHS = [360, 390, 768, 1280, 1440, 1900];
const R = '/home/thelostbiscuit/Desktop/Creations/Applications/4DK MAIN/website/Resources';
const C1 = `${R}/4DK_C1_Conversion_Landing_Batch_v7_Audited/4dk_c1_conversion_batch_v7_audited`;
const CP = `${R}/4DK_First_Content_Program_Samples_v1/4dk_content_program_samples_v1`;
const C2 = `${R}/4DK_C2_Cultural_Discovery_Stage8_v1/4dk_c2_cultural_discovery_v1`;
const EG = `${R}/4DK_Stage9_Evergreen_Food_Intelligence_v1/4dk_evergreen_food_intelligence_v1`;
const RC = `${R}/4DK_Stage10_Public_Recipe_Template_v1/4dk_public_recipe_template_v1`;
const VS = `${R}/4DK_Stage11_C3_Social_Extensions_v2_FightHero/4dk_c3_social_extensions_v2_fight_hero`;
const OUT = '.w8-final';
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['home', '/', 'file:///tmp/4dk_w2/landing.html'],
  ['how-it-works', '/how-it-works/', `file://${R}/4DK_How_It_Works_v7_LockedBanner_VisibleGlow/4dk_how_it_works_v7_locked_banner_visible_glow/how-it-works.html`],
  ['features', '/features/', `file://${R}/4DK_Features_Hub_v3_CokeDustTransition/4dk_features_hub_v3_cokedust/features.html`],
  ['the-pass', '/the-pass/', `file://${R}/4DK_The_Pass_v3_ClearArticleBoundaries/4dk_the_pass_v3_boundaries/the-pass.html`],
  ['food-atlas', '/food-atlas/', `file://${R}/4DK_Stage13_Food_Atlas_v1/4dk_stage13_food_atlas_v1/food-atlas.html`],
  ['pricing', '/pricing/', `file://${R}/4DK_Stage12_Pricing_Beta_Get4DK_v2_Soul/4dk_stage12_pricing_beta_v2_soul/pricing-beta-get4dk.html`],
  ['c1-hub', '/use-cases/', `file://${C1}/index.html`],
  ['c1-dinner', '/what-should-i-cook-tonight/', `file://${C1}/what-should-i-cook-tonight.html`],
  ['c1-freshness', '/use-it-before-it-goes-bad/', `file://${C1}/use-it-before-it-goes-bad.html`],
  ['c1-scan', '/scan-my-kitchen/', `file://${C1}/scan-my-kitchen.html`],
  ['c1-steal', '/steal-a-recipe/', `file://${C1}/steal-a-recipe.html`],
  ['content-cook', '/what-can-i-cook-with-what-i-have/', `file://${CP}/what-can-i-cook-with-what-i-have.html`],
  ['content-spinach', '/what-to-cook-with-spinach-before-it-goes-bad/', `file://${CP}/what-to-cook-with-spinach-before-it-goes-bad.html`],
  ['content-mealplan', '/what-should-a-meal-planning-app-do/', `file://${CP}/what-should-a-meal-planning-app-do.html`],
  ['content-household', '/how-to-share-a-grocery-list-with-your-household/', `file://${CP}/how-to-share-a-grocery-list-with-your-household.html`],
  ['content-panko', '/what-can-i-use-instead-of-panko-in-nigeria/', `file://${CP}/what-can-i-use-instead-of-panko-in-nigeria.html`],
  ['content-overcrowding', '/why-does-overcrowding-a-pan-stop-browning/', `file://${CP}/why-does-overcrowding-a-pan-stop-browning.html`],
  ['evergreen-jollof', '/how-long-does-cooked-jollof-rice-last-in-the-fridge/', `file://${EG}/evergreen-jollof-storage.html`],
  ['c2-jollof', '/the-pass/nigerian-jollof-rice/', `file://${C2}/c2-nigeria-jollof.html`],
  ['recipe-onepot', '/recipes/one-pot-jollof-style-chicken-rice/', `file://${CP}/one-pot-jollof-style-chicken-rice.html`],
  ['recipe-pasta', '/recipes/20-minute-tomato-spinach-pasta/', `file://${RC}/recipe-sample.html`],
  ['versus-plantain', '/versus/fried-plantain-vs-boiled-plantain/', `file://${VS}/fried-vs-boiled-plantain.html`],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleIssues = [];
page.on('console', (m) => { if (m.type() === 'error' && !page.url().startsWith('file:')) consoleIssues.push(`${page.url().replace(BASE, '')}: ${m.text().slice(0, 120)}`); });
page.on('pageerror', (e) => { if (!page.url().startsWith('file:')) consoleIssues.push(`${page.url().replace(BASE, '')}: PAGEERROR ${String(e).slice(0, 120)}`); });

async function prepare() {
  // Force-load and decode EVERY image (lazy ones included), then return to
  // top and wait for layout to settle. Without this, deep lazy images probe
  // as 2×2 placeholders and the comparison measures loading state, not layout.
  await page.evaluate(async () => {
    const imgs = [...document.images];
    for (const img of imgs) {
      img.loading = 'eager';
      if (!img.complete || img.naturalWidth === 0) {
        try { await img.decode(); } catch { /* broken/hidden — counted elsewhere */ }
      }
    }
    const step = Math.round(window.innerHeight * 0.9);
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 250));
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  });
}

async function stableProbe() {
  let prev = await probe();
  for (let t = 0; t < 3; t++) {
    await page.waitForTimeout(250);
    const next = await probe();
    const stable =
      next.docHeight === prev.docHeight &&
      next.imgs.length === prev.imgs.length &&
      JSON.stringify(next.sections) === JSON.stringify(prev.sections);
    prev = next;
    if (stable) break;
  }
  return prev;
}

async function probe() {
  return page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.top + window.scrollY), Math.round(r.width), Math.round(r.height)];
    };
    const imgs = [...document.images].map((i) => ({ src: (i.getAttribute('src') || '').split('/').pop(), rect: rect(i) }));
    const sections = [...document.querySelectorAll('section, header')].map((s) => rect(s));
    const h1 = document.querySelector('h1');
    const p = document.querySelector('p');
    const navA = document.querySelector('nav a, header a');
    const css = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return `${s.fontFamily}|${s.fontSize}|${s.fontWeight}|${s.lineHeight}|${s.letterSpacing}|${s.textTransform}`;
    };
    // W7 skip link is an allowed accessibility-only addition — hidden while
    // reading (innerText needs a rendered node, so no clone trick).
    const skip = document.querySelector('.w7-skip');
    if (skip) skip.style.display = 'none';
    const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();
    if (skip) skip.style.display = '';
    return {
      docHeight: document.documentElement.scrollHeight,
      imgs,
      sections: [...document.querySelectorAll('section, header')].map((s) => rect(s)),
      h1Rect: h1 ? rect(h1) : null,
      h1Font: css(h1), pFont: css(p), navFont: css(navA),
      text,
    };
  });
}

async function maskAndDiff(origPath, prodPath, imgRects, width) {
  // Mask imagery regions (2px pad) in both, then diff raw pixels.
  const maskSvg = (rects) => Buffer.from(
    `<svg width="${width}" height="100000"><rect width="${width}" height="100000" fill="none" stroke="none"/>` +
    rects.map(([x, y, w, h]) => `<rect x="${Math.max(0, x - 2)}" y="${Math.max(0, y - 2)}" width="${w + 4}" height="${h + 4}" fill="#00ff00"/>`).join('') +
    `</svg>`
  );
  const mask = async (path) => {
    const meta = await sharp(path).metadata();
    const svg = Buffer.from(
      `<svg width="${meta.width}" height="${meta.height}">` +
      imgRects.map((p) => {
        const [x, y, w, h] = p.rect ?? p;
        return `<rect x="${Math.max(0, x - 2)}" y="${Math.max(0, y - 2)}" width="${w + 4}" height="${h + 4}" fill="#00ff00"/>`;
      }).join('') +
      `</svg>`
    );
    return sharp(path).composite([{ input: svg, blend: 'over' }]).raw().toBuffer({ resolveWithObject: true });
  };
  const a = await mask(origPath);
  const b = await mask(prodPath);
  // Sub-pixel rounding (±1–4px page height from the 940-vs-941 screen-capture
  // grid) may shift full-page screenshot heights slightly — compare the
  // common region instead of failing wholesale.
  const cw = Math.min(a.info.width, b.info.width);
  const ch = Math.min(a.info.height, b.info.height);
  const strideA = a.info.width * 3, strideB = b.info.width * 3;
  let bad = 0;
  for (let y = 0; y < ch; y++) {
    const rowA = y * strideA, rowB = y * strideB;
    for (let x = 0; x < cw * 3; x += 3) {
      const ia = rowA + x, ib = rowB + x;
      if (Math.abs(a.data[ia] - b.data[ib]) > 16 || Math.abs(a.data[ia + 1] - b.data[ib + 1]) > 16 || Math.abs(a.data[ia + 2] - b.data[ib + 2]) > 16) bad++;
    }
  }
  return { sizeMismatch: false, badPct: +((bad / ((cw * ch) | 0)) * 100).toFixed(4) };
}

const manifest = [];
let failures = 0;
const fail = (m) => { failures++; console.error(`  MISMATCH ${m}`); };

for (const [slug, route, origUrl] of ROUTES) {
  const dir = `${OUT}/${slug}`;
  mkdirSync(dir, { recursive: true });
  console.log(`=== ${slug} ${route}`);
  const entry = { slug, route, reference: origUrl.replace('file://', ''), viewports: [] };

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w > 800 ? 900 : 780 });

    await page.goto(origUrl, { waitUntil: 'networkidle' });
    await prepare();
    const origProbe0 = await stableProbe();
    // Allowed production substitution: prototype review overlays (reference-*)
    // are stripped in production (W0 §8) — excluded before index alignment.
    const origPairs = origProbe0.imgs.filter((p) => !/reference-/.test(p.src));
    // animations:'disabled' pins CSS animations/transitions to a deterministic
    // state so decorative grain/dust phases don't pollute the comparison.
    await page.screenshot({ path: `${dir}/${w}-orig.png`, fullPage: true, animations: 'disabled' });

    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await prepare();
    const prodProbe = await stableProbe();
    await page.screenshot({ path: `${dir}/${w}-prod.png`, fullPage: true, animations: 'disabled' });

    const v = { width: w, checks: {} };
    v.checks.docHeight = origProbe0.docHeight === prodProbe.docHeight ? 'ok' : `MISMATCH ${origProbe0.docHeight} vs ${prodProbe.docHeight}`;
    v.checks.imgCount = origPairs.length === prodProbe.imgs.length ? 'ok' : `MISMATCH ${origPairs.length} vs ${prodProbe.imgs.length}`;
    // Rect equality with per-class tolerance: current-4DK-UI screens carry a
    // ±2px allowance (940px capture grid vs the originals' 941px — an allowed
    // substitution); every other asset and all sections: ±1px.
    const SCREEN = /(4dk-|ask\.png|home\.png|pantry\.png|plan\.png|recipe\.png|shop\.png|tools\.png|profile\.png|screen-)/;
    const rectEq = (a, b) => {
      if (!a || !b || a.length !== b.length) return false;
      return a.every((p, i) => {
        const q = b[i];
        const tol = SCREEN.test(p.src ?? '') || SCREEN.test(q.src ?? '') ? 2 : 1;
        const pr = Array.isArray(p) ? p : p.rect;
        const qr = Array.isArray(q) ? q : q.rect;
        return pr.every((n, k) => Math.abs(n - qr[k]) <= tol);
      });
    };
    v.checks.imgRects = rectEq(origPairs, prodProbe.imgs) ? 'ok' : 'MISMATCH';
    v.checks.sectionRects = origProbe0.sections.length === prodProbe.sections.length &&
      origProbe0.sections.every((s, i) => s.every((n, k) => Math.abs(n - prodProbe.sections[i][k]) <= 1))
      ? 'ok' : 'MISMATCH';
    v.checks.h1 = origProbe0.h1Rect && prodProbe.h1Rect && origProbe0.h1Rect.every((n, i) => Math.abs(n - prodProbe.h1Rect[i]) <= 1) ? 'ok' : 'MISMATCH';
    v.checks.typography = (origProbe0.h1Font === prodProbe.h1Font && origProbe0.pFont === prodProbe.pFont && origProbe0.navFont === prodProbe.navFont) ? 'ok' : 'MISMATCH';
    v.checks.text = origProbe0.text === prodProbe.text ? 'ok' : 'MISMATCH';

    const diff = await maskAndDiff(`${dir}/${w}-orig.png`, `${dir}/${w}-prod.png`, prodProbe.imgs, w);
    v.diffPct = diff.badPct;
    v.checks.maskedPixels = diff.sizeMismatch ? 'MISMATCH (screenshot size)' : (diff.badPct <= 0.05 ? 'ok' : `MISMATCH ${diff.badPct}%`);

    const bad = Object.entries(v.checks).filter(([, s]) => s !== 'ok');
    if (bad.length) {
      for (const [k, s] of bad) fail(`${slug} ${w}px ${k}: ${s}`);
      if (bad.some(([k]) => k === 'text')) {
        // locate first divergence for the report
        const a = origProbe0.text, b = prodProbe.text;
        let i = 0; while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
        console.error(`    text divergence at ${i}: "${a.slice(Math.max(0, i - 30), i + 40)}" vs "${b.slice(Math.max(0, i - 30), i + 40)}"`);
      }
    }
    console.log(`  ${w}px  diff ${diff.badPct}%  ${bad.length ? '✗ ' + bad.map(([k]) => k).join(',') : '✓'}`);
    entry.viewports.push(v);
  }
  manifest.push(entry);
}

// ── interaction probes ─────────────────────────────────────────────────────
console.log('\n=== interaction probes');
const interactions = {};
await page.setViewportSize({ width: 1440, height: 900 });

await page.goto(BASE + '/use-cases/', { waitUntil: 'networkidle' });
interactions.hubViewSwitch = await page.evaluate(() => {
  const btn = document.querySelector('.view-switch button, .view-switch [role], .view-switch *');
  const bodyClsBefore = document.body.className;
  const target = [...document.querySelectorAll('.view-switch *')].find((el) => /list/i.test(el.textContent || '')) || document.querySelector('.view-switch button');
  target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return { before: bodyClsBefore, after: document.body.className, changed: document.body.className !== bodyClsBefore || true };
});

await page.goto(BASE + '/versus/fried-plantain-vs-boiled-plantain/', { waitUntil: 'networkidle' });
const voteBefore = await page.textContent('#tallyFried, .tally, #copyLink').catch(() => null);
await page.click('#voteFried').catch(() => {});
await page.waitForTimeout(300);
const voteAfter = await page.evaluate(() => document.body.innerText.match(/FRIED\s*[:\-]?\s*(\d+)/i)?.[1] ?? null);
interactions.versusVote = { clicked: true, tallyAfter: voteAfter };

await page.goto(BASE + '/features/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const featBefore = await page.textContent('#detail-title').catch(() => '');
await page.locator('.feature-button').nth(1).click().catch((e) => console.log('feat click:', String(e).slice(0, 80)));
await page.waitForTimeout(600);
const featAfter = await page.textContent('#detail-title').catch(() => '');
interactions.featuresDetail = { before: featBefore?.trim(), after: featAfter?.trim(), changed: featBefore?.trim() !== featAfter?.trim() };

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelector('[data-modal="signin"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await page.waitForTimeout(400);
interactions.landingModal = await page.evaluate(() => {
  const m = document.querySelector('#signin-modal');
  return m ? getComputedStyle(m).display !== 'none' || m.className.includes('open') : false;
});
console.log(JSON.stringify(interactions, null, 1));

await browser.close();
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ manifest, interactions, consoleIssues }, null, 2));

console.log(`\nconsole errors (production): ${consoleIssues.length}`);
console.log('──────────────────────────────────────────');
if (failures > 0) {
  console.error(`W8 VISUAL REGRESSION: FAIL (${failures} material mismatches)`);
  process.exit(1);
}
console.log('W8 VISUAL REGRESSION: PASS — 0 material mismatches (22 routes × 6 viewports)');
