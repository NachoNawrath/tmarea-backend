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
 * FERRIES (agregado 2026-07-29, caso El Banquito / Isla Huapi Abtao) --
 * hueco sistematico encontrado tras el cierre de Piedraplen: este caso NO
 * aparecio en las 326/34 candidatas originales porque el extractor
 * (tools/raster-build/extraer_highways_pbf.py) solo pedia highway=* --
 * el cruce esta mapeado unicamente como route=ferry (way 1116970201, sin
 * tag highway, con amenity=ferry_terminal en AMBOS extremos, calzando a
 * 0m de distancia contra la costa real de cada lado). Ni siquiera entraba
 * a la lista de 326 -- no era un problema del criterio de ancho, era que
 * la way jamas se extraia del .pbf.
 *
 * Verificado con el propio algoritmo de 4 ejes de este archivo (una vez
 * corregido el extractor): el ancho minimo local de El Banquito da 600m --
 * MAYOR al umbral de 300m. Osea que aunque el extractor lo hubiera
 * incluido desde el principio, el filtro de ancho lo habria descartado
 * igual. La razon de fondo: el umbral de ancho supone que "highway=* cruza
 * 600m de agua" es sospechoso (ninguna calle cruza un canal de 600m sin
 * puente real), pero para una ferry es lo opuesto -- un ferry sobre 600m
 * de agua real es normal, Chile tiene decenas. No hay hoy ninguna señal de
 * dato (tags, terminal, ancho) que distinga "ferry sobre agua real" de
 * "ferry/paso sobre istmo intermareal no navegable" -- asi que route=ferry
 * se extrae por separado (extraer_highways_pbf.py, "es_ferry": true) y se
 * reporta SIEMPRE para revision humana si pasa Filtro A/C, sin aplicar el
 * umbral de ancho. Mas caro en revision manual, pero es la unica forma
 * honesta de no perderse el proximo caso silenciosamente.
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
const RADIO_TIERRA_CERCANA_CELDAS = 5; // 250m a res 50m -- tolerancia de extremos de ferry, ver nota FERRIES

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
/** Celda de tierra (confianza=0) mas cercana dentro de un radio, o null. A
 * diferencia de un simple booleano, devuelve la celda real -- la necesitamos
 * para buscar semilla de agua alrededor de tierra REAL cuando el extremo de
 * la way no lo es (ver nota FERRIES). */
