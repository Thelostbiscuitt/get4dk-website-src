/** W9-R3 §12 — deployed mobile smoke at 390px against the live held site. */
import { chromium } from 'playwright';

const ROUTES = ['/', '/features/pantry/', '/food-atlas/', '/pricing/'];
const BASE = 'https://get4dk.com';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
let fails = 0;
for (const r of ROUTES) {
  try {
    await page.goto(BASE + r, { waitUntil: 'networkidle', timeout: 45000 });
    const m = await page.evaluate(() => {
      const d = document.documentElement;
      const overflow = Math.max(d.scrollWidth, document.body.scrollWidth) - d.clientWidth;
      const nav = ['how-it-works', 'features', 'the-pass', 'food-atlas', 'pricing']
        .map((h) => !!document.querySelector(`a[href="/${h}/"]`));
      return { overflow, navCount: nav.filter(Boolean).length, title: document.title.slice(0, 40) };
    });
    const imgsBroken = await page.evaluate(() =>
      Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').length
    );
    const pass = m.overflow <= 0 && m.navCount === 5 && imgsBroken === 0;
    if (!pass) fails++;
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${r.padEnd(20)} overflow=${m.overflow}px nav=${m.navCount}/5 brokenImgs=${imgsBroken} "${m.title}"`);
  } catch (e) {
    fails++;
    console.log(`FAIL ${r} — ${String(e).slice(0, 90)}`);
  }
}
await browser.close();
console.log('──────────────────────────────');
console.log(`MOBILE 390px SMOKE: ${fails === 0 ? 'PASS' : fails + ' failure(s)'}`);
process.exit(fails ? 1 : 0);
