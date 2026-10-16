import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

const env = {
  ...loadEnv(process.env.NODE_ENV || 'development', process.cwd(), ''),
  ...process.env,
};
const base = `/${(env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '')}`.replace(/\/?$/, '/');
export default defineConfig({
  site: env.SITE_URL || 'https://example.invalid',
  base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (url) => !/\/(search|terminal)\/$/.test(url) })],
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false },
  },
  vite: {
    // 3D 장면은 지연 로드되므로 미리 묶어 두지 않으면 개발 서버가 처음 요청에서
    // 의존성을 다시 최적화하며 504를 돌려주고, 파이프라인이 정적 목록으로 떨어진다.
    optimizeDeps: {
      include: [
        'three',
        'three/addons/geometries/RoundedBoxGeometry.js',
        'three/examples/jsm/lines/LineMaterial.js',
        'three/examples/jsm/lines/LineSegments2.js',
        'three/examples/jsm/lines/LineSegmentsGeometry.js',
      ],
    },
    define: {
      __BUILD_TIME__: JSON.stringify(process.env.BUILD_TIME || new Date().toISOString()),
      __SITE_CONFIGURED__: JSON.stringify(Boolean(env.SITE_URL)),
    },
  },
});
