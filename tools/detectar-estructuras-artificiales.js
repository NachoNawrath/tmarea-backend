'use strict';
/**
 * detectar-estructuras-artificiales.js
 *
 * Detecta ways highway=* que el water-polygon de OSM no registra como
 * tierra: terraplenes, espigones, causeways y tombolos artificiales que
 * cortan un canal pero no modifican la linea de costa mapeada (caso
 * Piedraplen, Calbuco -- diagnostico 2026-07-28). El router los rutea
 * como si fueran agua porque el .bin, correctamente construido a partir
 * de esos water-polygons, tambien los ve como agua.
 *
 * Input: JSON con la forma { elements: [{type:'way', id, tags,
 * geometry:[{lat,lon}|null, ...]}, ...] } -- la misma forma que devuelve
 * Overpass "out geom", generado en la practica por
 * tools/raster-build/extraer_highways_pbf.py sobre un extracto .osm.pbf
 * local (Overpass en vivo no es viable para barrer el bbox completo de
 * un tile -- ver diagnostico, la API publica se cae con bbox > ~1 grado).
 *
 * CRITERIO -- historia de por que es este y no otro:
 *
 * v1 (descartada): "algun nodo de la way sobre confianza>=1" -- ruido
 * total, cualquier muelle o camino costero cae ahi sin cortar nada.
 *
 * v2 (descartada): flood-fill de landA a landB (primer/ultimo nodo en
 * tierra de la way) sobre confianza>=1, sin restriccion de ventana mas
 * que un margen proporcional al largo del cruce. Fallo en el propio
 * Piedraplen: el BFS "rodeaba" a los pocos metros porque el agua mal
 * mapeada alrededor del terraplen tiene varias celdas de ancho, asi que
 * el flood-fill encontraba camino DENTRO de la misma mancha mal mapeada,
 * no un rodeo real.
 *
 * v3 (descartada): igual que v2 pero excluyendo del flood-fill un buffer
 * alrededor del propio trazado de la way. Se probo con buffer angosto
 * (2-3 celdas) sobre SOLO los nodos de agua del cruce: seguia encontrando
 * "rodeo" porque la mancha mal mapeada resulto tener cientos de metros de
 * extension (era el humedal costero real junto al terraplen, no un
 * artefacto puntual). Y el problema de fondo es mas grave: Isla Calbuco
 * es una isla real en una bahia real (Seno de Reloncavi / Estero de
 * Calbuco) -- CUALQUIER ventana de busqueda suficientemente grande va a
 * encontrar un "rodeo" por agua real, porque en la realidad SI se puede
 * rodear la isla en velero. La pregunta "landA y landB, ¿son alcanzables
 * por agua?" es CASI SIEMPRE "si" para una isla real, y no distingue eso
 * de un muelle legitimo. Reachability no es el criterio correcto.
 *
 * v4 (la que usa este archivo): geometria local, no alcanzabilidad
 * global. En cada nodo de agua del cruce, se mide el ANCHO MINIMO del
 * cuerpo de agua LOCAL: se lanzan 4 rayos en pares de ejes opuestos
 * (E-O, N-S, NE-SO, NO-SE) hasta encontrar tierra (confianza=0) en cada
 * direccion, y el ancho de cada eje es la suma de ambas distancias. El
 * ancho reportado es el MINIMO de los 4 ejes -- la seccion transversal
 * mas angosta del cuerpo de agua en ese punto, que es independiente de
 * cuanto se extienda el cuerpo de agua a lo lejos (no importa si Isla
 * Calbuco es rodeable a 20 km, importa si HAY 200m de agua real cruzando
 * el camino en el punto exacto del cruce).
 *
 * Umbral: 300m. Referencia: el paso navegable documentado MAS ANGOSTO de
 * todo el corredor troncal segun el Derrotero SHOA es Paso Tautil, Seno
 * de Reloncavi, con 241m de ancho util (ver src/config/perfiles-costo.js,
 * derivacion de dMinM). Cualquier "canal" con ancho local por debajo de
 * eso es mas angosto que el paso mas angosto conocido y confirmado del
 * corredor -- fuertemente sospechoso de ser agua mal mapeada alrededor
 * de una estructura, no un canal real. Umbral deliberadamente generoso
 * (por encima de 241m) porque esto es una lista para revision humana, no
 * una decision automatica: mejor sobre-incluir.
 *
 * TRES FILTROS ADICIONALES (2026-07-28, tras revisar las primeras 326
 * candidatas -- demasiado ruido para revisar a mano):
 *
 * Filtro A -- tamaño de cuerpo de agua a CADA LADO. Una estructura que
 * corta un canal real tiene agua navegable sustancial a ambos lados; una
 * zanja junto a un camino tiene agua sin salida (una mancha chica,
 * aislada). Se excluyen las celdas del propio cruce (los nodos de agua
 * entre landA y landB) y se hace flood-fill por separado desde el lado
 * de landA y desde el lado de landB, cada uno acotado a una ventana de
 * 2km. Si CUALQUIERA de los dos lados conecta menos de 500 celdas de
 * agua, se descarta (charco/zanja sin salida). Esto es distinto del
 * "reachability" de v2/v3: ahi se preguntaba si A y B se conectan ENTRE
 * SI (fallaba por islas reales); aca se pregunta si CADA lado, por
 * separado, es un cuerpo de agua sustancial -- no importa si conectan
 * entre si o no.
 *
 * Filtro B -- tipo de via. path/footway/track no cortan navegacion de
 * nave menor (son sendas peatonales o huellas, no correspond a la escala
 * del problema). Se descartan directo por tag.
 *
 * Filtro C -- largo del tramo sobre agua. Un cruce puntual (terraplen,
 * puente) mide decenas a cientos de metros (Piedraplen: 431-505m). Un
 * camino de kilometros "sobre agua" casi siempre es un camino corriendo
 * PEGADO a la orilla de un lago/fiordo con el water-polygon extendido
 * sobre la banquina, no una estructura puntual -- es un problema de
 * precision de la mascara en un tramo largo, no un obstaculo localizado.
 * Se separan a categoria aparte (no se cuentan como exclusion) los casos
 * con largo_sobre_agua > 1000m.
 *
 * No escribe src/config/exclusiones.json ni rasteriza nada -- es solo
 * diagnostico. Ese paso es manual, revisando caso por caso (algunas
 * candidatas pueden ser puentes reales mal mapeados, sin bridge=yes, o
 * canales genuinamente angostos no documentados en el derrotero).
 *
 * Uso:
 *   node tools/detectar-estructuras-artificiales.js <archivo.json> [--umbral=300]
 */

