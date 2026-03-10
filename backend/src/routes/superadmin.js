const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { getDb } = require("../database/db");
const { superadminMiddleware } = require("../middlewares/auth");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// ─── Helper: gera JWT do superadmin ─────────────────────────────────────────
function gerarToken(superadminId) {
    return jwt.sign({ superadminId, role: "superadmin" }, process.env.JWT_SA_SECRET || process.env.JWT_SECRET, { expiresIn: "8h" });
}

// ─── POST /api/superadmin/login ──────────────────────────────────────────────
router.post("/login", loginLimiter, [body("email").isEmail().normalizeEmail(), body("senha").notEmpty()], async (req, res, next) => {
    try {
        const erros = validationResult(req);
        if (!erros.isEmpty()) return res.status(400).json({ error: "Dados inválidos" });

        const { email, senha } = req.body;
        const db = getDb();
        const sa = db.prepare("SELECT * FROM superadmins WHERE email = ? AND ativo = 1").get(email);
        if (!sa || !(await bcrypt.compare(senha, sa.senha_hash))) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        db.prepare("UPDATE superadmins SET ultimo_login = datetime('now') WHERE id = ?").run(sa.id);

        const token = gerarToken(sa.id);
        res.cookie("sa_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 8 * 60 * 60 * 1000, // 8h
        });

        return res.json({ superadmin: { id: sa.id, nome: sa.nome, email: sa.email } });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/superadmin/logout ─────────────────────────────────────────────
router.post("/logout", (_req, res) => {
    res.clearCookie("sa_token");
    res.json({ ok: true });
});

// ─── GET /api/superadmin/me ───────────────────────────────────────────────────
router.get("/me", superadminMiddleware, (req, res) => {
    res.json({ superadmin: req.superadmin });
});

// ─── GET /api/superadmin/stats ───────────────────────────────────────────────
router.get("/stats", superadminMiddleware, (req, res, next) => {
    try {
        const db = getDb();

        const totalIgrejas = db.prepare("SELECT COUNT(*) AS n FROM igrejas").get().n;
        const igrejasAtivas = db.prepare("SELECT COUNT(*) AS n FROM igrejas WHERE ativo = 1").get().n;
        const igrejasInativas = totalIgrejas - igrejasAtivas;
        const totalMembros = db.prepare("SELECT COUNT(*) AS n FROM membros WHERE situacao = 'ativo'").get().n;
        const totalUsuarios = db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE ativo = 1").get().n;

        const porStatus = db
            .prepare(
                `SELECT stripe_status, COUNT(*) AS n
                 FROM igrejas WHERE ativo = 1
                 GROUP BY stripe_status`,
            )
            .all();

        const porPlano = db
            .prepare(
                `SELECT p.nome AS plano, COUNT(i.id) AS n
                 FROM igrejas i
                 LEFT JOIN planos p ON p.id = i.plano_id
                 WHERE i.ativo = 1
                 GROUP BY i.plano_id`,
            )
            .all();

        const receitaMensal = db
            .prepare(
                `SELECT COALESCE(SUM(p.preco_mensal), 0) AS total
                 FROM igrejas i
                 JOIN planos p ON p.id = i.plano_id
                 WHERE i.stripe_status = 'active' AND i.plano_periodo = 'mensal' AND i.ativo = 1`,
            )
            .get().total;

        const receitaAnual = db
            .prepare(
                `SELECT COALESCE(SUM(p.preco_anual), 0) AS total
                 FROM igrejas i
                 JOIN planos p ON p.id = i.plano_id
                 WHERE i.stripe_status = 'active' AND i.plano_periodo = 'anual' AND i.ativo = 1`,
            )
            .get().total;

        const ultimasIgrejas = db
            .prepare(
                `SELECT i.id, i.nome, i.cidade, i.estado, i.created_at, i.stripe_status, i.ativo,
                        p.nome AS plano_nome
                 FROM igrejas i
                 LEFT JOIN planos p ON p.id = i.plano_id
                 ORDER BY i.created_at DESC LIMIT 5`,
            )
            .all();

        const membrosHoje = db
            .prepare(
                `SELECT COUNT(*) AS n FROM membros
                 WHERE date(created_at) = date('now')`,
            )
            .get().n;

        const igrejasHoje = db
            .prepare(
                `SELECT COUNT(*) AS n FROM igrejas
                 WHERE date(created_at) = date('now')`,
            )
            .get().n;

        // Crescimento — últimos 6 meses
        const crescimento = db
            .prepare(
                `SELECT strftime('%Y-%m', created_at) AS mes, COUNT(*) AS igrejas
                 FROM igrejas
                 WHERE created_at >= date('now', '-6 months')
                 GROUP BY mes ORDER BY mes`,
            )
            .all();

        return res.json({
            totalIgrejas,
            igrejasAtivas,
            igrejasInativas,
            totalMembros,
            totalUsuarios,
            membrosHoje,
            igrejasHoje,
            receitaMensal,
            receitaAnual,
            porStatus,
            porPlano,
            ultimasIgrejas,
            crescimento,
        });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/superadmin/igrejas ─────────────────────────────────────────────
router.get("/igrejas", superadminMiddleware, (req, res, next) => {
    try {
        const db = getDb();
        const { search = "", status = "", plano_id = "", page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let where = "WHERE 1=1";
        const params = [];

        if (search) {
            where += " AND (i.nome LIKE ? OR i.email LIKE ? OR i.cidade LIKE ?)";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status) {
            where += " AND i.stripe_status = ?";
            params.push(status);
        }
        if (plano_id) {
            where += " AND i.plano_id = ?";
            params.push(plano_id);
        }

        const total = db.prepare(`SELECT COUNT(*) AS n FROM igrejas i ${where}`).get(...params).n;

        const igrejas = db
            .prepare(
                `SELECT i.id, i.nome, i.nome_curto, i.email, i.cidade, i.estado,
                        i.stripe_status, i.plano_periodo, i.plano_vencimento, i.trial_end,
                        i.ativo, i.created_at, i.slug, i.logo_url,
                        p.nome AS plano_nome, p.preco_mensal, p.preco_anual,
                        (SELECT COUNT(*) FROM membros m WHERE m.igreja_id = i.id AND m.situacao = 'ativo') AS total_membros,
                        (SELECT COUNT(*) FROM usuarios u WHERE u.igreja_id = i.id AND u.ativo = 1) AS total_usuarios
                 FROM igrejas i
                 LEFT JOIN planos p ON p.id = i.plano_id
                 ${where}
                 ORDER BY i.created_at DESC
                 LIMIT ? OFFSET ?`,
            )
            .all(...params, parseInt(limit), offset);

        return res.json({ igrejas, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/superadmin/igrejas/:id ────────────────────────────────────────
router.get("/igrejas/:id", superadminMiddleware, (req, res, next) => {
    try {
        const db = getDb();
        const igreja = db
            .prepare(
                `SELECT i.*,
                        p.nome AS plano_nome, p.limite_membros, p.preco_mensal, p.preco_anual,
                        (SELECT COUNT(*) FROM membros m WHERE m.igreja_id = i.id AND m.situacao = 'ativo') AS total_membros,
                        (SELECT COUNT(*) FROM membros m WHERE m.igreja_id = i.id) AS total_membros_todos,
                        (SELECT COUNT(*) FROM congregacoes c WHERE c.igreja_id = i.id) AS total_congregacoes,
                        (SELECT COUNT(*) FROM membros m WHERE m.igreja_id = i.id AND m.carteira_gerada = 1) AS total_carteiras
                 FROM igrejas i
                 LEFT JOIN planos p ON p.id = i.plano_id
                 WHERE i.id = ?`,
            )
            .get(req.params.id);

        if (!igreja) return res.status(404).json({ error: "Igreja não encontrada" });

        const usuarios = db
            .prepare(
                `SELECT id, nome, email, perfil, ativo, ultimo_login, created_at
                 FROM usuarios WHERE igreja_id = ? ORDER BY created_at`,
            )
            .all(req.params.id);

        const planos = db.prepare("SELECT id, nome FROM planos WHERE ativo = 1").all();

        return res.json({ igreja, usuarios, planos });
    } catch (err) {
        next(err);
    }
});

// ─── PATCH /api/superadmin/igrejas/:id ──────────────────────────────────────
router.patch(
    "/igrejas/:id",
    superadminMiddleware,
    [
        body("ativo").optional().isBoolean(),
        body("plano_id").optional().isString(),
        body("stripe_status").optional().isString(),
        body("plano_periodo").optional().isIn(["mensal", "anual"]),
    ],
    (req, res, next) => {
        try {
            const erros = validationResult(req);
            if (!erros.isEmpty()) return res.status(400).json({ errors: erros.array() });

            const db = getDb();
            const { ativo, plano_id, stripe_status, plano_periodo } = req.body;

            const campos = [];
            const vals = [];
            if (ativo !== undefined) {
                campos.push("ativo = ?");
                vals.push(ativo ? 1 : 0);
            }
            if (plano_id !== undefined) {
                campos.push("plano_id = ?");
                vals.push(plano_id);
            }
            if (stripe_status !== undefined) {
                campos.push("stripe_status = ?");
                vals.push(stripe_status);
            }
            if (plano_periodo !== undefined) {
                campos.push("plano_periodo = ?");
                vals.push(plano_periodo);
            }

            if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar" });

            campos.push("updated_at = datetime('now')");
            vals.push(req.params.id);

            db.prepare(`UPDATE igrejas SET ${campos.join(", ")} WHERE id = ?`).run(...vals);
            return res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    },
);

// ─── DELETE /api/superadmin/igrejas/:id ─────────────────────────────────────
router.delete("/igrejas/:id", superadminMiddleware, (req, res, next) => {
    try {
        const db = getDb();
        const igreja = db.prepare("SELECT id, nome FROM igrejas WHERE id = ?").get(req.params.id);
        if (!igreja) return res.status(404).json({ error: "Igreja não encontrada" });

        // foreign_keys = ON garante deleção em cascata (membros, usuarios, congregacoes, etc.)
        db.prepare("DELETE FROM igrejas WHERE id = ?").run(req.params.id);
        return res.json({ ok: true, nome: igreja.nome });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/superadmin/planos ──────────────────────────────────────────────
router.get("/planos", superadminMiddleware, (req, res, next) => {
    try {
        const db = getDb();
        const planos = db
            .prepare(
                `SELECT p.*,
                        (SELECT COUNT(*) FROM igrejas i WHERE i.plano_id = p.id AND i.ativo = 1) AS total_igrejas
                 FROM planos p ORDER BY p.preco_mensal`,
            )
            .all();
        return res.json({ planos });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/superadmin/planos ────────────────────────────────────────────
router.post(
    "/planos",
    superadminMiddleware,
    [
        body("nome").trim().isLength({ min: 2 }),
        body("limite_membros").isInt({ min: 1 }),
        body("preco_mensal").isFloat({ min: 0 }),
        body("preco_anual").isFloat({ min: 0 }),
    ],
    (req, res, next) => {
        try {
            const erros = validationResult(req);
            if (!erros.isEmpty()) return res.status(400).json({ errors: erros.array() });

            const db = getDb();
            const {
                nome,
                descricao = "",
                limite_membros,
                preco_mensal,
                preco_anual,
                stripe_price_id_mensal,
                stripe_price_id_anual,
                recursos,
            } = req.body;

            const id = uuidv4();
            db.prepare(
                `INSERT INTO planos (id, nome, descricao, limite_membros, preco_mensal, preco_anual, stripe_price_id_mensal, stripe_price_id_anual, recursos)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
                id,
                nome,
                descricao,
                limite_membros,
                preco_mensal,
                preco_anual,
                stripe_price_id_mensal || null,
                stripe_price_id_anual || null,
                JSON.stringify(recursos || {}),
            );

            return res.status(201).json({ id });
        } catch (err) {
            next(err);
        }
    },
);

// ─── PUT /api/superadmin/planos/:id ─────────────────────────────────────────
router.put(
    "/planos/:id",
    superadminMiddleware,
    [
        body("nome").trim().isLength({ min: 2 }),
        body("limite_membros").isInt({ min: 1 }),
        body("preco_mensal").isFloat({ min: 0 }),
        body("preco_anual").isFloat({ min: 0 }),
    ],
    (req, res, next) => {
        try {
            const erros = validationResult(req);
            if (!erros.isEmpty()) return res.status(400).json({ errors: erros.array() });

            const db = getDb();
            const { nome, descricao, limite_membros, preco_mensal, preco_anual, stripe_price_id_mensal, stripe_price_id_anual, recursos, ativo } =
                req.body;

            db.prepare(
                `UPDATE planos SET nome=?, descricao=?, limite_membros=?, preco_mensal=?, preco_anual=?,
                 stripe_price_id_mensal=?, stripe_price_id_anual=?, recursos=?, ativo=?, updated_at=datetime('now')
                 WHERE id=?`,
            ).run(
                nome,
                descricao || "",
                limite_membros,
                preco_mensal,
                preco_anual,
                stripe_price_id_mensal || null,
                stripe_price_id_anual || null,
                JSON.stringify(recursos || {}),
                ativo === false ? 0 : 1,
                req.params.id,
            );

            return res.json({ ok: true });
        } catch (err) {
            next(err);
        }
    },
);

// ─── GET /api/superadmin/usuarios ────────────────────────────────────────────
router.get("/usuarios", superadminMiddleware, (req, res, next) => {
    try {
        const db = getDb();
        const { search = "", page = 1, limit = 30 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let where = "WHERE 1=1";
        const params = [];
        if (search) {
            where += " AND (u.nome LIKE ? OR u.email LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }

        const total = db.prepare(`SELECT COUNT(*) AS n FROM usuarios u ${where}`).get(...params).n;

        const usuarios = db
            .prepare(
                `SELECT u.id, u.nome, u.email, u.perfil, u.ativo, u.ultimo_login, u.created_at,
                        i.nome AS igreja_nome, i.id AS igreja_id
                 FROM usuarios u
                 JOIN igrejas i ON i.id = u.igreja_id
                 ${where}
                 ORDER BY u.created_at DESC
                 LIMIT ? OFFSET ?`,
            )
            .all(...params, parseInt(limit), offset);

        return res.json({ usuarios, total });
    } catch (err) {
        next(err);
    }
});

// ─── PATCH /api/superadmin/senha ─────────────────────────────────────────────
router.patch("/senha", superadminMiddleware, [body("nova_senha").isLength({ min: 8 })], async (req, res, next) => {
    try {
        const erros = validationResult(req);
        if (!erros.isEmpty()) return res.status(400).json({ error: "A nova senha deve ter pelo menos 8 caracteres" });

        const db = getDb();
        const hash = await bcrypt.hash(req.body.nova_senha, 12);
        db.prepare("UPDATE superadmins SET senha_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.superadmin.id);
        return res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
