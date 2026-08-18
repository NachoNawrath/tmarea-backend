// ─────────────────────────────────────────────────────────────────────────────
// M4 — LOS 55 DESEMPATES DE C3 (no 50: ver entrada (18) de la lista única).
//
// PREGUNTA: de las filas que `C3_comuna_vs_bahia` resolvió, ¿cuántas eligieron
// una bahía MÁS LEJANA que otra candidata del mismo empate QUE TENÍA MATERIAL
// VIVO? ¿Y cuántas de ésas con CIERRE? En FILAS y en RESTRICCIONES.
//
// SOLO LEE. No invoca ningún instrumento de F1, no toca la base, no toca `src/`.
// Comprueba el sha256 de los dos entregables de F1 al abrir y al cerrar.
//
// MATERIAL, y va con su hora porque ninguna cifra viva vale sin ella:
//   ARTEFACTO  data/catalogo/join_puerto_bahia.json · sha256 dfd07236…
//   VIVO       insumos/CONGELADO_vivo.json · 2026-08-17T23:02:53.110Z · clase (A)
// EL «MATERIAL VIVO» DE ESTE INSTRUMENTO ES ESA CAPTURA DE 26 FILAS, NO el
// sondaje de 444 filas contra el que F1 midió `alguna_candidata_con_cierres`.
// Son dos corpus distintos y las cifras NO se comparan entre sí.
//
// El criterio de CIERRE se importa VERBATIM de producción
// (`src/services/cierre-derivador.js`), igual que hizo F1. No se reimplementa.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BACK = 'C:/Users/katia/tmarea-backend';
const INS = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/insumos');
const SALIDA = process.argv[2] || path.join(__dirname, '09_medir_c3_desempates.txt');

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const falla = m => { fallas.push(m); say('  ✗ FALLA · ' + m); };
const exigir = (n, cond, detalle) => {
  if (cond) say(`  ✓ ${n} · ${detalle}`);
  else { fallas.push(n); say(`  ✗ ROJO EXIGIDO Y NO SALIÓ · ${n} · ${detalle}`); }
};
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const N3 = n => String(n).padStart(3);
const cerrar = () => {
  fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' });
  console.log(`\n[evidencia] ${SALIDA} · ${fs.statSync(SALIDA).size} bytes`);
  process.exit(fallas.length ? 2 : 0);
};

const RUTA_JOIN = path.join(BACK, 'data/catalogo/join_puerto_bahia.json');
const RUTA_TSV = path.join(__dirname, 'F1_adjudicacion.tsv');
const RUTA_VIVO = path.join(INS, 'CONGELADO_vivo.json');
const RUTA_ROUTES = path.join(BACK, 'src/routes/sitport-routes.js');
const SHA_JOIN = 'dfd072361faa5607b7c487b73d5d45796d16ec10cbd99a613a5df7db351168f5';
const SHA_TSV = '0ca33c18e48229eba257573ff662cfb2f770e62b24d53354aae220c8d72a1788';
const HORA_VIVO = '2026-08-17T23:02:53.110Z';

say('='.repeat(80));
say('M4 · LOS 55 DESEMPATES DE C3 — ¿cuántos eligieron más lejos que material vivo?');
say(`corrida ${new Date().toISOString()}`);
say('='.repeat(80));

// ── 0 · GUARDS DE INSUMO ────────────────────────────────────────────────────
say('\n0 · GUARDS DE INSUMO — antes de contar nada');
const shaJoinAbre = sha256(RUTA_JOIN), shaTsvAbre = sha256(RUTA_TSV);
if (shaJoinAbre !== SHA_JOIN) falla(`join_puerto_bahia.json sha256 ${shaJoinAbre.slice(0, 8)}… ≠ dfd07236…`);
else say(`  ✓ join_puerto_bahia.json sha256 dfd07236… — el artefacto es el declarado`);
if (shaTsvAbre !== SHA_TSV) falla(`F1_adjudicacion.tsv sha256 ${shaTsvAbre.slice(0, 8)}… ≠ 0ca33c18…`);
else say(`  ✓ F1_adjudicacion.tsv sha256 0ca33c18… — intacta`);

