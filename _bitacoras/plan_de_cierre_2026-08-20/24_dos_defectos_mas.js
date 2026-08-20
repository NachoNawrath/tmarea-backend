'use strict';
const fs = require('fs');
const B = 'C:/Users/katia/tmarea-backend/_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt';
const M = 'C:/Users/katia/tmarea-backend/_bitacoras/plan_de_cierre_2026-08-20/22_mensaje_commit.txt';

const BLOQUE = [
  '',
  'DOS DEFECTOS DE INSTRUMENTO MAS — y el segundo refina D3 por tercera vez',
  '------------------------------------------------------------------------------',
  'D7 · UN sed CAMBIO EL ROTULO Y DEJO LA CONDICION',
  '     El control contra el indice de (m2) se derivo del de (m1) con un sed sobre',
  '     el texto. El sed acerto los rotulos —"filas 74" -> "filas 75"— y NO toco',
  '     las condiciones, que decian C.filas === 74, porque ahi la cadena es',
  '     "filas === 74" y no "filas 74". Resultado: EL CONTROL DECIA 75 Y COMPARABA',
  '     CONTRA 74, y salio ROJO sobre un objeto correcto que decia 75.',
  '     Es la misma forma de siempre —corre perfecto y afirma otra cosa— con el',
  '     agravante de que el ROTULO MENTIA SOBRE LO QUE EL CONTROL COMPARABA: quien',
  '     leyera la linea en verde habria creido que 75 estaba comprobado.',
  '     LA REGLA: un control no se DERIVA de otro con una sustitucion de texto. O',
  '     se parametriza el esperado, o se edita a mano y se relee cada condicion.',
  '',
  'D8 · EL PREFIJO DE CITA SOBREVIVE A LA NORMALIZACION — D3, TERCERA VUELTA',
  '     El mismo control buscaba en la bitacora el token de la regla del control',
  '     positivo, ya con la correccion de D3 aplicada: normalizar el espacio antes',
  '     de comparar. Salio ROJO igual. El motivo: la regla esta escrita en un',
  '     BLOQUE DE CITA, y cada linea arranca con "> ". Normalizar el espacio deja',
  '     "...UN CONTROL POSITIVO QUE > FALLA SE SOSPECHA...": el prefijo sobrevive y',
  '     parte el token lo mismo.',
  '     NORMALIZAR EL ESPACIO ES NECESARIO Y NO ES SUFICIENTE. Hay que retirar los',
  '     PREFIJOS DE LINEA antes de normalizar.',
  '     Y ES LA TERCERA COSA QUE EL GUARDIA DE LA CIFRA VA A NECESITAR, medida',
  '     antes de que se escriba y sin costo: (1) normalizar el espacio —D3—,',
  '     (2) distinguir PUBLICAR de CITAR —D5—, y (3) retirar los prefijos de linea',
  '     —este—. Un guardia que barra "N de 15" sin las tres da falsos positivos',
  '     sobre la prosa del propio repositorio, que escribe a 78 columnas y cita en',
  '     bloques con ">".',
  '',
  '     LOS DOS SALIERON ROJOS SOBRE DATOS CORRECTOS, igual que D2 y D5. Van ya',
  '     CUATRO de los ocho defectos de la sesion que acusan al dato siendo el',
  '     control el equivocado. Es el modo de falla dominante de esta sesion y',
  '     queda dicho: cuando un control sale rojo, la primera sospecha es el',
  '     control.',
  '',
].join('\n');

let t = fs.readFileSync(B, 'utf8');
const ancla = 'UNA NOTA DE PROCEDENCIA QUE VA DICHA';
if (!t.includes(ancla)) { console.error('ALTO: ancla bitacora'); process.exit(1); }
t = t.replace(ancla, BLOQUE + ancla);
// el rotulo de seis pasa a ocho
t = t.replace('[AL CERRAR LA SESION SON SEIS. Los otros tres, en el apartado 12.]',
              '[AL CERRAR LA SESION SON OCHO. Los otros cinco, en los apartados 12 y 13.]');
fs.writeFileSync(B, t, 'utf8');

let m = fs.readFileSync(M, 'utf8');
const anclaM = 'EL CONTEO, leido del INDICE con git show :ruta';
if (!m.includes(anclaM)) { console.error('ALTO: ancla mensaje'); process.exit(1); }
const BM = [
  'DOS DEFECTOS DE INSTRUMENTO MAS -- y el segundo refina D3 por TERCERA vez',
  '  D7 UN sed CAMBIO EL ROTULO Y DEJO LA CONDICION. El control de (m2) se derivo',
  '     del de (m1) con un sed; acerto los rotulos y no toco las condiciones,',
  '     porque ahi la cadena es "filas === 74" y no "filas 74". EL CONTROL DECIA 75',
  '     Y COMPARABA CONTRA 74, y salio rojo sobre un objeto correcto. El rotulo',
  '     mentia sobre lo que el control comparaba. LA REGLA: un control no se DERIVA',
  '     de otro con una sustitucion de texto.',
  '  D8 EL PREFIJO DE CITA SOBREVIVE A LA NORMALIZACION. Con la correccion de D3 ya',
  '     aplicada, el control seguia sin encontrar la regla del control positivo: la',
  '     regla esta en un BLOQUE DE CITA y cada linea arranca con "> ", que normalizar',
  '     el espacio no retira. NORMALIZAR ES NECESARIO Y NO SUFICIENTE.',
  '     Es la TERCERA cosa que el guardia de la cifra va a necesitar, medida antes de',
  '     que se escriba: normalizar el espacio (D3), distinguir PUBLICAR de CITAR (D5),',
  '     y retirar los PREFIJOS DE LINEA (este).',
  '  LOS DOS SALIERON ROJOS SOBRE DATOS CORRECTOS. Van cuatro de los ocho defectos de',
  '  la sesion que acusan al dato siendo el control el equivocado: es el modo de falla',
  '  dominante, y queda dicho.',
  '',
].join('\n');
m = m.replace(anclaM, BM + anclaM);
fs.writeFileSync(M, m, 'utf8');

console.log('ESCRITO en la bitacora y en el mensaje.');
for (const [f, toks] of [[B, ['D7 · UN sed CAMBIO EL ROTULO', 'D8 · EL PREFIJO DE CITA', 'SON OCHO']],
                         [M, ['D7 UN sed CAMBIO EL ROTULO', 'D8 EL PREFIJO DE CITA', 'TERCERA vez']]]) {
  const c = fs.readFileSync(f, 'utf8');
  toks.forEach(x => console.log((c.includes(x) ? '  ok   ' : '  FALTA') + '  ' + f.split('/').pop() + ' :: ' + x));
}
