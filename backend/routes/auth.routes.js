const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authLimiter } = require('../middleware/rateLimiter');
const { sendVerificationEmail } = require('../config/mailer');

const router = express.Router();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({
            error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número'
        });
    }

    try {
        const [existing] = await db.query('SELECT id, email_verified FROM usuarios WHERE email = ?', [email]);

        if (existing.length > 0) {
            if (existing[0].email_verified) {
                return res.status(409).json({ error: 'El email ya está registrado' });
            }
            // Cuenta no verificada — reenviar nuevo código
            const code    = generateCode();
            const expires = Date.now() + 15 * 60 * 1000;
            await db.query('UPDATE usuarios SET verification_token = ? WHERE email = ?', [`${code}|${expires}`, email]);
            await sendVerificationEmail(email, code, username);
            return res.status(200).json({ message: 'Te hemos reenviado un nuevo código de verificación.' });
        }

        const hash    = await bcrypt.hash(password, 10);
        const code    = generateCode();
        const expires = Date.now() + 15 * 60 * 1000;

        await db.query(
            'INSERT INTO usuarios (username, email, password, email_verified, verification_token) VALUES (?, ?, ?, 0, ?)',
            [username, email, hash, `${code}|${expires}`]
        );

        await sendVerificationEmail(email, code, username);

        res.status(201).json({ message: 'Cuenta creada. Revisa tu correo para introducir el código.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// POST /api/auth/reenviar
router.post('/reenviar', authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    try {
        const [rows] = await db.query(
            'SELECT username FROM usuarios WHERE email = ? AND email_verified = 0',
            [email]
        );
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Cuenta no encontrada o ya verificada' });
        }

        const code    = generateCode();
        const expires = Date.now() + 15 * 60 * 1000;
        await db.query('UPDATE usuarios SET verification_token = ? WHERE email = ?', [`${code}|${expires}`, email]);
        await sendVerificationEmail(email, code, rows[0].username);

        res.json({ message: 'Código reenviado correctamente.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// POST /api/auth/verificar
router.post('/verificar', authLimiter, async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email y código son obligatorios' });
    }

    try {
        const [rows] = await db.query(
            'SELECT id, verification_token FROM usuarios WHERE email = ? AND email_verified = 0',
            [email]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Cuenta no encontrada o ya verificada' });
        }

        const stored = rows[0].verification_token || '';
        const [storedCode, expiresStr] = stored.split('|');

        if (code !== storedCode) {
            return res.status(400).json({ error: 'Código incorrecto' });
        }

        if (Date.now() > parseInt(expiresStr, 10)) {
            return res.status(400).json({ error: 'El código ha expirado. Vuelve a registrarte para recibir uno nuevo.' });
        }

        await db.query(
            'UPDATE usuarios SET email_verified = 1, verification_token = NULL WHERE id = ?',
            [rows[0].id]
        );

        res.json({ message: 'Cuenta verificada. Ya puedes iniciar sesión.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = rows[0];

        if (!user.email_verified) {
            return res.status(403).json({ error: 'Debes verificar tu correo antes de iniciar sesión' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
