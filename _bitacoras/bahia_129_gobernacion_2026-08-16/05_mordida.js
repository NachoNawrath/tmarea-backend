'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 05_mordida.js — BAHIA 129. ¿LOS CONTROLES MUERDEN? (CLAUDE.md §4.6)
//
// DOS ESTADOS, y la corrida en ROJO es la que vale:
//   --estado=verde  (por defecto)  los dos archivos como quedaron
//   --estado=viejo                 los dos repuestos al ancla `4529b67`
//
// LAS FAMILIAS DEL GENERADOR CORREN SIEMPRE SOBRE EL ESTADO PRE-PIEZA, y esto
// se aprendio pagandolo en la sesion del lote Cisnes: el guard 1 del generador
// exige que el archivo diga HOY el `valor_actual_esperado`, asi que con la pieza
// aplicada aborta por ESE guard antes de llegar al que el ensayo quiere probar.
// Un ensayo que solo mirara el exit no distinguiria cual guard disparo — por eso
// TODAS afirman sobre el MENSAJE del aborto.
//
// LAS FAMILIAS CONSTRUYEN SU CASO DESDE CERO: el valor ofensivo esta escrito
// literal aca abajo, no sacado de lo que el dato traiga hoy. Una familia que se
// apoyara en la forma nueva dejaria de probar el dia que el dato cambie.
//
// LOS INSUMOS SE REPONEN Y SE COMPRUEBA EL sha256.
//
// Corrida:  node _bitacoras/bahia_129_gobernacion_2026-08-16/05_mordida.js
//           node _bitacoras/bahia_129_gobernacion_2026-08-16/05_mordida.js --estado=viejo
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
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

const ANCLA  = '4529b67c37cce15adc4a2b123b5c7d91fa31e00d';
const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_ZA   = 'data/decreto/zonas_aviso.json';
const P_DECL = 'data/contacto/correcciones_gobernacion.json';
const GEN    = 'scripts/frente-contacto-corregir-gobernacion.js';
const VER    = '_bitacoras/bahia_129_gobernacion_2026-08-16/04_verificar.js';
const ID     = 'bahia_129_gobernacion';
const ZONA   = 'puerto_eden';
const BAHIA  = '129';

const ESTADO = (process.argv.find(a => a.startsWith('--estado=')) || '--estado=verde').slice('--estado='.length);
if (!['verde', 'viejo'].includes(ESTADO)) { console.error(`--estado tiene que ser verde o viejo`); process.exit(3); }

L('================================================================================');
L(`MORDIDA — BAHIA 129.  estado = ${ESTADO.toUpperCase()}`);
L('================================================================================');

const MUTABLES = [P_MAPA, P_ZA, P_DECL];
const RESPALDO = new Map();
for (const p of MUTABLES) RESPALDO.set(p, fs.readFileSync(abs(p)));
L('');
L('  RESPALDO, con sha256 de partida:');
for (const p of MUTABLES) L(`      ${p.padEnd(45)} ${shaBuf(RESPALDO.get(p))}`);
const reponerTodo = () => { for (const p of MUTABLES) fs.writeFileSync(abs(p), RESPALDO.get(p)); };

