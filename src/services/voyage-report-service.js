// src/services/voyage-report-service.js
// Genera informe operacional de viaje en PDF y CSV
// Dependencias: pdfkit (ya disponible en Node), csv nativo

const PDFDocument = require('pdfkit');
const { Writable, PassThrough } = require('stream');

// ─────────────────────────────────────────────────────────────────────────────
// PALETA TMAREA
// ─────────────────────────────────────────────────────────────────────────────
const COLOR = {
  marino:    '#0A2647',
  electrico: '#1A6EBD',
  turquesa:  '#5DCAA5',
  coral:     '#E8512A',
  naranja:   '#F57C00',
  ambar:     '#FFC107',
  crema:     '#F1EFE8',
  gris:      '#888780',
  grisClaro: '#D3D1C7',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmt(val, decimals = 1, unit = '') {
  if (val == null || val === '') return '—';
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n)) return '—';
  return `${n.toFixed(decimals)}${unit ? ' ' + unit : ''}`;
}

function fmtFecha(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function duracion(horas) {
  if (horas == null) return '—';
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${h}h ${m}m`;
}

function deltaMinutos(isoA, isoB) {
  if (!isoA || !isoB) return null;
  return (new Date(isoB) - new Date(isoA)) / 60000;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE ENTRADA
// ─────────────────────────────────────────────────────────────────────────────
function validarDatos(data) {
  const errores = [];
  if (!data.vessel?.nombre && !data.vessel?.matricula) errores.push('Embarcación sin nombre ni matrícula');
  if (!data.puerto_zarpe?.nombre) errores.push('Puerto de zarpe no definido');
  if (!data.fecha_zarpe) errores.push('Fecha de zarpe no definida');
  if (data.tramos_registrados?.length === 0) errores.push('Sin tramos registrados para el informe');
  return errores;
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULOS DERIVADOS
// ─────────────────────────────────────────────────────────────────────────────
function calcularResumen(data) {
  const tramos = (data.tramos_registrados || []).filter(t => t.registrado !== false);

  // Distancia total registrada
  const distancia_total_mn = tramos.reduce((acc, t) => acc + (t.distancia_mn || 0), 0);

  // Tiempo real navegado (solo tramos registrados)
  const horaZarpe  = data.fecha_zarpe_real  || data.fecha_zarpe;
  const horaLlegada = data.fecha_llegada_real;
  const horas_reales = horaLlegada
    ? (new Date(horaLlegada) - new Date(horaZarpe)) / 3600000
    : null;

  // ETA calculado vs real
  const eta_estimado_horas = data.navegacion_estimada?.eta_horas || null;
  const desvio_eta_min = (eta_estimado_horas && horas_reales)
    ? Math.round((horas_reales - eta_estimado_horas) * 60)
    : null;

  // Combustible
  const comb_prop_est  = data.navegacion_estimada?.consumo_total_litros || null;
  const comb_prop_real = data.combustible_propulsion_real || null;
  const comb_gen_real  = data.combustible_generador_real  || null;
  const comb_total_real = (comb_prop_real != null && comb_gen_real != null)
    ? comb_prop_real + comb_gen_real
    : comb_prop_real;

  const delta_combustible = (comb_prop_est && comb_prop_real)
    ? comb_prop_real - comb_prop_est
    : null;

  // Velocidad promedio real
  const sog_real = (distancia_total_mn && horas_reales && horas_reales > 0)
    ? distancia_total_mn / horas_reales
    : null;

  return {
    tramos,
    distancia_total_mn,
    horas_reales,
    eta_estimado_horas,
    desvio_eta_min,
    comb_prop_est,
    comb_prop_real,
    comb_gen_real,
    comb_total_real,
    delta_combustible,
    sog_real,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERADOR PDF
// ─────────────────────────────────────────────────────────────────────────────
function generarPDF(data, resumen) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
      Title: `Informe de Viaje Tmarea — ${data.puerto_zarpe?.nombre || ''} → ${data.destino_final?.nombre || ''}`,
      Author: 'Tmarea · MisilUp SpA',
      Subject: 'Informe operacional de viaje marítimo',
    }});

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // ancho útil
    let y = 50;

    // ── Función helpers internos ──
    const line = (x1, y1, x2, y2, color = COLOR.grisClaro, w = 0.5) => {
      doc.moveTo(x1, y1).lineTo(x2, y2).strokeColor(color).lineWidth(w).stroke();
    };

    const rect = (x, ry, w, h, color, radius = 4) => {
      doc.roundedRect(x, ry, w, h, radius).fillColor(color).fill();
    };

    const text = (str, x, ry, opts = {}) => {
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(opts.size || 10)
         .fillColor(opts.color || COLOR.marino)
         .text(str, x, ry, { width: opts.width || W, align: opts.align || 'left', ...opts });
    };

    // ── HEADER ──────────────────────────────────────────────────────────────
    rect(50, y, W, 56, COLOR.marino, 8);

    // Logo text
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#FFFFFF')
       .text('T', 66, y + 16, { continued: true })
       .fillColor(COLOR.electrico).text('m', { continued: true })
       .fillColor('#FFFFFF').text('area');

    doc.font('Helvetica').fontSize(8).fillColor('rgba(255,255,255,0.6)')
       .text('NAVEGA CON CERTEZA', 66, y + 41, { letterSpacing: 3 });

    // Título informe
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#FFFFFF')
       .text('INFORME OPERACIONAL DE VIAJE', 200, y + 12, { width: W - 150, align: 'right' });
    doc.font('Helvetica').fontSize(8).fillColor('rgba(255,255,255,0.7)')
       .text(`Generado: ${fmtFecha(new Date().toISOString())}`, 200, y + 30, { width: W - 150, align: 'right' });

    y += 70;

    // ── DATOS DE EMBARCACIÓN Y PATRÓN ────────────────────────────────────
    rect(50, y, W, 14, COLOR.electrico, 4);
    text('EMBARCACIÓN Y PATRÓN', 56, y + 2, { bold: true, size: 9, color: '#FFFFFF' });
    y += 18;

    const colW = W / 3;
    const filasDatos = [
      ['Embarcación', data.vessel?.nombre || '—', 'Matrícula', data.vessel?.matricula || '—', 'Tipo', data.vessel?.tipo_embarcacion || '—'],
      ['Patrón', data.patron?.nombre || '—', 'Licencia', data.vessel?.licenseType || '—', 'Eslora', fmt(data.vessel?.eslora, 1, 'm')],
    ];

    filasDatos.forEach((fila, fi) => {
      for (let i = 0; i < 3; i++) {
        const x = 50 + i * colW;
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.gris)
           .text(fila[i * 2], x, y, { width: colW - 10 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.marino)
           .text(fila[i * 2 + 1], x, y + 10, { width: colW - 10 });
      }
      y += 26;
    });

    line(50, y, 50 + W, y);
    y += 10;

    // ── RESUMEN DEL VIAJE ─────────────────────────────────────────────────
    rect(50, y, W, 14, COLOR.electrico, 4);
    text('RESUMEN DEL VIAJE', 56, y + 2, { bold: true, size: 9, color: '#FFFFFF' });
    y += 18;

    // Ruta
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.marino)
       .text(`${data.puerto_zarpe?.nombre || '—'}`, 50, y, { continued: true })
       .fillColor(COLOR.turquesa).text('  →  ', { continued: true })
       .fillColor(COLOR.marino).text(`${data.destino_final?.nombre || '—'}`);
    y += 18;

    // Grid de métricas principales (2 filas × 4 celdas)
    const metricW = W / 4;
    const metricas = [
      { label: 'Zarpe real',        valor: fmtFecha(data.fecha_zarpe_real || data.fecha_zarpe) },
      { label: 'Llegada real',      valor: fmtFecha(data.fecha_llegada_real) },
      { label: 'Distancia total',   valor: fmt(resumen.distancia_total_mn, 1, 'mn') },
      { label: 'Velocidad real',    valor: fmt(resumen.sog_real, 1, 'kn') },
      { label: 'Duración real',     valor: duracion(resumen.horas_reales) },
      { label: 'ETA estimado',      valor: duracion(resumen.eta_estimado_horas) },
      { label: 'Desvío ETA',
        valor: resumen.desvio_eta_min != null
          ? `${resumen.desvio_eta_min > 0 ? '+' : ''}${resumen.desvio_eta_min} min`
          : '—',
        alerta: resumen.desvio_eta_min != null && Math.abs(resumen.desvio_eta_min) > 60,
      },
      { label: 'Tramos registrados', valor: `${resumen.tramos.length}` },
    ];

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        const m = metricas[idx];
        const x = 50 + col * metricW;
        const ry = y + row * 38;
        rect(x, ry, metricW - 6, 34, COLOR.crema, 4);
        doc.font('Helvetica').fontSize(7).fillColor(COLOR.gris)
           .text(m.label, x + 6, ry + 5, { width: metricW - 14 });
        doc.font('Helvetica-Bold').fontSize(11)
           .fillColor(m.alerta ? COLOR.coral : COLOR.marino)
           .text(m.valor, x + 6, ry + 16, { width: metricW - 14 });
      }
    }
    y += 86;

    // ── COMBUSTIBLE ───────────────────────────────────────────────────────
    rect(50, y, W, 14, COLOR.electrico, 4);
    text('COMBUSTIBLE', 56, y + 2, { bold: true, size: 9, color: '#FFFFFF' });
    y += 18;

    const combData = [
      ['Estimado propulsión', fmt(resumen.comb_prop_est, 0, 'L'),
       'Real propulsión',     fmt(resumen.comb_prop_real, 0, 'L')],
      ['Real generador',      fmt(resumen.comb_gen_real, 0, 'L'),
       'Total real (prop + gen)', fmt(resumen.comb_total_real, 0, 'L')],
      ['Delta propulsión',
        resumen.delta_combustible != null
          ? `${resumen.delta_combustible > 0 ? '+' : ''}${resumen.delta_combustible.toFixed(0)} L`
          : '—',
       'Nota', 'El generador opera independiente de la propulsión'],
    ];

    combData.forEach((fila) => {
      const halfW = W / 2;
      for (let i = 0; i < 2; i++) {
        const x = 50 + i * halfW;
        const alerta = fila[0] === 'Delta propulsión' && i === 0 &&
          resumen.delta_combustible != null && resumen.delta_combustible > 50;
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.gris)
           .text(fila[i * 2], x, y, { width: halfW - 10 });
        doc.font('Helvetica-Bold').fontSize(10)
           .fillColor(alerta ? COLOR.coral : COLOR.marino)
           .text(fila[i * 2 + 1], x, y + 10, { width: halfW - 10 });
      }
      y += 26;
    });

    line(50, y, 50 + W, y);
    y += 10;

    // ── CONDICIONES CLIMÁTICAS ────────────────────────────────────────────
    if (data.weather) {
      rect(50, y, W, 14, COLOR.electrico, 4);
      text('CONDICIONES CLIMÁTICAS EN RUTA', 56, y + 2, { bold: true, size: 9, color: '#FFFFFF' });
      y += 18;

      const peor = data.weather?.peor_tramo || data.weather;
      const climaItems = [
        ['Condición de Puerto', data.weather?.condicion_puerto || '—'],
        ['Peor tramo', peor?.sector || 'Canal Moraleda'],
        ['Viento máximo', fmt(peor?.viento_nudos || peor?.wind_speed_10m, 1, 'kn')],
        ['Oleaje máximo', fmt(peor?.altura_ola_m || peor?.wave_height, 1, 'm')],
        ['Visibilidad mín.', fmt(peor?.visibilidad_km || peor?.visibility, 1, 'km')],
        ['Fuente', data.weather?.fuente || 'Open-Meteo Marine'],
      ];

      const cliW = W / 3;
      for (let i = 0; i < climaItems.length; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 50 + col * cliW;
        const ry = y + row * 26;
        doc.font('Helvetica').fontSize(8).fillColor(COLOR.gris)
           .text(climaItems[i][0], x, ry, { width: cliW - 10 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.marino)
           .text(climaItems[i][1], x, ry + 10, { width: cliW - 10 });
      }
      y += 62;
      line(50, y, 50 + W, y);
      y += 10;
    }

    // ── PUERTOS Y RESTRICCIONES ───────────────────────────────────────────
    if (data.port_status) {
      rect(50, y, W, 14, COLOR.electrico, 4);
      text('ESTADO DE PUERTOS AL ZARPE', 56, y + 2, { bold: true, size: 9, color: '#FFFFFF' });
      y += 18;

      [
        { tipo: 'ZARPE',    p: data.port_status?.zarpe },
        { tipo: 'RECALADA', p: data.port_status?.recalada },
      ].forEach(({ tipo, p }) => {
        if (!p) return;
        const estadoColor = p.estado === 'verde' ? COLOR.turquesa : p.estado === 'rojo' ? COLOR.coral : COLOR.ambar;
        rect(50, y, 4, 30, estadoColor, 0);
        doc.font('Helvetica').fontSize(7).fillColor(COLOR.gris).text(tipo, 62, y + 2);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.marino).text(p.nombre || '—', 62, y + 12);
        doc.font('Helvetica').fontSize(8).fillColor(estadoColor)
           .text(p.estado?.toUpperCase() || '—', 200, y + 12);
        doc.font('Helvetica').fontSize(7).fillColor(COLOR.gris)
           .text(p.timestamp ? `Dato: ${fmtFecha(p.timestamp)}` : '', 300, y + 12);
        y += 34;
      });

      line(50, y, 50 + W, y);
      y += 10;
    }

    // ── TRAMOS REGISTRADOS ────────────────────────────────────────────────
    if (resumen.tramos.length > 0) {
      rect(50, y, W, 14, COLOR.electrico, 4);
      text('TRAMOS REGISTRADOS', 56, y + 2, { bold: true, size: 9, color: '#FFFFFF' });
      y += 18;

      // Encabezados tabla
      const cols = [
        { label: 'Desde',       x: 50,  w: 110 },
        { label: 'Hasta',       x: 160, w: 110 },
        { label: 'Dist. (mn)', x: 270, w: 60  },
        { label: 'Duración',   x: 330, w: 60  },
        { label: 'SOG (kn)',   x: 390, w: 60  },
      ];

      rect(50, y, W, 14, COLOR.grisClaro, 2);
      cols.forEach(c => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.marino)
           .text(c.label, c.x + 4, y + 3, { width: c.w - 8 });
      });
      y += 16;

      resumen.tramos.forEach((t, i) => {
        const bg = i % 2 === 0 ? '#FAFAFA' : '#FFFFFF';
        rect(50, y, W, 16, bg, 0);

        const horasDuracion = t.duracion_min ? t.duracion_min / 60 : null;
        const sogTramo = (t.distancia_mn && horasDuracion && horasDuracion > 0)
          ? t.distancia_mn / horasDuracion
          : null;

        const filaVals = [
          t.desde || '—',
          t.hasta  || '—',
          fmt(t.distancia_mn, 1),
          t.duracion_min ? duracion(t.duracion_min / 60) : '—',
          fmt(sogTramo, 1),
        ];

        cols.forEach((c, ci) => {
          doc.font('Helvetica').fontSize(8).fillColor(COLOR.marino)
             .text(filaVals[ci], c.x + 4, y + 4, { width: c.w - 8 });
        });

        // Nota del tramo si existe
        if (t.nota) {
          y += 16;
          doc.font('Helvetica').fontSize(7).fillColor(COLOR.gris)
             .text(`  ↳ ${t.nota}`, 54, y, { width: W - 10 });
        }

        y += 16;
        if (y > 720) { doc.addPage(); y = 50; }
      });

      line(50, y, 50 + W, y);
      y += 10;
    }

    // ── OBSERVACIONES DEL PATRÓN ──────────────────────────────────────────
    if (data.observaciones_patron) {
      rect(50, y, W, 14, COLOR.electrico, 4);
      text('OBSERVACIONES DEL PATRÓN', 56, y + 2, { bold: true, size: 9, color: '#FFFFFF' });
      y += 18;
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.marino)
         .text(data.observaciones_patron, 50, y, { width: W });
      y += doc.heightOfString(data.observaciones_patron, { width: W }) + 10;
      line(50, y, 50 + W, y);
      y += 10;
    }

    // ── FOOTER ────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    line(50, footerY - 8, 50 + W, footerY - 8);
    doc.font('Helvetica').fontSize(7).fillColor(COLOR.gris)
       .text(
         'Tmarea es una herramienta de apoyo a la decisión navegacional. ' +
         'Este informe es de carácter operacional y no reemplaza la documentación oficial de zarpe. ' +
         'MisilUp SpA — Puerto Montt, Chile — tmarea.cl',
         50, footerY - 4, { width: W, align: 'center' }
       );

    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERADOR CSV
// ─────────────────────────────────────────────────────────────────────────────
function generarCSV(data, resumen) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = [];
  const add = (...cols) => rows.push(cols.map(esc).join(','));

  // Metadata
  add('INFORME OPERACIONAL TMAREA');
  add('Generado', new Date().toISOString());
  add('');

  // Embarcación
  add('EMBARCACIÓN');
  add('Nombre', data.vessel?.nombre || '');
  add('Matrícula', data.vessel?.matricula || '');
  add('Tipo', data.vessel?.tipo_embarcacion || '');
  add('Eslora (m)', data.vessel?.eslora || '');
  add('Licencia', data.vessel?.licenseType || '');
  add('Patrón', data.patron?.nombre || '');
  add('');

  // Viaje
  add('VIAJE');
  add('Puerto zarpe', data.puerto_zarpe?.nombre || '');
  add('Destino final', data.destino_final?.nombre || '');
  add('Fecha zarpe planificada', data.fecha_zarpe || '');
  add('Fecha zarpe real', data.fecha_zarpe_real || '');
  add('Fecha llegada real', data.fecha_llegada_real || '');
  add('Distancia total (mn)', fmt(resumen.distancia_total_mn, 1));
  add('Duración real (h)', resumen.horas_reales ? resumen.horas_reales.toFixed(2) : '');
  add('ETA estimado (h)', resumen.eta_estimado_horas ? resumen.eta_estimado_horas.toFixed(2) : '');
  add('Desvío ETA (min)', resumen.desvio_eta_min ?? '');
  add('SOG real (kn)', fmt(resumen.sog_real, 2));
  add('');

  // Combustible
  add('COMBUSTIBLE');
  add('Estimado propulsión (L)', fmt(resumen.comb_prop_est, 0));
  add('Real propulsión (L)', fmt(resumen.comb_prop_real, 0));
  add('Real generador (L)', fmt(resumen.comb_gen_real, 0));
  add('Total real (L)', fmt(resumen.comb_total_real, 0));
  add('Delta propulsión (L)', resumen.delta_combustible != null ? resumen.delta_combustible.toFixed(0) : '');
  add('');

  // Clima
  add('CONDICIONES CLIMÁTICAS');
  const peor = data.weather?.peor_tramo || data.weather || {};
  add('Condición de puerto', data.weather?.condicion_puerto || '');
  add('Peor tramo', peor?.sector || '');
  add('Viento máximo (kn)', peor?.viento_nudos || peor?.wind_speed_10m || '');
  add('Oleaje máximo (m)', peor?.altura_ola_m || peor?.wave_height || '');
  add('Visibilidad mínima (km)', peor?.visibilidad_km || peor?.visibility || '');
  add('');

  // Puertos
  add('ESTADO DE PUERTOS AL ZARPE');
  add('Tipo', 'Puerto', 'Estado', 'Timestamp', 'Dato viejo');
  ['zarpe', 'recalada'].forEach(tipo => {
    const p = data.port_status?.[tipo];
    if (p) add(tipo.toUpperCase(), p.nombre || '', p.estado || '', p.timestamp || '', p.dato_viejo ? 'Sí' : 'No');
  });
  add('');

  // Tramos
  if (resumen.tramos.length > 0) {
    add('TRAMOS REGISTRADOS');
    add('Desde', 'Hasta', 'Distancia (mn)', 'Duración (min)', 'SOG (kn)', 'Nota');
    resumen.tramos.forEach(t => {
      const horasDuracion = t.duracion_min ? t.duracion_min / 60 : null;
      const sogTramo = (t.distancia_mn && horasDuracion && horasDuracion > 0)
        ? (t.distancia_mn / horasDuracion).toFixed(2)
        : '';
      add(
        t.desde || '',
        t.hasta  || '',
        t.distancia_mn != null ? t.distancia_mn.toFixed(1) : '',
        t.duracion_min != null ? t.duracion_min.toFixed(0) : '',
        sogTramo,
        t.nota || '',
      );
    });
    add('');
  }

  // Observaciones
  if (data.observaciones_patron) {
    add('OBSERVACIONES DEL PATRÓN');
    add(data.observaciones_patron);
    add('');
  }

  add('Tmarea · MisilUp SpA · Puerto Montt Chile');

  return rows.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL EXPORTADA
// ─────────────────────────────────────────────────────────────────────────────
async function generarInformeViaje(data, formato = 'pdf') {
  const errores = validarDatos(data);
  if (errores.length > 0) {
    throw new Error(`Datos insuficientes para generar informe: ${errores.join(', ')}`);
  }

  const resumen = calcularResumen(data);

  if (formato === 'csv') {
    const csv = generarCSV(data, resumen);
    return {
      buffer: Buffer.from('\uFEFF' + csv, 'utf8'), // BOM para Excel
      contentType: 'text/csv; charset=utf-8',
      filename: `tmarea_viaje_${data.puerto_zarpe?.nombre || 'zarpe'}_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  const buffer = await generarPDF(data, resumen);
  return {
    buffer,
    contentType: 'application/pdf',
    filename: `tmarea_viaje_${data.puerto_zarpe?.nombre || 'zarpe'}_${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}

module.exports = { generarInformeViaje };
