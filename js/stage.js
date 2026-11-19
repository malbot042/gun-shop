// Construcción del campo de tiro y de los stages a partir de JSON.
import * as THREE from 'three';
import { createTarget, TARGET_TYPES, resetTarget, updateTarget } from './targets.js';

export const PROP_TYPES = {
  wall:      { label: 'Pared 2 m', length: 2, height: 2.0 },
  lowwall:   { label: 'Pared baja 1 m', length: 2, height: 1.0 },
  glasswall: { label: 'Pared transparente', length: 2, height: 2.0 },
  softcover: { label: 'Soft cover (malla, la bala pasa)', length: 2, height: 2.0 },
  port:      { label: 'Panel con puerto (ventana)', length: 1, height: 2 },
  barrel:    { label: 'Barril', },
  table:     { label: 'Mesa', },
  cone:      { label: 'Cono / marca', },
  zone:      { label: 'Zona de tiro (shooting box)', },
  faultline: { label: 'Fault line', length: 3 },
  start:     { label: 'Posición de inicio', },
};

export const ALL_TYPES = { ...TARGET_TYPES, ...PROP_TYPES };

// ---------- Texturas procedurales ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

const groundTex = canvasTex(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#b8a27a'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 26000; i++) {
    const v = Math.random();
    ctx.fillStyle = v < 0.5 ? `rgba(120,95,60,${Math.random() * 0.25})` : `rgba(230,215,180,${Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}, [60, 60]);

const bermTex = canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#7d6a4a'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? `rgba(60,80,40,${Math.random() * 0.35})` : `rgba(150,130,95,${Math.random() * 0.3})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}, [10, 1]);

const wallTex = canvasTex(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#d8cfbd'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = 'rgba(120,100,70,0.25)';
    ctx.fillRect(i * w / 4, 0, 2, h);
  }
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(110,90,60,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 3, 1);
  }
});

const meshTex = canvasTex(128, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(30,40,30,0.95)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 16); ctx.lineTo(w, i * 16); ctx.stroke();
  }
});

const MATS = {
  ground: new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }),
  berm: new THREE.MeshStandardMaterial({ map: bermTex, roughness: 1 }),
  wall: new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x6d5434, roughness: 0.9 }),
  barrel: new THREE.MeshStandardMaterial({ color: 0x1f4f8f, roughness: 0.5, metalness: 0.4 }),
  fault: new THREE.MeshStandardMaterial({ color: 0xc8261e, roughness: 0.8 }),
  start: new THREE.MeshBasicMaterial({ color: 0xf2d230, transparent: true, opacity: 0.9 }),
  legs: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 }),
  cone: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 }),
  zone: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 }),
  sign: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
  glassEdge: new THREE.MeshStandardMaterial({ color: 0x8fb8d8, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.5 }),
};

// ---------- Escenario fijo (suelo, taludes, marcas de distancia) ----------
export const RANGE = { minX: -30, maxX: 30, minZ: -320, maxZ: 15 };

export function buildRange(scene) {
  const g = new THREE.Group();
  const shootables = [];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), MATS.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.hit = { kind: 'hard', ground: true };
  ground.name = 'ground';
  g.add(ground);
  shootables.push(ground);

  const addBerm = (w, h, d, x, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MATS.berm);
    m.position.set(x, h / 2, z); m.rotation.y = ry;
    m.receiveShadow = true;
    m.userData.hit = { kind: 'hard', berm: true };
    g.add(m); shootables.push(m);
    // inclinación visual: un prisma en la cara interior
    return m;
  };
  const len = RANGE.maxZ - RANGE.minZ;
  const midZ = (RANGE.maxZ + RANGE.minZ) / 2;
  addBerm(4, 4, len, RANGE.minX - 2, midZ);
  addBerm(4, 4, len, RANGE.maxX + 2, midZ);
  addBerm(RANGE.maxX - RANGE.minX + 8, 7, 5, 0, RANGE.minZ - 2.5);
  addBerm(RANGE.maxX - RANGE.minX + 8, 2.5, 2, 0, RANGE.maxZ + 1);

  // Carteles de distancia en el talud izquierdo
  for (const d of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300]) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#c00'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(d + 'm', 64, 46);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    for (const side of [-1, 1]) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: t }));
      sign.position.set(side * (RANGE.maxX - 0.05), 1.4, -d);
      sign.rotation.y = -side * Math.PI / 2;
      g.add(sign);
    }
  }

  // Mesa de preparación detrás del shooter
  const table = new THREE.Mesh(new THREE.BoxGeometry(2, 0.05, 0.8), MATS.frame);
  table.position.set(-4, 0.9, 8);
  g.add(table);
  for (const [x, z] of [[-4.9, 7.7], [-3.1, 7.7], [-4.9, 8.3], [-3.1, 8.3]]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), MATS.frame);
    l.position.set(x, 0.45, z); g.add(l);
  }
  scene.add(g);
  return { group: g, shootables };
}

