'use strict';
// Regenera insumo_alterado_2026-08-11/ desde insumo_2026-08-11/.
// Dos alteraciones, una por dirección de la divergencia:
//   1. SITPORT incorpora la bahía 999 y publica una restricción bajo ella.
//   2. SITPORT deja de publicar la bahía 71 (Arica), que nosotros sí tenemos.
// Uso: node _bitacoras/e01_drift_catalogo_2026-08-11/alterar_insumo.js

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'insumo_2026-08-11');
const DST = path.join(__dirname, 'insumo_alterado_2026-08-11');
const leer = f => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));

fs.mkdirSync(DST, { recursive: true });

const bahias = leer('sitport_consultaBahias.json');
const restr = leer('sitport_consultaRestricciones.json');
const pron = leer('sitport_totalPronostico.json');

bahias.push({ IDBahia: 999, CdReparticion: 235, NMBahia: 'CALETA ALTERADA A PROPOSITO', color: 'default', valor: 0, Nom: 'ALTERADA999' });
restr.push({ ...restr[0], bahia: 999, GLBahia: 'CALETA ALTERADA A PROPOSITO', IDRestriccion: 999999 });

const esc = (arr, campo) => arr.filter(x => x[campo] !== 71);
fs.writeFileSync(path.join(DST, 'sitport_consultaBahias.json'), JSON.stringify(esc(bahias, 'IDBahia'), null, 2));
fs.writeFileSync(path.join(DST, 'sitport_consultaRestricciones.json'), JSON.stringify(esc(restr, 'bahia'), null, 2));
fs.writeFileSync(path.join(DST, 'sitport_totalPronostico.json'), JSON.stringify(esc(pron, 'idBahia'), null, 2));

console.log('insumo alterado regenerado en', DST, '(+999 con restricción, -71 Arica)');
