// Coteja el texto oficial TM-025 A (4-jun-2025) contra el insumo transcrito
// (data/decreto/jurisdicciones_v2.json, campo texto_decreto), jurisdiccion por jurisdiccion.
const fs = require('fs');

const TXT = 'C:/Users/katia/AppData/Local/Temp/claude/C--Users-katia--claude/1fedf1cd-c764-4ed7-875d-000f92bb263c/scratchpad/tm025a.txt';
const INS = 'C:/Users/katia/tmarea-backend/data/decreto/jurisdicciones_v2.json';

const raw = fs.readFileSync(TXT, 'utf8').split(/\r?\n/);

// --- 1. limpiar lineas de aparato (cabeceras de pagina, notas al pie) ---
const lineas = raw.filter(l => {
  const t = l.trim();
  if (!t) return false;
  if (/^\d{1,3}\s+D\.S\.\s*\(M\)/.test(t)) return false;          // nota al pie
  if (/FIJA JURISDICCI[OÓ]N DE LAS GOBERNACIONES/i.test(t)) return false; // cabecera
  if (/^ESTABLECE LAS CAPITAN/i.test(t)) return false;
  return true;
});

// --- 2. trocear por encabezado ---
const bloques = [];
let actual = null;
for (const l of lineas) {
  const t = l.trim();
  let m;
  if ((m = t.match(/^GOBERNACI[OÓ]N MAR[IÍ]TIMA (?:DE |)(.+)$/i))) {
    actual = { tipo: 'GM', nombre: m[1].trim(), texto: [] };
    bloques.push(actual);
    continue;
  }
  if ((m = t.match(/^-\s*Capitan[ií]a de Puerto\s*(?:de\s*|del\s*|)(.+?)\.?$/i))) {
    actual = { tipo: 'CP', nombre: m[1].trim(), texto: [] };
    bloques.push(actual);
    continue;
  }
  if (/^Art\.\s*2/.test(t)) { actual = { tipo: 'ART', nombre: '2', texto: [] }; bloques.push(actual); continue; }
  if (/^Art\.\s*3/.test(t)) { actual = null; continue; }
  if (actual) actual.texto.push(t);
}

// --- 3. mapeo encabezado oficial -> id del insumo ---
const MAP = {
  'CP:Arica': 'arica', 'GM:ARICA': 'arica',
  'CP:Iquique': 'iquique', 'CP:Patache': 'patache',
  'CP:Tocopilla': 'tocopilla', 'CP:Mejillones': 'mejillones', 'CP:Antofagasta': 'antofagasta', 'CP:Taltal': 'taltal',
  'CP:Chañaral': 'chanaral', 'CP:Caldera': 'caldera', 'CP:Huasco': 'huasco',
  'GM:HANGA ROA': 'hanga_roa',
  'CP:Coquimbo': 'coquimbo', 'CP:Tongoy': 'tongoy', 'CP:Los Vilos': 'los_vilos',
  'CP:Papudo': 'papudo', 'CP:Quintero': 'quintero', 'CP:Valparaíso': 'valparaiso', 'CP:Juan Fernández': 'juan_fernandez',
  'CP:Algarrobo': 'algarrobo', 'CP:San Antonio': 'san_antonio', 'CP:Pichilemu': 'pichilemu', 'CP:Lago Rapel': 'lago_rapel',
  'CP:Constitución': 'constitucion', 'CP:Lirquén': 'lirquen', 'CP:Talcahuano': 'talcahuano',
  'CP:San Vicente': 'san_vicente', 'CP:Coronel': 'coronel', 'CP:Lota': 'lota', 'CP:Lebu': 'lebu',
  'CP:Carahue': 'carahue', 'CP:Lago Villarrica': 'lago_villarrica', 'CP:Lago Panguipulli': 'lago_panguipulli',
  'CP:Lago Ranco': 'lago_ranco', 'CP:Valdivia': 'valdivia', 'CP:Corral': 'corral',
  'CP:Puerto Varas': 'puerto_varas', 'CP:Puerto Montt': 'puerto_montt', 'CP:Maullín': 'maullin',
  'CP:Calbuco': 'calbuco', 'CP:Río Negro Hornopirén': 'hornopiren', 'CP:Cochamó': 'cochamo',
  'CP:Ancud': 'ancud', 'CP:Quemchi': 'quemchi', 'CP:Chaitén': 'chaiten', 'CP:Achao': 'achao',
  'CP:Castro': 'castro', 'CP:Chonchi': 'chonchi', 'CP:Quellón': 'quellon',
  'CP:Melinka': 'melinka', 'CP:Puerto Cisnes': 'puerto_cisnes', 'CP:Puerto Aguirre': 'puerto_aguirre',
  'CP:Puerto Chacabuco': 'puerto_chacabuco', 'CP:Lago General Carrera': 'lago_general_carrera', 'CP:Baker': 'baker',
  'CP:Puerto Edén': 'puerto_eden', 'CP:Puerto Natales': 'puerto_natales', 'CP:Punta Arenas': 'punta_arenas',
  'CP:Punta Delgada': 'punta_delgada', 'CP:Tierra del Fuego': 'tierra_del_fuego',
  'GM:PUERTO WILLIAMS': 'puerto_williams',
  'CP:Bahía Fildes': 'bahia_fildes', 'CP:Puerto Soberanía': 'puerto_soberania',
  'CP:Rada Covadonga': 'rada_covadonga', 'CP:Bahía Paraíso': 'bahia_paraiso',
};

