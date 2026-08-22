'use strict';
// APLICA EL MOVIMIENTO DE LA CIFRA AL DATO.  5 de 15 -> 8 de 15 al 2026-08-21.
//
// POR QUE POR REEMPLAZO EXACTO Y NO POR JSON.stringify: el fichero en disco NO
// esta en el formato canonico del round-trip — lleva lineas en blanco entre
// bloques de nivel 1, que `JSON.stringify(j, null, 2)` no produce. Medido: 10.969
// bytes en disco contra 11.100 del round-trip. Reescribirlo entero meteria 131
// bytes de reformateo en el diff crudo que el owner tiene que revisar, y el
// owner tendria que separar mi cambio del ruido. CLAUDE.md §4.8.
//
// CADA REEMPLAZO SE ASERTA: si la aguja no aparece EXACTAMENTE UNA VEZ, esto se
// detiene y no escribe nada. Un reemplazo que no encuentra su aguja y sigue es
// la forma en que un script de edicion miente en verde.

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, '..', '..', 'data', 'spec2', 'cifra_spec2.json');
let txt = fs.readFileSync(RUTA, 'utf8');
const ANTES = txt;

const aplicados = [];
const fallidos = [];

// NO FALLA AL PRIMER TROPIEZO, Y ES DELIBERADO. La primera version lanzaba en la
// primera aguja que no calzaba, asi que cada aguja mal escrita costaba una
// corrida entera para descubrir la siguiente. Un instrumento que reporta un solo
// fallo por corrida obliga a descubrir el resto en serie. Aca se recorren todas,
// se juntan las que fallan, y NO SE ESCRIBE NADA si hay una sola.
function rep(rotulo, aguja, nueva) {
  const n = txt.split(aguja).length - 1;
  if (n !== 1) {
    fallidos.push(`[${rotulo}] la aguja aparece ${n} veces, se esperaba 1\n      aguja: ${aguja.slice(0, 100).replace(/\n/g, '\\n')}`);
    return;
  }
  txt = txt.replace(aguja, nueva);
  aplicados.push(rotulo);
}

// ─── 1. LOS NUMEROS DEL DENOMINADOR FINO ─────────────────────────────────────
rep('fino.cumple 5->8',
  '    "cumple": 5,\n    "no_cumple": 10,',
  '    "cumple": 8,\n    "no_cumple": 7,');

rep('fino.cumple_cuales +S3(a)(b)(c)',
  '"cumple_cuales": ["S2(a)", "S2(b)", "S3(d)", "S5(a)", "S9"],',
  '"cumple_cuales": ["S2(a)", "S2(b)", "S3(a)", "S3(b)", "S3(c)", "S3(d)", "S5(a)", "S9"],');

// ─── 2. LOS NUMEROS DE LA VISTA POR PUNTO ────────────────────────────────────
rep('punto.unanimes/divididos/cumple',
  '    "unanimes": 8,\n    "divididos": 1,\n    "cumple": 3,\n    "cumple_cuales": ["S2", "S5", "S9"],',
  '    "unanimes": 9,\n    "divididos": 0,\n    "cumple": 4,\n    "cumple_cuales": ["S2", "S3", "S5", "S9"],');

rep('punto.divididos_cuales -> vacio',
  '"divididos_cuales": ["S3"],',
  '"divididos_cuales": [],');

rep('punto.antes <- la foto de las 15:04',
  '"antes": { "unanimes": 9, "divididos": 0, "cumple": 3, "no_cumple": 6 },',
  '"antes": { "unanimes": 8, "divididos": 1, "cumple": 3, "no_cumple": 5 },');

// ─── 3. LA SERIE GANA SU TERCERA FOTO ────────────────────────────────────────
// La que sale de `antes` no se pierde: se archiva aca con de_cuando y
// que_la_movio, que es la regla de este campo.
rep('serie += foto de S3(d)',
  `        "cumple": 3,
        "no_cumple": 6
      }
    ],`,
  `        "cumple": 3,
        "no_cumple": 6
      },
      {
        "de_cuando": "2026-08-21 15:04, la firma de S3(d)",
        "que_la_movio": "La firma de S3(d) sobre la pantalla: la PRIMERA vez que el numerador subio por TRABAJO. Las capas A+C de U2 hicieron que la cobertura jurisdiccional componga el veredicto sin sobrescribirlo. S3 quedo DIVIDIDO — S3(d) cumpliendo y S3(a)(b)(c) sin cumplir porque el aviso no se renderizaba —, y esa division ES la ventana muda que la firma O1 acepto. Duro tres horas y seis minutos: la capa B entro a las 18:11 del mismo dia.",
        "unidad": "punto de 2",
        "denominador": 9,
        "unanimes": 8,
        "divididos": 1,
        "cumple": 3,
        "no_cumple": 5
      }
    ],`);

