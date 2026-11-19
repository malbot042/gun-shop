// Puntuación IPSC (Comstock): mejores 2 impactos por papel, metal = 5, miss/no-shoot = -10.
import { TARGET_TYPES, ZONE_POINTS } from './targets.js';

export function scoreStage(targets, pf, time) {
  const pts = ZONE_POINTS[pf] || ZONE_POINTS.minor;
  const r = { A: 0, C: 0, D: 0, M: 0, NS: 0, steel: 0, steelMiss: 0, points: 0, time, hf: 0, rows: [] };
  let idx = 0;
  for (const t of targets) {
    const def = TARGET_TYPES[t.type];
    idx++;
    if (def.noshoot) {
      r.NS += t.hits.length;
      r.rows.push({ n: idx, label: 'No-Shoot', hits: t.hits.length ? `${t.hits.length} impacto(s)` : '—', pts: -10 * t.hits.length });
      continue;
    }
    if (def.paper) {
      const sorted = [...t.hits].sort((a, b) => pts[b] - pts[a]);
      const need = Math.max(1, Math.round(t.obj.shots || 2)); // disparos de la tarjeta (2 por defecto)
      const best = sorted.slice(0, need);
      let p = 0;
      for (const z of best) { r[z]++; p += pts[z]; }
      const miss = Math.max(0, need - best.length);
      r.M += miss;
      p -= miss * 10;
      r.rows.push({ n: idx, label: def.short, hits: (best.join(' ') || '') + (miss ? ' ' + 'M'.repeat(miss).split('').join(' ') : ''), pts: p });
    } else {
      if (t.down) { r.steel++; r.rows.push({ n: idx, label: def.short, hits: 'Abatido', pts: 5 }); }
      else { r.M++; r.steelMiss++; r.rows.push({ n: idx, label: def.short, hits: 'M', pts: -10 }); }
    }
  }
  r.points = r.A * 5 + r.C * pts.C + r.D * pts.D + r.steel * 5 - r.M * 10 - r.NS * 10;
  r.points = Math.max(0, r.points);
  r.hf = time > 0 ? r.points / time : 0;
  return r;
}

export function isStageComplete(targets) {
  for (const t of targets) {
    const def = TARGET_TYPES[t.type];
    if (def.noshoot) continue;
    if (def.paper && t.hits.length < Math.max(1, Math.round(t.obj.shots || 2))) return false;
    if (def.steel && !t.down) return false;
  }
  return targets.length > 0;
}
