/**
 * Artifact port helper — converts an approved artifact HTML file into the
 * three renderable parts of a production page (css / body / scripts) with
 * the minimal, documented mechanical transforms:
 *
 *   1. head is discarded (Base layout owns metadata via the W0 manifest)
 *   2. `assets/…` references are rewritten to the page's public asset dir
 *   3. prototype page links (index.html, features.html, …) become routes
 *   4. CTA hrefs are routed through the central CTA config (lib/cta.ts)
 *   5. review-only machinery is stripped when a page opts in:
 *      master single-file navigation bridge, debug reference overlay
 *
 * REFERENCE RULE: everything else — copy, hierarchy, typography, layout,
 * asset placement, acid usage, banners, annotations, spacing, mobile and
 * desktop composition, interactions — passes through verbatim.
 */

export interface PortOptions {
  /** Public URL prefix the artifact's `assets/…` refs are rewritten to. */
  assetPrefix: string;
  /** Prototype filename href → production route. Also applied inside scripts. */
  linkRewrites?: Record<string, string>;
  /** Literal href → central CTA href (e.g. approved mailto → CTA.betaAccess). */
  ctaHrefs?: Record<string, string>;
  /**
   * Exact substring replacements applied to the body before linkRewrites —
   * used to wire approved dead-stub links (e.g. `<a href="#">Pricing</a>`)
   * to the production routes their labels name. Each entry must be unique
   * in the artifact; page files keep them explicit and reviewable.
   */
  rawReplaces?: Array<[string, string]>;
  /**
   * W4 production-asset canonicalization: pool filename → canonical
   * production URL (e.g. `pantry.png` → `/assets/app-screens/4dk-pantry.webp`).
   * Replaces the prefixed reference (`${assetPrefix}/${name}`) in body,
   * scripts and css — so `<img src>`, runtime JS swaps and CSS backgrounds
   * all resolve to the one canonical asset. Shares one constant across pages
   * (lib/artifact-links.ts CANONICAL_ASSETS) so every page shows the same map.
   */
  canonicalAssets?: Record<string, string>;
  /** Regexes removed from the body (review-only elements). */
  removePatterns?: RegExp[];
  /** Regexes removed from the css (rules orphaned by removePatterns). */
  removeCssPatterns?: RegExp[];
  /**
   * W9-R1: CSS appended after the artifact's own rules — used only by the
   * logo-only headers whose approved composition gains the locked primary
   * navigation (feature-pages.ts LOGO_ONLY_NAV_CSS). Scoped, additive.
   */
  appendCss?: string;
}

export interface Ported {
  css: string;
  body: string;
  scripts: string[];
  /**
   * Approved JSON-LD shipped in the artifact's <head>, extracted verbatim
   * (null when the artifact has none). Pages surface it through Base so the
   * approved structured data — e.g. complete Recipe/Article nodes authored
   * with the page — is emitted instead of a thin seam node. Never fabricated,
   * never restructured: byte-for-byte what the artifact declared.
   */
  headJsonLd: string | null;
}

/** Master single-file review bridge — never meaningful outside the iframe master. */
const MASTER_BRIDGE_MARKER = 'ROUTE_MAP';

/** Intrinsic dimensions of the canonical production media set (build-generated). */
import mediaDims from '../data/media-dims.json';

/**
 * Add loading/decoding to <img> tags. First image in the body stays eager
 * with high fetch priority; every later image lazy-loads. Tags already
 * carrying an attribute are left untouched.
 *
 * W8 repair: width/height attributes are deliberately NOT injected. Artifact
 * CSS frequently constrains only one axis (e.g. `.card img { width:100% }`),
 * so an injected attribute overrides the browser's ratio-derived height and
 * materially changes layout (caught by the W8 canonical regression: food
 * cards rendered 430px tall instead of the approved 122px). Intrinsic
 * dimensions remain documented in media-dims.json.
 */
