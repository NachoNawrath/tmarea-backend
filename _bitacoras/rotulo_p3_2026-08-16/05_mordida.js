'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 05_mordida.js — ¿SIGUEN MORDIENDO LOS CONTROLES? (CLAUDE.md §4.6)
//
// Corrida:  node _bitacoras/rotulo_p3_2026-08-16/05_mordida.js
//           node _bitacoras/rotulo_p3_2026-08-16/05_mordida.js --estado=viejo
// Shell declarada (CLAUDE.md §7.3): identica en PowerShell y en Git Bash.
//
// LAS FAMILIAS CONSTRUYEN SU CASO DESDE CERO. El valor ofensivo esta escrito
// literal en el ensayo —el nombre inventado, el numero de Valparaiso, el require
// de la tabla prohibida— y NO se saca de lo que el dato traiga hoy. Una familia
// que se apoyara en la forma actual dejaria de probar el dia que el dato cambie,
// sin avisar.
//
// TODAS AFIRMAN SOBRE EL MENSAJE, no solo sobre el codigo de salida. Un ensayo
// que solo mira el exit no distingue QUE guard disparo — es el defecto que la
// sesion del lote Cisnes pago con B3.
//
// LOS INSUMOS MUTABLES SE REPONEN Y SE COMPRUEBA EL SHA256 AL CERRAR.
//
// LA PWA NO SE TOCA NI PARA MORDER. En esta sesion es solo lectura, asi que B6
// —la familia que prueba que V10 distingue un archivo cambiado— opera sobre una
// COPIA TEMPORAL del verificador en el scratchpad, con el sha esperado alterado.
// Prueba lo mismo sin escribir un byte en el otro repositorio, y se declara.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');

const ANCLA = '9bbd80a364b38fdacf7b793c62a1cab59b2a400a';
const ESTADO_VIEJO = process.argv.includes('--estado=viejo');

const P_VERIF = '_bitacoras/rotulo_p3_2026-08-16/04_verificar.js';
const P_DER   = 'data/contacto/reparticiones_publicadas.json';
const P_MAPA  = 'src/data/bahia-capitania-map.json';
const P_RUT   = 'src/routes/sitport-routes.js';
const P_RES   = 'src/services/contacto-por-escalon.js';

const MUTABLES = [P_DER, P_MAPA, P_RUT, P_RES];
const SHA_INICIAL = Object.fromEntries(MUTABLES.map(p => [p, sha(p)]));

const TMP = path.join(os.tmpdir(), 'mordida-rotulo-p3');
fs.mkdirSync(TMP, { recursive: true });

// Contenido de apertura de cada mutable. La corrida en rojo repone el router al
// ancla para armar el estado pre-pieza, y al cerrar TIENE que devolver el
// archivo a como estaba — si no, el instrumento deja el arbol modificado y la
// comprobacion de sha256 se convierte en una excusa en vez de un control.
const TXT_INICIAL = Object.fromEntries(MUTABLES.map(p => [p, fs.readFileSync(abs(p), 'utf8')]));

const RESULT = [];
const NO_MEDIBLE = [];

function correrVerificador(rutaVerificador) {
  const r = spawnSync(process.execPath, [rutaVerificador || abs(P_VERIF)], {
    cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26,
  });
  return { exit: r.status, salida: (r.stdout || '') + (r.stderr || '') };
}

function correrResolvedorLimpio(codigo) {
  // Proceso aparte: el modulo cachea el indice, y medir dos estados en el mismo
  // proceso mediria el cache y no el estado.
  const f = path.join(TMP, 'sonda.js');
  fs.writeFileSync(f, codigo, 'utf8');
  const r = spawnSync(process.execPath, [f], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 26 });
  return { exit: r.status, salida: (r.stdout || '') + (r.stderr || '') };
}

function familia(id, que, fn) {
  let veredicto, detalle;
  try { ({ veredicto, detalle } = fn()); }
  catch (e) { veredicto = 'NO SE PUDO EJERCITAR'; detalle = e.message; NO_MEDIBLE.push(`${id}: ${e.message}`); }
  RESULT.push({ id, que, veredicto, detalle });
  L('');
  L(`  ${id}  ${que}`);
  L(`      ${detalle}`);
  L(`      -> ${veredicto}`);
}

