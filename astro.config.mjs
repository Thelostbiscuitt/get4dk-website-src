// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Production build config — host-aware.
 *
 * `site` drives canonical URLs, sitemap generation and absolute asset URLs.
 * It is env-driven (CANONICAL_ORIGIN) so beta builds never stamp beta hosts
 * into canonicals: a beta deploy is noindexed via PUBLIC_SITE_ENV=beta and
 * its canonical still points at get4dk.com (locked Stage14 rule).
 */
const canonicalOrigin = process.env.CANONICAL_ORIGIN ?? 'https://get4dk.com';
// Sitemap ships on production builds only — beta/test deploys (Disallow-all
// robots + noindex pages) carry no crawler artifacts at all.
const isProductionBuild =
  (process.env.PUBLIC_SITE_ENV ?? 'production') === 'production' &&
  process.env.PUBLIC_FORCE_NOINDEX !== 'true';

export default defineConfig({
  site: canonicalOrigin,
  trailingSlash: 'always',
  // Verification seam: beta builds can target a separate directory
  // (ASTRO_OUT_DIR) without touching the production dist/.
  outDir: process.env.ASTRO_OUT_DIR ?? 'dist',
  build: {
    format: 'directory',
  },
  integrations: [
    ...(isProductionBuild
      ? [
          sitemap({
            // Sitemap-generation seam. Only manifest routes exist as pages, so
            // the sitemap equals the approved route set by construction.
            // Non-indexable manifest routes (W3 C1 selector hub at
            // /use-cases/) are filtered out so the sitemap stays = the 29
            // W0-approved indexable routes.
            filter: (page) => page !== `${canonicalOrigin}/use-cases/`,
            changefreq: undefined,
            lastmod: undefined,
            priority: undefined,
          }),
        ]
      : []),
  ],
});
