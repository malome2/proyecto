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

// ---------------------------------------------------------------------------
// PUT /api/usuarios/:id/role — cambiar rol de usuario (solo ADMIN)
// Body: { role: 'USER' | 'ADMIN' }
// ---------------------------------------------------------------------------
router.put('/:id/role', verifyAdmin, async (req, res) => {
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido. Usa USER o ADMIN' });
    }

    try {
        const [rows] = await db.query('SELECT id FROM usuarios WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Evitar que el admin se quite su propio rol
        if (req.user.id === parseInt(req.params.id) && role !== 'ADMIN') {
            return res.status(400).json({ error: 'No puedes quitarte el rol de administrador' });
        }

        await db.query('UPDATE usuarios SET role = ? WHERE id = ?', [role, req.params.id]);
        res.json({ message: 'Rol actualizado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/usuarios/:id — eliminar usuario (solo ADMIN)
// ---------------------------------------------------------------------------
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id FROM usuarios WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (req.user.id === parseInt(req.params.id)) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
        }

        await db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
