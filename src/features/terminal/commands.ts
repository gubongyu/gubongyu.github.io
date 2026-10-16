import type { PublicIndexItem } from '../../application/contracts';
export interface TerminalState {
  cwd: string;
  history: string[];
}
export interface TerminalLine {
  text: string;
  href?: string;
  command?: string;
  muted?: boolean;
}
export interface TerminalContext {
  items: PublicIndexItem[];
  name: string;
  bio: string;
  contacts: { label: string; url: string }[];
  email?: string;
}
export type Effect =
  | { kind: 'preview'; item: PublicIndexItem }
  | { kind: 'theme'; value: 'light' | 'dark' }
  | { kind: 'search'; query: string }
  | { kind: 'exit' }
  | { kind: 'clear' };
export interface CommandResult {
  state: TerminalState;
  lines: TerminalLine[];
  effects: Effect[];
}
export const commandNames = [
  'help',
  'ls',
  'cd',
  'pwd',
  'cat',
  'grep',
  'whoami',
  'contact',
  'blog',
  'projects',
  'search',
  'theme',
  'history',
  'clear',
  'exit',
];
const directories = ['~', '~/blog', '~/blog/dev', '~/blog/life', '~/projects'];
export function itemPath(item: PublicIndexItem) {
  return item.kind === 'project'
    ? `~/projects/${item.slug}.md`
    : `~/blog/${item.section}/${item.slug}.md`;
}
export function normalizePath(cwd: string, input: string) {
  const path = input.startsWith('~')
    ? input
    : input.startsWith('/')
      ? `~${input}`
      : `${cwd}/${input}`;
  const segments: string[] = [];
  for (const bit of path.replace(/^~\/?/, '').split('/')) {
    if (bit === '..') segments.pop();
    else if (bit && bit !== '.') segments.push(bit);
  }
  return `~${segments.length ? '/' + segments.join('/') : ''}`;
}
export function completeCommand(input: string, state: TerminalState, items: PublicIndexItem[]) {
  if (!input.includes(' ')) return commandNames.filter((c) => c.startsWith(input));
  const split = input.lastIndexOf(' '),
    head = input.slice(0, split + 1),
    value = input.slice(split + 1);
  const absolute = normalizePath(state.cwd, value);
  const paths = [...directories, '~/about.md', ...items.map(itemPath)];
  return paths.filter((p) => p.startsWith(absolute)).map((p) => `${head}${p}`);
}
export function runCommand(
  state: TerminalState,
  input: string,
  context: TerminalContext,
): CommandResult {
  const raw = input.trim();
  const [command = '', ...args] = raw.split(/\s+/);
  const argument = args.join(' ');
  const next: TerminalState = {
    cwd: state.cwd,
    history: raw ? [...state.history, raw].slice(-100) : state.history,
  };
  const result: CommandResult = { state: next, lines: [], effects: [] };
  const say = (text: string, options: Omit<TerminalLine, 'text'> = {}) =>
    result.lines.push({ text, ...options });
  const list = (dir: string) => {
    if (!directories.includes(dir)) {
      say(`디렉터리를 찾을 수 없습니다: ${dir}`);
      return;
    }
    for (const p of directories.filter((p) => p !== dir && p.slice(0, p.lastIndexOf('/')) === dir))
      say(`${p.split('/').at(-1)}/`, { command: `cd ${p}` });
    if (dir === '~') say('about.md', { command: 'whoami' });
    for (const item of context.items.filter(
      (i) => itemPath(i).slice(0, itemPath(i).lastIndexOf('/')) === dir,
    ))
      say(`${item.slug}.md  —  ${item.title}`, { command: `cat ${itemPath(item)}` });
  };
  switch (command.toLowerCase()) {
    case '':
      break;
    case 'help':
      say('명령어를 입력하거나 출력된 항목을 클릭하세요.');
      [
        ['ls / cd / pwd', '폴더 탐색'],
        ['cat <file>', '기록 미리보기'],
        ['blog / projects', '글 / 프로젝트 목록'],
        ['grep <tag>', '태그로 찾기'],
        ['whoami / contact', '소개 / 연락처'],
        ['search <query>', '전체 검색'],
        ['theme light|dark', '일반 페이지 색상 설정'],
        ['history / clear', '기록 보기 / 화면 지우기'],
        ['exit', '일반 페이지로 돌아가기'],
      ].forEach(([a, b]) => say(`${a!.padEnd(23)}${b}`));
      break;
    case 'ls':
      list(argument ? normalizePath(state.cwd, argument) : state.cwd);
      break;
    case 'cd': {
      const dir = normalizePath(state.cwd, argument || '~');
      if (directories.includes(dir)) {
        next.cwd = dir;
        list(dir);
      } else say(`디렉터리를 찾을 수 없습니다: ${dir}`);
      break;
    }
    case 'pwd':
      say(state.cwd);
      break;
    case 'blog':
      next.cwd = '~/blog';
      list(next.cwd);
      break;
    case 'projects':
      next.cwd = '~/projects';
      list(next.cwd);
      break;
    case 'cat': {
      if (!argument) {
        say('사용법: cat <file>');
        break;
      }
      const full = normalizePath(state.cwd, argument);
      if (full === '~/about.md') {
        say(context.name);
        say(context.bio);
        break;
      }
      const item = context.items.find((i) => itemPath(i) === full);
      if (!item) {
        say(`파일을 찾을 수 없습니다: ${argument}`);
        break;
      }
      say(item.title);
      say(item.summary, { muted: true });
      say('일반 페이지에서 읽기 ↗', { href: item.href });
      result.effects.push({ kind: 'preview', item });
      break;
    }
    case 'grep': {
      const matches = context.items.filter((i) =>
        i.tags.some((t) => t.toLowerCase() === argument.replace(/^#/, '').toLowerCase()),
      );
      if (!matches.length) say('일치하는 태그가 없습니다.');
      matches.forEach((i) => say(i.title, { command: `cat ${itemPath(i)}` }));
      break;
    }
    case 'whoami':
      say(context.name);
      say(context.bio);
      break;
    case 'contact':
      if (!context.contacts.length && !context.email) say('아직 공개된 연락처가 없습니다.');
      context.contacts.forEach((c) => say(c.label, { href: c.url }));
      if (context.email) say(context.email, { href: `mailto:${context.email}` });
      break;
    case 'search':
      if (!argument) say('사용법: search <query>');
      else result.effects.push({ kind: 'search', query: argument });
      break;
    case 'theme':
      if (argument === 'light' || argument === 'dark') {
        result.effects.push({ kind: 'theme', value: argument });
        say(`일반 페이지를 ${argument} 테마로 설정했습니다. 터미널은 다크 화면을 유지합니다.`);
      } else say('사용법: theme light 또는 theme dark');
      break;
    case 'history':
      state.history.forEach((h, i) => say(`${i + 1}  ${h}`));
      break;
    case 'clear':
      result.effects.push({ kind: 'clear' });
      break;
    case 'exit':
      result.effects.push({ kind: 'exit' });
      break;
    default:
      say(`알 수 없는 명령어: ${command}. help로 사용법을 확인하세요.`);
  }
  return result;
}
