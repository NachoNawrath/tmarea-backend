'use strict';
// M1a — ¿PUEDE UN PUERTO ESTAR ABIERTO Y TENER RESTRICCION VIGENTE A LA VEZ?
// Medido en el DATO. La mitad de pantalla va aparte, con captura.
//
// LO QUE LA PREGUNTA DESTAPA, Y HAY QUE DECIRLO ANTES DEL NUMERO: los dos
// bloques NO leen fuentes distintas. Los dos salen de `consultaRestricciones()`.
//   · bloque de PUERTO   (POST /api/sitport/restricciones) filtra por
//     esDeLaBahia(r.bahia, ficha.bahia_id) — la bahia del puerto.
//   · bloque de TRANSITO (POST /api/sitport/restricciones-ruta) filtra por
//     celda Voronoi cruzada, y excluye zarpe_id/recalada_id.
// El ESTADO de puerto es una DERIVACION de esas mismas filas: derivarCierre(r)
// devuelve 'cerrado' o 'sin_cierre_declarado'.
//
// Por eso la pregunta se parte en dos y las dos respuestas pueden diferir:
//   A. ¿hay HOY una fila vigente con estado 'sin_cierre_declarado'?  -> si la
//      hay, "restriccion vigente" y "puerto cerrado" son INDEPENDIENTES.
//   B. ¿la app las trata como independientes? -> mapearRespuestaPuerto de la PWA
//      hace `else if (restricciones.length > 0) estado = 'ambar'`, sin mirar
//      `cierre` y sin mirar la nave. Eso se verifica en pantalla, no aca.
//
// Y DE PASO, porque hace falta para la anulacion de S2(c): el estado VIVO de la
// bahia 114 (Canal Chacao Sector Pargua y Pta Coronel, Capitania Calbuco).
//
// CONTROL POSITIVO  tiene que aparecer al menos una fila con estado 'cerrado'
//                   (el frente de cierre midio 249 de 254 con cierre declarado
//                   en la bolsa historica: las dos clases existen).
// CONTROL NEGATIVO  bahia 999 -> 0 filas.

const { derivarCierre } = require('../../src/services/cierre-derivador');
const { normalizarRestriccion } = require('../../src/services/sitport-parser');

const BACKEND = 'http://127.0.0.1:3000';

(async () => {
  console.log('M1a — PUERTO ABIERTO CON RESTRICCION VIGENTE, EN EL DATO');
  console.log('Corrida: ' + new Date().toISOString());
  console.log('Fuente: consultaRestricciones() en vivo, via GET /api/sitport/restricciones.');
  console.log('');

  const r = await fetch(`${BACKEND}/api/sitport/restricciones`);
  const j = await r.json();
  const filas = j.data || [];

  console.log(`DENOMINADOR: ${filas.length} filas vigentes en consultaRestricciones AHORA.`);
  console.log('Unidad: fila de restriccion (IDRestriccion).');
  console.log('');

  const porTipo = {};
  for (const f of filas) { const t = (f.tipo || '').trim(); porTipo[t] = (porTipo[t] || 0) + 1; }
  console.log('Por tipo: ' + Object.entries(porTipo).map(([k, v]) => `${k}=${v}`).join(' · '));
  console.log('');

  const clasif = filas.map(f => {
    const c = derivarCierre(f);
    const n = normalizarRestriccion(f);
    return {
      id: f.IDRestriccion, bahia: Number(f.bahia), nombre: f.GLBahia,
      tipo: (f.tipo || '').trim(),
      estado: c.estado, via: c.via, razon: c.razon_sin_cierre,
      condicion: n.condicion,
      motivo: f.MotivoRestriccion || null,
      area: f.AreaRestriccion || null,
      obs: (f.Observacion || '').replace(/\s+/g, ' ').trim(),
    };
  });

  const cerrado = clasif.filter(x => x.estado === 'cerrado');
  const sinCierre = clasif.filter(x => x.estado === 'sin_cierre_declarado');

  console.log('='.repeat(78));
  console.log('A · LA RESPUESTA EN EL DATO');
  console.log('='.repeat(78));
  console.log(`  estado 'cerrado' .............. ${cerrado.length} de ${filas.length}`);
  console.log(`  estado 'sin_cierre_declarado' . ${sinCierre.length} de ${filas.length}`);
  console.log('');
  console.log('CONTROL POSITIVO  al menos una fila con estado cerrado: ' +
    (cerrado.length > 0 ? `SI (${cerrado.length}) — el derivador distingue` : 'NO — el derivador no separa nada hoy, y el resultado de abajo no vale'));
  console.log('');
  console.log('RESPUESTA: ' + (sinCierre.length > 0
    ? `SI. Hay ${sinCierre.length} filas vigentes que NO declaran cierre. Un puerto con` +
      ' cualquiera de ellas tiene restriccion vigente y NO esta cerrado. Son dos cosas' +
      ' distintas del mismo lugar: la restriccion es el hecho, el cierre es una' +
      ' DERIVACION de su texto.'
    : 'NO en el dato de hoy. Las ' + filas.length + ' filas vigentes declaran cierre.' +
      ' No prueba que no pueda pasar: prueba que hoy no pasa, sobre ' + filas.length + ' filas.'));
  console.log('');

  console.log('DETALLE — las que NO declaran cierre (puerto abierto con restriccion viva):');
  console.log('  bahia  tipo            condicion        razon_sin_cierre   nombre');
  for (const x of sinCierre) {
    console.log(`  ${String(x.bahia).padStart(5)}  ${String(x.tipo).padEnd(15)} ${String(x.condicion).padEnd(16)} ${String(x.razon).padEnd(18)} ${x.nombre}`);
    console.log(`         motivo=${x.motivo || '—'}  area=${x.area || '—'}`);
    console.log(`         obs="${x.obs.slice(0, 150)}"`);
  }
  console.log('');
  console.log('DETALLE — las que SI declaran cierre:');
  console.log('  bahia  tipo            via        condicion        nombre');
  for (const x of cerrado) {
    console.log(`  ${String(x.bahia).padStart(5)}  ${String(x.tipo).padEnd(15)} ${String(x.via).padEnd(10)} ${String(x.condicion).padEnd(16)} ${x.nombre}`);
  }

  // ── LA 114, PARA LA ANULACION DE S2(c) ────────────────────────────────────
  console.log('');
  console.log('='.repeat(78));
  console.log('LA BAHIA 114 — estado VIVO, para la anulacion de S2(c)');
  console.log('='.repeat(78));
  const f114 = clasif.filter(x => x.bahia === 114);
  console.log(`  filas de la bahia 114 vigentes AHORA: ${f114.length}`);
  for (const x of f114) {
    console.log(`   tipo=${x.tipo} · condicion=${x.condicion} · cierre=${x.estado} · motivo=${x.motivo} · ${x.nombre}`);
    console.log(`   obs="${x.obs.slice(0, 200)}"`);
  }
  const f117 = clasif.filter(x => x.bahia === 117);
  console.log(`  CONTROL POSITIVO  bahia 117 (Quellon, la que SI sale en R1): ${f117.length} filas`);
  const f999 = clasif.filter(x => x.bahia === 999);
  console.log(`  CONTROL NEGATIVO  bahia 999 (inexistente): ${f999.length} filas`);

  console.log('');
  console.log('BAHIAS DISTINTAS CON RESTRICCION TODOS VIVA AHORA:');
  const todos = [...new Set(clasif.filter(x => x.tipo === 'TODOS').map(x => x.bahia))].sort((a, b) => a - b);
  console.log('  ' + todos.join(' ') + `   (${todos.length} bahias)`);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
