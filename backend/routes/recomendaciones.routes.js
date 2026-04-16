const express = require('express');
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/recomendaciones — enviar recomendación (usuario autenticado)
// Body: { titulo, descripcion }
// ---------------------------------------------------------------------------
router.post('/', verifyToken, async (req, res) => {
    const { titulo, descripcion } = req.body;

    if (!titulo) return res.status(400).json({ error: 'El título es obligatorio' });

    try {
        const [result] = await db.query(
            'INSERT INTO recomendaciones (titulo, descripcion, usuario_id) VALUES (?, ?, ?)',
            [titulo, descripcion || null, req.user.id]
        );
        res.status(201).json({ id: result.insertId, message: 'Recomendación enviada correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/recomendaciones/mis — recomendaciones del usuario autenticado
// ---------------------------------------------------------------------------
router.get('/mis', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, titulo, descripcion, estado FROM recomendaciones WHERE usuario_id = ? ORDER BY id DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/recomendaciones — listar todas las recomendaciones (solo ADMIN)
// Devuelve también el username del usuario que la envió.
// ---------------------------------------------------------------------------
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT r.id, r.titulo, r.descripcion, r.estado, r.usuario_id,
                    u.username
             FROM recomendaciones r
             JOIN usuarios u ON u.id = r.usuario_id
             ORDER BY r.id DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// PUT /api/recomendaciones/:id — editar recomendación antes de aprobar (solo ADMIN)
// Body: { titulo?, descripcion? }
// ---------------------------------------------------------------------------
router.put('/:id', verifyAdmin, async (req, res) => {
    const { titulo, descripcion } = req.body;

    try {
        const [rows] = await db.query('SELECT id FROM recomendaciones WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Recomendación no encontrada' });

        await db.query(
            'UPDATE recomendaciones SET titulo = COALESCE(?, titulo), descripcion = COALESCE(?, descripcion) WHERE id = ?',
            [titulo || null, descripcion || null, req.params.id]
        );
        res.json({ message: 'Recomendación actualizada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// PUT /api/recomendaciones/:id/aprobar — aprobar recomendación (solo ADMIN)
// ---------------------------------------------------------------------------
router.put('/:id/aprobar', verifyAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id FROM recomendaciones WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Recomendación no encontrada' });

        await db.query("UPDATE recomendaciones SET estado = 'aprobado' WHERE id = ?", [req.params.id]);
        res.json({ message: 'Recomendación aprobada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/recomendaciones/:id — rechazar/eliminar recomendación (solo ADMIN)
// ---------------------------------------------------------------------------
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id FROM recomendaciones WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Recomendación no encontrada' });

        await db.query('DELETE FROM recomendaciones WHERE id = ?', [req.params.id]);
        res.json({ message: 'Recomendación eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
