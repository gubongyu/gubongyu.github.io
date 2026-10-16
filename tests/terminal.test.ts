import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runCommand,
  normalizePath,
  completeCommand,
  type TerminalContext,
} from '../src/features/terminal/commands';
import { matchesFilter } from '../src/features/filters';
const context: TerminalContext = {
  name: 'Tester',
  bio: 'bio',
  contacts: [],
  items: [
    {
      id: 'a',
      kind: 'post',
      slug: 'hello',
      title: '안녕',
      summary: '요약',
      href: '/profile/blog/posts/hello/',
      tags: ['Astro'],
      section: 'dev',
    },
  ],
};
test('terminal traverses nested folders and previews canonical content', () => {
  const initial = { cwd: '~', history: [] };
  const changed = runCommand(initial, 'cd blog/dev', context);
  assert.equal(changed.state.cwd, '~/blog/dev');
  assert.match(changed.lines[0]!.text, /hello.md/);
  const opened = runCommand(changed.state, 'cat hello.md', context);
  assert.equal(opened.effects[0]?.kind, 'preview');
  assert.equal(opened.lines.at(-1)?.href, '/profile/blog/posts/hello/');
  assert.equal(initial.cwd, '~');
  assert.equal(initial.history.length, 0);
});
test('invalid commands are inert and paths cannot leave virtual root', () => {
  const result = runCommand({ cwd: '~', history: [] }, 'rm -rf /', context);
  assert.deepEqual(result.effects, []);
  assert.match(result.lines[0]!.text, /알 수 없는 명령어/);
  assert.equal(normalizePath('~/blog', '../../../../'), '~');
  assert.deepEqual(completeCommand('who', { cwd: '~', history: [] }, context.items), ['whoami']);
});
test('tag filters combine exact tag with case-insensitive text', () => {
  assert.equal(matchesFilter('Astro 디자인', ['Astro'], { q: 'astro', tag: 'Astro' }), true);
  assert.equal(matchesFilter('Astro 디자인', ['Astro'], { q: 'astro', tag: 'CSS' }), false);
});
