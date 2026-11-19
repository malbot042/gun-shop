// Blancos IPSC: papel (Classic, Mini, No-Shoot) y metal (Popper, Mini Popper, Placa).
import * as THREE from 'three';

// --- IPSC Target oficial (Reglamento IPSC, Apéndice B2): octógono sin cabeza, 45 x 57 cm ---
// Geometría tomada de las medidas oficiales (mismas que tarjeta-ipsc.svg del Stage Designer de
// tiropractico.es): zona A 15 x 32,5 cm, zona C 30 x 45 cm, resto D, borde de 0,5 cm no puntuable.
// Origen: borde inferior central. Unidades: metros. (svg mm → x = (sx-225)/1000, y = (570-sy)/1000)
const OUTLINE = [
  [-0.075, 0], [0.075, 0], [0.225, 0.19], [0.225, 0.38], [0.075, 0.57], [-0.075, 0.57], [-0.225, 0.38], [-0.225, 0.19],
];
const ZONE_C = [
  [-0.05, 0.12], [0.05, 0.12], [0.15, 0.235], [0.15, 0.38], [0.075, 0.57], [-0.075, 0.57], [-0.15, 0.38], [-0.15, 0.235],
];
const ZONE_A = [
  [-0.025, 0.22], [0.025, 0.22], [0.075, 0.295], [0.075, 0.38], [0.025, 0.545], [-0.025, 0.545], [-0.075, 0.38], [-0.075, 0.295],
];
const W = 0.45, H = 0.57;
const EDGE = 0.005; // borde no puntuable

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function distToEdge(x, y, poly) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}

// Devuelve 'A' | 'C' | 'D' | null para un punto en coordenadas locales (sin escalar)
export function paperZone(x, y, scale = 1) {
  if (!pointInPoly(x, y, OUTLINE)) return null;
  if (distToEdge(x, y, OUTLINE) < EDGE / scale) return null; // borde no puntuable
  if (pointInPoly(x, y, ZONE_A)) return 'A';
  if (pointInPoly(x, y, ZONE_C)) return 'C';
  return 'D';
}

// Impacto con el diámetro de la bala (coordenadas locales, sin escalar):
//  - Puntúa si el agujero toca el área puntuable; si toca la línea entre dos zonas, la de más valor.
//  - El área puntuable de tarjetas y no-shoots es impenetrable: la bala se queda en el primer blanco.
//    Solo sigue hacia el blanco de detrás si el agujero rompe la línea troquelada del borde (lo toca)
//    o si cae entero en el borde no puntuable (bajo ese borde, el blanco de detrás sí existe).
// Devuelve { zone: 'A'|'C'|'D'|null, pass: bool }.
export function scorePaperHit(x, y, scale = 1, holeR = 0.0045) {
  const r = holeR / scale, e = EDGE / scale;
  if (!pointInPoly(x, y, OUTLINE)) return { zone: null, pass: true };
  const d = distToEdge(x, y, OUTLINE);
  if (d <= e - r) return { zone: null, pass: true };          // entero en el borde no puntuable
  const breaksPerf = d < e + r;                                  // corta la línea troquelada
  const touches = poly => pointInPoly(x, y, poly) || distToEdge(x, y, poly) < r;
  const zone = touches(ZONE_A) ? 'A' : touches(ZONE_C) ? 'C' : 'D';
  return { zone, pass: breaksPerf };
}

