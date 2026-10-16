import type { PublicCatalog } from '../public-catalog';
import type { SiteVM } from '../contracts';
import { withBase, postPath, projectPath, tagPath } from '../../core/urls';
const date = (value: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(value))
    .replaceAll('-', '.');
export function presentSite(catalog: PublicCatalog, base: string): SiteVM {
  const tagLinks = (tags: string[]) =>
    tags.map((label) => ({ label, href: withBase(tagPath(label), base) }));
  const posts = catalog.posts.map((p) => ({
    ...p,
    href: withBase(postPath(p.slug), base),
    dateLabel: date(p.publishedAt),
    sectionLabel: p.section === 'dev' ? '개발' : '일상',
    tagLinks: tagLinks(p.tags),
  }));
  const projects = catalog.projects.map((p) => ({
    ...p,
    href: withBase(projectPath(p.slug), base),
    dateLabel: date(p.publishedAt),
    statusLabel: { building: '만드는 중', released: '완성', archived: '아카이브' }[p.status],
    tagLinks: tagLinks(p.tags),
  }));
  const counts = new Map<string, number>();
  for (const item of [...posts, ...projects])
    for (const tag of new Set(item.tags)) counts.set(tag, (counts.get(tag) || 0) + 1);
  return {
    profile: catalog.profile,
    externalBlogs: catalog.externalBlogs,
    posts,
    projects,
    tags: [...counts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count, href: withBase(tagPath(name), base) })),
    index: [
      ...posts.map((p) => ({ ...p, kind: 'post' as const })),
      ...projects.map((p) => ({ ...p, kind: 'project' as const })),
    ].map((p) => ({
      id: p.id,
      kind: p.kind,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      href: p.href,
      tags: p.tags,
      ...('section' in p ? { section: p.section } : {}),
    })),
  };
}
