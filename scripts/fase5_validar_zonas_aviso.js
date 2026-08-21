#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// fase5_validar_zonas_aviso.js
//
// Dos cosas, en este orden:
//   1. CARGA la declaracion real y muestra que quedo resuelto para cada zona.
//   2. PRUEBA DE MORDIDA: rompe la declaracion de una forma distinta por cada
//      regla del validador y comprueba que se detiene. Un validador que nunca
//      se probo contra un dato malo no es un control, es una decoracion.
//
// Sale 0 solo si la declaracion real carga limpia Y todas las mordidas muerden.
// Cualquier otro caso sale 1 con el detalle.
//
// Uso:  node scripts/fase5_validar_zonas_aviso.js
// ─────────────────────────────────────────────────────────────────────────────

const { cargarZonasAviso, validarDeclaracion, ErrorZonasAviso } = require('../src/services/zonas-aviso');

const DECL      = require('../data/decreto/zonas_aviso.json');
const INSUMO    = require('../data/decreto/jurisdicciones_v2.json');
const CONTACTOS = require('../src/data/bahia-capitania-map.json');

const clonar = o => JSON.parse(JSON.stringify(o));
const zonaDe = (d, id) => d.zonas.find(z => z.jurisdiccion_id === id);

let fallas = 0;

console.log('================================================================');
console.log('ZONAS DE AVISO — CARGA REAL');
console.log('================================================================');

// LA CARGA REAL YA NO ABORTA EL SCRIPT — 2026-08-16. Hasta hoy un fallo aca
// hacia `process.exit(1)` en el acto, y con eso el estado de TODAS las familias
// de mordida quedaba sin medir: una declaracion rota escondia si los controles
// muerden o no. Es lo contrario de lo que este script existe para hacer, y es
// justo el caso que la pieza del 2026-08-16 necesitaba ver — la mordida contra
// el dato VIEJO, en rojo, para que el verde de despues signifique algo.
// Ahora se registra la falla, se sigue a la mordida, y el exit sigue siendo 1.
// NO se afloja nada (CLAUDE.md §0.3): ningun caso que salia en rojo sale en
// verde por este cambio; lo unico que cambia es cuanto se ve del rojo.
let cargado = null;
try {
  cargado = cargarZonasAviso({ recargar: true });
} catch (e) {
  console.log(`FALLA AL CARGAR LA DECLARACION REAL: ${e.message}`);
  console.log('');
  console.log('La carga real NO paso. El script SIGUE hasta la prueba de mordida: un control');
  console.log('que solo se vio en verde no se distingue de uno que no muerde. Sale 1 igual.');
  fallas++;
}

