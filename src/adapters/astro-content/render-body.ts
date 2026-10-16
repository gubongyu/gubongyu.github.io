import { getEntry, render } from 'astro:content';
export async function renderBody(kind: 'posts' | 'projects', id: string) {
  const entry = await getEntry(kind, id);
  if (!entry) throw new Error(`본문이 없습니다: ${id}`);
  return render(entry);
}
