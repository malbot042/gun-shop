// Catálogo de armas + constructor de modelos 3D (viewmodel) procedurales.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------------------
// Miras. zoom: [fijo] o [mín, máx] (variable con la rueda del ratón).
// scope: se ve a través de un ocular (superposición a pantalla completa).
// ---------------------------------------------------------------------------
export const SIGHTS = {
  iron:       { id: 'iron',       name: 'Miras abiertas (alza y guion)', zoom: [1.25] },
  bead:       { id: 'bead',       name: 'Punto de mira (bead)',          zoom: [1.2] },
  ghost:      { id: 'ghost',      name: 'Ghost ring (diópter)',          zoom: [1.25] },
  reddot:     { id: 'reddot',     name: 'Punto rojo',                    zoom: [1.35] },
  reddot_mag: { id: 'reddot_mag', name: 'Punto rojo + magnificador 3x',  zoom: [1.35, 3], steps: [1.35, 3], reticle: 'dot', scopeFrom: 2 },
  lpvo:       { id: 'lpvo',       name: 'Visor 1-6x (LPVO)',             zoom: [1, 6], def: 4, scope: true, reticle: 'lpvo' },
  scope:      { id: 'scope',      name: 'Visor 3-12x',                   zoom: [3, 12], def: 8, scope: true, reticle: 'mil' },
  scope25:    { id: 'scope25',    name: 'Visor 5-25x (larga distancia)', zoom: [5, 25], def: 12, scope: true, reticle: 'mil' },
};

export const AMMO = {
  slug:     { id: 'slug',     name: 'Bala (slug)',      pellets: 1,  spread: 2.5, hole: 0.009 },
  buck:     { id: 'buck',     name: 'Postas 00 Buck',   pellets: 9,  spread: 22,  hole: 0.004 },
  birdshot: { id: 'birdshot', name: 'Perdigón #7.5',    pellets: 24, spread: 32,  hole: 0.0015 },
};

export const CATEGORIES = {
  handgun: 'Arma corta',
  rifle: 'Arma larga',
  shotgun: 'Escopeta',
};

const HG_SIGHTS = ['iron', 'reddot'];
const AR_SIGHTS = ['iron', 'reddot', 'reddot_mag', 'lpvo', 'scope', 'scope25'];
const SG_SIGHTS = ['bead', 'ghost', 'reddot', 'lpvo'];