const VIVO = JSON.parse(fs.readFileSync(RUTA_VIVO, 'utf8'));
if (VIVO.congelado_en !== HORA_VIVO) falla(`CONGELADO_vivo.json congelado_en «${VIVO.congelado_en}» ≠ ${HORA_VIVO}`);
else say(`  ✓ CONGELADO_vivo.json congelado_en ${HORA_VIVO}`);
const FILAS_VIVAS = (VIVO.cuerpo && VIVO.cuerpo.data) || [];
if (FILAS_VIVAS.length !== 26 || VIVO.n !== 26) falla(`CONGELADO_vivo.json ${FILAS_VIVAS.length} filas (n=${VIVO.n}) — se esperaban 26`);
else say(`  ✓ CONGELADO_vivo.json 26 filas`);
if (fallas.length) { say('\nINSUMO NO VERIFICADO — no se mide nada.'); cerrar(); }

const J = JSON.parse(fs.readFileSync(RUTA_JOIN, 'utf8'));
const C3 = J.filas.filter(f => f.estado === 'desempatado' && f.via === 'C3_comuna_vs_bahia');
say(`  ✓ filas con estado=desempatado y via=C3_comuna_vs_bahia: ${C3.length}`);
if (C3.length !== 55) falla(`se esperaban 55 filas de C3 y hay ${C3.length} — entrada (18) de la lista única`);

// PISO POR UNIDAD, no un total distinto de cero: con material vacío o con
// empates de una sola candidata, un instrumento mal hecho informa OK.
let sinEmpate = 0, sinKm = 0;
for (const f of C3) {
  const e = (f.evidencia && f.evidencia.empate_entre) || [];
  if (e.length < 2) sinEmpate++;
  if (typeof f.evidencia.elegida_km !== 'number') sinKm++;
}
if (sinEmpate) falla(`${sinEmpate} de las ${C3.length} filas de C3 tienen menos de 2 candidatas — no hay empate que desempatar`);
else say(`  ✓ piso por unidad · las ${C3.length} filas tienen ≥ 2 candidatas`);
if (sinKm) falla(`${sinKm} filas de C3 sin \`elegida_km\` numérico — la distancia no se puede comparar`);
else say(`  ✓ piso por unidad · las ${C3.length} filas traen \`elegida_km\` numérico`);

// ── 1 · (19)-O2 · LECTURA BASE DEL LITERAL DE BAHIA_COORDS ──────────────────
// El guard PROPIAMENTE DICHO —«el literal sigue extrayéndose DESPUÉS del
// cambio»— va en el instrumento que verifique la escritura de F2. Esto es la
// lectura de ANTES, para que aquella tenga contra qué comparar.
// Importa porque `src/services/catalogo-bahias.js:131` es PRODUCCIÓN, lee este
// fichero como texto y TIRA si el literal falta — y la suite no lo ve.
say('\n1 · (19)-O2 · LECTURA BASE DEL LITERAL — `const BAHIA_COORDS = {`');
const TOKEN = 'const BAHIA_COORDS = {';
const TOKEN_FALSO = 'const BAHIA_COORDENADAS = {';
function extraer(src, token) {
  const i = src.indexOf(token);
  if (i < 0) return null;
  const j = src.indexOf('\n};', i);
  if (j < 0) return null;
  const bloque = src.slice(i, j + 3);
  const claves = (bloque.match(/^\s*(\d+)\s*:/gm) || []).length;
  return { bloque, claves };
}
const SRC_ROUTES = fs.readFileSync(RUTA_ROUTES, 'utf8');
const base = extraer(SRC_ROUTES, TOKEN);
if (!base) falla(`no se extrae ${TOKEN} de src/routes/sitport-routes.js — es falla, no «no aplicable»`);
else if (base.claves === 0) falla('BAHIA_COORDS se extrae pero queda sin entradas legibles — piso por unidad');
else say(`  ✓ el literal se extrae · ${base.claves} bahías con coordenada · bloque ${base.bloque.length} bytes`);
// CONTROL POSITIVO junto al grep: el buscador TIENE que poder no encontrar.
exigir('CP-1 · el extractor discrimina',
  extraer(SRC_ROUTES, TOKEN_FALSO) === null,
  `un literal deliberadamente falso (${TOKEN_FALSO}) NO se encuentra — si se «encontrara», el hallazgo de arriba no diría nada`);
