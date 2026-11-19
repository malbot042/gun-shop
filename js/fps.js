// Modo FPS: jugador, arma, disparo, retroceso, recarga y cronómetro del stage.
import * as THREE from 'three';
import { getWeapon, buildWeaponModel, SIGHTS, AMMO } from './weapons.js';
import { hitPaper, hitSteel, TARGET_TYPES } from './targets.js';
import { scoreStage, isStageComplete } from './scoring.js';
import * as Audio from './audio.js';

const $ = id => document.getElementById(id);
const BASE_FOV = 75;
const EYE = 1.65, EYE_CROUCH = 1.15;

function makeSpriteTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const DUST_TEX = makeSpriteTex('rgba(200,180,140,0.9)', 'rgba(200,180,140,0)');
const SPARK_TEX = makeSpriteTex('rgba(255,240,180,1)', 'rgba(255,140,20,0)');
const FLASH_TEX = makeSpriteTex('rgba(255,250,210,1)', 'rgba(255,150,30,0)');

function buildReticleSVG(type, R, ppm) {
  const D = R * 2, c = R;
  const lines = [];
  const L = (x1, y1, x2, y2, w = 1) => lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="${w}"/>`);
  if (type === 'dot') {
    const r = Math.max(2, 0.29 * ppm);
    return `<svg width="${D}" height="${D}"><circle cx="${c}" cy="${c}" r="${r * 2.2}" fill="rgba(255,40,20,0.25)"/><circle cx="${c}" cy="${c}" r="${r}" fill="#ff2a1a"/></svg>`;
  }
  // postes gruesos exteriores + cruz fina
  const inner = type === 'lpvo' ? 3.2 * ppm + 6 : 0.62 * R;
  L(0, c, c - inner, c, 4); L(c + inner, c, D, c, 4); L(c, c + inner, c, D, 4); L(c, 0, c, c - inner, 4);
  L(c - inner, c, c + inner, c, 1.2); L(c, c - inner, c, c + inner, 1.2);
  let extra = '';
  if (type === 'mil') {
    // marcas cada 1 mrad (largas cada 5), solo si caben
    const step = ppm >= 4 ? 1 : ppm >= 1.2 ? 5 : 10;
    for (let m = step; m * ppm < inner; m += step) {
      const big = m % 5 === 0;
      const t = big ? 7 : 4;
      for (const s of [-1, 1]) {
        L(c + s * m * ppm, c - t, c + s * m * ppm, c + t, 1);
        L(c - t, c + s * m * ppm, c + t, c + s * m * ppm, 1);
      }
      if (big) extra += `<text x="${c + m * ppm}" y="${c - 10}" font-size="10" text-anchor="middle" fill="#000" font-family="monospace">${m}</text>`;
    }
    extra += `<circle cx="${c}" cy="${c}" r="2" fill="#ff2a1a"/>`;
  } else {
    // LPVO: herradura iluminada de 3 mrad + punto central
    const r = 3 * ppm;
    extra += `<path d="M ${c - r * 0.7} ${c + r * 0.7} A ${r} ${r} 0 1 1 ${c + r * 0.7} ${c + r * 0.7}" fill="none" stroke="#ff2a1a" stroke-width="2"/>`;
    extra += `<circle cx="${c}" cy="${c}" r="${Math.max(1.5, 0.15 * ppm)}" fill="#ff2a1a"/>`;
  }
  return `<svg width="${D}" height="${D}">${lines.join('')}${extra}</svg>`;
}

export class FPS {
  constructor(app) {
    this.app = app;
    this.camera = app.camera;
    this.pos = new THREE.Vector3(0, 0, 5);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.eye = EYE;
    this.crouch = false;
    this.bob = 0;
    this.recoilPitch = 0; this.recoilYaw = 0;
    this.ads = false; this.adsHold = false; this.adsT = 0;
    this.kick = 0;
    this.reloading = null;
    this.lastShot = -1;
    this.pumpT = 0;
    this.time = 0;
    this.effects = [];
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 450;

    // Escena del arma (se renderiza encima para que no atraviese paredes)
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(55, 1, 0.005, 10);
    this.vmScene.add(new THREE.HemisphereLight(0xdde8ff, 0x8a7a60, 2.6));
    const d = new THREE.DirectionalLight(0xffffff, 3.2);
    d.position.set(0.6, 1, 1.2);
    this.vmScene.add(d);
    this.holder = new THREE.Group();
    this.vmScene.add(this.holder);
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLASH_TEX, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.flash.scale.setScalar(0.12);
    this.flash.visible = false;
    this.flashLight = new THREE.PointLight(0xffb060, 0, 12, 2);
    app.scene.add(this.flashLight);

    this.run = { state: 'free', t0: 0, lastShot: 0, shots: 0, timer: null };
  }

  // ---------------- Arma ----------------
  equip(id, sight, ammo) {
    const w = getWeapon(id);
    this.weapon = w;
    this.sight = w.sights.includes(sight) ? sight : w.sights[0];
    this.ammo = w.ammo ? (w.ammo.includes(ammo) ? ammo : w.ammo[0]) : null;
    if (this.model) this.holder.remove(this.model);
    this.model = buildWeaponModel(w, this.sight);
    this.model.add(this.flash);
    this.flash.position.set(0, this.model.userData.muzzleY, this.model.userData.muzzleZ - 0.04);
    this.holder.add(this.model);
    this.mag = w.capacity;
    this.reloading = null;
    this.adsT = 0;
    const sd = SIGHTS[this.sight];
    this.zoomLevel = sd.def ?? sd.zoom[0];
    this.reticleKey = '';
    document.getElementById('scope').classList.remove('on');
    this.updateHUD();
  }

  cycleSight() {
    const s = this.weapon.sights;
    this.equipKeepAmmo(s[(s.indexOf(this.sight) + 1) % s.length]);
    this.app.toast('Mira: ' + SIGHTS[this.sight].name);
    this.app.saveLoadout();
  }
  cycleAmmo() {
    if (!this.weapon.ammo) return;
    const a = this.weapon.ammo;
    this.ammo = a[(a.indexOf(this.ammo) + 1) % a.length];
    this.app.toast('Munición: ' + AMMO[this.ammo].name);
    this.app.saveLoadout();
    this.updateHUD();
  }
  equipKeepAmmo(sight) {
    const mag = this.mag;
    this.equip(this.weapon.id, sight, this.ammo);
    this.mag = mag;
    this.updateHUD();
  }

  startReload() {
    const w = this.weapon;
    if (this.reloading || this.mag >= w.capacity) return;
    this.ads = false;
    if (w.tube) this.reloading = { t: 0, dur: w.reload, tube: true };
    else { this.reloading = { t: 0, dur: w.reload }; this.mag = 0; }
    Audio.reloadSound(0);
    this.updateHUD();
  }

  // Apuntar durante la carga cartucho a cartucho (escopeta de tubo): se interrumpe la recarga,
  // se conservan los cartuchos ya metidos y se puede apuntar y disparar de inmediato.
  aimPressed() {
    if (!this.reloading?.tube) return;
    this.reloading = null;
    this.app.toast(`Recarga interrumpida: ${this.mag} / ${this.weapon.capacity}`);
    this.updateHUD();
  }

  // ---------------- Jugador ----------------
  spawn(start) {
    this.pos.set(start.x, 0, start.z);
    this.yaw = THREE.MathUtils.degToRad(start.rot || 0);
    this.pitch = 0;
    this.vel.set(0, 0, 0);
    this.recoilPitch = this.recoilYaw = 0;
  }

  look(dx, dy) {
    const zoom = this.currentZoom();
    const s = this.app.settings.sens * 0.0022 / Math.max(1, zoom * 0.85);
    this.yaw -= dx * s;
    this.pitch -= dy * s;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
  }

  currentZoom() {
    return 1 + (this.zoomLevel - 1) * this.adsT;
  }

  isScoped() {
    const sd = SIGHTS[this.sight];
    return !!(sd.scope || (sd.scopeFrom && this.zoomLevel >= sd.scopeFrom));
  }

  // Rueda del ratón: cambia los aumentos del visor
  adjustZoom(dir) {
    const sd = SIGHTS[this.sight];
    if (sd.steps) {
      this.zoomLevel = dir > 0 ? sd.steps[sd.steps.length - 1] : sd.steps[0];
    } else if (sd.zoom.length > 1) {
      this.zoomLevel = THREE.MathUtils.clamp(this.zoomLevel * Math.pow(1.12, dir), sd.zoom[0], sd.zoom[1]);
    } else return;
    this.updateHUD();
  }
  toggleMagnifier() {
    const sd = SIGHTS[this.sight];
    if (!sd.steps) return;
    this.zoomLevel = this.zoomLevel === sd.steps[0] ? sd.steps[1] : sd.steps[0];
    this.app.toast(this.zoomLevel > 2 ? 'Magnificador 3x' : 'Magnificador abatido');
    this.updateHUD();
  }

  isAiming() { return this.ads || this.adsHold; }

  // ---------------- Disparo ----------------
  fire() {
    const w = this.weapon;
    if (this.run.state === 'ready') { this.app.toast('¡Espera al pitido!'); return; }
    if (this.reloading) {
      if (this.reloading.tube && this.mag > 0) { this.reloading = null; this.updateHUD(); } // interrumpir carga de cartuchos
      else return;
    }
    if (this.time - this.lastShot < w.minInterval) return;
    if (this.pumpT > 0) return;
    if (this.mag <= 0) { Audio.dryClick(); this.app.toast('Vacío — R para recargar'); return; }
    this.mag--;
    this.lastShot = this.time;
    Audio.gunshot(w.category, w.loud);
    if (w.pump) { this.pumpT = w.minInterval; setTimeout(() => Audio.pumpSound(), 140); }

    // Dispersión total (mrad)
    const hspeed = Math.hypot(this.vel.x, this.vel.z);
    let spreadM = w.spread;
    if (!this.isAiming() || this.adsT < 0.8) spreadM += w.category === 'handgun' ? 6 : 10;
    spreadM += hspeed / 4 * (w.category === 'handgun' ? 5 : 8);
    if (this.crouch) spreadM *= 0.8;
    const ammo = this.ammo ? AMMO[this.ammo] : null;
    const pellets = ammo ? ammo.pellets : 1;
    const holeR = ammo ? ammo.hole : (w.category === 'rifle' ? (w.caliber.startsWith('7.62') ? 0.0038 : w.caliber.startsWith('9') ? 0.0045 : 0.0029) : (w.pf === 'major' ? 0.0052 : 0.0045));

    this.camera.updateMatrixWorld();
    const origin = new THREE.Vector3().setFromMatrixPosition(this.camera.matrixWorld);
    const shootables = this.app.shootables;
    const zones = [];
    for (let p = 0; p < pellets; p++) {
      let s = spreadM;
      if (ammo && pellets > 1) s = ammo.spread + w.spread;
      const r = s / 1000 * 0.5 * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, -1).normalize().applyQuaternion(this.camera.quaternion);
      this.raycaster.set(origin, dir);
      const hits = this.raycaster.intersectObjects(shootables, false);
      for (const h of hits) {
        const info = h.object.userData.hit;
        if (!info) continue;
        if (info.kind === 'soft') continue; // soft cover: la bala pasa
        if (info.kind === 'paper') {
          const r = hitPaper(info.state, h.point, holeR);
          if (r.zone === 'HC') { zones.push('HC'); break; } // hard cover pintado: detiene la bala
          if (r.zone) zones.push(TARGET_TYPES[info.state.type].noshoot ? 'NS' : r.zone);
          if (!r.pass) break; // área puntuable impenetrable: el blanco de detrás no cuenta
          continue;           // borde no puntuable o línea troquelada rota: sigue al de detrás
        }
        if (info.kind === 'steel') {
          const st = info.state;
          if (hitSteel(st)) zones.push('STEEL');
          Audio.steelPing(h.distance);
          this.spawnEffect(h.point, SPARK_TEX, 0.12, 0.15);
          break;
        }
        // superficie dura: polvo
        const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
        this.spawnEffect(h.point.clone().addScaledVector(n, 0.03), DUST_TEX, info.ground || info.berm ? 0.35 : 0.18, 0.6);
        break;
      }
    }
    if (zones.length) this.app.hitPopup(zones);

    // Retroceso
    this.recoilPitch += w.recoil * (0.85 + Math.random() * 0.3) * (this.crouch ? 0.85 : 1);
    this.recoilYaw += (Math.random() - 0.5) * w.recoil * 0.5;
    this.kick = 1;
    this.flash.visible = true;
    this.flash.material.rotation = Math.random() * Math.PI;
    this.flashT = 0.04;
    this.flashLight.intensity = 6;
    this.flashLight.position.copy(origin);

    if (this.run.state === 'running') {
      this.run.shots++;
      this.run.lastShot = (performance.now() - this.run.t0) / 1000;
      if (isStageComplete(this.app.stage.targets)) {
        clearTimeout(this.autoFinish);
        this.autoFinish = setTimeout(() => { if (this.run.state === 'running' && isStageComplete(this.app.stage.targets)) this.finishRun(); }, 600);
      }
    }
    this.updateHUD();
  }

  spawnEffect(point, tex, size, life) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: tex === SPARK_TEX ? THREE.AdditiveBlending : THREE.NormalBlending }));
    s.position.copy(point);
    s.scale.setScalar(size * 0.4);
    this.app.scene.add(s);
    this.effects.push({ s, t: 0, life, size });
  }

  // ---------------- Cronómetro / stage ----------------
  makeReady() {
    if (this.run.state === 'running') { this.finishRun(); return; }
    if (this.run.state === 'ready') return;
    this.app.stage.resetTargets();
    this.spawn(this.app.stage.start);
    this.mag = this.weapon.capacity;
    this.reloading = null;
    this.run.state = 'ready';
    this.run.shots = 0;
    this.app.setRunMsg('¿Preparado?... Standby');
    const delay = 1500 + Math.random() * 2500;
    this.run.timer = setTimeout(() => {
      this.run.state = 'running';
      this.run.t0 = performance.now();
      this.run.lastShot = 0;
      Audio.timerBeep();
      this.app.setRunMsg('');
    }, delay);
    this.updateHUD();
  }

  finishRun() {
    clearTimeout(this.autoFinish);
    if (this.run.state !== 'running') return;
    this.run.state = 'free';
    const time = this.run.lastShot || (performance.now() - this.run.t0) / 1000;
    const res = scoreStage(this.app.stage.targets, this.weapon.pf, time);
    res.shots = this.run.shots;
    this.app.showResults(res);
    this.updateHUD();
  }

  cancelRun() {
    clearTimeout(this.run.timer);
    clearTimeout(this.autoFinish);
    this.run.state = 'free';
    this.app.setRunMsg('');
  }

  // ---------------- Bucle ----------------
  update(dt, keys) {
    this.time += dt;
    const w = this.weapon;

    // Apuntado con flechas
    const aimSpeed = 1.5 / Math.max(1, this.currentZoom() * 0.8) * this.app.settings.arrowSens;
    if (keys.has('ArrowLeft')) this.yaw += aimSpeed * dt;
    if (keys.has('ArrowRight')) this.yaw -= aimSpeed * dt;
    if (keys.has('ArrowUp')) this.pitch = Math.min(1.45, this.pitch + aimSpeed * dt);
    if (keys.has('ArrowDown')) this.pitch = Math.max(-1.45, this.pitch - aimSpeed * dt);

    // Movimiento WASD
    const fw = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const st = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const running = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && !this.isAiming() && !this.crouch;
    let speed = running ? 6.2 : 3.6;
    if (this.crouch) speed = 1.8;
    if (this.isAiming()) speed *= 0.55;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const target = new THREE.Vector3(
      (-sin * fw + cos * st), 0, (-cos * fw - sin * st));
    if (target.lengthSq() > 0) target.normalize().multiplyScalar(speed);
    const accel = 1 - Math.exp(-dt * 12);
    this.vel.lerp(target, accel);
    this.pos.addScaledVector(this.vel, dt);
    this.app.stage.collide(this.pos, 0.32);

    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.bob += dt * hs * 2.2;
    const eyeTarget = this.crouch ? EYE_CROUCH : EYE;
    this.eye += (eyeTarget - this.eye) * (1 - Math.exp(-dt * 10));

    // ADS
    const adsTarget = this.isAiming() && !this.reloading ? 1 : 0;
    const adsSpeed = w.category === 'handgun' ? 9 : 7;
    this.adsT += (adsTarget - this.adsT) * (1 - Math.exp(-dt * adsSpeed));
    if (Math.abs(this.adsT - adsTarget) < 0.002) this.adsT = adsTarget;

    // Recuperación de retroceso
    const k = w.recover * 14;
    this.recoilPitch *= Math.exp(-dt * k);
    this.recoilYaw *= Math.exp(-dt * k);
    this.kick *= Math.exp(-dt * 16);
    if (this.pumpT > 0) this.pumpT = Math.max(0, this.pumpT - dt);

    // Recarga
    if (this.reloading) {
      const r = this.reloading;
      r.t += dt;
      if (r.t >= r.dur) {
        if (r.tube) {
          this.mag++;
          Audio.reloadSound(1);
          if (this.mag >= w.capacity) this.reloading = null;
          else r.t = 0;
        } else {
          this.mag = w.capacity;
          this.reloading = null;
          Audio.reloadSound(1);
        }
        this.updateHUD();
      }
    }

    // Cámara
    const bobAmt = (1 - this.adsT) * Math.min(1, hs / 4);
    this.camera.position.set(this.pos.x, this.eye + Math.abs(Math.sin(this.bob)) * 0.035 * bobAmt, this.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch + this.recoilPitch, this.yaw + this.recoilYaw, 0);
    const fov = BASE_FOV / this.currentZoom();
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }

    // Posición del arma
    this.updateViewModel(dt, bobAmt);

    // Efectos
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flash.visible = false; }
    this.flashLight.intensity *= Math.exp(-dt * 40);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      const k2 = e.t / e.life;
      e.s.scale.setScalar(e.size * (0.4 + k2));
      e.s.material.opacity = 1 - k2;
      if (k2 >= 1) { this.app.scene.remove(e.s); e.s.material.dispose(); this.effects.splice(i, 1); }
    }

    // HUD: mira telescópica y cronómetro
    const scoped = this.isScoped() && this.adsT > 0.85;
    this.model.visible = !scoped;
    $('scope').classList.toggle('on', scoped);
    if (scoped) this.updateReticle(dt);
    // FOV del arma: al apuntar se "acerca" para ver mejor alza y guion
    const vmFov = 55 + ((this.model.userData.vmAds || 55) - 55) * this.adsT;
    if (Math.abs(this.vmCamera.fov - vmFov) > 0.01) { this.vmCamera.fov = vmFov; this.vmCamera.updateProjectionMatrix(); }
    const mg = this.model.getObjectByName('magnifier');
    if (mg) mg.rotation.z += ((this.zoomLevel > 2 ? 0 : Math.PI / 2) - mg.rotation.z) * (1 - Math.exp(-dt * 12));
    $('crosshair').classList.toggle('hidden', this.adsT > 0.3 || !this.app.settings.crosshair);
    if (this.run.state === 'running') $('timer').textContent = ((performance.now() - this.run.t0) / 1000).toFixed(2);
  }

  updateViewModel(dt, bobAmt) {
    const w = this.weapon, ud = this.model.userData;
    const S = ud.sightLine;
    const hand = w.category === 'handgun';
    const hip = hand ? new THREE.Vector3(0.14, -0.15 - S, -0.4) : new THREE.Vector3(0.13, -0.13 - S, -0.2);
    const ads = new THREE.Vector3(0, -S, -ud.adsDist);
    const p = hip.lerp(ads, this.adsT);
    // balanceo al andar
    p.x += Math.cos(this.bob) * 0.012 * bobAmt;
    p.y += Math.abs(Math.sin(this.bob)) * 0.01 * bobAmt;
    // retroceso visual
    p.z += this.kick * (hand ? 0.035 : 0.05);
    p.y += this.kick * (hand ? 0.01 : 0.004);
    let rx = this.kick * (hand ? 0.22 : 0.06);
    let ry = (1 - this.adsT) * 0.04;
    // recarga
    if (this.reloading) {
      const r = this.reloading;
      const c = r.tube ? 0.6 : Math.sin(Math.min(1, r.t / r.dur) * Math.PI);
      rx -= 0.5 * c; p.y -= 0.08 * c; ry += 0.3 * c;
    }
    // corredera atrás en vacío
    const slide = this.model.getObjectByName('slide');
    if (slide) slide.position.z = this.mag === 0 ? 0.03 : this.kick * 0.03;
    const forend = this.model.getObjectByName('forend');
    if (forend && w.pump) forend.position.z = -0.34 + (this.pumpT > 0 ? Math.sin((1 - this.pumpT / w.minInterval) * Math.PI) * 0.08 : 0);
    this.holder.position.copy(p);
    this.holder.rotation.set(rx, ry, 0);
  }

  // Retícula en el primer plano focal: las marcas son milirradianes reales a cualquier aumento
  updateReticle(dt) {
    const sd = SIGHTS[this.sight];
    const H = innerHeight, W = innerWidth;
    const R = Math.min(H, W) * 0.42;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const ppm = (H / 2) / Math.tan(fov / 2) * 0.001; // píxeles por mrad
    const key = sd.reticle + '|' + ppm.toFixed(2) + '|' + R.toFixed(0);
    if (key !== this.reticleKey) {
      this.reticleKey = key;
      $('scope').querySelector('.reticle').innerHTML = buildReticleSVG(sd.reticle, R, ppm);
    }
    // telémetro: distancia al punto de mira
    this.rangeT = (this.rangeT || 0) - dt;
    if (this.rangeT <= 0) {
      this.rangeT = 0.12;
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const hit = this.raycaster.intersectObjects(this.app.shootables, false).find(h => h.object.userData.hit?.kind !== 'soft');
      $('rangefinder').textContent = `${this.zoomLevel.toFixed(1)}x   ·   ${hit ? hit.distance.toFixed(0) + ' m' : '---'}`;
    }
  }

  updateHUD() {
    if (!this.weapon) return;
    const w = this.weapon;
    $('ammo').innerHTML = `<b>${this.mag}</b> / ${w.capacity}${this.reloading ? ' <span class="rl">recargando…</span>' : ''}`;
    $('wname').textContent = `${w.brand} ${w.model}`;
    const sd = SIGHTS[this.sight];
    const zoomTxt = sd.zoom.length > 1 ? ` (${this.zoomLevel.toFixed(1)}x)` : '';
    $('wsub').textContent = `${w.caliber} · ${w.pf === 'major' ? 'Major' : 'Minor'} · ${sd.name}${zoomTxt}${this.ammo ? ' · ' + AMMO[this.ammo].name : ''}`;
    if (this.run.state !== 'running') $('timer').textContent = this.run.state === 'ready' ? 'STANDBY' : 'LIBRE';
  }
}
