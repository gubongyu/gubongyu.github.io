import { getCollection, render } from 'astro:content';

export async function readRenderedProjectStages(projectId: string) {
  const entries = (await getCollection('projectStages'))
    .filter((entry) => entry.data.projectId === projectId && !entry.data.draft)
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
  return Promise.all(
    entries.map(async (entry) => ({
      ...entry.data,
      Content: (await render(entry)).Content,
    })),
  );
}
