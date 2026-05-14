renderNav('support');

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className   = 'msg ' + type;
}

// ─── Iniciar pago con Stripe Checkout ────────────────────
async function iniciarPago(amount) {
  const parsed = parseInt(amount, 10);
  if (!parsed || parsed < 1) {
    showMsg('msg-donate', 'Introduce una cantidad valida.', 'error');
    return;
  }

  showMsg('msg-donate', 'Redirigiendo al pago...', 'success');

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res  = await fetch(`${API_BASE}/api/pagos/crear-sesion`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ amount: parsed })
    });
    const data = await res.json();

    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      showMsg('msg-donate', data.error || 'Error al procesar el pago', 'error');
    }
  } catch {
    showMsg('msg-donate', 'No se pudo conectar con el servidor.', 'error');
  }
}

// ─── Botones de tier ─────────────────────────────────────
function selectTier(amount) {
  document.getElementById('donate-amount').value = amount;
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
  iniciarPago(amount);
}

// ─── Botones de cantidad rapida ──────────────────────────
function selectAmount(amount) {
  document.getElementById('donate-amount').value = amount;
  document.querySelectorAll('.amount-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.textContent) === amount);
  });
}

// ─── Boton Donar ahora (cantidad personalizada) ──────────
function handleDonate() {
  const amount = document.getElementById('donate-amount').value;
  iniciarPago(amount);
}