if (cargado) {
console.log(`version de la declaracion : ${cargado.version}`);
console.log(`zonas declaradas          : ${cargado.zonas.length}`);
console.log(`zonas que reclaman tramo  : ${cargado.zonas_con_ambito.length} (las que tienen ambito declarado)`);
console.log(`derivacion sin Capitania  : ${cargado.contacto_generico.via} — ${cargado.contacto_generico.procedencia}`);
console.log('');
console.log('jurisdiccion         ambito        contacto      nombre / telefono');
console.log('-------------------- ------------- ------------- ---------------------------------------');
for (const z of cargado.zonas) {
  const c = z.contacto;
  const detalle = c.tipo === 'sin_contacto' ? '(sin contacto declarado)' : `${c.nombre} — ${c.telefono}`;
  console.log(
    `${z.jurisdiccion_id.padEnd(20)} ${String(z.ambito_jurisdiccion).padEnd(13)} ` +
    `${c.tipo.padEnd(13)} ${detalle}`
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO DE DISCREPANCIAS DE CLASE C (fase5R §3): el mapa operativo dice una
// cosa y el decreto otra. La regla ya declarada es que el mapa NO revoca a la
// capa, y que cada discrepancia se adjudica leyendo el parrafo de las DOS
// Capitanias en juego. Este registro se DERIVA de las fuentes en cada corrida:
// si alguna se resuelve, deja de aparecer sola.
// ─────────────────────────────────────────────────────────────────────────────
const conDiscrepancia = cargado.zonas.filter(z => z.contacto.tipo === 'sin_contacto');
console.log('');
console.log('================================================================');
console.log('DISCREPANCIAS DE CLASE C — el mapa operativo contra el decreto');
console.log('================================================================');
console.log(`  total: ${conDiscrepancia.reduce((n, z) => n + z.contacto.discrepancias.length, 0)} bahia(s) ` +
            `en ${conDiscrepancia.length} jurisdiccion(es)`);
console.log('');
for (const z of conDiscrepancia) {
  console.log(`  ${z.jurisdiccion_id}  [nivel ${z.contacto.discrepancias[0].nivel}]`);
  for (const d of z.contacto.discrepancias) {
    console.log(`    bahia ${d.bahia_id}`);
    console.log(`      el decreto dice : Capitania '${d.dice_el_decreto.capitania}' / Gobernacion '${d.dice_el_decreto.gobernacion}'`);
    console.log(`      el mapa dice    : Capitania '${d.dice_el_mapa.capitania}' / Gobernacion '${d.dice_el_mapa.gobernacion}'`);
  }
  console.log(`      consecuencia    : sin contacto declarado; el aviso deriva al generico`);
  console.log(`      motivo          : ${z.contacto.motivo}`);
  console.log(`      pendiente       : adjudicar leyendo el parrafo del decreto de las dos Capitanias en juego (fase5R §3, clase C)`);
  console.log('');
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCREPANCIA DECLARADA SOBRE UN CONTACTO QUE SI SE DA — 2026-08-16.
// El bloque de arriba lista las zonas que NO dan contacto. Este lista las que
// SI lo dan y ademas arrastran un desacuerdo vivo en el otro nivel. Son casos
// distintos y por eso se imprimen aparte: en el primero no hay telefono que
// mostrar; en este si, y la discrepancia viaja al lado.
// ─────────────────────────────────────────────────────────────────────────────
const conMarca = cargado.zonas.filter(z => z.contacto.tipo !== 'sin_contacto' && z.contacto.discrepancias.length > 0);
console.log('');
console.log('================================================================');
console.log('DISCREPANCIA DECLARADA CON CONTACTO QUE SI SE DA');
console.log('================================================================');
console.log(`  total: ${conMarca.reduce((n, z) => n + z.contacto.discrepancias.length, 0)} discrepancia(s) ` +
            `en ${conMarca.length} jurisdiccion(es)`);
console.log('');
for (const z of conMarca) {
  console.log(`  ${z.jurisdiccion_id}  [contacto ${z.contacto.tipo}: ${z.contacto.nombre} — ${z.contacto.telefono}]`);
  for (const d of z.contacto.discrepancias) {
    console.log(`    bahia ${d.bahia_id}  nivel DECLARADO: ${d.nivel}`);
    console.log(`      el decreto dice : Capitania '${d.dice_el_decreto.capitania}' / Gobernacion '${d.dice_el_decreto.gobernacion}'`);
    console.log(`      el mapa dice    : Capitania '${d.dice_el_mapa.capitania}' / Gobernacion '${d.dice_el_mapa.gobernacion}'`);
    console.log(`      el valor que la encarna viaja en contacto.gobernacion = ${JSON.stringify(z.contacto.gobernacion)}`);
    console.log(`      motivo          : ${d.motivo}`);
  }
  console.log(`      ambito          : ${z.ambito === null ? 'null — no reclama tramo (exigido mientras la marca no la cargue el consumidor)' : JSON.stringify(z.ambito)}`);
  console.log('');
}
if (conMarca.length === 0) console.log('  (ninguna)\n');

console.log('');
console.log('causa de la carencia, tal como la declara el insumo (no se copia, se lee):');
for (const z of cargado.zonas) {
  console.log(`  ${z.jurisdiccion_id}: ${z.causa_sin_geometria}`);
}
} // fin de `if (cargado)`

// ─────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('================================================================');
console.log('PRUEBA DE MORDIDA DEL VALIDADOR');
console.log('================================================================');

// Cada familia: que se rompe, y que tiene que decir el validador al detenerse.
const FAMILIAS = [
  ['M1  jurisdiccion inexistente',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').jurisdiccion_id = 'no_existe'; return [d, INSUMO, CONTACTOS]; },
    /no corresponde a ninguna jurisdiccion/],

  // M2 INYECTA EL ESTADO, NO EL BOOLEANO, DESDE EL 2026-08-15. Antes ponia
  // `participa_matching = true` y con eso alcanzaba, porque el guard colgaba de
  // ese campo. Con la regla de tres estados el guard mira `estado_geometria`, y
  // seguir inyectando solo el booleano habria dejado a M2 SIN MORDER sin que
  // nada avisara: el modo de falla de CLAUDE.md 4.6 cayendole justo al control
  // que vigila el retiro automatico. Se inyectan los dos campos, como los
  // escribe el migrador cuando una jurisdiccion se cierra de verdad.
  ['M2  la jurisdiccion recupero geometria ENTERA (retiro automatico)',
    () => { const i = clonar(INSUMO);
            const j = i.jurisdicciones.find(j => j.id === 'arica');
            j.estado_geometria = 'cerrable';
            j.participa_matching = true;
            return [DECL, i, CONTACTOS]; },
    /esta 'cerrable'/],

  // M2b ES LA QUE PRUEBA EL TERCER ESTADO, Y ES LA UNICA QUE NO DEBE MORDER.
  // Una jurisdiccion que pasa a construirse EN PARTE conserva su zona: la
  // carencia de la porcion no cubierta sigue existiendo, y retirarle el aviso
  // seria la causa (a) de INV-3.6 vuelta silencio. Va con `esperado: null`.
  // Si algun dia el guard volviera a colgar de `participa_matching`, esta
  // familia se cae — que es exactamente para lo que esta.
  ['M2b una construida EN PARTE conserva su zona (el tercer estado)',
    () => { const i = clonar(INSUMO);
            const j = i.jurisdicciones.find(j => j.id === 'arica');
            j.estado_geometria = 'cerrable_parcial';
            j.participa_matching = true;
            return [DECL, i, CONTACTOS]; },
    null],

  // M2c — un estado que nadie declaro no cae para ningun lado.
  ['M2c un estado_geometria desconocido no cae a ningun lado',
    () => { const i = clonar(INSUMO);
            i.jurisdicciones.find(j => j.id === 'arica').estado_geometria = 'inventado';
            return [DECL, i, CONTACTOS]; },
    /no esta en el mapeo/],

  ['M3  aparece una nula sin zona declarada',
    () => { const d = clonar(DECL); d.zonas = d.zonas.filter(z => z.jurisdiccion_id !== 'baker'); return [d, INSUMO, CONTACTOS]; },
    /con carencia declarada y sin zona de aviso/],

  ['M4  zona declarada dos veces',
    () => { const d = clonar(DECL); d.zonas.push(clonar(zonaDe(d, 'arica'))); return [d, INSUMO, CONTACTOS]; },
    /declarada mas de una vez/],

  ['M5  tipo de contacto desconocido',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').contacto = { tipo: 'inventado', bahia_id: 71 }; return [d, INSUMO, CONTACTOS]; },
    /tipo de contacto 'inventado' desconocido/],

  ['M6  contacto de Capitania que el mapa atribuye a otra',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').contacto = { tipo: 'capitania', bahia_id: 98 }; return [d, INSUMO, CONTACTOS]; },
    /revoque al decreto/],

  ['M7  la fuente cambia la atribucion bajo una zona ya declarada',
    () => { const c = clonar(CONTACTOS); c['71'].capitania = 'Iquique'; return [DECL, INSUMO, c]; },
    /no es 'Arica'/],

  ['M8  bahia de contacto que no existe en el mapa',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').contacto = { tipo: 'capitania', bahia_id: 999999 }; return [d, INSUMO, CONTACTOS]; },
    /no existe en bahia-capitania-map/],

  ['M9  contacto sin telefono utilizable',
    () => { const c = clonar(CONTACTOS); c['71'].telefono = ''; return [DECL, INSUMO, c]; },
    /no trae telefono/],

  ['M10 derivar a Gobernacion cuando la fuente SI atribuye Capitania',
    () => { const c = clonar(CONTACTOS); c['127'].capitania = 'Chacabuco'; return [DECL, INSUMO, c]; },
    /SI tiene Capitania atribuida/],

  ['M11 derivar a Gobernacion que no coincide con la del decreto',
    () => { const c = clonar(CONTACTOS); c['127'].gobernacion = 'Castro'; return [DECL, INSUMO, c]; },
    /no coinciden: no se declara contacto/],

  ['M12 sin_contacto sin motivo escrito',
    () => { const d = clonar(DECL); zonaDe(d, 'lirquen').contacto = { tipo: 'sin_contacto' }; return [d, INSUMO, CONTACTOS]; },
    /exige 'motivo' escrito/],

  ['M13 sin ambito y sin motivo de la ausencia',
    () => { const d = clonar(DECL); delete zonaDe(d, 'arica').motivo_sin_ambito; return [d, INSUMO, CONTACTOS]; },
    /exige 'motivo_sin_ambito' escrito/],

  ['M14 tipo de ambito desconocido',
    () => { const d = clonar(DECL); zonaDe(d, 'arica').ambito = { tipo: 'circulo', radio_km: 50 }; return [d, INSUMO, CONTACTOS]; },
    /tipo de ambito 'circulo' desconocido/],

  ['M15 banda de latitud dada vuelta',
    () => { const d = clonar(DECL);
            zonaDe(d, 'arica').ambito = { tipo: 'banda_latitud', lat_norte: -20, lat_sur: -18, procedencia: 'prueba' };
            return [d, INSUMO, CONTACTOS]; },
    /no mayor que/],

  ['M16 banda de latitud sin procedencia',
    () => { const d = clonar(DECL);
            zonaDe(d, 'arica').ambito = { tipo: 'banda_latitud', lat_norte: -17.5, lat_sur: -19.216667 };
            return [d, INSUMO, CONTACTOS]; },
    /exige 'procedencia'/],

  ['M17 carencia sin causa escrita en el insumo',
    () => { const i = clonar(INSUMO);
            i.jurisdicciones.find(j => j.id === 'arica').causa_sin_geometria = '';
            return [DECL, i, CONTACTOS]; },
    /no declara 'causa_sin_geometria'/],

  ['M18 declaracion sin derivacion generica',
    () => { const d = clonar(DECL); delete d.contacto_generico; return [d, INSUMO, CONTACTOS]; },
    /contacto_generico/],
  ['M19 sin_contacto sin las bahias que prueban la discrepancia',
    () => { const d = clonar(DECL); delete zonaDe(d, 'lirquen').contacto.bahias_en_discrepancia; return [d, INSUMO, CONTACTOS]; },
    /exige 'bahias_en_discrepancia'/],

  ['M20 la discrepancia se resolvio y el sin_contacto la esconderia',
    () => { const c = clonar(CONTACTOS); c['97'].capitania = 'Lirquen'; return [DECL, INSUMO, c]; },
    /SI coincide hoy con el decreto/],

  // M21 y M22 — INV-10.1 (contrato v1.8, `d9f7f9e`). Son los dos lados del mismo
  // campo y por eso van juntos: el mensaje tiene que seguir llevando {nombre}
  // —si no, sale a pantalla sin nombrar la Capitania— y NO puede llevar
  // {telefono} —el contacto se muestra en zarpe y recalada, no en el catalogo—.
  //
  // Hasta la v1.7 el guard EXIGIA {telefono}; con INV-10.1 escrito, esa exigencia
  // impedia cumplir el contrato (medido: el dato corregido abortaba). M22 prueba
  // la inversion, y su expresion esperada NOMBRA a INV-10.1 a proposito: si el
  // caso saliera cazado por otro control —por 'falta la marca {nombre}', por
  // ejemplo— estaria en verde probando otra cosa, que es la trampa que el paso 5
  // de E3 ya pago.
  ['M21 el mensaje pierde {nombre} y saldria sin nombrar la Capitania',
    () => { const d = clonar(DECL);
      d.mensaje.capa_2_con_capitania = d.mensaje.capa_2_con_capitania.replace('{nombre}', 'Arica');
      return [d, INSUMO, CONTACTOS]; },
    /no incluye la marca \{nombre\}/],

  ['M22 el mensaje reinyecta {telefono}, que INV-10.1 prohibe',
    () => { const d = clonar(DECL);
      d.mensaje.capa_2_con_capitania =
        d.mensaje.capa_2_con_capitania.replace('{nombre} antes', '{nombre}: {telefono} antes');
      return [d, INSUMO, CONTACTOS]; },
    /INV-10\.1 prohibe el telefono dentro de un mensaje del catalogo/],

  // ───────────────────────────────────────────────────────────────────────────
  // M22b, M22c y M22d — EL AGUJERO DE M22, ABIERTO EL 2026-08-21.
  //
  // M22 y el guard que probaba miraban la MARCA {telefono}. INV-10.1 no prohibe
  // la marca: prohibe EL TELEFONO. Un texto que escribe el numero a mano pasaba
  // las dos en verde y publicaba al patron justo lo que el contrato prohibe.
  // Es la forma de PROHIBICION de la regla de las guardas de texto — ver la fila
  // METODO::una-guarda-de-texto-comprueba-que-lo-mencione-no-que-lo-afirme —, y
  // es la peligrosa de las dos: en una guarda positiva el literal caduca en ROJO
  // y se nota; en una de prohibicion caduca en VERDE y en silencio.
  //
  // LAS TRES MUTACIONES SE DERIVAN DEL TEXTO VIVO: le insertan algo al texto que
  // la declaracion trae HOY, sea cual sea. Ninguna lleva el mensaje escrito a
  // mano adentro, asi que ninguna puede volverse un no-op el dia que el §10
  // cambie — que es como M1 de la mordida del cotejo se murio en silencio.
  //
  // M22d ES EL CONTROL DE DISCRIMINACION y vale tanto como las otras dos: un
  // guard que mordiera cualquier digito pasaria M22b y M22c y pareceria
  // perfecto, y ademas seria inutilizable, porque estos textos citan invariantes
  // y numeros de resolucion todo el tiempo.
  ['M22b el mensaje escribe el telefono a mano, sin usar la marca',
    () => { const d = clonar(DECL);
      d.mensaje.capa_2_con_capitania =
        d.mensaje.capa_2_con_capitania.replace('{nombre}', '{nombre} al +56 61 220 1234');
      return [d, INSUMO, CONTACTOS]; },
    /tiene forma de telefono/],

  ['M22c el mismo telefono en capa_1, que el guard viejo no miraba',
    () => { const d = clonar(DECL);
      d.mensaje.capa_1 = d.mensaje.capa_1 + ' Llame al 612201234.';
      return [d, INSUMO, CONTACTOS]; },
    /"mensaje\.capa_1" trae la corrida/],

  ['M22d CONTROL DE DISCRIMINACION: una fecha y una resolucion no son un telefono',
    () => { const d = clonar(DECL);
      d.mensaje.capa_1 = d.mensaje.capa_1 + ' Vigente desde 2026-08-21 por Res. 12.100/47. VHF Canal 16.';
      return [d, INSUMO, CONTACTOS]; },
    null],

  // ───────────────────────────────────────────────────────────────────────────
  // M23–M31 — LA DISCREPANCIA DECLARADA SOBRE UN CONTACTO QUE SI SE DA.
  // 2026-08-16.
  //
  // LAS NUEVE CONSTRUYEN SU CONTACTO DESDE CERO en vez de mutar el que el dato
  // real trae. Es deliberado: una familia que se apoyara en que la declaracion
  // YA tiene la forma nueva dejaria de probar el dia que el dato cambie, sin
  // avisar — el modo de falla de CLAUDE.md §4.6 aplicado a la propia mordida.
  // Construidas asi, muerden igual contra el dato viejo y contra el nuevo, y por
  // eso la corrida en rojo del 2026-08-16 vale como evidencia: los controles ya
  // mordian ANTES de que el dato les diera la razon.
  // ───────────────────────────────────────────────────────────────────────────

  ['M23 discrepancia declarada con un nivel que nadie definio',
    () => { const d = clonar(DECL);
            zonaDe(d, 'puerto_eden').contacto = { tipo: 'capitania', bahia_id: 129,
              discrepancias_declaradas: [{ bahia_id: 129, nivel: 'region', motivo: 'prueba' }] };
            return [d, INSUMO, CONTACTOS]; },
    /declara nivel 'region', que no esta en/],

  // M24 ES EL ESPEJO EXACTO DE M20 y la razon de ser de toda la rama: la
  // declaracion nueva tiene el MISMO retiro automatico que `sin_contacto`. Si el
  // mapa se corrige y la Gobernacion pasa a ser la del decreto, la discrepancia
  // dejo de existir y el dato tiene que retirarse.
  ['M24 la discrepancia declarada SE RESOLVIO y seguiria escrita',
    () => { const d = clonar(DECL); const c = clonar(CONTACTOS);
            zonaDe(d, 'puerto_eden').contacto = { tipo: 'capitania', bahia_id: 129,
              discrepancias_declaradas: [{ bahia_id: 129, nivel: 'gobernacion', motivo: 'prueba' }] };
            c['129'].gobernacion = 'Punta Arenas';
            return [d, INSUMO, c]; },
    /declara una discrepancia en nivel 'gobernacion' que HOY NO EXISTE/],

  ['M25 discrepancia declarada sin motivo escrito',
    () => { const d = clonar(DECL);
            zonaDe(d, 'puerto_eden').contacto = { tipo: 'capitania', bahia_id: 129,
              discrepancias_declaradas: [{ bahia_id: 129, nivel: 'gobernacion' }] };
            return [d, INSUMO, CONTACTOS]; },
    /en nivel 'gobernacion' exige 'motivo' escrito/],

  // M26 — LA CONTRADICCION, Y QUE CAE SIN REGLA QUE LA NOMBRE. Declarar que
  // discrepa el MISMO nivel del que sale el contacto es imposible: la rama
  // `capitania` ya exigio que coincidiera. Se detiene por la medicion y no por
  // un caso particular en el codigo (CLAUDE.md §4.3). Su expresion esperada es
  // la de M24 A PROPOSITO: es la misma exigencia haciendo el trabajo.
  ['M26 nivel capitania declarado sobre un contacto de capitania (contradiccion)',
    () => { const d = clonar(DECL);
            zonaDe(d, 'puerto_eden').contacto = { tipo: 'capitania', bahia_id: 129,
              discrepancias_declaradas: [{ bahia_id: 129, nivel: 'capitania', motivo: 'prueba' }] };
            return [d, INSUMO, CONTACTOS]; },
    /declara una discrepancia en nivel 'capitania' que HOY NO EXISTE/],

  ['M27 discrepancia sobre una bahia que el mapa no tiene',
    () => { const d = clonar(DECL);
            zonaDe(d, 'puerto_eden').contacto = { tipo: 'capitania', bahia_id: 129,
              discrepancias_declaradas: [{ bahia_id: 999999, nivel: 'gobernacion', motivo: 'prueba' }] };
            return [d, INSUMO, CONTACTOS]; },
    /declarada en discrepancia no existe en bahia-capitania-map/],

  ['M28 el campo declarado vacio, que no declara nada',
    () => { const d = clonar(DECL);
            zonaDe(d, 'puerto_eden').contacto = { tipo: 'capitania', bahia_id: 129,
              discrepancias_declaradas: [] };
            return [d, INSUMO, CONTACTOS]; },
    /o se escribe la discrepancia, o se omite el campo/],

  // M29 — EL CRITERIO DEL AGENTE DEL 2026-08-16, con su mordida. Una zona que da
  // contacto y arrastra una discrepancia no puede reclamar tramo, porque el
  // consumidor (cobertura-jurisdiccional.js:405) se queda con tres campos y la
  // marca se pierde ahi. Es criterio, no norma, y se levanta el dia que el
  // consumidor sepa cargarla; hasta entonces esto es lo que impide que el hueco
  // sea silencioso.
  ['M29 zona con discrepancia viva que ademas reclama un tramo',
    () => { const d = clonar(DECL); const z = zonaDe(d, 'puerto_eden');
            z.contacto = { tipo: 'capitania', bahia_id: 129,
              discrepancias_declaradas: [{ bahia_id: 129, nivel: 'gobernacion', motivo: 'prueba' }] };
            z.ambito = { tipo: 'banda_latitud', lat_norte: -49, lat_sur: -50.55, procedencia: 'prueba' };
            return [d, INSUMO, CONTACTOS]; },
    /se pierde en ese mapeo/],

  // M30 Y M31 SON LAS DOS QUE DEBEN ACEPTAR, y van juntas por el mismo motivo
  // que M2b: un guard que rechazara TODO pasaria las ocho familias de arriba y
  // pareceria perfecto. Estas son las que lo distinguen de uno que discrimina.
  ['M30 una discrepancia VIVA sobre un contacto que si se da: se acepta',
    () => { const d = clonar(DECL);
            zonaDe(d, 'puerto_eden').contacto = { tipo: 'capitania', bahia_id: 129,
              discrepancias_declaradas: [{ bahia_id: 129, nivel: 'gobernacion', motivo: 'prueba' }] };
            return [d, INSUMO, CONTACTOS]; },
    null],

  // M31 — el criterio de M29 NO se derrama sobre `sin_contacto`. Esa rama no
  // entrega contacto, el consumidor la filtra y deriva al generico: no hay marca
  // que perder, y las cinco zonas que hoy la usan conservan su derecho a
  // declarar ambito. Sin esta familia, M29 podria ser una prohibicion general
  // disfrazada de criterio acotado.
  ['M31 una zona `sin_contacto` con discrepancia SI puede reclamar tramo',
    () => { const d = clonar(DECL);
            zonaDe(d, 'lirquen').ambito = { tipo: 'banda_latitud', lat_norte: -36, lat_sur: -36.736111, procedencia: 'prueba' };
            return [d, INSUMO, CONTACTOS]; },
    null],
];

// Control negativo: la declaracion intacta NO puede morder. Sin esto, un
// validador que lanzara siempre pasaria las 18 familias y pareceria perfecto.
console.log('');
try {
  const r = validarDeclaracion(DECL, INSUMO, CONTACTOS);
  console.log(`M0  control negativo — declaracion intacta          : NO muerde, ${r.zonas.length} zonas. OK`);
} catch (e) {
  console.log(`M0  control negativo — declaracion intacta          : MUERDE cuando no debia -> ${e.message}`);
  fallas++;
}

for (const [nombre, romper, esperado] of FAMILIAS) {
  let resultado;
  try {
    const [d, i, c] = romper();
    validarDeclaracion(d, i, c);
    resultado = null;
  } catch (e) {
    resultado = e;
  }
  // Una familia con `esperado: null` es un caso que el validador DEBE ACEPTAR.
  // No es una excepcion al metodo: un mapeo de tres ramas se prueba por sus tres
  // ramas, y la que acepta es tan parte del control como las que rechazan. Sin
  // ella, un guard que rechazara TODO pasaria todas las demas familias.
  if (esperado === null) {
    if (resultado) {
      console.log(`${nombre.padEnd(52)}: MUERDE cuando debia aceptar -> ${resultado.message}`);
      fallas++;
    } else {
      console.log(`${nombre.padEnd(52)}: acepta, como debe. OK`);
    }
  } else if (!resultado) {
    console.log(`${nombre.padEnd(52)}: NO MUERDE — el validador acepto un dato malo`);
    fallas++;
  } else if (!(resultado instanceof ErrorZonasAviso)) {
    console.log(`${nombre.padEnd(52)}: muerde con el error equivocado (${resultado.name}) -> ${resultado.message}`);
    fallas++;
  } else if (!esperado.test(resultado.message)) {
    console.log(`${nombre.padEnd(52)}: muerde con otro motivo -> ${resultado.message}`);
    fallas++;
  } else {
    console.log(`${nombre.padEnd(52)}: muerde. ${resultado.message.slice(0, 110)}`);
  }
}

console.log('');
console.log('================================================================');
if (fallas === 0) {
  console.log(`RESULTADO: declaracion limpia y mordida ${FAMILIAS.length}/${FAMILIAS.length} + control negativo.`);
  process.exit(0);
}
console.log(`RESULTADO: ${fallas} problema(s). NO se da por buena.`);
process.exit(1);
