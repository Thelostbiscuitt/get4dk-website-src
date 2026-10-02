/**
 * W4 asset build — produces the canonical production asset set from the
 * approved artifact imagery and the current-4DK app captures.
 *
 *   public/assets/app-screens/  8 current-UI screens (webp q90, 940×1672)
 *   public/assets/photo/        approved editorial photography (webp q88, same pixels)
 *   public/assets/banner/       locked acid banner + marginal notes (webp q92, same pixels)
 *   public/assets/icons/        icon1–5 (png, canonical copies)
 *
 * No upscaling anywhere: every output has exactly the intrinsic pixels of its
 * source. Writes .w4/media-dims.json for the port-time attribute injection.
 */
import sharp from 'sharp';
import { mkdirSync, copyFileSync, writeFileSync, statSync } from 'node:fs';

const PUB = 'public/assets';
const POOL = (pool, name) => `${PUB}/pages/${pool}/${name}`;
const CAP = (name) => `/tmp/4dk-w4/captures/${name}.png`;

const jobs = [];
const dims = {};
const out = (dir) => mkdirSync(`${PUB}/${dir}`, { recursive: true });

async function toWebp(src, dest, quality, label) {
  const img = sharp(src);
  const meta = await img.metadata();
  await img.webp({ quality, effort: 6 }).toFile(`${PUB}/${dest}`);
  dims[`/assets/${dest}`] = { w: meta.width, h: meta.height, from: label, bytes: statSync(`${PUB}/${dest}`).size };
  console.log(`${dest.padEnd(46)} ${meta.width}×${meta.height}  ${(statSync(`${PUB}/${dest}`).size / 1024).toFixed(0)}K`);
}

out('app-screens'); out('photo'); out('banner'); out('icons');

// ── App screens: current 4DK UI (registered user, seeded pantry, real flows) ─
const SCREENS = [
  ['home', 'home'], ['pantry', 'pantry'], ['ask', 'ask'], ['plan', 'plan'],
  ['recipe', 'recipe'], ['shop', 'shop'], ['tools', 'tools'], ['profile', 'profile'],
];
for (const [cap, name] of SCREENS) {
  jobs.push(toWebp(CAP(cap), `app-screens/4dk-${name}.webp`, 90, `app capture ${cap}`));
}

// ── Editorial photography: approved pixels, format-optimized ────────────────
const PHOTOS = [
  [POOL('c1', 'hero_food_clean.png'), 'photo/hero-food.webp', 90],
  [POOL('how-it-works', 'food-card-jollof.jpg'), 'photo/food-card-jollof.webp', 88],
  [POOL('c1', 'food-card-pasta.jpg'), 'photo/food-card-pasta.webp', 88],
  [POOL('c1', 'food-card-tacos.jpg'), 'photo/food-card-tacos.webp', 88],
  [POOL('c1', 'food-jollof-clean.jpg'), 'photo/food-jollof-clean.webp', 88],
  [POOL('c2', 'food-jollof-poster.jpg'), 'photo/food-jollof-poster.webp', 88],
  [POOL('c1', 'food-jollof-wide.jpg'), 'photo/food-jollof-wide.webp', 88],
  [POOL('c2', 'food-meal-strip.jpg'), 'photo/food-meal-strip.webp', 88],
  [POOL('c1', 'food-plan-grid.jpg'), 'photo/food-plan-grid.webp', 88],
];
for (const [src, dest, q] of PHOTOS) jobs.push(toWebp(src, dest, q, 'approved artifact pixels'));

// ── Banners: locked literal banner assets, format-optimized only ────────────
const BANNERS = [
  [POOL('c1', 'footer_left.png'), 'banner/footer-left.webp'],
  [POOL('c1', 'footer_right.png'), 'banner/footer-right.webp'],
  [POOL('landing', 'note_left.png'), 'banner/note-left.webp'],
  [POOL('landing', 'rail_right.png'), 'banner/rail-right.webp'],
];
for (const [src, dest] of BANNERS) jobs.push(toWebp(src, dest, 92, 'locked banner pixels'));

// ── Icons: tiny pngs, canonical copies ──────────────────────────────────────
for (const n of [1, 2, 3, 4, 5]) {
  copyFileSync(POOL('landing', `icon${n}.png`), `${PUB}/icons/icon${n}.png`);
  const meta = await sharp(`${PUB}/icons/icon${n}.png`).metadata();
  dims[`/assets/icons/icon${n}.png`] = { w: meta.width, h: meta.height, from: 'landing pool', bytes: statSync(`${PUB}/icons/icon${n}.png`).size };
}

await Promise.all(jobs);
writeFileSync('.w4/media-dims.json', JSON.stringify(dims, null, 2));
const total = Object.values(dims).reduce((s, d) => s + d.bytes, 0);
console.log(`\ncanonical set: ${Object.keys(dims).length} assets, ${(total / 1048576).toFixed(2)} MB total`);
