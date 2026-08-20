// Valida data/deudas/deudas_declaradas.json. npm run deudas.
//
// QUE VALIDA: el declarativo. Estructura, cobertura, grupos y campos por grupo.
// QUE NO VALIDA: cada fila contra su arbol de origen. Re-verificar una fila de
// tmarea-pwa contra tmarea-pwa exigiria una ruta al otro repositorio -- absoluta
// (rompe en cualquier otro clon), por convencion de directorio hermano (fragil)
// o por variable de entorno (puede faltar) -- y un validador que no encuentra el
// otro arbol o miente en verde o falla por algo que no es su asunto. Re-verificar
// es otro instrumento, de otra sesion.
//
// Sale 0 en verde y 1 en rojo. Falla ruidoso: enumera TODOS los fallos, no el primero.

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

// Ruta por argumento, con la ruta versionada por defecto. Existe para que la
// prueba de mordida pueda apuntarlo a una COPIA mutada sin tocar el fichero real:
// un control que solo sabe mirar su propio fichero no se puede probar en rojo.
const iArg = process.argv.indexOf('--fichero');
const FICHERO = iArg !== -1 && process.argv[iArg + 1]
  ? path.resolve(process.argv[iArg + 1])
  : path.join(RAIZ, 'data', 'deudas', 'deudas_declaradas.json');

// ---------------------------------------------------------------------------
// LA CANON DE LOS DIECISIETE SITIOS.
//
// Vive ACA y no en el dato, y el motivo es el unico que importa: si la lista de
// sitios esperados viviera dentro del propio declarativo, borrar un sitio de la
// cobertura borraria tambien la expectativa, y el fichero volveria a leerse como
// completo sin que nada mordiera. Al vivir en el control, quitar un sitio exige
// tocar ESTE fichero, y eso deja diff.
//
// Procedencia: DIECISEIS medidos el 2026-08-19 en la sesion de caracterizacion de
// deudas. Son los doce sitios del backend (7.1 partido en dos por la medicion),
// los tres de tmarea-pwa y el de la propia sesion. "6. RIESGOS" quedo FUERA por
// decision del owner: un riesgo mitigado no es una deuda y confunde el
// denominador.
//
// EL DECIMOSEPTIMO, 'PLAN-2', se agrega el 2026-08-20. No aparecio en la medicion
// del 2026-08-19 porque §2 no es una LISTA de deudas: es la especificacion, y
// nadie la habia contrastado nunca contra la app. Al contrastarla produjo 13
// filas. Que un sitio de deuda pueda ser un documento que no declara ninguna
// deuda —y que aun asi las genere al medirlo— es el motivo por el que se agrega
// con esta nota y a los DOS lados, en vez de sumarse en silencio.
// ---------------------------------------------------------------------------
const SITIOS_CANON = [
  'PLAN-2',
  'PLAN-7-TABLA',
  'PLAN-7.1-FILTRO',
  'PLAN-7.1-CONTACTO-CIERRE',
  'PLAN-7.2',
  'PLAN-3-E8',
  'CLAUDE-MD',
  'BITACORAS-HD',
  'PLAN-9',
  'PLAN-5-DECISIONES',
  'DIRECTEMAR-REGISTRO',
  'JOIN-SIN-RESOLVER',
  'DIVERGENCIAS-DECLARADAS',
  'PWA-COMENTARIOS',
  'PWA-SIN-ANOTAR',
  'PWA-DOCS',
  'SESION-caracterizacion-deudas-2026-08-19',
  'SESION-tres-de-d4-2026-08-20',
  'SESION-limite-puerto-12100-47-2026-08-20',
  'SESION-plan-de-cierre-2026-08-20',
];

const GRUPOS = {
  '1_cierra_con_lo_que_hay': ['costo_estimado', 'depende_de'],
  '2_decision_del_owner': ['pregunta'],
  '3_dato_externo': ['que_dato', 'a_quien'],
  '4_caduca': ['medicion', 'afirmacion_que_ya_es_falsa'],
  '5_obsoleta': ['que_cambio', 'que_se_perderia_si_no_se_hace'],
  '6_se_descarta': ['motivo'],
};

const GRUPOS_PROPUESTA = ['5_obsoleta', '6_se_descarta'];

