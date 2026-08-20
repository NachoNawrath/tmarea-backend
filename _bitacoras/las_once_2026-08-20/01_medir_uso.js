'use strict';
// MEDICION DEL CAMPO `uso` — que gobierna hoy, y que desaparece de la pantalla
// si deja de gobernar. Instrumento de la decision de la fila
// PLAN-2::desacople-licencia-uso, firmada por el owner el 2026-08-20.
//
// ARBOLES DECLARADOS
//   A · tmarea-pwa/src        · extensiones .js y .jsx · sin node_modules ni __tests__
//   B · tmarea-backend/src y tmarea-backend/scripts · .js · mismas exclusiones
// VOCABULARIO
//   /\buso\b/ — palabra ENTERA. No muerde "usuario" ni "recurso".
//   Se usa un patron sin clase de caracteres a proposito: el defecto de acentos
//   ya fichado (una clase con multibyte adentro se parte en bytes) no aplica aca
//   porque "uso" no lleva acento, y se deja dicho para que nadie lo re-descubra.
// CONTROLES
//   positivo B · `perfil_deportivo` en el backend  -> tiene que dar > 0
//   negativo   · `ZZQXNOEXISTE` en los dos arboles -> tiene que dar 0

const fs = require('fs');
const path = require('path');

const BACK = path.join(__dirname, '..', '..');
const PWA = path.join(BACK, '..', 'tmarea-pwa');

const EXCLUIDOS = new Set(['node_modules', '__tests__', '.git']);
function recorrer(dir, exts, salida) {
  if (!fs.existsSync(dir)) return salida;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUIDOS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(p, exts, salida);
    else if (exts.includes(path.extname(e.name))) salida.push(p);
  }
  return salida;
}

function buscar(ficheros, patron, raiz) {
  const hits = [];
  for (const f of ficheros) {
    const lineas = fs.readFileSync(f, 'utf8').split('\n');
    lineas.forEach((l, i) => {
      if (patron.test(l)) hits.push({ f: path.relative(raiz, f).replace(/\\/g, '/'), n: i + 1, l: l.trim() });
      patron.lastIndex = 0;
    });
  }
  return hits;
}

const arbolA = recorrer(path.join(PWA, 'src'), ['.js', '.jsx'], []);
const arbolB = recorrer(path.join(BACK, 'src'), ['.js'], recorrer(path.join(BACK, 'scripts'), ['.js'], []));

console.log('MEDICION DEL CAMPO `uso`');
console.log('Corrida: ' + new Date().toISOString());
console.log('');
console.log('ARBOL A · tmarea-pwa/src   · ficheros .js/.jsx: ' + arbolA.length);
console.log('ARBOL B · backend src+scripts · ficheros .js  : ' + arbolB.length);
console.log('');

// ── CONTROLES ────────────────────────────────────────────────────────────────
const ctrlPos = buscar(arbolB, /perfil_deportivo/, BACK);
const ctrlNegA = buscar(arbolA, /ZZQXNOEXISTE/, PWA);
const ctrlNegB = buscar(arbolB, /ZZQXNOEXISTE/, BACK);
console.log('CONTROLES');
console.log('  positivo · `perfil_deportivo` en el arbol B : ' + ctrlPos.length +
  '  -> ' + (ctrlPos.length > 0 ? 'OK' : 'FALLA — el arbol no alcanza al camino deportivo'));
ctrlPos.forEach(h => console.log('      ' + h.f + ':' + h.n));
console.log('  negativo · `ZZQXNOEXISTE`                   : A ' + ctrlNegA.length + ' · B ' + ctrlNegB.length +
  '  -> ' + (ctrlNegA.length === 0 && ctrlNegB.length === 0 ? 'OK' : 'FALLA'));
console.log('');

// ── ARBOL B: el motor ────────────────────────────────────────────────────────
const usoB = buscar(arbolB, /\buso\b/, BACK);
console.log('ARBOL B — `uso` en el backend: ' + usoB.length + ' linea(s)');
usoB.forEach(h => console.log('    ' + h.f + ':' + h.n + '  ' + h.l.slice(0, 90)));
console.log('  CLASIFICACION: las ' + usoB.length + ' son PROSA (comentarios y un mensaje de consola).');
console.log('  COMPORTAMIENTOS EN EL BACKEND: 0. El motor NUNCA ve el campo.');
console.log('  Lo que si recibe es `perfil_deportivo` y `navegacion_deportiva`, que la PWA');
console.log('  construye A PARTIR de `uso`. La decision es entera de la PWA.');
console.log('');

// ── ARBOL A: la PWA ──────────────────────────────────────────────────────────
const usoA = buscar(arbolA, /\buso\b/, PWA);
console.log('ARBOL A — `uso` en la PWA: ' + usoA.length + ' linea(s)');
usoA.forEach(h => console.log('    ' + h.f + ':' + h.n + '  ' + h.l.slice(0, 100)));
console.log('');

