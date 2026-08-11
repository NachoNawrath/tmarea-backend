#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// e03join_construir_join.js — compone data/decreto/join_bahia_jurisdiccion.json.
//
// CAMINO 2 de la propuesta de E0.3: el join deja de vivir dentro del mapa de
// contactos y pasa a ser dato declarado propio, con la clave del decreto
// (`jurisdiccion_id`) en vez de un nombre de Capitania.
//
// De ahi se sigue la deuda que E0.2 dejo: la regla de coincidencia de nombre
// existia porque el join era POR NOMBRE. Con id deja de ser una regla y pasa a
// ser un lookup, y el cotejo de nombre sobrevive en un solo lugar, el del
// contacto.
//
// El archivo NO se escribe a mano (INV-3.7): se compone desde tres artefactos
// versionados y se registra el sha256 de cada uno.
//
// Uso:  node scripts/e03join_construir_join.js [--salida <ruta>]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.lastIndexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const leer = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

const RUTAS = {
  particion: path.join(RAIZ, '_bitacoras', 'e03join_recon_2026-08-11', 'particion.json'),
  cierre:    path.join(RAIZ, '_bitacoras', 'e03join_cierre_2026-08-11', 'cierre.json'),
  insumo:    path.join(RAIZ, 'data', 'decreto', 'jurisdicciones_v2.json'),
  zonas:     path.join(RAIZ, 'data', 'decreto', 'zonas_aviso.json'),
};
const SALIDA = arg('--salida', path.join(RAIZ, 'data', 'decreto', 'join_bahia_jurisdiccion.json'));

const particion = leer(RUTAS.particion);
const cierre    = leer(RUTAS.cierre);
const insumo    = leer(RUTAS.insumo);
const zonas     = leer(RUTAS.zonas);
const jurPorId  = new Map(insumo.jurisdicciones.map(j => [j.id, j]));

// ── Las cuatro fuentes a consultar, redactadas en la bitacora de cierre ─────
// Van EN EL DATO y no en la bitacora sola: una bahia sin resolver que no diga a
// quien preguntarle vuelve a ser "sin resolver a secas", que es lo que el owner
// pidio que no pasara.
const FUENTES = {
  limite_sur_aysen: {
    id: 'limite_sur_aysen',
    a_quien: 'DIRECTEMAR, y la parte regional a DPA_2023 (geodata/DPA_2023.zip, en disco sin cargar)',
    que_falta: 'El decreto define baker por "el limite Sur de la Region de Aysen" y puerto_eden por "el limite Sur de la Gobernacion Maritima de Aisen". Ninguno de los dos esta en coordenadas, y no esta dicho que coincidan.',
    pregunta: '¿Cuales son las coordenadas del limite Sur de la jurisdiccion de la Gobernacion Maritima de Aysen, que el D.S. 991/1987 usa como limite Norte de la Capitania de Puerto Puerto Eden sin expresarlo en coordenadas? ¿Coincide ese limite con el limite Sur de la Region de Aysen, que el mismo decreto usa como limite Sur de la Capitania de Puerto Baker?',
  },
  costura_cisnes_aguirre: {
    id: 'costura_cisnes_aguirre',
    a_quien: 'Informante con experiencia operativa en la zona austral',
    que_falta: 'Las dos bahias caen ENTRE los extremos de la linea Cayo Blanco - Punta San Andres - Puerto Perez - Islote Rodriguez - Isla Traiguen, que es la frontera declarada entre Puerto Cisnes y Puerto Aguirre. El veredicto dependeria de como se prolongue el trazo hacia el Weste, y eso el decreto no lo escribe. Las bandas de paralelos de las dos las contienen.',
    pregunta: 'En la practica, ¿quien atiende los canales Ferronave, Devia, Goñi y Ninualac — la Capitania de Puerto Cisnes o la de Puerto Aguirre? ¿Donde entiende la gente que navega ahi que esta el limite entre las dos, al Weste de la linea Islote Cayo Blanco - Punta San Andres? ¿Hay algun caso en que una de las dos haya dictado una restriccion para esos canales?',
    sirve_ademas_para: 'La misma costura decide como se cierra la figura de Puerto Aguirre por el Weste, que es una de las causas del C3 abierto de E4.',
  },
  solape_delgada_tdf: {
    id: 'solape_delgada_tdf',
    a_quien: 'DIRECTEMAR',
    que_falta: 'Los parrafos de punta_delgada ("el Estrecho de Magallanes" al Oriente de la linea Punta Harry - Cabo San Vicente) y de tierra_del_fuego ("el area oriental" de la linea Cabo San Vicente - Punta Anxius) cubren los dos la zona al Oriente de Cabo San Vicente, y el decreto no dice como se reparten.',
    pregunta: 'En el D.S. 991/1987 las descripciones de Punta Delgada y de Tierra del Fuego cubren ambas la zona al Oriente de Cabo San Vicente. ¿Bajo cual de las dos queda Bahia Chilota, en Porvenir? ¿Como se reparten esas dos jurisdicciones esa zona?',
  },
  pertenencia_archipielago: {
    id: 'pertenencia_archipielago',
    a_quien: 'DIRECTEMAR (una linea dentro de la consulta que ya se prepara)',
    que_falta: 'El paso "Isla Robinson Crusoe es una isla del Archipielago de Juan Fernandez" es conocimiento geografico corriente y ninguna fuente del repositorio lo certifica. La capa del IGM de fase5S se consulto el 2026-08-11 y NO lo tiene (0 hits; crudo en _bitacoras/e03join_cierre_2026-08-11/02_igm_bahia_90.txt).',
    pregunta: '¿La Isla Robinson Crusoe queda comprendida en el "Archipielago de Juan Fernandez" que el D.S. 991/1987 asigna a la Capitania de Puerto de Juan Fernandez?',
  },
};

