// P4 + P5 - EL CRUCE.
//
// EL CRITERIO ESTA EN 05_criterio_cruce.txt Y SE ESCRIBIO ANTES QUE ESTO.
//
// ─── COMO SE ARMO LA LISTA DE REVISION ──────────────────────────────────────
// Dos pasadas, y la segunda es la que importa:
//   (1) el generador por contencion propuso 31 candidatos;
//   (2) despues mire A OJO, contra las 164 del catalogo completo, los 17 puertos
//       que el generador dejo sin ningun candidato -- y de ahi salieron 10
//       candidatos mas que el generador NO habia visto.
// Los 41 llevan veredicto manual con razon escrita. Los NO se publican.
//
// El control de RECALL de mas abajo mide exactamente cuanto habria costado
// confiar en el generador solo.

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const BE = path.resolve(DIR, '..', '..');
const datos = JSON.parse(fs.readFileSync(path.join(DIR, 'entradas_punto1.json'), 'utf8'));
const clasif = JSON.parse(fs.readFileSync(path.join(DIR, 'clasificacion_punto1.json'), 'utf8'));
const cat = JSON.parse(fs.readFileSync(path.join(BE, 'data/decreto/join_bahia_jurisdiccion.json'), 'utf8'));

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLocaleUpperCase('es').replace(/\s+/g, ' ').trim();

const puertos = [];
for (const e of datos.entradas) for (const p of e.puertos)
  puertos.push({ entrada: e.n, nombre: p, norm: norm(p) });
const bahias = cat.entradas.map((b) => ({ id: b.bahia_id, nombre: b.nombre_sitport, norm: norm(b.nombre_sitport) }));

