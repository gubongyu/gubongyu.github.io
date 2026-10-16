/* Light scroll reveal with stagger.
 * Content is visible by default. This script only marks elements that are still
 * below the fold, then lets them rise in as they scroll into view; the styles in
 * theme.css ignore the marks under both reduced-motion switches. */
const STAGGER_MS = 70;
const MAX_STAGGER = 5;

export function mountReveal() {
  if (!('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  if (root.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches)
    return;
  const targets = [
    ...document.querySelectorAll<HTMLElement>('[data-reveal-group] > *, [data-reveal-item]'),
  ].filter((element) => element.getBoundingClientRect().top > innerHeight);
  if (!targets.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        element.style.setProperty(
          '--reveal-delay',
          `${Math.min(order++, MAX_STAGGER) * STAGGER_MS}ms`,
        );
        element.dataset.reveal = 'in';
        // Drop the marks afterwards so the element's own hover transforms apply again.
        const settle = (event: AnimationEvent) => {
          if (event.target !== element) return;
          element.removeEventListener('animationend', settle);
          element.removeEventListener('animationcancel', settle);
          delete element.dataset.reveal;
          element.style.removeProperty('--reveal-delay');
        };
        element.addEventListener('animationend', settle);
        element.addEventListener('animationcancel', settle);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  for (const element of targets) {
    element.dataset.reveal = 'pending';
    observer.observe(element);
  }
}
