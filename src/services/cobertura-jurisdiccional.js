'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// cobertura-jurisdiccional.js — R1, pieza 2.
//
// CONTRATO_MOTOR.md INV-3.6: si una ruta entra en una zona sin geometria
// cargada, se informa; nunca se resuelve en silencio. Hoy el motor pregunta
// "que jurisdicciones toca la ruta" y no pregunta "que parte de la ruta no toca
// ninguna". Este modulo hace la segunda pregunta.
//
// LO QUE ESTE MODULO NO HACE, y no puede llegar a hacer:
//   - no resuelve jurisdiccion (INV-3.3): un tramo sin cobertura queda sin
//     jurisdiccion, no se le asigna la vecina ni la mas cercana;
//   - no produce una restriccion (INV-1.2): el aviso sale por un campo propio,
//     nunca dentro de la lista de restricciones;
//   - no puede escalar por encima de U (INV-3.6): la bandera es una constante
//     de este modulo, no un calculo.
//
// LAS DOS CAUSAS DE INV-3.6, y la tercera que la medicion obligo a separar:
//   (a) jurisdiccion declarada sin geometria  -> aviso, causa del mundo
//   (b) hueco de la propia capa               -> aviso + defecto registrado
//   (b') hueco atribuible al recorte de la propia capa, pegado a jurisdiccion
//        que la ruta ya resolvio -> defecto registrado, SIN aviso. Ver la
//        justificacion medida en _bitacoras/fase5V_r1_2026-08-10.txt.
//
// LOS DOS ORIGENES DE LA CAUSA (a) — E0.2, 2026-08-11:
//   INV-3.6 define (a) como "una jurisdiccion [que] NO TIENE GEOMETRIA CARGADA".
//   Cargada es un hecho de LA BASE. Hasta E0.2 este modulo decidia (a)
//   preguntandole al INSUMO —participa_matching === false, o sea "el decreto no
//   permite construirla"—, que es otra cosa. Por ese desfase, una ruta en un
//   ambito que nunca se construyo salia clasificada (b), afirmando un defecto de
//   construccion sobre una capa que para ese ambito no existe.
//
//     origen 'jurisdiccion_no_cerrable'  el decreto no entrega con que cerrarla
//                                        -> lo declara zonas_aviso.json
//     origen 'ambito_no_publicado'       se puede construir y no se construyo
//                                        -> lo declara ambitos_publicados.json
//
//   Al patron se le dice LO MISMO en los dos: misma fila del §10, misma bandera
//   U topada. Lo que cambia es el registro interno, que es exactamente la
//   asimetria que INV-3.6 ya establece entre (a) y (b).
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const { cargarZonasAviso } = require('./zonas-aviso');
const {
  cargarAmbitosPublicados, ambitoQueReclama, contactosDeJurisdicciones,
} = require('./ambitos-publicados');

const RUTA_INSUMO    = path.join(__dirname, '..', '..', 'data', 'decreto', 'jurisdicciones_v2.json');
const RUTA_CONTACTOS = path.join(__dirname, '..', 'data', 'bahia-capitania-map.json');

const RUTA_CAPA = path.join(__dirname, '..', '..', 'data', 'decreto', 'capa_consultada.json');

// Tope duro de INV-3.6. No es un parametro ni el resultado de un calculo: es una
// constante, para que ninguna combinacion de datos pueda llevar el aviso a U+V.
const BANDERA_AVISO = 'U';

class ErrorCobertura extends Error {
  constructor(mensaje) { super(`[cobertura] ${mensaje}`); this.name = 'ErrorCobertura'; }
}
const exigir = (cond, m) => { if (!cond) throw new ErrorCobertura(m); };

