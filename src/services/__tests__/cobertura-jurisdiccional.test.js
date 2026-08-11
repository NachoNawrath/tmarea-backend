'use strict';
// Pruebas de la pieza 2 de R1 y de la costura de E0.2. No tocan la base: la
// medicion se inyecta y la base se simula, porque lo que se prueba aca son las
// REGLAS, no PostGIS. La medicion contra la base real se prueba en
// scripts/fase5_medir_cobertura_ruta.js y scripts/e02_verificacion_e2e.js, con
// rutas del motor de ruteo.

const test = require('node:test');
const assert = require('node:assert');

const { componerAvisos, BANDERA_AVISO } = require('../cobertura-jurisdiccional');
const { cargarZonasAviso } = require('../zonas-aviso');

const medicion = (piezas) => ({
  capa: 'capa_de_prueba',
  capa_recorte: 'tierra_de_prueba',
  tolerancia_m: 0.001,
  largo_ruta_km: 100,
  piezas,
});

const pieza = (over = {}) => ({
  largo_km: 10, lat_ini: -53.9, lon_ini: -70.9, lat_fin: -54.9, lon_fin: -68.8,
  dentro_del_recorte: false, fuera_del_recorte_m: 10000, fraccion_en_recorte: 0,
  predicado_coveredby: false, pegada_a_cobertura: true, clasificacion: 'aviso',
  ...over,
});

// La base tal como esta HOY: la capa publicada (jurisdicciones_ds991) no existe,
// asi que ningun ambito esta publicado; la geografia de reclamo si existe.
// 'reclamos' inyecta que devuelve la consulta de reclamo por ambito.
const COLUMNAS = {
  jurisdicciones_decreto: ['id', 'ambito', 'geom'],
  bahia_jurisdicciones: ['bahia_id', 'nombre', 'geom'],
};
const poolFalso = ({ reclamos = [] } = {}) => ({
  async query(sql, params) {
    if (sql.includes('pg_tables')) {
      return { rows: Object.keys(COLUMNAS).includes(params[0]) ? [{ n: params[0] }] : [] };
    }
    if (sql.includes('pg_attribute')) {
      return { rows: (COLUMNAS[params[0]] || []).includes(params[1]) ? [{ ok: 1 }] : [] };
    }
    if (sql.includes('count(*) FILTER')) return { rows: [] };
    if (sql.includes('ST_MakeLine')) return { rows: reclamos };
    throw new Error(`consulta no prevista por el pool falso: ${sql.trim().slice(0, 70)}`);
  },
});

test('un trozo clasificado aviso produce tarjeta y bandera U', async () => {
  const { avisos, bandera_cobertura } = await componerAvisos(medicion([pieza()]), poolFalso());
  assert.strictEqual(avisos.length, 1);
  assert.strictEqual(bandera_cobertura, 'U');
  assert.strictEqual(avisos[0].bandera, 'U');
});

test('sin trozos descubiertos la bandera de cobertura es Q', async () => {
  const { avisos, bandera_cobertura, defectos } = await componerAvisos(medicion([]), poolFalso());
  assert.strictEqual(avisos.length, 0);
  assert.strictEqual(defectos.length, 0);
  assert.strictEqual(bandera_cobertura, 'Q');
});

test('un trozo atribuible al recorte no produce tarjeta pero si defecto', async () => {
  const { avisos, defectos, bandera_cobertura } = await componerAvisos(medicion([
    pieza({ dentro_del_recorte: true, fuera_del_recorte_m: 0, clasificacion: 'defecto_recorte' }),
  ]), poolFalso());
  assert.strictEqual(avisos.length, 0, 'no debe mostrarse al patron');
  assert.strictEqual(defectos.length, 1, 'pero si debe quedar registrado');
  assert.strictEqual(defectos[0].tipo, 'hueco_atribuible_al_recorte');
  assert.strictEqual(bandera_cobertura, 'Q');
});

