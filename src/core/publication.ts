import type { Publication } from './content';
export function isPublic(item: Publication, now: string): boolean {
  return !item.draft && Date.parse(item.publishedAt) <= Date.parse(now);
}
export function newestFirst<T extends Publication>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id),
  );
}
