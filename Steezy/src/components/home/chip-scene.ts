/**
 * Casino chip background — ported from the "Casino Chip Background" Claude Design
 * export (ARCHITECTURE.md §5.3).
 *
 * Roobet and STZY chips fall and tumble through three depth layers (far and
 * near layers blurred for a depth-of-field look). Everything loops exactly
 * every LOOP seconds. Chip faces and edges are drawn to canvas textures at
 * runtime. Changes from the design: the ground is retinted to the site's
 * green-black so the hero blends into the page, chip labels use the site font,
 * and the scene can pause/resume and render a single still frame.
 */
import * as THREE from 'three';

const LOOP = 40; // seconds; every motion completes whole cycles in this span

type Brand = {
  name: string;
  base: string;
  insert: string;
  center: string;
  label: string;
  ring: string;
  edgeLine: string;
  logo?: string;
  crop?: [number, number, number, number];
  mask?: HTMLCanvasElement;
};

const PAPER = '#f3f2f2';
const BRANDS: Brand[] = [
  { name: 'ROOBET', base: '#1a1939', insert: '#eeaf0e', center: '#1a1939', label: '#eeaf0e', ring: '#eeaf0e', edgeLine: '#0e0d22', logo: '/brand/roobet-logo.png', crop: [45, 53, 208, 57] },
  // STZY in the design's "Green" colourway (its default).
  { name: 'STZY', base: '#0f5e40', insert: PAPER, center: PAPER, label: '#0f5e40', ring: PAPER, edgeLine: '#083826' },
];

/** Site ground: green-black, matching --color-bg (#0d1310). */
const GROUND = { top: '#16201a', bot: '#0d1310', haze: 0.5 };

