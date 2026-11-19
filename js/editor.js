// Editor de stages: colocar, mover, rotar, borrar y configurar objetos.
import * as THREE from 'three';
import { ALL_TYPES, PROP_TYPES } from './stage.js';
import { TARGET_TYPES, HARDCOVER, PLATE_SHAPES, PLATE_SIZES } from './targets.js';

const $ = id => document.getElementById(id);
const SNAP = 0.25;

const PALETTE = [
  ['Blancos IPSC de cartón', ['paper', 'mini', 'noshoot']],
  ['Blancos IPSC de metal', ['popper', 'minipopper', 'plate']],
  ['Escenario', ['wall', 'lowwall', 'glasswall', 'softcover', 'barrel', 'faultline', 'start']],
];

const DEFAULTS = {
  paper: { height: 0.9 }, mini: { height: 1.0 }, noshoot: { height: 0.9 },
  popper: {}, minipopper: {}, plate: { height: 1.0, shape: 'round', size: 0.2 },
  wall: { length: 2, height: 2 }, lowwall: { length: 2, height: 1 }, faultline: { length: 3 },
  glasswall: { length: 2, height: 2, blocks: true }, softcover: { length: 2, height: 2 },
  barrel: {}, start: {},
};

export class Editor {
  constructor(app) {
    this.app = app;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    this.target = new THREE.Vector3(0, 0, -6);
    this.dist = 22; this.camYaw = 0; this.tilt = 0.95;
    this.active = false;
    this.selected = null;
    this.placing = null;
    this.drag = null;
    this.orbit = null;
    this.ray = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.mouse = new THREE.Vector2();

    this.grid = new THREE.GridHelper(120, 120, 0x555555, 0x8a7a5a);
    this.grid.position.set(0, 0.01, -50);
    this.grid.material.transparent = true; this.grid.material.opacity = 0.35;
    this.grid.visible = false;
    app.scene.add(this.grid);

    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.65, 40), new THREE.MeshBasicMaterial({ color: 0x29e0ff, transparent: true, opacity: 0.9, depthTest: false }));
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.renderOrder = 10;
    this.selRing.visible = false;
    app.scene.add(this.selRing);
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.22, 24), new THREE.MeshBasicMaterial({ color: 0xffee55, depthTest: false }));
    this.cursor.rotation.x = -Math.PI / 2;
    this.cursor.renderOrder = 10;
    this.cursor.visible = false;
    app.scene.add(this.cursor);

    this.buildPalette();
    this.bindUI();
  }

  buildPalette() {
    const el = $('palette');
    el.innerHTML = '';
    for (const [title, types] of PALETTE) {
      const h = document.createElement('h4'); h.textContent = title; el.appendChild(h);
      for (const t of types) {
        const b = document.createElement('button');
        b.className = 'pal'; b.dataset.type = t;
        b.innerHTML = `<span class="ico ico-${t}"></span>${ALL_TYPES[t].label}`;
        b.onclick = () => this.setPlacing(this.placing === t ? null : t);
        el.appendChild(b);
      }
    }
  }

  bindUI() {
    $('ed-name').addEventListener('input', e => { this.app.stageData.name = e.target.value; });
    $('ed-desc').addEventListener('input', e => { this.app.stageData.description = e.target.value; });
    $('ed-new').onclick = () => {
      if (!confirm('¿Crear un stage vacío? Los cambios no guardados se perderán.')) return;
      this.app.loadStage({ id: 'custom-' + Date.now(), name: 'Nuevo stage', description: '', objects: [{ type: 'start', x: 0, z: 0, rot: 0 }] });
      this.refresh();
    };
    $('ed-save').onclick = () => { this.app.saveCurrentStage(); this.app.toast('Stage guardado'); this.refreshStageList(); };
    $('ed-saveas').onclick = () => {
      const d = this.app.stageData;
      const name = prompt('Nombre del nuevo stage:', d.name + ' (copia)');
      if (!name) return;
      d.id = 'custom-' + Date.now(); d.name = name;
      this.app.saveCurrentStage();
      this.refresh();
      this.app.toast('Guardado como «' + name + '»');
    };
    $('ed-delete').onclick = () => {
      if (!confirm('¿Borrar este stage de la lista?')) return;
      this.app.deleteStage(this.app.stageData.id);
      this.refresh();
    };
    $('ed-load').onchange = e => {
      const s = this.app.stages.find(s => s.id === e.target.value);
      if (s) { this.app.loadStage(structuredClone(s)); this.refresh(); this.frameStage(); }
    };
    $('ed-export').onclick = () => {
      const blob = new Blob([JSON.stringify(this.app.stageData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (this.app.stageData.name || 'stage').replace(/[^\w\-]+/g, '_') + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $('ed-import').onclick = () => $('ed-file').click();
    $('ed-file').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!Array.isArray(data.objects)) throw new Error('JSON sin "objects"');
        data.objects = data.objects.filter(o => ALL_TYPES[o.type]);
        data.id = 'custom-' + Date.now();
        data.name = data.name || f.name.replace(/\.json$/, '');
        this.app.loadStage(data);
        this.app.saveCurrentStage();
        this.refresh();
        this.frameStage();
        this.app.toast('Stage importado');
      } catch (err) { alert('No se pudo importar: ' + err.message); }
      e.target.value = '';
    };
    $('ed-play').onclick = () => this.app.setMode('play');
    $('ed-exit').onclick = () => this.app.openMenu();
    $('ed-dup').onclick = () => this.duplicate();
    $('ed-del').onclick = () => this.deleteSelected();
    $('ed-snap').onchange = () => {};
  }

  // ---------------- Activación ----------------
  enter() {
    this.active = true;
    this.grid.visible = true;
    this.app.stage.resetTargets();
    $('editor-ui').classList.remove('hidden');
    this.setPlacing(null);
    this.refresh();
    this.onResize();
  }

  exit() {
    this.active = false;
    this.grid.visible = false;
    this.selRing.visible = false;
    this.cursor.visible = false;
    this.setPlacing(null);
    this.select(null);
    $('editor-ui').classList.add('hidden');
  }

  refresh() {
    const d = this.app.stageData;
    $('ed-name').value = d.name || '';
    $('ed-desc').value = d.description || '';
    this.refreshStageList();
    this.select(null);
    this.updateStats();
  }

  refreshStageList() {
    const sel = $('ed-load');
    sel.innerHTML = '';
    for (const s of this.app.stages) {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.name;
      if (s.id === this.app.stageData.id) o.selected = true;
      sel.appendChild(o);
    }
    if (!this.app.stages.some(s => s.id === this.app.stageData.id)) {
      const o = document.createElement('option');
      o.value = this.app.stageData.id; o.textContent = this.app.stageData.name + ' (sin guardar)'; o.selected = true;
      sel.prepend(o);
    }
  }

  frameStage() {
    const objs = this.app.stageData.objects;
    if (!objs.length) return;
    let minZ = Infinity, maxZ = -Infinity, sx = 0;
    for (const o of objs) { minZ = Math.min(minZ, o.z); maxZ = Math.max(maxZ, o.z); sx += o.x; }
    this.target.set(sx / objs.length, 0, (minZ + maxZ) / 2);
    this.dist = THREE.MathUtils.clamp((maxZ - minZ) * 1.1 + 8, 10, 140);
  }

  updateStats() {
    const s = this.app.stage.summary();
    $('ed-stats').innerHTML = `<span>${s.paper} papel</span><span>${s.steel} metal</span><span>${s.ns} no-shoot</span><span>Rondas mín.: <b>${s.rounds}</b></span><span>Puntos máx.: <b>${s.maxPoints}</b></span>`;
  }

  setPlacing(type) {
    this.placing = type;
    document.querySelectorAll('#palette .pal').forEach(b => b.classList.toggle('active', b.dataset.type === type));
    this.cursor.visible = !!type;
    $('ed-hint').textContent = type ? `Clic en el suelo para colocar: ${ALL_TYPES[type].label} (Mayús+clic para colocar varios, Esc para cancelar)` : 'Clic: seleccionar · Arrastrar: mover · Q/E: rotar · Supr: borrar · Ctrl+D: duplicar · Clic der. arrastrar: girar vista · Rueda: zoom · WASD: desplazar';
  }

  // ---------------- Selección y propiedades ----------------
  select(entry) {
    this.selected = entry;
    this.selRing.visible = !!entry;
    this.renderProps();
  }

  renderProps() {
    const el = $('props');
    const e = this.selected;
    if (!e) { el.innerHTML = '<p class="muted">Nada seleccionado.<br>Elige un objeto de la paleta o haz clic en uno de la escena.</p>'; return; }
    const o = e.obj;
    const start = this.app.stage.start;
    const dist = Math.hypot(o.x - start.x, o.z - start.z);
    const field = (key, label, step, min, max) => `<label>${label}<input type="number" data-k="${key}" step="${step}" ${min != null ? `min="${min}"` : ''} ${max != null ? `max="${max}"` : ''} value="${+(o[key] ?? DEFAULTS[o.type][key] ?? 0).toFixed(2)}"></label>`;
    let typeSel = '';
    const WALLS = ['wall', 'lowwall', 'glasswall', 'softcover'];
    const fam = TARGET_TYPES[o.type] ? (TARGET_TYPES[o.type].paper ? ['paper', 'mini', 'noshoot'] : ['popper', 'minipopper', 'plate']) : (WALLS.includes(o.type) ? WALLS : null);
    const sel = (key, label, opts) => `<label>${label}<select data-k="${key}">${Object.entries(opts).map(([v, t]) => `<option value="${v}" ${String(o[key] ?? DEFAULTS[o.type][key]) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
    const chk = (key, label) => `<label class="chkrow"><input type="checkbox" data-k="${key}" ${(o[key] ?? DEFAULTS[o.type][key]) !== false ? 'checked' : ''}> ${label}</label>`;
    const hcOpts = Object.fromEntries(Object.entries(HARDCOVER).map(([k, v]) => [k, v.label]));
    if (fam) typeSel = `<label>Tipo<select data-k="type">${fam.map(t => `<option value="${t}" ${t === o.type ? 'selected' : ''}>${ALL_TYPES[t].label}</option>`).join('')}</select></label>`;
    let extra = '';
    if (['paper', 'mini', 'noshoot', 'plate'].includes(o.type)) extra += field('height', 'Altura (m)', 0.05, 0, 3);
    if (['popper', 'minipopper'].includes(o.type)) extra += field('height', 'Elevación base (m)', 0.05, 0, 2);
    if (['paper', 'mini', 'noshoot'].includes(o.type)) extra += sel('hardcover', 'Hard cover pintado', hcOpts);
    if (o.type === 'plate') extra += sel('shape', 'Forma', PLATE_SHAPES) + sel('size', 'Tamaño', PLATE_SIZES);
    if (WALLS.includes(o.type)) extra += field('length', 'Longitud (m)', 0.1, 0.2, 20) + field('height', 'Altura (m)', 0.1, 0.2, 4);
    if (o.type === 'glasswall') extra += chk('blocks', 'Detiene las balas (cobertura dura)');
    if (o.type === 'faultline') extra += field('length', 'Longitud (m)', 0.1, 0.2, 30);
    el.innerHTML = `
      <h4>${ALL_TYPES[o.type].label}</h4>
      ${typeSel}
      <div class="row2">${field('x', 'X (m)', 0.25)}${field('z', 'Z (m)', 0.25)}</div>
      ${field('rot', 'Rotación (°)', 5)}
      ${extra}
      <p class="muted">Distancia a la salida: <b>${dist.toFixed(1)} m</b></p>`;
    el.querySelectorAll('[data-k]').forEach(inp => {
      inp.addEventListener('change', () => {
        const k = inp.dataset.k;
        if (k === 'type') {
          o.type = inp.value;
          Object.assign(o, { ...DEFAULTS[o.type], ...pick(o, ['x', 'z', 'rot', 'type']) });
        } else if (inp.type === 'checkbox') {
          o[k] = inp.checked;
        } else if (inp.tagName === 'SELECT') {
          o[k] = isNaN(parseFloat(inp.value)) ? inp.value : parseFloat(inp.value);
        } else {
          const v = parseFloat(inp.value);
          if (!isNaN(v)) o[k] = v;
        }
        this.rebuildSelected();
      });
    });
  }

  rebuildSelected() {
    if (!this.selected) return;
    const ne = this.app.stage.rebuildEntry(this.selected);
    this.app.refreshShootables();
    this.select(ne);
    this.updateStats();
  }

  syncTransform(entry) {
    const o = entry.obj;
    entry.group.position.set(o.x, 0, o.z);
    entry.group.rotation.y = THREE.MathUtils.degToRad(o.rot || 0);
  }

  deleteSelected() {
    const e = this.selected;
    if (!e) return;
    if (e.obj.type === 'start') { this.app.toast('La posición de inicio no se puede borrar (muévela).'); return; }
    const objs = this.app.stageData.objects;
    objs.splice(objs.indexOf(e.obj), 1);
    this.app.stage.removeEntry(e);
    this.app.refreshShootables();
    this.select(null);
    this.updateStats();
  }

  duplicate() {
    const e = this.selected;
    if (!e || e.obj.type === 'start') return;
    const o = { ...e.obj, x: e.obj.x + 1 };
    this.app.stageData.objects.push(o);
    const ne = this.app.stage.addEntry(o);
    this.app.refreshShootables();
    this.select(ne);
    this.updateStats();
  }

  placeAt(type, x, z) {
    const snap = $('ed-snap').checked;
    if (snap) { x = Math.round(x / SNAP) * SNAP; z = Math.round(z / SNAP) * SNAP; }
    if (type === 'start') {
      const se = this.app.stage.entries.find(e => e.obj.type === 'start');
      if (se) { se.obj.x = x; se.obj.z = z; this.syncTransform(se); this.select(se); return; }
    }
    const o = { type, x, z, rot: 0, ...DEFAULTS[type] };
    this.app.stageData.objects.push(o);
    const ne = this.app.stage.addEntry(o);
    this.app.refreshShootables();
    this.select(ne);
    this.updateStats();
  }

  // ---------------- Entrada ----------------
  setMouse(ev) {
    const r = this.app.renderer.domElement.getBoundingClientRect();
    this.mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.mouse, this.camera);
  }
  groundPoint() {
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.groundPlane, p) ? p : null;
  }
  pickEntry() {
    const hits = this.ray.intersectObjects(this.app.stage.root.children, true);
    for (const h of hits) if (h.object.userData.entry) return h.object.userData.entry;
    return null;
  }

  onMouseDown(ev) {
    this.setMouse(ev);
    if (ev.button === 2 || ev.button === 1) {
      this.orbit = { x: ev.clientX, y: ev.clientY, yaw: this.camYaw, tilt: this.tilt };
      return;
    }
    if (ev.button !== 0) return;
    const gp = this.groundPoint();
    if (this.placing && gp) {
      this.placeAt(this.placing, gp.x, gp.z);
      if (!ev.shiftKey) this.setPlacing(null);
      return;
    }
    const e = this.pickEntry();
    this.select(e);
    if (e && gp) this.drag = { entry: e, ox: e.obj.x - gp.x, oz: e.obj.z - gp.z };
  }

  onMouseMove(ev) {
    this.setMouse(ev);
    if (this.orbit) {
      this.camYaw = this.orbit.yaw - (ev.clientX - this.orbit.x) * 0.006;
      this.tilt = THREE.MathUtils.clamp(this.orbit.tilt + (ev.clientY - this.orbit.y) * 0.004, 0.2, 1.45);
      return;
    }
    const gp = this.groundPoint();
    if (gp && this.placing) this.cursor.position.set(gp.x, 0.02, gp.z);
    if (this.drag && gp) {
      const o = this.drag.entry.obj;
      let x = gp.x + this.drag.ox, z = gp.z + this.drag.oz;
      if ($('ed-snap').checked) { x = Math.round(x / SNAP) * SNAP; z = Math.round(z / SNAP) * SNAP; }
      o.x = +x.toFixed(2); o.z = +z.toFixed(2);
      this.syncTransform(this.drag.entry);
      this.drag.moved = true;
    }
  }

  onMouseUp() {
    if (this.drag?.moved) this.renderProps();
    this.drag = null;
    this.orbit = null;
  }

  onWheel(ev) {
    this.dist = THREE.MathUtils.clamp(this.dist * (1 + Math.sign(ev.deltaY) * 0.1), 3, 160);
  }

  onKeyDown(ev) {
    if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'SELECT') return false;
    const e = this.selected;
    if ((ev.code === 'KeyQ' || ev.code === 'KeyE') && e) {
      const step = ev.shiftKey ? 5 : 15;
      e.obj.rot = (((e.obj.rot || 0) + (ev.code === 'KeyQ' ? step : -step)) + 360) % 360;
      this.syncTransform(e);
      this.renderProps();
      return true;
    }
    if ((ev.code === 'Delete' || ev.code === 'Backspace') && e) { this.deleteSelected(); return true; }
    if (ev.code === 'KeyD' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); this.duplicate(); return true; }
    if (ev.code === 'Escape') {
      if (this.placing) this.setPlacing(null); else this.select(null);
      return true;
    }
    return false;
  }

  update(dt, keys) {
    // Desplazar la vista
    const sp = this.dist * 0.9 * dt;
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    if (!keys.has('ControlLeft') && !keys.has('MetaLeft')) {
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      this.target.x += (-sin * f + cos * s) * sp;
      this.target.z += (-cos * f - sin * s) * sp;
    }
    const h = Math.sin(this.tilt) * this.dist, r = Math.cos(this.tilt) * this.dist;
    this.camera.position.set(this.target.x + Math.sin(this.camYaw) * r, h, this.target.z + Math.cos(this.camYaw) * r);
    this.camera.lookAt(this.target);
    if (this.selected) {
      const p = this.selected.group.position;
      this.selRing.position.set(p.x, 0.03, p.z);
      const big = ['wall', 'lowwall', 'glasswall', 'softcover', 'faultline'].includes(this.selected.obj.type) ? (this.selected.obj.length || 2) / 1.1 : 1;
      this.selRing.scale.setScalar(big);
    }
  }

  onResize() {
    const c = this.app.renderer.domElement;
    this.camera.aspect = c.clientWidth / c.clientHeight;
    this.camera.updateProjectionMatrix();
  }
}

function pick(o, keys) { const r = {}; for (const k of keys) r[k] = o[k]; return r; }
