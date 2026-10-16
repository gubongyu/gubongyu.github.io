import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getSite } from '../server/public-content';
export async function GET(context: APIContext) {
  const site = await getSite();
  return rss({
    title: `${site.profile.name}의 기록`,
    description: site.profile.bio,
    site: context.site!,
    items: site.posts.map((p) => ({
      title: p.title,
      description: p.summary,
      pubDate: new Date(p.publishedAt),
      link: p.href,
    })),
    customData: '<language>ko-KR</language>',
  });
}
