'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 04_mordida.js — LOTE CISNES. ¿LOS CONTROLES MUERDEN? (CLAUDE.md §4.6)
//
// Se le inyecta a cada control el defecto que debe cazar y se confirma que lo
// caza. Un control que no puede fallar no prueba nada.
//
// DOS ESTADOS, y la corrida en ROJO es la que vale:
//   --estado=verde  (por defecto)  el mapa como quedo despues de la pieza
//   --estado=viejo                 el mapa repuesto al ancla `bd75c494`,
//                                  o sea SIN la pieza aplicada
//
//   Un control que solo se vio en verde no se distingue de uno que no muerde.
//   Las familias que atacan al GENERADOR (B1, B2, B3, B6, B7) construyen su caso
//   DESDE CERO —el valor ofensivo esta escrito literal aca abajo, no sacado de
//   lo que el dato traiga hoy— y por eso su resultado es el MISMO en las dos
//   corridas. Las que atacan al VERIFICADOR (B4, B5) necesitan la pieza aplicada
//   para distinguirse: contra el dato viejo el verificador ya esta en rojo por la
//   causa de fondo y las TAPA. Eso se declara, no se disimula.
//
// DEFECTO DE INSTRUMENTO PAGADO EN ESTA SESION, y por que las familias del
// generador corren SIEMPRE sobre el mapa PRE-pieza:
//   La primera version de este ensayo corrio B1, B2 y B3 con el mapa YA
//   ESCRITO. Con la pieza aplicada el criterio del lote selecciona 1 entrada y
//   la lista declara 18, asi que el generador ABORTA en ese guard ANTES de
//   llegar al derivado y a la captura. B1 y B2 salieron "NO MORDIO" —correcto,
//   no midieron lo que dicen— y **B3 salio "MORDIO" por la razon equivocada**:
//   solo miraba `exit != 0`. Es el `process.exit` temprano que aborta la carga
//   antes de la mordida, y la cuarta variante de esa forma en este repositorio.
//   Dos correcciones, las dos al instrumento y ninguna al control:
//     · las familias del generador ponen el mapa en el estado PRE-pieza, que es
//       el unico en el que el lote es seleccionable;
//     · todas afirman sobre el MENSAJE del aborto, no sobre el codigo de salida.
//   Un ensayo que solo mira el exit no distingue que guard disparo.
//
// LOS INSUMOS SE REPONEN Y SE COMPRUEBA EL sha256. Sin eso, los ensayos no
// correrian sobre el estado que dicen y ademas dejarian el repositorio sucio.
//
// Corrida:  node _bitacoras/lote_cisnes_2026-08-16/04_mordida.js
//           node _bitacoras/lote_cisnes_2026-08-16/04_mordida.js --estado=viejo
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// exit 0 si todas las familias hicieron lo esperado; 1 si alguna no; 3 si no
// se pudo medir.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const shaBuf = b => crypto.createHash('sha256').update(b).digest('hex');
const shaDe = p => shaBuf(fs.readFileSync(abs(p)));

const ANCLA   = 'bd75c494';
const P_MAPA  = 'src/data/bahia-capitania-map.json';
const P_SB    = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_DER   = 'data/contacto/reparticiones_publicadas.json';
const P_LOTES = 'data/contacto/lotes_rotulo.json';
const GEN     = 'scripts/frente-contacto-aplicar-lote.js';
const VER     = '_bitacoras/lote_cisnes_2026-08-16/03_verificar.js';
const LOTE_ID = 'cisnes_f421949';

const ESTADO = (process.argv.find(a => a.startsWith('--estado=')) || '--estado=verde').slice('--estado='.length);
if (!['verde', 'viejo'].includes(ESTADO)) { console.error(`--estado tiene que ser verde o viejo, no ${JSON.stringify(ESTADO)}`); process.exit(3); }

L('================================================================================');
L(`MORDIDA — LOTE CISNES.  estado del mapa = ${ESTADO.toUpperCase()}`);
L('================================================================================');

