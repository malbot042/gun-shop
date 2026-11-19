// Catálogo de armas + constructor de modelos 3D (viewmodel) procedurales.
import * as THREE from 'three';

// Unidades: metros, segundos, radianes. spread en milirradianes (dispersión mecánica).
// recoil: subida de cañón por disparo (rad). recover: velocidad de recuperación (rad/s).
export const SIGHTS = {
  iron:   { id: 'iron',   name: 'Miras abiertas', zoom: 1.15 },
  bead:   { id: 'bead',   name: 'Punto de mira (bead)', zoom: 1.1 },
  reddot: { id: 'reddot', name: 'Punto rojo', zoom: 1.2 },
  lpvo:   { id: 'lpvo',   name: 'Visor 1-6x (LPVO, a 4x)', zoom: 4, scope: true },
  scope8: { id: 'scope8', name: 'Telescópica 8x', zoom: 8, scope: true },
  scope12:{ id: 'scope12',name: 'Telescópica 12x', zoom: 12, scope: true },
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

export const WEAPONS = [
  // ---------- ARMAS CORTAS ----------
  { id: 'glock17', category: 'handgun', brand: 'Glock', model: '17 Gen5', caliber: '9x19 mm', pf: 'minor',
    capacity: 17, minInterval: 0.085, recoil: 0.045, recover: 0.42, spread: 1.6, reload: 1.6,
    sights: ['iron', 'reddot'], look: { slide: 0x23262a, frame: 0x1a1c1f, slideLen: 0.186, slideH: 0.03 }, loud: 0.8 },
  { id: 'czshadow2', category: 'handgun', brand: 'CZ', model: 'Shadow 2', caliber: '9x19 mm', pf: 'minor',
    capacity: 19, minInterval: 0.08, recoil: 0.034, recover: 0.5, spread: 1.0, reload: 1.5,
    sights: ['iron', 'reddot'], look: { slide: 0x2c2f33, frame: 0x2a4f8a, slideLen: 0.205, slideH: 0.032 }, loud: 0.8 },
  { id: 'p320x5', category: 'handgun', brand: 'SIG Sauer', model: 'P320 X-Five', caliber: '9x19 mm', pf: 'minor',
    capacity: 21, minInterval: 0.08, recoil: 0.036, recover: 0.48, spread: 1.1, reload: 1.5,
    sights: ['iron', 'reddot'], look: { slide: 0x3a3d40, frame: 0x161616, slideLen: 0.21, slideH: 0.031 }, loud: 0.8 },
  { id: 'stock2', category: 'handgun', brand: 'Tanfoglio', model: 'Stock II', caliber: '9x19 mm', pf: 'minor',
    capacity: 17, minInterval: 0.082, recoil: 0.033, recover: 0.5, spread: 1.1, reload: 1.6,
    sights: ['iron', 'reddot'], look: { slide: 0x1e1e1e, frame: 0x1e1e1e, slideLen: 0.2, slideH: 0.032 }, loud: 0.8 },
  { id: 'beretta92x', category: 'handgun', brand: 'Beretta', model: '92X Performance', caliber: '9x19 mm', pf: 'minor',
    capacity: 15, minInterval: 0.085, recoil: 0.035, recover: 0.48, spread: 1.2, reload: 1.6,
    sights: ['iron', 'reddot'], look: { slide: 0x2b2b2b, frame: 0x2b2b2b, slideLen: 0.21, slideH: 0.029 }, loud: 0.8 },
  { id: 'sti2011', category: 'handgun', brand: 'STI', model: 'DVC Limited 2011', caliber: '.40 S&W', pf: 'major',
    capacity: 20, minInterval: 0.085, recoil: 0.05, recover: 0.45, spread: 0.9, reload: 1.4,
    sights: ['iron', 'reddot'], look: { slide: 0x8d9196, frame: 0x26282b, slideLen: 0.215, slideH: 0.03 }, loud: 0.95 },
  { id: 'colt1911', category: 'handgun', brand: 'Colt', model: 'Government 1911', caliber: '.45 ACP', pf: 'major',
    capacity: 8, minInterval: 0.1, recoil: 0.065, recover: 0.38, spread: 1.4, reload: 1.7,
    sights: ['iron'], look: { slide: 0x9ea3a8, frame: 0x9ea3a8, slideLen: 0.215, slideH: 0.03, wood: true }, loud: 1.0 },

  // ---------- ARMAS LARGAS ----------
  { id: 'ddm4', category: 'rifle', brand: 'Daniel Defense', model: 'DDM4 V7', caliber: '5.56x45 mm', pf: 'minor',
    capacity: 30, minInterval: 0.07, recoil: 0.018, recover: 0.7, spread: 0.35, reload: 2.2,
    sights: ['iron', 'reddot', 'lpvo', 'scope8'], look: { type: 'ar', body: 0x2d2a26, barrelLen: 0.42, guardLen: 0.38 }, loud: 1.1 },
  { id: 'ak103', category: 'rifle', brand: 'Kalashnikov', model: 'AK-103', caliber: '7.62x39 mm', pf: 'major',
    capacity: 30, minInterval: 0.09, recoil: 0.03, recover: 0.55, spread: 0.9, reload: 2.5,
    sights: ['iron', 'reddot', 'lpvo'], look: { type: 'ak', body: 0x1b1b1b, wood: 0x6b3a1e, barrelLen: 0.42, guardLen: 0.24 }, loud: 1.2 },
  { id: 'scar17', category: 'rifle', brand: 'FN', model: 'SCAR 17S', caliber: '7.62x51 mm', pf: 'major',
    capacity: 20, minInterval: 0.1, recoil: 0.042, recover: 0.5, spread: 0.3, reload: 2.4,
    sights: ['iron', 'reddot', 'lpvo', 'scope8', 'scope12'], look: { type: 'ar', body: 0xb59a6d, barrelLen: 0.41, guardLen: 0.32 }, loud: 1.35 },
  { id: 'hk416', category: 'rifle', brand: 'Heckler & Koch', model: 'MR223 A3', caliber: '5.56x45 mm', pf: 'minor',
    capacity: 30, minInterval: 0.07, recoil: 0.018, recover: 0.72, spread: 0.3, reload: 2.2,
    sights: ['iron', 'reddot', 'lpvo', 'scope8', 'scope12'], look: { type: 'ar', body: 0x3b3f36, barrelLen: 0.42, guardLen: 0.36 }, loud: 1.1 },
  { id: 'evo3', category: 'rifle', brand: 'CZ', model: 'Scorpion EVO 3 S1 Carbine (PCC)', caliber: '9x19 mm', pf: 'minor',
    capacity: 30, minInterval: 0.065, recoil: 0.012, recover: 0.9, spread: 0.8, reload: 1.9,
    sights: ['iron', 'reddot', 'lpvo'], look: { type: 'pcc', body: 0x1f1f1f, barrelLen: 0.38, guardLen: 0.28 }, loud: 0.85 },

  // ---------- ESCOPETAS ----------
  { id: 'benellim2', category: 'shotgun', brand: 'Benelli', model: 'M2 3-Gun', caliber: '12/76', pf: 'major',
    capacity: 9, tube: true, minInterval: 0.12, recoil: 0.07, recover: 0.4, spread: 1.0, reload: 0.32,
    sights: ['bead', 'reddot'], ammo: ['slug', 'buck', 'birdshot'], look: { body: 0x1d1d1d, barrelLen: 0.66, tubeLen: 0.5 }, loud: 1.5 },
  { id: 'beretta1301', category: 'shotgun', brand: 'Beretta', model: '1301 Competition Pro', caliber: '12/76', pf: 'major',
    capacity: 10, tube: true, minInterval: 0.11, recoil: 0.065, recover: 0.42, spread: 1.0, reload: 0.3,
    sights: ['bead', 'reddot'], ammo: ['slug', 'buck', 'birdshot'], look: { body: 0x1a3d6b, barrelLen: 0.61, tubeLen: 0.52 }, loud: 1.5 },
  { id: 'mossberg590', category: 'shotgun', brand: 'Mossberg', model: '590A1 (corredera)', caliber: '12/76', pf: 'major',
    capacity: 9, tube: true, pump: true, minInterval: 0.42, recoil: 0.08, recover: 0.36, spread: 1.2, reload: 0.36,
    sights: ['bead', 'reddot'], ammo: ['slug', 'buck', 'birdshot'], look: { body: 0x2a2a2a, barrelLen: 0.51, tubeLen: 0.46 }, loud: 1.55 },
  { id: 'saiga12', category: 'shotgun', brand: 'Kalashnikov', model: 'Saiga-12', caliber: '12/76', pf: 'major',
    capacity: 10, minInterval: 0.13, recoil: 0.075, recover: 0.38, spread: 1.2, reload: 2.6,
    sights: ['bead', 'reddot'], ammo: ['slug', 'buck', 'birdshot'], look: { body: 0x1b1b1b, barrelLen: 0.48, box: true }, loud: 1.5 },
];

export function getWeapon(id) {
  return WEAPONS.find(w => w.id === id) || WEAPONS[0];
}

// ---------------------------------------------------------------------------
// Constructor del modelo 3D. Convención: el cañón apunta a -Z, la línea de mira
// está en x=0, y=sightLine (devuelto en userData.sightLine). Así, en modo ADS,
// basta con colocar el arma en (0, -sightLine, -dist) para que las miras queden
// alineadas con el centro de la pantalla.
// ---------------------------------------------------------------------------
const matCache = {};
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache[key]) {
    matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.55, metalness: (opts.metal ?? 0.5) * 0.3, emissive: opts.emissive ?? 0x000000, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 });
  }
  return matCache[key];
}

