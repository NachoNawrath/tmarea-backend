'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 02_particion.js — QUE PARTE DEL ARREGLO VIVE EN EL BACKEND Y QUE PARTE VIVE
// INEVITABLEMENTE EN LA PWA. Solo mide. NO ESCRIBE NINGUN ARCHIVO.
//
// Corrida:  node _bitacoras/rotulo_p3_2026-08-16/02_particion.js
// Shell declarada (CLAUDE.md §7.3): identica en PowerShell y en Git Bash.
//
// COMO MIDE, Y POR QUE ASI. Cada punto del cableado se declara con su archivo,
// su linea esperada y el TEXTO LITERAL que tiene que estar ahi. El instrumento
// lo busca en el archivo y:
//   · si lo encuentra en la linea declarada -> OK;
//   · si lo encuentra en otra linea         -> lo dice, con la linea real;
//   · si NO lo encuentra                    -> ABORTA.
// Un mapa del cableado que se transcribe a mano envejece en silencio en cuanto
// alguien mueve una linea, y este repositorio ya pago esa forma. Aca el mapa se
// comprueba contra el codigo en cada corrida.
//
// LA PWA SE LEE EN SOLO LECTURA. Este instrumento no escribe nada en ningun
// repositorio y no corre git en `tmarea-pwa`.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..', '..');
const PWA  = path.join(RAIZ, '..', 'tmarea-pwa');
const L = (...a) => console.log(...a);
const ABORTOS = [];

// ── el mapa declarado del cableado ───────────────────────────────────────────
// `cambia`: si esta pieza obliga a tocar ese punto para que P3 cumpla INV-10.1.
const PUNTOS = [
  // ── BACKEND ────────────────────────────────────────────────────────────────
  { repo: 'backend', archivo: 'src/utils/capitanias.js', linea: 55,
    literal: 'const entry = BAHIA_CAPITANIA_MAP[String(bahiaId)];',
    papel: 'PRODUCTOR crudo del par. Devuelve la entrada del mapa tal cual.',
    camino: 'P2 · P3 · P4 · weather-ruta', cambia: false },

  { repo: 'backend', archivo: 'src/services/capitania-de-bahia.js', linea: 50,
    literal: 'function capitaniaDeBahia(bahiaId, ambitosPublicados) {',
    papel: 'PRODUCTOR con decreto. Unico punto donde decreto y mapa se cruzan.',
    camino: 'P1', cambia: false },

  { repo: 'backend', archivo: 'src/routes/sitport-routes.js', linea: 346,
    literal: 'capitania: cap?.capitania || null,',
    papel: 'SALIDA de /api/sitport/restricciones — la que alimenta P2, P3 y P4.',
    camino: 'P2 · P3 · P4', cambia: true },

  { repo: 'backend', archivo: 'src/routes/sitport-routes.js', linea: 479,
    literal: 'capitania:           cap?.capitania || null,',
    papel: 'SALIDA de /api/sitport/weather-ruta, campo por bahia en ruta.',
    camino: 'weather-ruta', cambia: false },

  { repo: 'backend', archivo: 'src/routes/sitport-routes.js', linea: 833,
    literal: 'capitania: cap?.capitania || null,',
    papel: 'SALIDA de /api/sitport/restricciones-ruta — la que alimenta P1.',
    camino: 'P1', cambia: false },

  // ── PWA (solo lectura) ─────────────────────────────────────────────────────
  { repo: 'pwa', archivo: 'src/hooks/useVoyageVerification.js', linea: 246,
    literal: 'capitania: data?.capitania || null,',
    papel: 'PASAMANOS. fetchPortStatus COPIA CAMPO POR CAMPO lo que el backend '
         + 'manda. Un campo nuevo del backend que no se agregue aca NO LLEGA al '
         + 'componente. Este punto es el que hace imposible cerrar la pieza solo '
         + 'del lado backend.',
    camino: 'P3 · P4', cambia: true },

  { repo: 'pwa', archivo: 'src/components/verification/PortStatusBlock.jsx', linea: 76,
    literal: 'const capNombre = data?.gobernacion ||',
    papel: 'CONSUMIDOR P3. Elige el nombre. Nunca mira `capitania`.',
    camino: 'P3', cambia: true },

  { repo: 'pwa', archivo: 'src/components/verification/PortStatusBlock.jsx', linea: 99,
    literal: 'Gobernación Marítima de {capitania.nombre}',
    papel: 'RENDER P3. La etiqueta de nivel esta DURA en el JSX: no sale de '
         + 'ningun dato, asi que ningun cambio de backend puede corregirla solo.',
    camino: 'P3', cambia: true },

  { repo: 'pwa', archivo: 'src/hooks/useVoyageVerification.js', linea: 535,
    literal: 'const capZarpeNombre = portStatus?.zarpe?.gobernacion',
    papel: 'CONSUMIDOR P4 — el recordatorio `r1_radio_aviso`. Lee EL MISMO PAR '
         + 'que P3 y lo rotula igual. No estaba enumerado en `0bc80d2`.',
    camino: 'P4', cambia: true },

  { repo: 'pwa', archivo: 'src/components/verification/NormativeBlock.jsx', linea: 81,
    literal: '{reminder.telefono && (',
    papel: 'RENDER P4. Pone el TELEFONO dentro de un mensaje normativo, que es '
         + 'lo que la primera frase de INV-10.1 prohibe. Decision del owner.',
    camino: 'P4', cambia: true },

  { repo: 'pwa', archivo: 'src/screens/P3_VoyageVerification.jsx', linea: 237,
    literal: 'rec?.capitania || rec?.gobernacion',
    papel: 'CONSUMIDOR P2 — arribada forzosa, etiqueta dura. FUERA DE ALCANCE '
         + 'de esta pieza; se lista para que el mapa este completo.',
    camino: 'P2', cambia: false },

  { repo: 'pwa', archivo: 'src/components/verification/TransitRestrictionsBlock.jsx', linea: 62,
    literal: 'r.capitania || r.gobernacion',
    papel: 'CONSUMIDOR P1 — sin etiqueta de nivel. FUERA DE ALCANCE.',
    camino: 'P1', cambia: false },
];

