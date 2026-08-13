'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e3_prueba_mordida_cableado.js — PRUEBA DE MORDIDA del cableado de E3.
//
// CLAUDE.md §4.6: un control que no puede fallar no prueba nada. Cada caso de
// la PARTE A inyecta el defecto que el control debe cazar y confirma que lo
// caza, con su mensaje. Y los controles negativos confirman que la declaracion
// REAL, sin alterar, pasa.
//
// LA PARTE B PRUEBA LAS DOS DIRECCIONES DEL CABLEADO SOBRE LA BASE:
//   (1) lo lacustre ENTRA  — una ruta en el Lago Llanquihue devuelve las bahias
//       de su Capitania, que hoy no devuelve ninguna;
//   (2) ninguna maritima SALE — la misma ruta maritima devuelve exactamente las
//       mismas bahias con el cableado puesto, y el ensanche le agrega CERO.
//
// CONTRA EL ENSAYO, NO CONTRA LA CAPA: `jurisdicciones_ds991` NO EXISTE —se
// aplica en el paso 5 de E3, y por eso este paso se escribe sin aplicar. El
// ensayo la materializa dentro de una TRANSACCION QUE SE DESHACE, tomando la
// geometria de `jurisdicciones_decreto`, que es la misma de la que sale hoy la
// geografia de reclamo de ambitos_publicados.json. Al terminar, `ROLLBACK`: la
// base queda como estaba y se comprueba que la capa sigue sin existir.
//
// QUE PRUEBA ESTE ENSAYO Y QUE NO. Prueba el CABLEADO —que la ruta llega a la
// jurisdiccion, que el join la expande a bahias, que el filtro por ambito
// muerde y que la cobertura deja de ver un hueco—. NO prueba la geometria
// definitiva: la del ensayo sale del andamio, y la real la construye el build
// del paso 5. Esa medicion es el paso 6 y esta escrita en el plan como tal.
//
// El ensayo mete a proposito las 44 jurisdicciones MARITIMAS con geometria
// ademas de las 6 lacustres. Sin ellas, "el ensanche no agrega nada a una ruta
// maritima" podria pasar porque la consulta esta rota, no porque el filtro por
// ambito funcione. Con ellas, el caso B4 lo distingue.
//
// SHELL: agente en Git Bash sobre Windows. Para el owner, en PowerShell:
//     cd C:\Users\katia\tmarea-backend
//     node scripts\e3_prueba_mordida_cableado.js
//
// salida 0 = todos los casos muerden y los controles negativos pasan.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { Pool } = require('pg');

const {
  ensancheDeclarado, verificarEnsancheEnLaBase, bahiasDelEnsanche,
  verificarCableadoEnArranque, sqlCobertura,
} = require('../src/services/cobertura-jurisdiccional');
const { validarDeclaracion } = require('../src/services/ambitos-publicados');
const { cargarJoin } = require('../src/services/join-bahia-jurisdiccion');
const { capitaniaDeBahia } = require('../src/services/capitania-de-bahia');

const CAPA_REAL   = require('../data/decreto/capa_consultada.json');
const DECL_REAL   = require('../data/decreto/ambitos_publicados.json');
const INSUMO_REAL = require('../data/decreto/jurisdicciones_v2.json');
const MAPA_REAL   = require('../src/data/bahia-capitania-map.json');

const clonar = (o) => JSON.parse(JSON.stringify(o));
const BLOQUE = 'capa_publicada_por_ambito';

// El registro real, validado, tal como esta HOY.
const REGISTRO_HOY = validarDeclaracion(DECL_REAL, INSUMO_REAL, CAPA_REAL);

