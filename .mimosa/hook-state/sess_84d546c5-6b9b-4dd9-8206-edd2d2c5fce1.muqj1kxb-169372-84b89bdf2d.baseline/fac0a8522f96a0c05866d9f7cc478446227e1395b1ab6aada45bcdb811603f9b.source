/**
 * Host-aware configuration for the 4DK website.
 *
 * Locked host model (W0 / Stage14 PRODUCTION_INTEGRATION.md):
 *   get4dk.com       → canonical public website
 *   www.get4dk.com   → permanent 301 → https://get4dk.com (edge/CDN concern, not app code)
 *   beta.get4dk.com  → test build; MUST be noindex or access-gated
 *   app.get4dk.com   → 4DK application host; never a marketing page
 *
 * Nothing in components may hardcode a development host. All absolute URLs are
 * derived from PUBLIC_CANONICAL_ORIGIN at build time.
 */

export type SiteEnvName = 'production' | 'beta' | 'local';

const DEFAULT_CANONICAL_ORIGIN = 'https://get4dk.com';

/** Allowed schemes for any origin this project produces or consumes. */
const ALLOWED_SCHEME = /^https?:\/\//i;

export interface HostConfig {
  /** Canonical origin, always http(s), no trailing slash. */
  canonicalOrigin: string;
  /** Deployment surface this build targets. */
  env: SiteEnvName;
  /** True when the build must carry noindex (beta/test surfaces). */
  noindex: boolean;
}

function normalizeOrigin(raw: string | undefined, fallback: string): string {
  const value = (raw && raw.trim()) || fallback;
  if (!ALLOWED_SCHEME.test(value)) {
    throw new Error(
      `[hosts] Canonical origin must be http(s): ${JSON.stringify(value)}`
    );
  }
  return value.replace(/\/+$/, '');
}

export function getHostConfig(): HostConfig {
  const env = (import.meta.env.PUBLIC_SITE_ENV as SiteEnvName | undefined) ?? inferEnv();
  const canonicalOrigin = normalizeOrigin(
    import.meta.env.PUBLIC_CANONICAL_ORIGIN as string | undefined,
    DEFAULT_CANONICAL_ORIGIN
  );
  const noindex = env !== 'production' || import.meta.env.PUBLIC_FORCE_NOINDEX === 'true';
  return { canonicalOrigin, env, noindex };
}

function inferEnv(): SiteEnvName {
  const mode = import.meta.env.MODE ?? 'production'; // astro build → 'production'
  return mode === 'development' ? 'local' : 'production';
}

/** Absolute canonical URL for a site path. Path must be root-relative. */
export function absoluteUrl(path: string, origin = getHostConfig().canonicalOrigin): string {
  if (ALLOWED_SCHEME.test(path)) {
    // Already absolute; verify scheme and return as-is.
    if (!ALLOWED_SCHEME.test(path)) {
      throw new Error(`[hosts] Non-http(s) absolute URL rejected: ${path}`);
    }
    return path;
  }
  if (!path.startsWith('/')) {
    throw new Error(`[hosts] Path must be root-relative, got: ${path}`);
  }
  return `${origin}${path === '/' ? '/' : path}`;
}

/** Host roles — documentation seam; kept next to the logic that enforces them. */
export const HOST_ROLES = {
  apex: { host: 'get4dk.com', role: 'canonical public website' },
  www: { host: 'www.get4dk.com', role: 'permanent 301 → apex (edge redirect, not app code)' },
  beta: { host: 'beta.get4dk.com', role: 'test build — noindex or access-gated' },
  app: { host: 'app.get4dk.com', role: '4DK application host — never a marketing page' },
} as const;

/** Routes that are reserved for the future and must never be published by this site. */
export const RESERVED_FUTURE_ROUTES = ['/chefs/', '/market/', '/schools/', '/app/'] as const;
