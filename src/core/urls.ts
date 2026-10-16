export function withBase(path: string, base = '/'): string {
  const prefix = `/${base.replace(/^\/+|\/+$/g, '')}`.replace(/\/?$/, '/');
  return `${prefix}${path.replace(/^\/+/, '')}`;
}
export function postPath(slug: string): string {
  return `blog/posts/${encodeURIComponent(slug)}/`;
}
export function projectPath(slug: string): string {
  return `projects/${encodeURIComponent(slug)}/`;
}
export function tagPath(tag: string): string {
  return `tags/${encodeURIComponent(tag)}/`;
}
export function safeReturnPath(value: string | null, base: string): string {
  const fallback = withBase('', base);
  if (!value || !value.startsWith(fallback) || value.startsWith('//') || /[\\\r\n]/.test(value))
    return fallback;
  try {
    const url = new URL(value, 'https://local.invalid');
    return url.origin === 'https://local.invalid' && url.pathname.startsWith(fallback)
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