test('INV-3.6: un hueco de capa se muestra Y se registra como defecto', async () => {
  const { avisos, defectos } = await componerAvisos(medicion([pieza()]), poolFalso());
  assert.strictEqual(avisos[0].causa, 'hueco_de_capa');
  assert.strictEqual(avisos[0].origen, 'hueco_de_capa');
  assert.strictEqual(defectos.length, 1);
  assert.strictEqual(defectos[0].tipo, 'hueco_de_capa');
});

test('INV-3.6 tope duro: ninguna combinacion lleva el aviso a U+V', async () => {
  // Muchos trozos, muy largos, de las dos causas: la bandera sigue topada.
  const muchos = Array.from({ length: 50 }, (_, i) => pieza({ largo_km: 1000 + i }));
  const { avisos, bandera_cobertura } = await componerAvisos(medicion(muchos), poolFalso());
  assert.strictEqual(bandera_cobertura, 'U');
  assert.ok(avisos.every(a => a.bandera === 'U'), 'ningun aviso puede traer otra bandera');
  assert.strictEqual(BANDERA_AVISO, 'U');
});

test('INV-3.6 tope duro: tampoco lo levanta un ambito no publicado', async () => {
  const muchos = Array.from({ length: 50 }, (_, i) => pieza({ largo_km: 1000 + i }));
  const pool = poolFalso({ reclamos: [{ ambito: 'lacustre', m: 999999, ids: ['lago_villarrica'] }] });
  const { avisos, bandera_cobertura } = await componerAvisos(medicion(muchos), pool);
  assert.strictEqual(bandera_cobertura, 'U');
  assert.ok(avisos.every(a => a.bandera === 'U'));
});

test('INV-1.2: el aviso se marca como no-restriccion y no trae campos de restriccion', async () => {
  const { avisos } = await componerAvisos(medicion([pieza()]), poolFalso());
  const a = avisos[0];
  assert.strictEqual(a.es_restriccion, false);
  for (const campo of ['restriccion', 'observacion', 'condicion', 'motivo',
                       'tipo_restriccion', 'nave_recibe', 'evaluacion', 'aplica',
                       'id_bahia', 'nombre_bahia']) {
    assert.ok(!(campo in a), `el aviso no puede traer '${campo}': lo haria pasar por restriccion`);
  }
});

test('sin Capitania que nombrar, deriva al contacto generico y no inventa telefono', async () => {
  const { avisos } = await componerAvisos(medicion([pieza()]), poolFalso());
  const a = avisos[0];
  assert.deepStrictEqual(a.capitanias, []);
  assert.ok(a.contacto_generico, 'debe traer la derivacion generica');
  assert.match(a.capa_2, /VHF Canal 16/);
  assert.ok(!/\+56/.test(a.capa_2), 'no puede aparecer un telefono que la fuente no da');
  assert.ok(!/\{[a-z_]+\}/.test(a.capa_2), 'no pueden quedar marcas sin sustituir');
  assert.ok(!/\{[a-z_]+\}/.test(a.capa_1));
});

test('el texto del aviso es el transcrito del §10, no uno redactado en el codigo', async () => {
  const { mensaje } = cargarZonasAviso();
  const { avisos } = await componerAvisos(medicion([pieza()]), poolFalso());
  assert.strictEqual(avisos[0].capa_1, mensaje.capa_1);
  assert.strictEqual(avisos[0].capa_2, mensaje.capa_2_sin_capitania);
});

test('hoy ninguna zona declara ambito, asi que ninguna reclama un tramo', async () => {
  // Si esto empieza a fallar es porque se declaro un ambito: hay que volver a
  // medir que reclama y con que motivo, no ajustar el test.
  const { zonas_con_ambito, zonas } = cargarZonasAviso();
  assert.strictEqual(zonas.length, 10);
  assert.strictEqual(zonas_con_ambito.length, 0);
  const { avisos } = await componerAvisos(medicion([pieza()]), poolFalso());
  assert.deepStrictEqual(avisos[0].jurisdicciones_probables, []);
});

