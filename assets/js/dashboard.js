function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

// EL ESTADO CENTRALIZADO (SIN VARIABLES SUELTAS)
const AppState = {
  folioActivo: null,
  pacienteActivoDatos: null,
  tabActivo: 'notas',
  notasCache: [],
  notaSeleccionada: null,
  cie10Seleccionados: [],
  rolUsuario: ''
};

const BLOQUE_SIGNOS_VITALES = `
  <div class="sv-box">
    <span class="sv-title">📋 Signos Vitales y Somatometría</span>
    <div class="form-grid ancho-sv">
      <div class="form-group"><label>Peso (kg)</label><input type="number" step="0.1" id="extra-vs-peso"></div>
      <div class="form-group"><label>Estatura (m)</label><input type="number" step="0.01" id="extra-vs-talla"></div>
      <div class="form-group"><label>IMC</label><input type="number" step="0.1" id="extra-vs-imc" readonly></div>
      <div class="form-group"><label>Peso Hab (kg)</label><input type="number" step="0.1" id="extra-vs-pesohab"></div>
      <div class="form-group"><label>Resp (rpm)</label><input type="number" id="extra-vs-fr"></div>
      <div class="form-group"><label>Pulso (lpm)</label><input type="number" id="extra-vs-fc"></div>
      <div class="form-group"><label>TA (mmHg)</label><input type="text" placeholder="120/80" id="extra-vs-ta"></div>
      <div class="form-group"><label>Temp (°C)</label><input type="number" step="0.1" id="extra-vs-temp"></div>
      <div class="form-group"><label>Sat O2 (%)</label><input type="number" id="extra-vs-sato2"></div>
    </div>
  </div>
`;

const EXPLORACION_FISICA = `
  <div class="form-group full">
    <label style="font-size:13px; color:var(--primary); margin-top:10px;">Exploración Física *</label>
    <textarea id="nota-exploracion" style="text-transform:none; min-height:120px;" placeholder="Describa los hallazgos a la inspección, palpación, percusión y auscultación..."></textarea>
  </div>
`;

const CAMPOS_POR_TIPO = {
  primera_vez: { titulo: '📄 Nota de Primera Vez', campos: `<div class="form-grid"><div class="form-group full" style="background:#f8fafc; padding:16px; border-radius:12px; border:1px solid var(--border); display:flex; gap:24px; align-items:center;"><span style="font-size:13px; font-weight:800; color:var(--primary);">INTERROGATORIO:</span><div style="display:flex; align-items:center; gap:6px;"><input type="radio" name="inter_tipo" value="Directo" id="r-dir" checked> <label for="r-dir" style="margin:0; font-size:13px;">Directo</label></div><div style="display:flex; align-items:center; gap:6px;"><input type="radio" name="inter_tipo" value="Indirecto" id="r-indir"> <label for="r-indir" style="margin:0; font-size:13px;">Indirecto</label></div><div style="display:flex; align-items:center; gap:6px; margin-left:auto;"><input type="checkbox" id="chk-confiable" checked> <label for="chk-confiable" style="margin:0; font-size:13px; color:var(--success);">Confiable</label></div><input type="hidden" id="extra-interrogatorio" value="Directo, Confiable"></div><div class="form-group full"><label>AHF (Antecedentes Heredofamiliares)</label><textarea id="extra-ahf" style="text-transform:none;"></textarea></div><div class="form-group full"><label>APNP (Personales No Patológicos)</label><textarea id="extra-apnp" style="text-transform:none;"></textarea></div><div class="form-group full"><label>APP (Personales Patológicos)</label><textarea id="extra-app" style="text-transform:none;"></textarea></div><div class="form-group full"><label>IPAS (Interrogatorio por Aparatos y Sistemas)</label><textarea id="extra-ipas" style="text-transform:none;"></textarea></div><div class="form-group full"><label style="font-size:13px; color:var(--primary); margin-top:10px;">Padecimiento Actual *</label><textarea id="nota-motivo" style="text-transform:none; min-height:100px;"></textarea></div>${BLOQUE_SIGNOS_VITALES}${EXPLORACION_FISICA}<div class="form-group full"><label>Paraclínicos</label><textarea id="extra-paraclinicos" style="text-transform:none;"></textarea></div><div class="form-group full"><label>Diagnósticos Diferenciales</label><textarea id="extra-diag-diferenciales" style="text-transform:none;"></textarea></div></div>` },
  evolucion: { titulo: '📝 Nota de Evolución', campos: `<div class="form-grid"><div class="form-group full"><label style="font-size:13px; color:var(--primary); margin-top:10px;">Evolución / Padecimiento Actual *</label><textarea id="nota-motivo" style="text-transform:none; min-height:120px;"></textarea></div>${BLOQUE_SIGNOS_VITALES}${EXPLORACION_FISICA}<div class="form-group full"><label>Resultados de Estudios</label><textarea id="extra-paraclinicos" style="text-transform:none;"></textarea></div></div>` },
  urgencias: { titulo: '🚑 Nota de Urgencias', campos: `<div class="form-grid"><div class="form-group full"><label style="font-size:13px; color:var(--primary); margin-top:10px;">Motivo de Atención *</label><textarea id="nota-motivo" style="text-transform:none; min-height:100px;"></textarea></div>${BLOQUE_SIGNOS_VITALES}${EXPLORACION_FISICA}<div class="form-group"><label>Hora Llegada</label><input type="text" id="extra-hora-llegada"></div><div class="form-group"><label>Triage</label><select id="extra-triage" style="font-weight:700;"><option value="Verde" style="color:#10b981;">🟢 Verde</option><option value="Amarillo" style="color:#f59e0b;">🟡 Amarillo</option><option value="Rojo" style="color:#ef4444;">🔴 Rojo</option></select></div><div class="form-group full"><label>Destino</label><input type="text" id="extra-destino"></div></div>` },
  enfermeria: { titulo: '👩‍⚕️ Nota de Enfermería', campos: `<div class="form-grid"><div class="form-group full"><label style="font-size:13px; color:var(--primary); margin-top:10px;">Valoración de Enfermería *</label><textarea id="nota-motivo" style="text-transform:none; min-height:120px;"></textarea></div>${BLOQUE_SIGNOS_VITALES}<div class="form-group full"><label>Observaciones Físicas</label><textarea id="nota-exploracion" style="text-transform:none;"></textarea></div><div class="form-group full"><label>Procedimientos Realizados</label><textarea id="extra-procedimientos" style="text-transform:none;"></textarea></div><div class="form-group full"><label>Medicamentos Administrados</label><textarea id="extra-medicamentos-enf" style="text-transform:none;"></textarea></div></div>` }
};
const NOMBRES_TIPO = { primera_vez:'Primera Vez', evolucion:'Evolución', urgencias:'Urgencias', enfermeria:'Enfermería' };
const COLORES_TIPO = { primera_vez:'var(--primary)', evolucion:'#dd6b20', urgencias:'var(--danger)', enfermeria:'var(--success)' };
const ICONOS_TIPO = { primera_vez:'📄', evolucion:'📝', urgencias:'🚑', enfermeria:'👩‍⚕️' };

