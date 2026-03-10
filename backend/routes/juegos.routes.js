const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// --- Multer config ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

const uploadFields = upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'musica', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

// Elimina un archivo local del disco (ignora URLs externas)
function deleteFile(filePath) {
    if (!filePath || filePath.startsWith('http')) return;
    try { fs.unlinkSync(filePath); } catch { /* ya no existe, ignorar */ }
}

// ---------------------------------------------------------------------------
// GET /api/juegos — todos los juegos (público)
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM juegos ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/juegos/:id — un juego por ID (público)
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM juegos WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Juego no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/juegos — crear juego (solo ADMIN)
// Body (multipart/form-data):
//   titulo* (texto), descripcion, pos_x, pos_y,
//   video_url (texto, URL externa) o video (archivo)
//   imagen (archivo), musica (archivo)
// ---------------------------------------------------------------------------
router.post('/', verifyAdmin, uploadFields, async (req, res) => {
    const { titulo, descripcion, pos_x, pos_y, video_url } = req.body;

    if (!titulo) return res.status(400).json({ error: 'El título es obligatorio' });

    const imagen     = req.files?.imagen?.[0]?.path.replace(/\\/g, '/') || null;
    const musica_url = req.files?.musica?.[0]?.path.replace(/\\/g, '/') || null;
    const video      = req.files?.video?.[0]?.path.replace(/\\/g, '/')  || video_url || null;

    try {
        const [result] = await db.query(
            `INSERT INTO juegos (titulo, descripcion, imagen, video_url, musica_url, pos_x, pos_y, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [titulo, descripcion || null, imagen, video, musica_url,
             pos_x || null, pos_y || null, req.user.id]
        );
        res.status(201).json({ id: result.insertId, message: 'Juego creado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// PUT /api/juegos/:id — editar juego (solo ADMIN)
// Solo se actualizan los campos que lleguen en la petición.
// Si se sube un archivo nuevo, el anterior se borra del disco.
// ---------------------------------------------------------------------------
router.put('/:id', verifyAdmin, uploadFields, async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query('SELECT * FROM juegos WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Juego no encontrado' });

        const juego = rows[0];
        const { titulo, descripcion, pos_x, pos_y, video_url } = req.body;

        // Archivos: si llega uno nuevo, usar ese y borrar el anterior
        let imagen     = juego.imagen;
        let musica_url = juego.musica_url;
        let video      = juego.video_url;

        if (req.files?.imagen) {
            deleteFile(juego.imagen);
            imagen = req.files.imagen[0].path.replace(/\\/g, '/');
        }
        if (req.files?.musica) {
            deleteFile(juego.musica_url);
            musica_url = req.files.musica[0].path.replace(/\\/g, '/');
        }
        if (req.files?.video) {
            deleteFile(juego.video_url);
            video = req.files.video[0].path.replace(/\\/g, '/');
        } else if (video_url !== undefined) {
            // Admin cambió la URL externa sin subir archivo
            deleteFile(juego.video_url);
            video = video_url;
        }

        await db.query(
            `UPDATE juegos
             SET titulo=?, descripcion=?, imagen=?, video_url=?, musica_url=?, pos_x=?, pos_y=?
             WHERE id=?`,
            [
                titulo       ?? juego.titulo,
                descripcion  ?? juego.descripcion,
                imagen,
                video,
                musica_url,
                pos_x        ?? juego.pos_x,
                pos_y        ?? juego.pos_y,
                id
            ]
        );

        res.json({ message: 'Juego actualizado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/juegos/:id — eliminar juego (solo ADMIN)
// Borra también los archivos locales asociados.
// ---------------------------------------------------------------------------
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM juegos WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Juego no encontrado' });

        const juego = rows[0];
        deleteFile(juego.imagen);
        deleteFile(juego.musica_url);
        deleteFile(juego.video_url);

        await db.query('DELETE FROM juegos WHERE id = ?', [req.params.id]);
        res.json({ message: 'Juego eliminado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
