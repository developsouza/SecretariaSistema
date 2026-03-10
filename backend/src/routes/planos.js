const router = require("express").Router();
const Stripe = require("stripe");
const { getDb } = require("../database/db");
const { authMiddleware, adminOnly } = require("../middlewares/auth");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.use(authMiddleware);

// ─── GET /api/planos ──────────────────────────────────────────────────────
router.get("/", (req, res, next) => {
    try {
        const db = getDb();
        const planos = db.prepare("SELECT * FROM planos WHERE ativo = 1 ORDER BY preco_mensal").all();
        planos.forEach((p) => {
            p.recursos = JSON.parse(p.recursos || "{}");
        });
        res.json(planos);
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/planos/assinatura ───────────────────────────────────────────
router.get("/assinatura", (req, res, next) => {
    try {
        const db = getDb();
        const igreja = db
            .prepare(
                `
      SELECT i.stripe_customer_id, i.stripe_subscription_id, i.stripe_status,
             i.plano_id, i.plano_periodo, i.plano_vencimento, i.trial_end,
             p.nome AS plano_nome, p.limite_membros, p.preco_mensal, p.preco_anual
      FROM igrejas i LEFT JOIN planos p ON p.id = i.plano_id
      WHERE i.id = ?
    `,
            )
            .get(req.igreja.id);
        res.json(igreja);
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/planos/checkout ────────────────────────────────────────────
router.post("/checkout", adminOnly, async (req, res, next) => {
    try {
        const { plano_id, periodo } = req.body;
        if (!["mensal", "anual"].includes(periodo)) return res.status(400).json({ error: "Período inválido" });

        const db = getDb();
        const plano = db.prepare("SELECT * FROM planos WHERE id = ? AND ativo = 1").get(plano_id);
        if (!plano) return res.status(404).json({ error: "Plano não encontrado" });

        const priceId = periodo === "anual" ? plano.stripe_price_id_anual : plano.stripe_price_id_mensal;
        if (!priceId) return res.status(400).json({ error: "Plano sem price_id Stripe configurado. Configure no painel Stripe." });

        const igreja = db.prepare("SELECT * FROM igrejas WHERE id = ?").get(req.igreja.id);
        let customerId = igreja.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({ email: igreja.email, name: igreja.nome, metadata: { igreja_id: req.igreja.id } });
            customerId = customer.id;
            db.prepare("UPDATE igrejas SET stripe_customer_id = ? WHERE id = ?").run(customerId, req.igreja.id);
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL}/dashboard/planos?success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard/planos?canceled=true`,
            metadata: { igreja_id: req.igreja.id, plano_id, periodo },
            subscription_data: { metadata: { igreja_id: req.igreja.id } },
        });

        res.json({ checkout_url: session.url });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/planos/portal ──────────────────────────────────────────────
router.post("/portal", adminOnly, async (req, res, next) => {
    try {
        const db = getDb();
        const { stripe_customer_id } = db.prepare("SELECT stripe_customer_id FROM igrejas WHERE id = ?").get(req.igreja.id);
        if (!stripe_customer_id) return res.status(400).json({ error: "Sem assinatura Stripe ativa" });

        const session = await stripe.billingPortal.sessions.create({
            customer: stripe_customer_id,
            return_url: `${process.env.FRONTEND_URL}/dashboard/planos`,
        });
        res.json({ portal_url: session.url });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