function box(g, w, h, d, m, x, y, z, rx = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  g.add(mesh);
  return mesh;
}
function cyl(g, r, len, m, x, y, z, seg = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}

function addRedDot(g, baseY, z, size = 1) {
  const housing = mat(0x2b2d30, { metal: 0.3 });
  const s = size;
  box(g, 0.03 * s, 0.006 * s, 0.04 * s, housing, 0, baseY + 0.003 * s, z);
  // marco de la ventana
  box(g, 0.004 * s, 0.03 * s, 0.03 * s, housing, -0.015 * s, baseY + 0.02 * s, z);
  box(g, 0.004 * s, 0.03 * s, 0.03 * s, housing, 0.015 * s, baseY + 0.02 * s, z);
  box(g, 0.034 * s, 0.004 * s, 0.03 * s, housing, 0, baseY + 0.036 * s, z);
  // cristal
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.026 * s, 0.028 * s), new THREE.MeshBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.12, depthWrite: false }));
  glass.position.set(0, baseY + 0.02 * s, z - 0.012 * s);
  g.add(glass);
  const sightLine = baseY + 0.02 * s;
  // el punto rojo "proyectado" (siempre centrado en la línea de mira)
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0007 * s, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  dot.position.set(0, sightLine, z - 0.013 * s);
  g.add(dot);
  return sightLine;
}