// ── LA TABLA DE VEREDICTOS MANUALES ────────────────────────────────────────
// gen: 'contencion' = lo propuso el generador | 'ojo' = lo encontre yo mirando
// v  : 'SI' | 'NO'
const REVISION = [
  // ---- propuestos por el generador ----
  { p:'ARICA',        id: 71, gen:'contencion', v:'SI', r:'Bahia de Arica. Mismo lugar, el catalogo antepone el generico.' },
  { p:'IQUIQUE',      id: 72, gen:'contencion', v:'SI', r:'idem.' },
  { p:'PATACHE',      id:196, gen:'contencion', v:'NO', r:'PATACHE ya calzo EXACTO con la bahia 73. La 196 es un sector de BORDE COSTERO, otra unidad de SITPORT, no la bahia. Contarla sumaria el mismo toponimo dos veces.' },
  { p:'PATACHE',      id:197, gen:'contencion', v:'NO', r:'idem 196, sector sur.' },
  { p:'MEJILLONES',   id: 75, gen:'contencion', v:'SI', r:'el puerto de Mejillones esta en bahia Mejillones del Sur.' },
  { p:'COLOSO',       id: 78, gen:'contencion', v:'SI', r:'Caleta Coloso.' },
  { p:'CHAÑARÁL',     id: 80, gen:'contencion', v:'SI', r:'bahia Chañaral, Atacama. La entrada cita la carta SHOA 2213, que es esa.' },
  { p:'CHAÑARÁL',     id:158, gen:'contencion', v:'NO', r:'FALSO AMIGO. Caleta Chañaral de Aceituno esta cientos de km al sur del puerto de Chañaral y es otro lugar. Comparten el toponimo y nada mas. Este es el par que justifica que la revision exista.' },
  { p:'CALDERA',      id: 81, gen:'contencion', v:'SI', r:'' },
  { p:'CALDERILLA',   id: 82, gen:'contencion', v:'SI', r:'' },
  { p:'HUASCO',       id: 84, gen:'contencion', v:'SI', r:'' },
  { p:'COQUIMBO',     id: 85, gen:'contencion', v:'SI', r:'' },
  { p:'GUAYACÁN',     id: 86, gen:'contencion', v:'SI', r:'bahia Herradura de Guayacan, y el limite de la resolucion es justamente "punta Miedo con punta Herradura".' },
  { p:'QUINTERO',     id: 91, gen:'contencion', v:'SI', r:'' },
  { p:'QUINTERO',     id:219, gen:'contencion', v:'NO', r:'"Sector Norte Quintero" es un sector de SITPORT, no la bahia. Mismo motivo que Patache 196/197.' },
  { p:'VALPARAÍSO',   id: 92, gen:'contencion', v:'SI', r:'' },
  { p:'SAN ANTONIO',  id: 93, gen:'contencion', v:'SI', r:'' },
  { p:'CONSTITUCIÓN', id:103, gen:'contencion', v:'SI', r:'' },
  { p:'LIRQUÉN',      id: 97, gen:'contencion', v:'SI', r:'bahia Concepcion - Lirquen.' },
  { p:'TALCAHUANO',   id: 98, gen:'contencion', v:'SI', r:'bahia Concepcion - Talcahuano.' },
  { p:'SAN VICENTE',  id: 99, gen:'contencion', v:'SI', r:'' },
  { p:'CORONEL',      id:100, gen:'contencion', v:'SI', r:'bahia Coronel, Biobio.' },
  { p:'CORONEL',      id:114, gen:'contencion', v:'NO', r:'FALSO AMIGO. "Punta Coronel" del canal Chacao esta a ~600 km del puerto de Coronel. Homonimo puro.' },
  { p:'CORRAL',       id:107, gen:'contencion', v:'SI', r:'' },
  { p:'ANCUD',        id:118, gen:'contencion', v:'SI', r:'bahia Ancud y canal Chacao.' },
  { p:'ANCUD',        id:214, gen:'contencion', v:'SI', r:'bahia Ancud. El catalogo trae DOS entradas para la misma bahia (118 y 214). Las dos corresponden: la pregunta cuenta bahias del catalogo, y son dos filas del catalogo.' },
  { p:'CHACABUCO',    id:126, gen:'contencion', v:'SI', r:'' },
  { p:'EDÉN',         id:129, gen:'contencion', v:'SI', r:'Puerto Eden.' },
  { p:'NATALES',      id:130, gen:'contencion', v:'SI', r:'Puerto Natales.' },
  { p:'CLARENCIA',    id:132, gen:'contencion', v:'SI', r:'' },
  { p:'GREGORIO',     id:131, gen:'contencion', v:'SI', r:'' },

  // ---- los que el generador NO vio y encontre mirando el catalogo entero ----
  { p:'PATILLOS',     id:195, gen:'ojo', v:'SI', r:'el catalogo lo escribe en SINGULAR, "PATILLO". Por eso la contencion no muerde: PATILLOS no esta contenido en PATILLO ni al reves. Mismo lugar (puerto Patillos, Tarapaca).' },
  { p:'ANTOFAGASTA',  id: 77, gen:'ojo', v:'SI', r:'"BAHIA MORENO (ANTOFAGASTA)". La contencion fallo por los PARENTESIS: la frontera de palabra no salta un "(". Bahia Moreno ES la bahia de Antofagasta y el catalogo lo dice en el propio nombre.' },
  { p:'TALTAL',       id: 79, gen:'ojo', v:'SI', r:'el catalogo lo escribe con ESPACIO, "TAL TAL". Mismo lugar.' },
  { p:'HANGA ROA',    id: 89, gen:'ojo', v:'SI', r:'el catalogo tiene UNA entrada para toda Isla de Pascua. La correspondencia es a nivel de ISLA, no de caleta: la resolucion le fija limite a tres caletas de esa isla y el catalogo tiene una sola bahia. Se declara la aspereza.' },
  { p:'HANGA PIKO',   id: 89, gen:'ojo', v:'SI', r:'idem - misma bahia del catalogo.' },
  { p:'HANGA VINAPU', id: 89, gen:'ojo', v:'SI', r:'idem - misma bahia del catalogo. Tres puertos contra una bahia.' },
  { p:'JUAN FERNÁNDEZ', id: 90, gen:'ojo', v:'SI', r:'"ISLA ROBINSON CRUSOE", la isla principal del archipielago Juan Fernandez. El limite de la resolucion -- Punta San Carlos a Punta Loberia -- es la bahia Cumberland, en esa isla.' },
  { p:'SAN JOSÉ DE CALBUCO', id:113, gen:'ojo', v:'SI', r:'"BAHIA DE CALBUCO". El puerto San Jose de Calbuco es el puerto de Calbuco.' },
  { p:'SAN JOSÉ DE CALBUCO', id:232, gen:'ojo', v:'NO', r:'"SAN JOSE-CAICAEN" es otro sector de SITPORT en la comuna. Emparejarlo por el token compartido "SAN JOSE" es exactamente la trampa de similitud que el criterio prohibe. Se revisa y se descarta.' },
  { p:'RÍO NEGRO HORNOPIRÉN', id:115, gen:'ojo', v:'SI', r:'"CANAL HORNOPIREN". Hornopiren se llamo Rio Negro y la resolucion ancla el limite en Caleta Rio Negro. Misma localidad.' },
];

const say = (s) => console.log(s);

