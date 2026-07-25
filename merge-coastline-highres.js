'use strict';
/**
 * Fusiona los tiles de alta resolución (Overpass, natural=coastline, por
 * bboxes chicos que sí completan) con el polígono simplificado global ya
 * existente. Más datos = más segmentos candidatos en el índice; no hay
 * conflicto por superposición, solo mejor detalle donde se pudo bajar.
 */
const fs = require('fs');
const path = require('path');

const REGIONAL_DIR = path.join(__dirname, 'src/services/data/coastline/regional');
const COMPACT_PATH = path.join(__dirname, 'src/services/data/coastline/coastline_compact.json');
const FALLBACK_PATH = path.join(__dirname, 'src/services/data/coastline/coastline_fallback.json');
const FALLBACK_DECIMATION = 6;

function decimateWay(way, n) {
  if (way.length <= 2) return way;
  const out = [way[0]];
  for (let i = n; i < way.length - 1; i += n) out.push(way[i]);
  out.push(way[way.length - 1]);
  return out;
}

function main() {
  const existingCompact = JSON.parse(fs.readFileSync(COMPACT_PATH, 'utf-8'));
  const existingWays = existingCompact.map(flat => {
    const w = [];
    for (let i = 0; i < flat.length; i += 2) w.push([flat[i], flat[i + 1]]);
    return w;
  });
  console.log(`Ways existentes (simplificado global): ${existingWays.length}`);

  const tileFiles = fs.readdirSync(REGIONAL_DIR).filter(f => f.endsWith('.json'));
  const newWays = [];
  for (const f of tileFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(REGIONAL_DIR, f), 'utf-8'));
    for (const el of data.elements || []) {
      if (!el.geometry || el.geometry.length < 2) continue;
      newWays.push(el.geometry.map(g => [g.lon, g.lat]));
    }
    console.log(`  ${f}: +${(data.elements || []).length} ways`);
  }
  console.log(`Ways nuevos (Overpass alta resolución): ${newWays.length}`);

  const allWays = [...existingWays, ...newWays];
  const compact = allWays.map(w => {
    const flat = new Array(w.length * 2);
    for (let i = 0; i < w.length; i++) { flat[i * 2] = w[i][0]; flat[i * 2 + 1] = w[i][1]; }
    return flat;
  });
  fs.writeFileSync(COMPACT_PATH, JSON.stringify(compact));

  const fallback = allWays.map(w => decimateWay(w, FALLBACK_DECIMATION).map(([lon, lat]) => [
    Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4,
  ]));
  fs.writeFileSync(FALLBACK_PATH, JSON.stringify(fallback));

  let totalPts = 0;
  for (const w of allWays) totalPts += w.length;
  console.log(`Total ways: ${allWays.length}, puntos: ${totalPts}`);
  console.log(`Compact: ${(fs.statSync(COMPACT_PATH).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Fallback: ${(fs.statSync(FALLBACK_PATH).size / 1024 / 1024).toFixed(2)} MB`);
}

main();
