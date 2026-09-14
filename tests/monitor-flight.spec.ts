import { test, expect, devices, type Page } from '@playwright/test';
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
    for (const value of [0, 0.45, 0.65, 1]) {
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

for (const [name, width, height] of [['desktop', 1440, 960], ['mobile', 390, 844]] as const) {
  test(`scroll settles on a usable desktop and can reverse on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('body')).toHaveClass(/has-monitor-flight/, { timeout: 20000 });
    await progress(page, 0.65);
    // Use actual wheel input for the last part, then let go before 100%.
    await page.mouse.wheel(0, height * 1.8 * 0.15);
    await expect(page.locator('body')).toHaveClass(/monitor-entered/);
    await expect.poll(async () => (await page.locator('#desktop').boundingBox())!.y).toBeCloseTo(0, 0);
    await page.locator('#shortcut-portfolio').click();
    await expect(page.locator('#portfolio-window')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.mouse.wheel(0, -height * 1.8 * 0.2);
    await expect(page.locator('body')).not.toHaveClass(/monitor-entered/);
    // Passing the snap zone upwards must not pull the visitor back in.
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toHaveClass(/monitor-entered/);
  });
}

test('browser chrome resize events do not move the camera', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/has-monitor-flight/, { timeout: 20000 });
  await progress(page, 0.45);
  const before = await page.evaluate(() => scrollY);
  await page.evaluate(() => {
    for (let i = 0; i < 10; i++) window.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

test('touch scrolling snaps only after the finger is released', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native touch injection uses Chromium CDP.');
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await expect(page.locator('body')).toHaveClass(/has-monitor-flight/, { timeout: 20000 });
    await progress(page, 0.65);
    const input = await context.newCDPSession(page);
    await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 650 }] });
    for (let y = 620; y >= 380; y -= 30) {
      await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] });
    }
    await page.waitForTimeout(600);
    const heldProgress = await page.locator('.hero').evaluate(el => Number((el as HTMLElement).style.getPropertyValue('--flight-progress')));
    expect(heldProgress).toBeGreaterThan(0.72);
    expect(heldProgress).toBeLessThan(1);
    await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('body')).toHaveClass(/monitor-entered/);
    await expect.poll(async () => (await page.locator('#desktop').boundingBox())!.y).toBeCloseTo(0, 0);
    await page.locator('#shortcut-portfolio').tap();
    await expect(page.locator('#portfolio-window')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('WebGL creation failure leaves a working poster and desktop', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('[data-scene-state]')).toHaveAttribute('data-scene-state', 'fallback', { timeout: 20000 });
  await expect(page.locator('.scene-poster')).toHaveCSS('opacity', '1');
  await page.locator('[data-enter-desktop]').first().click();
  await page.locator('#shortcut-about').click();
  await expect(page).toHaveURL(/\/about\/$/);
  expect(errors).toEqual([]);
});

for (const position of [0.45, 1]) {
  test(`losing WebGL at progress ${position} keeps desktop navigation available`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('body')).toHaveClass(/has-monitor-flight/, { timeout: 20000 });
    await progress(page, position);
    await page.locator('canvas').evaluate(canvas => {
      const gl = (canvas as HTMLCanvasElement).getContext('webgl2')!;
      const extension = gl.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Context-loss simulation is unavailable');
      extension.loseContext();
    });
    await expect(page.locator('[data-scene-state]')).toHaveAttribute('data-scene-state', 'fallback');
    await expect(page.locator('body')).not.toHaveClass(/has-monitor-flight/);
    await expect(page.locator('#desktop')).not.toHaveAttribute('inert');
    await expect(page.locator('#shortcut-about')).toBeInViewport();
    await expect.poll(async () => (await page.locator('#desktop').boundingBox())!.y).toBeCloseTo(0, 0);
    await page.locator('#shortcut-about').click();
    await expect(page).toHaveURL(/\/about\/$/);
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
