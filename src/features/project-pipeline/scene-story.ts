import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/** 파이프라인 스테이지 0~3 이미지 연출.
 *  0 INPUT: 사진 4장이 방(박스) 네 벽을 채워 모서리끼리 만남 + 와이어프레임 → 회전 정지 → 카드 스택.
 *  1 SEG: 색칠 크레파스 스윕 → 가구 마스킹(회색) 스윕. 정면 고정.
 *  2 DEPTH: seg 좌·depth 우(둘 다 평행) → depth 중앙 → 가구 마스킹 스윕 → 카메라 각도로 3D 포인트(마스킹).
 *  3 MULTIVIEW: 4뷰 depth(2D+3D 겹침)가 박스로 되돌려짐 + 구조 와이어프레임 → 중앙 수렴 → point map 핸드오프. */

export type Story = {
  group: THREE.Group;
  ready: Promise<void>;
  update: (t: number) => void;
  dispose: () => void;
};

const CLOUD_SUF = ['', '1', '2', '3'];

const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lp = (a: number, b: number, x: number) => a + (b - a) * x;

const CY = 3;
const D = 4.3;
const BOXH = 4.6;
const PW = 5.6; // 사진/이미지 평면 가로
const PH = 3.5; // 세로
const HALF_W = PW / 2;
const CR = D * 0.92; // 코너 반경

// 겹치지 않도록: 모두 중앙으로 모여 하나로 합쳐진다(뒤 3장은 모이며 사라짐).
const STACK: Array<[number, number, number]> = [
  [0, 0, 0],
  [0, 0, -0.012],
  [0, 0, -0.024],
  [0, 0, -0.036],
];
// 박스 "네 모서리"에 사진 배치 — 사진 속 구석(코너)이 박스 모서리로 가도록 안쪽을 향함. [x, z, rotY]
const WALL: Array<[number, number, number]> = [
  [CR, CR, Math.atan2(-CR, -CR)],
  [CR, -CR, Math.atan2(-CR, CR)],
  [-CR, -CR, Math.atan2(CR, CR)],
  [-CR, CR, Math.atan2(CR, -CR)],
];