const fs = require('fs');
const proj4 = require('proj4');
const { loadTile } = require('../src/services/raster/tile-loader');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Uso: node tools/detectar-estructuras-artificiales.js <archivo.json> [--umbral=300]');
  process.exit(1);
}
const umbralArg = process.argv.find((a) => a.startsWith('--umbral='));
const UMBRAL_ANCHO_M = umbralArg ? Number(umbralArg.split('=')[1]) : 300;

const TIPOS_EXCLUIDOS = new Set(['path', 'footway', 'track']); // Filtro B
const UMBRAL_LARGO_M = 1000; // Filtro C
const UMBRAL_CELDAS_LADO = 500; // Filtro A
const VENTANA_LADO_M = 2000;

const TILE = loadTile('AUSTRAL_N');
const meta = TILE.meta;

function lonLatToRowCol(lon, lat) {
  const [x, y] = proj4('EPSG:4326', meta.crs_proj4, [lon, lat]);
  const col = Math.floor((x - meta.origin_x) / meta.res_m);
  const fila = Math.floor((meta.origin_y - y) / meta.res_m);
  return { fila, col };
}
function confianzaRC(fila, col) {
  if (fila < 0 || fila >= meta.rows || col < 0 || col >= meta.cols) return null;
  const raw = TILE.packed[fila * meta.cols + col];
  return (raw >> 13) & 0b11;
}
function confianzaLonLat(lon, lat) {
  const { fila, col } = lonLatToRowCol(lon, lat);
  return confianzaRC(fila, col);
}

