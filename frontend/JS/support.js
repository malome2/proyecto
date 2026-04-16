renderNav('support');

// ─── Amount selection ────────────────────────────────────
function selectTier(amount) {
  document.getElementById('donate-amount').value = amount;
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
}

function selectAmount(amount) {
  document.getElementById('donate-amount').value = amount;
  document.querySelectorAll('.amount-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.textContent) === amount);
  });
}

// ─── Donate handler ──────────────────────────────────────
function showMsg(id, text, type) {
  const el    = document.getElementById(id);
  el.textContent = text;
  el.className   = 'msg ' + type;
}

function handleDonate() {
  const amount = document.getElementById('donate-amount').value;
  if (!amount || amount < 1) {
    showMsg('msg-donate', 'Introduce una cantidad válida.', 'error');
    return;
  }
  // Placeholder: aquí se integraría PayPal / Stripe
  showMsg('msg-donate',
    `¡Gracias por tu donación de ${amount}€! La integración de pagos estará disponible próximamente.`,
    'success'
  );
}