// ─── 4. LA NOTA DE S3 CAMBIA DE AFIRMACION, Y LA CLAVE CON ELLA ──────────────
// La clave se renombra porque «s3_dividido» describia el ESTADO, no el papel del
// campo, y S3 dejo de estar dividido. Una clave que dice «dividido» sobre una
// nota que afirma «no esta dividido» es el mismo genero de defecto que este
// fichero persigue. Los cuatro sitios que la nombran se mueven en este acto.
rep('nota S3: clave + afirmacion',
  `    "nota_obligatoria_s3_dividido": "S3 quedo DIVIDIDO por TRABAJO, no por derogacion: S3(d) —escala el veredicto a U, nunca a U+V— cumple desde las capas A+C, y S3(a)(b)(c) siguen sin cumplir porque el aviso no se renderiza. El CUMPLE por punto no subio: un punto salio de NO CUMPLE y no entro a CUMPLE. Esta division es la ventana muda que la firma O1 del 2026-08-20 acepto, y vale mientras dure — se apaga sola cuando entre la capa B.",`,
  `    "nota_obligatoria_s3_por_trabajo": "S3 llego a CUMPLE ENTERO por TRABAJO: sus cuatro mitades cumplen. S3(d) entro por las capas A+C de U2, y S3(a)(b)(c) por la capa B, que puso el aviso en su propio bloque con la Capitania nombrada y su telefono. Es el UNICO punto de esta vista que se gano trabajando: de los otros tres que cumplen, S2 y S5 llegaron por anulacion y S9 cumplia desde la primera medicion.",
    "_la_clave_de_esta_nota_se_renombro_el_2026-08-21": "Era nota_obligatoria_s3_dividido. Se renombro en el mismo acto en que la nota cambio de afirmacion, porque la clave nombraba un ESTADO —S3 dividido— que dejo de ser cierto, y una clave que dice «dividido» colgando de un texto que afirma «entero» es el genero de defecto que este fichero existe para cazar. Lo que NO cambio es para que existe el campo: que nadie lea el CUMPLE de S3 como si fuera del mismo tipo que el de S2 y S5. La nota vieja no se conserva aca: vive en la foto de la serie del 2026-08-21 15:04, que es donde va lo que fue cierto y ya no.",`);

rep('_por_que_la_nota_de_s3_esta_en_un_campo_APARTE',
  '"_por_que_la_nota_de_s3_esta_en_un_campo_APARTE": "Aprobada por el owner el 2026-08-21, y va sin tildes como todo el resto de este fichero: el emisor la imprime en la consola de Windows, donde un acento ya mato un control una vez. En campo separado de la nota de derogacion para que las dos sean borrables por separado, que es lo mismo que decir detectables por separado: cada una tiene su propia guarda en el emisor."',
  '"_por_que_la_nota_de_s3_esta_en_un_campo_APARTE": "Aprobada por el owner el 2026-08-21, y va sin tildes como todo el resto de este fichero: el emisor la imprime en la consola de Windows, donde un acento ya mato un control una vez. En campo separado de la nota de derogacion para que las dos sean borrables por separado, que es lo mismo que decir detectables por separado: cada una tiene su propia guarda en el emisor. Y LAS DOS GUARDAS TIENEN QUE SER MUTUAMENTE EXCLUYENTES, no solo distintas: ninguna de las dos notas puede satisfacer a la guarda de la otra. Se prueba en las dos direcciones con las mordidas cruzadas, y esa prueba es lo que hace que separarlas sirva de algo."');

