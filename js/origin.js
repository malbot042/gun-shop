// Origen de cada stage: para distinguirlos en los listados.
export const ORIGINS = {
  preset:   { label: 'Ejemplo',    title: 'Viene por defecto con Gun Shop', icon: '★' },
  random:   { label: 'Aleatorio',  title: 'Generado al azar (corto / medio / largo)', icon: '🎲' },
  designer: { label: 'Importado',  title: 'Importado del Stage Designer de tiropractico.es', icon: '⬇' },
  import:   { label: 'Importado',  title: 'Importado de un JSON de Gun Shop', icon: '⬇' },
  custom:   { label: 'Propio',     title: 'Creado en el editor', icon: '✎' },
};

// Los stages guardados antes de existir el campo `origin` se deducen por su id
export function originOf(s) {
  if (s.origin && ORIGINS[s.origin]) return s.origin;
  const id = String(s.id || '');
  if (id.startsWith('preset-')) return 'preset';
  if (id.startsWith('gen-')) return 'random';
  if (id.startsWith('sd-')) return 'designer';
  return 'custom';
}
