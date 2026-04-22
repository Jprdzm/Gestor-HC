const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Catálogo y PDFs
  obtenerCatalogoCIE10: () => ipcRenderer.invoke('obtener-catalogo-cie10'),
  exportarNotaPDF: (n, p) => ipcRenderer.invoke('exportar-nota-pdf', n, p),
  exportarRecetaPDF: (r, p) => ipcRenderer.invoke('exportar-receta-pdf', r, p),
  exportarConsentimientoPDF: (c, p) => ipcRenderer.invoke('exportar-consentimiento-pdf', c, p),

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

  // Otros documentos
  guardarConsentimiento: (d) => ipcRenderer.invoke('guardar-consentimiento', d),
  obtenerConsentimientos: (f) => ipcRenderer.invoke('obtener-consentimientos', f),
  guardarReceta: (d) => ipcRenderer.invoke('guardar-receta', d),
  obtenerRecetas: (f) => ipcRenderer.invoke('obtener-recetas', f),
  
  // Herramientas y Admin
  exportarExpediente: (f) => ipcRenderer.invoke('exportar-expediente', f),
  obtenerAuditoria: (f) => ipcRenderer.invoke('obtener-auditoria', f),
  listarUsuarios: () => ipcRenderer.invoke('listar-usuarios'),
  aprobarUsuario: (d) => ipcRenderer.invoke('aprobar-usuario', d),
  desactivarUsuario: (id) => ipcRenderer.invoke('desactivar-usuario', id),
  irA: (p) => ipcRenderer.invoke('ir-a', p),
});