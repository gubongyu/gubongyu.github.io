import type { Profile, ExternalBlog, Post, Project } from '../../core/content';
export type PostVM = Post & {
  href: string;
  dateLabel: string;
  sectionLabel: string;
  tagLinks: { label: string; href: string }[];
};
export type ProjectVM = Project & {
  href: string;
  dateLabel: string;
  statusLabel: string;
  tagLinks: { label: string; href: string }[];
};
export interface PublicIndexItem {
  id: string;
  kind: 'post' | 'project';
  slug: string;
  title: string;
  summary: string;
  href: string;
  tags: string[];
  section?: 'dev' | 'life';
}
export interface SiteVM {
  profile: Profile;
  externalBlogs: ExternalBlog[];
  posts: PostVM[];
  projects: ProjectVM[];
  tags: { name: string; href: string; count: number }[];
  index: PublicIndexItem[];
}
export interface SEO {
  title: string;
  description: string;
  type?: 'website' | 'article';
  publishedAt?: string;
  sample?: boolean;
}
