const API = `${API_BASE}/api`;
const token = localStorage.getItem('token');

renderNav('index');

// ─── Stats + portadas ────────────────────────────────────
function buildCoverGrid(juegos) {
  const grid = document.getElementById('cover-grid');
  if (!grid) return;

  const conImg = juegos.filter(j => j.imagen);
  const SLOTS  = 12; // 3 col × 4 filas

  for (let i = 0; i < SLOTS; i++) {
    const div = document.createElement('div');
    div.className = 'cover-item';

    const juego = conImg[i % Math.max(conImg.length, 1)];
    if (juego && conImg.length > 0) {
      const img = document.createElement('img');
      img.src = juego.imagen.startsWith('http')
        ? juego.imagen
        : `${API_BASE}/${juego.imagen}`;
      img.alt = juego.titulo;
      div.appendChild(img);
    }

    grid.appendChild(div);
  }
}

async function loadStats() {
  try {
    const res    = await fetch(`${API}/juegos`);
    const juegos = await res.json();
    document.getElementById('stat-juegos').textContent = juegos.length;
    buildCoverGrid(juegos);
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
