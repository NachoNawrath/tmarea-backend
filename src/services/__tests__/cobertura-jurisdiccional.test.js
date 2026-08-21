'use strict';
// Pruebas de la pieza 2 de R1 y de la costura de E0.2. No tocan la base: la
// medicion se inyecta y la base se simula, porque lo que se prueba aca son las
// REGLAS, no PostGIS. La medicion contra la base real se prueba en
// scripts/fase5_medir_cobertura_ruta.js y scripts/e02_verificacion_e2e.js, con
// rutas del motor de ruteo.

const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

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

// Una base COHERENTE CON LA DECLARACION, no una base congelada en una fecha.
//
// Antes esto decia "la base tal como esta HOY: la capa publicada no existe, asi
// que ningun ambito esta publicado" y lo tenia escrito a mano. El 2026-08-13
// (E3, paso 5) se publico el ambito lacustre y CATORCE de estos tests se
// pusieron rojos por C4 —"declarado PUBLICADO y la capa ni siquiera existe"—,
// que es el control funcionando contra una base de mentira que se quedo atras.
//
// Ahora el estado publicado SALE de la declaracion real: lo que este archivo
// simula es "la base concuerda con lo que el registro declara", que es la
// precondicion bajo la que estos tests prueban lo suyo. Lo que prueban es
// `componerAvisos` —las REGLAS del aviso—, no C3 ni C4: esos dos son controles
// de base-contra-declaracion y se ejercen contra la base REAL en la mordida de
// E0.2 y en la verificacion e2e. Hacer que el pool falso concuerde no afloja
// ningun control (CLAUDE.md §0.3): devuelve la simulacion a lo que decia querer
// ser.
const DECL_AMBITOS = require('../../../data/decreto/ambitos_publicados.json');
const PUBLICADOS = DECL_AMBITOS.ambitos.filter((a) => a.publicado === true);
// C4 exige con_geometria == jurisdicciones_esperadas para un ambito publicado.
const FILAS_PUBLICADAS = PUBLICADOS.map((a) => ({ ambito: a.ambito, con_geom: a.jurisdicciones_esperadas }));

const COLUMNAS = {
  jurisdicciones_decreto: ['id', 'ambito', 'geom'],
  bahia_jurisdicciones: ['bahia_id', 'nombre', 'geom'],
};
// La capa publicada existe en la base simulada si y solo si el registro declara
// algun ambito publicado — que es justamente la correspondencia que C3 y C4
// comprueban contra la base de verdad.
if (PUBLICADOS.length > 0) COLUMNAS[DECL_AMBITOS.capa_publicada] = ['id', 'ambito', 'geom'];

// 'reclamos' inyecta que devuelve la consulta de reclamo por ambito.
const poolFalso = ({ reclamos = [] } = {}) => ({
  async query(sql, params) {
    if (sql.includes('pg_tables')) {
      return { rows: Object.keys(COLUMNAS).includes(params[0]) ? [{ n: params[0] }] : [] };
    }
    if (sql.includes('pg_attribute')) {
      return { rows: (COLUMNAS[params[0]] || []).includes(params[1]) ? [{ ok: 1 }] : [] };
    }
    if (sql.includes('count(*) FILTER')) return { rows: FILAS_PUBLICADAS };
    // La consulta de reclamo lleva `WHERE columna = ANY($5)`, y $5 son los
    // ambitos que `ambitoQueReclama` decidio preguntar —los NO publicados con
    // geografia—. El pool falso tiene que respetarlo: si devolviera todo lo
    // inyectado sin mirar $5, un test podria "probar" que un ambito publicado
    // reclama, cuando lo que estaria probando es el mock (CLAUDE.md §2).
    if (sql.includes('ST_MakeLine')) {
      const pedidos = params[4] || [];
      return { rows: reclamos.filter((r) => pedidos.includes(r.ambito)) };
    }
    throw new Error(`consulta no prevista por el pool falso: ${sql.trim().slice(0, 70)}`);
  },
});