function haversineM(lon1, lat1, lon2, lat2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 4 ejes en pares de direcciones opuestas (8-conectividad completa)
const EJES = [
  [[0, 1], [0, -1]],   // E-O
  [[1, 0], [-1, 0]],   // S-N
  [[1, 1], [-1, -1]],  // SE-NO
  [[1, -1], [-1, 1]],  // SO-NE
];
const MAX_CELDAS_RAYO = 40; // 2000m -- si no hay tierra antes de eso, no es "angosto" bajo ningun criterio razonable

/** Ancho minimo (m) del cuerpo de agua local en (fila,col), sobre los 4 ejes. */
function anchoMinimoLocalM(fila, col) {
  let minAncho = Infinity;
  for (const [[dr1, dc1], [dr2, dc2]] of EJES) {
    let d1 = MAX_CELDAS_RAYO;
    for (let k = 1; k <= MAX_CELDAS_RAYO; k++) {
      const c = confianzaRC(fila + dr1 * k, col + dc1 * k);
      if (c === null || c === 0) { d1 = k; break; }
    }
    let d2 = MAX_CELDAS_RAYO;
    for (let k = 1; k <= MAX_CELDAS_RAYO; k++) {
      const c = confianzaRC(fila + dr2 * k, col + dc2 * k);
      if (c === null || c === 0) { d2 = k; break; }
    }
    const anchoCeldas = d1 + d2;
    if (anchoCeldas < minAncho) minAncho = anchoCeldas;
  }
  return minAncho * meta.res_m;
}

const NEIGHBORS8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

/**
 * Tamaño (celdas) del cuerpo de agua conectado desde (filaSemilla,colSemilla),
 * dentro de una ventana de +-margenM alrededor de (filaCentro,colCentro),
 * excluyendo las celdas del propio cruce (corredorExcluido). Se corta el
 * conteo en UMBRAL_CELDAS_LADO -- no hace falta seguir de largo una vez que
 * ya sabemos que el lado es "suficientemente grande".
 */
function tamanoCuerpoDeAgua(filaSemilla, colSemilla, filaCentro, colCentro, margenM, corredorExcluido, tope) {
  const margenCeldas = Math.ceil(margenM / meta.res_m);
  const rowMin = filaCentro - margenCeldas, rowMax = filaCentro + margenCeldas;
  const colMin = colCentro - margenCeldas, colMax = colCentro + margenCeldas;

  const esPasable = (r, c) => {
    if (r < rowMin || r > rowMax || c < colMin || c > colMax) return false;
    if (corredorExcluido.has(r * meta.cols + c)) return false;
    return confianzaRC(r, c) >= 1;
  };

  if (!esPasable(filaSemilla, colSemilla)) return 0;

  const visitados = new Set([filaSemilla * meta.cols + colSemilla]);
  const queue = [[filaSemilla, colSemilla]];
  let qi = 0;
  while (qi < queue.length && visitados.size < tope) {
    const [r, c] = queue[qi++];
    for (const [dr, dc] of NEIGHBORS8) {
      const nr = r + dr, nc = c + dc;
      const key = nr * meta.cols + nc;
      if (visitados.has(key)) continue;
      if (!esPasable(nr, nc)) continue;
      visitados.add(key);
      queue.push([nr, nc]);
      if (visitados.size >= tope) break;
    }
  }
  return visitados.size;
}

function analizarWay(way) {
  if (TIPOS_EXCLUIDOS.has(way.tags && way.tags.highway)) return null; // Filtro B

  const geom = way.geometry;
  if (!geom || geom.length < 2) return null;

  const confs = geom.map((pt) => (pt ? confianzaLonLat(pt.lon, pt.lat) : null));

  let iA = -1;
  for (let i = 0; i < confs.length; i++) { if (confs[i] === 0) { iA = i; break; } }
  let iB = -1;
  for (let i = confs.length - 1; i >= 0; i--) { if (confs[i] === 0) { iB = i; break; } }

  if (iA === -1 || iB === -1 || iA >= iB) return null; // sin tierra en ambos extremos, o sin hueco de agua real

  // indices de agua real estrictamente entre medio
  const idxsAgua = [];
  for (let i = iA + 1; i < iB; i++) { if (confs[i] !== null && confs[i] >= 1) idxsAgua.push(i); }
  if (idxsAgua.length === 0) return null; // no hay cruce que evaluar

  const landA = geom[iA];
  const landB = geom[iB];

  // ancho minimo local: el peor caso (mas angosto) entre todos los nodos de agua del cruce
  let anchoMinM = Infinity;
  let nodoMasAngosto = null;
  for (const i of idxsAgua) {
    const { fila, col } = lonLatToRowCol(geom[i].lon, geom[i].lat);
    const ancho = anchoMinimoLocalM(fila, col);
    if (ancho < anchoMinM) { anchoMinM = ancho; nodoMasAngosto = geom[i]; }
  }

  let largoAguaM = 0;
  for (let i = iA; i < iB; i++) {
    largoAguaM += haversineM(geom[i].lon, geom[i].lat, geom[i + 1].lon, geom[i + 1].lat);
  }

  // Filtro A: corredor propio del cruce (los nodos de agua entre landA y
  // landB, +-1 celda) excluido del flood-fill, para que "lado A" y "lado B"
  // no sean trivialmente el mismo blob conectado a traves del propio cruce.
  const corredorExcluido = new Set();
  for (const i of idxsAgua) {
    const { fila, col } = lonLatToRowCol(geom[i].lon, geom[i].lat);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      corredorExcluido.add((fila + dr) * meta.cols + (col + dc));
    }
  }

  const { fila: filaA, col: colA } = lonLatToRowCol(landA.lon, landA.lat);
  const { fila: filaB, col: colB } = lonLatToRowCol(landB.lon, landB.lat);
  const seedA = NEIGHBORS8.map(([dr, dc]) => [filaA + dr, colA + dc])
    .find(([r, c]) => !corredorExcluido.has(r * meta.cols + c) && confianzaRC(r, c) >= 1);
  const seedB = NEIGHBORS8.map(([dr, dc]) => [filaB + dr, colB + dc])
    .find(([r, c]) => !corredorExcluido.has(r * meta.cols + c) && confianzaRC(r, c) >= 1);

  const celdasLadoA = seedA
    ? tamanoCuerpoDeAgua(seedA[0], seedA[1], filaA, colA, VENTANA_LADO_M, corredorExcluido, UMBRAL_CELDAS_LADO)
    : 0;
  const celdasLadoB = seedB
    ? tamanoCuerpoDeAgua(seedB[0], seedB[1], filaB, colB, VENTANA_LADO_M, corredorExcluido, UMBRAL_CELDAS_LADO)
    : 0;

  const pasaFiltroA = celdasLadoA >= UMBRAL_CELDAS_LADO && celdasLadoB >= UMBRAL_CELDAS_LADO; // agua sustancial a AMBOS lados
  const pasaFiltroC = largoAguaM <= UMBRAL_LARGO_M; // Filtro C: no es un camino pegado a la orilla por kilometros

  return {
    id: way.id,
    tags: way.tags || {},
    landA: [landA.lat, landA.lon],
    landB: [landB.lat, landB.lon],
    largoTramoAguaM: Math.round(largoAguaM),
    anchoMinimoLocalM: Math.round(anchoMinM),
    puntoMasAngosto: nodoMasAngosto ? [nodoMasAngosto.lat, nodoMasAngosto.lon] : null,
    celdasLadoA,
    celdasLadoB,
    pasaFiltroA,
    pasaFiltroC,
    anchoOk: anchoMinM < UMBRAL_ANCHO_M,
    esCandidata: anchoMinM < UMBRAL_ANCHO_M && pasaFiltroA && pasaFiltroC,
  };
}

