const fs   = require('fs');
const path = require('path');

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

const logoPath   = path.join(__dirname, '../../frontend/img/logo.svg');
const logoBase64 = fs.existsSync(logoPath)
  ? Buffer.from(fs.readFileSync(logoPath)).toString('base64')
  : '';
const logoSrc = logoBase64
  ? `data:image/svg+xml;base64,${logoBase64}`
  : '';

function parseSender() {
  const raw = process.env.SMTP_FROM || '';
  const m   = raw.match(/^(.*?)\s*<(.+?)>$/);
  return {
    name:  m ? m[1].trim() : 'Virtual VideoGame Museum',
    email: m ? m[2].trim() : (process.env.SMTP_USER || '')
  };
}

async function sendBrevo(to, subject, htmlContent) {
  const sender = parseSender();
  const res = await fetch(BREVO_API, {
    method:  'POST',
    headers: {
      'api-key':      process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${err}`);
  }
}

function codeDigits(code) {
  return code.split('').map(d =>
    `<span style="display:inline-block;width:44px;height:54px;line-height:54px;text-align:center;font-size:1.8rem;font-weight:700;color:#ffffff;background:#0d1b2e;border:1px solid rgba(61,143,181,0.45);border-radius:8px;margin:0 3px;font-family:'Courier New',monospace;">${d}</span>`
  ).join('');
}

function layout(headerLabel, bodyHtml) {
  const logo = logoSrc
    ? `<img src="${logoSrc}" alt="VGM Logo" width="72" height="72" style="display:inline-block;margin-bottom:18px;" />`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07070f;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:40px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;border-radius:16px;overflow:hidden;border:1px solid rgba(61,143,181,0.18);">
      <tr>
        <td style="background:linear-gradient(160deg,#0b1929 0%,#0e2240 100%);padding:44px 40px 36px;text-align:center;border-bottom:1px solid rgba(61,143,181,0.2);">
          ${logo}
          <h1 style="margin:0 0 6px;font-size:1.35rem;font-weight:700;color:#ffffff;letter-spacing:0.04em;">Virtual VideoGame Museum</h1>
          <p style="margin:0;font-size:0.72rem;color:#3d8fb5;letter-spacing:0.14em;text-transform:uppercase;">${headerLabel}</p>
        </td>
      </tr>
      <tr>
        <td style="background:#0a0a18;padding:44px 40px 36px;">${bodyHtml}</td>
      </tr>
      <tr>
        <td style="background:#060610;padding:22px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.04);">
          <p style="margin:0 0 6px;font-size:0.7rem;color:#2a2a42;">© 2025 Virtual VideoGame Museum</p>
          <p style="margin:0;font-size:0.68rem;color:#22223a;">Este es un mensaje automático — por favor no respondas a este correo.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

async function sendVerificationEmail(to, code, username = '') {
  const body = `
    <p style="margin:0 0 6px;font-size:1rem;color:#dcdcf0;font-weight:600;">Hola${username ? ', ' + username : ''}</p>
    <p style="margin:0 0 36px;font-size:0.88rem;color:#8888aa;line-height:1.7;">
      Gracias por registrarte en <strong style="color:#c8c8e8;">Virtual VideoGame Museum</strong>.
      Introduce el siguiente código para activar tu cuenta.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="background:#060614;border:1px solid rgba(61,143,181,0.25);border-radius:14px;padding:32px 24px;text-align:center;">
        <p style="margin:0 0 18px;font-size:0.7rem;color:#55556a;letter-spacing:0.14em;text-transform:uppercase;">Código de verificación</p>
        <div style="margin-bottom:18px;">${codeDigits(code)}</div>
        <p style="margin:0;font-size:0.75rem;color:#44445a;">Válido durante <strong style="color:#6a6a88;">15 minutos</strong></p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="border-left:3px solid rgba(61,143,181,0.5);padding:14px 18px;background:rgba(61,143,181,0.05);border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:0.82rem;color:#6a6a88;line-height:1.6;">Si no has creado una cuenta, puedes ignorar este correo.</p>
      </td></tr>
    </table>`;
  await sendBrevo(to, 'Tu código de verificación — Virtual VideoGame Museum', layout('Verificación de cuenta', body));
}

async function sendConfirmacionCambio(to, code, username = '', tipo = 'password') {
  const accion = tipo === 'password' ? 'cambiar tu contraseña' : 'cambiar tu correo electrónico';
  const asunto = tipo === 'password' ? 'Confirma el cambio de contraseña' : 'Confirma el cambio de correo';
  const body = `
    <p style="margin:0 0 6px;font-size:1rem;color:#dcdcf0;font-weight:600;">Hola${username ? ', ' + username : ''}</p>
    <p style="margin:0 0 36px;font-size:0.88rem;color:#8888aa;line-height:1.7;">
      Hemos recibido una solicitud para <strong style="color:#c8c8e8;">${accion}</strong> en tu cuenta.
      Usa el siguiente código para confirmar la acción.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="background:#060614;border:1px solid rgba(61,143,181,0.25);border-radius:14px;padding:32px 24px;text-align:center;">
        <p style="margin:0 0 18px;font-size:0.7rem;color:#55556a;letter-spacing:0.14em;text-transform:uppercase;">Código de confirmación</p>
        <div style="margin-bottom:18px;">${codeDigits(code)}</div>
        <p style="margin:0;font-size:0.75rem;color:#44445a;">Válido durante <strong style="color:#6a6a88;">15 minutos</strong></p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="border-left:3px solid rgba(224,92,110,0.5);padding:14px 18px;background:rgba(224,92,110,0.05);border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:0.82rem;color:#6a6a88;line-height:1.6;">Si no has solicitado este cambio, ignora este correo. Tu cuenta permanece segura.</p>
      </td></tr>
    </table>`;
  await sendBrevo(to, `${asunto} — Virtual VideoGame Museum`, layout('Confirmación de cambio', body));
}

async function sendPasswordResetEmail(to, resetUrl, username = '') {
  const body = `
    <p style="margin:0 0 6px;font-size:1rem;color:#dcdcf0;font-weight:600;">Hola${username ? ', ' + username : ''}</p>
    <p style="margin:0 0 32px;font-size:0.88rem;color:#8888aa;line-height:1.7;">
      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en
      <strong style="color:#c8c8e8;">Virtual VideoGame Museum</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td align="center">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background:#3d8fb5;color:#ffffff;font-size:0.9rem;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.05em;">
          Restablecer contraseña
        </a>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:0.78rem;color:#55556a;line-height:1.6;">O copia y pega este enlace en tu navegador:</p>
    <p style="margin:0 0 32px;font-size:0.75rem;color:#3d8fb5;word-break:break-all;line-height:1.5;">${resetUrl}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="border-left:3px solid rgba(224,92,110,0.5);padding:14px 18px;background:rgba(224,92,110,0.05);border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:0.82rem;color:#6a6a88;line-height:1.6;">
          Este enlace es válido durante <strong style="color:#8888aa;">1 hora</strong>.
          Si no solicitaste este cambio, ignora este correo.
        </p>
      </td></tr>
    </table>`;
  await sendBrevo(to, 'Recupera tu contraseña — Virtual VideoGame Museum', layout('Recuperación de contraseña', body));
}

module.exports = { sendVerificationEmail, sendConfirmacionCambio, sendPasswordResetEmail };
