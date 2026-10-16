import { safeReturnPath } from '../../core/urls';
export function mountPreferences() {
  const root = document.documentElement;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = matchMedia('(prefers-color-scheme: dark)');
  const read = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  };
  const sync = () => {
    root.dataset.motion = media.matches || read('studio-motion') === 'off' ? 'off' : 'on';
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]')) {
      button.textContent = media.matches
        ? '동작 줄이기 사용 중'
        : root.dataset.motion === 'off'
          ? '움직임 켜기'
          : '움직임 끄기';
      button.setAttribute('aria-pressed', String(root.dataset.motion === 'off'));
      button.disabled = media.matches;
    }
    for (const button of document.querySelectorAll('[data-theme-toggle]'))
      button.setAttribute(
        'aria-label',
        root.dataset.theme === 'dark' ? '라이트 테마로 변경' : '다크 테마로 변경',
      );
    window.dispatchEvent(new CustomEvent('studio:preferences'));
  };
  document.querySelectorAll('[data-theme-toggle]').forEach((button) =>
    button.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      write('studio-theme', root.dataset.theme);
      sync();
    }),
  );
  document.querySelectorAll('[data-motion-toggle]').forEach((button) =>
    button.addEventListener('click', () => {
      write('studio-motion', root.dataset.motion === 'off' ? 'on' : 'off');
      sync();
    }),
  );
  colors.addEventListener('change', () => {
    if (!read('studio-theme')) {
      root.dataset.theme = colors.matches ? 'dark' : 'light';
      sync();
    }
  });
  media.addEventListener('change', sync);
  const base = import.meta.env.BASE_URL;
  document.querySelectorAll<HTMLAnchorElement>('[data-terminal-link]').forEach((link) => {
    link.href += `?from=${encodeURIComponent(safeReturnPath(location.pathname + location.search, base))}`;
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const input = document.querySelector<HTMLInputElement>('[data-search-input]');
      if (input) input.focus();
      else location.href = `${base}search/`;
    }
  });
  sync();
}