// ---------- Parapetos (como en el Stage Designer de tiropractico.es) ----------
// Color y transparencia los da el stage: `color` (marron, metal, blanco, salmon, negro, gris) y
// `transparency` (0–100 %). Marco opaco de 5 cm (también alrededor del hueco del puerto); el corcho
// no tiene marco. La transparencia es solo visual: el parapeto sigue deteniendo la bala.
export const PARAPET_VARIANTS = {
  muro:   { label: 'Muro / barricada (madera)', colors: { marron: 'Marrón', metal: 'Metálico', blanco: 'Blanco' }, def: 'marron', frame: true },
  chapa:  { label: 'Muro de metal', colors: { negro: 'Negro', gris: 'Gris' }, def: 'gris', frame: true },
  corcho: { label: 'Corcho', colors: { blanco: 'Blanco', salmon: 'Salmón' }, def: 'blanco', frame: false },
};
const PARAPET_RGB = { metal: 0x9aa3ad, blanco: 0xf2f2f2, salmon: 0xf4a582, negro: 0x2b2e33, gris: 0x8a9099 };
const WOOD = 0x9b6b3d, PORT_WOOD = 0xa0703c, FRAME = 0.05;
const parapetMatCache = {};
function parapetMat(color, opacity, metallic) {
  const key = color + '|' + opacity + '|' + metallic;
  if (!parapetMatCache[key]) {
    parapetMatCache[key] = new THREE.MeshStandardMaterial({
      color, roughness: metallic ? 0.4 : 0.85, metalness: metallic ? 0.6 : 0,
      transparent: opacity < 1, opacity, depthWrite: opacity >= 1,
    });
  }
  return parapetMatCache[key];
}
export function parapetVariant(obj) { return obj.type === 'port' ? 'muro' : (PARAPET_VARIANTS[obj.variant] ? obj.variant : 'muro'); }
function buildParapet(g, meshes, obj, L, H, hole) {
  const variant = parapetVariant(obj);
  const vdef = PARAPET_VARIANTS[variant];
  const colorKey = obj.color in PARAPET_RGB || obj.color === 'marron' ? obj.color : (hole ? 'marron' : vdef.def);
  const rgb = PARAPET_RGB[colorKey] ?? (hole ? PORT_WOOD : WOOD);
  const metallic = colorKey === 'metal' || variant === 'chapa';
  const op = 1 - THREE.MathUtils.clamp(obj.transparency ?? 0, 0, 100) / 100;
  const frameM = parapetMat(rgb, 1, metallic);
  const fillM = parapetMat(rgb, op, metallic);
  const add = (w, h, d, m, x, y, isFill) => {
    if (w <= 0.001 || h <= 0.001) return;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, 0);
    b.castShadow = !isFill || op > 0.5;
    b.receiveShadow = true;
    if (isFill && op <= 0) b.visible = false; // 100 %: solo el marco (pero sigue deteniendo la bala)
    if (isFill && op < 1) b.renderOrder = 2;
    b.userData.hit = { kind: 'hard', wall: true };
    g.add(b); meshes.push(b);
  };
  const marco = (w, h, x, y) => {
    add(w, FRAME, 0.11, frameM, x, y - h / 2 + FRAME / 2);
    add(w, FRAME, 0.11, frameM, x, y + h / 2 - FRAME / 2);
    add(FRAME, h - 2 * FRAME, 0.11, frameM, x - w / 2 + FRAME / 2, y);
    add(FRAME, h - 2 * FRAME, 0.11, frameM, x + w / 2 - FRAME / 2, y);
  };
  const panel = (w, h, x, y) => add(w, h, 0.1, fillM, x, y, true);
  if (!vdef.frame && !hole) {
    panel(L, H, 0, H / 2);
  } else if (!hole) {
    marco(L, H, 0, H / 2);
    panel(L - 2 * FRAME, H - 2 * FRAME, 0, H / 2);
  } else {
    marco(L, H, 0, H / 2);
    const hw = Math.min(hole.w, L - 0.1), hb = hole.elev, ht = Math.min(hb + hole.h, H);
    const sideW = (L - hw) / 2;
    panel(sideW - FRAME, H - 2 * FRAME, -(hw / 2 + (sideW - FRAME) / 2), H / 2);
    panel(sideW - FRAME, H - 2 * FRAME, hw / 2 + (sideW - FRAME) / 2, H / 2);
    if (hb > FRAME) panel(hw, hb - FRAME, 0, FRAME + (hb - FRAME) / 2);
    if (H - FRAME - ht > 0) panel(hw, H - FRAME - ht, 0, ht + (H - FRAME - ht) / 2);
    marco(hw + 2 * FRAME, ht - hb + 2 * FRAME, 0, (hb + ht) / 2);
  }
  // patas de apoyo
  for (const sx of [-L / 2 + 0.1, L / 2 - 0.1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), MATS.frame);
    f.position.set(sx, 0.04, 0); g.add(f);
  }
}

