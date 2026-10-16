import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('3D renders on desktop and representative screens can be reviewed', async ({ page }) => {
  test.setTimeout(60000);
  const directory = 'test-results/previews';
  await mkdir(directory, { recursive: true });
  await page.goto('/');
  await expect(page.locator('[data-hero]')).toHaveAttribute('data-ready', 'true', {
    timeout: 15000,
  });
  await page.getByRole('button', { name: '움직임 끄기' }).first().click();
  await page.screenshot({ path: `${directory}/home-desktop.png`, fullPage: true });
  await page.goto('/terminal/');
  await page.screenshot({ path: `${directory}/terminal-desktop.png`, fullPage: true });
  await page.goto('/blog/posts/content-and-design/');
  await page.screenshot({ path: `${directory}/article-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: `${directory}/home-mobile.png`, fullPage: true });
});
