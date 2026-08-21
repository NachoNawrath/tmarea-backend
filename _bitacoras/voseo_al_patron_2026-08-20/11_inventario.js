'use strict';
// INVENTARIO. Corre el vocabulario CERRADO sobre el texto renderizable de ROL P
// y aplica las resoluciones.
//
// LAS RESOLUCIONES SON DATO, NO PROSA. Cada hit tiene que caer bajo una regla
// escrita aca, con su motivo. Si alguno no cae bajo ninguna, sale SIN_RESOLVER y
// el control se pone en ROJO: no hay resolucion por defecto, y un hit que nadie
// miro no se puede confundir con uno que se miro y se descarto.
const fs = require('fs'), path = require('path');
const D = __dirname;
const V = JSON.parse(fs.readFileSync(path.join(D, '10_vocabulario_cerrado.json'), 'utf8'));
const F = JSON.parse(fs.readFileSync(path.join(D, '03_fragmentos.json'), 'utf8'));

const BS = String.fromCharCode(92);
const COMB = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36F) + ']', 'g');
const sinTilde = (s) => s.normalize('NFD').replace(COMB, '');
const NOLETRA = new RegExp('[^' + BS + 'p{L}' + BS + 'p{N}]+', 'u');
const tok = (s) => s.split(NOLETRA).filter(Boolean);
const FUN = new Set(['de','la','el','en','con','para','que','los','las','un','una','del','al','por','se','su','tu','y','o','no','mas','antes','si','es','esta','este']);
const esProsa = (s) => { const t = tok(s); return t.length >= 3 && t.some((x) => FUN.has(sinTilde(x.toLowerCase()))); };
for (const v of V) v.re = new RegExp('(?<![' + BS + 'p{L}' + BS + 'p{N}])' + v.forma + '(?![' + BS + 'p{L}' + BS + 'p{N}])', 'giu');

const vistos = new Set(); const hits = [];
for (const f of F) {
  const s = f.frag.normalize('NFC');
  if (!esProsa(s)) continue;
  for (const v of V) {
    if (v.registro === 'no_usted_indistinto') continue;
    v.re.lastIndex = 0;
    if (!v.re.test(s)) continue;
    const k = f.clave + '|' + v.forma + '|' + s;
    if (vistos.has(k)) continue;
    vistos.add(k);
    hits.push({ clave: f.clave, sitio: f.ruta || ('L' + f.linea), forma: v.forma, registro: v.registro, ambiguo: v.ambiguo, frag: s });
  }
}

// ── VEREDICTOS ───────────────────────────────────────────────────────────────
// VOSEO      : bucket A. Se corrige en esta pieza.
// TUTEO      : texto al patron en tuteo. Se mide, NO se toca.
// NO_TUTEO   : la forma esta, pero no es trato de tu — 3a persona, sustantivo,
//              infinitivo, adjetivo.
// NO_AL_PATRON: es 2a persona, pero el texto no llega al patron. Con su medicion.
// LEMA       : el lema de marca. Fuera por decision del owner del 2026-08-20.
// DUDOSO     : no lo resuelve la lectura. Va con su conteo propio.
const R = [];
const regla = (v, por, m) => R.push(Object.assign({ v, por }, m));

// ── 1. LO ESPECIFICO PRIMERO: excepciones dentro de ficheros que por regla van a NO ──
// La nota historica cita el texto VIEJO para dejar constancia de la divergencia
// de la v1.7. Es prosa de declaracion, no texto al patron — y la regla de abajo
// la contaba como tuteo porque tambien dice 'antes de zarpar'. Va primero.
regla('NO_TUTEO', 'nota historica: cita el texto viejo para dejar constancia, no se sirve al cliente',
  { clave: 'backend/data/decreto/zonas_aviso.json', sitio: 'mensaje.actualizado_2026-08-13' });
regla('TUTEO', 'transcripcion del §10 servida al cliente — se mueve CON el §10',
  { clave: 'backend/data/decreto/zonas_aviso.json', contiene: 'antes de zarpar.' });
regla('TUTEO', 'mensaje al patron del validador deportivo',
  { clave: 'backend/src/services/deportivo-validator.js', contiene: 'tu ' });
regla('TUTEO', 'mensaje al patron del motor de restricciones',
  { clave: 'backend/src/services/restriction-rules-engine.js', contiene: 'tu ' });
regla('NO_AL_PATRON', 'viaja por /api/marine-weather/analyze, que la pwa NO llama; medido el 2026-08-20',
  { clave: 'backend/src/services/marine-weather-service.js' });
