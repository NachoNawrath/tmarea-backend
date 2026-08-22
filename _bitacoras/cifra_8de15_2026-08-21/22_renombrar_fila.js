'use strict';
// RENOMBRA EL ID DE LA FILA DE METODO. Decision del owner, 2026-08-21.
//
// POR QUE: el id viejo —un-n-sobre-n-con-el-negativo-en-rojo-no-es-una-medicion—
// arrastra en su nombre la afirmacion que la propia regla acaba de corregir por
// describir un caso IMPOSIBLE en este arbol. Una clave que afirma lo que su texto
// niega es el mismo defecto por el que, tres horas antes y en esta misma pieza,
// se renombro `nota_obligatoria_s3_dividido`. El precedente lo sento esta pieza y
// dejarlo asimetrico debilitaba la regla justo donde se la acababa de reforzar.
//
// SEIS SITIOS Y NO TRES. El primer barrido dio TRES porque el grep filtraba por
// extension —*.md, *.json, *.js— y se comio los .txt. Es la misma familia que
// esta pieza persigue: una medicion cuyo ALCANCE excluye casos sin decirlo. El
// barrido correcto es sin filtro de extension.
//
// QUE SE TOCA Y QUE NO:
//   · CLAUDE.md ................ cita VIVA, se mueve.
//   · deudas_declaradas.json ... el id, se mueve.
//   · 18_fila_metodo.js ........ constante del aplicador, se mueve — si no, un
//                                re-run buscaria un id que ya no existe y meteria
//                                un duplicado bajo el nombre viejo.
//   · cifra_8de15_2026-08-21.txt  prosa VIVA de la bitacora, se mueve.
//   · 18_fila_metodo.txt ....... NO SE TOCA. Es la salida real de lo que ese
//                                script imprimio cuando corrio, bajo el nombre
//                                que la fila tenia entonces. Reescribirla seria
//                                fabricar una corrida que no ocurrio (§3.3).
//   · 21_diff_crudo_CLAUDEMD.txt  derivado, se regenera al re-diffear.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const VIEJO = 'METODO::un-n-sobre-n-con-el-negativo-en-rojo-no-es-una-medicion';
const NUEVO = 'METODO::con-el-negativo-en-rojo-el-numerador-vale-cero';

const SITIOS = [
  ['CLAUDE.md', 1],
  ['data/deudas/deudas_declaradas.json', 1],
  ['_bitacoras/cifra_8de15_2026-08-21/18_fila_metodo.js', 1],
  ['_bitacoras/cifra_8de15_2026-08-21/cifra_8de15_2026-08-21.txt', 1],
];

const fallidos = [];
const plan = [];
for (const [rel, esperadas] of SITIOS) {
  const abs = path.join(RAIZ, rel);
  const txt = fs.readFileSync(abs, 'utf8');
  const n = txt.split(VIEJO).length - 1;
  if (n !== esperadas) {
    fallidos.push(`${rel}: ${n} apariciones, se esperaban ${esperadas}`);
    continue;
  }
  plan.push([abs, rel, txt.split(VIEJO).join(NUEVO), n]);
}

if (fallidos.length) {
  console.error('NO SE ESCRIBE — el conteo por sitio no calza:');
  fallidos.forEach(x => console.error('  !! ' + x));
  process.exit(1);
}

for (const [abs, , nuevo] of plan) fs.writeFileSync(abs, nuevo, { encoding: 'utf8' });

// El id nuevo tiene que existir EXACTAMENTE UNA VEZ en el declarativo, y el
// viejo CERO. Se comprueba sobre el JSON parseado, no sobre el texto.
const d = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'deudas', 'deudas_declaradas.json'), 'utf8'));
const arr = Array.isArray(d) ? d : (d.filas || Object.values(d).find(Array.isArray));
const conNuevo = arr.filter(x => x.id === NUEVO).length;
const conViejo = arr.filter(x => x.id === VIEJO).length;
if (conNuevo !== 1 || conViejo !== 0) {
  console.error(`el declarativo quedo con ${conNuevo} filas del id nuevo y ${conViejo} del viejo`);
  process.exit(1);
}

console.log('ID RENOMBRADO');
console.log('  de : ' + VIEJO);
console.log('  a  : ' + NUEVO);
console.log('');
plan.forEach(([, rel, , n]) => console.log(`  ${n}x  ${rel}`));
console.log('');
console.log('  NO TOCADO: _bitacoras/cifra_8de15_2026-08-21/18_fila_metodo.txt');
console.log('             es la salida real de esa corrida bajo el nombre de entonces (§3.3).');
console.log('  DERIVADO : 21_diff_crudo_CLAUDEMD.txt se regenera al re-diffear.');
console.log('');
console.log('  el declarativo tiene 1 fila con el id nuevo y 0 con el viejo — verificado');
console.log('  sobre el JSON parseado, no sobre el texto.');
