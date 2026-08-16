'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 01_medir_129.js — BAHIA 129, PUERTO EDEN. MEDICION PREVIA, NO ESCRIBE NADA
// que quede escrito: los ensayos del bloque N4 tocan dos archivos y los REPONEN
// comprobando sha256 antes de salir.
//
// QUE MIDE
//   N1  los tres campos de la 129 en el mapa, del ancla `4529b67`
//   N2  que le da el decreto a `puerto_eden`
//   N3  el telefono publicado por DIRECTEMAR (+56 61 2201164) contra el CSV.
//       Si no coincide o no esta, es HALLAZGO y se reporta — no se escribe
//   N4  EL MECANISMO DE RETIRO DE LA DISCREPANCIA, EJERCITADO Y NO SUPUESTO.
//       Es la primera vez que se ejercita. Tres estados, medidos uno por uno
//   N5  P1, P2 y P3 antes y despues
//   N6  las 163 entradas restantes
//   N7  si la particion de telefonos de CONTRATO_MOTOR.md §5.1 se mueve
//
// Corrida:  node _bitacoras/bahia_129_gobernacion_2026-08-16/01_medir_129.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const { normalizarTexto } = require(path.join(RAIZ, 'src/utils/normalizarTexto'));
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const shaBuf = b => crypto.createHash('sha256').update(b).digest('hex');
const shaDe = p => shaBuf(fs.readFileSync(abs(p)));

const ABORTOS = [];
const ANCLA  = '4529b67c37cce15adc4a2b123b5c7d91fa31e00d';
const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_ZA   = 'data/decreto/zonas_aviso.json';
const P_JUR  = 'data/decreto/jurisdicciones_v2.json';
const P_CSV  = '_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv';
const P_SB   = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_DER  = 'data/contacto/reparticiones_publicadas.json';

const BAHIA = '129';
const GOB_NUEVA = 'Punta Arenas';
// Publicado por DIRECTEMAR y consultado por el owner el 2026-08-16.
const TEL_PUBLICADO = '+56 61 2201164';

L('================================================================================');
L('BAHIA 129 — PUERTO EDEN. MEDICION PREVIA. 2026-08-16');
L(`Ancla: commit fijo ${ANCLA}`);
L('================================================================================');

// ── N0 ───────────────────────────────────────────────────────────────────────
L('');
L('=== N0 — INSUMOS, con sha256 del archivo en disco ===');
for (const p of [P_ZA, P_JUR, P_CSV, P_SB, P_DER]) L(`  ${p.padEnd(62)} ${shaDe(p)}`);

