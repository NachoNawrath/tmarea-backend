// ─────────────────────────────────────────────────────────────────────────────
// (a1) · PIEZA 1 · MEDIR LOS ONCE — ANTES DE TOCAR NADA
//
// ESTE INSTRUMENTO NO ESCRIBE EN LA BASE Y NO ESCRIBE EN EL ARTEFACTO. Sólo lee
// y deja su evidencia en 01_medir_los_once.txt. Es lo que prueba que los once
// son once ANTES de que exista un `UPDATE`, y lo que fija el estado de partida
// contra el que 02_ va a exigir.
//
// POR QUÉ LA CIFRA SE VUELVE A MEDIR Y NO SE HEREDA: «11» viene arrastrada de
// `f2_verde_falso_2026-08-17.txt` §5.1, donde salió de una lista de doce anclas
// a más de 100 km menos Isla Guamblin. Acá se mide de nuevo, con OTRO criterio
// —que no usa el ancla—, sobre OTRO denominador —las 781 filas de la tabla y no
// las 199 con ancla— y con placebos. Si diera distinto, el que manda es éste.
//
// LO QUE ESTE INSTRUMENTO NO HACE: no dice si el punto corregido cae en tierra o
// en agua. Eso exige `ne_land` en PostGIS y es el instrumento que M2 (§5.3) pidió
// y que no existe. Lo que sí trae, y es más fuerte, es el GEMELO: diez de los
// once tienen a menos de 500 m un nodo MOP ya verificado y con su bahía puesta.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
require('dotenv').config();
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');
const { Pool } = require('pg');

const BACK = 'C:/Users/katia/tmarea-backend';
const INS = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/insumos');
const SALIDA = process.argv[2] || path.join(__dirname, '01_medir_los_once.txt');
const TRABAJO = 'C:/Users/katia/AppData/Local/Temp/claude/C--Users-katia--claude/eb00a149-9bcc-40c1-801f-ee1beac03382/scratchpad/a1_01';

const RUTA_JOIN = path.join(BACK, 'data/catalogo/join_puerto_bahia.json');
const RUTA_TSV = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv');
const RUTA_NODOS = path.join(INS, 'nodos.json');
const SHA_JOIN = '4f9fbdc33e290a4cc2ef4dda3e98918eb3bb22466a0fbe07f0170670becddaf6';
const SHA_TSV = '0ca33c18e48229eba257573ff662cfb2f770e62b24d53354aae220c8d72a1788';
const COMMIT = 'a3f183b';