// ─── 5. QUE MOVIO LA FOTO DE HOY — el literal de la linea 204 sale del dato ───
rep('punto += que_movio_la_de_hoy',
  '    "nota_obligatoria": "S2 y S5 llegaron a CUMPLE por DEROGACION',
  `    "que_movio_la_de_hoy": "la firma de S3(a)(b)(c) sobre la pantalla, al cerrar la capa B de U2 — la SEGUNDA vez en el mismo dia que el numerador sube por TRABAJO. S3(c) cerro entera porque se pago una segunda ruta, Puerto Eden -> Tortel, donde el bloque muestra la derivacion generica por VHF y NO muestra contacto: el owner prefirio pagar esa medicion antes que firmar mitad y mitad.",
    "_por_que_este_campo_existe": "Hasta hoy el emisor imprimia a mano «que la movio: la firma de S3(d) sobre la pantalla» en la linea de la foto viva. Era prosa pegada al instrumento: caduca en VERDE y en silencio, que es el defecto que la cabecera de la mordida ya tiene fichado sobre si misma. Ahora sale del dato y lleva su guarda.",
    "nota_obligatoria": "S2 y S5 llegaron a CUMPLE por DEROGACION`);

rep('_por_que_la_serie_se_acumula_y_no_se_pisa',
  'Hay DOS notas obligatorias sobre esta vista y cada una necesita su propio numero detras: la de derogacion se prueba con la foto de {7,2,1,6}, y la de S3 dividido con la de {9,0,3,6}. Una sola ranura obligaria a dejar una de las dos sin evidencia',
  'Hay DOS notas obligatorias sobre esta vista y cada una necesita su propio numero detras: la de derogacion se prueba con el salto de {7,2,1,6} a {9,0,3,6} —donde el CUMPLE sube de 1 a 3 sin que la pantalla cambie—, y la de S3 por trabajo con el de {8,1,3,5} a {9,0,4,5}, que es la unica vez que un punto entero se gano trabajando. Una sola ranura obligaria a dejar una de las dos sin evidencia');

// ─── 6. LA POLITICA: LA FORMA LEGAL GANA SU FECHA ────────────────────────────
// OJO — LA AGUJA NO LLEVA TILDE, Y ESO ES UN HECHO MEDIDO DEL FICHERO, NO UN
// descuido: `forma_legal` dice "decision del owner" en ASCII plano, como todo el
// resto de este JSON, que va sin tildes porque el emisor lo imprime en la consola
// de Windows. La primera version de este script asumio la tilde y la asercion lo
// detuvo sin escribir nada. De paso queda medido que el
// `.replace('decisión', 'decision')` de publicar_cifra_spec2.js:53 NUNCA SE
// EJECUTA: normaliza una tilde que el dato no tiene.
rep('forma_legal',
  '"forma_legal": "5 de 15, con 2 anuladas por decision del owner",',
  '"forma_legal": "8 de 15 al 2026-08-21, con 2 anuladas por decision del owner",');

rep('forma_prohibida',
  '"forma_prohibida": "5 de 15",',
  `"forma_prohibida": "8 de 15",
    "por_que_la_forma_legal_LLEVA_FECHA_DESDE_HOY": "Decision del owner, 2026-08-21. Recomendada tres veces antes —esta en el plan de cierre como «recomendado y sin firmar»— y firmada esta. EL MOTIVO: el denominador va a subir por ESCRITURA y no por trabajo. S10 y el punto de P4 estan firmados y sin escribir; el dia que se escriban, 15 deja de ser 15 y la cifra BAJA en ratio sin que nada haya empeorado. La fecha es lo unico que distingue «el numerador no se movio» de «el denominador se movio debajo». Se ata hoy y no despues porque atarla despues obliga a reabrir los mismos cinco renglones de PLAN_JURISDICCION.md 5 que esta pieza ya esta abriendo.",
    "la_forma_de_ayer_YA_NO_ALCANZA_y_no_esta_en_forma_prohibida": "«8 de 15, con 2 anuladas por decision del owner», sin fecha, era la forma legal hasta hoy y desde hoy no lo es. NO se agrega a forma_prohibida a proposito, y la ausencia no es permiso: forma_prohibida nombra la cifra PELADA, que es un defecto de otra clase —un ratio sin su salvedad, que se lee como progreso—. Una forma CON salvedad y SIN fecha es un defecto menor y distinto, y meter las dos en la misma ranura borraria la diferencia que la ranura existe para marcar.",`);

