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

// El registro real, validado, tal como esta HOY: ningun ambito publicado.
const REGISTRO_HOY = validarDeclaracion(DECL_REAL, INSUMO_REAL, CAPA_REAL);

// El registro el dia del paso 5: el lacustre pasa a publicado. Se construye
// alterando el REAL en memoria y volviendo a validarlo con el validador de
// produccion — si el test llevara su propia copia, envejeceria (trampa de E0.1).
function registroConLacustrePublicado() {
  const d = clonar(DECL_REAL);
  d.ambitos.find(a => a.ambito === 'lacustre').publicado = true;
  return validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
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
  await muerde(() => ensancheDeclarado(capaConCableado(), REGISTRO_HOY),
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

caso('A13', 'el guard de arranque no toca el join mientras el cableado este apagado', async () => {
  const r = verificarCableadoEnArranque();
  if (r.activo !== false || r.join !== null) {
    throw new Error(`hoy el guard tiene que decir apagado y no cargar el join; dio ${JSON.stringify(r)}`);
  }
  // LO QUE ESTE CASO NO PRUEBA, dicho en vez de tapado: la rama ACTIVA del guard
  // no se ejerce aca, porque exigiria escribir 'consultada': true en el archivo
  // real y esta sesion no aplica nada. Esa rama es una linea —cargarJoin()— y su
  // validador tiene su propia mordida, 16/16 en e03join_prueba_mordida_join.js.
  // Se ejerce de verdad en el paso 5, cuando el cableado se active.
});

caso('A-neg', 'CONTROL NEGATIVO: la declaracion REAL de hoy deja el cableado apagado', async () => {
  const ens = ensancheDeclarado(CAPA_REAL, REGISTRO_HOY);
  if (ens !== null) throw new Error(`hoy el cableado tiene que estar apagado y dio ${JSON.stringify(ens)}`);
  const conLacustre = ensancheDeclarado(capaConCableado(), registroConLacustrePublicado());
  if (conLacustre.capa !== DECL_REAL.capa_publicada) {
    throw new Error(`la capa tiene que salir de ambitos_publicados.json, dio '${conLacustre.capa}'`);
  }
  if (JSON.stringify(conLacustre.ambitos) !== JSON.stringify(['lacustre'])) {
    throw new Error(`los ambitos tienen que ser solo los publicados, dio ${JSON.stringify(conLacustre.ambitos)}`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PARTE B — LAS DOS DIRECCIONES, CONTRA EL ENSAYO EN LA BASE.
// ═════════════════════════════════════════════════════════════════════════════

// Una ruta dentro del Lago Llanquihue (bahia 111, jurisdiccion `puerto_varas`).
const RUTA_LACUSTRE = { type: 'LineString', coordinates: [[-72.90, -41.12], [-72.70, -41.20]] };
// Anahuac -> Melinka, del arnes de las 8 rutas reales de E0.2 / E2.
const RUTA_MARITIMA = {
  type: 'LineString',
  coordinates: [[-72.97656408099994, -41.48607231899996], [-73.74786402599995, -43.89816864699998]],
};

const ENSAYO = `
  CREATE TABLE public.jurisdicciones_ds991 AS
    SELECT id, ambito, geom FROM public.jurisdicciones_decreto
     WHERE geom IS NOT NULL AND ambito IN ('lacustre', 'maritima');`;

async function parteB(pool, salida) {
  const cliente = await pool.connect();
  const resultados = [];
  try {
    await cliente.query('BEGIN');
    await cliente.query(ENSAYO);
    const { rows: censo } = await cliente.query(
      'SELECT ambito, count(*)::int n FROM jurisdicciones_ds991 GROUP BY ambito ORDER BY 1');
    salida(`  ensayo materializado en la transaccion: ${censo.map(r => `${r.ambito}=${r.n}`).join(' ')}`);

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
    const marSiSePublicara = await bahiasDelEnsanche(cliente, maritima, ensConMaritima);
    resultados.push(['B4', 'el cero de B2 lo produce el filtro por ambito, no una consulta rota',
      marSiSePublicara.size > 0,
      `con maritima publicada el ensanche agregaria ${marSiSePublicara.size} bahias`]);

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

  // El ensayo no dejo nada.
  const { rows } = await pool.query("SELECT to_regclass('public.jurisdicciones_ds991') AS capa");
  resultados.push(['B7', 'el ensayo se deshizo: la capa publicada sigue sin existir',
    rows[0].capa === null, `to_regclass = ${rows[0].capa}`]);

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
