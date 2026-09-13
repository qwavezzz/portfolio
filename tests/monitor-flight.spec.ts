import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function progress(page: Page, value: number) {
  await page.evaluate(value => {
    const journey = document.querySelector<HTMLElement>('.monitor-journey')!;
    const distance = parseFloat(journey.style.getPropertyValue('--flight-travel'));
    scrollTo({ top: journey.getBoundingClientRect().top + scrollY + distance * value, behavior: 'instant' });
  }, value);
  await expect.poll(() => page.locator('.hero').evaluate(el => Number((el as HTMLElement).style.getPropertyValue('--flight-progress')))).toBeCloseTo(value, 2);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

for (const [name, width, height] of [['desktop', 1440, 960], ['mobile', 390, 844]] as const) {
  test(`camera enters the monitor and reverses on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('body')).toHaveClass(/has-monitor-flight/, { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    await mkdir('.impeccable/review', { recursive: true });
    let halfwayWidth = 0;
    for (const value of [0, 0.45, 0.9, 1]) {
      await progress(page, value);
      await page.screenshot({ path: `.impeccable/review/flight-${name}-${value}.png` });
      if (value === 0.45) halfwayWidth = (await page.locator('#desktop').boundingBox())!.width;
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (value < 1) {
        await expect(page.locator('#desktop')).toHaveAttribute('inert', '');
        expect((await page.locator('.hero').boundingBox())!.y).toBeCloseTo(0, 0);
      }
    }
    await expect(page.locator('#desktop')).not.toHaveAttribute('inert');
    const desktop = await page.locator('#desktop').boundingBox();
    expect(desktop!.y).toBeCloseTo(0, 0);
    expect(desktop!.width).toBe(width);
    await expect(page.locator('#shortcut-about')).toBeInViewport();
    await progress(page, 0.45);
    await expect(page.locator('#desktop')).toHaveAttribute('inert', '');
    expect((await page.locator('#desktop').boundingBox())!.width).toBeCloseTo(halfwayWidth, 0);
    await progress(page, 1);
    await page.locator('#shortcut-portfolio').click();
    await expect(page.locator('#portfolio-window')).toBeVisible();
    await expect(page.locator('#project-dari-sinergii')).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(page.locator('#shortcut-portfolio')).toBeFocused();
    await page.setViewportSize({ width, height: height + 100 });
    await expect.poll(async () => (await page.locator('#desktop').boundingBox())!.y).toBeCloseTo(0, 0);
    await expect(page.locator('#desktop')).not.toHaveAttribute('inert');
    await page.evaluate(() => { (window as any).__flightSession = true; });
    await page.locator('#shortcut-about').click();
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(page.locator('body')).not.toHaveClass(/has-monitor-flight/);
    await page.locator('[data-return-desktop]').first().click();
    await expect(page.locator('#shortcut-about')).toBeFocused();
    await expect(page.locator('#shortcut-about')).toBeInViewport();
    expect(await page.evaluate(() => (window as any).__flightSession)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('entry button skips the active camera journey and focuses the desktop', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/has-monitor-flight/, { timeout: 20000 });
  await page.locator('[data-enter-desktop]').first().click();
  await expect(page).toHaveURL(/\/#desktop$/);
  await expect(page.locator('body')).toHaveClass(/monitor-entered/);
  await expect(page.locator('#desktop-title')).toBeFocused();
  expect((await page.locator('#desktop').boundingBox())!.y).toBeCloseTo(0, 0);
});
