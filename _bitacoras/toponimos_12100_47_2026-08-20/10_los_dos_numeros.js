// P10 - LOS DOS NUMEROS, JUNTOS Y AL FINAL
//
// (a) cuantas entradas quedarian resueltas SOLO con fuentes abiertas  -> MEDIDO
// (b) cuantas si ademas hubiera derrotero, estimado por clase de lugar -> ESTIMADO
//
// LA REGLA DE "ENTRADA RESUELTA", declarada antes de aplicarse:
//   una entrada esta RESUELTA si TODOS sus toponimos estan VERIFICADOS.
//   - un toponimo B-DESCRITO SIN CADENA hace la entrada IRRESOLUBLE por
//     gazetteer, siempre: no hay nombre que consultar.
//   - el residuo C-PARTE ("el canto Weste de...") NO bloquea: el lugar esta
//     encontrado y lo que falta es precision de borde. Se reporta aparte y
//     se cuenta cuantas entradas arrastran ese residuo.
//   Se declara asi porque la pregunta del encargo es si la ENTRADA se puede
//   volver geometria, y una entrada con un extremo sin resolver no se puede.

const fs = require('fs'), path = require('path');
const TT = require(path.join(__dirname, 'toponimos_39.json')).toponimos;
const VV = require(path.join(__dirname, 'veredictos.json'));
const V = VV.veredictos;

// entrada -> bahias del catalogo (06_cruzar.txt del 2026-08-20, pares ACEPTADOS)
const BAH = { 1:[71], 5:[72], 6:[195], 8:[], 14:[81], 23:[91], 26:[93], 27:[103], 28:[], 29:[97],
  32:[100], 38:[109], 43:[129], 47:[132],
  2:[204], 3:[], 4:[], 9:[75], 12:[79], 13:[80], 15:[82], 18:[84], 19:[202], 20:[85], 21:[86],
  22:[], 24:[92], 25:[90], 33:[102], 34:[101], 35:[107], 36:[118,214], 37:[113], 40:[121],
  41:[123], 42:[126], 44:[130], 46:[135], 49:[138] };

// la tabla N- de la seccion 6 del criterio de clases
const SEGURA = ['L-PUNTA','L-ISLOTE','L-ROCA','L-MORRO','L-FARO','L-BALIZA','L-CALETA','L-CANAL'];
const DUDOSA = ['L-BOYA','L-DESEMBOC','L-MUELLE'];
function nclase(t) { if (t.B === 'B-DESCRITO') return 'N-DUDOSA';
  return SEGURA.includes(t.A) ? 'N-SEGURA' : (DUDOSA.includes(t.A) ? 'N-DUDOSA' : 'N-IMPROBABLE'); }
const est = t => t.busqueda ? V[t.n + '|' + t.cita].e : 'S';   // S = sin cadena
const lax = t => t.busqueda ? V[t.n + '|' + t.cita].l : 'S';

const L = []; const say = s => L.push(s);
say('P10 - LOS DOS NUMEROS');
say('='.repeat(78));
say('(a) SOLO FUENTES ABIERTAS ... MEDIDO.   (b) CON DERROTERO ... ESTIMADO.');
say('Los dos conjuntos NO se suman. Cada cifra dice su denominador.');
say('');