// ---------- Objetos del stage ----------
function buildProp(obj) {
  const g = new THREE.Group();
  const meshes = [];
  const colliders = [];
  const t = obj.type;
  if (t === 'wall' || t === 'lowwall') {
    const L = obj.length ?? 2;
    const H = obj.height ?? (t === 'wall' ? 2.0 : 1.0);
    buildParapet(g, meshes, obj, L, H, null);
    colliders.push({ kind: 'box', hx: L / 2 + 0.02, hz: 0.06 });
  } else if (t === 'glasswall' || t === 'softcover') {
    const L = obj.length ?? 2;
    const H = obj.height ?? 2.0;
    const glass = t === 'glasswall';
    let m;
    if (glass) {
      m = new THREE.Mesh(new THREE.BoxGeometry(L, H, 0.02), MATS.glass);
      m.userData.hit = obj.blocks === false ? { kind: 'soft' } : { kind: 'hard', glass: true };
    } else {
      const tex = meshTex.clone(); tex.repeat.set(L * 4, H * 4); tex.needsUpdate = true;
      m = new THREE.Mesh(new THREE.PlaneGeometry(L, H), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }));
      m.userData.hit = { kind: 'soft' };
      m.castShadow = true;
    }
    m.position.y = H / 2;
    m.renderOrder = 2;
    g.add(m); meshes.push(m);
    // marco
    const fm = glass ? MATS.glassEdge : MATS.frame;
    for (const sx of [-L / 2, L / 2]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, H, 0.05), fm);
      p.position.set(sx, H / 2, 0); p.castShadow = true; g.add(p);
      p.userData.hit = { kind: 'hard' }; meshes.push(p);
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), MATS.frame);
      f.position.set(sx, 0.04, 0); g.add(f);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, 0.05), fm);
    top.position.y = H; g.add(top);
    colliders.push({ kind: 'box', hx: L / 2 + 0.02, hz: 0.06 });
  } else if (t === 'port') {
    // Panel con puerto: el hueco (centrado) deja pasar la vista y la bala
    const L = obj.length ?? 1, H = obj.height ?? 2;
    buildParapet(g, meshes, obj, L, H, { w: obj.holeW ?? 0.7, h: obj.holeH ?? 0.4, elev: obj.holeElev ?? 1.4 });
    colliders.push({ kind: 'box', hx: L / 2 + 0.02, hz: 0.06 });
  } else if (t === 'barrel') {
    const d = obj.diam ?? 0.6, h = obj.height ?? 0.9;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(d / 2 - 0.01, d / 2 - 0.01, h, 24), MATS.barrel);
    m.position.y = h / 2;
    m.castShadow = m.receiveShadow = true;
    m.userData.hit = { kind: 'hard' };
    g.add(m); meshes.push(m);
    for (const y of [h * 0.25, h * 0.75]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(d / 2 - 0.005, 0.012, 6, 24), MATS.barrel);
      r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r);
    }
    colliders.push({ kind: 'circle', r: d / 2 });
  } else if (t === 'table') {
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.5), MATS.frame);
    top.position.y = 0.985; top.castShadow = true;
    top.userData.hit = { kind: 'hard' };
    g.add(top); meshes.push(top);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.97, 0.04), MATS.legs);
      l.position.set(x * 0.21, 0.485, z * 0.21); g.add(l);
    }
    colliders.push({ kind: 'box', hx: 0.25, hz: 0.25 });
  } else if (t === 'cone') {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.45, 20), MATS.cone);
    c.position.y = 0.225; c.castShadow = true;
    c.userData.hit = { kind: 'hard' };
    g.add(c); meshes.push(c);
  } else if (t === 'zone') {
    const w = obj.width ?? 1, d = obj.depth ?? 1;
    for (const [bw, bd, x, z] of [[w, 0.06, 0, d / 2], [w, 0.06, 0, -d / 2], [0.06, d, -w / 2, 0], [0.06, d, w / 2, 0]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.04, bd), MATS.zone);
      b.position.set(x, 0.02, z); g.add(b);
    }
  } else if (t === 'faultline') {
    const L = obj.length ?? 3;
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, 0.07), MATS.fault);
    m.position.y = 0.02;
    m.userData.hit = { kind: 'hard' };
    g.add(m); meshes.push(m);
  } else if (t === 'start') {
    const size = 1.0;
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 4];
      const len = Math.hypot(bx - ax, bz - az) * size / 2;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.06), MATS.start);
      s.rotation.x = -Math.PI / 2;
      s.position.set((ax + bx) / 4 * size, 0.012, (az + bz) / 4 * size);
      if (ax === bx) s.rotation.z = Math.PI / 2;
      g.add(s);
    }
    // flecha indicando la dirección
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.35); shape.lineTo(0.18, 0.05); shape.lineTo(0.06, 0.05); shape.lineTo(0.06, -0.3);
    shape.lineTo(-0.06, -0.3); shape.lineTo(-0.06, 0.05); shape.lineTo(-0.18, 0.05); shape.closePath();
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), MATS.start);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.y = 0.013;
    g.add(arrow);
    g.userData.isStart = true;
  }
  // elevación (el elemento entero, como en el Stage Designer: p. ej. un muro sobre una base)
  g.position.set(obj.x, ['faultline', 'start', 'zone'].includes(t) ? 0 : (obj.elev || 0), obj.z);
  g.rotation.y = THREE.MathUtils.degToRad(obj.rot || 0);
  return { group: g, meshes, colliders };
}

