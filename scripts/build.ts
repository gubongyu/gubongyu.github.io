import { spawnSync } from 'node:child_process';
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const env = { ...process.env, BUILD_TIME: process.env.BUILD_TIME || new Date().toISOString() };
for (const [command, args] of [
  ['node_modules/.bin/tsx', ['scripts/check-content.ts']],
  ['node_modules/.bin/astro', ['build']],
  ['node_modules/.bin/pagefind', ['--site', 'dist', '--glob', '**/*.html']],
  ['node_modules/.bin/tsx', ['scripts/check-output.ts']],
] as const) {
  const result = spawnSync(command, [...args], { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status || 1);
}