// Identificadores de tabla: se comprueban contra el catalogo antes de
// interpolarlos, y la comprobacion se cachea por proceso.
let _capaVerificada = null;
async function capaDeclarada(pool) {
  if (_capaVerificada) return _capaVerificada;
  const decl = require(RUTA_CAPA);
  for (const campo of ['capa_jurisdicciones', 'capa_recorte_tierra']) {
    exigir(typeof decl[campo] === 'string' && decl[campo].trim(),
      `capa_consultada.json no declara '${campo}'.`);
  }
  for (const nombre of [decl.capa_jurisdicciones, decl.capa_recorte_tierra]) {
    const { rows } = await pool.query(
      `SELECT 1 FROM (
          SELECT tablename AS n FROM pg_tables   WHERE schemaname='public'
          UNION ALL
          SELECT matviewname FROM pg_matviews    WHERE schemaname='public') t
        WHERE n = $1`, [nombre]);
    exigir(rows.length === 1,
      `la capa '${nombre}' declarada en capa_consultada.json no existe en el esquema public. ` +
      `El aviso de cobertura no corre contra una capa que no esta: se detiene en vez de callar.`);
    const { rows: cols } = await pool.query(
      `SELECT 1 FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname='public' AND c.relname=$1 AND a.attname='geom' AND a.attnum > 0`, [nombre]);
    exigir(cols.length === 1, `la capa '${nombre}' no tiene columna 'geom'.`);
  }
  _capaVerificada = decl;
  return decl;
}

// Una sola consulta. Devuelve los trozos de ruta que no caen en ninguna
// jurisdiccion, cada uno con los dos hechos que deciden si se muestra:
//   dentro_del_recorte  el trozo ENTERO cae dentro de la capa de tierra con que
//                       se recorto la jurisdiccion — o sea, es un desacuerdo
//                       entre dos lineas de costa, no un hueco de jurisdiccion;
//   pegada_a_cobertura  al menos un extremo del trozo NO es un extremo de la
//                       ruta, y por lo tanto es un corte contra una jurisdiccion
//                       que la ruta SI resolvio y SI muestra.
//
// "Entero dentro" se MIDE en metros fuera, no se pregunta con ST_CoveredBy: ese
// predicado devolvio falso en 26 de 36 trozos cuya longitud fuera del recorte
// era de nanometros (medicion del 2026-08-10, 03_medicion_criterio_C.txt). Se
// sigue calculando el predicado, pero solo como diagnostico: que la medida y el
// predicado discrepen es un dato que conviene tener a la vista, no esconder.
const SQL = (capaJur, capaTierra) => `
WITH ruta AS (
  SELECT ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) AS g
), cob AS (
  SELECT ST_Union(c.geom) AS g FROM "${capaJur}" c, ruta r WHERE ST_Intersects(c.geom, r.g)
), tierra AS (
  SELECT ST_Union(l.geom) AS g FROM "${capaTierra}" l, ruta r WHERE ST_Intersects(l.geom, r.g)
), piezas AS (
  SELECT (ST_Dump(
            ST_Difference(r.g, COALESCE(c.g, ST_GeomFromText('POLYGON EMPTY', 4326)))
          )).geom AS g,
         r.g AS ruta
    FROM ruta r LEFT JOIN cob c ON true
)
SELECT
  ST_Length(p.g::geography)/1000.0                                     AS largo_km,
  ST_Y(ST_StartPoint(p.g))                                             AS lat_ini,
  ST_X(ST_StartPoint(p.g))                                             AS lon_ini,
  ST_Y(ST_EndPoint(p.g))                                               AS lat_fin,
  ST_X(ST_EndPoint(p.g))                                               AS lon_fin,
  CASE WHEN t.g IS NULL THEN ST_Length(p.g::geography)
       ELSE ST_Length(ST_Difference(p.g, t.g)::geography) END          AS fuera_del_recorte_m,
  COALESCE(ST_CoveredBy(p.g, t.g), false)                              AS predicado_coveredby,
  NOT (ST_Equals(ST_StartPoint(p.g), ST_StartPoint(p.ruta))
       AND ST_Equals(ST_EndPoint(p.g), ST_EndPoint(p.ruta)))           AS pegada_a_cobertura,
  (SELECT ST_Length(g::geography)/1000.0 FROM ruta)                    AS largo_ruta_km
FROM piezas p LEFT JOIN tierra t ON true
ORDER BY largo_km DESC;
`;

/**
 * Mide la cobertura de una ruta contra la capa declarada y clasifica cada
 * trozo descubierto. No arma mensajes: eso es responsabilidad de avisosDeRuta.
 */
