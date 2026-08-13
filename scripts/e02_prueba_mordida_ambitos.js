'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e02_prueba_mordida_ambitos.js — PRUEBA DE MORDIDA del registro de ambitos.
//
// CLAUDE.md §4.6: un control que no puede fallar no prueba nada. Cada caso de
// abajo INYECTA el defecto que el control debe cazar y confirma que lo caza,
// con su mensaje. Y el control negativo confirma que la declaracion REAL, sin
// alterar, pasa — porque un validador que rechaza todo tampoco prueba nada.
//
// La declaracion y el insumo se leen REALES y se alteran en memoria: si el test
// llevara su propia copia, envejeceria en cuanto cambie el archivo y dejaria de
// medir lo que dice medir (la trampa que E0.1 ya pago).
//
// La base se simula con un pool falso para los casos que hablan de la base, de
// modo que la mordida corra en cualquier maquina sin PostGIS (§3.4). El control
// negativo final SI usa la base real.
//
//   node scripts/e02_prueba_mordida_ambitos.js
//   salida 0 = las 11 muerden y el control negativo pasa. Cualquier otra = fallo.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const { Pool } = require('pg');
const {
  validarDeclaracion, verificarContraBase, ambitoQueReclama, ErrorAmbitos,
} = require('../src/services/ambitos-publicados');

const DECL_REAL   = require('../data/decreto/ambitos_publicados.json');
const INSUMO_REAL = require('../data/decreto/jurisdicciones_v2.json');
const CAPA_REAL   = require('../data/decreto/capa_consultada.json');

const clonar = (o) => JSON.parse(JSON.stringify(o));

// ─── Pool falso ─────────────────────────────────────────────────────────────
// Contesta las tres formas de consulta que el modulo hace. Cualquier otra
// revienta a proposito: si el modulo empieza a consultar algo nuevo, la mordida
// se entera en vez de pasar por defecto.
function poolFalso({ relaciones = [], columnas = {}, porAmbito = [], reclamos = [] } = {}) {
  return {
    async query(sql, params) {
      if (sql.includes('pg_tables')) return { rows: relaciones.includes(params[0]) ? [{ n: params[0] }] : [] };
      if (sql.includes('pg_attribute')) {
        const cols = columnas[params[0]] || [];
        return { rows: cols.includes(params[1]) ? [{ ok: 1 }] : [] };
      }
      if (sql.includes('count(*) FILTER')) return { rows: porAmbito };
      if (sql.includes('ST_MakeLine')) return { rows: reclamos };
      throw new Error(`el pool falso no preve esta consulta: ${sql.trim().slice(0, 70)}`);
    },
  };
}

// ─── LOS SUJETOS DE CADA CASO SALEN DEL REGISTRO, NO DE UN NOMBRE ───────────
// Hasta el 2026-08-13 estos casos nombraban al `lacustre` a mano. Ese dia E3 lo
// paso a publicado y le retiro su geografia de reclamo —un ambito publicado no
// reclama—, y TRES casos dejaron de morder: el C3 porque su sujeto ya no estaba
// declarado ausente, y los dos C6 porque mutaban una geografia que habia pasado
// a null. La mordida no medía lo que decia medir: medía el estado de un ambito
// concreto. Ahora cada caso pide el ambito que su defecto necesita (CLAUDE.md
// §4.3: una regla que nombra a alguien no es una regla).
const conGeografia = (d) => d.ambitos.find(a => a.geografia_de_reclamo);
if (!conGeografia(DECL_REAL)) {
  throw new Error('MORDIDA INVALIDA: ningun ambito del registro declara geografia de reclamo, ' +
    'asi que los casos de C6 no tienen sobre que inyectar su defecto. No se degrada a verde: ' +
    'una mordida que no puede morder no prueba nada (CLAUDE.md §4.6).');
}

// La base tal como esta HOY: la capa publicada no existe, y la geografia de
// reclamo si. Es el escenario real, y es sobre el que se inyectan los defectos.
const BASE_HOY = {
  relaciones: ['jurisdicciones_decreto', 'bahia_jurisdicciones'],
  columnas: {
    jurisdicciones_decreto: ['id', 'ambito', 'geom'],
    bahia_jurisdicciones: ['bahia_id', 'nombre', 'geom'],
  },
  porAmbito: [],
};

// La base el dia que E3 publique lo lacustre: la capa canonica existe y trae
// las 6 lacustres construidas.
const BASE_CON_LACUSTRE = {
  relaciones: ['jurisdicciones_decreto', 'bahia_jurisdicciones', 'jurisdicciones_ds991'],
  columnas: {
    jurisdicciones_decreto: ['id', 'ambito', 'geom'],
    bahia_jurisdicciones: ['bahia_id', 'nombre', 'geom'],
    jurisdicciones_ds991: ['id', 'ambito', 'geom'],
  },
  porAmbito: [{ ambito: 'lacustre', con_geom: 6 }],
};

const casos = [];
const caso = (control, nombre, fn) => casos.push({ control, nombre, fn });

