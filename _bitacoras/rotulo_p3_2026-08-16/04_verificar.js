'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 04_verificar.js — VERIFICACION DEL TRAMO A. Solo mide. No escribe nada.
//
// Corrida:  node _bitacoras/rotulo_p3_2026-08-16/04_verificar.js
// Shell declarada (CLAUDE.md §7.3): identica en PowerShell y en Git Bash.
//
// ANCLADO AL COMMIT FIJO `9bbd80a`, no a HEAD. Un verificador que se compare
// contra HEAD deja de medir en cuanto alguien commitea.
//
// LA VERDAD DE REFERENCIA NO SALE DEL RESOLVEDOR. V1 y V8 reconstruyen el
// escalon esperado leyendo el insumo de reparticiones POR SU CUENTA, con su
// propio desarmado. Un guard que construye su universo del mismo codigo que
// valida es tautologico y no puede fallar.
//
// COMPARACIONES EFECTIVAS: cada V cuenta las suyas y el verificador aborta si
// alguna da cero — un cero no distingue "paso" de "no midio".
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const PWA  = path.join(RAIZ, '..', 'tmarea-pwa');
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);

const FALLAS = [], NO_MEDIBLE = [];
const fallar = m => FALLAS.push(m);

const ANCLA = '9bbd80a364b38fdacf7b793c62a1cab59b2a400a';
const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_DER  = 'data/contacto/reparticiones_publicadas.json';
const P_RUT  = 'src/routes/sitport-routes.js';
const P_RES  = 'src/services/contacto-por-escalon.js';

const { normalizarTexto } = require(abs('src/utils/normalizarTexto'));
const { contactoPorEscalon } = require(abs(P_RES));

