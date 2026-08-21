// VERSIONADO EL 2026-08-21. Es el instrumento que CORRIO, con UNA sola edicion:
// la raiz del repositorio salia clavada como 'C:/Users/katia/tmarea-backend' y
// ahora se deriva de __dirname, para que corra en cualquier clon. Nada mas se
// toco. Se volvio a correr despues de la edicion — un instrumento no se da por
// bueno porque compila (§ regla de los doce defectos).
// ESCRITURA 1 -- las cuatro del voseo + contador 1->5 + nota/vocabulario ampliados.
const fs = require('fs');
const R = require('path').resolve(__dirname, '..', '..') + '/';
const P = R + 'data/deudas/deudas_declaradas.json';

const crudo = fs.readFileSync(P, 'utf8');
const D = JSON.parse(crudo);
const CUATRO = JSON.parse(fs.readFileSync(R + '_bitacoras/voseo_al_patron_2026-08-20/18_cuatro_filas.json', 'utf8'));

const antes = D.deudas.length;
const ya = new Set(D.deudas.map(d => d.id));
for (const f of CUATRO) {
  if (ya.has(f.id)) throw new Error('ALTO: la fila ya estaba -> ' + f.id);
  D.deudas.push(f);
}

const s = D.cobertura.sitios.find(x => x.id === 'SESION-voseo-al-patron-2026-08-20');
if (!s) throw new Error('ALTO: no existe el sitio del voseo');
if (s.filas_en_este_declarativo !== 1) throw new Error('ALTO: el contador no era 1, era ' + s.filas_en_este_declarativo);
s.filas_en_este_declarativo = 5;

s.vocabulario_del_barrido.push(
  'las CUATRO filas que salieron de APLICAR el §10 en usted el 2026-08-20: el contrato citandose a si mismo, INV-3.6 con el [telefono] que INV-10.1 saco, el tuteo de INV-4.7 fuera del §10, y la tabla del PLAN que cita un §10 que ya no existe. Se buscaron ANTES de escribir en el contrato, no despues.'
);

s.nota += ' AMPLIADO el 2026-08-21: entran las CUATRO filas que la sesion dejo REDACTADAS Y NO APLICADAS en 18_cuatro_filas.json, y el contador sube de 1 a 5. No se aplicaron el 2026-08-20 porque otra sesion tenia el declarativo stageado en el indice compartido; esa sesion aterrizo en 8859da8 y el bloqueo caduco. Las cuatro entran BYTE POR BYTE como se redactaron, sin retocar: ninguna paso por el validador antes de hoy. Se declaran aparte de la fila de cotejo-contrato.js para que el sitio no afirme de si mismo algo que no hizo: aquella salio de medir el registro, estas cuatro salieron de APLICARLO.';

const texto = JSON.stringify(D, null, 2) + '\n';
fs.writeFileSync(P, texto, { encoding: 'utf8' });

console.log('ESCRITURA 1 -- ' + P);
console.log('  filas ' + antes + ' -> ' + D.deudas.length);
console.log('  sitio SESION-voseo-al-patron-2026-08-20 : filas_en_este_declarativo = ' + s.filas_en_este_declarativo);
console.log('  vocabulario_del_barrido : ' + s.vocabulario_del_barrido.length + ' entradas');
console.log('  ids agregados:');
CUATRO.forEach(f => console.log('    ' + f.id));
