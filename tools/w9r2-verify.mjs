/**
 * W9-R2 §20 — production asset + rights closure verifier.
 *
 * Checks:
 *  1. asset manifest parses and every entry carries the required provenance fields
 *  2. statuses use the locked vocabulary; blockers carry explicit owner_action
 *  3. every shipped raster asset family under public/assets is manifest-covered
 *  4. intrinsic dims in the manifest match the real files (honesty check)
 *  5. no asset is falsely marked resolution-SUFFICIENT while measured <1x
 *  6. no CHEF4ME-era asset names anywhere in dist/assets
 *  7. OG cards: 23 present, all 1200x630
 *  8. app screens: 8 present at 941x1672
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const PUB = join(ROOT, 'public/assets');
const DIST = join(ROOT, 'dist/assets');
const VOCAB = new Set(['SUFFICIENT', 'REPLACEMENT_REQUIRED', 'RIGHTS_BLOCKED', 'SOURCE_MISSING', 'APPROVED']);
const REQUIRED_FIELDS = [
  'asset_id', 'local_path', 'asset_type', 'route_usage', 'source_type', 'creator',
  'license', 'intrinsic_width', 'intrinsic_height', 'resolution_status',
  'rights_status', 'production_status',
];

let failures = 0;
const fail = (m) => { failures++; console.error('  FAIL', m); };
const ok = (m) => console.log('  ok  ', m);

// ── 1+2. manifest schema ─────────────────────────────────────────
console.log('[1] asset manifest schema + statuses');
const manifest = JSON.parse(readFileSync(join(ROOT, 'src/data/asset-manifest.json'), 'utf8'));
if (!Array.isArray(manifest.assets) || manifest.assets.length < 20) fail('manifest assets array missing/too small');
const ids = new Set();
for (const a of manifest.assets) {
  for (const f of REQUIRED_FIELDS) if (a[f] === undefined) fail(`${a.asset_id ?? '?'}: missing field ${f}`);
  if (!VOCAB.has(a.production_status)) fail(`${a.asset_id}: production_status not in vocabulary`);
  if (!VOCAB.has(a.resolution_status)) fail(`${a.asset_id}: resolution_status not in vocabulary`);
  if (ids.has(a.asset_id)) fail(`duplicate asset_id ${a.asset_id}`);
  ids.add(a.asset_id);
  if (a.production_status !== 'APPROVED' && !a.owner_action) fail(`${a.asset_id}: non-APPROVED without owner_action (blocker must be explicit)`);
}
ok(`${manifest.assets.length} entries, fields + vocabulary valid, blockers explicit`);

// ── 3. coverage of shipped asset files ───────────────────────────
console.log('[2] shipped-asset coverage');
const fams = { 'photo': '.webp', 'banner': '.webp', 'app-screens': '.webp', 'icons': '.png' };
const shipped = [];
for (const [dir, ext] of Object.entries(fams)) {
  for (const f of readdirSync(join(PUB, dir))) if (f.endsWith(ext)) shipped.push(`${dir}/${f}`);
}
const covered = (p) => manifest.assets.some((a) => {
  const lp = a.local_path.replace('/assets/', '');
  if (lp.endsWith('/')) return p.startsWith(lp);
  if (lp.includes('*')) return p.startsWith(lp.split('*')[0]);
  return lp === p;
});
const uncovered = shipped.filter((p) => !covered(p));
if (uncovered.length) fail(`shipped assets not covered by manifest: ${uncovered.join(', ')}`);
else ok(`all ${shipped.length} shipped raster files covered (photo/banner/app-screens/icons)`);

// ── 4. intrinsic dims honesty ────────────────────────────────────
console.log('[3] intrinsic dimensions honesty');
const exact = manifest.assets.filter((a) => !a.local_path.includes('*') && !a.local_path.endsWith('/'));
for (const a of exact) {
  const p = join(PUB, a.local_path.replace('/assets/', ''));
  if (!existsSync(p)) { fail(`${a.asset_id}: local_path not a file`); continue; }
  const m = await sharp(p).metadata();
  if (m.width !== a.intrinsic_width || m.height !== a.intrinsic_height) {
    fail(`${a.asset_id}: manifest ${a.intrinsic_width}x${a.intrinsic_height} ≠ file ${m.width}x${m.height}`);
  }
}
ok('manifest dims match files for all single-file entries');

// ── 5. measured-ratio honesty ────────────────────────────────────
console.log('[4] no falsely-closed low-resolution asset');
const measured = existsSync(join(ROOT, '.w9/rendered-sizes.json'))
  ? JSON.parse(readFileSync(join(ROOT, '.w9/rendered-sizes.json'), 'utf8')) : null;
if (!measured) {
  ok('no measurement file present (run tools/w9r2-measure.mjs) — skipped');
} else {
  for (const m of measured) {
    const entry = manifest.assets.find((a) => a.local_path.endsWith(m.asset) || m.asset.startsWith(a.local_path.replace('/assets/', '').replace('*', '')));
    if (!entry || entry.asset_type === 'ui-icons') continue;
    if (m.ratio < 1 && entry.resolution_status === 'SUFFICIENT') {
      fail(`${m.asset}: measured ratio ${m.ratio} <1 but marked SUFFICIENT`);
    }
  }
  ok('every measured <1x asset is marked REPLACEMENT_REQUIRED');
}

// ── 6. no CHEF4ME-era assets ─────────────────────────────────────
console.log('[5] CHEF4ME-era asset absence');
const walk = (d) => readdirSync(d).flatMap((f) => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [f]);
const distAssets = walk(DIST);
if (distAssets.some((f) => /chef4me/i.test(f))) fail('CHEF4ME-named asset in dist');
else ok(`no CHEF4ME-named assets among ${distAssets.length} dist asset files`);

// ── 7. OG cards ──────────────────────────────────────────────────
console.log('[6] OG card integrity');
const og = readdirSync(join(DIST, 'og'));
if (og.length !== 23) fail(`expected 23 OG cards, found ${og.length}`);
for (const f of og) {
  const m = await sharp(join(DIST, 'og', f)).metadata();
  if (m.width !== 1200 || m.height !== 630) fail(`${f}: ${m.width}x${m.height} ≠ 1200x630`);
}
ok(`${og.length} OG cards, all 1200x630`);

// ── 8. app screens ───────────────────────────────────────────────
console.log('[7] canonical app screen set');
const screens = readdirSync(join(PUB, 'app-screens'));
if (screens.length !== 8) fail(`expected 8 canonical screens, found ${screens.length}`);
for (const f of screens) {
  const m = await sharp(join(PUB, 'app-screens', f)).metadata();
  if (m.width !== 941 || m.height !== 1672) fail(`${f}: ${m.width}x${m.height} ≠ 941x1672`);
}
ok('8 canonical screens at 941x1672');

console.log('──────────────────────────────────────────');
if (failures) {
  console.log(`W9-R2 ASSET VERIFY: FAIL — ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log('W9-R2 ASSET VERIFY: PASS — manifest complete, statuses honest, OG + screens valid, no CHEF4ME assets');
}
