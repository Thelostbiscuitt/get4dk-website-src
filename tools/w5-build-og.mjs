/**
 * W5 OG/social image build — 1200×630 JPG social cards composed ONLY from
 * approved inputs: the identity wordmark (self-contained vector paths, no
 * font files) and the approved editorial photography at native scale
 * (photos are placed as panels, never upscaled to fill).
 *
 * Output: public/assets/og/og-<slug>.jpg (q88) + .w5/og-report.json
 * Deterministic; re-run regenerates identical set.
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync, statSync, readFileSync, readdirSync } from 'node:fs';

const W = 1200, H = 630;
const INK = { r: 5, g: 5, b: 5 };
const CREAM = '#f4f1e8';
const ACID = '#d9ff16';
const OUT = 'public/assets/og';
mkdirSync(OUT, { recursive: true });
mkdirSync('.w5', { recursive: true });

// 4DK_primary_dark = ink tile + cream mark; on the ink canvas the tile is
// invisible and the approved cream mark reads seamlessly (same treatment as
// the app's own dark surfaces).
const wordmark = readFileSync('public/assets/identity/4DK_primary_dark.svg');

// 1200-wide wordmark raster (intrinsic 1200×360 viewBox) — scaled at composite time.
const wordmarkPng = await sharp(wordmark, { density: 96 }).resize({ width: 240 }).png().toBuffer();

/** Acid rule block (bottom identity bar). */
function acidBar() {
  return {
    input: Buffer.from(
      `<svg width="${W}" height="10"><rect width="${W}" height="10" fill="${ACID}"/></svg>`
    ),
    top: H - 10, left: 0,
  };
}

/** Wordmark placed top-left with its acid period already part of the mark. */
function brandMark(top = 48, left = 56) {
  return { input: wordmarkPng, top, left };
}

/** Cover-crop a photo into a panel WITHOUT upscaling: panel is sized to the
 *  largest area of the target aspect that fits inside the source. */
async function panel(src, maxW, maxH, left, top) {
  const meta = await sharp(src).metadata();
  const ar = W / H; // target aspect for the crop window
  let w = Math.min(maxW, meta.width);
  let h = Math.round(w / ar);
  if (h > Math.min(maxH, meta.height)) {
    h = Math.min(maxH, meta.height);
    w = Math.round(h * ar);
  }
  return sharp(src).extract({ left: 0, top: Math.floor((meta.height - h) / 2), width: w, height: h }).toBuffer();
}

const PHOTO = (n) => `public/assets/photo/${n}`;

/** Photo card: ink canvas, photo panel right at native scale, scrim rule, brand, acid bar. */
async function photoCard(slug, photoName) {
  const src = PHOTO(photoName);
  const meta = await sharp(src).metadata();
  const maxPW = 560, maxPH = H - 96;
  const buf = await panel(src, maxPW, maxPH, 0, 0);
  const pm = await sharp(buf).metadata();
  const left = W - pm.width - 56;
  const top = Math.floor((H - pm.height) / 2);
  const layers = [
    { input: Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="rgb(${INK.r},${INK.g},${INK.b})"/></svg>`), top: 0, left: 0 },
    { input: buf, top, left },
    // hairline acid rule left of the photo panel
    { input: Buffer.from(`<svg width="4" height="${pm.height}"><rect width="4" height="${pm.height}" fill="${ACID}"/></svg>`), top, left: left - 20 },
    brandMark(48, 56),
    acidBar(),
  ];
  await sharp({ create: { width: W, height: H, channels: 3, background: INK } })
    .composite(layers).jpeg({ quality: 88 }).toFile(`${OUT}/og-${slug}.jpg`);
  console.log(`og-${slug}.jpg  photo:${photoName} panel ${pm.width}×${pm.height} @${left},${top}`);
}

/** Typographic card: ink canvas, centered brand mark, acid geometry. No text (no fonts shipped). */
async function typeCard(slug) {
  const mark = await sharp(wordmark, { density: 96 }).resize({ width: 420 }).png().toBuffer();
  const layers = [
    { input: Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="rgb(${INK.r},${INK.g},${INK.b})"/><rect x="56" y="${H - 130}" width="120" height="8" fill="${ACID}"/><rect x="56" y="${H - 112}" width="64" height="8" fill="${ACID}"/></svg>`), top: 0, left: 0 },
    { input: mark, top: Math.floor(H / 2) - 70, left: 56 },
    acidBar(),
  ];
  await sharp({ create: { width: W, height: H, channels: 3, background: INK } })
    .composite(layers).jpeg({ quality: 88 }).toFile(`${OUT}/og-${slug}.jpg`);
  console.log(`og-${slug}.jpg  typographic`);
}

// ── Route assignments (approved photography only; typographic otherwise) ──
const PHOTO_ROUTES = {
  home: 'food-jollof-clean.webp', // approved homepage-adjacent editorial
  'how-it-works': 'food-jollof-clean.webp',
  'the-pass': 'food-card-jollof.webp',
  'c1-dinner': 'food-card-tacos.webp',
  'c1-freshness': 'food-jollof-clean.webp',
  'c1-scan': 'food-card-pasta.webp',
  'c1-steal': 'food-card-tacos.webp',
  'content-cook-with-what-you-have': 'food-jollof-wide.webp',
  'content-freshness-rescue': 'food-plan-grid.webp',
  'evergreen-jollof-storage': 'food-jollof-wide.webp',
  'c2-nigeria-jollof': 'food-jollof-clean.webp',
  'recipe-one-pot-jollof-chicken-rice': 'food-jollof-poster.webp',
  'recipe-pasta': 'food-card-pasta.webp',
  'versus-plantain': 'food-meal-strip.webp',
};
const TYPE_ROUTES = [
  'default', // product-detail shells (W1) until their pages port
  'features', 'food-atlas', 'pricing', 'c1-hub',
  'content-meal-planning', 'content-household-shopping',
  'content-local-substitution', 'content-technique-intelligence',
];

for (const [slug, photo] of Object.entries(PHOTO_ROUTES)) await photoCard(slug, photo);
for (const slug of TYPE_ROUTES) await typeCard(slug);

const files = readdirSync(OUT).filter((f) => f.endsWith('.jpg'));
const report = files.map((f) => ({ file: f, bytes: statSync(`${OUT}/${f}`).size }));
writeFileSync('.w5/og-report.json', JSON.stringify(report, null, 2));
const total = report.reduce((s, r) => s + r.bytes, 0);
console.log(`\nOG set: ${report.length} images, ${(total / 1048576).toFixed(2)} MB`);