test('la capa que se consulta es la declarada, no una escrita en el codigo', () => {
  const decl = require('../../../data/decreto/capa_consultada.json');
  assert.strictEqual(decl.capa_jurisdicciones, 'bahia_jurisdicciones',
    'si esto cambia es un cambio deliberado de capa y hay que volver a medir cobertura');
  assert.strictEqual(decl.capa_recorte_tierra, 'ne_land');
  assert.ok(Number.isFinite(decl.tolerancia_fuera_del_recorte_m));
});

// ─── E0.2 — los dos origenes de la causa (a) ────────────────────────────────

test('E0.2: un trozo en ambito no publicado es causa (a), no un defecto de construccion', async () => {
  const pool = poolFalso({ reclamos: [{ ambito: 'lacustre', m: 17706.9, ids: ['lago_villarrica'] }] });
  const { avisos, defectos } = await componerAvisos(medicion([pieza()]), pool);
  assert.strictEqual(avisos[0].causa, 'jurisdiccion_sin_geometria',
    'un ambito sin construir es una jurisdiccion sin geometria cargada (INV-3.6 causa a)');
  assert.strictEqual(avisos[0].origen, 'ambito_no_publicado');
  assert.strictEqual(avisos[0].ambito_no_publicado, 'lacustre');
  assert.deepStrictEqual(avisos[0].jurisdicciones_probables, ['lago_villarrica']);
  assert.strictEqual(defectos.length, 0,
    'NO puede registrarse como defecto de construccion: la capa de ese ambito no existe');
});

test('E0.2: el ambito no publicado nombra la Capitania cuando el mapa la atribuye', async () => {
  // punta_arenas es una jurisdiccion maritima cuyo nombre SI calza con el mapa
  // operativo. Es el caso medido en la ruta Punta Arenas -> Pto Williams.
  const pool = poolFalso({ reclamos: [{ ambito: 'maritima', m: 21539.8, ids: ['punta_arenas'] }] });
  const { avisos } = await componerAvisos(medicion([pieza()]), pool);
  assert.strictEqual(avisos[0].capitanias.length, 1);
  assert.strictEqual(avisos[0].capitanias[0].nombre, 'Punta Arenas');
  assert.match(avisos[0].capa_2, /Punta Arenas/);
  assert.strictEqual(avisos[0].contacto_generico, null, 'con Capitania nombrada no deriva al generico');
});

test('E0.2: una zona declarada gana sobre el ambito — la declaracion mas especifica manda', async () => {
  // Hoy las 10 zonas tienen ambito nulo y ninguna reclama, asi que este test
  // comprueba la precedencia por el camino que hoy se puede ejercer: si ninguna
  // zona reclama, el ambito decide. El dia que una zona declare ambito, este
  // test hay que ampliarlo, no borrarlo.
  const { zonas_con_ambito } = cargarZonasAviso();
  assert.strictEqual(zonas_con_ambito.length, 0);
  const pool = poolFalso({ reclamos: [{ ambito: 'antartica', m: 47567.6, ids: ['bahia_fildes'] }] });
  const { avisos } = await componerAvisos(medicion([pieza()]), pool);
  assert.strictEqual(avisos[0].origen, 'ambito_no_publicado');
});

test('E0.2: un trozo que ningun ambito reclama sigue siendo hueco de capa (b)', async () => {
  // Es el caso medido en 33 de los trozos de las ocho rutas reales: la
  // distincion de E0.2 no aporta ahi y (b) es la etiqueta correcta.
  const { avisos, defectos } = await componerAvisos(medicion([pieza()]), poolFalso({ reclamos: [] }));
  assert.strictEqual(avisos[0].causa, 'hueco_de_capa');
  assert.strictEqual(avisos[0].ambito_no_publicado, null);
  assert.strictEqual(defectos.length, 1);
});