// Bahias que el owner adjudico sobre una declaracion ya versionada del propio
// repositorio, con la fecha y el motivo. No es un criterio automatico: si
// manana se agrega otra, se agrega aca a mano y con quien la autorizo.
const CERRADAS_POR_DECLARACION = new Map([
  [90, 'autorizada por el owner el 2026-08-11, despues de medir que la capa del IGM propuesta NO tiene el dato (0 hits; _bitacoras/e03join_cierre_2026-08-11/02_igm_bahia_90.txt)'],
]);

// Que fuente le toca a cada bahia sin resolver. Declarado, no deducido.
const FUENTE_DE = { 127: 'limite_sur_aysen', 129: 'limite_sur_aysen', 154: 'limite_sur_aysen', 137: 'solape_delgada_tdf', 239: 'costura_cisnes_aguirre', 241: 'costura_cisnes_aguirre' };

// Donde el repositorio ya trae una declaracion previa que NOMBRA a la bahia como
// propia de una jurisdiccion, se registra junto con lo medido sobre ella. Queda
// REGISTRADO, no aplicado: las seis se resuelven juntas cuando lleguen las
// respuestas de sus fuentes, no de a una y no por un camino distinto cada una.
const MEDIDO_SOBRE_LA_DECLARACION_PREVIA = {
  129: 'El decreto define el limite Norte de puerto_eden por "el limite Sur de la Gobernacion Maritima de Aisen", que no esta en coordenadas: medido, ninguna jurisdiccion con banda declarada contiene la latitud 49,13 S. La declaracion previa nombra la bahia como propia y no entra en contradiccion con nada medido, pero tampoco aporta el limite que falta.',
  137: 'Medido: los parrafos de punta_delgada y tierra_del_fuego describen los dos un area al Oriente de la misma linea y el decreto no dice como se reparten; la bahia esta a 230 m de la linea Cabo San Vicente - Punta Anxius. La declaracion previa elige tierra_del_fuego, o sea un lado que el texto del decreto no decide. Registrarla no es lo mismo que heredarla.',
};

// ── Lo que el repositorio ya declara, leido en esta misma pasada ────────────
// zonas_aviso.json nombra bahias "en su territorio" para fundar cada
// 'sin_contacto'. Se recoge LEYENDO el archivo, no de memoria.
const declaracionPrevia = new Map();
for (const z of zonas.zonas) {
  const d = z.contacto.bahias_en_discrepancia;
  if (!d || !d.length) continue;
  for (const id of d) declaracionPrevia.set(id, { jurisdiccion_id: z.jurisdiccion_id, motivo: z.contacto.motivo });
}

// ── Composicion ─────────────────────────────────────────────────────────────
const porCierre = new Map(cierre.cerradas.map(c => [c.id, c]));
const abiertasCierre = new Set(cierre.abiertas.map(a => a.id));
const entradas = [];

