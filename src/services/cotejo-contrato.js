'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// cotejo-contrato.js — el dato transcrito, cotejado contra el contrato.
//
// POR QUE EXISTE, y es un caso real de este repositorio, no una hipotesis:
// `data/decreto/zonas_aviso.json` declara en su propia `procedencia` que su
// texto esta TRANSCRITO del §10 de CONTRATO_MOTOR.md y que "si el catalogo
// cambia, cambia aca y se nota". El 2026-08-13 el catalogo cambio —la v1.8 le
// saco el telefono a la fila— y NO se noto: el dato siguio sirviendo el texto de
// la v1.7 hasta que una medicion lo encontro a mano. La promesa estaba escrita y
// no habia nada que la sostuviera.
//
// HERMANO DE §7.2 DEL PLAN, NO UNA EXTENSION SUYA. La distincion importa y por
// eso queda escrita acá:
//
//   · §7.2 vigila que el PLAN no mienta sobre el REPOSITORIO;
//   · esto vigila que un DATO no divergisa del CONTRATO.
//
// Distinto alcance, misma forma. Estirar §7.2 para meter esto adentro seria
// exactamente el error que §7.2 nombra: "construir solo este y darse por
// cubierto". Lo que SI se copia, punto por punto, porque se midio aplicable:
// afirmaciones declaradas en el dato y no deducidas de la prosa, el tipo
// `linea_dice`, la semantica de salida de E0.1, y mordida con control negativo
// primero.
//
// UNA COSA DE LA PROPUESTA QUE NO SE SOSTUVO AL CONSTRUIRLA, dicha en vez de
// acomodada: la propuesta decia que el control "lee `mensaje.procedencia` y
// ubica con eso la fila". `procedencia` es PROSA — ubicar la fila parseandola
// seria deducir la afirmacion del texto, que es justo lo que §7.2 prohibe. La
// fila se declara en `cotejo_con_el_contrato.fila`, legible por maquina, y
// `procedencia` queda como lo que es: el motivo, para quien lee.
//
// COMO SE UBICA LA FILA, y por que asi: por su ETIQUETA —la primera celda—, no
// por numero de seccion. El contrato hoy tiene dos secciones numeradas 5.1
// (`### 5.1` e `### INV-5.1`), lo que muestra que los numeros se pisan; la
// etiqueta de la fila, en cambio, es unica —comprobado— y sobrevive a que el
// §10 se mueva de lugar. Si apareciera mas de una fila con la misma etiqueta,
// esto se detiene: dos filas candidatas no son una afirmacion verificable.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const RUTA_CONTRATO = path.join(RAIZ, 'CONTRATO_MOTOR.md');
const RUTA_DECL = path.join(RAIZ, 'data', 'decreto', 'zonas_aviso.json');

// Semantica de salida de E0.1, para que "hay divergencia" no se confunda con
// "algo se rompio". La usa el script; el test mira `estado`.
const SALIDA = {
  ok: 0,                    // el dato dice lo que el contrato dice
  divergencia: 1,           // difieren, y nadie lo declaro
  no_medible: 2,            // no se pudo comparar (fila ausente, dato ilegible)
};