// El mapa sale del ANCLA: la medicion previa tiene que reproducirse igual
// despues de aplicada la pieza.
const textoMapa = execFileSync('git', ['show', `${ANCLA}:${P_MAPA}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' })
  .replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
const mapa = JSON.parse(textoMapa);
L(`  ${(P_MAPA + '  [del ancla, en CRLF]').padEnd(62)} ${shaBuf(Buffer.from(textoMapa, 'utf8'))}`);

const za  = JSON.parse(fs.readFileSync(abs(P_ZA), 'utf8'));
const jur = JSON.parse(fs.readFileSync(abs(P_JUR), 'utf8'));
const der = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8')).reparticiones;

// ── N1 ───────────────────────────────────────────────────────────────────────
L('');
L('=== N1 — QUE DICE HOY LA 129 EN EL MAPA, los tres campos ===');
const e129 = mapa[BAHIA];
if (!e129) { ABORTOS.push(`la bahia ${BAHIA} no existe en el mapa`); }
else {
  L(`  capitania   : ${JSON.stringify(e129.capitania)}`);
  L(`  gobernacion : ${JSON.stringify(e129.gobernacion)}`);
  L(`  telefono    : ${JSON.stringify(e129.telefono)}`);
}

// ── N2 ───────────────────────────────────────────────────────────────────────
L('');
L('=== N2 — QUE LE DA EL DECRETO A `puerto_eden` ===');
const jPE = jur.jurisdicciones.find(x => x.id === 'puerto_eden');
if (!jPE) ABORTOS.push('el insumo del decreto no trae `puerto_eden`');
else {
  L(`  nombre      : ${JSON.stringify(jPE.nombre)}`);
  L(`  gobernacion : ${JSON.stringify(jPE.gobernacion)}`);
  L('');
  L('  COTEJO campo por campo, con `normalizarTexto` antes de comparar (INV-0.3):');
  L(`    capitania   mapa=${JSON.stringify(e129.capitania)} · decreto=${JSON.stringify(jPE.nombre)} -> ${normalizarTexto(e129.capitania) === normalizarTexto(jPE.nombre) ? 'COINCIDEN' : 'DIFIEREN'}`);
  L(`    gobernacion mapa=${JSON.stringify(e129.gobernacion)} · decreto=${JSON.stringify(jPE.gobernacion)} -> ${normalizarTexto(e129.gobernacion) === normalizarTexto(jPE.gobernacion) ? 'COINCIDEN' : 'DIFIEREN'}`);
  L('  COMPARACIONES EFECTIVAS : 2');
  L('');
  L('  ¿ES LA UNICA DEL MAPA QUE DICE "Aysén" TENIENDO EL DECRETO OTRA COSA?');
  L('  No se contesta aca y se dice por que: contestarlo exige cotejar las 164');
  L('  contra el join, que es el frente de re-atribucion y esta fuera de alcance.');
  L('  Lo que SI se midio, y alcanza para esta pieza: cuantas entradas del mapa');
  L('  llevan cada Gobernacion.');
  const porGob = new Map();
  for (const k of Object.keys(mapa)) porGob.set(mapa[k].gobernacion, (porGob.get(mapa[k].gobernacion) || 0) + 1);
  L(`    "Aysén"       : ${porGob.get('Aysén') || 0} entradas`);
  L(`    "Punta Arenas": ${porGob.get('Punta Arenas') || 0} entradas`);
  L(`    Gobernaciones distintas en el mapa: ${porGob.size} · suma ${[...porGob.values()].reduce((a, b) => a + b, 0)} de ${Object.keys(mapa).length}`);
}

// ── N3 — el telefono publicado contra el CSV ────────────────────────────────
L('');
L('=== N3 — EL TELEFONO PUBLICADO POR DIRECTEMAR, COTEJADO CONTRA EL CSV ===');
L(`  valor publicado (owner, 2026-08-16) : ${JSON.stringify(TEL_PUBLICADO)}`);
function parseCsvLinea(l) {
  const o = []; let c = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (ch === '"') { if (q && l[i + 1] === '"') { c += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { o.push(c); c = ''; }
    else c += ch;
  }
  o.push(c); return o;
}
let csvTxt = fs.readFileSync(abs(P_CSV), 'utf8');
if (csvTxt.charCodeAt(0) === 0xFEFF) csvTxt = csvTxt.slice(1);
const csvLin = csvTxt.split(/\r?\n/).filter(x => x.trim());
const cab = parseCsvLinea(csvLin[0]);
const iCd = cab.indexOf('CdRep'), iCap = cab.indexOf('Capitania'), iTel = cab.indexOf('Telefono');
const digitos = t => String(t).replace(/[^0-9]/g, '');
const filasConEse = [];
let filasCsv = 0;
for (const l of csvLin.slice(1)) {
  const f = parseCsvLinea(l); filasCsv++;
  for (const t of String(f[iTel]).split(/ó|\//)) {
    if (digitos(t).length >= 8 && digitos(t) === digitos(TEL_PUBLICADO)) filasConEse.push({ cd: f[iCd], cap: f[iCap], tel: f[iTel] });
  }
}
L(`  COMPARACIONES EFECTIVAS (filas del CSV) : ${filasCsv}`);
if (filasCsv === 0) ABORTOS.push('el CSV no trae filas');
L(`  filas del CSV con ese numero : ${filasConEse.length}`);
for (const f of filasConEse) L(`      CdRep ${String(f.cd).padStart(4)}  ${String(f.cap).padEnd(22)} ${JSON.stringify(f.tel)}`);
const cd258 = der['258'];
L('');
L(`  la reparticion 258 en el derivado : nombre_publicado=${JSON.stringify(cd258 && cd258.nombre_publicado)} · telefono=${JSON.stringify(cd258 && cd258.telefono)} · identificado_por=${JSON.stringify(cd258 && cd258.identificado_por)}`);
L(`  el mapa hoy le pone a la 129      : ${JSON.stringify(e129.telefono)}`);
const coincideTel = filasConEse.length > 0 && digitos(e129.telefono) === digitos(TEL_PUBLICADO);
L('');
L(`  VEREDICTO: ¿el publicado coincide con el CSV Y con lo que el mapa ya tiene? ${coincideTel ? 'SI' : 'NO — HALLAZGO'}`);
if (!coincideTel) L('  Si dice NO, esta pieza NO escribe el telefono: se reporta y decide el owner.');

// ── N4 — el mecanismo de retiro, EJERCITADO ─────────────────────────────────
L('');
L('=== N4 — EL RETIRO DE LA DISCREPANCIA, EJERCITADO. Primera vez. ===');
L('  Se toca `src/data/bahia-capitania-map.json` y `data/decreto/zonas_aviso.json`');
L('  y se REPONEN comprobando sha256 al final. Ningun cambio sobrevive a este bloque.');

const RESPALDO = new Map();
for (const p of [P_MAPA, P_ZA]) RESPALDO.set(p, fs.readFileSync(abs(p)));
const reponer = () => { for (const [p, b] of RESPALDO) fs.writeFileSync(abs(p), b); };

// La carga se corre en un proceso aparte: `cargarZonasAviso` cachea, y medir
// tres estados dentro del mismo proceso mediria el cache y no el archivo.
function correrCarga() {
  const codigo = `
    try {
      const { cargarZonasAviso } = require(${JSON.stringify(abs('src/services/zonas-aviso.js'))});
      const r = cargarZonasAviso({ recargar: true });
      const pe = r.zonas ? r.zonas.find(z => z.jurisdiccion_id === 'puerto_eden') : null;
      console.log('CARGA_OK');
      console.log('DISCREPANCIAS=' + JSON.stringify(pe && pe.contacto ? pe.contacto.discrepancias : null));
      console.log('CONTACTO=' + JSON.stringify(pe ? pe.contacto : null));
    } catch (err) {
      console.log('CARGA_FALLA');
      console.log('MENSAJE=' + String(err.message).replace(/\\r?\\n/g, ' '));
    }`;
  const r = spawnSync(process.execPath, ['-e', codigo], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 });
  return (r.stdout || '') + (r.stderr || '');
}

function ponerGobernacion(valor) {
  const txt = fs.readFileSync(abs(P_MAPA), 'utf8');
  const re = new RegExp(`^(\\s*"${BAHIA}":\\s*\\{ "capitania": "[^"]*",\\s*"gobernacion": )"[^"]*"`, 'm');
  if (!re.test(txt)) throw new Error(`la linea de la bahia ${BAHIA} no calza el patron`);
  fs.writeFileSync(abs(P_MAPA), txt.replace(re, `$1"${valor}"`), 'utf8');
}
function retirarDeclaracion() {
  const z = JSON.parse(fs.readFileSync(abs(P_ZA), 'utf8'));
  const pe = z.zonas.find(x => x.jurisdiccion_id === 'puerto_eden');
  delete pe.contacto.discrepancias_declaradas;
  fs.writeFileSync(abs(P_ZA), JSON.stringify(z, null, 2), 'utf8');
}

let estados = 0;
const resultados = {};
try {
  // (a) hoy
  estados++;
  let s = correrCarga();
  resultados.a = s;
  L('');
  L('  (a) HOY — mapa con "Aysén", declaracion viva');
  L(`      ${s.includes('CARGA_OK') ? 'LA CARGA PASA' : 'LA CARGA SE DETIENE'}`);
  if (s.includes('DISCREPANCIAS=')) L(`      discrepancias resueltas que viajan: ${(s.match(/DISCREPANCIAS=(.*)/) || [])[1]}`);
  if (s.includes('MENSAJE=')) L(`      motivo: ${(s.match(/MENSAJE=(.*)/) || [])[1]}`);

  // (b) gobernacion corregida, declaracion INTACTA
  estados++;
  ponerGobernacion(GOB_NUEVA);
  s = correrCarga();
  resultados.b = s;
  L('');
  L(`  (b) CON "${GOB_NUEVA}" ESCRITA y la declaracion SIN RETIRAR`);
  L(`      ${s.includes('CARGA_OK') ? 'LA CARGA PASA' : 'LA CARGA SE DETIENE'}`);
  if (s.includes('MENSAJE=')) L(`      motivo: ${(s.match(/MENSAJE=(.*)/) || [])[1]}`);

  // (c) gobernacion corregida y declaracion retirada
  estados++;
  retirarDeclaracion();
  s = correrCarga();
  resultados.c = s;
  L('');
  L(`  (c) CON "${GOB_NUEVA}" ESCRITA y la declaracion RETIRADA`);
  L(`      ${s.includes('CARGA_OK') ? 'LA CARGA PASA' : 'LA CARGA SE DETIENE'}`);
  if (s.includes('DISCREPANCIAS=')) L(`      discrepancias resueltas que viajan: ${(s.match(/DISCREPANCIAS=(.*)/) || [])[1]}`);
  if (s.includes('MENSAJE=')) L(`      motivo: ${(s.match(/MENSAJE=(.*)/) || [])[1]}`);
} finally {
  reponer();
}

L('');
L('  RESTAURACION DE LOS DOS ARCHIVOS, comprobada por sha256:');
let malRepuestos = 0;
for (const [p, b] of RESPALDO) {
  const ok = shaDe(p) === shaBuf(b);
  if (!ok) malRepuestos++;
  L(`      ${p.padEnd(45)} ${ok ? 'OK' : 'MAL REPUESTO'}`);
}
if (malRepuestos) ABORTOS.push(`${malRepuestos} archivo(s) quedaron mal repuestos`);
L('');
L(`  COMPARACIONES EFECTIVAS (estados cargados) : ${estados}`);
if (estados !== 3) ABORTOS.push(`se cargaron ${estados} estados y tenian que ser 3`);

const pasaA = (resultados.a || '').includes('CARGA_OK');
const pasaB = (resultados.b || '').includes('CARGA_OK');
const pasaC = (resultados.c || '').includes('CARGA_OK');
L('');
L('  VEREDICTO DEL MECANISMO, medido y no supuesto:');
L(`      (a) pasa=${pasaA}   (b) pasa=${pasaB}   (c) pasa=${pasaC}`);
if (!pasaA) L('      NO SE PUEDE CONCLUIR: la carga ya falla HOY, antes de tocar nada.');
else if (!pasaB && pasaC) {
  L('      EL RETIRO **NO ES AUTOMATICO EN EL SENTIDO DE QUE EL ARCHIVO SE LIMPIE SOLO**.');
  L('      Lo automatico es la DETENCION: escrita la Gobernacion correcta, la carga se');
  L('      detiene y OBLIGA a retirar la declaracion a mano. Retirada, vuelve a pasar.');
  L('      O sea que esta pieza NO puede dejar `zonas_aviso.json` sin tocar.');
} else if (pasaB) {
  L('      EL CONTROL NO MORDIO: la carga pasa con una discrepancia declarada que ya');
  L('      no existe. Eso contradice lo que `bd75c494` dice haber construido.');
} else {
  L('      NI (b) NI (c) PASAN: retirar la declaracion no alcanza, y hay otra causa.');
}

// ── N5 — los tres caminos ────────────────────────────────────────────────────
L('');
L('=== N5 — QUE LE LLEGA AL PATRON POR P1, P2 Y P3 ===');
L('  Las formas se re-leyeron del codigo en las sesiones anteriores y no cambiaron.');
L('  Este cambio toca SOLO `gobernacion`, asi que el efecto se razona campo por campo');
L('  y se mide donde el campo se lee.');
L('');
L(`  P1 TransitRestrictionsBlock  "{capitania || gobernacion}" — la 129 tiene`);
L(`     capitania=${JSON.stringify(e129.capitania)}, que NO es nula, asi que el \`||\` nunca llega`);
L('     a `gobernacion`. NO CAMBIA NADA.');
L(`  P2 P3_VoyageVerification     "Capitanía de Puerto de {capitania || gobernacion}" —`);
L('     mismo `||`, misma conclusion. NO CAMBIA NADA.');
L(`  P3 PortStatusBlock           "📞 Gobernación Marítima de {gobernacion} — {telefono}"`);
L(`     LEE \`gobernacion\` SIEMPRE. Para la bahia 129 el rotulo pasa de`);
L(`     "Gobernación Marítima de Aysén" a "Gobernación Marítima de ${GOB_NUEVA}".`);
L(`     El telefono NO se toca: sigue ${JSON.stringify(e129.telefono)}.`);
L('');
L('  ALCANCE, con su denominador: cambia el rotulo de 1 de las 164 entradas.');
L('  El conteo de numeros de Capitania rotulados "Gobernación Marítima de" NO se');
L('  mueve, porque esta pieza no toca ningun telefono. Se mide en N7.');

// ── N6 — las otras 163 ───────────────────────────────────────────────────────
L('');
L('=== N6 — LAS ENTRADAS QUE NO SON LA 129 ===');
const mapa2 = JSON.parse(textoMapa);
mapa2[BAHIA].gobernacion = GOB_NUEVA;
let iguales = 0, movidas = 0;
for (const k of Object.keys(mapa)) {
  if (k === BAHIA) continue;
  if (JSON.stringify(mapa[k]) === JSON.stringify(mapa2[k])) iguales++; else { movidas++; L(`      MOVIDA: ${k}`); }
}
L(`  entradas fuera de la pieza : ${iguales + movidas}`);
L(`  identicas                  : ${iguales}`);
L(`  movidas                    : ${movidas}   (debe ser 0)`);
if (movidas !== 0) ABORTOS.push(`${movidas} entradas fuera de la pieza se moverian`);
if (iguales + movidas === 0) ABORTOS.push('N6 con cero comparaciones');

// ── N7 — ¿se mueve la particion de §5.1? ─────────────────────────────────────
L('');
L('=== N7 — ¿SE MUEVEN LAS CIFRAS DE CONTRATO_MOTOR.md §5.1? ===');
L('  §5.1 declara una particion de los 164 TELEFONOS por nivel. Esta pieza no');
L('  toca ningun telefono, asi que la particion no deberia moverse — pero se');
L('  mide en vez de suponerse.');
const telAntes = Object.keys(mapa).map(k => digitos(mapa[k].telefono)).join('|');
const telDespues = Object.keys(mapa2).map(k => digitos(mapa2[k].telefono)).join('|');
L(`  COMPARACIONES EFECTIVAS (telefonos comparados) : ${Object.keys(mapa).length}`);
L(`  ¿la lista completa de telefonos es identica antes y despues? ${telAntes === telDespues}`);
L('  Si es identica, las cinco casillas de §5.1 —73 · 56 · 35 · 0 · 0— no se mueven');
L('  y el contrato NO necesita enmienda por esta pieza.');
if (telAntes !== telDespues) L('  SI NO es identica, hay que anotarlo como pendiente declarado: §5.1 esta fuera de alcance.');

L('');
L('================================================================================');
if (ABORTOS.length) { L('ABORTA — ' + ABORTOS.join(' · ')); L('================================================================================'); process.exit(3); }
L('MEDICION COMPLETA. Los insumos tocados quedaron repuestos y comprobados.');
L('================================================================================');
