const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\katia\\tmarea-pwa\\src\\data\\caletas_chile.json', 'utf8'));

function buscarCaletasLocal(query, limit = 8) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return data
    .filter(c => {
      const nombre = (c.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const comuna = (c.comuna || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const region = (c.region || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nombre.includes(q) || comuna.includes(q) || region.includes(q);
    })
    .slice(0, limit);
}

const queries = ['canamo', 'penas', 'aysen'];
for (const q of queries) {
  console.log(`\n=== QUERY: "${q}" ===`);
  const results = buscarCaletasLocal(q);
  console.log(`Resultados: ${results.length}`);
  for (const r of results) {
    console.log(`  nombre="${r.nombre}" | region="${r.region}" | comuna="${r.comuna}" | lat=${r.latitud} | lng=${r.longitud}`);
  }
  if (results.length === 0) {
    console.log('  *** NO ENCONTRADO — FALLO ***');
  }
}