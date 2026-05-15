// ─── AUTH GUARD ───────────────────────────────────────────────────────────────
const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
const token       = localStorage.getItem('token');

if (!currentUser || currentUser.role !== 'ADMIN') {
  window.location.href = 'login.html';
}

const API = `${API_BASE}/api`;

renderNav('admin');

let pendingRecId = null;

// ─── UTILS ────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function authFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), 'Authorization': `Bearer ${token}` }
  });
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className   = 'msg ' + type;
}

function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}/${path}`;
}

function fileName(path) {
  return path ? path.split('/').pop() : '';
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('#main-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#main-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById(`panel-${tab}`).classList.add('active');
    if (tab === 'recomendaciones') loadRecs();
    if (tab === 'usuarios')        loadUsuarios();
  });
});

// ─── MODAL HELPERS ────────────────────────────────────────────────────────────

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); });
});

// ─── JUEGOS ───────────────────────────────────────────────────────────────────

let juegos = [];

async function loadJuegos() {
  const tbody = document.getElementById('tbody-juegos');
  try {
    const res = await fetch(`${API}/juegos`);
    juegos    = await res.json();
    renderJuegos();
  } catch {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Error al cargar los juegos.</td></tr>';
  }
}

function renderJuegos() {
  const tbody = document.getElementById('tbody-juegos');
  if (!juegos.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No hay juegos en el museo todavía.</td></tr>';
    return;
  }
  tbody.innerHTML = juegos.map(j => `
    <tr>
      <td>${j.imagen
        ? `<img class="thumb" src="${mediaUrl(j.imagen)}" alt="${escapeHtml(j.titulo)}" />`
        : '—'}</td>
      <td class="td-main">${escapeHtml(j.titulo)}</td>
      <td>${j.video_url ? '<span style="color:var(--success-text)">✓</span>' : '—'}</td>
      <td>${j.musica_url ? '<span style="color:var(--success-text)">✓</span>' : '—'}</td>
      <td>
        <div class="actions">
          <button class="btn-sm" onclick="openGameModal(${j.id})">Editar</button>
          <button class="btn-sm danger" onclick="deleteGame(${j.id})">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openGameModal(id = null) {
  pendingRecId = null;
  document.getElementById('form-juego').reset();
  document.getElementById('msg-juego').className = 'msg';
  document.getElementById('hint-imagen').textContent = '';
  document.getElementById('hint-musica').textContent = '';

  if (id !== null) {
    const j = juegos.find(g => g.id === id);
    if (!j) return;
    document.getElementById('modal-juego-title').textContent  = 'Editar juego';
    document.getElementById('juego-id').value                 = j.id;
    document.getElementById('juego-titulo').value             = j.titulo || '';
    document.getElementById('juego-descripcion').value        = j.descripcion || '';
    document.getElementById('juego-video-url').value         = j.video_url || '';
    if (j.imagen)     document.getElementById('hint-imagen').textContent  = 'Actual: ' + fileName(j.imagen);
    if (j.musica_url) document.getElementById('hint-musica').textContent  = 'Actual: ' + fileName(j.musica_url);
  } else {
    document.getElementById('modal-juego-title').textContent = 'Añadir juego';
    document.getElementById('juego-id').value                = '';
  }
  openModal('modal-juego');
}