// look.finish: 'nitride' (negro mate), 'stainless' (acero), 'anodized' (aluminio anodizado)
export const WEAPONS = [
  // ---------- ARMAS CORTAS ----------
  { id: 'glock17', category: 'handgun', brand: 'Glock', model: '17 Gen5', caliber: '9x19 mm', pf: 'minor',
    capacity: 17, minInterval: 0.085, recoil: 0.045, recover: 0.42, spread: 1.6, reload: 1.6, sights: HG_SIGHTS,
    look: { slide: 0x26282b, finish: 'nitride', frame: 0x1e1f21, slideLen: 0.186, polymer: true }, loud: 0.8 },
  { id: 'czshadow2', category: 'handgun', brand: 'CZ', model: 'Shadow 2', caliber: '9x19 mm', pf: 'minor',
    capacity: 19, minInterval: 0.08, recoil: 0.034, recover: 0.5, spread: 1.0, reload: 1.5, sights: HG_SIGHTS,
    look: { slide: 0x2a2c30, finish: 'nitride', frame: 0x2a2c30, grips: 0x2d5fa8, slideLen: 0.205, hammer: true, frontSerr: true }, loud: 0.8 },
  { id: 'p320x5', category: 'handgun', brand: 'SIG Sauer', model: 'P320 X-Five', caliber: '9x19 mm', pf: 'minor',
    capacity: 21, minInterval: 0.08, recoil: 0.036, recover: 0.48, spread: 1.1, reload: 1.5, sights: HG_SIGHTS,
    look: { slide: 0x3a3d41, finish: 'nitride', frame: 0x1b1b1b, slideLen: 0.21, polymer: true, frontSerr: true, lightening: true }, loud: 0.8 },
  { id: 'stock2', category: 'handgun', brand: 'Tanfoglio', model: 'Stock II', caliber: '9x19 mm', pf: 'minor',
    capacity: 17, minInterval: 0.082, recoil: 0.033, recover: 0.5, spread: 1.1, reload: 1.6, sights: HG_SIGHTS,
    look: { slide: 0x222326, finish: 'nitride', frame: 0x222326, grips: 0x111111, slideLen: 0.2, hammer: true, frontSerr: true }, loud: 0.8 },
  { id: 'beretta92x', category: 'handgun', brand: 'Beretta', model: '92X Performance', caliber: '9x19 mm', pf: 'minor',
    capacity: 15, minInterval: 0.085, recoil: 0.035, recover: 0.48, spread: 1.2, reload: 1.6, sights: HG_SIGHTS,
    look: { slide: 0x2b2c2e, finish: 'nitride', frame: 0x2b2c2e, grips: 0x1a1a1a, slideLen: 0.21, hammer: true, openSlide: true }, loud: 0.8 },
  { id: 'sti2011', category: 'handgun', brand: 'STI', model: 'DVC Limited 2011', caliber: '.40 S&W', pf: 'major',
    capacity: 20, minInterval: 0.085, recoil: 0.05, recover: 0.45, spread: 0.9, reload: 1.4, sights: HG_SIGHTS,
    look: { slide: 0xa7acb1, finish: 'stainless', frame: 0x2a2c2f, grips: 0x1d1d1d, slideLen: 0.215, hammer: true, frontSerr: true, magwell: true }, loud: 0.95 },
  { id: 'colt1911', category: 'handgun', brand: 'Colt', model: 'Government 1911', caliber: '.45 ACP', pf: 'major',
    capacity: 8, minInterval: 0.1, recoil: 0.065, recover: 0.38, spread: 1.4, reload: 1.7, sights: HG_SIGHTS,
    look: { slide: 0xb5b9bd, finish: 'stainless', frame: 0xb5b9bd, grips: 0x6a3519, wood: true, slideLen: 0.215, hammer: true }, loud: 1.0 },

  // ---------- ARMAS LARGAS ----------
  { id: 'ddm4', category: 'rifle', brand: 'Daniel Defense', model: 'DDM4 V7', caliber: '5.56x45 mm', pf: 'minor',
    capacity: 30, minInterval: 0.07, recoil: 0.018, recover: 0.7, spread: 0.35, reload: 2.2, sights: AR_SIGHTS,
    look: { type: 'ar', body: 0x2e2c29, finish: 'anodized', barrelLen: 0.40, guardLen: 0.38 }, loud: 1.1 },
  { id: 'ak103', category: 'rifle', brand: 'Kalashnikov', model: 'AK-103', caliber: '7.62x39 mm', pf: 'major',
    capacity: 30, minInterval: 0.09, recoil: 0.03, recover: 0.55, spread: 0.9, reload: 2.5, sights: ['iron', 'reddot', 'reddot_mag', 'lpvo'],
    look: { type: 'ak', body: 0x222324, finish: 'nitride', wood: 0x7a3e1c, barrelLen: 0.42, guardLen: 0.24 }, loud: 1.2 },
  { id: 'scar17', category: 'rifle', brand: 'FN', model: 'SCAR 17S', caliber: '7.62x51 mm', pf: 'major',
    capacity: 20, minInterval: 0.1, recoil: 0.042, recover: 0.5, spread: 0.3, reload: 2.4, sights: AR_SIGHTS,
    look: { type: 'scar', body: 0xb59a6d, finish: 'anodized', barrelLen: 0.41, guardLen: 0.3 }, loud: 1.35 },
  { id: 'hk416', category: 'rifle', brand: 'Heckler & Koch', model: 'MR223 A3', caliber: '5.56x45 mm', pf: 'minor',
    capacity: 30, minInterval: 0.07, recoil: 0.018, recover: 0.72, spread: 0.3, reload: 2.2, sights: AR_SIGHTS,
    look: { type: 'ar', body: 0x3d4137, finish: 'anodized', barrelLen: 0.42, guardLen: 0.36, squareGuard: true }, loud: 1.1 },
  { id: 'evo3', category: 'rifle', brand: 'CZ', model: 'Scorpion EVO 3 S1 Carbine (PCC)', caliber: '9x19 mm', pf: 'minor',
    capacity: 30, minInterval: 0.065, recoil: 0.012, recover: 0.9, spread: 0.8, reload: 1.9, sights: ['iron', 'reddot', 'reddot_mag', 'lpvo'],
    look: { type: 'pcc', body: 0x232323, finish: 'nitride', barrelLen: 0.38, guardLen: 0.28 }, loud: 0.85 },

  // ---------- ESCOPETAS ----------
  { id: 'benellim2', category: 'shotgun', brand: 'Benelli', model: 'M2 3-Gun', caliber: '12/76', pf: 'major',
    capacity: 9, tube: true, minInterval: 0.12, recoil: 0.07, recover: 0.4, spread: 1.0, reload: 0.32, sights: SG_SIGHTS,
    ammo: ['slug', 'buck', 'birdshot'], look: { body: 0x1f2022, finish: 'anodized', barrelLen: 0.66, tubeLen: 0.5 }, loud: 1.5 },
  { id: 'beretta1301', category: 'shotgun', brand: 'Beretta', model: '1301 Competition Pro', caliber: '12/76', pf: 'major',
    capacity: 10, tube: true, minInterval: 0.11, recoil: 0.065, recover: 0.42, spread: 1.0, reload: 0.3, sights: SG_SIGHTS,
    ammo: ['slug', 'buck', 'birdshot'], look: { body: 0x1d4f8c, finish: 'anodized', barrelLen: 0.61, tubeLen: 0.52 }, loud: 1.5 },
  { id: 'mossberg590', category: 'shotgun', brand: 'Mossberg', model: '590A1 (corredera)', caliber: '12/76', pf: 'major',
    capacity: 9, tube: true, pump: true, minInterval: 0.42, recoil: 0.08, recover: 0.36, spread: 1.2, reload: 0.36, sights: SG_SIGHTS,
    ammo: ['slug', 'buck', 'birdshot'], look: { body: 0x2b2c2e, finish: 'nitride', barrelLen: 0.51, tubeLen: 0.46 }, loud: 1.55 },
  { id: 'saiga12', category: 'shotgun', brand: 'Kalashnikov', model: 'Saiga-12', caliber: '12/76', pf: 'major',
    capacity: 10, minInterval: 0.13, recoil: 0.075, recover: 0.38, spread: 1.2, reload: 2.6, sights: ['bead', 'reddot', 'lpvo'],
    ammo: ['slug', 'buck', 'birdshot'], look: { body: 0x1e1f20, finish: 'nitride', barrelLen: 0.48, box: true }, loud: 1.5 },
];

export function getWeapon(id) {
  return WEAPONS.find(w => w.id === id) || WEAPONS[0];
}

// ---------------------------------------------------------------------------
// Materiales (con metalness real: la escena lleva mapa de entorno para los reflejos)
// ---------------------------------------------------------------------------
const FINISH = {
  nitride:   { metal: 0.75, rough: 0.38 },
  stainless: { metal: 1.0,  rough: 0.22 },
  anodized:  { metal: 0.55, rough: 0.45 },
  polymer:   { metal: 0.0,  rough: 0.72 },
  rubber:    { metal: 0.0,  rough: 0.95 },
  wood:      { metal: 0.0,  rough: 0.55 },
  steel:     { metal: 0.9,  rough: 0.3 },
};
const matCache = {};
function mat(color, finish = 'nitride') {
  const key = color + finish;
  if (!matCache[key]) {
    const f = FINISH[finish] || FINISH.nitride;
    matCache[key] = new THREE.MeshStandardMaterial({ color, metalness: f.metal, roughness: f.rough });
  }
  return matCache[key];
}
function glow(color) { return new THREE.MeshBasicMaterial({ color, toneMapped: false }); }
const DARK = () => mat(0x161718, 'nitride');
const BORE = () => mat(0x050505, 'rubber');
const SLOT = () => mat(0x050505, 'polymer');

