/**
 * W7 audit — accessibility (axe-core), reliability, performance over every
 * built route on a real server (astro preview).
 *
 * Per page: direct load + reload, console/page errors, failed requests,
 * iframe count, CLS (layout-shift entries), axe violations (wcag2a/aa/21aa).
 * Output: .w7/audit.json + grouped summary on stdout.
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:4321';

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const pages = walk('dist')
  .filter((f) => f.endsWith('.html'))
  .map((f) => '/' + relative('dist', f).replace(/index\.html$/, '').replaceAll('\\', '/'))
  .filter((p) => p !== '/404');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const consoleIssues = [];
const badReqs = [];
page.on('console', (m) => { if (m.type() === 'error') consoleIssues.push({ at: page.url(), text: m.text().slice(0, 140) }); });
page.on('pageerror', (e) => consoleIssues.push({ at: page.url(), text: `PAGEERROR ${String(e).slice(0, 160)}` }));
page.on('response', (r) => { if (r.status() >= 400) badReqs.push(`${r.url().replace(BASE, '')} → ${r.status()}`); });

const report = { pages: {}, axe: {}, consoleIssues, badReqs };

for (const route of pages) {
  const resp = await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  // reload (direct route reload reliability)
  const resp2 = await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  const metrics = await page.evaluate(() => {
    const cls = performance.getEntriesByType('layout-shift').reduce((s, e) => s + e.value, 0);
    const lcp = performance.getEntriesByType('largest-contentful-paint').at(-1);
    return {
      cls,
      lcpMs: lcp ? Math.round(lcp.startTime) : null,
      iframes: document.querySelectorAll('iframe').length,
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => `${h.tagName}:${(h.textContent || '').trim().slice(0, 40)}`),
      buttons: document.querySelectorAll('button').length,
      linksWithoutHref: document.querySelectorAll('a:not([href])').length,
      lang: document.documentElement.lang || null,
    };
  });

  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    });
    return r.violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help,
      nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ').slice(0, 90)),
      count: v.nodes.length,
    }));
  });

  report.pages[route] = { status: resp.status(), reloadStatus: resp2.status(), ...metrics };
  for (const v of axe) {
    const k = `${v.id} [${v.impact}]`;
    (report.axe[k] ??= { help: v.help, total: 0, routes: new Set(), sample: v.nodes });
    report.axe[k].total += v.count;
    report.axe[k].routes.add(route);
  }
  console.log(`${route.padEnd(52)} ${resp.status()}/${resp2.status()} cls:${metrics.cls.toFixed(4)} lcp:${metrics.lcpMs ?? '-'}ms iframes:${metrics.iframes}`);
}

// 404 behaviour
const nf = await page.goto(BASE + '/no-such-route/', { waitUntil: 'domcontentloaded' }).catch((e) => null);
report.notFound = nf ? { status: nf.status(), hasH1: await page.evaluate(() => !!document.querySelector('h1')) } : { status: 'error' };
console.log(`\n404 /no-such-route/ → status ${report.notFound.status}, h1: ${report.notFound.hasH1}`);

await browser.close();

// serialize sets
report.axe = Object.fromEntries(Object.entries(report.axe).map(([k, v]) => [k, { ...v, routes: [...v.routes] }]));
mkdirSync('.w7', { recursive: true });
writeFileSync('.w7/audit.json', JSON.stringify(report, null, 2));

console.log('\n── axe violations (grouped) ──');
for (const [k, v] of Object.entries(report.axe).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`${k.padEnd(38)} ${String(v.total).padStart(3)}× across ${v.routes.length} pages — ${v.help}`);
  console.log(`   sample: ${v.sample[0]}`);
}
console.log(`\nconsole errors: ${consoleIssues.length} | failed requests: ${badReqs.length}`);