// MORDIDA, anclada al TOKEN SINTÁCTICO COMPLETO, sobre una copia en memoria.
const SRC_MORDIDO = SRC_ROUTES.replace(TOKEN, 'const COORDENADAS_DE_BAHIA = {');
exigir('M-D · mordida del literal',
  SRC_ROUTES !== SRC_MORDIDO && extraer(SRC_MORDIDO, TOKEN) === null,
  'renombrando el token completo, el extractor se pone en ROJO — es el defecto que catalogo-bahias.js tira y la suite no ve');

// ── 2 · MATERIAL VIVO POR BAHÍA ─────────────────────────────────────────────
say(`\n2 · MATERIAL VIVO POR BAHÍA — captura ${HORA_VIVO}`);
const { derivarCierre } = require(path.join(BACK, 'src/services/cierre-derivador.js'));
function indexar(filas, derivar) {
  const m = new Map();
  for (const r of filas) {
    const b = Number(r.bahia);
    if (!m.has(b)) m.set(b, { filas: 0, restr: new Set(), cierres: 0, restrCerradas: new Set() });
    const e = m.get(b);
    e.filas++;
    if (r.IDRestriccion !== null && r.IDRestriccion !== undefined) e.restr.add(String(r.IDRestriccion));
    if (derivar(r).estado === 'cerrado') {
      e.cierres++;
      if (r.IDRestriccion !== null && r.IDRestriccion !== undefined) e.restrCerradas.add(String(r.IDRestriccion));
    }
  }
  return m;
}
const MAT = indexar(FILAS_VIVAS, derivarCierre);
const totFilas = [...MAT.values()].reduce((a, e) => a + e.filas, 0);
const totCierres = [...MAT.values()].reduce((a, e) => a + e.cierres, 0);
say(`  bahías con material ....... ${N3(MAT.size)}`);
say(`  filas ..................... ${N3(totFilas)}`);
say(`  restricciones distintas ... ${N3(new Set(FILAS_VIVAS.map(r => String(r.IDRestriccion))).size)}`);
say(`  filas cerradas ............ ${N3(totCierres)}`);
if (MAT.size !== 15) falla(`se esperaban 15 bahías con material y hay ${MAT.size}`);
if (totCierres === 0) falla('cero filas cerradas en el material — con cero cierres el conteo «con cierre» informa OK sin probar nada');

// ── 3 · M4 ──────────────────────────────────────────────────────────────────
say('\n3 · M4 · LAS FILAS DE C3 QUE ELIGIERON MÁS LEJOS QUE UNA CANDIDATA CON MATERIAL');
say('    «más lejos» = km de la elegida > km de la rival, con los km del artefacto (2 decimales).');
function medir(filas, mat) {
  const casos = [];
  for (const f of filas) {
    const kmEleg = f.evidencia.elegida_km;
    const rivales = f.evidencia.empate_entre
      .filter(x => x.bahia_id !== f.bahia_id && x.km < kmEleg && mat.has(x.bahia_id))
      .sort((a, b) => a.km - b.km);
    if (!rivales.length) continue;
    const conCierre = rivales.filter(x => mat.get(x.bahia_id).cierres > 0);
    casos.push({ f, kmEleg, rivales, conCierre, elegidaConMaterial: mat.has(f.bahia_id) });
  }
  return casos;
}
const CASOS = medir(C3, MAT);
const CON_CIERRE = CASOS.filter(c => c.conCierre.length > 0);
const PERDIDA_LIMPIA = CASOS.filter(c => !c.elegidaConMaterial);

const sumaFilas = cs => cs.reduce((a, c) => a + c.rivales.reduce((x, r) => x + MAT.get(r.bahia_id).filas, 0), 0);
const sumaRestr = cs => { const s = new Set(); for (const c of cs) for (const r of c.rivales) for (const id of MAT.get(r.bahia_id).restr) s.add(id); return s.size; };
const sumaRestrCerr = cs => { const s = new Set(); for (const c of cs) for (const r of c.conCierre) for (const id of MAT.get(r.bahia_id).restrCerradas) s.add(id); return s.size; };

