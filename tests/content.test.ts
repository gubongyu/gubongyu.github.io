import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicCatalog } from '../src/application/public-catalog';
import type { ContentSource } from '../src/application/content-source';
import type { Post, Project } from '../src/core/content';
import { presentSite } from '../src/application/presenters/site';
import { safeReturnPath, withBase } from '../src/core/urls';
const post = (id: string, overrides: Partial<Post> = {}): Post => ({
  id,
  slug: id,
  title: id,
  summary: 'summary',
  draft: false,
  sample: false,
  publishedAt: '2026-10-01T00:00:00+09:00',
  tags: ['Astro'],
  section: 'dev',
  relatedProjects: [],
  readingMinutes: 1,
  ...overrides,
});
const project = (id: string, overrides: Partial<Project> = {}): Project => ({
  id,
  slug: id,
  title: id,
  summary: 'summary',
  draft: false,
  sample: false,
  publishedAt: '2026-10-01T00:00:00+09:00',
  tags: ['Astro'],
  status: 'building',
  role: 'author',
  stack: ['Astro'],
  startedAt: '2026',
  featured: true,
  relatedPosts: [],
  ...overrides,
});
const source = (posts: Post[], projects: Project[] = []): ContentSource => ({
  readPosts: async () => posts,
  readProjects: async () => projects,
  readProfile: async () => ({
    name: 'Test',
    handle: 'test',
    headline: '',
    bio: '',
    status: '',
    sample: false,
    skillGroups: [],
    timeline: [],
    socialLinks: [],
  }),
  readExternalBlogs: async () => [],
});
test('one public catalog excludes drafts, future posts and private relations from all presentation data', async () => {
  const data = await createPublicCatalog(
    source(
      [
        post('visible', { relatedProjects: ['hidden-project'] }),
        post('draft', { draft: true }),
        post('future', { publishedAt: '2027-01-01T00:00:00Z' }),
      ],
      [project('hidden-project', { draft: true })],
    ),
    '2026-10-02T00:00:00Z',
  );
  assert.deepEqual(
    data.posts.map((p) => p.id),
    ['visible'],
  );
  assert.deepEqual(data.posts[0]?.relatedProjects, []);
  const vm = presentSite(data, '/profile/');
  assert.equal(vm.index.length, 1);
  assert.equal(vm.posts[0]?.href, '/profile/blog/posts/visible/');
  assert.equal(vm.tags[0]?.count, 1);
  assert.equal(JSON.stringify(vm).includes('hidden-project'), false);
});
test('unknown references and duplicate slugs fail instead of generating broken routes', async () => {
  await assert.rejects(
    createPublicCatalog(
      source([post('one', { relatedProjects: ['missing'] })]),
      '2026-10-02T00:00:00Z',
    ),
    /없는 프로젝트/,
  );
  await assert.rejects(
    createPublicCatalog(
      source([post('one'), post('two', { slug: 'one' })]),
      '2026-10-02T00:00:00Z',
    ),
    /slug/,
  );
});
test('publication boundary is evaluated in absolute time and ties sort deterministically', async () => {
  const data = await createPublicCatalog(source([post('b'), post('a')]), '2026-09-30T15:00:00Z');
  assert.deepEqual(
    data.posts.map((p) => p.id),
    ['a', 'b'],
  );
});
test('base URLs and terminal return paths stay inside the deployment', () => {
  assert.equal(withBase('tags/일상/', '/profile/'), '/profile/tags/일상/');
  for (const value of [
    '//evil.test',
    '/profile/../outside/',
    '/profile/\\evil.test',
    'https://evil.test',
    '/other/',
  ])
    assert.equal(safeReturnPath(value, '/profile/'), '/profile/');
  assert.equal(
    safeReturnPath('/profile/blog/?tag=Astro#one', '/profile/'),
    '/profile/blog/?tag=Astro#one',
  );
});