// Un ambito que el registro declara NO publicado Y con geografia de reclamo,
// tomado del propio registro y no escrito a mano. El test que lo usa prueba la
// REGLA "un ambito no publicado es causa (a)"; nombraba al `lacustre`, y por eso
// dejo de decir la verdad el dia que el lacustre se publico (CLAUDE.md §4.3).
const NO_PUBLICADO = DECL_AMBITOS.ambitos.find(
  (a) => a.publicado === false && a.geografia_de_reclamo);

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
  // CORREGIDA EL 2026-08-21. Decia `assert.match(a.capa_2, /VHF Canal 16/)`, que
  // comprobaba que el canal estuviera MENCIONADO en alguna parte del texto, no
  // que el aviso derivara a el. Contraejemplo corrido, que la asercion vieja
  // dejaba pasar: «No use VHF Canal 16 para esta zona; llame por telefono.»
  // La derivacion se prueba por IDENTIDAD contra el bloque declarado, que es lo
  // unico que distingue derivar de nombrar.
  assert.deepStrictEqual(a.contacto_generico, cargarZonasAviso().contacto_generico,
    'sin Capitania el aviso tiene que traer LA derivacion generica declarada, entera, no un texto que la nombre');
  assert.ok(!/\+56/.test(a.capa_2), 'no puede aparecer un telefono que la fuente no da');
  assert.ok(!/\{[a-z_]+\}/.test(a.capa_2), 'no pueden quedar marcas sin sustituir');
  assert.ok(!/\{[a-z_]+\}/.test(a.capa_1));
});

// ─────────────────────────────────────────────────────────────────────────────
// EL ANCLA DE INV-10.1 — POR QUE LA CAPA B MUESTRA EL TELEFONO
//
// Va pegada a la asercion de arriba porque es su hermana: aquella dice que el
// telefono NO puede estar DENTRO del texto; esta dice bajo que lectura del
// contrato SI puede estar EN LA PANTALLA, del otro lado del borde.
//
// EL CONFLICTO, MEDIDO EL 2026-08-21: INV-3.6 manda informar «verifica con la
// Capitania [nombre]: [telefono]» para este caso exacto, y INV-10.1 dice que el
// telefono se muestra «solo en el punto de zarpe y en el de recalada». Un tramo
// intermedio no es ninguno de los dos. DECISION DEL OWNER, 2026-08-21: se
// muestra. Fundamento firmado: el proposito de INV-10.1 esta escrito dentro del
// propio invariante —no rotular como Capitania un numero que es de la
// Gobernacion— y el render lo cumple, porque el rotulo sale de
// `capitanias[i].tipo`. El «solo» es la ortografia de la regla, no lo que
// persigue. CONSECUENCIA ACEPTADA: ese «solo» queda FALSO desde esta pieza.
//
// POR QUE ESTO ES UNA ASERCION Y NO UNA LINEA DE BITACORA: hoy nada mira si lo
// que un texto vivo afirma sigue siendo cierto —medido, y es el defecto que el
// declarativo ya tiene fichado sobre si mismo—. Esto se pone ROJO el dia que
// alguien enmiende INV-10.1, que es el dia en que hay que releer la decision.
// Es el mismo retiro automatico que `zonas_aviso.json` declara en su bloque de
// reversibilidad: la declaracion no puede sobrevivir a lo que la justifica.
//
// ── §4.9: LA FORMA ES POR IDENTIDAD, Y EL CONTRAEJEMPLO OBLIGA A ESA FORMA ───
// Este es el PRIMER uso de §4.9 en una guarda nueva —hasta hoy la regla habia
// corregido guardas existentes—, asi que el contraejemplo se escribio ANTES de
// dar la forma por buena, no despues:
//
//   «El telefono y la direccion de la autoridad se muestran SOLO en el punto de
//    zarpe, en el de recalada Y EN EL AVISO DE COBERTURA JURISDICCIONAL.»
//
// Ese texto CONTIENE la palabra «solo» y significa lo contrario. Una guarda
// anclada en la palabra lo dejaria pasar EN VERDE. Anclada en la frase entera por
// identidad normalizada se pone ROJA — que es la forma que el barrido del
// 2026-08-21 declaro correcta y ya construida en `andamio-medicion.js`:
// «compara por IDENTIDAD normalizada, no por palabra: no hay contraejemplo
// posible y es la forma correcta».
// ─────────────────────────────────────────────────────────────────────────────
test('INV-10.1 sigue diciendo lo que decia el dia que se decidio mostrar el telefono en la capa B', () => {
  const FRASE_AL_DECIDIR =
    'El teléfono y la dirección de la autoridad se muestran **sólo** en el punto de zarpe y en el ' +
    'de recalada, nunca dentro de un mensaje normativo.';
  const contrato = readFileSync(
    join(__dirname, '..', '..', '..', 'CONTRATO_MOTOR.md'), 'utf8'
  ).normalize('NFC');
  const normalizar = (s) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

  assert.ok(
    normalizar(contrato).includes(normalizar(FRASE_AL_DECIDIR)),
    'INV-10.1 ya no dice lo que decia el 2026-08-21. La capa B muestra el telefono de la ' +
    'Capitania en un tramo que NO es zarpe ni recalada, apoyada en la lectura de que el «solo» ' +
    'era la ortografia de la regla y no su proposito (owner, 2026-08-21). Si el invariante se ' +
    'enmendo, esa lectura hay que releerla antes de tocar este control: ver la fila ' +
    'SESION-u2-capa-b-2026-08-21::inv-101-solo-quedo-falso del declarativo de deudas.'
  );
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
  // El ambito sale del registro (NO_PUBLICADO), no escrito a mano. Hasta el
  // 2026-08-13 este test nombraba al `lacustre` con la jurisdiccion
  // `lago_villarrica`; ese dia el lacustre se publico y la premisa del test paso
  // a ser falsa. La regla que prueba no cambio: un ambito NO publicado que
  // reclama un trozo es causa (a) y no puede registrarse como defecto.
  assert.ok(NO_PUBLICADO, 'el registro tiene que declarar al menos un ambito no publicado con geografia de reclamo');
  const pool = poolFalso({ reclamos: [{ ambito: NO_PUBLICADO.ambito, m: 17706.9, ids: ['una_jurisdiccion'] }] });
  const { avisos, defectos } = await componerAvisos(medicion([pieza()]), pool);
  assert.strictEqual(avisos[0].causa, 'jurisdiccion_sin_geometria',
    'un ambito sin construir es una jurisdiccion sin geometria cargada (INV-3.6 causa a)');
  assert.strictEqual(avisos[0].origen, 'ambito_no_publicado');
  assert.strictEqual(avisos[0].ambito_no_publicado, NO_PUBLICADO.ambito);
  assert.deepStrictEqual(avisos[0].jurisdicciones_probables, ['una_jurisdiccion']);
  assert.strictEqual(defectos.length, 0,
    'NO puede registrarse como defecto de construccion: la capa de ese ambito no existe');
});

