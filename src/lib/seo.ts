/**
 * SEO metadata helpers — canonical URL construction and <head> metadata.
 *
 * Rules locked by W0 / Stage14:
 *   - canonical URLs always point at the production origin (get4dk.com),
 *     never a dev/beta host
 *   - beta builds carry noindex
 *   - meta descriptions come from approved copy only; a null description
 *     (homepage, W0 gap G-1) emits NO tag rather than invented text
 */
import { getHostConfig, absoluteUrl } from './hosts';
import type { RouteEntry } from './routes';

export interface PageMeta {
  title: string;
  description: string | null;
  canonical: string;
  robots: string;
}

export function buildPageMeta(route: RouteEntry): PageMeta {
  const host = getHostConfig();
  const robots = !route.indexable || host.noindex ? 'noindex, nofollow' : 'index, follow';
  return {
    title: route.title,
    description: route.description,
    canonical: absoluteUrl(route.path, host.canonicalOrigin),
    robots,
  };
}

/** Site-level identity used by WebSite/Organization schema. */
export const SITE_IDENTITY = {
  name: '4DK',
  formalName: '4DK — For D Kitchen',
  slogan: 'Food intelligence for real life.',
  contact: 'hello@get4dk.com',
} as const;

/**
 * W5 social cards (tools/w5-build-og.mjs): one 1200×630 card per ported
 * route, composed only from approved inputs (identity wordmark + approved
 * photography at native scale, no upscaling). Product-detail shells (W1,
 * page implementations still pending) share the default card.
 */
export const OG_IMAGE_BASE = '/assets/og';
const OG_ROUTE_SLUGS = new Set([
  'home', 'how-it-works', 'the-pass', 'c1-dinner', 'c1-freshness', 'c1-scan',
  'c1-steal', 'content-cook-with-what-you-have', 'content-freshness-rescue',
  'evergreen-jollof-storage', 'c2-nigeria-jollof',
  'recipe-one-pot-jollof-chicken-rice', 'recipe-pasta', 'versus-plantain',
  'features', 'food-atlas', 'pricing', 'c1-hub', 'content-meal-planning',
  'content-household-shopping', 'content-local-substitution',
  'content-technique-intelligence',
]);

export function ogImagePath(route: RouteEntry): string {
  const slug = OG_ROUTE_SLUGS.has(route.key) ? route.key : 'default';
  return `${OG_IMAGE_BASE}/og-${slug}.jpg`;
}

/** og:type — article for the editorial families, website for the rest. */
const ARTICLE_FAMILIES: ReadonlySet<string> = new Set([
  'CONTENT', 'CULTURAL', 'FOOD INTELLIGENCE', 'RECIPE', 'SOCIAL',
]);

export function ogType(route: RouteEntry): 'article' | 'website' {
  return ARTICLE_FAMILIES.has(route.family) ? 'article' : 'website';
}

/**
 * Social description: the approved meta description when one exists; on the
 * homepage (W0 gap G-1: no approved description copy) the approved site
 * slogan stands in so social shares are never empty.
 */
export function socialDescription(route: RouteEntry): string {
  return route.description ?? SITE_IDENTITY.slogan;
}
