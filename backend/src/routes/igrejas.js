const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const { getDb } = require("../database/db");
const { authMiddleware, adminOnly } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { validarMimeReal } = require("../middlewares/upload");
const path = require("path");
const fs = require("fs");

// Todas as rotas exigem auth
router.use(authMiddleware);

// ─── GET /api/igrejas/minha ────────────────────────────────────────────────
router.get("/minha", (req, res, next) => {
    try {
        const db = getDb();
        const igreja = db
            .prepare(
                `
      SELECT i.*, p.nome AS plano_nome, p.limite_membros, p.recursos AS plano_recursos, p.preco_mensal, p.preco_anual
      FROM igrejas i LEFT JOIN planos p ON p.id = i.plano_id
      WHERE i.id = ?
    `,
            )
            .get(req.igreja.id);
        if (!igreja) return res.status(404).json({ error: "Igreja não encontrada" });
        igreja.plano_recursos = JSON.parse(igreja.plano_recursos || "{}");
        igreja.cores_funcoes = JSON.parse(igreja.cores_funcoes || "{}");
        res.json(igreja);
    } catch (err) {
        next(err);
    }
});

// ─── PUT /api/igrejas/minha ────────────────────────────────────────────────
router.put(
    "/minha",
    adminOnly,
    [
        body("nome").trim().isLength({ min: 3 }),
        body("email").isEmail().normalizeEmail(),
        body("cidade").notEmpty(),
        body("estado").isLength({ min: 2, max: 2 }),
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

            const db = getDb();
            const {
                nome,
                nome_curto,
                cnpj,
                email,
                telefone,
                celular,
                site,
                cep,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                denominacao,
                pastor_nome,
                pastor_titulo,
                fundacao_ano,
                pastor_whatsapp,
                pastor_email,
                cor_primaria,
                cor_secundaria,
                cor_texto,
                cores_funcoes,
            } = req.body;

            db.prepare(
                `
      UPDATE igrejas SET
        nome=@nome, nome_curto=@nome_curto, cnpj=@cnpj, email=@email, telefone=@telefone, celular=@celular, site=@site,
        cep=@cep, logradouro=@logradouro, numero=@numero, complemento=@complemento, bairro=@bairro, cidade=@cidade, estado=@estado,
        denominacao=@denominacao, pastor_nome=@pastor_nome, pastor_titulo=@pastor_titulo, fundacao_ano=@fundacao_ano,
        pastor_whatsapp=@pastor_whatsapp, pastor_email=@pastor_email,
        cor_primaria=@cor_primaria, cor_secundaria=@cor_secundaria, cor_texto=@cor_texto,
        cores_funcoes=@cores_funcoes,
        updated_at=datetime('now')
      WHERE id=@id
    `,
            ).run({
                nome,
                nome_curto,
                cnpj,
                email,
                telefone,
                celular,
                site,
                cep,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                denominacao,
                pastor_nome,
                pastor_titulo,
                fundacao_ano,
                pastor_whatsapp: pastor_whatsapp || null,
                pastor_email: pastor_email || null,
                cor_primaria,
                cor_secundaria,
                cor_texto,
                cores_funcoes: typeof cores_funcoes === "object" ? JSON.stringify(cores_funcoes) : cores_funcoes || "{}",
                id: req.igreja.id,
            });

            res.json({ message: "Dados da igreja atualizados" });
        } catch (err) {
            next(err);
        }
    },
);

