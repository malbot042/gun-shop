// Conversión de stages entre Gun Shop y el Stage Designer de tiropractico.es
// (JSON `schemaVersion: 1`: { schemaVersion, tiradas[], stages[], biblioteca[] }).
//
// Coordenadas del Stage Designer: metros en planta, `x` lateral (0 = centro del recinto), `y`
// downrange (0 = lado del tirador) y `rot` en grados, horario visto desde arriba (0 = el blanco mira
// al tirador; la salida y el tirador, 0 = miran downrange). En three.js: (x, altura, −y), rotY = −rot.
// Gun Shop: `x` lateral, `z` = −y y `rot` en grados con rotY = +rot  →  z = −y, rot = −rot.
//
// Ida y vuelta sin pérdidas: cada objeto importado guarda su elemento original en `_sd` y el stage su
// documento original en `_sd`; al exportar se parte de ellos y solo se sobrescribe lo que Gun Shop
// cambia. Lo que Gun Shop tiene y el designer no (p. ej. placas cuadradas, hard cover en diagonal,
// paredes transparentes que dejan pasar la bala) viaja en `_gunshop` y el designer lo conserva.

export const SD_SCHEMA = 1;

const r2 = v => Math.round(v * 1000) / 1000;
const normRot = r => ((Math.round(r * 100) / 100) % 360 + 360) % 360;
const clone = o => JSON.parse(JSON.stringify(o));

