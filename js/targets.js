// Blancos IPSC: papel (Classic, Mini, No-Shoot) y metal (Popper, Mini Popper, Placa).
import * as THREE from 'three';

// --- Geometría del blanco IPSC Classic (metros, origen en el borde inferior central) ---
const OUTLINE = [
  [-0.15, 0], [0.15, 0], [0.23, 0.08], [0.23, 0.48], [0.13, 0.58], [0.075, 0.58], [0.075, 0.74],
  [0.055, 0.76], [-0.055, 0.76], [-0.075, 0.74], [-0.075, 0.58], [-0.13, 0.58], [-0.23, 0.48], [-0.23, 0.08],
];
const ZONE_A_BODY = [[-0.075, 0.2], [0.075, 0.2], [0.075, 0.48], [-0.075, 0.48]];
const ZONE_C_BODY = [[-0.1, 0.1], [0.1, 0.1], [0.15, 0.15], [0.15, 0.505], [0.1, 0.555], [-0.1, 0.555], [-0.15, 0.505], [-0.15, 0.15]];
const ZONE_A_HEAD = [[-0.045, 0.6], [0.045, 0.6], [0.045, 0.66], [-0.045, 0.66]];
const W = 0.46, H = 0.76;

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Devuelve 'A' | 'C' | 'D' | null para un punto en coordenadas locales (sin escalar)
export function paperZone(x, y) {
  if (!pointInPoly(x, y, OUTLINE)) return null;
  if (pointInPoly(x, y, ZONE_A_BODY) || pointInPoly(x, y, ZONE_A_HEAD)) return 'A';
  if (y > 0.58) return 'C'; // zona B de la cabeza puntúa como C
  if (pointInPoly(x, y, ZONE_C_BODY)) return 'C';
  return 'D';
}

export const ZONE_POINTS = {
  major: { A: 5, C: 4, D: 2 },
  minor: { A: 5, C: 3, D: 1 },
};

