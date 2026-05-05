const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/usuarios/perfil — datos del usuario autenticado
// ---------------------------------------------------------------------------
router.get('/perfil', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, username, email, role, email_verified FROM usuarios WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// PUT /api/usuarios/perfil — editar perfil propio
// Body: { username?, email?, currentPassword?, newPassword? }
// ---------------------------------------------------------------------------
router.put('/perfil', writeLimiter, verifyToken, async (req, res) => {
    const { username, email, currentPassword, newPassword } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        const user = rows[0];

        // Cambio de contraseña: requiere la contraseña actual
        let newHash = null;
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Introduce tu contraseña actual para cambiarla' });
            }
            const valid = await bcrypt.compare(currentPassword, user.password);
            if (!valid) {
                return res.status(401).json({ error: 'La contraseña actual no es correcta' });
            }
            if (!PASSWORD_REGEX.test(newPassword)) {
                return res.status(400).json({
                    error: 'La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número'
                });
            }
            newHash = await bcrypt.hash(newPassword, 10);
        }

        // Email: comprobar que no esté en uso por otro usuario
        if (email && email !== user.email) {
            const [dup] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, user.id]);
            if (dup.length > 0) return res.status(409).json({ error: 'Ese email ya está en uso' });
        }

        await db.query(
            `UPDATE usuarios SET
                username = COALESCE(?, username),
                email    = COALESCE(?, email),
                password = COALESCE(?, password)
             WHERE id = ?`,
            [username || null, email || null, newHash, user.id]
        );

        res.json({ message: 'Perfil actualizado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

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
