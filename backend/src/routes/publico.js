const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { getDb } = require("../database/db");

const preCadastroLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10,
    message: { error: "Muitas solicitações. Tente novamente em 1 hora." },
});

// ─── GET /api/publico/planos ──────────────────────────────────────────────
router.get("/planos", (req, res, next) => {
    try {
        const db = getDb();
        const planos = db
            .prepare(
                "SELECT id, nome, descricao, limite_membros, preco_mensal, preco_anual, recursos FROM planos WHERE ativo = 1 ORDER BY preco_mensal",
            )
            .all();
        planos.forEach((p) => {
            p.recursos = JSON.parse(p.recursos || "{}");
        });
        res.json(planos);
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/publico/igrejas/:slug ───────────────────────────────────────
// Retorna dados públicos da landing page personalizada da igreja
router.get("/igrejas/:slug", (req, res, next) => {
    try {
        const db = getDb();
        const slug = req.params.slug.toLowerCase().trim();
        const igreja = db
            .prepare(
                `
      SELECT nome, nome_curto, denominacao, pastor_nome, pastor_titulo,
             cidade, estado, site, logo_url, cor_primaria, cor_secundaria, cor_texto,
             fundacao_ano, slug
      FROM igrejas WHERE slug = ? AND ativo = 1
    `,
            )
            .get(slug);
        if (!igreja) return res.status(404).json({ error: "Igreja não encontrada" });
        res.json(igreja);
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/publico/verificar-membro/:igrejaSlug/:membroId ─────────────
// Valida QR Code da carteira
router.get("/verificar-membro/:igrejaSlug/:membroId", (req, res, next) => {
    try {
        const db = getDb();
        const igrejaSlug = req.params.igrejaSlug.toLowerCase().trim();
        const igreja = db
            .prepare("SELECT id, nome, logo_url, cor_primaria, cor_secundaria FROM igrejas WHERE slug = ? AND ativo = 1")
            .get(igrejaSlug);
        if (!igreja) return res.status(404).json({ valido: false, erro: "Igreja não encontrada" });

        const membro = db
            .prepare(
                `
      SELECT numero_membro, nome_completo, cargo, situacao, data_entrada_igreja,
             carteira_gerada_em, foto_url, congregacao_nome
      FROM membros WHERE id = ? AND igreja_id = ?
    `,
            )
            .get(req.params.membroId, igreja.id);

        if (!membro) return res.status(404).json({ valido: false, erro: "Membro não encontrado" });

        res.json({
            valido: membro.situacao === "ativo",
            membro: {
                numero: membro.numero_membro,
                nome: membro.nome_completo,
                cargo: membro.cargo,
                situacao: membro.situacao,
                membro_desde: membro.data_entrada_igreja,
                foto_url: membro.foto_url || null,
                congregacao: membro.congregacao_nome || null,
            },
            igreja: {
                nome: igreja.nome,
                logo_url: igreja.logo_url || null,
                cor_primaria: igreja.cor_primaria || "#1a56db",
                cor_secundaria: igreja.cor_secundaria || "#6366f1",
            },
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/publico/pre-cadastro/:slug ─────────────────────────────────────
// Endpoint público — submissão do pré-cadastro pelo futuro membro
router.post(
    "/pre-cadastro/:slug",
    preCadastroLimiter,
    [
        // Campos obrigatórios da carteira de membro
        body("nome_completo").trim().notEmpty().withMessage("Nome completo é obrigatório"),
        body("celular").trim().notEmpty().withMessage("Celular é obrigatório"),
        body("data_nascimento")
            .trim()
            .notEmpty()
            .withMessage("Data de nascimento é obrigatória")
            .isISO8601()
            .withMessage("Data de nascimento inválida"),
        body("sexo").trim().notEmpty().withMessage("Sexo é obrigatório").isIn(["masculino", "feminino"]).withMessage("Sexo inválido"),
        body("estado_civil").trim().notEmpty().withMessage("Estado civil é obrigatório"),
        body("cpf").trim().notEmpty().withMessage("CPF é obrigatório"),
        body("rg").trim().notEmpty().withMessage("RG é obrigatório"),
        body("cidade_nascimento").trim().notEmpty().withMessage("Cidade de nascimento é obrigatória"),
        body("estado_nascimento").trim().notEmpty().withMessage("Estado de nascimento é obrigatório"),
        body("forma_entrada").trim().notEmpty().withMessage("Forma de entrada é obrigatória"),
        body("cargo").trim().notEmpty().withMessage("Cargo é obrigatório"),
        body("data_batismo_agua").trim().notEmpty().withMessage("Data de batismo é obrigatória").isISO8601().withMessage("Data de batismo inválida"),
        // Campos opcionais
        body("email").optional({ checkFalsy: true }).isEmail().withMessage("E-mail inválido"),
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const db = getDb();
            const slug = req.params.slug.toLowerCase().trim();
            const igreja = db.prepare("SELECT id, nome, slug FROM igrejas WHERE slug = ? AND ativo = 1").get(slug);
            if (!igreja) return res.status(404).json({ error: "Igreja não encontrada" });

            const {
                nome_completo,
                data_nascimento,
                sexo,
                estado_civil,
                cpf,
                rg,
                rg_orgao,
                email,
                celular,
                whatsapp,
                telefone,
                cep,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                cidade_nascimento,
                estado_nascimento,
                forma_entrada,
                data_batismo_agua,
                data_conversao,
                denominacao_origem,
                cargo,
                congregacao_preferida,
                observacoes,
            } = req.body;

            // Evitar duplicatas pendentes do mesmo CPF ou celular na mesma igreja
            if (cpf) {
                const dup = db.prepare("SELECT id FROM pre_cadastros WHERE igreja_id = ? AND cpf = ? AND status = 'pendente'").get(igreja.id, cpf);
                if (dup) return res.status(409).json({ error: "Já existe um pré-cadastro pendente com este CPF." });
            }

            const id = require("crypto").randomBytes(16).toString("hex");
            db.prepare(
                `
                INSERT INTO pre_cadastros (
                    id, igreja_id, nome_completo, data_nascimento, sexo, estado_civil,
                    cpf, rg, rg_orgao, email, celular, whatsapp, telefone,
                    cep, logradouro, numero, complemento, bairro, cidade, estado,
                    cidade_nascimento, estado_nascimento,
                    forma_entrada, data_batismo_agua, data_conversao, denominacao_origem,
                    cargo, congregacao_preferida, observacoes
                ) VALUES (
                    @id, @igrejaId, @nomeCompleto, @dataNascimento, @sexo, @estadoCivil,
                    @cpf, @rg, @rgOrgao, @email, @celular, @whatsapp, @telefone,
                    @cep, @logradouro, @numero, @complemento, @bairro, @cidade, @estado,
                    @cidadeNascimento, @estadoNascimento,
                    @formaEntrada, @dataBatismoAgua, @dataConversao, @denominacaoOrigem,
                    @cargo, @congregacaoPreferida, @observacoes
                )
            `,
            ).run({
                id,
                igrejaId: igreja.id,
                nomeCompleto: nome_completo,
                dataNascimento: data_nascimento || null,
                sexo: sexo || null,
                estadoCivil: estado_civil || null,
                cpf: cpf || null,
                rg: rg || null,
                rgOrgao: rg_orgao || null,
                email: email || null,
                celular,
                whatsapp: whatsapp || null,
                telefone: telefone || null,
                cep: cep || null,
                logradouro: logradouro || null,
                numero: numero || null,
                complemento: complemento || null,
                bairro: bairro || null,
                cidade: cidade || null,
                estado: estado || null,
                cidadeNascimento: cidade_nascimento || null,
                estadoNascimento: estado_nascimento || null,
                formaEntrada: forma_entrada || null,
                dataBatismoAgua: data_batismo_agua || null,
                dataConversao: data_conversao || null,
                denominacaoOrigem: denominacao_origem || null,
                cargo: cargo || null,
                congregacaoPreferida: congregacao_preferida || null,
                observacoes: observacoes || null,
            });

            // Criar notificação interna para a igreja
            try {
                db.prepare(
                    `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
                     VALUES (lower(hex(randomblob(16))), ?, 'pre_cadastro', ?, ?, ?)`,
                ).run(
                    igreja.id,
                    "Novo Pré-Cadastro Recebido",
                    `${nome_completo} enviou um pré-cadastro e aguarda análise.`,
                    JSON.stringify({ pre_cadastro_id: id, nome: nome_completo }),
                );
            } catch (e) {
                console.error("[PreCadastro] Erro ao criar notificação:", e.message);
            }

            res.status(201).json({ ok: true, id });
        } catch (err) {
            next(err);
        }
    },
);

module.exports = router;
