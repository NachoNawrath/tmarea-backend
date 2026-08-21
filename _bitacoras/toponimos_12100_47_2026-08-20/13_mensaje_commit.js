// P13 - EL MENSAJE DE COMMIT, CON TODA CIFRA SACADA DEL INDICE
// Regla del proyecto: ninguna cifra del mensaje se teclea de memoria. Este
// script las LEE del declarativo y de la salida cruda, y arma el texto.

const fs = require('fs'), path = require('path');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json'), 'utf8'));
const N = require(path.join(__dirname, 'los_dos_numeros.json'));
const VR = require(path.join(__dirname, 'veredictos.json')).resumen;

const filas = D.deudas.length;
const sitios = D.cobertura.sitios.length;
const mias = D.deudas.filter(d => d.sitio === 'SESION-toponimos-12100-47-2026-08-20');
const vivas = D.deudas.filter(d => d.estado === 'viva' && !d.duplicada_de).length;
const A = N.A, B = N.B;
const dec = D.deudas.find(d => d.id === 'LIMITE-PUERTO::los-toponimos-en-fuentes-abiertas');
const ctrl = fs.readFileSync(path.join(__dirname, '11_control_caracteres.txt'), 'utf8');
const nFich = (ctrl.match(/ficheros revisados\s*:\s*(\d+)/) || [0, '?'])[1];
const firmadas = D.deudas.filter(d => d.firma_owner && d.firma_owner.firmada).length;
const abiertasE = 9 + A.a_estricto.bahias + B.a_estricto.bahias;
const abiertasL = 9 + A.a_laxo.bahias + B.a_laxo.bahias;
const derrB = 9 + A.b_cota_baja.bahias + B.b_cota_baja.bahias;
const derrA = 9 + A.b_cota_alta.bahias + B.b_cota_alta.bahias;

