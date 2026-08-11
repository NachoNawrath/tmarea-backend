'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// ambitos-publicados.js — carga y VALIDA el registro de ambitos publicados.
//
// CONTRATO_MOTOR.md INV-3.6: una jurisdiccion sin geometria cargada se declara,
// nunca se resuelve en silencio. Un ambito entero que no se construyo es
// exactamente eso — jurisdicciones sin geometria cargada — y hasta hoy salia
// clasificado como (b) hueco de la propia capa, que el contrato define como
// "un defecto de construccion nuestro" sobre "una zona que ninguna jurisdiccion
// reclama". Las dos mitades son falsas para un lago.
//
// HERMANO DE zonas-aviso.js EN MECANICA, NO EN ARCHIVO. Mismo patron: la
// validacion vive ADENTRO de la carga, no hay forma de consumir la declaracion
// sin que se haya comprobado, cualquier incoherencia LANZA con su motivo y no
// hay caso por defecto. Archivo aparte porque zonas_aviso.json exige
// participa_matching === false y las 6 lacustres son true: meterlas ahi
// obligaria a aflojar el control que le da valor (CLAUDE.md §0.3).
//
// EL RETIRO ES AUTOMATICO Y EN LAS DOS DIRECCIONES:
//   publicado=false + la base SI tiene el ambito  -> se detiene, hay que retirar
//   publicado=true  + la base NO tiene el ambito  -> se detiene, mentia
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const { normalizarTexto } = require('../utils/normalizarTexto');

const RUTA_DECLARACION = path.join(__dirname, '..', '..', 'data', 'decreto', 'ambitos_publicados.json');
const RUTA_INSUMO      = path.join(__dirname, '..', '..', 'data', 'decreto', 'jurisdicciones_v2.json');
const RUTA_CAPA        = path.join(__dirname, '..', '..', 'data', 'decreto', 'capa_consultada.json');
const RUTA_CONTACTOS   = path.join(__dirname, '..', 'data', 'bahia-capitania-map.json');

// Identificador SQL seguro. Se exige antes de interpolar cualquier nombre de
// relacion o de columna que venga de la declaracion.
const IDENT = /^[a-z_][a-z0-9_]*$/;

class ErrorAmbitos extends Error {
  constructor(mensaje) { super(`[ambitos_publicados] ${mensaje}`); this.name = 'ErrorAmbitos'; }
}
const exigir = (cond, m) => { if (!cond) throw new ErrorAmbitos(m); };
const textoNoVacio = (v) => typeof v === 'string' && v.trim().length > 0;
const mismoNombre = (a, b) => normalizarTexto(a || '') === normalizarTexto(b || '') && normalizarTexto(a || '') !== '';

// ─── Validacion pura: la declaracion contra el insumo ───────────────────────
/**
 * Controles C1, C2, C5, C6(forma) y C7. Funcion pura sobre los tres objetos,
 * para que la prueba de mordida la ejerza con variantes en memoria sin copiar
 * ninguna regla al test.
 */
