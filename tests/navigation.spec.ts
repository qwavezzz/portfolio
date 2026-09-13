import { test, expect } from '@playwright/test';

test('shortcuts navigate without document reload and restore their origin', async ({ page }) => {
  await page.goto('/#desktop');
  await page.evaluate(() => { (window as any).__qwaveSession = 'kept'; });
  await page.locator('#shortcut-about').click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.locator('h1')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__qwaveSession)).toBe('kept');
  await page.locator('[data-return-desktop]').first().click();
  await expect(page).toHaveURL(/\/#desktop$/);
  await expect(page.locator('#shortcut-about')).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(650);
  await page.locator('#shortcut-contact').click();
  await expect(page).toHaveURL(/\/contact\/$/);
  await page.goBack();
  await expect(page.locator('#shortcut-contact')).toBeFocused();
  await page.goForward();
  await expect(page).toHaveURL(/\/contact\/$/);
  expect(await page.evaluate(() => (window as any).__qwaveSession)).toBe('kept');
});

test('direct routes, reload and fallback return work', async ({ page }) => {
  await page.goto('/about/');
  await page.reload();
  await expect(page).toHaveTitle('qwave — Обо мне');
  await page.locator('[data-return-desktop]').first().click();
  await expect(page.locator('#desktop-title')).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(650);
});

test('keyboard can open a section and focus follows navigation', async ({ page }) => {
  await page.goto('/#desktop');
  await page.locator('#shortcut-contact').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/contact\/$/);
  await expect(page.locator('h1')).toBeFocused();
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBe('A');
});

test('reduced motion uses poster and avoids fetching 3D assets', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const models: string[] = [];
  page.on('request', req => { if (req.url().endsWith('.glb')) models.push(req.url()); });
  await page.goto('/');
  await page.waitForTimeout(1000);
  await expect(page.locator('.scene-poster')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(models).toEqual([]);
  await page.locator('[data-enter-desktop]').first().click();
  await expect(page.locator('#desktop-title')).toBeInViewport();
  await context.close();
});

test('navigation and real HTML work without JavaScript', async ({ browser }) => {
  // Keep this check about HTML fallback, independent of smooth-scroll timing.
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('[data-enter-desktop]').first().click();
  await expect(page.locator('#desktop-title')).toBeInViewport();
  await page.locator('#shortcut-about').click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.locator('h1')).toContainText('qwave');
  await context.close();
});

test('model failure leaves poster and links usable', async ({ page }) => {
  await page.route('**/*.glb', route => route.abort());
  await page.goto('/');
  await expect(page.locator('[data-scene-state]')).toHaveAttribute('data-scene-state', 'fallback', { timeout: 15000 });
  await expect(page.locator('.scene-poster')).toHaveCSS('opacity', '1');
  await page.locator('[data-enter-desktop]').first().click();
  await page.locator('#shortcut-about').click();
  await expect(page).toHaveURL(/\/about\/$/);
});

test('3D opt-out persists across reloads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.scene-toggle')).toBeVisible();
  await page.locator('.scene-toggle').click();
  await expect(page.locator('.scene-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.locator('.scene-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('failed route leaves current page available with a retry link', async ({ page }) => {
  await page.goto('/#desktop');
  await page.route('**/about/', route => route.abort());
  await page.locator('#shortcut-about').click();
  await expect(page.locator('#route-error')).toBeVisible();
  await expect(page).toHaveURL(/\/#desktop$/);
  await expect(page.locator('#route-retry')).toHaveAttribute('href', /\/about\/$/);
  await page.locator('[data-dismiss-error]').click();
  await expect(page.locator('#route-error')).toBeHidden();
  await page.locator('#shortcut-contact').click();
  await expect(page).toHaveURL(/\/contact\/$/);
});

test('unknown URL shows a usable 404 page', async ({ page }) => {
  const response = await page.goto('/missing-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('файла');
  await page.getByRole('link', { name: 'На рабочий стол', exact: true }).click();
  await expect(page).toHaveURL(/\/#desktop$/);
});

for (const width of [360, 390, 768, 1440]) {
  test(`layout stays within viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/about/', '/contact/']) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBeTruthy();
      for (const link of await page.locator('a:visible').all()) {
        if (await link.evaluate(el => Boolean(el.closest('[inert]')))) continue;
        const rect = await link.boundingBox();
        expect(rect?.height, (await link.textContent()) ?? '').toBeGreaterThanOrEqual(43);
      }
    }
  });
}

test('missing personal data has honest empty states and no fake links', async ({ page }) => {
  await page.goto('/#desktop');
  await expect(page.locator('.shortcut-pending')).toHaveCount(3);
  await expect(page.locator('.shortcut-pending[href]')).toHaveCount(0);
  await expect(page.locator('a[href="#"]')).toHaveCount(0);
  await page.goto('/contact/');
  await expect(page.getByText('Контакты скоро появятся.')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});
