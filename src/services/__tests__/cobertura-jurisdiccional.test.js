'use strict';
// Pruebas de la pieza 2 de R1. No tocan la base: la medicion se inyecta, porque
// lo que se prueba aca son las REGLAS, no PostGIS. La medicion contra la base
// real se prueba en scripts/fase5_medir_cobertura_ruta.js, con rutas del motor.

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

test('un trozo clasificado aviso produce tarjeta y bandera U', () => {
  const { avisos, bandera_cobertura } = componerAvisos(medicion([pieza()]));
  assert.strictEqual(avisos.length, 1);
  assert.strictEqual(bandera_cobertura, 'U');
  assert.strictEqual(avisos[0].bandera, 'U');
});

test('sin trozos descubiertos la bandera de cobertura es Q', () => {
  const { avisos, bandera_cobertura, defectos } = componerAvisos(medicion([]));
  assert.strictEqual(avisos.length, 0);
  assert.strictEqual(defectos.length, 0);
  assert.strictEqual(bandera_cobertura, 'Q');
});

test('un trozo atribuible al recorte no produce tarjeta pero si defecto', () => {
  const { avisos, defectos, bandera_cobertura } = componerAvisos(medicion([
    pieza({ dentro_del_recorte: true, fuera_del_recorte_m: 0, clasificacion: 'defecto_recorte' }),
  ]));
  assert.strictEqual(avisos.length, 0, 'no debe mostrarse al patron');
  assert.strictEqual(defectos.length, 1, 'pero si debe quedar registrado');
  assert.strictEqual(defectos[0].tipo, 'hueco_atribuible_al_recorte');
  assert.strictEqual(bandera_cobertura, 'Q');
});

test('INV-3.6: un hueco de capa se muestra Y se registra como defecto', () => {
  const { avisos, defectos } = componerAvisos(medicion([pieza()]));
  assert.strictEqual(avisos[0].causa, 'hueco_de_capa');
  assert.strictEqual(defectos.length, 1);
  assert.strictEqual(defectos[0].tipo, 'hueco_de_capa');
});

test('INV-3.6 tope duro: ninguna combinacion lleva el aviso a U+V', () => {
  // Muchos trozos, muy largos, de las dos causas: la bandera sigue topada.
  const muchos = Array.from({ length: 50 }, (_, i) => pieza({ largo_km: 1000 + i }));
  const { avisos, bandera_cobertura } = componerAvisos(medicion(muchos));
  assert.strictEqual(bandera_cobertura, 'U');
  assert.ok(avisos.every(a => a.bandera === 'U'), 'ningun aviso puede traer otra bandera');
  assert.strictEqual(BANDERA_AVISO, 'U');
});

test('INV-1.2: el aviso se marca como no-restriccion y no trae campos de restriccion', () => {
  const { avisos } = componerAvisos(medicion([pieza()]));
  const a = avisos[0];
  assert.strictEqual(a.es_restriccion, false);
  for (const campo of ['restriccion', 'observacion', 'condicion', 'motivo',
                       'tipo_restriccion', 'nave_recibe', 'evaluacion', 'aplica',
                       'id_bahia', 'nombre_bahia']) {
    assert.ok(!(campo in a), `el aviso no puede traer '${campo}': lo haria pasar por restriccion`);
  }
});

test('sin Capitania que nombrar, deriva al contacto generico y no inventa telefono', () => {
  const { avisos } = componerAvisos(medicion([pieza()]));
  const a = avisos[0];
  assert.deepStrictEqual(a.capitanias, []);
  assert.ok(a.contacto_generico, 'debe traer la derivacion generica');
  assert.match(a.capa_2, /VHF Canal 16/);
  assert.ok(!/\+56/.test(a.capa_2), 'no puede aparecer un telefono que la fuente no da');
  assert.ok(!/\{[a-z_]+\}/.test(a.capa_2), 'no pueden quedar marcas sin sustituir');
  assert.ok(!/\{[a-z_]+\}/.test(a.capa_1));
});

test('el texto del aviso es el transcrito del §10, no uno redactado en el codigo', () => {
  const { mensaje } = cargarZonasAviso();
  const { avisos } = componerAvisos(medicion([pieza()]));
  assert.strictEqual(avisos[0].capa_1, mensaje.capa_1);
  assert.strictEqual(avisos[0].capa_2, mensaje.capa_2_sin_capitania);
});

test('hoy ninguna zona declara ambito, asi que ninguna reclama un tramo', () => {
  // Si esto empieza a fallar es porque se declaro un ambito: hay que volver a
  // medir que reclama y con que motivo, no ajustar el test.
  const { zonas_con_ambito, zonas } = cargarZonasAviso();
  assert.strictEqual(zonas.length, 10);
  assert.strictEqual(zonas_con_ambito.length, 0);
  const { avisos } = componerAvisos(medicion([pieza()]));
  assert.deepStrictEqual(avisos[0].jurisdicciones_probables, []);
});

test('la capa que se consulta es la declarada, no una escrita en el codigo', () => {
  const decl = require('../../../data/decreto/capa_consultada.json');
  assert.strictEqual(decl.capa_jurisdicciones, 'bahia_jurisdicciones',
    'si esto cambia es un cambio deliberado de capa y hay que volver a medir cobertura');
  assert.strictEqual(decl.capa_recorte_tierra, 'ne_land');
  assert.ok(Number.isFinite(decl.tolerancia_fuera_del_recorte_m));
});