async function medirCoberturaRuta(pool, waypoints) {
  exigir(Array.isArray(waypoints) && waypoints.length >= 2,
    'se requieren al menos 2 waypoints para medir cobertura.');
  const decl = await capaDeclarada(pool);
  const geojson = JSON.stringify({
    type: 'LineString',
    coordinates: waypoints.map(w => [w.lng, w.lat]),
  });
  const { rows } = await pool.query(SQL(decl.capa_jurisdicciones, decl.capa_recorte_tierra), [geojson]);

  const tolerancia = decl.tolerancia_fuera_del_recorte_m;
  exigir(Number.isFinite(tolerancia) && tolerancia >= 0,
    `capa_consultada.json no declara 'tolerancia_fuera_del_recorte_m' como numero. ` +
    `Sin ella no se puede decidir si un trozo cae entero dentro del recorte, y no se supone una.`);

  const piezas = rows.map(r => {
    const fueraM = Number(r.fuera_del_recorte_m);
    const largoKm = Number(r.largo_km);
    const dentro = fueraM <= tolerancia;
    const pegada = r.pegada_a_cobertura === true;
    return {
      largo_km: largoKm,
      lat_ini: Number(r.lat_ini), lon_ini: Number(r.lon_ini),
      lat_fin: Number(r.lat_fin), lon_fin: Number(r.lon_fin),
      dentro_del_recorte: dentro,
      fuera_del_recorte_m: fueraM,
      fraccion_en_recorte: largoKm > 0 ? 1 - (fueraM / (largoKm * 1000)) : 1,
      predicado_coveredby: r.predicado_coveredby === true,
      pegada_a_cobertura: pegada,
      // La regla, en una linea y en un solo lugar.
      clasificacion: (dentro && pegada) ? 'defecto_recorte' : 'aviso',
    };
  });

  return {
    capa: decl.capa_jurisdicciones,
    capa_recorte: decl.capa_recorte_tierra,
    tolerancia_m: tolerancia,
    largo_ruta_km: rows.length ? Number(rows[0].largo_ruta_km) : null,
    piezas,
  };
}

/**
 * Convierte los trozos clasificados como aviso en avisos para el patron, y los
 * silenciados en defectos registrados. Es la unica funcion que arma texto, y
 * el texto lo transcribe de la declaracion, que a su vez lo transcribe del §10.
 */
