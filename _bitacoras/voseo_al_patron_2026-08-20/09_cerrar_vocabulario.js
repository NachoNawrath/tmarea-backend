'use strict';
// CIERRE DEL VOCABULARIO. El vocabulario del paso 01 se escribio DE MEMORIA, y
// eso lo dejo corto: al leer los resultados aparecieron 'Intenta', 'Descarga' y
// 'No navegues' — tres imperativos tuteantes que la lista no tenia. Tres que se
// vieron de reojo prueban que hay mas que no se vieron.
//
// COMO SE CIERRA: no agregando las que faltaban —eso seguiria siendo memoria—
// sino DERIVANDO los candidatos del propio corpus y leyendolos todos.
//
//   Conjunto A — POSICION DE ENCABEZAMIENTO. En texto de interfaz el imperativo
//     encabeza: arranca el fragmento o va detras de . ! ? — · : ; , y de " y " o
//     " o ". Se sacan TODOS los tokens distintos que ocupan esa posicion.
//   Conjunto B — TERMINACION DE SEGUNDA PERSONA. Todo token que termina en -as
//     -es -is o en sus agudas -as -es -is con tilde. Cubre 'puedes', 'tenes',
//     'navegues', y de paso arrastra sustantivos plurales, que se descartan al
//     leer.
//
// LO QUE ESTE CIERRE NO CUBRE, dicho antes de que nadie lo descubra: un
// imperativo que NO encabece y NO termine en -as/-es/-is. Los irregulares
// cortos —ten, haz, pon, sal, ven, ve, di, se— caen todos en A porque siempre
// encabezan; el hueco real es un imperativo regular metido a mitad de frase sin
// puntuacion delante. Se mide abajo cuantos fragmentos tienen esa forma.
const fs = require('fs'), path = require('path');
const D = __dirname;
const frags = JSON.parse(fs.readFileSync(path.join(D, '03_fragmentos.json'), 'utf8'));

const LETRA = new RegExp('[' + String.fromCharCode(92) + 'p{L}]', 'u');
const NOLETRA = new RegExp('[^' + String.fromCharCode(92) + 'p{L}' + String.fromCharCode(92) + 'p{N}]+', 'u');
const tokens = (s) => s.split(NOLETRA).filter((t) => t && LETRA.test(t));

// FILTRO DE PROSA. Sin el, el conjunto A da 4.046 tokens y son valores CSS,
// colores hexadecimales e identificadores: "12px", "0a2647", "100vh". No son
// castellano y no pueden esconder un imperativo.
//
// CRITERIO, declarado: un fragmento es PROSA si tiene 3 o mas tokens de letras
// y trae al menos una palabra funcional del castellano. Una frase de interfaz
// sin ninguna de esas 26 palabras es rarisima; un valor CSS no tiene ninguna.
// El costo del filtro se mide abajo: cuantos fragmentos deja fuera.
const FUNCION = new Set(['de','la','el','en','con','para','que','los','las','un',
  'una','del','al','por','se','su','tu','y','o','no','mas','antes','si','es','esta','este']);
const sinTilde = (s) => s.normalize("NFD").replace(new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36F) + "]", "g"), "");
const esProsa = (s) => {
  const t = tokens(s);
  if (t.length < 3) return false;
  return t.some((x) => FUNCION.has(sinTilde(x.toLowerCase())));
};
const soloLetras = (tok) => /^[a-zA-Zaeiounu]+$/.test(sinTilde(tok)) && tok.length >= 2;
const CORTES = ['.', '!', '?', '—', '·', ':', ';', ',', '⚠', '📍', '→'];
const A = new Map(), B = new Map();
const anota = (m, tok, ej) => {
  const k = tok.toLowerCase().normalize('NFC');
  if (!m.has(k)) m.set(k, { n: 0, ej });
  m.get(k).n++;
};