regla('LEMA', 'lema de marca. Decision del owner 2026-08-20: no es mensaje al patron',
  { contiene: 'CERTEZA' });
regla('DUDOSO', 'leido como usted es correcto y como 3a persona tambien; convive con 21 tuteos en la misma pantalla',
  { clave: 'pwa/src/screens/P2_VoyageSetup.jsx', contiene: 'recurso busca explotar' });

// ── 2. FICHEROS ENTEROS QUE NO SON TEXTO AL PATRON ───────────────────────────
// Leidos hit por hit: son guardas, mensajes de control y prosa de declaracion en
// tercera persona. Salen por consola y por la suite, no por pantalla.
for (const c of ['backend/src/services/zonas-aviso.js', 'backend/src/services/ambitos-publicados.js',
  'backend/src/services/cobertura-jurisdiccional.js', 'backend/src/services/catalogo-bahias.js',
  'backend/src/services/andamio-medicion.js', 'backend/src/services/join-bahia-jurisdiccion.js',
  'backend/src/services/anclas-declaradas.js', 'backend/src/services/cotejo-contrato.js',
  'backend/src/services/coastline-guard.js', 'backend/src/index.js',
  'backend/src/constants/vesselTypes.js', 'backend/src/routes/sitport-routes.js',
  'backend/src/services/voyage-report-service.js', 'backend/src/services/raster-router-service.js',
  'backend/data/contacto/reparticiones_publicadas.json', 'backend/data/decreto/zonas_aviso.json'])
  regla('NO_TUTEO', 'guarda, mensaje de control o prosa de declaracion en 3a persona', { clave: c });

// ── 3. VOSEO — el bucket que se corrige ──────────────────────────────────────
regla('VOSEO', 'imperativo voseante en texto al patron', { registro: 'voseo' });

// ── 4. LO QUE LA PWA PINTA — resuelto por forma y por texto ──────────────────
// Cada regla nombra el fichero. Nada se resuelve "en general".
const P = (clave, contiene, v, por) => regla(v, por, { clave, contiene });
const NOT = 'no es trato de tu: 3a persona, sustantivo o adjetivo';
const TUT = 'imperativo o 2a persona dirigida al patron';

// ── 4a. NO ES TRATO DE TU, aunque la forma este. Van ANTES que las de fichero. ──
const NO = (clave, forma, contiene) => regla('NO_TUTEO', NOT, { clave, forma, contiene });
NO('backend/src/services/restriction-rules-engine.js', 'activa', 'restriccion activa para embarcaciones');
NO('pwa/src/components/DeportiveAlerts.jsx', 'activa', 'capitania activa');
NO('pwa/src/components/DeportiveAlerts.jsx', 'cuenta', 'cuenta con el equipamiento');
NO('pwa/src/components/screens/S0Onboarding.jsx', 'cuenta', 'de tu cuenta');
NO('pwa/src/components/verification/NavigationBlock.jsx', 'completa', 'la ruta completa');
NO('pwa/src/components/verification/NormativeBlock.jsx', 'recuerda', 'Tmarea recuerda');
NO('pwa/src/components/verification/PortStatusBlock.jsx', 'activa', 'Restriccion activa');
NO('pwa/src/components/verification/TransitRestrictionsBlock.jsx', 'activa', undefined);
NO('pwa/src/data/Biblioteca/balizamiento_01.json', 'marca', 'Marca de tope');
NO('pwa/src/data/Biblioteca/emergencias_01.json', 'baja', 'la marea baja');
NO('pwa/src/data/Biblioteca/reglamentos_01.json', 'carga', undefined);
NO('pwa/src/data/maritime_data.json.json', 'activa', 'escucha activa');
NO('pwa/src/screens/P3_VoyageVerification.jsx', 'declara', 'no declara tonelaje');
NO('pwa/src/screens/P3_VoyageVerification.jsx', 'informa', 'Tmarea informa');
NO('pwa/src/screens/P4_ActiveVoyage.jsx', 'activa', 'navegacion activa');

