import { astroContentSource } from '../adapters/astro-content/source';
import { createPublicCatalog } from '../application/public-catalog';
import { presentSite } from '../application/presenters/site';
let sitePromise: Promise<ReturnType<typeof presentSite>> | undefined;
export async function getSite() {
  if (import.meta.env.DEV)
    return createPublicCatalog(astroContentSource, new Date().toISOString()).then((c) =>
      presentSite(c, import.meta.env.BASE_URL),
    );
  return (sitePromise ??= createPublicCatalog(astroContentSource, __BUILD_TIME__).then((c) =>
    presentSite(c, import.meta.env.BASE_URL),
  ));
}
export async function getPublicPostPage(slug: string) {
  const site = await getSite();
  const post = site.posts.find((p) => p.slug === slug);
  if (!post) throw new Error(`공개 글을 찾을 수 없습니다: ${slug}`);
  return {
    site,
    post,
    related: site.posts
      .filter((p) => p.id !== post.id && p.tags.some((t) => post.tags.includes(t)))
      .slice(0, 3),
  };
}