function addScope(g, baseY, z, len = 0.3) {
  const m = mat(0x26282a, { metal: 0.4, rough: 0.4 });
  const sightLine = baseY + 0.045;
  cyl(g, 0.015, len, m, 0, sightLine, z);
  const bellF = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, 0.07, 18), m);
  bellF.rotation.x = -Math.PI / 2; bellF.position.set(0, sightLine, z - len / 2); g.add(bellF);
  const bellR = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.06, 18), m);
  bellR.rotation.x = -Math.PI / 2; bellR.position.set(0, sightLine, z + len / 2); g.add(bellR);
  box(g, 0.02, 0.04, 0.02, m, 0, baseY + 0.02, z - len * 0.25);
  box(g, 0.02, 0.04, 0.02, m, 0, baseY + 0.02, z + len * 0.25);
  cyl(g, 0.008, 0.02, m, 0, sightLine + 0.02, z).rotation.set(0, 0, 0);
  return sightLine;
}


const gloveM = () => mat(0x4d4a3c, { metal: 0, rough: 0.9 });
const sleeveM = () => mat(0x39424a, { metal: 0, rough: 1 });
// Mano + antebrazo. (x,y,z) = centro de la mano; side: 1 derecha, -1 izquierda
function addHand(parent, x, y, z, side, size = [0.05, 0.08, 0.07], armLen = 0.4) {
  const hand = box(parent, size[0], size[1], size[2], gloveM(), x, y, z);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, armLen), sleeveM());
  // el antebrazo baja desde la muñeca hacia el borde inferior de la pantalla
  const a = 0.8, b = side * 0.35;
  arm.position.set(x + side * 0.02 + Math.sin(b) * armLen / 2, y - 0.03 - Math.sin(a) * armLen / 2, z + Math.cos(a) * armLen / 2);
  arm.rotation.set(a, b, 0);
  parent.add(arm);
  hand.userData.hand = arm.userData.hand = true;
  return hand;
}

