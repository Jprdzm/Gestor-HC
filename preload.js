const { contextBridge, ipcRenderer } = require('electron');

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

  // CIE-10
  buscarCIE10: (texto) => ipcRenderer.invoke('buscar-cie10', texto),
  obtenerTodosCIE10: () => ipcRenderer.invoke('obtener-todos-cie10'),

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