import type { Post, Project, Profile, ExternalBlog } from '../core/content';
export interface ContentSource {
  readPosts(): Promise<Post[]>;
  readProjects(): Promise<Project[]>;
  readProfile(): Promise<Profile>;
  readExternalBlogs(): Promise<ExternalBlog[]>;
}