// --- Texturas ---
const texCache = {};
function paperTexture(kind) {
  if (texCache[kind]) return texCache[kind];
  const px = 512;
  const cw = px, ch = Math.round(px * H / W);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  const tx = x => (x + W / 2) / W * cw;
  const ty = y => (1 - y / H) * ch;
  const path = poly => { ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(tx(x), ty(y)) : ctx.moveTo(tx(x), ty(y))); ctx.closePath(); };
  const base = kind === 'noshoot' ? '#f4f2ec' : '#c9a36b';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, cw, ch);
  // ruido de cartón
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = kind === 'noshoot' ? `rgba(0,0,0,${Math.random() * 0.03})` : `rgba(90,60,20,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * cw, Math.random() * ch, 2, 2);
  }
  ctx.strokeStyle = kind === 'noshoot' ? 'rgba(80,80,80,0.55)' : 'rgba(70,45,15,0.55)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 5]);
  path(ZONE_C_BODY); ctx.stroke();
  path(ZONE_A_BODY); ctx.stroke();
  path(ZONE_A_HEAD); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx(-0.075), ty(0.58)); ctx.lineTo(tx(0.075), ty(0.58)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = kind === 'noshoot' ? 'rgba(60,60,60,0.5)' : 'rgba(70,45,15,0.6)';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('A', tx(0), ty(0.33));
  ctx.fillText('C', tx(0.115), ty(0.14));
  ctx.fillText('D', tx(0.195), ty(0.1));
  ctx.fillText('B', tx(0), ty(0.69));
  if (kind === 'noshoot') {
    ctx.fillStyle = 'rgba(40,40,40,0.35)';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('NO', tx(0), ty(0.44));
    ctx.fillText('SHOOT', tx(0), ty(0.39));
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = kind === 'noshoot' ? '#999' : '#7a5a2c';
  path(OUTLINE); ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache[kind] = t;
  return t;
}

let paperGeo = null;
function getPaperGeometry() {
  if (paperGeo) return paperGeo;
  const shape = new THREE.Shape(OUTLINE.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, pos.getY(i) / H);
  paperGeo = geo;
  return geo;
}

const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 });
const steelPaint = new THREE.MeshStandardMaterial({ color: 0xe9e4d4, roughness: 0.6, metalness: 0.3 });
const steelDark = new THREE.MeshStandardMaterial({ color: 0x555a5e, roughness: 0.5, metalness: 0.7 });
const holeMatCache = {};
function holeMat(color) {
  if (!holeMatCache[color]) holeMatCache[color] = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  return holeMatCache[color];
}

export const TARGET_TYPES = {
  paper:      { label: 'IPSC Classic (papel)', paper: true },
  mini:       { label: 'IPSC Mini (papel)', paper: true },
  noshoot:    { label: 'No-Shoot', paper: true, noshoot: true },
  popper:     { label: 'Popper IPSC (metal)', steel: true },
  minipopper: { label: 'Mini Popper (metal)', steel: true },
  plate:      { label: 'Placa redonda 20 cm (metal)', steel: true },
};

// Crea un blanco. Devuelve { group, state } donde state guarda impactos y estado.
export function createTarget(obj) {
  const type = obj.type;
  const group = new THREE.Group();
  const state = { obj, type, hits: [], down: false, meshes: [], holes: [], anim: null };
  const def = TARGET_TYPES[type];

  if (def.paper) {
    const scale = type === 'mini' ? 0.667 : 1;
    const h = obj.height ?? 0.9;
    // postes
    const postH = h + 0.15 * scale;
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.025, postH, 0.025), woodMat);
    p1.position.set(-0.1 * scale, postH / 2, 0.012); p1.castShadow = true;
    const p2 = p1.clone(); p2.position.x = 0.1 * scale;
    group.add(p1, p2);
    const baseM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.25), woodMat);
    baseM.position.y = 0.025; baseM.castShadow = true;
    group.add(baseM);
    for (const p of [p1, p2, baseM]) { p.userData.hit = { kind: 'hard', soft: true }; state.meshes.push(p); }

    const paper = new THREE.Mesh(getPaperGeometry(), new THREE.MeshStandardMaterial({
      map: paperTexture(type === 'noshoot' ? 'noshoot' : 'paper'), side: THREE.DoubleSide, roughness: 0.95,
    }));
    paper.scale.setScalar(scale);
    paper.position.y = h;
    paper.castShadow = true;
    paper.receiveShadow = true;
    paper.userData.hit = { kind: 'paper', state, scale };
    group.add(paper);
    state.paper = paper;
    state.meshes.push(paper);
  } else {
    // Metal: pivote en la base para la caída
    const pivot = new THREE.Group();
    group.add(pivot);
    state.pivot = pivot;
    let face;
    if (type === 'plate') {
      const h = obj.height ?? 1.0;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, 0.04), steelDark);
      post.position.set(0, h / 2, 0.06); post.castShadow = true;
      post.userData.hit = { kind: 'hard' };
      group.add(post);
      state.meshes.push(post);
      pivot.position.set(0, h - 0.1, 0);
      face = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 28), steelPaint);
      face.rotation.x = Math.PI / 2;
      face.position.y = 0.1;
    } else {
      const s = type === 'minipopper' ? 0.6 : 1;
      const shape = new THREE.Shape();
      shape.moveTo(-0.075, 0);
      shape.lineTo(0.075, 0);
      shape.lineTo(0.05, 0.52);
      shape.absarc(0, 0.665, 0.15, -Math.PI * 0.39, Math.PI * 1.39, false);
      shape.lineTo(-0.075, 0);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false, curveSegments: 24 });
      geo.translate(0, 0, -0.006);
      face = new THREE.Mesh(geo, steelPaint);
      face.scale.setScalar(s);
      const baseH = obj.height ?? 0.0;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.06, 0.35 * s), steelDark);
      base.position.y = 0.03 + baseH / 2;
      base.scale.y = 1 + baseH / 0.06;
      base.userData.hit = { kind: 'hard' };
      group.add(base);
      state.meshes.push(base);
      pivot.position.y = 0.06 + baseH;
    }
    face.castShadow = true;
    face.userData.hit = { kind: 'steel', state };
    pivot.add(face);
    state.face = face;
    state.meshes.push(face);
  }
  group.position.set(obj.x, 0, obj.z);
  group.rotation.y = THREE.MathUtils.degToRad(obj.rot || 0);
  return { group, state };
}

// Registra un impacto en papel. worldPoint: punto de impacto. Devuelve la zona.
export function hitPaper(state, worldPoint, holeSize = 0.0045) {
  const local = state.paper.worldToLocal(worldPoint.clone());
  const zone = paperZone(local.x, local.y);
  if (!zone) return null;
  state.hits.push(zone);
  const s = state.paper.scale.x;
  for (const side of [1, -1]) {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(holeSize / s, 10), holeMat(side > 0 ? 0x1a120a : 0x3a2a18));
    hole.position.set(local.x, local.y, 0.0008 * side / s);
    if (side < 0) hole.rotation.y = Math.PI;
    state.paper.add(hole);
    state.holes.push(hole);
  }
  return zone;
}

export function hitSteel(state, dir) {
  if (state.down) return false;
  state.down = true;
  state.hits.push('S');
  // cae hacia atrás respecto a su orientación
  state.anim = { t: 0, dur: state.type === 'plate' ? 0.25 : 0.45 };
  return true;
}

export function updateTarget(state, dt) {
  if (!state.anim) return;
  state.anim.t += dt;
  const k = Math.min(1, state.anim.t / state.anim.dur);
  const e = k * k; // acelera al caer
  state.pivot.rotation.x = -e * Math.PI / 2 * 0.97;
  if (k >= 1) state.anim = null;
}

export function resetTarget(state) {
  state.hits.length = 0;
  state.down = false;
  state.anim = null;
  if (state.pivot) state.pivot.rotation.x = 0;
  for (const h of state.holes) { h.parent?.remove(h); h.geometry.dispose(); }
  state.holes.length = 0;
}
