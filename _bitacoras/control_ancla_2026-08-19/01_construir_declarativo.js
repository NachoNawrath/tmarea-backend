#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
// 01_construir_declarativo.js - (a1)-T
//
// Construye data/catalogo/anclas_declaradas.json A PARTIR DE
// _bitacoras/coordenada_corrida_2026-08-19/03_antes_despues.tsv, que es el
// derivado versionado de la pieza (a1).
//
// NO lo construye leyendo la base, y ese es el punto: si el declarativo
// saliera de la base, el control seria tautologico -- la base diria lo que la
// base debe decir. El declarativo sale de la DECISION, y el control prueba que
// la base la cumple.
//
// No toca la base. No toca estado_drift.json. No levanta el backend.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..', '..');
const TSV = path.join(RAIZ, '_bitacoras/coordenada_corrida_2026-08-19/03_antes_despues.tsv');
const DESTINO = path.join(RAIZ, 'data/catalogo/anclas_declaradas.json');

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det !== undefined ? ' - ' + det : ''));
  else { fallas.push(n); say('  x ROJO - ' + n + (det !== undefined ? ' - ' + det : '')); }
};
const rel = p => path.relative(RAIZ, p).split(path.sep).join('/');

// El TSV trae la columna de nombre ESCAPADA a proposito (H-8): hay que
// des-escaparla para recuperar el caracter que la base tiene de verdad.
const desescapar = t => t.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

