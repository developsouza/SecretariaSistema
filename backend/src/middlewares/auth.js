const jwt = require("jsonwebtoken");
const { getDb } = require("../database/db");

/**
 * Middleware de autenticação JWT.
 * Popula req.user com { id, igreja_id, perfil } e req.igreja com dados da igreja.
 */
async function authMiddleware(req, res, next) {
    try {
        // Prioridade: 1) cookie httpOnly  2) Bearer header
        const authHeader = req.headers.authorization;
        const rawToken = req.cookies?.token || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);
        if (!rawToken) {
            return res.status(401).json({ error: "Token não fornecido" });
        }

        let decoded;
        try {
            decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: "Token inválido ou expirado" });
        }

        const db = getDb();
        const usuario = db
            .prepare(
                `
      SELECT u.id, u.nome, u.email, u.perfil, u.ativo, u.igreja_id,
             i.nome AS igreja_nome, i.nome_curto, i.slug, i.stripe_status, i.plano_id,
             i.logo_url, i.cor_primaria, i.cor_secundaria, i.cor_texto,
             i.cancelado_em, i.onboarding_steps, i.trial_end,
             p.limite_membros, p.recursos AS plano_recursos
      FROM usuarios u
      JOIN igrejas i ON i.id = u.igreja_id
      LEFT JOIN planos p ON p.id = i.plano_id
      WHERE u.id = ? AND u.ativo = 1 AND i.ativo = 1
    `,
            )
            .get(decoded.userId);

        if (!usuario) {
            return res.status(401).json({ error: "Usuário não encontrado ou inativo" });
        }

        req.user = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil,
            igreja_id: usuario.igreja_id,
        };
        // Calcula se está dentro do grace period de 30 dias após cancelamento
        const diasDesde = usuario.cancelado_em
            ? Math.floor((Date.now() - new Date(usuario.cancelado_em).getTime()) / (1000 * 60 * 60 * 24))
            : Infinity;
        const gracePeriod = usuario.stripe_status === "canceled" && diasDesde <= 30;

        req.igreja = {
            id: usuario.igreja_id,
            nome: usuario.igreja_nome,
            nome_curto: usuario.nome_curto || null,
            slug: usuario.slug,
            stripe_status: usuario.stripe_status,
            logo_url: usuario.logo_url,
            cor_primaria: usuario.cor_primaria,
            cor_secundaria: usuario.cor_secundaria,
            cor_texto: usuario.cor_texto,
            limite_membros: usuario.limite_membros,
            plano_recursos: usuario.plano_recursos ? JSON.parse(usuario.plano_recursos) : {},
            cancelado_em: usuario.cancelado_em || null,
            grace_period: gracePeriod,
            grace_days_left: gracePeriod ? 30 - diasDesde : 0,
            onboarding_steps: usuario.onboarding_steps ? JSON.parse(usuario.onboarding_steps) : {},
            trial_end: usuario.trial_end || null,
            trial_days_left: usuario.trial_end ? Math.ceil((new Date(usuario.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        };

        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Garante que o usuário tem perfil de admin.
 */
function adminOnly(req, res, next) {
    if (req.user?.perfil !== "admin") {
        return res.status(403).json({ error: "Acesso restrito a administradores" });
    }
    next();
}

/**
 * Middleware de autenticação para o painel Superadmin (Master).
 * Usa o cookie httpOnly `sa_token` — completamente separado do fluxo de igrejas.
 */
async function superadminMiddleware(req, res, next) {
    try {
        const rawToken = req.cookies?.sa_token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
        if (!rawToken) {
            return res.status(401).json({ error: "Token de superadmin não fornecido" });
        }
        let decoded;
        try {
            decoded = jwt.verify(rawToken, process.env.JWT_SA_SECRET || process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ error: "Token de superadmin inválido ou expirado" });
        }
        if (decoded.role !== "superadmin") {
            return res.status(403).json({ error: "Acesso restrito ao painel master" });
        }
        const db = getDb();
        const sa = db.prepare("SELECT id, nome, email, ativo FROM superadmins WHERE id = ? AND ativo = 1").get(decoded.superadminId);
        if (!sa) {
            return res.status(401).json({ error: "Superadmin não encontrado ou inativo" });
        }
        req.superadmin = { id: sa.id, nome: sa.nome, email: sa.email };
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Garante que a assinatura está ativa (ou em trial).
 * Durante o grace period (30 dias após cancelamento):
 *   - GET: permitido com req.modoGracePeriod = true
 *   - POST / PUT / PATCH / DELETE: bloqueado com 402 GRACE_PERIOD
 */
function assinaturaAtiva(req, res, next) {
    const status = req.igreja?.stripe_status;

    if (["active", "trialing"].includes(status)) return next();

    if (status === "pending_verification") {
        return res.status(402).json({
            error: "E-mail não verificado. Confirme seu e-mail para ativar o trial.",
            code: "PENDING_EMAIL_VERIFICATION",
        });
    }

    if (req.igreja?.grace_period) {
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
            return res.status(402).json({
                error: `Assinatura cancelada. Você ainda tem ${req.igreja.grace_days_left} dia(s) de acesso somente leitura.`,
                code: "GRACE_PERIOD",
                grace_days_left: req.igreja.grace_days_left,
                stripe_status: status,
            });
        }
        req.modoGracePeriod = true;
        return next();
    }

    return res.status(402).json({
        error: "Assinatura inativa",
        code: "SUBSCRIPTION_INACTIVE",
        stripe_status: status,
    });
}

module.exports = { authMiddleware, adminOnly, assinaturaAtiva, superadminMiddleware };
