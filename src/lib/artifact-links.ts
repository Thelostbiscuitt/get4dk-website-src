/**
 * W3 shared artifact wiring — the exact, reviewable string transforms used to
 * port the Stage 5–11 batches. Everything here maps approved prototype
 * hrefs/stubs to production routes from the W0 manifest; no new content.
 *
 *   - nav stub wiring: the content/C2 batches ship `<a href="#">` nav items
 *     whose labels name real production routes; they are wired to those
 *     routes (production wiring, same class as filename→route mapping)
 *   - "Program" (content batch launcher) and batch logo hrefs go to `/`:
 *     W0 route rule 1 keeps launcher index.html files out of the route set
 *   - sibling sample links (query fan-out with real routes) get mapped 1:1
 *   - `https://get4dk.com/` marketing CTAs route through the central CTA
 *     config, exactly as the W2 core pages did
 */
import { CTA } from './cta';

/**
 * Content-program / C2 batch navs — RETIRED in W9-R1: every page now presents
 * the locked five-item primary navigation (lib/feature-pages.ts
 * lockedNavReplace / NAV_ORIGINALS).
 */

/** Stage-7 sample cross-links (query fan-out entries that are real routes). */
export const CONTENT_LINK_REWRITES: Record<string, string> = {
  'index.html': '/',
  'what-should-i-cook-tonight.html': '/what-should-i-cook-tonight/',
  'what-to-cook-with-spinach-before-it-goes-bad.html': '/what-to-cook-with-spinach-before-it-goes-bad/',
  'what-should-a-meal-planning-app-do.html': '/what-should-a-meal-planning-app-do/',
  'how-to-share-a-grocery-list-with-your-household.html': '/how-to-share-a-grocery-list-with-your-household/',
  'what-can-i-use-instead-of-panko-in-nigeria.html': '/what-can-i-use-instead-of-panko-in-nigeria/',
  'why-does-overcrowding-a-pan-stop-browning.html': '/why-does-overcrowding-a-pan-stop-browning/',
  'what-can-i-cook-with-what-i-have.html': '/what-can-i-cook-with-what-i-have/',
  'one-pot-jollof-style-chicken-rice.html': '/recipes/one-pot-jollof-style-chicken-rice/',
};

/** C1 batch pages: logo/nav + the "Use cases" hub link. */
export const C1_LINK_REWRITES: Record<string, string> = {
  'index.html#c1': '/use-cases/',
  'index.html': '/',
  'how-it-works.html': '/how-it-works/',
  'features.html': '/features/',
  'the-pass.html': '/the-pass/',
};

/**
 * Approved marketing-domain CTA href → central CTA config. Generic product
 * bridges on content pages ("Start cooking →") go to the app welcome; the
 * pages whose bridge names a specific surface override with their own
 * ctaHrefs (food-atlas → Ask, evergreen → Pantry).
 */
export const MARKETING_CTA_HREF: Record<string, string> = {
  'https://get4dk.com/': CTA.startCooking.href,
};

/** One production file per artifact asset. Source/rights metadata and the
 * 2026-10-11 replacements are recorded in src/data/asset-manifest.json. */
export const CANONICAL_ASSETS: Record<string, string> = {
  // Product UI — outdated prototype screens → current 4DK captures
  'home.png': '/assets/app-screens/4dk-home.webp',
  'pantry.png': '/assets/app-screens/4dk-pantry.webp',
  'screen-pantry.png': '/assets/app-screens/4dk-pantry.webp',
  'ask.png': '/assets/app-screens/4dk-ask.webp',
  'plan.png': '/assets/app-screens/4dk-plan.webp',
  'recipe.png': '/assets/app-screens/4dk-recipe.webp',
  'shop.png': '/assets/app-screens/4dk-shop.webp',
  'tools.png': '/assets/app-screens/4dk-tools.webp',
  'profile.png': '/assets/app-screens/4dk-profile.webp',
  // Licensed or generated editorial photography
  'hero_food_clean.png': '/assets/photo/hero-food.webp',
  'food-card-jollof.jpg': '/assets/photo/food-card-jollof.webp',
  'food-card-pasta.jpg': '/assets/photo/food-card-pasta.webp',
  'food-card-tacos.jpg': '/assets/photo/food-card-tacos.webp',
  'food-jollof-clean.jpg': '/assets/photo/food-jollof-clean.webp',
  'food-jollof-poster.jpg': '/assets/photo/food-jollof-poster.webp',
  'food-jollof-wide.jpg': '/assets/photo/food-jollof-wide.webp',
  'food-meal-strip.jpg': '/assets/photo/food-meal-strip.webp',
  'food-plan-grid.jpg': '/assets/photo/food-plan-grid.webp',
  // Original replacement banner artwork and marginal notes
  'footer_left.png': '/assets/banner/footer-left.webp',
  'footer_right.png': '/assets/banner/footer-right.webp',
  'note_left.png': '/assets/banner/note-left.webp',
  'rail_right.png': '/assets/banner/rail-right.webp',
  // Icons
  'icon1.png': '/assets/icons/icon1.png',
  'icon2.png': '/assets/icons/icon2.png',
  'icon3.png': '/assets/icons/icon3.png',
  'icon4.png': '/assets/icons/icon4.png',
  'icon5.png': '/assets/icons/icon5.png',
  // Identity — shared canonical mark
  '4DK_primary_dark.svg': '/assets/identity/4DK_primary_dark.svg',
};
