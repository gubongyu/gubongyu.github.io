export interface Publication {
  id: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt?: string;
  draft: boolean;
  sample: boolean;
  tags: string[];
}
export interface Post extends Publication {
  section: 'dev' | 'life';
  relatedProjects: string[];
  readingMinutes: number;
}
export interface Project extends Publication {
  status: 'building' | 'released' | 'archived';
  featured: boolean;
  role: string;
  stack: string[];
  startedAt: string;
  repositoryUrl?: string;
  demoUrl?: string;
  relatedPosts: string[];
  interactive?: 'met-a-round-pipeline';
  cover?: string;
  coverAlt?: string;
}
export interface Profile {
  name: string;
  handle: string;
  headline: string;
  bio: string;
  status: string;
  sample: boolean;
  skillGroups: { label: string; items: string[] }[];
  timeline: { year: string; title: string; description: string }[];
  socialLinks: { label: string; url: string }[];
  email?: string;
}
export interface ExternalBlog {
  id: string;
  title: string;
  description: string;
  url: string;
  section: 'dev' | 'life';
}
