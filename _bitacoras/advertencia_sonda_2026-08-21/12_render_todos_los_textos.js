'use strict';
// MEDICION 7 — TODOS LOS TEXTOS QUE EL BLOQUE PUEDE MOSTRARLE AL PATRON.
//
// NO SE TRANSCRIBEN NI SE REPRODUCEN CADENAS. Se BUNDLEA el componente real de la
// PWA con esbuild y se renderiza con react-dom/server, asi que lo que sale abajo
// es lo que el JSX produce -- si alguien cambia una palabra en el componente, esta
// medicion cambia sola. Un instrumento que reescribiera los textos a mano estaria
// midiendo mi memoria, no la pantalla.
//
// EL DENOMINADOR, Y COMO SE CUENTA.
//   Unidad: ESTADO DEL BLOQUE = (visible si/no, cuantas tarjetas, rama de cada una).
//   NO es "cuantos textos distintos": el cuerpo lleva el calado de la nave, que es
//   un numero libre, asi que los textos posibles son infinitos. Lo finito es el
//   ESTADO, y de ahi sale el denominador.
//
//   Pasos que hoy PUEDEN disparar = los que tienen geometria en el arbol. Son 2:
//   Paso Chocoi (rama B, la fuente no nombra el punto) y Canal Tenglo (rama A, lo
//   nombra). Canal Moraleda salio de la lista el 2026-08-21 al reatribuirse.
//   Subconjuntos NO VACIOS de esos 2 = 2^2 - 1 = 3 estados VISIBLES.
//   Mas 1 estado INVISIBLE (el bloque devuelve null), que tiene VARIAS CAUSAS y se
//   enumeran aparte porque el patron ve lo mismo en todas: nada.
//   TOTAL: 4 estados del bloque.
//
// Se corre:  node _bitacoras/advertencia_sonda_2026-08-21/12_render_todos_los_textos.js

const fs = require('fs');
const path = require('path');
const os = require('os');

const RAIZ = path.join(__dirname, '..', '..');
const PWA = 'C:/Users/katia/tmarea-pwa';

const { advertenciasCotejoVertical } = require(path.join(RAIZ, 'src/services/raster/cotejo-vertical.js'));
const { cargarGeometrias } = require(path.join(RAIZ, 'src/services/raster/canal-geometria.js'));

const L = [];
const say = (s = '') => { L.push(s); };

// ── waypoints sinteticos sobre la geometria real de cada canal ───────────────
function wpsDe(canal) {
  const linea = cargarGeometrias().get(canal);
  const i = Math.floor(linea.length / 2);
  return [linea[i], linea[Math.min(linea.length - 1, i + 1)]];
}

