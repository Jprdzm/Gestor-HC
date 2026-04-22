// Archivo: main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { CATALOGO_CIE10 } = require('./cie10_catalogo.js');
const {
  db, dbAll, dbGet, dbRun, registrarAuditoria, sanitizarNombreNOM,
  validarCURP, validarFechaNacimiento, calcularEdad,
  generarHash, generarHashNota, bcrypt, SALT_ROUNDS,
} = require('./database.js');

// IMPORTAMOS TU NUEVO SERVICIO DE PDFs
const pdfService = require('./services/pdfService.js');

let mainWindow;
let sesionActiva = null;

function validateSender(event) {
  try {
    const senderUrl = new URL((event.senderFrame && event.senderFrame.url) || '');
    const appPath = path.resolve(__dirname).replace(/\\/g, '/');
    return senderUrl.protocol === 'file:' && senderUrl.pathname.includes(appPath);
  } catch (e) { return false; }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    title: 'Sistema HC - Historias Clínicas',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.js') },
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

// --- PUENTES DE PDF CONECTADOS AL SERVICIO ---
ipcMain.handle('exportar-nota-pdf', async (event, nota, paciente) => {
  if (!validateSender(event)) return { ok: false };
  return await pdfService.exportarNota(nota, paciente, mainWindow);
});

ipcMain.handle('exportar-receta-pdf', async (event, receta, paciente) => {
  if (!validateSender(event)) return { ok: false };
  return await pdfService.exportarReceta(receta, paciente, mainWindow);
});

ipcMain.handle('exportar-consentimiento-pdf', async (event, cons, paciente) => {
  if (!validateSender(event)) return { ok: false };
  return await pdfService.exportarConsentimiento(cons, paciente, mainWindow);
});

// --- EL RESTO DE TUS PUENTES NORMALES ---
ipcMain.handle('registro', async (event, datos) => {
  if (!validateSender(event)) return { ok: false };
  const { nombre, usuario, password, confirmar, cedula, titulo, sexo } = datos;
  if (!nombre || !usuario || !password || !confirmar) return { ok: false, error: 'Faltan datos obligatorios.' };
  if (password !== confirmar) return { ok: false, error: 'Las contraseñas no coinciden.' };
  try {
    const existe = await dbGet("SELECT id_usuario FROM Usuario_PersonalSalud WHERE username = ?", [usuario.trim().toLowerCase()]);
    if (existe) return { ok: false, error: 'El nombre de usuario ya está en uso.' };
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    let rol = 'Médico';
    if (titulo === 'Lic.') rol = 'Enfermería';
    if (titulo === 'Secretaria') rol = 'Secretaria';
    await dbRun(`INSERT INTO Usuario_PersonalSalud (username, password_hash, nombre_completo, cedula_profesional, titulo, sexo, rol, activo) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`, 
      [usuario.trim().toLowerCase(), hash, nombre.trim(), cedula ? cedula.trim() : null, titulo, sexo, rol]);
    return { ok: true, mensaje: 'Cuenta creada. Un administrador debe aprobar tu acceso.' };
  } catch (e) {
    console.error("Error en registro:", e);
    return { ok: false, error: 'Error fatal del servidor al intentar registrar la cuenta.' };
  }
});

ipcMain.handle('obtener-catalogo-cie10', async (event) => { if (!validateSender(event)) return []; return CATALOGO_CIE10; });
ipcMain.handle('ir-a', async (event, pagina) => { if (!validateSender(event)) return { ok: false }; mainWindow.loadFile(pagina); return { ok: true }; });

ipcMain.handle('login', async (event, u, p) => {
  if (!validateSender(event)) return { ok: false };
  try {
    const row = await dbGet("SELECT * FROM Usuario_PersonalSalud WHERE username = ?", [u.trim().toLowerCase()]);
    if (!row) return { ok: false, error: 'Usuario incorrecto.' };
    const match = await bcrypt.compare(p, row.password_hash);
    if (!match) return { ok: false, error: 'Contraseña incorrecta.' };
    sesionActiva = { id_usuario: row.id_usuario, username: row.username, nombre_completo: row.nombre_completo, cedula_profesional: row.cedula_profesional || '', universidad: row.universidad || 'Universidad Autónoma de Aguascalientes', titulo: row.titulo || 'Dr.', sexo: row.sexo || 'M', rol: row.rol };
    return { ok: true, usuario: sesionActiva };
  } catch (e) {
    console.error("Error en login:", e);
    return { ok: false, error: 'Error del servidor al intentar iniciar sesión.' };
  }
});

ipcMain.handle('obtener-sesion', async (event) => sesionActiva ? { ok: true, usuario: sesionActiva } : { ok: false });

ipcMain.handle('listar-pacientes', async (event) => {
  try { return { ok: true, pacientes: await dbAll("SELECT folio_interno, curp, nombre, primer_apellido, segundo_apellido FROM Paciente") };
  } catch(e) { console.error("Error al listar pacientes:", e); return {ok: false, error: 'Error al listar pacientes'}; }
});

ipcMain.handle('buscar-paciente', async (event, folio) => {
  try {
    const row = await dbGet("SELECT * FROM Paciente WHERE folio_interno = ?", [folio]);
    if (row) row.edad = calcularEdad(row.fecha_nacimiento);
    return { ok: true, paciente: row };
  } catch(e) { console.error("Error al buscar paciente:", e); return {ok: false, error: 'Error al buscar paciente'}; }
});

ipcMain.handle('guardar-paciente', async (event, d) => {
  if (!validateSender(event)) return { ok: false };
  const curpUpper = d.curp.trim().toUpperCase();
  if (!validarCURP(curpUpper)) return { ok: false, error: 'CURP con formato inválido.' };
  if (!validarFechaNacimiento(d.fecha.trim())) return { ok: false, error: 'Fecha de nacimiento inválida (Debe ser AAAAMMDD).' };
  const nombreSanitizado = sanitizarNombreNOM(d.nombre);
  const paternoSanitizado = sanitizarNombreNOM(d.paterno);
  const maternoSanitizado = sanitizarNombreNOM(d.materno);
  const entNac = d.entidad_nacimiento || '00'; const entRes = d.entidad_residencia || '00'; const munRes = d.municipio_residencia || '000'; const locRes = d.localidad_residencia || '0000'; const nac = d.nacionalidad || 'NND';
  try {
    await dbRun(`INSERT INTO Paciente (folio_interno, curp, nombre, primer_apellido, segundo_apellido, fecha_nacimiento, sexo, nacionalidad, cama, lugar_origen, lugar_residencia, escolaridad, religion, domicilio, telefono, contacto_emergencia_nombre, contacto_emergencia_telefono, ocupacion, estado_civil, lateralidad, entidad_nacimiento, entidad_residencia, municipio_residencia, localidad_residencia) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 
      [d.folio.substring(0, 18), curpUpper, nombreSanitizado, paternoSanitizado, maternoSanitizado, d.fecha.trim(), d.sexo, nac, d.cama, d.lugar_origen, d.lugar_residencia, d.escolaridad, d.religion, d.domicilio, d.telefono, d.contacto_emergencia_nombre, d.contacto_emergencia_telefono, d.ocupacion, d.estado_civil, d.lateralidad, entNac, entRes, munRes, locRes]);
    await registrarAuditoria(sesionActiva.id_usuario, 'CREAR_PACIENTE', d.folio.trim());
    return { ok: true };
  } catch (e) {
    console.error("Error al guardar paciente:", e);
    if (e.message && e.message.includes('UNIQUE')) return { ok: false, error: 'El Folio o la CURP ya existen.' };
    return { ok: false, error: 'Error interno al guardar paciente.' };
  }
});

ipcMain.handle('guardar-nota', async (event, d) => {
  try {
    const ultima = await dbGet("SELECT hash_nota FROM Historia_Clinica_Nota WHERE folio_paciente = ? ORDER BY id_nota DESC LIMIT 1", [d.folio_paciente]);
    const hashAnt = ultima ? ultima.hash_nota : 'GENESIS';
    const fecha = new Date().toISOString();
    const h = generarHashNota({ ...d, fecha_creacion: fecha, id_usuario_creador: sesionActiva.id_usuario }, hashAnt);
    await dbRun(`INSERT INTO Historia_Clinica_Nota (folio_paciente, id_usuario_creador, fecha_creacion, tipo_nota, motivo_consulta, exploracion_fisica, diagnostico_principal_cie10, plan_tratamiento, campos_extra, hash_nota, hash_anterior, firma_profesional, firma_electronica_avanzada) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.folio_paciente, sesionActiva.id_usuario, fecha, d.tipo_nota, d.motivo_consulta, d.exploracion_fisica, d.diagnostico_principal_cie10, d.plan_tratamiento, JSON.stringify(d.campos_extra), h, hashAnt, d.firma_profesional || null, d.firma_electronica || null]);
    return { ok: true };
  } catch(e) { console.error("Error al guardar nota:", e); return {ok: false, error: 'Error al guardar la nota'}; }
});