function validarDeclaracion(decl, insumo, capaConsultada) {
  exigir(decl && Array.isArray(decl.ambitos), 'la declaracion no trae un arreglo "ambitos".');
  exigir(textoNoVacio(decl.capa_publicada),
    'la declaracion no trae "capa_publicada": sin ella no se puede decidir si un ambito esta o no, y no se supone una.');
  exigir(IDENT.test(decl.capa_publicada),
    `"capa_publicada" no es un identificador valido: '${decl.capa_publicada}'.`);

  // C7 — la capa publicada NO puede ser la capa provisoria que el motor consulta.
  // Si lo fuera, los cuatro ambitos se leerian como publicados y el registro
  // mentiria desde el primer dia.
  exigir(decl.capa_publicada !== capaConsultada.capa_jurisdicciones,
    `C7: "capa_publicada" apunta a '${decl.capa_publicada}', que es la MISMA capa que capa_consultada.json ` +
    `declara como la capa que el motor consulta hoy. Esa capa resuelve por teselado y el contrato la marca ` +
    `contradictoria con INV-3.3 (§7 bug 4): tomarla como capa publicada haria que todos los ambitos se ` +
    `leyeran como publicados. El registro perderia su unico proposito.`);

  const ambitosDelInsumo = new Set(insumo.jurisdicciones.map(j => j.ambito));
  const cuentaPorAmbito = {};
  for (const j of insumo.jurisdicciones) cuentaPorAmbito[j.ambito] = (cuentaPorAmbito[j.ambito] || 0) + 1;

  const vistos = new Set();
  const entradas = [];

  for (const e of decl.ambitos) {
    exigir(textoNoVacio(e.ambito), 'hay una entrada sin "ambito".');
    exigir(!vistos.has(e.ambito), `el ambito '${e.ambito}' esta declarado mas de una vez.`);
    vistos.add(e.ambito);

    // C2 — sobra: una entrada que no corresponde a ningun ambito del insumo.
    exigir(ambitosDelInsumo.has(e.ambito),
      `C2: el registro declara el ambito '${e.ambito}', que no existe en el insumo. ` +
      `Ambitos del insumo: ${[...ambitosDelInsumo].sort().join(', ')}. Un ambito declarado que no existe ` +
      `produce un aviso que nunca se puede retirar, porque su causa no puede desaparecer.`);

    exigir(typeof e.publicado === 'boolean',
      `ambito '${e.ambito}': "publicado" tiene que ser booleano, no ${typeof e.publicado}.`);

    // C5 — no publicado exige causa escrita.
    if (e.publicado === false) {
      exigir(textoNoVacio(e.causa),
        `C5: el ambito '${e.ambito}' esta declarado no publicado y no trae "causa" escrita. ` +
        `Un ambito ausente sin causa es exactamente el silencio que este registro existe para terminar.`);
    }

    exigir(Number.isInteger(e.jurisdicciones_esperadas),
      `ambito '${e.ambito}': falta "jurisdicciones_esperadas" entero.`);
    exigir(e.jurisdicciones_esperadas === cuentaPorAmbito[e.ambito],
      `ambito '${e.ambito}': declara ${e.jurisdicciones_esperadas} jurisdicciones esperadas y el insumo tiene ` +
      `${cuentaPorAmbito[e.ambito]}. El registro y el insumo dejaron de coincidir.`);

    entradas.push({ ...e, geografia_de_reclamo: validarGeografia(e) });
  }

  // C1 — falta: un ambito del insumo sin entrada en el registro.
  const faltantes = [...ambitosDelInsumo].filter(a => !vistos.has(a)).sort();
  exigir(faltantes.length === 0,
    `C1: hay ambitos en el insumo sin entrada en el registro: ${faltantes.join(', ')}. ` +
    `Sin su declaracion, una ruta que caiga ahi vuelve a ser indistinguible de una ruta sin restricciones (INV-3.6).`);

  return {
    version: decl.version,
    capa_publicada: decl.capa_publicada,
    ambitos: entradas,
    no_publicados: entradas.filter(e => e.publicado === false),
    // Solo los que pueden reclamar un trozo de ruta. Un ambito con geografia
    // nula queda registrado y no reclama: no se adivina.
    con_geografia: entradas.filter(e => e.publicado === false && e.geografia_de_reclamo !== null),
  };
}

// C6 (forma) — la geografia de reclamo, o su ausencia declarada con motivo.
function validarGeografia(e) {
  const g = e.geografia_de_reclamo;
  if (g === null || g === undefined) {
    exigir(textoNoVacio(e.motivo_sin_geografia_de_reclamo),
      `C6: el ambito '${e.ambito}' no declara geografia de reclamo y no escribe ` +
      `"motivo_sin_geografia_de_reclamo". La ausencia es un estado legitimo (CLAUDE.md §4.2) pero hay que declararla.`);
    return null;
  }
  exigir(textoNoVacio(g.relacion) && IDENT.test(g.relacion),
    `C6: ambito '${e.ambito}': "geografia_de_reclamo.relacion" ausente o no es un identificador valido.`);
  exigir(textoNoVacio(g.columna_ambito) && IDENT.test(g.columna_ambito),
    `C6: ambito '${e.ambito}': "geografia_de_reclamo.columna_ambito" ausente o no es un identificador valido.`);
  exigir(g.no_resuelve_jurisdiccion === true,
    `C6: ambito '${e.ambito}': la geografia de reclamo debe declarar "no_resuelve_jurisdiccion": true. ` +
    `Sirve para decidir que aviso corresponde, nunca para adjudicar una Capitania a un punto (INV-3.3).`);
  exigir(textoNoVacio(g.procedencia),
    `C6: ambito '${e.ambito}': la geografia de reclamo exige "procedencia" — de donde sale esa geometria.`);
  return { relacion: g.relacion, columna_ambito: g.columna_ambito, procedencia: g.procedencia };
}

// ─── Verificacion contra la base: C3, C4 y C6(existencia) ───────────────────
async function relacionExiste(pool, nombre) {
  const { rows } = await pool.query(
    `SELECT 1 FROM (
        SELECT tablename AS n FROM pg_tables WHERE schemaname='public'
        UNION ALL
        SELECT matviewname FROM pg_matviews WHERE schemaname='public') t
      WHERE n = $1`, [nombre]);
  return rows.length === 1;
}

