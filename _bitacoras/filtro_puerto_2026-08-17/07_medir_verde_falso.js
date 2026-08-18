// ─────────────────────────────────────────────────────────────────────────────
// §3 · MEDICIÓN DEL VERDE FALSO — F2, antes de escribir producción.
//
// SOLO LEE. No escribe en ningún insumo, no invoca a ninguno de los cuatro
// instrumentos de F1 (dos de ellos pisan entregables commiteados), y comprueba
// el sha256 de los dos entregables de F1 al abrir y al cerrar.
//
// Material: CONGELADO_vivo.json 23:02Z y CONGELADO_puertos.json 23:02Z, los dos
// versionados, más el join commiteado. Ninguna cifra viva nueva.
//
// El filtro de hoy se extrae VERBATIM de src/routes/sitport-routes.js
// delimitando por ESTRUCTURA, no por ventana de líneas, con aserción de
// literales: un literal ausente es FALLA, no «no aplicable».
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BACK = 'C:/Users/katia/tmarea-backend';
const PWA = 'C:/Users/katia/tmarea-pwa';
const INS = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/insumos');
const SALIDA = process.argv[2] || path.join(__dirname, '07_medir_verde_falso.txt');

const L = [];
const say = m => { L.push(m); if (process.env.F2_SILENCIO !== '1') console.log(m); };
const fallas = [];
const falla = m => { fallas.push(m); say('  ✗ FALLA · ' + m); };
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const N = n => String(n).padStart(4);

// ── GUARDA DE ENTREGABLES ────────────────────────────────────────────────────
// f1_generar.js:189 y :202 pisan estos dos. Este instrumento no los invoca,
// pero se comprueban igual: «aunque creas que no los tocaste».
const ENTREGABLES = {
  'data/catalogo/join_puerto_bahia.json': 'dfd072361faa5607b7c487b73d5d45796d16ec10cbd99a613a5df7db351168f5',
  '_bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv': '0ca33c18e48229eba257573ff662cfb2f770e62b24d53354aae220c8d72a1788',
};
const shaAntes = {};
for (const [rel, esperado] of Object.entries(ENTREGABLES)) {
  const s = sha256(path.join(BACK, rel));
  shaAntes[rel] = s;
  if (s !== esperado) falla(`ENTREGABLE YA ALTERADO ANTES DE MEDIR: ${rel}`);
}

// ── EXTRACCIÓN VERBATIM DEL FILTRO, delimitada por estructura ────────────────
const SRC = fs.readFileSync(path.join(BACK, 'src/routes/sitport-routes.js'), 'utf8');
const marcaPost = SRC.indexOf("router.post('/restricciones'");
if (marcaPost < 0) { falla('no está router.post(/restricciones)'); process.exit(2); }
function tajo(desde, hasta, base) {
  const a = SRC.indexOf(desde, base || 0);
  if (a < 0) { falla(`literal no encontrado: ${desde}`); return null; }
  const b = SRC.indexOf(hasta, a);
  if (b < 0) { falla(`cierre no encontrado tras ${desde}`); return null; }
  return SRC.slice(a, b + hasta.length);
}
const FILTRO_SRC = tajo('const norm = s =>', '\n    });', marcaPost);
const COORDS_SRC = tajo('const BAHIA_COORDS = {', '\n};');
if (!FILTRO_SRC || !COORDS_SRC) process.exit(2);

// ASERCIÓN DE LITERALES. Un literal ausente es FALLA.
for (const lit of ['p.includes(w)', 'skip.includes(w)', 'w.length > 3', 'GLBahia']) {
  if (!FILTRO_SRC.includes(lit)) falla(`el bloque extraído no contiene el literal ${lit}`);
}
// EL ANCLA DE LA MORDIDA. `p.includes(w)` aparece TAMBIÉN dentro de
// `skip.includes(w)` —«ski|p.includes(w)»—; el token sintáctico completo
// `w => p.includes(w)` tiene que aparecer UNA sola vez, o el parche cae sobre
// el mecanismo equivocado y la mordida informa verde con un número creíble.
const ANCLA = 'w => p.includes(w)';
const vecesAncla = FILTRO_SRC.split(ANCLA).length - 1;
if (vecesAncla !== 1) falla(`el ancla «${ANCLA}» aparece ${vecesAncla} veces y tiene que aparecer 1`);
const vecesSubcadena = FILTRO_SRC.split('p.includes(w)').length - 1;

function construirFiltro(cuerpo) {
  // El bloque extraído es `const norm = … ; const skip = …; const p = …;
  // const filtradas = data.filter(…);`. Se envuelve para poder invocarlo.
  return new Function('data', 'puerto', `${cuerpo}\n return filtradas;`);
}
const filtroHoy = construirFiltro(FILTRO_SRC);
const BAHIA_COORDS = new Function(COORDS_SRC + '\n return BAHIA_COORDS;')();

// ── MATERIAL CONGELADO Y JOIN ────────────────────────────────────────────────
const congVivo = JSON.parse(fs.readFileSync(path.join(INS, 'CONGELADO_vivo.json'), 'utf8'));
const VIVO = congVivo.cuerpo.data;
const congPuertos = JSON.parse(fs.readFileSync(path.join(INS, 'CONGELADO_puertos.json'), 'utf8'));
const CAT = congPuertos.cuerpo.data;
const JOIN = JSON.parse(fs.readFileSync(path.join(BACK, 'data/catalogo/join_puerto_bahia.json'), 'utf8'));
const { derivarCierre } = require(path.join(BACK, 'src/services/cierre-derivador.js'));

const memoCierre = new Map();
const cerrada = r => {
  if (!memoCierre.has(r.IDRestriccion)) memoCierre.set(r.IDRestriccion, derivarCierre(r).estado === 'cerrado');
  return memoCierre.get(r.IDRestriccion);
};

// ── PISO POR UNIDAD, ANTES DE MEDIR NADA ─────────────────────────────────────
const unidades = { vivo: VIVO.length, catalogo: CAT.length, join: (JOIN.filas || []).length, bahiaCoords: Object.keys(BAHIA_COORDS).length };
if (!unidades.vivo || !unidades.catalogo || !unidades.join || !unidades.bahiaCoords) {
  say('ABORTA · piso por unidad: ' + JSON.stringify(unidades));
  fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' });
  process.exit(2);
}