// El blob del ancla viene en LF; el mapa en disco esta en CRLF y zonas_aviso en
// LF. Se convierte cada uno a SU terminador para que el archivo no cambie por
// una razon que no es la del ensayo.
const aEolDe = (txt, ref) => (/\r\n/.test(ref) ? txt.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n') : txt.replace(/\r\n/g, '\n'));
const PRE = new Map();
for (const p of [P_MAPA, P_ZA]) {
  const b = execFileSync('git', ['show', `${ANCLA}:${p}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' });
  PRE.set(p, Buffer.from(aEolDe(b, RESPALDO.get(p).toString('utf8')), 'utf8'));
}
const ponerPre = () => { for (const [p, b] of PRE) fs.writeFileSync(abs(p), b); };
const ponerEstado = () => { if (ESTADO === 'viejo') ponerPre(); else reponerTodo(); };
ponerEstado();
L('');
L(`  MAPA/ZONAS en estado "${ESTADO}"`);
L(`  PRE-PIEZA (para las familias del generador):`);
for (const [p, b] of PRE) L(`      ${p.padEnd(45)} ${shaBuf(b)}`);

const correr = (rel, args = []) => {
  const r = spawnSync(process.execPath, [abs(rel), ...args], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 });
  return { code: r.status, salida: (r.stdout || '') + (r.stderr || '') };
};
const correrGen = () => correr(GEN, [`--correccion=${ID}`]);
const correrVer = () => correr(VER);
function correrCarga() {
  const codigo = `
    try {
      const { cargarZonasAviso } = require(${JSON.stringify(abs('src/services/zonas-aviso.js'))});
      cargarZonasAviso({ recargar: true });
      console.log('CARGA_OK');
    } catch (e) { console.log('CARGA_FALLA ' + String(e.message).replace(/\\r?\\n/g, ' ')); }`;
  const r = spawnSync(process.execPath, ['-e', codigo], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 });
  return ((r.stdout || '') + (r.stderr || '')).trim();
}
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
  RES.push({ id, titulo, veredicto, detalle });
  L(''); L(`  ${id}  ${titulo}`); L(`      esperado : ${esperado}`); L(`      medido   : ${detalle}`); L(`      -> ${veredicto}`);
}

// ── LINEA BASE ───────────────────────────────────────────────────────────────
L('');
L('=== LINEA BASE, antes de inyectar nada ===');
const base = correrVer();
const baseEsperado = ESTADO === 'verde' ? 0 : 1;
L(`  verificador: exit ${base.code}   (esperado en "${ESTADO}": ${baseEsperado})`);
if (ESTADO === 'viejo') {
  L('  Contra el dato viejo el verificador TIENE que estar en rojo: la pieza no esta');
  L('  escrita. Un verificador que diera verde sin la pieza no probaria nada.');
  L(`  ¿las fallas son de V1 y V5, que son las que miden la pieza? ${/V1:|V5:/.test(base.salida)}`);
}
if (base.code !== baseEsperado) {
  L(''); L(`ABORTA — linea base inesperada (exit ${base.code}).`); reponerTodo();
  L('================================================================================'); process.exit(3);
}

L('');
L('=== FAMILIAS ===');

// ── B0 ───────────────────────────────────────────────────────────────────────
familia('B0', 'control negativo: sin inyectar nada, el verificador se comporta como la base',
  ESTADO === 'verde' ? 'exit 0' : 'exit 1',
  () => { const r = correrVer(); return { veredicto: r.code === baseEsperado ? 'ACEPTA COMO DEBE' : 'NO SE COMPORTA COMO LA BASE', detalle: `exit ${r.code}` }; });

// ── B1 ───────────────────────────────────────────────────────────────────────
familia('B1', '`valor_nuevo` que NO es el que el decreto le da a esa jurisdiccion',
  'el generador ABORTA por el cotejo contra el decreto (guard 2), sin escribir',
  () => {
    const d = leerJson(P_DECL);
    // CASO CONSTRUIDO DESDE CERO: el valor ofensivo es literal.
    d.correcciones.find(x => x.id === ID).valor_nuevo = 'Coquimbo';
    escribirJson(P_DECL, d);
    ponerPre();
    const a = [shaDe(P_MAPA), shaDe(P_ZA)];
    const r = correrGen();
    const intacto = shaDe(P_MAPA) === a[0] && shaDe(P_ZA) === a[1];
    const porElDecreto = /el decreto le da/.test(r.salida) && /no se aplica sin cotejar/.test(r.salida);
    return { veredicto: (r.code === 3 && porElDecreto && intacto) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.code} · ¿aborta POR EL COTEJO con el decreto? ${porElDecreto} · ¿archivos intactos? ${intacto}` };
  });

// ── B2 ───────────────────────────────────────────────────────────────────────
familia('B2', '`valor_actual_esperado` que no es lo que el archivo dice hoy',
  'el generador ABORTA por el guard 1, sin pisar nada',
  () => {
    const d = leerJson(P_DECL);
    d.correcciones.find(x => x.id === ID).valor_actual_esperado = 'Valparaíso';
    escribirJson(P_DECL, d);
    ponerPre();
    const a = [shaDe(P_MAPA), shaDe(P_ZA)];
    const r = correrGen();
    const intacto = shaDe(P_MAPA) === a[0] && shaDe(P_ZA) === a[1];
    const porElViejo = /El archivo se movio desde que se declaro la correccion/.test(r.salida);
    return { veredicto: (r.code === 3 && porElViejo && intacto) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.code} · ¿aborta POR EL VALOR VIEJO? ${porElViejo} · ¿archivos intactos? ${intacto}` };
  });

// ── B3 ───────────────────────────────────────────────────────────────────────
familia('B3', 'la zona declarada no es la que `zonas_aviso.json` le da a esa bahia',
  'el generador ABORTA por el guard 3 — dos archivos que no dicen lo mismo',
  () => {
    const d = leerJson(P_DECL);
    d.correcciones.find(x => x.id === ID).retirar_discrepancia_declarada.zona = 'talcahuano';
    escribirJson(P_DECL, d);
    ponerPre();
    const a = [shaDe(P_MAPA), shaDe(P_ZA)];
    const r = correrGen();
    const intacto = shaDe(P_MAPA) === a[0] && shaDe(P_ZA) === a[1];
    const porLaZona = /cuelga de la zona/.test(r.salida) && /y la correccion declara/.test(r.salida);
    return { veredicto: (r.code === 3 && porLaZona && intacto) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.code} · ¿aborta POR LA ZONA? ${porLaZona} · ¿archivos intactos? ${intacto}` };
  });