async function tieneColumna(pool, relacion, columna) {
  const { rows } = await pool.query(
    `SELECT 1 FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname=$1 AND a.attname=$2 AND a.attnum > 0`,
    [relacion, columna]);
  return rows.length === 1;
}

/**
 * Cuenta, por ambito, cuantas geometrias NO vacias tiene la capa publicada.
 * Si la capa no existe, ningun ambito esta publicado — que es el estado de hoy.
 */
async function medirCapaPublicada(pool, capa) {
  if (!(await relacionExiste(pool, capa))) return { existe: false, porAmbito: new Map() };
  exigir(await tieneColumna(pool, capa, 'ambito'),
    `la capa publicada '${capa}' existe pero no tiene columna 'ambito'. Sin ella no se puede decidir ` +
    `que ambito esta publicado, y el registro no supone nada.`);
  exigir(await tieneColumna(pool, capa, 'geom'), `la capa publicada '${capa}' no tiene columna 'geom'.`);
  const { rows } = await pool.query(
    `SELECT ambito, count(*) FILTER (WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom))::int AS con_geom
       FROM "${capa}" GROUP BY ambito`);
  return { existe: true, porAmbito: new Map(rows.map(r => [r.ambito, r.con_geom])) };
}

async function verificarContraBase(pool, validada) {
  const estado = await medirCapaPublicada(pool, validada.capa_publicada);

  for (const e of validada.ambitos) {
    const enLaBase = estado.porAmbito.get(e.ambito) || 0;

    // C3 — RETIRO AUTOMATICO. Declarado no publicado y la base SI lo tiene.
    if (e.publicado === false) {
      exigir(enLaBase === 0,
        `C3: el ambito '${e.ambito}' esta declarado NO publicado y la capa '${validada.capa_publicada}' ya tiene ` +
        `${enLaBase} jurisdiccion(es) suyas con geometria. El ambito paso sus controles y se publico: esta entrada ` +
        `perdio la carencia que la justificaba y debe retirarse de ambitos_publicados.json. ` +
        `El aviso no puede sobrevivir a su causa.`);
    }

    // C4 — la direccion contraria. Declarado publicado y la base NO lo tiene.
    if (e.publicado === true) {
      exigir(enLaBase > 0,
        `C4: el ambito '${e.ambito}' esta declarado PUBLICADO y la capa '${validada.capa_publicada}' ` +
        `${estado.existe ? `no tiene ninguna jurisdiccion suya con geometria` : `ni siquiera existe`}. ` +
        `El registro estaria afirmando una cobertura que no hay, que es el falso negativo silencioso ` +
        `que INV-3.6 persigue.`);
      exigir(enLaBase === e.jurisdicciones_esperadas,
        `C4: el ambito '${e.ambito}' esta declarado PUBLICADO con ${enLaBase} de ${e.jurisdicciones_esperadas} ` +
        `jurisdicciones construidas. D3 exige que cada ambito publicado este COMPLETO y auditado: nada se ` +
        `promueve a medias dentro de su propio ambito.`);
    }
  }

  // C6 (existencia) — la geografia de reclamo tiene que estar en la base.
  for (const e of validada.con_geografia) {
    const g = e.geografia_de_reclamo;
    exigir(await relacionExiste(pool, g.relacion),
      `C6: el ambito '${e.ambito}' declara su geografia de reclamo en '${g.relacion}', que no existe en el ` +
      `esquema public. El aviso no corre contra una relacion que no esta: se detiene en vez de callar.`);
    exigir(await tieneColumna(pool, g.relacion, g.columna_ambito),
      `C6: la relacion '${g.relacion}' no tiene columna '${g.columna_ambito}'.`);
    exigir(await tieneColumna(pool, g.relacion, 'geom'),
      `C6: la relacion '${g.relacion}' no tiene columna 'geom'.`);
  }

  return validada;
}

// ─── Reclamo de un trozo, y C8 ──────────────────────────────────────────────
/**
 * Que ambito NO PUBLICADO reclama este trozo de ruta, y con que jurisdicciones.
 * Devuelve null si ninguno: ahi el trozo es de verdad un hueco de nuestra capa
 * y sigue siendo la causa (b) de INV-3.6.
 *
 * C8 vive aca: si dos ambitos reclaman el mismo trozo, la causa seria ambigua.
 * Medido el 2026-08-11 sobre 8 rutas reales mas una lacustre y una antartica:
 * 0 trozos ambiguos. El control existe para que siga siendo 0.
 */