// El estado es ORTOGONAL al grupo. El grupo dice QUE HACE FALTA para cerrarla; el
// estado dice si ya se hizo. Una fila cerrada NO SE BORRA: se queda con estado
// 'cerrada', porque borrarla haria bajar el total sin dejar rastro de por que, y
// una lista de deudas cuyo total baja sin rastro es indistinguible de una lista a
// la que le sacaron filas.
const ESTADOS = ['viva', 'cerrada', 'caduca', 'propuesta_obsoleta', 'propuesta_descartada'];
const ESTADOS_NO_VIVOS = ['cerrada', 'caduca'];

// Una pregunta del grupo 2 tiene que poder contestarse SIN abrir el repositorio.
const OLOR_A_REPOSITORIO = /(^|[\s(`'"/])(src|data|scripts|geodata|_bitacoras)\/|\.(json|js|jsx|py|sql|md)\b/;

const fallos = [];
const avisos = [];
const F = (control, msg) => fallos.push('[' + control + '] ' + msg);

if (!fs.existsSync(FICHERO)) {
  console.error('ALTO: no existe ' + path.relative(RAIZ, FICHERO));
  process.exit(1);
}

// --- caracteres de control, ANTES de parsear ---------------------------------
// El orden importa y costo una mordida en rojo: si esto corriera despues del
// JSON.parse, un caracter de control que ADEMAS rompe el parseo saldria como
// "no es JSON valido" y la causa verdadera quedaria tapada por un mensaje
// generico. Se mide primero y se diagnostica por su nombre.
//
// CRITERIO CORREGIDO por el hueco H-T2: el criterio viejo miraba BYTES < 0x20, y
// U+0091 en UTF-8 son dos bytes -- C2 91 -- y ninguno es < 0x20. Este decodifica
// el fichero como UTF-8 e inspecciona PUNTOS DE CODIGO: cp < 0x20 salvo LF y CR,
// cp == 0x7F, y todo el rango C1 (0x80..0x9F), que es donde vive U+0091.
function controlesRaros(texto) {
  const malos = [];
  for (const ch of texto) {
    const cp = ch.codePointAt(0);
    const raro = (cp < 0x20 && cp !== 0x0A && cp !== 0x0D) || cp === 0x7F || (cp >= 0x80 && cp <= 0x9F);
    if (raro) malos.push('U+' + cp.toString(16).toUpperCase().padStart(4, '0'));
  }
  return malos;
}

const crudo = fs.readFileSync(FICHERO, 'utf8');
if (crudo.charCodeAt(0) === 0xFEFF) F('CARACTERES', 'el fichero arranca con BOM UTF-8');
const raros = controlesRaros(crudo);
if (raros.length)
  F('CARACTERES', 'el fichero trae ' + raros.length + ' caracter(es) de control fuera de LF/CR: ' +
    [...new Set(raros)].join(' '));

let D;
try {
  D = JSON.parse(crudo.charCodeAt(0) === 0xFEFF ? crudo.slice(1) : crudo);
} catch (e) {
  if (fallos.length) {
    console.log('ROJO -- ' + fallos.length + ' fallo(s):');
    fallos.forEach(f => console.log('  ' + f));
    console.log('  [ESTRUCTURA] ademas no parsea como JSON -- ' + e.message);
    console.log('  (el diagnostico de caracteres va primero a proposito: es la causa, no el sintoma)');
    process.exit(1);
  }
  console.error('ALTO: ' + path.relative(RAIZ, FICHERO) + ' no es JSON valido -- ' + e.message);
  process.exit(1);
}

console.log('VALIDADOR DEL DECLARATIVO DE DEUDAS');
console.log('fichero : ' + path.relative(RAIZ, FICHERO).replace(/\\/g, '/'));
console.log('version : ' + D.version + '   generado: ' + D.generado);
console.log('');

// --- estructura minima --------------------------------------------------------
for (const k of ['_que_es', '_que_no_es', '_como_se_lee', 'version', 'generado',
                 'procedencia', 'repos', 'vocabulario_de_grupos', 'politica_de_firma',
                 'politica_de_duplicados', 'cobertura', 'deudas']) {
  if (D[k] === undefined) F('ESTRUCTURA', 'falta la clave de nivel 1 "' + k + '"');
}
if (!D.cobertura || !Array.isArray(D.cobertura.sitios)) {
  console.error('ALTO: cobertura.sitios no es un array. No se puede validar nada mas.');
  process.exit(1);
}
if (!Array.isArray(D.deudas)) {
  console.error('ALTO: deudas no es un array.');
  process.exit(1);
}

const sitios = D.cobertura.sitios;
const idsSitio = sitios.map(s => s.id);

// --- V5 · la lista de los dieciseis esta completa ------------------------------
const faltan = SITIOS_CANON.filter(s => !idsSitio.includes(s));
const sobran = idsSitio.filter(s => !SITIOS_CANON.includes(s));
faltan.forEach(s => F('V5', 'el sitio "' + s + '" de la canon NO esta en cobertura.sitios. ' +
  'Sin el, el declarativo se leeria como completo dejando un sitio fuera.'));
sobran.forEach(s => F('V5', 'el sitio "' + s + '" esta en cobertura.sitios y NO esta en la canon del validador. ' +
  'Un sitio nuevo se agrega a los DOS lados, a proposito.'));
const dupSitio = idsSitio.filter((s, i) => idsSitio.indexOf(s) !== i);
dupSitio.forEach(s => F('V5', 'el sitio "' + s + '" esta repetido en cobertura.sitios'));

// --- por sitio: V1, V3, V4, V6 -------------------------------------------------
const filasPorSitio = {};
D.deudas.forEach(d => { filasPorSitio[d.sitio] = (filasPorSitio[d.sitio] || 0) + 1; });

for (const s of sitios) {
  const reales = filasPorSitio[s.id] || 0;
  const decl = s.filas_en_este_declarativo;

  if (typeof decl !== 'number') {
    F('V4', s.id + ': filas_en_este_declarativo no es un numero');
  } else if (decl !== reales) {
    F('V4', s.id + ': declara ' + decl + ' filas y tiene ' + reales + '. ' +
      'Un tramo cortado a mitad se ve exactamente asi.');
  }

  if (s.barrido === true) {
    if (!s.barrido_el) F('V6', s.id + ': barrido=true sin barrido_el. Un barrido sin fecha no es un barrido.');
    if (!s.bitacora) F('V6', s.id + ': barrido=true sin bitacora citada.');

    if (reales === 0) {
      const v = s.vacio_verificado;
      if (!v) {
        F('V1', s.id + ': barrido=true con 0 filas y sin vacio_verificado. ' +
          'O el barrido no se hizo, o el cero no esta probado.');
      } else {
        if (!Array.isArray(s.vocabulario_del_barrido) || s.vocabulario_del_barrido.length === 0)
          F('V1', s.id + ': vacio_verificado sin vocabulario_del_barrido.');
        if (!v.conteos || Object.keys(v.conteos).length === 0)
          F('V1', s.id + ': vacio_verificado sin conteos por termino.');
        if (!Array.isArray(v.controles_positivos) || v.controles_positivos.length === 0)
          F('V1', s.id + ': vacio_verificado sin control positivo. ' +
            'Un control que pasa por no haber mirado no es un control.');
        else {
          const noCero = Object.entries(v.conteos || {}).filter(([, n]) => n !== 0);
          if (noCero.length)
            F('V1', s.id + ': vacio_verificado declara conteos distintos de 0 (' +
              noCero.map(([k, n]) => k + '=' + n).join(', ') + ') y no hay filas.');
        }
      }
    }
  } else if (s.barrido === false) {
    if (reales > 0)
      F('V3', s.id + ': barrido=false y tiene ' + reales + ' fila(s). ' +
        'Un sitio no se barre en silencio: la cobertura estaria mintiendo al reves.');
    if (s.barrido_el) F('V6', s.id + ': barrido=false con barrido_el puesto.');
  } else {
    F('V6', s.id + ': barrido no es true ni false.');
  }
}

// --- por fila: V2 y V7 ---------------------------------------------------------
const vistos = new Set();
const idsDeuda = new Set(D.deudas.map(d => d.id));

for (const d of D.deudas) {
  const yo = d.id || '(fila sin id)';

  if (!d.id) F('V7', 'hay una fila sin id');
  else if (vistos.has(d.id)) F('V7', 'id duplicado: ' + d.id);
  else vistos.add(d.id);

  if (!d.sitio) F('V2', yo + ': sin campo sitio');
  else if (!idsSitio.includes(d.sitio))
    F('V2', yo + ': su sitio "' + d.sitio + '" no esta en cobertura.sitios. Entro de contrabando.');

  if (!d.repo) F('V7', yo + ': sin campo repo');
  else if (!D.repos || !D.repos[d.repo]) F('V7', yo + ': repo "' + d.repo + '" no declarado en repos');

  // texto literal, o su ausencia declarada -- nunca los dos, nunca ninguno
  const tieneTexto = typeof d.texto_literal === 'string' && d.texto_literal.length > 0;
  const sinTexto = d.sin_texto === true;
  if (tieneTexto && sinTexto)
    F('V7', yo + ': trae texto_literal Y sin_texto=true. Son excluyentes.');
  if (!tieneTexto && !sinTexto)
    F('V7', yo + ': sin texto_literal y sin sin_texto=true. Toda fila declara una cosa o la otra.');
  if (sinTexto && (!d.evidencia_en_el_arbol || Object.keys(d.evidencia_en_el_arbol).length === 0))
    F('V7', yo + ': sin_texto=true sin evidencia_en_el_arbol. ' +
      'Una deuda que nunca se escribio necesita lo que la muestra.');

  // donde, por seccion y texto -- nunca por numero de linea
  if (!d.donde || !d.donde.fichero || !d.donde.seccion_por_titulo || !d.donde.cita_de_anclaje)
    F('V7', yo + ': donde incompleto (exige fichero, seccion_por_titulo y cita_de_anclaje)');

  // fecha: la dice, o dice que no la dice
  if (d.abierta_el_lo_dice_el_documento === true) {
    if (!d.abierta_el) F('V7', yo + ': dice que el documento fecha la deuda y abierta_el esta vacio');
  } else if (d.abierta_el_lo_dice_el_documento === false) {
    if (d.abierta_el !== null) F('V7', yo + ': el documento no la fecha, asi que abierta_el tiene que ser null');
    if (!d.nota_fecha) F('V7', yo + ': el documento no la fecha y falta nota_fecha diciendolo');
  } else {
    F('V7', yo + ': abierta_el_lo_dice_el_documento no es true ni false');
  }

  // grupo, y los campos que ese grupo exige
  if (!d.grupo) { F('V7', yo + ': SIN GRUPO. Ninguna fila queda sin grupo.'); continue; }
  if (!GRUPOS[d.grupo]) { F('V7', yo + ': grupo "' + d.grupo + '" fuera del vocabulario'); continue; }
  for (const campo of GRUPOS[d.grupo]) {
    const v = d[campo];
    const vacio = v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ||
                  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
    if (vacio) F('V7', yo + ': grupo ' + d.grupo + ' exige "' + campo + '" y esta vacio');
  }

  // (4) la medicion es obligatoria y tiene que ser de esta sesion, con salida cruda
  if (d.grupo === '4_caduca') {
    const m = d.medicion || {};
    if (!m.hecha_el) F('V7', yo + ': grupo 4 sin medicion.hecha_el');
    if (!m.instrumento) F('V7', yo + ': grupo 4 sin medicion.instrumento');
    if (!m.resultado) F('V7', yo + ': grupo 4 sin medicion.resultado');
    if (!m.salida_cruda_en) F('V7', yo + ': grupo 4 sin medicion.salida_cruda_en');
  }

  // (2) la pregunta se contesta sin abrir el repositorio
  if (d.grupo === '2_decision_del_owner' && typeof d.pregunta === 'string') {
    if (OLOR_A_REPOSITORIO.test(d.pregunta))
      F('V7', yo + ': la pregunta del grupo 2 nombra un fichero o una ruta del repositorio. ' +
        'Tiene que poder contestarse sin abrirlo.');
    if (!/\?/.test(d.pregunta))
      F('V7', yo + ': la pregunta del grupo 2 no tiene signo de interrogacion.');
  }

  // V8 · el estado, y lo que exige cerrar una deuda
  if (!ESTADOS.includes(d.estado))
    F('V8', yo + ': estado "' + d.estado + '" fuera del vocabulario (' + ESTADOS.join(', ') + ')');
  if (d.estado === 'cerrada') {
    if (!d.cerrada_el) F('V8', yo + ': estado=cerrada sin cerrada_el');
    if (!d.cerrada_por)
      F('V8', yo + ': estado=cerrada sin cerrada_por. Cerrar una deuda exige decir QUE la cerro, ' +
        'con su evidencia. Sin eso la fila desaparece del conteo de vivas sin que nadie pueda comprobarlo.');
  } else if (d.cerrada_el || d.cerrada_por) {
    F('V8', yo + ': trae cerrada_el o cerrada_por y su estado no es "cerrada"');
  }
  if (d.estado === 'caduca' && d.grupo !== '4_caduca')
    F('V8', yo + ': estado=caduca pero el grupo no es 4_caduca');

  // firma: los grupos 5 y 6 son PROPUESTAS
  const f = d.firma_owner;
  if (!f || typeof f.firmada !== 'boolean')
    F('V7', yo + ': firma_owner.firmada ausente o no booleano');
  else if (f.firmada === true && !f.fecha)
    F('V7', yo + ': firma_owner.firmada=true sin fecha de firma');

  // duplicados
  if (d.duplicada_de !== null && d.duplicada_de !== undefined) {
    if (!idsDeuda.has(d.duplicada_de))
      F('V7', yo + ': duplicada_de apunta a "' + d.duplicada_de + '", que no es ninguna fila');
    if (d.duplicada_de === d.id)
      F('V7', yo + ': duplicada_de apunta a si misma');
  }
}

// --- el conteo ----------------------------------------------------------------
const porGrupo = {};
Object.keys(GRUPOS).forEach(g => { porGrupo[g] = { filas: 0, unicas: 0, vivas: 0 }; });
let unicas = 0, sinFirmar = 0, cerradas = 0, vivasUnicas = 0;
for (const d of D.deudas) {
  if (!porGrupo[d.grupo]) continue;
  porGrupo[d.grupo].filas++;
  const esDup = d.duplicada_de !== null && d.duplicada_de !== undefined;
  const viva = !ESTADOS_NO_VIVOS.includes(d.estado);
  if (!esDup) {
    porGrupo[d.grupo].unicas++;
    unicas++;
    if (viva) { porGrupo[d.grupo].vivas++; vivasUnicas++; }
  }
  if (d.estado === 'cerrada') cerradas++;
  if (GRUPOS_PROPUESTA.includes(d.grupo) && !(d.firma_owner || {}).firmada) sinFirmar++;
}

const barridos = sitios.filter(s => s.barrido === true).length;

console.log('COBERTURA');
console.log('  sitios en la canon                : ' + SITIOS_CANON.length);
console.log('  barridos                          : ' + barridos);
console.log('  sin barrer                        : ' + (sitios.length - barridos));
console.log('');
console.log('CONTEO -- unidad: FILAS del declarativo. Denominador: las filas de los sitios BARRIDOS.');
console.log('  filas                             : ' + D.deudas.length);
console.log('  deudas unicas (sin duplicadas)    : ' + unicas);
console.log('  duplicadas de otra fila           : ' + (D.deudas.length - unicas));
console.log('');
console.log('  de las unicas:');
console.log('    VIVAS                           : ' + vivasUnicas);
console.log('    no vivas (cerradas + caducas)   : ' + (unicas - vivasUnicas) +
            '   de las cuales CERRADAS por trabajo: ' + cerradas);
console.log('  El total de filas NUNCA baja: una deuda cerrada se queda con estado "cerrada".');
console.log('  Lo que baja es VIVAS, y los dos numeros van siempre juntos.');
console.log('');
console.log('  por grupo                           filas   unicas    vivas');
for (const g of Object.keys(GRUPOS)) {
  console.log('    ' + g.padEnd(32) + String(porGrupo[g].filas).padStart(5) +
              String(porGrupo[g].unicas).padStart(9) + String(porGrupo[g].vivas).padStart(9));
}
console.log('');
console.log('  grupos 5 y 6 SIN FIRMAR del owner : ' + sinFirmar +
            '  -- siguen contando como deuda viva');
console.log('');

if (fallos.length) {
  console.log('ROJO -- ' + fallos.length + ' fallo(s):');
  fallos.forEach(f => console.log('  ' + f));
  process.exit(1);
}
avisos.forEach(a => console.log('aviso: ' + a));
console.log('VERDE -- el declarativo es valido. Y NO es completo: ' +
            (sitios.length - barridos) + ' sitio(s) sin barrer, por diseno.');
process.exit(0);