// El registro SIN NINGUN AMBITO PUBLICADO. Hasta el 2026-08-13 este escenario
// era el estado real y se usaba REGISTRO_HOY para representarlo; ese dia E3
// publico el lacustre y el caso A3 —"cableado activo y ningun ambito publicado
// se detiene"— dejo de morder, porque su premisa habia dejado de ser cierta
// sola. El escenario se CONSTRUYE en vez de tomarse prestado del estado del dia.
function registroSinNingunAmbitoPublicado() {
  const d = clonar(DECL_REAL);
  for (const a of d.ambitos) {
    a.publicado = false;
    if (!a.causa) a.causa = 'inyectada por la mordida: C5 exige causa a un ambito no publicado';
  }
  return validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
}

// El registro con el lacustre publicado. Desde el paso 5 esto ES el estado real,
// y la funcion se conserva porque construir el escenario en vez de heredarlo es
// lo que evita que un caso mida el calendario en lugar de la regla.
function registroConLacustrePublicado() {
  const d = clonar(DECL_REAL);
  d.ambitos.find(a => a.ambito === 'lacustre').publicado = true;
  return validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
}

// La declaracion de capa con el cableado APAGADO, se llame como se llame el
// estado del archivo real ese dia.
function capaSinCableado() {
  const c = clonar(CAPA_REAL);
  c[BLOQUE] = { ...c[BLOQUE], consultada: false };
  return c;
}

// La declaracion de capa con el cableado activado, sobre el archivo REAL.
function capaConCableado(cambios = {}) {
  const c = clonar(CAPA_REAL);
  c[BLOQUE] = { ...c[BLOQUE], consultada: true, ...cambios };
  return c;
}

// Pool falso para los casos que hablan del catalogo. Cualquier consulta no
// prevista revienta a proposito: si el modulo empieza a preguntar algo nuevo,
// la mordida se entera en vez de pasar por defecto.
function poolFalso({ relaciones = [], columnas = {} } = {}) {
  return {
    async query(sql, params) {
      if (sql.includes('pg_tables')) return { rows: relaciones.includes(params[0]) ? [{ n: params[0] }] : [] };
      if (sql.includes('pg_attribute')) {
        const cols = columnas[params[0]] || [];
        return { rows: cols.includes(params[1]) ? [{ ok: 1 }] : [] };
      }
      throw new Error(`el pool falso no preve esta consulta: ${sql.trim().slice(0, 70)}`);
    },
  };
}

// ─── Arnes de casos ─────────────────────────────────────────────────────────
const casos = [];
const caso = (grupo, nombre, fn) => casos.push({ grupo, nombre, fn });

/** Espera que `fn` lance, y que el mensaje contenga `fragmento`. */
async function muerde(fn, fragmento) {
  let e = null;
  try { await fn(); } catch (err) { e = err; }
  if (!e) throw new Error('NO MORDIO: se esperaba que se detuviera y no se detuvo.');
  if (!e.message.includes(fragmento)) {
    throw new Error(`mordio con otro motivo.\n    esperaba contener: ${fragmento}\n    dijo: ${e.message}`);
  }
  return e.message;
}

const igualdadDeConjuntos = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
const ordenado = (s) => [...s].sort((x, y) => x - y);

// ═════════════════════════════════════════════════════════════════════════════
// PARTE A — LAS REGLAS DEL CABLEADO. Sin base, o con pool falso.
// ═════════════════════════════════════════════════════════════════════════════

caso('A1', 'el bloque del cableado borrado del dato NO apaga el cableado en silencio', async () => {
  const c = clonar(CAPA_REAL);
  delete c[BLOQUE];
  await muerde(() => ensancheDeclarado(c, REGISTRO_HOY), `no trae el bloque '${BLOQUE}'`);
});

caso('A2', "'consultada' que no es booleano se detiene, no cae al lado permisivo", async () => {
  const c = clonar(CAPA_REAL);
  c[BLOQUE].consultada = 'true';
  await muerde(() => ensancheDeclarado(c, REGISTRO_HOY), "'consultada' tiene que ser booleano");
});

caso('A3', 'cableado activado y NINGUN ambito publicado: se detiene', async () => {
  await muerde(() => ensancheDeclarado(capaConCableado(), registroSinNingunAmbitoPublicado()),
    'no publica ningun ambito');
});

