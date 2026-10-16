import { renderBody } from '../adapters/astro-content/render-body';
import { getSite } from './public-content';
export async function renderPublicBody(kind: 'posts' | 'projects', id: string) {
  const site = await getSite();
  if (!site[kind].some((p) => p.id === id)) throw new Error('공개되지 않은 본문입니다.');
  return renderBody(kind, id);
}
