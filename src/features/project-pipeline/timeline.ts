// Ported from AI-WEB/lib/landing/scroll.ts. The unequal bounds preserve
// the original timing: reconstruction and extrusion get longer holds.
export const STEP_COUNT = 10;
export const STEP_VH = 278;
export const TIMELINE_MAX = 12.5;
export const STAGE_BOUNDS = [0.9, 2.0, 4.2, 5.7, 6.6, 7.5, 8.4, 9.6, 11.2, Infinity];

export const CAMERA_PRESETS = [
  { pos: [13, 11, 20], look: [0, 3, 0] },
  { pos: [0, 3, 15], look: [0, 3, 0] },
  { pos: [0, 3, 15], look: [0, 3, 0] },
  { pos: [0, 3, 15], look: [0, 3, 0] },
  { pos: [0, 26, 0.01], look: [0, 3, 0] },
  { pos: [0, 26, 0.01], look: [0, 3, 0] },
  { pos: [0, 26, 0.01], look: [0, 3, 0] },
  { pos: [0, 24, 0.01], look: [0, 3, 0] },
  { pos: [0, 24, 0.01], look: [0, 3, 0] },
  { pos: [14, 11, 17], look: [0, 3, 0] },
] as const;

export function stageFromTime(t: number): number {
  return STAGE_BOUNDS.findIndex((bound) => t < bound);
}

export function stageRange(t: number) {
  const index = stageFromTime(t);
  const lo = index === 0 ? 0 : STAGE_BOUNDS[index - 1]!;
  const rawHi = STAGE_BOUNDS[index]!;
  const hi = Number.isFinite(rawHi) ? rawHi : lo + 1;
  return { index, fraction: Math.min(1, Math.max(0, (t - lo) / (hi - lo))) };
}

export function stageFocus(t: number): number {
  return Math.sin(stageRange(t).fraction * Math.PI);
}
