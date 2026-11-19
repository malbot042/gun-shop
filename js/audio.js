// Sonido sintetizado con WebAudio (sin archivos externos).
let ctx = null;
let master = null;
let noiseBuf = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function setVolume(v) { if (master) master.gain.value = v; }

function noise(start, dur, { freq = 3000, q = 0.7, type = 'lowpass', gain = 1, attack = 0.001 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.connect(f).connect(g).connect(master);
  src.start(start, Math.random() * 0.5);
  src.stop(start + dur + 0.05);
  return f;
}

function tone(start, freq, dur, { type = 'sine', gain = 0.3, attack = 0.002, endFreq = null }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.05);
}

export function gunshot(category, loud = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const base = category === 'shotgun' ? 1400 : category === 'rifle' ? 4200 : 2800;
  // golpe inicial
  noise(t, 0.05, { freq: 9000, type: 'highpass', gain: 0.6 * loud });
  // cuerpo
  noise(t, category === 'shotgun' ? 0.45 : 0.3, { freq: base, gain: 1.0 * loud });
  // grave
  tone(t, category === 'shotgun' ? 90 : 120, 0.18, { type: 'sine', gain: 0.6 * loud, endFreq: 40 });
  // eco del talud
  noise(t + 0.09, 0.6, { freq: base * 0.4, gain: 0.18 * loud, attack: 0.02 });
}

export function steelPing(distance = 10) {
  if (!ctx) return;
  const t = ctx.currentTime + distance / 343; // retardo por la velocidad del sonido
  const vol = Math.max(0.08, 0.5 - distance * 0.004);
  tone(t, 1650 + Math.random() * 200, 0.7, { gain: vol });
  tone(t, 2830 + Math.random() * 200, 0.45, { gain: vol * 0.6 });
  tone(t, 4400, 0.2, { gain: vol * 0.3 });
  noise(t, 0.04, { freq: 6000, type: 'highpass', gain: vol });
}

export function timerBeep() {
  if (!ctx) return;
  tone(ctx.currentTime, 3100, 0.45, { type: 'square', gain: 0.18, attack: 0.005 });
}

export function dryClick() {
  if (!ctx) return;
  noise(ctx.currentTime, 0.03, { freq: 5000, type: 'bandpass', q: 4, gain: 0.4 });
}

export function reloadSound(stage = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  noise(t, 0.05, { freq: stage ? 2500 : 1600, type: 'bandpass', q: 3, gain: 0.5 });
  tone(t, stage ? 600 : 300, 0.05, { type: 'triangle', gain: 0.15 });
}

export function pumpSound() {
  if (!ctx) return;
  const t = ctx.currentTime;
  noise(t, 0.08, { freq: 1800, type: 'bandpass', q: 2, gain: 0.5 });
  noise(t + 0.13, 0.08, { freq: 2400, type: 'bandpass', q: 2, gain: 0.5 });
}

export function thud() {
  if (!ctx) return;
  noise(ctx.currentTime, 0.08, { freq: 600, gain: 0.25 });
}
