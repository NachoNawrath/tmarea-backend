'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// catalogo-bahias.js — DETECCIÓN DE DRIFT DEL CATÁLOGO DE BAHÍAS
//
// El catálogo interno de bahías y el que publica SITPORT son dos fuentes
// independientes que pueden divergir en cualquier momento, en cualquier
// dirección y sin aviso. Hoy la divergencia se resuelve descartando lo que no
// matchea, en silencio (ver _bitacoras/e01_drift_catalogo_2026-08-11.txt §3).
// Este módulo la hace medible. NO decide qué hacer con ella: eso es decisión
// del owner y no está implementada acá.
//
// Es lógica pura y sin efectos: recibe las capturas ya leídas y devuelve un
// informe. Quien las obtiene (red, base de datos, archivo) es el script.
//
// Reglas de casa que gobiernan este archivo:
//   CLAUDE.md §4.1 falla ruidoso · §4.2 sin caso por defecto silencioso ·
//   §4.3 sin casos particulares en el código (toda excepción es dato declarado) ·
//   §4.6 un control tiene que poder fallar.
// Contrato: INV-3.6 (nada se resuelve en silencio), S9 del PLAN_JURISDICCION.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

class ErrorCatalogoBahias extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorCatalogoBahias'; }
}

// Las cuatro clases de divergencia. No hay una quinta silenciosa: un id que no
// cae en ninguna de estas no es divergencia, y una clase declarada fuera de esta
// lista es un error de la declaración (§4.2).
const CLASES = {
  sitport_sin_catalogo: 'SITPORT publica un id que ninguna fuente interna conoce — falso negativo estructural',
  catalogo_sin_sitport: 'una fuente interna tiene un id que SITPORT ya no publica',
  incoherencia_interna: 'las fuentes internas no coinciden en QUÉ ids tienen',
  contenido_divergente: 'las fuentes internas tienen el mismo id con contenido distinto',
  endpoint_fuera_de_catalogo: 'SITPORT publica dato de un id que su propio endpoint de catálogo no lista',
};

// Campos que más de una fuente interna declara y que, por lo tanto, tienen que
// coincidir. La comparación es EXACTA y sin tolerancia, y eso está medido, no
// supuesto: F1 contra F4 da max|Δlat| = max|Δlng| = 0 y 0 nombres distintos
// (2026-08-11). Si algún día una copia pasa a derivarse por cálculo en vez de
// por copia literal, la tolerancia vuelve a ser una pregunta y hay que medirla
// de nuevo antes de fijarla.
const CAMPOS_CONTENIDO = ['lat', 'lng', 'nombre'];

const ESTADOS = ['abierta', 'adjudicada'];

const CAMPOS_DIVERGENCIA = ['id_bahia', 'clase', 'campo', 'estado', 'visto_desde', 'causa', 'nombre_sitport', 'adjudicacion'];