const resumen = {};
for (const cj of ['A', 'B']) {
  const ents = [...new Set(TT.filter(t => t.conjunto === cj).map(t => t.n))].sort((a, b) => a - b);
  const rot = cj === 'A' ? 'CONJUNTO A - 14 entradas C-ALGUNAS - escalon 9 -> 21 bahias'
                         : 'CONJUNTO B - 25 entradas C-NINGUNA - escalon 21 -> 44 bahias';
  say('='.repeat(78)); say(rot); say('='.repeat(78));
  const filas = [];
  for (const n of ents) {
    const T = TT.filter(t => t.conjunto === cj && t.n === n);
    const faltanE = T.filter(t => est(t) !== 'V');
    const faltanL = T.filter(t => lax(t) !== 'V');
    const parte = T.filter(t => t.C === 'C-PARTE' && est(t) === 'V');
    // que haria falta del derrotero, por clase
    const clasesFaltan = faltanL.map(nclase);
    const soloSegura = faltanL.every(t => nclase(t) === 'N-SEGURA');
    const seguraODudosa = faltanL.every(t => nclase(t) !== 'N-IMPROBABLE');
    filas.push({ n, entrada: T[0].entrada, bahias: BAH[n], total: T.length,
      resuelta_e: faltanE.length === 0, resuelta_l: faltanL.length === 0,
      faltan_e: faltanE.map(t => t.busqueda || '[sin nombre] ' + t.cita.slice(0, 40)),
      faltan_l: faltanL.map(t => (t.busqueda || '[sin nombre] ' + t.cita.slice(0, 34)) + ' <' + nclase(t) + '>'),
      residuo_parte: parte.map(t => t.cita), clasesFaltan,
      derr_baja: faltanL.length === 0 ? true : soloSegura,
      derr_alta: faltanL.length === 0 ? true : seguraODudosa });
  }
  const utiles = filas.filter(f => f.bahias.length);
  const bahDe = fs => [...new Set(fs.flatMap(f => f.bahias))].length;
  const rE = filas.filter(f => f.resuelta_e), rL = filas.filter(f => f.resuelta_l);
  const rEu = rE.filter(f => f.bahias.length), rLu = rL.filter(f => f.bahias.length);

  say(`  DENOMINADORES: ${ents.length} entradas del documento · ${utiles.length} utiles al catalogo · ${bahDe(utiles)} bahias`);
  say('');
  say('  (a) RESUELTAS SOLO CON FUENTES ABIERTAS  -- MEDIDO');
  say(`      veredicto ESTRICTO : ${rE.length} de ${ents.length} entradas · ${rEu.length} utiles · ${bahDe(rEu)} bahias de 164`);
  say(`      veredicto LAXO     : ${rL.length} de ${ents.length} entradas · ${rLu.length} utiles · ${bahDe(rLu)} bahias de 164`);
  say('');
  say('  (b) SI ADEMAS HUBIERA DERROTERO  -- ESTIMACION, NO MEDICION');
  const dB = filas.filter(f => f.derr_baja), dA = filas.filter(f => f.derr_alta);
  const dBu = dB.filter(f => f.bahias.length), dAu = dA.filter(f => f.bahias.length);
  say('      No se inventa un porcentaje. Se dan DOS COTAS por clase de lugar:');
  say('      COTA BAJA  el derrotero resuelve solo lo N-SEGURA (puntas, islotes,');
  say('                 rocas, morros, faros, balizas, caletas, canales).');
  say(`                 -> ${dB.length} de ${ents.length} entradas · ${dBu.length} utiles · ${bahDe(dBu)} bahias`);
  say('      COTA ALTA  resuelve ademas lo N-DUDOSA (boyas, desembocaduras,');
  say('                 muelles, y los accidentes que el documento no nombra).');
  say(`                 -> ${dA.length} de ${ents.length} entradas · ${dAu.length} utiles · ${bahDe(dAu)} bahias`);
  say('');
  say('  EL RESIDUO C-PARTE, que no bloquea pero no desaparece:');
  const conParte = filas.filter(f => f.residuo_parte.length);
  say(`      entradas con al menos un "canto Weste de..." resuelto solo como punto: ${conParte.length}`);
  for (const f of conParte) say(`        #${f.n} ${f.entrada}: ${f.residuo_parte.join(' · ')}`);
  say('');
  say('  ENTRADA POR ENTRADA');
  for (const f of filas) {
    say(`    #${String(f.n).padStart(2)} ${f.entrada.padEnd(24)} bahias:${f.bahias.length ? f.bahias.join(',') : 'NINGUNA'.padEnd(3)}  abiertas:${f.resuelta_e ? 'SI' : 'no'}/${f.resuelta_l ? 'SI' : 'no'}  derrotero:${f.derr_baja ? 'baja+alta' : (f.derr_alta ? 'solo alta' : 'NI ASI')}`);
    if (f.faltan_l.length) say(`         falta: ${f.faltan_l.join(' · ')}`);
  }
  say('');
  resumen[cj] = { entradas: ents.length, utiles: utiles.length, bahias: bahDe(utiles),
    a_estricto: { entradas: rE.length, utiles: rEu.length, bahias: bahDe(rEu) },
    a_laxo: { entradas: rL.length, utiles: rLu.length, bahias: bahDe(rLu) },
    b_cota_baja: { entradas: dB.length, utiles: dBu.length, bahias: bahDe(dBu) },
    b_cota_alta: { entradas: dA.length, utiles: dAu.length, bahias: bahDe(dAu) } };
}