const TERM = ['as', 'es', 'is', 'ás', 'és', 'ís'];
let prosa = 0;
for (const f of frags) {
  const s = f.frag.normalize('NFC');
  if (!esProsa(s)) continue;
  prosa++;
  // ── conjunto A: cabeza de fragmento y cabeza tras un corte ──
  const trozos = [];
  let buf = '';
  for (const ch of s) {
    if (CORTES.indexOf(ch) >= 0) { trozos.push(buf); buf = ''; } else buf += ch;
  }
  trozos.push(buf);
  for (const tr of trozos) {
    const t = tokens(tr);
    if (t.length && soloLetras(t[0])) anota(A, t[0], tr.trim().slice(0, 110));
    for (let i = 1; i < t.length; i++) {
      if (t[i - 1].toLowerCase() === 'y' || t[i - 1].toLowerCase() === 'o' || t[i - 1].toLowerCase() === 'no') {
        if (soloLetras(t[i])) anota(A, t[i], tr.trim().slice(0, 110));
      }
    }
  }
  // ── conjunto B: terminacion de segunda persona ──
  for (const t of tokens(s)) {
    const b = t.toLowerCase().normalize('NFC');
    if (soloLetras(t) && TERM.some((x) => b.length > x.length + 1 && b.slice(-x.length) === x)) anota(B, t, s.trim().slice(0, 110));
  }
}

const L = [];
const say = (s) => L.push(s === undefined ? '' : s);
say('CIERRE DEL VOCABULARIO — voseo_al_patron_2026-08-20');
say('');
say('METODO: los candidatos se DERIVAN del corpus, no se recuerdan.');
say('  A = token en posicion de encabezamiento (cabeza de fragmento, o detras de');
say('      . ! ? — · : ; , y de las palabras "y" / "o" / "no")');
say('  B = token terminado en -as -es -is, con o sin tilde');
say('');
say('fragmentos de ROL P leidos  : ' + frags.length);
say('de esos, PROSA castellana  : ' + prosa + '  (' + (100*prosa/frags.length).toFixed(1) + '%)');
say('descartados por el filtro   : ' + (frags.length - prosa) + '  — valores CSS, colores, identificadores');
say('tokens distintos en A      : ' + A.size);
say('tokens distintos en B      : ' + B.size);
say('');
say('Los dos conjuntos se leen ENTEROS. Lo que no salga de aca no esta en el');
say('inventario, y eso queda dicho con su motivo.');
say('');

const volcar = (titulo, m, min) => {
  const e = [...m.entries()].filter(([, v]) => v.n >= min).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  say('════ CONJUNTO ' + titulo + ' — ' + e.length + ' tokens con al menos ' + min + ' aparicion(es) ════');
  const linea = [];
  for (const [k, v] of e) linea.push(k + '(' + v.n + ')');
  for (let i = 0; i < linea.length; i += 6) say('  ' + linea.slice(i, i + 6).join('  '));
  say('');
};
volcar('A · encabezamiento', A, 1);
volcar('B · terminacion -as/-es/-is', B, 1);

// ── medida del hueco que este metodo NO cubre ───────────────────────────────
// Un imperativo regular metido a mitad de frase, sin corte ni conjuncion
// delante, no cae en A. Se mide cuantos fragmentos podrian esconder uno: los
// que traen mas de un token y NINGUN corte adentro.
let sinCorte = 0;
for (const f of frags) {
  const s = f.frag.normalize('NFC');
  if (tokens(s).length > 1 && !CORTES.some((c) => s.indexOf(c) >= 0)) sinCorte++;
}
say('════ EL HUECO, MEDIDO ════');
say('  fragmentos con mas de un token y sin ningun corte adentro : ' + sinCorte);
say('  (' + (100 * sinCorte / frags.length).toFixed(1) + '% de los ' + frags.length + ')');
say('  Son los unicos donde un imperativo podria esconderse fuera de A. Si ademas');
say('  no termina en -as/-es/-is, tampoco cae en B. Ese es el residuo del metodo,');
say('  y no es cero: se declara, no se disimula.');
say('');

fs.writeFileSync(path.join(D, '09_candidatos.txt'), L.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(D, '09_candidatos.json'), JSON.stringify({
  A: [...A.entries()].map(([k, v]) => ({ tok: k, n: v.n, ej: v.ej })),
  B: [...B.entries()].map(([k, v]) => ({ tok: k, n: v.n, ej: v.ej })),
}, null, 1), 'utf8');
console.log(L.slice(0, 18).join('\n'));