function celdaTierraCercaRC(fila, col, radioCeldas) {
  let mejor = null;
  let mejorD2 = Infinity;
  for (let dr = -radioCeldas; dr <= radioCeldas; dr++) {
    for (let dc = -radioCeldas; dc <= radioCeldas; dc++) {
      if (confianzaRC(fila + dr, col + dc) === 0) {
        const d2 = dr * dr + dc * dc;
        if (d2 < mejorD2) { mejorD2 = d2; mejor = [fila + dr, col + dc]; }
      }
    }
  }
  return mejor;
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

/** Busca agua no excluida cerca de (fila,col), ampliando el radio de 1 en 1
 * hasta radioMax. NEIGHBORS8 (radio 1) alcanza para landA/B real, pero para
 * el ancla de tierra-real de un ferry (ver nota FERRIES) el agua inmediata
 * puede caer entera dentro del corredor excluido del propio cruce -- hace
 * falta radio > 1 para encontrar semilla fuera de esa franja. */
function buscarSemillaAgua(fila, col, corredorExcluido, radioMax) {
  for (let r = 1; r <= radioMax; r++) {
    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== r) continue; // solo el anillo del radio actual
        const fr = fila + dr, cc = col + dc;
        if (corredorExcluido.has(fr * meta.cols + cc)) continue;
        if (confianzaRC(fr, cc) >= 1) return [fr, cc];
      }
    }
  }
  return undefined;
}

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
  const esFerry = !!(way.tags && way.tags.route === 'ferry'); // ver nota FERRIES mas abajo
  if (!esFerry && TIPOS_EXCLUIDOS.has(way.tags && way.tags.highway)) return null; // Filtro B (no aplica a ferries: no tienen tag highway)

  const geom = way.geometry;
  if (!geom || geom.length < 2) return null;

  const confs = geom.map((pt) => (pt ? confianzaLonLat(pt.lon, pt.lat) : null));

  let iA = -1;
  for (let i = 0; i < confs.length; i++) { if (confs[i] === 0) { iA = i; break; } }
  let iB = -1;
  for (let i = confs.length - 1; i >= 0; i--) { if (confs[i] === 0) { iB = i; break; } }

  // FERRIES -- extremos sin confianza=0 propia (2026-07-29, caso El
  // Banquito): el extremo de la way calzaba a 0m de la costa real
  // (natural=coastline) pero la celda del .bin ahi seguia en confianza=1 --
  // el water-polygon usado para rasterizar no tiene la precision del
  // extremo exacto de la costa vectorial. Con el criterio estricto (exigir
  // confs[i]===0 dentro de la propia geometria de la way), El Banquito
  // nunca generaba iA/iB y la funcion retornaba null ANTES de llegar al
  // filtro de ancho -- invisible para el pipeline por una segunda razon,
  // distinta de "no era highway=*". Para ferries, si no hay confianza=0 en
  // la propia way, se busca tierra en un radio chico alrededor de cada
  // extremo (tolerancia a la imprecision del raster contra la costa
  // vectorial) antes de descartar.
  let tierraRealA = null; // celda de tierra real cercana, si el extremo A no es tierra por si mismo
  let tierraRealB = null;
  if (esFerry) {
    if (iA === -1) {
      const { fila, col } = lonLatToRowCol(geom[0].lon, geom[0].lat);
      tierraRealA = celdaTierraCercaRC(fila, col, RADIO_TIERRA_CERCANA_CELDAS);
      if (tierraRealA) iA = 0;
    }
    if (iB === -1) {
      const last = geom.length - 1;
      const { fila, col } = lonLatToRowCol(geom[last].lon, geom[last].lat);
      tierraRealB = celdaTierraCercaRC(fila, col, RADIO_TIERRA_CERCANA_CELDAS);
      if (tierraRealB) iB = last;
    }
  }

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
  // Ancla para la busqueda de semilla de agua: la propia landA/landB si es
  // tierra real, o -- caso ferry con extremo sin confianza=0 propia -- la
  // celda de tierra real mas cercana (tierraRealA/B), para no buscar
  // vecinos de un punto que en realidad es agua (ver nota FERRIES).
  const [anclaFilaA, anclaColA] = tierraRealA || [filaA, colA];
  const [anclaFilaB, anclaColB] = tierraRealB || [filaB, colB];
  // radio 1 (NEIGHBORS8) para landA/B real; para el ancla de tierra-real de
  // un ferry, el corredor excluido puede tapar todo el radio 1 -- se
  // permite buscar mas lejos (ver buscarSemillaAgua).
  const radioSemillaA = tierraRealA ? RADIO_TIERRA_CERCANA_CELDAS : 1;
  const radioSemillaB = tierraRealB ? RADIO_TIERRA_CERCANA_CELDAS : 1;
  const seedA = buscarSemillaAgua(anclaFilaA, anclaColA, corredorExcluido, radioSemillaA);
  const seedB = buscarSemillaAgua(anclaFilaB, anclaColB, corredorExcluido, radioSemillaB);

  const celdasLadoA = seedA
    ? tamanoCuerpoDeAgua(seedA[0], seedA[1], filaA, colA, VENTANA_LADO_M, corredorExcluido, UMBRAL_CELDAS_LADO)
    : 0;
  const celdasLadoB = seedB
    ? tamanoCuerpoDeAgua(seedB[0], seedB[1], filaB, colB, VENTANA_LADO_M, corredorExcluido, UMBRAL_CELDAS_LADO)
    : 0;

  const pasaFiltroA = celdasLadoA >= UMBRAL_CELDAS_LADO && celdasLadoB >= UMBRAL_CELDAS_LADO; // agua sustancial a AMBOS lados
  const pasaFiltroC = largoAguaM <= UMBRAL_LARGO_M; // Filtro C: no es un camino pegado a la orilla por kilometros
  const anchoOk = anchoMinM < UMBRAL_ANCHO_M;

  // FERRIES -- por que NO se les aplica anchoOk (2026-07-29, caso El
  // Banquito / Isla Huapi Abtao): el umbral de ancho existe para
  // distinguir "canal real, ancho, normal" de "franja angosta
  // sospechosa de estar mal mapeada" en una VIA (highway=*), donde un
  // camino cruzando 600m de agua es rarisimo y por eso es señal fuerte de
  // bug. Un route=ferry es la señal CONTRARIA: existe precisamente PORQUE
  // alguien cruza agua ahi, y un ferry sobre 600m de agua real es de lo
  // mas normal (Chile tiene decenas). El caso El Banquito midio 600m por
  // este mismo algoritmo -- mayor al umbral de 300m -- y aun asi es un
  // istmo intermareal no navegable; el ferry tenia amenity=ferry_terminal
  // en ambos extremos, indistinguible de un ferry real solo por los tags.
  // No hay hoy una señal de dato que separe "ferry sobre agua real" de
  // "ferry/paso sobre intermareal" -- asi que TODA ferry con cruce
  // land-agua-land real (idxsAgua no vacio) y que pasa A/C se reporta
  // SIEMPRE para revision humana, sin importar el ancho.
  const esCandidata = esFerry
    ? (pasaFiltroA && pasaFiltroC)
    : (anchoOk && pasaFiltroA && pasaFiltroC);

  return {
    id: way.id,
    tags: way.tags || {},
    esFerry,
    landA: [landA.lat, landA.lon],
    landB: [landB.lat, landB.lon],
    largoTramoAguaM: Math.round(largoAguaM),
    anchoMinimoLocalM: Math.round(anchoMinM),
    puntoMasAngosto: nodoMasAngosto ? [nodoMasAngosto.lat, nodoMasAngosto.lon] : null,
    celdasLadoA,
    celdasLadoB,
    pasaFiltroA,
    pasaFiltroC,
    anchoOk,
    esCandidata,
  };
}