// ── respaldo de todo lo mutable ──────────────────────────────────────────────
const MUTABLES = [P_MAPA, P_SB, P_DER, P_LOTES];
const RESPALDO = new Map();
for (const p of MUTABLES) RESPALDO.set(p, fs.readFileSync(abs(p)));
L('');
L('  RESPALDO DE LOS INSUMOS MUTABLES, con su sha256 de partida:');
for (const p of MUTABLES) L(`      ${p.padEnd(60)} ${shaBuf(RESPALDO.get(p))}`);

const reponerTodo = () => { for (const p of MUTABLES) fs.writeFileSync(abs(p), RESPALDO.get(p)); };
const reponer = p => fs.writeFileSync(abs(p), RESPALDO.get(p));

// ── el mapa en el estado pedido ──────────────────────────────────────────────
// El blob del ancla viene en LF y el disco esta en CRLF: se convierte antes de
// escribirlo, si no el archivo cambia por una razon que no es la del ensayo.
const blobAncla = execFileSync('git', ['show', `${ANCLA}:${P_MAPA}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' });
const BYTES_PRE = Buffer.from(blobAncla.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'), 'utf8');
const bytesEstado = ESTADO === 'viejo' ? BYTES_PRE : RESPALDO.get(P_MAPA);
const SHA_ESTADO = shaBuf(bytesEstado);
const ponerEstado = () => fs.writeFileSync(abs(P_MAPA), bytesEstado);
// Las familias del generador corren SIEMPRE sobre el mapa PRE-pieza: es el
// unico estado en el que el lote es seleccionable. Ver la cabecera.
const ponerPre = () => fs.writeFileSync(abs(P_MAPA), BYTES_PRE);
ponerEstado();
L('');
L(`  MAPA EN ESTADO "${ESTADO}"  sha256 ${SHA_ESTADO}`);
L(`  MAPA PRE-PIEZA (para las familias del generador)  sha256 ${shaBuf(BYTES_PRE)}`);
L(`      reconstruido del blob de ${ANCLA} y convertido a CRLF`);

// ── utilidades de corrida ────────────────────────────────────────────────────
const correr = (rel, args = []) => {
  const r = spawnSync(process.execPath, [abs(rel), ...args], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 });
  return { code: r.status, salida: (r.stdout || '') + (r.stderr || '') };
};
const correrGen = (extra = []) => correr(GEN, [`--lote=${LOTE_ID}`, ...extra]);
const correrVer = () => correr(VER);

const leerJson = p => JSON.parse(fs.readFileSync(abs(p), 'utf8'));
const escribirJson = (p, o) => fs.writeFileSync(abs(p), JSON.stringify(o, null, 2), 'utf8');

const RES = [];
let comparaciones = 0;
function familia(id, titulo, esperado, fn) {
  comparaciones++;
  let veredicto, detalle;
  try { ({ veredicto, detalle } = fn()); }
  catch (e) { veredicto = 'ERROR'; detalle = e.message; }
  finally { reponerTodo(); ponerEstado(); }
  RES.push({ id, titulo, esperado, veredicto, detalle });
  L('');
  L(`  ${id}  ${titulo}`);
  L(`      esperado : ${esperado}`);
  L(`      medido   : ${detalle}`);
  L(`      -> ${veredicto}`);
}

// ── LINEA BASE ───────────────────────────────────────────────────────────────
L('');
L('=== LINEA BASE, antes de inyectar nada ===');
const base = correrVer();
const baseEsperado = ESTADO === 'verde' ? 0 : 1;
L(`  verificador: exit ${base.code}   (esperado en estado "${ESTADO}": ${baseEsperado})`);
if (ESTADO === 'viejo') {
  L('  El verificador TIENE que estar en rojo contra el dato viejo: la pieza no');
  L('  esta escrita. Un verificador que diera verde con el lote sin aplicar no');
  L('  probaria nada, y esa es la primera cosa que esta corrida mide.');
  const v2v3 = /V2:|V3:/.test(base.salida);
  L(`  ¿las fallas son de V2 y V3, que son las que miden la pieza? ${v2v3}`);
}
if (base.code !== baseEsperado) {
  L('');
  L(`ABORTA — la linea base no es la esperada (exit ${base.code}, esperado ${baseEsperado}).`);
  L('Sin linea base conocida, ningun ensayo distingue "mordio" de "ya estaba roto".');
  reponerTodo();
  L('================================================================================');
  process.exit(3);
}

L('');
L('=== FAMILIAS ===');

// ── B0 — control negativo ────────────────────────────────────────────────────
familia('B0', 'control negativo: sin inyectar nada, el verificador se comporta como la linea base',
  ESTADO === 'verde' ? 'exit 0 (la pieza esta escrita y bien)' : 'exit 1 (la pieza NO esta escrita)',
  () => {
    const r = correrVer();
    return { veredicto: r.code === baseEsperado ? 'ACEPTA COMO DEBE' : 'NO SE COMPORTA COMO LA BASE', detalle: `exit ${r.code}` };
  });

// ── B1 — el rotulo saldria de un titulo de ALCALDIA DE MAR ───────────────────
familia('B1', 'el derivado dice que el rotulo de una reparticion del lote sale de un titulo de ALCALDIA DE MAR',
  'el generador ABORTA citando INV-3.3, y no escribe nada',
  () => {
    const d = leerJson(P_DER);
    // CASO CONSTRUIDO DESDE CERO: el titulo ofensivo esta escrito literal aca,
    // no derivado de lo que el derivado traiga hoy.
    d.reparticiones['234'].titulo_publicado = 'Alcaldías de Mar de Aysén';
    d.reparticiones['234'].nombre_publicado = 'Aysén';
    escribirJson(P_DER, d);
    ponerPre();
    const antes = shaDe(P_MAPA);
    const r = correrGen();
    const intacto = shaDe(P_MAPA) === antes;
    const cita = /INV-3\.3 prohibe que ese valor ocupe el campo/.test(r.salida);
    return {
      veredicto: (r.code === 3 && cita && intacto) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.code} · ¿aborta por el titulo, citando INV-3.3? ${cita} · ¿mapa intacto? ${intacto}`
    };
  });

