'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// drift-ambito-a.js — A3, aprobada por el owner el 2026-08-11.
//
// Cuando SITPORT publica un dato de viaje —restricción o pronóstico— bajo una
// bahía que nuestro catálogo no conoce, ese dato hoy se descarta en silencio
// (sitport-routes.js:666 y :383). Es un falso negativo de seguridad: el patrón ve
// menos severidad de la que la fuente publica.
//
// A3: se avisa, y el aviso **escala el veredicto a U, nunca a U+V**. El tope es
// duro y está en el código, no en la configuración. La ausencia de dato no es una
// prohibición — mismo razonamiento y misma forma que INV-3.6 ya fijó para la
// jurisdicción sin geometría, y por eso el aviso va en su PROPIO bloque y nunca
// entre las restricciones de INV-1.2.
//
// Lo que hace que el aviso se pueda acotar a la ruta: aunque una bahía en drift
// no tenga coordenada, SITPORT sí dice de qué **Capitanía** es
// (consultaCapuertoRestriccion + Totalgeneral). La Capitanía es la unidad que
// INV-3.3 manda, así que con eso alcanza para saber si la ruta la cruza.
//
// A3 rige mientras no esté la consulta formal a DIRECTEMAR, que el owner gestiona
// por fuera. Es lo provisorio hecho bien, no la solución de fondo.
// ─────────────────────────────────────────────────────────────────────────────

const BANDERA_MAXIMA = 'U'; // TOPE DURO. No se parametriza: A3 dice "nunca UV".

const CAUSAS = {
  en_ruta: 'la Capitanía de la bahía está en la ruta',
  no_ubicable: 'no se pudo resolver de qué Capitanía es la bahía',
};

const norm = s => (s || '').toString().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// ─────────────────────────────────────────────────────────────────────────────
// Resolutor: idBahia -> Capitanía, con lo que publica la propia fuente.
//   consultaBahias.CdReparticion  ─┐
//                                  ├─ consultaCapuertoRestriccion.Cdreparticion
//   Totalgeneral.reparticion.id   ─┘
// Totalgeneral además dice qué bahía mide cada Capitanía, que es la única vía
// para un id que consultaBahias no lista (el caso de la 108).
// ─────────────────────────────────────────────────────────────────────────────
function construirResolutorCapitania({ consultaBahias, consultaCapuertoRestriccion, totalGeneral }) {
  const porReparticion = new Map();
  for (const r of consultaCapuertoRestriccion || []) {
    if (r && r.Cdreparticion != null) porReparticion.set(Number(r.Cdreparticion), r.NMBahia || null);
  }

  const porBahia = new Map();
  for (const b of consultaBahias || []) {
    if (!b || b.IDBahia == null) continue;
    const cap = porReparticion.get(Number(b.CdReparticion));
    if (cap) porBahia.set(Number(b.IDBahia), { capitania: cap, via: 'consultaBahias', reparticion: Number(b.CdReparticion) });
  }
  for (const t of totalGeneral || []) {
    const id = t && t.medicionMeteo && t.medicionMeteo.idBahia;
    const rep = t && t.reparticion;
    if (id == null || !rep || !rep.nombre) continue;
    if (!porBahia.has(Number(id))) {
      porBahia.set(Number(id), { capitania: rep.nombre, via: 'Totalgeneral', reparticion: rep.id != null ? Number(rep.id) : null });
    }
  }

  return function resolver(idBahia) {
    return porBahia.get(Number(idBahia)) || null;
  };
}

// La pertenencia se decide por CÓDIGO DE REPARTICIÓN, no por nombre.
//
// El primer intento comparaba nombres —SITPORT dice "CAPITANÍA DE PUERTO LAGO
// GRAL.CARRERA" y el mapa operativo "Lago General Carrera"— y fallaba hacia el
// lado equivocado: al no calzar, la bahía quedaba "fuera de la ruta" y el aviso
// NO se emitía. Un error de abreviatura apagaba un aviso de seguridad.
// El código de repartición es entero, lo publica la propia fuente para los dos
// lados de la comparación, y no admite abreviaturas.
function reparticionesDeRuta(idsEnRuta, resolver) {
  const reps = new Set();
  for (const id of idsEnRuta) {
    const r = resolver ? resolver(id) : null;
    if (r && r.reparticion != null) reps.add(r.reparticion);
  }
  return reps;
}