caso('A4', 'columna_ambito que no es identificador valido no se interpola', async () => {
  await muerde(
    () => ensancheDeclarado(capaConCableado({ columna_ambito: 'ambito"; DROP TABLE x; --' }),
      registroConLacustrePublicado()),
    "'columna_ambito' ausente o no es un identificador valido");
});

caso('A5', 'columna_jurisdiccion ausente se detiene', async () => {
  const c = capaConCableado();
  delete c[BLOQUE].columna_jurisdiccion;
  await muerde(() => ensancheDeclarado(c, registroConLacustrePublicado()),
    "'columna_jurisdiccion' ausente");
});

caso('A6', 'la capa publicada que no esta en el catalogo detiene la carga', async () => {
  const ens = ensancheDeclarado(capaConCableado(), registroConLacustrePublicado());
  await muerde(
    () => verificarEnsancheEnLaBase(poolFalso({ relaciones: ['bahia_jurisdicciones'] }), ens),
    `la capa '${ens.capa}' declarada en capa_consultada.json no existe`);
});

caso('A7', 'la capa publicada sin la columna declarada detiene la carga', async () => {
  const ens = ensancheDeclarado(capaConCableado(), registroConLacustrePublicado());
  await muerde(
    () => verificarEnsancheEnLaBase(poolFalso({
      relaciones: [ens.capa],
      columnas: { [ens.capa]: ['geom', 'id'] }, // le falta 'ambito'
    }), ens),
    `no tiene columna '${ens.columna_ambito}'`);
});

caso('A8', 'el SQL de cobertura sin ensanche no nombra la capa publicada', async () => {
  const sinEnsanche = sqlCobertura('bahia_jurisdicciones', 'ne_land', null);
  if (sinEnsanche.includes(DECL_REAL.capa_publicada)) {
    throw new Error('el SQL apagado nombra la capa publicada; el cableado no estaria apagado.');
  }
  const ens = ensancheDeclarado(capaConCableado(), registroConLacustrePublicado());
  const conEnsanche = sqlCobertura('bahia_jurisdicciones', 'ne_land', ens);
  for (const trozo of [`"${ens.capa}"`, `"${ens.columna_ambito}" = ANY($2)`, 'UNION ALL']) {
    if (!conEnsanche.includes(trozo)) throw new Error(`el SQL con ensanche no trae: ${trozo}`);
  }
});

// LAS BAHIAS DE `puerto_varas` SON CUATRO, NO TRES, y conviene tenerlo escrito:
// la 160 (LAGO PUYEHUE) tiene `jurisdiccion_id: lago_ranco` y trae
// `jurisdicciones_adicionales: [puerto_varas]`, porque el decreto parte el lago
// en el limite regional. Entra por la adicional, que es INV-3.4 —la restriccion
// de una Capitania aplica a toda su jurisdiccion, se muestra de mas y nunca de
// menos—. La primera version de esta prueba esperaba tres y el numero salio de
// contar `jurisdiccion_id`: la que estaba mal era la expectativa.
const BAHIAS_DE_PUERTO_VARAS = new Set([111, 159, 160, 161]);

caso('A9', 'el join expande la jurisdiccion a SUS bahias, y solo a esas', async () => {
  const join = cargarJoin();
  const varas = join.bahiasDeJurisdicciones(['puerto_varas']);
  if (!igualdadDeConjuntos(varas, BAHIAS_DE_PUERTO_VARAS)) {
    throw new Error(`puerto_varas devolvio ${ordenado(varas).join(',')}, se esperaba ` +
      ordenado(BAHIAS_DE_PUERTO_VARAS).join(','));
  }
  // Y que la 160 entre por la adicional, no por su jurisdiccion principal.
  if (join.jurisdiccionDe(160) !== 'lago_ranco') {
    throw new Error('la 160 dejo de tener lago_ranco como jurisdiccion principal: la propiedad que ' +
      'este caso fija —que una bahia entra por sus jurisdicciones ADICIONALES— ya no se esta probando.');
  }
  const nada = join.bahiasDeJurisdicciones([]);
  if (nada.size !== 0) throw new Error('un conjunto vacio de jurisdicciones devolvio bahias.');
  const inexistente = join.bahiasDeJurisdicciones(['jurisdiccion_que_no_existe']);
  if (inexistente.size !== 0) throw new Error('una jurisdiccion inexistente invento bahias.');
});

