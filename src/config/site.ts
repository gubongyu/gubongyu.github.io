import { withBase } from '../core/urls';
export const path = (value = '') => withBase(value, import.meta.env.BASE_URL);
export const navigation = [
  { label: '홈', href: path() },
  { label: '글', href: path('blog/') },
  { label: '프로젝트', href: path('projects/') },
  { label: '소개', href: path('about/') },
];
