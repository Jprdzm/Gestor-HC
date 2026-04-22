const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'sistema_hc.db');
const SALT_ROUNDS = 10;

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { 
    console.error('❌ Error fatal al conectar con SQLite:', err.message); 
  } else { 
    console.log('✅ Conexión exitosa a la base de datos SQLite.'); 
    inicializarBaseDeDatos(); 
  }
});

function dbAll(sql, params = []) { return new Promise((resolve, reject) => { db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))); }); }
function dbGet(sql, params = []) { return new Promise((resolve, reject) => { db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))); }); }
function dbRun(sql, params = []) { return new Promise((resolve, reject) => { db.run(sql, params, function (err) { err ? reject(err) : resolve(this); }); }); }

function generarHash(contenido) { return crypto.createHash('sha256').update(contenido, 'utf8').digest('hex'); }

function generarHashNota(nota, hashAnterior) {
  const notaEstable = {
    hashAnterior,
    folio_paciente: nota.folio_paciente,
    id_usuario_creador: nota.id_usuario_creador,
    fecha_creacion: nota.fecha_creacion,
    tipo_nota: nota.tipo_nota || 'evolucion',
    motivo_consulta: nota.motivo_consulta,
    exploracion_fisica: nota.exploracion_fisica || '',
    diagnostico_principal_cie10: nota.diagnostico_principal_cie10,
    plan_tratamiento: nota.plan_tratamiento || '',
    campos_extra: nota.campos_extra || {}
  };
  return generarHash(JSON.stringify(notaEstable));
}