caso('A10', 'las 6 lacustres expanden a las 21 entradas del join (20 con coordenada)', async () => {
  const lacustres = INSUMO_REAL.jurisdicciones.filter(j => j.ambito === 'lacustre').map(j => j.id);
  const bahias = cargarJoin().bahiasDeJurisdicciones(lacustres);
  if (bahias.size !== 21) {
    throw new Error(`el ambito lacustre expandio a ${bahias.size} bahias, se dimensiono sobre 21: ` +
      ordenado(bahias).join(','));
  }
});

caso('A11', 'el NOMBRE sale del decreto en un ambito publicado, y el TELEFONO del mapa', async () => {
  // 159 (Lago Todos los Santos): el mapa la nombra "Puerto Montt", una Capitania
  // MARITIMA; el decreto la cuelga de `puerto_varas`.
  const hoy = capitaniaDeBahia(159, []);
  if (hoy.capitania !== MAPA_REAL['159'].capitania || hoy.capitania_fuente !== 'mapa_operativo') {
    throw new Error(`sin ambitos publicados el contacto tiene que ser el de hoy; dio ${JSON.stringify(hoy)}`);
  }
  const cableado = capitaniaDeBahia(159, ['lacustre']);
  if (cableado.capitania !== 'Puerto Varas' || cableado.capitania_fuente !== 'decreto') {
    throw new Error(`con lacustre publicado el nombre tiene que salir del decreto; dio ${JSON.stringify(cableado)}`);
  }
  if (cableado.telefono !== hoy.telefono) {
    throw new Error(`el telefono tiene que seguir saliendo del mapa (CONTRATO_MOTOR.md §5): ` +
      `${hoy.telefono} -> ${cableado.telefono}`);
  }
});

caso('A12', 'una bahia MARITIMA no cambia de nombre porque se publique el lacustre', async () => {
  const join = cargarJoin();
  const maritimas = INSUMO_REAL.jurisdicciones.filter(j => j.ambito === 'maritima').map(j => j.id);
  const unaMaritima = ordenado(join.bahiasDeJurisdicciones(maritimas))[0];
  const hoy = capitaniaDeBahia(unaMaritima, []);
  const conCableado = capitaniaDeBahia(unaMaritima, ['lacustre']);
  if (JSON.stringify(hoy) !== JSON.stringify(conCableado)) {
    throw new Error(`la bahia maritima ${unaMaritima} cambio de contacto: ` +
      `${JSON.stringify(hoy)} -> ${JSON.stringify(conCableado)}`);
  }
});

caso('A13', 'el guard de arranque decide por el dato: apagado no toca el join, activo lo valida', async () => {
  // LAS DOS RAMAS. Hasta el paso 5 esta mordida solo podia ejercer la apagada,
  // porque la activa exigia escribir 'consultada': true en el archivo real y el
  // paso 4 no aplicaba nada; quedo escrito ahi que se ejerceria en el paso 5.
  // Ahora se ejercen las dos, y ninguna depende de como este el archivo hoy: el
  // guard recibe la declaracion en vez de leerla, que es lo que lo hace medible.
  const apagado = verificarCableadoEnArranque(capaSinCableado());
  if (apagado.activo !== false || apagado.join !== null) {
    throw new Error(`con el cableado apagado el guard no puede tocar el join; dio ${JSON.stringify(apagado)}`);
  }
  const activo = verificarCableadoEnArranque(capaConCableado());
  if (activo.activo !== true || !activo.join || typeof activo.join !== 'object') {
    throw new Error(`con el cableado activo el guard tiene que cargar y validar el join; dio ${JSON.stringify(activo)}`);
  }
});

