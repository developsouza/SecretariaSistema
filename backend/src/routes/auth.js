const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const { getDb } = require("../database/db");
const { authMiddleware } = require("../middlewares/auth");
const rateLimit = require("express-rate-limit");

// Helper: sha256 hex de um token string
function sha256(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "Muitas tentativas. Tente novamente em 15 minutos." } });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: "Muitas tentativas. Tente novamente em 15 minutos." } });
const reenviarLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3, message: { error: "Muitas tentativas. Tente novamente em 15 minutos." } });

// ─── Helper: envia e-mail de reset ─────────────────────────────────────────
async function enviarEmailReset(destinatario, nomeIgreja, resetUrl) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[Auth] SMTP não configurado. URL de reset para ${destinatario}: ${resetUrl}`);
        return;
    }
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
        from: `"SecretariaSistema" <${process.env.SMTP_USER}>`,
        to: destinatario,
        subject: "Redefinição de senha — SecretariaSistema",
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
            <p style="font-size:36px;margin:0;">🔐</p>
            <h1 style="color:#fff;margin:8px 0 4px;font-size:22px;">Redefinição de Senha</h1>
            <p style="color:#c7d2fe;margin:0;font-size:13px;">SecretariaSistema${nomeIgreja ? ` — ${nomeIgreja}` : ""}</p>
          </div>
          <div style="padding:28px 24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Recebemos uma solicitação para redefinir a senha da sua conta.
              Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>2 horas</strong>.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}"
                 style="display:inline-block;background:#1a56db;color:#fff;font-weight:700;
                        font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Redefinir minha senha
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.5;">
              Se você não solicitou a redefinição de senha, ignore este e-mail — sua senha permanece inalterada.<br/>
              Por segurança, nunca compartilhe este link com ninguém.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
              SecretariaSistema · Plataforma de gestão de membros
            </p>
          </div>
        </div>`,
    });
}

// ─── Helper: envia e-mail de verificação ──────────────────────────────────
async function enviarEmailVerificacao(destinatario, nomeIgreja, verifyUrl) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[Auth] SMTP não configurado. URL de verificação para ${destinatario}: ${verifyUrl}`);
        return;
    }
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
        from: `"SecretariaSistema" <${process.env.SMTP_USER}>`,
        to: destinatario,
        subject: "Confirme seu e-mail — SecretariaSistema",
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
            <p style="font-size:36px;margin:0;">✉️</p>
            <h1 style="color:#fff;margin:8px 0 4px;font-size:22px;">Confirme seu e-mail</h1>
            <p style="color:#c7d2fe;margin:0;font-size:13px;">SecretariaSistema${nomeIgreja ? ` — ${nomeIgreja}` : ""}</p>
          </div>
          <div style="padding:28px 24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Obrigado por se cadastrar! Clique no botão abaixo para confirmar seu e-mail e ativar seus
              <strong>14 dias de teste gratuito</strong>. O link expira em <strong>24 horas</strong>.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${verifyUrl}"
                 style="display:inline-block;background:#1a56db;color:#fff;font-weight:700;
                        font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Confirmar meu e-mail
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.5;">
              Se você não criou essa conta, ignore este e-mail com segurança.<br/>
              Por segurança, nunca compartilhe este link com ninguém.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
              SecretariaSistema · Plataforma de gestão de membros
            </p>
          </div>
        </div>`,
    });
}

// ─── Helper: envia e-mail de boas-vindas ──────────────────────────────────
async function enviarEmailBoasVindas(destinatario, nomeIgreja) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[Auth] SMTP não configurado. E-mail de boas-vindas não enviado para ${destinatario}.`);
        return;
    }
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
    await transporter.sendMail({
        from: `"SecretariaSistema" <${process.env.SMTP_USER}>`,
        to: destinatario,
        subject: `Bem-vindo ao SecretariaSistema${nomeIgreja ? ` — ${nomeIgreja}` : ""}! 🎉`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
            <p style="font-size:36px;margin:0;">🎉</p>
            <h1 style="color:#fff;margin:8px 0 4px;font-size:22px;">Bem-vindo ao SecretariaSistema!</h1>
            <p style="color:#c7d2fe;margin:0;font-size:13px;">${nomeIgreja || "SecretariaSistema"}</p>
          </div>
          <div style="padding:28px 24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              E-mail confirmado! Seu <strong>trial gratuito de 14 dias</strong> foi ativado. 🚀
            </p>
            <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:18px;">
              <li>📋 Cadastro completo de membros</li>
              <li>💳 Geração de carteirinhas em PDF</li>
              <li>📊 Relatórios e dashboards</li>
              <li>🔔 Notificações de aniversariantes</li>
            </ul>
            <div style="text-align:center;margin:28px 0;">
              <a href="${dashboardUrl}"
                 style="display:inline-block;background:#1a56db;color:#fff;font-weight:700;
                        font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Acessar o painel
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
              SecretariaSistema · Plataforma de gestão de membros para igrejas
            </p>
          </div>
        </div>`,
    });
}