// Una divergencia de contenido se identifica por id Y campo: declarar que la
// latitud de una bahía diverge no puede tapar que mañana además cambie su nombre.
function claveDivergencia(d) {
  return d.campo ? `${d.clase}#${d.id_bahia}#${d.campo}` : `${d.clase}#${d.id_bahia}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LECTURA DE LAS FUENTES INTERNAS
// ─────────────────────────────────────────────────────────────────────────────

// BAHIA_COORDS es un literal de objeto dentro de un módulo que arrastra express
// y pg, así que no se puede `require` para leerlo: se extrae del texto. La
// extracción se autoverifica — si el bloque no está, o queda vacío, o repite una
// clave, es error y no un catálogo corto (§4.1).
function leerBahiaCoords(rutaArchivo) {
  let src;
  try {
    src = fs.readFileSync(rutaArchivo, 'utf8');
  } catch (e) {
    throw new ErrorCatalogoBahias(`no se pudo leer ${rutaArchivo}: ${e.message}`);
  }
  const ini = src.indexOf('const BAHIA_COORDS = {');
  if (ini === -1) {
    throw new ErrorCatalogoBahias(`${rutaArchivo} no declara BAHIA_COORDS — la fuente interna cambió de forma y la extracción quedó ciega`);
  }
  const fin = src.indexOf('\n};', ini);
  if (fin === -1) {
    throw new ErrorCatalogoBahias(`${rutaArchivo}: BAHIA_COORDS no cierra — no se puede acotar el bloque`);
  }
  const bloque = src.slice(ini, fin);

  const claves = [...bloque.matchAll(/^\s*(\d+)\s*:/gm)].map(m => Number(m[1]));
  if (claves.length === 0) {
    throw new ErrorCatalogoBahias(`${rutaArchivo}: BAHIA_COORDS quedó sin entradas legibles`);
  }
  const repetidas = claves.filter((id, i) => claves.indexOf(id) !== i);
  if (repetidas.length > 0) {
    throw new ErrorCatalogoBahias(`${rutaArchivo}: BAHIA_COORDS repite la(s) clave(s) ${[...new Set(repetidas)].join(',')} — el literal se pisa a sí mismo`);
  }

  // Las entradas parseadas con lat/lng/nombre tienen que ser TODAS: si el regex
  // lee la clave pero no el registro, el catálogo se leería incompleto sin avisar.
  const entradas = new Map();
  for (const m of bloque.matchAll(/^\s*(\d+)\s*:\s*\{\s*lat:\s*(-?[\d.]+)\s*,\s*lng:\s*(-?[\d.]+)\s*,\s*nombre:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/gm)) {
    entradas.set(Number(m[1]), {
      lat: Number(m[2]), lng: Number(m[3]),
      nombre: m[4] !== undefined ? m[4] : m[5],
    });
  }
  const ilegibles = claves.filter(id => !entradas.has(id));
  if (ilegibles.length > 0) {
    throw new ErrorCatalogoBahias(`${rutaArchivo}: ${ilegibles.length} entrada(s) de BAHIA_COORDS no se pudieron leer (${ilegibles.slice(0, 5).join(',')}...) — extracción parcial, no se da por buena`);
  }
  return entradas;
}

function leerMapaCapitanias(rutaArchivo) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
  } catch (e) {
    throw new ErrorCatalogoBahias(`no se pudo leer ${rutaArchivo}: ${e.message}`);
  }
  const entradas = new Map();
  for (const [k, v] of Object.entries(json)) {
    if (!/^\d+$/.test(k)) {
      throw new ErrorCatalogoBahias(`${rutaArchivo}: la clave "${k}" no es un id de bahía`);
    }
    entradas.set(Number(k), v);
  }
  if (entradas.size === 0) {
    throw new ErrorCatalogoBahias(`${rutaArchivo}: sin entradas`);
  }
  return entradas;
}

// Devuelve las fuentes internas que viven en archivos. La de base de datos la
// agrega el script, porque este módulo no abre conexiones.
function leerFuentesInternas(raiz) {
  const f1 = leerBahiaCoords(path.join(raiz, 'src/routes/sitport-routes.js'));
  const f2 = leerBahiaCoords(path.join(raiz, 'scripts/seed-bahias-sitport.js'));
  const f3 = leerMapaCapitanias(path.join(raiz, 'src/data/bahia-capitania-map.json'));
  return [
    {
      clave: 'F1',
      ruta: 'src/routes/sitport-routes.js :: BAHIA_COORDS',
      rol: 'la que usa el runtime — el descarte de restricciones-ruta y weather-ruta se decide acá',
      ids: new Set(f1.keys()),
      campos: ['lat', 'lng', 'nombre'],
      contenido: f1,
    },
    {
      clave: 'F2',
      ruta: 'scripts/seed-bahias-sitport.js :: BAHIA_COORDS',
      rol: 'copia literal de F1; siembra la tabla bahias_sitport',
      ids: new Set(f2.keys()),
      campos: ['lat', 'lng', 'nombre'],
      contenido: f2,
    },
    {
      clave: 'F3',
      ruta: 'src/data/bahia-capitania-map.json',
      rol: 'id → Capitanía y teléfono; no declara ninguno de los campos comparables',
      ids: new Set(f3.keys()),
      campos: [],
      contenido: null,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// EL UNIVERSO DE IDS QUE SITPORT USA
//
// Medido el 2026-08-11: Totalpronostico publica el id 108, que consultaBahias NO
// lista. O sea que el endpoint de catálogo de SITPORT no es el superconjunto de
// los ids que la propia fuente usa. Por eso el universo es la UNIÓN de los tres
// endpoints y no el catálogo: compararse solo contra consultaBahias deja pasar
// exactamente el caso que hoy está vivo.
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINTS = [
  { clave: 'consultaBahias', campoId: r => r.IDBahia, campoNombre: r => r.NMBahia, esCatalogo: true },
  { clave: 'consultaRestricciones', campoId: r => r.bahia, campoNombre: r => r.GLBahia, esCatalogo: false },
  { clave: 'totalPronostico', campoId: r => r.idBahia, campoNombre: () => null, esCatalogo: false },
];

function universoSitport(capturas) {
  const universo = new Map(); // id → { id, nombre, endpoints:Set, registros:{} }
  for (const ep of ENDPOINTS) {
    const registros = capturas[ep.clave];
    if (!Array.isArray(registros)) {
      throw new ErrorCatalogoBahias(`la captura de ${ep.clave} no es un array — sin ella la comparación sería parcial y se leería como "sin divergencia"`);
    }
    for (const r of registros) {
      const id = ep.campoId(r);
      if (id === undefined || id === null) {
        throw new ErrorCatalogoBahias(`${ep.clave}: un registro llegó sin id de bahía — ${JSON.stringify(r).slice(0, 160)}`);
      }
      const n = Number(id);
      if (!Number.isInteger(n)) {
        throw new ErrorCatalogoBahias(`${ep.clave}: id de bahía no entero (${JSON.stringify(id)})`);
      }
      if (!universo.has(n)) universo.set(n, { id: n, nombre: null, endpoints: new Set(), conteo: {} });
      const e = universo.get(n);
      e.endpoints.add(ep.clave);
      e.conteo[ep.clave] = (e.conteo[ep.clave] || 0) + 1;
      if (!e.nombre) {
        const nom = ep.campoNombre(r);
        if (nom) e.nombre = String(nom).trim();
      }
    }
  }
  return universo;
}

// ─────────────────────────────────────────────────────────────────────────────
// LA DECLARACIÓN — la única forma de que una divergencia conocida no sea alarma
//
// Es dato, no código (§4.3). Y no silencia: una divergencia declarada se sigue
// listando en el informe; lo único que cambia es el código de salida. Una
// declaración que ya no corresponde a ninguna divergencia observada es un fallo,
// no un residuo inofensivo — se retira sola, igual que zonas_aviso.json.
// ─────────────────────────────────────────────────────────────────────────────

function validarDeclaracion(decl) {
  if (!decl || typeof decl !== 'object') {
    throw new ErrorCatalogoBahias('la declaración de divergencias no es un objeto');
  }
  for (const campo of ['version', 'actualizado', 'procedencia', 'fuentes_internas', 'divergencias']) {
    if (decl[campo] === undefined) {
      throw new ErrorCatalogoBahias(`la declaración no trae "${campo}"`);
    }
  }
  if (!Array.isArray(decl.divergencias)) {
    throw new ErrorCatalogoBahias('"divergencias" tiene que ser un array');
  }
  if (!Array.isArray(decl.fuentes_internas) || decl.fuentes_internas.length === 0) {
    throw new ErrorCatalogoBahias('"fuentes_internas" tiene que declarar contra qué fuentes se compara; sin eso, que falte una se leería como que no hay drift');
  }

  const vistas = new Set();
  for (const d of decl.divergencias) {
    const etq = `divergencia ${JSON.stringify(d).slice(0, 80)}`;
    if (!Number.isInteger(d.id_bahia)) {
      throw new ErrorCatalogoBahias(`${etq}: "id_bahia" ausente o no entero`);
    }
    if (!Object.prototype.hasOwnProperty.call(CLASES, d.clase)) {
      throw new ErrorCatalogoBahias(`id ${d.id_bahia}: clase "${d.clase}" desconocida — las válidas son ${Object.keys(CLASES).join(', ')}`);
    }
    if (!ESTADOS.includes(d.estado)) {
      throw new ErrorCatalogoBahias(`id ${d.id_bahia}: estado "${d.estado}" desconocido — los válidos son ${ESTADOS.join(', ')}`);
    }
    if (typeof d.causa !== 'string' || d.causa.trim() === '') {
      throw new ErrorCatalogoBahias(`id ${d.id_bahia}: una divergencia declarada sin causa escrita es un descarte silencioso con otro nombre`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.visto_desde || '')) {
      throw new ErrorCatalogoBahias(`id ${d.id_bahia}: "visto_desde" tiene que ser una fecha AAAA-MM-DD`);
    }
    if (d.clase === 'contenido_divergente') {
      if (!CAMPOS_CONTENIDO.includes(d.campo)) {
        throw new ErrorCatalogoBahias(`id ${d.id_bahia}: una divergencia de contenido tiene que declarar en qué campo — los comparables son ${CAMPOS_CONTENIDO.join(', ')}`);
      }
    } else if (d.campo !== undefined) {
      throw new ErrorCatalogoBahias(`id ${d.id_bahia}: "campo" solo tiene sentido en contenido_divergente, no en ${d.clase}`);
    }
    for (const k of Object.keys(d)) {
      if (!CAMPOS_DIVERGENCIA.includes(k)) {
        throw new ErrorCatalogoBahias(`id ${d.id_bahia}: campo "${k}" no reconocido — un campo mal escrito no se ignora`);
      }
    }
    if (d.estado === 'adjudicada') {
      const a = d.adjudicacion;
      if (!a || typeof a !== 'object') {
        throw new ErrorCatalogoBahias(`id ${d.id_bahia}: estado "adjudicada" sin bloque "adjudicacion"`);
      }
      for (const campo of ['fecha', 'quien', 'cita']) {
        if (typeof a[campo] !== 'string' || a[campo].trim() === '') {
          throw new ErrorCatalogoBahias(`id ${d.id_bahia}: la adjudicación no trae "${campo}"`);
        }
      }
    } else if (d.adjudicacion !== undefined) {
      throw new ErrorCatalogoBahias(`id ${d.id_bahia}: trae "adjudicacion" pero su estado es "${d.estado}"`);
    }

    const clave = claveDivergencia(d);
    if (vistas.has(clave)) {
      throw new ErrorCatalogoBahias(`${clave}: declarada dos veces`);
    }
    vistas.add(clave);
  }
  return decl;
}

// ─────────────────────────────────────────────────────────────────────────────
// LA COMPARACIÓN
// ─────────────────────────────────────────────────────────────────────────────

function compararCatalogos({ internas, capturas, declaracion }) {
  if (!Array.isArray(internas) || internas.length === 0) {
    throw new ErrorCatalogoBahias('no se recibió ninguna fuente interna — sin fuentes la comparación saldría vacía y se leería como "sin divergencia"');
  }
  for (const f of internas) {
    if (!f || !f.clave || !(f.ids instanceof Set)) {
      throw new ErrorCatalogoBahias(`fuente interna mal formada: ${JSON.stringify(f)}`);
    }
    if (f.ids.size === 0) {
      throw new ErrorCatalogoBahias(`la fuente interna ${f.clave} llegó vacía`);
    }
    // Cada fuente declara QUÉ campos aporta. Un array vacío es una declaración
    // ("esta no aporta ninguno"); que el campo falte sería un olvido que dejaría
    // la comparación de contenido corta sin que nadie se entere.
    if (!Array.isArray(f.campos)) {
      throw new ErrorCatalogoBahias(`la fuente interna ${f.clave} no declara "campos" — si no aporta ninguno tiene que decirlo con []`);
    }
    const desconocidos = f.campos.filter(c => !CAMPOS_CONTENIDO.includes(c));
    if (desconocidos.length > 0) {
      throw new ErrorCatalogoBahias(`la fuente interna ${f.clave} declara campo(s) que no se comparan: ${desconocidos.join(',')}`);
    }
    if (f.campos.length > 0 && !(f.contenido instanceof Map)) {
      throw new ErrorCatalogoBahias(`la fuente interna ${f.clave} declara campos (${f.campos.join(',')}) pero no trae contenido con qué compararlos`);
    }
  }
  validarDeclaracion(declaracion);

  // Las fuentes que se comparan son las declaradas, ni una menos ni una más. Que
  // una no se pueda leer no puede degradarse a "esa no la miramos": sería
  // exactamente el descarte silencioso que este control existe para impedir.
  const presentes = internas.map(f => f.clave).sort();
  const esperadas = [...declaracion.fuentes_internas].sort();
  const faltan = esperadas.filter(c => !presentes.includes(c));
  const sobran = presentes.filter(c => !esperadas.includes(c));
  if (faltan.length > 0 || sobran.length > 0) {
    throw new ErrorCatalogoBahias(
      `las fuentes internas comparadas no son las declaradas: ` +
      `${faltan.length ? `falta(n) ${faltan.join(',')}` : ''}` +
      `${faltan.length && sobran.length ? ' y ' : ''}` +
      `${sobran.length ? `sobra(n) ${sobran.join(',')}` : ''}`
    );
  }

  const universo = universoSitport(capturas);
  const idsSitport = new Set(universo.keys());

  const union = new Set();
  for (const f of internas) for (const id of f.ids) union.add(id);
  const interseccion = [...union].filter(id => internas.every(f => f.ids.has(id)));
  const setInterseccion = new Set(interseccion);

  const nombreDe = id => (universo.get(id) && universo.get(id).nombre) || null;
  const divergencias = [];

  // A — SITPORT publica un id que ninguna fuente interna conoce.
  for (const id of [...idsSitport].sort((a, b) => a - b)) {
    if (union.has(id)) continue;
    const e = universo.get(id);
    divergencias.push({
      clase: 'sitport_sin_catalogo', id_bahia: id, nombre_sitport: e.nombre,
      detalle: `visto en ${[...e.endpoints].join(', ')}`,
    });
  }

  // B — tenemos un id que SITPORT ya no publica por ninguna vía.
  for (const id of [...union].sort((a, b) => a - b)) {
    if (idsSitport.has(id)) continue;
    divergencias.push({
      clase: 'catalogo_sin_sitport', id_bahia: id, nombre_sitport: null,
      detalle: `presente en ${internas.filter(f => f.ids.has(id)).map(f => f.clave).join(', ')}`,
    });
  }

  // C — nuestras propias fuentes no coinciden entre sí.
  for (const id of [...union].sort((a, b) => a - b)) {
    if (setInterseccion.has(id)) continue;
    const tienen = internas.filter(f => f.ids.has(id)).map(f => f.clave);
    const noTienen = internas.filter(f => !f.ids.has(id)).map(f => f.clave);
    divergencias.push({
      clase: 'incoherencia_interna', id_bahia: id, nombre_sitport: nombreDe(id),
      detalle: `está en ${tienen.join(', ')} y falta en ${noTienen.join(', ')}`,
    });
  }

  // D — mismo id, contenido distinto entre copias. Es la que importa para el
  //     runtime: coincidir en QUÉ bahías hay no dice nada sobre DÓNDE están. Si
  //     la tabla que teselan las celdas tiene otra coordenada que el literal que
  //     usa el endpoint, el control aprobaría una cosa y el motor usaría otra.
  for (const id of [...interseccion].sort((a, b) => a - b)) {
    for (const campo of CAMPOS_CONTENIDO) {
      // Solo se comparan las fuentes que DECLARAN el campo. Una que no lo declara
      // no "vale null": no opina.
      const aportan = internas.filter(f => f.campos.includes(campo) && f.contenido.has(id));
      if (aportan.length < 2) continue;
      const valores = new Map(); // valor serializado → [claves de fuente]
      for (const f of aportan) {
        const v = f.contenido.get(id)[campo];
        const k = JSON.stringify(v === undefined ? null : v);
        if (!valores.has(k)) valores.set(k, []);
        valores.get(k).push(f.clave);
      }
      if (valores.size < 2) continue;
      divergencias.push({
        clase: 'contenido_divergente', id_bahia: id, campo, nombre_sitport: nombreDe(id),
        detalle: [...valores.entries()].map(([v, fuentes]) => `${fuentes.join('+')}=${v}`).join(' vs '),
      });
    }
  }

  // E — sobre la fuente, no sobre nosotros: SITPORT publica dato de un id que su
  //     propio endpoint de catálogo no lista.
  const catalogoDeclarado = new Set(
    [...universo.values()].filter(e => e.endpoints.has('consultaBahias')).map(e => e.id)
  );
  for (const id of [...idsSitport].sort((a, b) => a - b)) {
    if (catalogoDeclarado.has(id)) continue;
    const e = universo.get(id);
    divergencias.push({
      clase: 'endpoint_fuera_de_catalogo', id_bahia: id, nombre_sitport: e.nombre,
      detalle: `publicado por ${[...e.endpoints].join(', ')} y ausente de consultaBahias`,
    });
  }

  // Cruce contra la declaración.
  const porClave = new Map(declaracion.divergencias.map(d => [claveDivergencia(d), d]));
  const usadas = new Set();
  for (const d of divergencias) {
    const clave = claveDivergencia(d);
    const decl = porClave.get(clave);
    if (!decl) { d.declarada = false; d.estado = 'no_declarada'; continue; }
    usadas.add(clave);
    d.declarada = true;
    d.estado = decl.estado;
    d.causa = decl.causa;
    d.visto_desde = decl.visto_desde;
    d.adjudicacion = decl.adjudicacion || null;
  }

  const vencidas = declaracion.divergencias
    .filter(d => !usadas.has(claveDivergencia(d)))
    .map(d => ({ clase: d.clase, id_bahia: d.id_bahia, campo: d.campo || null, causa: d.causa }));

  const noDeclaradas = divergencias.filter(d => !d.declarada);
  const abiertas = divergencias.filter(d => d.declarada && d.estado === 'abierta');
  const adjudicadas = divergencias.filter(d => d.declarada && d.estado === 'adjudicada');

  return {
    fuentes_internas: internas.map(f => ({
      clave: f.clave, ruta: f.ruta, rol: f.rol, n: f.ids.size, campos: f.campos,
    })),
    sitport: {
      por_endpoint: ENDPOINTS.map(ep => ({
        endpoint: ep.clave,
        registros: capturas[ep.clave].length,
        ids: new Set(capturas[ep.clave].map(ep.campoId).map(Number)).size,
      })),
      universo: idsSitport.size,
    },
    divergencias,
    vencidas,
    resumen: {
      total: divergencias.length,
      no_declaradas: noDeclaradas.length,
      abiertas: abiertas.length,
      adjudicadas: adjudicadas.length,
      declaraciones_vencidas: vencidas.length,
    },
    // El veredicto NO dice qué debe hacer el motor. Dice si el control pasa.
    veredicto: (noDeclaradas.length > 0 || vencidas.length > 0)
      ? 'DRIFT_NO_DECLARADO'
      : (abiertas.length > 0 ? 'DRIFT_DECLARADO_ABIERTO' : 'SIN_DRIFT'),
  };
}

const CODIGO_SALIDA = {
  SIN_DRIFT: 0,
  DRIFT_NO_DECLARADO: 1,
  NO_SE_PUDO_MEDIR: 2,
  DRIFT_DECLARADO_ABIERTO: 3,
};

module.exports = {
  ErrorCatalogoBahias,
  CLASES, ESTADOS, CODIGO_SALIDA, CAMPOS_CONTENIDO, claveDivergencia,
  leerBahiaCoords, leerMapaCapitanias, leerFuentesInternas,
  universoSitport, validarDeclaracion, compararCatalogos,
};