document.addEventListener('input', function(e) {
  if (e.target.id === 'extra-vs-peso' || e.target.id === 'extra-vs-talla') {
    const p = parseFloat(document.getElementById('extra-vs-peso')?.value); const t = parseFloat(document.getElementById('extra-vs-talla')?.value);
    const i = document.getElementById('extra-vs-imc'); if (i) i.value = (p > 0 && t > 0) ? (p / (t * t)).toFixed(2) : '';
  }
  if (e.target.name === 'inter_tipo' || e.target.id === 'chk-confiable') {
    const hidden = document.getElementById('extra-interrogatorio');
    if (hidden) hidden.value = `${document.querySelector('input[name="inter_tipo"]:checked')?.value || 'Directo'}, ${document.getElementById('chk-confiable')?.checked ? 'Confiable' : 'No confiable'}`;
  }
});

function aplicarRBAC(rol) {
  AppState.rolUsuario = rol;
  const esMedico = rol === 'Médico' || rol === 'Admin'; const esEnfermeria = rol === 'Enfermería'; const esSecretaria = rol === 'Secretaria';
  document.getElementById('admin-sidebar').style.display = 'none'; document.getElementById('btn-reg-paciente').style.display = 'block'; document.getElementById('tab-notas').style.display = 'flex'; document.getElementById('btns-notas-medico').style.display = 'block'; document.getElementById('btn-nota-enfermeria').style.display = 'block'; document.getElementById('btns-solo-medico').style.display = 'block';
  if (esMedico) document.getElementById('admin-sidebar').style.display = 'block';
  if (esEnfermeria) { document.getElementById('btn-reg-paciente').style.display = 'none'; document.getElementById('btns-notas-medico').style.display = 'none'; document.getElementById('btns-solo-medico').style.display = 'none'; }
  if (esSecretaria) { document.getElementById('tab-notas').style.display = 'none'; document.getElementById('btns-notas-medico').style.display = 'none'; document.getElementById('btn-nota-enfermeria').style.display = 'none'; document.getElementById('btns-solo-medico').style.display = 'none'; }
}

(async function init() {
  const res = await window.api.obtenerSesion(); if (!res.ok) { await window.api.irA('index.html'); return; }
  window.CIE10_CATALOGO = await window.api.obtenerCatalogoCIE10();
  aplicarRBAC(res.usuario.rol); listarPacientes();
})();

async function cerrarSesion() { await window.api.cerrarSesion(); }

function abrirModal(id) { document.getElementById(id).classList.add('visible'); initCanvases(); }
function cerrarModal(id) {
  const m = document.getElementById(id); m.classList.remove('visible');
  m.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), textarea').forEach(i => i.value = ''); m.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  m.querySelectorAll('.error-modal').forEach(e => { e.style.display = 'none'; e.textContent = ''; }); m.querySelectorAll('canvas').forEach(c => { c.getContext('2d').clearRect(0, 0, c.width, c.height); });
  AppState.cie10Seleccionados = []; if (id === 'modal-nota') { const s = document.getElementById('cie10-search'); if(s) s.value = ''; renderCIE10Tags(); }
  if (id === 'modal-paciente') { document.getElementById('pac-edonac').value = '01'; document.getElementById('pac-edores').value = '01'; document.getElementById('pac-munres').value = '001'; document.getElementById('pac-locres').value = '0001'; document.getElementById('pac-nacionalidad').value = 'MEX'; }
}

