import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

for (const [name, width, height] of [['desktop', 1440, 960], ['tablet', 768, 900], ['mobile', 390, 844], ['small', 320, 640]] as const) {
  test(`portfolio opens inside the desktop and links out on ${name}`, async ({ page, context }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#desktop');
    await page.evaluate(() => { (window as any).__folderSession = true; });
    await page.evaluate(() => document.fonts.ready);
    const folder = page.locator('#portfolio-window');
    const shortcut = page.locator('#shortcut-portfolio');
    await expect(folder).toBeHidden();
    await shortcut.click();
    await expect(folder).toBeVisible();
    await expect(page.locator('#portfolio-title')).toBeFocused();
    await expect(page).toHaveURL(/\/#desktop$/);
    expect(await page.evaluate(() => (window as any).__folderSession)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = (await folder.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    const close = folder.getByRole('button', { name: 'Закрыть папку «Портфолио»' });
    await expect(close).toBeInViewport();
    const project = folder.getByRole('link', { name: 'Дары Синергии — откроется в новой вкладке' });
    await expect(project).toBeInViewport();
    await expect(project).toHaveAttribute('href', 'https://dari-sinergii.ru');
    await expect(project).toHaveAttribute('rel', 'noopener noreferrer');
    await mkdir('.impeccable/review', { recursive: true });
    await page.screenshot({ path: `.impeccable/review/folder-${name}.png` });

    // Verify the browser opens a real new tab without depending on an external server.
    await context.route('https://dari-sinergii.ru/**', route => route.fulfill({ body: '<title>Project destination</title>' }));
    const popupPromise = page.waitForEvent('popup');
    await project.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL('https://dari-sinergii.ru/');
    await popup.close();
    await expect(folder).toBeVisible();
    await close.click();
    await expect(folder).toBeHidden();
    await expect(shortcut).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(folder).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(folder).toBeHidden();
    await expect(shortcut).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test('folder survives SPA returns and never obscures keyboard focus on another shortcut', async ({ page }) => {
  await page.goto('/#desktop');
  await page.locator('#shortcut-portfolio').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#portfolio-title')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.portfolio-close')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#project-dari-sinergii')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#shortcut-about')).toBeFocused();
  await expect(page.locator('#portfolio-window')).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/about\/$/);
  await page.locator('[data-return-desktop]').first().click();
  await page.locator('#shortcut-portfolio').click();
  await expect(page.locator('#portfolio-window')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#shortcut-portfolio')).toBeFocused();
});

test('portfolio projects remain reachable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/#desktop');
  const shortcut = page.locator('#shortcut-portfolio');
  await shortcut.click();
  await expect(page.locator('#project-dari-sinergii')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(shortcut).toBeInViewport();
  await shortcut.click();
  await expect(page.locator('#portfolio-window')).toBeHidden();
  await context.close();
});