// ── B2 — telefono NO atomico con la bandera MINTIENDO ────────────────────────
familia('B2', 'telefono NO atomico con la bandera `telefono_atomico` mintiendo true',
  'las bahias de esa reparticion se EXCLUYEN igual; cero telefonos no atomicos escritos',
  () => {
    const d = leerJson(P_DER);
    // CASO CONSTRUIDO DESDE CERO: el valor no atomico es literal, y la bandera
    // se pone en true a proposito. Si el generador leyera la bandera en vez de
    // recalcular, escribiria un `tel:` roto.
    d.reparticiones['234'].telefono = 'Móvil: +569 5617 3241';
    d.reparticiones['234'].telefono_atomico = true;
    escribirJson(P_DER, d);
    ponerPre();
    const r = correrGen();
    const mapa = leerJson(P_MAPA);
    const esAtomico = t => typeof t === 'string' && /^\+?[\d]+(?: [\d]+)*$/.test(t);
    const noAtomicos = Object.keys(mapa).filter(k => mapa[k].telefono != null && !esAtomico(mapa[k].telefono));
    const conEseNumero = Object.keys(mapa).filter(k => mapa[k].telefono === 'Móvil: +569 5617 3241');
    const excluidas = (r.salida.match(/NO es atomico/g) || []).length;
    return {
      veredicto: (noAtomicos.length === 0 && conEseNumero.length === 0 && excluidas > 0) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.code} · exclusiones por no atomico: ${excluidas} · escritas con ese numero: ${conEseNumero.length} · no atomicos en el archivo: ${noAtomicos.length}`
    };
  });

// ── B3 — la captura de SITPORT vacia ─────────────────────────────────────────
familia('B3', 'la captura de `consultaBahias` reemplazada por un array vacio',
  'exit distinto de 0 y el mapa SIN TOCAR — nunca "0 cambios" en verde',
  () => {
    fs.writeFileSync(abs(P_SB), '[]', 'utf8');
    ponerPre();
    const antes = shaDe(P_MAPA);
    const r = correrGen();
    const intacto = shaDe(P_MAPA) === antes;
    // Se afirma sobre el MENSAJE y no sobre el exit: otro guard que dispare
    // antes daria el mismo codigo y este ensayo no lo distinguiria.
    const porLaCaptura = /no trae registros/.test(r.salida);
    const enVerde = /0 cambios|se escriben\s*:\s*0/.test(r.salida);
    return {
      veredicto: (r.code !== 0 && intacto && porLaCaptura && !enVerde) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.code} · ¿aborta POR LA CAPTURA vacia? ${porLaCaptura} · ¿mapa intacto? ${intacto} · ¿salio "0 cambios" en verde? ${enVerde}`
    };
  });

