const { contextBridge, ipcRenderer } = require('electron');
let CATALOGO_CIE10 = [];
try {
  ({ CATALOGO_CIE10 } = require('./cie10_catalogo.js'));
} catch (e) {
  console.error('Error cargando catálogo CIE-10:', e);
}

contextBridge.exposeInMainWorld('CIE10_CATALOGO', CATALOGO_CIE10);

contextBridge.exposeInMainWorld('api', {
  // Auth
  login: (u, p) => ipcRenderer.invoke('login', u, p),
  registro: (d) => ipcRenderer.invoke('registro', d),
  cerrarSesion: () => ipcRenderer.invoke('cerrar-sesion'),
  obtenerSesion: () => ipcRenderer.invoke('obtener-sesion'),

  // Pacientes
  listarPacientes: () => ipcRenderer.invoke('listar-pacientes'),
  guardarPaciente: (d) => ipcRenderer.invoke('guardar-paciente', d),
  buscarPaciente: (f) => ipcRenderer.invoke('buscar-paciente', f),

  // Notas clínicas
  guardarNota: (d) => ipcRenderer.invoke('guardar-nota', d),
  obtenerNotas: (f) => ipcRenderer.invoke('obtener-notas', f),
  verificarIntegridadNotas: (f) => ipcRenderer.invoke('verificar-integridad-notas', f),

  // Consentimiento
  guardarConsentimiento: (d) => ipcRenderer.invoke('guardar-consentimiento', d),
  obtenerConsentimientos: (f) => ipcRenderer.invoke('obtener-consentimientos', f),

  // Recetas
  guardarReceta: (d) => ipcRenderer.invoke('guardar-receta', d),
  obtenerRecetas: (f) => ipcRenderer.invoke('obtener-recetas', f),

  // Exportar / Auditoría
  exportarExpediente: (f) => ipcRenderer.invoke('exportar-expediente', f),
  obtenerAuditoria: (f) => ipcRenderer.invoke('obtener-auditoria', f),

  irA: (p) => ipcRenderer.invoke('ir-a', p),
});