// ── B4 ───────────────────────────────────────────────────────────────────────
familia('B4', 'la correccion declara un `campo` que el generador no sabe corregir',
  'ABORTA nombrando los admitidos — no cae al generico (CLAUDE.md §4.2)',
  () => {
    const d = leerJson(P_DECL);
    d.correcciones.find(x => x.id === ID).campo = 'telefono';
    escribirJson(P_DECL, d);
    ponerPre();
    const a = [shaDe(P_MAPA), shaDe(P_ZA)];
    const r = correrGen();
    const intacto = shaDe(P_MAPA) === a[0] && shaDe(P_ZA) === a[1];
    const dice = /no sabe corregir/.test(r.salida) && /Admitidos:/.test(r.salida);
    return { veredicto: (r.code === 3 && dice && intacto) ? 'MORDIO' : 'NO MORDIO',
      detalle: `exit ${r.code} · ¿nombra los admitidos? ${dice} · ¿archivos intactos? ${intacto}` };
  });

// ── B5 ───────────────────────────────────────────────────────────────────────
familia('B5', 'la Gobernacion corregida y la declaracion SIN retirar — el retiro automatico de `bd75c494`',
  'LA CARGA SE DETIENE, nombrando la discrepancia que hoy no existe (familia M24)',
  () => {
    // CASO CONSTRUIDO DESDE CERO: se toma el `zonas_aviso.json` del ancla —que
    // trae la declaracion viva— y se lo pone junto al mapa YA corregido. No se
    // muta lo que el dato traiga: se combinan dos estados conocidos.
    fs.writeFileSync(abs(P_ZA), PRE.get(P_ZA));
    const txt = fs.readFileSync(abs(P_MAPA), 'utf8');
    const re = new RegExp(`^(\\s*"${BAHIA}":\\s*\\{ "capitania": "[^"]*",\\s*"gobernacion": )"[^"]*"`, 'm');
    if (!re.test(txt)) return { veredicto: 'NO SE PUDO INYECTAR', detalle: 'la linea de la bahia no calzo' };
    fs.writeFileSync(abs(P_MAPA), txt.replace(re, '$1"Punta Arenas"'), 'utf8');
    const s = correrCarga();
    const seDetiene = s.startsWith('CARGA_FALLA');
    const porLaDiscrepancia = /declara una discrepancia en nivel 'gobernacion' que HOY NO EXISTE/.test(s);
    return { veredicto: (seDetiene && porLaDiscrepancia) ? 'MORDIO' : 'NO MORDIO',
      detalle: `${seDetiene ? 'la carga se detiene' : 'LA CARGA PASA'} · ¿por la discrepancia que ya no existe? ${porLaDiscrepancia}` };
  });

