const router = require("express").Router();
const Stripe = require("stripe");
const { getDb } = require("../database/db");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────
// Body já chega como raw Buffer (configurado no server.js)
router.post("/stripe", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error("[Webhook] Assinatura inválida:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const db = getDb();
    console.log(`[Webhook] Evento: ${event.type}`);

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const { igreja_id, plano_id, periodo } = session.metadata || {};
                if (!igreja_id) break;

                const subId = session.subscription;
                const sub = await stripe.subscriptions.retrieve(subId);
                const vencimento = new Date(sub.current_period_end * 1000).toISOString();

                db.prepare(
                    `
          UPDATE igrejas SET
            stripe_subscription_id = @subId,
            stripe_status = @status,
            plano_id = @planoId,
            plano_periodo = @periodo,
            plano_vencimento = @vencimento,
            updated_at = datetime('now')
          WHERE id = @igrejaId
        `,
                ).run({ subId, status: sub.status, planoId: plano_id, periodo, vencimento, igrejaId: igreja_id });
                break;
            }

            case "customer.subscription.updated": {
                const sub = event.data.object;
                const igrejaId = sub.metadata?.igreja_id;
                if (!igrejaId) break;
                const vencimento = new Date(sub.current_period_end * 1000).toISOString();
                db.prepare(
                    `
          UPDATE igrejas SET stripe_status = ?, plano_vencimento = ?, updated_at = datetime('now') WHERE stripe_subscription_id = ?
        `,
                ).run(sub.status, vencimento, sub.id);
                break;
            }

            case "customer.subscription.deleted": {
                const sub = event.data.object;
                db.prepare(
                    `
          UPDATE igrejas
          SET stripe_status = 'canceled',
              cancelado_em  = datetime('now'),
              updated_at    = datetime('now')
          WHERE stripe_subscription_id = ?
        `,
                ).run(sub.id);

                // E-mail de aviso de cancelamento ao admin
                try {
                    const igrejaInfo = db
                        .prepare(
                            `SELECT i.nome, u.email
                             FROM igrejas i
                             JOIN usuarios u ON u.igreja_id = i.id AND u.perfil = 'admin' AND u.ativo = 1
                             WHERE i.stripe_subscription_id = ?
                             LIMIT 1`,
                        )
                        .get(sub.id);

                    if (igrejaInfo && process.env.SMTP_USER && process.env.SMTP_PASS) {
                        const nodemailer = require("nodemailer");
                        const transporter = nodemailer.createTransport({
                            host: process.env.SMTP_HOST || "smtp.gmail.com",
                            port: parseInt(process.env.SMTP_PORT) || 587,
                            secure: process.env.SMTP_SECURE === "true",
                            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                        });
                        const plansUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/planos`;
                        await transporter.sendMail({
                            from: `"Gestão Secretaria" <${process.env.SMTP_USER}>`,
                            to: process.env.NOTIFY_EMAIL || igrejaInfo.email,
                            subject: `Assinatura cancelada — ${igrejaInfo.nome}`,
                            html: `
                            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                              <div style="background:#dc2626;padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
                                <p style="font-size:36px;margin:0;">🔒</p>
                                <h1 style="color:#fff;margin:8px 0 4px;font-size:22px;">Assinatura Cancelada</h1>
                                <p style="color:#fecaca;margin:0;font-size:13px;">${igrejaInfo.nome}</p>
                              </div>
                              <div style="padding:28px 24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
                                <p style="color:#374151;font-size:15px;line-height:1.6;">
                                  Sua assinatura foi cancelada. Você ainda tem <strong>30 dias de período de carência</strong>
                                  para exportar seus dados em modo somente leitura.
                                </p>
                                <div style="text-align:center;margin:28px 0;">
                                  <a href="${plansUrl}"
                                     style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;
                                            font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                                    Reativar assinatura
                                  </a>
                                </div>
                                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
                                <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
                                  Gestão Secretaria · Plataforma de gestão de membros
                                </p>
                              </div>
                            </div>`,
                        });
                        console.log(`[Webhook] E-mail de cancelamento enviado para ${igrejaInfo.email}`);
                    }
                } catch (mailErr) {
                    console.error("[Webhook] Erro ao enviar e-mail de cancelamento:", mailErr.message);
                }
                break;
            }

            case "invoice.payment_failed": {
                const inv = event.data.object;
                db.prepare(
                    `
          UPDATE igrejas SET stripe_status = 'past_due', updated_at = datetime('now') WHERE stripe_customer_id = ?
        `,
                ).run(inv.customer);
                break;
            }

            case "invoice.payment_succeeded": {
                const inv = event.data.object;
                if (inv.subscription) {
                    const sub = await stripe.subscriptions.retrieve(inv.subscription);
                    const vencimento = new Date(sub.current_period_end * 1000).toISOString();
                    db.prepare(
                        `
            UPDATE igrejas SET stripe_status = 'active', plano_vencimento = ?, updated_at = datetime('now') WHERE stripe_customer_id = ?
          `,
                    ).run(vencimento, inv.customer);
                }
                break;
            }

            default:
                break;
        }
    } catch (err) {
        console.error("[Webhook] Erro processando evento:", err);
    }

    res.json({ received: true });
});

module.exports = router;
