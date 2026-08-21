// P7 - PASE 1 ACOTADO, CONTRA EL DUMP DE GEONAMES (CL)
// CRITERIO: 04_criterio_busqueda.txt.
//
// LA TERCERA FUENTE, y la unica de procedencia independiente de OSM: el sondeo
// del 2026-08-20 midio que 490 de los 1.156 natural=cape de Chile en OSM traen
// source=IGM, o sea que OSM-Chile bebe del gazetteer del Estado. GeoNames no.
//
// El dump NO pide cuenta (el API si). Vive en el scratchpad, no en el repo:
// son 6 MB y lo que la bitacora necesita es la EVIDENCIA DERIVADA, no el
// gazetteer entero. Procedencia completa en PROCEDENCIA.md.

const fs = require('fs'), path = require('path');
const AN = require(path.join(__dirname, 'anclas_39.json'));
const TT = require(path.join(__dirname, 'toponimos_39.json')).toponimos;
const DUMP = process.argv[2];

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const GEN = /^(PUNTAS?|ISLAS?|ISLOTES?|ROCAS?|PIEDRA|MORRO|CERRO|FARO|BALIZA|BOYA|CALETA|CANAL|MUELLE|RIO|PUENTE|PENINSULA|BANCO|BAHIA|EL|LA|LOS|LAS|DE|DEL)\s+/;
function nucleo(s) { let x = fold(s); let p; do { p = x; x = x.replace(GEN, ''); } while (x !== p); return x || fold(s); }

// EL VOCABULARIO DE FEATURE CODES de GeoNames que puede ser uno de los doce
// tipos del criterio. Declarado, igual que el de Overpass.
const CODES = new Set(['CAPE','PT','PTS','ISL','ISLS','ISLET','ISLETS','RK','RKS','RDGE','PK','HLL','HLLS','LTHSE','BAY','BAYS','CHN','CHNM','STM','STMM','CMTY','BDG','PIER','MOLE','HBR','ANCH','CST','BCH','SHOL','RF','MT','SPUR','PROM']);

function boxOf(a) {
  if (a.tipo === 'RESPALDO_DEBIL') { const c = a.cajon, m = 0.25;
    return { s: c.latS - m, n: c.latN + m, w: Math.min(c.lonW, c.lonE) - m, e: Math.max(c.lonW, c.lonE) + m }; }
  const dlat = a.R_km / 111, dlon = a.R_km / (111 * Math.cos(a.lat * Math.PI / 180));
  return { s: a.lat - dlat, n: a.lat + dlat, w: a.lon - dlon, e: a.lon + dlon };
}

const lineas = fs.readFileSync(DUMP, 'utf8').split('\n');
const G = [];
for (const ln of lineas) {
  if (!ln) continue;
  const c = ln.split('\t');
  if (c.length < 9) continue;
  if (!CODES.has(c[7])) continue;
  G.push({ id: c[0], name: c[1], alt: c[3], lat: +c[4], lon: +c[5], code: c[7], adm1: c[10] });
}
console.log(`GeoNames CL: ${lineas.length} filas · ${G.length} de clase relevante (${CODES.size} feature codes declarados)`);

const res = {};
let conCand = 0;
for (const t of TT) {
  if (!t.busqueda) continue;
  const b = boxOf(AN[t.n]);
  const nu = nucleo(t.busqueda);
  const enCaja = G.filter(g => g.lat >= b.s && g.lat <= b.n && g.lon >= b.w && g.lon <= b.e);
  const re = new RegExp('(^|\\s)' + nu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|\\s)');
  const t1 = enCaja.filter(g => re.test(fold(g.name)) || (g.alt && re.test(fold(g.alt))));
  const t2 = enCaja.filter(g => !t1.includes(g) && (fold(g.name).includes(nu) || (g.alt && fold(g.alt).includes(nu))));
  res[t.n + '|' + t.cita] = { nucleo: nu, en_caja: enCaja.length, t1: t1, t2: t2 };
  if (t1.length || t2.length) conCand++;
}
fs.writeFileSync(path.join(__dirname, 'geonames_crudo.json'), JSON.stringify(res, null, 1), 'utf8');
const total = Object.keys(res).length;
console.log(`toponimos consultados: ${total}   con al menos un candidato: ${conCand}   sin ninguno: ${total - conCand}`);

// CONTROL POSITIVO: un nucleo fabricado no puede tener candidatos en ninguna caja.
const nuFalso = fold('ZZQXV');
const falsos = G.filter(g => fold(g.name).includes(nuFalso)).length;
console.log(`CONTROL POSITIVO - nucleo fabricado "ZZQXV" en las ${G.length} filas de clase relevante: ${falsos} ${falsos === 0 ? 'OK' : 'ROJO'}`);
// CONTROL NEGATIVO: un nucleo que TIENE que estar
const nuReal = fold('VALPARAISO');
console.log(`CONTROL NEGATIVO - "VALPARAISO" aparece en: ${G.filter(g => fold(g.name).includes(nuReal)).length} filas (tiene que ser > 0)`);
