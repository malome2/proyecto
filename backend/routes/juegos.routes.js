const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');
const { verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// --- Límites de tamaño por tipo de archivo ---
const MAX_SIZES = {
    imagen: 5  * 1024 * 1024,  // 5 MB
    musica: 20 * 1024 * 1024,  // 20 MB
    video:  200 * 1024 * 1024, // 200 MB
};

const ALLOWED_MIME = {
    imagen: 'image/',
    musica: 'audio/',
    video:  'video/',
};

// --- Multer — guarda todo en disco temporalmente ---
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

const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ALLOWED_MIME[file.fieldname];
        if (!allowed || !file.mimetype.startsWith(allowed)) {
            return cb(new Error(`Tipo de archivo no permitido para "${file.fieldname}"`));
        }
        cb(null, true);
    }
});

const uploadFields = upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'musica', maxCount: 1 },
    { name: 'video',  maxCount: 1 }
]);

function runUpload(req, res) {
    return new Promise((resolve, reject) => {
        uploadFields(req, res, err => err ? reject(err) : resolve());
    });
}

function checkFileSizes(files) {
    for (const [field, max] of Object.entries(MAX_SIZES)) {
        const file = files?.[field]?.[0];
        if (file && file.size > max) {
            deleteLocalFile(file.path);
            return `El archivo de ${field} supera el tamaño máximo (${max / 1024 / 1024} MB)`;
        }
    }
    return null;
}

// --- Helpers de archivos ---

// Borra un archivo local (ignora URLs externas)
function deleteLocalFile(filePath) {
    if (!filePath || filePath.startsWith('http')) return;
    try { fs.unlinkSync(filePath); } catch { /* ya no existe */ }
}

// Sube una imagen al disco temporal a Cloudinary y borra el archivo local
async function uploadToCloudinary(localPath) {
    const result = await cloudinary.uploader.upload(localPath, {
        folder: 'museo-videojuegos'
    });
    deleteLocalFile(localPath);
    return result.secure_url;
}

// Borra una imagen de Cloudinary a partir de su URL
async function deleteCloudinaryImage(url) {
    if (!url?.startsWith('https://res.cloudinary.com')) return;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    if (match) await cloudinary.uploader.destroy(match[1]).catch(() => {});
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
// ---------------------------------------------------------------------------
router.post('/', verifyAdmin, async (req, res) => {
    try {
        await runUpload(req, res);
    } catch (err) {
        Object.values(req.files || {}).flat().forEach(f => deleteLocalFile(f.path));
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? 'Archivo demasiado grande (máximo 200 MB)'
            : (err.message || 'Error al subir el archivo');
        return res.status(400).json({ error: msg });
    }

    const sizeError = checkFileSizes(req.files);
    if (sizeError) return res.status(400).json({ error: sizeError });

    const { titulo, descripcion, pos_x, pos_y, video_url } = req.body;
    if (!titulo) return res.status(400).json({ error: 'El título es obligatorio' });

    try {
        // Imagen → Cloudinary; música y vídeo → disco local
        let imagen = null;
        if (req.files?.imagen?.[0]) {
            imagen = await uploadToCloudinary(req.files.imagen[0].path);
        }
        const musica_url = req.files?.musica?.[0]?.path.replace(/\\/g, '/') || null;
        const video      = req.files?.video?.[0]?.path.replace(/\\/g, '/')  || video_url || null;

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
// ---------------------------------------------------------------------------
router.put('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await runUpload(req, res);
    } catch (err) {
        Object.values(req.files || {}).flat().forEach(f => deleteLocalFile(f.path));
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? 'Archivo demasiado grande (máximo 200 MB)'
            : (err.message || 'Error al subir el archivo');
        return res.status(400).json({ error: msg });
    }

    const sizeError = checkFileSizes(req.files);
    if (sizeError) return res.status(400).json({ error: sizeError });

    try {
        const [rows] = await db.query('SELECT * FROM juegos WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Juego no encontrado' });

        const juego = rows[0];
        const { titulo, descripcion, pos_x, pos_y, video_url } = req.body;

        let imagen     = juego.imagen;
        let musica_url = juego.musica_url;
        let video      = juego.video_url;

        if (req.files?.imagen) {
            await deleteCloudinaryImage(juego.imagen); // borra la antigua de Cloudinary
            imagen = await uploadToCloudinary(req.files.imagen[0].path);
        }
        if (req.files?.musica) {
            deleteLocalFile(juego.musica_url);
            musica_url = req.files.musica[0].path.replace(/\\/g, '/');
        }
        if (req.files?.video) {
            deleteLocalFile(juego.video_url);
            video = req.files.video[0].path.replace(/\\/g, '/');
        } else if (video_url !== undefined) {
            deleteLocalFile(juego.video_url);
            video = video_url;
        }

        await db.query(
            `UPDATE juegos
             SET titulo=?, descripcion=?, imagen=?, video_url=?, musica_url=?, pos_x=?, pos_y=?
             WHERE id=?`,
            [
                titulo      ?? juego.titulo,
                descripcion ?? juego.descripcion,
                imagen,
                video,
                musica_url,
                pos_x       ?? juego.pos_x,
                pos_y       ?? juego.pos_y,
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
// ---------------------------------------------------------------------------
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM juegos WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Juego no encontrado' });

        const juego = rows[0];
        await deleteCloudinaryImage(juego.imagen); // borra de Cloudinary
        deleteLocalFile(juego.musica_url);
        deleteLocalFile(juego.video_url);

        await db.query('DELETE FROM juegos WHERE id = ?', [req.params.id]);
        res.json({ message: 'Juego eliminado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