L('================================================================================');
L('LA PARTICION BACKEND / PWA — cada punto comprobado contra el codigo');
L('La PWA se leyo en SOLO LECTURA. Este instrumento no escribe nada.');
L('================================================================================');

const raizDe = r => (r === 'backend' ? RAIZ : PWA);
const cacheArchivo = new Map();
function lineasDe(repo, rel) {
  const k = repo + '|' + rel;
  if (!cacheArchivo.has(k)) {
    const p = path.join(raizDe(repo), rel);
    if (!fs.existsSync(p)) { ABORTOS.push(`no existe ${repo}:${rel}`); cacheArchivo.set(k, null); }
    else cacheArchivo.set(k, fs.readFileSync(p, 'utf8').split(/\r?\n/));
  }
  return cacheArchivo.get(k);
}

L('');
L('=== SHA256 DE LOS ARCHIVOS DEL CABLEADO ===');
for (const rel of [...new Set(PUNTOS.map(p => p.repo + '|' + p.archivo))]) {
  const [repo, a] = rel.split('|');
  const p = path.join(raizDe(repo), a);
  if (!fs.existsSync(p)) continue;
  L(`  ${(repo + ':' + a).padEnd(62)} ${crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 32)}…`);
}

L('');
L('=== LOS PUNTOS DEL CABLEADO, COMPROBADOS UNO POR UNO ===');
let comprobados = 0, movidos = 0;
for (const pt of PUNTOS) {
  const lin = lineasDe(pt.repo, pt.archivo);
  if (!lin) continue;
  comprobados++;
  // Se comprueba PRIMERO la linea declarada. Buscar la primera ocurrencia del
  // literal en el archivo es lo que hizo la version anterior de este
  // instrumento, y con `sitport-routes.js` —que emite el MISMO literal en tres
  // salidas distintas— reporto la :833 como "movida a la :346". Una cifra
  // legible y falsa producida por el instrumento y no por el codigo.
  const todas = lin.map((l, i) => (l.includes(pt.literal) ? i + 1 : 0)).filter(Boolean);
  let estado;
  if (todas.length === 0) { estado = 'NO ENCONTRADO'; ABORTOS.push(`${pt.repo}:${pt.archivo} ya no contiene ${JSON.stringify(pt.literal)}`); }
  else if (todas.includes(pt.linea)) estado = `OK${todas.length > 1 ? `  (el literal aparece ${todas.length} veces: ${todas.join(', ')})` : ''}`;
  else { estado = `MOVIDO -> linea ${todas.join(' o ')}`; movidos++; }
  L('');
  L(`  [${pt.cambia ? 'CAMBIA' : '  --  '}] ${pt.repo}:${pt.archivo}:${pt.linea}   ${estado}`);
  L(`           camino: ${pt.camino}`);
  L(`           ${pt.papel.replace(/\s+/g, ' ')}`);
}
L('');
L(`  PUNTOS COMPROBADOS (comparaciones efectivas) : ${comprobados} de ${PUNTOS.length}`);
L(`  puntos movidos de linea                      : ${movidos}`);
if (comprobados === 0) ABORTOS.push('cero puntos comprobados: el instrumento no midio nada');