function buildHandgun(w, sight) {
  const g = new THREE.Group();
  const L = w.look.slideLen, H = w.look.slideH;
  const slideM = mat(w.look.slide, { metal: 0.7, rough: 0.35 });
  const frameM = mat(w.look.frame, { metal: 0.2, rough: 0.7 });
  const gripM = w.look.wood ? mat(0x5a2d14, { metal: 0, rough: 0.8 }) : frameM;
  // corredera (el origen está en la parte trasera de la corredera)
  const slide = box(g, 0.026, H, L, slideM, 0, 0, -L / 2);
  slide.name = 'slide';
  // cañón visible
  cyl(g, 0.006, 0.01, mat(0x444444), 0, -0.002, -L - 0.004);
  // armazón
  box(g, 0.024, 0.02, L * 0.88, frameM, 0, -H / 2 - 0.01, -L * 0.48);
  // empuñadura
  box(g, 0.028, 0.115, 0.05, gripM, 0, -0.075, -0.012, 0.28);
  box(g, 0.03, 0.012, 0.055, frameM, 0, -0.135, 0.008, 0.28); // base del cargador
  // guardamonte
  box(g, 0.012, 0.004, 0.05, frameM, 0, -0.055, -0.07);
  box(g, 0.012, 0.03, 0.004, frameM, 0, -0.042, -0.095);
  box(g, 0.004, 0.02, 0.004, mat(0x111111), 0, -0.035, -0.06); // cola del disparador

  // manos: agarre a dos manos
  addHand(g, 0.006, -0.08, -0.008, 1, [0.05, 0.085, 0.07], 0.42);
  addHand(g, -0.024, -0.085, -0.016, -1, [0.035, 0.075, 0.075], 0.42);
  const top = H / 2;
  let sightLine;
  const sightM = mat(0x0b0b0b, { metal: 0.2 });
  if (sight === 'reddot') {
    sightLine = addRedDot(g, top, -0.055, 1);
    // miras de respaldo bajas
    box(g, 0.004, 0.004, 0.005, sightM, 0, top + 0.002, -L + 0.012);
  } else {
    const ph = 0.0065;
    // alza (dos bloques con muesca)
    box(g, 0.0085, ph, 0.007, sightM, -0.0058, top + ph / 2, -0.008);
    box(g, 0.0085, ph, 0.007, sightM, 0.0058, top + ph / 2, -0.008);
    // guion (con punto de fibra óptica)
    box(g, 0.0032, ph, 0.006, sightM, 0, top + ph / 2, -L + 0.012);
    const fiber = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.0022, 0.0015), new THREE.MeshBasicMaterial({ color: 0xff3a1a }));
    fiber.position.set(0, top + ph - 0.0018, -L + 0.0088);
    g.add(fiber);
    sightLine = top + ph;
  }
  g.userData = { sightLine, adsDist: 0.42, length: L, muzzleZ: -L - 0.01, muzzleY: -0.002 };
  return g;
}

function buildRifle(w, sight) {
  const g = new THREE.Group();
  const lk = w.look;
  const body = mat(lk.body, { metal: 0.35, rough: 0.6 });
  const dark = mat(0x2a2c2e, { metal: 0.6, rough: 0.4 });
  const wood = lk.wood ? mat(lk.wood, { metal: 0, rough: 0.7 }) : body;
  // receptor (origen = parte trasera del receptor)
  box(g, 0.032, 0.05, 0.22, body, 0, 0, -0.11);
  // raíl superior
  box(g, 0.022, 0.008, 0.2, dark, 0, 0.029, -0.11);
  // guardamanos
  const gl = lk.guardLen;
  box(g, 0.044, 0.046, gl, lk.type === 'ak' ? wood : dark, 0, 0.004, -0.22 - gl / 2);
  // cañón
  cyl(g, 0.008, lk.barrelLen, dark, 0, 0.006, -0.22 - lk.barrelLen / 2 - 0.02);
  // bocacha
  cyl(g, 0.012, 0.05, dark, 0, 0.006, -0.22 - lk.barrelLen - 0.04);
  // culata
  if (lk.type === 'ak') {
    box(g, 0.03, 0.06, 0.24, wood, 0, -0.03, 0.12, -0.12);
  } else {
    cyl(g, 0.014, 0.18, dark, 0, -0.005, 0.09);
    box(g, 0.034, 0.075, 0.12, body, 0, -0.02, 0.17);
  }
  // empuñadura
  box(g, 0.026, 0.09, 0.035, lk.type === 'ak' ? wood : body, 0, -0.065, -0.005, 0.32);
  // cargador
  if (lk.type === 'ak') {
    box(g, 0.026, 0.15, 0.06, mat(0x4a2c1a, { metal: 0.1 }), 0, -0.09, -0.12, -0.35);
  } else if (lk.type === 'pcc') {
    box(g, 0.022, 0.14, 0.035, dark, 0, -0.09, -0.11, -0.08);
  } else {
    box(g, 0.024, 0.14, 0.065, dark, 0, -0.085, -0.1, -0.15);
  }
  addHand(g, 0.006, -0.075, 0.0, 1, [0.045, 0.08, 0.06], 0.4);
  addHand(g, -0.004, -0.035, -0.22 - gl * 0.55, -1, [0.06, 0.05, 0.08], 0.55);
  const railTop = 0.033;
  let sightLine;
  if (sight === 'reddot') {
    sightLine = addRedDot(g, railTop + 0.02, -0.07, 1.2);
    box(g, 0.025, 0.02, 0.04, dark, 0, railTop + 0.01, -0.07);
  } else if (sight === 'lpvo') {
    sightLine = addScope(g, railTop, -0.08, 0.27);
  } else if (sight === 'scope8' || sight === 'scope12') {
    sightLine = addScope(g, railTop + 0.005, -0.09, 0.36);
  } else {
    // miras abiertas: alza de diópter y guion en el extremo del guardamanos
    sightLine = railTop + 0.03;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0075, 0.0013, 8, 24), dark);
    ring.position.set(0, sightLine, -0.02);
    g.add(ring);
    box(g, 0.012, 0.024, 0.012, dark, 0, railTop + 0.012, -0.02);
    const fz = -0.22 - gl + 0.02;
    box(g, 0.02, 0.026, 0.015, dark, 0, railTop + 0.01, fz);
    box(g, 0.0025, 0.016, 0.003, dark, 0, sightLine - 0.008, fz);
  }
  g.userData = { sightLine, adsDist: 0.1, length: 0.7, muzzleZ: -0.22 - lk.barrelLen - 0.07, muzzleY: 0.006 };
  return g;
}