// ---------------------------------------------------------------------------
// Geometría auxiliar
// ---------------------------------------------------------------------------
function add(g, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  g.add(mesh);
  return mesh;
}
// caja con bordes redondeados
function rbox(g, w, h, d, m, x, y, z, r = 0.002, rx = 0) {
  const rr = Math.max(0.0002, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  return add(g, new RoundedBoxGeometry(w, h, d, 2, rr), m, x, y, z, rx);
}
function box(g, w, h, d, m, x, y, z, rx = 0) {
  return add(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, rx);
}
// cilindro a lo largo del eje Z
function cylZ(g, r, len, m, x, y, z, seg = 20) {
  return add(g, new THREE.CylinderGeometry(r, r, len, seg), m, x, y, z, Math.PI / 2);
}
// Perfil lateral (pares [z, y]) extruido en X, centrado y biselado para que los cantos brillen.
function side(g, pts, width, m, x = 0, bevel = 0.0012, holes = []) {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([z, y]) => new THREE.Vector2(z, y))));
  const depth = Math.max(0.0005, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  geo.rotateY(-Math.PI / 2);
  geo.translate(depth / 2, 0, 0);
  geo.computeVertexNormals();
  return add(g, geo, m, x, 0, 0);
}

const gloveM = () => mat(0x4a4739, 'rubber');
const sleeveM = () => mat(0x343d45, 'rubber');
// Mano + antebrazo. (x,y,z) = centro de la mano; s: 1 derecha, -1 izquierda
function addHand(parent, x, y, z, s, size = [0.05, 0.08, 0.07], armLen = 0.4) {
  const hand = rbox(parent, size[0], size[1], size[2], gloveM(), x, y, z, 0.012);
  const thumb = rbox(parent, 0.016, 0.018, 0.045, gloveM(), x - s * size[0] * 0.45, y + size[1] * 0.3, z - size[2] * 0.25, 0.006);
  const arm = new THREE.Mesh(new RoundedBoxGeometry(0.058, 0.058, armLen, 2, 0.02), sleeveM());
  const a = 0.8, b = s * 0.35;
  arm.position.set(x + s * 0.02 + Math.sin(b) * armLen / 2, y - 0.03 - Math.sin(a) * armLen / 2, z + Math.cos(a) * armLen / 2);
  arm.rotation.set(a, b, 0);
  parent.add(arm);
  hand.userData.hand = arm.userData.hand = thumb.userData.hand = true;
  return hand;
}

// Brillo (fibra óptica / punto rojo)
let glowTex = null;
function glowSprite(color, size) {
  if (!glowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
  s.scale.setScalar(size);
  return s;
}

// ---------------------------------------------------------------------------
// Ópticas
// ---------------------------------------------------------------------------
function addRedDot(g, baseY, z, s = 1, big = false) {
  const housing = mat(0x222325, 'anodized');
  const W = (big ? 0.034 : 0.027) * s, Hh = (big ? 0.034 : 0.026) * s, D = (big ? 0.06 : 0.042) * s;
  const t = 0.0035 * s;
  rbox(g, W, 0.006 * s, D, housing, 0, baseY + 0.003 * s, z, 0.002);
  rbox(g, t, Hh, D * 0.75, housing, -W / 2 + t / 2, baseY + Hh / 2 + 0.004 * s, z - D * 0.1, 0.0012);
  rbox(g, t, Hh, D * 0.75, housing, W / 2 - t / 2, baseY + Hh / 2 + 0.004 * s, z - D * 0.1, 0.0012);
  rbox(g, W, t, D * 0.75, housing, 0, baseY + Hh + 0.004 * s - t / 2, z - D * 0.1, 0.0012);
  rbox(g, 0.003 * s, 0.006 * s, 0.008 * s, mat(0x111111, 'rubber'), W / 2 + 0.001, baseY + 0.008 * s, z + D * 0.2, 0.001);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - 2 * t, Hh - t), new THREE.MeshStandardMaterial({ color: 0x6fa8d8, metalness: 1, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false }));
  glass.position.set(0, baseY + 0.004 * s + (Hh - t) / 2, z - D * 0.45);
  g.add(glass);
  const sightLine = baseY + 0.004 * s + (Hh - t) / 2;
  // punto rojo proyectado (2 MOA aprox.)
  const dot = glowSprite(0xff1a0a, 0.0024 * s);
  dot.material.blending = THREE.NormalBlending;
  dot.position.set(0, sightLine, z - D * 0.46);
  g.add(dot);
  return sightLine;
}