say(`\n  de las ${C3.length} filas de C3 …`);
say(`    eligieron una bahía MÁS LEJANA que otra candidata CON MATERIAL VIVO ... ${N3(CASOS.length)} / ${C3.length}`);
say(`    de ésas, la candidata más cercana tiene además un CIERRE ............... ${N3(CON_CIERRE.length)} / ${C3.length}`);
say(`    de ésas, la ELEGIDA no tiene ningún material (pérdida limpia) .......... ${N3(PERDIDA_LIMPIA.length)} / ${C3.length}`);
say(`\n  EN FILAS Y EN RESTRICCIONES, material que queda del otro lado (captura ${HORA_VIVO}):`);
say(`    filas vivas en las rivales más cercanas ......... ${N3(sumaFilas(CASOS))}`);
say(`    restricciones distintas en esas rivales ......... ${N3(sumaRestr(CASOS))}`);
say(`    restricciones CERRADAS distintas ................ ${N3(sumaRestrCerr(CON_CIERRE))}`);

say('\n  CADA CASO, CON NOMBRE:');
for (const c of CASOS) {
  const r = c.rivales[0], m = MAT.get(r.bahia_id);
  const eleg = MAT.has(c.f.bahia_id) ? `${MAT.get(c.f.bahia_id).filas} filas` : 'SIN material';
  say(`    nodo ${N3(c.f.nodo_id)} ${c.f.nombre.slice(0, 32).padEnd(32)} comuna ${String(c.f.comuna).slice(0, 14).padEnd(14)}`);
  say(`             eligió ${N3(c.f.bahia_id)} a ${String(c.kmEleg).padStart(5)} km · ${eleg}`);
  say(`             había  ${N3(r.bahia_id)} «${r.nombre.replace(/\s+/g, ' ').slice(0, 30)}» a ${String(r.km).padStart(5)} km · ${m.filas} filas · ${m.restr.size} restr · ${m.cierres} cerradas`);
}
if (!CASOS.length) say('    (ninguno)');

// ── 3-bis · LA MISMA PREGUNTA SIN EL MATERIAL ───────────────────────────────
// El «1 de 55» de arriba está acotado por el material, no por la cascada: sólo
// 15 de las 163 bahías tienen algo a esta hora. Una cascada sistemáticamente
// mal ordenada daría también ~1 contra una captura de 26 filas. Esta cuenta no
// mira el material, así que no se mueve con la hora.
say('\n3-bis · SIN MIRAR EL MATERIAL — cuántas de C3 eligieron más lejos, a secas');
const masLejos = fs2 => fs2.filter(f => f.evidencia.empate_entre.some(x => x.bahia_id !== f.bahia_id && x.km < f.evidencia.elegida_km));
const DESEMP = J.filas.filter(f => f.estado === 'desempatado');
const c3Lejos = masLejos(C3), todoLejos = masLejos(DESEMP);
say(`    de las ${C3.length} de C3, eligieron más lejos que alguna candidata ... ${N3(c3Lejos.length)} / ${C3.length}`);
say(`    de las ${DESEMP.length} desempatadas, lo mismo ......................... ${N3(todoLejos.length)} / ${DESEMP.length}`);
say(`    de las ${c3Lejos.length} de C3, con material en la más cercana ........... ${N3(CASOS.length)}`);
say('    ES LA CUENTA QUE NO DEPENDE DE LA HORA. La de arriba sí.');

// GUAYACÁN — el caso ya visto en §5.2/§7.1. Si el instrumento no lo encuentra,
// el instrumento está mal. Va como aserción, no como comentario.
const guayacan = CASOS.find(c => c.f.nodo_id === 59);
exigir('CP-2 · el caso conocido aparece',
  !!guayacan && guayacan.f.bahia_id === 85 && guayacan.rivales.some(r => r.bahia_id === 86),
  guayacan ? 'nodo 59 Caleta Pesquera Guayacán: eligió la 85 a 2.1 km y la 86 a 0 km tiene material — §5.2/§7.1'
           : 'nodo 59 NO aparece en el resultado — el instrumento no mide lo que dice medir');

// ── 4 · MORDIDAS ────────────────────────────────────────────────────────────
// Defecto inyectado y rojo exigido. Cada una golpea UN mecanismo, y se exige
// que las otras no se muevan: en este frente una mordida ya informó verde con
// un número creíble por pegarle al mecanismo equivocado.
say('\n4 · MORDIDAS — defecto inyectado, rojo exigido');

// M-A · mover la elegida de Guayacán a la 86 (la de 0 km). El caso TIENE que
// desaparecer: ya no eligió más lejos que nadie con material.
const C3_A = C3.map(f => f.nodo_id !== 59 ? f
  : { ...f, bahia_id: 86, evidencia: { ...f.evidencia, elegida_km: 0 } });