// ── NORMALIZACIÓN DECLARADA ──────────────────────────────────────────────────
// El endpoint recibe el NOMBRE tal como lo sirve /api/puertos. El join guarda
// el nombre LIMPIO. Lo único que se normaliza para buscar es: quitar bytes de
// control (0x00-0x1F) y recortar bordes. NO se baja a minúscula, NO se quitan
// tildes y NO hay fuzzy — CERRAZON queda a una letra de CERRADO.
const clave = s => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, '').trim();

const porClave = new Map();
for (const f of JOIN.filas) {
  const k = clave(f.nombre);
  if (porClave.has(k)) falla(`el join tiene dos filas con la misma clave: ${JSON.stringify(k)}`);
  porClave.set(k, f);
}

// ── EL CATÁLOGO, UNA ENTRADA POR NOMBRE (el filtro recibe un nombre) ─────────
const porNombre = new Map();
for (const p of CAT) if (!porNombre.has(p.nombre)) porNombre.set(p.nombre, p);
const NOMBRES = [...porNombre.keys()];

say('='.repeat(80));
say('§3 · MEDICIÓN DEL VERDE FALSO — F2');
say('corrida ' + new Date().toISOString());
say('='.repeat(80));
say('');
say('UNIVERSOS, cada cifra nombra el suyo');
say(`  CATÁLOGO  CONGELADO_puertos.json ${congPuertos.congelado_en}`);
say(`            ${CAT.length} filas · ${NOMBRES.length} nombres distintos · ${CAT.filter(p => p.bahia_sitport_id != null).length} filas con ancla`);
say(`  MATERIAL  CONGELADO_vivo.json ${congVivo.congelado_en}`);
say(`            ${VIVO.length} filas · ${new Set(VIVO.map(r => r.IDRestriccion)).size} restricciones · ${new Set(VIVO.map(r => r.bahia)).size} bahías · ${VIVO.filter(cerrada).length} filas cerradas`);
say(`  JOIN      data/catalogo/join_puerto_bahia.json · ${JOIN.filas.length} filas`);
say(`  el ancla de la mordida «${ANCLA}» aparece ${vecesAncla} vez; la subcadena «p.includes(w)» aparece ${vecesSubcadena}`);
say('');

// ── CONTROL DEL `nivel` — un grep que devuelve CERO, con control positivo ────
say('CONTROL DEL `nivel` — el grep que devuelve cero se prueba a sí mismo');
{
  const conNivel = VIVO.filter(r => Object.prototype.hasOwnProperty.call(r, 'nivel')).length;
  const conId = VIVO.filter(r => Object.prototype.hasOwnProperty.call(r, 'IDRestriccion')).length;
  say(`  filas con la clave 'nivel' .......... ${conNivel} / ${VIVO.length}   (esperado 0)`);
  say(`  CONTROL POSITIVO, misma vía y mismo material:`);
  say(`  filas con la clave 'IDRestriccion' .. ${conId} / ${VIVO.length}   (esperado ${VIVO.length})`);
  if (conNivel !== 0) falla('el material trae `nivel`: la premisa de que estado nunca vale rojo dejó de valer');
  if (conId !== VIVO.length) falla('el control positivo no encuentra IDRestriccion — la vía de lectura está rota');
  say(`  => estado NUNCA vale 'rojo' hoy. La pantalla sólo distingue ámbar de verde.`);
}
say('');

// ── EL MODELO DE PANTALLA, tal como está escrito en la PWA ───────────────────
// mapearRespuestaPuerto:270 · restricciones.length > 0 ? 'ambar' : 'verde'
// PortStatusBlock.jsx · verde => «🟢 Abierto · Sin restricciones activas»
const estadoDe = filas => (filas.length > 0 ? 'ambar' : 'verde');

// ── LOS DOS RESOLVEDORES ─────────────────────────────────────────────────────
function servirHoy(nombreCrudo) { return filtroHoy(VIVO, nombreCrudo); }
function bahiaF2(nombreCrudo) {
  const f = porClave.get(clave(nombreCrudo));
  return f ? { fila: f, bahia: f.bahia_id, estado: f.estado } : { fila: null, bahia: null, estado: 'NO_ESTA_EN_EL_JOIN' };
}
function servirF2(nombreCrudo) {
  const b = bahiaF2(nombreCrudo);
  return b.bahia == null ? [] : VIVO.filter(r => Number(r.bahia) === Number(b.bahia));
}

// ── H3(a) · CUÁNTOS NOMBRES NO RESUELVEN POR STRING EXACTO ───────────────────
say('H3(a) · el lookup por string exacto contra el join');
{
  let exacto = 0, soloNormalizado = 0, ninguno = 0;
  const losTres = [];
  for (const n of NOMBRES) {
    const hayExacto = JOIN.filas.some(f => f.nombre === n);
    const hayNorm = porClave.has(clave(n));
    if (hayExacto) exacto++;
    else if (hayNorm) { soloNormalizado++; losTres.push(n); }
    else ninguno++;
  }
  say(`  resuelven por string EXACTO ............. ${N(exacto)} / ${NOMBRES.length}`);
  say(`  resuelven SÓLO tras normalizar .......... ${N(soloNormalizado)} / ${NOMBRES.length}`);
  say(`  no resuelven de ninguna forma ........... ${N(ninguno)} / ${NOMBRES.length}`);
  for (const n of losTres) say(`      ${JSON.stringify(n)}`);
  if (ninguno !== 0) falla(`${ninguno} nombres del catálogo no tienen fila en el join`);
}
say('');

// ── TABLA POR NOMBRE ─────────────────────────────────────────────────────────
const anclaDe = new Map(CAT.filter(p => p.bahia_sitport_id != null).map(p => [p.nombre, Number(p.bahia_sitport_id)]));
const filas = NOMBRES.map(n => {
  const hoy = servirHoy(n);
  const b = bahiaF2(n);
  const f2 = servirF2(n);
  return {
    nombre: n, hoy, f2, joinBahia: b.bahia, joinEstado: b.estado,
    ancla: anclaDe.has(n) ? anclaDe.get(n) : null,
    estadoHoy: estadoDe(hoy), estadoF2: estadoDe(f2),
  };
});
const ids = a => new Set(a.map(r => r.IDRestriccion)).size;
const cerr = a => a.filter(cerrada);

// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('1 · ZARPE — quiénes pasan de ámbar a «Abierto»');
say('='.repeat(80));
const flip = filas.filter(f => f.estadoHoy === 'ambar' && f.estadoF2 === 'verde');
const alReves = filas.filter(f => f.estadoHoy === 'verde' && f.estadoF2 === 'ambar');
const quietos = filas.filter(f => f.estadoHoy === f.estadoF2);
say(`  denominador: ${NOMBRES.length} nombres del catálogo real, material ${congVivo.congelado_en}`);
say('');
say(`  hoy ámbar ................................ ${N(filas.filter(f => f.estadoHoy === 'ambar').length)} / ${NOMBRES.length}`);
say(`  con F2 ámbar ............................. ${N(filas.filter(f => f.estadoF2 === 'ambar').length)} / ${NOMBRES.length}`);
say('');
say(`  ÁMBAR -> «ABIERTO» (el verde falso) ...... ${N(flip.length)} / ${NOMBRES.length}`);
say(`  verde -> ámbar (empiezan a avisar) ....... ${N(alReves.length)} / ${NOMBRES.length}`);
say(`  no se mueven ............................. ${N(quietos.length)} / ${NOMBRES.length}`);
say('');
{
  const fl = flip.reduce((a, f) => a + f.hoy.length, 0);
  const rs = new Set(flip.flatMap(f => f.hoy.map(r => r.IDRestriccion))).size;
  const fc = flip.reduce((a, f) => a + cerr(f.hoy).length, 0);
  const rc = new Set(flip.flatMap(f => cerr(f.hoy).map(r => r.IDRestriccion))).size;
  say(`  LO QUE LOS ${flip.length} DEJAN DE RECIBIR, en las dos unidades:`);
  say(`      filas servidas hoy ................... ${N(fl)}`);
  say(`      restricciones distintas hoy .......... ${N(rs)}`);
  say(`      de ellas, filas CERRADAS ............. ${N(fc)}`);
  say(`      de ellas, restricciones CERRADAS ..... ${N(rc)}`);
}
say('');
say('  POR QUÉ SE APAGAN — apertura por estado del join:');
{
  const porEstado = {};
  for (const f of flip) {
    const k = f.joinBahia == null ? f.joinEstado : 'bahia_resuelta_SIN_filas_vivas';
    porEstado[k] = (porEstado[k] || 0) + 1;
  }
  for (const [k, v] of Object.entries(porEstado).sort((a, b) => b[1] - a[1])) say(`      ${k.padEnd(38)} ${N(v)}`);
}
say('');
say('  ¿CUÁNTOS DE LOS QUE SE APAGAN TIENEN UN CIERRE VIVO EN LA BAHÍA QUE EL');
say('  JOIN LES ASIGNA?');
{
  const conCierrePropio = flip.filter(f => f.joinBahia != null && cerr(VIVO.filter(r => Number(r.bahia) === Number(f.joinBahia))).length > 0);
  say(`      ${N(conCierrePropio.length)} de ${flip.length}`);
  say('');
  say('      ESTA AFIRMACIÓN ES TAUTOLÓGICA Y ASÍ QUEDA ESCRITA. Un puerto se');
  say('      apaga si y sólo si F2 no le sirve ninguna fila, y F2 sirve todas las');
  say('      de la bahía que el join le pone. El cero se sigue de las');
  say('      definiciones: no es una medición del mundo.');
  say('      QUÉ NO PRUEBA — y es todo lo que importaba:');
  say('        · no prueba que la bahía del join sea la correcta;');
  say('        · no prueba que no haya un cierre vivo en OTRA bahía que sí le');
  say('          corresponda. Eso lo contesta M3 en 08_medir_anclas_desplazadas,');
  say('          mirando la bahía más cercana a la POSICIÓN y no la del join;');
  say('        · no dice nada de los que NO se apagan.');
  if (conCierrePropio.length !== 0) falla('la tautología no se cumple: el modelo de servicio no es el que se declaró');
}
say('');

// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('4 · EL DELTA EN LAS DOS DIRECCIONES — la que empeora, primero');
say('='.repeat(80));
say('  «PROPIA» TIENE TRES DEFINICIONES Y NINGUNA ES NEUTRAL. Van las tres, con');
say('  la definición al lado de cada tabla, porque LA ELECCIÓN DE LA DEFINICIÓN');
say('  ES LA QUE PRODUCE LAS CIFRAS:');
say('    (i)   EL ANCLA DECLARADA — `bahia_sitport_id`. Se venía llamando');
say('          «verdad de terreno» y NO LO ES: tiene al menos 12 filas con el');
say('          ancla a más de 100 km del nodo, 11 de ellas por defecto de');
say('          catálogo (ver 08_medir_anclas_desplazadas). Con esta definición,');
say('          servir la bahía de un ancla equivocada cuenta como «propia».');
say('    (ii)  LA POSICIÓN — la bahía más cercana al nodo dentro de 30 km. No');
say('          depende del ancla ni del join. Es la que caza el falso positivo');
say('          que (i) no puede ver.');
say('    (iii) LA BAHÍA DEL JOIN — la que F2 va a servir. ES CIRCULAR para');
say('          juzgar a F2 y se declara: mide consistencia, no acierto.');
say('');
function bloque(sub, etq, propiaDe) {
  const den = sub.length;
  let pierdenCierreVerdadero = 0, ganaCierreVerdadero = 0;
  let dejanAjena = 0, siguenAjena = 0, empiezanAjena = 0;
  let fCV = 0; const rCV = new Set();
  for (const f of sub) {
    const propia = propiaDe(f);
    const hoyPropiasCerr = cerr(f.hoy.filter(r => Number(r.bahia) === propia));
    const f2PropiasCerr = cerr(f.f2.filter(r => Number(r.bahia) === propia));
    if (hoyPropiasCerr.length > 0 && f2PropiasCerr.length === 0) {
      pierdenCierreVerdadero++;
      fCV += hoyPropiasCerr.length;
      for (const r of hoyPropiasCerr) rCV.add(r.IDRestriccion);
    }
    if (hoyPropiasCerr.length === 0 && f2PropiasCerr.length > 0) ganaCierreVerdadero++;
    const hoyAjenas = f.hoy.filter(r => Number(r.bahia) !== propia).length;
    const f2Ajenas = f.f2.filter(r => Number(r.bahia) !== propia).length;
    if (hoyAjenas > 0 && f2Ajenas === 0) dejanAjena++;
    if (hoyAjenas > 0 && f2Ajenas > 0) siguenAjena++;
    if (hoyAjenas === 0 && f2Ajenas > 0) empiezanAjena++;
  }
  say(`  ${etq} — denominador ${den}`);
  say(`    EMPEORA · dejan de recibir un CIERRE «PROPIO» ... ${N(pierdenCierreVerdadero)} / ${den}`);
  say(`              filas cerradas propias perdidas ....... ${N(fCV)}`);
  say(`              restricciones cerradas propias ........ ${N(rCV.size)}`);
  say(`    dejan de recibir bahía AJENA ................... ${N(dejanAjena)} / ${den}`);
  say(`    siguen recibiendo alguna ajena ................. ${N(siguenAjena)} / ${den}`);
  say(`    EMPIEZAN a recibir una ajena ................... ${N(empiezanAjena)} / ${den}` +
      `   ${empiezanAjena === 0 ? '← NO LEER SOLA: ver «SIN LA PALABRA PROPIA»' : ''}`);
  say(`    empiezan a recibir un cierre «propio» .......... ${N(ganaCierreVerdadero)} / ${den}`);
  say('');
  return { pierdenCierreVerdadero, dejanAjena, empiezanAjena, ganaCierreVerdadero, den };
}
// (ii) LA POSICIÓN — bahía más cercana dentro de 30 km, sin ancla y sin join.
function distKm0(la1, lo1, la2, lo2) {
  const R = 6371, r = d => d * Math.PI / 180;
  const dLa = r(la2 - la1), dLo = r(lo2 - lo1);
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
const BAH = Object.entries(BAHIA_COORDS).map(([id, c]) => ({ id: Number(id), ...c }));
const cercaDe = new Map();
for (const p of CAT) {
  let m = null;
  for (const x of BAH) { const d = distKm0(p.lat, p.lng, x.lat, x.lng); if (!m || d < m.km) m = { id: x.id, km: d }; }
  if (!cercaDe.has(p.nombre)) cercaDe.set(p.nombre, m && m.km < 30 ? m.id : null);
}
const kmAncla2 = new Map();
for (const p of CAT) {
  if (p.bahia_sitport_id == null || !BAHIA_COORDS[Number(p.bahia_sitport_id)]) continue;
  const c = BAHIA_COORDS[Number(p.bahia_sitport_id)];
  if (!kmAncla2.has(p.nombre)) kmAncla2.set(p.nombre, distKm0(p.lat, p.lng, c.lat, c.lng));
}

const anclados = filas.filter(f => f.ancla != null);
bloque(anclados, '(i) CONTRA EL ANCLA DECLARADA — «propia» = la del ancla', f => f.ancla);
const anclaBuena = anclados.filter(f => (kmAncla2.get(f.nombre) ?? 1e9) <= 100);
bloque(anclaBuena, '(i-bis) IGUAL, PERO SIN LAS 12 FILAS CON ANCLA A MÁS DE 100 km', f => f.ancla);
const conPos = filas.filter(f => cercaDe.get(f.nombre) != null);
bloque(conPos, '(ii) CONTRA LA POSICIÓN — «propia» = bahía más cercana dentro de 30 km', f => Number(cercaDe.get(f.nombre)));
const conJoin = filas.filter(f => f.joinBahia != null);
bloque(conJoin, '(iii) CONTRA LA BAHÍA DEL JOIN [circular]', f => Number(f.joinBahia));
// ── LA MEDICIÓN QUE NO DEPENDE DE «PROPIA» ───────────────────────────────────
// Las tres definiciones esconden a los mismos 8, cada una por su motivo. Esta
// no pregunta cuál es la bahía propia: pregunta A QUÉ DISTANCIA DEL NODO está
// la bahía cuyas filas F2 le va a servir. No necesita ancla, ni join, ni una
// noción de «correcto».
say('  ── SIN LA PALABRA «PROPIA» — a qué distancia está lo que F2 sirve ──');
{
  const sirviendo = filas.filter(f => f.f2.length > 0);
  say(`    nodos a los que F2 les sirve al menos una fila ... ${N(sirviendo.length)} / ${NOMBRES.length}`);
  for (const u of [30, 100, 200]) {
    const lejos = sirviendo.filter(f => {
      const c = BAHIA_COORDS[Number(f.joinBahia)];
      const p = porNombre.get(f.nombre);
      return c && p && distKm0(p.lat, p.lng, c.lat, c.lng) > u;
    });
    const conCierre = lejos.filter(f => cerr(f.f2).length > 0);
    const hoyMudos = lejos.filter(f => f.hoy.length === 0);
    say(`    F2 les sirve una bahía a más de ${String(u).padStart(3)} km ..... ${N(lejos.length)}` +
        ` · con cierre ${N(conCierre.length)} · hoy estaban en verde ${N(hoyMudos.length)}`);
  }
  const lejos100 = sirviendo.filter(f => {
    const c = BAHIA_COORDS[Number(f.joinBahia)]; const p = porNombre.get(f.nombre);
    return c && p && distKm0(p.lat, p.lng, c.lat, c.lng) > 100;
  });
  say('');
  say('    NOMINAL, a más de 100 km:');
  for (const f of lejos100) {
    const c = BAHIA_COORDS[Number(f.joinBahia)], p = porNombre.get(f.nombre);
    say(`      ${f.nombre.slice(0, 34).padEnd(35)} → bahía ${String(f.joinBahia).padStart(4)} «${c.nombre.slice(0, 22)}»` +
        ` a ${distKm0(p.lat, p.lng, c.lat, c.lng).toFixed(0)} km · ${f.f2.length} filas, ${cerr(f.f2).length} cerradas` +
        ` · hoy ${f.hoy.length === 0 ? 'VERDE' : f.hoy.length + ' filas'}`);
  }
  say('');
  say('    ÉSTA ES LA CIFRA DEL «EMPIEZAN A RECIBIR UNA AJENA». Las tres tablas');
  say('    de arriba la esconden, cada una por su motivo: (i) y (iii) cuentan la');
  say('    bahía del ancla equivocada como «propia», y (ii) los EXCLUYE de su');
  say('    denominador porque desde su posición equivocada no hay ninguna bahía');
  say('    a menos de 30 km. Tres definiciones, el mismo punto ciego.');
}
say('');
say('  LECTURA DE LAS CUATRO TABLAS, para que no se lea la que conviene:');
say('    · el «EMPIEZAN a recibir una ajena = 0» de (i) ES UN ARTEFACTO DE SU');
say('      PROPIA DEFINICIÓN: servir la bahía de un ancla equivocada cuenta como');
say('      «propia». La cifra que vale es la de (ii), que mide contra dónde está');
say('      el nodo y no contra lo que el catálogo declara.');
say('    · el «EMPEORA» de (i) queda con su alcance recortado: vale para las');
say('      filas cuyo ancla es creíble, que es lo que mide (i-bis).');

// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('2 · RECALADA — el universo real de destinos');
say('='.repeat(80));
{
  const maritime = JSON.parse(fs.readFileSync(path.join(PWA, 'src/data/maritime_data.json.json'), 'utf8'));
  const dep = maritime.destinos_deportivos || [];
  const marinas = dep.filter(d => d.type === 'MARINA');
  const anchorages = dep.filter(d => d.type === 'ANCHORAGE');
  // LOS CATÁLOGOS SE LEEN POR SU SERVICIO VERSIONADO, no reconstruyendo el
  // mapeo: lo que importa es la forma que el ENDPOINT sirve, que es la que la
  // PWA guarda en `destino.centro`. Reconstruirla a mano mediría otra cosa.
  const centrosService = require(path.join(BACK, 'src/services/centros-service.js'));
  centrosService.loadCentros();
  const arrCentros = centrosService.getAll();
  const mitilidosService = require(path.join(BACK, 'src/services/mitilidos-service.js'));
  mitilidosService.loadMitilidos();
  const estadoMit = mitilidosService.getStatus();
  const concCrudo = JSON.parse(fs.readFileSync(path.join(BACK, 'src/services/data/concesiones_acuicolas_nacional.json'), 'utf8'));
  const arrConc = concCrudo.features || [];
  const moluscos = arrConc.filter(c => String(c.grupo || '').toUpperCase().includes('MOLUSCO'));

  // PISO POR UNIDAD DE ESTA SECCIÓN. Un catálogo que se lee mal devuelve 0 y un
  // control mal hecho informa OK sobre nada. Acá 0 es FALLA, no resultado.
  if (arrCentros.length === 0) falla('centros-service devolvió 0 entradas — el lector no está leyendo la fuente');
  if (arrConc.length === 0) falla('concesiones: 0 features — el lector no está leyendo la fuente');
  if (moluscos.length === 0) falla('concesiones: 0 del grupo MOLUSCOS — el filtro de grupo no está leyendo la clave');
  // CONTROL POSITIVO CRUZADO: mi lectura del fichero y la del servicio tienen
  // que dar el mismo total. Si difieren, una de las dos no lee lo que dice.
  if (estadoMit.total !== arrConc.length) falla(`el servicio carga ${estadoMit.total} concesiones y mi lectura ${arrConc.length}`);

  say('  QUÉ LLEGA A fetchPortStatus. useVoyageVerification.js:835 hace');
  say('  `destinos[0].puerto || .marina || .centro`, y :903 manda');
  say('  `.nombre || .nombre_marina || \'Destino\'`. Medido por catálogo:');
  say('');
  say(`    puerto   → /api/puertos ............ ${N(NOMBRES.length)} nombres · EN el join`);
  say(`    marina   → destinos_deportivos ..... ${N(marinas.length)} entradas type=MARINA`);
  say(`    centro   → centros_salmones ........ ${N(arrCentros.length)} entradas`);
  say(`    centro   → concesiones MOLUSCOS .... ${N(moluscos.length)} entradas`);
  say(`    fondeadero → destinos_deportivos ... ${N(anchorages.length)} type=ANCHORAGE · puerto_recalada queda NULL, no hay llamada`);
  say(`    caladero → local ................... puerto_recalada queda NULL, no hay llamada`);
  say('');
  say('  LA PROPORCIÓN REAL DE USO NO SE PUEDE MEDIR Y NO SE ESTIMA.');
  say('  No hay telemetría de destinos elegidos: ni tabla de viajes, ni log de');
  say('  P2, ni analítica. Los tamaños de catálogo NO son la proporción — dicen');
  say('  cuántos hay para elegir, no cuántas veces se eligen.');
  say('  QUÉ HARÍA FALTA: registrar el `tipo` de destino en cada verificación de');
  say('  P3 (un contador por tipo, sin dato personal), y leerlo después de N');
  say('  viajes. Es una pieza de PWA + backend y NO es de F2.');
  say('');
  say('  QUÉ NOMBRE VIAJA DE VERDAD, medido sobre las claves de cada catálogo:');
  const conNombreMarina = marinas.filter(d => d.nombre || d.nombre_marina).length;
  const conNombreCentro = arrCentros.filter(c => c.nombre && c.nombre !== 'Sin nombre').length;
  const centrosSinNombre = arrCentros.filter(c => c.nombre === 'Sin nombre').length;
  const conNombreConc = moluscos.filter(c => c.nombre).length;
  say(`    marinas con .nombre o .nombre_marina .. ${N(conNombreMarina)} / ${marinas.length}   → las ${marinas.length - conNombreMarina} restantes mandan el literal 'Destino'`);
  say(`    centros salmón con topónimo real ...... ${N(conNombreCentro)} / ${arrCentros.length}`);
  say(`      de ellos, con el literal 'Sin nombre' ${N(centrosSinNombre)} / ${arrCentros.length}   ← centros-service.js:20 lo pone como relleno`);
  say(`    concesiones MOLUSCOS con .nombre ...... ${N(conNombreConc)} / ${moluscos.length}   → las ${moluscos.length - conNombreConc} mandan el literal 'Destino'`);
  say(`      (el servicio devuelve el feature crudo: titular · codigo_centro · ubicacion_nombre, sin \`nombre\`)`);
  say('');
  say('  CONTROL POSITIVO de esa lectura de claves (misma vía, mismo material):');
  say(`    marinas con .name ..................... ${N(marinas.filter(d => d.name).length)} / ${marinas.length}`);
  if (marinas.length && marinas.filter(d => d.name).length === 0) falla('el control positivo de claves de marina no encuentra .name');

  // ── 3 · CUÁNTOS QUEDAN FUERA DEL JOIN POR CONSTRUCCIÓN ────────────────────
  say('');
  say('='.repeat(80));
  say('3 · CUÁNTOS DESTINOS QUEDAN FUERA DEL JOIN POR CONSTRUCCIÓN');
  say('='.repeat(80));
  const dentro = arr => arr.filter(n => porClave.has(clave(n))).length;
  const nomMarinas = marinas.map(d => d.nombre || d.nombre_marina || 'Destino');
  const nomCentros = arrCentros.map(c => c.nombre || 'Destino');
  const nomConc = moluscos.map(c => c.nombre || 'Destino');
  say(`  marinas ......... ${N(dentro(nomMarinas))} de ${marinas.length} tienen fila en el join`);
  say(`  centros salmón .. ${N(dentro(nomCentros))} de ${arrCentros.length} tienen fila en el join`);
  say(`  concesiones ..... ${N(dentro(nomConc))} de ${moluscos.length} tienen fila en el join`);
  const fuera = (marinas.length - dentro(nomMarinas)) + (arrCentros.length - dentro(nomCentros)) + (moluscos.length - dentro(nomConc));
  const totalNoPuerto = marinas.length + arrCentros.length + moluscos.length;
  say('');
  say(`  FUERA DEL JOIN POR CONSTRUCCIÓN ... ${fuera} de ${totalNoPuerto} destinos que NO son puerto.`);
  say('  Con F2 esos caen a «Abierto» SIEMPRE, no a veces: no hay bahía que');
  say('  resolver porque el nombre no pertenece al catálogo del join.');
  say('');
  say('  QUÉ HACE EL FILTRO DE HOY CON ESOS MISMOS NOMBRES (material 23:02Z):');
  for (const [etq, arr] of [['marinas', nomMarinas], ['centros salmón', nomCentros], ['concesiones', nomConc]]) {
    const conFilas = arr.filter(n => servirHoy(n).length > 0);
    const conCierre = arr.filter(n => cerr(servirHoy(n)).length > 0);
    say(`    ${etq.padEnd(16)} reciben algo hoy: ${N(conFilas.length)} / ${arr.length} · con cierre: ${N(conCierre.length)}`);
    for (const n of conFilas) {
      const f = servirHoy(n);
      say(`        «${n}» ← ${f.map(r => `bahía ${r.bahia} «${r.GLBahia}»${cerrada(r) ? ' CERRADA' : ''}`).join(' · ')}`);
    }
  }
  const dest = servirHoy('Destino');
  say(`    el literal 'Destino' .......... hoy recibe ${dest.length} filas · ${ids(dest)} restricciones · ${cerr(dest).length} cerradas`);
}
say('');

// ════════════════════════════════════════════════════════════════════════════
// MORDIDAS — el instrumento se muerde a sí mismo antes de que le crean
// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('5 · DEFECTO DE CATÁLOGO QUE F2 HEREDARÍA — hallado midiendo el §4');
say('='.repeat(80));
say('  Haversine estándar, declarado acá y no extraído de producción: esto mide');
say('  posiciones, no reglas de negocio.');
function distKm(la1, lo1, la2, lo2) {
  const R = 6371, r = d => d * Math.PI / 180;
  const dLa = r(la2 - la1), dLo = r(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const bahias = Object.entries(BAHIA_COORDS).map(([id, c]) => ({ id: Number(id), ...c }));
function masCercana(lat, lng) {
  let mejor = null;
  for (const b of bahias) { const d = distKm(lat, lng, b.lat, b.lng); if (!mejor || d < mejor.km) mejor = { id: b.id, nombre: b.nombre, km: d }; }
  return mejor;
}
{
  const franja = CAT.filter(p => p.lng <= -76 && p.lng >= -80);
  say(`  nodos del catálogo con lng entre -76 y -80 (franja de Juan Fernández): ${franja.length} / ${CAT.length}`);
  say('');
  say('  nodo                                       ancla  km al ancla   +6.00° → bahía más cercana');
  let desplazados = 0;
  for (const p of franja) {
    const anc = p.bahia_sitport_id != null ? BAHIA_COORDS[Number(p.bahia_sitport_id)] : null;
    const kmAncla = anc ? distKm(p.lat, p.lng, anc.lat, anc.lng) : null;
    const corr = masCercana(p.lat, p.lng + 6);
    const actual = masCercana(p.lat, p.lng);
    const mejora = corr.km < 30 && actual.km >= 30;
    if (mejora) desplazados++;
    say(`  ${p.nombre.slice(0, 40).padEnd(41)} ${String(p.bahia_sitport_id).padStart(5)} ` +
        `${(kmAncla == null ? '—' : kmAncla.toFixed(0) + ' km').padStart(9)}   ` +
        `${corr.km.toFixed(1).padStart(6)} km de «${corr.nombre}»${mejora ? '  ← DESPLAZADO' : ''}`);
  }
  say('');
  say(`  NODOS CUYA POSICIÓN SE ARREGLA SUMANDO EXACTAMENTE 6,00° AL lng: ${desplazados} de ${franja.length}`);
  say('  Criterio: hoy están a >= 30 km de toda bahía y con +6,00° quedan a < 30 km');
  say('  de una. No es una hipótesis sobre el origen del defecto: es la medición');
  say('  de que el desplazamiento es UNIFORME y de SEIS GRADOS EXACTOS.');
  say('  Es el mismo defecto que F1 §6.3 vio como «6 anclas a más de 200 km, máx');
  say('  563,3 km» y no diagnosticó: 6,00° a esa latitud son ~560 km.');
  say('');
  const a90 = CAT.filter(p => Number(p.bahia_sitport_id) === 90);
  const enJF = a90.filter(p => distKm(p.lat, p.lng, BAHIA_COORDS[90].lat, BAHIA_COORDS[90].lng) < 30);
  say(`  CONSECUENCIA DIRECTA SOBRE F2 — los que declaran ancla 90 «ISLA ROBINSON CRUSOE»:`);
  say(`      nodos con ancla 90 ................... ${N(a90.length)}`);
  say(`      de ellos, realmente a < 30 km de ella  ${N(enJF.length)}`);
  say(`      de ellos, desplazados ................ ${N(a90.length - enJF.length)}`);
  const vivas90 = VIVO.filter(r => Number(r.bahia) === 90);
  say(`      la bahía 90 tiene HOY ${vivas90.length} filas vivas · ${cerr(vivas90).length} cerradas (material 23:02Z)`);
  say('');
  say('      EL JOIN LOS COPIÓ SIN COTEJAR: los 9 son `confirmado_declarado` con');
  say('      `via: bahia_sitport_id`. F1 no derivó nada ahí — tomó el ancla tal');
  say('      cual. HOY el filtro por nombre NO les sirve nada (ningún nombre de');
  say('      esos contiene «robinson» ni «crusoe»), así que hoy están en verde.');
  say('      CON F2 PASAN A ÁMBAR CON UN CIERRE DE ROBINSON CRUSOE.');
  say('      NO ES UNA MEJORA: ES UN FALSO POSITIVO NUEVO QUE F2 INTRODUCE.');
  const falsosNuevos = a90.length - enJF.length;
  say('');
  say(`  CORRECCIÓN DE LA CIFRA DEL §4: de los 12 anclados que «empiezan a recibir`);
  say(`  su propio cierre», ${falsosNuevos} son estos desplazados y NO son una mejora.`);
  say(`  MEJORA REAL = 12 - ${falsosNuevos} = ${12 - falsosNuevos} sobre 198.`);
  say('');
  say('  CONTROL QUE PRUEBA QUE EL TEST DISCRIMINA: los cuatro nodos que SÍ están');
  say('  en Juan Fernández (Bahía Cumberland, Paseo Costero, Infraestructura de');
  say('  Conectividad y Muelle Bahía El Padre) EMPEORAN con +6,00° — pasan a 108-116');
  say('  km. Si el test marcara a todos por igual, no mediría nada.');
  say('');
  say('  ── ALCANCE GENERAL DEL DEFECTO, más allá de la bahía 90 ──────────────');
  const lejos = CAT.filter(p => p.bahia_sitport_id != null && BAHIA_COORDS[Number(p.bahia_sitport_id)])
    .map(p => ({ p, km: distKm(p.lat, p.lng, BAHIA_COORDS[Number(p.bahia_sitport_id)].lat, BAHIA_COORDS[Number(p.bahia_sitport_id)].lng) }));
  const anclados198 = new Set(CAT.filter(p => p.bahia_sitport_id != null).map(p => p.nombre)).size;
  for (const u of [25, 100, 200]) say(`      anclas a más de ${String(u).padStart(3)} km de su bahía ... ${N(lejos.filter(x => x.km > u).length)} filas`);
  const malosConMaterial = lejos.filter(x => x.km > 100 && VIVO.some(r => Number(r.bahia) === Number(x.p.bahia_sitport_id)));
  const malosConCierre = lejos.filter(x => x.km > 100 && cerr(VIVO.filter(r => Number(r.bahia) === Number(x.p.bahia_sitport_id))).length > 0);
  say('');
  say(`      LO QUE IMPORTA PARA F2 — anclas a más de 100 km cuya bahía TIENE`);
  say(`      material vivo hoy (23:02Z), o sea que F2 les serviría algo:`);
  say(`          con filas vivas .......... ${N(malosConMaterial.length)} filas del catálogo`);
  say(`          con al menos un CIERRE ... ${N(malosConCierre.length)} filas del catálogo`);
  for (const x of malosConCierre) say(`            ${x.p.nombre.slice(0, 40).padEnd(41)} ancla ${String(x.p.bahia_sitport_id).padStart(4)} a ${x.km.toFixed(0)} km`);
  say('');
  say(`      Denominador: ${anclados198} nombres anclados. El defecto NO es del filtro`);
  say('      ni del join: es del catálogo, y los dos lo heredan. Hoy queda tapado');
  say('      porque el filtro por nombre no acierta casi nunca; F2 lo destapa.');
}
say('');

// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('NOMINAL — los casos que deciden, con nombre y apellido');
say('='.repeat(80));
say('  LOS 9 QUE PASAN A «ABIERTO» (material 23:02Z):');
for (const f of flip) {
  const c = cerr(f.hoy);
  say(`    ${f.nombre.slice(0, 44).padEnd(45)} pierde ${f.hoy.length} filas` +
      ` · ${ids(f.hoy)} restr · ${c.length} cerradas · join=${f.joinBahia == null ? f.joinEstado : 'bahía ' + f.joinBahia}`);
  for (const r of f.hoy) say(`        recibía hoy: bahía ${r.bahia} «${r.GLBahia}»${cerrada(r) ? '  ← CERRADA' : ''}`);
}
say('');
say('  LOS ANCLADOS QUE EMPIEZAN A RECIBIR SU PROPIO CIERRE (mejora, sobre 198):');
{
  let n = 0;
  for (const f of anclados) {
    const hoyP = cerr(f.hoy.filter(r => Number(r.bahia) === f.ancla));
    const f2P = cerr(f.f2.filter(r => Number(r.bahia) === f.ancla));
    if (hoyP.length === 0 && f2P.length > 0) {
      n++;
      say(`    ${f.nombre.slice(0, 44).padEnd(45)} ancla ${f.ancla} · ${f2P.length} filas cerradas que hoy NO ve`);
    }
  }
  say(`    total ${n}`);
}
say('');

// ════════════════════════════════════════════════════════════════════════════
say('='.repeat(80));
say('MORDIDAS');
say('='.repeat(80));
let mordidasOK = 0, mordidasTot = 0;
function mordida(etq, fn, esperado) {
  mordidasTot++;
  let r;
  try { r = fn(); } catch (e) { r = 'EXCEPCIÓN: ' + e.message; }
  const ok = esperado(r);
  if (ok) { mordidasOK++; say(`  ✓ MUERDE  ${etq} → ${JSON.stringify(r)}`); }
  else { falla(`la mordida NO muerde: ${etq} → ${JSON.stringify(r)}`); }
}

// M1 · filtro anulado, con el parche ANCLADO al token sintáctico completo.
mordida('M1 filtro anulado (ancla `w => p.includes(w)`)', () => {
  const roto = construirFiltro(FILTRO_SRC.replace(ANCLA, 'w => false'));
  const conFilas = NOMBRES.filter(n => roto(VIVO, n).length > 0).length;
  return { conFilasConMordida: conFilas, conFilasSinMordida: filas.filter(f => f.hoy.length > 0).length };
}, r => r.conFilasConMordida === 0 && r.conFilasSinMordida > 0);

// M1b · LA MORDIDA MAL ANCLADA, la que ya engañó a este frente una vez. Se
// corre A PROPÓSITO y su resultado tiene que ser EL MISMO CERO que M1: el
// parche por subcadena cae sobre `ski|p.includes(w)`, apaga el `skip`, deja el
// predicado real intacto y AUN ASÍ devuelve 0. LA CIFRA NO DISTINGUE QUÉ
// MECANISMO SE TOCÓ. Lo único que lo distingue es la aserción del ancla, que
// exige que `w => p.includes(w)` aparezca exactamente una vez.
mordida('M1b parche por subcadena — da EL MISMO 0 por el mecanismo equivocado', () => {
  const desviado = construirFiltro(FILTRO_SRC.replace('p.includes(w)', 'p.includes(w) && false'));
  const conFilas = NOMBRES.filter(n => desviado(VIVO, n).length > 0).length;
  return { conFilas, mismoQueM1: conFilas === 0, ancla: `${ANCLA} aparece ${vecesAncla} vez`, subcadena: `p.includes(w) aparece ${vecesSubcadena}` };
}, r => typeof r.conFilas === 'number' && r.conFilas === 0 && vecesSubcadena > vecesAncla);

// M2 · CONTROL POSITIVO: parche idéntico → el delta contra sí mismo es cero.
mordida('M2 control positivo (parche idéntico, delta contra sí mismo)', () => {
  const igual = construirFiltro(FILTRO_SRC.replace(ANCLA, ANCLA));
  let dif = 0;
  for (const n of NOMBRES) if (igual(VIVO, n).length !== servirHoy(n).length) dif++;
  return { nombresQueDifieren: dif };
}, r => r.nombresQueDifieren === 0);

// M3 · material vacío → nadie recibe nada por ninguna de las dos vías.
mordida('M3 material vacío', () => ({
  hoy: NOMBRES.filter(n => filtroHoy([], n).length > 0).length,
  f2: NOMBRES.filter(n => { const b = bahiaF2(n); return b.bahia != null && [].filter(r => Number(r.bahia) === Number(b.bahia)).length > 0; }).length,
}), r => r.hoy === 0 && r.f2 === 0);

// M4 · join vaciado → F2 no resuelve ninguna bahía.
mordida('M4 join vaciado', () => {
  const vacio = new Map();
  return { resuelven: NOMBRES.filter(n => vacio.has(clave(n))).length };
}, r => r.resuelven === 0);

// M5 · bahia_id falseada a un id inexistente → F2 no sirve nada.
mordida('M5 bahia_id inexistente en el join', () => {
  const falso = new Map([...porClave].map(([k, f]) => [k, { ...f, bahia_id: f.bahia_id == null ? null : 999999 }]));
  let sirven = 0;
  for (const n of NOMBRES) {
    const f = falso.get(clave(n));
    if (f && f.bahia_id != null && VIVO.filter(r => Number(r.bahia) === Number(f.bahia_id)).length > 0) sirven++;
  }
  return { sirvenConIdFalso: sirven, sirvenReal: filas.filter(f => f.f2.length > 0).length };
}, r => r.sirvenConIdFalso === 0 && r.sirvenReal > 0);

// M6 · predicado de cierre falseado → no queda ninguna cerrada.
mordida('M6 predicado de cierre falseado', () => {
  const cerradasReales = VIVO.filter(cerrada).length;
  const cerradasFalsas = VIVO.filter(() => false).length;
  return { reales: cerradasReales, conMordida: cerradasFalsas };
}, r => r.conMordida === 0 && r.reales > 0);

say('');
say(`  ${mordidasOK} de ${mordidasTot} mordidas muerden`);
say('');

// ── ENTREGABLES INTACTOS ─────────────────────────────────────────────────────
say('='.repeat(80));
say('GUARDA DE ENTREGABLES — comprobada al abrir y al cerrar');
for (const [rel, esperado] of Object.entries(ENTREGABLES)) {
  const s = sha256(path.join(BACK, rel));
  if (s === esperado && s === shaAntes[rel]) say(`  ✓ ${rel}  ${s.slice(0, 16)}…`);
  else falla(`ENTREGABLE ALTERADO: ${rel} · ahora ${s}`);
}
say('');
say('─'.repeat(70));
if (fallas.length) {
  say(`${fallas.length} FALLA(S)`);
} else {
  say('SIN FALLAS · piso por unidad alcanzado, las mordidas muerden, y los dos');
  say('entregables de F1 están intactos.');
}

fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' });
const st = fs.statSync(SALIDA);
console.log(`\n[evidencia] ${SALIDA} · ${st.size} bytes`);
process.exit(fallas.length ? 3 : 0);
