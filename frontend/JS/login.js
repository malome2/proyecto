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
  document.getElementById('form-verify').style.display   = 'none';
  document.getElementById('form-recover').style.display  = 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

// ─── Helpers ─────────────────────────────────────────────
function showMsg(id, text, type) {
  const el    = document.getElementById(id);
  el.textContent = text;
  el.className   = 'msg ' + type;
}

function validatePassword(password) {
  if (password.length < 8)          return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(password))      return 'La contraseña debe incluir al menos una mayúscula';
  if (!/[a-z]/.test(password))      return 'La contraseña debe incluir al menos una minúscula';
  if (!/\d/.test(password))         return 'La contraseña debe incluir al menos un número';
  return null;
}

// ─── Code boxes logic ────────────────────────────────────
function initCodeBoxes() {
  const boxes = Array.from(document.querySelectorAll('.code-box'));

  boxes.forEach((box, i) => {
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (box.value) {
          box.value = '';
          box.classList.remove('filled');
        } else if (i > 0) {
          boxes[i - 1].focus();
          boxes[i - 1].value = '';
          boxes[i - 1].classList.remove('filled');
        }
        e.preventDefault();
      }
    });

    box.addEventListener('input', () => {
      const val = box.value.replace(/\D/g, '');
      box.value = val ? val[0] : '';
      if (box.value) {
        box.classList.add('filled');
        if (i < boxes.length - 1) boxes[i + 1].focus();
      } else {
        box.classList.remove('filled');
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      boxes.forEach((b, j) => {
        b.value = pasted[j] || '';
        b.classList.toggle('filled', !!b.value);
      });
      const next = boxes.find(b => !b.value);
      (next || boxes[boxes.length - 1]).focus();
    });
  });
}

function getCode() {
  return Array.from(document.querySelectorAll('.code-box')).map(b => b.value).join('');
}

// ─── Show verify step ────────────────────────────────────
function showVerifyStep(email) {
  document.getElementById('form-register').style.display  = 'none';
  document.getElementById('form-login').style.display     = 'none';
  document.getElementById('form-verify').style.display    = 'block';
  document.getElementById('verify-email-display').textContent = email;
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('tab-register').classList.remove('active');
  initCodeBoxes();
  document.querySelector('.code-box').focus();
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

  const password = document.getElementById('reg-password').value;
  const passError = validatePassword(password);
  if (passError) {
    showMsg('msg-register', passError, 'error');
    return;
  }

  const email = document.getElementById('reg-email').value;
  btn.disabled = true; btn.textContent = 'Creando cuenta...';

  try {
    const res = await fetch(`${API}/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        username: document.getElementById('reg-username').value,
        email,
        password
      })
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg('msg-register', data.error || 'Error al registrarse', 'error');
    } else {
      sessionStorage.setItem('verify-email', email);
      showVerifyStep(email);
    }
  } catch {
    showMsg('msg-register', 'No se pudo conectar con el servidor', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Crear cuenta';
  }
}

// ─── Verify code ─────────────────────────────────────────
async function handleVerify() {
  const code  = getCode();
  const email = sessionStorage.getItem('verify-email');
  const btn   = document.getElementById('btn-verify');

  if (code.length < 6) {
    showMsg('msg-verify', 'Introduce los 6 dígitos del código', 'error');
    return;
  }

  btn.disabled = true; btn.textContent = 'Verificando...';

  try {
    const res = await fetch(`${API}/verificar`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, code })
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg('msg-verify', data.error || 'Código incorrecto', 'error');
      document.querySelectorAll('.code-box').forEach(b => {
        b.value = ''; b.classList.remove('filled');
      });
      document.querySelector('.code-box').focus();
    } else {
      showMsg('msg-verify', '✓ Cuenta verificada', 'success');
      sessionStorage.removeItem('verify-email');
      setTimeout(() => {
        switchTab('login');
        showMsg('msg-login', 'Cuenta verificada. Ya puedes iniciar sesión.', 'success');
        document.getElementById('login-email').value = email;
      }, 1000);
    }
  } catch {
    showMsg('msg-verify', 'No se pudo conectar con el servidor', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Verificar cuenta';
  }
}

// ─── Recover password ────────────────────────────────────
function showRecoverStep() {
  document.getElementById('form-login').style.display    = 'none';
  document.getElementById('form-register').style.display = 'none';
  document.getElementById('form-verify').style.display   = 'none';
  document.getElementById('form-recover').style.display  = 'block';
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('tab-register').classList.remove('active');
  document.getElementById('recover-email').focus();
}

async function handleRecuperar() {
  const email = document.getElementById('recover-email').value.trim();
  const btn   = document.getElementById('btn-recover');

  if (!email) {
    showMsg('msg-recover', 'Introduce tu email', 'error');
    return;
  }

  btn.disabled = true; btn.textContent = 'Enviando...';

  try {
    const res  = await fetch(`${API}/recuperar`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email })
    });
    const data = await res.json();

    if (res.ok) {
      showMsg('msg-recover', data.message, 'success');
      btn.style.display = 'none';
    } else {
      showMsg('msg-recover', data.error || 'Error al enviar el enlace', 'error');
    }
  } catch {
    showMsg('msg-recover', 'No se pudo conectar con el servidor', 'error');
  } finally {
    if (!btn.style.display || btn.style.display !== 'none') {
      btn.disabled = false; btn.textContent = 'Enviar enlace';
    }
  }
}

// ─── Resend code ─────────────────────────────────────────
async function handleResend() {
  const email = sessionStorage.getItem('verify-email');
  if (!email) return;

  try {
    const res  = await fetch(`${API}/reenviar`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email })
    });
    const data = await res.json();
    showMsg('msg-verify', res.ok ? 'Código reenviado. Revisa tu correo.' : (data.error || 'Error al reenviar'), res.ok ? 'success' : 'error');
  } catch {
    showMsg('msg-verify', 'No se pudo reenviar el código', 'error');
  }
}