// ── HTML -> texto legible, conservando los saltos de bloque ──────────────────
function aTexto(html) {
  return html
    .replace(/<\/(p|h3|div|section)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#xFC;/g, 'ü')
    .split('\n').map((s) => s.trim()).filter(Boolean);
}

// EL TEMPORAL SE BORRA PASE LO QUE PASE. La primera corrida de este instrumento
// reventó al bundlear y dejó un `.render-XXXX` dentro de tmarea-pwa, o sea que un
// instrumento de medición ensució el árbol que estaba midiendo. Se registra acá
// porque el `finally` es la corrección, no el borrado a mano.
let TMP = null;
process.on('exit', () => { if (TMP) fs.rmSync(TMP, { recursive: true, force: true }); });

(async () => {
  // ── bundle de los dos componentes reales de la PWA ─────────────────────────
  const esbuild = require(path.join(PWA, 'node_modules/esbuild'));
  // EL ENTRY VA DENTRO DE LA PWA, no en el temp del sistema: desde afuera esbuild
  // no resuelve `react` ni `react-dom/server`, que se buscan por node_modules
  // relativo al fichero que los importa.
  const tmp = TMP = fs.mkdtempSync(path.join(PWA, '.render-'));
  const entry = path.join(tmp, 'entry.jsx');
  fs.writeFileSync(entry, [
    "export { default as SondaDerroteroBlock } from '" + PWA + "/src/components/verification/SondaDerroteroBlock.jsx';",
    "export { default as VoyageVerdict } from '" + PWA + "/src/components/verification/VoyageVerdict.jsx';",
    "export { calcularVeredicto, escalarPorSonda, advertenciasDeSonda } from '" + PWA + "/src/hooks/useVoyageVerification.js';",
    "export { default as React } from 'react';",
    "export { renderToStaticMarkup } from 'react-dom/server';",
  ].join('\n'), 'utf8');

  const out = path.join(tmp, 'bundle.cjs');
  await esbuild.build({
    entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node',
    outfile: out, jsx: 'transform', absWorkingDir: PWA, logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"production"' },
    // DEFECTO AJENO QUE ESTA MEDICION DESTAPO, Y NO SE ARREGLA ACA (§4.8):
    // src/components/DeportiveAlerts.jsx:533 hace `require('./maritime-geo.js')`
    // DENTRO DE UN MODULO ESM y apuntando a una ruta QUE NO EXISTE -- el fichero
    // vive en src/utils/, no en src/components/. No rompe el arranque porque el
    // `require` esta dentro de `updatePosition` y solo se evalua si esa funcion
    // corre; el dia que corra, tira. VA COMO LINEA.
    //
    // Se REDIRIGE al fichero real en vez de marcarlo externo: externo lo dejaba
    // como un `require` que node no resuelve y la medicion no corria. Redirigido,
    // el bundle carga el modulo que el autor queria y el defecto queda igual de
    // vivo en el arbol -- esto NO lo arregla, sólo lo esquiva para poder medir.
    plugins: [{
      name: 'redirigir-maritime-geo',
      setup(build) {
        build.onResolve({ filter: /(^|\/)maritime-geo\.js$/ }, () => ({
          path: PWA + '/src/utils/maritime-geo.js',
        }));
      },
    }],
  });
  const M = require(out);
  const { React, renderToStaticMarkup, SondaDerroteroBlock, VoyageVerdict, calcularVeredicto } = M;

  const rutaCon = (advertencias) => ({ ok: true, advertencias });

  const renderBloque = (ruta) => {
    const html = renderToStaticMarkup(React.createElement(SondaDerroteroBlock, { ruta }));
    return { visible: html !== '', lineas: aTexto(html) };
  };
  const razonesDe = (ruta) => {
    const html = renderToStaticMarkup(React.createElement(VoyageVerdict, {
      veredicto: calcularVeredicto({ portStatus: {}, weather: {}, navigation: {}, transitRestrictions: null, ruta }).veredicto,
      portStatus: {}, weather: {}, navigation: {}, transitRestrictions: null, ruta,
    }));
    return aTexto(html);
  };

  say('MEDICION 7 — TODOS LOS TEXTOS DEL BLOQUE, RENDERIZADOS');
  say('='.repeat(78));
  say('');
  say('Renderizado real: los componentes de la PWA bundleados con esbuild y pasados');
  say('por react-dom/server. No hay ninguna cadena reescrita a mano en este archivo.');
  say('');
  say('DENOMINADOR — unidad: ESTADO DEL BLOQUE (visible, nº de tarjetas, rama de cada una).');
  say('  pasos que hoy pueden disparar : 2  (Paso Chocoi rama B · Canal Tenglo rama A)');
  say('  estados VISIBLES              : 2^2 - 1 = 3  (subconjuntos no vacios)');
  say('  estado INVISIBLE              : 1  (el bloque devuelve null; varias causas)');
  say('  TOTAL                         : 4 estados');
  say('');
  say('Los calados de cada escenario son NAVES REALISTAS, no valores elegidos para');
  say('que la frase quede linda: 1,8 m es una lancha; 6,0 m una nave mayor menor.');
  say('');

  // ── ESCENARIOS ─────────────────────────────────────────────────────────────
  const ESC = [];

  // 1 · rama A sola
  ESC.push({
    n: '1 · UNA TARJETA — RAMA A (la fuente NOMBRA el punto)',
    detalle: 'ruta por Canal Tenglo · lancha de calado 1,8 m',
    adv: advertenciasCotejoVertical(wpsDe('Canal Tenglo'), 1.8),
  });
  // 2 · rama B sola
  ESC.push({
    n: '2 · UNA TARJETA — RAMA B (la fuente NO nombra el punto)',
    detalle: 'ruta por Canal Chacao (Paso Chocoi, sonda 5 m) · calado 6,0 m',
    adv: advertenciasCotejoVertical(wpsDe('Canal Chacao'), 6.0),
  });
  // 3 · los dos
  ESC.push({
    n: '3 · DOS TARJETAS — la ruta cruza LOS DOS pasos',
    detalle: 'waypoints sobre Canal Chacao y Canal Tenglo · calado 6,0 m',
    adv: [
      ...advertenciasCotejoVertical(wpsDe('Canal Chacao'), 6.0),
      ...advertenciasCotejoVertical(wpsDe('Canal Tenglo'), 6.0),
    ],
  });

  for (const e of ESC) {
    const ruta = rutaCon(e.adv);
    const b = renderBloque(ruta);
    const v = calcularVeredicto({ portStatus: {}, weather: {}, navigation: {}, transitRestrictions: null, ruta });
    say('='.repeat(78));
    say(e.n);
    say('   ' + e.detalle);
    say('');
    say('   VEREDICTO: ' + v.veredicto + '   ·   detalles.sonda: ' + v.detalles.sonda);
    say('');
    say('   LINEA(S) EN LA TARJETA DEL VEREDICTO (N3-b):');
    // El ▸ y el texto son dos <span> hermanos dentro del mismo <div>, asi que al
    // aplanar el HTML quedan PEGADOS: "▸Poca agua...". Anclar el filtro al inicio
    // de linea daba CERO lineas sobre una pantalla que si las tiene -- un control
    // que corre y mide otra cosa, cazado por leer la salida y no el exit code.
    const razones = razonesDe(ruta).filter((r) => /Poca agua/.test(r));
    if (razones.length === 0) say('     (ninguna — y eso seria un defecto)');
    for (const r of razones) say('     ' + r.replace(/^▸\s*/, '▸ '));
    say('');
    say('   EL BLOQUE, TAL COMO SE RENDERIZA:');
    for (const linea of b.lineas) say('     ' + linea);
    say('');
  }

  // 4 · estado invisible, con sus causas
  say('='.repeat(78));
  say('4 · EL BLOQUE NO SALE — un solo estado, varias causas');
  say('   El patron ve LO MISMO en todas: nada. Se enumeran porque la causa importa');
  say('   para quien lea el codigo, no para el que mira la pantalla.');
  say('');
  const CAUSAS = [
    ['calado ausente (undefined)',        rutaCon(advertenciasCotejoVertical(wpsDe('Canal Tenglo'), undefined))],
    ['calado 0',                          rutaCon(advertenciasCotejoVertical(wpsDe('Canal Tenglo'), 0))],
    ['calado negativo (-1)',              rutaCon(advertenciasCotejoVertical(wpsDe('Canal Tenglo'), -1))],
    ['calado bajo el umbral (0,4 m en Tenglo)', rutaCon(advertenciasCotejoVertical(wpsDe('Canal Tenglo'), 0.4))],
    ['sonda EXACTAMENTE igual a lo requerido (0,5 m: 1,0 no es < 1,0)', rutaCon(advertenciasCotejoVertical(wpsDe('Canal Tenglo'), 0.5))],
    ['la ruta no cruza ningun paso con geometria', rutaCon(advertenciasCotejoVertical([[-70.0, -33.0], [-70.1, -33.1]], 6.0))],
    ['ruta.ok = false, con los descargos igual',   { ok: false, error: 'fuera de cobertura', advertencias: [{ clase: 'descargo_base', texto: 'x' }] }],
    ['ruta = null',                       null],
    ['ruta sin campo advertencias',       { ok: true }],
  ];
  for (const [causa, ruta] of CAUSAS) {
    const b = renderBloque(ruta);
    const v = calcularVeredicto({ portStatus: {}, weather: {}, navigation: {}, transitRestrictions: null, ruta });
    say('   ' + (b.visible ? '!! VISIBLE !!' : 'sin bloque') + '  ·  veredicto ' + v.veredicto +
        '  ·  ' + causa);
  }
  say('');

  // ── el umbral, medido y no supuesto ────────────────────────────────────────
  say('='.repeat(78));
  say('EL BORDE DEL DISPARO EN CANAL TENGLO, medido de 0,1 en 0,1 m de calado');
  say('   regla: dispara si  sonda(1,0) < calado + max(0,5 ; 0,1 x calado)');
  let anterior = null;
  for (let c = 1; c <= 15; c++) {
    const calado = c / 10;
    const hay = advertenciasCotejoVertical(wpsDe('Canal Tenglo'), calado).length > 0;
    if (anterior !== null && hay !== anterior) {
      say('     cambia entre ' + ((c - 1) / 10).toFixed(1) + ' m y ' + calado.toFixed(1) + ' m  ->  ' + (hay ? 'EMPIEZA a avisar' : 'DEJA de avisar'));
    }
    anterior = hay;
  }
  say('');
  say('='.repeat(78));
  say('FIN DE LA MEDICION 7 — VERIFICADO');

  const salida = L.join('\n');
  fs.writeFileSync(path.join(__dirname, '12_render_todos_los_textos.txt'), salida + '\n', 'utf8');
  process.stdout.write(salida + '\n');
})();