export class Stage {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.data = null;
    this.entries = []; // { obj, group, state?, meshes, colliders }
    this.targets = [];
  }

  load(data) {
    this.clear();
    this.data = data;
    for (const obj of data.objects) this.addEntry(obj);
  }

  clear() {
    for (const e of this.entries) this.root.remove(e.group);
    this.entries = [];
    this.targets = [];
  }

  addEntry(obj) {
    let entry;
    if (TARGET_TYPES[obj.type]) {
      const { group, state } = createTarget(obj);
      entry = { obj, group, state, meshes: state.meshes, colliders: [] };
      this.targets.push(state);
    } else {
      const p = buildProp(obj);
      entry = { obj, group: p.group, meshes: p.meshes, colliders: p.colliders };
    }
    group_tag(entry);
    this.root.add(entry.group);
    this.entries.push(entry);
    return entry;
  }

  removeEntry(entry) {
    this.root.remove(entry.group);
    this.entries = this.entries.filter(e => e !== entry);
    if (entry.state) this.targets = this.targets.filter(t => t !== entry.state);
  }

  rebuildEntry(entry) {
    const idx = this.entries.indexOf(entry);
    this.removeEntry(entry);
    const ne = this.addEntry(entry.obj);
    // mantener el orden
    this.entries.pop();
    this.entries.splice(idx, 0, ne);
    return ne;
  }

  get shootables() {
    const list = [];
    for (const e of this.entries) list.push(...e.meshes);
    return list;
  }

  get start() {
    const s = this.data?.objects.find(o => o.type === 'start');
    return s || { x: 0, z: 5, rot: 0 };
  }

  resetTargets() { for (const t of this.targets) resetTarget(t); }
  update(dt) { for (const t of this.targets) updateTarget(t, dt); }

  // Resuelve colisión de un círculo (jugador) con los objetos del stage
  collide(pos, radius) {
    for (const e of this.entries) {
      for (const c of e.colliders) {
        const o = e.obj;
        const a = THREE.MathUtils.degToRad(o.rot || 0);
        const cos = Math.cos(a), sin = Math.sin(a);
        const dx = pos.x - o.x, dz = pos.z - o.z;
        // a espacio local (rotación inversa en Y)
        const lx = dx * cos - dz * sin;
        const lz = dx * sin + dz * cos;
        if (c.kind === 'circle') {
          const d = Math.hypot(lx, lz), min = c.r + radius;
          if (d < min) {
            if (d < 1e-6) { pos.z = o.z + min; continue; }
            pos.x = o.x + dx / d * min;
            pos.z = o.z + dz / d * min;
          }
        } else {
          const cx = THREE.MathUtils.clamp(lx, -c.hx, c.hx);
          const cz = THREE.MathUtils.clamp(lz, -c.hz, c.hz);
          let ox = lx - cx, oz = lz - cz;
          const d = Math.hypot(ox, oz);
          if (d < radius) {
            let nlx, nlz;
            if (d > 1e-6) { nlx = cx + ox / d * radius; nlz = cz + oz / d * radius; }
            else {
              // dentro de la caja: empujar por el eje más cercano
              const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz);
              if (px < pz) { nlx = Math.sign(lx || 1) * (c.hx + radius); nlz = lz; }
              else { nlx = lx; nlz = Math.sign(lz || 1) * (c.hz + radius); }
            }
            // de vuelta a mundo
            pos.x = o.x + nlx * cos + nlz * sin;
            pos.z = o.z - nlx * sin + nlz * cos;
          }
        }
      }
    }
    pos.x = THREE.MathUtils.clamp(pos.x, RANGE.minX + 0.5, RANGE.maxX - 0.5);
    pos.z = THREE.MathUtils.clamp(pos.z, RANGE.minZ + 1, RANGE.maxZ - 0.5);
  }

  // Estadísticas del stage
  summary() {
    let paper = 0, steel = 0, ns = 0, shots = 0;
    for (const o of this.data.objects) {
      const d = TARGET_TYPES[o.type];
      if (!d) continue;
      if (d.noshoot) ns++;
      else if (d.paper) { paper++; shots += Math.max(1, Math.round(o.shots || 2)); }
      else { steel++; shots++; }
    }
    return { paper, steel, ns, rounds: shots, maxPoints: shots * 5 };
  }
}

