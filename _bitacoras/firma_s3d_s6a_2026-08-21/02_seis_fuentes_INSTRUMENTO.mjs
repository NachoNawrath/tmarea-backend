// INSTRUMENTO DE SESION — vive en el scratchpad, NO en los repos.
// Precedente: 01_control_aceptacion.mjs de U2 A+C (firma del owner).
// Corre las funciones PURAS reales de la PWA sobre el dato vivo de hoy.
import { readFileSync } from 'node:fs';
import {
  calcularVeredicto, mapearRespuestaPuerto,
  escalarPorTransito, escalarPorDrift, escalarPorCobertura,
} from 'file:///C:/Users/katia/tmarea-pwa/src/hooks/useVoyageVerification.js';

const SP = 'C:/Users/katia/AppData/Local/Temp/claude/C--Users-katia--claude/d4580014-1ca4-426b-ae1c-c0e145f37959/scratchpad/';
const J = f => JSON.parse(readFileSync(SP + f, 'utf8'));

const zarpe    = mapearRespuestaPuerto(J('puerto_zarpe_hoy.json'),    'Puerto de Antofagasta');
const recalada = mapearRespuestaPuerto(J('puerto_recalada_hoy.json'), 'Caleta Pesquera Taltal');
const weather  = J('weather_hoy.json');
const transit  = J('payload_hoy.json');

const r = calcularVeredicto({
  portStatus: { zarpe, recalada },
  weather,
  navigation: { autonomia_ok: true },
  transitRestrictions: transit,
});

console.log('ESTADO CRUDO DE LOS PUERTOS (mapearRespuestaPuerto real):');
console.log('  zarpe    estado=' + zarpe.estado + '  dato_viejo=' + zarpe.dato_viejo);
console.log('  recalada estado=' + recalada.estado + '  dato_viejo=' + recalada.dato_viejo);
console.log('');
console.log('LAS SEIS FUENTES, HOY:');
for (const [k, v] of Object.entries(r.detalles)) console.log('  ' + k.padEnd(24) + v);
console.log('');
console.log('  VEREDICTO DE PANTALLA = ' + r.veredicto);
console.log('  arribadaForzosa = ' + r.arribadaForzosa);
console.log('');
console.log('DE DONDE SALE CADA U:');
console.log('  escalarPorTransito lee bandera_final del backend = ' + transit.bandera_final + '  -> ' + escalarPorTransito(transit));
console.log('  escalarPorDrift                                     -> ' + escalarPorDrift(transit, weather));
console.log('  escalarPorCobertura lee cobertura.bandera = ' + transit.cobertura_jurisdiccional.bandera + '   -> ' + escalarPorCobertura(transit));