// ─── PUT /api/igrejas/cores-funcoes ────────────────────────────────────────
router.put("/cores-funcoes", adminOnly, (req, res, next) => {
    try {
        const { cores_funcoes } = req.body;
        if (!cores_funcoes || typeof cores_funcoes !== "object") {
            return res.status(400).json({ error: "Dados inválidos" });
        }
        const db = getDb();
        db.prepare("UPDATE igrejas SET cores_funcoes = ?, updated_at = datetime('now') WHERE id = ?").run(
            JSON.stringify(cores_funcoes),
            req.igreja.id,
        );
        res.json({ message: "Cores por cargo salvas com sucesso" });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/igrejas/logo ────────────────────────────────────────────────
router.post("/logo", adminOnly, upload.single("logo"), validarMimeReal, (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

        const db = getDb();
        const oldLogo = db.prepare("SELECT logo_url FROM igrejas WHERE id = ?").get(req.igreja.id)?.logo_url;

        const logoUrl = `/uploads/logos/${req.file.filename}`;
        db.prepare("UPDATE igrejas SET logo_url = ?, updated_at = datetime('now') WHERE id = ?").run(logoUrl, req.igreja.id);

        // Remove logo antiga
        if (oldLogo) {
            const oldPath = path.join(__dirname, "../../", oldLogo);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        res.json({ logo_url: logoUrl });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/igrejas/marca-dagua ──────────────────────────────────────
router.post("/marca-dagua", adminOnly, upload.single("marca_dagua"), validarMimeReal, (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

        const db = getDb();
        const old = db.prepare("SELECT marca_dagua_url FROM igrejas WHERE id = ?").get(req.igreja.id)?.marca_dagua_url;

        const mdUrl = `/uploads/logos/${req.file.filename}`;
        db.prepare("UPDATE igrejas SET marca_dagua_url = ?, updated_at = datetime('now') WHERE id = ?").run(mdUrl, req.igreja.id);

        if (old) {
            const oldPath = path.join(__dirname, "../../", old);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        res.json({ marca_dagua_url: mdUrl });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/igrejas/marca-dagua ─────────────────────────────────────
router.delete("/marca-dagua", adminOnly, (req, res, next) => {
    try {
        const db = getDb();
        const old = db.prepare("SELECT marca_dagua_url FROM igrejas WHERE id = ?").get(req.igreja.id)?.marca_dagua_url;

        db.prepare("UPDATE igrejas SET marca_dagua_url = NULL, updated_at = datetime('now') WHERE id = ?").run(req.igreja.id);

        if (old) {
            const oldPath = path.join(__dirname, "../../", old);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        res.json({ message: "Marca d'água removida" });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/igrejas/assinatura ────────────────────────────────────────
router.post("/assinatura", adminOnly, upload.single("assinatura"), validarMimeReal, (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

        const db = getDb();
        const old = db.prepare("SELECT assinatura_pastor_url FROM igrejas WHERE id = ?").get(req.igreja.id)?.assinatura_pastor_url;

        const sigUrl = `/uploads/logos/${req.file.filename}`;
        db.prepare("UPDATE igrejas SET assinatura_pastor_url = ?, updated_at = datetime('now') WHERE id = ?").run(sigUrl, req.igreja.id);

        if (old) {
            const oldPath = path.join(__dirname, "../../", old);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        res.json({ assinatura_pastor_url: sigUrl });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/igrejas/usuarios ────────────────────────────────────────────
router.get("/usuarios", adminOnly, (req, res, next) => {
    try {
        const db = getDb();
        const usuarios = db
            .prepare(
                `
      SELECT id, nome, email, perfil, ativo, ultimo_login, created_at
      FROM usuarios WHERE igreja_id = ? ORDER BY nome
    `,
            )
            .all(req.igreja.id);
        res.json(usuarios);
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/igrejas/usuarios ───────────────────────────────────────────
router.post(
    "/usuarios",
    adminOnly,
    [
        body("nome").trim().isLength({ min: 3 }),
        body("email").isEmail().normalizeEmail(),
        body("senha").isLength({ min: 8 }),
        body("perfil").isIn(["admin", "secretario", "visitante"]),
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

            const db = getDb();
            const bcrypt = require("bcryptjs");
            const { v4: uuidv4 } = require("uuid");
            const { nome, email, senha, perfil } = req.body;

            if (db.prepare("SELECT id FROM usuarios WHERE email = ? AND igreja_id = ?").get(email, req.igreja.id)) {
                return res.status(409).json({ error: "E-mail já cadastrado nesta igreja" });
            }

            const senhaHash = bcrypt.hashSync(senha, 12);
            const id = uuidv4();
            db.prepare(
                `
      INSERT INTO usuarios (id, igreja_id, nome, email, senha_hash, perfil, ativo) VALUES (?,?,?,?,?,?,1)
    `,
            ).run(id, req.igreja.id, nome, email, senhaHash, perfil);

            res.status(201).json({ id, nome, email, perfil });
        } catch (err) {
            next(err);
        }
    },
);

// ─── GET /api/igrejas/departamentos ───────────────────────────────────────
router.get("/departamentos", (req, res, next) => {
    try {
        const db = getDb();
        const deps = db.prepare("SELECT * FROM departamentos WHERE igreja_id = ? AND ativo = 1 ORDER BY nome").all(req.igreja.id);
        res.json(deps);
    } catch (err) {
        next(err);
    }
});

router.post("/departamentos", adminOnly, [body("nome").trim().isLength({ min: 2 })], (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
        const { v4: uuidv4 } = require("uuid");
        const db = getDb();
        const id = uuidv4();
        db.prepare("INSERT INTO departamentos (id, igreja_id, nome, descricao) VALUES (?,?,?,?)").run(
            id,
            req.igreja.id,
            req.body.nome,
            req.body.descricao || null,
        );
        res.status(201).json({ id, nome: req.body.nome });
    } catch (err) {
        next(err);
    }
});

// ─── PATCH /api/igrejas/onboarding ────────────────────────────────────────
// Atualiza flags do checklist de onboarding (ex: { dispensado: true })
router.patch("/onboarding", adminOnly, (req, res, next) => {
    try {
        const db = getDb();
        const atual = db.prepare("SELECT onboarding_steps FROM igrejas WHERE id = ?").get(req.igreja.id);
        const stepsAtuais = atual?.onboarding_steps ? JSON.parse(atual.onboarding_steps) : {};
        const stepsNovos = { ...stepsAtuais, ...req.body };
        db.prepare("UPDATE igrejas SET onboarding_steps = ?, updated_at = datetime('now') WHERE id = ?").run(
            JSON.stringify(stepsNovos),
            req.igreja.id,
        );
        res.json({ onboarding_steps: stepsNovos });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