say('P4 + P5 - EL CRUCE');
say('='.repeat(78));
say('');
say('CRITERIO: 05_criterio_cruce.txt, escrito ANTES de correr esto.');
say('LADO A: 53 puertos de las 49 entradas del ANEXO "A" punto 1 (Res. 12100/47).');
say('LADO B: 164 bahias de data/decreto/join_bahia_jurisdiccion.json, campo');
say('        nombre_sitport. El 164 es de ESA fuente: estado_drift.json declara');
say('        F1:163 F2:163 F3:164 F4:163 F5:163 sobre universo_sitport 166.');
say('');

// ── exactos ────────────────────────────────────────────────────────────────
const exactos = [];
for (const p of puertos) for (const b of bahias) if (p.norm === b.norm) exactos.push({ p, b });

say('CALCE EXACTO - cadena normalizada identica. Automatico, no se revisa.');
say('-'.repeat(78));
for (const { p, b } of exactos)
  say('  ' + p.nombre.padEnd(22) + ' == bahia ' + String(b.id).padStart(3) + '  ' + b.nombre);
say('  pares: ' + exactos.length + '   bahias distintas: ' +
    new Set(exactos.map((x) => x.b.id)).size);
say('');

// ── revision manual ────────────────────────────────────────────────────────
const idxB = new Map(bahias.map((b) => [b.id, b]));
let malas = 0;
for (const r of REVISION) {
  if (!idxB.has(r.id)) { say('ROJO: bahia ' + r.id + ' no existe en el catalogo'); malas++; }
  if (r.v === 'NO' && !r.r) { say('ROJO: NO sin razon escrita -> ' + r.p + '/' + r.id); malas++; }
  if (!puertos.some((p) => p.nombre === r.p)) { say('ROJO: puerto ' + r.p + ' no existe en el lado A'); malas++; }
}

const si = REVISION.filter((r) => r.v === 'SI');
const no = REVISION.filter((r) => r.v === 'NO');

say('CALCE PROBABLE - revisado A MANO, uno por uno. ' + REVISION.length + ' candidatos.');
say('-'.repeat(78));
say('');
say('  ACEPTADOS (' + si.length + ' pares)');
for (const r of si)
  say('    SI  ' + r.p.padEnd(22) + ' -> ' + String(r.id).padStart(3) + ' ' +
      idxB.get(r.id).nombre.padEnd(34) + (r.r ? ' | ' + r.r : ''));
say('');
say('  RECHAZADOS (' + no.length + ' pares) - se publican, que es el punto');
for (const r of no)
  say('    NO  ' + r.p.padEnd(22) + ' -> ' + String(r.id).padStart(3) + ' ' +
      idxB.get(r.id).nombre.padEnd(34) + ' | ' + r.r);
say('');

// ── control de recall del generador ────────────────────────────────────────
const siPorOjo = si.filter((r) => r.gen === 'ojo');
const bahiasSoloOjo = new Set(siPorOjo.map((r) => r.id));
say('CONTROL DE RECALL - CUANTO COSTABA CREERLE AL GENERADOR');
say('-'.repeat(78));
say('  candidatos que propuso el generador por contencion : ' +
    REVISION.filter((r) => r.gen === 'contencion').length);
say('  pares verdaderos que el generador NO VIO           : ' + siPorOjo.length);
say('  bahias distintas que se habrian perdido            : ' + bahiasSoloOjo.size);
say('');
say('  Y POR QUE NO LOS VIO, que son cuatro modos de falla distintos:');
say('    - un PLURAL      : PATILLOS  vs  el catalogo, que dice PATILLO');
say('    - un ESPACIO     : TALTAL    vs  el catalogo, que dice TAL TAL');
say('    - un PARENTESIS  : ANTOFAGASTA dentro de "BAHIA MORENO (ANTOFAGASTA)"');
say('    - un NOMBRE DISTINTO para el mismo lugar: JUAN FERNANDEZ -> ISLA ROBINSON');
say('      CRUSOE, RIO NEGRO HORNOPIREN -> CANAL HORNOPIREN, HANGA * -> ISLA DE');
say('      PASCUA, SAN JOSE DE CALBUCO -> BAHIA DE CALBUCO');
say('');
say('  NINGUNO de los cuatro lo arregla un umbral de similitud mas flojo: el');
say('  cuarto no comparte una sola letra util. Lo unico que los encuentra es');
say('  mirar las 164. Y aflojar el umbral para cazar los tres primeros habria');
say('  metido mas falsos amigos como Chañaral de Aceituno y Punta Coronel.');
say('');