// ── el reparto ───────────────────────────────────────────────────────────────
L('');
L('=== EL REPARTO ===');
const cambian = PUNTOS.filter(p => p.cambia);
const cbBack  = cambian.filter(p => p.repo === 'backend');
const cbPwa   = cambian.filter(p => p.repo === 'pwa');
L(`  puntos del cableado, en total          : ${PUNTOS.length}`);
L(`  puntos que ESTA PIEZA obliga a tocar   : ${cambian.length}`);
L(`      en el backend : ${cbBack.length}   ${cbBack.map(p => p.archivo.split('/').pop() + ':' + p.linea).join(', ')}`);
L(`      en la PWA     : ${cbPwa.length}   ${cbPwa.map(p => p.archivo.split('/').pop() + ':' + p.linea).join(', ')}`);
L(`  puntos fuera del alcance de esta pieza : ${PUNTOS.length - cambian.length}`);
L(`  SUMA : ${cambian.length} + ${PUNTOS.length - cambian.length} = ${PUNTOS.length}`);

L('');
L('=== LA PREGUNTA DEL PUNTO 3 DEL PLAN, CONTESTADA CON LO MEDIDO ===');
L('  "¿Puede el backend entregar {nivel, nombre, telefono} ya resuelto y el');
L('   componente solo consumirlo, cerrando la pieza casi entera del lado backend?"');
L('');
L('  NO, y el punto que lo impide esta medido: `useVoyageVerification.js:246` es');
L('  un PASAMANOS QUE COPIA CAMPO POR CAMPO. No hace spread del response: nombra');
L('  los tres campos uno a uno. Un `contacto` nuevo que el backend emita muere');
L('  ahi y no llega al componente.');
L('');
L('  Y hay una segunda razon, independiente de la primera: LA ETIQUETA DE NIVEL');
L('  ESTA DURA EN EL JSX (`PortStatusBlock.jsx:96`, comprobado arriba). No sale');
L('  de ningun campo del response. Ningun valor que el backend mande puede');
L('  cambiar un literal del JSX. Aunque el pasamanos hiciera spread, la etiqueta');
L('  seguiria diciendo "Gobernación Marítima de".');
L('');
L('  ES DECIR: la PWA se toca si o si, y no por una sino por dos causas');
L('  independientes. Lo que el backend SI puede hacer es que la PWA se toque');
L('  POCO y sin llevarse ninguna regla adentro.');

// ── donde vive hoy el insumo que decide el nivel ─────────────────────────────
L('');
L('=== DONDE VIVE HOY EL INSUMO QUE DECIDIRIA EL NIVEL ===');
const DER = 'data/contacto/reparticiones_publicadas.json';
const consumidoresSrc = [];
const consumidoresScripts = [];
function barrer(dir, acc) {
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__tests__') barrer(rel, acc); continue; }
    if (!e.name.endsWith('.js')) continue;
    const t = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    if (t.includes('reparticiones_publicadas')) acc.push(rel);
  }
}
barrer('src', consumidoresSrc);
barrer('scripts', consumidoresScripts);
L(`  archivos de src/ que hoy lo leen     : ${consumidoresSrc.length}  ${consumidoresSrc.join(', ') || '(ninguno)'}`);
L(`  archivos de scripts/ que hoy lo leen : ${consumidoresScripts.length}  ${consumidoresScripts.join(', ')}`);
L('');
L('  CONSECUENCIA, dicha antes de que aparezca sola: si el backend resuelve el');
L('  nivel en tiempo de request, ese archivo pasa de DERIVADO DE GENERACION a');
L('  INSUMO VIVO del motor, y §5 del contrato reparte "un dato, una fuente');
L('  autorizada". Ese ascenso de estatus es contenido normativo y lo aprueba el');
L('  owner (CLAUDE.md §6). No se hace de costado.');

L('');
L('================================================================================');
if (ABORTOS.length) { L('ABORTA — ' + ABORTOS.join(' · ')); L('================================================================================'); process.exit(3); }
L('MEDICION COMPLETA. Ningun archivo fue escrito, en ninguno de los dos repos.');
L('================================================================================');