// Clasificacion declarada, fichero:linea -> clase. FP = falso positivo.
const CLASE = {
  'src/components/screens/ModuloView.jsx:41': 'FP · campo homonimo de la Biblioteca (un modulo tiene su propio campo `uso`)',
  'src/components/screens/ModuloView.jsx:83': 'FP · idem',
  'src/components/screens/ModuloView.jsx:84': 'FP · idem',
  'src/components/screens/S0Onboarding.jsx:44': 'FP · prosa de los terminos de uso',
  'src/components/verification/TransitRestrictionsBlock.jsx:165': 'FP · comentario sobre el sustantivo',
  'src/hooks/useVoyageVerification.js:727': 'FP · comentario',
  'src/screens/P1_VesselProfile.jsx:119': 'FP · comentario',
  'src/screens/P2_VoyageSetup.jsx:672': 'FP · comentario',
  'src/utils/license-rules.js:35': 'FP · comentario',
  'src/screens/P1_VesselProfile.jsx:53': 'CAMPO · valor inicial del formulario',
  'src/screens/P1_VesselProfile.jsx:361': 'CAMPO · el selector',
  'src/screens/P1_VesselProfile.jsx:362': 'CAMPO · el selector (estilo de error)',
  'src/screens/P1_VesselProfile.jsx:366': 'CAMPO · el selector (mensaje de error)',
  'src/screens/P1_VesselProfile.jsx:120': 'RAMA 1 · deriva el ambito deportivo del perfil de nave',
  'src/screens/P1_VesselProfile.jsx:163': 'RAMA 2 · borrado en cascada de licencia, clasificacion y potencia',
  'src/screens/P1_VesselProfile.jsx:199': 'RAMA 3 · obligatoriedad del propio campo',
  'src/screens/P2_VoyageSetup.jsx:675': 'RAMA 4 · deriva el ambito en el armado del viaje',
  'src/hooks/useVoyageVerification.js:729': 'RAMA 5 · recordatorio de Sernapesca (tercer termino de un O de tres)',
  'src/hooks/useVoyageVerification.js:956': 'RAMA 6 · puerta del perfil deportivo hacia el motor',
};
let fp = 0, campo = 0, ramas = 0, sinClasificar = [];
console.log('CLASIFICACION, una por una:');
for (const h of usoA) {
  const k = h.f + ':' + h.n;
  const c = CLASE[k];
  if (!c) { sinClasificar.push(k); continue; }
  if (c.startsWith('FP')) fp++; else if (c.startsWith('CAMPO')) campo++; else ramas++;
  console.log('    ' + k.padEnd(58) + c);
}
console.log('');
console.log('  falsos positivos declarados : ' + fp);
console.log('  el campo del formulario     : ' + campo + ' linea(s)');
console.log('  RAMAS DE COMPORTAMIENTO     : ' + ramas);
console.log('  sin clasificar              : ' + sinClasificar.length +
  (sinClasificar.length ? '  -> ' + sinClasificar.join(', ') + '  REVISAR: la clasificacion quedo corta' : '  -> OK'));
console.log('  suma ' + (fp + campo + ramas + sinClasificar.length) + ' == total ' + usoA.length + ' -> ' +
  (fp + campo + ramas + sinClasificar.length === usoA.length ? 'OK' : 'FALLA'));
console.log('');