// ── los tres conteos, direccion B->A ───────────────────────────────────────
const bExacto = new Set(exactos.map((x) => x.b.id));
const bProbable = new Set(si.map((r) => r.id));
for (const id of bExacto) bProbable.delete(id);
const conCalce = new Set([...bExacto, ...bProbable]);
const sinCalce = bahias.filter((b) => !conCalce.has(b.id));

say('LOS TRES CONTEOS - DIRECCION B->A, QUE ES LA PREGUNTA DEL ENCARGO');
say('-'.repeat(78));
say('  DENOMINADOR: las 164 bahias de join_bahia_jurisdiccion.json.');
say('');
say('    CALCE EXACTO ................ ' + String(bExacto.size).padStart(3) + ' de 164');
say('    CALCE PROBABLE (revisado) ... ' + String(bProbable.size).padStart(3) + ' de 164');
say('    SIN CALCE ................... ' + String(sinCalce.length).padStart(3) + ' de 164');
const suma = bExacto.size + bProbable.size + sinCalce.length;
say('    ' + '-'.repeat(36));
say('    suma ........................ ' + String(suma).padStart(3) +
    (suma === 164 ? '  OK' : '  ROJO'));
say('');
say('  RESPUESTA: ' + conCalce.size + ' de las 164 bahias del catalogo (' +
    (conCalce.size / 164 * 100).toFixed(1).replace('.', ',') +
    ' %) corresponden a un puerto con limite de puerto fijado en la 12100/47.');
say('');

// ── direccion A->B ─────────────────────────────────────────────────────────
const pExacto = new Set(exactos.map((x) => x.p.nombre));
const pProbable = new Set(si.map((r) => r.p));
const pConCalce = new Set([...pExacto, ...pProbable]);
const pSin = puertos.filter((p) => !pConCalce.has(p.nombre));
say('DIRECCION A->B - CUANTO DEL DOCUMENTO ATERRIZA');
say('-'.repeat(78));
say('  DENOMINADOR: los 53 puertos del ANEXO "A" punto 1.');
say('    con al menos una bahia ...... ' + String(pConCalce.size).padStart(2) + ' de 53');
say('    sin ninguna ................. ' + String(pSin.length).padStart(2) + ' de 53');
say('    los que no aterrizan: ' + pSin.map((p) => p.nombre).join(' · '));
say('');
say('  Los dos numeros no se parecen y no se promedian: ' + conCalce.size + ' de 164 y ' +
    pConCalce.size + ' de 53.');
say('  La relacion es muchos a muchos en las DOS direcciones -- tres puertos de');
say('  Isla de Pascua caen en una bahia, y una bahia (Ancud) esta dos veces en el');
say('  catalogo.');
say('');

// ── P5: LA PREGUNTA QUE DECIDE ─────────────────────────────────────────────
const claseDeEntrada = new Map(clasif.filas.map((f) => [f.n, f]));
const entradaDePuerto = new Map(puertos.map((p) => [p.nombre, p.entrada]));

const paresSi = [
  ...exactos.map((x) => ({ p: x.p.nombre, id: x.b.id, tipo: 'exacto' })),
  ...si.map((r) => ({ p: r.p, id: r.id, tipo: 'probable' })),
];

const porEje2 = { 'C-TODAS': new Set(), 'C-ALGUNAS': new Set(), 'C-NINGUNA': new Set() };
const detalleTodas = [];
for (const par of paresSi) {
  const f = claseDeEntrada.get(entradaDePuerto.get(par.p));
  porEje2[f.coordenadas].add(par.id);
  if (f.coordenadas === 'C-TODAS') detalleTodas.push({ ...par, f });
}
// una bahia que recibe dos puertos de distinta calidad cuenta en la MEJOR
for (const id of porEje2['C-TODAS']) { porEje2['C-ALGUNAS'].delete(id); porEje2['C-NINGUNA'].delete(id); }
for (const id of porEje2['C-ALGUNAS']) porEje2['C-NINGUNA'].delete(id);

say('P5 - DE LAS QUE CALZAN, CUANTAS TRAEN COORDENADAS EXPLICITAS');
say('-'.repeat(78));
say('  Esta es la pregunta que decide si esto vale la pena: cuantas se podrian');
say('  volver geometria SIN resolver un solo toponimo y SIN abrir una sola carta.');
say('  Regla de asignacion: si una bahia recibe dos puertos de distinta calidad,');
say('  cuenta en la MEJOR de las dos. Por eso las tres filas suman ' + conCalce.size + '.');
say('');
say('    C-TODAS   ... ' + String(porEje2['C-TODAS'].size).padStart(3) + ' bahias   ' +
    'geometria directa, cero toponimos que resolver');