async function ambitoQueReclama(pool, validada, pieza) {
  const porRelacion = new Map();
  for (const e of validada.con_geografia) {
    const k = `${e.geografia_de_reclamo.relacion}|${e.geografia_de_reclamo.columna_ambito}`;
    if (!porRelacion.has(k)) porRelacion.set(k, []);
    porRelacion.get(k).push(e);
  }

  const reclamos = [];
  for (const [k, entradas] of porRelacion) {
    const [relacion, columna] = k.split('|');
    const { rows } = await pool.query(
      `WITH trozo AS (
         SELECT ST_SetSRID(ST_MakeLine(ST_MakePoint($2,$1), ST_MakePoint($4,$3)), 4326) AS g
       )
       SELECT r."${columna}" AS ambito,
              ST_Length(ST_Intersection(ST_Union(r.geom), t.g)::geography) AS m,
              array_agg(DISTINCT r.id) AS ids
         FROM "${relacion}" r, trozo t
        WHERE r.geom IS NOT NULL AND r."${columna}" = ANY($5) AND ST_Intersects(r.geom, t.g)
        GROUP BY r."${columna}", t.g`,
      [pieza.lat_ini, pieza.lon_ini, pieza.lat_fin, pieza.lon_fin, entradas.map(e => e.ambito)]);
    for (const row of rows) {
      if (Number(row.m) > 0) reclamos.push({ ambito: row.ambito, metros: Number(row.m), ids: row.ids });
    }
  }

  if (reclamos.length === 0) return null;

  // C8 — sin caso por defecto: no se elige el que mas reclama, se detiene.
  exigir(reclamos.length === 1,
    `C8: el trozo (${pieza.lat_ini},${pieza.lon_ini}) -> (${pieza.lat_fin},${pieza.lon_fin}) es reclamado por ` +
    `${reclamos.length} ambitos no publicados a la vez: ${reclamos.map(r => `${r.ambito} (${Math.round(r.metros)} m)`).join(', ')}. ` +
    `La causa del aviso seria ambigua. Elegir el que mas metros reclama seria un caso por defecto silencioso ` +
    `(CLAUDE.md §4.2): los ambitos del decreto no se solapan, asi que esto es un defecto del dato o de la ` +
    `geografia de reclamo y hay que mirarlo.`);

  return reclamos[0];
}

/**
 * Contactos nombrables para las jurisdicciones que reclamaron el trozo. Misma
 * regla que zonas-aviso.js: el nombre de la Capitania del decreto tiene que
 * coincidir con el que el mapa operativo atribuye; si no coincide, no se usa
 * (INV-3.3 — el mapa operativo no revoca al decreto).
 *
 * DUPLICACION DECLARADA: la regla de coincidencia esta tambien en
 * zonas-aviso.js:93-101. Ahi resuelve una zona declarada con su bahia escrita a
 * mano; aca resuelve una jurisdiccion que salio de una consulta geografica. Se
 * unifican en E0.3, que es la etapa que toca el join bahia -> Capitania.
 */
function contactosDeJurisdicciones(ids, insumo, contactos) {
  const porId = new Map(insumo.jurisdicciones.map(j => [j.id, j]));
  const salida = [];
  for (const id of ids) {
    const jur = porId.get(id);
    if (!jur) continue;
    for (const [bahiaId, e] of Object.entries(contactos)) {
      if (e.capitania && mismoNombre(e.capitania, jur.nombre) && textoNoVacio(e.telefono)) {
        salida.push({ jurisdiccion_id: id, nombre: e.capitania, telefono: e.telefono, tipo: 'capitania', bahia_id: Number(bahiaId) });
        break;
      }
    }
  }
  return salida;
}

let _cache = null;

/**
 * Carga el registro, lo valida contra el insumo y contra la base, y lo devuelve.
 * Lanza ErrorAmbitos ante cualquier incoherencia.
 */
async function cargarAmbitosPublicados(pool, { recargar = false } = {}) {
  if (_cache && !recargar) return _cache;
  if (recargar) {
    for (const r of [RUTA_DECLARACION, RUTA_INSUMO, RUTA_CAPA, RUTA_CONTACTOS]) delete require.cache[require.resolve(r)];
    _cache = null;
  }
  const validada = validarDeclaracion(require(RUTA_DECLARACION), require(RUTA_INSUMO), require(RUTA_CAPA));
  _cache = await verificarContraBase(pool, validada);
  return _cache;
}

module.exports = {
  cargarAmbitosPublicados,
  validarDeclaracion,
  verificarContraBase,
  ambitoQueReclama,
  contactosDeJurisdicciones,
  ErrorAmbitos,
};