function group_tag(entry) {
  entry.group.userData.entry = entry;
  entry.group.traverse(o => { o.userData.entry = entry; });
}

// ---------- Stages predefinidos ----------
export const PRESET_STAGES = [
  {
    id: 'preset-basic', name: 'Classifier básico', description: '6 papeles, 2 poppers y un no-shoot. Desde la caja de salida.',
    objects: [
      { type: 'start', x: 0, z: 0, rot: 0 },
      { type: 'faultline', x: 0, z: -0.7, rot: 0, length: 3 },
      { type: 'paper', x: -3, z: -7, rot: 0, height: 0.9 },
      { type: 'paper', x: -1, z: -7, rot: 0, height: 0.9 },
      { type: 'paper', x: 1, z: -7, rot: 0, height: 0.9 },
      { type: 'paper', x: 3, z: -7, rot: 0, height: 0.9 },
      { type: 'noshoot', x: 0, z: -10, rot: 0, height: 0.9 },
      { type: 'paper', x: -1.2, z: -12, rot: 0, height: 1.0 },
      { type: 'paper', x: 1.2, z: -12, rot: 0, height: 1.0 },
      { type: 'popper', x: -5, z: -14, rot: 0 },
      { type: 'popper', x: 5, z: -14, rot: 0 },
    ],
  },
  {
    id: 'preset-house', name: 'La casa', description: 'Recorrido con paredes, ventanas de tiro y placas. Hay que moverse.',
    objects: [
      { type: 'start', x: 0, z: 2, rot: 0 },
      { type: 'wall', x: -3, z: -2, rot: 90, length: 6 },
      { type: 'wall', x: 3, z: -2, rot: 90, length: 6 },
      { type: 'wall', x: -1.8, z: -5, rot: 0, length: 2.4 },
      { type: 'wall', x: 1.8, z: -5, rot: 0, length: 2.4 },
      { type: 'lowwall', x: 0, z: -5, rot: 0, length: 1.2 },
      { type: 'barrel', x: -1.5, z: 0.5, rot: 0 },
      { type: 'paper', x: -6, z: -3, rot: 70, height: 0.9 },
      { type: 'paper', x: -6, z: -1, rot: 80, height: 0.9 },
      { type: 'noshoot', x: 6, z: -2.4, rot: -80, height: 0.9 },
      { type: 'paper', x: 6, z: -1.6, rot: -80, height: 0.9 },
      { type: 'paper', x: 0, z: -10, rot: 0, height: 0.8 },
      { type: 'mini', x: 1.2, z: -12, rot: 0, height: 1.2 },
      { type: 'wall', x: -0.6, z: -10.2, rot: 0, length: 0.8, height: 1.4 },
      { type: 'plate', x: -2, z: -15, rot: 0 },
      { type: 'plate', x: -1, z: -15, rot: 0 },
      { type: 'plate', x: 0, z: -15, rot: 0 },
      { type: 'plate', x: 1, z: -15, rot: 0 },
      { type: 'plate', x: 2, z: -15, rot: 0 },
      { type: 'minipopper', x: 4, z: -18, rot: 0 },
    ],
  },
  {
    id: 'preset-long', name: 'Larga distancia (rifle)', description: 'Blancos de 25 a 100 m. Ideal para visores.',
    objects: [
      { type: 'start', x: 0, z: 0, rot: 0 },
      { type: 'lowwall', x: 0, z: -1, rot: 0, length: 3 },
      { type: 'paper', x: -4, z: -25, rot: 0, height: 0.9 },
      { type: 'paper', x: 4, z: -25, rot: 0, height: 0.9 },
      { type: 'paper', x: -2, z: -50, rot: 0, height: 0.9 },
      { type: 'noshoot', x: 0, z: -50, rot: 0, height: 0.9 },
      { type: 'paper', x: 2, z: -50, rot: 0, height: 0.9 },
      { type: 'mini', x: -3, z: -75, rot: 0, height: 1 },
      { type: 'mini', x: 3, z: -75, rot: 0, height: 1 },
      { type: 'popper', x: -6, z: -100, rot: 0 },
      { type: 'popper', x: 0, z: -100, rot: 0 },
      { type: 'popper', x: 6, z: -100, rot: 0 },
      { type: 'plate', x: 10, z: -60, rot: 0 },
      { type: 'plate', x: -10, z: -60, rot: 0 },
    ],
  },
  {
    id: 'preset-300', name: 'Larga distancia 300 m', description: 'Para visores 3-12x / 5-25x: papel y metal de 150 a 300 m. La pared transparente deja ver pero no disparar: muévete para rodearla.',
    objects: [
      { type: 'start', x: 0, z: 0, rot: 0 },
      { type: 'glasswall', x: -2, z: -3, rot: 0, length: 3, height: 2.2, blocks: true },
      { type: 'paper', x: -4, z: -150, rot: 0, height: 1.0 },
      { type: 'paper', x: 4, z: -150, rot: 0, height: 1.0, hardcover: 'diagL' },
      { type: 'noshoot', x: 0, z: -150, rot: 0, height: 1.0 },
      { type: 'plate', x: -8, z: -200, rot: 0, height: 1.2, shape: 'square', size: 0.3 },
      { type: 'plate', x: 8, z: -200, rot: 0, height: 1.2, shape: 'round', size: 0.3 },
      { type: 'popper', x: -3, z: -250, rot: 0 },
      { type: 'popper', x: 3, z: -250, rot: 0 },
      { type: 'paper', x: 0, z: -300, rot: 0, height: 1.2 },
    ],
  },
  {
    id: 'preset-shotgun', name: 'Escopeta: steel y slugs', description: 'Poppers y placas cerca, papeles para slug.',
    objects: [
      { type: 'start', x: 0, z: 0, rot: 0 },
      { type: 'barrel', x: -2, z: -2, rot: 0 },
      { type: 'barrel', x: 2, z: -2, rot: 0 },
      { type: 'popper', x: -4, z: -9, rot: 0 },
      { type: 'popper', x: -2, z: -10, rot: 0 },
      { type: 'popper', x: 2, z: -10, rot: 0 },
      { type: 'popper', x: 4, z: -9, rot: 0 },
      { type: 'plate', x: -1, z: -7, rot: 0, height: 0.8 },
      { type: 'plate', x: 0, z: -7, rot: 0, height: 0.8 },
      { type: 'plate', x: 1, z: -7, rot: 0, height: 0.8 },
      { type: 'paper', x: -3, z: -18, rot: 0, height: 0.9 },
      { type: 'paper', x: 3, z: -18, rot: 0, height: 0.9 },
    ],
  },
];