// --- EL ESCALON, EN LA UNIDAD DEL DECLARATIVO ---------------------------------
say('='.repeat(78));
say('EL ESCALON, EN LA UNIDAD QUE USA EL DECLARATIVO: BAHIAS DE 164');
say('='.repeat(78));
say('Punto de partida medido el 2026-08-20: 9 bahias geometrizables sin insumo');
say('nuevo. El declarativo dice que resolver las 12 C-ALGUNAS lleva a 21, y las');
say('23 C-NINGUNA de ahi a 44.');
say('');
const A = resumen.A, B = resumen.B;
say('  SOLO FUENTES ABIERTAS -- MEDIDO');
say(`    estricto : 9 + ${A.a_estricto.bahias} (conjunto A) = ${9 + A.a_estricto.bahias}   y sumando el B: ${9 + A.a_estricto.bahias + B.a_estricto.bahias} de 164`);
say(`    laxo     : 9 + ${A.a_laxo.bahias} = ${9 + A.a_laxo.bahias}   y sumando el B: ${9 + A.a_laxo.bahias + B.a_laxo.bahias} de 164`);
say('');
say('  CON DERROTERO -- ESTIMADO');
say(`    cota baja: 9 + ${A.b_cota_baja.bahias} + ${B.b_cota_baja.bahias} = ${9 + A.b_cota_baja.bahias + B.b_cota_baja.bahias} de 164`);
say(`    cota alta: 9 + ${A.b_cota_alta.bahias} + ${B.b_cota_alta.bahias} = ${9 + A.b_cota_alta.bahias + B.b_cota_alta.bahias} de 164`);
say(`    techo absoluto (todo resuelto): 44 de 164`);
say('');
say('  ESTA SUMA SI SE HACE Y LAS DE ARRIBA NO: aca la unidad es la BAHIA, que');
say('  es comun a los dos conjuntos y al 9 de partida. Lo que no se suma son');
say('  las ENTRADAS de A con las de B, porque son denominadores distintos.');
say('');

// --- SOBRE QUE DESCANSA -------------------------------------------------------
say('='.repeat(78));
say('SOBRE QUE DESCANSA EL NUMERO: PROCEDENCIAS Y COBERTURA DEL INSTRUMENTO');
say('='.repeat(78));
const rA = VV.resumen.A, rB = VV.resumen.B;
say('  PROCEDENCIAS INDEPENDIENTES POR VERIFICADO (estricto)');
say(`    conjunto A: ${rA.dos} de ${rA.V} con DOS · ${rA.soloGN} solo GeoNames · ${rA.soloOSM} solo OSM`);
say(`    conjunto B: ${rB.dos} de ${rB.V} con DOS · ${rB.soloGN} solo GeoNames · ${rB.soloOSM} solo OSM`);
say('');
say(`    SIN GEONAMES: A cae de ${rA.V} a ${rA.V - rA.soloGN} toponimos · B de ${rB.V} a ${rB.V - rB.soloGN}.`);
say(`    SIN OSM     : A cae de ${rA.V} a ${rA.V - rA.soloOSM} · B de ${rB.V} a ${rB.V - rB.soloOSM}.`);
say('    O sea que NINGUNA DE LAS DOS FUENTES SOLA SOSTIENE EL RESULTADO, y la');
say('    que mas aporta es la que casi no se usa en este rubro: GeoNames.');
say('    Los que dependen SOLO de GeoNames, por si alguien quiere auditarlos:');
say(`      A: ${rA.soloGN_cuales.join(' · ')}`);
say(`      B: ${rB.soloGN_cuales.join(' · ')}`);
say('');
const OSMJ = require(path.join(__dirname, 'osm_crudo.json'));
const traidas = Object.values(OSMJ).filter(x => x.http === 200).length;
say('  COBERTURA DEL INSTRUMENTO - LO QUE NO SE PUDO CONSULTAR');
say(`    cajas traidas por Overpass : ${traidas} de 39`);
say(`    cajas NO TRAIDAS           : ${39 - traidas} de 39`);
say('    En esas 32 cajas la unica via a OSM fue Nominatim, que consulta POR');
say('    NOMBRE y no vuelca la caja. O sea que ahi NO se pudo mirar la lista');
say('    entera, que es lo unico que caza "otro nombre para el mismo lugar".');
say('    LO QUE ESO SIGNIFICA PARA EL NUMERO: los VERIFICADOS no estan en duda');
say('    -- un candidato encontrado y revisado es un candidato encontrado --.');
say('    Los que quedan debiles son los DESCARTADOS y los NO ENCONTRADOS: en');
say('    32 de 39 cajas el instrumento pudo no ver un renombre. El numero de');
say('    (a) es por lo tanto una COTA INFERIOR, y se declara asi.');

fs.writeFileSync(path.join(__dirname, 'los_dos_numeros.json'), JSON.stringify(resumen, null, 1), 'utf8');
fs.writeFileSync(path.join(__dirname, '10_los_dos_numeros.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
