// Render at build time: the browser only plays a sequence of text frames.
const WIDTH = 84;
const HEIGHT = 32;
const SHADES = '.,:;irsXA253hMHGS#9B&@';
export const artFrameDuration = 0.16;
const frameCount = 48;
export const artDuration = frameCount * artFrameDuration;

type Vector = [number, number, number];
function center(t: number): Vector {
  return [
    (2 + Math.cos(3 * t)) * Math.cos(2 * t),
    (2 + Math.cos(3 * t)) * Math.sin(2 * t),
    Math.sin(3 * t),
  ];
}
function normalize(v: Vector): Vector {
  const length = Math.hypot(...v);
  return v.map((value) => value / length) as Vector;
}
function cross(a: Vector, b: Vector): Vector {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
const surface: { point: Vector; normal: Vector }[] = [];
for (let t = 0; t < Math.PI * 2; t += 0.018) {
  const point = center(t);
  const next = center(t + 0.001);
  const tangent = normalize(next.map((value, axis) => value - point[axis]!) as Vector);
  const side = normalize(cross(tangent, [0, 0, 1]));
  const up = cross(tangent, side);
  for (let phi = 0; phi < Math.PI * 2; phi += 0.13) {
    const normal = side.map(
      (value, axis) => value * Math.cos(phi) + up[axis]! * Math.sin(phi),
    ) as Vector;
    surface.push({
      point: point.map((value, axis) => value + normal[axis]! * 0.53) as Vector,
      normal,
    });
  }
}
function rotate([x, y, z]: Vector, angle: number): Vector {
  const tiltedY = y * Math.cos(0.85) - z * Math.sin(0.85);
  const tiltedZ = y * Math.sin(0.85) + z * Math.cos(0.85);
  return [
    x * Math.cos(angle) + tiltedZ * Math.sin(angle),
    tiltedY,
    -x * Math.sin(angle) + tiltedZ * Math.cos(angle),
  ];
}
export const geometryFrames = Array.from({ length: frameCount }, (_, frame) => {
  const pixels = Array<string>(WIDTH * HEIGHT).fill(' ');
  const depth = new Float64Array(WIDTH * HEIGHT).fill(-Infinity);
  const angle = (frame / frameCount) * Math.PI * 2;
  for (const sample of surface) {
    const [x, y, z] = rotate(sample.point, angle);
    const col = Math.round(WIDTH / 2 + x * 10.8);
    const row = Math.round(HEIGHT / 2 - y * 4.9);
    if (col < 0 || col >= WIDTH || row < 0 || row >= HEIGHT) continue;
    const offset = row * WIDTH + col;
    if (z <= depth[offset]!) continue;
    depth[offset] = z;
    const [nx, ny, nz] = rotate(sample.normal, angle);
    const light = Math.max(0, -nx * 0.35 + ny * 0.45 + nz * 0.82);
    pixels[offset] =
      SHADES[Math.min(SHADES.length - 1, Math.floor((0.12 + light * 0.88) * (SHADES.length - 1)))]!;
  }
  return Array.from({ length: HEIGHT }, (_, row) =>
    pixels.slice(row * WIDTH, (row + 1) * WIDTH).join(''),
  ).join('\n');
});
