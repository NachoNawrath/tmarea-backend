'use strict';
// La CUARTA instancia del pasamanos, escrita con las palabras del owner.
// No es un campo perdido: es una ADVERTENCIA DE SEGURIDAD QUE NUNCA LLEGO AL
// PATRON. La fila cambia de titulo por eso.
// Y NO SE ARREGLA — instruccion explicita del owner, 2026-08-20.

const fs = require('fs');
const path = require('path');
const RUTA = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const d = JSON.parse(fs.readFileSync(RUTA, 'utf8'));

const f = d.deudas.find(x => x.id === 'D4D5::motivo-principal-muere-en-el-pasamanos');
if (!f) { console.error('NO ENCONTRADA'); process.exit(1); }

f.titulo = 'CUARTA vez el mismo defecto, y la cuarta es una ADVERTENCIA DE SEGURIDAD que nunca llego al patron';

f.evidencia_en_el_arbol.CUARTA_INSTANCIA_2026_08_20 =
  'LA PEOR DE LAS CUATRO, y va dicho con las palabras del owner: una advertencia de SONDA contra ' +
  'el Derrotero SHOA que el backend genera y la PWA no lee CERO VECES no es un campo perdido — es ' +
  'UNA ADVERTENCIA DE SEGURIDAD QUE NUNCA LLEGO AL PATRON. ' +
  'El campo es `advertencias` de /api/rutas/calcular. Lo compone raster-router-service.js y una de ' +
  'sus fuentes es advertenciasCotejoVertical(): cuando la ruta cruza un canal donde el Derrotero ' +
  'SHOA documenta menos sonda que el calado de la nave mas su margen de resguardo, escribe al ' +
  'patron, en segunda persona, que su calado no alcanza y con que pagina del Derrotero se lo dice. ' +
  'Medido el 2026-08-20: «advertencias» da 0 apariciones en todo el arbol de tmarea-pwa. Control ' +
  'positivo del barrido: «ETA» da 42 en el mismo arbol, o sea el grep alcanza. ' +
  'Van CUATRO instancias del mismo pasamanos: `cierre` (corregida en 6443178), ' +
  '`cobertura_jurisdiccional` (viva, PLAN-2::cobertura-jurisdiccional-muere-en-el-pasamanos), ' +
  '`motivo_principal` y `advertencias`. Las tres primeras cuestan informacion; la cuarta cuesta ' +
  'una advertencia de seguridad. ' +
  'NO SE ARREGLA EN ESTA SESION: instruccion explicita del owner. Se escribe.';

f.evidencia_en_el_arbol.lo_que_esta_fila_NO_pide =
  'Arreglarlo. El owner lo dijo dos veces el 2026-08-20 —al abrir la fila y al conocer la cuarta ' +
  'instancia—: se escribe, no se arregla. Lo que la fila pide decidir sigue siendo lo mismo, y la ' +
  'cuarta instancia sube su precio: si el pasamanos sigue siendo una copia campo por campo, TODO ' +
  'campo nuevo del backend nace invisible, y ya se sabe que uno de los invisibles era una ' +
  'advertencia de sonda.';

// ── EL ROTULO DE LA SECCION, en la fila del contrato ─────────────────────────
const c = d.deudas.find(x => x.id === 'D4D5::contrato-10-dice-transitar');
c.evidencia_en_el_arbol.EL_ROTULO_DE_LA_SECCION_SE_CAMBIO = {
  decision: 'Owner, 2026-08-20: «RESTRICCIONES EN TRANSITO» -> «RESTRICCIONES DURANTE LA NAVEGACION».',
  el_agente_habia_recomendado_MANTENERLO: 'Con dos argumentos: (a) «transito» es la palabra de la ' +
    'norma —D.L. 2222 Art. 32, que §10 cita, habla de prohibir el TRANSITO por aguas ' +
    'jurisdiccionales—; (b) en espanol maritimo «transito de naves» significa TRAFICO. Los dos ' +
    'quedan escritos junto al descarte porque no eran malos.',
  por_que_el_owner_los_descarta: 'Porque esto es el TITULO DE UNA SECCION DE LA APP, no una cita ' +
    'normativa: el patron que lo lee no esta leyendo el decreto, y el rotulo tiene que decirle ' +
    'CUANDO aplican esas restricciones. Eso es lo que las separa del bloque de arriba.',
  y_lo_que_tambien_se_descarto: '«Restricciones de puerto durante la navegacion», POR PANTALLA: ' +
    'justo encima esta «Condicion de puertos», y repetir «puerto» acerca dos bloques que responden ' +
    'preguntas distintas. Medido: los titulos hermanos del render son «Condicion de puertos», ' +
    '«ETA y combustible», «Mareas en zarpe y recalada» y «Recordatorios normativos».',
  donde_vivia: 'UN solo sitio: tmarea-pwa/src/components/verification/TransitRestrictionsBlock.jsx, ' +
    'el <span style={styles.blockTitle}>. Se renderiza en mayusculas por CSS. Barrido de los dos ' +
    'repos con control positivo —«blockTitle» da 14 apariciones y encuentra los cuatro titulos ' +
    'hermanos— y control negativo «ZZQX» en 0.',
  lo_que_NO_se_toco: 'El nombre del componente TransitRestrictionsBlock, las claves de la API y ' +
    '`restricciones_intermedias`. Renombrarlos es refactor, no correccion de rotulo.',
  la_borderline_resuelta: '«afecta tu transito» -> «afecta tu navegacion». El posesivo la pone del ' +
    'lado del VERBO. El agente la habia marcado como borderline y el owner la resolvio.',
};

d.version = (d.version || 1) + 1;
fs.writeFileSync(RUTA, JSON.stringify(d, null, 2) + '\n', { encoding: 'utf8' });
console.log('enmendadas 2 filas:');
console.log('  D4D5::motivo-principal-muere-en-el-pasamanos  -> la cuarta, con las palabras del owner');
console.log('  D4D5::contrato-10-dice-transitar             -> el rotulo de la seccion, con el descarte escrito');
console.log(`filas ${d.deudas.length} · unicas ${d.deudas.filter(x => !x.duplicada_de).length} · vivas ${d.deudas.filter(x => x.estado === 'viva' && !x.duplicada_de).length}`);