// ---------------------------------------------------------------------------

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const ways = (data.elements || []).filter((e) => e.type === 'way' && e.geometry);
const waysHighway = ways.filter((w) => w.tags && w.tags.highway);
const waysFerry = ways.filter((w) => w.tags && w.tags.route === 'ferry');
console.log(`Total ways highway (sin bridge/tunnel): ${waysHighway.length}`);
console.log(`Total ways route=ferry: ${waysFerry.length} (agregado 2026-07-29, caso El Banquito -- ver nota FERRIES mas abajo)`);
console.log(`Umbral de ancho: ${UMBRAL_ANCHO_M}m (ref: Paso Tautil, el mas angosto documentado del corredor, 241m) -- NO se aplica a ferries`);

const conAlgoDeAgua = ways.filter((w) =>
  w.geometry.some((pt) => pt && confianzaLonLat(pt.lon, pt.lat) >= 1)
);
console.log(`Ways (highway+ferry) con al menos un nodo en agua (prefiltro): ${conAlgoDeAgua.length}`);

const analizadas = [];
for (const w of conAlgoDeAgua) {
  const r = analizarWay(w);
  if (r !== null) analizadas.push(r);
}

const analizadasHighway = analizadas.filter((r) => !r.esFerry);
const analizadasFerry = analizadas.filter((r) => r.esFerry);

