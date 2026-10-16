import type { PublicIndexItem } from '../../application/contracts';
export interface SearchResult {
  title: string;
  excerpt: string;
  href: string;
}
interface Pagefind {
  options(options: { baseUrl: string }): Promise<void>;
  search(query: string): Promise<{
    results: { data(): Promise<{ meta: { title?: string }; excerpt: string; url: string }> }[];
  }>;
}
export function createSearchAdapter(base: string, fallback: PublicIndexItem[]) {
  let engine: Promise<Pagefind> | undefined;
  return async (query: string): Promise<{ results: SearchResult[]; fallback: boolean }> => {
    if (!query.trim()) return { results: [], fallback: false };
    try {
      engine ??= import(/* @vite-ignore */ `${base}pagefind/pagefind.js`).then(
        async (module: Pagefind) => {
          await module.options({ baseUrl: base });
          return module;
        },
      );
      const index = await engine;
      const response = await index.search(query);
      const data = await Promise.all(response.results.slice(0, 20).map((r) => r.data()));
      return {
        results: data.map((d) => ({
          title: d.meta.title || '제목 없는 기록',
          excerpt: d.excerpt.replace(/<[^>]*>/g, ''),
          href: d.url,
        })),
        fallback: false,
      };
    } catch {
      // Static metadata remains usable in dev and if the search bundle is unavailable.
      engine = undefined;
      const words = query.toLocaleLowerCase().trim().split(/\s+/);
      return {
        results: fallback
          .filter((item) =>
            words.every((word) =>
              `${item.title} ${item.summary} ${item.tags.join(' ')}`
                .toLocaleLowerCase()
                .includes(word),
            ),
          )
          .map((item) => ({ title: item.title, excerpt: item.summary, href: item.href })),
        fallback: true,
      };
    }
  };
}