const CASOS_A = medir(C3_A, MAT);
exigir('M-A · la comparación de distancia',
  !CASOS_A.some(c => c.f.nodo_id === 59) && CASOS_A.length === CASOS.length - 1,
  `moviendo la elegida del nodo 59 a la bahía 86 (0 km), el caso desaparece: ${CASOS.length} → ${CASOS_A.length}`);

// M-B · material vacío. El conteo TIENE que caer a 0 y no a «casi 0».
const CASOS_B = medir(C3, indexar([], derivarCierre));
exigir('M-B · el instrumento mira el material',
  CASOS_B.length === 0,
  `con el material vivo vaciado, los casos caen a ${CASOS_B.length} (se exige 0)`);

// M-C · doble de `derivarCierre` que nunca cierra. TIENE que caer «con cierre»
// y NO tiene que moverse «con material»: son dos mecanismos distintos.
const MAT_C = indexar(FILAS_VIVAS, () => ({ estado: 'abierto' }));
const CASOS_C = medir(C3, MAT_C);
const CON_CIERRE_C = CASOS_C.filter(c => c.conCierre.length > 0);
exigir('M-C · cierre y material no son el mismo mecanismo',
  CON_CIERRE_C.length === 0 && CASOS_C.length === CASOS.length,
  `sin derivarCierre: «con cierre» ${CON_CIERRE.length} → ${CON_CIERRE_C.length} y «con material» ${CASOS.length} → ${CASOS_C.length} (se exige que NO se mueva)`);
// M-C ES TAUTOLÓGICA EN LA MITAD «con cierre» Y SE DICE: la base ya vale 0, así
// que bajarla a 0 no prueba nada. Se recorta su alcance —prueba sólo que tocar
// el cierre NO mueve el material— y se le agrega la mordida que sí muerde.
say('    (M-C no prueba la mitad «con cierre»: la base ya es 0. Lo prueba M-C2.)');

// M-C2 · doble que cierra TODO. «con cierre» tiene que SUBIR hasta igualar los
// casos, y «con material» tiene que quedarse quieto.
const MAT_C2 = indexar(FILAS_VIVAS, () => ({ estado: 'cerrado' }));
const CASOS_C2 = medir(C3, MAT_C2);
const CON_CIERRE_C2 = CASOS_C2.filter(c => c.conCierre.length > 0);
exigir('M-C2 · el conteo de cierres se mueve cuando el cierre se mueve',
  CON_CIERRE_C2.length === CASOS.length && CASOS.length > 0 && CASOS_C2.length === CASOS.length,
  `con derivarCierre cerrando todo: «con cierre» ${CON_CIERRE.length} → ${CON_CIERRE_C2.length} (se exige ${CASOS.length}) y «con material» ${CASOS.length} → ${CASOS_C2.length} (se exige que NO se mueva)`);

// ── 5 · CIERRE ──────────────────────────────────────────────────────────────
say('\n5 · CIERRE — sha256 de los entregables de F1, otra vez');
const shaJoinCierra = sha256(RUTA_JOIN), shaTsvCierra = sha256(RUTA_TSV);
if (shaJoinCierra !== SHA_JOIN) falla(`join_puerto_bahia.json CAMBIÓ durante la corrida: ${shaJoinCierra.slice(0, 8)}…`);
else say('  ✓ join_puerto_bahia.json dfd07236… — sin tocar');
if (shaTsvCierra !== SHA_TSV) falla(`F1_adjudicacion.tsv CAMBIÓ durante la corrida: ${shaTsvCierra.slice(0, 8)}…`);
else say('  ✓ F1_adjudicacion.tsv 0ca33c18… — sin tocar');

say('\n' + '='.repeat(80));
say(fallas.length ? `FALLAS: ${fallas.length}` : 'SIN FALLAS');
say('QUÉ NO PRUEBA ESTE INSTRUMENTO: no dice cuál es la bahía correcta; dice qué');
say('material queda del otro lado de la elección. No mira los 47 de C2, los 6 de');
say('C4 ni el 1 de C5. Y mide contra UNA captura de 26 filas: con otro material a');
say('otra hora, los mismos 55 desempates dan otro número.');
say('='.repeat(80));
cerrar();
