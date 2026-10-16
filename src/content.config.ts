import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import {
  postSchema,
  projectSchema,
  projectStageSchema,
  profileSchema,
  externalBlogSchema,
} from './adapters/astro-content/schema';
export const collections = {
  posts: defineCollection({
    loader: glob({
      pattern: '**/*.md',
      base: './content/posts',
      generateId: ({ data }) => String(data.id),
    }),
    schema: postSchema,
  }),
  projects: defineCollection({
    loader: glob({
      pattern: '*.md',
      base: './content/projects',
      generateId: ({ data }) => String(data.id),
    }),
    schema: projectSchema,
  }),
  projectStages: defineCollection({
    loader: glob({
      pattern: '**/*.md',
      base: './content/project-stages',
      generateId: ({ data }) => String(data.id),
    }),
    schema: projectStageSchema,
  }),
  profile: defineCollection({
    loader: file('./content/profile/profile.json'),
    schema: profileSchema,
  }),
  externalBlogs: defineCollection({
    loader: file('./content/external-blogs.json'),
    schema: externalBlogSchema,
  }),
};