test('E0.2: un ambito PUBLICADO ya no reclama — su aviso se retira solo (E3, paso 5)', async () => {
  // El otro lado del mismo mecanismo, y es la aceptacion de E3: publicado el
  // ambito, `ambitoQueReclama` deja de reclamarle el trozo y el aviso de INV-3.6
  // desaparece sin que nadie lo apague a mano. Se ejerce con los ambitos que el
  // registro declara publicados, sean los que sean.
  assert.ok(PUBLICADOS.length > 0, 'el registro tiene que declarar algun ambito publicado');
  for (const a of PUBLICADOS) {
    const pool = poolFalso({ reclamos: [{ ambito: a.ambito, m: 17706.9, ids: ['una_jurisdiccion'] }] });
    const { avisos } = await componerAvisos(medicion([pieza()]), pool);
    assert.strictEqual(avisos[0].ambito_no_publicado, null,
      `'${a.ambito}' esta publicado: no puede reclamar el trozo ni aparecer como causa (a)`);
    assert.strictEqual(avisos[0].causa, 'hueco_de_capa');
  }
});

test('E0.2: el ambito no publicado nombra la Capitania cuando el mapa la atribuye', async () => {
  // punta_arenas es una jurisdiccion maritima cuyo nombre SI calza con el mapa
  // operativo. Es el caso medido en la ruta Punta Arenas -> Pto Williams.
  const pool = poolFalso({ reclamos: [{ ambito: 'maritima', m: 21539.8, ids: ['punta_arenas'] }] });
  const { avisos } = await componerAvisos(medicion([pieza()]), pool);
  assert.strictEqual(avisos[0].capitanias.length, 1);
  assert.strictEqual(avisos[0].capitanias[0].nombre, 'Punta Arenas');
  // CORREGIDA EL 2026-08-21. Decia `assert.match(avisos[0].capa_2, /Punta Arenas/)`,
  // que pasaba con que el nombre estuviera en cualquier parte del texto — incluso
  // con la sustitucion de {nombre} rota. Contraejemplo corrido, que la asercion
  // vieja dejaba pasar: «No pudimos identificar la Capitania; no es Punta Arenas.»
  // Lo que hay que probar es que el nombre cayo EN EL HUECO, y eso se prueba por
  // identidad contra el texto compuesto. La forma estaba tres tests mas abajo,
  // en «el texto del aviso es el transcrito del §10»: se copia de ahi.
  assert.strictEqual(avisos[0].capa_2,
    cargarZonasAviso().mensaje.capa_2_con_capitania.replace('{nombre}', 'Punta Arenas'),
    'el aviso tiene que ser el texto del §10 con el nombre sustituido en {nombre}, no un texto que lo mencione');
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