function injectMediaAttrs(body: string): string {
  let index = 0;
  return body.replace(/<img\b[^>]*>/gi, (tag) => {
    const i = index++;
    let out = tag;
    if (!/\bdecoding="/i.test(out)) out = out.replace(/<img/i, `<img decoding="async"`);
    if (!/\bloading="/i.test(out)) {
      out = i === 0
        ? out.replace(/<img/i, `<img loading="eager" fetchpriority="high"`)
        : out.replace(/<img/i, `<img loading="lazy"`);
    }
    void mediaDims;
    return out;
  });
}

export function portArtifact(rawHtml: string, options: PortOptions): Ported {
  const styleMatch = rawHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = styleMatch ? styleMatch[1] : '';

  // Approved structured data from the discarded head, kept verbatim.
  const head = rawHtml.slice(0, rawHtml.indexOf('</head>') + 1);
  const ldMatch = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);

  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    throw new Error('[port] Artifact has no <body>.');
  }
  let body = bodyMatch[1];

  // Extract scripts from the body, then strip them from the body markup.
  const scripts: string[] = [];
  body = body.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_m, js: string) => {
    if (js.includes(MASTER_BRIDGE_MARKER)) return ''; // review bridge, dropped
    scripts.push(js);
    return '';
  });

  // Remove review-only elements (e.g. debug reference overlay images).
  for (const pattern of options.removePatterns ?? []) {
    body = body.replace(pattern, '');
  }

  // Strip the R-key debug overlay toggle from keyboard handlers.
  for (let i = 0; i < scripts.length; i++) {
    scripts[i] = scripts[i].replace(
      /if\(e\.key\.toLowerCase\(\)==='r'\)document\.body\.classList\.toggle\('show-ref'\);?\s*/g,
      ''
    );
  }

  // Asset path rewrite — HTML attributes and JS string literals alike
  // (artifact scripts construct asset URLs at runtime, e.g. feature detail media).
  body = body.replaceAll('src="assets/', `src="${options.assetPrefix}/`);
  for (let i = 0; i < scripts.length; i++) {
    scripts[i] = scripts[i].replaceAll('assets/', `${options.assetPrefix}/`);
  }
  // CSS may reference assets too.
  let cssRewritten = css.replaceAll('assets/', `${options.assetPrefix}/`);
  for (const pattern of options.removeCssPatterns ?? []) {
    cssRewritten = cssRewritten.replace(pattern, '');
  }
  if (options.appendCss) {
    cssRewritten += `\n${options.appendCss}`;
  }

  // W4 canonical production assets (runs after prefixing so one map covers
  // <img> markup, runtime JS swaps and CSS url()s alike).
  if (options.canonicalAssets) {
    for (const [name, canonical] of Object.entries(options.canonicalAssets)) {
      const prefixed = `${options.assetPrefix}/${name}`;
      body = body.replaceAll(prefixed, canonical);
      for (let i = 0; i < scripts.length; i++) {
        scripts[i] = scripts[i].replaceAll(prefixed, canonical);
      }
      cssRewritten = cssRewritten.replaceAll(prefixed, canonical);
    }
  }

  // W4 media attributes: intrinsic dimensions, async decode, lazy loading
  // below the fold. The first image stays eager (critical hero); nothing
  // layout-affecting changes — composition CSS keeps control.
  body = injectMediaAttrs(body);

  // W7 landmark repair: one <main> landmark per page + a skip link as the
  // first tab stop. Render-neutral (artifacts style by class, never by bare
  // element name — verified). Pages that already ship <main> (C1 hub, W1
  // shell routes) keep it — the skip link targets its existing id.
  const existingMain = body.match(/<main[^>]*\bid="([^"]+)"/i);
  if (existingMain) {
    body = `<a class="w7-skip" href="#${existingMain[1]}">Skip to content</a>${body}`;
  } else if (/<main[\s>]/i.test(body)) {
    body = body.replace(/<main\b/i, '<main id="main-content"');
    body = `<a class="w7-skip" href="#main-content">Skip to content</a>${body}`;
  } else {
    body = `<a class="w7-skip" href="#main-content">Skip to content</a><main id="main-content">${body}</main>`;
  }

  // Approved dead-stub wiring (runs before linkRewrites so nav strings that
  // still contain prototype hrefs are consumed here first).
  for (const [from, to] of options.rawReplaces ?? []) {
    body = body.replaceAll(from, to);
  }

  // Prototype filename → production route (body attributes and script string
  // literals alike — e.g. the C1 hub's routes object holds .html hrefs).
  for (const [from, to] of Object.entries(options.linkRewrites ?? {})) {
    body = body.replaceAll(`href="${from}"`, `href="${to}"`);
    for (let i = 0; i < scripts.length; i++) {
      scripts[i] = scripts[i].replaceAll(`'${from}'`, `'${to}'`);
      scripts[i] = scripts[i].replaceAll(`"${from}"`, `"${to}"`);
    }
  }

  // Central CTA destinations.
  for (const [from, to] of Object.entries(options.ctaHrefs ?? {})) {
    body = body.replaceAll(`href="${from}"`, `href="${to}"`);
  }

  // W6 cross-domain safety: every external https anchor carries
  // rel="noopener" (links keep their approved same-tab behaviour; the
  // attribute is a no-op for same-tab links but hardens any future
  // target=_blank and satisfies the external-link audit).
  body = body.replace(/<a\b([^>]*\bhref="https:\/\/[^"]*"[^>]*)>/gi, (tag, attrs: string) => {
    if (/\brel="/i.test(attrs)) return tag;
    return `<a${attrs} rel="noopener">`;
  });

  return { css: cssRewritten, body, scripts, headJsonLd: ldMatch ? ldMatch[1].trim() : null };
}
