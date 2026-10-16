import { getCollection } from 'astro:content';
import type { ContentSource } from '../../application/content-source';
export const astroContentSource: ContentSource = {
  async readPosts() {
    return (await getCollection('posts')).map((entry) => {
      if (
        entry.filePath &&
        !entry.filePath.replaceAll('\\', '/').includes(`/posts/${entry.data.section}/`)
      )
        throw new Error(`${entry.id}: 폴더와 section이 일치해야 합니다.`);
      return {
        ...entry.data,
        readingMinutes: Math.max(1, Math.ceil((entry.body?.length || 0) / 600)),
      };
    });
  },
  async readProjects() {
    return (await getCollection('projects')).map((e) => e.data);
  },
  async readProfile() {
    const items = await getCollection('profile');
    if (items.length !== 1 || !items[0]) throw new Error('프로필은 한 개여야 합니다.');
    return items[0].data;
  },
  async readExternalBlogs() {
    return (await getCollection('externalBlogs')).map((e) => e.data);
  },
};
