'use strict';
// EL BORDE PWA <-> BACKEND — LA ASERCION DE U1.
//
//   «Todo campo que un endpoint emite esta CONSUMIDO o esta DECLARADO como no
//    consumido, con la lista.»
//
// Antes de esta pieza nada en ningun repositorio lo afirmaba, y por ese hueco se
// perdieron cuatro campos en el mismo pasamanos: `cierre` (corregido),
// `cobertura_jurisdiccional` (esta pieza), `motivo_principal` y `advertencias`.
//
// MIRA EL CONSUMO, NO LA COPIA, y esa distincion es el motivo de que el control
// exista: `motivo_principal` esta NOMBRADO en el pasamanos de la PWA y no lo lee
// nadie. Un control que comparara claves emitidas contra claves copiadas lo
// daria por verde.
//
// ─────────────────────────────────────────────────────────────────────────────
// LO QUE ESTE CONTROL NO MIRA, Y HAY QUE SABERLO ANTES DE APOYARSE EN EL:
//
//   LAS CLAVES SALEN DEL PAYLOAD CONGELADO, NO DEL ENDPOINT VIVO.
//
// El universo de campos es el de
// _bitacoras/spec2_pantalla_2026-08-20/05_payload_antofagasta_taltal.json, que
// es lo que el navegador recibio el 2026-08-20. Si manana el handler emite una
// clave mas, ESTE CONTROL SIGUE VERDE y el borde tiene un campo sin declarar.
// Cerrar ese hueco es leer el `res.json` del handler, y eso es parsear codigo:
// otra pieza, con su propia decision. Queda dicho aca y no en una bitacora
// porque aca es donde alguien se va a apoyar en el control.
// ─────────────────────────────────────────────────────────────────────────────

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PAYLOAD = path.join(__dirname, '..', '..', '..', '_bitacoras',
  'spec2_pantalla_2026-08-20', '05_payload_antofagasta_taltal.json');
const PWA_SRC = 'C:/Users/katia/tmarea-pwa/src';
const HOOK = PWA_SRC + '/hooks/useVoyageVerification.js';

// ── LA LISTA DECLARADA ───────────────────────────────────────────────────────
// Cuatro tipos, y la diferencia entre ellos no es cosmetica:
//   consumido      — alguien lo lee. El control lo comprueba contra el arbol.
//   protocolo      — sobre, no senal. No se le exige lector.
//   redundante     — el consumidor ya lo calcula por su cuenta. No es senal
//                    perdida.
//   deuda_sin_fila — SI es senal perdida, y hoy no tiene fila. Se declara aca
//   deuda_con_fila   para que no quede como exencion silenciosa (§4.2).
const DECLARADO = {
  success:                   { tipo: 'consumido',  nota: 'la compuerta `!data.success` de fetchTransitRestrictions' },
  veredicto:                 { tipo: 'consumido',  nota: 'escalarPorTransito, como respaldo de bandera_final' },
  bandera_final:             { tipo: 'consumido',  nota: 'escalarPorTransito' },
  cobertura_jurisdiccional:  { tipo: 'consumido',  nota: 'escalarPorCobertura — U2 capa C. NO renderizado todavia: la capa B es el item 2 del orden del plan de cierre' },
  drift_catalogo:            { tipo: 'consumido',  nota: 'escalarPorDrift y DriftCatalogoBlock' },
  veredicto_deportivo:       { tipo: 'consumido',  nota: 'VoyageVerdict' },
  ultimo_tramo_seguro:       { tipo: 'consumido',  nota: 'VoyageVerdict y TransitRestrictionsBlock' },
  restricciones_intermedias: { tipo: 'consumido',  nota: 'VoyageVerdict, TransitRestrictionsBlock y escalarPorTransito' },

  error:                     { tipo: 'protocolo',  nota: 'sobre' },
  fuente:                    { tipo: 'protocolo',  nota: 'procedencia' },
  timestamp:                 { tipo: 'protocolo',  nota: 'procedencia' },
  timestamp_sitport:         { tipo: 'protocolo',  nota: 'procedencia' },

  total:                     { tipo: 'redundante', nota: 'los bloques cuentan restricciones_intermedias.length por su cuenta' },

  motivo_principal:          { tipo: 'deuda_con_fila',  nota: 'D4D5::motivo-principal-muere-en-el-pasamanos — el owner ordeno escribirla, no arreglarla' },
  fondeadero_sugerido:       { tipo: 'deuda_con_fila',  nota: 'SESION-cobertura-capas-a-c-2026-08-20::fondeadero-sugerido-no-lo-lee-nadie — el motor calcula un fondeadero y el patron no lo ve nunca. Misma clase que `advertencias`. Era deuda_sin_fila: la fila se inserto el 2026-08-21' },
};

const payload = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8')).payload;

