/**
 * nav.js — Shared navigation component
 * Call renderNav('pageName') after including this script.
 * Pages: 'index' | 'museo' | 'us' | 'support' | 'admin'
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderNav(activePage) {
  const user  = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  const links = [
    { id: 'index',   href: 'index.html',   label: 'Inicio'        },
    { id: 'museo',   href: 'museo.html',   label: 'Museo'         },
    { id: 'us',      href: 'us.html',      label: 'Quiénes somos' },
    { id: 'support', href: 'support.html', label: 'Apóyanos'      },
  ];

  const linksHtml = links.map(l =>
    `<a href="${l.href}" class="nav-link ${activePage === l.id ? 'active' : ''}">${l.label}</a>`
  ).join('');

  let actionsHtml;
  if (token && user) {
    const dashHref = user.role === 'ADMIN' ? 'admin.html' : 'museo.html';
    actionsHtml = `
      <a href="perfil.html" class="nav-user">
        <span class="nav-user-dot"></span>
        <span>${escapeHtml(user.username)}</span>
      </a>
      ${user.role === 'ADMIN' ? `<a href="${dashHref}" class="btn-nav">Panel admin</a>` : ''}
      <button class="btn-nav" onclick="logout()">Salir</button>
    `;
  } else {
    actionsHtml = `<a href="login.html" class="btn-nav primary">Iniciar sesión</a>`;
  }

  document.body.insertAdjacentHTML('afterbegin', `
    <nav class="nav">
      <a href="index.html" class="nav-brand">
        <div class="nav-brand-icon"><img src="img/logo.svg" alt="Logo" /></div>
        <div class="nav-brand-text">Virtual <span>Videogame Museum</span></div>
      </a>
      <div class="nav-links">${linksHtml}</div>
      <div class="nav-actions">${actionsHtml}</div>
    </nav>
  `);
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}