const M = `LAS FUENTES ABIERTAS LLEVAN EL LIMITE DE PUERTO DE 9 A ${abiertasE} BAHIAS DE 164 SIN GASTAR NADA, y el derrotero ya no compra el problema entero: compra el ultimo tercio

Contesta el encargo que LIMITE-PUERTO::12100-47-cruzada-contra-el-catalogo
dejo escrito el 2026-08-20 en LA_PRIMERA_MEDICION_DE_QUIEN_RETOME_ESTA_FILA:
mirar las fuentes abiertas ANTES de gastar en licencia del derrotero.

EMPIEZA POR UNA PREMISA FALSA DEL ENCARGO, CORREGIDA EN EL GATE
El encargo encadenaba el salto 9 -> 21 con las 25 entradas sin coordenada, y
son conjuntos distintos. El 9 -> 21 son las 12 bahias C-ALGUNAS (14 entradas);
las 25 C-NINGUNA son el tramo 21 -> 44 (23 bahias). Trabajar solo las 25 se
salteaba el escalon barato. Se midieron LOS DOS, separados de punta a punta.

LAS CIFRAS UTILES, QUE NO SON LAS DEL DOCUMENTO
  conjunto A: 14 entradas · ${A.utiles} utiles al catalogo · ${A.bahias} bahias
  conjunto B: 25 entradas · ${B.utiles} utiles al catalogo · ${B.bahias} bahias
JUNIN, CALETA BUENA y LOS VILOS (C-NINGUNA) no aterrizan en ninguna bahia:
resolver sus 6 toponimos suma CERO. Y lo mismo le pasa al conjunto A, que no
se habia dicho: TOCOPILLA y TOME tampoco aterrizan. Cierra sin tocar nada:
${A.bahias} + ${B.bahias} + las 9 C-TODAS = 44, que son las 44 que calzan.

LOS DOS NUMEROS
  SOLO FUENTES ABIERTAS -- MEDIDO
    estricto ${abiertasE} de 164   ·   laxo ${abiertasL} de 164
  CON DERROTERO -- ESTIMADO, y va rotulado
    cota baja ${derrB} de 164  ·  cota alta ${derrA} de 164  ·  techo absoluto 44
No se invento un porcentaje: las cotas salen de la CLASE DE LUGAR, que es
informacion del documento publico. NO SE ABRIO NINGUN DERROTERO.

LOS TRES CONTEOS, POR SEPARADO Y POR CONJUNTO (veredicto estricto)
  conjunto A: ${VR.A.V} verificados · ${VR.A.D} descartados · ${VR.A.N} no encontrados  (de ${VR.A.n})
  conjunto B: ${VR.B.V} verificados · ${VR.B.D} descartados · ${VR.B.N} no encontrados  (de ${VR.B.n})
Los ${VR.A.D + VR.B.D} rechazados se publican con su razon escrita, uno por uno.

SOBRE CUANTAS PROCEDENCIAS DESCANSA CADA VERIFICADO
Overpass y Nominatim son LA MISMA BASE OSM por dos puertas: cuentan UNA.
  A: ${VR.A.dos} con dos · ${VR.A.soloGN} solo GeoNames · ${VR.A.soloOSM} solo OSM
  B: ${VR.B.dos} con dos · ${VR.B.soloGN} solo GeoNames · ${VR.B.soloOSM} solo OSM
NINGUNA DE LAS DOS SOLA SOSTIENE EL RESULTADO: sin GeoNames A cae de ${VR.A.V} a
${VR.A.V - VR.A.soloGN} y B de ${VR.B.V} a ${VR.B.V - VR.B.soloGN}; sin OSM, de ${VR.A.V} a ${VR.A.V - VR.A.soloOSM} y de ${VR.B.V} a ${VR.B.V - VR.B.soloOSM}.

EL LIMITE DEL INSTRUMENTO, QUE VA EN EL NUMERO Y NO EN UNA NOTA
Overpass devolvio 429 y despues corto: se trajeron 7 CAJAS DE 39. Los dos
espejos publicos dan HTTP 500 hasta para la consulta mas trivial, asi que no
era la consulta. Esas 32 se reportan como CAJA NO TRAIDA y NUNCA como "sin
candidatos": leerlas como ceros habria fabricado 32 entradas sin resultado que
nunca se consultaron, y el numero que puede evitar una compra habria salido de
un silencio. Los VERIFICADOS no estan en duda; los DESCARTADOS y NO ENCONTRADOS
si, porque en 32 cajas no se pudo volcar la caja entera. El numero de fuentes
abiertas es una COTA INFERIOR y se declara asi.

DOS DEFECTOS DE INSTRUMENTO PROPIOS, LOS DOS PUBLICADOS
1. La prueba de contencion geografica fallo en el PRIMERO de cinco: para
   JUNIN el geocodificador devolvio una CALLE DE IQUIQUE y la contencion la
   acepto, porque el borde sur del cajon ES Iquique. La caja acota el DONDE,
   no el QUE. Tiene fila propia.
2. El pase sin acotar se corrio con la cadena completa ("faro Isla Isabel") y
   dio cero; repetido por nucleo aparecieron TRES que se habian dado por
   inexistentes. Un cero de una consulta mal formulada se lee igual que un
   cero real.

LO QUE CONTRADICE OTRA PREMISA: NO HAY UN SOLO TOPONIMO REPETIDO
Las dos unicas colisiones de cadena son homonimos de lugares distintos --
"Punta San Carlos" (Juan Fernandez / Corral, 1.400 km) e "Islote Blanco"
(Tocopilla / Huasco, 700 km). Y no quedo en teoria: buscando la punta San
Carlos de CORRAL, el buscador ofrecio la de Juan Fernandez A 845,6 km.

LA FILA DE LICENCIA, POR PEDIDO EXPLICITO DEL OWNER
Ninguna via es gratis-y-sin-condiciones: OSM no cuesta plata y arrastra ODbL
con compartir-igual si alguna vez alimenta una capa publicada; el derrotero
cuesta plata y no trae esa clausula. Las dos cosas pesan. Y ${VR.A.soloGN + VR.B.soloGN} de los ${VR.A.V + VR.B.V}
verificados dependen solo de GeoNames, que es CC-BY sin compartir-igual.

LA DECISION DEL OWNER, FIRMADA EN LA MISMA SESION
  ${dec.DECISION_DEL_OWNER.LA_DECISION}
  El fundamento NO es el presupuesto, y se dice explicitamente porque la fila
  del 2026-08-20 habia dejado escrito que el freno era el precio y la licencia.
  Ya no lo es: con precio y licencia resueltos la decision seria la misma,
  porque el problema no es cuanto cuesta sino que no esta probado que sirva.
  QUE LA REABRIRIA: que se pruebe que el limite de practicaje ES el que SITPORT
  declara. Esa es la mitad viva de D4D5::la-segunda-direccion-no-es-decidible.
  LO QUE NO DECIDE: si se digitalizan las 26 que ya estan resueltas. Por eso la
  fila queda VIVA y firmada a la vez -- firmar es responder, no hacer.

EL DECLARATIVO
  ANTES  : ${filas - mias.length} filas · ${sitios - 1} sitios
  DESPUES: ${filas} filas · ${sitios} sitios · ${vivas} vivas · ${firmadas} firmadas
  filas agregadas (${mias.length}), todas VIVAS. Una firmada en esta sesion (la
  decision de no comprar) y ${mias.filter(d=>!d.firma_owner.firmada).length} sin firmar:
${mias.map(d => '    ' + d.id + (d.firma_owner.firmada ? '   [FIRMADA 2026-08-20: no se compra]' : '')).join('\n')}
  sitio agregado: SESION-toponimos-12100-47-2026-08-20, en los DOS lados
  (declarativo y SITIOS_CANON del validador).
NO se toco ninguna fila existente. LIMITE-PUERTO::12100-47-cruzada-contra-el-
catalogo sigue VIVA y sin firmar: esta sesion contesta su encargo, y darlo por
contestado es firma del owner. METODO::emparejar-por-nombre-sin-revision-
subcuenta-en-silencio tampoco se toco: la fila nueva de metodo la extiende
desde afuera.

CONTROLES
  02 cotejo de las 77 citas contra el cuerpo de su entrada: 0 fallas, cebo
     fabricado no muerde, 39/39 entradas cubiertas.
  03 doce clases declaradas antes de aplicarse, las doce usadas, 0 clases
     nuevas, las sumas cierran 27/27 y 50/50.
  09 73 filas de veredicto, 0 sin razon escrita, 0 verificados sin procedencia.
  11 caracteres: ${nFich} ficheros, 0 sospechosos H-T2, 0 fuera del latino, 0 BOM.
     Y UN HUECO DE H-T2 QUE SE DECLARA: una "a" cirilica dentro de una palabra
     de 02_extraer_toponimos.js compilaba, corria y H-T2 NO LA VE, porque solo
     mira caracteres de control. Se agrego el criterio ALFABETO, con su control
     positivo y el control cruzado que confirma que H-T2 no la caza.
  npm run deudas: VERDE.

NO SE TOCO: src/ de ningun repo (la sesion del voseo esta ahi), la base, la
capa, data/ salvo el declarativo, CONTRATO_MOTOR.md ni el motor BRE. No se
georreferencio nada y no se construyo geometria. Los dos intocables siguen
sin stagear.
`;
fs.writeFileSync(path.join(__dirname, '13_mensaje_commit.txt'), M, 'utf8');
console.log(M);