// Hard cover pintado (negro) sobre el cartón: la bala no puntúa y se detiene.
export const HARDCOVER = {
  none:   { label: 'Sin hard cover', poly: null },
  left:   { label: 'Mitad izquierda', poly: [[-0.3, -0.05], [0, -0.05], [0, 0.85], [-0.3, 0.85]] },
  right:  { label: 'Mitad derecha', poly: [[0, -0.05], [0.3, -0.05], [0.3, 0.85], [0, 0.85]] },
  bottom: { label: 'Mitad inferior', poly: [[-0.3, -0.05], [0.3, -0.05], [0.3, 0.285], [-0.3, 0.285]] },
  top:    { label: 'Mitad superior', poly: [[-0.3, 0.285], [0.3, 0.285], [0.3, 0.85], [-0.3, 0.85]] },
  diagL:  { label: 'Diagonal superior izquierda', poly: [[-0.3, 0.85], [0.12, 0.85], [-0.3, 0.12]] },
  diagR:  { label: 'Diagonal superior derecha', poly: [[0.3, 0.85], [-0.12, 0.85], [0.3, 0.12]] },
};

// Media tarjeta (como «corte» del Stage Designer): la mitad que QUEDA; la otra no existe.
export const CORTES = {
  none: 'Tarjeta entera', top: 'Queda la mitad superior', bottom: 'Queda la mitad inferior',
  left: 'Queda la mitad izquierda', right: 'Queda la mitad derecha',
};
function cutAway(corte, x, y) {
  if (corte === 'top') return y < H / 2;
  if (corte === 'bottom') return y > H / 2;
  if (corte === 'left') return x > 0;
  if (corte === 'right') return x < 0;
  return false;
}

export const ZONE_POINTS = {
  major: { A: 5, C: 4, D: 2 },
  minor: { A: 5, C: 3, D: 1 },
};