export function isDesignerData(data) {
  return !!data && ((data.schemaVersion === SD_SCHEMA && Array.isArray(data.stages)) || data.kind === 'stage' || data.kind === 'ejercicio');
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function sdId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// ---------------------------------------------------------------------------
// Stage Designer → Gun Shop
// ---------------------------------------------------------------------------
function elementToObj(el) {
  const base = { x: r2(el.x || 0), z: r2(-(el.y || 0)), rot: normRot(-(el.rot || 0)), _sd: clone(el) };
  const gs = el._gunshop || {};
  const elev = el.elevacion ?? 0;
  switch (el.tipo) {
    case 'tarjeta':
      return { ...base, type: el.mini ? 'mini' : 'paper', height: el.elevacion ?? 0.9, hardcover: gs.hardcover || el.cubierta || 'none',
        stand: el.soporte !== false, corte: el.corte || 'none', shots: el.disparos ?? 2 };
    case 'noshoot':
      return { ...base, type: 'noshoot', mini: !!el.mini, height: el.elevacion ?? 0.9, hardcover: gs.hardcover || el.cubierta || 'none',
        stand: el.soporte !== false, corte: el.corte || 'none' };
    case 'popper':
    case 'minipopper': {
      const alto = el.alto ?? (el.tipo === 'minipopper' ? 0.56 : 0.85);
      return { ...base, type: alto < 0.7 ? 'minipopper' : 'popper', height: elev };
    }
    case 'metal':
    case 'plancha': {
      const d = el.diametro ?? 0.2;
      return { ...base, type: 'plate', shape: gs.shape || 'round', size: d, height: r2((el.elevacion ?? 1.0) + d / 2) };
    }
    case 'muro':
    case 'chapa':
    case 'corcho': {
      const L = el.largo ?? 1, H = el.alto ?? 2;
      if (gs.type === 'softcover') return { ...base, type: 'softcover', length: L, height: H, elev };
      if (gs.type === 'glasswall' || (el.tipo === 'muro' && (el.transparencia ?? 0) >= 80))
        return { ...base, type: 'glasswall', length: L, height: H, elev, blocks: gs.blocks !== false };
      return { ...base, type: H <= 1.2 ? 'lowwall' : 'wall', length: L, height: H, elev };
    }
    case 'puerto': {
      const h = el.hueco || {};
      return { ...base, type: 'port', length: el.largo ?? 1, height: el.alto ?? 2, elev, holeW: h.ancho ?? 0.7, holeH: h.alto ?? 0.4, holeElev: h.elevacion ?? 1.4 };
    }
    case 'falta': return { ...base, type: 'faultline', length: el.largo ?? 3 };
    case 'zona': return { ...base, type: 'zone', width: el.ancho ?? 1, depth: el.fondo ?? 1 };
    case 'inicio': return { ...base, type: 'start' };
    case 'barril': return { ...base, type: 'barrel', diam: el.diametro ?? 0.6, height: el.alto ?? 0.9, elev };
    case 'mesa': return { ...base, type: 'table', elev };
    case 'cono': return { ...base, type: 'cone', elev };
    default: return null; // tirador u otros: se conservan sin mostrar
  }
}

// Un documento (stage) del designer → stage de Gun Shop
export function stageFromDesigner(doc) {
  const objects = [], unmapped = [];
  for (const el of doc.elementos || []) {
    const o = elementToObj(el);
    if (o) objects.push(o); else unmapped.push(clone(el));
  }
  // Salida: la posición de salida; si no hay, el tirador; si tampoco, delante del primer blanco.
  if (!objects.some(o => o.type === 'start')) {
    const tir = (doc.elementos || []).find(e => e.tipo === 'tirador');
    objects.unshift(tir ? { type: 'start', x: r2(tir.x), z: r2(-tir.y), rot: normRot(-(tir.rot || 0)) }
      : { type: 'start', x: 0, z: -0.5, rot: 0, _auto: true });
  }
  // Solo una salida
  let seen = false;
  const objs = objects.filter(o => o.type !== 'start' || (seen ? false : (seen = true)));
  const meta = clone(doc);
  delete meta.elementos;
  const b = doc.briefing || {};
  return {
    id: 'sd-' + (doc.uuid || uuid()),
    uuid: doc.uuid || uuid(),
    name: doc.nombre || 'Stage importado',
    description: [b.descripcion, b.procedimiento].filter(Boolean).join(' · '),
    objects: objs,
    _sd: { doc: meta, unmapped, desc: [b.descripcion, b.procedimiento].filter(Boolean).join(' · ') },
  };
}

// Fichero o código del designer (proyecto completo o documento suelto) → lista de stages
export function importDesigner(data) {
  if (!isDesignerData(data)) throw new Error('No es un fichero del Stage Designer');
  const docs = Array.isArray(data.stages) ? data.stages.concat(data.ejercicios || []) : [data];
  return docs.filter(d => Array.isArray(d.elementos)).map(stageFromDesigner);
}

// ---------------------------------------------------------------------------
// Gun Shop → Stage Designer
// ---------------------------------------------------------------------------
const DEFAULTS = {
  tarjeta: { mini: false, soporte: true, elevacion: 0.9, cubierta: 'none', corte: 'none', disparos: 2 },
  noshoot: { mini: false, soporte: true, elevacion: 0.9, cubierta: 'none', corte: 'none' },
  popper: { alto: 0.85, elevacion: 0 },
  metal: { diametro: 0.2, elevacion: 1.0 },
  muro: { largo: 1, alto: 2, color: 'marron', transparencia: 0, elevacion: 0 },
  corcho: { largo: 0.6, alto: 1.2, color: 'blanco', transparencia: 0, elevacion: 0 },
  puerto: { largo: 1, alto: 2, hueco: { ancho: 0.7, alto: 0.4, elevacion: 1.4 }, color: 'marron', transparencia: 0, elevacion: 0 },
  falta: { largo: 3 },
  zona: { ancho: 1, fondo: 1 },
  inicio: {},
  barril: { diametro: 0.6, alto: 0.9, elevacion: 0 },
  mesa: { pistola: false, cargadores: false, elevacion: 0 },
  cono: { elevacion: 0 },
};
const HC_DESIGNER = ['none', 'top', 'bottom', 'left', 'right'];

function objToElement(o, yOff) {
  const prev = o._sd || {};
  const keepTipo = (want, alts) => (alts.includes(prev.tipo) ? prev.tipo : want);
  let tipo, props = {}, gs = null;
  switch (o.type) {
    case 'paper': case 'mini':
      tipo = 'tarjeta';
      props = { mini: o.type === 'mini', elevacion: o.height ?? 0.9, soporte: o.stand !== false, corte: o.corte || 'none', disparos: o.shots ?? 2 };
      break;
    case 'noshoot':
      tipo = 'noshoot';
      props = { mini: !!o.mini, elevacion: o.height ?? 0.9, soporte: o.stand !== false, corte: o.corte || 'none' };
      break;
    case 'popper': case 'minipopper': {
      tipo = 'popper';
      const mini = o.type === 'minipopper';
      const keepAlto = prev.tipo === 'popper' && prev.alto && (prev.alto < 0.7) === mini;
      props = { alto: keepAlto ? prev.alto : (mini ? 0.56 : 0.85), elevacion: o.height ?? 0 };
      break;
    }
    case 'plate': {
      const d = +(o.size || 0.2);
      tipo = 'metal';
      props = { diametro: d, elevacion: r2((o.height ?? 1.0) - d / 2) };
      if (o.shape === 'square') gs = { shape: 'square' };
      break;
    }
    case 'wall': case 'lowwall':
      tipo = keepTipo('muro', ['muro', 'chapa', 'corcho']);
      props = { largo: o.length ?? 2, alto: o.height ?? (o.type === 'wall' ? 2 : 1), elevacion: o.elev || 0 };
      if (tipo === 'muro' && (prev.transparencia ?? 0) >= 80) props.transparencia = 0;
      break;
    case 'glasswall':
      tipo = 'muro';
      props = { largo: o.length ?? 2, alto: o.height ?? 2, elevacion: o.elev || 0, transparencia: Math.max(80, prev.transparencia ?? 0) };
      gs = { type: 'glasswall', blocks: o.blocks !== false };
      break;
    case 'softcover':
      tipo = 'corcho';
      props = { largo: o.length ?? 2, alto: o.height ?? 2, elevacion: o.elev || 0 };
      gs = { type: 'softcover' };
      break;
    case 'port':
      tipo = 'puerto';
      props = { largo: o.length ?? 1, alto: o.height ?? 2, elevacion: o.elev || 0, hueco: { ancho: o.holeW ?? 0.7, alto: o.holeH ?? 0.4, elevacion: o.holeElev ?? 1.4 } };
      break;
    case 'faultline': tipo = 'falta'; props = { largo: o.length ?? 3 }; break;
    case 'zone': tipo = 'zona'; props = { ancho: o.width ?? 1, fondo: o.depth ?? 1 }; break;
    case 'start': tipo = 'inicio'; break;
    case 'barrel': tipo = 'barril'; props = { diametro: o.diam ?? 0.6, alto: o.height ?? 0.9, elevacion: o.elev || 0 }; break;
    case 'table': tipo = 'mesa'; props = { elevacion: o.elev || 0 }; break;
    case 'cone': tipo = 'cono'; props = { elevacion: o.elev || 0 }; break;
    default: return null;
  }
  if (tipo === 'tarjeta' || tipo === 'noshoot') {
    const hc = o.hardcover || 'none';
    props.cubierta = HC_DESIGNER.includes(hc) ? hc : 'none';
    if (!HC_DESIGNER.includes(hc)) gs = { ...(gs || {}), hardcover: hc };
  }
  const base = prev.tipo === tipo ? clone(prev) : { id: sdId('el'), etiqueta: '' };
  const el = Object.assign({}, DEFAULTS[tipo] ? clone(DEFAULTS[tipo]) : {}, base, props,
    { tipo, x: r2(o.x), y: r2(-o.z + yOff), rot: normRot(-(o.rot || 0)) });
  if (!el.id) el.id = sdId('el');
  if (gs) el._gunshop = gs; else delete el._gunshop;
  return el;
}

export function stageToDesigner(data) {
  const prevDoc = data._sd?.doc || {};
  const objs = data.objects.filter(o => !o._auto);
  // y ≥ 0: si hay algo por detrás de la línea del tirador (z > 0), se desplaza todo
  const maxZ = Math.max(0, ...objs.map(o => o.z));
  const yOff = maxZ > 0 ? r2(maxZ + 1) : 0;
  const elementos = objs.map(o => objToElement(o, yOff)).filter(Boolean)
    .concat(clone(data._sd?.unmapped || []).map(e => ({ ...e, y: r2((e.y || 0) + yOff) })));
  const maxX = Math.max(0, ...elementos.map(e => Math.abs(e.x)));
  const maxY = Math.max(0, ...elementos.map(e => e.y));
  const recinto = Object.assign({ ancho: 17.6, fondo: 25, taludFondo: true, taludLaterales: true, altoFondo: 2, altoLateral: 2, anchoFondo: 1, anchoLateral: 0.5 }, prevDoc.recinto);
  recinto.ancho = Math.min(100, Math.max(recinto.ancho, Math.ceil((maxX + 1) * 2)));
  recinto.fondo = Math.min(100, Math.max(recinto.fondo, Math.ceil(maxY + 2)));
  const now = new Date().toISOString();
  const briefing = Object.assign({
    descripcion: '', condicionInicio: 'Arma cargada y enfundada',
    posicionInicio: 'De pie en la posición de salida, manos relajadas a los costados',
    procedimiento: 'A la señal, resolver.', senal: 'Audible', puntuacion: 'Comstock', disparosMinimos: null,
  }, prevDoc.briefing);
  // la descripción solo se escribe si es nueva o se ha cambiado en Gun Shop
  if (!prevDoc.briefing || (data.description || '') !== (data._sd?.desc || '')) briefing.descripcion = data.description || '';
  const doc = Object.assign({
    id: sdId('s'), kind: 'stage', tiradas: [], eventos: [], gc: false, cotas: [], grupos: [], creado: now,
  }, prevDoc, {
    uuid: data.uuid || prevDoc.uuid || uuid(),
    nombre: data.name || 'Stage',
    elementos, recinto, briefing, modificado: now,
  });
  doc.tirada = (doc.tiradas && doc.tiradas[0]) || null;
  return doc;
}

// Fichero de exportación en el formato del designer (uno o varios stages). Sin tiradas: al importarlo
// en el designer, un stage que ya existía (mismo uuid) conserva sus tiradas.
export function exportDesigner(stages) {
  return {
    schemaVersion: SD_SCHEMA,
    tiradas: [],
    stages: stages.map(s => ({ ...stageToDesigner(s), tiradas: [], tirada: null })),
    biblioteca: [],
  };
}
