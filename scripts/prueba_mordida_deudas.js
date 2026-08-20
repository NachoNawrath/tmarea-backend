// Prueba de mordida del validador del declarativo de deudas. npm run deudas:mordida.
//
// Cada mordida muta una COPIA del declarativo de una sola forma y exige que el
// validador salga en ROJO por el control que corresponde. Al final va el CONTROL
// NEGATIVO: la copia sin mutar tiene que salir en VERDE. Un control que nunca
// fallo no es un control, y uno que falla siempre tampoco.
//
// No toca data/deudas/deudas_declaradas.json. Trabaja en un directorio temporal
// propio y lo borra al terminar.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const ORIGEN = path.join(RAIZ, 'data', 'deudas', 'deudas_declaradas.json');
const VALIDADOR = path.join(RAIZ, 'scripts', 'validar_deudas_declaradas.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mordida-deudas-'));
const base = JSON.parse(fs.readFileSync(ORIGEN, 'utf8'));

function correr(texto, nombre) {
  const f = path.join(TMP, nombre + '.json');
  fs.writeFileSync(f, texto, { encoding: 'utf8' });
  const r = spawnSync(process.execPath, [VALIDADOR, '--fichero', f], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

// La fixture de caracteres se CONSTRUYE en tiempo de ejecucion en vez de venir
// cruda en el codigo. Asi este fichero no lleva ni un caracter de control, que
// es lo mismo que le exige a los que valida, y la fixture sigue siendo exacta.
const C1 = String.fromCodePoint(0x91);   // U+0091, el del hueco H-T2
const BOM = String.fromCharCode(0xFEFF); // U+FEFF

const clon = () => JSON.parse(JSON.stringify(base));
const filaDe = (d, grupo) => d.deudas.find(x => x.grupo === grupo);
const sitioDe = (d, id) => d.cobertura.sitios.find(x => x.id === id);

// --- las mordidas -------------------------------------------------------------
// Cada una: nombre, control esperado, y una funcion que devuelve el TEXTO a validar.
const MORDIDAS = [
  ['V5 · falta un sitio de la canon', 'V5', () => {
    const d = clon();
    d.cobertura.sitios = d.cobertura.sitios.filter(s => s.id !== 'BITACORAS-HD');
    return JSON.stringify(d, null, 2);
  }],
  ['V5 · sitio que la canon no conoce', 'V5', () => {
    const d = clon();
    d.cobertura.sitios.push({ id: 'SITIO-DE-CONTRABANDO', repo: 'tmarea-backend',
      fichero: 'x', seccion_por_titulo: 'x', vocabulario_del_barrido: ['x'],
      orden: 9, barrido: false, barrido_el: null, filas_en_este_declarativo: 0 });
    return JSON.stringify(d, null, 2);
  }],
  ['V1 · sitio barrido con 0 filas y sin vacio_verificado', 'V1', () => {
    const d = clon();
    delete sitioDe(d, 'PWA-DOCS').vacio_verificado;
    return JSON.stringify(d, null, 2);
  }],
  ['V1 · vacio_verificado sin control positivo', 'V1', () => {
    const d = clon();
    delete sitioDe(d, 'PWA-DOCS').vacio_verificado.controles_positivos;
    return JSON.stringify(d, null, 2);
  }],
  ['V1 · vacio_verificado con un conteo distinto de 0', 'V1', () => {
    const d = clon();
    sitioDe(d, 'PWA-DOCS').vacio_verificado.conteos.TODO = 3;
    return JSON.stringify(d, null, 2);
  }],
  ['V3 · sitio barrido=false que sin embargo tiene filas', 'V3', () => {
    const d = clon();
    const s = sitioDe(d, 'PLAN-3-E8');
    s.barrido = false; s.barrido_el = null;
    return JSON.stringify(d, null, 2);
  }],
  ['V4 · conteo declarado distinto del real', 'V4', () => {
    const d = clon();
    sitioDe(d, 'PLAN-3-E8').filas_en_este_declarativo = 99;
    return JSON.stringify(d, null, 2);
  }],
  ['V6 · barrido=true sin barrido_el', 'V6', () => {
    const d = clon();
    sitioDe(d, 'PLAN-7.2').barrido_el = null;
    return JSON.stringify(d, null, 2);
  }],
  ['V2 · fila cuyo sitio no esta en la cobertura', 'V2', () => {
    const d = clon();
    d.deudas[0].sitio = 'SITIO-QUE-NADIE-DECLARO';
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · fila sin grupo', 'V7', () => {
    const d = clon();
    delete d.deudas[0].grupo;
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · grupo fuera del vocabulario', 'V7', () => {
    const d = clon();
    d.deudas[0].grupo = '7_lo_que_sea';
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · grupo 3 sin a_quien', 'V7', () => {
    const d = clon();
    delete filaDe(d, '3_dato_externo').a_quien;
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · grupo 4 sin medicion', 'V7', () => {
    const d = clon();
    delete filaDe(d, '4_caduca').medicion;
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · grupo 4 con medicion sin salida cruda', 'V7', () => {
    const d = clon();
    delete filaDe(d, '4_caduca').medicion.salida_cruda_en;
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · pregunta del grupo 2 que nombra un fichero del repositorio', 'V7', () => {
    const d = clon();
    filaDe(d, '2_decision_del_owner').pregunta =
      'Mira src/services/zonas-aviso.js y decime si esta bien, ¿si?';
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · id duplicado', 'V7', () => {
    const d = clon();
    d.deudas[1].id = d.deudas[0].id;
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · texto_literal y sin_texto a la vez', 'V7', () => {
    const d = clon();
    d.deudas[0].sin_texto = true;
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · sin_texto sin evidencia_en_el_arbol', 'V7', () => {
    const d = clon();
    const f = d.deudas.find(x => x.sin_texto === true);
    delete f.evidencia_en_el_arbol;
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · el documento no la fecha pero abierta_el trae valor', 'V7', () => {
    const d = clon();
    const f = d.deudas.find(x => x.abierta_el_lo_dice_el_documento === false);
    f.abierta_el = '2026-01-01';
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · firma_owner.firmada=true sin fecha', 'V7', () => {
    const d = clon();
    d.deudas[0].firma_owner = { firmada: true, fecha: null };
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · duplicada_de apunta a una fila que no existe', 'V7', () => {
    const d = clon();
    d.deudas[0].duplicada_de = 'FILA::que-no-existe';
    return JSON.stringify(d, null, 2);
  }],
  ['V7 · donde sin cita_de_anclaje', 'V7', () => {
    const d = clon();
    delete d.deudas[0].donde.cita_de_anclaje;
    return JSON.stringify(d, null, 2);
  }],
  ['ESTRUCTURA · falta una clave de nivel 1', 'ESTRUCTURA', () => {
    const d = clon();
    delete d.politica_de_firma;
    return JSON.stringify(d, null, 2);
  }],
  // Las mordidas del hueco H-T2. Son DOS y no una, y la diferencia importa.
  //
  // El caracter se inyecta en el TEXTO y no en el objeto: si se pusiera en el
  // objeto, JSON.stringify lo escaparia a una secuencia de seis caracteres y el
  // fichero en disco no traeria ningun caracter de control. El defecto que se
  // prueba es el del BYTE, asi que se escribe el byte.
  //
  // La primera lo mete DENTRO de un valor de cadena: ahi U+0091 es JSON
  // PERFECTAMENTE VALIDO -- la norma solo prohibe los de control por debajo de
  // 0x20 -- asi que el parseo pasa y lo unico que puede cazarlo es el criterio
  // corregido. Es el caso real de H-T2.
  //
  // La segunda lo mete FUERA de toda cadena, donde ademas rompe el parseo. Existe
  // para probar el ORDEN: el validador tiene que nombrar el caracter y no
  // limitarse a decir "no es JSON valido", que es el sintoma y no la causa.
  ['CARACTERES · U+0091 dentro de una cadena, JSON valido -- el caso real de H-T2', 'CARACTERES', () => {
    const d = clon();
    d.deudas[0].texto_literal = d.deudas[0].texto_literal + C1;
    return JSON.stringify(d, null, 2).replace(/\u0091/g, C1);
  }],
  ['CARACTERES · U+0091 fuera de cadena, que ademas rompe el parseo', 'CARACTERES', () => {
    const t = JSON.stringify(clon(), null, 2);
    const i = t.indexOf('"generado"');
    return t.slice(0, i) + C1 + t.slice(i);
  }],
  ['CARACTERES · BOM UTF-8 al principio', 'CARACTERES', () => {
    return BOM + JSON.stringify(clon(), null, 2);
  }],
];

console.log('PRUEBA DE MORDIDA DEL VALIDADOR DE DEUDAS');
console.log('origen   : ' + path.relative(RAIZ, ORIGEN).replace(/\\/g, '/'));
console.log('temporal : ' + TMP);
console.log('');

let ok = 0, mal = 0;

MORDIDAS.forEach(([nombre, control, hacer], i) => {
  const texto = hacer();
  const r = correr(texto, 'm' + String(i + 1).padStart(2, '0'));
  const rojo = r.code === 1;
  const porElControl = new RegExp('\\[' + control + '\\]').test(r.out);
  if (rojo && porElControl) {
    console.log('  ok    ' + nombre + '  -> rojo por [' + control + ']');
    ok++;
  } else {
    console.log('  FALLA ' + nombre);
    console.log('        esperado: exit 1 con [' + control + ']');
    console.log('        obtenido: exit ' + r.code + (rojo ? ' pero sin [' + control + ']' : ''));
    mal++;
  }
});

// --- CONTROL NEGATIVO ---------------------------------------------------------
console.log('');
console.log('CONTROL NEGATIVO -- la copia SIN mutar tiene que salir en verde:');
const cn = correr(fs.readFileSync(ORIGEN, 'utf8'), 'control_negativo');
if (cn.code === 0) {
  console.log('  ok    copia intacta -> exit 0');
  ok++;
} else {
  console.log('  FALLA copia intacta -> exit ' + cn.code + '. El validador muerde lo que no debe.');
  console.log(cn.out.split('\n').filter(l => /^\s*\[/.test(l)).join('\n'));
  mal++;
}

fs.rmSync(TMP, { recursive: true, force: true });

const total = MORDIDAS.length + 1;
console.log('');
console.log('MORDIDA: ' + ok + '/' + total + (mal ? '   FALLOS: ' + mal : ''));
process.exit(mal ? 1 : 0);