// ─── POST /api/auth/registrar ──────────────────────────────────────────────
router.post(
    "/registrar",
    [
        body("nome_igreja").trim().isLength({ min: 3 }).withMessage("Nome da igreja deve ter ao menos 3 caracteres"),
        body("cidade").trim().notEmpty().withMessage("Cidade é obrigatória"),
        body("estado").trim().isLength({ min: 2, max: 2 }).withMessage("Estado inválido"),
        body("nome_admin").trim().isLength({ min: 3 }).withMessage("Nome deve ter ao menos 3 caracteres"),
        body("email").isEmail().withMessage("E-mail inválido").normalizeEmail(),
        body("senha").isLength({ min: 8 }).withMessage("Senha deve ter ao menos 8 caracteres"),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

            const db = getDb();
            const { nome_igreja, cidade, estado, denominacao, pastor_nome, nome_admin, email, senha } = req.body;

            // Verifica email duplicado
            if (db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email)) {
                return res.status(409).json({ error: "E-mail já cadastrado" });
            }

            // Slug único
            let slug = nome_igreja
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
            const existing = db.prepare("SELECT id FROM igrejas WHERE slug LIKE ?").all(`${slug}%`);
            if (existing.length) slug = `${slug}-${existing.length}`;

            // Plano básico
            const planoBasico = db.prepare("SELECT id FROM planos WHERE nome = 'Básico'").get();

            const igrejaId = uuidv4();
            const emailToken = uuidv4();
            const emailTokenExpiry = new Date();
            emailTokenExpiry.setHours(emailTokenExpiry.getHours() + 24);

            const tx = db.transaction(() => {
                db.prepare(
                    `
        INSERT INTO igrejas (id, nome, email, cidade, estado, denominacao, pastor_nome, slug, plano_id, stripe_status, trial_end, ativo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', NULL, 1)
      `,
                ).run(igrejaId, nome_igreja, email, cidade, estado, denominacao || null, pastor_nome || null, slug, planoBasico?.id);

                const senhaHash = bcrypt.hashSync(senha, 12);
                db.prepare(
                    `
        INSERT INTO usuarios (id, igreja_id, nome, email, senha_hash, perfil, ativo, email_verificado, email_token, email_token_expiry)
        VALUES (?, ?, ?, ?, ?, 'admin', 1, 0, ?, ?)
      `,
                ).run(uuidv4(), igrejaId, nome_admin, email, senhaHash, emailToken, emailTokenExpiry.toISOString());
            });
            tx();

            const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verificar-email?token=${emailToken}`;
            try {
                await enviarEmailVerificacao(email, nome_igreja, verifyUrl);
            } catch (mailErr) {
                console.error("[Auth] Erro ao enviar e-mail de verificação:", mailErr.message);
            }

            res.status(201).json({
                message: "Conta criada! Verifique seu e-mail para ativar o trial de 14 dias.",
                slug,
                email_verificacao_enviado: true,
            });
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post("/login", loginLimiter, [body("email").isEmail().normalizeEmail(), body("senha").notEmpty()], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

        const db = getDb();
        const { email, senha } = req.body;

        const usuario = db
            .prepare(
                `
      SELECT u.*, i.nome AS igreja_nome, i.nome_curto, i.slug, i.stripe_status,
             i.cor_primaria, i.cor_secundaria, i.logo_url
      FROM usuarios u JOIN igrejas i ON i.id = u.igreja_id
      WHERE u.email = ? AND u.ativo = 1 AND i.ativo = 1
    `,
            )
            .get(email);

        if (!usuario || !bcrypt.compareSync(senha, usuario.senha_hash)) {
            return res.status(401).json({ error: "E-mail ou senha inválidos" });
        }

        // Bloqueia login se e-mail ainda não foi verificado
        if (!usuario.email_verificado) {
            return res.status(403).json({
                code: "EMAIL_NOT_VERIFIED",
                email: usuario.email,
                error: "Confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.",
            });
        }

        db.prepare("UPDATE usuarios SET ultimo_login = datetime('now') WHERE id = ?").run(usuario.id);

        const token = jwt.sign({ userId: usuario.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

        // ── Cookie httpOnly (Sprint 8) ─────────────────────────────────────
        const isProduction = process.env.NODE_ENV === "production";
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "strict",
            secure: isProduction, // Secure apenas em produção (HTTPS)
            maxAge,
            path: "/",
        });

        res.json({
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil,
                igreja: {
                    id: usuario.igreja_id,
                    nome: usuario.igreja_nome,
                    nome_curto: usuario.nome_curto || null,
                    slug: usuario.slug,
                    stripe_status: usuario.stripe_status,
                    cor_primaria: usuario.cor_primaria,
                    cor_secundaria: usuario.cor_secundaria,
                    logo_url: usuario.logo_url,
                },
            },
        });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/auth/verificar-email/:token ────────────────────────────────
router.get("/verificar-email/:token", async (req, res, next) => {
    try {
        const db = getDb();
        const usuario = db
            .prepare(
                `SELECT u.id, u.email, u.igreja_id, i.nome AS nome_igreja
                 FROM usuarios u JOIN igrejas i ON i.id = u.igreja_id
                 WHERE u.email_token = ? AND u.email_token_expiry > datetime('now')`,
            )
            .get(req.params.token);

        if (!usuario) {
            return res.status(400).json({ valid: false, error: "Link inválido ou expirado. Solicite um novo link de verificação." });
        }

        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);

        const tx = db.transaction(() => {
            db.prepare(
                "UPDATE usuarios SET email_verificado = 1, email_token = NULL, email_token_expiry = NULL, updated_at = datetime('now') WHERE id = ?",
            ).run(usuario.id);
            db.prepare("UPDATE igrejas SET stripe_status = 'trialing', trial_end = ?, updated_at = datetime('now') WHERE id = ?").run(
                trialEnd.toISOString(),
                usuario.igreja_id,
            );
        });
        tx();

        // E-mail de boas-vindas (trial ativado)
        try {
            await enviarEmailBoasVindas(usuario.email, usuario.nome_igreja);
        } catch (mailErr) {
            console.error("[Auth] Erro ao enviar e-mail de boas-vindas:", mailErr.message);
        }

        res.json({ valid: true, message: "E-mail confirmado! Seu trial de 14 dias foi ativado. Faça login para começar.", email: usuario.email });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/auth/reenviar-verificacao ──────────────────────────────────
router.post("/reenviar-verificacao", reenviarLimiter, [body("email").isEmail().normalizeEmail()], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

        const db = getDb();
        const { email } = req.body;

        // Sempre retorna sucesso para evitar enumeração de e-mails
        const usuario = db
            .prepare(
                "SELECT u.id, u.email, u.email_verificado, i.nome AS igreja_nome FROM usuarios u JOIN igrejas i ON i.id = u.igreja_id WHERE u.email = ? AND u.ativo = 1",
            )
            .get(email);

        if (usuario && !usuario.email_verificado) {
            const emailToken = uuidv4();
            const emailTokenExpiry = new Date();
            emailTokenExpiry.setHours(emailTokenExpiry.getHours() + 24);

            db.prepare("UPDATE usuarios SET email_token = ?, email_token_expiry = ?, updated_at = datetime('now') WHERE id = ?").run(
                emailToken,
                emailTokenExpiry.toISOString(),
                usuario.id,
            );

            const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verificar-email?token=${emailToken}`;
            try {
                await enviarEmailVerificacao(email, usuario.igreja_nome, verifyUrl);
            } catch (mailErr) {
                console.error("[Auth] Erro ao reenviar e-mail de verificação:", mailErr.message);
            }
        }

        res.json({ message: "Se o e-mail estiver aguardando verificação, você receberá um novo link em breve." });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
