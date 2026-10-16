import * as THREE from 'three';
import { buildStory } from './scene-story';
import { CAMERA_PRESETS, stageRange } from './timeline';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createPipelineScene(
  canvas: HTMLCanvasElement,
  assetBase: string,
  onAssetError: (error: unknown) => void,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  const look = new THREE.Vector3(0, 3, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const key = new THREE.PointLight(0x00c6ff, 80, 100);
  key.position.set(8, 14, 10);
  scene.add(key);
  const story = buildStory(assetBase, onAssetError);
  scene.add(story.group);
  let disposed = false;

  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height, false);
  }

  function render(t: number) {
    if (disposed) return;
    const { index, fraction } = stageRange(t);
    const next = Math.min(CAMERA_PRESETS.length - 1, index + 1);
    const ease = fraction * fraction * (3 - 2 * fraction);
    const a = CAMERA_PRESETS[index]!;
    const b = CAMERA_PRESETS[next]!;
    camera.position.set(
      lerp(a.pos[0], b.pos[0], ease),
      lerp(a.pos[1], b.pos[1], ease),
      lerp(a.pos[2], b.pos[2], ease),
    );
    look.set(
      lerp(a.look[0], b.look[0], ease),
      lerp(a.look[1], b.look[1], ease),
      lerp(a.look[2], b.look[2], ease),
    );
    camera.lookAt(look);
    story.update(t);
    renderer.render(scene, camera);
  }

  resize();
  return {
    ready: story.ready,
    resize,
    render,
    dispose() {
      if (disposed) return;
      disposed = true;
      story.dispose();
      renderer.dispose();
    },
  };
}
