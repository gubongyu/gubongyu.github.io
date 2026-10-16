import { test, expect } from '@playwright/test';
test('reading, filtering and terminal navigation share public content', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('생각을');
  await page.getByRole('link', { name: /^모든 글/ }).click();
  await page.getByLabel('태그로 필터').selectOption('Astro');
  await expect(page.locator('[data-filter-item]:visible')).toHaveCount(1);
  await page.locator('.post-main').filter({ visible: true }).first().click();
  await expect(page.locator('[data-article-body]')).toContainText('콘텐츠의 역할');
  await page.getByRole('link', { name: '터미널', exact: false }).click();
  const input = page.getByRole('textbox', { name: '터미널 명령어' });
  await input.fill('cat ~/blog/dev/content-and-design.md');
  await input.press('Enter');
  await expect(page.locator('[data-terminal-preview] h2')).toContainText('글은 오래 남고');
  await page.getByRole('link', { name: '일반 페이지로 돌아가기' }).click();
  await expect(page).toHaveURL(/\/blog\/posts\/content-and-design\//);
  expect(errors).toEqual([]);
});
test('built search finds body text and ignores drafts', async ({ page }) => {
  await page.goto('/search/');
  await page.getByRole('searchbox').fill('추상화');
  await expect(page.locator('[data-search-results]')).toContainText('글은 오래 남고');
  // Pagefind는 일치가 없으면 접두어로 다시 찾으므로 결과 수가 아니라 초안 노출 여부를 확인한다.
  await page.goto('/search/');
  await page.getByRole('searchbox').fill('DRAFT_SENTINEL_PRIVATE');
  await expect(page.locator('[data-search-status]')).toContainText(
    /찾았습니다|일치하는 기록이 없습니다/,
  );
  await expect(page.locator('[data-search-results]')).not.toContainText('아직 공개하지 않은 글');
  await expect(page.locator('[data-search-results] a[href*="unpublished-draft"]')).toHaveCount(0);
});
test('theme persists and reduced motion uses a poster without a 3D request', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await page.getByRole('button', { name: '다크 테마로 변경' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('[data-hero]')).not.toHaveAttribute('data-ready', 'true');
  expect(requests.filter((url) => /\/scene\.[^/]+\.js/.test(url))).toHaveLength(0);
});
test('mobile pages fit the viewport and primary navigation works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    '/',
    '/blog/',
    '/projects/',
    '/projects/met-a-round/',
    '/about/',
    '/terminal/',
    '/blog/posts/content-and-design/',
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.right > innerWidth + 1 || r.left < -1;
        })
        .map((el) => el.tagName + '.' + el.className)
        .slice(0, 12),
    }));
    expect(overflow.scroll, `${path}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(
      overflow.width,
    );
    await expect(page.locator('h1')).toHaveCount(1);
  }
});

test('met-a-round keeps all ten project stages readable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto('/projects/met-a-round/');
  await expect(page.locator('h1')).toBeVisible();
  const details = page.locator('section.stage-detail');
  await expect(details).toHaveCount(10);
  for (const detail of await details.all()) {
    await expect(detail).toBeVisible();
    await expect(detail.locator('h2')).toBeVisible();
  }
  await expect(page.locator('[data-pipeline-static] li')).toHaveCount(10);
  await expect(
    page.locator('#pipeline-met-a-round-corners [data-pipeline-card-related]'),
  ).toHaveAttribute('href', '/blog/posts/metaroom-fragmentation/');
  await context.close();
});

test('met-a-round does not load Three.js for reduced motion or mobile', async ({ browser }) => {
  const cases = [
    {
      name: 'reduced motion on desktop',
      reducedMotion: 'reduce' as const,
      viewport: { width: 1440, height: 1000 },
    },
    {
      name: 'mobile with motion enabled',
      reducedMotion: 'no-preference' as const,
      viewport: { width: 390, height: 844 },
    },
  ];
  for (const { name, reducedMotion, viewport } of cases) {
    const context = await browser.newContext({ reducedMotion, viewport });
    const page = await context.newPage();
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto('/projects/met-a-round/');
    await expect(page.locator('[data-pipeline-static]')).toBeVisible();
    expect(
      requests.filter((url) => /\/projects\/met-a-round\/pipeline\/story5\//.test(url)),
      name,
    ).toHaveLength(0);
    await context.close();
  }
});

test('met-a-round desktop pipeline tracks the visible stage while scrolling', async ({ page }) => {
  const errors: string[] = [];
  const loadedAssets: string[] = [];
  const failedAssets: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/projects/met-a-round/pipeline/story5/')) {
      loadedAssets.push(response.url());
      if (!response.ok()) failedAssets.push(response.url());
    }
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/projects/met-a-round/');
  const pipeline = page.locator('[data-project-pipeline]');
  await expect(pipeline).toBeVisible();
  await expect(pipeline).toHaveAttribute('data-pipeline-ready', 'true');
  await expect(pipeline.locator('[data-pipeline-stage]')).toBeVisible();
  await expect.poll(() => loadedAssets.length).toBeGreaterThan(0);
  const trackBox = await pipeline.locator('[data-pipeline-track]').boundingBox();
  if (!trackBox) throw new Error('Pipeline track has no layout box');
  await page.evaluate(
    ({ y, height }) => window.scrollTo(0, window.scrollY + y + (height - innerHeight) * 0.96),
    trackBox,
  );
  await expect(page.locator('[data-pipeline-stage]')).toHaveAttribute('data-pipeline-step', '9');
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test('met-a-round falls back to its static stages when a scene asset fails', async ({ page }) => {
  let abortedAssetRequests = 0;
  await page.route('**/projects/met-a-round/pipeline/story5/*.bin', async (route) => {
    abortedAssetRequests += 1;
    await route.abort();
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/projects/met-a-round/');
  const pipeline = page.locator('[data-project-pipeline]');
  await expect.poll(() => abortedAssetRequests).toBeGreaterThan(0);
  await expect(pipeline).toHaveAttribute('data-pipeline-ready', 'false');
  await expect(page.locator('[data-pipeline-static]')).toBeVisible();
  await expect(page.locator('[data-pipeline-static] li')).toHaveCount(10);
  await expect(page.locator('section.stage-detail')).toHaveCount(10);
  await expect(page.locator('section.stage-detail').first()).toBeVisible();
});

test('met-a-round releases the scene on mobile and remounts it on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/projects/met-a-round/');
  const pipeline = page.locator('[data-project-pipeline]');
  await expect(pipeline).toHaveAttribute('data-pipeline-ready', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(pipeline).toHaveAttribute('data-pipeline-ready', 'false');
  await expect(page.locator('[data-pipeline-static]')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(pipeline).toHaveAttribute('data-pipeline-ready', 'true');
});
test('core content remains available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/blog/');
  await page.locator('.post-main').first().click();
  await expect(page.locator('[data-article-body]')).toBeVisible();
  await context.close();
});

test('clear removes the welcome art and output while keeping the terminal usable', async ({
  page,
}) => {
  await page.goto('/terminal/');
  const input = page.getByRole('textbox', { name: '터미널 명령어' });
  const output = page.locator('[data-terminal-output]');
  await expect(page.locator('[data-terminal-intro]')).toBeVisible();
  await input.fill('cd blog');
  await input.press('Enter');
  await input.fill('clear');
  await input.press('Enter');
  await expect(page.locator('[data-terminal-intro]')).toHaveCount(0);
  await expect(output).toBeEmpty();
  await expect(input).toBeFocused();
  await input.fill('pwd');
  await input.press('Enter');
  await expect(output).toContainText('~/blog');
  await page.reload();
  await expect(page.locator('[data-terminal-intro]')).toBeVisible();
  await input.focus();
  await input.press('Control+l');
  await expect(page.locator('[data-terminal-intro]')).toHaveCount(0);
  await expect(output).toBeEmpty();
});