caso('A-neg', 'CONTROL NEGATIVO: la declaracion REAL de hoy es coherente consigo misma', async () => {
  // Hasta el 2026-08-13 este control afirmaba "la declaracion real deja el
  // cableado APAGADO". Era cierto y dejo de serlo el dia que el paso 5 lo
  // activo, que es exactamente lo que este control existia para detectar: hizo
  // su trabajo. Lo que se conserva es el control negativo de verdad —que el
  // archivo real, sin alterar, pasa el validador— sin afirmar en que estado
  // tiene que estar el interruptor, porque eso lo decide una etapa, no un test.
  const ens = ensancheDeclarado(CAPA_REAL, REGISTRO_HOY);
  const activo = CAPA_REAL[BLOQUE].consultada === true;
  if (activo !== (ens !== null)) {
    throw new Error(`'consultada' dice ${activo} y ensancheDeclarado dio ${JSON.stringify(ens)}`);
  }
  if (ens !== null) {
    // Con el cableado activo, lo que sale tiene que ser coherente con el registro.
    const publicados = DECL_REAL.ambitos.filter(a => a.publicado === true).map(a => a.ambito);
    if (ens.capa !== DECL_REAL.capa_publicada) {
      throw new Error(`la capa tiene que salir de ambitos_publicados.json, dio '${ens.capa}'`);
    }
    if (JSON.stringify(ens.ambitos) !== JSON.stringify(publicados)) {
      throw new Error(`los ambitos tienen que ser los publicados (${publicados}), dio ${JSON.stringify(ens.ambitos)}`);
    }
  }
  // Y el escenario construido, que no depende del estado del archivo.
  const conLacustre = ensancheDeclarado(capaConCableado(), registroConLacustrePublicado());
  if (conLacustre.capa !== DECL_REAL.capa_publicada) {
    throw new Error(`la capa tiene que salir de ambitos_publicados.json, dio '${conLacustre.capa}'`);
  }
  if (!conLacustre.ambitos.includes('lacustre')) {
    throw new Error(`los ambitos tienen que incluir el lacustre, dio ${JSON.stringify(conLacustre.ambitos)}`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PARTE B — LAS DOS DIRECCIONES, CONTRA LA CAPA REAL.
//
// HASTA EL 2026-08-13 ESTA PARTE CORRIA CONTRA UN ENSAYO, y hay que decir por
// que dejo de hacerlo. El paso 4 escribio el cableado cuando `jurisdicciones_
// ds991` NO EXISTIA, asi que la materializaba dentro de una transaccion con la
// geometria del andamio y hacia ROLLBACK. El paso 5 aplico el build y la capa
// existe: el `CREATE TABLE` pasa a reventar con "la relacion ya existe" y el
// B7 —"el ensayo se deshizo, la capa sigue sin existir"— pasa a afirmar lo
// contrario de lo que el repositorio quiere. Los dos fallaban por haber
// acertado, no por un defecto.
//
// Ahora B1, B2, B3, B5 y B6 corren contra la CAPA REAL con su geometria
// definitiva, que es estrictamente mas fuerte que el ensayo: el paso 4 solo
// podia probar el cableado y esto prueba ademas la geometria que el build dejo.
// Lo unico que sigue necesitando una materializacion es B4 —el contrafactico
// "que pasaria si lo maritimo tambien estuviera publicado"—, y para eso NO se
// recrea la capa: se le INSERTAN las filas maritimas del andamio dentro de una
// transaccion que se deshace. B7 pasa a comprobar eso: que la capa real quedo
// exactamente como estaba, contada por ambito antes y despues.
// ═════════════════════════════════════════════════════════════════════════════

// Una ruta dentro del Lago Llanquihue (bahia 111, jurisdiccion `puerto_varas`).
const RUTA_LACUSTRE = { type: 'LineString', coordinates: [[-72.90, -41.12], [-72.70, -41.20]] };
// Anahuac -> Melinka, del arnes de las 8 rutas reales de E0.2 / E2.
const RUTA_MARITIMA = {
  type: 'LineString',
  coordinates: [[-72.97656408099994, -41.48607231899996], [-73.74786402599995, -43.89816864699998]],
};

// El contrafactico de B4. Toma las maritimas CON geometria del andamio y las
// mete en la capa real dentro de una transaccion que se deshace.
//
// LOS IDS SON LOS REALES, NO UN PREFIJO: el ensanche resuelve jurisdiccion_id
// contra el join de E0.3, asi que un id inventado devolveria cero bahias y B4
// diria "el filtro muerde" por el motivo equivocado — probaria que un id falso
// no resuelve, no que el filtro por ambito funciona (CLAUDE.md §2). No hay
// choque de clave: las 6 filas de la capa son lacustres y sus ids no estan
// entre las maritimas del andamio.
//
// Los campos obligatorios que el andamio no trae se rellenan con un texto que
// DICE que es una inyeccion, para que una fila sobreviviente se reconozca de
// inmediato en vez de parecer dato.
const INYECTAR_MARITIMAS = `
  INSERT INTO public.jurisdicciones_ds991
    (id, nombre, gobernacion, ambito, participa_matching, estado_geometria,
     sigue_litoral, tramos_litoral, texto_decreto, geom)
  SELECT id, id, 'INYECTADA POR LA MORDIDA', 'maritima', true,
         'construida', false, 0,
         'FILA INYECTADA POR scripts/e3_prueba_mordida_cableado.js (caso B4), '
         || 'dentro de una transaccion que se deshace. Si esta fila esta en la '
         || 'base, una transaccion no se deshizo.',
         geom
    FROM public.jurisdicciones_decreto
   WHERE geom IS NOT NULL AND ambito = 'maritima'
     AND id NOT IN (SELECT id FROM public.jurisdicciones_ds991);`;

const censar = async (c) => {
  const { rows } = await c.query(
    'SELECT ambito, count(*)::int n FROM jurisdicciones_ds991 GROUP BY ambito ORDER BY 1');
  return rows.map(r => `${r.ambito}=${r.n}`).join(' ');
};

async function parteB(pool, salida) {
  // El censo de la capa REAL antes de abrir nada. B7 lo compara al final.
  const censoAntes = await censar(pool);
  const cliente = await pool.connect();
  const resultados = [];
  try {
    await cliente.query('BEGIN');
    salida(`  capa real, censo por ambito: ${censoAntes}`);

    const ens = ensancheDeclarado(capaConCableado(), registroConLacustrePublicado());
    await verificarEnsancheEnLaBase(cliente, ens);
    const ensConMaritima = { ...ens, ambitos: ['lacustre', 'maritima'] };

    const lacustre = JSON.stringify(RUTA_LACUSTRE);
    const maritima = JSON.stringify(RUTA_MARITIMA);

    // Lo que el motor ve HOY, preguntado a la capa vigente tal como la consulta
    // `bahiasEnRutaPostGIS` antes del ensanche.
    const hoy = async (geojson) => {
      const { rows } = await cliente.query(
        `SELECT bahia_id FROM "${CAPA_REAL.capa_jurisdicciones}"
          WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))`, [geojson]);
      return new Set(rows.map(r => r.bahia_id));
    };

    // ── B1 — LO LACUSTRE ENTRA ────────────────────────────────────────────────
    const lacHoy = await hoy(lacustre);
    const lacEnsanche = await bahiasDelEnsanche(cliente, lacustre, ens);
    const lacTotal = new Set([...lacHoy, ...lacEnsanche]);
    resultados.push(['B1', 'lo lacustre entra',
      lacHoy.size === 0 && igualdadDeConjuntos(lacEnsanche, BAHIAS_DE_PUERTO_VARAS),
      `hoy={${ordenado(lacHoy).join(',')}} ensanche={${ordenado(lacEnsanche).join(',')}} ` +
      `total={${ordenado(lacTotal).join(',')}}`]);

    // ── B2 — NINGUNA MARITIMA SALE ───────────────────────────────────────────
    const marHoy = await hoy(maritima);
    const marEnsanche = await bahiasDelEnsanche(cliente, maritima, ens);
    const marTotal = new Set([...marHoy, ...marEnsanche]);
    resultados.push(['B2', 'ninguna maritima sale, y no entra ninguna de mas',
      igualdadDeConjuntos(marTotal, marHoy) && marEnsanche.size === 0,
      `hoy=${marHoy.size} {${ordenado(marHoy).join(',')}} · ensanche agrega ${marEnsanche.size} · ` +
      `total=${marTotal.size}`]);

    // ── B3 — la ruta lacustre no toca ninguna bahia maritima ─────────────────
    // Ninguna bahia cuya atribucion sea de un ambito NO publicado puede colarse.
    // Se comprueba contra el insumo, no contra una lista escrita a mano.
    const ambitoDeJur = new Map(INSUMO_REAL.jurisdicciones.map(j => [j.id, j.ambito]));
    const deOtroAmbito = [...lacTotal].filter(id => {
      const a = cargarJoin().resueltas.get(Number(id));
      return !a || !a.jurisdicciones.some(j => ambitoDeJur.get(j) === 'lacustre');
    });
    resultados.push(['B3', 'la ruta lacustre no arrastra ninguna bahia de otro ambito',
      deOtroAmbito.length === 0,
      `total={${ordenado(lacTotal).join(',')}} · ajenas al ambito publicado: ` +
      `${deOtroAmbito.length ? deOtroAmbito.join(',') : 'ninguna'}`]);

    // ── B4 — MORDIDA DEL FILTRO POR AMBITO ───────────────────────────────────
    // Si el filtro no muerde, la misma consulta con `maritima` agregada devuelve
    // muchas bahias. Que B2 de cero tiene que ser por el filtro, no porque la
    // consulta este rota.
    // La capa real solo tiene las 6 lacustres, asi que lo maritimo se INYECTA
    // aca adentro (ver INYECTAR_MARITIMAS). Va dentro de un SAVEPOINT propio y
    // se deshace apenas B4 termina: B5 y B6 miden cobertura despues, y aunque el
    // ensanche filtre por ambito y no deberia verlas, "no deberia" no es una
    // medicion. El savepoint lo vuelve imposible en vez de improbable.
    await cliente.query('SAVEPOINT b4');
    const { rowCount: inyectadas } = await cliente.query(INYECTAR_MARITIMAS);
    salida(`  B4: ${inyectadas} maritimas inyectadas — censo dentro del savepoint: ${await censar(cliente)}`);
    const marSiSePublicara = await bahiasDelEnsanche(cliente, maritima, ensConMaritima);
    await cliente.query('ROLLBACK TO SAVEPOINT b4');
    salida(`  B4: savepoint deshecho — censo: ${await censar(cliente)}`);
    resultados.push(['B4', 'el cero de B2 lo produce el filtro por ambito, no una consulta rota',
      inyectadas > 0 && marSiSePublicara.size > 0,
      `con maritima publicada el ensanche agregaria ${marSiSePublicara.size} bahias ` +
      `(sobre ${inyectadas} maritimas inyectadas y deshechas)`]);

    // ── B5 — LA COBERTURA: el tramo lacustre deja de ser un hueco ─────────────
    const medir = async (geojson, ensanche) => {
      const { rows } = await cliente.query(
        sqlCobertura(CAPA_REAL.capa_jurisdicciones, CAPA_REAL.capa_recorte_tierra, ensanche),
        ensanche ? [geojson, ensanche.ambitos] : [geojson]);
      return {
        descubierto: rows.reduce((a, r) => a + Number(r.largo_km), 0),
        total: rows.length ? Number(rows[0].largo_ruta_km) : 0,
      };
    };
    const cobSin = await medir(lacustre, null);
    const cobCon = await medir(lacustre, ens);
    resultados.push(['B5', 'con el cableado el tramo lacustre deja de contarse como hueco de capa',
      cobSin.descubierto > 0 && cobCon.descubierto === 0,
      `sin ensanche: ${cobSin.descubierto.toFixed(3)} km descubiertos de ${cobSin.total.toFixed(3)} · ` +
      `con ensanche: ${cobCon.descubierto.toFixed(3)} km`]);

    // ── B6 — la cobertura de una ruta maritima no se mueve ───────────────────
    const marSin = await medir(maritima, null);
    const marCon = await medir(maritima, ens);
    resultados.push(['B6', 'la cobertura de una ruta maritima no se mueve',
      Math.abs(marSin.descubierto - marCon.descubierto) < 1e-9,
      `sin ensanche: ${marSin.descubierto.toFixed(6)} km · con ensanche: ${marCon.descubierto.toFixed(6)} km`]);
  } finally {
    await cliente.query('ROLLBACK');
    cliente.release();
  }

  // B7 — INOCUIDAD. Hasta el 2026-08-13 este caso comprobaba que el ensayo no
  // hubiera dejado la capa creada; desde que la capa EXISTE de verdad, lo que
  // hay que comprobar es lo contrario: que la mordida no la haya tocado. Se
  // cuenta por ambito antes y despues, fuera de la transaccion.
  const censoDespues = await censar(pool);
  const { rows: restos } = await pool.query(
    "SELECT count(*)::int n FROM jurisdicciones_ds991 WHERE gobernacion = 'INYECTADA POR LA MORDIDA'");
  resultados.push(['B7', 'la mordida no toco la capa real: mismo censo por ambito y ninguna fila inyectada',
    censoDespues === censoAntes && restos[0].n === 0,
    `antes [${censoAntes}] despues [${censoDespues}] · filas inyectadas que sobrevivieron: ${restos[0].n}`]);

  return resultados;
}

// ═════════════════════════════════════════════════════════════════════════════
(async () => {
  const lineas = [];
  const salida = (t) => { console.log(t); lineas.push(t); };

  salida('='.repeat(78));
  salida('E3 — PRUEBA DE MORDIDA DEL CABLEADO (paso 4). Sin aplicar nada.');
  salida(`fecha: ${new Date().toISOString()}`);
  salida('='.repeat(78));

  let fallos = 0;

  salida('');
  salida('PARTE A — las reglas del cableado');
  salida('-'.repeat(78));
  for (const c of casos) {
    try {
      const msg = await c.fn();
      salida(`  [OK]    ${c.grupo}  ${c.nombre}`);
      if (typeof msg === 'string') salida(`          detuvo con: ${msg.slice(0, 150)}`);
    } catch (e) {
      fallos++;
      salida(`  [FALLO] ${c.grupo}  ${c.nombre}`);
      salida(`          ${e.message}`);
    }
  }

  salida('');
  salida('PARTE B — las dos direcciones, contra el ensayo en la base');
  salida('-'.repeat(78));
  const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  try {
    for (const [id, nombre, ok, detalle] of await parteB(pool, salida)) {
      if (!ok) fallos++;
      salida(`  [${ok ? 'OK' : 'FALLO'}]    ${id}  ${nombre}`);
      salida(`          ${detalle}`);
    }
  } catch (e) {
    fallos++;
    salida(`  [FALLO] la parte B no se pudo correr: ${e.message}`);
  } finally {
    await pool.end();
  }

  salida('');
  salida('='.repeat(78));
  salida(fallos === 0
    ? `RESULTADO: ${casos.length} casos de la parte A + 7 de la parte B, todos en verde.`
    : `RESULTADO: ${fallos} FALLO(S).`);
  salida('='.repeat(78));

  const destino = process.argv.find(a => a.startsWith('--salida='));
  if (destino) require('fs').writeFileSync(destino.slice(9), lineas.join('\n') + '\n', 'utf8');
  process.exit(fallos === 0 ? 0 : 1);
})();