for (const b of particion.bahias) {
  const base = { bahia_id: b.id, nombre_sitport: b.nombre_sitport };
  const c = porCierre.get(b.id);

  if (c) {
    entradas.push({ ...base, jurisdiccion_id: c.destino, estado: 'resuelta',
      respaldo: 'decreto', criterio: c.instrumento, evidencia: c.cita });
    continue;
  }
  // Cerrar sobre una declaracion previa del propio repositorio NO es una regla
  // que el codigo aplique solo: es una adjudicacion, y va bahia por bahia con
  // quien la autorizo. Hoy hay una sola, y el owner la pidio explicitamente.
  if (CERRADAS_POR_DECLARACION.has(b.id)) {
    const prev = declaracionPrevia.get(b.id);
    if (!prev) throw new Error(`bahia ${b.id}: se la declaro cerrada por declaracion previa y zonas_aviso.json no la nombra. La autorizacion quedo colgando de un texto que ya no esta.`);
    entradas.push({ ...base, jurisdiccion_id: prev.jurisdiccion_id, estado: 'resuelta',
      respaldo: 'declaracion_versionada',
      criterio: `declaracion previa de R1 pieza 1 en zonas_aviso.json · ${CERRADAS_POR_DECLARACION.get(b.id)}`,
      evidencia: `data/decreto/zonas_aviso.json, zona '${prev.jurisdiccion_id}': "${prev.motivo}"`,
      respaldo_pendiente: FUENTES.pertenencia_archipielago });
    continue;
  }
  if (abiertasCierre.has(b.id)) {
    const prev = declaracionPrevia.get(b.id);
    const f = FUENTES[FUENTE_DE[b.id]];
    if (!f) throw new Error(`bahia ${b.id} quedo sin resolver y sin fuente asignada. Una pendiente sin fuente es peor que una pendiente.`);
    entradas.push({ ...base, jurisdiccion_id: null, estado: 'sin_resolver',
      respaldo: null, criterio: null,
      candidatos: { mapa_operativo: b.capitania_mapa, sitport: b.capitania_sitport },
      fuente_a_consultar: f,
      // No se cierra con esto: se deja anotado que existe, para que el owner
      // decida si le vale el mismo criterio que acepto para la bahia 90.
      declaracion_previa_en_el_repo: prev ? {
        archivo: 'data/decreto/zonas_aviso.json',
        jurisdiccion_id: prev.jurisdiccion_id,
        cita: prev.motivo,
        nota: 'Escrita en R1 pieza 1 y versionada, nombra a esta bahia como propia de esa jurisdiccion. Queda REGISTRADA, no aplicada: esta bahia se resuelve junto con las otras cinco cuando responda su fuente.',
        medido_sobre_ella: MEDIDO_SOBRE_LA_DECLARACION_PREVIA[b.id] || null,
      } : null,
    });
    continue;
  }
  // Bahia 90: la cierra la declaracion versionada, no el decreto (ver addendum
  // de _bitacoras/e03join_cierre_2026-08-11.txt).
  const prev = declaracionPrevia.get(b.id);
  if (prev && !['A1', 'A2', 'A3', 'B', 'C', 'D'].includes(b.cajon)) {
    entradas.push({ ...base, jurisdiccion_id: prev.jurisdiccion_id, estado: 'resuelta',
      respaldo: 'declaracion_versionada', criterio: 'declaracion previa de R1 pieza 1 en zonas_aviso.json',
      evidencia: `data/decreto/zonas_aviso.json, zona '${prev.jurisdiccion_id}': "${prev.motivo}"`,
      respaldo_pendiente: FUENTES.pertenencia_archipielago });
    continue;
  }

  // Cajones A1/A2/A3 y B/C/D del reconocimiento.
  const destino = Array.isArray(b.destino_propuesto) ? b.destino_propuesto : [b.destino_propuesto];
  if (destino.length === 0 || destino[0] == null) throw new Error(`bahia ${b.id} (cajon ${b.cajon}) no trae destino propuesto.`);
  const esOperativo = ['A1', 'A2', 'A3'].includes(b.cajon);
  entradas.push({
    ...base,
    jurisdiccion_id: destino[0],
    // Un cuerpo de agua que el decreto nombra en DOS jurisdicciones no es un
    // error: es INV-3.4 (muestra de mas, nunca de menos). El dato lo admite.
    jurisdicciones_adicionales: destino.length > 1 ? destino.slice(1) : null,
    estado: 'resuelta',
    // La distincion que no hay que perder: 88 entradas se apoyan en que las dos
    // fuentes OPERATIVAS coinciden, no en que el decreto lo diga. E5 es la etapa
    // que las pone a prueba.
    respaldo: esOperativo ? 'operativo' : 'decreto',
    criterio: esOperativo
      ? `cajon ${b.cajon}: el mapa operativo y SITPORT coinciden${b.cajon === 'A2' ? ', y la variante de nombre esta establecida por igualdad de conjunto' : b.cajon === 'A3' ? ', y el nombre difiere solo en el prefijo "Puerto "/"Lago "' : ''}`
      : `cajon ${b.cajon}: ${b.nota || 'lo decide el decreto'}`,
    evidencia: esOperativo
      ? `mapa: '${b.capitania_mapa}' · SITPORT: '${b.capitania_sitport}' · jurisdiccion del decreto: '${destino[0]}'`
      : `${jurPorId.get(destino[0]).nombre}: "${jurPorId.get(destino[0]).texto_decreto.slice(0, 200)}..."`,
  });
}

