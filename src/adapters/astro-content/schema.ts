import { z } from 'astro/zod';
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const tag = z
  .string()
  .trim()
  .min(1)
  .refine(
    (v) => !/[\\/?#%]/.test(v) && v !== '.' && v !== '..',
    '태그에 경로 구분자를 사용할 수 없습니다.',
  );
const webUrl = z.url().refine((v) => /^https?:\/\//.test(v), 'HTTP(S) URL이어야 합니다.');
const publication = {
  id: slug,
  slug,
  title: z.string().min(1),
  summary: z.string().min(1),
  publishedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
  draft: z.boolean().default(false),
  sample: z.boolean().default(false),
  tags: z.array(tag).default([]),
};
export const postSchema = z.object({
  ...publication,
  section: z.enum(['dev', 'life']),
  relatedProjects: z.array(slug).default([]),
});
export const projectSchema = z
  .object({
    ...publication,
    status: z.enum(['building', 'released', 'archived']),
    featured: z.boolean().default(false),
    role: z.string(),
    stack: z.array(z.string()),
    startedAt: z.string(),
    repositoryUrl: webUrl.optional(),
    demoUrl: webUrl.optional(),
    relatedPosts: z.array(slug).default([]),
    interactive: z.enum(['met-a-round-pipeline']).optional(),
    cover: z
      .string()
      .regex(/^\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp|avif)$/)
      .optional(),
    coverAlt: z.string().min(1).optional(),
  })
  .refine((project) => Boolean(project.cover) === Boolean(project.coverAlt), {
    message: 'cover와 coverAlt는 함께 입력해야 합니다.',
  });
export const projectStageSchema = z.object({
  id: slug,
  projectId: slug,
  order: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  image: z.string().regex(/^\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp|avif)$/),
  relatedPostId: slug.optional(),
  draft: z.boolean().default(false),
});
export const profileSchema = z.object({
  name: z.string(),
  handle: z.string(),
  headline: z.string(),
  bio: z.string(),
  status: z.string(),
  sample: z.boolean().default(false),
  skillGroups: z.array(z.object({ label: z.string().min(1), items: z.array(z.string().min(1)) })),
  timeline: z.array(z.object({ year: z.string(), title: z.string(), description: z.string() })),
  socialLinks: z.array(z.object({ label: z.string(), url: webUrl })),
  email: z.email().optional(),
});
export const externalBlogSchema = z.object({
  id: slug,
  title: z.string(),
  description: z.string(),
  url: webUrl,
  section: z.enum(['dev', 'life']),
});