ipcMain.handle('obtener-notas', async (event, f) => {
  try { return { ok: true, notas: await dbAll(`SELECT n.*, u.nombre_completo AS nombre_creador, u.cedula_profesional FROM Historia_Clinica_Nota n JOIN Usuario_PersonalSalud u ON n.id_usuario_creador = u.id_usuario WHERE n.folio_paciente = ? ORDER BY n.fecha_creacion ASC`, [f]) }; } catch(e) { console.error("Error al obtener notas:", e); return {ok: false, error: 'Error al obtener notas'}; }
});

ipcMain.handle('guardar-consentimiento', async (event, datos) => {
  const { folio_paciente, tipo_procedimiento, descripcion_procedimiento, riesgos, beneficios, alternativas, firma_paciente, nombre_paciente_firmante, firma_testigo1, nombre_testigo1, firma_testigo2, nombre_testigo2, firma_medico } = datos;
  const fechaCreacion = new Date().toISOString();
  const hashDoc = generarHash(`${folio_paciente}|${fechaCreacion}|${tipo_procedimiento}|${descripcion_procedimiento}|${nombre_paciente_firmante}|${nombre_testigo1}|${nombre_testigo2}|${sesionActiva.nombre_completo}`);
  try { 
    await dbRun(`INSERT INTO Consentimiento_Informado (folio_paciente, id_usuario_creador, fecha_creacion, tipo_procedimiento, descripcion_procedimiento, riesgos, beneficios, alternativas, firma_paciente, nombre_paciente_firmante, firma_testigo1, nombre_testigo1, firma_testigo2, nombre_testigo2, firma_medico, nombre_medico, hash_documento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [folio_paciente, sesionActiva.id_usuario, fechaCreacion, tipo_procedimiento, descripcion_procedimiento, riesgos, beneficios || '', alternativas || '', firma_paciente || null, nombre_paciente_firmante, firma_testigo1 || null, nombre_testigo1, firma_testigo2 || null, nombre_testigo2, firma_medico || null, sesionActiva.nombre_completo, hashDoc]); 
    return { ok: true }; 
  } catch (e) { console.error("Error al guardar consentimiento:", e); return { ok: false, error: 'Error al guardar consentimiento.' }; }
});

ipcMain.handle('obtener-consentimientos', async (event, folio) => { try { return { ok: true, consentimientos: await dbAll("SELECT * FROM Consentimiento_Informado WHERE folio_paciente = ? ORDER BY fecha_creacion DESC", [folio]) }; } catch (e) { console.error("Error al obtener consentimientos:", e); return { ok: false, error: 'Error al obtener consentimientos.' }; } });

ipcMain.handle('guardar-receta', async (event, datos) => {
  const { folio_paciente, diagnostico, medicamentos, indicaciones, tipo_receta, firma_medico } = datos;
  const fechaCreacion = new Date().toISOString();
  const hashReceta = generarHash(`${folio_paciente}|${fechaCreacion}|${diagnostico}|${medicamentos}|${sesionActiva.nombre_completo}|${sesionActiva.cedula_profesional}`);
  try { 
    await dbRun(`INSERT INTO Receta_Medica (folio_paciente, id_usuario_creador, fecha_creacion, diagnostico, medicamentos, indicaciones, tipo_receta, firma_medico, cedula_medico, universidad_medico, nombre_medico, hash_receta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [folio_paciente, sesionActiva.id_usuario, fechaCreacion, diagnostico, medicamentos, indicaciones || '', tipo_receta || 'general', firma_medico || null, sesionActiva.cedula_profesional, sesionActiva.universidad, sesionActiva.nombre_completo, hashReceta]); 
    return { ok: true }; 
  } catch (e) { console.error("Error al guardar receta:", e); return { ok: false, error: 'Error al guardar receta.' }; }
});

ipcMain.handle('obtener-recetas', async (event, folio) => { try { return { ok: true, recetas: await dbAll("SELECT * FROM Receta_Medica WHERE folio_paciente = ? ORDER BY fecha_creacion DESC", [folio]) }; } catch (e) { console.error("Error al obtener recetas:", e); return { ok: false, error: 'Error al obtener recetas.' }; } });

ipcMain.handle('exportar-expediente', async (event, folio) => {
  try {
    const paciente = await dbGet("SELECT * FROM Paciente WHERE folio_interno = ?", [folio]);
    if (!paciente) return { ok: false, error: 'No encontrado.' };
    const expediente = { exportado_en: new Date().toISOString(), exportado_por: sesionActiva.nombre_completo, paciente, historia_clinica: await dbAll("SELECT * FROM Historia_Clinica_Nota WHERE folio_paciente = ? ORDER BY fecha_creacion ASC", [folio]), consentimientos: await dbAll("SELECT * FROM Consentimiento_Informado WHERE folio_paciente = ? ORDER BY fecha_creacion ASC", [folio]), recetas: await dbAll("SELECT * FROM Receta_Medica WHERE folio_paciente = ? ORDER BY fecha_creacion ASC", [folio]) };
    const { filePath } = await dialog.showSaveDialog(mainWindow, { title: 'Exportar Expediente', defaultPath: `expediente_${folio}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!filePath) return { ok: false, error: 'Cancelado.' };
    fs.writeFileSync(filePath, JSON.stringify(expediente, null, 2), 'utf8');
    return { ok: true, ruta: filePath };
  } catch (e) { console.error("Error al exportar:", e); return { ok: false, error: 'Error al exportar expediente.' }; }
});

ipcMain.handle('obtener-auditoria', async (event, folio) => { try { return { ok: true, registros: await dbAll(`SELECT a.*, u.nombre_completo FROM Registro_Auditoria a JOIN Usuario_PersonalSalud u ON a.id_usuario = u.id_usuario WHERE a.id_registro_afectado = ? ORDER BY a.fecha_hora DESC`, [folio]) }; } catch (e) { console.error("Error en auditoria:", e); return { ok: false, error: 'Error al obtener auditoría.' }; } });
ipcMain.handle('listar-usuarios', async (event) => { try { return { ok: true, usuarios: await dbAll("SELECT id_usuario, username, nombre_completo, cedula_profesional, titulo, sexo, rol, activo FROM Usuario_PersonalSalud ORDER BY activo DESC, rol, nombre_completo") }; } catch (e) { console.error("Error al listar usuarios:", e); return { ok: false, error: 'Error al listar usuarios.' }; } });
ipcMain.handle('aprobar-usuario', async (event, datos) => { try { await dbRun("UPDATE Usuario_PersonalSalud SET rol = ?, activo = 1 WHERE id_usuario = ?", [datos.rol, datos.id_usuario]); return { ok: true }; } catch (e) { console.error("Error al aprobar:", e); return { ok: false, error: 'Error al aprobar usuario.' }; } });
ipcMain.handle('desactivar-usuario', async (event, id_usuario) => { try { await dbRun("UPDATE Usuario_PersonalSalud SET activo = 0 WHERE id_usuario = ?", [id_usuario]); return { ok: true }; } catch (e) { console.error("Error al desactivar:", e); return { ok: false, error: 'Error al desactivar usuario.' }; } });