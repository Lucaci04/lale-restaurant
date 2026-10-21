// Lale, obiectul 3D: un sahan de aramă bătută, modelat în cod (three.js r160, servit local).
// Un singur canvas fix în spatele paginii. Sahanul „călătorește” între opririle marcate cu
// [data-sahan-stop] (hero, coloana meniului) și dispare unde nu are oprire.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const POSES = {
  hero: { tiltX: 0.62, tiltZ: -0.14, size: 1 },
  menu: { tiltX: 1.02, tiltZ: 0.1, size: 0.86 },
};
const FOV = 28;
const CAMERA_Z = 12;
const MODEL_DIAMETER = 3.2;

const webglAvailable = () => {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch (_) {
    return false;
  }
};

// Textura de ciocănire: un câmp de înălțimi din adâncituri suprapuse, transformat în normal map.
const hammeredNormalMap = (width, height, dents, seed) => {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const field = new Float32Array(width * height);
  for (let i = 0; i < dents; i += 1) {
    const cx = rand() * width;
    const cy = rand() * height;
    const r = 5 + rand() * 13;
    const depth = 0.6 + rand() * 0.6;
    const r2 = r * r;
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(height, Math.ceil(cy + r)); y += 1) {
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx += 1) {
        const x = Math.floor(cx) + dx;
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 >= r2) continue;
        const k = 1 - d2 / r2;
        field[y * width + ((x % width) + width) % width] -= depth * k * k;
      }
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, height);
  const at = (x, y) => field[Math.min(height - 1, Math.max(0, y)) * width + ((x % width) + width) % width];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let nx = (at(x - 1, y) - at(x + 1, y)) * 1.6;
      let ny = (at(x, y - 1) - at(x, y + 1)) * 1.6;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const o = (y * width + x) * 4;
      img.data[o] = (nx * 0.5 + 0.5) * 255;
      img.data[o + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[o + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
};

const buildSahan = (anisotropy) => {
  const hammer = hammeredNormalMap(1024, 512, 2600, 7);
  hammer.repeat.set(2.5, 1);
  hammer.anisotropy = anisotropy;
  const hammerFine = hammer.clone();
  hammerFine.repeat.set(4, 1.6);
  const hammerFlat = hammer.clone();
  hammerFlat.repeat.set(1.6, 1.6);

  const copper = new THREE.MeshPhysicalMaterial({
    color: 0xb05a2e, metalness: 1, roughness: 0.28,
    normalMap: hammer, normalScale: new THREE.Vector2(0.55, 0.55),
    clearcoat: 0.25, clearcoatRoughness: 0.4, side: THREE.DoubleSide,
  });
  const tin = new THREE.MeshPhysicalMaterial({
    color: 0x9ea3a6, metalness: 1, roughness: 0.36,
    normalMap: hammerFine, normalScale: new THREE.Vector2(0.3, 0.3), side: THREE.DoubleSide,
  });
  const tinFloor = tin.clone();
  tinFloor.normalMap = hammerFlat;
  tinFloor.normalScale = new THREE.Vector2(0.45, 0.45);

  // Profilul vasului (rază, înălțime), rotit în jurul axei: fund plat, perete evazat, buză răsfrântă.
  const outer = [[0.001, 0], [1.0, 0], [1.08, 0.02], [1.14, 0.06], [1.22, 0.22], [1.3, 0.4], [1.34, 0.47], [1.4, 0.5], [1.44, 0.49], [1.45, 0.46]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const inner = [[0.98, 0.025], [1.06, 0.045], [1.12, 0.085], [1.2, 0.24], [1.28, 0.41], [1.32, 0.475], [1.36, 0.495]]
    .map(([x, y]) => new THREE.Vector2(x, y));

  const body = new THREE.Group();
  body.add(new THREE.Mesh(new THREE.LatheGeometry(outer, 160), copper));
  body.add(new THREE.Mesh(new THREE.LatheGeometry(inner, 160), tin));
  // Fundul cositorit: disc separat, cu UV plan, ca adânciturile să nu se strângă radial spre centru.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.985, 128), tinFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.025;
  body.add(floor);

  // Două mânere (kulp) din aramă, prinse de buză.
  const handleGeometry = new THREE.TorusGeometry(0.17, 0.035, 18, 48, Math.PI);
  [0, Math.PI].forEach((angle) => {
    const holder = new THREE.Group();
    holder.rotation.y = angle;
    const handle = new THREE.Mesh(handleGeometry, copper);
    handle.position.set(1.4, 0.44, 0);
    handle.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    holder.add(handle);
    body.add(holder);
  });
  body.position.y = -0.25;
  return body;
};

// Fără WebGL: imaginea statică a sahanului, randată din aceeași scenă.
const showPoster = () => {
  document.querySelectorAll('img[data-poster]').forEach((img) => {
    img.src = img.dataset.poster;
    img.hidden = false;
  });
};

const init = () => {
  const stops = [...document.querySelectorAll('[data-sahan-stop]')];
  if (!stops.length) return;
  if (!webglAvailable()) { showPoster(); return; }

  const canvas = document.createElement('canvas');
  canvas.className = 'sahan-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAMERA_Z);

  const key = new THREE.DirectionalLight(0xffe2c4, 2.2);
  key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight(0x9fd1c4, 1.0);
  rim.position.set(-4, 2, -3);
  const sweep = new THREE.PointLight(0xfff0e0, 0, 0, 2);
  sweep.position.set(-6, 2.5, 4);
  scene.add(key, rim, sweep);

  const pivot = new THREE.Group();
  const spinner = new THREE.Group();
  spinner.add(buildSahan(renderer.capabilities.getMaxAnisotropy()));
  pivot.add(spinner);
  scene.add(pivot);

  const halfHeight = CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const state = { x: 0, y: 0, scale: 1, tiltX: POSES.hero.tiltX, tiltZ: POSES.hero.tiltZ, opacity: 0, placed: false };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let spin = 0.6;
  let spinVelocity = 0;
  let paused = false;
  let rafId = 0;
  let introStart = null;
  let lastOpacity = -1;

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', (event) => {
    if (!finePointer.matches) return;
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Semnătura: la alegerea unei categorii (click), sahanul face o jumătate de tură și se așază.
  window.addEventListener('lale:category', () => {
    if (!reduceMotion.matches && !paused) spinVelocity += 6.5;
  });

  // Rotația continuă poate fi oprită (mișcare automată mai lungă de 5 secunde). Cu reduced motion, butonul nu e necesar.
  const toggle = document.querySelector('[data-sahan-toggle]');
  const syncToggle = () => {
    if (!toggle) return;
    toggle.hidden = reduceMotion.matches;
    toggle.textContent = paused ? 'Pornește rotația sahanului' : 'Oprește rotația sahanului';
  };
  toggle?.addEventListener('click', () => {
    paused = !paused;
    if (paused) spinVelocity = 0;
    syncToggle();
  });
  reduceMotion.addEventListener('change', syncToggle);
  syncToggle();

  // Oprirea dominantă: cea mai vizibilă în fereastră. Fără oprire vizibilă, sahanul se estompează.
  const target = () => {
    let best = null;
    stops.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const overlap = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      const visible = Math.max(0, overlap) / Math.min(r.height, window.innerHeight);
      if (!best || visible > best.visible) best = { el, r, visible };
    });
    if (!best) return null;
    const { r } = best;
    const pose = POSES[best.el.dataset.pose] || POSES.hero;
    const halfWidth = halfHeight * camera.aspect;
    const worldPerPx = (2 * halfHeight) / window.innerHeight;
    return {
      x: ((r.left + r.width / 2) / window.innerWidth * 2 - 1) * halfWidth,
      y: -((r.top + r.height / 2) / window.innerHeight * 2 - 1) * halfHeight,
      scale: (Math.min(r.width, r.height) * pose.size * worldPerPx) / MODEL_DIAMETER,
      tiltX: pose.tiltX,
      tiltZ: pose.tiltZ,
      opacity: Math.min(1, best.visible * 2.2),
    };
  };

  let last = performance.now();
  const schedule = () => { if (!rafId) rafId = requestAnimationFrame(frame); };
  const frame = () => {
    rafId = 0;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const still = reduceMotion.matches;
    const frozen = still || paused;
    const goal = target();

    if (goal) {
      const k = still || !state.placed ? 1 : 1 - Math.exp(-dt * 5);
      ['x', 'y', 'scale', 'tiltX', 'tiltZ'].forEach((p) => { state[p] += (goal[p] - state[p]) * k; });
      state.opacity += (goal.opacity - state.opacity) * (still ? 1 : 1 - Math.exp(-dt * 8));
      state.placed = true;
    } else {
      state.opacity = 0;
    }

    if (state.opacity > 0.01) {
      if (introStart === null) introStart = performance.now();
      const t = still ? 1 : Math.min(1, (performance.now() - introStart) / 1400);
      const e = 1 - Math.pow(1 - t, 3);
      const sweepT = still ? 1 : Math.min(1, Math.max(0, (performance.now() - introStart - 200) / 1800));

      const ease = frozen ? 0 : 1 - Math.exp(-dt * 4);
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;
      if (!frozen) {
        spin += (0.12 + spinVelocity) * dt;
        spinVelocity *= Math.exp(-dt * 3.2);
      }

      pivot.position.set(state.x, state.y - 0.6 * state.scale * (1 - e), 0);
      pivot.scale.setScalar(state.scale);
      pivot.rotation.set(state.tiltX + 0.5 * (1 - e) + (still ? 0 : pointer.y * 0.12), 0, state.tiltZ - (still ? 0 : pointer.x * 0.12));
      spinner.rotation.y = spin;

      sweep.intensity = sweepT < 1 ? 40 * Math.sin(Math.PI * sweepT) : 0;
      sweep.position.x = -6 + 12 * sweepT;

      renderer.render(scene, camera);
    }

    if (Math.abs(state.opacity - lastOpacity) > 0.01) {
      canvas.style.opacity = state.opacity.toFixed(3);
      lastOpacity = state.opacity;
    }
    if (!document.hidden) schedule();
  };

  // O singură buclă: la revenirea în filă nu pornește a doua.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { last = performance.now(); schedule(); }
  });

  document.documentElement.classList.add('has-3d');
  schedule();
};

try {
  init();
} catch (error) {
  // Fără WebGL sau la orice eroare, rămâne imaginea statică a sahanului.
  document.documentElement.classList.remove('has-3d');
  showPoster();
  console.warn('Lale: scena 3D nu a pornit.', error);
}