function addScope(g, baseY, z, len = 0.3, objR = 0.024) {
  const m = mat(0x1d1e20, 'anodized');
  const tubeR = 0.0152;
  const sightLine = baseY + 0.042;
  cylZ(g, tubeR, len, m, 0, sightLine, z, 28);
  add(g, new THREE.CylinderGeometry(objR, tubeR, 0.06, 28), m, 0, sightLine, z - len / 2 - 0.02, -Math.PI / 2);
  cylZ(g, objR, 0.05, m, 0, sightLine, z - len / 2 - 0.07, 28);
  add(g, new THREE.CylinderGeometry(tubeR, 0.019, 0.05, 28), m, 0, sightLine, z + len / 2 + 0.015, -Math.PI / 2);
  cylZ(g, 0.019, 0.06, m, 0, sightLine, z + len / 2 + 0.06, 28);
  // torretas
  add(g, new THREE.CylinderGeometry(0.011, 0.011, 0.02, 20), m, 0, sightLine + tubeR + 0.008, z - 0.01);
  add(g, new THREE.CylinderGeometry(0.011, 0.011, 0.02, 20), m, tubeR + 0.008, sightLine, z - 0.01, 0, 0, Math.PI / 2);
  add(g, new THREE.CylinderGeometry(0.009, 0.009, 0.016, 20), m, -tubeR - 0.007, sightLine, z - 0.01, 0, 0, Math.PI / 2);
  cylZ(g, 0.0175, 0.025, mat(0x2a2a2a, 'rubber'), 0, sightLine, z + len / 2 - 0.02, 24);
  // monturas
  for (const dz of [-len * 0.28, len * 0.22]) {
    cylZ(g, 0.0175, 0.018, m, 0, sightLine, z + dz, 24);
    rbox(g, 0.024, sightLine - baseY, 0.018, m, 0, baseY + (sightLine - baseY) / 2, z + dz, 0.002);
  }
  const lensM = new THREE.MeshStandardMaterial({ color: 0x1a3f66, metalness: 1, roughness: 0.04, emissive: 0x050a14 });
  add(g, new THREE.CircleGeometry(objR - 0.002, 28), lensM, 0, sightLine, z - len / 2 - 0.096, 0, Math.PI, 0);
  add(g, new THREE.CircleGeometry(0.017, 28), lensM, 0, sightLine, z + len / 2 + 0.091);
  return sightLine;
}

// Magnificador abatible (flip-to-side) detrás del punto rojo
function addMagnifier(g, baseY, z, sl) {
  const m = mat(0x1d1e20, 'anodized');
  const mg = new THREE.Group();
  mg.name = 'magnifier';
  mg.position.set(-0.02, baseY, z);
  const inner = new THREE.Group();
  inner.position.set(0.02, 0, 0);
  mg.add(inner);
  cylZ(inner, 0.014, 0.1, m, 0, sl, 0, 24);
  cylZ(inner, 0.016, 0.02, m, 0, sl, 0.05, 24);
  rbox(inner, 0.024, sl - 0.008, 0.03, m, 0, (sl - 0.008) / 2, 0, 0.002);
  g.add(mg);
}

// ---------------------------------------------------------------------------
// Miras metálicas
// ---------------------------------------------------------------------------
// Alza en U con dos puntos verdes (tritio) + guion con fibra óptica roja
function handgunIrons(g, top, L) {
  const sm = mat(0x111213, 'nitride');
  const ear = 0.0068, notch = 0.0046, h = 0.0062;
  const sightLine = top + h;
  rbox(g, 0.024, 0.003, 0.009, sm, 0, top + 0.0015, -0.012, 0.0008);
  for (const s of [-1, 1]) {
    const cx = s * (notch / 2 + ear / 2);
    rbox(g, ear, h, 0.008, sm, cx, top + h / 2, -0.012, 0.0006);
    add(g, new THREE.CircleGeometry(0.0011, 14), glow(0x7dff6a), cx, top + h * 0.62, -0.0074);
  }
  const fz = -L + 0.014, pw = 0.0032;
  rbox(g, pw, h, 0.007, sm, 0, top + h / 2, fz, 0.0004);
  rbox(g, 0.008, 0.002, 0.009, sm, 0, top + 0.001, fz, 0.0006);
  add(g, new THREE.CylinderGeometry(0.00095, 0.00095, 0.006, 10), glow(0xff3218), 0, sightLine - 0.0013, fz, Math.PI / 2);
  const gl = glowSprite(0xff4020, 0.0026);
  gl.position.set(0, sightLine - 0.0013, fz + 0.0036);
  g.add(gl);
  return sightLine;
}

// Diópter (alza de anillo) + guion protegido tipo AR
function rifleIrons(g, railTop, rearZ, frontZ, frontBaseY) {
  const sm = mat(0x1a1b1c, 'anodized');
  const sightLine = railTop + 0.033;
  const ringR = 0.0048;
  rbox(g, 0.022, 0.012, 0.022, sm, 0, railTop + 0.006, rearZ, 0.002);
  const ph = sightLine - ringR - 0.0035 - (railTop + 0.009);
  rbox(g, 0.018, ph, 0.006, sm, 0, railTop + 0.009 + ph / 2, rearZ, 0.002);
  add(g, new THREE.TorusGeometry(ringR, 0.0018, 10, 28), sm, 0, sightLine, rearZ);
  add(g, new THREE.RingGeometry(ringR, 0.008, 28), sm, 0, sightLine, rearZ + 0.0012);
  const fh = sightLine - frontBaseY;
  rbox(g, 0.022, 0.012, 0.02, sm, 0, frontBaseY + 0.006, frontZ, 0.002);
  for (const s of [-1, 1]) rbox(g, 0.0035, fh + 0.004, 0.012, sm, s * 0.0085, frontBaseY + (fh + 0.004) / 2, frontZ, 0.001);
  rbox(g, 0.0024, fh, 0.004, sm, 0, frontBaseY + fh / 2, frontZ, 0.0004);
  const tip = glowSprite(0xfff2c0, 0.0018);
  tip.position.set(0, sightLine - 0.0012, frontZ + 0.003);
  g.add(tip);
  return sightLine;
}

// Raíl picatinny con dientes
function picatinny(g, y, z0, z1, m) {
  const len = Math.abs(z1 - z0), cz = (z0 + z1) / 2;
  rbox(g, 0.021, 0.005, len, m, 0, y + 0.0025, cz, 0.001);
  const n = Math.floor(len / 0.01);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.021, 0.003, 0.0052), m, n);
  const mm = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { mm.makeTranslation(0, y + 0.0065, Math.min(z0, z1) + 0.005 + i * 0.01); inst.setMatrixAt(i, mm); }
  g.add(inst);
  return y + 0.008;
}

