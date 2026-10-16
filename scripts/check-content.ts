import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { contentImages } from './content-markdown';
import {
  postSchema,
  projectSchema,
  projectStageSchema,
  profileSchema,
  externalBlogSchema,
} from '../src/adapters/astro-content/schema';

async function walk(dir: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((d) =>
        d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
      ),
    )
  ).flat();
}
const files = (await walk('content')).filter((f) => f.endsWith('.md'));
const ids = new Map<string, string>(),
  slugs = new Map<string, string>();
const projects = new Map<string, { interactive?: string; cover?: string }>();
const stages: { file: string; projectId: string; order: number; image: string; draft: boolean }[] =
  [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match?.[1]) throw new Error(`${file}: YAML frontmatter가 없습니다.`);
  const kind = file.startsWith('content/posts/')
    ? 'posts'
    : file.startsWith('content/project-stages/')
      ? 'projectStages'
      : 'projects';
  const data = (
    kind === 'posts' ? postSchema : kind === 'projects' ? projectSchema : projectStageSchema
  ).parse(parse(match[1]));
  if (ids.has(data.id)) throw new Error(`중복 ID ${data.id}: ${ids.get(data.id)}, ${file}`);
  ids.set(data.id, file);
  if ('slug' in data) {
    const slugKey = `${kind}/${data.slug}`;
    if (slugs.has(slugKey)) throw new Error(`중복 slug ${slugKey}: ${slugs.get(slugKey)}, ${file}`);
    slugs.set(slugKey, file);
  }
  if ('section' in data && !file.startsWith(`content/posts/${data.section}/`))
    throw new Error(`${file}: section과 폴더가 일치하지 않습니다.`);
  if (kind === 'projects' && 'interactive' in data) {
    projects.set(data.id, { interactive: data.interactive, cover: data.cover });
    if (data.cover) await access(path.join('public', data.cover.slice(1)));
  }
  if (kind === 'projectStages' && 'projectId' in data) {
    stages.push({
      file,
      projectId: data.projectId,
      order: data.order,
      image: data.image,
      draft: data.draft,
    });
    await access(path.join('public', data.image.slice(1)));
  }
  let images: ReturnType<typeof contentImages>;
  try {
    images = contentImages(text.slice(match[0].length));
  } catch (error) {
    throw new Error(`${file}: ${(error as Error).message}`);
  }
  for (const { url } of images) {
    if (/^https?:\/\//.test(url)) continue;
    const target = path.resolve(path.dirname(file), url);
    if (!target.startsWith(path.resolve('content') + path.sep))
      throw new Error(`${file}: 콘텐츠 이미지는 content/ 안에 둡니다.`);
    try {
      await access(target);
    } catch {
      throw new Error(`${file}: 이미지 없음 ${url}`);
    }
  }
}
for (const stage of stages) {
  const project = projects.get(stage.projectId);
  if (!project) throw new Error(`${stage.file}: 없는 프로젝트 ${stage.projectId}`);
  if (!project.interactive) throw new Error(`${stage.file}: 인터랙티브 프로젝트가 아닙니다.`);
}
for (const [projectId, project] of projects) {
  if (project.interactive !== 'met-a-round-pipeline') continue;
  const publicStages = stages.filter((stage) => stage.projectId === projectId && !stage.draft);
  const orders = publicStages.map((stage) => stage.order).sort((a, b) => a - b);
  if (orders.length !== 10 || orders.some((order, index) => order !== index + 1))
    throw new Error(`${projectId}: 공개 단계는 순서대로 10개여야 합니다.`);
}
const profiles = Object.values(JSON.parse(await readFile('content/profile/profile.json', 'utf8')));
if (profiles.length !== 1) throw new Error('프로필은 한 개여야 합니다.');
profileSchema.parse(profiles[0]);
const external = externalBlogSchema
  .array()
  .parse(JSON.parse(await readFile('content/external-blogs.json', 'utf8')));
if (new Set(external.map((e) => e.id)).size !== external.length)
  throw new Error('외부 블로그 ID가 중복되었습니다.');
console.log(
  `Content source verified: ${files.length} Markdown files, profile, external blogs, unique IDs and slugs.`,
);