function buildShotgun(w, sight) {
  const g = new THREE.Group();
  const lk = w.look;
  const body = mat(lk.body, { metal: 0.5, rough: 0.45 });
  const dark = mat(0x2a2c2e, { metal: 0.6, rough: 0.4 });
  box(g, 0.036, 0.06, 0.2, body, 0, 0, -0.1);
  const bl = lk.barrelLen;
  cyl(g, 0.011, bl, dark, 0, 0.014, -0.2 - bl / 2);
  // banda ventilada
  box(g, 0.008, 0.004, bl, dark, 0, 0.027, -0.2 - bl / 2);
  if (lk.box) {
    box(g, 0.05, 0.05, 0.25, mat(0x1f1f1f, { metal: 0.1 }), 0, -0.002, -0.33);
    box(g, 0.04, 0.12, 0.09, dark, 0, -0.08, -0.12, -0.2);
  } else {
    cyl(g, 0.011, lk.tubeLen, dark, 0, -0.014, -0.2 - lk.tubeLen / 2);
    const fore = box(g, 0.04, 0.04, 0.2, mat(0x2a2a2a, { metal: 0.1, rough: 0.8 }), 0, -0.014, -0.34);
    fore.name = 'forend';
    addHand(fore, -0.004, -0.025, 0, -1, [0.06, 0.05, 0.09], 0.5);
  }
  if (lk.box) addHand(g, -0.004, -0.04, -0.33, -1, [0.065, 0.05, 0.09], 0.5);
  addHand(g, 0.006, -0.07, 0.025, 1, [0.045, 0.08, 0.06], 0.4);
  // culata + empuñadura
  box(g, 0.034, 0.06, 0.28, mat(0x1f1f1f, { metal: 0.1, rough: 0.8 }), 0, -0.035, 0.13, -0.15);
  box(g, 0.026, 0.08, 0.035, mat(0x1f1f1f, { metal: 0.1, rough: 0.8 }), 0, -0.06, 0.02, 0.35);
  let sightLine;
  if (sight === 'reddot') {
    sightLine = addRedDot(g, 0.03, -0.08, 1.2);
  } else {
    sightLine = 0.034;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff5522 }));
    bead.position.set(0, sightLine, -0.2 - bl + 0.01);
    g.add(bead);
  }
  g.userData = { sightLine, adsDist: 0.2, length: 0.8, muzzleZ: -0.2 - bl - 0.01, muzzleY: 0.014 };
  return g;
}

export function buildWeaponModel(w, sight) {
  let g;
  if (w.category === 'handgun') g = buildHandgun(w, sight);
  else if (w.category === 'rifle') g = buildRifle(w, sight);
  else g = buildShotgun(w, sight);
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return g;
}