rep('politica.por_que',
  'La tercera vez, el 2026-08-21, el numerador SI subio y SI fue trabajo. Las dos causas se ven identicas en el ratio, y esa es toda la razon por la que la cifra no se publica pelada: la salvedad es lo unico que las distingue.',
  'La tercera vez y la cuarta, las dos el 2026-08-21, el numerador SI subio y SI fue trabajo. Las dos causas se ven identicas en el ratio, y esa es toda la razon por la que la cifra no se publica pelada: la salvedad es lo unico que las distingue. Y desde la cuarta la forma legal lleva ademas su FECHA, porque hay una tercera causa en camino que tampoco se ve en el ratio: que el denominador suba por escritura.');

rep('OJO — la quinta variante',
  'Queda anotado porque es la cuarta variante del mismo agujero: una linea envejece por el TRABAJO, por una DECISION, por una FIRMA, y ahora tambien por el propio dato que el instrumento publica. Ningun control mira ninguna de las cuatro.',
  'Queda anotado porque es la cuarta variante del mismo agujero: una linea envejece por el TRABAJO, por una DECISION, por una FIRMA, y ahora tambien por el propio dato que el instrumento publica. Ningun control mira ninguna de las cuatro. Y LA QUINTA LLEGO EL MISMO DIA, tres horas y seis minutos despues: «Esta es la PRIMERA vez que el numerador sube» —en por_que_el_numerador_se_movio_esta_vez_y_las_anteriores_no— quedo falsa cuando el numerador subio por segunda vez con la capa B. Cinco variantes, y la unica que un control alcanzo a señalar fue la guarda de la nota de S3, que caduco en ROJO exigiendo una nota que ya era mentira. Las otras cuatro las encontro una persona leyendo.');

rep('DOS notas — la segunda cambio de afirmacion',
  'una, que un punto llego a CUMPLE sin que nadie trabajara (derogacion); la otra, que un punto se partio PORQUE alguien trabajo (S3 dividido). Leer cualquiera de las dos sola deforma la vista en una direccion distinta. Son campos SEPARADOS a proposito y cada una tiene su guarda: borrables por separado es detectables por separado.',
  'una, que DOS puntos llegaron a CUMPLE sin que nadie trabajara (derogacion); la otra, que UN punto llego a CUMPLE porque alguien trabajo (S3). Leer cualquiera de las dos sola deforma la vista en una direccion distinta. Son campos SEPARADOS a proposito y cada una tiene su guarda: borrables por separado es detectables por separado. LA SEGUNDA CAMBIO DE AFIRMACION EL 2026-08-21 SIN CAMBIAR DE PAPEL: decia que S3 quedaba DIVIDIDO por trabajo y ahora dice que entro ENTERO por trabajo. La vista paso de 3 puntos cumplidos a 4, y sin esta nota el cuarto se leeria igual que los dos que nadie se gano.');

// ─── 7. LAS LINEAS DE CONTEXTO QUE EL MOVIMIENTO VUELVE FALSAS ───────────────
rep('_que_no_es',
  'Y desde el 2026-08-21 tampoco se puede leer al reves: una de sus afirmaciones SI paso a CUMPLE por trabajo.',
  'Y desde el 2026-08-21 tampoco se puede leer al reves: CUATRO de sus afirmaciones pasaron a CUMPLE por TRABAJO — S3(d) a las 15:04 y S3(a)(b)(c) a las 18:11, el mismo dia.');

rep('procedencia',
  'y movida el 2026-08-21 por la firma de S3(d) sobre la pantalla (_bitacoras/firma_s3d_s6a_2026-08-21/).',
  'movida el 2026-08-21 por la firma de S3(d) sobre la pantalla (_bitacoras/firma_s3d_s6a_2026-08-21/), y movida otra vez el mismo dia por S3(a)(b)(c), medidas al cerrar la capa B de U2 (_bitacoras/u2_capa_b_2026-08-21/ seccion 6, que las declara y NO mueve el dato a proposito) y publicadas aca por _bitacoras/cifra_8de15_2026-08-21/.');

rep('por_que_el_numerador_se_movio',
  'Esta es la PRIMERA vez que el numerador sube, y sube por TRABAJO — las capas A+C hicieron que el veredicto escale por cobertura, el owner lo miro en pantalla el 2026-08-21 y firmo S3(d) CUMPLE. La distincion no es de estilo',
  'El 2026-08-21 el numerador subio DOS VECES y las dos por TRABAJO: primero S3(d), cuando las capas A+C hicieron que el veredicto escale por cobertura; despues S3(a)(b)(c), cuando la capa B puso el aviso en su propio bloque. Las dos las firmo el owner mirando la pantalla. La distincion no es de estilo');

