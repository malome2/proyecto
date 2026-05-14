const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { sendConfirmacionCambio } = require('../config/mailer');

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
// PUT /api/usuarios/perfil — editar perfil propio (solo username, sin confirmación)
// Body: { username }
// ---------------------------------------------------------------------------
router.put('/perfil', writeLimiter, verifyToken, async (req, res) => {
    const { username } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (username) {
            await db.query('UPDATE usuarios SET username = ? WHERE id = ?', [username, req.user.id]);
        }

        res.json({ message: 'Perfil actualizado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/usuarios/perfil/solicitar-cambio
// Genera código y envía email de confirmación para cambio de email o contraseña
// Body: { tipo: 'email'|'password', email?, currentPassword?, newPassword? }
// ---------------------------------------------------------------------------
router.post('/perfil/solicitar-cambio', writeLimiter, verifyToken, async (req, res) => {
    const { tipo, email, currentPassword, newPassword } = req.body;

    if (!['email', 'password'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de cambio inválido' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        const user = rows[0];

        let nuevoHash  = null;
        let nuevoEmail = null;

        if (tipo === 'password') {
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Faltan datos para cambiar la contraseña' });
            }
            const valid = await bcrypt.compare(currentPassword, user.password);
            if (!valid) return res.status(401).json({ error: 'La contraseña actual no es correcta' });
            if (!PASSWORD_REGEX.test(newPassword)) {
                return res.status(400).json({
                    error: 'La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número'
                });
            }
            nuevoHash = await bcrypt.hash(newPassword, 10);
        } else {
            if (!email) return res.status(400).json({ error: 'Falta el nuevo correo' });
            if (email === user.email) return res.status(400).json({ error: 'El nuevo correo es igual al actual' });
            const [dup] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, user.id]);
            if (dup.length > 0) return res.status(409).json({ error: 'Ese email ya está en uso' });
            nuevoEmail = email;
        }

        const codigo    = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            'DELETE FROM cambios_pendientes WHERE usuario_id = ? AND tipo = ?',
            [user.id, tipo]
        );
        await db.query(
            'INSERT INTO cambios_pendientes (usuario_id, tipo, nuevo_email, nuevo_hash, codigo, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
            [user.id, tipo, nuevoEmail, nuevoHash, codigo, expiresAt]
        );

        await sendConfirmacionCambio(user.email, codigo, user.username, tipo);

        res.json({ message: 'Código enviado a tu correo actual' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/usuarios/perfil/confirmar-cambio
// Verifica el código y aplica el cambio de email o contraseña
// Body: { tipo: 'email'|'password', codigo: '123456' }
// ---------------------------------------------------------------------------
router.post('/perfil/confirmar-cambio', writeLimiter, verifyToken, async (req, res) => {
    const { tipo, codigo } = req.body;

    if (!tipo || !codigo) return res.status(400).json({ error: 'Faltan datos' });

    try {
        const [rows] = await db.query(
            `SELECT * FROM cambios_pendientes
             WHERE usuario_id = ? AND tipo = ? AND used = 0 AND expires_at > NOW()
             ORDER BY id DESC LIMIT 1`,
            [req.user.id, tipo]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'No hay ningún cambio pendiente o el código ha expirado' });
        }

        const cambio = rows[0];
        if (String(cambio.codigo) !== String(codigo)) {
            return res.status(400).json({ error: 'Código incorrecto' });
        }

        if (tipo === 'password') {
            await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [cambio.nuevo_hash, req.user.id]);
        } else {
            await db.query('UPDATE usuarios SET email = ? WHERE id = ?', [cambio.nuevo_email, req.user.id]);
        }

        await db.query('UPDATE cambios_pendientes SET used = 1 WHERE id = ?', [cambio.id]);

        const msg = tipo === 'password' ? 'Contraseña actualizada correctamente' : 'Correo actualizado correctamente';
        res.json({ message: msg });
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
