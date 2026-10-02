// W9-R3 — beta.get4dk.com: access-gated website candidate.
// Held build assets (noindex meta + Disallow-all robots) behind HTTP Basic
// auth. Browsers get 401 + WWW-Authenticate; crawlers get 401 + noindex.
// Set the secret after deploy:  npx wrangler secret put BETA_PASS
export default {
  async fetch(request, env) {
    const expected = 'Basic ' + btoa('4dk-beta:' + (env.BETA_PASS ?? ''));
    const auth = request.headers.get('Authorization') ?? '';
    if (!env.BETA_PASS || auth !== expected) {
      return new Response('Authentication required.', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="4DK beta", charset="UTF-8"',
          'X-Robots-Tag': 'noindex, nofollow',
          'Cache-Control': 'no-store',
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
