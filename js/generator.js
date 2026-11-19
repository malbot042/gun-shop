// Generador de stages IPSC aleatorios: corto, medio y largo.
//
// Inspirado en los stages de ejemplo del Stage Designer de tiropractico.es («La barricada», «El
// corredor», «Speed shoot»): zona de tiro + posición de salida, línea de falta, barricadas con puerto,
// bahías separadas por muros, tarjetas en pareja, no-shoots solapados, hard cover, poppers y metales.
//
// Reglas que se respetan:
//  - Regla IPSC 1.2.1: corto ≤ 12 disparos, medio ≤ 24, largo ≤ 32 (aquí: corto 6–12, medio 13–24,
//    largo 25–32).
//  - Como mucho 8 disparos desde una misma vista en medio y largo (que haya que moverse).
//  - Metal a 7 m o más de cualquier zona de tiro; nada a menos de 3 m.
//  - Todos los blancos downrange y de cara a su zona de tiro.
// Se trabaja en coordenadas del designer (x lateral, y downrange) y se convierte al final (z = −y).

export const COURSES = {
  corto: { label: 'Corto', min: 6, max: 12, perView: 12 },
  medio: { label: 'Medio', min: 13, max: 24, perView: 8 },
  largo: { label: 'Largo', min: 25, max: 32, perView: 8 },
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = v => Math.round(v * 100) / 100;

const NOMBRES = {
  simple: ['Speed shoot', 'A la carrera', 'Doble o nada', 'Sin respiro', 'Tiro rápido', 'El abanico'],
  barricada: ['La barricada', 'La ventana', 'El parapeto', 'Por los dos lados', 'El puesto'],
  bahias: ['El corredor', 'Las bahías', 'Puerta a puerta', 'Los boxes', 'Calle de tiro'],
  avance: ['El avance', 'La patrulla', 'Paso a paso', 'Hacia el fondo', 'Escalera'],
};

// Genera hasta dar con uno que cumpla el rango de disparos (la semilla devuelta reproduce el stage)
export function generateStage(kind = 'corto', seed = Math.floor(Math.random() * 1e6)) {
  const C = COURSES[kind] || COURSES.corto;
  let st = null;
  for (let i = 0; i < 40; i++) {
    st = buildStage(kind, seed + i);
    const steel = st.objects.filter(o => ['popper', 'minipopper', 'plate'].includes(o.type)).length;
    if (st.shots >= C.min && st.shots <= C.max && steel <= st.shots * 0.45) return st;
  }
  return st;
}

function buildStage(kind, seed) {
  const C = COURSES[kind] || COURSES.corto;
  const R = mulberry32(seed);
  const rand = (a, b) => a + R() * (b - a);
  const ri = (a, b) => Math.floor(rand(a, b + 1));
  const pick = arr => arr[Math.floor(R() * arr.length)];
  const chance = p => R() < p;

  const goal = ri(C.min, C.max);
  const layout = kind === 'corto' ? pick(['simple', 'simple', 'barricada'])
    : kind === 'medio' ? pick(['barricada', 'bahias', 'avance']) : pick(['bahias', 'avance']);

  const els = [];      // elementos en coordenadas del designer
  const zones = [];    // zonas de tiro { x, y, w, d }
  const views = [];    // vistas: { px, py (desde dónde), region: [x0, x1, y0, y1], zone, cap, shots }
  const blockers = []; // huecos ocupados por muros (para no poner blancos encima)
  const add = (tipo, x, y, extra = {}) => { const e = { tipo, x: r2(x), y: r2(y), rot: 0, ...extra }; els.push(e); return e; };
  const wall = (x, y, largo, alto, rot = 0, extra = {}) => {
    const e = add(extra.tipo || 'muro', x, y, { largo, alto, rot, color: extra.color || 'marron', transparencia: extra.transparencia ?? 0 });
    const along = rot % 180 === 90;
    blockers.push({ x0: x - (along ? 0.4 : largo / 2 + 0.4), x1: x + (along ? 0.4 : largo / 2 + 0.4), y0: y - (along ? largo / 2 + 0.4 : 0.5), y1: y + (along ? largo / 2 + 0.4 : 0.5) });
    return e;
  };
  const zone = (x, y, w, d) => { const z = { x, y, w, d }; zones.push(z); add('zona', x, y, { ancho: w, fondo: d }); return z; };
  let desc = '';

  // ---------------- Plantillas ----------------
  if (layout === 'simple') {
    const z = zone(0, 1.6, ri(2, 4), 2);
    add('falta', 0, z.y + z.d / 2 + 0.1, { largo: z.w + 1 });
    views.push({ px: 0, py: z.y, region: [-7.5, 7.5, 6, 20], zone: z, cap: C.perView });
    desc = 'Desde la zona de tiro, batir todos los blancos.';
  } else if (layout === 'barricada') {
    const z = zone(0, 1.6, 3, 2);
    add('falta', 0, 2.7, { largo: 3 });
    const by = rand(5.5, 7);
    const port = chance(0.7);
    wall(-2.6, by, 2.4, 2, 0, { transparencia: 50 });
    wall(2.6, by, 2.4, 2, 0, { transparencia: 50 });
    if (port) {
      add('puerto', 0, by + 0.2, { largo: 1.2, alto: 2, hueco: { ancho: 0.7, alto: 0.4, elevacion: 1.4 }, color: 'marron', transparencia: 50 });
      blockers.push({ x0: -1, x1: 1, y0: by - 0.3, y1: by + 0.7 });
    }
    if (chance(0.5)) add('barril', pick([-1.6, 1.6]), rand(3.8, 4.4), { diametro: 0.6, alto: 0.9 });
    const side = { cap: C.perView };
    views.push({ px: -1.5, py: z.y, region: [-8, -3.6, by + 3, 20], zone: z, ...side });
    views.push({ px: 1.5, py: z.y, region: [3.6, 8, by + 3, 20], zone: z, ...side });
    if (port) views.push({ px: 0, py: z.y, region: [-0.8, 0.8, by + 6, 20], zone: z, cap: Math.min(C.perView, 4), portOnly: true });
    desc = port ? 'Barricada central con puerto. Desde la zona de tiro, batir los blancos por los dos lados y por el puerto.'
      : 'Barricada central. Desde la zona de tiro, batir los blancos por los dos lados de la barricada.';
  } else if (layout === 'bahias') {
    const n = kind === 'medio' ? ri(2, 3) : 4;
    const W = kind === 'largo' ? 20 : 16, bw = W / n;
    for (let i = 0; i < n; i++) {
      const cx = -W / 2 + bw * (i + 0.5);
      const z = zone(r2(cx), 1.8, Math.min(2.5, bw - 1), 2);
      views.push({ px: cx, py: z.y, region: [cx - bw / 2 + 0.7, cx + bw / 2 - 0.7, 7, 20], zone: z, cap: C.perView });
      if (i > 0) {
        const wx = -W / 2 + bw * i;
        const metal = chance(0.5);
        wall(wx, 7.5, 11, 2, 90, metal ? { tipo: 'chapa', color: 'gris' } : { transparencia: 0 });
      }
    }
    desc = `${n} bahías separadas por muros. Moverse entre las zonas de tiro y batir los blancos de cada bahía.`;
  } else {
    // avance: zonas cada vez más adelante, alternando lado
    const n = kind === 'medio' ? 2 : 3;
    const s0 = pick([-1, 1]);
    const xmax = kind === 'largo' ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? -s0 : s0;
      const zy = 1.6 + i * 5.5;
      const zx = s * rand(3, 5);
      const z = zone(r2(zx), r2(zy), 2, 2);
      // cobertura junto a la zona
      wall(r2(zx - s * 1.6), r2(zy + 1.2), 1.6, 2, 90, { transparencia: 50 });
      views.push({ px: zx, py: zy, region: s > 0 ? [-1, xmax, zy + 5, 24] : [-xmax, 1, zy + 5, 24], zone: z, cap: C.perView });
      // en el largo, cada zona ve también hacia el centro-fondo
      if (kind === 'largo') views.push({ px: zx, py: zy, region: [-3, 3, zy + 8, 24], zone: z, cap: 4 });
    }
    desc = `Avance en ${n} zonas de tiro hacia el fondo. Batir los blancos desde cada zona.`;
  }
  add('inicio', zones[0].x, zones[0].y - 0.4);

  // ---------------- Blancos ----------------
  const targets = []; // { x, y }
  const free = (x, y, rmin = 0.85) => {
    if (targets.some(t => Math.hypot(t.x - x, t.y - y) < rmin)) return false;
    if (blockers.some(b => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1)) return false;
    if (zones.some(z => Math.hypot(z.x - x, z.y - y) < 3.1)) return false;
    return Math.abs(x) <= (kind === 'largo' ? 10.3 : 8.3) && y <= 24;
  };
  const distOk = (x, y, min) => zones.every(z => Math.hypot(z.x - x, z.y - y) >= min);

  // patrones (disparos) — se colocan a lo largo de la perpendicular a la vista
  const PATTERNS = [
    { id: 'pair', shots: 4, w: 3 },
    { id: 'nsPair', shots: 4, w: 2 },
    { id: 'single', shots: 2, w: 2 },
    { id: 'nsSingle', shots: 2, w: 2 },
    { id: 'hcPair', shots: 4, w: 1.5 },
    { id: 'popper', shots: 1, w: 1.2, steel: true },
    { id: 'poppers', shots: 2, w: 0.6, steel: true },
    { id: 'plates', shots: 0, w: 0.9, steel: true }, // 2–5 según lo que quepa
    { id: 'miniPair', shots: 4, w: 1, far: true },
  ];
  let total = 0, steelShots = 0;
  const steelMax = Math.max(1, Math.round(goal * 0.4)); // en IPSC predomina el cartón
  const weighted = list => { const s = list.reduce((a, p) => a + p.w, 0); let r = R() * s; for (const p of list) { if ((r -= p.w) <= 0) return p; } return list[list.length - 1]; };

  function placePattern(v, p, budget) {
    const steel = !!p.steel;
    for (let tries = 0; tries < 40; tries++) {
      const [x0, x1, y0, y1] = v.region;
      const ax = rand(x0, x1);
      const ay = rand(Math.max(y0, steel ? v.py + 7.5 : y0), y1);
      if (ay > y1) continue;
      if (steel && !distOk(ax, ay, 7)) continue;
      if (p.far && Math.hypot(ax - v.px, ay - v.py) < 11) continue;
      // dirección hacia la vista y perpendicular
      const dx = v.px - ax, dy = v.py - ay, L = Math.hypot(dx, dy);
      const fx = dx / L, fy = dy / L;          // hacia el tirador
      const px = -fy, py = fx;                 // perpendicular
      const items = [];
      const at = (o, f = 0) => [ax + px * o + fx * f, ay + py * o + fy * f];
      const elev = r2(rand(0.75, 1.05));
      if (p.id === 'pair' || p.id === 'hcPair' || p.id === 'miniPair') {
        const s = rand(0.7, 1.4);
        const mini = p.id === 'miniPair';
        for (const o of [-s / 2, s / 2]) items.push(['tarjeta', ...at(o), { mini, elevacion: elev, cubierta: p.id === 'hcPair' ? pick(['top', 'bottom', o < 0 ? 'left' : 'right']) : 'none' }]);
      } else if (p.id === 'nsPair') {
        const s = rand(0.55, 0.8);
        items.push(['tarjeta', ...at(-s / 2), { elevacion: elev }]);
        items.push(['tarjeta', ...at(s / 2), { elevacion: elev }]);
        items.push(['noshoot', ...at(0, 0.12), { elevacion: r2(elev + rand(-0.1, 0.15)) }]);
      } else if (p.id === 'single') {
        items.push(['tarjeta', ...at(0), { elevacion: elev, cubierta: chance(0.35) ? pick(['top', 'bottom', 'left', 'right']) : 'none' }]);
      } else if (p.id === 'nsSingle') {
        const o = pick([-1, 1]) * rand(0.22, 0.32);
        items.push(['tarjeta', ...at(0), { elevacion: elev }]);
        items.push(['noshoot', ...at(o, 0.12), { elevacion: r2(elev + rand(-0.05, 0.2)) }]);
      } else if (p.id === 'popper') {
        items.push(['popper', ...at(0), { alto: chance(0.25) ? 0.56 : 0.85 }]);
      } else if (p.id === 'poppers') {
        const s = rand(1, 2);
        for (const o of [-s / 2, s / 2]) items.push(['popper', ...at(o), { alto: 0.85 }]);
      } else if (p.id === 'plates') {
        const n = Math.max(2, Math.min(5, budget));
        const d = pick([0.15, 0.2, 0.2, 0.3]);
        const sp = d + rand(0.3, 0.45);
        for (let i = 0; i < n; i++) items.push(['metal', ...at((i - (n - 1) / 2) * sp), { diametro: d, elevacion: 1.0 }]);
      }
      const shots = items.reduce((a, [t]) => a + (t === 'tarjeta' ? 2 : t === 'noshoot' ? 0 : 1), 0);
      if (shots > budget) return 0;
      const ok = items.every(([t, x, y], i) => free(x, y, t === 'noshoot' ? 0.05 : 0.85)
        && (!(t === 'popper' || t === 'metal') || distOk(x, y, 7))
        && x >= v.region[0] - 0.6 && x <= v.region[1] + 0.6
        && (t === 'noshoot' || items.slice(0, i).every(([t2, x2, y2]) => t2 === 'noshoot' || Math.hypot(x - x2, y - y2) > 0.5)));
      if (!ok) continue;
      // por el puerto: deben quedar alineados con el hueco
      if (v.portOnly && items.some(([, x]) => Math.abs(x) > 0.55)) continue;
      for (const [t, x, y, extra] of items) {
        const e = add(t, x, y, extra);
        e._face = [v.px, v.py];
        if (t !== 'noshoot') targets.push({ x, y }); else targets.push({ x, y, ns: true });
      }
      return shots;
    }
    return 0;
  }

  // Reparto: recorre las vistas en orden llenando hasta el objetivo
  let guard = 0;
  while (total < goal && guard++ < 200) {
    const remaining = goal - total;
    const open = views.filter(v => (v.shots || 0) < v.cap);
    if (!open.length) break;
    const v = open.reduce((a, b) => ((a.shots || 0) <= (b.shots || 0) ? a : b));
    const budget = Math.min(remaining, v.cap - (v.shots || 0));
    const steelLeft = steelMax - steelShots;
    let cand = PATTERNS.filter(p => (p.id === 'plates' ? budget >= 2 && steelLeft >= 2 : p.shots <= budget && (!p.steel || p.shots <= steelLeft)));
    if (v.portOnly) cand = cand.filter(p => ['single', 'nsSingle', 'popper', 'plates'].includes(p.id));
    if (!cand.length) { v.cap = v.shots || 0; continue; }
    const pat = weighted(cand);
    const got = placePattern(v, pat, pat.steel ? Math.min(budget, steelLeft) : budget);
    if (got) { v.shots = (v.shots || 0) + got; total += got; if (pat.steel) steelShots += got; }
    else if (guard % 5 === 0) v.cap = Math.max(v.shots || 0, v.cap - 1); // vista llena: no insistir
  }

  // Orientación: cada blanco de cara a su vista (designer: rot 0 = mira al tirador, horario)
  for (const e of els) {
    if (!e._face) continue;
    const [fx, fy] = e._face;
    // en el designer el blanco mira a −y con rot 0; el giro horario visto desde arriba
    const ang = Math.atan2(-(fx - e.x), -(fy - e.y)); // 0 si el tirador está justo delante (−y)
    e.rot = ((Math.round(ang * 180 / Math.PI / 5) * 5) % 360 + 360) % 360;
    delete e._face;
  }

  // ---------------- Briefing ----------------
  const cond = pick([
    ['Arma cargada y enfundada', 'De pie en la posición de salida, manos relajadas a los costados'],
    ['Arma cargada y enfundada', 'De pie en la posición de salida, muñecas por encima de los hombros'],
    ['Arma descargada y enfundada, cargadores en el cinturón', 'De pie en la posición de salida, de espaldas a los blancos'],
  ]);
  const name = `${pick(NOMBRES[layout])} · ${C.label} ${seed}`;
  const nT = els.filter(e => e.tipo === 'tarjeta').length, nNS = els.filter(e => e.tipo === 'noshoot').length;
  const nSteel = els.filter(e => e.tipo === 'popper' || e.tipo === 'metal').length;
  const briefing = {
    descripcion: `Stage ${C.label.toLowerCase()} de ${total} disparos (${nT} tarjetas, ${nSteel} metales${nNS ? `, ${nNS} no-shoot` : ''}). ${desc}`,
    condicionInicio: cond[0], posicionInicio: cond[1],
    procedimiento: 'A la señal, resolver.', senal: 'Audible', puntuacion: 'Comstock', disparosMinimos: total,
  };

  // ---------------- A coordenadas de Gun Shop ----------------
  const objects = els.map(e => toGunShop(e)).filter(Boolean);
  return {
    id: `gen-${kind}-${seed}`,
    origin: 'random',
    name,
    description: briefing.descripcion,
    seed, course: kind, shots: total,
    objects,
    _sd: { doc: { briefing }, unmapped: [], desc: briefing.descripcion },
  };
}

