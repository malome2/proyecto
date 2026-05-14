const express = require('express');
const jwt     = require('jsonwebtoken');
const Stripe  = require('stripe');
const db      = require('../config/db');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const stripe = Stripe(process.env.SK_TEST);

const TIER_ORDER = ['none', 'visitante', 'coleccionista', 'arcade'];

function tierFromAmount(amount) {
    if (amount >= 25) return 'arcade';
    if (amount >= 10) return 'coleccionista';
    return 'visitante';
}

// Extrae el usuario del token si está presente, sin bloquear si no lo está
function optionalAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (header) {
        try {
            req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        } catch {}
    }
    next();
}

// ---------------------------------------------------------------------------
// POST /api/pagos/crear-sesion
// Body: { amount }   Header: Authorization (opcional)
// ---------------------------------------------------------------------------
router.post('/crear-sesion', writeLimiter, optionalAuth, async (req, res) => {
    const parsed = parseInt(req.body.amount, 10);

    if (!parsed || parsed < 1 || parsed > 10000) {
        return res.status(400).json({ error: 'Cantidad invalida' });
    }

    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5500/frontend';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: 'Donacion — Virtual VideoGame Museum',
                    },
                    unit_amount: parsed * 100,
                },
                quantity: 1,
            }],
            mode: 'payment',
            metadata: { usuario_id: req.user ? String(req.user.id) : '' },
            success_url: `${frontendUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&amount=${parsed}`,
            cancel_url:  `${frontendUrl}/support.html`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear la sesion de pago' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/pagos/confirmar
// Body: { sessionId }   Header: Authorization (opcional)
// Verifica el pago con Stripe y asigna el tier al usuario si está logueado
// ---------------------------------------------------------------------------
router.post('/confirmar', writeLimiter, optionalAuth, async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Falta el ID de sesion' });

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'El pago no se ha completado' });
        }

        // Evitar registrar el mismo pago dos veces
        const [existing] = await db.query(
            'SELECT id, tier FROM donaciones WHERE stripe_session_id = ?',
            [sessionId]
        );
        if (existing.length > 0) {
            return res.json({ message: 'Donacion ya registrada', tier: existing[0].tier });
        }

        const amount = Math.round(session.amount_total / 100);
        const tier   = tierFromAmount(amount);

        // Usar el usuario_id de los metadatos de Stripe o del token actual
        const metaId  = session.metadata?.usuario_id;
        const userId  = req.user?.id || (metaId ? parseInt(metaId, 10) : null) || null;

        await db.query(
            'INSERT INTO donaciones (usuario_id, stripe_session_id, amount, tier) VALUES (?, ?, ?, ?)',
            [userId, sessionId, amount, tier]
        );

        // Actualizar donor_tier del usuario (solo se sube, nunca se baja)
        if (userId) {
            const [userRows] = await db.query('SELECT donor_tier FROM usuarios WHERE id = ?', [userId]);
            const currentTier = userRows[0]?.donor_tier || 'none';
            if (TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(currentTier)) {
                await db.query('UPDATE usuarios SET donor_tier = ? WHERE id = ?', [tier, userId]);
            }
        }

        res.json({ message: 'Donacion registrada', tier, amount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al verificar el pago' });
    }
});

module.exports = router;
