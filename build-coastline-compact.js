'use strict';
/**
 * Convierte simplified-land-polygons-complete-3857 (shapefile, EPSG:3857,
 * fuente oficial osmdata.openstreetmap.de) a coastline_compact.json:
 * reproyecta a WGS84, recorta al bbox de Chile Patagonia (X/XI/XII + margen)
 * y guarda cada anillo de polígono como un "way" cerrado en el formato
 * compacto que espera coastline-guard.js.
 */
const fs = require('fs');
const path = require('path');
const shapefile = require('shapefile');

const SHP_PATH = path.join(__dirname, 'src/services/data/coastline/land-polygons/simplified-land-polygons-complete-3857/simplified_land_polygons.shp');
const DBF_PATH = SHP_PATH.replace(/\.shp$/, '.dbf');
const OUT_COMPACT = path.join(__dirname, 'src/services/data/coastline/coastline_compact.json');
const OUT_FALLBACK = path.join(__dirname, 'src/services/data/coastline/coastline_fallback.json');

// Bbox de interés: X, XI y XII regiones + margen generoso (Reloncaví a Cabo de Hornos)
const BBOX = { minLon: -76.5, minLat: -56.5, maxLon: -66.0, maxLat: -40.0 };
const FALLBACK_DECIMATION = 4;

const R = 6378137; // radio usado por Web Mercator (EPSG:3857)
function mercatorToWgs84([x, y]) {
  const lon = (x / R) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI);
  return [lon, lat];
}

function ringBbox(ring) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
  }
  return { minLon, minLat, maxLon, maxLat };
}

function bboxIntersects(a, b) {
  return a.minLon <= b.maxLon && a.maxLon >= b.minLon && a.minLat <= b.maxLat && a.maxLat >= b.minLat;
}

function decimateRing(ring, n) {
  if (ring.length <= 4) return ring;
  const out = [ring[0]];
  for (let i = n; i < ring.length - 1; i += n) out.push(ring[i]);
  out.push(ring[ring.length - 1]);
  return out;
}

async function main() {
  const t0 = Date.now();
  const source = await shapefile.open(SHP_PATH, DBF_PATH);
  let nFeatures = 0, nRingsTotal = 0, nRingsKept = 0;
  const ways = [];

  let result = await source.read();
  while (!result.done) {
    nFeatures++;
    const geom = result.value.geometry;
    const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; // MultiPolygon

    for (const poly of polygons) {
      for (const ring of poly) {
        nRingsTotal++;
        const wgsRing = ring.map(mercatorToWgs84);
        const bb = ringBbox(wgsRing);
        if (!bboxIntersects(bb, BBOX)) continue;
        nRingsKept++;
        // cerrar el anillo explícitamente (primer punto === último) para que
        // el segmento de cierre también se indexe como línea de costa
        if (wgsRing[0][0] !== wgsRing[wgsRing.length - 1][0] || wgsRing[0][1] !== wgsRing[wgsRing.length - 1][1]) {
          wgsRing.push(wgsRing[0]);
        }
        ways.push(wgsRing);
      }
    }
    result = await source.read();
  }

  console.log(`Features: ${nFeatures}, anillos totales: ${nRingsTotal}, anillos en bbox Chile: ${nRingsKept}`);

  const compact = ways.map(w => {
    const flat = new Array(w.length * 2);
    for (let i = 0; i < w.length; i++) { flat[i * 2] = w[i][0]; flat[i * 2 + 1] = w[i][1]; }
    return flat;
  });
  fs.writeFileSync(OUT_COMPACT, JSON.stringify(compact));

  const fallback = ways.map(w => decimateRing(w, FALLBACK_DECIMATION).map(([lon, lat]) => [
    Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4,
  ]));
  fs.writeFileSync(OUT_FALLBACK, JSON.stringify(fallback));

  let totalPts = 0;
  for (const w of ways) totalPts += w.length;

  console.log(`OK (${Date.now() - t0}ms). ways=${ways.length} puntos=${totalPts}`);
  console.log(`Compact: ${(fs.statSync(OUT_COMPACT).size / 1024 / 1024).toFixed(2)} MB -> ${OUT_COMPACT}`);
  console.log(`Fallback: ${(fs.statSync(OUT_FALLBACK).size / 1024 / 1024).toFixed(2)} MB -> ${OUT_FALLBACK}`);
}

main().catch(e => { console.error(e); process.exit(1); });
