// VERSIONADO EL 2026-08-21. Es el instrumento que CORRIO, con UNA sola edicion:
// la raiz del repositorio salia clavada como 'C:/Users/katia/tmarea-backend' y
// ahora se deriva de __dirname, para que corra en cualquier clon. Nada mas se
// toco. Se volvio a correr despues de la edicion — un instrumento no se da por
// bueno porque compila (§ regla de los doce defectos).
const fs = require('fs'), path = require('path');
const RAIZ = require('path').resolve(__dirname, '..', '..');
const D = JSON.parse(fs.readFileSync(RAIZ + '/data/deudas/deudas_declaradas.json', 'utf8'));
const ids = new Set(D.deudas.map(d => d.id));
const re = /[A-Za-z0-9._-]+::[a-z0-9-]{4,}/g;
const hits = {};
function walk(p) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    if (e.isDirectory()) { walk(f); continue; }
    if (!/\.(txt|md|json|js|py)$/.test(e.name)) continue;
    let t; try { t = fs.readFileSync(f, 'utf8'); } catch (x) { continue; }
    const m = t.match(re); if (!m) continue;
    for (const id of new Set(m)) {
      if (!hits[id]) hits[id] = new Set();
      hits[id].add(path.relative(RAIZ, f).split(path.sep).join('/'));
    }
  }
}
walk(RAIZ + '/_bitacoras');
const faltan = Object.keys(hits).filter(id => !ids.has(id));
console.log('CONTROL POSITIVO: ids con "::" hallados en _bitacoras = ' + Object.keys(hits).length);
console.log('de esos, PRESENTES en el declarativo = ' + (Object.keys(hits).length - faltan.length));
console.log('de esos, AUSENTES del declarativo    = ' + faltan.length);
console.log('');
faltan.sort().forEach(id => console.log('AUSENTE  ' + id + '\n         <- ' + [...hits[id]].slice(0, 4).join('\n         <- ')));