// ─────────────────────────────────────────────────────────────────────────────
// El detector.
//
//   registros           — los registros de SITPORT cuya bahía el catálogo no
//                         conoce, cada uno con { id_bahia, origen, nombre? }
//   idsEnRuta           — ids de bahía que la ruta sí matcheó
//   resolver            — construirResolutorCapitania(...)
//
// Devuelve SIEMPRE un estado explícito. Si no se pudo evaluar, lo dice: lo que no
// puede pasar es que un fallo se lea como "no hay nada que avisar".
// ─────────────────────────────────────────────────────────────────────────────
function evaluarDriftEnRuta({ registros, idsEnRuta, resolver }) {
  const avisos = [];
  const defectos = [];
  const repsEnRuta = reparticionesDeRuta(idsEnRuta || [], resolver);

  const porBahia = new Map();
  for (const r of registros || []) {
    const id = Number(r.id_bahia);
    if (!Number.isInteger(id)) continue;
    if (!porBahia.has(id)) porBahia.set(id, { id_bahia: id, origenes: new Set(), nombre: r.nombre || null });
    const e = porBahia.get(id);
    e.origenes.add(r.origen);
    if (!e.nombre && r.nombre) e.nombre = r.nombre;
  }

  for (const e of [...porBahia.values()].sort((a, b) => a.id_bahia - b.id_bahia)) {
    const resuelto = resolver ? resolver(e.id_bahia) : null;
    const base = {
      id_bahia: e.id_bahia,
      nombre_sitport: e.nombre,
      origenes: [...e.origenes],
      capitania_sitport: resuelto ? resuelto.capitania : null,
      reparticion: resuelto ? resuelto.reparticion : null,
      via_resolucion: resuelto ? resuelto.via : null,
    };

    if (!resuelto || resuelto.reparticion == null) {
      // No se puede descartar que esté en la ruta. El lado conservador es avisar.
      avisos.push({ ...base, causa: 'no_ubicable', detalle: CAUSAS.no_ubicable, bandera: BANDERA_MAXIMA });
      defectos.push({ ...base, tipo: 'bahia_sin_capitania_resoluble' });
      continue;
    }

    if (repsEnRuta.has(resuelto.reparticion)) {
      avisos.push({ ...base, causa: 'en_ruta', detalle: CAUSAS.en_ruta, bandera: BANDERA_MAXIMA });
      defectos.push({ ...base, tipo: 'bahia_publicada_fuera_del_catalogo' });
    } else {
      // Está en otra Capitanía: al patrón no le falta nada de SU viaje. Igual
      // queda registrado como defecto — es dato de la fuente que no podemos leer.
      defectos.push({ ...base, tipo: 'bahia_publicada_fuera_del_catalogo', fuera_de_ruta: true });
    }
  }

  const bandera = avisos.length > 0 ? BANDERA_MAXIMA : 'Q';
  return {
    estado: 'evaluado',
    motivo: null,
    bandera,
    avisos,
    total: avisos.length,
    defectos_registrados: defectos.length,
    defectos,
  };
}

function noEvaluado(motivo) {
  return {
    estado: 'no_evaluado', motivo,
    bandera: null, avisos: [], total: 0, defectos_registrados: 0, defectos: [],
  };
}

// Composición del veredicto. El aporte del drift está topado en U POR
// CONSTRUCCIÓN: aunque llegara otra cosa, esta función no puede devolver UV por
// causa del drift.
const RANGO = { Q: 0, U: 1, UV: 2 };
function componerConDrift(banderaPrevia, banderaDrift) {
  const previa = RANGO[banderaPrevia] != null ? banderaPrevia : 'Q';
  if (!banderaDrift || banderaDrift === 'Q') return previa;
  const aporte = RANGO[banderaDrift] > RANGO[BANDERA_MAXIMA] ? BANDERA_MAXIMA : banderaDrift;
  return RANGO[aporte] > RANGO[previa] ? aporte : previa;
}

module.exports = {
  BANDERA_MAXIMA,
  construirResolutorCapitania,
  reparticionesDeRuta,
  evaluarDriftEnRuta,
  noEvaluado,
  componerConDrift,
};
