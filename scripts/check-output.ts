import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
async function walk(dir: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((d) =>
        d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
      ),
    )
  ).flat();
}
const base = `/${(process.env.BASE_PATH || '').replace(/^\/+|\/+$/g, '')}`.replace(/\/?$/, '/');
const files = await walk('dist');
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const errors: string[] = [];
const documents = new Map<string, ReturnType<typeof load>>();
async function documentFor(file: string) {
  if (!documents.has(file)) documents.set(file, load(await readFile(file, 'utf8')));
  return documents.get(file)!;
}
let articles = 0;
const exists = async (file: string) => {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
};
for (const file of htmlFiles) {
  const text = await readFile(file, 'utf8');
  if (/DRAFT_SENTINEL_PRIVATE|unpublished-draft|DraftOnly/.test(text))
    errors.push(`${file}: 초안 노출`);
  const $ = await documentFor(file);
  if ($('h1').length !== 1 || $('main#main-content').length !== 1 || !$('title').text())
    errors.push(`${file}: 문서 구조 누락`);
  if (!$('link[rel="canonical"]').attr('href')) errors.push(`${file}: canonical 누락`);
  if ($('[data-article-body]').length) articles++;
  for (const element of $('a[href], img[src], script[src], link[href]').toArray()) {
    const value = $(element).attr('href') || $(element).attr('src');
    if (!value || /^(https?:|mailto:|data:|tel:|\/\/)/.test(value)) continue;
    const currentPath =
      base +
      path
        .relative('dist', file)
        .split(path.sep)
        .join('/')
        .replace(/index\.html$/, '');
    const url = new URL(value, `https://site.invalid${currentPath}`);
    if (!url.pathname.startsWith(base)) {
      errors.push(`${file}: base 누락 ${value}`);
      continue;
    }
    const clean = decodeURIComponent(url.pathname.slice(base.length));
    const target = path.join('dist', clean);
    const resolved = (await exists(target)) ? target : path.join(target, 'index.html');
    if (!(await exists(resolved))) {
      errors.push(`${file}: 링크 대상 없음 ${value}`);
      continue;
    }
    if (url.hash.length > 1 && resolved.endsWith('.html')) {
      const other = await documentFor(resolved);
      const id = decodeURIComponent(url.hash.slice(1));
      if (
        !other('[id]')
          .toArray()
          .some((element) => other(element).attr('id') === id)
      )
        errors.push(`${file}: 앵커 없음 ${value}`);
    }
  }
}
const rss = await readFile('dist/rss.xml', 'utf8');
if (/unpublished-draft|DRAFT_SENTINEL_PRIVATE/.test(rss)) errors.push('RSS 초안 노출');
if (!(await exists('dist/pagefind/pagefind.js'))) errors.push('검색 인덱스 없음');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `Output verified: ${htmlFiles.length} HTML pages, ${articles} articles, links, anchors, RSS, search, draft exclusion. Base: ${base}`,
);