function inicializarBaseDeDatos() {
  db.serialize(async () => {
    db.run(`CREATE TABLE IF NOT EXISTS Paciente (
      folio_interno TEXT PRIMARY KEY, curp TEXT NOT NULL UNIQUE, nombre TEXT NOT NULL, primer_apellido TEXT NOT NULL, segundo_apellido TEXT,
      fecha_nacimiento TEXT NOT NULL, sexo TEXT NOT NULL CHECK(sexo IN ('M', 'H')), entidad_nacimiento TEXT NOT NULL, nacionalidad TEXT NOT NULL,
      entidad_residencia TEXT NOT NULL, municipio_residencia TEXT NOT NULL, localidad_residencia TEXT NOT NULL,
      cama TEXT, lugar_origen TEXT, lugar_residencia TEXT, escolaridad TEXT, religion TEXT, domicilio TEXT, telefono TEXT, 
      contacto_emergencia_nombre TEXT, contacto_emergencia_telefono TEXT, ocupacion TEXT, estado_civil TEXT, lateralidad TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Usuario_PersonalSalud (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, nombre_completo TEXT NOT NULL,
      cedula_profesional TEXT, universidad TEXT, titulo TEXT NOT NULL DEFAULT 'Dr.', sexo TEXT NOT NULL DEFAULT 'M', rol TEXT NOT NULL, activo INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Registro_Auditoria (
      id_auditoria INTEGER PRIMARY KEY AUTOINCREMENT, id_usuario INTEGER NOT NULL, fecha_hora TEXT NOT NULL, accion_realizada TEXT NOT NULL,
      id_registro_afectado TEXT, detalles TEXT, FOREIGN KEY (id_usuario) REFERENCES Usuario_PersonalSalud(id_usuario)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Historia_Clinica_Nota (
      id_nota INTEGER PRIMARY KEY AUTOINCREMENT, folio_paciente TEXT NOT NULL, id_usuario_creador INTEGER NOT NULL, fecha_creacion TEXT NOT NULL,
      tipo_nota TEXT NOT NULL DEFAULT 'evolucion',
      motivo_consulta TEXT NOT NULL, exploracion_fisica TEXT, diagnostico_principal_cie10 TEXT NOT NULL, plan_tratamiento TEXT,
      campos_extra TEXT,
      hash_nota TEXT NOT NULL, hash_anterior TEXT NOT NULL, firma_profesional TEXT, firma_electronica_avanzada TEXT,
      FOREIGN KEY (folio_paciente) REFERENCES Paciente(folio_interno), FOREIGN KEY (id_usuario_creador) REFERENCES Usuario_PersonalSalud(id_usuario)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Consentimiento_Informado (
      id_consentimiento INTEGER PRIMARY KEY AUTOINCREMENT, folio_paciente TEXT NOT NULL, id_usuario_creador INTEGER NOT NULL, fecha_creacion TEXT NOT NULL,
      tipo_procedimiento TEXT NOT NULL, descripcion_procedimiento TEXT NOT NULL, riesgos TEXT NOT NULL, beneficios TEXT, alternativas TEXT,
      firma_paciente TEXT, nombre_paciente_firmante TEXT NOT NULL, firma_testigo1 TEXT, nombre_testigo1 TEXT NOT NULL,
      firma_testigo2 TEXT, nombre_testigo2 TEXT NOT NULL, firma_medico TEXT, nombre_medico TEXT NOT NULL, hash_documento TEXT NOT NULL,
      FOREIGN KEY (folio_paciente) REFERENCES Paciente(folio_interno), FOREIGN KEY (id_usuario_creador) REFERENCES Usuario_PersonalSalud(id_usuario)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Receta_Medica (
      id_receta INTEGER PRIMARY KEY AUTOINCREMENT, folio_paciente TEXT NOT NULL, id_usuario_creador INTEGER NOT NULL, fecha_creacion TEXT NOT NULL,
      diagnostico TEXT NOT NULL, medicamentos TEXT NOT NULL, indicaciones TEXT, tipo_receta TEXT NOT NULL DEFAULT 'general',
      firma_medico TEXT, cedula_medico TEXT, universidad_medico TEXT, nombre_medico TEXT NOT NULL, hash_receta TEXT NOT NULL,
      FOREIGN KEY (folio_paciente) REFERENCES Paciente(folio_interno), FOREIGN KEY (id_usuario_creador) REFERENCES Usuario_PersonalSalud(id_usuario)
    )`);

    try { await dbRun(`ALTER TABLE Historia_Clinica_Nota ADD COLUMN firma_electronica_avanzada TEXT`); } catch(e) { }
    try { await dbRun(`ALTER TABLE Usuario_PersonalSalud ADD COLUMN universidad TEXT`); } catch(e) { }
    try { await dbRun(`ALTER TABLE Receta_Medica ADD COLUMN universidad_medico TEXT`); } catch(e) { }

    db.run(`CREATE INDEX IF NOT EXISTS idx_paciente_curp ON Paciente(curp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_nota_folio ON Historia_Clinica_Nota(folio_paciente)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_receta_folio ON Receta_Medica(folio_paciente)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_auditoria_afectado ON Registro_Auditoria(id_registro_afectado)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_usuario_username ON Usuario_PersonalSalud(username)`);

    try {
      const row = await dbGet("SELECT COUNT(*) AS count FROM Usuario_PersonalSalud");
      if (row.count === 0) {
        const adminPass = crypto.randomBytes(6).toString('hex');
        console.log('\n=============================================');
        console.log('⚠️ USUARIO ADMIN GENERADO: admin');
        console.log(`⚠️ CONTRASEÑA TEMPORAL: ${adminPass}`);
        console.log('⚠️ Cópiala, no se volverá a mostrar.');
        console.log('=============================================\n');
        
        const hash = await bcrypt.hash(adminPass, SALT_ROUNDS);
        await dbRun(`INSERT INTO Usuario_PersonalSalud (username, password_hash, nombre_completo, cedula_profesional, universidad, titulo, sexo, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          ['admin', hash, 'Administrador del Sistema', '000000', 'Sistema', 'Admin', 'M', 'Admin']);
      }
    } catch (e) { 
      console.error("Error inicializando admin:", e);
    }
  });
}

async function registrarAuditoria(idUsuario, accion, idRegistro = null, detalles = null) {
  try {
    await dbRun(`INSERT INTO Registro_Auditoria (id_usuario, fecha_hora, accion_realizada, id_registro_afectado, detalles) VALUES (?, ?, ?, ?, ?)`,
      [idUsuario, new Date().toISOString(), accion, idRegistro, detalles]);
  } catch (e) {
    console.error("Error en auditoría:", e);
  }
}

function sanitizarNombreNOM(str) {
  if (!str) return '';
  return str.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ\s]/g, '').substring(0, 50).trim();
}

function validarCURP(curp) { return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp); }
function validarFechaNacimiento(fecha) {
  if (!/^\d{8}$/.test(fecha)) return false;
  const a = parseInt(fecha.substring(0,4)), m = parseInt(fecha.substring(4,6)), d = parseInt(fecha.substring(6,8));
  const dt = new Date(a, m-1, d);
  return dt.getFullYear()===a && dt.getMonth()===m-1 && dt.getDate()===d && a>=1900 && a<=new Date().getFullYear();
}
function calcularEdad(f) {
  const a=parseInt(f.substring(0,4)), m=parseInt(f.substring(4,6))-1, d=parseInt(f.substring(6,8));
  const h=new Date(); let e=h.getFullYear()-a;
  if(h.getMonth()<m||(h.getMonth()===m&&h.getDate()<d)) e--;
  return e;
}

module.exports = { db, dbAll, dbGet, dbRun, registrarAuditoria, sanitizarNombreNOM, validarCURP, validarFechaNacimiento, calcularEdad, generarHash, generarHashNota, bcrypt, SALT_ROUNDS };