say('    C-ALGUNAS ... ' + String(porEje2['C-ALGUNAS'].size).padStart(3) + ' bahias   ' +
    'falta georreferenciar al menos un toponimo');
say('    C-NINGUNA ... ' + String(porEje2['C-NINGUNA'].size).padStart(3) + ' bahias   ' +
    'ni una coordenada: todo por carta del SHOA');
const sumaEje2 = porEje2['C-TODAS'].size + porEje2['C-ALGUNAS'].size + porEje2['C-NINGUNA'].size;
say('    ' + '-'.repeat(30));
say('    suma .......  ' + String(sumaEje2).padStart(3) + (sumaEje2 === conCalce.size ? '  OK' : '  ROJO'));
say('');
say('  EL NUMERO: ' + porEje2['C-TODAS'].size + ' de 164 bahias (' +
    (porEje2['C-TODAS'].size / 164 * 100).toFixed(1).replace('.', ',') + ' %), o ' +
    porEje2['C-TODAS'].size + ' de las ' + conCalce.size + ' que calzan (' +
    (porEje2['C-TODAS'].size / conCalce.size * 100).toFixed(1).replace('.', ',') + ' %).');
say('');
say('  LAS ' + porEje2['C-TODAS'].size + ', UNA POR UNA:');
const vistas = new Set();
for (const d of detalleTodas) {
  if (vistas.has(d.id)) { say('      (' + d.p + ' cae en la misma bahia)'); continue; }
  vistas.add(d.id);
  say('      bahia ' + String(d.id).padStart(3) + '  ' + idxB.get(d.id).nombre.padEnd(30) +
      '  <- ' + d.p.padEnd(22) + ' ' + d.f.clase + ' (' + d.tipo + ')');
}
say('');
const entradasTodas = clasif.filas.filter((f) => f.coordenadas === 'C-TODAS').length;
say('  DATO QUE NO ES OBVIO: las ' + entradasTodas + ' entradas C-TODAS del documento aterrizaron');
say('  TODAS en una bahia del catalogo. Ninguna se perdio. El cuello de botella');
say('  NO es el emparejamiento -- es que el documento casi no trae coordenadas.');
say('');

fs.writeFileSync(path.join(DIR, 'cruce_12100_47.json'),
  JSON.stringify({
    QUE_ES_ESTO: 'Cruce de reconocimiento entre el ANEXO "A" punto 1 de la Res. DGTM y MM Ex. ' +
      '12100/47 y las 164 bahias de join_bahia_jurisdiccion.json. NINGUN CODIGO LO CONSUME. ' +
      'No es un insumo, no adjudica nada, no se promueve a data/.',
    criterio: '05_criterio_cruce.txt',
    lado_A: { que: 'puertos del ANEXO A punto 1', n: puertos.length, entradas: datos.entradas.length },
    lado_B: { que: 'bahias', fuente: 'data/decreto/join_bahia_jurisdiccion.json (nombre_sitport)', n: bahias.length },
    B_hacia_A: { calce_exacto: bExacto.size, calce_probable: bProbable.size, sin_calce: sinCalce.length, total: 164 },
    A_hacia_B: { con_calce: pConCalce.size, sin_calce: pSin.length, total: 53,
                 puertos_sin_calce: pSin.map((p) => p.nombre) },
    coordenadas_de_las_que_calzan: {
      C_TODAS: porEje2['C-TODAS'].size, C_ALGUNAS: porEje2['C-ALGUNAS'].size,
      C_NINGUNA: porEje2['C-NINGUNA'].size,
    },
    revision_manual: REVISION.map((r) => ({ puerto: r.p, bahia_id: r.id, propuesto_por: r.gen,
                                            veredicto: r.v, razon: r.r || null })),
    lo_que_no_prueba: 'Que el "DENTRO DEL LIMITE DEL PUERTO" de AreaRestriccion de SITPORT sea ' +
      'ESTE limite. Es plausible y NO esta probado. Estos limites se fijan para PRACTICAJE ' +
      '(Titulo V del D.S. (M.) 397 de 1985), no para restricciones de navegacion.',
  }, null, 2) + '\n', 'utf8');
say('ESCRITO: cruce_12100_47.json');
say('');

const verde = malas === 0 && suma === 164 && sumaEje2 === conCalce.size;
say('VEREDICTO P4+P5: ' + (verde ? 'VERDE' : 'ROJO'));
process.exit(verde ? 0 : 3);