const dig = t => String(t == null ? '' : t).replace(/[^0-9]/g, '');
const delAncla = p => execFileSync('git', ['show', `${ANCLA}:${p}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' });

L('================================================================================');
L('VERIFICACION DEL TRAMO A — el escalon de INV-10.1, resuelto en el backend');
L(`Ancla: commit fijo ${ANCLA}`);
L('================================================================================');

L('');
L('=== LINEA BASE ===');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim();
L(`  HEAD : ${head}   (ancla ${ANCLA})`);
if (head !== ANCLA) NO_MEDIBLE.push(`HEAD es ${head}: la comparacion contra el ancla no seria del arbol de esta pieza`);

const mapaHoy   = JSON.parse(fs.readFileSync(abs(P_MAPA), 'utf8'));
const mapaAncla = JSON.parse(delAncla(P_MAPA));
const claves = Object.keys(mapaHoy);

// ── verdad de referencia, construida aparte del resolvedor ───────────────────
const der = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8')).reparticiones;
const REF = new Map();  // nombre normalizado -> Set(digitos)
for (const r of Object.values(der)) {
  if (!r || !r.nombre_publicado) continue;
  const k = normalizarTexto(r.nombre_publicado);
  if (!REF.has(k)) REF.set(k, new Set());
  for (const t of String(r.telefono == null ? '' : r.telefono).split(/ó|\//)) {
    const d = dig(t);
    if (d.length >= 8) REF.get(k).add(d);
  }
}
// El escalon que la referencia espera, derivado del invariante y no del codigo.
function escalonEsperado(e) {
  if (!e) return null;
  const tel = e.telefono == null ? '' : String(e.telefono);
  if (tel.trim() === '') return null;
  const cap = e.capitania == null ? '' : String(e.capitania).trim();
  if (cap !== '') {
    const tels = REF.get(normalizarTexto(cap));
    if (tels && tels.has(dig(tel))) return 'capitania';
  }
  const gob = e.gobernacion == null ? '' : String(e.gobernacion).trim();
  if (gob !== '') return 'gobernacion';
  return null;
}

// ── V1 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V1 — el resolvedor coincide con la referencia, entrada por entrada ===');
L('  La referencia se construyo arriba leyendo el insumo por su cuenta.');
let v1 = 0; const v1dif = [];
const casillas = { capitania: 0, gobernacion: 0, nulo: 0 };
for (const k of claves) {
  v1++;
  const r = contactoPorEscalon(mapaHoy[k]);
  const esp = escalonEsperado(mapaHoy[k]);
  if (r.nivel !== esp) v1dif.push(`${k}: resolvedor=${JSON.stringify(r.nivel)} referencia=${JSON.stringify(esp)}`);
  if (r.nivel === null) casillas.nulo++; else casillas[r.nivel]++;
}
L(`  COMPARACIONES EFECTIVAS : ${v1}`);
if (v1 === 0) NO_MEDIBLE.push('V1 con cero comparaciones');
L(`  entradas donde difieren : ${v1dif.length}${v1dif.length ? ' -> ' + v1dif.slice(0, 10).join(' · ') : ''}`);
if (v1dif.length) fallar(`V1: ${v1dif.length} entradas donde el resolvedor y la referencia no coinciden`);

// ── V2 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V2 — la particion cierra contra el denominador declarado ===');
const suma = casillas.capitania + casillas.gobernacion + casillas.nulo;
L(`    escalon 1 (capitania)      : ${String(casillas.capitania).padStart(3)}`);
L(`    escalon 2 (gobernacion)    : ${String(casillas.gobernacion).padStart(3)}`);
L(`    escalon 3 (no se muestra)  : ${String(casillas.nulo).padStart(3)}`);
L(`    ${'-'.repeat(34)}`);
L(`    SUMA                       : ${String(suma).padStart(3)}  de ${claves.length}`);
if (suma !== claves.length) fallar(`V2: la particion suma ${suma} y las entradas son ${claves.length}`);
L('');
L('  Contra lo medido en `01_medir_precedencia.txt`: E1=99 · E2=56+9=65 · E3=0.');
L('  Las 9 de E1x bajan al escalon 2 por decision declarada en el plan, asi que');
L('  el escalon 2 del resolvedor tiene que dar 65 y no 56.');
if (casillas.capitania !== 99) fallar(`V2: el escalon 1 da ${casillas.capitania} y la medicion previa dio 99`);
if (casillas.gobernacion !== 65) fallar(`V2: el escalon 2 da ${casillas.gobernacion} y la medicion previa dio 65 (56 + 9 de E1x)`);
if (casillas.nulo !== 0) fallar(`V2: el escalon 3 da ${casillas.nulo} y la medicion previa dio 0`);

// ── V3 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V3 — LA AFIRMACION CENTRAL: ningun escalon 1 sobre un numero ajeno ===');
L('  Si el nivel es "capitania", el numero TIENE que ser el que la fuente publica');
L('  para esa Capitania. Es lo unico que esta pieza promete y lo que INV-10.1 pide.');
let v3 = 0; const v3mal = [];
for (const k of claves) {
  const r = contactoPorEscalon(mapaHoy[k]);
  if (r.nivel !== 'capitania') continue;
  v3++;
  const tels = REF.get(normalizarTexto(String(r.nombre)));
  if (!tels || !tels.has(dig(r.telefono)))
    v3mal.push(`${k}: rotula Capitania "${r.nombre}" con ${r.telefono}, que la fuente no le publica`);
}
L(`  COMPARACIONES EFECTIVAS (entradas en escalon 1) : ${v3}`);
if (v3 === 0) NO_MEDIBLE.push('V3 con cero comparaciones: ninguna entrada llego al escalon 1');
L(`  entradas mal rotuladas : ${v3mal.length}${v3mal.length ? ' -> ' + v3mal.join(' · ') : ''}`);
if (v3mal.length) fallar(`V3: ${v3mal.length} entradas rotulan Capitania sobre un numero ajeno`);

// ── V4 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V4 — las 9 que mandan a otra reparticion NO alcanzan el escalon 1 ===');
L('  Son el caso que romperia el fundamento de la pieza (§1.2): la vara vieja las');
L('  cuenta como acierto. Se nombran una por una y se exige el escalon 2.');
const E1X = ['75', '84', '88', '107', '144', '145', '146', '170', '180'];
let v4 = 0;
for (const k of E1X) {
  if (!mapaHoy[k]) { fallar(`V4: la entrada ${k} ya no esta en el mapa`); continue; }
  v4++;
  const r = contactoPorEscalon(mapaHoy[k]);
  const ok = r.nivel === 'gobernacion';
  L(`    ${k.padStart(4)}  nombra "${mapaHoy[k].capitania}"  ->  nivel=${JSON.stringify(r.nivel)}  ${ok ? 'OK' : 'MAL'}`);
  if (!ok) fallar(`V4: la entrada ${k} resolvio a ${JSON.stringify(r.nivel)} y tiene que caer al escalon 2`);
}
L(`  COMPARACIONES EFECTIVAS : ${v4}`);
if (v4 === 0) NO_MEDIBLE.push('V4 con cero comparaciones');

// ── V5 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V5 — el escalon 3 existe como camino aunque el dato no lo ejercite ===');
L('  Hoy 0 de 164 entradas caen ahi. Un camino que el dato nunca toma no se da');
L('  por bueno mirando el dato: se le pasa un caso construido.');
const casos3 = [
  ['sin telefono',            { capitania: 'Arica', gobernacion: 'Arica', telefono: null }],
  ['telefono vacio',          { capitania: 'Arica', gobernacion: 'Arica', telefono: '  ' }],
  ['sin nadie a quien rotular',{ capitania: null,   gobernacion: null,    telefono: '+56 58 2356704' }],
  ['sin contacto resuelto',   null],
];
let v5 = 0;
for (const [que, entrada] of casos3) {
  v5++;
  const r = contactoPorEscalon(entrada);
  const ok = r.nivel === null && r.nombre === null && r.telefono === null;
  L(`    ${que.padEnd(28)} -> nivel=${JSON.stringify(r.nivel)} nombre=${JSON.stringify(r.nombre)} tel=${JSON.stringify(r.telefono)}  ${ok ? 'OK' : 'MAL'}`);
  if (!ok) fallar(`V5: el caso "${que}" no resolvio al escalon 3 limpio`);
}
L(`  COMPARACIONES EFECTIVAS : ${v5}`);
if (v5 === 0) NO_MEDIBLE.push('V5 con cero comparaciones');

// ── V6 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V6 — el motivo viaja siempre (§4.2: nada cae al general en silencio) ===');
let v6 = 0; const sinMotivo = [];
for (const k of claves) {
  v6++;
  const r = contactoPorEscalon(mapaHoy[k]);
  if (!r.motivo || !String(r.motivo).trim()) sinMotivo.push(k);
}
L(`  COMPARACIONES EFECTIVAS : ${v6}`);
L(`  entradas sin motivo declarado : ${sinMotivo.length}`);
if (sinMotivo.length) fallar(`V6: ${sinMotivo.length} entradas resolvieron sin motivo`);

// ── V7 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V7 — EL DATO NO SE TOCO: el mapa, identico al blob del ancla ===');
L('  Comparado como VALOR JSON entrada por entrada. El terminador de linea no se');
L('  compara: el blob viene en LF y el disco en CRLF, y eso es propiedad del');
L('  repositorio, no de la entrada.');
let v7 = 0; const v7dif = [];
const clavesAncla = Object.keys(mapaAncla);
if (clavesAncla.length !== claves.length) fallar(`V7: el mapa tiene ${claves.length} entradas y el ancla ${clavesAncla.length}`);
for (const k of clavesAncla) {
  v7++;
  if (JSON.stringify(mapaAncla[k]) !== JSON.stringify(mapaHoy[k]))
    v7dif.push(`${k}: ${JSON.stringify(mapaAncla[k])} -> ${JSON.stringify(mapaHoy[k])}`);
}
L(`  COMPARACIONES EFECTIVAS : ${v7}`);
L(`  entradas distintas : ${v7dif.length}${v7dif.length ? ' -> ' + v7dif.join(' · ') : ''}`);
if (v7dif.length) fallar(`V7: el mapa cambio en ${v7dif.length} entradas, y esta pieza no lo toca`);

// ── V8 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V8 — el insumo que ascendio a vivo TAMPOCO se toco ===');
const derAncla = delAncla(P_DER).replace(/\r\n/g, '\n');
const derHoy   = fs.readFileSync(abs(P_DER), 'utf8').replace(/\r\n/g, '\n');
L(`  ${P_DER}`);
L(`    sha256 del ancla (normalizado a LF) : ${crypto.createHash('sha256').update(derAncla).digest('hex').slice(0, 32)}…`);
L(`    sha256 de hoy    (normalizado a LF) : ${crypto.createHash('sha256').update(derHoy).digest('hex').slice(0, 32)}…`);
L(`    COMPARACIONES EFECTIVAS : 1`);
if (derAncla !== derHoy) fallar('V8: el insumo de reparticiones cambio, y esta pieza solo lo LEE');

// ── V9 ───────────────────────────────────────────────────────────────────────
L('');
L('=== V9 — la salida del backend: `contacto` viaja y los tres campos viejos siguen ===');
L('  Se invoca EL HANDLER REAL del endpoint, con el servicio de SITPORT pisado');
L('  para no salir a la red. No es una lectura del texto del archivo: es la');
L('  respuesta que el router arma.');
let v9 = 0;
{
  // Se pisa el servicio ANTES de cargar el router, en el require cache.
  const rutaServicio = require.resolve(abs('src/services/sitport-service'));
  const servicio = require(rutaServicio);
  const original = servicio.consultaRestricciones;
  servicio.consultaRestricciones = async () => ([{ bahia: 71, GLBahia: 'VALPARAISO', MotivoRestriccion: 'x' }]);

  const router = require(abs(P_RUT));
  const capa = router.stack.find(s => s.route && s.route.path === '/restricciones'
    && s.route.methods && s.route.methods.post);
  if (!capa) {
    NO_MEDIBLE.push('V9: no se encontro el handler POST /restricciones en el router');
  } else {
    const handler = capa.route.stack[capa.route.stack.length - 1].handle;
    let cuerpo = null;
    const res = { json: o => { cuerpo = o; }, status: () => ({ json: o => { cuerpo = o; } }) };
    // El handler es async: se ESPERA antes de afirmar, en `cerrar()`. Sin la
    // espera, `cuerpo` seria null y el control diria "no viaja" sin haber
    // medido — un veredicto legible y falso.
    const hecho = handler({ body: { puerto: 'Valparaiso' } }, res);
    global.__v9 = { hecho, get cuerpo() { return cuerpo; }, restaurar: () => { servicio.consultaRestricciones = original; } };
  }
}

// El resto de V9 corre en el cierre asincronico, mas abajo.

async function cerrar() {
  if (global.__v9) {
    try { await global.__v9.hecho; } catch (e) { NO_MEDIBLE.push(`V9: el handler lanzo: ${e.message}`); }
    const cuerpo = global.__v9.cuerpo;
    global.__v9.restaurar();   // el servicio queda como estaba: se pisó para medir, no para dejarlo pisado
    if (!cuerpo) {
      NO_MEDIBLE.push('V9: el handler no produjo respuesta');
    } else {
      v9 = 4;
      const tiene = k => Object.prototype.hasOwnProperty.call(cuerpo, k);
      L(`    la respuesta trae \`contacto\`   : ${tiene('contacto')}`);
      L(`    la respuesta trae \`capitania\`  : ${tiene('capitania')}`);
      L(`    la respuesta trae \`gobernacion\`: ${tiene('gobernacion')}`);
      L(`    la respuesta trae \`telefono\`   : ${tiene('telefono')}`);
      L(`    contacto = ${JSON.stringify(cuerpo.contacto)}`);
      if (!tiene('contacto')) fallar('V9: la respuesta no trae `contacto`');
      for (const k of ['capitania', 'gobernacion', 'telefono'])
        if (!tiene(k)) fallar(`V9: la respuesta perdio el campo viejo \`${k}\`, y esta pieza no lo retira`);
      if (tiene('contacto') && cuerpo.contacto) {
        for (const k of ['nivel', 'nombre', 'telefono', 'telefono_atomico', 'motivo'])
          if (!Object.prototype.hasOwnProperty.call(cuerpo.contacto, k))
            fallar(`V9: \`contacto\` no trae la clave \`${k}\``);
      }
    }
    L(`  COMPARACIONES EFECTIVAS : ${v9}`);
    if (v9 === 0) NO_MEDIBLE.push('V9 con cero comparaciones');
  }

  // ── V10 ────────────────────────────────────────────────────────────────────
  L('');
  L('=== V10 — LA PWA NO SE TOCO. Sha256 contra los medidos en `02_particion.txt` ===');
  L('  En esta sesion `tmarea-pwa` es SOLO LECTURA por decision del owner: la');
  L('  apertura de D1(a) se hace efectiva al abrir el Tramo B.');
  const PWA_ESPERADO = {
    'src/hooks/useVoyageVerification.js': 'a31d8af17d422c2c6a0186e318b6d0f6',
    'src/components/verification/PortStatusBlock.jsx': 'a1427f734ce97bea95711828dadaea4c',
    'src/components/verification/NormativeBlock.jsx': '7460aa3e17298d759ca01949fc5e965d',
    'src/screens/P3_VoyageVerification.jsx': '685092f085a13ad0fd84ed31dcf21ddc',
    'src/components/verification/TransitRestrictionsBlock.jsx': '1ffcaabade18406ee5f3c17d7a3b476a',
  };
  let v10 = 0;
  for (const [rel, esperado] of Object.entries(PWA_ESPERADO)) {
    const p = path.join(PWA, rel);
    if (!fs.existsSync(p)) { fallar(`V10: no existe ${rel} en la PWA`); continue; }
    v10++;
    const real = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 32);
    const ok = real === esperado;
    L(`    ${rel.padEnd(56)} ${ok ? 'INTACTO' : 'CAMBIO -> ' + real}`);
    if (!ok) fallar(`V10: ${rel} cambio, y la PWA es solo lectura en esta sesion`);
  }
  L(`  COMPARACIONES EFECTIVAS : ${v10}`);
  if (v10 === 0) NO_MEDIBLE.push('V10 con cero comparaciones');

  // ── V11 ────────────────────────────────────────────────────────────────────
  L('');
  L('=== V11 — el resolvedor NO lee la tabla que §5.1 declara que no es fuente ===');
  const src = fs.readFileSync(abs(P_RES), 'utf8');
  const cuerpoSinComentarios = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const leeTabla = /require\([^)]*capitanias['"]\)/.test(cuerpoSinComentarios) || /GOBERNACIONES/.test(cuerpoSinComentarios);
  L(`    ¿el codigo del resolvedor requiere \`utils/capitanias\` o usa GOBERNACIONES? : ${leeTabla}`);
  L('    COMPARACIONES EFECTIVAS : 1');
  if (leeTabla) fallar('V11: el resolvedor lee la tabla de Gobernaciones, que §5.1 declara que NO es fuente');

  // ── veredicto ──────────────────────────────────────────────────────────────
  L('');
  L('================================================================================');
  if (NO_MEDIBLE.length) {
    L('NO SE PUDO MEDIR — ' + NO_MEDIBLE.join(' · '));
    L('Es un estado distinto de "hay fallas" y se reporta como tal.');
    L('================================================================================');
    process.exit(3);
  }
  if (FALLAS.length) {
    L(`FALLA — ${FALLAS.length} problemas:`);
    for (const f of FALLAS) L('  · ' + f);
    L('================================================================================');
    process.exit(1);
  }
  L('VERIFICACION OK. Ningun archivo fue escrito, en ninguno de los dos repos.');
  L('================================================================================');
}

cerrar();