// elemento del designer → objeto de Gun Shop (z = −y, rot = −rot)
function toGunShop(e) {
  const base = { x: e.x, z: r2(-e.y), rot: ((-e.rot % 360) + 360) % 360 };
  switch (e.tipo) {
    case 'tarjeta': return { ...base, type: e.mini ? 'mini' : 'paper', height: e.elevacion ?? 0.9, hardcover: e.cubierta || 'none', shots: 2 };
    case 'noshoot': return { ...base, type: 'noshoot', height: e.elevacion ?? 0.9 };
    case 'popper': return { ...base, type: e.alto < 0.7 ? 'minipopper' : 'popper', height: 0 };
    case 'metal': return { ...base, type: 'plate', shape: 'round', size: e.diametro, height: r2(e.elevacion + e.diametro / 2) };
    case 'muro': case 'chapa': return { ...base, type: e.alto <= 1.2 ? 'lowwall' : 'wall', variant: e.tipo, length: e.largo, height: e.alto, color: e.color, transparency: e.transparencia ?? 0 };
    case 'puerto': return { ...base, type: 'port', length: e.largo, height: e.alto, holeW: e.hueco.ancho, holeH: e.hueco.alto, holeElev: e.hueco.elevacion, color: e.color, transparency: e.transparencia ?? 0 };
    case 'barril': return { ...base, type: 'barrel', diam: e.diametro, height: e.alto };
    case 'zona': return { ...base, type: 'zone', width: e.ancho, depth: e.fondo };
    case 'falta': return { ...base, type: 'faultline', length: e.largo };
    case 'inicio': return { ...base, type: 'start', rot: 0 };
    default: return null;
  }
}