// ─── C1 — falta un ambito del insumo ────────────────────────────────────────
caso('C1', 'un ambito del insumo sin entrada en el registro', async () => {
  const d = clonar(DECL_REAL);
  d.ambitos = d.ambitos.filter(a => a.ambito !== 'lacustre');
  validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
});

// ─── C2 — sobra una entrada ─────────────────────────────────────────────────
caso('C2', 'una entrada que no corresponde a ningun ambito del insumo', async () => {
  const d = clonar(DECL_REAL);
  d.ambitos.push({
    ambito: 'fluvial', publicado: false, causa: 'inventada a proposito',
    jurisdicciones_esperadas: 3, geografia_de_reclamo: null,
    motivo_sin_geografia_de_reclamo: 'inventada a proposito',
  });
  validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
});

// ─── C3 — RETIRO AUTOMATICO: declarado ausente y la base lo tiene ───────────
caso('C3', 'RETIRO AUTOMATICO — un ambito declarado no publicado y la base YA lo tiene', async () => {
  // El defecto que se inyecta es "declarado ausente mientras la base lo tiene",
  // asi que el sujeto se FUERZA a no publicado en la copia alterada. Antes esto
  // dependia de que el registro real lo tuviera en false, y se apago solo el dia
  // que E3 publico el lacustre.
  const d = clonar(DECL_REAL);
  const e = d.ambitos.find(a => a.ambito === BASE_CON_LACUSTRE.porAmbito[0].ambito);
  e.publicado = false;
  if (!e.causa) e.causa = 'inyectada por la mordida: C5 exige causa a un no publicado';
  await verificarContraBase(poolFalso(BASE_CON_LACUSTRE), validarDeclaracion(d, INSUMO_REAL, CAPA_REAL));
});

// ─── C4 — la direccion contraria ────────────────────────────────────────────
caso('C4', 'lacustre declarado PUBLICADO y la capa publicada no existe', async () => {
  const d = clonar(DECL_REAL);
  d.ambitos.find(a => a.ambito === 'lacustre').publicado = true;
  await verificarContraBase(poolFalso(BASE_HOY), validarDeclaracion(d, INSUMO_REAL, CAPA_REAL));
});

caso('C4', 'lacustre declarado PUBLICADO con 4 de 6 jurisdicciones — a medias (D3)', async () => {
  const d = clonar(DECL_REAL);
  d.ambitos.find(a => a.ambito === 'lacustre').publicado = true;
  const base = clonar(BASE_CON_LACUSTRE);
  base.porAmbito = [{ ambito: 'lacustre', con_geom: 4 }];
  await verificarContraBase(poolFalso(base), validarDeclaracion(d, INSUMO_REAL, CAPA_REAL));
});

// ─── C5 — no publicado sin causa ────────────────────────────────────────────
caso('C5', 'un ambito no publicado al que se le borra la causa', async () => {
  const d = clonar(DECL_REAL);
  d.ambitos.find(a => a.ambito === 'antartica').causa = '   ';
  validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
});

// ─── C6 — la geografia de reclamo ───────────────────────────────────────────
caso('C6', 'geografia de reclamo nula sin motivo escrito', async () => {
  const d = clonar(DECL_REAL);
  const e = d.ambitos.find(a => a.ambito === 'lacustre');
  e.geografia_de_reclamo = null;
  delete e.motivo_sin_geografia_de_reclamo;
  validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
});

caso('C6', 'geografia de reclamo sin declarar no_resuelve_jurisdiccion', async () => {
  const d = clonar(DECL_REAL);
  delete conGeografia(d).geografia_de_reclamo.no_resuelve_jurisdiccion;
  validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
});

caso('C6', 'geografia de reclamo en una relacion que no existe en la base', async () => {
  // La base tiene que ser COHERENTE con la declaracion, si no C4 revienta antes
  // y el caso sale verde cazando el control equivocado. Paso el 2026-08-13:
  // con BASE_HOY —sin la capa publicada— y el lacustre ya publicado, este caso
  // reportaba CAZADO con el mensaje de C4. Un caso que muerde por otra razon es
  // un caso que no prueba lo que dice (CLAUDE.md §2).
  const d = clonar(DECL_REAL);
  conGeografia(d).geografia_de_reclamo.relacion = 'capa_que_no_existe';
  await verificarContraBase(poolFalso(BASE_CON_LACUSTRE), validarDeclaracion(d, INSUMO_REAL, CAPA_REAL));
});

// ─── C7 — la capa publicada apunta a la capa provisoria ─────────────────────
caso('C7', 'capa_publicada apuntando a la MISMA capa que el motor consulta hoy', async () => {
  const d = clonar(DECL_REAL);
  d.capa_publicada = CAPA_REAL.capa_jurisdicciones;
  validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
});

