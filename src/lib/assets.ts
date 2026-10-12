/** Canonical production asset paths. Provenance and source hashes live in
 * src/data/asset-manifest.json; current release workflow is documented in
 * docs/MEDIA_RELEASE_2026-10-11.md. */

export const ASSET_BASE = '/assets';

export const identityAssets = {
  faviconSvg: `${ASSET_BASE}/identity/4DK_favicon.svg`,
  favicon512: `${ASSET_BASE}/identity/favicon-512.png`,
  favicon192: `${ASSET_BASE}/identity/favicon-192.png`,
  favicon180: `${ASSET_BASE}/identity/favicon-180.png`,
  favicon48: `${ASSET_BASE}/identity/favicon-48.png`,
  favicon32: `${ASSET_BASE}/identity/favicon-32.png`,
  favicon16: `${ASSET_BASE}/identity/favicon-16.png`,
  primaryWordmarkDark: `${ASSET_BASE}/identity/4DK_primary_dark.svg`,
  primaryWordmarkLight: `${ASSET_BASE}/identity/4DK_primary_light.svg`,
  secondaryLockupDark: `${ASSET_BASE}/identity/4DK_secondary_lockup_dark.svg`,
  socialAvatar: `${ASSET_BASE}/identity/4DK_social_avatar_dark.png`,
} as const;

export const bannerAssets = {
  footerLeft: `${ASSET_BASE}/banner/footer-left.webp`,
  footerRight: `${ASSET_BASE}/banner/footer-right.webp`,
} as const;

/** Real application UI rendered with sample data and traceable replacement
 * media for marketing. These captures are not live-account verification. */
export const appScreens = {
  home: `${ASSET_BASE}/app-screens/4dk-home.webp`,
  pantry: `${ASSET_BASE}/app-screens/4dk-pantry.webp`,
  ask: `${ASSET_BASE}/app-screens/4dk-ask.webp`,
  plan: `${ASSET_BASE}/app-screens/4dk-plan.webp`,
  recipe: `${ASSET_BASE}/app-screens/4dk-recipe.webp`,
  shop: `${ASSET_BASE}/app-screens/4dk-shop.webp`,
  tools: `${ASSET_BASE}/app-screens/4dk-tools.webp`,
  profile: `${ASSET_BASE}/app-screens/4dk-profile.webp`,
} as const;

export const photoAssets = {
  heroFood: `${ASSET_BASE}/photo/hero-food.webp`,
  foodCardJollof: `${ASSET_BASE}/photo/food-card-jollof.webp`,
  foodCardPasta: `${ASSET_BASE}/photo/food-card-pasta.webp`,
  foodCardTacos: `${ASSET_BASE}/photo/food-card-tacos.webp`,
  jollofClean: `${ASSET_BASE}/photo/food-jollof-clean.webp`,
  jollofPoster: `${ASSET_BASE}/photo/food-jollof-poster.webp`,
  jollofWide: `${ASSET_BASE}/photo/food-jollof-wide.webp`,
  mealStrip: `${ASSET_BASE}/photo/food-meal-strip.webp`,
  planGrid: `${ASSET_BASE}/photo/food-plan-grid.webp`,
} as const;
