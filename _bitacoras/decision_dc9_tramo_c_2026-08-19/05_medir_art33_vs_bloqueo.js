'use strict';
// Lo que el Art. 33 lista y lo que NO lista — pertinente a D-3, que apaga el
// boton por "puerto cerrado". ALCANCE DECLARADO: se mide sobre los ONCE
// articulos extraidos en rrdn_articulos.json v2, NO sobre los 40 del decreto.
const fs = require('fs'); const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'decreto', 'rrdn_articulos.json'), 'utf8'));
console.log('articulos en el insumo v2: ' + j.articulos.length + '   (el decreto tiene ' + j.norma.articulos_del_decreto + ')');
console.log('ids: ' + j.articulos.map(a => a.id).join(', '));

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const todo = norm(j.articulos.map(a => a.texto_decreto.join(' ')).join('\n'));
const a33 = norm(j.articulos.find(a => a.id === 'art_33').texto_decreto.join(' '));
const a36 = norm(j.articulos.find(a => a.id === 'art_36').texto_decreto.join(' '));

const buscar = (t, etiqueta, texto) => console.log('  ' + etiqueta.padEnd(46) + (texto.includes(norm(t)) ? 'SI' : 'NO'));
console.log('');
console.log('=== EN EL ART. 33 (las causales por las que NO se otorga el zarpe) ===');
for (const t of ['puerto cerrado', 'mal tiempo', 'cerrado', 'tiempo', 'capitan', 'dotacion', 'certificados', 'carga'])
  buscar(t, JSON.stringify(t), a33);
console.log('');
console.log('=== EN EL ART. 36 ===');
for (const t of ['puerto cerrado', 'mal tiempo', 'a la gira']) buscar(t, JSON.stringify(t), a36);
console.log('');
console.log('=== EN LOS ONCE ARTICULOS EXTRAIDOS (alcance declarado, NO los 40) ===');
for (const t of ['puerto cerrado', 'mal tiempo', 'cierre de puerto', 'cerrado'])
  buscar(t, JSON.stringify(t), todo);
console.log('');
console.log('=== CONTROL POSITIVO del instrumento ===');
buscar('despacho', '"despacho" en los once', todo);
console.log('=== CONTROL NEGATIVO ===');
buscar('teselado', '"teselado" en los once (esperado NO)', todo);
