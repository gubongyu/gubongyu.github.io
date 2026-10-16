export interface FilterState {
  q: string;
  tag: string;
}
export function matchesFilter(text: string, tags: string[], state: FilterState) {
  return (
    (!state.tag || tags.includes(state.tag)) &&
    text.toLocaleLowerCase().includes(state.q.toLocaleLowerCase().trim())
  );
}
export function mountFilters(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-filter-input]');
  const select = root.querySelector<HTMLSelectElement>('[data-filter-tag]');
  const items = [...root.querySelectorAll<HTMLElement>('[data-filter-item]')];
  const status = root.querySelector<HTMLElement>('[data-filter-status]');
  const empty = root.querySelector<HTMLElement>('[data-filter-empty]');
  const abort = new AbortController();
  const render = () => {
    const state = { q: input?.value || '', tag: select?.value || '' };
    let count = 0;
    for (const item of items) {
      item.hidden = !matchesFilter(
        item.dataset.searchText || '',
        JSON.parse(item.dataset.tags || '[]'),
        state,
      );
      if (!item.hidden) count++;
    }
    if (status) status.textContent = `${count}개의 기록`;
    if (empty) empty.hidden = count > 0;
  };
  const restore = () => {
    const params = new URLSearchParams(location.search);
    if (input) input.value = params.get('q') || '';
    if (select)
      select.value = [...select.options].some((o) => o.value === params.get('tag'))
        ? params.get('tag')!
        : '';
    render();
  };
  const update = (push: boolean) => {
    const url = new URL(location.href);
    for (const [key, value] of [
      ['q', input?.value],
      ['tag', select?.value],
    ]) {
      if (!key) continue;
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    history[push ? 'pushState' : 'replaceState']({}, '', url);
    render();
  };
  input?.addEventListener('input', () => update(false), { signal: abort.signal });
  select?.addEventListener('change', () => update(true), { signal: abort.signal });
  root.querySelector('[data-filter-reset]')?.addEventListener(
    'click',
    () => {
      if (input) input.value = '';
      if (select) select.value = '';
      update(true);
      input?.focus();
    },
    { signal: abort.signal },
  );
  window.addEventListener('popstate', restore, { signal: abort.signal });
  root.querySelectorAll<HTMLElement>('[data-enhanced-filter]').forEach((el) => (el.hidden = false));
  restore();
  return () => abort.abort();
}
