const API = `${API_BASE}/api`;
const token = localStorage.getItem('token');

renderNav('index');

// ─── Stats ──────────────────────────────────────────────
async function loadStats() {
  try {
    const res    = await fetch(`${API}/juegos`);
    const juegos = await res.json();
    document.getElementById('stat-juegos').textContent = juegos.length;
  } catch { /* silent */ }
}

loadStats();

// ─── Login notice ────────────────────────────────────────
if (!token) {
  document.getElementById('login-notice').style.display = 'flex';
}

// ─── Recommendation form ─────────────────────────────────
function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent  = text;
  el.className    = 'msg ' + type;
}

async function handleRecomendacion(e) {
  e.preventDefault();

  if (!token) {
    showMsg('msg-recomendar', 'Debes iniciar sesión para enviar una recomendación.', 'error');
    return;
  }

  const btn = document.getElementById('btn-recomendar');
  btn.disabled    = true;
  btn.textContent = 'Enviando...';

  try {
    const res = await fetch(`${API}/recomendaciones`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        titulo:      document.getElementById('rec-titulo').value,
        descripcion: document.getElementById('rec-desc').value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showMsg('msg-recomendar', data.error || 'Error al enviar', 'error');
    } else {
      showMsg('msg-recomendar', '¡Recomendación enviada! La revisaremos pronto.', 'success');
      document.getElementById('form-recomendar').reset();
    }
  } catch {
    showMsg('msg-recomendar', 'No se pudo conectar con el servidor.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Enviar recomendación';
  }
}
