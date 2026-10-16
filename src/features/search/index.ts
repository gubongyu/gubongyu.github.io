import { createSearchAdapter } from './adapter';
import type { PublicIndexItem } from '../../application/contracts';
export function mountSearch(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-search-input]')!;
  const form = root.querySelector<HTMLFormElement>('form')!;
  const results = root.querySelector<HTMLElement>('[data-search-results]')!;
  const status = root.querySelector<HTMLElement>('[data-search-status]')!;
  const fallback = JSON.parse(
    root.querySelector('[data-search-index]')!.textContent!,
  ) as PublicIndexItem[];
  // 디자인이 장식용 화살표를 template로 넘기면 그것을 쓰고, 없으면 글리프로 대신한다.
  const arrowTemplate = root.querySelector<HTMLTemplateElement>('template[data-search-arrow]');
  const search = createSearchAdapter(import.meta.env.BASE_URL, fallback);
  const abort = new AbortController();
  let request = 0,
    timer: ReturnType<typeof setTimeout>;
  async function run(updateUrl = true) {
    const id = ++request,
      query = input.value.trim();
    if (updateUrl) {
      const url = new URL(location.href);
      if (query) url.searchParams.set('q', query);
      else url.searchParams.delete('q');
      history.replaceState({}, '', url);
    }
    if (!query) {
      results.replaceChildren();
      status.textContent = '어떤 기록을 찾고 있나요?';
      return;
    }
    status.textContent = '기록을 찾고 있습니다…';
    const response = await search(query);
    if (id !== request || abort.signal.aborted) return;
    results.replaceChildren(
      ...response.results.map((item) => {
        const article = document.createElement('article');
        const link = document.createElement('a');
        link.href = item.href;
        const title = document.createElement('h2');
        title.textContent = item.title;
        const excerpt = document.createElement('p');
        excerpt.textContent = item.excerpt;
        const arrow = document.createElement('span');
        if (arrowTemplate) arrow.append(arrowTemplate.content.cloneNode(true));
        else arrow.textContent = '↗';
        arrow.setAttribute('aria-hidden', 'true');
        link.append(title, excerpt, arrow);
        article.append(link);
        return article;
      }),
    );
    status.textContent = `${response.results.length ? `${response.results.length}개의 기록을 찾았습니다.` : '일치하는 기록이 없습니다. 다른 검색어를 입력해 보세요.'}${response.fallback ? ' 현재 제목·요약·태그에서 검색합니다.' : ''}`;
  }
  input.value = new URLSearchParams(location.search).get('q') || '';
  input.addEventListener(
    'input',
    () => {
      request++;
      clearTimeout(timer);
      timer = setTimeout(() => void run(), 180);
    },
    { signal: abort.signal },
  );
  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      clearTimeout(timer);
      void run();
    },
    { signal: abort.signal },
  );
  window.addEventListener(
    'popstate',
    () => {
      input.value = new URLSearchParams(location.search).get('q') || '';
      void run(false);
    },
    { signal: abort.signal },
  );
  root.querySelectorAll<HTMLButtonElement>('[data-search-suggestion]').forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        input.value = button.dataset.searchSuggestion!;
        void run();
        input.focus();
      },
      { signal: abort.signal },
    ),
  );
  void run(false);
  return () => {
    abort.abort();
    request++;
    clearTimeout(timer);
  };
}