async function componerAvisos(medicion, pool) {
  const { mensaje, contacto_generico, zonas_con_ambito } = cargarZonasAviso();
  // El registro de ambitos se valida al cargarse, contra el insumo Y contra la
  // base. Si la declaracion y la base dejaron de coincidir, esto lanza y el
  // aviso no se compone: no se degrada a "no hay nada que avisar" (§4.1).
  const registroAmbitos = await cargarAmbitosPublicados(pool);
  const insumo = require(RUTA_INSUMO);
  const contactos = require(RUTA_CONTACTOS);

  const avisos = [];
  const defectos = [];
  let orden = 1;

  for (const p of medicion.piezas) {
    if (p.clasificacion === 'defecto_recorte') {
      defectos.push({
        tipo: 'hueco_atribuible_al_recorte',
        largo_km: +p.largo_km.toFixed(4),
        lat_ini: p.lat_ini, lon_ini: p.lon_ini, lat_fin: p.lat_fin, lon_fin: p.lon_fin,
        detalle: `El trozo cae entero dentro de '${medicion.capa_recorte}', la capa de tierra con que se ` +
                 `recorto '${medicion.capa}', y esta pegado a jurisdiccion que la ruta si resolvio. ` +
                 `Es un desacuerdo entre dos lineas de costa, no un hueco de jurisdiccion.`,
      });
      continue;
    }

    // Causa (a), primer origen: una zona de aviso DECLARADA reclama el trozo.
    // Hoy ninguna declara ambito, asi que ninguna reclama: no se adivina.
    const reclamantes = zonas_con_ambito.filter(z => zonaReclama(z, p));

    // Causa (a), segundo origen: el trozo cae en un ambito que no se publico.
    // Se pregunta SOLO si ninguna zona declarada lo reclamo — una zona nombra
    // una jurisdiccion concreta y un ambito nombra un conjunto, asi que la
    // declaracion mas especifica manda.
    const reclamoAmbito = reclamantes.length > 0
      ? null
      : await ambitoQueReclama(pool, registroAmbitos, p);

    let causa, origen, jurisdiccionesProbables, capitanias, ambito;
    if (reclamantes.length > 0) {
      causa = 'jurisdiccion_sin_geometria';
      origen = 'jurisdiccion_no_cerrable';
      jurisdiccionesProbables = reclamantes.map(z => z.nombre);
      ambito = null;
      capitanias = reclamantes
        .filter(z => z.contacto.tipo !== 'sin_contacto')
        .map(z => ({ nombre: z.contacto.nombre, telefono: z.contacto.telefono, tipo: z.contacto.tipo }));
    } else if (reclamoAmbito) {
      causa = 'jurisdiccion_sin_geometria';
      origen = 'ambito_no_publicado';
      jurisdiccionesProbables = reclamoAmbito.ids;
      ambito = reclamoAmbito.ambito;
      capitanias = contactosDeJurisdicciones(reclamoAmbito.ids, insumo, contactos);
    } else {
      causa = 'hueco_de_capa';
      origen = 'hueco_de_capa';
      jurisdiccionesProbables = [];
      ambito = null;
      capitanias = [];
    }

    const capa2 = capitanias.length === 1
      ? mensaje.capa_2_con_capitania
          .replace('{nombre}', capitanias[0].nombre)
          .replace('{telefono}', capitanias[0].telefono)
      : mensaje.capa_2_sin_capitania;

    avisos.push({
      orden_en_ruta: orden++,
      causa,
      // Cual de los dos origenes de la causa (a). Para (b) repite la causa: no
      // hay caso por defecto ni campo vacio que haya que interpretar.
      origen,
      // El ambito que reclamo el trozo, cuando lo reclamo uno. Es dato interno:
      // al patron se le dice lo mismo en los tres casos.
      ambito_no_publicado: ambito,
      // Tope duro de INV-3.6: constante, no calculo.
      bandera: BANDERA_AVISO,
      largo_km: +p.largo_km.toFixed(4),
      lat_ini: p.lat_ini, lon_ini: p.lon_ini, lat_fin: p.lat_fin, lon_fin: p.lon_fin,
      jurisdicciones_probables: jurisdiccionesProbables,
      capitanias,
      contacto_generico: capitanias.length === 1 ? null : contacto_generico,
      capa_1: mensaje.capa_1,
      capa_2: capa2,
      es_restriccion: false,
    });

    // INV-3.6: el hueco de la propia capa se registra como defecto ADEMAS de
    // mostrarse. Mostrarlo no lo convierte en estado del mundo.
    //
    // Un ambito no publicado NO entra aca, y ese es el arreglo de E0.2: es
    // causa (a), estado del mundo, no un defecto de construccion nuestro.
    // Antes de E0.2, 21,82 km lacustres y 47,57 km antarticos medidos se
    // registraban como defectos de construccion de una capa que para esos
    // ambitos no existe. Su trazabilidad vive en ambitos_publicados.json y en
    // el campo 'origen' del aviso, no en esta lista.
    if (causa === 'hueco_de_capa') {
      defectos.push({
        tipo: 'hueco_de_capa',
        largo_km: +p.largo_km.toFixed(4),
        lat_ini: p.lat_ini, lon_ini: p.lon_ini, lat_fin: p.lat_fin, lon_fin: p.lon_fin,
        detalle: `Ninguna jurisdiccion de '${medicion.capa}' reclama este trozo y ninguna zona de aviso ` +
                 `declarada lo cubre. Se muestra al patron y queda registrado como defecto de construccion.`,
      });
    }
  }

  return { avisos, defectos, bandera_cobertura: avisos.length > 0 ? BANDERA_AVISO : 'Q' };
}

// Un ambito declarado reclama un trozo. Hoy el unico tipo es banda_latitud; el
// tipo desconocido ya lo rechaza el validador al cargar, no hay caso por defecto.
function zonaReclama(zona, pieza) {
  const a = zona.ambito;
  if (a.tipo === 'banda_latitud') {
    const dentro = lat => lat <= a.lat_norte && lat >= a.lat_sur;
    return dentro(pieza.lat_ini) || dentro(pieza.lat_fin);
  }
  throw new ErrorCobertura(
    `ambito '${a.tipo}' cargado pero sin regla de reclamo escrita en cobertura-jurisdiccional.js.`);
}

/**
 * Nombre validado de la capa que el motor consulta. Existe para que el matching
 * de restricciones y la medicion de cobertura no puedan apuntar a capas
 * distintas: si lo hicieran, el aviso hablaria de una capa y la lista de
 * restricciones de otra.
 */
async function capaJurisdiccionesVigente(pool) {
  return (await capaDeclarada(pool)).capa_jurisdicciones;
}

module.exports = {
  medirCoberturaRuta,
  componerAvisos,
  capaJurisdiccionesVigente,
  BANDERA_AVISO,
  ErrorCobertura,
};