async function saveGame(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-juego');
  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  const id     = document.getElementById('juego-id').value;
  const method = id ? 'PUT' : 'POST';
  const url    = id ? `${API}/juegos/${id}` : `${API}/juegos`;

  const fd = new FormData();
  fd.append('titulo',      document.getElementById('juego-titulo').value);
  fd.append('descripcion', document.getElementById('juego-descripcion').value);
fd.append('video_url',   document.getElementById('juego-video-url').value);

  const imgFile   = document.getElementById('juego-imagen').files[0];
  const musicFile = document.getElementById('juego-musica').files[0];
  if (imgFile)   fd.append('imagen', imgFile);
  if (musicFile) fd.append('musica', musicFile);

  try {
    const res  = await authFetch(url, { method, body: fd });
    const data = await res.json();
    if (!res.ok) {
      showMsg('msg-juego', data.error || 'Error al guardar', 'error');
    } else {
      closeModal('modal-juego');
      loadJuegos();
      if (pendingRecId) {
        await authFetch(`${API}/recomendaciones/${pendingRecId}`, { method: 'DELETE' });
        pendingRecId = null;
        loadRecs();
      }
    }
  } catch {
    showMsg('msg-juego', 'No se pudo conectar con el servidor.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Guardar';
  }
}

async function deleteGame(id) {
  if (!confirm('¿Eliminar este juego? Esta acción no se puede deshacer.')) return;
  try {
    const res = await authFetch(`${API}/juegos/${id}`, { method: 'DELETE' });
    if (res.ok) loadJuegos();
    else { const d = await res.json(); alert(d.error || 'Error al eliminar'); }
  } catch { alert('Error de conexión'); }
}

// ─── RECOMENDACIONES ──────────────────────────────────────────────────────────

let allRecs   = [];
let recFilter = 'pendiente';

async function loadRecs() {
  const tbody = document.getElementById('tbody-recs');
  try {
    const res = await authFetch(`${API}/recomendaciones`);
    allRecs   = await res.json();
    renderRecs();
  } catch {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Error al cargar las recomendaciones.</td></tr>';
  }
}

function filterRecs(estado, btn) {
  recFilter = estado;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRecs();
}

function renderRecs() {
  const tbody = document.getElementById('tbody-recs');
  const data  = recFilter ? allRecs.filter(r => r.estado === recFilter) : allRecs;

  if (!data.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No hay recomendaciones en esta categoría.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(r => {
    const tierBadge = (r.donor_tier === 'arcade' || r.donor_tier === 'coleccionista')
      ? '<span style="font-size:0.68rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#3d8fb5;background:rgba(61,143,181,0.1);border:1px solid rgba(61,143,181,0.25);border-radius:4px;padding:2px 6px;margin-left:6px">Prioridad</span>'
      : '';
    const garantizada = (r.primer_arcade && r.estado === 'pendiente')
      ? '<div style="font-size:0.72rem;color:#c8a84b;margin-top:3px;font-weight:600">Primer juego</div>'
      : '';
    return `
    <tr>
      <td class="td-main">${escapeHtml(r.titulo)}</td>
      <td>${escapeHtml(r.username)}${tierBadge}${garantizada}</td>
      <td class="td-trunc">${escapeHtml(r.descripcion) || '—'}</td>
      <td><span class="badge ${r.estado === 'aprobado' ? 'badge-approved' : 'badge-pending'}">${r.estado}</span></td>
      <td>
        <div class="actions">
          <button class="btn-sm" onclick="openRecModal(${r.id})">Editar</button>
          ${r.estado === 'pendiente'
            ? `<button class="btn-sm success" onclick="approveRec(${r.id})">Aprobar</button>`
            : `<button class="btn-sm success" onclick="openGameFromRec(${r.id})">Añadir al museo</button>`}
          <button class="btn-sm danger" onclick="deleteRec(${r.id})">Rechazar</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openRecModal(id) {
  const r = allRecs.find(x => x.id === id);
  if (!r) return;
  document.getElementById('rec-id').value      = r.id;
  document.getElementById('rec-titulo').value  = r.titulo;
  document.getElementById('rec-desc').value    = r.descripcion || '';
  document.getElementById('msg-rec').className = 'msg';
  openModal('modal-rec');
}

async function saveRec(e) {
  e.preventDefault();
  const id = document.getElementById('rec-id').value;
  try {
    const res = await authFetch(`${API}/recomendaciones/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo:      document.getElementById('rec-titulo').value,
        descripcion: document.getElementById('rec-desc').value
      })
    });
    const data = await res.json();
    if (!res.ok) showMsg('msg-rec', data.error || 'Error al guardar', 'error');
    else { closeModal('modal-rec'); loadRecs(); }
  } catch { showMsg('msg-rec', 'Error de conexión', 'error'); }
}

function openGameFromRec(id) {
  const r = allRecs.find(x => x.id === id);
  if (!r) return;
  openGameModal();
  pendingRecId = id;
  document.getElementById('juego-titulo').value      = r.titulo;
  document.getElementById('juego-descripcion').value = r.descripcion || '';
}

async function approveRec(id) {
  try {
    const res = await authFetch(`${API}/recomendaciones/${id}/aprobar`, { method: 'PUT' });
    if (res.ok) loadRecs();
    else { const d = await res.json(); alert(d.error || 'Error al aprobar'); }
  } catch { alert('Error de conexión'); }
}

async function deleteRec(id) {
  if (!confirm('¿Rechazar y eliminar esta recomendación?')) return;
  try {
    const res = await authFetch(`${API}/recomendaciones/${id}`, { method: 'DELETE' });
    if (res.ok) loadRecs();
    else { const d = await res.json(); alert(d.error || 'Error al eliminar'); }
  } catch { alert('Error de conexión'); }
}

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

let allUsuarios = [];

async function loadUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  try {
    const res   = await authFetch(`${API}/usuarios`);
    allUsuarios = await res.json();
    renderUsuarios();
  } catch {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Error al cargar los usuarios.</td></tr>';
  }
}

function renderUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  if (!allUsuarios.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No hay usuarios.</td></tr>';
    return;
  }

  tbody.innerHTML = allUsuarios.map(u => {
    const isMe = u.id === currentUser.id;

    return `
    <tr>
      <td class="td-main">
        ${escapeHtml(u.username)}
        ${isMe ? '<span style="font-size:0.7rem;color:var(--text-muted);margin-left:6px">(tú)</span>' : ''}
      </td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
      <td>
        <div class="actions">
          ${u.role === 'ADMIN'
            ? `<button class="btn-sm" onclick="changeRole(${u.id},'USER')" ${isMe ? 'disabled' : ''}>→ USER</button>`
            : `<button class="btn-sm success" onclick="changeRole(${u.id},'ADMIN')">→ ADMIN</button>`}
          <button class="btn-sm danger" onclick="deleteUsuario(${u.id})" ${isMe ? 'disabled' : ''}>Eliminar</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

async function changeRole(id, role) {
  try {
    const res = await authFetch(`${API}/usuarios/${id}/role`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Error al cambiar el rol');
    else loadUsuarios();
  } catch { alert('Error de conexión'); }
}

async function deleteUsuario(id) {
  if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
  try {
    const res = await authFetch(`${API}/usuarios/${id}`, { method: 'DELETE' });
    if (res.ok) loadUsuarios();
    else { const d = await res.json(); alert(d.error || 'Error al eliminar'); }
  } catch { alert('Error de conexión'); }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
loadJuegos();
