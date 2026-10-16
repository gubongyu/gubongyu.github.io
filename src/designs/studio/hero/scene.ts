import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createScene(canvas: HTMLCanvasElement, container: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const world = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3.1, 3.1, 2.6, -2.6, 0.1, 50);
  camera.position.set(6, 4.8, 8);
  camera.lookAt(0, 0.85, 0);
  world.add(new THREE.AmbientLight(0xfff9ec, 2.6));
  const light = new THREE.DirectionalLight(0xfff4dd, 4.3);
  light.position.set(-3, 7, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -5;
  light.shadow.camera.right = 5;
  light.shadow.camera.top = 5;
  light.shadow.camera.bottom = -5;
  light.shadow.normalBias = 0.035;
  world.add(light);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6);
  rim.position.set(4, 2, -3);
  world.add(rim);
  const group = new THREE.Group();
  world.add(group);
  const ivory = new THREE.MeshStandardMaterial({ color: 0xe5e2d3, roughness: 0.7 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xf9f6e9, roughness: 0.7 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xca5833, roughness: 0.46 });
  const sage = new THREE.MeshStandardMaterial({ color: 0xa4ae8d, roughness: 0.6 });
  function box(
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    radius = 0.07,
  ) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  box(3.7, 0.22, 2.65, ivory, 0, 0, 0.1, 0.1);
  box(2.35, 1.62, 0.36, paper, -0.25, 1.46, -0.43, 0.12);
  box(0.36, 0.55, 0.35, ivory, -0.25, 0.45, -0.53);
  box(1.05, 0.12, 0.7, paper, -0.25, 0.2, -0.33, 0.06);
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 768;
  textureCanvas.height = 512;
  const ctx = textureCanvas.getContext('2d')!;
  ctx.fillStyle = '#26392f';
  ctx.fillRect(0, 0, 768, 512);
  ctx.fillStyle = '#758676';
  ctx.font = '22px monospace';
  ctx.fillText('~/personal-space', 48, 55);
  ctx.fillStyle = '#d1d9bf';
  ctx.font = 'bold 66px monospace';
  ctx.fillText('hello,', 48, 175);
  ctx.fillText('world.', 48, 255);
  ctx.fillStyle = '#a4bc8e';
  ctx.font = '23px monospace';
  ctx.fillText('> make something good_', 48, 351);
  ctx.fillStyle = '#e1a06e';
  ctx.fillRect(48, 418, 14, 14);
  ctx.fillStyle = '#7d9280';
  ctx.font = '18px monospace';
  ctx.fillText('always in progress', 78, 432);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.04, 1.32),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  screen.position.set(-0.25, 1.46, -0.242);
  group.add(screen);
  box(1.85, 0.12, 0.64, paper, -0.18, 0.24, 0.64, 0.05);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 10; col++)
      box(0.12, 0.027, 0.105, ivory, -0.93 + col * 0.16, 0.313, 0.46 + row * 0.16, 0.01);
  box(0.68, 0.68, 0.68, orange, -1.7, 0.66, 0.88, 0.08).rotation.y = -0.2;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 40, 32), orange);
  ball.position.set(1.2, 1.05, 0.48);
  ball.castShadow = true;
  group.add(ball);
  box(0.7, 0.32, 0.8, paper, 1.2, 0.36, 0.48, 0.045);
  box(0.7, 0.05, 0.8, sage, 1.2, 0.55, 0.48, 0.02);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 16, 48), sage);
  torus.position.set(-1.65, 2.36, -0.16);
  torus.rotation.set(0.4, -0.2, 0.1);
  torus.castShadow = true;
  group.add(torus);
  const smallCube = box(0.37, 0.37, 0.37, paper, 1.45, 2.2, -0.25, 0.04);
  smallCube.rotation.set(0.3, 0.5, 0.2);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.12 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.17;
  ground.receiveShadow = true;
  world.add(ground);
  // Keep a single render loop, pausing completely outside the viewport.
  let active = false,
    disposed = false,
    tick = 0,
    px = 0,
    py = 0;
  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    const aspect = width / Math.max(height, 1);
    camera.left = -2.65 * aspect;
    camera.right = 2.65 * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!disposed) renderer.render(world, camera);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  const move = (event: PointerEvent) => {
    const r = container.getBoundingClientRect();
    px = ((event.clientX - r.left) / r.width - 0.5) * 0.13;
    py = ((event.clientY - r.top) / r.height - 0.5) * 0.07;
  };
  const leave = () => {
    px = 0;
    py = 0;
  };
  container.addEventListener('pointermove', move);
  container.addEventListener('pointerleave', leave);
  const draw = () => {
    tick += 0.012;
    group.rotation.y += (px - group.rotation.y) * 0.04;
    group.rotation.x += (py - group.rotation.x) * 0.04;
    torus.position.y = 2.36 + Math.sin(tick) * 0.045;
    smallCube.position.y = 2.2 + Math.cos(tick) * 0.045;
    renderer.render(world, camera);
  };
  return {
    setActive(value: boolean) {
      if (disposed || active === value) return;
      active = value;
      renderer.setAnimationLoop(value ? draw : null);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerleave', leave);
      const materials = new Set<THREE.Material>();
      world.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(material);
        }
      });
      materials.forEach((m) => m.dispose());
      texture.dispose();
      renderer.dispose();
    },
  };
}
