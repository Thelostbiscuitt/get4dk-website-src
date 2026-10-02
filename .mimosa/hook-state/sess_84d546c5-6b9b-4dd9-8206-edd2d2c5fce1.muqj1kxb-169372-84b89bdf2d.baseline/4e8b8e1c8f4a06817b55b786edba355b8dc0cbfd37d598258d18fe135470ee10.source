/**
 * W9-R1 feature-page explode — turns the approved Features Hub artifact into
 * the eight standalone PRODUCT routes.
 *
 * Approved source rule (W0 §PRODUCT): all eight routes share the Features Hub
 * v3 detail states as their canonical visual reference. Each page renders the
 * exact hub composition with one feature's detail state baked in at build
 * time — same header, hero, sticky feature list (as crawlable <a> links),
 * detail panel, system note and closing banner. No invented design.
 *
 * The feature copy in src/data/feature-pages.json is extracted verbatim from
 * the hub artifact's own `features` object (approved copy; single source).
 */
import featureData from '../data/feature-pages.json';

export interface FeaturePage {
  key: string;
  route: string;
  img: string;
  kick: string;
  title: string;
  body: string;
  points: string[];
  note: string;
  index: number;
}

export const FEATURE_PAGES: FeaturePage[] = featureData;

export function getFeaturePage(key: string): FeaturePage {
  const f = FEATURE_PAGES.find((p) => p.key === key);
  if (!f) throw new Error(`[feature-pages] unknown feature key: ${key}`);
  return f;
}

/**
 * The locked primary navigation (Stage14 GLOBAL_NAV / route manifest).
 * Every public page presents these five destinations.
 */
export const LOCKED_NAV_ITEMS: { label: string; href: string }[] = [
  { label: 'How It Works', href: '/how-it-works/' },
  { label: 'Features', href: '/features/' },
  { label: 'The Pass', href: '/the-pass/' },
  { label: 'Food Atlas', href: '/food-atlas/' },
  { label: 'Pricing', href: '/pricing/' },
];

function lockedNavHtml(selfHref?: string): string {
  return (
    '<nav class="nav">' +
    LOCKED_NAV_ITEMS.map(
      (n) => `<a href="${n.href}"${n.href === selfHref ? ' class="active"' : ''}>${n.label}</a>`
    ).join('') +
    '</nav>'
  );
}

/** Escape a literal string for safe use inside a JS String.replace replacer. */
function escapeReplace(s: string): string {
  return s.replace(/\$/g, '$$$$');
}

/**
 * Transform the hub artifact HTML into the standalone page for `key`.
 * Runs BEFORE portArtifact (so asset paths are still artifact-relative and
 * port.ts applies its canonical-asset/lazy-loading layers afterwards).
 */