// LOS COMENTARIOS NO CUENTAN COMO LECTOR — agregado el 2026-08-21.
//
// EL DEFECTO: `lectores()` cuenta apariciones de la cadena `data.<campo>` en el
// texto de la PWA. Comprobaba que el campo estuviera ESCRITO, no que se USARA.
// Contraejemplo corrido: la linea `// TODO: algun dia leer data.ultimo_tramo_seguro`
// daba 1 lector, y con eso un campo declarado CONSUMIDO pasaba el test sin que
// nadie lo leyera. Y muerde en UN SOLO SENTIDO: en la lista de los consumidos
// produce un VERDE FALSO, que es el lado silencioso; en la de los no consumidos
// produce un rojo, que es ruidoso y barato. La familia del borde ya fallo cuatro
// veces —ver D4D5::motivo-principal-muere-en-el-pasamanos, y la cuarta era una
// advertencia de seguridad que nunca llego al patron—, y este es el control que
// existe para que no vuelva a pasar.
//
// ES LA MISMA RESTA QUE YA HACIA ESTE FICHERO con el objeto `result` del
// pasamanos, por el mismo motivo: alla «copiar no es consumir», aca «mencionar
// no es consumir». No es criterio nuevo.
//
// LO QUE ESTA RESTA NO CUBRE, Y SE DICE EN VEZ DE SUPONERSE:
//   · CODIGO MUERTO. `if (false) { render(data.campo) }` sigue contando como
//     lector. Distinguirlo exige parsear la PWA de verdad y no se paga hoy.
//   · un `//` dentro de una cadena que no venga precedido de `:` se recorta de
//     mas. Eso solo puede SUBCONTAR lectores, o sea sale ROJO, y el control
//     positivo de abajo lo caza en la misma corrida.
const sinComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')   // de bloque
  .replace(/(?<!:)\/\/[^\n]*/g, ' ');  // de linea, sin comerse http://

// El texto de la PWA SIN el objeto `result` del pasamanos: copiar no es consumir,
// asi que la copia no puede contar como lector de si misma.
function pwaSinElPasamanos() {
  let texto = '';
  const anda = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) anda(p);
      else if (/\.jsx?$/.test(e.name)) texto += fs.readFileSync(p, 'utf8') + '\n';
    }
  };
  anda(PWA_SRC);
  const hook = fs.readFileSync(HOOK, 'utf8');
  const ini = hook.indexOf('const result = {');
  const fin = hook.indexOf('\n  };', ini);
  assert.ok(ini > 0 && fin > ini, 'no se encontro el objeto `result` del pasamanos');
  return sinComentarios(texto.split(hook.slice(ini, fin)).join(''));
}

const TEXTO = pwaSinElPasamanos();
const contarEn = (texto, campo) =>
  (texto.match(new RegExp('(?:transitRestrictions|data)\\s*\\??\\.\\s*' + campo + '\\b', 'g')) || []).length;
const lectores = (campo) => contarEn(TEXTO, campo);

test('el barrido de lectores alcanza y discrimina — control positivo y negativo', () => {
  assert.ok(lectores('restricciones_intermedias') > 0, 'positivo: restricciones_intermedias se lee');
  assert.strictEqual(lectores('ZZQXNOEXISTE'), 0, 'negativo');

  // El tercer control, del 2026-08-21: una MENCION no es un lector. Se ejerce
  // sobre texto en memoria y no sobre la PWA, porque lo que se prueba es el
  // criterio de conteo, no el arbol de al lado.
  const soloEnComentario = '// TODO: algun dia leer data.ZZQXNOEXISTE\n';
  assert.strictEqual(contarEn(sinComentarios(soloEnComentario), 'ZZQXNOEXISTE'), 0,
    'un campo nombrado solo en un comentario no tiene lector: mencionar no es consumir');
  assert.strictEqual(contarEn(sinComentarios('const x = data.ZZQXNOEXISTE;\n'), 'ZZQXNOEXISTE'), 1,
    'control negativo del propio recorte: un uso real sigue contando despues de quitar comentarios');
  assert.strictEqual(contarEn(sinComentarios("fetch('https://api/x'); const y = data.ZZQXNOEXISTE;\n"), 'ZZQXNOEXISTE'), 1,
    'el recorte no se come la linea entera por un http:// que va delante');
});

test('TODO campo emitido esta en la lista, y la lista no declara campos que no se emiten', () => {
  const emitidos = Object.keys(payload).sort();
  const declarados = Object.keys(DECLARADO).sort();
  assert.deepStrictEqual(emitidos, declarados,
    'un campo emitido sin declarar, o declarado sin emitirse. La lista es cerrada A PROPOSITO: ' +
    'un campo nuevo nace ROJO, que es lo unico que impide que nazca invisible.');
});

test('cada campo declarado CONSUMIDO tiene por lo menos un lector en la PWA', () => {
  for (const [campo, d] of Object.entries(DECLARADO)) {
    if (d.tipo !== 'consumido') continue;
    assert.ok(lectores(campo) > 0,
      `"${campo}" esta declarado consumido (${d.nota}) y no lo lee nadie fuera del pasamanos`);
  }
});

test('cada campo declarado NO consumido sigue sin lector — si alguien empieza a leerlo, se reclasifica', () => {
  for (const [campo, d] of Object.entries(DECLARADO)) {
    if (d.tipo === 'consumido' || d.tipo === 'protocolo') continue;
    assert.strictEqual(lectores(campo), 0,
      `"${campo}" esta declarado ${d.tipo} y ahora tiene lector: la lista quedo vieja`);
  }
});

test('la deuda sin fila esta dicha con su motivo, no escondida en una exencion', () => {
  for (const [campo, d] of Object.entries(DECLARADO)) {
    if (!d.tipo.startsWith('deuda')) continue;
    assert.ok(d.nota && d.nota.length > 40,
      `"${campo}" es deuda y su nota no dice por que. Una lista de exenciones sin motivo es §4.2.`);
  }
});
