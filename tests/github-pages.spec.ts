import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// Run against a subdirectory preview or the deployed URL with PAGES_URL set.
const pagesUrl = process.env.PAGES_URL;
test.skip(!pagesUrl, 'PAGES_URL is required for deployment checks.');

for (const [name, width, height] of [['desktop', 1440, 960], ['mobile', 390, 844]] as const) {
  test(`GitHub Pages routes, assets and desktop work on ${name}`, async ({ page }) => {
    const root = new URL(pagesUrl!);
    const url = (path: string) => new URL(path, root).href;
    const errors: string[] = [];
    const failedAssets: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(root.origin) && response.status() >= 400) failedAssets.push(response.url());
    });
    await page.setViewportSize({ width, height });
    await page.goto(root.href);
    await expect(page.locator('[data-scene-state]')).toHaveAttribute('data-scene-state', 'ready', { timeout: 20000 });
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.locator('[data-enter-desktop]').first().click();
    await expect(page).toHaveURL(url('#desktop'));
    await expect(page.locator('#desktop-title')).toBeFocused();
    await page.evaluate(() => document.fonts.ready);
    const overlay = await page.locator('.wallpaper-word').boundingBox();
    const artwork = await page.locator('.desktop-wallpaper .signal').boundingBox();
    expect(overlay!.y).toBeLessThan(artwork!.y + artwork!.height);
    expect(overlay!.y + overlay!.height).toBeGreaterThan(artwork!.y);
    await mkdir('.impeccable/review', { recursive: true });
    await page.screenshot({ path: `.impeccable/review/pages-${name}.png` });
    await page.locator('#shortcut-portfolio').click();
    await expect(page.locator('#project-dari-sinergii')).toBeVisible();
    await expect(page.locator('#project-dari-sinergii')).toHaveAttribute('href', 'https://dari-sinergii.ru');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { (window as any).__pagesSession = true; });
    await page.locator('#shortcut-about').click();
    await expect(page).toHaveURL(url('about/'));
    expect(await page.evaluate(() => (window as any).__pagesSession)).toBe(true);
    await page.locator('[data-return-desktop]').first().click();
    await expect(page.locator('#shortcut-about')).toBeFocused();
    await expect(page.locator('body')).toHaveClass(/has-monitor-flight/);
    await page.locator('#shortcut-contact').click();
    await expect(page).toHaveURL(url('contact/'));
    await page.goBack();
    await expect(page.locator('#shortcut-contact')).toBeFocused();
    await expect(page.locator('body')).toHaveClass(/has-monitor-flight/);
    await expect(page.locator('[data-scene-state]')).toHaveAttribute('data-scene-state', 'ready', { timeout: 20000 });
    await page.evaluate(() => {
      const journey = document.querySelector<HTMLElement>('.monitor-journey')!;
      const distance = parseFloat(journey.style.getPropertyValue('--flight-travel'));
      scrollTo({ top: journey.getBoundingClientRect().top + scrollY + distance * 0.45, behavior: 'instant' });
    });
    await expect(page.locator('body')).not.toHaveClass(/monitor-entered/);
    await expect(page.locator('.hero-canvas')).toHaveCSS('opacity', '1');
    await page.goto(url('about/'));
    await page.reload();
    await expect(page).toHaveTitle('qwave — Обо мне');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    expect(failedAssets).toEqual([]);
  });
}
