const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');

function cambiarFormulario(tipo) {
  const errL = document.getElementById('error-login'); const errR = document.getElementById('error-registro'); const exR = document.getElementById('exito-registro');
  if(errL) errL.style.display = 'none'; if(errR) errR.style.display = 'none'; if(exR) exR.style.display = 'none';
  if (tipo === 'registro') { formLogin.classList.add('hidden'); formRegistro.classList.remove('hidden'); } 
  else { formRegistro.classList.add('hidden'); formLogin.classList.remove('hidden'); }
}

async function iniciarSesion() {
  const u = document.getElementById('login-usuario').value.trim();
  const p = document.getElementById('login-password').value;
  const error = document.getElementById('error-login');
  const btn = document.getElementById('btn-login');
  
  if (!u || !p) { error.textContent = 'Ingrese usuario y contraseña.'; error.style.display = 'block'; return; }
  
  btn.disabled = true; btn.textContent = 'Conectando...';
  try {
    const res = await window.api.login(u, p);
    if (res.ok) {
      if (res.usuario.activo === 0) { error.textContent = 'Cuenta pendiente de aprobación por el Administrador.'; error.style.display = 'block'; } 
      else { window.api.irA('dashboard.html'); return; }
    } else { error.textContent = res.error; error.style.display = 'block'; }
  } catch (e) { error.textContent = 'Error de conexión con el servidor local.'; error.style.display = 'block'; }
  finally { btn.disabled = false; btn.textContent = 'Iniciar Sesión →'; }
}

async function registrarCuenta() {
  const error = document.getElementById('error-registro'); const exito = document.getElementById('exito-registro'); const btn = document.getElementById('btn-registro');
  error.style.display = 'none'; exito.style.display = 'none';
  
  const nombre = document.getElementById('reg-nombre').value.trim();
  const usuario = document.getElementById('reg-usuario').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmar = document.getElementById('reg-confirmar').value;
  const cedula = document.getElementById('reg-cedula').value.trim();
  const titulo = document.getElementById('reg-titulo').value;
  const sexo = document.getElementById('reg-sexo').value;

  if (!nombre || !usuario || !password || !confirmar) { error.textContent = 'Llena todos los campos obligatorios.'; error.style.display = 'block'; return; }
  
  btn.disabled = true; btn.textContent = 'Creando cuenta...';
  try {
    const res = await window.api.registro({ nombre, usuario, password, confirmar, cedula, titulo, sexo });
    if (res.ok) {
      ['reg-nombre', 'reg-usuario', 'reg-password', 'reg-confirmar', 'reg-cedula'].forEach(id => document.getElementById(id).value = '');
      exito.textContent = res.mensaje || 'Cuenta creada. Un administrador debe aprobar tu acceso.';
      exito.style.display = 'block';
      setTimeout(() => cambiarFormulario('login'), 4000);
    } else { error.textContent = res.error; error.style.display = 'block'; }
  } catch (e) { error.textContent = 'Error de conexión.'; error.style.display = 'block'; }
  finally { btn.disabled = false; btn.textContent = 'Crear Cuenta →'; }
}

function recuperarPassword() {
  const error = document.getElementById('error-login');
  error.textContent = 'Contacte al administrador del sistema para reestablecer su contraseña.';
  error.style.display = 'block';
}

document.getElementById('login-password')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') iniciarSesion(); });
document.getElementById('reg-confirmar')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') registrarCuenta(); });