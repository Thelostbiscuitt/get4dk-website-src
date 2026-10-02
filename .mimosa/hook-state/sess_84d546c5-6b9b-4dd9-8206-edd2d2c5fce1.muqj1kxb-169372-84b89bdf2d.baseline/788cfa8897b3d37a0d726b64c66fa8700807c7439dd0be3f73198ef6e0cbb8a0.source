/**
 * JSON-LD schema builders — the schema injection seam.
 *
 * Distribution is the locked Stage14 rule (SEO_SCHEMA_MAP.csv):
 *   WebSite + Organization  → homepage only
 *   WebPage/CollectionPage  → utility + hub pages
 *   Article                 → true editorial/explainer pages
 *   Recipe                  → real recipes only
 *   BreadcrumbList          → leaf pages
 * Schema must always match visible page content; never add schema to chase
 * a rich result; no FAQPage; HowTo only as HowToStep inside Recipe (W2+).
 */
import { absoluteUrl } from './hosts';
import { breadcrumbTrailFor, type RouteEntry, type SchemaType } from './routes';
import { SITE_IDENTITY } from './seo';

type JsonLd = Record<string, unknown>;

function webSiteSchema(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    name: SITE_IDENTITY.name,
    alternateName: SITE_IDENTITY.formalName,
    description: SITE_IDENTITY.slogan,
    url: absoluteUrl('/'),
  };
}

function organizationSchema(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: SITE_IDENTITY.name,
    url: absoluteUrl('/'),
    email: SITE_IDENTITY.contact,
    slogan: SITE_IDENTITY.slogan,
  };
}

function webPageSchema(route: RouteEntry): JsonLd {
  return {
    '@type': 'WebPage',
    '@id': absoluteUrl(route.path),
    name: route.title,
    url: absoluteUrl(route.path),
  };
}

function collectionPageSchema(route: RouteEntry): JsonLd {
  return {
    '@type': 'CollectionPage',
    '@id': absoluteUrl(route.path),
    name: route.title,
    url: absoluteUrl(route.path),
  };
}

function articleSchema(route: RouteEntry): JsonLd {
  return {
    '@type': 'Article',
    '@id': absoluteUrl(route.path),
    headline: route.title,
    description: route.description ?? undefined,
    // datePublished/dateModified/author/image attach when real content lands (W2+).
  };
}

function recipeSchema(route: RouteEntry): JsonLd {
  // W1: stub registration only. Real recipes require ingredients, steps,
  // times, yield — intentionally omitted until approved content migrates (W2+),
  // because schema must match visible content.
  return {
    '@type': 'Recipe',
    '@id': absoluteUrl(route.path),
    name: route.name,
    url: absoluteUrl(route.path),
    description: route.description ?? undefined,
  };
}

function breadcrumbSchema(route: RouteEntry): JsonLd {
  const trail = breadcrumbTrailFor(route);
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

const BUILDERS: Record<SchemaType, (route: RouteEntry) => JsonLd | JsonLd[]> = {
  WebSite: () => webSiteSchema(),
  Organization: () => organizationSchema(),
  WebPage: (r) => webPageSchema(r),
  CollectionPage: (r) => collectionPageSchema(r),
  Article: (r) => articleSchema(r),
  Recipe: (r) => recipeSchema(r),
  BreadcrumbList: (r) => breadcrumbSchema(r),
};

/** Build the JSON-LD array for a route exactly as its manifest schema list dictates. */
export function schemaForRoute(route: RouteEntry): JsonLd[] {
  const nodes: JsonLd[] = [];
  for (const type of route.schema) {
    const built = BUILDERS[type](route);
    nodes.push(...(Array.isArray(built) ? built : [built]));
  }
  return nodes.map((node) => ({ '@context': 'https://schema.org', ...node }));
}