const anchoNoOk = analizadasHighway.filter((r) => !r.anchoOk);
const anchoOk = analizadasHighway.filter((r) => r.anchoOk);
const caminosLargos = anchoOk.filter((r) => !r.pasaFiltroC); // Filtro C: separados, no descartados
const charcoOZanja = anchoOk.filter((r) => r.pasaFiltroC && !r.pasaFiltroA); // Filtro A: descartados
const candidatas = anchoOk.filter((r) => r.pasaFiltroC && r.pasaFiltroA).sort((a, b) => a.anchoMinimoLocalM - b.anchoMinimoLocalM);

console.log(`\nWays highway evaluadas (con cruce land-agua-land real, ya sin path/footway/track): ${analizadasHighway.length}`);
console.log(`  Sobre umbral de ancho (${UMBRAL_ANCHO_M}m, canal ancho -- descartadas): ${anchoNoOk.length}`);
console.log(`  Bajo el umbral de ancho: ${anchoOk.length}`);
console.log(`    -> Filtro C (camino pegado a la orilla, largo_sobre_agua > ${UMBRAL_LARGO_M}m -- separadas aparte): ${caminosLargos.length}`);
console.log(`    -> Filtro A (charco/zanja sin salida, algun lado < ${UMBRAL_CELDAS_LADO} celdas -- descartadas): ${charcoOZanja.length}`);
console.log(`    -> CANDIDATAS FINALES highway (pasan los 3 filtros): ${candidatas.length}`);

console.log(`\n================ CANDIDATAS FINALES highway (ordenadas por ancho, mas angosto primero) ================`);
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

// FERRIES -- siempre a revision humana, sin filtro de ancho (ver nota en
// analizarWay). Solo se descartan por Filtro A (charco) y Filtro C (pegado
// a la orilla), que si tienen sentido para una ferry.
const candidatasFerry = analizadasFerry.filter((r) => r.esCandidata)
  .sort((a, b) => a.anchoMinimoLocalM - b.anchoMinimoLocalM);
console.log(`\n================ FERRIES -- REVISAR SIEMPRE (el umbral de ancho de ${UMBRAL_ANCHO_M}m NO aplica) ================`);
console.log(`route=ferry evaluadas: ${analizadasFerry.length}, candidatas (pasan Filtro A/C): ${candidatasFerry.length}`);
if (process.env.DEBUG_FERRY) {
  for (const r of analizadasFerry) {
    console.log(`  DEBUG id=${r.id} anchoMinimoLocalM=${r.anchoMinimoLocalM} pasaFiltroA=${r.pasaFiltroA} (ladoA=${r.celdasLadoA} ladoB=${r.celdasLadoB}) pasaFiltroC=${r.pasaFiltroC} largoTramoAguaM=${r.largoTramoAguaM} esCandidata=${r.esCandidata}`);
  }
}
for (const r of candidatasFerry) {
  console.log(
    `id=${r.id} name="${r.tags.name || ''}" ancho_min_local=${r.anchoMinimoLocalM}m (informativo, NO filtra) ` +
    `largo_sobre_agua=${r.largoTramoAguaM}m lado_A=${r.celdasLadoA}${r.celdasLadoA >= UMBRAL_CELDAS_LADO ? '+' : ''} lado_B=${r.celdasLadoB}${r.celdasLadoB >= UMBRAL_CELDAS_LADO ? '+' : ''} ` +
    `landA=${r.landA} landB=${r.landB}`
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
fs.writeFileSync(
  inputPath.replace(/\.json$/, '.candidatas-ferry.json'),
  JSON.stringify(candidatasFerry, null, 2)
);
console.log(`\nGuardado: ${inputPath.replace(/\.json$/, '.candidatas-exclusion.json')} (${candidatas.length})`);
console.log(`Guardado: ${inputPath.replace(/\.json$/, '.caminos-pegados-orilla.json')} (${caminosLargos.length})`);
console.log(`Guardado: ${inputPath.replace(/\.json$/, '.candidatas-ferry.json')} (${candidatasFerry.length})`);

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