const canvasInit = {};
function initCanvases() {
  setTimeout(() => {
    document.querySelectorAll('.firma-container canvas').forEach(canvas => {
      if (canvasInit[canvas.id]) { canvasInit[canvas.id] = false; }
      canvas.width = canvas.parentElement.clientWidth || 300; canvas.height = 100;
      const ctx = canvas.getContext('2d'); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      let drawing = false;
      canvas.onmousedown = e => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
      canvas.onmousemove = e => { if (drawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } };
      canvas.onmouseup = () => drawing = false; canvas.onmouseleave = () => drawing = false;
      canvasInit[canvas.id] = true;
    });
  }, 200);
}
function limpiarCanvas(id) { const c = document.getElementById(id); c.getContext('2d').clearRect(0, 0, c.width, c.height); }
function obtenerFirma(id) {
  const c = document.getElementById(id); if (!c || c.width === 0) return null;
  const p = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < p.length; i += 4) { if (p[i] > 0) return c.toDataURL('image/png'); }
  return null;
}

function renderCIE10Dropdown(filtro = '') {
  const dd = document.getElementById('cie10-dropdown'); const f = filtro.toLowerCase(); const catalogo = window.CIE10_CATALOGO;
  if (!catalogo || catalogo.length === 0) return;
  const filtrados = catalogo.filter(c => c.codigo.toLowerCase().includes(f) || c.descripcion.toLowerCase().includes(f));
  let html = '';
  filtrados.forEach(cat => { const sel = AppState.cie10Seleccionados.some(s => s.c === cat.codigo) ? 'selected' : ''; html += `<div class="cie10-option ${sel}" data-code="${esc(cat.codigo)}" data-desc="${esc(cat.descripcion)}"><span><span class="code">${esc(cat.codigo)}</span>${esc(cat.descripcion)}</span>${sel ? '✓' : ''}</div>`; });
  dd.innerHTML = html || '<div style="padding:16px; color:var(--text-muted); text-align:center; font-weight:500;">Sin resultados</div>';
  dd.querySelectorAll('.cie10-option').forEach(el => el.addEventListener('click', () => toggleCIE10(el.dataset.code, el.dataset.desc)));
}
function toggleCIE10(codigo, descripcion) {
  const idx = AppState.cie10Seleccionados.findIndex(s => s.c === codigo);
  if (idx >= 0) AppState.cie10Seleccionados.splice(idx, 1); else AppState.cie10Seleccionados.push({ c: codigo, d: descripcion });
  renderCIE10Tags(); renderCIE10Dropdown(document.getElementById('cie10-search').value);
}
function renderCIE10Tags() {
  const container = document.getElementById('cie10-selected'); const searchInput = document.getElementById('cie10-search');
  Array.from(container.querySelectorAll('.cie10-tag')).forEach(el => el.remove());
  AppState.cie10Seleccionados.forEach(s => {
    const tag = document.createElement('span'); tag.className = 'cie10-tag'; tag.appendChild(document.createTextNode(`${s.c} - ${s.d} `));
    const removeBtn = document.createElement('span'); removeBtn.className = 'remove'; removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleCIE10(s.c, s.d); });
    tag.appendChild(removeBtn); container.insertBefore(tag, searchInput);
  });
}
function filtrarCIE10(valor) { renderCIE10Dropdown(valor); document.getElementById('cie10-dropdown').classList.add('open'); }
function abrirDropdownCIE10() { document.getElementById('cie10-dropdown').classList.add('open'); renderCIE10Dropdown(document.getElementById('cie10-search').value); }
document.addEventListener('click', (e) => { if (!e.target.closest('.cie10-container')) document.getElementById('cie10-dropdown')?.classList.remove('open'); });

async function listarPacientes() {
  const res = await window.api.listarPacientes(); const c = document.getElementById('contenedor-tarjetas');
  if (!res.ok || res.pacientes.length === 0) { c.innerHTML = '<div class="empty-state"><span>📂</span><p>No hay expedientes registrados.</p></div>'; return; }
  c.innerHTML = res.pacientes.map(r => `<div class="pac-card" onclick="cargarExpediente('${esc(r.folio_interno)}')"><div><strong>${esc(r.nombre)} ${esc(r.primer_apellido)} ${esc(r.segundo_apellido)}</strong><p>Exp: ${esc(r.folio_interno)} &nbsp;&bull;&nbsp; CURP: ${esc(r.curp)}</p></div><button class="btn-abrir">Abrir Expediente ➜</button></div>`).join('');
}