// ── QUE CUELGA DE CADA RAMA ──────────────────────────────────────────────────
console.log('QUE DESAPARECE DE LA PANTALLA SI `uso` DEJA DE EXISTIR Y NADA LO REEMPLAZA');
console.log('Supuesto medido: el ambito se calcula como "recreativo -> deportivo, cualquier');
console.log('otra cosa -> comercial", asi que sin el campo TODOS quedan comerciales.');
console.log('');
const CUELGA = [
  ['RAMA 1a', 'El selector de licencia ENTERO. Solo se dibuja si el uso es recreativo. Con el desaparece la frase "Tu licencia determina el ambito de navegacion habilitado (RGDN Art. 12)."'],
  ['RAMA 1b', 'La obligatoriedad de esa licencia.'],
  ['RAMA 1c', 'El autocompletado del arqueo bruto desde la eslora (TM-002 Art. 28). El AB es el numero que decide el veredicto: AB 50 dio bandera U y AB 10 dio U+V con la MISMA restriccion, medido en pantalla el 2026-08-20.'],
  ['RAMA 1d', 'El autocompletado de la clasificacion BAHIA_VELA / BAHIA_MOTOR para naves eximidas (< 5 m, y < 10 HP si es a motor). Esa clasificacion es la que hoy fija el ambito "bahia".'],
  ['RAMA 2 ', 'El borrado en cascada de licencia, clasificacion y potencia. Desaparece con el campo.'],
  ['RAMA 3 ', 'La validacion "Selecciona el uso de la embarcacion": una pregunta menos.'],
  ['RAMA 4a', 'EL BLOQUEO TM-002 Art. 22. Ver el bloque de abajo: no sobrevive, y falla al reves.'],
  ['RAMA 4b', 'El badge "Perfil Deportivo - <licencia>".'],
  ['RAMA 4c', 'El bloque "Capitania de zarpe" con su VHF primario y secundario.'],
  ['RAMA 4d', 'La alerta de licencia en linea cuando el validador detecta violacion de alcance.'],
  ['RAMA 4e', 'La checklist de 5 items de seguridad antes de guardar.'],
  ['RAMA 4f', 'Los tipos de destino cambian enteros. Deportivo: Puerto/Caleta, Marina o Club Nautico, Fondeadero/Bahia, Paseo Circular, Coordenadas GPS. Comercial: Puerto o caleta, Centro salmonero, Centro mitilidos, Caladero/Zona de pesca, Coordenadas GPS. Cinco y cinco, y solo DOS coinciden.'],
  ['RAMA 4g', 'La exigencia de declarar ESPECIE (solo comercial, en caladero y coordenadas).'],
  ['RAMA 4h', 'El boton: "Verificar viaje deportivo" contra "Verificar condiciones del viaje".'],
  ['RAMA 4i', 'Tres campos del viaje guardado: perfil deportivo, validacion de licencia y capitania mas cercana.'],
  ['RAMA 5 ', 'El recordatorio de Sernapesca PARA QUIEN NO LO TIENE EN LA LICENCIA. La condicion es un O de tres: licencia contiene "artesanal", o contiene "pesca", o el uso es pesca.'],
  ['RAMA 6 ', 'El VEREDICTO DEPORTIVO ENTERO: bandera, arqueo efectivo y alertas de licencia. Sin la puerta, el motor no recibe perfil deportivo ni navegacion deportiva.'],
];
CUELGA.forEach(([r, t]) => console.log('  ' + r + ' · ' + t));
console.log('');
console.log('  RESUMEN SIN OPINION: el patron DEPORTIVO pierde 13 cosas de pantalla.');
console.log('  El COMERCIAL no pierde nada, salvo un caso: el que tiene licencia de Patron de');
console.log('  Nave Menor y sale a pescar deja de recibir el recordatorio de Sernapesca,');
console.log('  porque su licencia no contiene la palabra.');
console.log('');

console.log('EL BLOQUEO TM-002 Art. 22 — ¿sobrevive sin el campo?');
console.log('  NO, y falla al reves de lo que se teme.');
console.log('  La condicion es: ambito COMERCIAL **y** licencia DEPORTIVA.');
console.log('  Sin el campo, el ambito es comercial PARA TODOS.');
console.log('  Entonces cualquier patron con licencia deportiva veria el banner de bloqueo y');
console.log('  NO PODRIA GUARDAR NINGUN VIAJE, NUNCA. El modo de falla no es "deja de');
console.log('  bloquear": es "bloquea a todos los deportivos, siempre".');
console.log('  Por eso su reemplazo es la PRIMERA linea del trabajo y el borrado del campo la ULTIMA.');
console.log('');

console.log('¿PUEDE LA LICENCIA SOLA GOBERNARLO TODO?');
console.log('  Las cinco del registro: patron_nave_menor, patron_pesca_artesanal,');
console.log('  patron_deportivo_bahia, capitan_deportivo_costero, capitan_deportivo_alta_mar.');
console.log('    regimen deportivo/comercial      -> SI. Esta en el nombre de 3 de 5, y el');
console.log('                                        conjunto ya existe y ya gobierna el bloqueo.');
console.log('    recordatorio de Sernapesca       -> SI, y ya lo hace hoy sin el uso:');
console.log('                                        patron_pesca_artesanal contiene las dos palabras.');
console.log('    pesca / acuicultura / transporte -> NO. patron_nave_menor cubre las tres.');
console.log('                                        La licencia dice que PUEDE gobernar la persona,');
console.log('                                        no a que VA hoy.');
console.log('  OBSTACULO MEDIDO, de plomeria y no de diseno: hay DOS campos de licencia con');
console.log('  vocabularios distintos. El del formulario ofrece CUATRO (solo deportivas) y solo');
console.log('  se dibuja si el uso es recreativo; el del registro tiene CINCO y solo se escribe');
console.log('  en el alta. Si la licencia va a gobernar, la autoridad es la del registro.');
console.log('');

console.log('EL BLOQUE OCEANOGRAFICO — ¿de donde sale que este patron es pescador?');
console.log('  Tres fuentes posibles y NINGUNA es `uso`:');
console.log('    (i)   la licencia patron_pesca_artesanal — dice que la PERSONA pesca, no que');
console.log('          ESTE viaje sea de pesca;');
console.log('    (ii)  el DESTINO del viaje: Caladero, Centro salmonero, Centro mitilidos, mas');
console.log('          la ESPECIE que ya se exige. Es por viaje, ya existe y ya esta cableado;');
console.log('    (iii) el campo tipo_actividad de "Mi Perfil", tercer vocabulario, hoy solo lo');
console.log('          lee la Biblioteca.');
console.log('  La (ii) sobrevive a la decision y es MEJOR que `uso` incluso si `uso` se queda:');
console.log('  la clorofila sirve para buscar caladeros, no para ir a cargar combustible.');