// ── B4 — una entrada FUERA del lote, cambiada a mano ─────────────────────────
familia('B4', 'una entrada FUERA del lote cambiada a mano (la 71)',
  ESTADO === 'verde'
    ? 'el verificador falla y NOMBRA a la 71 (V6 y V2)'
    : 'TAPADA: el verificador ya esta en rojo por la pieza sin aplicar',
  () => {
    const txt = fs.readFileSync(abs(P_MAPA), 'utf8');
    const nuevo = txt.replace(/^(\s*"71":\s*\{ "capitania": )"[^"]*"/m, '$1"Iquique"');
    if (nuevo === txt) return { veredicto: 'NO SE PUDO INYECTAR', detalle: 'la linea de la 71 no calzo el patron' };
    fs.writeFileSync(abs(P_MAPA), nuevo, 'utf8');
    const r = correrVer();
    const nombra = /\b71\b/.test(r.salida.split('RESULTADO:')[1] || r.salida);
    if (ESTADO === 'viejo') return { veredicto: 'TAPADA — declarada', detalle: `exit ${r.code} · ¿nombra a la 71? ${nombra} · la base ya era exit 1, asi que este exit no distingue` };
    return { veredicto: (r.code === 1 && nombra) ? 'MORDIO' : 'NO MORDIO', detalle: `exit ${r.code} · ¿nombra a la 71? ${nombra}` };
  });

// ── B5 — el nombre de una y el telefono de otra ──────────────────────────────
familia('B5', 'una del lote con su nombre y el telefono de OTRA reparticion — el defecto que tumbo la decision del 2026-08-13',
  ESTADO === 'verde'
    ? 'el verificador falla en V3, el control del PAR'
    : 'TAPADA: el verificador ya esta en rojo por la pieza sin aplicar',
  () => {
    const txt = fs.readFileSync(abs(P_MAPA), 'utf8');
    // CASO CONSTRUIDO DESDE CERO: el numero intruso esta escrito literal —es el
    // de Valdivia, CdRep 175— y no se toma de ninguna otra fila del archivo.
    const nuevo = txt.replace(/^(\s*"124":\s*\{ "capitania": "[^"]*",\s*"gobernacion": "[^"]*",\s*"telefono": )"[^"]*"/m, '$1"+56 63 227 6905"');
    if (nuevo === txt) return { veredicto: 'NO SE PUDO INYECTAR', detalle: 'la linea de la 124 no calzo el patron' };
    fs.writeFileSync(abs(P_MAPA), nuevo, 'utf8');
    const r = correrVer();
    const enV3 = /V3: la bahia 124 tiene telefono/.test(r.salida);
    if (ESTADO === 'viejo') return { veredicto: 'TAPADA — declarada', detalle: `exit ${r.code} · ¿falla V3 nombrando a la 124? ${enV3} · la base ya era exit 1` };
    return { veredicto: (r.code === 1 && enV3) ? 'MORDIO' : 'NO MORDIO', detalle: `exit ${r.code} · ¿falla V3 nombrando a la 124? ${enV3}` };
  });

// ── B6 — la lista declarada no coincide con el criterio ──────────────────────
familia('B6', 'la lista `bahias_esperadas` del lote deja de coincidir con su `criterio` (se le saca una bahia)',
  'el generador ABORTA, y su diagnostico dice que esto NO es "ya se aplico"',
  () => {
    const d = leerJson(P_LOTES);
    const l = d.lotes.find(x => x.id === LOTE_ID);
    l.bahias_esperadas = l.bahias_esperadas.filter(x => x !== 256);
    escribirJson(P_LOTES, d);
    ponerPre();
    const antes = shaDe(P_MAPA);
    const r = correrGen();
    const intacto = shaDe(P_MAPA) === antes;
    const dice = /NO describen el mismo conjunto/.test(r.salida);
    const diagnostico = /DIAGNOSTICO MEDIDO/.test(r.salida);
    return {
      veredicto: (r.code === 3 && dice && diagnostico && intacto) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.code} · ¿lo dice? ${dice} · ¿trae diagnostico medido? ${diagnostico} · ¿mapa intacto? ${intacto}`
    };
  });

// ── B7 — criterio desconocido, sin caso por defecto ──────────────────────────
familia('B7', 'el lote declara un `criterio` que el generador no sabe evaluar',
  'ABORTA nombrando los admitidos — no cae al generico (CLAUDE.md §4.2)',
  () => {
    const d = leerJson(P_LOTES);
    const l = d.lotes.find(x => x.id === LOTE_ID);
    // CASO CONSTRUIDO DESDE CERO: la clave inventada esta escrita literal.
    l.criterio = { gobernacion_igual_a: 'Aysén' };
    escribirJson(P_LOTES, d);
    ponerPre();
    const antes = shaDe(P_MAPA);
    const r = correrGen();
    const intacto = shaDe(P_MAPA) === antes;
    const dice = /no sabe evaluar/.test(r.salida) && /Admitidos:/.test(r.salida);
    return {
      veredicto: (r.code === 3 && dice && intacto) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.code} · ¿nombra los admitidos? ${dice} · ¿mapa intacto? ${intacto}`
    };
  });

// ── restauracion comprobada ──────────────────────────────────────────────────
reponerTodo();
L('');
L('=== RESTAURACION DE LOS INSUMOS, comprobada por sha256 ===');
let malRepuestos = 0;
for (const p of MUTABLES) {
  const ok = shaDe(p) === shaBuf(RESPALDO.get(p));
  if (!ok) malRepuestos++;
  L(`  ${p.padEnd(60)} ${ok ? 'OK' : 'MAL REPUESTO'}`);
}

// ── veredicto ────────────────────────────────────────────────────────────────
L('');
L('=== RESUMEN ===');
L(`  COMPARACIONES EFECTIVAS (familias corridas) : ${comparaciones}`);
for (const r of RES) L(`  ${r.id}  ${r.veredicto.padEnd(22)} ${r.titulo.slice(0, 72)}`);
const fallidas = RES.filter(r => !/^(MORDIO|ACEPTA COMO DEBE|TAPADA — declarada)$/.test(r.veredicto));
const mordieron = RES.filter(r => r.veredicto === 'MORDIO').length;
const tapadas = RES.filter(r => r.veredicto === 'TAPADA — declarada').length;
L('');
L(`  mordieron : ${mordieron} · aceptan como deben : ${RES.filter(r => r.veredicto === 'ACEPTA COMO DEBE').length} · tapadas declaradas : ${tapadas} · sin hacer lo suyo : ${fallidas.length}`);

L('');
L('================================================================================');
if (comparaciones === 0) { L('ABORTA — cero comparaciones efectivas: ninguna familia corrio.'); process.exit(3); }
if (malRepuestos) { L(`ABORTA — ${malRepuestos} insumo(s) quedaron mal repuestos.`); process.exit(3); }
if (fallidas.length) {
  L(`RESULTADO: ${fallidas.length} familia(s) no hicieron lo suyo.`);
  for (const f of fallidas) L(`  · ${f.id} ${f.veredicto} — ${f.detalle}`);
  L('================================================================================');
  process.exit(1);
}
L(`RESULTADO: las ${comparaciones} familias hicieron lo suyo, con el mapa en estado ${ESTADO.toUpperCase()}.`);
L('================================================================================');
process.exit(0);
