const express = require('express');
const db = require('../config/db');
const { verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/usuarios — listar todos los usuarios (solo ADMIN)
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
// El super admin (SUPER_ADMIN_EMAIL) no puede ser modificado por nadie.
// Un admin no puede quitarse su propio rol.
// ---------------------------------------------------------------------------
router.put('/:id/role', verifyAdmin, async (req, res) => {
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido. Usa USER o ADMIN' });
    }

    try {
        const [rows] = await db.query('SELECT id, email FROM usuarios WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        const target = rows[0];

        if (process.env.SUPER_ADMIN_EMAIL && target.email === process.env.SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ error: 'No se puede modificar el rol de este usuario' });
        }

        if (req.user.id === target.id && role !== 'ADMIN') {
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
// El super admin no puede ser eliminado por nadie.
// Un admin no puede eliminarse a sí mismo.
// ---------------------------------------------------------------------------
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, email FROM usuarios WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        const target = rows[0];

        if (process.env.SUPER_ADMIN_EMAIL && target.email === process.env.SUPER_ADMIN_EMAIL) {
            return res.status(403).json({ error: 'No se puede eliminar este usuario' });
        }

        if (req.user.id === target.id) {
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