// ---------------------------------------------------------------------------
// ARMA CORTA
// ---------------------------------------------------------------------------
function buildHandgun(w, sight) {
  const g = new THREE.Group();
  const lk = w.look;
  const L = lk.slideLen, H = 0.03, W = 0.0245;
  const slideM = mat(lk.slide, lk.finish);
  const frameM = lk.polymer ? mat(lk.frame, 'polymer') : mat(lk.frame, lk.finish);
  const gripM = lk.wood ? mat(lk.grips, 'wood') : lk.grips ? mat(lk.grips, 'rubber') : frameM;
  const darkM = DARK();

  // --- Corredera (grupo móvil; origen = parte trasera) ---
  const slide = new THREE.Group();
  slide.name = 'slide';
  g.add(slide);
  const t = H / 2;
  side(slide, [[0, -t], [0, t - 0.004], [-0.004, t], [-L + 0.012, t], [-L, t - 0.008], [-L, -t]], W, slideM, 0, 0.0016);
  const serrM = mat(0x0b0b0b, 'nitride');
  for (let i = 0; i < 7; i++) box(slide, W + 0.0006, 0.018, 0.0016, serrM, 0, 0, -0.008 - i * 0.0042);
  if (lk.frontSerr) for (let i = 0; i < 6; i++) box(slide, W + 0.0006, 0.016, 0.0016, serrM, 0, 0.001, -L + 0.022 + i * 0.0042);
  if (lk.lightening) for (let i = 0; i < 3; i++) rbox(slide, W + 0.0008, 0.006, 0.014, serrM, 0, 0.007, -L * 0.62 + i * 0.02, 0.002);
  // ventana de expulsión + capuchón del cañón
  rbox(slide, 0.004, 0.012, 0.042, darkM, W / 2 - 0.0015, 0.005, -L * 0.36, 0.001);
  rbox(slide, 0.012, 0.012, 0.038, mat(0x9a9a92, 'steel'), 0.002, 0.004, -L * 0.36, 0.002);
  if (lk.openSlide) {
    rbox(slide, 0.012, 0.006, L * 0.45, darkM, 0, t - 0.002, -L * 0.62, 0.001);
    cylZ(slide, 0.0068, L * 0.45, mat(0x9a9a92, 'steel'), 0, t - 0.006, -L * 0.62);
  }
  // boca del cañón
  cylZ(g, 0.0068, 0.008, mat(0x7c7c76, 'steel'), 0, -0.004, -L + 0.0035, 20);
  add(g, new THREE.CircleGeometry(0.0046, 16), BORE(), 0, -0.004, -L - 0.0006, 0, Math.PI, 0);

  // --- Armazón con guardamonte y empuñadura ---
  const fy = -t;
  const k = L / 0.2;
  const frame = [
    [0.014, fy], [-L * 0.9, fy], [-L * 0.9, fy - 0.017], [-0.106 * k, fy - 0.017],
    [-0.11 * k, fy - 0.03], [-0.104 * k, fy - 0.051], [-0.095 * k, fy - 0.054], [-0.052, fy - 0.054],
    [-0.042, fy - 0.046], [-0.018, fy - 0.122], [0.03, fy - 0.122], [0.012, fy - 0.03],
    [0.024, fy - 0.014], [0.024, fy - 0.004],
  ];
  const guardHole = [[-0.098 * k, fy - 0.022], [-0.054, fy - 0.022], [-0.05, fy - 0.046], [-0.093 * k, fy - 0.046], [-0.1 * k, fy - 0.032]];
  side(g, frame, lk.polymer ? 0.022 : 0.024, frameM, 0, 0.0018, [guardHole]);
  for (let i = 0; i < 3; i++) box(g, 0.023, 0.0025, 0.004, darkM, 0, fy - 0.017, -L * 0.62 - i * 0.01);
  // cachas o punteado
  if (lk.grips) {
    for (const s of [-1, 1]) side(g, [[-0.034, fy - 0.035], [-0.016, fy - 0.112], [0.024, fy - 0.112], [0.008, fy - 0.035]], 0.003, gripM, s * 0.0125, 0.0008);
  } else {
    for (const s of [-1, 1]) side(g, [[-0.034, fy - 0.04], [-0.017, fy - 0.11], [0.022, fy - 0.11], [0.007, fy - 0.04]], 0.0015, mat(lk.frame, 'rubber'), s * 0.0108, 0.0004);
  }
  // disparador, martillo, retenida
  side(g, [[-0.07, fy - 0.02], [-0.064, fy - 0.02], [-0.062, fy - 0.04], [-0.067, fy - 0.043]], 0.005, lk.polymer ? mat(0x111111, 'polymer') : mat(0x8a8a8a, 'steel'), 0, 0.0008);
  if (lk.hammer) rbox(g, 0.008, 0.013, 0.008, darkM, 0, fy + 0.006, 0.017, 0.002, -0.4);
  rbox(g, 0.004, 0.006, 0.026, darkM, -0.0135, fy - 0.004, -L * 0.42, 0.0015);
  // brocal y base del cargador
  if (lk.magwell) rbox(g, 0.038, 0.016, 0.06, mat(0x2b2d30, 'anodized'), 0, fy - 0.122, 0.006, 0.004);
  rbox(g, 0.03, 0.009, 0.052, mat(0x151515, 'polymer'), 0, fy - 0.127 - (lk.magwell ? 0.006 : 0), 0.005, 0.003);

  addHand(g, 0.006, -0.085, -0.004, 1, [0.052, 0.085, 0.07], 0.42);
  addHand(g, -0.026, -0.09, -0.012, -1, [0.034, 0.075, 0.075], 0.42);

  let sightLine;
  if (sight === 'reddot') {
    sightLine = addRedDot(slide, t, -0.05, 1);
    rbox(slide, 0.003, 0.003, 0.006, mat(0x111111), 0, t + 0.0015, -L + 0.014, 0.0005);
  } else {
    sightLine = handgunIrons(slide, t, L);
  }
  g.userData = { sightLine, adsDist: 0.5, length: L, muzzleZ: -L - 0.01, muzzleY: -0.004, vmAds: 20 };
  return g;
}

