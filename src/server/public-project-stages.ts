import { readRenderedProjectStages } from '../adapters/astro-content/project-stages';
import { getSite } from './public-content';

export async function getPublicProjectStages(projectId: string) {
  const project = (await getSite()).projects.find((item) => item.id === projectId);
  if (!project) throw new Error(`공개되지 않은 프로젝트입니다: ${projectId}`);
  if (!project.interactive) return [];

  const stages = await readRenderedProjectStages(projectId);
  if (project.interactive === 'met-a-round-pipeline') {
    if (stages.length !== 10 || stages.some((stage, index) => stage.order !== index + 1))
      throw new Error(`${projectId}: 공개 단계는 순서대로 10개여야 합니다.`);
  }
  return stages;
}