export function buildStory(assetBase: string, onAssetError: (error: unknown) => void): Story {
  const group = new THREE.Group();
  const abort = new AbortController();
  const pending: Promise<unknown>[] = [];
  let disposed = false;
  const asset = (path: string) => `${assetBase}${path}`;
  const loadBuffer = (url: string) => {
    const job = fetch(url, { signal: abort.signal }).then((response) => {
      if (!response.ok) throw new Error(`Pipeline asset failed: ${url}`);
      return response.arrayBuffer();
    });
    pending.push(job);
    return job;
  };
  const RGB_URLS = [0, 1, 2, 3].map((i) => asset(`story5/v${i}.jpg`));
  const DEPTHV_URLS = [0, 1, 2, 3].map((i) => asset(`story5/depth_v${i}.png`));
  const loader = new THREE.TextureLoader();
  const load = (u: string) => {
    let loaded!: () => void;
    let failed!: (error: unknown) => void;
    const job = new Promise<void>((resolve, reject) => {
      loaded = resolve;
      failed = reject;
    });
    pending.push(job);
    const tx = loader.load(u, loaded, undefined, (error) => {
      failed(error);
      if (!disposed) onAssetError(error);
    });
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  };

  // ── 0 INPUT: 방 네 벽 + 와이어프레임 ──
  const roomBox = new THREE.Group();
  group.add(roomBox);
  const wallGeo = new THREE.PlaneGeometry(PW, PH);
  const rgbTex = RGB_URLS.map(load);
  const rgbMats = rgbTex.map(
    (tx) => new THREE.MeshBasicMaterial({ map: tx, transparent: true, side: THREE.DoubleSide }),
  );
  const walls = rgbMats.map((m, i) => {
    const mesh = new THREE.Mesh(wallGeo, m);
    mesh.position.set(WALL[i]![0], CY, WALL[i]![1]);
    mesh.rotation.y = WALL[i]![2];
    roomBox.add(mesh);
    return mesh;
  });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x00c6ff, transparent: true });
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * D, BOXH, 2 * D)),
    wireMat,
  );
  wire.position.y = CY;
  roomBox.add(wire);

  // ── seg(색칠)·gray(가구 마스킹)·depth(full)·depthGray(마스킹) 평면 ──
  const flatGeo = new THREE.PlaneGeometry(PW, PH);
  const clip = () => new THREE.Plane(new THREE.Vector3(-1, 0, 0), -HALF_W);
  const segClip = clip();
  const segMat = new THREE.MeshBasicMaterial({
    map: load(asset('seg.png')),
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    clippingPlanes: [segClip],
  });
  const segPlane = new THREE.Mesh(flatGeo, segMat);
  segPlane.position.set(0, CY, 0.06);
  group.add(segPlane);
  const graySegClip = clip();
  const graySegMat = new THREE.MeshBasicMaterial({
    map: load(asset('seg_gray.png')),
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    clippingPlanes: [graySegClip],
  });
  const graySegPlane = new THREE.Mesh(flatGeo, graySegMat);
  graySegPlane.position.set(0, CY, 0.09);
  group.add(graySegPlane);

  const depthMat = new THREE.MeshBasicMaterial({
    map: load(asset('depth.png')),
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const depthPlane = new THREE.Mesh(flatGeo, depthMat);
  depthPlane.position.set(0, CY, 0);
  group.add(depthPlane);
  const dGrayClip = clip();
  const depthGrayMat = new THREE.MeshBasicMaterial({
    map: load(asset('depth_gray.png')),
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    clippingPlanes: [dGrayClip],
  });
  const depthGrayPlane = new THREE.Mesh(flatGeo, depthGrayMat);
  depthGrayPlane.position.set(0, CY, 0.03);
  group.add(depthGrayPlane);

  // ── depth 3D 포인트 4뷰(마스킹) + 박스 벽 depth 2D 평면 4뷰 + 구조 와이어프레임 ──
  const depthBox = new THREE.Group();
  group.add(depthBox);
  const clouds: Array<THREE.Points | null> = [null, null, null, null];
  const cloudMats: Array<THREE.PointsMaterial | null> = [null, null, null, null];
  CLOUD_SUF.forEach((suf, i) => {
    Promise.all([
      loadBuffer(asset(`story5/depth_pos${suf}.bin`)),
      loadBuffer(asset(`story5/depth_col${suf}.bin`)),
    ])
      .then(([pb, cb]) => {
        if (disposed) return;
        const pos = new Float32Array(pb);
        const cu = new Uint8Array(cb);
        const colf = new Float32Array(cu.length);
        for (let k = 0; k < cu.length; k++) colf[k] = cu[k]! / 255;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(colf, 3));
        const m = new THREE.PointsMaterial({
          size: 0.05,
          vertexColors: true,
          transparent: true,
          opacity: 0,
        });
        const pts = new THREE.Points(g, m);
        pts.visible = false;
        depthBox.add(pts);
        clouds[i] = pts;
        cloudMats[i] = m;
      })
      .catch((error) => {
        if (!disposed) onAssetError(error);
      });
  });
  // 각 뷰 카메라 방향(합쳤을 때의 코너와 동일) — 흩어질 방향
  const cloudDir: Array<[number, number]> = [
    [Math.cos(0.7854), Math.sin(0.7854)],
    [Math.cos(2.3562), Math.sin(2.3562)],
    [Math.cos(3.927), Math.sin(3.927)],
    [Math.cos(5.4978), Math.sin(5.4978)],
  ];
  loadBuffer(asset('story5/depth_dir.bin'))
    .then((b) => {
      if (disposed) return;
      const d = new Float32Array(b);
      for (let i = 0; i < d.length / 2 && i < cloudDir.length; i++)
        cloudDir[i] = [d[i * 2]!, d[i * 2 + 1]!];
    })
    .catch((error) => {
      if (!disposed) onAssetError(error);
    });
  const depthVTex = DEPTHV_URLS.map(load);
  const depthVMats = depthVTex.map(
    (tx) =>
      new THREE.MeshBasicMaterial({
        map: tx,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
  );
  const depthVPlanes = depthVMats.map((m) => {
    const mesh = new THREE.Mesh(wallGeo, m);
    depthBox.add(mesh);
    return mesh;
  });
  const boxWireMat = new THREE.LineBasicMaterial({
    color: 0x1428a0,
    transparent: true,
    opacity: 0,
  });
  const boxWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * D, BOXH, 2 * D)),
    boxWireMat,
  );
  boxWire.position.y = CY;
  depthBox.add(boxWire);

  // ── 멀티뷰 점맵: 뷰별 색(colorA) → 크레파스 스윕으로 seg 색(colorB) + 가구 제거 ──
  let mvCloud: THREE.Points | null = null;
  let mvMat: THREE.ShaderMaterial | null = null;
  Promise.all([
    loadBuffer(asset('story5/mv_pos.bin')),
    loadBuffer(asset('story5/mv_cola.bin')),
    loadBuffer(asset('story5/mv_colb.bin')),
    loadBuffer(asset('story5/mv_furn.bin')),
    loadBuffer(asset('story5/mv_view.bin')),
    loadBuffer(asset('story5/mv_cls.bin')),
  ])
    .then(([pb, ca, cb, fu, vw, clb]) => {
      if (disposed) return;
      const pos = new Float32Array(pb);
      const toF = (u8: Uint8Array) => {
        const f = new Float32Array(u8.length);
        for (let k = 0; k < u8.length; k++) f[k] = u8[k]! / 255;
        return f;
      };
      let xmin = Infinity;
      let xmax = -Infinity;
      for (let k = 0; k < pos.length; k += 3) {
        xmin = Math.min(xmin, pos[k]!);
        xmax = Math.max(xmax, pos[k]!);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('colorA', new THREE.BufferAttribute(toF(new Uint8Array(ca)), 3));
      g.setAttribute('colorB', new THREE.BufferAttribute(toF(new Uint8Array(cb)), 3));
      g.setAttribute('aFurn', new THREE.BufferAttribute(new Float32Array(new Uint8Array(fu)), 1));
      g.setAttribute('aView', new THREE.BufferAttribute(new Float32Array(new Uint8Array(vw)), 1));
      g.setAttribute('aClass', new THREE.BufferAttribute(new Float32Array(new Uint8Array(clb)), 1)); // 0벽 1바닥 2천장 3기타
      mvMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uSweep: { value: 0 },
          uGather: { value: 1 },
          uSpread: { value: 4.0 },
          uFlatten: { value: 0 }, // 중력면 정사영(top-down 2D 투영)
          uFootprint: { value: 0 }, // 벽만 남김(바닥/천장 페이드)
          uPerView: { value: 0 }, // 벽선 단계: seg 색 → 뷰별 색
          uXmin: { value: xmin },
          uXmax: { value: xmax },
          uSize: { value: 0.13 },
          uOpacity: { value: 0 },
        },
        vertexShader: `
          attribute vec3 colorA; attribute vec3 colorB; attribute float aFurn; attribute float aView; attribute float aClass;
          uniform float uSweep, uGather, uSpread, uFlatten, uFootprint, uPerView, uXmin, uXmax, uSize;
          varying vec3 vColor; varying float vDrop; varying float vAlpha;
          void main(){
            float ang = aView * 1.5708 + 0.7854;
            vec3 off = vec3(cos(ang), 0.0, sin(ang)) * uSpread * (1.0 - uGather);
            vec3 p = position + off;
            p.y = mix(p.y, 0.0, uFlatten);
            float nx = (position.x - uXmin)/(uXmax - uXmin);
            float swept = smoothstep(uSweep + 0.1, uSweep - 0.1, nx);
            vec3 segCol = mix(colorA, colorB, swept);       // 뷰별 → seg
            vColor = mix(segCol, colorA, uPerView);          // 벽선 단계: seg → 뷰별
            vDrop = aFurn * step(0.5, swept);                // 가구 제거
            float nonWall = step(0.5, aClass);               // 벽이 아님(바닥/천장/기타)
            vAlpha = 1.0 - nonWall * uFootprint;             // footprint: 비벽 페이드
            vec4 mv = modelViewMatrix * vec4(p,1.0);
            gl_PointSize = uSize * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform float uOpacity; varying vec3 vColor; varying float vDrop; varying float vAlpha;
          void main(){ if(vDrop > 0.5) discard; gl_FragColor = vec4(vColor, uOpacity * vAlpha); }`,
      });
      mvCloud = new THREE.Points(g, mvMat);
      mvCloud.position.set(0, CY, 0);
      mvCloud.visible = false;
      group.add(mvCloud);
    })
    .catch((error) => {
      if (!disposed) onAssetError(error);
    });

  // ── experiment 최종 전략 벽선(뷰별 색)·병합 벽선·footprint (fat line, footprint 위로 올려 잘 보이게) ──
  let pvLines: LineSegments2 | null = null;
  let pvMat: LineMaterial | null = null;
  let pvBase: Float32Array | null = null; // 뷰별 벽선 원위치
  let pvTgt: Float32Array | null = null; // 병합 시 공통 offset 슬라이드 타깃
  let mgLines: LineSegments2 | null = null;
  let mgMat: LineMaterial | null = null;
  let fpLines: LineSegments2 | null = null;
  let fpMat: LineMaterial | null = null;
  const mountLine = (
    buf: ArrayBuffer,
    colBuf: ArrayBuffer | null,
    color: number,
    lw: number,
    yOff: number,
  ) => {
    const pos = new Float32Array(buf);
    const geo = new LineSegmentsGeometry();
    geo.setPositions(Array.from(pos));
    const mat = new LineMaterial({
      color,
      linewidth: lw,
      worldUnits: true,
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    mat.resolution.set(window.innerWidth, window.innerHeight);
    if (colBuf) {
      const cu = new Uint8Array(colBuf);
      const cf = new Float32Array(cu.length);
      for (let k = 0; k < cu.length; k++) cf[k] = cu[k]! / 255;
      geo.setColors(Array.from(cf));
      mat.vertexColors = true;
    }
    const ls = new LineSegments2(geo, mat);
    ls.position.set(0, CY + yOff, 0); // footprint 점 위로 올려 가림 없이
    ls.scale.setScalar(1.7);
    ls.renderOrder = 10; // 항상 위에
    ls.visible = false;
    group.add(ls);
    return { ls, mat };
  };
  Promise.all([
    loadBuffer(asset('story5/pv_lines_pos.bin')),
    loadBuffer(asset('story5/pv_lines_col.bin')),
    loadBuffer(asset('story5/pv_lines_tgt.bin')),
  ])
    .then(([p, c, tg]) => {
      if (disposed) return;
      const o = mountLine(p, c, 0xffffff, 0.12, 0.2);
      pvLines = o.ls;
      pvMat = o.mat;
      pvBase = new Float32Array(p);
      pvTgt = new Float32Array(tg);
    })
    .catch((error) => {
      if (!disposed) onAssetError(error);
    });
  loadBuffer(asset('story5/merged_lines.bin'))
    .then((p) => {
      if (disposed) return;
      const o = mountLine(p, null, 0x00c6ff, 0.09, 0.24);
      mgLines = o.ls;
      mgMat = o.mat;
    })
    .catch((error) => {
      if (!disposed) onAssetError(error);
    });
  loadBuffer(asset('story5/footprint.bin'))
    .then((p) => {
      if (disposed) return;
      const o = mountLine(p, null, 0xff4949, 0.11, 0.28);
      fpLines = o.ls;
      fpMat = o.mat;
    })
    .catch((error) => {
      if (!disposed) onAssetError(error);
    });

  // ── 폐곡선 기준 높이+실측 스케일 3D 방(experiment footprint 폴리곤 압출) + TC/BC 코너 ──
  let exMesh: THREE.Group | null = null;
  let exMat: THREE.MeshPhysicalMaterial | null = null;
  let exWireMat: THREE.LineBasicMaterial | null = null;
  let cornerGroup: THREE.Group | null = null;
  let tcMat: THREE.MeshBasicMaterial | null = null;
  let bcMat: THREE.MeshBasicMaterial | null = null;
  let dimGroup: THREE.Group | null = null; // 실측 치수 라벨(와이어프레임 위)
  const dimMats: THREE.SpriteMaterial[] = [];
  const makeDim = (text: string, pos: THREE.Vector3) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 76;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(11,18,32,0.82)';
    ctx.beginPath();
    ctx.roundRect(6, 12, 244, 52, 14);
    ctx.fill();
    ctx.fillStyle = '#22E0FF';
    ctx.font = 'bold 40px ui-sans-serif, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 40);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    dimMats.push(mat);
    const sp = new THREE.Sprite(mat);
    sp.scale.set(1.7, 0.5, 1);
    sp.position.copy(pos);
    sp.renderOrder = 12;
    return sp;
  };
  loadBuffer(asset('story5/footprint_poly.bin'))
    .then((pb) => {
      if (disposed) return;
      const arr = new Float32Array(pb);
      const height = arr[0]!;
      const s2m = arr[1]!; // scene 길이 × s2m = 실측 미터
      const nv = (arr.length - 2) / 2;
      if (nv < 3) return;
      const vx = (k: number) => arr[2 + k * 2]!;
      const vz = (k: number) => arr[3 + k * 2]!;
      const shape = new THREE.Shape();
      for (let k = 0; k < nv; k++) {
        if (k === 0) shape.moveTo(vx(k), -vz(k));
        else shape.lineTo(vx(k), -vz(k));
      }
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2); // 압출축을 up(y)으로
      exMat = new THREE.MeshPhysicalMaterial({
        color: 0x1428a0,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.6,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, exMat);
      exWireMat = new THREE.LineBasicMaterial({ color: 0x00c6ff, transparent: true, opacity: 0 });
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), exWireMat));
      exMesh = new THREE.Group();
      exMesh.add(mesh);
      exMesh.position.set(0, CY, 0); // footprint 바닥에서 위로 압출
      exMesh.visible = false;
      group.add(exMesh);

      // TC(천장)·BC(바닥) 코너 — footprint 정점 승격 (BC=footprint, TC=footprint∪kink 의 footprint 부분)
      cornerGroup = new THREE.Group();
      tcMat = new THREE.MeshBasicMaterial({ color: 0x00c6ff, transparent: true, opacity: 0 });
      bcMat = new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0 });
      const cgeo = new THREE.SphereGeometry(0.14, 18, 18);
      for (let k = 0; k < nv; k++) {
        const x = vx(k) * 1.7;
        const z = vz(k) * 1.7;
        const bc = new THREE.Mesh(cgeo, bcMat);
        bc.position.set(x, CY, z);
        const tc = new THREE.Mesh(cgeo, tcMat);
        tc.position.set(x, CY + height * 1.7, z);
        cornerGroup.add(bc, tc);
      }
      cornerGroup.visible = false;
      group.add(cornerGroup);

      // 실측 치수 라벨: 각 벽 길이(바닥 모서리 중점) + 층고(수직 모서리). scene 길이 × s2m = 미터
      dimGroup = new THREE.Group();
      for (let k = 0; k < nv; k++) {
        const j = (k + 1) % nv;
        const dx = vx(j) - vx(k);
        const dz = vz(j) - vz(k);
        const len = Math.hypot(dx, dz) * s2m; // 실측 벽 길이(m)
        if (len < 0.15) continue;
        const mx = ((vx(k) + vx(j)) / 2) * 1.7;
        const mz = ((vz(k) + vz(j)) / 2) * 1.7;
        dimGroup.add(makeDim(`${len.toFixed(1)} m`, new THREE.Vector3(mx, CY + 0.4, mz)));
      }
      // 층고: 첫 정점의 수직 모서리 중간 높이
      dimGroup.add(
        makeDim(
          `${(height * s2m).toFixed(1)} m`,
          new THREE.Vector3(vx(0) * 1.7, CY + (height * 1.7) / 2, vz(0) * 1.7),
        ),
      );
      dimGroup.visible = false;
      group.add(dimGroup);
    })
    .catch((error) => {
      if (!disposed) onAssetError(error);
    });

  function update(t: number) {
    const active = t < 12.7;
    group.visible = active;
    if (!active) return;

    const spin = cl(t / 0.35);
    const merge = cl((t - 0.35) / 0.5);
    const colorRev = cl((t - 1.0) / 0.45); // SEG 색칠
    const furnRev = cl((t - 1.5) / 0.45); // SEG 가구 마스킹
    const segFade = cl((t - 2.2) / 0.5); // seg 좌측으로 이동·소멸 (2.2→2.7)
    const depthAppear = cl((t - 2.2) / 0.45); // seg 왼쪽 이동과 함께 depth 오른쪽 등장 (2.2→2.65)
    const depthCenter = cl((t - 2.7) / 0.4); // seg 사라지며 depth 중앙으로 (2.7→3.1)
    const reveal3D = cl((t - 3.6) / 0.4); // 마스킹 2D → 3D(포인트 자체 회전) (3.6→4.0) — 이후 텀
    const toCorner = cl((t - 4.05) / 0.35); // 각 뷰 depth 3D 가 자기 코너로(간격 분리) (4.05→4.4)
    const gather = cl((t - 4.55) / 0.4); // 회전 없이 중앙으로 모여 박스 형상 (4.55→4.95)
    const mvIn = cl((t - 4.85) / 0.3); // 방 전체 point map(중앙) 등장
    const mvSweep = cl((t - 5.2) / 0.4); // (방 point map hold 뒤) 점 색 점진 변경 + 가구 제거 (5.2→5.6)
    // 4 GRAVITY (5.7~6.6) — 정사영(중력면 평탄화)·벽만 남긴 순수 footprint + 중력 화살표
    const gravProg = cl((t - 5.95) / 0.6); // 정사영 평탄화·확대·비벽 제거 (5.95→6.55)
    const dimOp = cl((t - 10.0) / 0.5) * (1 - cl((t - 12.4) / 0.3)); // 실측 치수 라벨(압출~코너)
    // 5 WALL LINE (6.6~7.5) — 뷰별 색으로 점진 재색칠 + 벽선 직선
    const perViewProg = cl((t - 6.75) / 0.5); // seg 색 → 뷰별 색 (WALL LINE)
    const pvOp = cl((t - 6.8) / 0.4) * (1 - cl((t - 7.9) / 0.35)); // 뷰별 벽선 → 병합 슬라이드 후 소멸
    const mergeSlide = cl((t - 7.45) / 0.5); // 뷰별 벽선이 공통 offset 으로 옆으로 미끄러짐 (7.45→7.95)
    // 6 MERGE (7.5~8.4)
    const mgOp = cl((t - 7.6) / 0.4) * (1 - cl((t - 8.5) / 0.35)); // 병합 벽선 → 폐곡 시 소멸
    // 7 CLOSURE (8.4~9.6)
    const fpOp = cl((t - 8.5) / 0.5) * (1 - cl((t - 10.7) / 0.5)); // footprint → 압출 시 소멸
    // 8 EXTRUDE (9.6~11.2)
    const exProg = cl((t - 9.75) / 1.1); // 폐곡선 기준 3D 압출·성장 (천천히)
    // 9 CORNERS (11.2~)
    const cornProg = cl((t - 11.25) / 0.8); // TC/BC 코너 등장
    const box = cl((t - 8.35) / 0.6); // mv 벽 포인트 → footprint 로 핸드오프 (폐곡 진입)
    const fade = 1 - box;

    // INPUT — 4장이 중앙으로 모여 하나로 합쳐짐(뒤 3장은 모이며 사라져 겹치지 않음)
    roomBox.rotation.y = spin * Math.PI * 2;
    walls.forEach((mesh, i) => {
      const b = WALL[i]!;
      const s = STACK[i]!;
      mesh.position.set(lp(b[0], s[0], merge), lp(CY, CY + s[1], merge), lp(b[1], s[2], merge));
      mesh.rotation.y = lp(b[2], 0, merge);
      rgbMats[i]!.opacity = (i === 0 ? 1 - cl((t - 1.5) / 0.3) : 1 - merge) * fade;
    });
    wireMat.opacity = 1 - cl((t - 0.2) / 0.4);
    wire.visible = wireMat.opacity > 0.02;
    roomBox.visible = t < 2.3;

    // SEG 두 스윕 — depth 가 오른쪽에 등장하면 왼쪽으로 이동하며 소멸(겹치지 않음)
    const segX = lp(0, -6.2, segFade);
    segMat.opacity = cl((t - 1.0) / 0.12) * (1 - segFade) * fade;
    segClip.constant = colorRev >= 1 ? 1e3 : lp(-HALF_W - 0.2, HALF_W + 0.2, colorRev);
    segPlane.position.set(segX, CY, 0.06);
    segPlane.visible = segMat.opacity > 0.01;
    graySegMat.opacity = cl((t - 1.5) / 0.12) * (1 - segFade) * fade;
    graySegClip.constant = furnRev >= 1 ? 1e3 : lp(-HALF_W - 0.2, HALF_W + 0.2, furnRev);
    graySegPlane.position.set(segX, CY, 0.09);
    graySegPlane.visible = graySegMat.opacity > 0.01;

    // DEPTH — SEG 오른쪽에 평행 등장 → 화면 중앙 이동 → 가구 마스킹 → 3D 리빌 시 페이드
    const dx = lp(4.6, 0, depthCenter);
    // 컬러 depth 를 3D 등장 전까지 유지 → 컬러 상태에서 바로 3D 로(흑백 masking 단계 제거)
    depthMat.opacity = depthAppear * (1 - reveal3D) * fade;
    depthPlane.position.set(dx, CY, 0);
    depthPlane.visible = depthMat.opacity > 0.01;
    depthGrayMat.opacity = 0; // B&W 가구 마스킹 단계 비활성 — 컬러 depth → 3D 직접 전환
    depthGrayPlane.visible = false;

    // 각 뷰 depth 3D 맵: cloud0 중앙 리빌 → 자기 코너로 이동, 나머지 뷰도 각 코너에 등장(간격 분리)
    // → 회전 없이 중앙으로 모여 박스. mv 방 point map 등장 시 소멸.
    const at = toCorner * (1 - gather); // 0 중앙 → 1 코너 → 0 중앙(모임)
    const cloudFade = 1 - cl((t - 4.8) / 0.3); // mv 로 넘기며 소멸
    clouds.forEach((pts, i) => {
      const m = cloudMats[i];
      if (!pts || !m) return;
      // 위치: 카메라 반대(각 뷰가 담은 방 콘텐츠) 방향으로 흩어짐 → 코너가 바깥을 향함. 방향은 유지.
      const dir = cloudDir[i] || [Math.cos(i * 1.5708), Math.sin(i * 1.5708)];
      pts.position.set(-dir[0] * 4.8 * at, CY, -dir[1] * 4.8 * at);
      const relief = i === 0 ? reveal3D : 0;
      pts.rotation.set(0.16 * relief * (1 - toCorner), 0, 0); // yaw 회전 없음 → 방 방향 유지
      pts.scale.setScalar(lp(1, 0.5, toCorner)); // 코너에선 작게(분리)
      const rise = i === 0 ? Math.max(reveal3D, toCorner) : toCorner;
      m.opacity = rise * cloudFade * fade;
      pts.visible = m.opacity > 0.01;
    });
    depthVPlanes.forEach((mesh, i) => {
      depthVMats[i]!.opacity = 0;
      mesh.visible = false;
    });
    boxWireMat.opacity = 0;
    boxWire.visible = false;

    // 멀티뷰 방 point map(중력 정렬) — 중앙 등장 → 색칠 → 중력 단계에 top-down 정사영으로 크기 확대
    if (mvCloud && mvMat) {
      mvMat.uniforms.uGather!.value = 1;
      mvMat.uniforms.uSweep!.value = mvSweep;
      mvMat.uniforms.uFlatten!.value = gravProg; // 중력면 평탄화
      mvMat.uniforms.uFootprint!.value = gravProg; // 벽만 남김(바닥/천장 페이드)
      mvMat.uniforms.uPerView!.value = perViewProg; // 벽선 단계: seg 색 → 뷰별 색
      mvMat.uniforms.uOpacity!.value = mvIn * fade;
      mvCloud.scale.setScalar(lp(1, 1.7, gravProg));
      mvCloud.visible = mvMat.uniforms.uOpacity!.value > 0.01;
    }
    // experiment 벽선(뷰별) → 병합 벽선 → footprint
    if (pvLines && pvMat) {
      pvMat.opacity = pvOp * fade;
      pvLines.visible = pvMat.opacity > 0.01;
      // 병합 알고리즘 연출: offset 이 가까운 뷰별 벽선들이 공통 병합선 위치로 옆으로 슬라이드해 겹침
      if (pvBase && pvTgt && pvLines.visible && mergeSlide > 0.001) {
        const e = mergeSlide * mergeSlide * (3 - 2 * mergeSlide); // smootherstep
        const arr = new Float32Array(pvBase.length);
        for (let k = 0; k < arr.length; k++) arr[k] = pvBase[k]! + (pvTgt[k]! - pvBase[k]!) * e;
        (pvLines.geometry as LineSegmentsGeometry).setPositions(Array.from(arr));
      }
    }
    if (mgLines && mgMat) {
      mgMat.opacity = mgOp;
      mgLines.visible = mgMat.opacity > 0.01;
    }
    if (fpLines && fpMat) {
      fpMat.opacity = fpOp;
      fpLines.visible = fpMat.opacity > 0.01;
    }
    // 폐곡선 기준 3D 방(압출) — 높이만큼 성장
    if (exMesh && exMat && exWireMat) {
      exMesh.scale.set(1.7, 1.7 * exProg, 1.7);
      exMat.opacity = 0.12 * exProg; // 유리 투명도 ↑ → 박스 뒤쪽 와이어프레임도 비침
      exWireMat.opacity = exProg;
      exMesh.visible = exProg > 0.01;
    }
    // TC/BC 코너 스피어 — 정점마다 elastic 하게 튀어오름
    if (cornerGroup && tcMat && bcMat) {
      cornerGroup.visible = cornProg > 0.01;
      // 살짝 오버슈트(1.25) 후 1.0 로 안착 → elastic 느낌
      const os = cornProg < 1 ? 1.25 * Math.sin(cornProg * Math.PI * 0.5) : 1;
      const s = 0.85 + (os - 0.85) * cornProg;
      cornerGroup.children.forEach((c) => c.scale.setScalar(s * cornProg));
      tcMat.opacity = cornProg;
      bcMat.opacity = cornProg;
    }
    // 실측 치수 라벨 — 압출된 방 와이어프레임 위에 표시
    if (dimGroup) {
      dimGroup.visible = dimOp > 0.01;
      dimMats.forEach((m) => (m.opacity = dimOp));
    }
  }

  function dispose() {
    disposed = true;
    abort.abort();
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else if (m) m.dispose();
    });
    [...rgbTex, ...depthVTex, segMat.map, graySegMat.map, depthMat.map, depthGrayMat.map].forEach(
      (tx) => tx && tx.dispose(),
    );
    clouds.forEach((p) => p?.geometry.dispose());
    cloudMats.forEach((m) => m?.dispose());
    if (mvCloud) {
      mvCloud.geometry.dispose();
      mvMat?.dispose();
    }
    dimMats.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    [pvLines, mgLines, fpLines].forEach((l) => l?.geometry.dispose());
    [pvMat, mgMat, fpMat].forEach((m) => m?.dispose());
    exMesh?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    exMat?.dispose();
    exWireMat?.dispose();
    cornerGroup?.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    tcMat?.dispose();
    bcMat?.dispose();
  }

  const ready = Promise.all(pending).then(async () => {
    // The binary data is parsed in Promise.all(...).then(...) handlers above.
    await Promise.resolve();
    await Promise.resolve();
  });
  return { group, ready, update, dispose };
}
