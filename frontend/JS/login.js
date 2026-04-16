const API = `${API_BASE}/api/auth`;

// Redirect if already logged in
if (localStorage.getItem('token')) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  window.location.href = user.role === 'ADMIN' ? 'admin.html' : 'museo.html';
}

// ─── Tab switching ───────────────────────────────────────
function switchTab(tab) {
  document.getElementById('form-login').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

// ─── Helpers ─────────────────────────────────────────────
function showMsg(id, text, type) {
  const el    = document.getElementById(id);
  el.textContent = text;
  el.className   = 'msg ' + type;
}

// ─── Login ───────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = 'Entrando...';

  try {
    const res = await fetch(`${API}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email:    document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      })
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg('msg-login', data.error || 'Error al iniciar sesión', 'error');
    } else {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user',  JSON.stringify(data.user));
      showMsg('msg-login', '¡Bienvenido, ' + data.user.username + '!', 'success');
      setTimeout(() => {
        window.location.href = data.user.role === 'ADMIN' ? 'admin.html' : 'museo.html';
      }, 800);
    }
  } catch {
    showMsg('msg-login', 'No se pudo conectar con el servidor', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

// ─── Register ────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-register');
  btn.disabled = true; btn.textContent = 'Creando cuenta...';

  try {
    const res = await fetch(`${API}/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        username: document.getElementById('reg-username').value,
        email:    document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value
      })
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg('msg-register', data.error || 'Error al registrarse', 'error');
    } else {
      showMsg('msg-register', 'Cuenta creada. Ahora puedes iniciar sesión.', 'success');
      setTimeout(() => switchTab('login'), 1500);
    }
  } catch {
    showMsg('msg-register', 'No se pudo conectar con el servidor', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Crear cuenta';
  }
}