export function explodeFeatureHtml(raw: string, key: string): string {
  const f = getFeaturePage(key);
  let html = raw;

  // 1. Feature list: <button class="feature-button" data-feature="…"> →
  //    crawlable <a> to the feature's route, active state on this page's own
  //    feature. Class/styling untouched — anchors inherit .feature-button CSS.
  html = html.replace(
    /<button class="feature-button( active)?" data-feature="(\w+)">([\s\S]*?)<\/button>/g,
    (_m, _active, featureKey, inner) =>
      `<a class="feature-button${featureKey === key ? ' active' : ''}" data-feature="${featureKey}" href="/features/${featureKey === 'steal' ? 'steal-it' : featureKey}/">${inner}</a>`
  );

  // 2. Detail panel: bake this feature's approved state as static HTML
  //    (the exact markup the hub's showFeature() would render).
  html = html.replace(
    /<img id="detail-image" src="[^"]*" alt="[^"]*">/,
    `<img id="detail-image" src="${f.img}" alt="${key} screen">`
  );
  html = html.replace(
    /(<div class="detail-kicker" id="detail-kicker">)[^<]*(<\/div>)/,
    `$1${escapeReplace(f.kick)}$2`
  );
  html = html.replace(
    /<h3 id="detail-title">[\s\S]*?<\/h3>/,
    `<h3 id="detail-title">${escapeReplace(f.title)}</h3>`
  );
  html = html.replace(
    /(<p id="detail-body">)[\s\S]*?(<\/p>)/,
    `$1${escapeReplace(f.body)}$2`
  );
  html = html.replace(
    /<div class="detail-points" id="detail-points"><\/div>/,
    `<div class="detail-points" id="detail-points">${f.points
      .map((x, i) => `<div class="detail-point"><b>0${i + 1}</b><span>${escapeReplace(x)}</span></div>`)
      .join('')}</div>`
  );
  // detail-route: the approved placeholder stub ("Future route … →") becomes
  // the feature route's primary CTA (W0: "Start cooking →"). The href uses the
  // marketing literal the page's ctaHrefs maps through the central CTA config.
  html = html.replace(
    /<a class="detail-route" id="detail-route" href="#feature-detail">[^<]*<\/a>/,
    '<a class="detail-route" id="detail-route" href="https://get4dk.com/">Start cooking →</a>'
  );
  html = html.replace(
    /(<div class="detail-annotation" id="detail-annotation">)[^<]*(<\/div>)/,
    `$1${escapeReplace(f.note)}$2`
  );

  // 3. Runtime: the hub's click-swap machinery must not run on a standalone
  //    page (it would overwrite the baked state and intercept list clicks —
  //    navigation must stay crawlable). The closing-banner observer stays.
  html = html.replace(
    /const buttons=\[[\s\S]*?showFeature\('pantry'\);/,
    ''
  );

  // 4. Locked primary navigation (hub nav: How it works / Features(#tools) /
  //    The Pass / Pricing — missing Food Atlas; Features self-anchor → route).
  html = html.replace(
    '<nav class="nav"><a href="/how-it-works/">How it works</a><a href="#tools">Features</a><a href="/the-pass/">The Pass</a><a href="/pricing/">Pricing</a></nav>',
    lockedNavHtml('/features/')
  );

  return html;
}

/**
 * Nav adaptation map for the other approved artifacts (W9-R1 §6/§7): each
 * entry replaces the page's exact original <nav> element with the locked
 * five-destination system, preserving the page's own nav element/classes.
 * Keyed by artifact filename (applied via port rawReplaces by the page files).
 */
export const NAV_ORIGINALS: Record<string, string> = {
  'features.html':
    '<nav class="nav"><a href="/how-it-works/">How it works</a><a href="#tools">Features</a><a href="/the-pass/">The Pass</a><a href="/pricing/">Pricing</a></nav>',
  'landing.html':
    '<nav class="nav"><a href="#pantry">Pantry</a><a href="#ask">Ask</a><a href="#plan">Plan</a><a href="#shop">Shop</a><a href="#recipes">Recipes</a></nav>',
  'how-it-works.html':
    '<nav class="nav"><a href="#see">Pantry</a><a href="#decide">Ask</a><a href="#cook">Cook</a><a href="#remember">Memory</a><a href="#loop">The loop</a></nav>',
  'the-pass.html':
    '<nav class="nav"><a href="how-it-works.html">How it works</a><a href="features.html">Features</a><a class="active" href="the-pass.html">The Pass</a><a href="#">Pricing</a></nav>',
  'pricing.html':
    '<nav class="nav"><a href="#plans">Plans</a><a href="#house">House</a><a href="#beta">Beta</a><a href="#questions">Questions</a></nav>',
  'c1.html':
    '<nav class="nav"><a href="how-it-works.html">How it works</a><a href="features.html">Features</a><a href="the-pass.html">The Pass</a><a href="index.html#c1">Use cases</a></nav>',
  'content.html':
    '<nav class="nav"><a href="index.html">Program</a><a href="#">How it works</a><a href="#">Features</a><a href="#">The Pass</a></nav>',
  'c2.html':
    '<nav class="nav"><a href="#">How it works</a><a href="#">Features</a><a href="#">The Pass</a><a href="#">Food intelligence</a></nav>',
};

/**
 * rawReplaces entry adapting an artifact's original nav to the locked five.
 * `self` marks the page's own destination with the artifact's own active
 * convention (the-pass.html used class="active").
 */
export function lockedNavReplace(artifactFilename: string, selfHref?: string): [string, string] {
  const original = NAV_ORIGINALS[artifactFilename];
  if (!original) throw new Error(`[feature-pages] no nav original for ${artifactFilename}`);
  return [original, lockedNavHtml(selfHref)];
}

/**
 * Minimal nav CSS for the four logo-only headers (food-atlas / evergreen /
 * recipe-pasta / versus): uses each page's own mono/uppercase system, pushes
 * links right of the brand, and hides below 900px exactly like the approved
 * compositions that omit nav on small viewports (no 360px overflow).
 */
export const LOGO_ONLY_NAV_CSS =
  `.top .nav{margin-left:auto;display:flex;gap:18px;align-items:center}` +
  `.top .nav a{color:#bdbab3;font:700 9px/1 var(--mono,monospace);letter-spacing:.11em;text-transform:uppercase;text-decoration:none}` +
  `.top .nav a:hover{color:#f4f1e8}` +
  `.top .nav a.active{color:#d9ff16}` +
  `@media(max-width:900px){.top .nav{display:none}}`;

/**
 * W9-R1 §6: the four logo-only headers (food-atlas / evergreen / recipe /
 * versus) carry no nav in their approved composition — the locked five
 * destinations are inserted right after the brand mark, styled by the page's
 * own mono system (LOGO_ONLY_NAV_CSS), hidden below 900px like every approved
 * small-viewport header treatment.
 */
export function insertNavAfterBrand(raw: string, selfHref?: string): string {
  const nav = lockedNavHtml(selfHref);
  return raw.replace(
    /(<header class="top">\s*<a href="[^"]*">[\s\S]*?<\/a>)/,
    `$1${nav}`
  );
}

/** c1-hub variant: insert after the grid-logo block in .grid-header. */
export function insertNavAfterGridLogo(raw: string, selfHref?: string): string {
  const nav = lockedNavHtml(selfHref);
  return raw.replace(
    /(<div class="grid-logo">[\s\S]*?<\/div>)/,
    `$1${nav}`
  );
}
