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
- **Munición de escopeta**: slug, postas y perdigón (con dispersión de perdigones); carga cartucho a cartucho en las de tubo.
- **Blancos oficiales IPSC**: IPSC Target, IPSC Mini Target y No-Shoot (zonas A/C/D) con hard cover pintado opcional; IPSC Popper, Mini Popper y Metal Plates redondas o cuadradas de 15/20/30 cm.
- **Balística simple**: el papel y el soft cover (malla) no detienen la bala; las paredes, las paredes transparentes y el hard cover pintado sí.
- **Campo de 300 m** con carteles de distancia y un stage de larga distancia para visores.
- **Render**: modelos con perfiles biselados, piezas redondeadas y reflejos metálicos (mapa de entorno).
- **Stage con cronómetro**: Enter → «Are you ready? / Standby» → pitido → el tiempo para en el último disparo. Hoja de puntuación Comstock con Hit Factor y récord por stage.
- **Editor de stages**: colocar/mover/rotar/duplicar/borrar blancos, paredes, barriles, fault lines y la posición de salida; guardar en el navegador y exportar/importar JSON.

## Controles

| Tirador | |
|---|---|
| Ratón / flechas | Apuntar |
| WASD (Mayús: correr) | Moverse |
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
