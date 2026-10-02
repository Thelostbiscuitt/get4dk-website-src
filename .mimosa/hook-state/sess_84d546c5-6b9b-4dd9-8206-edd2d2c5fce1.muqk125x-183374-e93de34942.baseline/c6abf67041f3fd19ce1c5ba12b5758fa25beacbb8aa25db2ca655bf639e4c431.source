import type { APIRoute } from 'astro';
import { getHostConfig } from '../lib/hosts';

/**
 * W5 robots policy — build-time generated per host environment.
 *
 *   production   → allow all crawlers, point at the canonical sitemap
 *   beta / local → Disallow: / (defense in depth: beta pages ALSO carry
 *                  noindex via PUBLIC_SITE_ENV, so both signals agree and a
 *                  beta deploy can never be accidentally indexed)
 */
export const GET: APIRoute = () => {
  const host = getHostConfig();
  const isProduction = host.env === 'production' && !host.noindex;
  const body = isProduction
    ? [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${host.canonicalOrigin}/sitemap-index.xml`,
        '',
      ].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
