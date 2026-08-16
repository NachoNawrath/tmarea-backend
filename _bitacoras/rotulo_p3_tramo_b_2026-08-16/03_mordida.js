'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 03_mordida.js — ¿EL VERIFICADOR PUEDE FALLAR? Diez familias.
//
// Corrida (shell declarada, §7.3 — identica en PowerShell y en Git Bash):
//     cd C:\Users\katia\tmarea-backend
//     node _bitacoras\rotulo_p3_tramo_b_2026-08-16\03_mordida.js
//     node _bitacoras\rotulo_p3_tramo_b_2026-08-16\03_mordida.js --estado=viejo
//
// LAS FAMILIAS AFIRMAN SOBRE EL MENSAJE DEL ABORTO, NO SOBRE EL EXIT. En el
// Tramo A una familia salio exit 1 con el defecto y sin el: mirando solo el exit
// habria contado como mordida. Acá cada familia declara QUE CONTROL debe
// nombrarla y con que texto.
//
// LAS FAMILIAS CONSTRUYEN SU CASO DESDE CERO. El valor ofensivo esta escrito
// literal en el ensayo —el rotulo duro, la etiqueta inventada "Autoridad
// Marítima de", el telefono de vuelta en el recordatorio— y no se saca de lo que
// el dato traiga hoy.
//
// LA PWA NO SE ESCRIBE. Los defectos del lado PWA se aplican sobre una COPIA en
// el scratchpad y el verificador se apunta ahi con `--pwa=`. Restaurar in situ
// el otro repositorio dejaria, ante un corte, un estado que nadie pidio.
// Los defectos del lado backend SI tocan el arbol: se reponen y se comprueba el
// sha256 al cerrar, en las DOS corridas — exceptuar la de rojo le dejaria al
// instrumento una puerta para modificar el repositorio sin que nadie lo note.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const PWA_REAL = 'C:/Users/katia/tmarea-pwa';
const PRE_PIEZA = '6157c29';          // HEAD de la PWA antes del Tramo B
const VERIF = path.join(__dirname, '02_verificar.js');
const SCRATCH = path.join('C:/Users/katia/AppData/Local/Temp/claude/C--Users-katia--claude',
                          'b7ef7ca0-9620-437c-ad10-8b076a9264f3/scratchpad/mordida_tramo_b');
const ESTADO = process.argv.includes('--estado=viejo') ? 'viejo' : 'verde';

const L = (...a) => console.log(...a);
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// LA TRAMPA DEL CRLF, que este repositorio ya pago dos veces. Los archivos de la
// PWA estan en CRLF y los literales de los ensayos se escriben con `\n`: un
// `de` de dos lineas no matchea nunca, y el ensayo se declara inaplicable en la
// corrida donde la linea SI estaba. Los patrones se traducen al fin de linea
// REAL del archivo antes de buscarlos.
const alEolDe = (texto, patron) => (/\r\n/.test(texto) ? patron.replace(/\n/g, '\r\n') : patron);

const P_HOOK = 'src/hooks/useVoyageVerification.js';
const P_CARD = 'src/components/verification/PortStatusBlock.jsx';
const P_NORM = 'src/components/verification/NormativeBlock.jsx';
const P_P2   = 'src/screens/P3_VoyageVerification.jsx';
const P_P1   = 'src/components/verification/TransitRestrictionsBlock.jsx';
const ARCHIVOS_PWA = [P_HOOK, P_CARD, P_NORM, P_P2, P_P1];

// Los insumos del backend que alguna familia toca. Se les toma el sha256 al
// abrir y se les vuelve a tomar al cerrar.
const MUTABLES_BACKEND = [
  'src/data/bahia-capitania-map.json',
  'src/services/contacto-por-escalon.js',
  'CONTRATO_MOTOR.md',
];

L('================================================================================');
L(`MORDIDA — TRAMO B DEL ROTULO DE P3   ·   estado del arbol: ${ESTADO.toUpperCase()}`);
L('================================================================================');

