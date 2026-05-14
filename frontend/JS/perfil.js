const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

const API = `${API_BASE}/api/usuarios`;

renderNav('perfil');

// Email original cargado desde la API (para detectar si cambió)
let emailOriginal = '';

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className   = 'msg ' + type;
}

function clearMsg(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.className   = 'msg';
}

function authFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), 'Authorization': `Bearer ${token}` }
  });
}

// ─── Cargar datos actuales ────────────────────────────────
async function loadPerfil() {
  try {
    const res  = await authFetch(`${API}/perfil`);
    const data = await res.json();
    if (!res.ok) { window.location.href = 'login.html'; return; }
    document.getElementById('p-username').value = data.username;
    document.getElementById('p-email').value    = data.email;
    emailOriginal = data.email;
  } catch {
    showMsg('msg-info', 'No se pudo cargar el perfil.', 'error');
  }
}

// ─── Guardar info (username directo, email con confirmación) ──
async function handleInfo(e) {
  e.preventDefault();
  clearMsg('msg-info');

  const username = document.getElementById('p-username').value.trim();
  const email    = document.getElementById('p-email').value.trim();
  const btn      = document.getElementById('btn-info');

  const emailCambiado = email && email !== emailOriginal;

  // Si el email cambió, solicitar confirmación
  if (emailCambiado) {
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      const res  = await authFetch(`${API}/perfil/solicitar-cambio`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'email', email })
      });
      const data = await res.json();
      if (res.ok) {
        // Guardar el username aparte si también cambió
        if (username) await guardarUsername(username);
        showMsg('msg-info', data.message, 'success');
        document.getElementById('panel-confirm-email').style.display = 'block';
        document.getElementById('code-email').focus();
      } else {
        showMsg('msg-info', data.error || 'Error al enviar el código', 'error');
      }
    } catch {
      showMsg('msg-info', 'No se pudo conectar con el servidor.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Guardar cambios';
    }
    return;
  }

  // Solo cambió el username: guardar directamente
  if (username) {
    btn.disabled = true; btn.textContent = 'Guardando...';
    await guardarUsername(username);
    btn.disabled = false; btn.textContent = 'Guardar cambios';
  }
}

async function guardarUsername(username) {
  try {
    const res  = await authFetch(`${API}/perfil`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (res.ok) {
      showMsg('msg-info', data.message, 'success');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.username = username;
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      showMsg('msg-info', data.error || 'Error al guardar', 'error');
    }
  } catch {
    showMsg('msg-info', 'No se pudo conectar con el servidor.', 'error');
  }
}

// ─── Cambiar contraseña (siempre con confirmación) ────────
async function handlePass(e) {
  e.preventDefault();
  clearMsg('msg-pass');

  const btn     = document.getElementById('btn-pass');
  const newPass = document.getElementById('p-new').value;
  const confirm = document.getElementById('p-confirm').value;

  if (newPass !== confirm) {
    showMsg('msg-pass', 'Las contraseñas no coinciden.', 'error');
    return;
  }

  btn.disabled = true; btn.textContent = 'Enviando...';

  try {
    const res  = await authFetch(`${API}/perfil/solicitar-cambio`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo:            'password',
        currentPassword: document.getElementById('p-current').value,
        newPassword:     newPass
      })
    });
    const data = await res.json();

    if (res.ok) {
      showMsg('msg-pass', data.message, 'success');
      document.getElementById('panel-confirm-password').style.display = 'block';
      document.getElementById('code-password').focus();
    } else {
      showMsg('msg-pass', data.error || 'Error al enviar el código', 'error');
    }
  } catch {
    showMsg('msg-pass', 'No se pudo conectar con el servidor.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Cambiar contraseña';
  }
}

// ─── Confirmar cambio con código ─────────────────────────
async function confirmarCambio(tipo) {
  const msgId  = `msg-confirm-${tipo}`;
  const codigo = document.getElementById(`code-${tipo}`).value.trim();

  if (codigo.length !== 6) {
    showMsg(msgId, 'El código debe tener 6 dígitos.', 'error');
    return;
  }

  try {
    const res  = await authFetch(`${API}/perfil/confirmar-cambio`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, codigo })
    });
    const data = await res.json();

    if (res.ok) {
      showMsg(msgId, data.message, 'success');
      // Ocultar el panel después de 2 segundos
      setTimeout(() => {
        cancelarConfirmacion(tipo);
        if (tipo === 'password') {
          document.getElementById('form-pass').reset();
        } else {
          // Actualizar el email original mostrado
          emailOriginal = document.getElementById('p-email').value.trim();
        }
      }, 2000);
    } else {
      showMsg(msgId, data.error || 'Código incorrecto', 'error');
    }
  } catch {
    showMsg(msgId, 'No se pudo conectar con el servidor.', 'error');
  }
}

// ─── Cancelar confirmación ────────────────────────────────
function cancelarConfirmacion(tipo) {
  document.getElementById(`panel-confirm-${tipo}`).style.display = 'none';
  document.getElementById(`code-${tipo}`).value = '';
  clearMsg(`msg-confirm-${tipo}`);
  // Restaurar email original en el campo si se cancela
  if (tipo === 'email') {
    document.getElementById('p-email').value = emailOriginal;
  }
}

loadPerfil();