async function guardarPaciente() {
  const btn = document.getElementById('btn-submit-paciente'); const err = document.getElementById('error-paciente');
  const d = { 
    folio: document.getElementById('pac-folio').value.trim(), curp: document.getElementById('pac-curp').value.trim().toUpperCase(), 
    nombre: document.getElementById('pac-nombre').value.trim(), paterno: document.getElementById('pac-paterno').value.trim(), materno: document.getElementById('pac-materno').value.trim(), fecha: document.getElementById('pac-fecha').value.trim(), 
    sexo: document.getElementById('pac-sexo').value, cama: document.getElementById('pac-cama').value.trim(), lugar_origen: document.getElementById('pac-origen').value.trim(), lugar_residencia: document.getElementById('pac-residencia').value.trim(),
    nacionalidad: document.getElementById('pac-nacionalidad').value.trim(), domicilio: document.getElementById('pac-domicilio').value.trim(), escolaridad: document.getElementById('pac-escolaridad').value.trim(), religion: document.getElementById('pac-religion').value.trim(),
    ocupacion: document.getElementById('pac-ocupacion').value.trim(), telefono: document.getElementById('pac-telefono').value.trim(), lateralidad: document.getElementById('pac-lateralidad').value, estado_civil: document.getElementById('pac-estado-civil').value.trim(),
    contacto_emergencia_nombre: document.getElementById('pac-em-nombre').value.trim(), contacto_emergencia_telefono: document.getElementById('pac-em-telefono').value.trim(), entidad_nacimiento: document.getElementById('pac-edonac').value, entidad_residencia: document.getElementById('pac-edores').value,
    municipio_residencia: document.getElementById('pac-munres').value, localidad_residencia: document.getElementById('pac-locres').value
  };
  if (!d.folio||!d.curp||!d.nombre||!d.paterno||!d.fecha||!d.entidad_nacimiento||!d.nacionalidad) { err.textContent='Faltan datos obligatorios marcados con *'; err.style.display='block'; return; }
  btn.disabled = true; btn.textContent = 'Guardando...';
  const res = await window.api.guardarPaciente(d);
  btn.disabled = false; btn.textContent = 'Guardar Paciente';
  if (res.ok) { cerrarModal('modal-paciente'); listarPacientes(); } else { err.textContent = res.error; err.style.display = 'block'; }
}

async function cargarExpediente(folio) {
  const res = await window.api.buscarPaciente(folio); if (!res.ok) return;
  AppState.folioActivo = folio; AppState.pacienteActivoDatos = res.paciente; const r = res.paciente;
  const a = r.fecha_nacimiento.substring(0,4), m = r.fecha_nacimiento.substring(4,6), d = r.fecha_nacimiento.substring(6,8);
  
  document.getElementById('perfil-paciente').innerHTML = `<div class="perfil-row"><div class="avatar">${esc(r.nombre).charAt(0)}</div><div><h4>${esc(r.nombre)} ${esc(r.primer_apellido)}</h4><p>${r.sexo==='M'?'Femenino':'Masculino'} &bull; ${r.edad} años</p><p style="font-size:10px; margin-top:2px; font-weight:700; color:var(--primary);">EXP: ${esc(r.folio_interno)}</p></div></div>`;
  
  document.getElementById('ficha-identificacion').innerHTML = `
    <div class="ficha-group"><span class="fl">Nombre del Paciente</span><span class="fv">${esc(r.nombre)} ${esc(r.primer_apellido)} ${esc(r.segundo_apellido||'')}</span></div>
    <div class="ficha-group"><span class="fl">Cama / Folio</span><span class="fv" style="color:#93c5fd;">${esc(r.cama || 'N/D')} / ${esc(r.folio_interno)}</span></div>
    <div class="ficha-group"><span class="fl">Nacimiento / Edad</span><span class="fv">${d}/${m}/${a} (${r.edad} años)</span></div>
    <div class="ficha-group"><span class="fl">Género / Edo. Civil</span><span class="fv">${r.sexo==='H'?'Masculino':'Femenino'} &bull; ${esc(r.estado_civil || 'N/D')}</span></div>
    <div class="ficha-group"><span class="fl">Origen / Residencia</span><span class="fv">${esc(r.lugar_origen || 'N/D')} / ${esc(r.lugar_residencia || 'N/D')}</span></div>
    <div class="ficha-group"><span class="fl">Escolaridad</span><span class="fv">${esc(r.escolaridad || 'N/D')}</span></div>
    <div class="ficha-group"><span class="fl">Religión</span><span class="fv">${esc(r.religion || 'N/D')}</span></div>
    <div class="ficha-group"><span class="fl">Ocupación</span><span class="fv">${esc(r.ocupacion || 'N/D')}</span></div>
    <div class="ficha-group" style="grid-column: span 2;"><span class="fl">Domicilio Completo</span><span class="fv" style="font-size:12px;">${esc(r.domicilio || 'N/D')}</span></div>
    <div class="ficha-group"><span class="fl">Teléfono Personal</span><span class="fv">${esc(r.telefono || 'N/D')}</span></div>
    <div class="ficha-group" style="background:rgba(239, 68, 68, 0.15); border-color:rgba(239,68,68,0.3);"><span class="fl" style="color:#fca5a5;">Contacto Emergencia</span><span class="fv">${esc(r.contacto_emergencia_nombre||'N/D')}<br><span style="font-size:11px; color:#f87171;">${esc(r.contacto_emergencia_telefono||'')}</span></span></div>
  `;
  
  document.getElementById('lista-pacientes-container').style.display = 'none'; document.getElementById('vista-expediente').classList.add('visible'); document.getElementById('sidebar-nav').style.display = 'none'; document.getElementById('acciones-exp').style.display = 'block';
  if (AppState.rolUsuario === 'Secretaria') { document.getElementById('timeline-section').style.display = 'none'; document.getElementById('detail-panel').innerHTML = '<div class="detail-inner"><div class="empty-state"><span>ℹ️</span><p>Puede consultar los datos demográficos del paciente.</p></div></div>'; } else { cambiarTab('notas'); }
}