// ── la copia de la PWA ───────────────────────────────────────────────────────
function armarCopia(destino, desdeElViejo) {
  fs.rmSync(destino, { recursive: true, force: true });
  for (const rel of ARCHIVOS_PWA) {
    const dst = path.join(destino, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (desdeElViejo) {
      // `git show` devuelve EL BLOB, y el blob esta en LF mientras el arbol de
      // trabajo esta en CRLF. Copiarlo tal cual le cambia el sha256 a archivos
      // que NO cambiaron, y V9 los acusa: una cifra falsa producida por el
      // instrumento y no por el codigo, dentro de evidencia versionada. Se
      // restituye el fin de linea del arbol antes de escribir.
      let txt = execSync(`git show ${PRE_PIEZA}:${rel}`, { cwd: PWA_REAL, maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
      const real = fs.readFileSync(path.join(PWA_REAL, rel), 'utf8');
      if (/\r\n/.test(real)) txt = txt.replace(/\r?\n/g, '\r\n');
      fs.writeFileSync(dst, txt, 'utf8');
    } else {
      fs.copyFileSync(path.join(PWA_REAL, rel), dst);
    }
  }
}
const COPIA = path.join(SCRATCH, 'pwa');
armarCopia(COPIA, ESTADO === 'viejo');
L('');
L(`  copia de la PWA en : ${COPIA}`);
L(`  armada desde       : ${ESTADO === 'viejo' ? `el commit ${PRE_PIEZA} (estado PRE-PIEZA)` : 'el arbol de trabajo de la PWA'}`);
L(`  la PWA real NO se escribe en ninguna de las dos corridas.`);

// ── sha256 de apertura de los mutables del backend ───────────────────────────
const shaApertura = {};
for (const rel of MUTABLES_BACKEND) shaApertura[rel] = sha(path.join(RAIZ, rel));

function correr(pwaRoot) {
  try {
    const out = execSync(`node "${VERIF}" --pwa="${pwaRoot}"`, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    return { exit: 0, out };
  } catch (e) {
    return { exit: e.status === undefined ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

// ── LA LINEA BASE ES PARTE DE LA MEDICION ────────────────────────────────────
// Si el arbol no esta donde se cree antes de inyectar, las familias miden otra
// cosa y devuelven cifras legibles y falsas.
L('');
L('=== LINEA BASE, ANTES DE INYECTAR NADA ===');
const base = correr(COPIA);
const baseVerde = base.exit === 0;
L(`  el verificador contra la copia ${ESTADO === 'viejo' ? 'PRE-PIEZA' : 'limpia'} sale exit ${base.exit}`);
if (ESTADO === 'verde') {
  L('  esperado: exit 0. Sin linea base en verde el instrumento aborta en vez de concluir.');
  if (!baseVerde) {
    L('ABORTA — la linea base no esta en verde:');
    for (const l of base.out.split('\n').filter(x => x.includes('✗') || x.startsWith('  · '))) L('    ' + l.trim());
    process.exit(3);
  }
} else {
  L('  esperado: exit 1, y LA FALLA DEBE SER DE LOS CONTROLES QUE MIDEN LA PIEZA.');
  L('  Un verificador que diera verde sin la pieza aplicada no probaria nada, y esa');
  L('  es la primera cosa que esta corrida descarta.');
  const acusaLaPieza = /V1: punto/.test(base.out) || /V3:/.test(base.out);
  L(`  exit distinto de 0                       : ${base.exit !== 0 ? 'SI' : 'NO'}`);
  L(`  la falla la levantan V1/V3 (los de la pieza): ${acusaLaPieza ? 'SI' : 'NO'}`);
  L('  fallas contra el estado PRE-PIEZA:');
  for (const l of base.out.split('\n').filter(x => x.trim().startsWith('· V'))) L('      ' + l.trim());
  if (base.exit === 0) { L('ABORTA — el verificador da VERDE sin la pieza aplicada: no mide la pieza.'); process.exit(3); }
}

// ── LAS FAMILIAS ─────────────────────────────────────────────────────────────
// destino: 'pwa' aplica sobre la copia; 'backend' sobre el arbol, con reposicion.
const FAMILIAS = [
  { id: 'B0', destino: null, que: 'control negativo: sin inyectar nada, el verificador se comporta como la linea base',
    espera: null },

  { id: 'B1', destino: 'pwa', archivo: P_HOOK, que: 'el pasamanos vuelve a NO copiar `contacto`: el campo muere ahi',
    de: '    contacto: data?.contacto || null,\n', a: '',
    espera: 'V1: punto 1 · pasamanos — el literal nuevo no esta' },

  { id: 'B2', destino: 'pwa', archivo: P_CARD, que: 'la etiqueta vuelve a ser un LITERAL DURO en el JSX',
    de: '📞 {capitania.etiqueta} {capitania.nombre}', a: '📞 Gobernación Marítima de {capitania.nombre}',
    espera: 'V1: punto 3 · render P3 — el literal viejo sigue' },

  { id: 'B3', destino: 'pwa', archivo: P_HOOK, que: 'el escalon 3 se RELLENA con "Autoridad Marítima de" en vez de callar',
    de: "  return null; // escalón 3", a: "  return 'Autoridad Marítima de'; // escalón 3",
    espera: 'el escalon 3 devuelve la etiqueta' },

  { id: 'B4', destino: 'pwa', archivo: P_CARD, que: 'el `tel:` se arma sin comprobar la atomicidad que INV-10.1 exige',
    de: '{capitania.atomico ? (', a: '{true ? (',
    espera: 'V5: el `tel:` no esta condicionado a la atomicidad' },

  { id: 'B5', destino: 'pwa', archivo: P_HOOK, que: 'el TELEFONO vuelve al recordatorio r1, adentro del mensaje normativo',
    de: "    canal: voyageData?.nearest_capitania?.vhf_primary ? `VHF Ch ${voyageData.nearest_capitania.vhf_primary}` : null,\n    norma: 'TM-006 Art. 3',",
    a:  "    canal: voyageData?.nearest_capitania?.vhf_primary ? `VHF Ch ${voyageData.nearest_capitania.vhf_primary}` : null,\n    telefono: '+56 32 220 8905',\n    norma: 'TM-006 Art. 3',",
    espera: 'recordatorios siguen emitiendo telefono' },

  { id: 'B6', destino: 'pwa', archivo: P_P1, que: 'se toca un archivo de la PWA FUERA de los 5 puntos (el consumidor de P1)',
    de: '  const nombreCap = r.capitania || r.gobernacion;', a: '  const nombreCap = r.gobernacion;',
    espera: 'V9: src/components/verification/TransitRestrictionsBlock.jsx cambio' },

  { id: 'B7', destino: 'backend', archivo: 'src/data/bahia-capitania-map.json', que: 'el DATO se toca: una entrada cambia de telefono',
    de: '"telefono": "+56 32 220 8905"', a: '"telefono": "+56 32 999 0000"',
    espera: 'del mapa cambio' },

  { id: 'B8', destino: 'backend', archivo: 'src/services/contacto-por-escalon.js', que: 'el RESOLVEDOR del backend se toca, y esta pieza no escribe backend',
    de: "  if (!contacto || typeof contacto !== 'object') return nada('sin_contacto_resuelto');",
    a:  "  if (!contacto || typeof contacto !== 'object') return nada('sin_contacto');",
    espera: 'V7: src/services/contacto-por-escalon.js cambio' },

  { id: 'B9', destino: 'backend', archivo: 'CONTRATO_MOTOR.md', que: 'la enmienda BORRA el texto original en vez de tacharlo (§3.3)',
    de: '~~Leído como lo lee P3, que sólo pregunta *"¿este número es de una Capitanía?"*:~~ **108 de 164**',
    a:  '**108 de 164**',
    espera: 'V11: el texto original sigue VISIBLE' },
];

L('');
L('=== LAS FAMILIAS ===');
let corridas = 0, mordieron = 0, tapadas = 0, noAplicables = 0, fallaron = [];

for (const f of FAMILIAS) {
  corridas++;
  L('');
  L(`  ${f.id}  ${f.que}`);

  let repone = null;
  if (f.destino === 'pwa' || f.destino === 'backend') {
    const p = path.join(f.destino === 'pwa' ? COPIA : RAIZ, f.archivo);
    const antes = fs.readFileSync(p, 'utf8');
    const de = alEolDe(antes, f.de);
    if (!antes.includes(de)) {
      // Contra el estado PRE-PIEZA hay defectos que no se pueden inyectar
      // porque la linea que atacan todavia no existe: eso es NO APLICABLE, y no
      // es lo mismo que TAPADA ni que MORDIO.
      //
      // EN VERDE, EN CAMBIO, NO APLICABLE ES UNA FALLA DEL ENSAYO. Si el
      // literal no esta, la familia no corrio, y una corrida que cierra
      // diciendo "todas hicieron lo suyo" con familias sin ejercitar es
      // exactamente la cifra legible y falsa que estos instrumentos existen
      // para no producir.
      L(`      NO APLICABLE en este estado: el literal a atacar no existe en ${f.archivo}`);
      if (ESTADO === 'verde') fallaron.push(`${f.id}: NO APLICABLE en verde — el ensayo no encontro su literal, la familia no se ejercito`);
      else noAplicables++;
      continue;
    }
    fs.writeFileSync(p, antes.replace(de, alEolDe(antes, f.a)));
    repone = () => fs.writeFileSync(p, antes);
  }

  let r;
  try { r = correr(COPIA); } finally { if (repone) repone(); }

  if (f.espera === null) {
    const igualQueLaBase = (r.exit === base.exit);
    L(`      exit ${r.exit}, y la linea base salio ${base.exit} -> ${igualQueLaBase ? 'SE COMPORTA COMO DEBE' : 'DISCREPA CON LA LINEA BASE'}`);
    if (!igualQueLaBase) fallaron.push(`${f.id}: el control negativo no reproduce la linea base`);
    continue;
  }

  const nombrado = r.out.includes(f.espera);
  const nuevaFalla = r.exit !== 0 && (ESTADO === 'verde' || !base.out.includes(f.espera));
  if (nombrado && nuevaFalla) {
    mordieron++;
    L(`      exit ${r.exit} · el control lo NOMBRA: "${f.espera}"   -> MORDIO`);
  } else if (nombrado && !nuevaFalla) {
    tapadas++;
    L(`      exit ${r.exit} · el control lo nombra, pero YA LO NOMBRABA sin el defecto -> TAPADA`);
  } else {
    fallaron.push(`${f.id}: el verificador NO nombro "${f.espera}" (exit ${r.exit})`);
    L(`      exit ${r.exit} · el control NO lo nombra   -> NO MORDIO`);
  }
}

// ── reposicion comprobada por sha256 ─────────────────────────────────────────
L('');
L('=== LOS INSUMOS MUTABLES DEL BACKEND, REPUESTOS Y COMPROBADOS ===');
let repuestosOK = 0;
for (const rel of MUTABLES_BACKEND) {
  const ahora = sha(path.join(RAIZ, rel));
  const ok = ahora === shaApertura[rel];
  L(`  ${rel.padEnd(42)} ${ok ? 'REPUESTO OK' : 'DISTINTO AL DE APERTURA'}`);
  if (ok) repuestosOK++; else fallaron.push(`el insumo ${rel} NO quedo repuesto`);
}
L(`  COMPARACIONES EFECTIVAS : ${repuestosOK} de ${MUTABLES_BACKEND.length}`);

// La copia se borra; la PWA real nunca se toco.
fs.rmSync(SCRATCH, { recursive: true, force: true });

L('');
L('================================================================================');
const ejercitadas = corridas - noAplicables;
L(`FAMILIAS DECLARADAS : ${corridas}   ·   EJERCITADAS : ${ejercitadas}   ·   MORDIERON : ${mordieron}   ·   TAPADAS : ${tapadas}   ·   NO APLICABLES : ${noAplicables}`);
if (ejercitadas === 0) { L('ABORTA — cero comparaciones efectivas.'); process.exit(3); }
if (fallaron.length) {
  L(`FAMILIAS QUE NO HICIERON LO SUYO : ${fallaron.length}`);
  for (const x of fallaron) L(`  · ${x}`);
  L('================================================================================');
  process.exit(1);
}
L('TODAS LAS FAMILIAS HICIERON LO SUYO.');
L('La PWA real no fue escrita. Los mutables del backend quedaron repuestos.');
L('================================================================================');
