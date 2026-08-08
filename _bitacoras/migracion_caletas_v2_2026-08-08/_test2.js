const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\katia\\tmarea-pwa\\src\\data\\caletas_chile.json', 'utf8'));
function buscarCaletasLocal(query, limit = 8) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return data.filter(c => {
    const nombre = (c.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const comuna = (c.comuna || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const region = (c.region || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return nombre.includes(q) || comuna.includes(q) || region.includes(q);
  }).slice(0, limit);
}
const r = buscarCaletasLocal('puerto aysen');
console.log('QUERY: puerto aysen');
console.log('Resultados: ' + r.length);
for (const x of r) console.log('  nombre=' + x.nombre + ' | region=' + x.region + ' | lat=' + x.latitud);