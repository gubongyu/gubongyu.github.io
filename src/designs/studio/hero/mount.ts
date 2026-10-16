export function mountHero(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const stage = root.querySelector<HTMLElement>('[data-hero-stage]')!;
  let scene: Awaited<ReturnType<(typeof import('./scene'))['createScene']>> | undefined;
  let disposed = false,
    visible = false,
    loading = false,
    failed = false;
  const abort = new AbortController();
  const canLoad = () =>
    matchMedia('(min-width: 761px)').matches && document.documentElement.dataset.motion !== 'off';
  async function sync() {
    const active = visible && !document.hidden && canLoad();
    if (scene) {
      scene.setActive(active);
      return;
    }
    if (!active || disposed || loading || failed) return;
    loading = true;
    try {
      const { createScene } = await import('./scene');
      if (disposed || !visible || document.hidden || !canLoad()) return;
      scene = createScene(canvas, stage);
      root.dataset.ready = 'true';
      scene.setActive(visible && !document.hidden && canLoad());
    } catch {
      failed = true;
      root.dataset.ready = 'false';
    } finally {
      loading = false;
    }
  }
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? false;
      void sync();
    },
    { threshold: 0.05 },
  );
  observer.observe(root);
  window.addEventListener('studio:preferences', sync, { signal: abort.signal });
  window.addEventListener('resize', sync, { signal: abort.signal });
  document.addEventListener('visibilitychange', sync, { signal: abort.signal });
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      failed = true;
      scene?.dispose();
      scene = undefined;
      root.dataset.ready = 'false';
    },
    { signal: abort.signal },
  );
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    abort.abort();
    scene?.dispose();
  };
  window.addEventListener(
    'pagehide',
    (event) => {
      if (!(event as PageTransitionEvent).persisted) dispose();
      else scene?.setActive(false);
    },
    { signal: abort.signal },
  );
  window.addEventListener('pageshow', sync, { signal: abort.signal });
  return dispose;
}
