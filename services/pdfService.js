// Archivo: services/pdfService.js
const { BrowserWindow, dialog } = require('electron');
const fs = require('fs');

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

const cssPDF = `
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #2d3748; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a365d; padding-bottom: 15px; margin-bottom: 20px; }
  .logo-title { font-size: 22px; font-weight: 800; color: #1a365d; margin-bottom: 4px; }
  .doc-info { text-align: right; font-size: 11px; color: #4a5568; }
  .paciente-box { background: #f7fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
  .seccion-titulo { background: #1a365d; color: white; padding: 6px 12px; font-size: 12px; font-weight: bold; margin-top: 15px; margin-bottom: 10px; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
  table td { border: 1px solid #cbd5e0; padding: 8px; }
  .texto-libre { font-size: 12px; margin-bottom: 15px; text-align: justify; white-space: pre-wrap; }
  .firma-area { margin-top: 50px; display: flex; justify-content: space-around; flex-wrap: wrap; gap: 30px; }
  .firma-box { display: flex; flex-direction: column; align-items: center; width: 280px; text-align: center; }
  .firma-img { height: 80px; width: auto; object-fit: contain; display: block; margin: 0 auto; }
  .firma-espacio-blanco { height: 80px; width: 100%; display: block; }
  .firma-linea { border-top: 1px solid #1a202c; width: 100%; margin-top: 5px; padding-top: 6px; font-size: 12px; font-weight: bold; line-height: 1.3; }
  .hash { font-family: monospace; font-size: 9px; color: #a0aec0; margin-top: 40px; text-align: center; }
  .leyenda-legal { font-size: 9px; color: #718096; text-align: justify; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
`;

