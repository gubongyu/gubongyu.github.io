import type { ContentSource } from './content-source';
import { isPublic, newestFirst } from '../core/publication';

export async function createPublicCatalog(source: ContentSource, now: string) {
  const [allPosts, allProjects, profile, externalBlogs] = await Promise.all([
    source.readPosts(),
    source.readProjects(),
    source.readProfile(),
    source.readExternalBlogs(),
  ]);
  const all = [...allPosts, ...allProjects];
  if (new Set(all.map((i) => i.id)).size !== all.length)
    throw new Error('콘텐츠 ID가 중복되었습니다.');
  for (const group of [allPosts, allProjects]) {
    if (new Set(group.map((i) => i.slug)).size !== group.length)
      throw new Error('콘텐츠 slug가 중복되었습니다.');
  }
  for (const post of allPosts)
    for (const id of post.relatedProjects) {
      if (!allProjects.some((p) => p.id === id)) throw new Error(`${post.id}: 없는 프로젝트 ${id}`);
    }
  for (const project of allProjects)
    for (const id of project.relatedPosts) {
      if (!allPosts.some((p) => p.id === id)) throw new Error(`${project.id}: 없는 글 ${id}`);
    }
  const posts = newestFirst(allPosts.filter((p) => isPublic(p, now)));
  const projects = newestFirst(allProjects.filter((p) => isPublic(p, now)));
  return {
    posts: posts.map((p) => ({
      ...p,
      relatedProjects: p.relatedProjects.filter((id) => projects.some((i) => i.id === id)),
    })),
    projects: projects.map((p) => ({
      ...p,
      relatedPosts: p.relatedPosts.filter((id) => posts.some((i) => i.id === id)),
    })),
    profile,
    externalBlogs,
  };
}
export type PublicCatalog = Awaited<ReturnType<typeof createPublicCatalog>>;