// ── B6 ───────────────────────────────────────────────────────────────────────
familia('B6', 'una entrada del mapa FUERA de la pieza, cambiada a mano (la 71)',
  ESTADO === 'verde' ? 'el verificador falla en V3 y NOMBRA a la 71' : 'TAPADA: el verificador ya esta en rojo sin la pieza',
  () => {
    const txt = fs.readFileSync(abs(P_MAPA), 'utf8');
    const nuevo = txt.replace(/^(\s*"71":\s*\{ "capitania": )"[^"]*"/m, '$1"Iquique"');
    if (nuevo === txt) return { veredicto: 'NO SE PUDO INYECTAR', detalle: 'la linea de la 71 no calzo' };
    fs.writeFileSync(abs(P_MAPA), nuevo, 'utf8');
    const r = correrVer();
    const enV3 = /V3: .*71/.test(r.salida);
    if (ESTADO === 'viejo') return { veredicto: 'TAPADA — declarada', detalle: `exit ${r.code} · ¿V3 nombra a la 71? ${enV3} · la base ya era exit 1` };
    return { veredicto: (r.code === 1 && enV3) ? 'MORDIO' : 'NO MORDIO', detalle: `exit ${r.code} · ¿V3 nombra a la 71? ${enV3}` };
  });

// ── B7 ───────────────────────────────────────────────────────────────────────
familia('B7', '`discrepancias_declaradas: []` — declarar el campo vacio',
  'LA CARGA SE DETIENE: declarar vacio no declara nada',
  () => {
    const z = leerJson(P_ZA);
    z.zonas.find(x => x.jurisdiccion_id === ZONA).contacto.discrepancias_declaradas = [];
    escribirJson(P_ZA, z);
    const s = correrCarga();
    const seDetiene = s.startsWith('CARGA_FALLA');
    const porElVacio = /no es un arreglo con al menos/.test(s) || /Declarar el campo vacio no declara nada/.test(s);
    return { veredicto: (seDetiene && porElVacio) ? 'MORDIO' : 'NO MORDIO',
      detalle: `${seDetiene ? 'la carga se detiene' : 'LA CARGA PASA'} · ¿por el campo vacio? ${porElVacio}` };
  });

// ── restauracion ─────────────────────────────────────────────────────────────
reponerTodo();
L('');
L('=== RESTAURACION, comprobada por sha256 ===');
let mal = 0;
for (const p of MUTABLES) { const ok = shaDe(p) === shaBuf(RESPALDO.get(p)); if (!ok) mal++; L(`  ${p.padEnd(45)} ${ok ? 'OK' : 'MAL REPUESTO'}`); }

L('');
L('=== RESUMEN ===');
L(`  COMPARACIONES EFECTIVAS (familias corridas) : ${comparaciones}`);
for (const r of RES) L(`  ${r.id}  ${r.veredicto.padEnd(22)} ${r.titulo.slice(0, 68)}`);
const fallidas = RES.filter(r => !/^(MORDIO|ACEPTA COMO DEBE|TAPADA — declarada)$/.test(r.veredicto));
L('');
L(`  mordieron : ${RES.filter(r => r.veredicto === 'MORDIO').length} · aceptan como deben : ${RES.filter(r => r.veredicto === 'ACEPTA COMO DEBE').length} · tapadas declaradas : ${RES.filter(r => r.veredicto === 'TAPADA — declarada').length} · sin hacer lo suyo : ${fallidas.length}`);

L('');
L('================================================================================');
if (comparaciones === 0) { L('ABORTA — cero comparaciones efectivas.'); process.exit(3); }
if (mal) { L(`ABORTA — ${mal} insumo(s) mal repuestos.`); process.exit(3); }
if (fallidas.length) {
  L(`RESULTADO: ${fallidas.length} familia(s) no hicieron lo suyo.`);
  for (const f of fallidas) L(`  · ${f.id} ${f.veredicto} — ${f.detalle}`);
  L('================================================================================'); process.exit(1);
}
L(`RESULTADO: las ${comparaciones} familias hicieron lo suyo, con los archivos en estado ${ESTADO.toUpperCase()}.`);
L('================================================================================');
process.exit(0);