// --- 4. normalizacion ---
function norm(s) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')          // sin tildes
    .replace(/([A-Za-z\),.;:])\d{1,2}\b/g, '$1')                // marcas de nota al pie pegadas
    .replace(/\.\s+\d{1,2}\s*$/gm, '.')                         // marca de nota al final de linea
    .replace(/[\u00ba\u00b0\u00aa]/g, ' ')                      // º ° ª
    .replace(/[’‘´`'"“”\u2033\u2032]/g, ' ')                    // comillas y primas
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// tokens con normalizacion adicional de ortografia intercambiable
const SIN = { ia: 'i', ii: '2', iia: '2', iii: '3', vi: '6', xi: '11' };
function toks(s) { return norm(s).split(' ').filter(Boolean); }

// diff LCS simple sobre tokens
function diff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push(['=', a[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['-', a[i]]); i++; }
    else { out.push(['+', b[j]]); j++; }
  }
  while (i < n) out.push(['-', a[i++]]);
  while (j < m) out.push(['+', b[j++]]);
  // agrupar
  const grupos = [];
  let cur = null;
  for (const [k, t] of out) {
    if (k === '=') { if (cur) { grupos.push(cur); cur = null; } continue; }
    if (!cur || cur.k !== k) { if (cur) grupos.push(cur); cur = { k, t: [t], ctx: out.slice(Math.max(0, out.indexOf) ) }; cur.t = [t]; }
    else cur.t.push(t);
  }
  if (cur) grupos.push(cur);
  return { out, grupos };
}

const insumo = JSON.parse(fs.readFileSync(INS, 'utf8')).jurisdicciones;
const porId = Object.fromEntries(insumo.map(x => [x.id, x]));

const salida = [];
const vistos = new Set();
for (const b of bloques) {
  const clave = b.tipo + ':' + b.nombre;
  const id = MAP[clave];
  b.plano = b.texto.join(' ').replace(/\s+/g, ' ').trim();
  if (b.tipo === 'ART') { salida.push({ id: '(Art. 2)', oficial: b.plano, insumo: null }); continue; }
  if (!id) { salida.push({ id: null, clave, oficial: b.plano }); continue; }
  if (vistos.has(id)) continue;   // GM Arica ya cubre CP Arica
  vistos.add(id);
  salida.push({ id, clave, oficial: b.plano, insumo: porId[id] ? porId[id].texto_decreto : '(NO EXISTE EN EL INSUMO)' });
}

let rep = '';
for (const s of salida) {
  if (!s.id) { rep += `\n### [SIN MAPEO] ${s.clave}\n  OFICIAL: ${s.oficial}\n`; continue; }
  if (s.insumo === null) { rep += `\n### ${s.id}\n  OFICIAL: ${s.oficial}\n  INSUMO : (no aplica)\n`; continue; }
  const a = toks(s.oficial), b = toks(s.insumo);
  const { grupos } = diff(a, b);
  const igual = grupos.length === 0;
  rep += `\n### ${s.id}  ${igual ? '— IDENTICO (normalizado)' : '— ' + grupos.length + ' diferencia(s)'}\n`;
  if (!igual) {
    for (const g of grupos) rep += `   ${g.k === '-' ? 'SOLO OFICIAL' : 'SOLO INSUMO '}: ${g.t.join(' ')}\n`;
  }
}
const falt = insumo.map(x => x.id).filter(x => !vistos.has(x));
rep += `\n\n=== jurisdicciones del insumo no encontradas en el oficial: ${falt.length ? falt.join(', ') : 'ninguna'}\n`;
rep += `=== bloques oficiales sin mapeo: ${salida.filter(s => !s.id).length}\n`;
fs.writeFileSync(TXT.replace('tm025a.txt', 'cotejo.txt'), rep, 'utf8');
console.log(rep.slice(0, 200));
console.log('escrito, largo', rep.length);
