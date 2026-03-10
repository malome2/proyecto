const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ error: 'Token inválido' });
    }
}

function verifyAdmin(req, res, next) {
    verifyToken(req, res, () => {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        next();
    });
}

module.exports = { verifyToken, verifyAdmin };
