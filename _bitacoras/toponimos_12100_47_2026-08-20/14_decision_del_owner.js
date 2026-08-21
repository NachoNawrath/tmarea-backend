// P14 - LA DECISION DEL OWNER, ESCRITA EN LA FILA
//
// El owner firma la mitad de la pregunta de LIMITE-PUERTO::los-toponimos-en-
// fuentes-abiertas: NO SE COMPRA EL DERROTERO. Se escribe con SU fundamento y
// no con el que no es -- el fundamento NO es el presupuesto.
// Y se escribe que la reabriria, porque una decision sin condicion de reapertura
// se vuelve un hecho consumado y deja de ser decision.

const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', '..', 'data', 'deudas', 'deudas_declaradas.json');
const D = JSON.parse(fs.readFileSync(F, 'utf8'));
const VR = require(path.join(__dirname, 'veredictos.json'));

const f1 = D.deudas.find(d => d.id === 'LIMITE-PUERTO::los-toponimos-en-fuentes-abiertas');
const f3 = D.deudas.find(d => d.id === 'METODO::la-contencion-no-discrimina-cuando-el-borde-de-la-caja-es-el-falso-positivo');
if (!f1 || !f3) throw new Error('faltan las filas de esta sesion');

// --- (1) la decision, con su fundamento --------------------------------------
f1.firma_owner = { firmada: true, fecha: '2026-08-20' };
f1.DECISION_DEL_OWNER = {
  fecha: '2026-08-20',
  LA_DECISION: 'NO SE COMPRA EL DERROTERO DE LA COSTA DE CHILE.',
  EL_FUNDAMENTO_QUE_SI_ES: 'Se estaria comprando EL ULTIMO TERCIO de una capa cuya relevancia NO ESTA PROBADA. Medido: las fuentes abiertas llevan de 9 a 26 bahias de 164 sin gastar nada; el derrotero aportaria el tramo de 26 a entre 40 y 43. Ese tramo es el mas chico y el mas caro. Y los limites que completaria son limites fijados PARA PRACTICAJE, sobre los que sigue sin probarse que sean el "DENTRO DEL LIMITE DEL PUERTO" que SITPORT declara en AreaRestriccion.',
  EL_FUNDAMENTO_QUE_NO_ES: 'NO es "no hay presupuesto". Se dice explicitamente porque la fila anterior —LIMITE-PUERTO::12100-47-cruzada-contra-el-catalogo, campo POR_QUE_EL_CAMINO_A_LAS_21_ESTA_FRENADO— habia dejado escrito que el freno era el precio y la licencia. Ya no lo es. Con precio y licencia resueltos la decision seguiria siendo la misma, porque el problema no es cuanto cuesta: es que no esta probado que sirva.',
  QUE_LA_REABRIRIA: 'Que se pruebe que el limite de practicaje de la Res. 12100/47 ES el limite que SITPORT declara en AreaRestriccion. Eso es exactamente la mitad viva de D4D5::la-segunda-direccion-no-es-decidible, que sigue VIVA y SIN FIRMAR y es dato externo. Si algun dia se prueba, el calculo cambia entero —la capa pasa de "puede que no sirva" a "hace falta completa"— y la compra se vuelve a mirar con estos mismos numeros. HOY NO.',
  LO_QUE_ESTA_DECISION_NO_DECIDE: 'No decide si se digitalizan las 26 bahias que las fuentes abiertas ya resuelven. Esa es la otra mitad de la pregunta de esta fila y sigue abierta. La fila queda VIVA por eso: firmar es responder, no hacer.',
  DE_DONDE_SALE: 'Del veredicto de la sesion del 2026-08-20, aceptado por el owner incluida la parte donde decia que la pregunta original —"se compra o no se compra"— estaba mal planteada: no es "se compra o no", es "se compra PARA QUE", y eso lo decide D4D5.'
};

// --- (2) los 19 que dependen solo de GeoNames, ENUMERADOS en la fila ----------
f1.evidencia_en_el_arbol.LOS_19_QUE_DEPENDEN_DE_UNA_SOLA_PROCEDENCIA = {
  por_que_van_enumerados: 'Sin la lista, "verificado" es una palabra. Con la lista, el numero es auditable: cualquiera puede tomar estos 19 y comprobar que solo GeoNames los sostiene. Y son los primeros que se caerian si GeoNames dejara de estar o resultara equivocado.',
  cuantos: `${VR.resumen.A.soloGN + VR.resumen.B.soloGN} de los ${VR.resumen.A.V + VR.resumen.B.V} verificados (estricto)`,
  conjunto_A: VR.resumen.A.soloGN_cuales,
  conjunto_B: VR.resumen.B.soloGN_cuales,
  la_otra_cara: `${VR.resumen.A.soloOSM + VR.resumen.B.soloOSM} dependen solo de OSM: A = ${VR.resumen.A.soloOSM_cuales.join(' · ')}; B = ${VR.resumen.B.soloOSM_cuales.join(' · ')}.`,
  y_la_licencia: 'GeoNames es CC-BY 4.0, sin compartir-igual. O sea que estos 19 NO arrastran ODbL. Es el dato que hace separable lo que vino de cada fuente, y por eso vale enumerarlo aca y no solo en veredictos.json.'
};

// --- (3) el defecto del pase sin acotar, A LA FILA DE METODO -------------------
delete f1.evidencia_en_el_arbol.OTRO_DEFECTO_QUE_SE_PUBLICA;
f1.evidencia_en_el_arbol.EL_DEFECTO_DE_LA_CONSULTA_TIENE_FILA_PROPIA =
  'El defecto del pase sin acotar salio de esta medicion y vive en METODO::la-contencion-no-discrimina-cuando-el-borde-de-la-caja-es-el-falso-positivo, campo EL_SEGUNDO_HALLAZGO. Se movio por decision del owner: enterrado adentro de la evidencia de otra fila no lo encuentra nadie.';

