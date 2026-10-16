import { test, expect } from '@playwright/test';
test('project-site base works for navigation, full-text search, terminal and RSS', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/profile/');
  await expect(page.locator('h1')).toContainText('생각을');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    'https://example.test/profile/',
  );
  await page.getByRole('link', { name: '글과 프로젝트 검색' }).click();
  await expect(page).toHaveURL(/\/profile\/search\//);
  await page.getByRole('searchbox').fill('추상화');
  const result = page.locator('[data-search-results] a').first();
  await expect(result).toContainText('글은 오래 남고');
  await expect(result).toHaveAttribute('href', '/profile/blog/posts/content-and-design/');
  await result.click();
  await expect(page.locator('[data-article-body]')).toBeVisible();
  await page.getByRole('link', { name: '터미널', exact: true }).click();
  const input = page.getByRole('textbox', { name: '터미널 명령어' });
  await input.fill('cat ~/blog/dev/content-and-design.md');
  await input.press('Enter');
  await expect(page.locator('[data-terminal-preview] a')).toHaveAttribute(
    'href',
    '/profile/blog/posts/content-and-design/',
  );
  const rss = await request.get('/profile/rss.xml');
  expect(rss.ok()).toBe(true);
  expect(await rss.text()).toContain('https://example.test/profile/blog/posts/content-and-design/');
  expect(errors).toEqual([]);
});

test('met-a-round stage images stay under the configured base path', async ({ page }) => {
  await page.goto('/profile/projects/met-a-round/');
  await expect(page.locator('h1')).toBeVisible();
  const imageSources = await page
    .locator('[data-project-pipeline] img, [data-pipeline-static] img')
    .evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).getAttribute('src')).filter(Boolean),
    );
  expect(imageSources.length).toBeGreaterThan(0);
  for (const source of imageSources) {
    const imageUrl = new URL(source!, page.url());
    expect(imageUrl.origin).toBe(new URL(page.url()).origin);
    expect(imageUrl.pathname).toMatch(/^\/profile\/projects\/met-a-round\/pipeline\//);
    const response = await page.request.get(imageUrl.href);
    expect(response.ok(), source!).toBe(true);
  }
});
