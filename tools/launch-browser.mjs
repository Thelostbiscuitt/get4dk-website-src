import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const origin = process.argv[2] ?? 'http://127.0.0.1:4321';
const routes = JSON.parse(readFileSync(new URL('../src/data/route-manifest.json', import.meta.url))).routes;
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of [...routes.map(route => route.path), '/launch-audit-missing-page/']) {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
    assert.equal(response.status(), route.includes('missing-page') ? 404 : 200, route);
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(x => x.checkVisibility() && x.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0,12).map(x => ({tag:x.tagName, class:x.className, right:x.getBoundingClientRect().right, text:x.textContent.slice(0,50)}))));
      assert.ok(overflow <= 1, `${route} at ${width}px overflows by ${overflow}px`);
    }
  }
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(origin + '/steal-a-recipe/', { waitUntil: 'networkidle' });
    const boxes = await page.locator('.hero-actions, .hero-note, .device').evaluateAll(elements => elements.map(element => ({ top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom })));
    assert.ok(boxes[0].bottom < boxes[1].top && boxes[1].bottom < boxes[2].top, `Recipe import hero overlaps at ${width}px`);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(origin + '/how-it-works/');
  await page.locator('.site-menu summary').click();
  assert.equal(await page.locator('.site-menu nav a').count(), 7);
  assert.ok(await page.locator('.site-menu nav').evaluate(element => element.getBoundingClientRect().right <= document.documentElement.clientWidth));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.site-menu').evaluate(element => element.open), false);

  await page.goto(origin + '/food-atlas/');
  await page.locator('.chip[data-level="country"]').click();
  assert.match(await page.locator('#locationReadout').innerText(), /Nigeria/i);
  assert.match(await page.locator('#scopeTitle').innerText(), /Nigeria/i);
  await page.locator('.level[data-level="world"]').focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#scopeTitle').innerText(), /World/i);
  assert.equal(await page.locator('.level[data-level="world"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-cuisine="Japanese"]').click();
  assert.match(await page.locator('#cuisineReadout').innerText(), /Japanese/i);
  assert.match(await page.locator('#scopeTitle').innerText(), /World/i);

  await page.goto(origin + '/the-pass/');
  await page.locator('[data-filter="cook"]').click();
  const visibleCategories = await page.locator('[data-cat]').evaluateAll(elements => elements.filter(element => element.checkVisibility()).map(element => element.dataset.cat));
  assert.deepEqual(visibleCategories, ['cook', 'cook']);
  await page.locator('[data-filter="all"]').click();
  assert.equal(await page.locator('[data-cat]').evaluateAll(elements => elements.filter(element => element.checkVisibility()).length), 6);
  assert.deepEqual(errors, []);
  console.log('PASS: 31 routes × 6 widths, mobile menu, keyboard Food Atlas, independent cuisine, and The Pass filters.');
} finally {
  await browser.close();
}