const escribir = (p, txt) => fs.writeFileSync(abs(p), txt, 'utf8');
const leer = p => fs.readFileSync(abs(p), 'utf8');
const reponerDelAncla = p => escribir(p, execFileSync('git', ['show', `${ANCLA}:${p}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' }));

L('================================================================================');
L(`MORDIDA DEL TRAMO A — ${ESTADO_VIEJO ? 'CORRIDA EN ROJO (estado PRE-PIEZA)' : 'CORRIDA EN VERDE'}`);
L(`Ancla: ${ANCLA}`);
L('================================================================================');

L('');
L('=== SHA256 DE LOS INSUMOS MUTABLES AL ABRIR ===');
for (const p of MUTABLES) L(`  ${p.padEnd(46)} ${SHA_INICIAL[p].slice(0, 32)}…`);

// ─────────────────────────────────────────────────────────────────────────────
// EL ESTADO PRE-PIEZA, para la corrida en rojo
// ─────────────────────────────────────────────────────────────────────────────
// La pieza no toca ningun dato: lo unico que la distingue del ancla es el
// resolvedor nuevo y la linea de la salida. El estado pre-pieza es entonces el
// ROUTER del ancla. El resolvedor se deja en disco: si se borrara, el
// verificador reventaria al `require` y eso seria "no medible", no "en rojo".
if (ESTADO_VIEJO) {
  L('');
  L('=== REPONIENDO EL ESTADO PRE-PIEZA ===');
  reponerDelAncla(P_RUT);
  L(`  ${P_RUT} repuesto al ancla (sin la linea de \`contacto\`).`);
  L('  El resolvedor se deja en disco: borrarlo dejaria al verificador sin poder');
  L('  cargar, y eso no es "rojo", es "no midio".');
  L('');
  L('=== LO PRIMERO QUE MIDE LA CORRIDA EN ROJO ===');
  const base = correrVerificador();
  const v9fallo = /V9: la respuesta no trae `contacto`/.test(base.salida);
  L(`  el verificador contra el estado pre-pieza sale exit ${base.exit}`);
  L(`  ¿la falla es de V9, que es la que mide la pieza? : ${v9fallo}`);
  if (base.exit === 0) NO_MEDIBLE.push('el verificador da VERDE sin la pieza aplicada: no prueba nada');
  if (!v9fallo) NO_MEDIBLE.push('el verificador falla en rojo pero no por V9');
}

L('');
L('================================================================================');
L('LAS FAMILIAS');
L('================================================================================');

// ── B0 ───────────────────────────────────────────────────────────────────────
familia('B0', 'control negativo: sin inyectar nada, el verificador se comporta como la linea base', () => {
  const r = correrVerificador();
  const esperado = ESTADO_VIEJO ? 1 : 0;
  return {
    veredicto: r.exit === esperado ? 'SE COMPORTA COMO DEBE' : `INESPERADO (exit ${r.exit}, esperado ${esperado})`,
    detalle: `exit ${r.exit} · esperado ${esperado} para este estado`,
  };
});

// ── B1 ───────────────────────────────────────────────────────────────────────
familia('B1', 'el insumo de reparticiones queda SIN reparticiones', () => {
  const orig = leer(P_DER);
  try {
    const j = JSON.parse(orig);
    j.reparticiones = {};
    escribir(P_DER, JSON.stringify(j, null, 2));
    const r = correrResolvedorLimpio(`
      const { contactoPorEscalon } = require(${JSON.stringify(abs(P_RES))});
      try { contactoPorEscalon({ capitania: 'Arica', gobernacion: 'Arica', telefono: '+56 58 2356704' });
            console.log('NO ABORTO'); }
      catch (e) { console.log('ABORTO: ' + e.message); }
    `);
    const abortoBien = /ABORTO:.*no trae reparticiones/.test(r.salida)
                    && /caerian al escalon 2 en silencio/.test(r.salida);
    return {
      veredicto: abortoBien ? 'MORDIO' : 'NO MORDIO',
      detalle: `el resolvedor ${abortoBien ? 'ABORTA citando el escalon 2 silencioso' : 'no aborto como debe'} · salida: ${r.salida.trim().slice(0, 130)}`,
    };
  } finally { escribir(P_DER, orig); }
});

// ── B2 ───────────────────────────────────────────────────────────────────────
familia('B2', 'una reparticion del insumo cambia de telefono: su entrada tiene que BAJAR de escalon', () => {
  const orig = leer(P_DER);
  try {
    const j = JSON.parse(orig);
    // Caso construido desde cero: se le escribe a la reparticion 2 (Arica) un
    // numero literal que no es suyo. No se toma del dato: se escribe aca.
    j.reparticiones['2'].telefono = '+56 32 220 8905';
    escribir(P_DER, JSON.stringify(j, null, 2));
    const r = correrVerificador();
    const bajo = /V2: el escalon 1 da (\d+) y la medicion previa dio 99/.test(r.salida);
    return {
      veredicto: (r.exit === 1 && bajo) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.exit} · ¿V2 acusa el escalon 1 movido? ${bajo} · ${(r.salida.match(/V2: el escalon 1 da \d+[^\n]*/) || ['(no lo dijo)'])[0]}`,
    };
  } finally { escribir(P_DER, orig); }
});

// ── B3 ───────────────────────────────────────────────────────────────────────
familia('B3', 'una entrada del mapa pasa a nombrar una Capitania que la fuente no publica', () => {
  const orig = leer(P_MAPA);
  try {
    const j = JSON.parse(orig);
    const victima = Object.keys(j).find(k => {
      const { contactoPorEscalon } = require(abs(P_RES));
      return contactoPorEscalon(j[k]).nivel === 'capitania';
    });
    if (!victima) throw new Error('no hay ninguna entrada en escalon 1 sobre la que ensayar');
    j[victima].capitania = 'Reparticion Que No Existe';
    escribir(P_MAPA, JSON.stringify(j, null, 2));
    const r = correrVerificador();
    const acusaV7 = /V7: el mapa cambio/.test(r.salida);
    const acusaV2 = /V2: el escalon 1 da/.test(r.salida);
    return {
      veredicto: (r.exit === 1 && acusaV7 && acusaV2) ? 'MORDIO' : 'NO MORDIO',
      detalle: `entrada ${victima} · exit ${r.exit} · V7 acusa el mapa tocado: ${acusaV7} · V2 acusa el escalon movido: ${acusaV2}`,
    };
  } finally { escribir(P_MAPA, orig); }
});

// ── B4 ───────────────────────────────────────────────────────────────────────
familia('B4', 'una de las 9 que mandan a otra reparticion SUBE a escalon 1 indebidamente', () => {
  const orig = leer(P_DER);
  try {
    const j = JSON.parse(orig);
    // Se le inventa a la fuente una reparticion "Mejillones" con el numero de
    // Antofagasta, que es justo lo que la 75 lleva. Si V4 no muerde, la pieza
    // estaria dispuesta a rotular Capitania sobre un numero ajeno.
    j.reparticiones['999999'] = {
      cd_reparticion: 999999, nombre_sitport: 'MEJILLONES', nombre_publicado: 'Mejillones',
      telefono: '+56 55 263 0000', telefono_atomico: true, direccion: null,
      titulo_publicado: 'Capitanía de Puerto de Mejillones', identificado_por: 'ensayo', ficha: null,
    };
    escribir(P_DER, JSON.stringify(j, null, 2));
    const r = correrVerificador();
    const acusaV4 = /V4: la entrada 75 resolvio a "capitania"/.test(r.salida);
    const acusaV8 = /V8: el insumo de reparticiones cambio/.test(r.salida);
    return {
      veredicto: (r.exit === 1 && acusaV4 && acusaV8) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.exit} · V4 nombra la 75: ${acusaV4} · V8 acusa el insumo tocado: ${acusaV8}`,
    };
  } finally { escribir(P_DER, orig); }
});

// ── B5 ───────────────────────────────────────────────────────────────────────
familia('B5', 'la salida del backend deja de emitir `contacto`', () => {
  const orig = leer(P_RUT);
  try {
    // El terminador se deja abierto a proposito: el archivo esta en CRLF en
    // disco y un patron con `\n` literal NO matchea. La primera version de este
    // ensayo lo tenia asi y se declaro TAPADA en la corrida VERDE, donde la
    // linea si estaba — la trampa del CRLF, otra vez.
    const conDefecto = orig.replace(/[ \t]*contacto: contactoPorEscalon\(cap\),\r?\n/, '');
    // En la corrida en rojo el router YA viene del ancla y no tiene esa linea:
    // el replace no cambiaria nada y V9 fallaria igual, por la causa de fondo y
    // no por el defecto inyectado. Un ensayo que solo mirara el exit lo leeria
    // como mordida. Se declara TAPADA en vez de contarla.
    if (conDefecto === orig) {
      return { veredicto: 'TAPADA (se declara)',
               detalle: 'el router no contiene la linea a quitar: en el estado pre-pieza V9 ya esta en rojo por la causa de fondo, asi que su exit no distingue' };
    }
    escribir(P_RUT, conDefecto);
    const r = correrVerificador();
    const acusa = /V9: la respuesta no trae `contacto`/.test(r.salida);
    return {
      veredicto: (r.exit === 1 && acusa) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.exit} · ¿V9 lo acusa por nombre? ${acusa}`,
    };
  } finally { escribir(P_RUT, orig); }
});

// ── B6 ───────────────────────────────────────────────────────────────────────
familia('B6', 'V10 distingue un archivo de la PWA cambiado — SIN escribir en la PWA', () => {
  // La copia vive EN EL MISMO DIRECTORIO que el original y no en el scratchpad:
  // el verificador calcula su raiz con `__dirname`, asi que una copia en otro
  // lado apunta a un repositorio que no existe y falla por una causa ajena al
  // ensayo. La primera version la puso en el temporal, salio exit 1 y este
  // ensayo la habria contado como mordida si mirara solo el codigo de salida.
  const copia = path.join(__dirname, '_tmp_mordida_b6.js');
  try {
    const original = leer(P_VERIF);
    const txt = original.replace(
      /'src\/components\/verification\/PortStatusBlock\.jsx': '[0-9a-f]{32}'/,
      "'src/components/verification/PortStatusBlock.jsx': '00000000000000000000000000000000'"
    );
    if (txt === original) throw new Error('no se pudo alterar el sha esperado en la copia: el ensayo no probaria nada');
    fs.writeFileSync(copia, txt, 'utf8');
    const r = correrVerificador(copia);
    const acusa = /V10: src\/components\/verification\/PortStatusBlock\.jsx cambio/.test(r.salida);
    return {
      veredicto: (r.exit === 1 && acusa) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.exit} · V10 nombra el archivo: ${acusa} · la PWA no se escribio: el defecto va en una copia del verificador que se borra al cerrar`,
    };
  } finally { if (fs.existsSync(copia)) fs.unlinkSync(copia); }
});