// ── Comprobaciones antes de escribir (CLAUDE.md §4.4) ───────────────────────
const vistos = new Set();
for (const e of entradas) {
  if (vistos.has(e.bahia_id)) throw new Error(`bahia ${e.bahia_id} repetida en el join.`);
  vistos.add(e.bahia_id);
  if (e.estado === 'resuelta' && !jurPorId.has(e.jurisdiccion_id)) throw new Error(`bahia ${e.bahia_id}: '${e.jurisdiccion_id}' no existe en el insumo.`);
  for (const extra of e.jurisdicciones_adicionales || []) if (!jurPorId.has(extra)) throw new Error(`bahia ${e.bahia_id}: '${extra}' no existe en el insumo.`);
}
if (entradas.length !== particion.bahias.length) throw new Error(`el join tiene ${entradas.length} entradas y el catalogo ${particion.bahias.length}.`);

const porRespaldo = {};
for (const e of entradas) porRespaldo[e.respaldo || 'sin_resolver'] = (porRespaldo[e.respaldo || 'sin_resolver'] || 0) + 1;

const salida = {
  version: '1.0',
  generado: null, // lo pone selloDeTiempo(), abajo
  generado_por: 'scripts/e03join_construir_join.js',
  procedencia: 'E0.3 del PLAN_JURISDICCION.md, camino 2. El join bahia -> jurisdiccion del D.S. 991, con la clave del decreto y no con un nombre de Capitania. Derivado reproducible: se regenera corriendo el script, nunca se edita a mano (INV-3.7).',
  politica_de_resolucion: 'Las entradas en estado sin_resolver se resuelven TODAS JUNTAS cuando lleguen las respuestas de las fuentes identificadas en cada `fuente_a_consultar`, no de a una y no cada una por un camino distinto. Donde el repositorio ya trae una declaracion previa que nombra a la bahia, va registrada en `declaracion_previa_en_el_repo` junto con lo que se midio sobre ella; registrarla no la aplica.',
  que_NO_es: 'No es un directorio de contactos. El telefono y el nombre para mostrar siguen viviendo en src/data/bahia-capitania-map.json, que es dato operativo. Este archivo dice QUIEN TIENE JURISDICCION; aquel dice A QUIEN SE LLAMA. Mezclarlos fue lo que midio E0.3: 34 de 42 re-atribuciones dejaban el nombre de una Capitania con el telefono de otra.',
  sha256_insumos: Object.fromEntries(Object.entries(RUTAS).map(([k, p]) => [k, sha(p)])),
  conteo: { total: entradas.length, ...porRespaldo },
  significado_del_respaldo: {
    decreto: 'La atribucion sale del texto del D.S. 991 — una mencion literal, un poligono o linea de vertices escritos, o una banda de paralelos que excluye a la otra candidata. La cita esta en `evidencia`.',
    operativo: 'Las dos fuentes operativas (el mapa y SITPORT) coinciden y el nombre resuelve a una jurisdiccion del decreto. NO es el decreto diciendolo: es un acuerdo entre dos fuentes que no son normativas. E5, la prueba de las 163, es la etapa que las somete a prueba.',
    declaracion_versionada: 'La cierra una declaracion previa del propio repositorio, no el decreto ni una fuente externa. Lleva `respaldo_pendiente` con la pregunta que la endureceria.',
  },
  entradas,
};
// REPRODUCIBILIDAD (INV-3.7): "regenerar debe producir el mismo resultado".
// MEDIDO, y era falso: con `generado: new Date()` dos corridas seguidas sin
// tocar nada daban sha256 distinto, y entonces no hay forma de distinguir "se
// regenero igual" de "se regenero distinto" — que es justo lo que el invariante
// existe para poder ver. El sello se conserva SOLO si el contenido no cambio.
function selloDeTiempo(contenidoNuevo) {
  const sinSello = o => JSON.stringify({ ...o, generado: null });
  try {
    const previo = leer(SALIDA);
    if (sinSello(previo) === sinSello(contenidoNuevo)) return previo.generado;
  } catch (e) { /* no existia todavia: se sella ahora */ }
  return new Date().toISOString();
}
salida.generado = selloDeTiempo(salida);
fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2) + '\n', 'utf8');

console.log(`Escrito ${path.relative(RAIZ, SALIDA)}`);
console.log(`  entradas: ${entradas.length}`);
for (const [k, v] of Object.entries(porRespaldo).sort()) console.log(`    ${String(v).padStart(3)}  ${k}`);
console.log('');
console.log('  Sin resolver, con su fuente:');
for (const e of entradas.filter(x => x.estado === 'sin_resolver')) {
  console.log(`    ${String(e.bahia_id).padStart(3)} ${e.nombre_sitport.padEnd(34)} -> ${e.fuente_a_consultar.id} (${e.fuente_a_consultar.a_quien.split(',')[0]})${e.declaracion_previa_en_el_repo ? '   [hay declaracion previa en el repo]' : ''}`);
}