// ── LOS ONCE, DECLARADOS · nodo_id -> id de caletas_chile.json ───────────────
// El cotejo es POR NOMBRE + COMUNA, uno por uno, y va escrito acá para que se
// pueda discutir fila por fila. NO se cotejó por `fuente_id`: la numeración
// CAL-xxxx de la base ya no resuelve contra el fichero de hoy (ver H-5).
const VERDAD = {
  653: { cal: 'CAL-0078', porque: 'HUASCO / HUASCO — nombre y comuna exactos' },
  654: { cal: 'CAL-0076', porque: 'CALDERA / CALDERA — el nodo es la mejora fiscal del puerto de Caldera' },
  655: { cal: 'CAL-0082', porque: 'PUERTO VIEJO / CALDERA — nombre y comuna exactos' },
  656: { cal: 'CAL-0074', porque: 'CHANARAL / CHANARAL — el nodo es San Pedro de Chanaral de las Animas' },
  657: { cal: 'CAL-0134', porque: 'GUANAQUEROS / COQUIMBO — nombre y comuna exactos' },
  658: { cal: 'CAL-0109', porque: 'PUNTA CHOROS / LA HIGUERA — nombre y comuna exactos' },
  659: { cal: 'CAL-0210', porque: 'EL MEMBRILLO / VALPARAISO — nombre y comuna exactos' },
  660: { cal: 'CAL-0214', porque: 'PORTALES / VALPARAISO — nombre y comuna exactos' },
  661: { cal: 'CAL-0206', porque: 'SAN PEDRO CONCON / CONCON — el nodo dice "San Pedro Con Con"' },
  662: { cal: 'CAL-0192', porque: 'VENTANA / PUCHUNCAVI — singular en la fuente, plural en el nodo' },
  663: { cal: 'CAL-0250', porque: 'MATANZAS / NAVIDAD — nombre y comuna exactos' },
};

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det ? ' · ' + det : ''));
  else { fallas.push(n); say('  x ROJO EXIGIDO Y NO SALIO · ' + n + (det ? ' · ' + det : '')); }
};
const sha256buf = b => crypto.createHash('sha256').update(b).digest('hex');
const sha256 = f => sha256buf(fs.readFileSync(f));
const g = c => execSync(c, { cwd: BACK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const cerrar = () => {
  fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' });
  console.log('\n[evidencia] ' + SALIDA + ' · ' + fs.statSync(SALIDA).size + ' bytes');
  process.exit(fallas.length ? 2 : 0);
};

// ── GEOMETRIA — la MISMA de f1_generar.js, copiada verbatim ──────────────────
const R_T = 6371, rad = Math.PI / 180;
const km = (p, q) => {
  const dLa = (q.lat - p.lat) * rad, dLo = (q.lng - p.lng) * rad;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(p.lat * rad) * Math.cos(q.lat * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R_T * Math.asin(Math.sqrt(x));
};

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'mapa_navegacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

(async () => {
  say('='.repeat(80));
  say('(a1) · PIEZA 1 · MEDIR LOS ONCE — instrumento de sola lectura');
  say('corrida ' + new Date().toISOString());
  say('='.repeat(80));

  // ── 0 · ESTADO DE PARTIDA ─────────────────────────────────────────────────
  say('\n0 · ESTADO DE PARTIDA');
  const head = g('git rev-parse HEAD');
  exigir('HEAD es ' + COMMIT, head.startsWith(COMMIT), head);
  exigir('el artefacto de partida es 4f9fbdc3...', sha256(RUTA_JOIN) === SHA_JOIN, sha256(RUTA_JOIN));
  exigir('la hoja de partida es 0ca33c18...', sha256(RUTA_TSV) === SHA_TSV, sha256(RUTA_TSV));
  say('    clase de las tres huellas: sha256 del contenido del fichero en disco (FA-4)');

  // ── 1 · LA BASE CONECTA Y LA TABLA ES LA QUE CREEMOS ──────────────────────
  say('\n1 · LA BASE — el pool de pg, sin psql');
  const ver = await pool.query('select version() v, postgis_version() pg');
  say('    ' + ver.rows[0].v);
  say('    PostGIS ' + ver.rows[0].pg);
  const priv = await pool.query("select current_user u, has_table_privilege('nodos_maritimos','UPDATE') p");
  exigir('el usuario puede UPDATE sobre nodos_maritimos', priv.rows[0].p === true, priv.rows[0].u);
  const geo = await pool.query('select distinct ST_SRID(geom) s, GeometryType(geom) t from nodos_maritimos');
  exigir('geom es POINT en SRID 4326, y uno solo de cada', geo.rows.length === 1 && geo.rows[0].s === 4326 && geo.rows[0].t === 'POINT',
    'SRID ' + geo.rows[0].s + ' · ' + geo.rows[0].t);

  const q = await pool.query(`SELECT id, nombre, tipo, fuente, fuente_id,
      coalesce(region,'') AS region, coalesce(provincia,'') AS provincia, coalesce(comuna,'') AS comuna,
      bahia_sitport_id, ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng
    FROM nodos_maritimos ORDER BY id`);
  const TODOS = q.rows;
  exigir('nodos_maritimos trae 781 filas', TODOS.length === 781, TODOS.length + ' filas');
  const porFuente = {};
  for (const r of TODOS) porFuente[r.fuente] = (porFuente[r.fuente] || 0) + 1;
  say('    por fuente: ' + JSON.stringify(porFuente));

  // ── 2 · CONTROL DE FIDELIDAD — la base y el insumo congelado son lo mismo ─
  // Sin esto, cualquier cambio que se vea despues podria ser drift de la base y
  // no la correccion. Se exige IDENTIDAD BYTE A BYTE del volcado.
  say('\n2 · CONTROL DE FIDELIDAD — el volcado de la base reproduce insumos/nodos.json');
  const noSitport = TODOS.filter(r => r.fuente !== 'SITPORT').map(r => ({
    id: r.id, nombre: r.nombre, tipo: r.tipo, fuente: r.fuente, region: r.region,
    provincia: r.provincia, comuna: r.comuna, bahia_sitport_id: r.bahia_sitport_id,
    lat: r.lat, lng: r.lng,
  }));
  // El insumo cierra con CRLF: se reproduce tal cual, no se "normaliza".
  const volcado = '[' + noSitport.map(f => JSON.stringify(f)).join(', ') + ']\r\n';
  const refBuf = fs.readFileSync(RUTA_NODOS);
  const ref = refBuf.toString('utf8');
  exigir('el volcado trae 693 filas, como el insumo', noSitport.length === 693 && JSON.parse(ref).length === 693,
    noSitport.length + ' / ' + JSON.parse(ref).length);
  exigir('el volcado de HOY reproduce insumos/nodos.json BYTE A BYTE',
    Buffer.from(volcado, 'utf8').equals(refBuf),
    'sha256 volcado ' + sha256buf(Buffer.from(volcado, 'utf8')).slice(0, 12) + '... · insumo ' + sha256buf(refBuf).slice(0, 12) + '...');
  say('    LO QUE ESTO PRUEBA: `insumos/nodos.json` NO es evidencia independiente de la');
  say('    base — es su espejo. La base no derivo desde el 2026-08-17. Por eso, despues');
  say('    de 02_, el UNICO delta del insumo va a ser la correccion.');

  // ── 3 · CONTROL DE REGRESION — el generador reproduce el artefacto vigente ─
  say('\n3 · CONTROL DE REGRESION — f1_generar.js del arbol reproduce 4f9fbdc3...');
  fs.mkdirSync(TRABAJO, { recursive: true });
  {
    const SRC = fs.readFileSync(path.join(INS, 'f1_generar.js'), 'utf8');
    const REDIR = [
      // `AQUI` es de donde el generador lee `nodos.json`. La copia vive en el
      // scratchpad, asi que hay que devolverselo apuntado al insumo de verdad.
      ["const BACK = 'C:/Users/katia/tmarea-backend', AQUI = __dirname;",
        "const BACK = 'C:/Users/katia/tmarea-backend', AQUI = '" + INS.replace(/\\/g, '/') + "';"],
      ["const rutaArt = path.join(BACK, 'data/catalogo/join_puerto_bahia.json');",
        "const rutaArt = path.join(process.env.A1_SALIDA, 'join.json');"],
      ["const rutaHoja = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv');",
        "const rutaHoja = path.join(process.env.A1_SALIDA, 'adj.tsv');"],
    ];
    let t = SRC, ok = true;
    for (const [a, b] of REDIR) {
      const n = t.split(a).length - 1;
      if (n !== 1) { exigir('ancla unica al redirigir la salida', false, 'aparece ' + n + ' veces: ' + a.slice(0, 50)); ok = false; break; }
      t = t.replace(a, b);
    }
    if (ok) {
      const dst = path.join(TRABAJO, 'gen_actual.js');
      fs.writeFileSync(dst, t, 'utf8');
      const dir = path.join(TRABAJO, 'A'); fs.mkdirSync(dir, { recursive: true });
      const r = spawnSync(process.execPath, [dst], {
        cwd: BACK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
        env: Object.assign({}, process.env, { A1_SALIDA: dir }),
      });
      if (r.status !== 0) exigir('la corrida del generador sale 0', false, 'status ' + r.status + ' · ' + String(r.stderr).slice(0, 200));
      else {
        const A = JSON.parse(fs.readFileSync(RUTA_JOIN, 'utf8'));
        const j = JSON.parse(fs.readFileSync(path.join(dir, 'join.json'), 'utf8'));
        let ig = 0;
        for (let i = 0; i < A.filas.length; i++) if (JSON.stringify(A.filas[i]) === JSON.stringify(j.filas[i])) ig++;
        exigir('el generador reproduce el artefacto vigente 688/688', ig === 688 && j.filas.length === 688, ig + '/688');
        exigir('y reproduce la hoja byte por byte', sha256(path.join(dir, 'adj.tsv')) === SHA_TSV, sha256(path.join(dir, 'adj.tsv')));
      }
    }
  }
  if (fallas.length) { say('\nEL ESTADO DE PARTIDA NO QUEDO VERIFICADO — no se publica ninguna medicion.'); await pool.end(); cerrar(); }

  // ── 4 · BAHIA_COORDS Y EL MATERIAL ────────────────────────────────────────
  say('\n4 · INSUMOS DE LA MEDICION');
  const SRCR = fs.readFileSync(path.join(BACK, 'src/routes/sitport-routes.js'), 'utf8');
  const ia = SRCR.indexOf('const BAHIA_COORDS = {'), ib = SRCR.indexOf('\n};', ia);
  const BLOQUE = SRCR.slice(ia, ib + 3);
  const BAHIA_COORDS = new Function(BLOQUE + '\n return BAHIA_COORDS;')();
  const COORDS = Object.entries(BAHIA_COORDS).map(([id, c]) => ({ id: +id, lat: c.lat, lng: c.lng }));
  say('    BAHIA_COORDS · ' + COORDS.length + ' bahias · sha256 del bloque ' + sha256buf(Buffer.from(BLOQUE, 'utf8')).slice(0, 12) + '...');
  const bcat = JSON.parse(fs.readFileSync(path.join(BACK, 'sondaje-sitport/bahias_sitport.json'), 'utf8')).recordsets[0];
  const nombreBahia = new Map(bcat.map(x => [Number(x.IDBahia), String(x.NMBahia || '').trim()]));
  for (const [id, c] of Object.entries(BAHIA_COORDS)) if (!nombreBahia.has(+id)) nombreBahia.set(+id, c.nombre || '');
  const orden = p => COORDS.map(c => ({ id: c.id, km: km(p, c) })).sort((x, y) => x.km - y.km);

  const { derivarCierre } = require(path.join(BACK, 'src/services/cierre-derivador.js'));
  const VIVO = require(path.join(INS, 'CONGELADO_vivo.json'));
  const F = {}, C = {};
  for (const r of VIVO.cuerpo.data) {
    F[r.bahia] = (F[r.bahia] || 0) + 1;
    if (derivarCierre(r).estado === 'cerrado') C[r.bahia] = (C[r.bahia] || 0) + 1;
  }
  const mat = id => (F[id] || 0) + 'f/' + (C[id] || 0) + 'cerr';
  say('    MATERIAL · insumos/CONGELADO_vivo.json · congelado_en ' + VIVO.congelado_en + ' · ' + VIVO.cuerpo.data.length + ' filas');
  say('      bahias con material ' + Object.keys(F).length + ' de 163 · con cierre ' + Object.keys(C).length);
  say('      ES EL MISMO INSUMO CON QUE SE PUBLICO EL 8. No se cambia de captura a mitad de la cuenta.');
  const CAL = new Map(JSON.parse(fs.readFileSync(path.join(BACK, 'caletas_chile.json'), 'utf8')).map(c => [c.id, c]));
  say('    VERDAD DE TERRENO · caletas_chile.json · ' + CAL.size + ' caletas · fuente declarada SUBPESCA_geoportal_2025');

  // ── 5 · EL CRITERIO, CON SU ARBOL, SU VOCABULARIO Y SUS PLACEBOS ──────────
  say('\n5 · EL CRITERIO — declarado antes de correr');
  say('    ARBOL       : las 781 filas de nodos_maritimos en vivo. NO las 693 del universo');
  say('                  del join, NO las 199 con ancla. El defecto es de la tabla.');
  say('    VOCABULARIO : distancia haversine R=6371 km contra las ' + COORDS.length + ' entradas de');
  say('                  BAHIA_COORDS extraidas verbatim de src/routes/sitport-routes.js.');
  say('    CRITERIO    : la bahia mas cercana HOY esta a mas de 100 km  Y  con `lng + off`');
  say('                  queda a menos de 50 km de alguna. NO USA EL ANCLA.');
  say('    POR QUE NO USA EL ANCLA: el ancla salio de la coordenada desplazada (§7 abajo),');
  say('                  asi que un criterio que la use se estaria mirando el ombligo.');
  const conCoord = TODOS.filter(r => r.lat != null && r.lng != null);
  const lejosHoy = conCoord.filter(r => orden(r)[0].km > 100);
  say('\n    DENOMINADOR — control negativo, la medicion no devuelve "todo":');
  say('      filas con coordenada ................. ' + conCoord.length + ' / 781');
  say('      a mas de 100 km de TODA bahia hoy .... ' + lejosHoy.length + '   ids ' + lejosHoy.map(r => r.id).join(','));
  say('\n    PLACEBOS — control positivo, el cero de los otros offsets no es un grep vacio:');
  let marcadosSeis = null;
  for (const off of [6, 3, -3, -6, 9, 12, -9]) {
    const ms = lejosHoy.filter(r => orden({ lat: r.lat, lng: r.lng + off })[0].km < 50);
    if (off === 6) marcadosSeis = ms;
    say('      off ' + String(off).padStart(3) + ' grados -> ' + String(ms.length).padStart(3) + ' marcados'
      + (ms.length ? '   ids ' + ms.map(x => x.id).join(',') : ''));
  }
  exigir('el criterio marca ONCE con +6 grados', marcadosSeis.length === 11, marcadosSeis.length + ' marcados');
  exigir('los once son ids consecutivos 653..663',
    marcadosSeis.map(r => r.id).join(',') === '653,654,655,656,657,658,659,660,661,662,663',
    marcadosSeis.map(r => r.id).join(','));
  exigir('los once son los once de VERDAD, sin sobrantes ni faltantes',
    marcadosSeis.every(r => VERDAD[r.id]) && Object.keys(VERDAD).length === marcadosSeis.length,
    Object.keys(VERDAD).length + ' declarados');
  const fuentes = [...new Set(marcadosSeis.map(r => r.fuente))];
  say('    CORROBORACION ESTRUCTURAL, independiente del criterio: los once son un BLOQUE DE');
  say('    IDS CONSECUTIVO y comparten fuente ' + JSON.stringify(fuentes) + '. Es un lote de insercion.');
  const noMarcados = lejosHoy.filter(r => !marcadosSeis.find(x => x.id === r.id));
  say('    LOS QUE EL CRITERIO DEJA FUERA — y por que (control negativo con nombre):');
  for (const r of noMarcados) {
    const h = orden(r)[0], c = orden({ lat: r.lat, lng: r.lng + 6 })[0];
    say('      #' + String(r.id).padStart(3) + ' ' + String(r.nombre).padEnd(30).slice(0, 30) + ' [' + r.fuente + '] hoy '
      + h.km.toFixed(1) + ' km · con +6 ' + c.km.toFixed(1) + ' km ' + (c.km > h.km ? '(EMPEORA)' : '(mejora pero no baja de 50)'));
  }

  // ── 6 · CONTROL NEGATIVO CON NOMBRE — los que SI estan en Juan Fernandez ──
  say('\n6 · CONTROL NEGATIVO — los cuatro nodos que SI estan en Juan Fernandez');
  say('    Si el test marcara a todos por igual no mediria nada. Con +6 grados EMPEORAN:');
  const ART = JSON.parse(fs.readFileSync(RUTA_JOIN, 'utf8'));
  for (const f of ART.filas.filter(x => /Cumberland|Juan Fern|El Padre/i.test(x.nombre))) {
    const bc = BAHIA_COORDS[f.bahia_id];
    say('      #' + String(f.nodo_id).padStart(3) + ' ' + f.nombre.padEnd(50).slice(0, 50)
      + ' al ancla ' + f.bahia_id + ': hoy ' + (bc ? km(f, bc).toFixed(1) : '-') + ' km · con +6 '
      + (bc ? km({ lat: f.lat, lng: f.lng + 6 }, bc).toFixed(1) : '-') + ' km');
  }

  // ── 7 · EL ANCLA SALIO DE LA COORDENADA — la premisa que da vuelta (a2) ──
  say('\n7 · EL ANCLA ES CONSECUENCIA DE LA COORDENADA, NO UN DATO INDEPENDIENTE');
  const dec = ART.filas.filter(f => f.estado === 'confirmado_declarado');
  const coincide = dec.filter(f => f.evidencia.la_geografia_coincide === true).length;
  const lejos12 = dec.filter(f => f.evidencia.km_a_esa_bahia > 100);
  exigir('las 12 filas bahia_declarada_lejos tienen la_geografia_coincide = true',
    lejos12.length === 12 && lejos12.every(f => f.evidencia.la_geografia_coincide === true),
    lejos12.length + ' filas, todas true');
  say('    sobre TODO confirmado_declarado: ' + coincide + ' / ' + dec.length + ' con la_geografia_coincide = true');
  say('    O SEA: `bahia_sitport_id` ES la bahia mas cercana al punto equivocado. El ancla no');
  say('    confirma nada — repite el error. Esto es lo que da vuelta la premisa con que §6.4');
  say('    descarto (a2) como "tratar el sintoma": el sintoma era la coordenada, el ancla es');
  say('    lo que la propaga.');

  // ── 8 · LOS ONCE, UNO POR UNO, CONTRA LA VERDAD DE TERRENO ───────────────
  say('\n8 · LOS ONCE — coordenada de hoy contra la fuente');
  say('nodo nombre                                  lat base    lng base  lat fuente  lng fuente      dlat      dlng   dlat km  dlng-6 km');
  say('-'.repeat(140));
  const T = [];
  for (const r of marcadosSeis) {
    const v = VERDAD[r.id], c = CAL.get(v.cal);
    if (!c) { exigir('la caleta ' + v.cal + ' existe en caletas_chile.json', false, 'nodo ' + r.id); continue; }
    const dlat = c.latitud - r.lat, dlng = c.longitud - r.lng;
    T.push({ r, c, v, dlat, dlng });
    say(String(r.id).padStart(4) + ' ' + String(r.nombre).padEnd(36).slice(0, 36)
      + ' ' + r.lat.toFixed(6).padStart(11) + ' ' + r.lng.toFixed(6).padStart(11)
      + ' ' + c.latitud.toFixed(6).padStart(11) + ' ' + c.longitud.toFixed(6).padStart(11)
      + ' ' + dlat.toFixed(6).padStart(9) + ' ' + dlng.toFixed(6).padStart(9)
      + ' ' + (dlat * 111.19).toFixed(2).padStart(9) + ' ' + ((dlng - 6) * 111.19 * Math.cos(r.lat * rad)).toFixed(2).padStart(10));
  }
  say('');
  for (const t of T) say('    #' + t.r.id + ' <- ' + t.v.cal + ' "' + t.c.nombre + '" [' + t.c.comuna + '] · cotejo: ' + t.v.porque);
  const dl = T.map(x => x.dlat), dg = T.map(x => x.dlng);
  say('');
  say('    dlat : ' + Math.min(...dl).toFixed(6) + ' a ' + Math.max(...dl).toFixed(6)
    + '  ->  ' + (Math.min(...dl) * 111.19).toFixed(1) + ' a ' + (Math.max(...dl) * 111.19).toFixed(1) + ' km AL SUR');
  say('    dlng : ' + Math.min(...dg).toFixed(6) + ' a ' + Math.max(...dg).toFixed(6));
  exigir('NINGUNO de los once tiene dlng = 6,000000 exacto', T.every(x => x.dlng !== 6), 'el rango es ' + (Math.max(...dg) - Math.min(...dg)).toFixed(6) + ' grados');
  exigir('los once tienen la LATITUD corrida mas de 30 km', T.every(x => Math.abs(x.dlat * 111.19) > 30),
    'minimo ' + (Math.min(...dl.map(Math.abs)) * 111.19).toFixed(1) + ' km');
  say('    EL ROTULO "lng DESPLAZADO 6,00" ES FALSO EN DOS LUGARES: el desplazamiento es de');
  say('    los DOS EJES, y el del lng no es 6,00 exacto en ninguno de los once.');

  // ── 9 · LOS TRES ESCENARIOS ──────────────────────────────────────────────
  say('\n9 · QUE PASA CON CADA ESCENARIO — la regla (c) mide km AL ANCLA DECLARADA');
  say('    E0 = hoy · E1 = solo lng +6,00 · E2 = los dos ejes a la fuente, ancla intacta');
  say('');
  let e1 = 0, e2 = 0, e1c = 0, e2c = 0;
  for (const t of T) {
    const f = ART.filas.find(x => x.nodo_id === t.r.id);
    const anc = BAHIA_COORDS[f.bahia_id];
    const k0 = km(t.r, anc), k1 = km({ lat: t.r.lat, lng: t.r.lng + 6 }, anc), k2 = km({ lat: t.c.latitud, lng: t.c.longitud }, anc);
    if (k1 <= 100) { e1++; e1c += (C[f.bahia_id] || 0); }
    if (k2 <= 100) { e2++; e2c += (C[f.bahia_id] || 0); }
    const v2 = orden({ lat: t.c.latitud, lng: t.c.longitud })[0];
    say('    #' + String(t.r.id).padStart(3) + ' ' + String(t.r.nombre).padEnd(36).slice(0, 36)
      + ' ancla ' + String(f.bahia_id).padStart(3) + ' "' + (nombreBahia.get(f.bahia_id) || '') + '" [' + mat(f.bahia_id) + ']');
    say('          E0 ' + k0.toFixed(1).padStart(7) + ' km   E1 ' + k1.toFixed(1).padStart(7) + ' km ' + (k1 > 100 ? '(sigue lejos)' : '(BAJA)')
      + '   E2 ' + k2.toFixed(1).padStart(7) + ' km ' + (k2 > 100 ? '(sigue lejos)' : '(BAJA)')
      + '   | vecina en E2: ' + String(v2.id).padStart(3) + ' "' + (nombreBahia.get(v2.id) || '') + '" a ' + v2.km.toFixed(2) + ' km [' + mat(v2.id) + ']');
  }
  say('');
  say('    E1 (solo lng, ancla intacta) : ' + e1 + ' / 11 salen de bahia_declarada_lejos · cierres devueltos ' + e1c);
  say('    E2 (dos ejes, ancla intacta) : ' + e2 + ' / 11 salen de bahia_declarada_lejos · cierres devueltos ' + e2c);
  exigir('E1 no mueve NINGUNA fila — la pieza tal como estaba escrita mide cero', e1 === 0 && e1c === 0, e1 + ' filas · ' + e1c + ' cierres');
  exigir('E2 tampoco, con el ancla puesta', e2 === 0 && e2c === 0, e2 + ' filas · ' + e2c + ' cierres');
  say('    POR QUE: f1_generar.js asigna `bahia_id = p.idBahia` INCONDICIONAL en la rama del');
  say('    ancla. Mover el nodo cambia `km_a_esa_bahia` y nada mas. Y los nueve que declaran');
  say('    la bahia 90 "Isla Robinson Crusoe" SE ALEJAN al corregirse.');
  say('    POR ESO (a2) VA JUNTO CON (a1): sin soltar el ancla, la correccion no compra nada.');

  // ── 10 · LOS GEMELOS ─────────────────────────────────────────────────────
  say('\n10 · LOS GEMELOS — por que estos once existen como fila');
  say('    tools/seed-nodos-maritimos.js, seedSERNAPESCA, dedupe DIST_DEG = 0.005 (~500 m).');
  say('    En su sitio real el seed los habria descartado como duplicados.');
  say('');
  const PJ = new Map(ART.filas.map(f => [f.nodo_id, f]));
  let conGemelo = 0;
  for (const t of T) {
    const P2 = { lat: t.c.latitud, lng: t.c.longitud };
    const v = TODOS.filter(x => x.id !== t.r.id && x.lat != null).map(x => ({ x, d: km(P2, x) })).filter(y => y.d <= 2).sort((a, b) => a.d - b.d);
    say('    #' + String(t.r.id).padStart(3) + ' ' + String(t.r.nombre).padEnd(36).slice(0, 36) + (v.length ? '' : '  -> sin vecino a 2 km'));
    if (v.length && v[0].d <= 0.5) conGemelo++;
    for (const y of v.slice(0, 3)) {
      const fg = PJ.get(y.x.id);
      say('          ' + y.d.toFixed(3).padStart(7) + ' km  #' + String(y.x.id).padStart(3) + ' [' + y.x.fuente + '] '
        + String(y.x.nombre).padEnd(40).slice(0, 40)
        + (fg ? ' -> join: ' + String(fg.estado).padEnd(21) + ' b' + String(fg.bahia_id) + ' [' + (fg.bahia_id != null ? mat(fg.bahia_id) : '-') + ']' : ' -> no esta en el join'));
    }
  }
  say('');
  say('    con gemelo a menos de 500 m en la posicion corregida: ' + conGemelo + ' / 11');
  const hoyVecinos = T.reduce((s, t) => s + TODOS.filter(x => x.id !== t.r.id && x.lat != null && km(t.r, x) <= 2).length, 0);
  exigir('CONTROL: hoy, desplazados, NINGUNO tiene vecino a 2 km', hoyVecinos === 0, hoyVecinos + ' vecinos');
  say('    LOS 8 CIERRES YA SE SIRVEN HOY — al gemelo. #43 "Caleta Pesquera Huasco" recibe la');
  say('    bahia 84 [' + mat(84) + '] y #40 "Caleta Pesquera Caldera" la 81 [' + mat(81) + ']. Lo que');
  say('    esta roto no es el cierre: son DOS de los 688 nombres por los que no se llega.');

  // ── 11 · EL BALANCE DE LA REGLA (c), RECONCILIADO ────────────────────────
  say('\n11 · EL BALANCE DE LA REGLA (c) — 8 + 2 + 2 = 12, reconciliado contra el mismo material');
  const fp = [], fn = [], sinMat = [];
  for (const f of lejos12) {
    const n = F[f.bahia_id] || 0;
    if (f.nodo_id === 653 || f.nodo_id === 654) fn.push(f); else if (n > 0) fp.push(f); else sinMat.push(f);
  }
  say('    falsos positivos evitados (unidad: FILAS del join) ... ' + fp.length + '   ' + fp.map(f => f.nodo_id).join(','));
  say('    falsos negativos          (unidad: FILAS del join) ... ' + fn.length + '   ' + fn.map(f => f.nodo_id).join(','));
  say('    sin material a esta hora  (unidad: FILAS del join) ... ' + sinMat.length + '   ' + sinMat.map(f => f.nodo_id).join(','));
  exigir('el reparto de las 12 es 8 + 2 + 2', fp.length === 8 && fn.length === 2 && sinMat.length === 2,
    fp.length + ' + ' + fn.length + ' + ' + sinMat.length);
  const cierresEnJuego = (C[81] || 0) + (C[84] || 0);
  exigir('los CIERRES en juego son 8 (unidad: CIERRES, no filas)', cierresEnJuego === 8,
    'bahia 81 -> ' + (C[81] || 0) + ' · bahia 84 -> ' + (C[84] || 0));
  say('    OJO CON LA UNIDAD: los 8 falsos positivos son FILAS del join; los 8 cierres son');
  say('    CIERRES y salen de DOS filas. Son conjuntos distintos con el mismo numero.');

  say('\n' + '='.repeat(80));
  say(fallas.length ? fallas.length + ' FALLA(S)' : 'SIN FALLAS — estado de partida verificado y los once medidos.');
  say('QUE NO PRUEBA: no dice si el punto corregido cae en tierra o en agua. Para eso hace');
  say('falta ne_land en PostGIS y ese instrumento no existe. El gemelo a menos de 500 m es');
  say('una prueba de costa mas fuerte, pero es OTRA cosa y se dice.');
  say('='.repeat(80));
  await pool.end();
  cerrar();
})().catch(e => { say('EXCEPCION: ' + e.stack); pool.end().catch(() => {}); cerrar(); });
