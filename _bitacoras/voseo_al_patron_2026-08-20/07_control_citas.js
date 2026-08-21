'use strict';
// CONTROL DE CITAS. La regla del arbol: una cita no esta escrita hasta que se
// leyo de vuelta contra su origen. Este control lo hace por maquina.
//
// La bitacora esta escrita SIN TILDES a proposito —evita el problema NFD/NFC que
// D1 dejo fichado—, asi que el cotejo pliega tildes en las dos puntas antes de
// comparar. Lo que se compara es la LETRA, no la codificacion.
const fs = require('fs'), path = require('path');
const D = __dirname;
const BACK = path.resolve(D, '..', '..'), PWA = path.resolve(BACK, '..', 'tmarea-pwa');
const abs = (c) => (c.indexOf('pwa/') === 0 ? path.join(PWA, c.slice(4)) : path.join(BACK, c.slice(8)));

const COMB = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36F) + "]", "g");
const COMILLAS = new RegExp("[" + String.fromCharCode(0x2018,0x2019,0x201C,0x201D) + "]", "g");
const ESP = new RegExp(String.fromCharCode(92) + "s+", "g");
const plegar = (s) => s.normalize("NFD").replace(COMB, "").toLowerCase()
  .replace(COMILLAS, String.fromCharCode(39)).replace(ESP, " ").trim();

const CITAS = [
  ['pwa/src/components/verification/DriftCatalogoBlock.jsx', 'Autoridad Maritima antes de zarpar, o por VHF Canal 16.'],
  ['pwa/src/components/verification/DriftCatalogoBlock.jsx', 'La comprobacion no se pudo completar'],
  ['pwa/src/screens/P3_VoyageVerification.jsx', 'por VHF Canal 16 antes de recalar.'],
  ['pwa/src/screens/P3_VoyageVerification.jsx', 'Verifica los puertos de zarpe y recalada.'],
  ['backend/data/decreto/zonas_aviso.json', 'Confirma con la Capitania {nombre} antes de zarpar.'],
  ['backend/data/decreto/zonas_aviso.json', 'Coordina con la Autoridad Maritima por VHF Canal 16 antes de zarpar.'],
  ['backend/CONTRATO_MOTOR.md', 'si aseguras que la nave esta en condiciones y te responsabilizas'],
  ['backend/CONTRATO_MOTOR.md', 'si debes cambiar el puerto de recalada, solicita permiso'],
  ['backend/CONTRATO_MOTOR.md', 'puedes efectuar arribada forzosa'],
  ['backend/CONTRATO_MOTOR.md', 'Avisa de inmediato a la Autoridad Maritima por VHF Canal 16.'],
  ['backend/CONTRATO_MOTOR.md', 'No ingreses a la zona. Contacta por VHF Canal 16'],
  ['backend/CONTRATO_MOTOR.md', 'avisa tu arribada a la Autoridad Maritima'],
  ['backend/CONTRATO_MOTOR.md', 'Gestiona tu despacho antes de navegar.'],
  ['backend/CONTRATO_MOTOR.md', 'Informa tu intencion de movimiento al club nautico'],
  ['backend/CONTRATO_MOTOR.md', 'Tu horario estimado excede la luz diurna.'],
  ['backend/CONTRATO_MOTOR.md', 'Confirma con la Capitania [nombre] antes de zarpar.'],
];

const CITAS_USTED = [
  ['pwa/src/data/maritime_data.json.json', 'Verifique tabla de marea local.'],
  ['pwa/src/data/maritime_data.json.json', 'Mantenga escucha activa.'],
  ['pwa/src/screens/P4_ActiveVoyage.jsx', 'navegue con sonda'],
  ['backend/src/services/raster-router-service.js', 'Sin datos de profundidad en este tramo. Navegue con sonda.'],
  ['backend/src/services/raster/cotejo-vertical.js', 'verifique con ecosonda antes de navegar.'],
];
const CITAS_DUDOSAS = [
  ['pwa/src/App.jsx', 'NAVEGA CON CERTEZA'],
  ['pwa/src/screens/P2_VoyageSetup.jsx', 'Que recurso busca explotar?'],
  ['backend/src/services/marine-weather-service.js', 'Verifica que especies_pesca.json este en el directorio raiz del backend.'],
];
const CITAS_PISO = [
  ['pwa/src/screens/P3_VoyageVerification.jsx', 'Intenta seleccionar un punto mas cercano'],
  ['pwa/src/screens/P4_ActiveVoyage.jsx', 'Descarga el informe operacional antes de cerrar.'],
  ['pwa/src/data/Biblioteca/balizamiento_01.json', 'No navegues entre estas boyas.'],
];