// ─── C8 — dos ambitos reclaman el mismo trozo ───────────────────────────────
caso('C8', 'un trozo reclamado por dos ambitos no publicados a la vez', async () => {
  const d = validarDeclaracion(clonar(DECL_REAL), INSUMO_REAL, CAPA_REAL);
  const pool = poolFalso({
    ...BASE_HOY,
    reclamos: [
      { ambito: 'lacustre', m: 5000, ids: ['lago_villarrica'] },
      { ambito: 'maritima', m: 3000, ids: ['carahue'] },
    ],
  });
  await ambitoQueReclama(pool, d, { lat_ini: -39.2, lon_ini: -72.2, lat_fin: -39.3, lon_fin: -71.9 });
});

// ─── C9 — la habilitacion para publicar (E3, gate por ambito) ───────────────
caso('C9', 'un ambito al que se le borra "habilitado_para_publicar"', async () => {
  const d = clonar(DECL_REAL);
  delete d.ambitos.find(a => a.ambito === 'antartica').habilitado_para_publicar;
  validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
});

caso('C9', 'habilitacion declarada sin motivo escrito', async () => {
  const d = clonar(DECL_REAL);
  d.ambitos.find(a => a.ambito === 'lacustre').motivo_habilitacion = '   ';
  validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
});

caso('C9', 'un ambito declarado PUBLICADO y no habilitado a publicar', async () => {
  const d = clonar(DECL_REAL);
  const e = d.ambitos.find(a => a.ambito === 'lacustre');
  e.publicado = true;
  e.habilitado_para_publicar = false;
  validarDeclaracion(d, INSUMO_REAL, CAPA_REAL);
});

// ─── Corrida ────────────────────────────────────────────────────────────────
(async () => {
  console.log('PRUEBA DE MORDIDA — REGISTRO DE AMBITOS PUBLICADOS (E0.2)');
  console.log(`fecha: ${new Date().toISOString()}`);
  console.log('shell: PowerShell 5.1 / Windows. Reproducible: node scripts/e02_prueba_mordida_ambitos.js');
  console.log('La declaracion y el insumo se leen REALES y se alteran en memoria.');
  console.log('='.repeat(78));

  let cazados = 0;
  for (const [i, c] of casos.entries()) {
    let resultado;
    try {
      await c.fn();
      resultado = null;
    } catch (e) {
      resultado = e;
    }
    const n = String(i + 1).padStart(2, '0');
    if (resultado instanceof ErrorAmbitos) {
      cazados++;
      console.log(`\n[${n}] ${c.control}  CAZADO   ${c.nombre}`);
      console.log(`     ${resultado.message.replace(/\s+/g, ' ').slice(0, 300)}`);
    } else if (resultado) {
      console.log(`\n[${n}] ${c.control}  FALLO    ${c.nombre}`);
      console.log(`     reviento con un error que NO es ErrorAmbitos: ${resultado.message}`);
    } else {
      console.log(`\n[${n}] ${c.control}  NO CAZO  ${c.nombre}`);
      console.log(`     el defecto inyectado paso sin que nadie lo detuviera. El control no muerde.`);
    }
  }

  console.log('\n' + '='.repeat(78));
  console.log(`MORDIDA: ${cazados}/${casos.length}`);

  // ─── Control negativo, contra la base REAL ────────────────────────────────
  console.log('\n' + '='.repeat(78));
  console.log('CONTROL NEGATIVO — la declaracion REAL contra la base REAL debe PASAR');
  console.log('Un validador que rechaza todo no prueba nada.');
  console.log('='.repeat(78));

  const pool = new Pool({
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  let negativoOk = false;
  try {
    const validada = validarDeclaracion(DECL_REAL, INSUMO_REAL, CAPA_REAL);
    await verificarContraBase(pool, validada);
    negativoOk = true;
    console.log(`\nPASA. capa_publicada declarada: '${validada.capa_publicada}'`);
    console.log(`ambitos declarados: ${validada.ambitos.length} · no publicados: ${validada.no_publicados.length} · ` +
      `con geografia de reclamo: ${validada.con_geografia.length}`);
    for (const e of validada.ambitos) {
      console.log(`  ${e.ambito.padEnd(16)} publicado=${String(e.publicado).padEnd(5)} ` +
        `habilitado=${String(e.habilitado_para_publicar).padEnd(5)} ` +
        `jur=${e.jurisdicciones_esperadas}  reclamo=${e.geografia_de_reclamo ? e.geografia_de_reclamo.relacion : 'ninguna (declarado)'}`);
    }
  } catch (e) {
    console.log(`\nNO PASA: ${e.message}`);
  } finally {
    await pool.end();
  }

  const ok = cazados === casos.length && negativoOk;
  console.log('\n' + '='.repeat(78));
  console.log(ok
    ? `RESULTADO: ${cazados}/${casos.length} + control negativo. Los controles muerden y no rechazan de mas.`
    : `RESULTADO: FALLO — cazados ${cazados}/${casos.length}, control negativo ${negativoOk ? 'ok' : 'NO PASA'}.`);
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('MORDIDA ABORTADA:', e.message, '\n', e.stack);
  process.exit(1);
});
