/**
 * Typed access to the central route manifest.
 *
 * The JSON file is the single source of truth (mirrors the locked Stage14
 * ROUTE_MANIFEST.json / W0 APPROVED_ROUTE_MATRIX.md). Page files reference
 * routes by key; nothing hardcodes URLs outside this module and the nav data.
 */
import rawManifest from '../data/route-manifest.json';

export type SchemaType =
  | 'WebSite'
  | 'Organization'
  | 'WebPage'
  | 'CollectionPage'
  | 'Article'
  | 'Recipe'
  | 'BreadcrumbList';

export type RouteFamily =
  | 'CORE'
  | 'PRODUCT'
  | 'CONVERSION'
  | 'PRICING'
  | 'CONTENT'
  | 'CULTURAL'
  | 'FOOD INTELLIGENCE'
  | 'RECIPE'
  | 'SOCIAL'
  | 'ATLAS';

export interface RouteEntry {
  key: string;
  path: string;
  name: string;
  stage: number;
  family: RouteFamily;
  manifest_section: string;
  title: string;
  description: string | null;
  description_note?: string;
  schema: SchemaType[];
  indexable: boolean;
  nav_label?: string | null;
  nav_slot?: string | null;
}

export interface PrimaryNavItem {
  label: string;
  href: string;
}

interface Manifest {
  canonical_origin_default: string;
  routes: RouteEntry[];
  reserved_future: string[];
  primary_nav: PrimaryNavItem[];
  footer_columns: Record<string, string[]>;
}

const manifest = rawManifest as unknown as Manifest;

export const routes: readonly RouteEntry[] = manifest.routes;
export const primaryNav: readonly PrimaryNavItem[] = manifest.primary_nav;
export const footerColumns: Readonly<Record<string, string[]>> = manifest.footer_columns;
export const reservedFutureRoutes: readonly string[] = manifest.reserved_future;

export function getRoute(key: string): RouteEntry {
  const route = routes.find((r) => r.key === key);
  if (!route) {
    throw new Error(`[routes] Unknown route key: ${key}`);
  }
  return route;
}

export function getRouteByPath(path: string): RouteEntry | undefined {
  return routes.find((r) => r.path === path);
}

/** Breadcrumb trail derived from the path: Home > Segment labels. */
export function breadcrumbTrailFor(route: RouteEntry): { name: string; path: string }[] {
  const trail: { name: string; path: string }[] = [
    { name: 'Home', path: '/' },
  ];
  const segments = route.path.split('/').filter(Boolean);
  let acc = '';
  for (const segment of segments.slice(0, -1)) {
    acc += `/${segment}/`;
    const parent = getRouteByPath(acc);
    trail.push({ name: parent?.name ?? segment.replace(/-/g, ' '), path: acc });
  }
  trail.push({ name: route.name, path: route.path });
  // A parent equal to the leaf (hub pages) collapses to a single entry.
  return trail;
}

/** Every internal href the shell is allowed to emit. */
export function allShellHrefs(): string[] {
  const hrefs = new Set<string>(['/']);
  for (const item of primaryNav) hrefs.add(item.href);
  for (const links of Object.values(footerColumns)) {
    for (const href of links) hrefs.add(href);
  }
  return [...hrefs];
}