// ---------------------------------------------------------------------------
// ARMAS LARGAS
// ---------------------------------------------------------------------------
// Cargador curvo (la parte baja se adelanta). (z, y) = centro de la boca.
function curvedMag(g, m, x, y, z, len, curve, width = 0.022, depth = 0.062) {
  const pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) { const k = i / n; pts.push([z + depth / 2 - curve * k * k * len, y - k * len]); }
  for (let i = n; i >= 0; i--) { const k = i / n; pts.push([z - depth / 2 - curve * k * k * len, y - k * len]); }
  side(g, pts, width, m, x, 0.0015);
  rbox(g, width + 0.004, 0.01, depth + 0.006, m, x, y - len, z - curve * len, 0.002);
}

function buildRifle(w, sight) {
  const g = new THREE.Group();
  const lk = w.look;
  const body = mat(lk.body, lk.finish);
  const dark = DARK();
  const steel = mat(0x2c2d2f, 'nitride');
  const polymer = mat(0x1d1e1f, 'polymer');
  const gl = lk.guardLen;
  let railTop, muzzleZ;
  const ak = lk.type === 'ak', pcc = lk.type === 'pcc', scar = lk.type === 'scar';

  if (ak) {
    const wood = mat(lk.wood, 'wood');
    rbox(g, 0.03, 0.04, 0.24, steel, 0, -0.004, -0.11, 0.003);
    side(g, [[0.005, 0.016], [-0.21, 0.016], [-0.215, 0.02], [-0.04, 0.026], [0.01, 0.022]], 0.026, steel, 0, 0.002);
    rbox(g, 0.002, 0.012, 0.09, steel, 0.0158, 0.004, -0.07, 0.001);
    rbox(g, 0.042, 0.036, gl, wood, 0, -0.002, -0.24 - gl / 2, 0.008);
    rbox(g, 0.026, 0.02, gl * 0.85, wood, 0, 0.027, -0.24 - gl * 0.45, 0.007);
    cylZ(g, 0.0085, lk.barrelLen + 0.05, steel, 0, 0.004, -0.22 - lk.barrelLen / 2);
    const fz = -0.22 - lk.barrelLen + 0.04;
    rbox(g, 0.02, 0.03, 0.03, steel, 0, 0.01, fz, 0.002);
    muzzleZ = -0.22 - lk.barrelLen - 0.04;
    cylZ(g, 0.012, 0.06, steel, 0, 0.004, muzzleZ + 0.03, 16);
    side(g, [[0.0, 0.012], [0.25, -0.01], [0.27, -0.008], [0.27, -0.1], [0.24, -0.1], [0.08, -0.045], [0.0, -0.03]], 0.034, wood, 0, 0.004);
    rbox(g, 0.036, 0.096, 0.012, mat(0x1a1a1a, 'rubber'), 0, -0.055, 0.274, 0.003, 0.08);
    side(g, [[-0.03, -0.02], [-0.012, -0.11], [0.018, -0.11], [0.006, -0.02]], 0.026, wood, 0, 0.003);
    curvedMag(g, mat(0x5a2e16, 'polymer'), 0, -0.022, -0.125, 0.15, 0.45);
    side(g, [[-0.075, -0.024], [-0.03, -0.024], [-0.03, -0.05], [-0.075, -0.05]], 0.012, steel, 0, 0.001, [[[-0.07, -0.028], [-0.035, -0.028], [-0.035, -0.046], [-0.07, -0.046]]]);
    addHand(g, 0.006, -0.065, 0.0, 1, [0.045, 0.08, 0.06], 0.4);
    addHand(g, -0.004, -0.03, -0.24 - gl * 0.55, -1, [0.062, 0.05, 0.08], 0.55);
    if (sight === 'iron') {
      // alza tangente + guion en la boca
      const sightLine = 0.05;
      rbox(g, 0.026, 0.012, 0.05, steel, 0, 0.028, -0.24, 0.002);
      for (const s of [-1, 1]) rbox(g, 0.008, 0.016, 0.006, steel, s * 0.0055, sightLine - 0.008, -0.22, 0.0006);
      rbox(g, 0.019, 0.006, 0.006, steel, 0, sightLine - 0.013, -0.22, 0.0006);
      const fh = sightLine - 0.025;
      for (const s of [-1, 1]) rbox(g, 0.003, fh + 0.006, 0.01, steel, s * 0.008, 0.025 + (fh + 0.006) / 2, fz, 0.001);
      rbox(g, 0.0026, fh, 0.004, steel, 0, 0.025 + fh / 2, fz, 0.0004);
      const tip = glowSprite(0xfff2c0, 0.0018); tip.position.set(0, sightLine - 0.0012, fz + 0.003); g.add(tip);
      g.userData = { sightLine, adsDist: 0.08, length: 0.7, muzzleZ, muzzleY: 0.004, vmAds: 34 };
      return g;
    }
    // montura lateral → raíl sobre la tapa
    rbox(g, 0.03, 0.012, 0.14, steel, 0, 0.034, -0.08, 0.002);
    railTop = picatinny(g, 0.04, -0.15, -0.01, dark);
  } else {
    // --- Plataforma AR / SCAR / PCC ---
    const upperH = scar || pcc ? 0.05 : 0.034;
    const upperLen = scar ? 0.42 : pcc ? 0.3 : 0.2;
    rbox(g, scar ? 0.036 : 0.028, upperH, upperLen, body, 0, 0.006 + (scar || pcc ? 0.006 : 0), -upperLen / 2, 0.003);
    side(g, [[0.0, -0.012], [-0.17, -0.012], [-0.172, -0.03], [-0.165, -0.075], [-0.1, -0.075], [-0.092, -0.035], [-0.04, -0.035], [0.006, -0.03]], 0.026, body, 0, 0.002);
    side(g, [[-0.085, -0.03], [-0.03, -0.03], [-0.03, -0.058], [-0.085, -0.058]], 0.012, body, 0, 0.001, [[[-0.08, -0.034], [-0.035, -0.034], [-0.035, -0.054], [-0.08, -0.054]]]);
    side(g, [[-0.06, -0.034], [-0.055, -0.034], [-0.054, -0.05], [-0.059, -0.052]], 0.005, mat(0x777777, 'steel'), 0, 0.0006);
    side(g, [[-0.034, -0.03], [-0.016, -0.115], [0.016, -0.115], [0.008, -0.03]], 0.028, polymer, 0, 0.004);
    if (!pcc) cylZ(g, 0.0145, 0.2, mat(0x202020, 'anodized'), 0, -0.002, 0.1);
    side(g, pcc
      ? [[0.0, 0.02], [0.22, 0.02], [0.25, 0.01], [0.25, -0.09], [0.22, -0.095], [0.06, -0.04], [0.0, -0.035]]
      : [[0.12, 0.022], [0.27, 0.026], [0.29, 0.016], [0.29, -0.085], [0.27, -0.092], [0.2, -0.04], [0.12, -0.026]],
      0.04, scar ? body : polymer, 0, 0.004);
    rbox(g, 0.042, 0.11, 0.014, mat(0x141414, 'rubber'), 0, -0.032, pcc ? 0.252 : 0.292, 0.004);
    // guardamanos
    const gz = -upperLen - gl / 2 + (scar || pcc ? 0.12 : 0);
    if (lk.squareGuard || scar || pcc) {
      rbox(g, scar ? 0.044 : 0.046, 0.048, gl, scar ? body : dark, 0, 0.003, gz, 0.006);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) rbox(g, 0.002, 0.008, gl * 0.18, SLOT(), s * 0.023, 0.0, gz - gl * 0.3 + i * gl * 0.3, 0.001);
    } else {
      const hg = add(g, new THREE.CylinderGeometry(0.024, 0.024, gl, 8), dark, 0, 0.004, gz, Math.PI / 2);
      hg.rotation.y = Math.PI / 8;
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) rbox(g, 0.003, 0.0075, gl * 0.13, SLOT(), s * 0.0225, 0.004, gz - gl * 0.38 + i * gl * 0.25, 0.001);
      for (let i = 0; i < 4; i++) rbox(g, 0.0075, 0.003, gl * 0.13, SLOT(), 0, -0.0185, gz - gl * 0.38 + i * gl * 0.25, 0.001);
    }
    // cañón y freno de boca
    const bz0 = gz - gl / 2;
    cylZ(g, 0.0085, lk.barrelLen * 0.45, steel, 0, 0.004, bz0 - lk.barrelLen * 0.22);
    muzzleZ = bz0 - lk.barrelLen * 0.45 - 0.05;
    cylZ(g, 0.0115, 0.055, steel, 0, 0.004, muzzleZ + 0.027, 8);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) box(g, 0.004, 0.006, 0.007, BORE(), s * 0.0105, 0.004, muzzleZ + 0.012 + i * 0.012);
    if (!scar && !pcc) {
      rbox(g, 0.03, 0.006, 0.02, dark, 0, 0.021, 0.004, 0.002);
      cylZ(g, 0.0055, 0.016, dark, 0.012, 0.012, -0.03, 12);
    } else {
      rbox(g, 0.018, 0.01, 0.012, dark, -0.022, 0.016, -0.2, 0.003);
    }
    if (pcc) curvedMag(g, mat(0x2a2a2a, 'polymer'), 0, -0.07, -0.13, 0.12, 0.12, 0.02, 0.034);
    else curvedMag(g, mat(scar ? 0x2b2b2b : 0x5b5340, 'polymer'), 0, -0.07, -0.132, scar ? 0.1 : 0.13, scar ? 0.08 : 0.25, 0.024, 0.062);
    const topY = scar || pcc ? 0.037 : 0.023;
    railTop = picatinny(g, topY, 0.0, gz - gl / 2 + 0.01, dark);
    addHand(g, 0.006, -0.07, 0.0, 1, [0.045, 0.08, 0.06], 0.4);
    addHand(g, -0.004, -0.03, gz + gl * 0.1, -1, [0.062, 0.05, 0.08], 0.55);
    if (sight === 'iron') {
      const sightLine = rifleIrons(g, railTop, -0.03, gz - gl / 2 + 0.03, railTop);
      g.userData = { sightLine, adsDist: 0.075, length: 0.7, muzzleZ, muzzleY: 0.004, vmAds: 34 };
      return g;
    }
  }
  let sightLine;
  if (sight === 'reddot' || sight === 'reddot_mag') {
    rbox(g, 0.024, 0.02, 0.05, dark, 0, railTop + 0.01, -0.09, 0.002);
    sightLine = addRedDot(g, railTop + 0.02, -0.09, 1.25, true);
    if (sight === 'reddot_mag') addMagnifier(g, railTop, -0.01, sightLine - railTop);
  } else if (sight === 'lpvo') {
    sightLine = addScope(g, railTop, -0.07, 0.24, 0.0175);
  } else if (sight === 'scope') {
    sightLine = addScope(g, railTop + 0.004, -0.08, 0.3, 0.025);
  } else {
    sightLine = addScope(g, railTop + 0.01, -0.09, 0.36, 0.03);
  }
  g.userData = { sightLine, adsDist: 0.12, length: 0.7, muzzleZ, muzzleY: 0.004, vmAds: 40 };
  return g;
}

