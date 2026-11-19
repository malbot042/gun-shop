// Gun Shop — simulador de tiro IPSC. Punto de entrada.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WEAPONS, CATEGORIES, SIGHTS, AMMO, getWeapon, buildWeaponModel } from './weapons.js';
import { buildRange, Stage, PRESET_STAGES } from './stage.js';
import { FPS } from './fps.js';
import { generateStage, COURSES } from './generator.js';
import { ORIGINS, originOf } from './origin.js';
import { Editor } from './editor.js';
import * as Audio from './audio.js';

const $ = id => document.getElementById(id);
const LS = {
  get(k, def) { try { const v = localStorage.getItem('gunshop.' + k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem('gunshop.' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

class App {
  constructor() {
    this.settings = Object.assign({ sens: 1, arrowSens: 1, volume: 0.55, crosshair: true, hitPopups: true }, LS.get('settings', {}));
    this.stages = LS.get('stages', null) || structuredClone(PRESET_STAGES);
    // añadir stages de ejemplo nuevos que el usuario aún no tenga
    for (const p of PRESET_STAGES) if (!this.stages.some(s => s.id === p.id)) this.stages.push(structuredClone(p));
    this.records = LS.get('records', {});
    this.keys = new Set();
    this.mode = 'menu';
    this.locked = false;

    // Render
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.autoClear = false;
    $('game').appendChild(r.domElement);

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa9c8e6);
    scene.fog = new THREE.Fog(0xa9c8e6, 160, 900);
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.03, 1500);
    // mapa de entorno: reflejos realistas en el metal de las armas
    const pmrem = new THREE.PMREMGenerator(r);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = this.envMap;
    scene.environmentIntensity = 0.12;
    scene.add(this.camera);
    scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x8a7550, 1.25));
    const sun = this.sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
    sun.shadow.bias = -0.0005;
    scene.add(sun, sun.target);
    this.addScenery();

    this.range = buildRange(scene);
    this.stage = new Stage(scene);
    this.fps = new FPS(this);
    this.fps.vmScene.environment = this.envMap;
    this.fps.vmScene.environmentIntensity = 0.9;
    this.editor = new Editor(this);

    const lo = LS.get('loadout', { id: 'glock17', sight: 'iron', ammo: null });
    this.fps.equip(lo.id, lo.sight, lo.ammo);
    const last = LS.get('lastStage', this.stages[0]?.id);
    this.loadStage(structuredClone(this.stages.find(s => s.id === last) || this.stages[0] || PRESET_STAGES[0]));
    this.fps.spawn(this.stage.start);

    this.bindInput();
    this.bindMenus();
    this.onResize();
    addEventListener('resize', () => this.onResize());
    this.timer = new THREE.Timer();
    this.renderer.setAnimationLoop(() => this.frame());
    this.openMenu();
  }

  addScenery() {
    // árboles lejanos y colinas para el horizonte
    const trunk = new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 1 });
    const leaf = new THREE.MeshStandardMaterial({ color: 0x4f6b3a, roughness: 1 });
    const coneG = new THREE.ConeGeometry(1.8, 6, 7), trunkG = new THREE.CylinderGeometry(0.2, 0.25, 1.6, 6);
    const n = 140;
    const cones = new THREE.InstancedMesh(coneG, leaf, n), trunks = new THREE.InstancedMesh(trunkG, trunk, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      let x, z;
      do { x = (Math.random() - 0.5) * 260; z = 40 - Math.random() * 230; } while (x > -40 && x < 40 && z > -135 && z < 25);
      const k = 0.7 + Math.random() * 0.9;
      s.set(k, k, k);
      m.compose(new THREE.Vector3(x, 3 * k + 1.4 * k, z), q, s); cones.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, 0.8 * k, z), q, s); trunks.setMatrixAt(i, m);
    }
    this.scene.add(cones, trunks);
    const hillM = new THREE.MeshStandardMaterial({ color: 0x8c9a6e, roughness: 1, flatShading: true });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const h = new THREE.Mesh(new THREE.SphereGeometry(40 + Math.random() * 30, 8, 6), hillM);
      h.position.set(Math.cos(a) * 260, -25 - Math.random() * 10, -50 + Math.sin(a) * 260);
      h.scale.y = 0.5;
      this.scene.add(h);
    }
  }

  // ---------------- Stages ----------------
  loadStage(data) {
    if (!data.objects.some(o => o.type === 'start')) data.objects.unshift({ type: 'start', x: 0, z: 0, rot: 0 });
    this.stageData = data;
    this.stage.load(data);
    this.refreshShootables();
    $('stagename').textContent = data.name;
    LS.set('lastStage', data.id);
  }
  refreshShootables() { this.shootables = [...this.range.shootables, ...this.stage.shootables]; }
  saveCurrentStage() {
    const copy = structuredClone(this.stageData);
    const i = this.stages.findIndex(s => s.id === copy.id);
    if (i >= 0) this.stages[i] = copy; else this.stages.push(copy);
    LS.set('stages', this.stages);
    $('stagename').textContent = copy.name;
  }
  deleteStage(id) {
    this.stages = this.stages.filter(s => s.id !== id);
    if (!this.stages.length) this.stages = structuredClone(PRESET_STAGES);
    LS.set('stages', this.stages);
    this.loadStage(structuredClone(this.stages[0]));
  }

  // Stage aleatorio (corto / medio / largo): se guarda en la lista para poder repetirlo o exportarlo
  generate(kind) {
    const st = generateStage(kind);
    this.loadStage(st);
    this.saveCurrentStage();
    this.toast(`${COURSES[kind].label}: ${st.shots} disparos · semilla ${st.seed}`);
    return st;
  }

  saveLoadout() { LS.set('loadout', { id: this.fps.weapon.id, sight: this.fps.sight, ammo: this.fps.ammo }); }

  // ---------------- Modos ----------------
  setMode(mode) {
    const prev = this.mode;
    this.mode = mode;
    for (const id of ['menu', 'armory', 'stages', 'help', 'results', 'settings']) $(id).classList.add('hidden');
    $('hud').classList.toggle('hidden', mode !== 'play');
    if (prev === 'editor' && mode !== 'editor') this.editor.exit();
    if (mode === 'editor') {
      this.fps.cancelRun();
      if (document.pointerLockElement) document.exitPointerLock();
      this.editor.enter();
      if (prev !== 'editor') { this.editor.target.set(this.stage.start.x, 0, this.stage.start.z - 6); this.editor.frameStage(); }
    }
    if (mode === 'play') {
      if (prev === 'editor') { this.stage.resetTargets(); this.fps.spawn(this.stage.start); }
      this.fps.updateHUD();
      $('hint').classList.toggle('hidden', !!document.pointerLockElement);
    }
  }

  openMenu(panel = 'menu') {
    if (document.pointerLockElement) document.exitPointerLock();
    if (this.mode === 'editor') this.editor.exit();
    this.mode = 'menu';
    $('hud').classList.add('hidden');
    for (const id of ['menu', 'armory', 'stages', 'help', 'results', 'settings']) $(id).classList.toggle('hidden', id !== panel);
    $('menu-current').innerHTML = `<b>${this.fps.weapon.brand} ${this.fps.weapon.model}</b> · ${SIGHTS[this.fps.sight].name}<br>Stage: <b>${this.stageData.name}</b>`;
    $('btn-resume').classList.toggle('hidden', !this.started);
    if (panel === 'armory') this.renderArmory();
    if (panel === 'stages') this.renderStages();
    if (panel === 'settings') this.renderSettings();
  }

  // ---------------- UI ----------------
  bindMenus() {
    $('btn-play').onclick = () => this.openMenu('stages');
    $('btn-resume').onclick = () => this.startPlay();
    $('btn-armory').onclick = () => this.openMenu('armory');
    $('btn-editor').onclick = () => { Audio.initAudio(); this.setMode('editor'); };
    $('btn-help').onclick = () => this.openMenu('help');
    $('btn-settings').onclick = () => this.openMenu('settings');
    document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => this.openMenu('menu'));
    $('res-close').onclick = () => this.startPlay();
    $('res-again').onclick = () => { this.startPlay(); this.fps.makeReady(); };
  }

  startPlay() {
    Audio.initAudio();
    Audio.setVolume(this.settings.volume);
    this.started = true;
    this.setMode('play');
    this.renderer.domElement.requestPointerLock?.()?.catch?.(() => {});
  }

  renderStages() {
    const el = $('stage-list');
    el.innerHTML = '';
    // Agrupados por tipo de stage (regla IPSC 1.2.1): corto, medio, largo; dentro, por disparos y nombre
    const COURSE = [['Cortos', 'hasta 12 disparos'], ['Medios', '13 a 24 disparos'], ['Largos', '25 a 32 disparos'], ['Exceden 32', 'más de 32 disparos']];
    const courseOf = r => (r <= 12 ? 0 : r <= 24 ? 1 : r <= 32 ? 2 : 3);
    // filtro por origen (ejemplos, aleatorios, importados, propios)
    const filt = this.stageFilter || 'all';
    const count = k => this.stages.filter(s => k === 'all' || originGroup(originOf(s)) === k).length;
    $('stg-filter').innerHTML = [['all', 'Todos'], ['preset', '★ Ejemplos'], ['random', '🎲 Aleatorios'], ['imported', '⬇ Importados'], ['custom', '✎ Propios']]
      .map(([k, l]) => `<button data-f="${k}" class="${k === filt ? 'active' : ''}" ${count(k) || k === 'all' ? '' : 'disabled'}>${l} <span>${count(k)}</span></button>`).join('');
    $('stg-filter').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { this.stageFilter = b.dataset.f; this.renderStages(); });
    const items = this.stages.filter(s => filt === 'all' || originGroup(originOf(s)) === filt).map(s => {
      const tmp = new Stage(new THREE.Scene()); tmp.data = s;
      const sum = tmp.summary();
      return { s, sum, c: courseOf(sum.rounds) };
    }).sort((a, b) => a.c - b.c || a.sum.rounds - b.sum.rounds || a.s.name.localeCompare(b.s.name, 'es', { numeric: true }));
    let last = -1;
    for (const { s, sum, c } of items) {
      if (c !== last) {
        last = c;
        const h = document.createElement('h3');
        h.className = 'course-head';
        h.innerHTML = `${COURSE[c][0]} <span>${COURSE[c][1]} · ${items.filter(i => i.c === c).length}</span>`;
        el.appendChild(h);
      }
      const rec = this.records[s.id];
      const card = document.createElement('div');
      card.className = 'card' + (s.id === this.stageData.id ? ' sel' : '');
      const org = originOf(s);
      card.dataset.origin = org;
      card.innerHTML = `<div class="origin o-${org}" title="${ORIGINS[org].title}">${ORIGINS[org].icon} ${ORIGINS[org].label}</div><h3>${esc(s.name)}</h3><p>${esc(s.description || '')}</p>
        <div class="tags"><span>${sum.paper} papel</span><span>${sum.steel} metal</span><span>${sum.ns} NS</span><span>${sum.rounds} rondas mín.</span><span class="course">${['Corto', 'Medio', 'Largo', 'Excede 32'][c]}</span></div>
        ${rec ? `<div class="rec">Mejor HF: <b>${rec.hf.toFixed(4)}</b> (${esc(rec.weapon)})</div>` : ''}`;
      card.onclick = () => { this.loadStage(structuredClone(s)); this.fps.cancelRun(); this.fps.spawn(this.stage.start); this.startPlay(); };
      el.appendChild(card);
    }
    if (!items.length) el.innerHTML = '<p class="muted">No hay stages de este tipo.</p>';
    document.querySelectorAll('#stages [data-gen]').forEach(b => b.onclick = () => {
      this.generate(b.dataset.gen);
      this.fps.cancelRun();
      this.fps.spawn(this.stage.start);
      this.startPlay();
    });
    $('stg-reset').onclick = () => {
      if (!confirm('¿Restaurar los stages de ejemplo? Tus stages propios se conservan.')) return;
      for (const p of PRESET_STAGES) { const i = this.stages.findIndex(s => s.id === p.id); if (i >= 0) this.stages[i] = structuredClone(p); else this.stages.push(structuredClone(p)); }
      LS.set('stages', this.stages);
      this.renderStages();
    };
  }

  renderSettings() {
    const s = this.settings;
    const el = $('settings-body');
    el.innerHTML = `
      <label>Sensibilidad del ratón <input type="range" id="set-sens" min="0.2" max="3" step="0.05" value="${s.sens}"><output>${s.sens}</output></label>
      <label>Velocidad de apuntado con flechas <input type="range" id="set-arrow" min="0.3" max="3" step="0.05" value="${s.arrowSens}"><output>${s.arrowSens}</output></label>
      <label>Volumen <input type="range" id="set-vol" min="0" max="1" step="0.05" value="${s.volume}"><output>${s.volume}</output></label>
      <label class="chk"><input type="checkbox" id="set-cross" ${s.crosshair ? 'checked' : ''}> Mostrar cruz central (sin apuntar)</label>
      <label class="chk"><input type="checkbox" id="set-pop" ${s.hitPopups ? 'checked' : ''}> Mostrar la zona de cada impacto (A/C/D)</label>`;
    const bind = (id, key, num = true) => $(id).addEventListener('input', e => {
      s[key] = e.target.type === 'checkbox' ? e.target.checked : (num ? parseFloat(e.target.value) : e.target.value);
      if (e.target.nextElementSibling?.tagName === 'OUTPUT') e.target.nextElementSibling.textContent = s[key];
      if (key === 'volume') Audio.setVolume(s.volume);
      LS.set('settings', s);
    });
    bind('set-sens', 'sens'); bind('set-arrow', 'arrowSens'); bind('set-vol', 'volume'); bind('set-cross', 'crosshair'); bind('set-pop', 'hitPopups');
  }

  // ----- Armería -----
  renderArmory() {
    if (!this.armorySel) this.armorySel = { cat: this.fps.weapon.category, id: this.fps.weapon.id, sight: this.fps.sight, ammo: this.fps.ammo };
    const sel = this.armorySel;
    const tabs = $('arm-tabs');
    tabs.innerHTML = '';
    for (const [k, v] of Object.entries(CATEGORIES)) {
      const b = document.createElement('button');
      b.textContent = v; b.className = k === sel.cat ? 'active' : '';
      b.onclick = () => { sel.cat = k; const w = WEAPONS.find(w => w.category === k); sel.id = w.id; sel.sight = w.sights[0]; sel.ammo = w.ammo?.[0] ?? null; this.renderArmory(); };
      tabs.appendChild(b);
    }
    const list = $('arm-list');
    list.innerHTML = '';
    for (const w of WEAPONS.filter(w => w.category === sel.cat)) {
      const d = document.createElement('div');
      d.className = 'witem' + (w.id === sel.id ? ' sel' : '');
      d.innerHTML = `<b>${w.brand}</b> ${w.model}<small>${w.caliber} · ${w.capacity} cart. · ${w.pf === 'major' ? 'Major' : 'Minor'}</small>`;
      d.onclick = () => { sel.id = w.id; if (!w.sights.includes(sel.sight)) sel.sight = w.sights[0]; sel.ammo = w.ammo ? (w.ammo.includes(sel.ammo) ? sel.ammo : w.ammo[0]) : null; this.renderArmory(); };
      list.appendChild(d);
    }
    const w = getWeapon(sel.id);
    const all = WEAPONS.filter(x => x.category === w.category);
    const norm = (key, invert) => {
      const vals = all.map(x => x[key]); const mn = Math.min(...vals), mx = Math.max(...vals);
      const k = mx === mn ? 0.6 : (w[key] - mn) / (mx - mn);
      return Math.round((invert ? 1 - k : k) * 75 + 20);
    };
    const bar = (label, v) => `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${v}%"></i></div></div>`;
    $('arm-detail').innerHTML = `
      <h2>${w.brand} <span>${w.model}</span></h2>
      <p class="muted">${CATEGORIES[w.category]} · ${w.caliber} · Factor de potencia: <b>${w.pf === 'major' ? 'Major' : 'Minor'}</b> · Capacidad: <b>${w.capacity}</b>${w.tube ? ' (tubo, carga cartucho a cartucho)' : ''}${w.pump ? ' · Acción de corredera' : ''}</p>
      ${bar('Precisión', norm('spread', true))}
      ${bar('Control de retroceso', norm('recoil', true))}
      ${bar('Cadencia', norm('minInterval', true))}
      ${bar('Recarga rápida', norm('reload', true))}
      <h4>Mira</h4><div class="opts" id="arm-sights">${w.sights.map(s => `<button data-s="${s}" class="${s === sel.sight ? 'active' : ''}">${SIGHTS[s].name}</button>`).join('')}</div>
      ${w.ammo ? `<h4>Munición</h4><div class="opts" id="arm-ammo">${w.ammo.map(a => `<button data-a="${a}" class="${a === sel.ammo ? 'active' : ''}">${AMMO[a].name}</button>`).join('')}</div>` : ''}
    `;
    $('arm-detail').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sel.sight = b.dataset.s; this.renderArmory(); });
    $('arm-detail').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { sel.ammo = b.dataset.a; this.renderArmory(); });
    $('arm-equip').onclick = () => {
      this.fps.equip(sel.id, sel.sight, sel.ammo);
      this.saveLoadout();
      this.armorySel = null;
      this.startPlay();
    };
    this.updatePreview(w, sel.sight);
  }

  updatePreview(w, sight) {
    if (!this.preview) {
      const canvas = $('arm-preview');
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      r.setPixelRatio(Math.min(devicePixelRatio, 2));
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      const sc = new THREE.Scene();
      sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
      sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1));
      const dl = new THREE.DirectionalLight(0xffffff, 2.5); dl.position.set(1, 2, 1.5); sc.add(dl);
      const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
      const pivot = new THREE.Group(); sc.add(pivot);
      this.preview = { r, sc, cam, pivot, model: null };
      const loop = () => {
        if (this.mode === 'menu' && !$('armory').classList.contains('hidden')) {
          const { r, sc, cam, pivot } = this.preview;
          const wdt = canvas.clientWidth, hgt = canvas.clientHeight;
          if (canvas.width !== Math.floor(wdt * r.getPixelRatio())) { r.setSize(wdt, hgt, false); cam.aspect = wdt / hgt; cam.updateProjectionMatrix(); }
          pivot.rotation.y += 0.008;
          r.render(sc, cam);
        }
        requestAnimationFrame(loop);
      };
      loop();
    }
    const p = this.preview;
    if (p.model) p.pivot.remove(p.model);
    const m = buildWeaponModel(w, sight);
    const hands = [];
    m.traverse(o => { if (o.userData.hand) hands.push(o); });
    for (const h of hands) h.parent.remove(h);
    const box = new THREE.Box3().setFromObject(m);
    const c = box.getCenter(new THREE.Vector3());
    m.position.sub(c);
    p.pivot.add(m);
    p.model = m;
    const size = box.getSize(new THREE.Vector3()).length();
    p.cam.position.set(size * 0.62, size * 0.2, size * 0.42);
    p.cam.lookAt(0, 0, 0);
    p.pivot.rotation.y = -0.6;
  }

  showResults(r) {
    if (document.pointerLockElement) document.exitPointerLock();
    this.mode = 'menu';
    $('hud').classList.add('hidden');
    $('results').classList.remove('hidden');
    const w = this.fps.weapon;
    const key = this.stageData.id;
    const prev = this.records[key];
    let isRecord = false;
    if (r.hf > 0 && (!prev || r.hf > prev.hf)) {
      this.records[key] = { hf: r.hf, weapon: `${w.brand} ${w.model}`, date: Date.now() };
      LS.set('records', this.records);
      isRecord = true;
    }
    $('res-body').innerHTML = `
      <div class="big"><div><small>Tiempo</small><b>${r.time.toFixed(2)} s</b></div><div><small>Puntos</small><b>${r.points}</b></div><div><small>Hit Factor</small><b>${r.hf.toFixed(4)}</b></div></div>
      ${isRecord ? '<p class="record">¡Nuevo récord personal en este stage!</p>' : prev ? `<p class="muted">Récord: HF ${prev.hf.toFixed(4)} (${esc(prev.weapon)})</p>` : ''}
      <div class="zones"><span class="zA">A ${r.A}</span><span class="zC">C ${r.C}</span><span class="zD">D ${r.D}</span><span class="zS">Metal ${r.steel}</span><span class="zM">M ${r.M}</span><span class="zN">NS ${r.NS}</span></div>
      <p class="muted">${esc(w.brand + ' ' + w.model)} · ${w.pf === 'major' ? 'Major' : 'Minor'} · ${r.shots} disparos</p>
      <table><thead><tr><th>#</th><th>Blanco</th><th>Impactos</th><th>Pts</th></tr></thead>
      <tbody>${r.rows.map(x => `<tr><td>${x.n}</td><td>${esc(x.label)}</td><td>${x.hits}</td><td class="${x.pts < 0 ? 'neg' : ''}">${x.pts}</td></tr>`).join('')}</tbody></table>`;
  }

  toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => el.classList.remove('on'), 1400);
  }
  setRunMsg(msg) { $('runmsg').textContent = msg; $('runmsg').classList.toggle('on', !!msg); }
  hitPopup(zones) {
    if (!this.settings.hitPopups) return;
    const el = $('hitpop');
    const counts = {};
    for (const z of zones) counts[z] = (counts[z] || 0) + 1;
    el.innerHTML = Object.entries(counts).map(([z, n]) => `<span class="z${z[0]}">${z === 'STEEL' ? 'METAL' : z}${n > 1 ? '×' + n : ''}</span>`).join(' ');
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  }

  // ---------------- Entrada ----------------
  bindInput() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      $('hint').classList.toggle('hidden', this.locked || this.mode !== 'play');
      if (!this.locked && this.mode === 'play' && !this.ignoreUnlock) this.openMenu('menu');
      this.ignoreUnlock = false;
    });
    canvas.addEventListener('mousedown', e => {
      Audio.initAudio();
      if (this.mode === 'editor') return this.editor.onMouseDown(e);
      if (this.mode !== 'play') return;
      if (!this.locked) { canvas.requestPointerLock?.()?.catch?.(() => {}); return; }
      if (e.button === 0) this.fps.fire();
      if (e.button === 2) { this.fps.adsHold = true; this.fps.aimPressed(); }
    });
    addEventListener('mouseup', e => {
      if (this.mode === 'editor') return this.editor.onMouseUp(e);
      if (e.button === 2) this.fps.adsHold = false;
    });
    addEventListener('mousemove', e => {
      if (this.mode === 'editor') return this.editor.onMouseMove(e);
      if (this.mode === 'play' && this.locked) this.fps.look(e.movementX, e.movementY);
    });
    canvas.addEventListener('wheel', e => {
      if (this.mode === 'editor') { e.preventDefault(); this.editor.onWheel(e); }
      else if (this.mode === 'play') { e.preventDefault(); this.fps.adjustZoom(-Math.sign(e.deltaY)); }
    }, { passive: false });

    addEventListener('keydown', e => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (this.mode === 'editor') {
        if (this.editor.onKeyDown(e)) { e.preventDefault(); return; }
        if (!typing) {
          if (e.code === 'Tab') { e.preventDefault(); this.setMode('play'); return; }
          this.keys.add(e.code);
        }
        return;
      }
      if (typing) return;
      if (this.mode === 'menu') {
        if (e.code === 'Escape' && this.started) this.startPlay();
        return;
      }
      if (this.mode !== 'play') return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      Audio.initAudio();
      switch (e.code) {
        case 'Space': this.fps.cycleStance(); break;
        case 'KeyF': this.fps.fire(); break;
        case 'KeyR': this.fps.startReload(); break;
        case 'KeyZ': this.fps.ads = !this.fps.ads; if (this.fps.ads) this.fps.aimPressed(); break;
        case 'KeyC': this.fps.cycleStance(); break;
        case 'KeyV': this.fps.cycleSight(); break;
        case 'KeyX': this.fps.cycleAmmo(); break;
        case 'KeyM': this.fps.toggleMagnifier(); break;
        case 'Equal': case 'NumpadAdd': this.fps.adjustZoom(1); break;
        case 'Minus': case 'NumpadSubtract': this.fps.adjustZoom(-1); break;
        case 'Enter': this.fps.makeReady(); break;
        case 'KeyT': this.fps.cancelRun(); this.stage.resetTargets(); this.fps.updateHUD(); this.toast('Blancos reiniciados'); break;
        case 'KeyB': this.openMenu('armory'); break;
        case 'Tab': this.ignoreUnlock = this.locked; this.setMode('editor'); break;
        case 'Escape': this.openMenu('menu'); break;
      }
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  onResize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.fps.vmCamera.aspect = w / h; this.fps.vmCamera.updateProjectionMatrix();
    this.editor.onResize();
  }

  frame() {
    this.timer.update();
    const dt = Math.min(0.05, this.timer.getDelta());
    this.stage.update(dt);
    let cam = this.camera;
    if (this.mode === 'play') this.fps.update(dt, this.keys);
    else if (this.mode === 'editor') { this.editor.update(dt, this.keys); cam = this.editor.camera; }
    else {
      // fondo animado del menú: vista lenta del stage
      this.menuT = (this.menuT || 0) + dt * 0.05;
      const s = this.stage.start;
      cam = this.editor.camera;
      cam.position.set(s.x + Math.sin(this.menuT) * 10, 4.5, s.z + 6 + Math.cos(this.menuT) * 3);
      cam.lookAt(s.x, 1, s.z - 10);
    }
    // sombras alrededor de la cámara
    const c = cam.position;
    const fx = Math.round(c.x / 4) * 4, fz = Math.round(c.z / 4) * 4 - 12;
    this.sun.position.set(fx + 25, 45, fz + 20);
    this.sun.target.position.set(fx, 0, fz);

    this.renderer.clear();
    this.renderer.render(this.scene, cam);
    if (this.mode === 'play' && this.fps.model.visible) {
      this.renderer.clearDepth();
      this.renderer.render(this.fps.vmScene, this.fps.vmCamera);
    }
  }
}

function originGroup(o) { return o === 'designer' || o === 'import' ? 'imported' : o; }

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

window.app = new App();