export type ChipOptions = {
  speed?: number;
  density?: number;
  foregroundChips?: number;
  depthOfField?: boolean;
  scrim?: number;
  fontFamily?: string;
  maxPixelRatio?: number;
};

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function faceCanvas(b: Brand, font: string) {
  const s = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const R = s / 2;
  g.translate(R, R);
  g.fillStyle = b.base;
  g.fillRect(-R, -R, s, s);
  for (let i = 0; i < 8; i++) {
    g.save();
    g.rotate((i * Math.PI) / 4);
    g.fillStyle = b.insert;
    g.beginPath();
    g.moveTo(-R * 0.15, -R * 1.01);
    g.lineTo(R * 0.15, -R * 1.01);
    g.lineTo(R * 0.12, -R * 0.8);
    g.lineTo(-R * 0.12, -R * 0.8);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.strokeStyle = b.insert;
  g.lineWidth = R * 0.014;
  g.beginPath();
  g.arc(0, 0, R * 0.76, 0, Math.PI * 2);
  g.stroke();

  // Ring text.
  g.fillStyle = b.ring;
  g.font = `800 ${R * (b.mask ? 0.052 : 0.068)}px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const unit = `${b.name}  ·  `;
  const str = unit.repeat(b.name.length > 4 ? 4 : 5);
  const total = g.measureText(str).width;
  const rr = R * (b.mask ? 0.7 : 0.675);
  const step = (Math.PI * 2) / total;
  let a = -Math.PI / 2;
  for (const ch of str) {
    const w = g.measureText(ch).width;
    a += (w / 2) * step;
    g.save();
    g.rotate(a + Math.PI / 2);
    g.fillText(ch, 0, -rr);
    g.restore();
    a += (w / 2) * step;
  }

  g.fillStyle = b.center;
  g.beginPath();
  g.arc(0, 0, R * 0.585, 0, Math.PI * 2);
  g.fill();

  if (b.mask) {
    g.fillStyle = b.center;
    g.beginPath();
    g.arc(0, 0, R * 0.64, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = b.insert;
    g.lineWidth = R * 0.012;
    g.beginPath();
    g.arc(0, 0, R * 0.64, 0, Math.PI * 2);
    g.stroke();
    const t = document.createElement('canvas');
    t.width = b.mask.width;
    t.height = b.mask.height;
    const tg = t.getContext('2d')!;
    tg.fillStyle = b.label;
    tg.fillRect(0, 0, t.width, t.height);
    tg.globalCompositeOperation = 'destination-in';
    tg.drawImage(b.mask, 0, 0);
    const lw = R * 1.18;
    const lh = (lw * t.height) / t.width;
    g.drawImage(t, -lw / 2, -lh / 2, lw, lh);
    return c;
  }

  g.strokeStyle = b.base;
  g.lineWidth = R * 0.01;
  g.beginPath();
  g.arc(0, 0, R * 0.54, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = b.label;
  g.textBaseline = 'alphabetic';
  let fs = R * 0.36;
  g.font = `800 ${fs}px ${font}`;
  const maxW = R * 0.88;
  const w = g.measureText(b.name).width;
  if (w > maxW) {
    fs *= maxW / w;
    g.font = `800 ${fs}px ${font}`;
  }
  const th = g.measureText(b.name).actualBoundingBoxAscent;
  g.fillText(b.name, 0, th / 2);
  g.fillStyle = b.base;
  g.fillRect(-R * 0.09, th / 2 + R * 0.09, R * 0.18, R * 0.028);
  return c;
}

/** The yellow artwork from the Roobet logo PNG, as an upscaled, edge-sharpened alpha mask. */
async function loadMask(b: Brand, scale = 8) {
  const img = new Image();
  img.src = b.logo!;
  await img.decode();
  const [x, y, w, h] = b.crop!;
  const a = document.createElement('canvas');
  a.width = w;
  a.height = h;
  const ag = a.getContext('2d')!;
  ag.drawImage(img, x, y, w, h, 0, 0, w, h);
  const id = ag.getImageData(0, 0, w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.min(1, Math.max(0, (d[i] - d[i + 2] - 20) / 180));
    d[i] = d[i + 1] = d[i + 2] = 255;
    d[i + 3] = v * 255;
  }
  ag.putImageData(id, 0, 0);
  const m = document.createElement('canvas');
  m.width = w * scale;
  m.height = h * scale;
  const mg = m.getContext('2d')!;
  mg.imageSmoothingEnabled = true;
  mg.imageSmoothingQuality = 'high';
  mg.drawImage(a, 0, 0, m.width, m.height);
  const md = mg.getImageData(0, 0, m.width, m.height);
  const e = md.data;
  for (let i = 3; i < e.length; i += 4) {
    const t = Math.min(1, Math.max(0, (e[i] / 255 - 0.32) / 0.3));
    e[i] = t * t * (3 - 2 * t) * 255;
  }
  mg.putImageData(md, 0, 0);
  return m;
}

function edgeCanvas(b: Brand) {
  const w = 2048;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = b.base;
  g.fillRect(0, 0, w, h);
  const iw = w * 0.075;
  for (let i = 0; i < 8; i++) {
    const x = (i / 8) * w;
    g.fillStyle = b.insert;
    g.fillRect(x - iw / 2, 0, iw, h);
    if (i === 0) g.fillRect(w - iw / 2, 0, iw, h);
  }
  g.globalAlpha = 0.22;
  g.strokeStyle = b.edgeLine;
  g.lineWidth = 2;
  for (let x = 0; x < w; x += 10) {
    g.beginPath();
    g.moveTo(x, h * 0.3);
    g.lineTo(x, h * 0.7);
    g.stroke();
  }
  return c;
}

type Chip = {
  g: THREE.Group;
  z: number;
  nx: number;
  scale: number;
  phase: number;
  cyc: number;
  bx: number;
  by: number;
  bz: number;
  kx: number;
  ky: number;
  wx: number;
  wz: number;
  px: number;
  pz: number;
  drift: number;
  dw: number;
  dp: number;
};

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

export type ChipScene = {
  start: () => void;
  stop: () => void;
  /** Draw one frame at time `t` seconds (used for reduced motion). */
  renderStill: (t?: number) => void;
  dispose: () => void;
};

export async function createChipScene(host: HTMLElement, options: ChipOptions = {}): Promise<ChipScene> {
  const o = { speed: 1, density: 1, foregroundChips: 1, depthOfField: true, scrim: 0.3, fontFamily: 'sans-serif', maxPixelRatio: 1.75, ...options };

  for (const b of BRANDS) {
    if (b.logo && !b.mask) {
      try {
        b.mask = await loadMask(b);
      } catch (error) {
        console.warn('[chips] Roobet logo failed to load; using the text label', error);
      }
    }
  }

  const r = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.maxPixelRatio));
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.shadowMap.autoUpdate = false;
  r.setClearColor(0x000000, 0);
  r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  r.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(r.domElement);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, 1, 0.5, 120);
  cam.position.set(0, 0, 20);

  // Studio environment for clearcoat reflections.
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x0c0b0b, side: THREE.BackSide }));
  room.scale.setScalar(30);
  env.add(room);
  const panel = (w: number, h: number, k: number, pos: [number, number, number], col?: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(col ?? 0xffffff).multiplyScalar(k), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(10, 3, 7, [-5, 9, 6]);
  panel(2.5, 10, 3.5, [10, 1, 3]);
  panel(12, 1.5, 1.6, [0, -8, 7]);
  panel(5, 5, 2.2, [-2, 4, -10]);
  // The design's warm fill panel, shifted green to sit on the site palette.
  panel(3, 3, 1.4, [-10, -2, 2], 0x7fdea4);
  const pm = new THREE.PMREMGenerator(r);
  scene.environment = pm.fromScene(env, 0.035).texture;
  pm.dispose();

  const all = <T extends THREE.Object3D>(l: T) => {
    l.layers.enableAll();
    return l;
  };
  scene.add(all(new THREE.HemisphereLight(0xf4fff8, 0x0d1310, 0.35)));
  const key = all(new THREE.DirectionalLight(0xfffaf6, 2.4));
  key.position.set(-7, 11, 12);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 60 });
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rim = all(new THREE.DirectionalLight(0xffffff, 1.6));
  rim.position.set(9, 6, -10);
  scene.add(rim);
  const fill = all(new THREE.DirectionalLight(0x7fdea4, 0.45));
  fill.position.set(-10, -6, 6);
  scene.add(fill);

  // Shared chip parts.
  const prof = (
    [
      [0.94, 0.074],
      [0.952, 0.083],
      [0.972, 0.086],
      [0.99, 0.081],
      [1.0, 0.067],
      [1.0, -0.067],
      [0.99, -0.081],
      [0.972, -0.086],
      [0.952, -0.083],
      [0.94, -0.074],
    ] as const
  ).map(([x, y]) => new THREE.Vector2(x, y));
  const geo = {
    edge: new THREE.LatheGeometry(prof, 72),
    top: new THREE.CircleGeometry(0.942, 72).rotateX(-Math.PI / 2).translate(0, 0.074, 0),
    bot: new THREE.CircleGeometry(0.942, 72).rotateX(Math.PI / 2).translate(0, -0.074, 0),
  };

  const maxAniso = r.capabilities.getMaxAnisotropy();
  const tex = (cv: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    return t;
  };
  const mats = BRANDS.map((b) => {
    const et = tex(edgeCanvas(b));
    et.wrapS = THREE.RepeatWrapping;
    return {
      face: new THREE.MeshPhysicalMaterial({ map: tex(faceCanvas(b, o.fontFamily)), roughness: 0.38, clearcoat: 0.85, clearcoatRoughness: 0.14, envMapIntensity: 0.9 }),
      edge: new THREE.MeshPhysicalMaterial({ map: et, roughness: 0.48, clearcoat: 0.5, clearcoatRoughness: 0.25, envMapIntensity: 0.8, side: THREE.DoubleSide }),
    };
  });

  // Post: layer targets, blur, composite.
  const HF = THREE.HalfFloatType;
  const rt = {
    far: new THREE.WebGLRenderTarget(1, 1, { type: HF }),
    farB: new THREE.WebGLRenderTarget(1, 1, { type: HF }),
    mid: new THREE.WebGLRenderTarget(1, 1, { type: HF, samples: 4 }),
    near: new THREE.WebGLRenderTarget(1, 1, { type: HF }),
    nearB: new THREE.WebGLRenderTarget(1, 1, { type: HF }),
  };
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } },
    vertexShader: VS,
    depthTest: false,
    depthWrite: false,
    fragmentShader: `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
      void main(){
        vec4 s = texture2D(tex, vUv) * 0.19648;
        s += (texture2D(tex, vUv + dir * 1.41176) + texture2D(tex, vUv - dir * 1.41176)) * 0.29691;
        s += (texture2D(tex, vUv + dir * 3.29412) + texture2D(tex, vUv - dir * 3.29412)) * 0.09447;
        s += (texture2D(tex, vUv + dir * 5.17647) + texture2D(tex, vUv - dir * 5.17647)) * 0.01038;
        gl_FragColor = s;
      }`,
  });
  const compMat = new THREE.ShaderMaterial({
    uniforms: {
      tFar: { value: rt.far.texture },
      tMid: { value: rt.mid.texture },
      tNear: { value: rt.near.texture },
      bgTop: { value: new THREE.Color(GROUND.top) },
      bgBot: { value: new THREE.Color(GROUND.bot) },
      haze: { value: GROUND.haze },
      scrim: { value: o.scrim },
      aspect: { value: 1 },
      seed: { value: 0 },
    },
    vertexShader: VS,
    depthTest: false,
    depthWrite: false,
    fragmentShader: `uniform sampler2D tFar, tMid, tNear; uniform vec3 bgTop, bgBot; uniform float haze, scrim, aspect, seed; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0., 1.); }
      vec4 tm(vec4 s){ if (s.a < 1e-4) return vec4(0.); return vec4(aces(s.rgb / s.a * 1.05) * s.a, s.a); }
      vec3 srgb(vec3 c){ c = max(c, 0.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - 0.055, step(0.0031308, c)); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
      void main(){
        vec2 q = (vUv - 0.5) * vec2(aspect, 1.);
        vec3 bg = mix(bgBot, bgTop, smoothstep(0., 1., vUv.y));
        bg *= 1.0 - 0.28 * smoothstep(0.35, 1.25, length(q));
        vec4 f = tm(texture2D(tFar, vUv)), m = tm(texture2D(tMid, vUv)), n = tm(texture2D(tNear, vUv));
        f.rgb = mix(f.rgb, bg * f.a, haze);
        n.rgb = mix(n.rgb, bg * n.a, haze * 0.45);
        vec3 c = bg;
        c = f.rgb + c * (1. - f.a);
        c = m.rgb + c * (1. - m.a);
        c = n.rgb + c * (1. - n.a);
        c = mix(c, bg, scrim * (0.75 + 0.25 * (1. - smoothstep(0., 0.9, length(q)))));
        vec3 o = srgb(c) + (hash(gl_FragCoord.xy) - 0.5) / 255.;
        gl_FragColor = vec4(o, 1.);
      }`,
  });
  const qScene = new THREE.Scene();
  const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat);
  quad.frustumCulled = false;
  qScene.add(quad);

  let chips: Chip[] = [];
  let countKey = 0;
  let t = 0;

  function buildChips() {
    chips.forEach((c) => scene.remove(c.g));
    const af = (countKey || 20) / 20;
    const d = Math.max(0.3, o.density);
    const rand = rng(7);
    const layers = [
      { id: 1, n: Math.round(26 * af * d), z: [-42, -12], s: [0.85, 1.25], cyc: [1, 2] },
      { id: 2, n: Math.round(13 * af * d), z: [-7, 4], s: [0.7, 1.1], cyc: [1, 2] },
      { id: 3, n: Math.max(0, Math.round(o.foregroundChips)), z: [6.5, 9], s: [0.85, 1], cyc: [2, 3] },
    ];
    chips = [];
    let idx = 0;
    for (const L of layers) {
      const xs = Array.from({ length: L.n }, (_, i) => ((i + 0.15 + rand() * 0.7) / L.n) * 2.3 - 1.15).sort(() => rand() - 0.5);
      for (let i = 0; i < L.n; i++) {
        const m = mats[idx++ % 2];
        const g = new THREE.Group();
        for (const [gm, mat] of [
          [geo.edge, m.edge],
          [geo.top, m.face],
          [geo.bot, m.face],
        ] as const) {
          const mesh = new THREE.Mesh(gm, mat);
          mesh.layers.set(L.id);
          if (L.id === 2) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
          g.add(mesh);
        }
        const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const rf = (a: number, b: number) => a + rand() * (b - a);
        const sgn = () => (rand() < 0.5 ? -1 : 1);
        const c: Chip = {
          g,
          z: rf(L.z[0], L.z[1]),
          nx: xs[i],
          scale: rf(L.s[0], L.s[1]),
          phase: (i + rand() * 0.8) / L.n,
          cyc: ri(L.cyc[0], L.cyc[1]),
          bx: rf(-1.2, 1.2),
          by: rand() * Math.PI * 2,
          bz: rf(-0.6, 0.6),
          kx: rand() < 0.45 ? sgn() : 0,
          ky: sgn() * ri(1, 2),
          wx: ri(1, 3),
          wz: ri(1, 2),
          px: rand() * 6.28,
          pz: rand() * 6.28,
          drift: rf(0.2, 0.6),
          dw: ri(1, 2),
          dp: rand() * 6.28,
        };
        g.scale.setScalar(c.scale);
        scene.add(g);
        chips.push(c);
      }
    }
  }

  function update(time: number) {
    const tanH = Math.tan((cam.fov * Math.PI) / 180 / 2);
    const tau = (time / LOOP) * Math.PI * 2;
    for (const c of chips) {
      const hh = (cam.position.z - c.z) * tanH;
      const hw = hh * cam.aspect;
      const margin = 1.5 * c.scale;
      const p = (c.phase + (c.cyc * time) / LOOP) % 1;
      c.g.position.set(c.nx * hw + c.drift * Math.sin(tau * c.dw + c.dp), hh + margin - p * 2 * (hh + margin), c.z);
      c.g.rotation.set(
        c.bx + c.kx * tau + 0.35 * Math.sin(tau * c.wx + c.px),
        c.by + c.ky * tau,
        c.bz + 0.3 * Math.sin(tau * c.wz + c.pz),
      );
    }
    compMat.uniforms.seed.value = (time * 7.31) % 100;
  }

  function blur(a: THREE.WebGLRenderTarget, b: THREE.WebGLRenderTarget, radius: number, iters: number) {
    const u = blurMat.uniforms;
    quad.material = blurMat;
    for (let i = 0; i < iters; i++) {
      const k = radius * (1 + i * 0.75);
      u.tex.value = a.texture;
      (u.dir.value as THREE.Vector2).set(k / a.width, 0);
      r.setRenderTarget(b);
      r.render(qScene, qCam);
      u.tex.value = b.texture;
      (u.dir.value as THREE.Vector2).set(0, k / a.height);
      r.setRenderTarget(a);
      r.render(qScene, qCam);
    }
  }

  function draw() {
    r.setClearColor(0x000000, 0);
    if (o.depthOfField) {
      cam.layers.set(1);
      r.setRenderTarget(rt.far);
      r.clear();
      r.render(scene, cam);
      blur(rt.far, rt.farB, 1.1, 2);
      cam.layers.set(2);
      r.shadowMap.needsUpdate = true;
      r.setRenderTarget(rt.mid);
      r.clear();
      r.render(scene, cam);
      cam.layers.set(3);
      r.setRenderTarget(rt.near);
      r.clear();
      r.render(scene, cam);
      blur(rt.near, rt.nearB, 1.25, 2);
    } else {
      r.setRenderTarget(rt.far);
      r.clear();
      r.setRenderTarget(rt.near);
      r.clear();
      cam.layers.set(1);
      cam.layers.enable(2);
      cam.layers.enable(3);
      r.shadowMap.needsUpdate = true;
      r.setRenderTarget(rt.mid);
      r.clear();
      r.render(scene, cam);
    }
    quad.material = compMat;
    r.setRenderTarget(null);
    r.render(qScene, qCam);
  }

  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    r.setSize(w, h, false);
    const pr = r.getPixelRatio();
    const W = Math.round(w * pr);
    const H = Math.round(h * pr);
    rt.mid.setSize(W, H);
    rt.far.setSize(W >> 1, H >> 1);
    rt.farB.setSize(W >> 1, H >> 1);
    rt.near.setSize(W >> 2, H >> 2);
    rt.nearB.setSize(W >> 2, H >> 2);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    compMat.uniforms.aspect.value = w / h;
    // Chip count follows the area: more for wide screens (as in the design) and, since the
    // scene also runs behind the partner panel, more for tall stages too.
    const k = Math.round(Math.min(1.6, Math.max(0.8, w / h / 1.78, (h / w) * 0.9)) * 20);
    if (k !== countKey) {
      countKey = k;
      buildChips();
    }
    update(t);
    draw();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let raf = 0;
  let last: number | null = null;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last ?? now)) / 1000);
    last = now;
    t = (t + dt * o.speed) % LOOP;
    update(t);
    draw();
  };

  return {
    start() {
      if (raf) return;
      last = null;
      raf = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
    renderStill(time = 6) {
      t = time;
      update(t);
      draw();
    },
    dispose() {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      chips.forEach((c) => scene.remove(c.g));
      Object.values(geo).forEach((g) => g.dispose());
      mats.forEach((m) => {
        m.face.map?.dispose();
        m.edge.map?.dispose();
        m.face.dispose();
        m.edge.dispose();
      });
      Object.values(rt).forEach((t) => t.dispose());
      blurMat.dispose();
      compMat.dispose();
      scene.environment?.dispose();
      r.dispose();
      r.domElement.remove();
    },
  };
}
