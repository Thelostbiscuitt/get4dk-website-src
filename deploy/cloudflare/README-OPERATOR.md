# 4DK Website — Cloudflare deployment (operator runbook)

**Owner-approved architecture (final):**

```
                         CLOUDFLARE
                              |
             +----------------+----------------+
             |                |                |
       get4dk.com      app.get4dk.com   beta.get4dk.com
             |                |                |
   Workers Static Assets     Oracle VPS    protected candidate
       (Astro dist)          (Caddy → :8090 4DK PWA/API)

www.get4dk.com ── 308 ──> https://get4dk.com  (path + query preserved)
```

This run prepared everything below but **could not execute the Cloudflare
writes**: the available Cloudflare credential is read-only (DNS, Workers and
Pages writes all return auth errors; reads succeed). Per the W9-R3 stop
condition this document contains the exact operator steps.

---

## 0. Prerequisite (one time)

```bash
cd 4DK-Website
npx wrangler login          # OR: export CLOUDFLARE_API_TOKEN=<token with
                            # Workers Scripts:Edit + Zone DNS:Edit on get4dk.com>
```

Custom-domain attachment via Workers **creates the DNS records and
certificates automatically** — no manual DNS records are needed for
get4dk.com / www / beta.

## 1. Public website — get4dk.com → Workers Static Assets

```bash
cd deploy/cloudflare/site
npx wrangler deploy         # uploads dist-held assets + attaches get4dk.com
```

- `dist-held` is the **W9-R2 HOLD build**: production content, `noindex`
  meta on every page, `robots.txt` = `Disallow: /`, **no sitemap**, plus
  `_headers` → `X-Robots-Tag: noindex, nofollow`.
- After W9-R2 asset/rights closure is cleared by the owner:
  1. copy `deploy/cloudflare/_headers` OUT of the deploy set (do not ship
     noindex headers on the public build),
  2. in `site/wrangler.jsonc` change `assets.directory` to `"../../dist"`,
  3. `npx wrangler deploy` again.
- Static assets are cached at the edge by default; HTML changes propagate on
  redeploy.

## 2. www redirect

```bash
cd ../www
npx wrangler deploy
```

Worker returns `308` → `https://get4dk.com{path}{query}` — one hop from
HTTPS, path and query preserved.

## 3. Beta — protected candidate

```bash
cd ../beta
npx wrangler deploy
npx wrangler secret put BETA_PASS     # enter the beta password
```

- Serves the same held build behind HTTP Basic auth (user `4dk-beta`).
  Unauthenticated visitors and crawlers get `401` + `X-Robots-Tag: noindex`.
- The beta password generated during W9-R3 is stored on the Oracle VPS at
  `/root/get4dk-beta-credentials.txt` (reuse or replace).
- Optional hardening: put `beta.get4dk.com` behind **Cloudflare Access**
  (Zero Trust) instead of Basic auth — preferred per brief if available.

## 4. Application — app.get4dk.com → Oracle origin

The Oracle origin is **already configured and validated** (Caddy vhost added
and reloaded during W9-R3; the existing PWA block
`chef4me.habibcore.com → 127.0.0.1:8090` is untouched). One manual DNS
record is required (the credential here cannot write DNS):

| Hostname        | Type | Target          | Proxy            |
|-----------------|------|-----------------|------------------|
| app.get4dk.com  | A    | 150.136.136.170 | Proxied (orange) |

After DNS: Caddy (origin) obtains its certificate automatically (ACME via
the proxied record). Then verify:

```bash
curl -I https://app.get4dk.com/            # 200/302 from the PWA
curl -I https://app.get4dk.com/api/health  # or the app's real health route
```

**Cache separation (required):** create a Cloudflare Cache Rule —
`app.get4dk.com/*` → **Bypass cache**. Never apply static-site caching to
the application host (pantry, household, nutrition, profile, Ask,
subscription state are user-specific).

## 5. Cloudflare SSL/TLS

- Current zone mode: **Full** (min TLS 1.0).
- With Caddy issuing real Let's Encrypt certs on the origin, upgrade the
  zone to **Full (strict)** after app.get4dk.com is live.
- Recommended: raise min TLS to 1.2.

## 6. Standby: Oracle website vhosts (optional cleanup)

Under the earlier W9-R3 instruction the held build was also deployed to the
VPS and Caddy serves vhosts for get4dk.com / www / beta / app
(`/var/www/get4dk-site`, `/var/www/get4dk-beta`; config appended to
`/etc/caddy/Caddyfile`, backup at
`/etc/caddy/Caddyfile.bak-w9r3-20261002-055509`). Without DNS they are
unreachable. Once the Workers deployment is live, the website/beta blocks
can be removed from the Caddyfile — **keep the `app.get4dk.com` block**
(it is the Workers-free origin for the application per §4).

## 7. Vercel cleanup (revert of the interrupted Vercel path)

Vercel was provisioned before the architecture correction and must be
removed in the Vercel dashboard (the available API token cannot delete):

- Projects (delete): `get4dk-website`, `get4dk-website-beta`, `get4dk-site`,
  `get4dk-site-beta` → https://vercel.com/thelostroom/settings/projects
- The private GitHub repo `Thelostbiscuitt/get4dk-website-src` was created
  for that flow; it is marked **ORPHANED — safe to delete** (deletion needs
  the `delete_repo` scope: `gh auth refresh -h github.com -s delete_repo`
  then `gh repo delete Thelostbiscuitt/get4dk-website-src --yes`).

## 8. Post-deployment verification (run after steps 1–4)

```bash
# Public site (held state)
curl -s https://get4dk.com/ | grep -o 'noindex, nofollow' | head -1
curl -s https://get4dk.com/robots.txt                  # Disallow: /
curl -s -o /dev/null -w '%{http_code}\n' https://get4dk.com/sitemap-0.xml   # 404 expected during hold
curl -s -o /dev/null -w '%{http_code}\n' https://get4dk.com/features/pantry/
curl -s -o /dev/null -w '%{http_code}\n' https://get4dk.com/nonexistent-xyz/  # 404
# www
curl -sI https://www.get4dk.com/features/ | head -3    # 308 → get4dk.com/features/
# beta
curl -sI https://beta.get4dk.com/ | head -3            # 401
# app
curl -sI https://app.get4dk.com/ | head -3             # PWA response
# PWA regression (old host must still work)
curl -s -o /dev/null -w '%{http_code}\n' https://chef4me.habibcore.com/
```

Canonicals on every deployed page remain `https://get4dk.com/...` (build is
host-aware; verified in W5/W9-R1 gates).