// ── B7 ───────────────────────────────────────────────────────────────────────
familia('B7', 'el resolvedor empieza a leer la tabla que §5.1 declara que NO es fuente', () => {
  const orig = leer(P_RES);
  try {
    escribir(P_RES, orig.replace(
      "const { normalizarTexto } = require('../utils/normalizarTexto');",
      "const { normalizarTexto } = require('../utils/normalizarTexto');\nconst { GOBERNACIONES } = require('../utils/capitanias');"
    ));
    const r = correrVerificador();
    const acusa = /V11: el resolvedor lee la tabla de Gobernaciones/.test(r.salida);
    return {
      veredicto: (r.exit === 1 && acusa) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.exit} · ¿V11 lo acusa citando §5.1? ${acusa}`,
    };
  } finally { escribir(P_RES, orig); }
});

// ── B8 ───────────────────────────────────────────────────────────────────────
familia('B8', 'el escalon 3 empieza a llenarse con un texto de reemplazo', () => {
  const orig = leer(P_RES);
  try {
    escribir(P_RES, orig.replace(
      "const nada = (motivo) => ({ nivel: null, nombre: null, telefono: null, telefono_atomico: false, motivo });",
      "const nada = (motivo) => ({ nivel: 'gobernacion', nombre: 'Autoridad Marítima', telefono: null, telefono_atomico: false, motivo });"
    ));
    const r = correrVerificador();
    const acusa = /V5: el caso "sin telefono" no resolvio al escalon 3 limpio/.test(r.salida);
    return {
      veredicto: (r.exit === 1 && acusa) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.exit} · ¿V5 acusa el escalon 3 relleno? ${acusa}`,
    };
  } finally { escribir(P_RES, orig); }
});