function mostrarListaPacientes() { document.getElementById('lista-pacientes-container').style.display = 'block'; document.getElementById('vista-expediente').classList.remove('visible'); document.getElementById('sidebar-nav').style.display = 'block'; document.getElementById('acciones-exp').style.display = 'none'; AppState.folioActivo = null; document.getElementById('perfil-paciente').innerHTML = `<div class="perfil-row"><div class="avatar">?</div><div><h4>Seleccione Paciente</h4><p>Busque un paciente</p></div></div>`; }
function cambiarTab(tab) { if (AppState.rolUsuario === 'Secretaria') return; AppState.tabActivo = tab; document.querySelectorAll('.exp-tab').forEach(t => t.classList.toggle('activo', t.dataset.tab === tab)); document.getElementById('timeline-section').style.display = (tab === 'notas') ? 'block' : 'none'; if (tab === 'notas') cargarNotas(); else if (tab === 'consentimientos') cargarConsentimientos(); else if (tab === 'recetas') cargarRecetas(); }
function clickAnadirNota() { if (AppState.rolUsuario === 'Enfermería') { abrirModalNotaTipo('enfermeria'); } else if (AppState.rolUsuario === 'Médico' || AppState.rolUsuario === 'Admin') { abrirModal('modal-selector-nota'); } }

function abrirModalNotaTipo(tipo) {
  if (!AppState.folioActivo) return;
  document.getElementById('nota-tipo').value = tipo;
  document.getElementById('modal-nota-titulo').textContent = CAMPOS_POR_TIPO[tipo].titulo;
  document.getElementById('campos-dinamicos-nota').innerHTML = CAMPOS_POR_TIPO[tipo].campos;
  abrirModal('modal-nota');
}

async function guardarNota() {
  const btn = document.getElementById('btn-submit-nota'); const err = document.getElementById('error-nota');
  const motivo = document.getElementById('nota-motivo') ? document.getElementById('nota-motivo').value.trim() : '';
  const exploracion = document.getElementById('nota-exploracion') ? document.getElementById('nota-exploracion').value.trim() : '';
  
  if (!motivo) { err.textContent='El campo principal (Valoración/Padecimiento) es obligatorio.'; err.style.display='block'; return; }
  if (AppState.cie10Seleccionados.length === 0) { err.textContent='Seleccione un diagnóstico CIE-10.'; err.style.display='block'; return; }
  
  const diagnosticoStr = AppState.cie10Seleccionados.map(s => `${s.c}: ${s.d}`).join(' | ');
  const camposExtra = {}; document.querySelectorAll('#campos-dinamicos-nota [id^="extra-"]').forEach(el => { camposExtra[el.id.replace('extra-', '')] = el.value ? el.value.trim() : ''; });
  
  btn.disabled = true; btn.textContent = 'Guardando Nota...';
  const res = await window.api.guardarNota({
    folio_paciente: AppState.folioActivo, tipo_nota: document.getElementById('nota-tipo').value, motivo_consulta: motivo,
    exploracion_fisica: exploracion, diagnostico_principal_cie10: diagnosticoStr, plan_tratamiento: document.getElementById('nota-plan') ? document.getElementById('nota-plan').value.trim() : '',
    firma_profesional: obtenerFirma('firma-nota-canvas') || '', firma_electronica: document.getElementById('nota-firma-electronica').value.trim() || '', campos_extra: camposExtra
  });
  btn.disabled = false; btn.textContent = 'Guardar Nota Definitiva';
  if (res.ok) { cerrarModal('modal-nota'); cargarNotas(); } else { err.textContent = res.error; err.style.display = 'block'; }
}

async function cargarNotas() { const res = await window.api.obtenerNotas(AppState.folioActivo); AppState.notasCache = res.ok ? res.notas : []; renderTimeline(); if (AppState.notasCache.length === 0) { document.getElementById('detail-panel').innerHTML = '<div class="empty-state"><span>📝</span><p>No hay notas clínicas registradas.</p></div>'; AppState.notaSeleccionada = null; } else { seleccionarNota(AppState.notasCache.length - 1); } }