router.get("/me", authMiddleware, (req, res) => {
    res.json({
        usuario: {
            ...req.user,
            igreja: req.igreja,
        },
    });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────
router.post("/logout", (req, res) => {
    res.clearCookie("token", { httpOnly: true, sameSite: "strict", path: "/" });
    res.json({ message: "Sessão encerrada com sucesso." });
});

// ─── POST /api/auth/alterar-senha ─────────────────────────────────────────
router.post("/alterar-senha", authMiddleware, [body("senha_atual").notEmpty(), body("nova_senha").isLength({ min: 8 })], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

        const db = getDb();
        const usuario = db.prepare("SELECT senha_hash FROM usuarios WHERE id = ?").get(req.user.id);
        if (!bcrypt.compareSync(req.body.senha_atual, usuario.senha_hash)) {
            return res.status(401).json({ error: "Senha atual incorreta" });
        }

        const novaHash = bcrypt.hashSync(req.body.nova_senha, 12);
        db.prepare("UPDATE usuarios SET senha_hash = ?, updated_at = datetime('now') WHERE id = ?").run(novaHash, req.user.id);
        res.json({ message: "Senha alterada com sucesso" });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/auth/esqueci-senha ─────────────────────────────────────────
router.post("/esqueci-senha", resetLimiter, [body("email").isEmail().normalizeEmail()], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

        const db = getDb();
        const { email } = req.body;

        // Sempre retorna sucesso para evitar enumeração de e-mails
        const usuario = db
            .prepare(
                `SELECT u.id, u.nome, i.nome AS igreja_nome
                     FROM usuarios u JOIN igrejas i ON i.id = u.igreja_id
                     WHERE u.email = ? AND u.ativo = 1 AND i.ativo = 1`,
            )
            .get(email);

        if (usuario) {
            const token = uuidv4();
            const tokenHash = sha256(token);
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + 2);

            db.prepare("UPDATE usuarios SET reset_token = ?, reset_expiry = ?, updated_at = datetime('now') WHERE id = ?").run(
                tokenHash,
                expiry.toISOString(),
                usuario.id,
            );

            const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/redefinir-senha?token=${token}`;
            try {
                await enviarEmailReset(email, usuario.igreja_nome, resetUrl);
            } catch (mailErr) {
                console.error("[Auth] Erro ao enviar e-mail de reset:", mailErr.message);
            }
        }

        res.json({ message: "Se o e-mail estiver cadastrado, você receberá as instruções em breve." });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/auth/validar-token/:token ───────────────────────────────────
router.get("/validar-token/:token", (req, res, next) => {
    try {
        const db = getDb();
        const tokenHash = sha256(req.params.token);
        const usuario = db.prepare("SELECT id, email FROM usuarios WHERE reset_token = ? AND reset_expiry > datetime('now')").get(tokenHash);
        if (!usuario) return res.status(400).json({ valid: false, error: "Token inválido ou expirado" });
        res.json({ valid: true, email: usuario.email });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/auth/redefinir-senha ──────────────────────────────────────
router.post(
    "/redefinir-senha",
    [
        body("token").notEmpty().withMessage("Token obrigatório"),
        body("nova_senha").isLength({ min: 8 }).withMessage("Senha deve ter ao menos 8 caracteres"),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

            const db = getDb();
            const { token, nova_senha } = req.body;

            const tokenHash = sha256(token);
            const usuario = db.prepare("SELECT id FROM usuarios WHERE reset_token = ? AND reset_expiry > datetime('now')").get(tokenHash);
            if (!usuario) return res.status(400).json({ error: "Token inválido ou expirado. Solicite um novo link." });

            const novaHash = bcrypt.hashSync(nova_senha, 12);
            db.prepare("UPDATE usuarios SET senha_hash = ?, reset_token = NULL, reset_expiry = NULL, updated_at = datetime('now') WHERE id = ?").run(
                novaHash,
                usuario.id,
            );

            res.json({ message: "Senha redefinida com sucesso. Faça login com sua nova senha." });
        } catch (err) {
            next(err);
        }
    },
);

module.exports = router;
