import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('.impeccable/review', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true, args: ['--enable-unsafe-swiftshader'] });
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4321';
const findings = [];
for (const [name, width, height] of [['desktop', 1440, 960], ['mobile', 390, 844]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true });
  await page.screenshot({ path: `.impeccable/review/${name}-hero.png` });
  findings.push({ viewport: name, route: '/', errors: [...errors], state: await page.locator('[data-scene-state]').getAttribute('data-scene-state'), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
  await page.goto(`${base}/about/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `.impeccable/review/${name}-about.png`, fullPage: true });
  findings.push({ viewport: name, route: '/about/', overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
  await page.goto(`${base}/contact/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `.impeccable/review/${name}-contact.png`, fullPage: true });
  findings.push({ viewport: name, route: '/contact/', overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
  await context.close();
}
await browser.close();
await writeFile('.impeccable/review/capture-report.json', JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 2));
