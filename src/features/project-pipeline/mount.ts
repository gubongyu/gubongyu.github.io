import { stageFromTime, STAGE_BOUNDS, TIMELINE_MAX } from './timeline';

const FRAME_MS = 1000 / 60;

type PipelineScene = Awaited<ReturnType<(typeof import('./scene'))['createPipelineScene']>>;

export function mountProjectPipeline(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-pipeline-canvas]')!;
  const title = root.querySelector<HTMLElement>('[data-pipeline-title]')!;
  const description = root.querySelector<HTMLElement>('[data-pipeline-description]')!;
  const image = root.querySelector<HTMLImageElement>('[data-pipeline-preview]')!;
  const link = root.querySelector<HTMLAnchorElement>('[data-pipeline-related]')!;
  const stepLabel = root.querySelector<HTMLElement>('[data-pipeline-number]')!;
  const stage = root.querySelector<HTMLElement>('[data-pipeline-stage]')!;
  const track = root.querySelector<HTMLElement>('[data-pipeline-track]')!;
  const progressBar = root.querySelector<HTMLElement>('[data-pipeline-progress]')!;
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-pipeline-card]'));
  const media = matchMedia('(max-width: 767px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  let scene: PipelineScene | undefined;
  let near = false;
  let loading = false;
  let failed = false;
  let disposed = false;
  let raf = 0;
  let displayed = 0;
  let previousFrame = 0;
  let previousStep = -1;

  const supported = () =>
    !media.matches && !reduced.matches && document.documentElement.dataset.motion !== 'off';
  const allowed = () => supported() && !document.hidden;

  function alignStageHash() {
    if (root.dataset.pipelineReady !== 'true') return;
    const index = cards.findIndex((card) => `#${card.id}` === location.hash);
    if (index < 0) return;
    const stageTime = index === 0 ? 0 : STAGE_BOUNDS[index - 1]! + 0.08;
    const fraction = stageTime / TIMELINE_MAX;
    const trackTop = track.getBoundingClientRect().top + scrollY;
    const distance = Math.max(1, track.offsetHeight - innerHeight);
    scrollTo(0, trackTop + distance * fraction);
    displayed = fraction;
  }

  function renderStep(index: number) {
    if (index === previousStep || !cards[index]) return;
    previousStep = index;
    const card = cards[index]!;
    stepLabel.textContent = `STEP ${String(index).padStart(2, '0')} · ${(card.dataset.pipelineId ?? '').toUpperCase()}`;
    title.textContent = card.querySelector('[data-pipeline-card-title]')?.textContent ?? '';
    description.textContent =
      card.querySelector('[data-pipeline-card-description]')?.textContent ?? '';
    const source = card.querySelector<HTMLImageElement>('img');
    if (source) {
      image.src = source.src;
      image.alt = source.alt;
    }
    const target = card.querySelector<HTMLAnchorElement>('[data-pipeline-card-related]');
    if (target) {
      link.href = target.href;
      link.hidden = false;
    } else {
      link.hidden = true;
    }
    stage.dataset.pipelineStep = String(index);
    stage.dataset.pipelineLast = String(index === cards.length - 1);
  }

  function tick(now: number) {
    raf = 0;
    if (!scene || !near || !allowed() || disposed) {
      previousFrame = 0;
      return;
    }
    const box = track.getBoundingClientRect();
    const distance = Math.max(1, box.height - window.innerHeight);
    const target = Math.min(1, Math.max(0, -box.top / distance));
    // The original eases 12% per 60 Hz frame. Scale by elapsed time so a slow
    // renderer still settles on the scrolled stage in the same wall-clock time.
    const frames = previousFrame ? (now - previousFrame) / FRAME_MS : 1;
    previousFrame = now;
    displayed += (target - displayed) * (1 - (1 - 0.12) ** frames);
    if (Math.abs(target - displayed) < 0.0001) displayed = target;
    const t = displayed * TIMELINE_MAX;
    const index = stageFromTime(t);
    if (index >= 0 && index < STAGE_BOUNDS.length) renderStep(index);
    progressBar.style.width = `${displayed * 100}%`;
    scene.render(t);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    previousFrame = 0;
  }

  async function sync() {
    if (disposed) return;
    if (!supported()) {
      stop();
      scene?.dispose();
      scene = undefined;
      root.dataset.pipelineReady = 'false';
      return;
    }
    if (document.hidden) {
      stop();
      return;
    }
    if (!near || failed) {
      stop();
      return;
    }
    if (!scene && !loading) {
      loading = true;
      try {
        const { createPipelineScene } = await import('./scene');
        if (disposed || !near || !allowed()) return;
        const candidate = createPipelineScene(canvas, root.dataset.assetBase!, () => {
          if (disposed) return;
          failed = true;
          stop();
          scene?.dispose();
          scene = undefined;
          root.dataset.pipelineReady = 'false';
        });
        scene = candidate;
        await candidate.ready;
        if (disposed || !supported() || scene !== candidate) return;
        root.dataset.pipelineReady = 'true';
        candidate.resize();
        previousStep = -1;
        alignStageHash();
      } catch {
        if (allowed() && !disposed) failed = true;
        scene?.dispose();
        scene = undefined;
        root.dataset.pipelineReady = 'false';
      } finally {
        loading = false;
      }
    }
    if (scene && root.dataset.pipelineReady === 'true' && !raf) {
      const box = track.getBoundingClientRect();
      displayed = Math.min(1, Math.max(0, -box.top / Math.max(1, box.height - innerHeight)));
      raf = requestAnimationFrame(tick);
    }
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      near = entry?.isIntersecting ?? false;
      void sync();
    },
    { rootMargin: '100% 0px', threshold: 0 },
  );
  observer.observe(root);
  media.addEventListener('change', sync, { signal: abort.signal });
  reduced.addEventListener('change', sync, { signal: abort.signal });
  window.addEventListener('studio:preferences', sync, { signal: abort.signal });
  window.addEventListener('hashchange', alignStageHash, { signal: abort.signal });
  document.addEventListener('visibilitychange', sync, { signal: abort.signal });
  window.addEventListener(
    'resize',
    () => {
      scene?.resize();
      void sync();
    },
    { signal: abort.signal },
  );
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      failed = true;
      stop();
      scene?.dispose();
      scene = undefined;
      root.dataset.pipelineReady = 'false';
    },
    { signal: abort.signal },
  );
  window.addEventListener(
    'pagehide',
    (event) => {
      stop();
      if (!(event as PageTransitionEvent).persisted) {
        disposed = true;
        observer.disconnect();
        abort.abort();
        scene?.dispose();
      }
    },
    { signal: abort.signal },
  );
  window.addEventListener('pageshow', sync, { signal: abort.signal });
  renderStep(0);
  return () => {
    if (disposed) return;
    disposed = true;
    stop();
    observer.disconnect();
    abort.abort();
    scene?.dispose();
  };
}