async function generarPDFHelper(htmlContenido, nombreArchivo, mainWindow) {
  const win = new BrowserWindow({ show: false });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContenido)}`);
  const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'Letter' });
  win.close();
  const { filePath } = await dialog.showSaveDialog(mainWindow, { title: 'Guardar PDF', defaultPath: nombreArchivo, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (filePath) { fs.writeFileSync(filePath, pdf); return { ok: true, path: filePath }; }
  return { ok: false };
}

async function exportarNota(nota, paciente, mainWindow) {
  const f = new Date(nota.fecha_creacion);
  let extras = {}; try { extras = JSON.parse(nota.campos_extra || '{}'); } catch(e){}

  const html = `<html><head><style>${cssPDF}</style></head><body>
    <div class="header">
      <div><div class="logo-title">🏥 Estancia Villas Juan Pablo</div><div style="font-size:11px; color:#4a5568;">Expediente Clínico Electrónico</div></div>
      <div class="doc-info"><strong>NOTA CLÍNICA (NOM-004)</strong><br>Fecha: ${f.toLocaleString()}</div>
    </div>
    <div class="paciente-box">
      <div><strong>Paciente:</strong> ${escapeHTML(paciente.nombre)} ${escapeHTML(paciente.primer_apellido)} ${escapeHTML(paciente.segundo_apellido || '')}</div>
      <div><strong>Folio/Cama:</strong> ${escapeHTML(paciente.folio_interno)} / ${escapeHTML(paciente.cama || 'N/A')}</div>
      <div><strong>Edad / Sexo:</strong> ${paciente.edad} años / ${paciente.sexo === 'H' ? 'Hombre' : 'Mujer'}</div>
      <div><strong>CURP:</strong> ${escapeHTML(paciente.curp)}</div>
    </div>
    <div class="seccion-titulo">MOTIVO DE CONSULTA / PADECIMIENTO ACTUAL</div><div class="texto-libre">${escapeHTML(nota.motivo_consulta)}</div>
    <div class="seccion-titulo">SIGNOS VITALES Y SOMATOMETRÍA</div>
    <table><tr><td><strong>Peso:</strong> ${escapeHTML(extras['vs-peso'] || '-')} kg</td><td><strong>Talla:</strong> ${escapeHTML(extras['vs-talla'] || '-')} m</td><td><strong>IMC:</strong> ${escapeHTML(extras['vs-imc'] || '-')}</td><td><strong>Temp:</strong> ${escapeHTML(extras['vs-temp'] || '-')} °C</td></tr>
    <tr><td><strong>T.A.:</strong> ${escapeHTML(extras['vs-ta'] || '-')} mmHg</td><td><strong>F.C.:</strong> ${escapeHTML(extras['vs-fc'] || '-')} lpm</td><td><strong>F.R.:</strong> ${escapeHTML(extras['vs-fr'] || '-')} rpm</td><td><strong>SatO2:</strong> ${escapeHTML(extras['vs-sato2'] || '-')} %</td></tr></table>
    ${nota.exploracion_fisica ? `<div class="seccion-titulo">EXPLORACIÓN FÍSICA</div><div class="texto-libre">${escapeHTML(nota.exploracion_fisica)}</div>` : ''}
    <div class="seccion-titulo">DIAGNÓSTICOS (CIE-10)</div><div class="texto-libre">${escapeHTML(nota.diagnostico_principal_cie10)}</div>
    <div class="seccion-titulo">TERAPÉUTICA / PLAN DE TRATAMIENTO</div><div class="texto-libre">${escapeHTML(nota.plan_tratamiento || 'Sin indicaciones adicionales')}</div>
    
    <div class="firma-area">
      <div class="firma-box">
        ${nota.firma_profesional ? `<img class="firma-img" src="${nota.firma_profesional}">` : '<div class="firma-espacio-blanco"></div>'}
        <div class="firma-linea">${escapeHTML(nota.nombre_creador)}<br>Cédula: ${escapeHTML(nota.cedula_profesional || 'N/A')}<br><span style="font-weight:normal; font-size:10px;">Firma del Profesional Tratante</span></div>
        ${nota.firma_electronica_avanzada ? `<div style="font-size:8px; margin-top:4px; color:#555; word-wrap:break-word;">Sello Digital: ${escapeHTML(nota.firma_electronica_avanzada)}</div>` : ''}
      </div>
    </div>
    <div class="hash">Sello Criptográfico (NOM-024): ${escapeHTML(nota.hash_nota)}</div>
  </body></html>`;
  return await generarPDFHelper(html, `Nota_${paciente.folio_interno}_${nota.id_nota}.pdf`, mainWindow);
}

async function exportarReceta(receta, paciente, mainWindow) {
  const f = new Date(receta.fecha_creacion);
  const html = `<html><head><style>${cssPDF}</style></head><body>
    <div class="header" style="border-bottom:none; margin-bottom:10px;">
      <div style="width:60%;">
        <div class="logo-title">${escapeHTML(receta.nombre_medico)}</div>
        <div style="font-size:12px; font-weight:bold; color:#4a5568;">Médico Tratante</div>
        <div style="font-size:11px; color:#4a5568; margin-top:4px;">
          <strong>Cédula Profesional:</strong> ${escapeHTML(receta.cedula_medico || 'N/A')}<br>
          <strong>Institución:</strong> ${escapeHTML(receta.universidad_medico || 'No especificada')}<br>
          <strong>Domicilio:</strong> Estancia Villas Juan Pablo, Aguascalientes, Ags.
        </div>
      </div>
      <div class="doc-info" style="width:40%;">
        <strong>RECETA MÉDICA</strong><br>
        Fecha: ${f.toLocaleDateString('es-MX')} ${f.toLocaleTimeString('es-MX')}<br>
        ${receta.tipo_receta === 'antibiotico' ? '<strong style="color:#e53e3e;">ANTIBIÓTICO</strong>' : ''}
      </div>
    </div>
    <hr style="border:1px solid #1a365d; margin-bottom:20px;">
    <div style="font-size:12px; margin-bottom:20px;">
      <strong>Paciente:</strong> ${escapeHTML(paciente.nombre)} ${escapeHTML(paciente.primer_apellido)} ${escapeHTML(paciente.segundo_apellido || '')}<br>
      <strong>Edad:</strong> ${paciente.edad} años &nbsp;&nbsp;&nbsp; <strong>Diagnóstico:</strong> ${escapeHTML(receta.diagnostico)}
    </div>
    <div style="font-size:36px; font-weight:bold; color:#2b6cb0; margin-bottom:10px; font-family:serif;">Rx</div>
    <div class="texto-libre" style="font-size:13px; line-height:1.8; min-height:300px;">
      ${escapeHTML(receta.medicamentos)}
      ${receta.indicaciones ? `<br><br><strong>Indicaciones:</strong><br>${escapeHTML(receta.indicaciones)}` : ''}
    </div>
    <div class="firma-area">
      <div class="firma-box">
        ${receta.firma_medico ? `<img class="firma-img" src="${receta.firma_medico}">` : '<div class="firma-espacio-blanco"></div>'}
        <div class="firma-linea">${escapeHTML(receta.nombre_medico)}<br><span style="font-weight:normal; font-size:10px;">Firma Autógrafa del Médico</span></div>
      </div>
    </div>
    <div class="leyenda-legal">
      Cumplimiento Art. 28 al 32 del Reglamento de Insumos para la Salud y Art. 226 de la Ley General de Salud. 
      ${receta.tipo_receta === 'antibiotico' ? '<strong>Su venta o dispensación requiere receta médica. Este documento será retenido por la farmacia.</strong>' : ''}
    </div>
  </body></html>`;
  return await generarPDFHelper(html, `Receta_${paciente.folio_interno}_${receta.id_receta}.pdf`, mainWindow);
}

async function exportarConsentimiento(cons, paciente, mainWindow) {
  const html = `<html><head><style>${cssPDF} .firma-box { width: 40%; margin-bottom: 20px; }</style></head><body>
    <div class="header">
      <div><div class="logo-title">🏥 Estancia Villas Juan Pablo</div></div>
      <div class="doc-info"><strong>CARTA DE CONSENTIMIENTO INFORMADO</strong><br>Fecha: ${new Date(cons.fecha_creacion).toLocaleString()}</div>
    </div>
    <div class="texto-libre" style="text-align:justify;">
      En la ciudad de Aguascalientes, el paciente <strong>${escapeHTML(paciente.nombre)} ${escapeHTML(paciente.primer_apellido)}</strong> (Exp: ${escapeHTML(paciente.folio_interno)}), en pleno uso de sus facultades, autoriza al Dr/Dra. <strong>${escapeHTML(cons.nombre_medico)}</strong> para realizar el procedimiento médico denominado: <strong>${escapeHTML(cons.tipo_procedimiento)}</strong>.<br><br>
      <strong>Descripción del procedimiento:</strong><br>${escapeHTML(cons.descripcion_procedimiento)}<br><br>
      <strong>Riesgos identificados:</strong><br>${escapeHTML(cons.riesgos)}<br><br>
      <strong>Beneficios esperados:</strong><br>${escapeHTML(cons.beneficios || 'No descritos')}<br><br>
      <strong>Alternativas al tratamiento:</strong><br>${escapeHTML(cons.alternativas || 'No descritas')}<br><br>
      Declaro que se me ha explicado satisfactoriamente la naturaleza y propósitos del procedimiento, así como los riesgos y beneficios, habiendo tenido la oportunidad de aclarar todas mis dudas.
    </div>
    <div class="firma-area">
      <div class="firma-box">
        ${cons.firma_paciente ? `<img class="firma-img" src="${cons.firma_paciente}">` : '<div class="firma-espacio-blanco"></div>'}
        <div class="firma-linea">${escapeHTML(cons.nombre_paciente_firmante)}<br><span style="font-weight:normal; font-size:10px;">Paciente / Familiar Responsable</span></div>
      </div>
      <div class="firma-box">
        ${cons.firma_medico ? `<img class="firma-img" src="${cons.firma_medico}">` : '<div class="firma-espacio-blanco"></div>'}
        <div class="firma-linea">${escapeHTML(cons.nombre_medico)}<br><span style="font-weight:normal; font-size:10px;">Médico Tratante</span></div>
      </div>
      <div class="firma-box">
        ${cons.firma_testigo1 ? `<img class="firma-img" src="${cons.firma_testigo1}">` : '<div class="firma-espacio-blanco"></div>'}
        <div class="firma-linea">${escapeHTML(cons.nombre_testigo1)}<br><span style="font-weight:normal; font-size:10px;">Testigo 1</span></div>
      </div>
      <div class="firma-box">
        ${cons.firma_testigo2 ? `<img class="firma-img" src="${cons.firma_testigo2}">` : '<div class="firma-espacio-blanco"></div>'}
        <div class="firma-linea">${escapeHTML(cons.nombre_testigo2)}<br><span style="font-weight:normal; font-size:10px;">Testigo 2</span></div>
      </div>
    </div>
  </body></html>`;
  return await generarPDFHelper(html, `Consentimiento_${paciente.folio_interno}_${cons.id_consentimiento}.pdf`, mainWindow);
}

module.exports = { exportarNota, exportarReceta, exportarConsentimiento };