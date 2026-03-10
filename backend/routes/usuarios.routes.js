const express = require('express');
const db = require('../config/db');
const { verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/usuarios — listar todos los usuarios (solo ADMIN)
// No devuelve el campo password por seguridad.
// ---------------------------------------------------------------------------
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, username, email, role FROM usuarios ORDER BY id ASC'
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