function renderTimeline() { 
  const track = document.getElementById('timeline-track'); 
  if (AppState.notasCache.length === 0) { track.innerHTML = `<div class="tl-item" onclick="clickAnadirNota()"><div class="tl-circle bg-add">+</div><div class="tl-label" style="color:var(--text-muted);">Añadir Nota</div></div>`; document.getElementById('timeline-periodo').textContent = ''; return; } 
  let html = ''; 
  AppState.notasCache.forEach((n, i) => { 
    const tipo = n.tipo_nota || 'evolucion'; const color = COLORES_TIPO[tipo] || '#64748b'; const icono = ICONOS_TIPO[tipo] || '📝'; 
    html += `<div class="tl-item ${AppState.notaSeleccionada === i ? 'selected' : ''}" onclick="seleccionarNota(${i})" id="tl-item-${i}">
      <div class="tl-date">${new Date(n.fecha_creacion).toLocaleDateString('es-MX', {day:'2-digit',month:'2-digit'})}</div>
      <div class="tl-circle" style="background:${color};">${icono}</div>
      <div class="tl-label">${esc((n.diagnostico_principal_cie10 || '').substring(0, 15))}</div>
      <div class="tl-tipo">${NOMBRES_TIPO[tipo] || tipo}</div>
    </div>`; 
  }); 
  html += `<div class="tl-item" onclick="clickAnadirNota()"><div class="tl-date">Nuevo</div><div class="tl-circle bg-add">+</div><div class="tl-label" style="color:var(--text-muted);">Añadir Nota</div></div>`; 
  track.innerHTML = html; 
}

function seleccionarNota(idx) {
  AppState.notaSeleccionada = idx; document.querySelectorAll('.tl-item').forEach((el, i) => el.classList.toggle('selected', i === idx)); const el = document.getElementById('tl-item-' + idx); if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  const n = AppState.notasCache[idx]; let extras = {}; try { extras = n.campos_extra ? JSON.parse(n.campos_extra) : {}; } catch(e) {}
  
  let html = `<div class="detail-header"><div><h2>${esc(n.diagnostico_principal_cie10?.split('|')[0] || '')}</h2><p>Fecha: ${new Date(n.fecha_creacion).toLocaleString('es-MX')} &bull; Firmado por: <strong>${esc(n.nombre_creador)}</strong></p></div><div style="display:flex; gap:12px; align-items:center;"><button class="btn-primary" style="background:var(--success); color:white; padding:10px 16px; box-shadow:0 4px 6px rgba(16,185,129,0.2);" onclick="imprimirPDF('nota', ${idx})">🖨️ Imprimir PDF</button><span class="detail-badge" title="Hash SHA-256 de integridad">🔒 ${n.hash_nota.substring(0,18)}...</span></div></div>`;
  
  if (n.tipo_nota === 'primera_vez' && extras.interrogatorio) { html += `<div class="detail-section" style="background:#f8fafc;"><span style="background:var(--bg); padding:6px 12px; border-radius:6px; font-size:12px; font-weight:800; color:var(--primary); border:1px solid var(--border);">Interrogatorio: ${esc(extras.interrogatorio)}</span></div>`; }
  
  html += `<div class="detail-section"><h4>${n.tipo_nota === 'enfermeria' ? 'Valoración de Enfermería' : 'Motivo / Padecimiento Actual'}</h4><p>${esc(n.motivo_consulta)}</p></div>`;
  
  const tieneSV = extras['vs-peso'] || extras['vs-talla'] || extras['vs-ta'] || extras['vs-fc'] || extras['vs-fr'] || extras['vs-temp'];
  if (tieneSV) { html += `<div class="detail-section"><h4>Signos Vitales y Somatometría</h4><table class="tabla-sv"><tr><td><b>Peso:</b> ${esc(extras['vs-peso']||'-')} kg</td><td><b>Talla:</b> ${esc(extras['vs-talla']||'-')} m</td><td><b>IMC:</b> ${esc(extras['vs-imc']||'-')}</td><td><b>Peso Hab:</b> ${esc(extras['vs-pesohab']||'-')} kg</td></tr><tr><td><b>Pulso (FC):</b> ${esc(extras['vs-fc']||'-')} lpm</td><td><b>Resp (FR):</b> ${esc(extras['vs-fr']||'-')} rpm</td><td><b>TA:</b> ${esc(extras['vs-ta']||'-')} mmHg</td><td><b>Temp:</b> ${esc(extras['vs-temp']||'-')} °C</td></tr><tr><td colspan="4"><b>SatO2:</b> ${esc(extras['vs-sato2']||'-')} %</td></tr></table></div>`; }
  
  if (n.exploracion_fisica) html += `<div class="detail-section"><h4>Exploración Física</h4><p>${esc(n.exploracion_fisica)}</p></div>`;
  
  const excluidos = ['vs-peso', 'vs-talla', 'vs-imc', 'vs-pesohab', 'vs-fr', 'vs-fc', 'vs-ta', 'vs-temp', 'vs-sato2', 'interrogatorio'];
  for (const [key, val] of Object.entries(extras)) { if(val && !excluidos.includes(key)) html += `<div class="detail-section"><h4>${esc(key).replace(/-/g, ' ').toUpperCase()}</h4><p>${esc(val)}</p></div>`; }
  
  html += `<div class="detail-section"><h4>Diagnósticos CIE-10</h4><div style="display:flex; flex-wrap:wrap; gap:8px;">`; (n.diagnostico_principal_cie10 || '').split('|').forEach(d => { html += `<span class="tipo-nota-badge">${esc(d.trim())}</span>`; }); html += `</div></div>`;
  
  if (n.plan_tratamiento) html += `<div class="detail-section" style="border-left: 4px solid var(--primary);"><h4>Terapéutica / Plan de Tratamiento</h4><p>${esc(n.plan_tratamiento)}</p></div>`;
  
  document.getElementById('detail-panel').innerHTML = html;
}

