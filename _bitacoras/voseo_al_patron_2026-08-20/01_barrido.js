'use strict';
// BARRIDO DE REGISTRO — voseo / tuteo en texto al patron.
// Sesion voseo_al_patron_2026-08-20. Shell del agente: Git Bash. Los comandos
// reproducibles para el owner van en PowerShell, en la bitacora.
//
// POR QUE NODE Y NO GREP: bajo este locale una clase de caracteres con
// multibyte adentro no muerde. Aca las fronteras de palabra se arman con
// \p{L}\p{N} y bandera u, o sea por PUNTO DE CODIGO. Los patrones siguen
// siendo literales: la clase solo se usa para la frontera, nunca para la
// palabra.
//
// EL CORPUS EXCLUYE _bitacoras/ A PROPOSITO. Este fichero contiene las formas
// de voseo como literales; si se barriera a si mismo se marcaria entero. Es el
// mismo genero del defecto que H-T2 dejo fichado.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BACK = path.resolve(__dirname, '..', '..');
const PWA  = path.resolve(BACK, '..', 'tmarea-pwa');

const EXT = new Set(['.js', '.jsx', '.json', '.md', '.html', '.css', '.txt', '.sql', '.py']);
const FUERA_DE_CORPUS = [/^_bitacoras\//, /^node_modules\//, /^geodata\//, /^sondaje-sitport\//];

// sondaje-sitport y estado_drift.json son instantaneas de SITPORT: no van al
// corpus general, van al bucket C con su denominador propio.
const INSTANTANEAS_SITPORT = ['sondaje-sitport/bahias_sitport.json', 'data/catalogo/estado_drift.json'];

function corpus(repo, etiqueta) {
  const salida = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' });
  const out = [];
  for (const rel of salida.split('\n')) {
    if (!rel.trim()) continue;
    if (FUERA_DE_CORPUS.some((r) => r.test(rel))) continue;
    if (!EXT.has(path.extname(rel).toLowerCase())) continue;
    const abs = path.join(repo, rel);
    let st;
    try { st = fs.statSync(abs); } catch { continue; }
    if (!st.isFile()) continue;
    out.push({ repo: etiqueta, rel, abs, bytes: st.size });
  }
  return out;
}

// ── VOCABULARIO DECLARADO ────────────────────────────────────────────────────
// Cada forma trae su ambiguedad declarada. AMBIGUO no significa "no cuenta":
// significa que la maquina no lo resuelve y lo resuelve la lectura. Si la
// lectura tampoco lo resuelve, queda DUDOSO con su conteo propio.
const V = [];
const add = (formas, registro, ambiguo, nota) => {
  // NFC OBLIGATORIO. Los heredocs de esta maquina produjeron la misma letra de
  // dos formas: a+U+0301 en el vocabulario y U+00E1 en el resto. Un vocabulario
  // descompuesto contra un arbol precompuesto da CERO, y cero se lee como arbol
  // limpio. Se normalizan las dos puntas o la cifra no significa nada.
  for (const f of formas) V.push({ forma: f.normalize("NFC"), registro, ambiguo, nota });
};

// VOSEO — imperativo agudo de verbos -ar/-er. Ninguna otra forma del castellano
// se escribe asi, de modo que no son ambiguas.
add(['contactá', 'verificá', 'revisá', 'consultá', 'mirá', 'andá',
     'tené', 'coordiná', 'avisá', 'confirmá', 'llamá', 'esperá',
     'navegá', 'poné', 'hacé', 'llevá', 'cargá', 'chequeá',
     'ingresá', 'seleccioná', 'cerrá', 'agregá', 'guardá', 'buscá',
     'probá', 'usá', 'dejá', 'marcá', 'tocá', 'aprietá',
     'actualizá', 'completá', 'activá', 'desactivá', 'compruebá',
     'informá', 'reportá', 'mantené', 'evitá', 'recordá',
     'solicitá', 'gestioná', 'prepará', 'planificá', 'calculá',
     'anotá', 'tomá', 'sacá', 'bajá', 'entrá', 'mandá',
     'contá', 'mostrá', 'cambiá', 'ajustá', 'declará',
     'empezá', 'terminá', 'continuá', 'respondé', 'preguntá',
     'aceptá', 'rechazá', 'cancelá', 'fijate', 'acordate', 'quedate', 'asegurate'],
    'voseo', false, 'imperativo voseante inequivoco');

// VOSEO — imperativo agudo de verbos -ir. HOMOGRAFO del preterito de 1a persona
// ("yo salí"), asi que van marcados ambiguos y se leen.
add(['salí', 'vení', 'elegí', 'escribí', 'abrí', 'pedí',
     'decí', 'seguí', 'corregí', 'definí', 'describí'],
    'voseo', true, 'homografo del preterito de 1a persona singular');

// VOSEO — presente. "sos" va ambiguo: en una app nautica SOS es una senal.
add(['tenés', 'podés', 'querés', 'sabés', 'debés', 'hacés',
     'decís', 'necesitás', 'ponés', 'venís', 'vivís', 'sentís',
     'seguís', 'conocés', 'creés', 'vos'],
    'voseo', false, 'presente voseante inequivoco');
add(['sos'], 'voseo', true, 'homografo de SOS, senal de socorro');

// TUTEO — presente y formas verbales que solo existen en tuteo.
add(['puedes', 'debes', 'tienes', 'quieres', 'sabes', 'necesitas',
     'eres', 'haces', 'dices', 'vienes', 'sales', 'pones',
     'llevas', 'aseguras', 'responsabilizas', 'ingresas', 'llegas',
     'navegas', 'zarpas', 'recalas', 'estableces', 'excedes'],
    'tuteo', false, 'presente tuteante inequivoco');

// TUTEO — imperativo irregular. No hay indicativo que se escriba asi.
add(['ten', 'haz', 'pon', 'sal', 'ven', 'mantén', 'detén', 'oye'],
    'tuteo', false, 'imperativo tuteante irregular, inequivoco');
add(['sé'], 'tuteo', true, 'homografo de la 1a persona de saber');

// TUTEO — imperativo regular. HOMOGRAFO del indicativo de 3a persona
// ("confirma con la Capitania" vs "el motor confirma"). La maquina NO decide.
add(['contacta', 'verifica', 'revisa', 'consulta', 'coordina', 'avisa',
     'confirma', 'informa', 'gestiona', 'solicita', 'evita', 'recuerda',
     'navega', 'espera', 'calcula', 'prepara', 'ingresa', 'selecciona',
     'marca', 'usa', 'deja', 'toma', 'llama', 'anota', 'comprueba',
     'activa', 'completa', 'actualiza', 'carga', 'guarda', 'busca',
     'prueba', 'agrega', 'cambia', 'sigue', 'responde', 'pregunta',
     'acepta', 'cancela', 'declara', 'ajusta', 'define', 'describe',
     'termina', 'empieza', 'muestra', 'cuenta', 'manda', 'entra',
     'baja', 'sube', 'saca', 'toca', 'aprieta', 'no ingreses'],
    'tuteo', true, 'homografo del indicativo de 3a persona singular');

// NO-USTED INDISTINTO — formas que comparten tu y vos. No deciden el registro
// entre tuteo y voseo, pero prueban que NO es usted. Se cuentan aparte porque
// responden otra pregunta.
add(['tu', 'tus', 'ti', 'contigo', 'tuyo', 'tuya', 'tuyos', 'tuyas', 'estás', 'te'],
    'no_usted_indistinto', true, 'compartida por tu y vos; ambigua con otras cosas');

// ── MOTOR ────────────────────────────────────────────────────────────────────
// Frontera por punto de codigo. La palabra va literal; la clase solo hace de
// frontera. LA BARRA INVERTIDA SE CONSTRUYE POR PUNTO DE CODIGO: el heredoc de
// esta maquina se come un nivel de barra, y una clase que quede como p{L} en vez
// de \p{L} no falla: MIDE MAL EN SILENCIO. El control positivo de abajo la caza.
const BS = String.fromCharCode(92);
const META = ".*+?^${}()|[]" + BS;
for (const v of V) if ([...v.forma].some((c) => META.includes(c))) throw new Error("forma con metacaracter: " + v.forma);
const FA = "(?<![" + BS + "p{L}" + BS + "p{N}])";
const FD = "(?![" + BS + "p{L}" + BS + "p{N}])";
for (const v of V) v.re = new RegExp(FA + v.forma + FD, "giu");

// Devuelve el texto de P3_VoyageVerification.jsx, para el ancla.
function ficherosDeP3(archivos) {
  const a = archivos.find((x) => x.rel.indexOf('P3_VoyageVerification.jsx') >= 0);
  return a ? fs.readFileSync(a.abs, 'utf8').normalize('NFC') : '';
}

function barrer(archivos) {
  const hits = [];
  let puntos = 0;
  for (const a of archivos) {
    let t;
    try { t = fs.readFileSync(a.abs, 'utf8'); } catch { continue; }
    for (const _ of t) puntos++;
    const lineas = t.split(/\r?\n/);
    for (let i = 0; i < lineas.length; i++) {
      const crudo = lineas[i];
      const linea = crudo.normalize("NFC");
      for (const v of V) {
        v.re.lastIndex = 0;
        if (!v.re.test(linea)) continue;
        v.re.lastIndex = 0;
        const n = (linea.match(v.re) || []).length;
        hits.push({
          repo: a.repo, rel: a.rel, linea: i + 1, n,
          forma: v.forma, registro: v.registro, ambiguo: v.ambiguo, nota: v.nota,
          texto: crudo.trim().slice(0, 220),
        });
      }
    }
  }
  return { hits, puntos };
}

const archivos = [...corpus(BACK, 'backend'), ...corpus(PWA, 'pwa')];
const { hits, puntos } = barrer(archivos);

const L = [];
const say = (s) => { L.push(s === undefined ? '' : s); };

say('BARRIDO DE REGISTRO — voseo / tuteo en texto al patron');
say('sesion voseo_al_patron_2026-08-20 · shell del agente: Git Bash');
say('');
say('CORPUS (denominador de toda cifra de abajo)');
say('  definicion : ficheros VERSIONADOS de los dos repos, extensiones');
say('               .js .jsx .json .md .html .css .txt .sql .py');
say('  excluidos  : _bitacoras/ (prosa de bitacora, y el barrido se marcaria a si');
say('               mismo), node_modules/, geodata/, sondaje-sitport/');
for (const r of ['backend', 'pwa']) {
  const f = archivos.filter((a) => a.repo === r);
  say('  ' + r.padEnd(8) + ' : ' + f.length + ' ficheros');
}
say('  TOTAL    : ' + archivos.length + ' ficheros · ' + puntos + ' puntos de codigo');
say('');

for (const reg of ['voseo', 'tuteo', 'no_usted_indistinto']) {
  const h = hits.filter((x) => x.registro === reg);
  const ineq = h.filter((x) => !x.ambiguo);
  const amb = h.filter((x) => x.ambiguo);
  say('════ ' + reg.toUpperCase() + ' ════');
  say('  apariciones (unidad: aparicion de forma en linea de fichero del corpus)');
  say('    inequivocas por forma : ' + ineq.reduce((s, x) => s + x.n, 0) + '  en ' + ineq.length + ' lineas');
  say('    ambiguas por forma    : ' + amb.reduce((s, x) => s + x.n, 0) + '  en ' + amb.length + ' lineas');
  say('');
  if (reg === 'no_usted_indistinto') {
    const porForma = {};
    for (const x of h) porForma[x.forma] = (porForma[x.forma] || 0) + x.n;
    say('  (no se enumeran: no deciden registro. Conteo por forma:)');
    say('  ' + Object.entries(porForma).sort((a, b) => b[1] - a[1]).map((e) => e[0] + '=' + e[1]).join('  '));
    say('');
    continue;
  }
  for (const x of h.sort((a, b) => (a.repo + a.rel).localeCompare(b.repo + b.rel) || a.linea - b.linea)) {
    say('  [' + (x.ambiguo ? 'AMB' : 'INE') + '] ' + x.forma + '  ·  ' + x.repo + '/' + x.rel + '  L' + x.linea);
    say('        ' + x.texto);
  }
  say('');
}

say('════ CONTROL POSITIVO DEL INSTRUMENTO ════');
const pruebas = [
  ['Contactá a la Capitanía por VHF.', 'contactá', true],
  ['contactándose con la Capitanía', 'contactá', false],
  ['Contacta a la Capitanía por VHF.', 'contacta', true],
  ['Verificá el pronóstico', 'verificá', true],
  ['si tenés dudas', 'tenés', true],
];
let ok = 0, mal = 0;
for (const [texto, forma, esperado] of pruebas) {
  const v = V.find((x) => x.forma === forma.normalize("NFC"));
  v.re.lastIndex = 0;
  const got = v.re.test(texto.normalize("NFC"));
  const bien = got === esperado;
  if (bien) ok++; else mal++;
  say('  ' + (bien ? 'OK  ' : 'FALLA ') + JSON.stringify(texto) + ' ~ ' + forma + ' -> ' + got + ' (esperado ' + esperado + ')');
}
// CONTROL DE NORMALIZACION. Es el defecto que este mismo control cazo en su
// primera corrida: vocabulario NFD contra texto NFC da cero, y cero se lee como
// arbol limpio. Se prueba en las dos direcciones.
const nfd = "contacta" + String.fromCharCode(0x301);
const nfc = "contact" + String.fromCharCode(0xE1);
const vC = V.find((x) => x.forma === nfc);
vC.re.lastIndex = 0; const m1 = vC.re.test((nfd + " a la Capitania").normalize("NFC"));
vC.re.lastIndex = 0; const m2 = vC.re.test((nfc + " a la Capitania").normalize("NFC"));
if (m1 && m2) ok += 2; else mal++;
say("  " + (m1 && m2 ? "OK  " : "FALLA ") + "NFD y NFC de la misma palabra muerden igual -> " + m1 + " / " + m2);
say("  vocabulario en NFD sin normalizar habria dado CERO sobre un arbol NFC.");
say("");
say('  frontera: "contactándose" NO debe morder con "contactá" — es la prueba de que');
say('  la frontera por punto de codigo funciona bajo este locale.');
say('');
// ANCLA, REESCRITA DESPUES DE CORREGIR. La version anterior exigia que
// "contacta" con tilde estuviera en P3 — o sea que se ponia en ROJO justo
// cuando la correccion salia bien. Un control que falla al arreglar el defecto
// esta midiendo el defecto, no la propiedad.
//
// Lo que de verdad tiene que valer, antes y despues: el escalon 3 pinta DOS
// veces la frase de contacto, en UN SOLO registro. Asi el control sigue
// sirviendo con el arbol corregido y ademas caza lo que antes no cazaba: una
// correccion a medias, con una rama en voseo y la otra en usted.
const P3 = ficherosDeP3(archivos);
const voseadas = (P3.match(/Contactá a/g) || []).length;
const ustedeadas = (P3.match(/Contacte a/g) || []).length;
const registro = voseadas && ustedeadas ? "MEZCLADO" : (voseadas ? "voseo" : (ustedeadas ? "usted" : "NINGUNO"));
say("  ANCLA: el escalon 3 de P3_VoyageVerification.jsx pinta la frase de contacto");
say("    en voseo : " + voseadas + "   en usted : " + ustedeadas + "   -> registro: " + registro);
const anclaOk = (voseadas + ustedeadas === 2) && registro !== "MEZCLADO";
say("    " + (anclaOk ? "OK  " : "FALLA ") + "dos apariciones y un solo registro");
if (!anclaOk) mal++;
say('');
say('EXIT ' + (mal ? 1 : 0) + (mal ? '  — ROJO' : '  — VERDE'));

fs.writeFileSync(path.join(__dirname, '01_barrido.json'), JSON.stringify({ archivos: archivos.length, puntos, hits }, null, 1), 'utf8');
fs.writeFileSync(path.join(__dirname, '01_barrido.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
process.exit(mal ? 1 : 0);