f3.titulo = 'Acotar una busqueda a una caja geografica NO discrimina cuando el borde de la caja ES el falso positivo, y una consulta mal formulada devuelve un cero que se lee igual que un cero real: dos modos de falla medidos, uno en el primero de cinco y el otro en tres de diez';
f3.evidencia_en_el_arbol.EL_SEGUNDO_HALLAZGO = {
  titulo: 'UN CERO DE UNA CONSULTA MAL FORMULADA SE LEE IGUAL QUE UN CERO REAL',
  que_paso: 'El pase de busqueda sin acotar se corrio con la CADENA COMPLETA del documento: "faro Isla Isabel", "baliza anterior de Punta Truco", "Punta Lackawana", "punta Landgren". Devolvio CERO para varias y esos ceros iban camino de publicarse como NO ENCONTRADO. Repetida la misma consulta por el NUCLEO del nombre —"Isla Isabel", "Punta Truco", "Lackawana", "Landgren"— aparecieron TRES que el pase anterior habia dado por inexistentes: Isla Isabel (island, a 36 km del ancla de Cabo Negro y la unica Isla Isabel del estrecho de Magallanes), Caleta Lackawana (a 4,4 km del ancla de Eden) y Estero Landgren.',
  POR_QUE_PASA: 'Nadie nombra una isla "faro Isla Isabel". El generico que el documento antepone —faro, baliza, punta— NO es parte del nombre indexado, y una consulta que lo incluye busca una cadena que no existe en ninguna fuente. El buscador no tiene como avisar de eso: contesta cero, que es lo mismo que contesta cuando el lugar de verdad no esta.',
  LA_REGLA: 'Una consulta por nombre se corre POR EL NUCLEO, no por la cadena literal de la fuente. Y todo CERO se reintenta con la consulta reformulada ANTES de publicarse como no encontrado. Un cero es un resultado y hay que ganarselo: mientras no se haya intentado de dos maneras, no es un cero, es un no-lo-busque-bien.',
  DE_QUE_LADO_INCLINA_EL_ERROR: 'Este defecto SUBCUENTA: publica como ausente lo que esta. Es el gemelo del que midio METODO::emparejar-por-nombre-sin-revision-subcuenta-en-silencio el 2026-08-20 —16 % de subconteo, en silencio— y el opuesto del primer hallazgo de esta misma fila, que SOBRECUENTA. Los tres juntos dicen lo mismo desde tres lados: el instrumento no avisa de lo que no ve, y lo unico que lo caza es mirar otra vez.',
  lo_que_costaba_no_verlo: 'Tres toponimos publicados como inexistentes sobre 73. No mueve la cifra de bahias —los tres siguen sin pasar V3 en estricto—, pero habria puesto en la fila la afirmacion falsa de que Isla Isabel no esta en ninguna fuente abierta. Una cifra que aguanta y una afirmacion que no: se declara igual.',
  salida_cruda: '_bitacoras/toponimos_12100_47_2026-08-20/nominatim_pase2b.json'
};
f3.costo_estimado = f3.costo_estimado.replace('mas la regla escrita en el sitio de metodo que corresponda.',
  'mas la regla escrita en el sitio de metodo que corresponda. Y la segunda regla, del mismo tamano: consultar por NUCLEO y reintentar todo cero antes de publicarlo.');

fs.writeFileSync(F, JSON.stringify(D, null, 2) + '\n', 'utf8');

const L = []; const say = s => { L.push(s); console.log(s); };
say('P14 - LA DECISION DEL OWNER');
say('='.repeat(78));
say('FILA LIMITE-PUERTO::los-toponimos-en-fuentes-abiertas');
say(`  firma_owner : firmada=${f1.firma_owner.firmada}  fecha=${f1.firma_owner.fecha}`);
say(`  estado      : ${f1.estado}   <- SIGUE VIVA: firmar es responder, no hacer.`);
say('  DECISION    : NO SE COMPRA EL DERROTERO');
say('  fundamento  : el ultimo tercio de una capa cuya relevancia no esta probada');
say('  NO es       : "no hay presupuesto" -- se dice explicitamente, porque la');
say('                fila del 2026-08-20 habia dejado escrito que el freno era ese');
say('  reabre      : que se pruebe que el limite de practicaje ES el de SITPORT');
say('                (mitad viva de D4D5::la-segunda-direccion-no-es-decidible)');
say('  no decide   : si se digitalizan las 26 que ya estan resueltas');
say('');
say(`  los ${VR.resumen.A.soloGN + VR.resumen.B.soloGN} que dependen solo de GeoNames: ENUMERADOS en la fila`);
say('');
say('FILA METODO::la-contencion-no-discrimina-...');
say('  se le agrego EL_SEGUNDO_HALLAZGO: el cero de una consulta mal formulada');
say('  se lee igual que un cero real. Medido: tres de los ceros del pase sin');
say('  acotar aparecieron al reconsultar por nucleo.');
say('  y se saco de la evidencia de la fila de resultado, donde no lo encontraba nadie.');
say('');
say(`filas: ${D.deudas.length}   sitios: ${D.cobertura.sitios.length}`);
say('Corra ahora: npm run deudas');
fs.writeFileSync(path.join(__dirname, '14_decision_del_owner.txt'), L.join('\n') + '\n', 'utf8');
