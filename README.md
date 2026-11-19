# Gun Shop — IPSC Range

🎯 **Jugar online:** https://malbot042.github.io/gun-shop/

Simulador de tiro práctico (IPSC) en el navegador, hecho con HTML + JavaScript + [three.js](https://threejs.org) (incluido en `vendor/`, sin dependencias externas ni build).

## Cómo jugar

Los módulos ES necesitan servirse por HTTP (no funciona abriendo el archivo con `file://`):

```bash
python3 -m http.server 8000
# y abre http://localhost:8000
```

También funciona tal cual en **GitHub Pages** (Settings → Pages → rama `main`, carpeta raíz).

## Qué incluye

- **Armería**: 7 armas cortas (Glock 17, CZ Shadow 2, SIG P320 X-Five, Tanfoglio Stock II, Beretta 92X, STI 2011 .40, Colt 1911 .45), 5 largas (DDM4, AK-103, SCAR 17S, HK MR223, CZ Scorpion PCC) y 4 escopetas (Benelli M2, Beretta 1301, Mossberg 590A1 de corredera, Saiga-12). Cada una con su capacidad, cadencia, retroceso, precisión, recarga y factor de potencia (Major/Minor).
- **Miras**: abiertas con alza en U (puntos de tritio) y guion de fibra óptica, diópter tipo AR, bead y ghost ring en escopeta; al apuntar el arma se acerca para alinear mejor. Punto rojo en todas las armas, punto rojo + magnificador 3x abatible (M), y visores LPVO 1-6x, 3-12x y 5-25x con aumentos variables (rueda), retícula en milirradianes y telémetro.
- **Munición de escopeta**: slug, postas y perdigón (con dispersión de perdigones); carga cartucho a cartucho en las de tubo (R); apuntar o disparar interrumpe la recarga y conserva los cartuchos ya metidos.
- **Blancos oficiales IPSC**: IPSC Target octogonal sin cabeza (45 × 57 cm, A 15 × 32,5, C 30 × 45, borde de 0,5 cm no puntuable), IPSC Mini Target (⅔) y No-Shoot con hard cover pintado opcional; IPSC Popper, Mini Popper y Metal Plates redondas o cuadradas de 15/20/30 cm, pintados de amarillo; cada impacto deja su marca de plomo (se borran al reiniciar los blancos, como los agujeros del cartón).
- **Blancos superpuestos**: el área puntuable de tarjetas y no-shoots es impenetrable: solo puntúa el blanco de delante, salvo que el impacto rompa su línea troquelada o caiga entero en su borde no puntuable (entonces cuenta también el de detrás). Un impacto que toca la línea entre dos zonas puntúa la de más valor.
- **Balística simple**: el papel y el soft cover (malla) no detienen la bala; las paredes, las paredes transparentes y el hard cover pintado sí.
- **Campo de 300 m** con carteles de distancia y un stage de larga distancia para visores.
- **Render**: modelos con perfiles biselados, piezas redondeadas y reflejos metálicos (mapa de entorno).
- **Stage con cronómetro**: Enter → «Are you ready? / Standby» → pitido → el tiempo para en el último disparo. Hoja de puntuación Comstock con Hit Factor y récord por stage.
- **Editor de stages**: colocar/mover/rotar/duplicar/borrar blancos, paredes, barriles, fault lines y la posición de salida; guardar en el navegador y exportar/importar JSON.

## Listado de stages

Agrupado por tipo (corto, medio, largo) y con el **origen** de cada uno, con su color y un filtro: ★ **Ejemplo** (vienen con Gun Shop), 🎲 **Aleatorio**, ⬇ **Importado** (del Stage Designer o de un JSON) y ✎ **Propio** (creado en el editor; «Guardar como…» convierte cualquiera en propio).

## Stages aleatorios

En **Jugar un stage** (botones 🎲 Corto / Medio / Largo) o en el editor (**🎲 Generar…**). Plantillas inspiradas en los stages de ejemplo del Stage Designer: *speed shoot* desde una zona, *barricada* con puerto, *bahías* separadas por muros y *avance* hacia el fondo; con tarjetas en pareja, no-shoots solapados, hard cover, poppers y metales.

- Corto 6–12 disparos, medio 13–24, largo 25–32 (regla IPSC 1.2.1); en medio y largo, como mucho 8 disparos por vista.
- Metal a 7 m o más de las zonas de tiro, nada a menos de 3 m, todos los blancos de cara a su zona y como mucho un 45 % de metal.
- Cada stage lleva su semilla en el nombre, se guarda en la lista y se exporta al designer con su briefing.

## Compatibilidad con el Stage Designer de tiropractico.es

El editor **importa y exporta en el mismo formato JSON** que el Stage Designer (`schemaVersion: 1`):

- **Importar JSON** acepta el fichero exportado del designer (uno o varios stages, con o sin tiradas) y los JSON antiguos de Gun Shop. Un stage con el mismo `uuid` sustituye al que ya tenías.
- **Exportar JSON** genera un fichero que el designer abre con *JSON ▾ › Importar*.
- Equivalencias: tarjeta (mini, soporte, hard cover, media tarjeta, disparos) → IPSC Target / Mini; no-shoot (mini); popper (85 / 56 cm) → Popper / Mini Popper; metal → placa; muro, muro de metal y corcho → pared con el **color y la transparencia del stage** (marrón, metálico, blanco, salmón, negro, gris; 0–100 %, marco opaco como en el designer; la transparencia es visual, la pared sigue deteniendo la bala); puerto → panel con puerto; línea de falta, zona de tiro, salida, barril, mesa y cono. El tirador sirve de salida si no hay una.
- Coordenadas: `x` igual, `z = −y`, `rot = −rot`. Lo que solo existe en uno de los dos (grupos, cotas, briefing, tirador… o las placas cuadradas y el hard cover en diagonal de Gun Shop) se conserva para que la ida y vuelta no pierda nada.

## Controles

| Tirador | |
|---|---|
| Ratón / flechas | Apuntar |
| WASD (Mayús: caminar) | Moverse (por defecto se corre) |
| Clic izq. / Espacio | Disparar |
| Clic der. (mantener) / Z | Apuntar con la mira |
| R | Recargar |
| C | Agacharse |
| V / X | Cambiar mira / munición |
| Rueda / + − | Aumentos del visor |
| M | Magnificador 3x |
| Enter | Empezar / terminar stage |
| T | Reiniciar blancos |
| B | Armería |
| Tab | Editor |
| Esc | Menú |

| Editor | |
|---|---|
| Paleta + clic | Colocar (Mayús para varios) |
| Clic / arrastrar | Seleccionar / mover |
| Q / E | Rotar 15° (Mayús: 5°) |
| Supr · Ctrl+D | Borrar · duplicar |
| WASD · rueda · clic der. | Desplazar · zoom · girar vista |

## Estructura

```
index.html        UI y HUD
css/style.css
js/main.js        app, menús, armería, resultados, entrada
js/fps.js         jugador, arma, disparo, retroceso, cronómetro
js/weapons.js     catálogo de armas/miras/munición y modelos 3D
js/targets.js     blancos IPSC, zonas y metal
js/stage.js       campo de tiro, objetos, colisiones, stages de ejemplo
js/editor.js      editor de stages
js/scoring.js     puntuación Comstock
js/audio.js       sonido sintetizado (WebAudio)
vendor/           three.js r187 + addons RoomEnvironment y RoundedBoxGeometry (MIT)
```
