const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'El email ya está registrado' });
        }

        const hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO usuarios (username, email, password) VALUES (?, ?, ?)',
            [username, email, hash]
        );

        res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
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
