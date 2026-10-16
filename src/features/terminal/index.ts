import { safeReturnPath } from '../../core/urls';
import { runCommand, completeCommand, type TerminalContext, type TerminalState } from './commands';
export function mountTerminal(root: HTMLElement) {
  const context = JSON.parse(
    root.querySelector('[data-terminal-data]')!.textContent!,
  ) as TerminalContext;
  const output = root.querySelector<HTMLElement>('[data-terminal-output]')!;
  const input = root.querySelector<HTMLInputElement>('[data-terminal-input]')!;
  const form = root.querySelector<HTMLFormElement>('form')!;
  const preview = root.querySelector<HTMLElement>('[data-terminal-preview]')!;
  const status = root.querySelector<HTMLElement>('[data-terminal-status]')!;
  const returnPath = safeReturnPath(
    new URLSearchParams(location.search).get('from'),
    import.meta.env.BASE_URL,
  );
  root
    .querySelectorAll<HTMLAnchorElement>('[data-terminal-exit]')
    .forEach((link) => (link.href = returnPath));
  let state: TerminalState = { cwd: '~', history: [] },
    historyIndex = 0;
  const abort = new AbortController();
  function execute(raw: string) {
    const prompt = document.createElement('p');
    prompt.className = 'command-echo';
    for (const [className, text] of [
      ['shell-user', `guest@${context.name.toLowerCase()}`],
      ['shell-path', state.cwd],
      ['prompt-sign', '❯'],
    ]) {
      const segment = document.createElement('span');
      segment.className = className!;
      segment.textContent = text!;
      prompt.append(segment, ' ');
    }
    prompt.append(document.createTextNode(raw));
    output.append(prompt);
    const response = runCommand(state, raw, context);
    state = response.state;
    historyIndex = state.history.length;
    for (const line of response.lines) {
      const element = document.createElement(line.href ? 'a' : line.command ? 'button' : 'p');
      element.textContent = line.text;
      if (line.muted) element.classList.add('dim');
      if (line.href && element instanceof HTMLAnchorElement) element.href = line.href;
      if (line.command && element instanceof HTMLButtonElement) {
        element.type = 'button';
        element.addEventListener('click', () => {
          execute(line.command!);
          input.focus();
        });
      }
      output.append(element);
    }
    for (const effect of response.effects) {
      if (effect.kind === 'clear') {
        output.replaceChildren();
        root.querySelector<HTMLElement>('[data-terminal-intro]')?.remove();
      }
      if (effect.kind === 'exit') location.href = returnPath;
      if (effect.kind === 'search')
        location.href = `${import.meta.env.BASE_URL}search/?q=${encodeURIComponent(effect.query)}`;
      if (effect.kind === 'theme') {
        document.documentElement.dataset.theme = effect.value;
        try {
          localStorage.setItem('studio-theme', effect.value);
        } catch {}
        window.dispatchEvent(new CustomEvent('studio:preferences'));
      }
      if (effect.kind === 'preview') {
        const label = document.createElement('p');
        label.className = 'eyebrow';
        label.textContent = effect.item.kind === 'post' ? 'WRITING / PREVIEW' : 'PROJECT / PREVIEW';
        const title = document.createElement('h2');
        title.textContent = effect.item.title;
        const summary = document.createElement('p');
        summary.textContent = effect.item.summary;
        const tags = document.createElement('p');
        tags.className = 'preview-tags';
        tags.textContent = effect.item.tags.map((t) => `#${t}`).join('  ');
        const link = document.createElement('a');
        link.href = effect.item.href;
        link.textContent = '전체 내용 읽기 ↗';
        link.className = 'preview-link';
        preview.replaceChildren(label, title, summary, tags, link);
      }
    }
    while (output.children.length > 200) output.firstElementChild?.remove();
    root.querySelectorAll('[data-cwd]').forEach((el) => (el.textContent = state.cwd));
    output.scrollTop = output.scrollHeight;
    status.textContent = response.lines
      .map((l) => l.text)
      .join(' ')
      .slice(0, 700);
    input.value = '';
  }
  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      execute(input.value);
    },
    { signal: abort.signal },
  );
  input.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        historyIndex = Math.max(
          0,
          Math.min(state.history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)),
        );
        input.value = state.history[historyIndex] || '';
      }
      if (event.key === 'Tab' && input.value) {
        const suggestions = completeCommand(input.value, state, context.items);
        if (suggestions.length === 1 && suggestions[0] !== input.value) {
          event.preventDefault();
          input.value = suggestions[0]!;
        }
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        execute('clear');
      }
      if (event.key === 'Escape') {
        input.blur();
        root.querySelector<HTMLAnchorElement>('[data-terminal-exit]')?.focus();
      }
    },
    { signal: abort.signal },
  );
  root.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        execute(button.dataset.command!);
        input.focus();
      },
      { signal: abort.signal },
    ),
  );
  return () => abort.abort();
}