// ---------------------------------------------------------------------------
// ESCOPETAS
// ---------------------------------------------------------------------------
function buildShotgun(w, sight) {
  const g = new THREE.Group();
  const lk = w.look;
  const body = mat(lk.body, lk.finish);
  const dark = DARK();
  const steel = mat(0x2a2b2d, 'nitride');
  const polymer = mat(0x1f2021, 'polymer');
  const bl = lk.barrelLen;
  side(g, [[0.0, 0.026], [-0.2, 0.026], [-0.206, 0.018], [-0.206, -0.03], [-0.01, -0.03], [0.006, -0.02], [0.006, 0.018]], 0.036, body, 0, 0.004);
  rbox(g, 0.003, 0.02, 0.07, BORE(), 0.0175, 0.004, -0.09, 0.002);
  // cañón con banda ventilada
  cylZ(g, 0.0112, bl, steel, 0, 0.012, -0.2 - bl / 2, 24);
  rbox(g, 0.009, 0.003, bl, steel, 0, 0.0275, -0.2 - bl / 2, 0.001);
  const n = Math.floor(bl / 0.05);
  for (let i = 0; i < n; i++) box(g, 0.004, 0.004, 0.006, steel, 0, 0.0245, -0.22 - i * 0.05);
  add(g, new THREE.CircleGeometry(0.0095, 20), BORE(), 0, 0.012, -0.2 - bl - 0.0005, 0, Math.PI, 0);
  if (lk.box) {
    rbox(g, 0.05, 0.048, 0.25, polymer, 0, -0.004, -0.33, 0.008);
    rbox(g, 0.046, 0.12, 0.09, polymer, 0, -0.085, -0.12, 0.006, -0.2);
    addHand(g, -0.004, -0.04, -0.33, -1, [0.065, 0.05, 0.09], 0.5);
  } else {
    cylZ(g, 0.0118, lk.tubeLen, steel, 0, -0.014, -0.2 - lk.tubeLen / 2, 20);
    cylZ(g, 0.0128, 0.02, mat(0xaa2222, 'anodized'), 0, -0.014, -0.2 - lk.tubeLen - 0.008, 20);
    const fore = new THREE.Group();
    fore.name = 'forend';
    fore.position.set(0, -0.014, -0.34);
    g.add(fore);
    rbox(fore, 0.044, 0.04, 0.2, polymer, 0, 0, 0, 0.012);
    for (let i = 0; i < 6; i++) box(fore, 0.0445, 0.03, 0.003, mat(0x0c0c0c, 'polymer'), 0, -0.002, -0.07 + i * 0.028);
    addHand(fore, -0.004, -0.025, 0, -1, [0.064, 0.05, 0.09], 0.5);
  }
  side(g, [[-0.07, -0.03], [-0.02, -0.03], [-0.02, -0.056], [-0.07, -0.056]], 0.012, dark, 0, 0.001, [[[-0.065, -0.034], [-0.025, -0.034], [-0.025, -0.052], [-0.065, -0.052]]]);
  side(g, [[-0.05, -0.034], [-0.045, -0.034], [-0.044, -0.05], [-0.049, -0.052]], 0.005, mat(0x999999, 'steel'), 0, 0.0006);
  side(g, [[0.004, 0.018], [0.06, 0.012], [0.3, 0.008], [0.32, 0.0], [0.32, -0.12], [0.29, -0.125], [0.1, -0.06], [0.04, -0.06], [0.03, -0.115], [-0.004, -0.115], [-0.004, -0.03]], 0.036, polymer, 0, 0.004);
  rbox(g, 0.04, 0.13, 0.016, mat(0x141414, 'rubber'), 0, -0.058, 0.322, 0.005);
  addHand(g, 0.006, -0.075, 0.012, 1, [0.045, 0.08, 0.06], 0.4);

  const muzzleZ = -0.2 - bl - 0.01;
  let sightLine, adsDist = 0.2, vmAds = 44;
  if (sight === 'reddot') {
    const railTop = picatinny(g, 0.026, -0.03, -0.17, dark);
    sightLine = addRedDot(g, railTop, -0.1, 1.2, true);
    adsDist = 0.12;
  } else if (sight === 'lpvo') {
    const railTop = picatinny(g, 0.026, -0.02, -0.18, dark);
    sightLine = addScope(g, railTop, -0.1, 0.24, 0.0175);
    adsDist = 0.12; vmAds = 40;
  } else if (sight === 'ghost') {
    sightLine = rifleIrons(g, 0.026, -0.04, -0.2 - bl + 0.03, 0.03);
    adsDist = 0.08; vmAds = 34;
  } else {
    // bead de fibra óptica + bead intermedio
    sightLine = 0.034;
    add(g, new THREE.SphereGeometry(0.0032, 14, 14), glow(0xff4a1a), 0, sightLine, -0.2 - bl + 0.012);
    const gs = glowSprite(0xff5522, 0.009); gs.position.set(0, sightLine, -0.2 - bl + 0.016); g.add(gs);
    add(g, new THREE.SphereGeometry(0.0018, 10, 10), mat(0xdddddd, 'steel'), 0, sightLine - 0.003, -0.2 - bl * 0.5);
    rbox(g, 0.006, 0.006, 0.01, steel, 0, 0.031, -0.2 - bl + 0.012, 0.001);
  }
  g.userData = { sightLine, adsDist, length: 0.8, muzzleZ, muzzleY: 0.012, vmAds };
  return g;
}

export function buildWeaponModel(w, sight) {
  if (w.category === 'handgun') return buildHandgun(w, sight);
  if (w.category === 'rifle') return buildRifle(w, sight);
  return buildShotgun(w, sight);
}
