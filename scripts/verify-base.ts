import { spawnSync } from 'node:child_process';
const run = (script: string, args: string[], env: NodeJS.ProcessEnv) =>
  spawnSync(script, args, { stdio: 'inherit', env }).status ?? 1;
const baseEnv = {
  ...process.env,
  SITE_URL: 'https://example.test',
  BASE_PATH: '/profile/',
  ASTRO_TELEMETRY_DISABLED: '1',
};
let result = 1;
try {
  result = run('node_modules/.bin/tsx', ['scripts/build.ts'], baseEnv);
  if (result === 0)
    result = run(
      'node_modules/.bin/playwright',
      ['test', '--config', 'playwright.base.config.ts'],
      baseEnv,
    );
} finally {
  // Always restore the regular artifact used by local preview.
  const restored = run('node_modules/.bin/tsx', ['scripts/build.ts'], {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: '1',
  });
  if (restored !== 0) result = restored;
}
process.exit(result);