// ─── 8. LO QUE ENTRO Y LO QUE NO ─────────────────────────────────────────────
rep('que_entro_la_ultima_vez -> S3(a)(b)(c), y S3(d) se archiva',
  `    "que_entro_la_ultima_vez": {
      "afirmacion": "S3(d)",`,
  `    "que_entro_la_ultima_vez": {
      "afirmacion": "S3(a), S3(b) y S3(c) — las tres juntas",
      "texto": "Si su ruta cruza una Capitania sin limite cargado, se le dice / en su propio bloque, nunca entre las restricciones / con la Capitania nombrada y su telefono cuando se pueda nombrar sin inventarla, y con la derivacion generica cuando no.",
      "paso_a_CUMPLE_el": "2026-08-21",
      "por_que": "La capa B de U2 le dio bloque propio al aviso de cobertura. Seis cadenas pasaron de falso a verdadero en pantalla. S3(b) cumplia antes DE FORMA VACIA —no habia bloque que pudiera estar mal puesto— y ahora cumple de verdad.",
      "las_dos_mitades_de_S3(c)_estan_las_dos_en_pantalla": "La primera en Antofagasta -> Taltal, con la Capitania nombrada y su telefono. La segunda en Puerto Eden -> Tortel, donde el bloque muestra la derivacion generica por VHF Canal 16 y NO muestra contacto. El owner prefirio pagar una segunda ruta antes que firmar mitad y mitad, que es lo que hubo que hacer con el «nunca» de S3(d).",
      "medicion": "_bitacoras/u2_capa_b_2026-08-21/"
    },
    "que_entro_la_vez_anterior": {
      "afirmacion": "S3(d)",`);

rep('consecuencia sobre la proyeccion vieja',
  '"consecuencia_sobre_la_proyeccion_vieja": "La proyeccion decia que las capas A+C movian la cifra +2 (S3d y S6a). Movieron +1. Y A+B+C mueven +4, no +5: lo que le falta a S6(a) no es la capa B y no tiene nada que ver con la cobertura jurisdiccional. Ninguna capa de U2 trae esa fuente."',
  '"consecuencia_sobre_la_proyeccion_vieja": "La proyeccion decia que las capas A+C movian la cifra +2 (S3d y S6a). Movieron +1. Y A+B+C mueven +4, no +5: lo que le falta a S6(a) no es la capa B y no tiene nada que ver con la cobertura jurisdiccional. Ninguna capa de U2 trae esa fuente. MEDIDO AL CERRAR B, y la correccion aguanto: A+B+C movieron exactamente +4 —S3(d), S3(a), S3(b), S3(c)— y S6(a) sigue afuera. El techo del tablero queda en 12 de 15 con 2 anuladas, con S6(a), S7(a) y S7(b) fuera del alcance de las nueve unidades."');

// ─── ESCRITURA, Y NO ANTES ───────────────────────────────────────────────────
if (fallidos.length) {
  console.error(`NO SE ESCRIBE — ${fallidos.length} aguja(s) no calzaron:`);
  fallidos.forEach(x => console.error('  !! ' + x));
  console.error('');
  console.error(`Se aplicaron ${aplicados.length} en memoria y se descartan todas. El fichero`);
  console.error('en disco queda como estaba.');
  process.exit(1);
}
if (txt === ANTES) throw new Error('el texto no cambio: algo esta muy mal');
JSON.parse(txt); // no se escribe un JSON que no parsea
fs.writeFileSync(RUTA, txt, { encoding: 'utf8' });

console.log('DATO APLICADO — ' + aplicados.length + ' reemplazos, todos con aguja unica:');
aplicados.forEach((a, i) => console.log(`  ${String(i + 1).padStart(2)}. ${a}`));
console.log('');
const j = JSON.parse(txt);
const f = j.denominador_fino, p = j.denominador_por_punto;
console.log(`fino:  cumple ${f.cumple} · no_cumple ${f.no_cumple} · vigente ${f.vigente} · anuladas ${f.anuladas} · cumple_cuales ${f.cumple_cuales.length}`);
console.log(`punto: unanimes ${p.unanimes} · divididos ${p.divididos} · cumple ${p.cumple} · no_cumple ${p.no_cumple} · serie ${p.serie.length} fotos`);
console.log(`bytes: ${ANTES.length} -> ${txt.length}`);