// ---------------------------------------------------------------------------

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const ways = (data.elements || []).filter((e) => e.type === 'way' && e.geometry);
console.log(`Total ways highway (sin bridge/tunnel): ${ways.length}`);
console.log(`Umbral de ancho: ${UMBRAL_ANCHO_M}m (ref: Paso Tautil, el mas angosto documentado del corredor, 241m)`);

const conAlgoDeAgua = ways.filter((w) =>
  w.geometry.some((pt) => pt && confianzaLonLat(pt.lon, pt.lat) >= 1)
);
console.log(`Ways con al menos un nodo en agua (prefiltro): ${conAlgoDeAgua.length}`);

const analizadas = [];
for (const w of conAlgoDeAgua) {
  const r = analizarWay(w);
  if (r !== null) analizadas.push(r);
}

const anchoNoOk = analizadas.filter((r) => !r.anchoOk);
const anchoOk = analizadas.filter((r) => r.anchoOk);
const caminosLargos = anchoOk.filter((r) => !r.pasaFiltroC); // Filtro C: separados, no descartados
const charcoOZanja = anchoOk.filter((r) => r.pasaFiltroC && !r.pasaFiltroA); // Filtro A: descartados
const candidatas = anchoOk.filter((r) => r.pasaFiltroC && r.pasaFiltroA).sort((a, b) => a.anchoMinimoLocalM - b.anchoMinimoLocalM);