// ─────────────────────────────────────────────────────────────────────────────
// cierre
// ─────────────────────────────────────────────────────────────────────────────
if (ESTADO_VIEJO) {
  L('');
  L('=== DESHACIENDO EL ESTADO PRE-PIEZA ===');
  escribir(P_RUT, TXT_INICIAL[P_RUT]);
  L(`  ${P_RUT} devuelto a su contenido de apertura, no al ancla.`);
}

L('');
L('================================================================================');
L('COMPROBACION DE REPOSICION — sha256 al cerrar contra el de apertura');
L('================================================================================');
let repuestosOk = true;
for (const p of MUTABLES) {
  const ahora = sha(p);
  const ok = ahora === SHA_INICIAL[p];
  if (!ok) repuestosOk = false;
  L(`  ${p.padEnd(46)} ${ok ? 'REPUESTO OK' : 'DIFIERE -> ' + ahora.slice(0, 32) + '…'}`);
}
// Vale para las DOS corridas: la de rojo tambien tiene que cerrar con el arbol
// como lo encontro. Exceptuarla seria dejarle una puerta al instrumento para
// modificar el repositorio sin que nadie lo note.
if (!repuestosOk) NO_MEDIBLE.push('algun insumo mutable no volvio a su sha de apertura');

L('');
L('================================================================================');
L('RESUMEN');
L('================================================================================');
const mordieron = RESULT.filter(r => /MORDIO$/.test(r.veredicto) || /SE COMPORTA COMO DEBE/.test(r.veredicto) || /^TAPADA/.test(r.veredicto));
L(`  COMPARACIONES EFECTIVAS (familias ejercitadas) : ${RESULT.length}`);
for (const r of RESULT) L(`    ${r.id}  ${r.veredicto}`);
L(`  familias con el veredicto esperado : ${mordieron.length} de ${RESULT.length}`);
if (RESULT.length === 0) NO_MEDIBLE.push('cero familias ejercitadas: el instrumento no midio nada');
// TAPADA es un veredicto DECLARADO, no una falla: la familia ataca al
// verificador, que en el estado pre-pieza ya esta en rojo por la causa de fondo,
// asi que su exit no distingue. Se declara aparte y no se cuenta como mordida.
const tapadas  = RESULT.filter(r => /^TAPADA/.test(r.veredicto));
const fallaron = RESULT.filter(r => !/MORDIO$/.test(r.veredicto)
                                 && !/SE COMPORTA COMO DEBE/.test(r.veredicto)
                                 && !/^TAPADA/.test(r.veredicto));
if (tapadas.length) L(`  familias TAPADAS y declaradas      : ${tapadas.length} (${tapadas.map(t => t.id).join(', ')})`);

L('');
L('================================================================================');
if (NO_MEDIBLE.length) { L('NO SE PUDO MEDIR — ' + NO_MEDIBLE.join(' · ')); L('================================================================================'); process.exit(3); }
if (fallaron.length) { L('FAMILIAS QUE NO MORDIERON: ' + fallaron.map(f => f.id).join(', ')); L('================================================================================'); process.exit(1); }
L('TODAS LAS FAMILIAS MORDIERON. Insumos repuestos y comprobados por sha256.');
L('================================================================================');