// ── 4b. TEXTO AL PATRON EN TUTEO. Un fichero por linea, con lo que pinta. ──
const SI = (clave, que) => regla('TUTEO', TUT + ' — ' + que, { clave });
SI('pwa/src/components/DeportiveAlerts.jsx', 'avisos de zarpe y recalada del modulo deportivo');
SI('pwa/src/components/screens/ReportarProblema.jsx', 'formulario de reporte de problema');
SI('pwa/src/components/screens/S0_5Registro.jsx', 'pantalla de registro');
SI('pwa/src/components/screens/S0Onboarding.jsx', 'onboarding y terminos de uso');
SI('pwa/src/components/verification/TransitRestrictionsBlock.jsx', 'bloque de restricciones en transito');
SI('pwa/src/components/verification/VoyageVerdict.jsx', 'veredicto del viaje');
SI('pwa/src/data/Biblioteca/balizamiento_01.json', 'Biblioteca — balizamiento');
SI('pwa/src/data/Biblioteca/emergencias_01.json', 'Biblioteca — emergencias');
SI('pwa/src/data/Biblioteca/maniobras_01.json', 'Biblioteca — maniobras');
SI('pwa/src/data/Biblioteca/reglamentos_01.json', 'Biblioteca — reglamentos');
SI('pwa/src/data/Biblioteca/ripa_01.json', 'Biblioteca — RIPA');
SI('pwa/src/screens/P1_VesselProfile.jsx', 'perfil de la nave: rotulos, validaciones y errores');
SI('pwa/src/screens/P2_VoyageSetup.jsx', 'armado del viaje: buscadores, rotulos y validaciones');
SI('pwa/src/screens/P3_VoyageVerification.jsx', 'verificacion previa al zarpe');
SI('pwa/src/screens/P4_ActiveVoyage.jsx', 'navegacion activa y cierre de viaje');
SI('pwa/src/utils/license-rules.js', 'reglas de licencia mostradas al patron');
SI('pwa/src/utils/restricciones.js', 'texto de restriccion mostrado al patron');

// ── MOTOR DE RESOLUCION ──────────────────────────────────────────────────────
const casa = (h, r) =>
  (r.clave === undefined || r.clave === h.clave) &&
  (r.forma === undefined || r.forma === h.forma) &&
  (r.sitio === undefined || r.sitio === h.sitio) &&
  (r.registro === undefined || r.registro === h.registro) &&
  (r.contiene === undefined || sinTilde(h.frag.toLowerCase()).indexOf(sinTilde(r.contiene.toLowerCase())) >= 0);

for (const h of hits) {
  const r = R.find((x) => casa(h, x));
  h.veredicto = r ? r.v : 'SIN_RESOLVER';
  h.por = r ? r.por : null;
}

const L = [];
const say = (s) => L.push(s === undefined ? '' : s);
const cuenta = (v) => hits.filter((h) => h.veredicto === v).length;
say('INVENTARIO DEL REGISTRO — voseo_al_patron_2026-08-20 · PARADA 2');
say('');
say('vocabulario  : CERRADO, ' + V.length + ' formas (paso 10)');
say('ambito       : texto renderizable de ROL P que es prosa castellana');
say('unidad       : cadena distinta por fichero y por forma');
say('');
say('  hits              : ' + hits.length);
for (const v of ['VOSEO', 'TUTEO', 'NO_TUTEO', 'NO_AL_PATRON', 'LEMA', 'DUDOSO', 'SIN_RESOLVER'])
  say('  ' + v.padEnd(18) + ': ' + cuenta(v));
say('');

for (const v of ['VOSEO', 'TUTEO', 'DUDOSO', 'NO_AL_PATRON', 'LEMA', 'SIN_RESOLVER']) {
  const h = hits.filter((x) => x.veredicto === v)
    .sort((a, b) => a.clave.localeCompare(b.clave) || String(a.sitio).localeCompare(String(b.sitio)));
  say('════ ' + v + ' — ' + h.length + ' ════');
  let u = '';
  for (const x of h) {
    if (x.clave !== u) { say('  ── ' + x.clave + ' ──'); u = x.clave; }
    say('     ' + String(x.sitio).padEnd(10) + ' [' + x.forma + ']  ' + x.frag.slice(0, 150));
  }
  say('');
}
say('════ NO_TUTEO — ' + cuenta('NO_TUTEO') + ' (no se enumeran: la forma esta, el trato no) ════');
say('');
const mal = cuenta('SIN_RESOLVER');
say('EXIT ' + (mal ? 1 : 0) + (mal ? '  — ROJO: hay hits que ninguna regla mira' : '  — VERDE: todo hit cae bajo una regla escrita'));
fs.writeFileSync(path.join(D, '11_inventario.json'), JSON.stringify(hits, null, 1), 'utf8');
fs.writeFileSync(path.join(D, '11_inventario.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
process.exit(mal ? 1 : 0);