console.log(`\nWays evaluadas (con cruce land-agua-land real, ya sin path/footway/track): ${analizadas.length}`);
console.log(`  Sobre umbral de ancho (${UMBRAL_ANCHO_M}m, canal ancho -- descartadas): ${anchoNoOk.length}`);
console.log(`  Bajo el umbral de ancho: ${anchoOk.length}`);
console.log(`    -> Filtro C (camino pegado a la orilla, largo_sobre_agua > ${UMBRAL_LARGO_M}m -- separadas aparte): ${caminosLargos.length}`);
console.log(`    -> Filtro A (charco/zanja sin salida, algun lado < ${UMBRAL_CELDAS_LADO} celdas -- descartadas): ${charcoOZanja.length}`);
console.log(`    -> CANDIDATAS FINALES (pasan los 3 filtros): ${candidatas.length}`);

console.log(`\n================ CANDIDATAS FINALES (ordenadas por ancho, mas angosto primero) ================`);
for (const r of candidatas) {
  console.log(
    `id=${r.id} highway=${r.tags.highway || ''} name="${r.tags.name || ''}" ` +
    `ancho_min_local=${r.anchoMinimoLocalM}m largo_sobre_agua=${r.largoTramoAguaM}m ` +
    `lado_A=${r.celdasLadoA}${r.celdasLadoA >= UMBRAL_CELDAS_LADO ? '+' : ''} lado_B=${r.celdasLadoB}${r.celdasLadoB >= UMBRAL_CELDAS_LADO ? '+' : ''} ` +
    `punto_mas_angosto=${r.puntoMasAngosto} landA=${r.landA} landB=${r.landB}`
  );
}

console.log(`\n================ CAMINOS PEGADOS A LA ORILLA (Filtro C, aparte -- NO son estructuras) ================`);
for (const r of caminosLargos.sort((a, b) => b.largoTramoAguaM - a.largoTramoAguaM)) {
  console.log(
    `id=${r.id} highway=${r.tags.highway || ''} name="${r.tags.name || ''}" ` +
    `largo_sobre_agua=${r.largoTramoAguaM}m ancho_min_local=${r.anchoMinimoLocalM}m landA=${r.landA} landB=${r.landB}`
  );
}

fs.writeFileSync(
  inputPath.replace(/\.json$/, '.candidatas-exclusion.json'),
  JSON.stringify(candidatas, null, 2)
);
fs.writeFileSync(
  inputPath.replace(/\.json$/, '.caminos-pegados-orilla.json'),
  JSON.stringify(caminosLargos, null, 2)
);
console.log(`\nGuardado: ${inputPath.replace(/\.json$/, '.candidatas-exclusion.json')} (${candidatas.length})`);
console.log(`Guardado: ${inputPath.replace(/\.json$/, '.caminos-pegados-orilla.json')} (${caminosLargos.length})`);

// Verificacion especifica: Piedraplen debe aparecer entre las candidatas finales
console.log(`\n================ VERIFICACION PIEDRAPLEN ================`);
const piedraplen = analizadas.filter((r) =>
  /piedraplen|vicu.a mackenna|caica.n/i.test(r.tags.name || '')
);
if (piedraplen.length === 0) {
  console.log('NO aparece ninguna way de Piedraplen/Vicuña Mackenna/Caicaén entre las analizadas -- el criterio esta mal.');
} else {
  for (const r of piedraplen) {
    console.log(`id=${r.id} name="${r.tags.name}" ancho_min_local=${r.anchoMinimoLocalM}m ` +
      `anchoOk=${r.anchoOk} pasaFiltroA=${r.pasaFiltroA} (lado_A=${r.celdasLadoA}, lado_B=${r.celdasLadoB}) pasaFiltroC=${r.pasaFiltroC} ` +
      `esCandidata=${r.esCandidata} largo_agua=${r.largoTramoAguaM}m`);
  }
}
