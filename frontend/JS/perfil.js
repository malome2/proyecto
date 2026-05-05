const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

const API = `${API_BASE}/api/usuarios`;

renderNav('perfil');

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className   = 'msg ' + type;
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
  } catch {
    showMsg('msg-info', 'No se pudo cargar el perfil.', 'error');
  }
}

// ─── Guardar info ─────────────────────────────────────────
async function handleInfo(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-info');
  btn.disabled = true; btn.textContent = 'Guardando...';

  try {
    const res  = await authFetch(`${API}/perfil`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('p-username').value,
        email:    document.getElementById('p-email').value
      })
    });
    const data = await res.json();

    if (res.ok) {
      showMsg('msg-info', data.message, 'success');
      // Actualiza el nombre en localStorage para que el nav lo refleje
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.username = document.getElementById('p-username').value;
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      showMsg('msg-info', data.error || 'Error al guardar', 'error');
    }
  } catch {
    showMsg('msg-info', 'No se pudo conectar con el servidor.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar cambios';
  }
}

// ─── Cambiar contraseña ───────────────────────────────────
async function handlePass(e) {
  e.preventDefault();
  const btn     = document.getElementById('btn-pass');
  const newPass = document.getElementById('p-new').value;
  const confirm = document.getElementById('p-confirm').value;

  if (newPass !== confirm) {
    showMsg('msg-pass', 'Las contraseñas no coinciden.', 'error');
    return;
  }

  btn.disabled = true; btn.textContent = 'Cambiando...';

  try {
    const res  = await authFetch(`${API}/perfil`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: document.getElementById('p-current').value,
        newPassword:     newPass
      })
    });
    const data = await res.json();

    if (res.ok) {
      showMsg('msg-pass', data.message, 'success');
      document.getElementById('form-pass').reset();
    } else {
      showMsg('msg-pass', data.error || 'Error al cambiar la contraseña', 'error');
    }
  } catch {
    showMsg('msg-pass', 'No se pudo conectar con el servidor.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Cambiar contraseña';
  }
}

loadPerfil();
