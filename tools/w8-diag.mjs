/**
 * W8 diagnostic — value-level diff for one route at one width.
 * Usage: node tools/w8-diag.mjs <slug> <width>
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const R = '/home/thelostbiscuit/Desktop/Creations/WEBSITES/Get4dk/Resources';
const C1 = `${R}/4DK_C1_Conversion_Landing_Batch_v7_Audited/4dk_c1_conversion_batch_v7_audited`;
const CP = `${R}/4DK_First_Content_Program_Samples_v1/4dk_content_program_samples_v1`;
const C2 = `${R}/4DK_C2_Cultural_Discovery_Stage8_v1/4dk_c2_cultural_discovery_v1`;
const EG = `${R}/4DK_Stage9_Evergreen_Food_Intelligence_v1/4dk_evergreen_food_intelligence_v1`;
const RC = `${R}/4DK_Stage10_Public_Recipe_Template_v1/4dk_public_recipe_template_v1`;
const VS = `${R}/4DK_Stage11_C3_Social_Extensions_v2_FightHero/4dk_c3_social_extensions_v2_fight_hero`;

const MAP = {
  home: ['/', '/tmp/4dk_w2/landing.html'],
  'how-it-works': ['/how-it-works/', `${R}/4DK_How_It_Works_v7_LockedBanner_VisibleGlow/4dk_how_it_works_v7_locked_banner_visible_glow/how-it-works.html`],
  features: ['/features/', `${R}/4DK_Features_Hub_v3_CokeDustTransition/4dk_features_hub_v3_cokedust/features.html`],
  'the-pass': ['/the-pass/', `${R}/4DK_The_Pass_v3_ClearArticleBoundaries/4dk_the_pass_v3_boundaries/the-pass.html`],
  'food-atlas': ['/food-atlas/', `${R}/4DK_Stage13_Food_Atlas_v1/4dk_stage13_food_atlas_v1/food-atlas.html`],
  pricing: ['/pricing/', `${R}/4DK_Stage12_Pricing_Beta_Get4DK_v2_Soul/4dk_stage12_pricing_beta_v2_soul/pricing-beta-get4dk.html`],
  'c1-dinner': ['/what-should-i-cook-tonight/', `${C1}/what-should-i-cook-tonight.html`],
  'c1-freshness': ['/use-it-before-it-goes-bad/', `${C1}/use-it-before-it-goes-bad.html`],
  'c1-scan': ['/scan-my-kitchen/', `${C1}/scan-my-kitchen.html`],
  'c1-steal': ['/steal-a-recipe/', `${C1}/steal-a-recipe.html`],
  'content-cook': ['/what-can-i-cook-with-what-i-have/', `${CP}/what-can-i-cook-with-what-i-have.html`],
  'content-spinach': ['/what-to-cook-with-spinach-before-it-goes-bad/', `${CP}/what-to-cook-with-spinach-before-it-goes-bad.html`],
  'content-mealplan': ['/what-should-a-meal-planning-app-do/', `${CP}/what-should-a-meal-planning-app-do.html`],
  'content-household': ['/how-to-share-a-grocery-list-with-your-household/', `${CP}/how-to-share-a-grocery-list-with-your-household.html`],
  'content-panko': ['/what-can-i-use-instead-of-panko-in-nigeria/', `${CP}/what-can-i-use-instead-of-panko-in-nigeria.html`],
  'content-overcrowding': ['/why-does-overcrowding-a-pan-stop-browning/', `${CP}/why-does-overcrowding-a-pan-stop-browning.html`],
  'evergreen-jollof': ['/how-long-does-cooked-jollof-rice-last-in-the-fridge/', `${EG}/evergreen-jollof-storage.html`],
  'c2-jollof': ['/the-pass/nigerian-jollof-rice/', `${C2}/c2-nigeria-jollof.html`],
  'recipe-onepot': ['/recipes/one-pot-jollof-style-chicken-rice/', `${CP}/one-pot-jollof-style-chicken-rice.html`],
  'recipe-pasta': ['/recipes/20-minute-tomato-spinach-pasta/', `${RC}/recipe-sample.html`],
  'versus-plantain': ['/versus/fried-plantain-vs-boiled-plantain/', `${VS}/fried-vs-boiled-plantain.html`],
};

const [slug, widthArg] = process.argv.slice(2);
const width = Number(widthArg ?? 1280);
const [route, orig] = MAP[slug];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width > 800 ? 900 : 780 } });

const grab = () => page.evaluate(() => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + window.scrollY), Math.round(r.width), Math.round(r.height)]; };
  return {
    docH: document.documentElement.scrollHeight,
    imgs: [...document.images].map((i) => [(i.getAttribute('src') || '').split('/').pop(), ...rect(i)]),
    secs: [...document.querySelectorAll('section, header')].map((s) => [s.tagName + '.' + (s.className || '').slice(0, 24), ...rect(s)]),
  };
});

await page.goto('file://' + orig.replace(/^file:\/\//, '').replace(/^file:/, '').startsWith('/') ? 'file://' + orig : orig, { waitUntil: 'networkidle' }).catch(async (e) => {
  await page.goto(orig.startsWith('file') ? orig : 'file://' + orig, { waitUntil: 'networkidle' });
});
await page.waitForTimeout(400);
const o = await grab();
await page.goto('http://localhost:4321' + route, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const pr = await grab();

console.log(`${slug} @${width}  docH ${o.docH} vs ${pr.docH} (Δ${pr.docH - o.docH})`);
console.log(`imgs ${o.imgs.length} vs ${pr.imgs.length}`);
for (let i = 0; i < Math.max(o.imgs.length, pr.imgs.length); i++) {
  const a = o.imgs[i], b2 = pr.imgs[i];
  if (!a || !b2 || a.join('|') !== b2.join('|')) console.log(`  IMG[${i}] ${a ? a.join(' ') : '—'}   ||   ${b2 ? b2.join(' ') : '—'}`);
}
console.log(`sections ${o.secs.length} vs ${pr.secs.length}`);
for (let i = 0; i < Math.max(o.secs.length, pr.secs.length); i++) {
  const a = o.secs[i], b2 = pr.secs[i];
  if (!a || !b2 || a.join('|') !== b2.join('|')) console.log(`  SEC[${i}] ${a ? a.join(' ') : '—'}   ||   ${b2 ? b2.join(' ') : '—'}`);
}
await browser.close();