// --- Texturas ---
const texCache = {};
function paperTexture(kind, hc = 'none', corte = 'none') {
  const key = kind + '|' + hc + '|' + corte;
  if (texCache[key]) return texCache[key];
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
  path(ZONE_C); ctx.stroke();
  path(ZONE_A); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = kind === 'noshoot' ? 'rgba(60,60,60,0.5)' : 'rgba(70,45,15,0.6)';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('A', tx(0), ty(0.43));
  ctx.fillText('C', tx(0.112), ty(0.3));
  ctx.fillText('D', tx(0.19), ty(0.28));
  ctx.fillText('IPSC', tx(0), ty(0.025));
  if (kind === 'noshoot') {
    ctx.fillStyle = 'rgba(40,40,40,0.35)';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('NO', tx(0), ty(0.33));
    ctx.fillText('SHOOT', tx(0), ty(0.28));
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = kind === 'noshoot' ? '#999' : '#7a5a2c';
  path(OUTLINE); ctx.stroke();
  const hcPoly = HARDCOVER[hc]?.poly;
  if (hcPoly) {
    ctx.save();
    path(OUTLINE); ctx.clip();
    ctx.fillStyle = '#141414';
    path(hcPoly); ctx.fill();
    ctx.restore();
  }
  if (corte && corte !== 'none') {
    // la mitad que no existe se borra (transparente)
    const half = { top: [0, ch / 2, cw, ch / 2], bottom: [0, 0, cw, ch / 2], left: [cw / 2, 0, cw / 2, ch], right: [0, 0, cw / 2, ch] }[corte];
    if (half) ctx.clearRect(...half);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache[key] = t;
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

// Solo blancos oficiales IPSC (Reglamento IPSC, apéndices B y C)
export const TARGET_TYPES = {
  paper:      { label: 'IPSC Target (cartón)', short: 'IPSC Target', paper: true },
  mini:       { label: 'IPSC Mini Target (cartón)', short: 'IPSC Mini', paper: true },
  noshoot:    { label: 'IPSC No-Shoot', short: 'No-Shoot', paper: true, noshoot: true },
  popper:     { label: 'IPSC Popper (metal)', short: 'IPSC Popper', steel: true },
  minipopper: { label: 'IPSC Mini Popper (metal)', short: 'Mini Popper', steel: true },
  plate:      { label: 'IPSC Metal Plate (placa)', short: 'Placa', steel: true },
};
export const PLATE_SHAPES = { round: 'Redonda', square: 'Cuadrada' };
export const PLATE_SIZES = { 0.15: '15 cm', 0.2: '20 cm', 0.3: '30 cm' };

// Crea un blanco. Devuelve { group, state } donde state guarda impactos y estado.
export function createTarget(obj) {
  const type = obj.type;
  const group = new THREE.Group();
  const state = { obj, type, hits: [], down: false, meshes: [], holes: [], anim: null };
  const def = TARGET_TYPES[type];

  if (def.paper) {
    // IPSC Mini Target: 30 x 37,5 cm (Apéndice B3). El no-shoot también puede ser mini.
    const scale = type === 'mini' || (type === 'noshoot' && obj.mini) ? 2 / 3 : 1;
    const h = obj.height ?? 0.9;
    // estacas (sin soporte: colgada o grapada a un muro)
    if (obj.stand !== false) {
      const postH = h + 0.15 * scale;
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.025, postH, 0.025), woodMat);
      p1.position.set(-0.1 * scale, postH / 2, -0.012); p1.castShadow = true;
      const p2 = p1.clone(); p2.position.x = 0.1 * scale;
      group.add(p1, p2);
      const baseM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.25), woodMat);
      baseM.position.set(0, 0.025, -0.02); baseM.castShadow = true;
      group.add(baseM);
      for (const p of [p1, p2, baseM]) { p.userData.hit = { kind: 'hard', soft: true }; state.meshes.push(p); }
    }

    const corte = obj.corte || 'none';
    const paper = new THREE.Mesh(getPaperGeometry(), new THREE.MeshStandardMaterial({
      map: paperTexture(type === 'noshoot' ? 'noshoot' : 'paper', obj.hardcover || 'none', corte), side: THREE.DoubleSide, roughness: 0.95,
      transparent: corte !== 'none', alphaTest: corte !== 'none' ? 0.5 : 0,
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
      const ph = Math.max(0.1, h - +(obj.size || 0.2) / 2);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, ph, 0.04), steelDark);
      post.position.set(0, ph / 2, -0.04); post.castShadow = true;
      post.userData.hit = { kind: 'hard' };
      group.add(post);
      state.meshes.push(post);
      const size = +(obj.size || 0.2);
      pivot.position.set(0, ph, 0);
      if (obj.shape === 'square') {
        face = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.012), steelPaint);
      } else {
        face = new THREE.Mesh(new THREE.CylinderGeometry(size / 2, size / 2, 0.012, 32), steelPaint);
        face.rotation.x = Math.PI / 2;
      }
      face.position.y = size / 2;
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
// Registra un impacto en cartón. Devuelve { zone: 'A'|'C'|'D'|'HC'|null, pass } (ver scorePaperHit).
export function hitPaper(state, worldPoint, holeSize = 0.0045) {
  const local = state.paper.worldToLocal(worldPoint.clone());
  if (cutAway(state.obj.corte, local.x, local.y)) return { zone: null, pass: true }; // media tarjeta: esa mitad no existe
  const s = state.paper.scale.x;
  const res = scorePaperHit(local.x, local.y, s, holeSize);
  if (!res.zone && !pointInPoly(local.x, local.y, OUTLINE)) return res;
  // hard cover pintado: si el agujero cae entero en lo pintado, no puntúa y la bala se detiene
  const hcPoly = HARDCOVER[state.obj.hardcover || 'none']?.poly;
  if (res.zone && hcPoly && pointInPoly(local.x, local.y, hcPoly) && distToEdge(local.x, local.y, hcPoly) >= holeSize / s) {
    res.zone = 'HC'; res.pass = false;
  } else if (res.zone) {
    state.hits.push(res.zone);
  }
  for (const side of [1, -1]) {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(holeSize / s, 10), holeMat(side > 0 ? 0x1a120a : 0x3a2a18));
    hole.position.set(local.x, local.y, 0.0008 * side / s);
    if (side < 0) hole.rotation.y = Math.PI;
    state.paper.add(hole);
    state.holes.push(hole);
  }
  return res;
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