class ErrorCotejo extends Error {
  constructor(m) { super(`[cotejo-contrato] ${m}`); this.name = 'ErrorCotejo'; }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAS TRES REGLAS DE NORMALIZACION. Son las minimas para que dos textos que
// dicen lo mismo se comparen iguales, y ninguna borra contenido:
//
//   1. NEGRITAS      el contrato marca `**...**` porque es markdown; el dato es
//                    texto plano. Se quitan los asteriscos, no lo que envuelven.
//   2. MARCAS        el catalogo escribe los huecos como `[nombre]` y el dato
//                    como `{nombre}`, porque el dato los sustituye en runtime.
//                    Se unifican a `{...}`.
//   3. COMILLAS      la celda del contrato entrecomilla el texto. Actua distinto
//                    en las dos celdas y por eso se declara por celda: en la de
//                    capa 1 hay texto FUERA de las comillas (la bandera), asi que
//                    se EXTRAE lo entrecomillado; en la de capa 2 la celda entera
//                    esta entre comillas, asi que se QUITAN las envolventes.
//
// Medido el 2026-08-13: con estas tres y el recorte de la celda alcanza — no
// hace falta colapsar espacios internos, los textos calzan sin eso.
// ─────────────────────────────────────────────────────────────────────────────
const quitarNegritas = s => s.replace(/\*\*/g, '');
const unificarMarcas = s => s.replace(/\[([a-z_]+)\]/g, '{$1}');
const entrecomillado = s => { const m = s.match(/"([^"]*)"/); return m ? m[1] : null; };
const sinComillasEnvolventes = s => s.replace(/^"/, '').replace(/"$/, '');

function normalizar(texto, extraer) {
  const base = quitarNegritas(unificarMarcas((texto || '').trim()));
  if (extraer === 'entrecomillado') return entrecomillado(base);
  if (extraer === 'celda') return sinComillasEnvolventes(base).trim();
  if (extraer === 'bandera') {
    // `🟡 U "No tenemos..."` -> `U`. Es el nivel que la celda declara, y el
    // motor tiene su propia constante: si dejan de coincidir, INV-3.6 tendria
    // dos topes distintos segun donde se mire.
    const antes = base.split('"')[0];
    const m = antes.match(/\b(Q|U\+V|UV|U)\b/);
    return m ? m[1] : null;
  }
  throw new ErrorCotejo(`modo de extraccion desconocido: '${extraer}'. No hay caso por defecto.`);
}

/** Las celdas de la fila del catalogo cuya etiqueta (primera celda) coincide. */
function filaDelCatalogo(textoContrato, etiqueta) {
  const lineas = textoContrato.split(/\r?\n/);
  const candidatas = lineas.filter(l => {
    if (!l.startsWith('|')) return false;
    const primera = quitarNegritas(l.split('|')[1] || '').trim();
    return primera === etiqueta;
  });
  if (candidatas.length === 0) {
    throw new ErrorCotejo(
      `el contrato no tiene ninguna fila con la etiqueta '${etiqueta}'. La declaracion la nombra en ` +
      `'cotejo_con_el_contrato.fila': o la fila se renombro y hay que actualizar la declaracion, o se ` +
      `borro y el dato transcribe un texto que ya no existe.`);
  }
  if (candidatas.length > 1) {
    throw new ErrorCotejo(
      `el contrato tiene ${candidatas.length} filas con la etiqueta '${etiqueta}'. Dos candidatas no son ` +
      `una afirmacion verificable: no se elige una.`);
  }
  const celdas = candidatas[0].split('|').map(s => s.trim());
  // [0] vacio | [1] etiqueta | [2] capa 1 | [3] capa 2 | [4] vacio
  return { capa_1: celdas[2], capa_2: celdas[3], cruda: candidatas[0] };
}

/**
 * Cotejo puro sobre los dos textos ya leidos, mas el valor del codigo que la
 * declaracion pida. Funcion pura para que la mordida la ejerza con variantes en
 * memoria sin copiar ninguna regla al test (§7.2, y lo que ya hacen los guards
 * de E1 y del cableado de E3).
 *
 * @param {object} decl        el contenido de zonas_aviso.json
 * @param {string} contrato    el texto de CONTRATO_MOTOR.md
 * @param {object} valoresCodigo  { BANDERA_AVISO: 'U', ... }
 */
function cotejar(decl, contrato, valoresCodigo) {
  const c = decl && decl.cotejo_con_el_contrato;
  if (!c || typeof c !== 'object') {
    throw new ErrorCotejo(
      `zonas_aviso.json no trae el bloque 'cotejo_con_el_contrato'. Sin el no se sabe QUE fila del ` +
      `contrato transcribe este dato, y el cotejo no se supone: se declara.`);
  }
  if (typeof c.fila !== 'string' || !c.fila.trim()) {
    throw new ErrorCotejo(`'cotejo_con_el_contrato.fila' ausente o vacia: es la etiqueta que ubica la fila.`);
  }
  if (!Array.isArray(c.afirmaciones) || c.afirmaciones.length === 0) {
    throw new ErrorCotejo(`'cotejo_con_el_contrato.afirmaciones' tiene que ser un arreglo no vacio.`);
  }

  const fila = filaDelCatalogo(contrato, c.fila);
  const resultados = [];

  for (const a of c.afirmaciones) {
    if (a.tipo !== 'linea_dice') {
      throw new ErrorCotejo(`afirmacion de tipo '${a.tipo}' desconocido. Aceptado: linea_dice. No hay caso por defecto.`);
    }
    if (!(a.celda in fila)) {
      throw new ErrorCotejo(`la afirmacion apunta a la celda '${a.celda}', que la fila no tiene.`);
    }

    const esperado = normalizar(fila[a.celda], a.extraer);
    if (esperado === null) {
      throw new ErrorCotejo(
        `no se pudo extraer '${a.extraer}' de la celda '${a.celda}' de la fila '${c.fila}'. ` +
        `La celda cambio de forma y el cotejo no puede afirmar nada.`);
    }

    let obtenido;
    if (a.origen === 'dato') {
      obtenido = a.campo.split('.').reduce((o, k) => (o == null ? o : o[k]), decl);
      if (typeof obtenido !== 'string') {
        throw new ErrorCotejo(`el campo '${a.campo}' del dato no es texto; no se puede cotejar.`);
      }
      obtenido = obtenido.trim();
    } else if (a.origen === 'codigo') {
      if (!(a.campo in (valoresCodigo || {}))) {
        throw new ErrorCotejo(`la afirmacion pide el valor de codigo '${a.campo}' y no se le paso.`);
      }
      obtenido = String(valoresCodigo[a.campo]);
    } else {
      throw new ErrorCotejo(`origen '${a.origen}' desconocido. Aceptados: dato, codigo.`);
    }

    resultados.push({
      nombre: a.nombre, origen: a.origen, campo: a.campo, celda: a.celda,
      esperado, obtenido, coincide: esperado === obtenido,
    });
  }

  const divergencias = resultados.filter(r => !r.coincide);
  return {
    estado: divergencias.length === 0 ? 'ok' : 'divergencia',
    fila: c.fila,
    resultados,
    divergencias,
    salida: divergencias.length === 0 ? SALIDA.ok : SALIDA.divergencia,
  };
}

/** El cotejo real, leyendo los dos archivos del disco. */
function cotejarReal() {
  const decl = JSON.parse(fs.readFileSync(RUTA_DECL, 'utf8'));
  const contrato = fs.readFileSync(RUTA_CONTRATO, 'utf8');
  const { BANDERA_AVISO } = require('./cobertura-jurisdiccional');
  return cotejar(decl, contrato, { BANDERA_AVISO });
}

module.exports = {
  cotejar, cotejarReal, filaDelCatalogo, normalizar,
  SALIDA, ErrorCotejo, RUTA_CONTRATO, RUTA_DECL,
};