// Y hay que volver a escaparla para el JSON. JSON.stringify escapa los C0
// (U+0000-U+001F) DENTRO de los strings pero NO los C1 (U+0080-U+009F), y el
// nombre del 656 trae U+0091. Sin este paso el byte de control se va al
// fichero versionado.
//
// El rango del escapador es U+007F-U+009F Y NO U+0000-U+009F, y la diferencia
// costo una corrida: los LF que separan las lineas del JSON indentado tambien
// son C0, y escaparlos deja el fichero en UNA sola linea con la secuencia
// escapada del LF donde iban los saltos -- JSON invalido, y el instrumento
// murio al correr. Los C0 de adentro de los strings ya los escapa
// JSON.stringify; los
// unicos que quedan crudos son los C1 y el DEL.
const RE_CONTROL = new RegExp('[\\u007f-\\u009f]', 'g');
const escaparControles = s => s.replace(RE_CONTROL,
  c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const C1 = String.fromCharCode(0x91);

say('='.repeat(78));
say('(a1)-T - CONSTRUIR EL DECLARATIVO DESDE 03_antes_despues.tsv');
say('corrida ' + new Date().toISOString());
say('='.repeat(78));

say('');
say('1 - EL INSUMO');
const crudoBytes = fs.readFileSync(TSV);
say('    ' + rel(TSV));
say('    sha256 de los BYTES EN DISCO (clase FA-4): ' + crypto.createHash('sha256').update(crudoBytes).digest('hex'));

const lineas = crudoBytes.toString('utf8').split(/\r?\n/).filter(l => l.length > 0);
const cab = lineas[0].split('\t');
exigir('el TSV trae 1 cabecera + 11 filas', lineas.length === 12, lineas.length + ' lineas');

const col = n => {
  const i = cab.indexOf(n);
  if (i < 0) { console.error('EL INSUMO CAMBIO DE FORMA: falta la columna ' + n); process.exit(2); }
  return i;
};
const C = {
  id: col('nodo_id'), nom: col('nombre_en_la_base_ESCAPADO'), fte: col('fuente'),
  fid: col('fuente_id_en_la_base'), lat: col('lat_despues'), lng: col('lng_despues'),
  ancla: col('ancla_despues'), latA: col('lat_antes'), lngA: col('lng_antes'),
  anclaA: col('ancla_antes'),
};

const filas = [];
for (const linea of lineas.slice(1)) {
  const c = linea.split('\t');
  exigir('la fila ' + c[C.id] + ' declara ancla_despues = NULL en el TSV', c[C.ancla] === 'NULL', c[C.ancla]);
  filas.push({
    nodo_id: Number(c[C.id]),
    nombre: desescapar(c[C.nom]),
    fuente: c[C.fte],
    fuente_id: c[C.fid],
    lat: Number(c[C.lat]),
    lng: Number(c[C.lng]),
    ancla_esperada: null,
    pieza: '(a1) - LOS 11 NODOS SERNAPESCA CON LA COORDENADA CORRIDA, Y EL ANCLA QUE SALIO DE ELLA',
    fecha: '2026-08-19',
    origen_del_valor: 'caletas_chile.json, via _bitacoras/coordenada_corrida_2026-08-19/03_antes_despues.tsv',
    estado_previo: { lat: Number(c[C.latA]), lng: Number(c[C.lngA]), ancla: Number(c[C.anclaA]) },
  });
}
exigir('once filas construidas', filas.length === 11, filas.length);
exigir('sin nodo_id repetido', new Set(filas.map(f => f.nodo_id)).size === filas.length, filas.length + ' ids distintos');

const doc = {
  _que_es: 'Nodos de nodos_maritimos cuyo bahia_sitport_id y cuya posicion fueron DECIDIDOS por una pieza y no pueden cambiar solos. Lo lee scripts/control_ancla_declarada.js (npm run ancla). Agregar una fila aca NO exige tocar codigo.',
  _por_que_existe: 'nodos_maritimos tiene un BEFORE INSERT OR UPDATE OF geom -- trg_jurisdiccion_auto -- que corre asignar_jurisdiccion_sitport() y pisa bahia_sitport_id con un point-in-polygon contra la matview bahia_jurisdicciones. El NULL de estas filas no es una propiedad de la fila: es el estado en que las dejo una pieza, y mover el geom lo deshace sin que nadie mire. Deuda (a1)-T de PLAN_JURISDICCION.md, punto (i).',
  _por_que_tambien_la_coordenada: 'El ancla es el sintoma INCOMPLETO. Mover el geom dispara el trigger, pero el trigger solo escribe ancla si el punto cae dentro de un poligono: en la corrida de (a1) cayo en 2 de 11. En los otros 9 el geom se movio, el ancla quedo en NULL, y un control que solo mirara el ancla habria salido verde con la coordenada equivocada. Por eso se vigilan las dos cosas.',
  _que_NO_vigila: 'Solo juzga las filas declaradas aca. Las demas filas de nodos_maritimos tienen ancla sin que nadie haya declarado de donde salio -- H-2: el productor del campo no esta versionado en este repositorio -- asi que no hay contra que juzgarlas; el informe las MIDE como control negativo y no las exige. Y este control no mira al trigger: mira al CAMPO, asi que caza el ancla repuesta venga por donde venga -- trigger, UPDATE a mano, refresco de la matview, re-seed, o la via desconocida de H-2. Lo que NO hace es decir por donde vino, ni impedirlo: es una lectura periodica, no una barrera.',
  _advertencia_fuente_id: 'fuente_id es HUELLA DE IDENTIDAD CONGELADA, NO ES UN PUNTERO. H-5 de _bitacoras/coordenada_corrida_2026-08-19/: caletas_chile.json se regenero con otra numeracion; de los 20 CAL-xxxx de la base, 13 ya no existen en el fichero y 7 apuntan a otra caleta -- CAL-0054 es Puerto De Caldera Mejoras Fiscales en la base y una caleta a 688 km en el fichero. El control lo COMPARA contra la base y NUNCA RESUELVE nada con el. Nadie debe usarlo manana para buscar en caletas_chile.json.',
  _nota_caracteres: 'El nombre del nodo 656 trae U+0091, un control C1 (H-8 de la misma bitacora). En este fichero va ESCAPADO como los seis bytes ASCII de una secuencia backslash-u-0091, a proposito: un fichero versionado no lleva un caracter de control adentro. EL ESCAPE ES INTENCIONAL Y NO ES UN HALLAZGO. El control de caracteres de control corre sobre los BYTES del fichero, no sobre el string parseado. JSON.stringify no escapa los C1 por su cuenta. El lugar se llama Chanaral.',
  _procedimiento: 'Para agregar una fila: se agrega aca, con su pieza y su fecha, y se corre npm run ancla. La foto congelada de _bitacoras/control_ancla_2026-08-19/ NO se actualiza sola y no hace falta que se actualice: esa foto es el fixture de npm run ancla:mordida, que mide si la funcion MUERDE, no que mide el mundo. Que el mundo de hoy este bien lo prueba npm run ancla contra la base viva. Si se quiere que el fixture describa el mundo de hoy, se congela un PAR nuevo -- lectura de la tabla Y copia de este fichero, juntas y con la misma fecha -- y se apunta la mordida a el. NUNCA una sola de las dos: una foto con una declaracion de otra fecha da rojos que no significan nada.',
  tolerancia_grados: 1e-9,
  _tolerancia_por_que: 'La lectura del 2026-08-19 dio 0 diferencias sobre 11 a 1e-9 grados contra el valor declarado: el float8 de PostGIS y el Number de JS hacen el viaje de ida y vuelta sin perdida. Es dato declarado, no una constante del codigo.',
  filas,
};

const sinEscapar = JSON.stringify(doc, null, 2) + '\n';
const json = escaparControles(sinEscapar);
fs.writeFileSync(DESTINO, json, { encoding: 'utf8' });

say('');
say('2 - EL DESTINO');
const bytes = fs.readFileSync(DESTINO);
say('    ' + rel(DESTINO) + ' - ' + bytes.length + ' bytes');
say('    sha256 de los BYTES EN DISCO (clase FA-4): ' + crypto.createHash('sha256').update(bytes).digest('hex'));
const controles = [...bytes].filter(b => b < 0x20 && b !== 0x0a && b !== 0x0d).length;
exigir('cero caracteres de control fuera de LF/CR en los BYTES del fichero', controles === 0, controles + ' encontrados');
exigir('el U+0091 del 656 quedo como los 6 bytes ASCII de la secuencia escapada',
  bytes.toString('latin1').indexOf('\\u0091') >= 0, 'si');
const releido = JSON.parse(fs.readFileSync(DESTINO, 'utf8'));
exigir('re-parsea y devuelve el U+0091 como caracter, o sea que el escape no pierde el dato',
  releido.filas.find(f => f.nodo_id === 656).nombre.indexOf(C1) >= 0, 'si');
exigir('re-parsea las once', releido.filas.length === 11, releido.filas.length);
exigir('las once declaran ancla_esperada null',
  releido.filas.filter(f => f.ancla_esperada === null).length === 11, '11 / 11');

say('');
say('3 - CONTROL NEGATIVO DEL ESCAPADOR');
say('    Si el escapador no hiciera falta, este chequeo seria decoracion. Se mide.');
exigir('JSON.stringify DEJA el C1 crudo, y el escapador lo saca',
  sinEscapar.indexOf(C1) >= 0 && json.indexOf(C1) < 0, 'confirmado en los dos sentidos');

say('');
say('='.repeat(78));
say(fallas.length ? 'ROJO - ' + fallas.length + ' exigencias no se cumplieron'
  : 'VERDE - declarativo construido desde el TSV de (a1), no desde la base');
say('='.repeat(78));
fs.writeFileSync(path.join(__dirname, '01_construir_declarativo.txt'), L.join('\n') + '\n', { encoding: 'utf8' });
process.exit(fallas.length ? 2 : 0);