// ── CITAS RETIRADAS: el texto que esta pieza borro a proposito ──────────────
// No se borran de la lista: se invierte la asercion. Una cita que describia el
// arbol de ayer tiene que dejar de cotejar, y que deje de cotejar es
// exactamente lo que prueba que la correccion entro. Borrarlas seria perder esa
// prueba; dejarlas como estaban seria un control en rojo sobre un arbol sano.
const CITAS_RETIRADAS = [
  ['pwa/src/components/verification/DriftCatalogoBlock.jsx', 'Consulta con la'],
  ['pwa/src/screens/P3_VoyageVerification.jsx', 'Contacta a la autoridad maritima por VHF Canal 16 antes de recalar.'],
];
// ── PARADA 2: lo corregido y lo citado en los documentos nuevos ─────────────
const CITAS_P2 = [
  ['pwa/src/components/verification/DriftCatalogoBlock.jsx', 'Consulte con la'],
  ['pwa/src/screens/P3_VoyageVerification.jsx', 'Contacte a <strong>{rotulo}</strong> por VHF Canal 16 antes de recalar.'],
  ['pwa/src/screens/P3_VoyageVerification.jsx', 'Contacte a la autoridad maritima por VHF Canal 16 antes de recalar.'],
  ['backend/data/decreto/zonas_aviso.json', 'Coordina con la Autoridad Maritima por VHF Canal 16 antes de zarpar.'],
  ['backend/data/decreto/zonas_aviso.json', 'No cubre `capa_2_sin_capitania` ni `contacto_generico`'],
  ['backend/src/services/marine-weather-service.js', 'Verifica que especies_pesca.json este en el directorio raiz del backend.'],
  ['backend/src/routes/marine-weather-routes.js', 'Demasiadas solicitudes. Intenta en un minuto.'],
  ['pwa/src/screens/P2_VoyageSetup.jsx', 'api/marine-weather/especies'],
  ['pwa/src/components/DeportiveAlerts.jsx', 'genera tu zarpe digital en'],
  ['pwa/src/data/Biblioteca/reglamentos_01.json', 'Si chocas, varas o sufres danos'],
  ['pwa/src/data/Biblioteca/maniobras_01.json', 'mientras tiras de ella'],
  ['pwa/src/screens/P4_ActiveVoyage.jsx', 'Descarga el informe operacional antes de cerrar.'],
];
// LO QUE ESTE CONTROL NO PUEDE LEER DE VUELTA: el §10 redactado en usted. Todavia
// no existe en ningun fichero — es lo que el owner va a pegar. Lo que SI se leyo
// de vuelta es su ORIGEN, el §10 en tuteo, en el grupo de PARADA 1.
const L = [];
const say = (s) => L.push(s === undefined ? '' : s);
say('CONTROL DE CITAS — voseo_al_patron_2026-08-20');
say('');
say('Cada cita de 06_barrido_clasificado.txt se lee de vuelta contra su fichero.');
say('El cotejo pliega tildes en las DOS puntas: la bitacora va sin tildes y el');
say('arbol con ellas, asi que lo que se compara es la letra, no la codificacion.');
say('');

const cache = new Map();
const leer = (c) => {
  if (!cache.has(c)) { try { cache.set(c, plegar(fs.readFileSync(abs(c), 'utf8'))); } catch { cache.set(c, null); } }
  return cache.get(c);
};
let mal = 0, n = 0;
const correr = (titulo, lista) => {
  say('── ' + titulo + ' (' + lista.length + ') ──');
  for (const [c, cita] of lista) {
    n++;
    const t = leer(c);
    const ok = t !== null && t.indexOf(plegar(cita)) >= 0;
    if (!ok) mal++;
    say('  ' + (ok ? 'OK  ' : '!!  ') + c);
    say('        "' + cita + '"');
  }
  say('');
};
correr('citas del texto al patron y del §10', CITAS);
correr('citas de usted', CITAS_USTED);
correr('citas de los casos dudosos', CITAS_DUDOSAS);
correr('citas del piso — formas fuera del vocabulario', CITAS_PISO);
correr('citas de PARADA 2 — lo corregido y lo medido', CITAS_P2);
say('── citas RETIRADAS: tienen que NO estar (' + CITAS_RETIRADAS.length + ') ──');
for (const [c, cita] of CITAS_RETIRADAS) {
  n++;
  const tx = leer(c);
  const ausente = tx !== null && tx.indexOf(plegar(cita)) < 0;
  if (!ausente) mal++;
  say('  ' + (ausente ? 'OK  ' : '!!  ') + c);
  say('        "' + cita + '"  -> ausente: ' + ausente);
}
say('');

say('CONTROL POSITIVO DEL PROPIO CONTROL: una cita inventada tiene que fallar.');
const falsa = leer('pwa/src/screens/P3_VoyageVerification.jsx');
const cazada = falsa.indexOf(plegar('Contacte a la Capitania de Puerto de Hornopiren')) < 0;
say('  ' + (cazada ? 'OK  ' : 'FALLA ') + 'una frase que NO esta en el arbol da negativo');
say('  (se probo con el texto ya corregido, que hoy todavia no existe)');
if (!cazada) mal++;
say('');
say('  citas leidas de vuelta : ' + n);
say('  citas que no cotejaron : ' + mal);
say('');
say('EXIT ' + (mal ? 1 : 0) + (mal ? '  — ROJO' : '  — VERDE'));
fs.writeFileSync(path.join(D, '07_control_citas.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
process.exit(mal ? 1 : 0);