async function guardarConsentimiento() {
  const err = document.getElementById('error-consentimiento');
  const d = { folio_paciente: AppState.folioActivo, tipo_procedimiento: document.getElementById('cons-tipo').value.trim(), descripcion_procedimiento: document.getElementById('cons-descripcion').value.trim(), riesgos: document.getElementById('cons-riesgos').value.trim(), beneficios: document.getElementById('cons-beneficios').value.trim(), alternativas: document.getElementById('cons-alternativas').value.trim(), nombre_paciente_firmante: document.getElementById('cons-nombre-paciente').value.trim(), nombre_testigo1: document.getElementById('cons-nombre-testigo1').value.trim(), nombre_testigo2: document.getElementById('cons-nombre-testigo2').value.trim(), firma_paciente: obtenerFirma('firma-paciente-canvas'), firma_medico: obtenerFirma('firma-medico-cons-canvas'), firma_testigo1: obtenerFirma('firma-testigo1-canvas'), firma_testigo2: obtenerFirma('firma-testigo2-canvas') };
  if (!d.tipo_procedimiento||!d.descripcion_procedimiento||!d.riesgos||!d.nombre_paciente_firmante||!d.nombre_testigo1||!d.nombre_testigo2) { err.textContent='Llena todos los campos obligatorios marcados con *'; err.style.display='block'; return; }
  
  document.getElementById('btn-submit-consentimiento').disabled = true;
  const res = await window.api.guardarConsentimiento(d);
  document.getElementById('btn-submit-consentimiento').disabled = false;
  if (res.ok) { cerrarModal('modal-consentimiento'); cambiarTab('consentimientos'); } else { err.textContent = res.error; err.style.display = 'block'; }
}

async function cargarConsentimientos() {
  const res = await window.api.obtenerConsentimientos(AppState.folioActivo); const panel = document.getElementById('detail-panel');
  if (!res.ok || res.consentimientos.length === 0) { panel.innerHTML = '<div class="empty-state"><span>✍️</span><p>No hay consentimientos informados registrados.</p></div>'; return; }
  window.consentimientosCache = res.consentimientos; 
  let html = '<h3 style="margin-bottom:20px; color:var(--text-main); font-size:18px; font-weight:800;">Consentimientos Informados</h3><table class="tabla-simple"><thead><tr><th>Fecha</th><th>Procedimiento</th><th>Firmantes</th><th>Acción</th></tr></thead><tbody>';
  res.consentimientos.forEach((c, idx) => { html += `<tr><td><span style="background:var(--bg); padding:4px 8px; border-radius:6px; font-weight:600; font-size:12px;">${new Date(c.fecha_creacion).toLocaleDateString('es-MX')}</span></td><td><strong style="color:var(--primary);">${esc(c.tipo_procedimiento)}</strong></td><td style="font-size:11px; color:var(--text-muted);"><strong>Pac:</strong> ${esc(c.nombre_paciente_firmante)}<br><strong>Med:</strong> ${esc(c.nombre_medico)}</td><td><button class="btn-primary" style="background:var(--success); font-size:11px; padding:6px 12px;" onclick="imprimirPDF('consentimiento', ${idx})">🖨️ Imprimir PDF</button></td></tr>`; });
  panel.innerHTML = html + '</tbody></table>';
}

async function guardarReceta() {
  const err = document.getElementById('error-receta');
  const diag = document.getElementById('receta-diagnostico').value.trim(); const meds = document.getElementById('receta-medicamentos').value.trim();
  if (!diag||!meds) { err.textContent='Diagnóstico y medicamentos obligatorios.'; err.style.display='block'; return; }
  
  document.getElementById('btn-submit-receta').disabled = true;
  const res = await window.api.guardarReceta({ folio_paciente: AppState.folioActivo, diagnostico: diag, medicamentos: meds, indicaciones: document.getElementById('receta-indicaciones').value.trim(), tipo_receta: document.getElementById('receta-tipo').value, firma_medico: obtenerFirma('firma-receta-canvas') || '' });
  document.getElementById('btn-submit-receta').disabled = false;
  if (res.ok) { cerrarModal('modal-receta'); cambiarTab('recetas'); } else { err.textContent = res.error; err.style.display = 'block'; }
}

