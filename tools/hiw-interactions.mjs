// How It Works interaction gate — regression checks for the reported defects:
//   1. meal cards must drive the cook panel (photo + title + list) of the SAME meal
//   2. STEAL IT chip must be a real link to the STEAL IT feature route
//   3. Recipe adaptation chip must switch the panel to the adapted view of the
//      current meal, sync its pressed state, and switch back via Original
//   4. no stale cross-meal content; keyboard operability; no console errors
// Usage: node tools/hiw-interactions.mjs [base-url]  (default dev server :4399)
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:4399';
const browser = await chromium.launch();
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function newPage(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  return { ctx, page, errors };
}

const panel = (page) => page.evaluate(() => ({
  photo: document.getElementById('cook-photo')?.getAttribute('src'),
  alt: document.getElementById('cook-photo')?.getAttribute('alt'),
  title: document.getElementById('cook-title')?.textContent,
  list: [...document.querySelectorAll('#cook-list li')].map((li) => li.textContent),
  pressed: document.getElementById('adapt-chip')?.getAttribute('aria-pressed'),
  activeTab: document.querySelector('.cook-toggle button.active')?.dataset.version,
}));

// ---------- desktop ----------
{
  const { ctx, page, errors } = await newPage(1440, 900);
  await page.goto(base + '/how-it-works/', { waitUntil: 'networkidle', timeout: 45000 });

  // 1. every meal card opens its own cook panel
  const expectations = {
    jollof: {
      photo: '/assets/photo/food-jollof-wide.webp', title: 'Jollof + chicken / original',
      list: ['One-pot tomato rice base, chicken browned then braised', '35 min covered, rested before serving', 'No personal adjustment yet'],
    },
    pasta: {
      photo: '/assets/photo/food-card-pasta.webp', title: 'Tomato pasta / original',
      list: ['350 g pasta · 300 g tomatoes · 120 g spinach', 'Garlic + tomato base, 20 minutes total', 'Cheese optional finish'],
    },
    tacos: {
      photo: '/assets/photo/food-card-tacos.webp', title: 'Tacos / original',
      list: ['Corn tortillas, double-stacked', 'One main filling, slaw and lime', '25 minutes, house fit 82%'],
    },
  };
  const initial = await panel(page);
  check('default panel = jollof original', initial.photo === expectations.jollof.photo && initial.title === expectations.jollof.title, JSON.stringify(initial));
  for (const meal of ['pasta', 'tacos', 'jollof']) {
    await page.click(`.meal-card[data-meal="${meal}"]`);
    await page.waitForTimeout(150);
    const p = await panel(page);
    const exp = expectations[meal];
    check(`card ${meal} → own photo+title`, p.photo === exp.photo && p.title === exp.title, `${p.photo} / ${p.title}`);
    check(`card ${meal} → own ingredient list`, JSON.stringify(p.list) === JSON.stringify(exp.list), p.list.join(' | '));
  }

  // 2. STEAL IT chip is a real link to the STEAL IT feature route
  const steal = await page.evaluate(() => {
    const el = [...document.querySelectorAll('#cook .chips .chip')].find((c) => c.textContent.trim() === 'STEAL IT');
    return el ? { tag: el.tagName, href: el.getAttribute('href') } : null;
  });
  check('STEAL IT chip is an anchor', steal?.tag === 'A', JSON.stringify(steal));
  check('STEAL IT href = /features/steal-it/', steal?.href === '/features/steal-it/', String(steal?.href));
  const resp = await page.request.get(base + '/features/steal-it/');
  check('/features/steal-it/ resolves', resp.status() === 200, `HTTP ${resp.status()}`);
  // clicking navigates
  await page.click('#cook .chips a.chip');
  await page.waitForURL('**/features/steal-it/**', { timeout: 10000 }).catch(() => {});
  check('clicking STEAL IT navigates', new URL(page.url()).pathname === '/features/steal-it/', page.url());
  await page.goBack({ waitUntil: 'networkidle' });

  // 3. Recipe adaptation switches the CURRENT meal to its adapted view and back
  await page.click('.meal-card[data-meal="pasta"]');
  await page.waitForTimeout(150);
  await page.click('#adapt-chip');
  await page.waitForTimeout(150);
  let p = await panel(page);
  check('adapt chip → pasta MY VERSION', p.title === 'Tomato pasta / your version' && p.activeTab === 'mine', `${p.title} / tab=${p.activeTab}`);
  check('adapt chip pressed state', p.pressed === 'true', `aria-pressed=${p.pressed}`);
  check('adapted list is pasta adaptation', p.list.some((li) => /kale|tinned|cheese/i.test(li)), p.list.join(' | '));
  await page.click('.cook-toggle button[data-version="original"]');
  await page.waitForTimeout(150);
  p = await panel(page);
  check('Original tab switches back', p.title === 'Tomato pasta / original' && p.activeTab === 'original' && p.pressed === 'false', `${p.title} / tab=${p.activeTab} / pressed=${p.pressed}`);

  // 4. changing meals does not leak another meal's adaptation
  await page.click('#adapt-chip'); // pasta → mine
  await page.waitForTimeout(150);
  await page.click('.meal-card[data-meal="jollof"]');
  await page.waitForTimeout(150);
  p = await panel(page);
  check('switch meal keeps version but shows THAT meal (no leak)', p.title === 'Jollof + chicken / your version' && p.photo === '/assets/photo/food-jollof-wide.webp', `${p.title} / ${p.photo}`);

  // keyboard: tab focus reaches chips, Enter/Space activates adaptation
  await page.click('.cook-toggle button[data-version="original"]'); // known state: original
  await page.click('.meal-card[data-meal="pasta"]'); // focus lands before the chips in tab order
  await page.waitForTimeout(150);
  // walk tabs until adapt chip is focused
  let focused = '';
  for (let i = 0; i < 40; i++) {
    focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim() || '');
    if (focused === 'adapt-chip') break;
    await page.keyboard.press('Tab');
  }
  check('adapt chip keyboard-focusable', focused === 'adapt-chip', `focused=${focused}`);
  const focusVisible = await page.evaluate(() => {
    const el = document.getElementById('adapt-chip');
    return el ? getComputedStyle(el).outlineStyle !== 'none' : false;
  });
  check('focus outline visible on chips', focusVisible);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  p = await panel(page);
  check('Enter activates adaptation', p.activeTab === 'mine' && p.pressed === 'true', `tab=${p.activeTab}`);

  check('no console/request errors (desktop)', errors.length === 0, errors.slice(0, 3).join(' || '));
  await ctx.close();
}

// ---------- mobile ----------
{
  const { ctx, page, errors } = await newPage(390, 844);
  await page.goto(base + '/how-it-works/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.click('.meal-card[data-meal="pasta"]');
  await page.waitForTimeout(150);
  const p = await panel(page);
  check('mobile: pasta card drives panel', p.photo === '/assets/photo/food-card-pasta.webp' && p.title === 'Tomato pasta / original');
  await page.click('#adapt-chip');
  await page.waitForTimeout(150);
  const p2 = await panel(page);
  check('mobile: adaptation works', p2.activeTab === 'mine' && p2.pressed === 'true');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('mobile: no horizontal overflow', overflow <= 0, `overflowX=${overflow}px`);
  check('no console/request errors (mobile)', errors.length === 0, errors.slice(0, 3).join(' || '));
  await ctx.close();
}

await browser.close();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