async function cargarRecetas() {
  const res = await window.api.obtenerRecetas(AppState.folioActivo); const panel = document.getElementById('detail-panel');
  if (!res.ok || res.recetas.length === 0) { panel.innerHTML = '<div class="empty-state"><span>💊</span><p>No hay recetas médicas registradas.</p></div>'; return; }
  window.recetasCache = res.recetas;
  let html = '<h3 style="margin-bottom:20px; color:var(--text-main); font-size:18px; font-weight:800;">Recetas Médicas</h3><table class="tabla-simple"><thead><tr><th>Fecha</th><th>Diagnóstico</th><th>Medicamentos</th><th>Tipo</th><th>Acción</th></tr></thead><tbody>';
  res.recetas.forEach((r, idx) => { html += `<tr><td><span style="background:var(--bg); padding:4px 8px; border-radius:6px; font-weight:600; font-size:12px;">${new Date(r.fecha_creacion).toLocaleDateString('es-MX')}</span></td><td><strong>${esc(r.diagnostico)}</strong></td><td style="font-size:13px; max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(r.medicamentos)}</td><td>${r.tipo_receta === 'antibiotico' ? '<span style="color:var(--danger); font-weight:800; background:rgba(239, 68, 68, 0.1); padding:4px 8px; border-radius:6px; font-size:11px;">🔴 ANTIBIÓTICO</span>' : '<span style="color:var(--success); font-weight:800; background:rgba(16, 185, 129, 0.1); padding:4px 8px; border-radius:6px; font-size:11px;">🟢 GENERAL</span>'}</td><td><button class="btn-primary" style="background:var(--success); font-size:11px; padding:6px 12px;" onclick="imprimirPDF('receta', ${idx})">🖨️ Imprimir PDF</button></td></tr>`; });
  panel.innerHTML = html + '</tbody></table>';
}

async function imprimirPDF(tipo, idx) {
  if (!AppState.pacienteActivoDatos) return;
  const btn = event.target; const textoOrig = btn.textContent; btn.disabled = true; btn.textContent = 'Generando...';
  let res;
  if (tipo === 'nota') res = await window.api.exportarNotaPDF(AppState.notasCache[idx], AppState.pacienteActivoDatos);
  else if (tipo === 'receta') res = await window.api.exportarRecetaPDF(window.recetasCache[idx], AppState.pacienteActivoDatos);
  else if (tipo === 'consentimiento') res = await window.api.exportarConsentimientoPDF(window.consentimientosCache[idx], AppState.pacienteActivoDatos);
  
  btn.disabled = false; btn.textContent = textoOrig;
  if (res && res.ok) alert('Documento generado exitosamente en PDF para imprimir.');
}

async function abrirModalGestionUsuarios() {
  abrirModal('modal-gestionar-usuarios');
  await cargarListaUsuarios();
}

async function cargarListaUsuarios() {
  const container = document.getElementById('tabla-usuarios-container');
  container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); font-weight:500;">Cargando usuarios...</div>';
  
  const res = await window.api.listarUsuarios();
  if (!res.ok || !res.usuarios) { 
    container.innerHTML = '<div class="error-modal" style="display:block">Error al cargar la base de datos de usuarios.</div>'; 
    return; 
  }
  
  let html = '<table class="tabla-simple"><thead><tr><th>Usuario / Nombre</th><th>Rol Asignado</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
  
  res.usuarios.forEach(u => {
    const esActivo = u.activo === 1;
    const estadoHtml = esActivo 
      ? '<span style="background:rgba(16, 185, 129, 0.1); color:var(--success); padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; letter-spacing:0.5px;">ACTIVO</span>' 
      : '<span style="background:rgba(239, 68, 68, 0.1); color:var(--danger); padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; letter-spacing:0.5px;">PENDIENTE</span>';
      
    html += `<tr>
      <td>
        <strong style="font-size:14px;">${esc(u.username)}</strong><br>
        <span style="font-size:12px; color:var(--text-muted);">${esc(u.titulo)} ${esc(u.nombre_completo)}</span>
      </td>
      <td>
        <select id="rol-usuario-${u.id_usuario}" style="padding:6px 10px; font-size:12px; border:2px solid var(--border); border-radius:6px; font-weight:600; outline:none;">
          <option value="Médico" ${u.rol==='Médico'?'selected':''}>Médico</option>
          <option value="Enfermería" ${u.rol==='Enfermería'?'selected':''}>Enfermería</option>
          <option value="Secretaria" ${u.rol==='Secretaria'?'selected':''}>Secretaria</option>
          <option value="Admin" ${u.rol==='Admin'?'selected':''}>Administrador</option>
        </select>
      </td>
      <td>${estadoHtml}</td>
      <td>
        ${esActivo ? 
          `<button class="btn-cancelar" style="padding:8px 14px; margin:0; font-size:11px; color:var(--danger); border-color:rgba(239,68,68,0.2); background:rgba(239,68,68,0.05);" onclick="desactivarUsuario(${u.id_usuario})">Desactivar</button>` : 
          `<button class="btn-primary" style="background:var(--success); padding:8px 14px; margin:0; font-size:11px; box-shadow:none;" onclick="aprobarUsuario(${u.id_usuario})">Aprobar Acceso</button>`
        }
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

async function aprobarUsuario(id) {
  const selectRol = document.getElementById(`rol-usuario-${id}`);
  const nuevoRol = selectRol.value;
  const res = await window.api.aprobarUsuario({ id_usuario: id, rol: nuevoRol });
  if (res.ok) { cargarListaUsuarios(); } else { alert("Error al aprobar usuario"); }
}

async function desactivarUsuario(id) {
  if(confirm("¿Seguro que quieres revocar el acceso a este usuario?")) {
    const res = await window.api.desactivarUsuario(id);
    if (res.ok) cargarListaUsuarios();
  }
}