const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { getDb } = require("../database/db");

const preCadastroLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10,
    message: { error: "Muitas solicitações. Tente novamente em 1 hora." },
});

const agendamentoLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    message: { error: "Muitas solicitações de agendamento. Tente novamente em 1 hora." },
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
            .prepare("SELECT id, nome, nome_curto, logo_url, cor_primaria, cor_secundaria FROM igrejas WHERE slug = ? AND ativo = 1")
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
                nome_curto: igreja.nome_curto || null,
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

// ─── GET /api/publico/agenda/:slug ────────────────────────────────────────
// Retorna eventos públicos da igreja (tipo='evento' apenas, planos Profissional/Premium)
router.get("/agenda/:slug", (req, res, next) => {
    try {
        const db = getDb();
        const slug = req.params.slug.toLowerCase().trim();

        const igreja = db
            .prepare(
                `SELECT i.id, i.nome, i.nome_curto, i.logo_url, i.cor_primaria, i.cor_secundaria,
                        i.cor_texto, i.cidade, i.estado, i.slug, i.pastor_nome, i.pastor_titulo,
                        i.denominacao, i.site,
                        p.nome AS plano_nome
                 FROM igrejas i
                 LEFT JOIN planos p ON p.id = i.plano_id
                 WHERE i.slug = ? AND i.ativo = 1`,
            )
            .get(slug);

        if (!igreja) return res.status(404).json({ error: "Igreja não encontrada" });

        if (!["Profissional", "Premium"].includes(igreja.plano_nome)) {
            return res.status(403).json({ error: "Agenda pública disponível apenas nos planos Profissional e Premium" });
        }

        const { mes, data_inicio, data_fim } = req.query;
        let where = "WHERE e.igreja_id = ? AND e.tipo = 'evento'";
        const params = [igreja.id];

        if (mes) {
            where += " AND strftime('%Y-%m', e.data_inicio) = ?";
            params.push(mes);
        } else if (data_inicio && data_fim) {
            where += " AND e.data_inicio BETWEEN ? AND ?";
            params.push(data_inicio, data_fim);
        } else {
            // Padrão: próximos 90 dias (usando horário de Brasília UTC-3)
            where += " AND e.data_inicio >= date('now', '-3 hours') AND e.data_inicio <= date('now', '-3 hours', '+90 days')";
        }

        const eventos = db
            .prepare(
                `SELECT id, titulo, descricao, local, data_inicio, hora_inicio,
                        data_fim, hora_fim, cor, dia_todo, recorrente, recorrencia
                 FROM agenda_eventos e
                 ${where}
                 ORDER BY e.data_inicio ASC, e.hora_inicio ASC`,
            )
            .all(...params);

        const { nome, nome_curto, logo_url, cor_primaria, cor_secundaria, cor_texto, cidade, estado, pastor_nome, pastor_titulo, denominacao, site } =
            igreja;
        res.json({
            igreja: {
                nome,
                nome_curto,
                logo_url,
                cor_primaria,
                cor_secundaria,
                cor_texto,
                cidade,
                estado,
                pastor_nome,
                pastor_titulo,
                denominacao,
                site,
                slug,
            },
            eventos,
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/publico/agenda/:slug/solicitar ─────────────────────────────
// Envio público de solicitação de agendamento de evento
router.post(
    "/agenda/:slug/solicitar",
    agendamentoLimiter,
    [
        body("nome").trim().notEmpty().withMessage("Nome é obrigatório"),
        body("celular").trim().notEmpty().withMessage("Celular é obrigatório"),
        body("titulo").trim().notEmpty().withMessage("Título do evento é obrigatório"),
        body("data_inicio").trim().notEmpty().isISO8601().withMessage("Data de início inválida"),
        body("email").optional({ checkFalsy: true }).isEmail().withMessage("E-mail inválido"),
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const db = getDb();
            const slug = req.params.slug.toLowerCase().trim();

            const igreja = db
                .prepare(
                    `SELECT i.id, i.nome, p.nome AS plano_nome
                     FROM igrejas i
                     LEFT JOIN planos p ON p.id = i.plano_id
                     WHERE i.slug = ? AND i.ativo = 1`,
                )
                .get(slug);

            if (!igreja) return res.status(404).json({ error: "Igreja não encontrada" });
            if (!["Profissional", "Premium"].includes(igreja.plano_nome)) {
                return res.status(403).json({ error: "Recurso não disponível" });
            }

            const { nome, email, celular, whatsapp, titulo, descricao, local, data_inicio, hora_inicio, data_fim, hora_fim } = req.body;

            const id = require("crypto").randomBytes(16).toString("hex");
            db.prepare(
                `INSERT INTO solicitacoes_agendamento
                 (id, igreja_id, nome, email, celular, whatsapp, titulo, descricao, local,
                  data_inicio, hora_inicio, data_fim, hora_fim)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
                id,
                igreja.id,
                nome,
                email || null,
                celular,
                whatsapp || null,
                titulo,
                descricao || null,
                local || null,
                data_inicio,
                hora_inicio || null,
                data_fim || null,
                hora_fim || null,
            );

            // Notificação interna para os administradores da igreja
            try {
                const dataFormatada = data_inicio.split("-").reverse().join("/");
                db.prepare(
                    `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
                     VALUES (lower(hex(randomblob(16))), ?, 'solicitacao_agendamento', ?, ?, ?)`,
                ).run(
                    igreja.id,
                    "Nova Solicitação de Agendamento",
                    `${nome} solicitou agendamento de "${titulo}" para ${dataFormatada}.`,
                    JSON.stringify({ solicitacao_id: id, nome, titulo, data_inicio }),
                );
            } catch (e) {
                console.error("[Solicitação] Erro ao criar notificação:", e.message);
            }

            res.status(201).json({ ok: true, id });
        } catch (err) {
            next(err);
        }
    },
);

// ─── Helpers: aniversários públicos ──────────────────────────────────────────
function ehCargoPastoral(cargo) {
    if (!cargo) return false;
    const c = cargo.toLowerCase();
    return /di[áa]con[ao]|presb[íi]tero|evangelista|pastor|dirigente de departamento/.test(c);
}

function proximoAniversario(dataIso) {
    const hoje = new Date();
    const nasc = new Date(dataIso + "T12:00:00");
    const esteAno = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
    const hojeStr = hoje.toISOString().slice(0, 10);
    if (esteAno.toISOString().slice(0, 10) >= hojeStr) {
        return esteAno.toISOString().slice(0, 10);
    }
    const proximoAno = new Date(hoje.getFullYear() + 1, nasc.getMonth(), nasc.getDate());
    return proximoAno.toISOString().slice(0, 10);
}

const aniversarioLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 horas
    max: 5,
    message: { error: "Limite de cadastros atingido. Tente novamente amanhã." },
});

// ─── GET /api/publico/aniversarios/:slug ──────────────────────────────────────
// Retorna aniversários públicos cadastrados para o mês solicitado
router.get("/aniversarios/:slug", (req, res, next) => {
    try {
        const db = getDb();
        const slug = req.params.slug.toLowerCase().trim();
        const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
        const mesPad = String(mes).padStart(2, "0");

        const igreja = db
            .prepare(
                `SELECT id, nome, nome_curto, logo_url, cor_primaria, cor_secundaria, cor_texto, slug
                 FROM igrejas WHERE slug = ? AND ativo = 1`,
            )
            .get(slug);
        if (!igreja) return res.status(404).json({ error: "Igreja não encontrada" });

        const aniversariantes = db
            .prepare(
                `SELECT id, nome_completo, data_nascimento, celular, whatsapp, email, cargo, departamento, congregacao,
                        strftime('%d', data_nascimento) AS dia,
                        strftime('%m', data_nascimento) AS mes_nasc
                 FROM aniversarios_publicos
                 WHERE igreja_id = ? AND ativo = 1
                   AND strftime('%m', data_nascimento) = ?
                 ORDER BY strftime('%d', data_nascimento), nome_completo`,
            )
            .all(igreja.id, mesPad);

        const hoje = db
            .prepare(
                `SELECT id, nome_completo, data_nascimento, celular, whatsapp, email, cargo, departamento, congregacao
                 FROM aniversarios_publicos
                 WHERE igreja_id = ? AND ativo = 1
                   AND strftime('%m-%d', data_nascimento) = strftime('%m-%d', 'now')
                 ORDER BY nome_completo`,
            )
            .all(igreja.id);

        const proximos = db
            .prepare(
                `SELECT id, nome_completo, data_nascimento, celular, whatsapp, email, cargo, departamento, congregacao,
                        strftime('%m-%d', data_nascimento) AS dia_mes
                 FROM aniversarios_publicos
                 WHERE igreja_id = ? AND ativo = 1
                   AND strftime('%m-%d', data_nascimento) > strftime('%m-%d', 'now')
                   AND strftime('%m-%d', data_nascimento) <= strftime('%m-%d', datetime('now', '+7 days'))
                 ORDER BY strftime('%m-%d', data_nascimento)
                 LIMIT 10`,
            )
            .all(igreja.id);

        const total = db.prepare("SELECT COUNT(*) AS n FROM aniversarios_publicos WHERE igreja_id = ? AND ativo = 1").get(igreja.id)?.n || 0;

        res.json({
            igreja: {
                nome: igreja.nome,
                nome_curto: igreja.nome_curto,
                logo_url: igreja.logo_url,
                cor_primaria: igreja.cor_primaria || "#1a56db",
                cor_secundaria: igreja.cor_secundaria || "#6366f1",
                cor_texto: igreja.cor_texto || "#ffffff",
                slug: igreja.slug,
            },
            aniversariantes,
            hoje,
            proximos,
            mes,
            total,
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/publico/aniversarios/:slug ─────────────────────────────────────
// Cadastro público de aniversário (com criação automática na agenda pastoral)
router.post(
    "/aniversarios/:slug",
    aniversarioLimiter,
    [
        body("nome_completo").trim().notEmpty().withMessage("Nome completo é obrigatório"),
        body("data_nascimento")
            .trim()
            .notEmpty()
            .withMessage("Data de nascimento é obrigatória")
            .isISO8601()
            .withMessage("Data de nascimento inválida"),
        body("cargo").trim().notEmpty().withMessage("Cargo é obrigatório"),
        body("email").optional({ checkFalsy: true }).isEmail().withMessage("E-mail inválido"),
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const db = getDb();
            const slug = req.params.slug.toLowerCase().trim();
            const igreja = db.prepare("SELECT id, nome FROM igrejas WHERE slug = ? AND ativo = 1").get(slug);
            if (!igreja) return res.status(404).json({ error: "Igreja não encontrada" });

            const { nome_completo, data_nascimento, celular, whatsapp, email, cargo, departamento } = req.body;

            // Evitar duplicatas: mesmo nome + mesmo dia/mês na mesma igreja
            const mesdia = data_nascimento.slice(5); // "MM-DD"
            const dup = db
                .prepare(
                    `SELECT id FROM aniversarios_publicos
                     WHERE igreja_id = ? AND ativo = 1
                       AND nome_completo = ?
                       AND strftime('%m-%d', data_nascimento) = ?`,
                )
                .get(igreja.id, nome_completo.trim(), mesdia);
            if (dup) return res.status(409).json({ error: "Este aniversário já foi cadastrado." });

            // Criação automática na Agenda Pastoral para cargos eclesiásticos
            let agendaPastoralId = null;
            if (ehCargoPastoral(cargo)) {
                try {
                    const dataEvento = proximoAniversario(data_nascimento);
                    const labelCargo = cargo + (departamento ? ` — ${departamento}` : "");
                    const criado = db
                        .prepare(
                            `INSERT INTO agenda_eventos
                             (id, igreja_id, tipo, titulo, descricao, data_inicio, dia_todo, recorrente, recorrencia, cor)
                             VALUES (lower(hex(randomblob(16))), ?, 'pastoral', ?, ?, ?, 1, 1, 'anual', '#be185d')
                             RETURNING id`,
                        )
                        .get(
                            igreja.id,
                            `🎂 Aniversário — ${nome_completo.trim()} (${labelCargo})`,
                            `Aniversário de ${cargo}${departamento ? ` – ${departamento}` : ""}. Cadastrado via página pública.`,
                            dataEvento,
                        );
                    agendaPastoralId = criado?.id || null;
                } catch (e) {
                    console.error("[AniversarioPublico] Erro ao criar evento pastoral:", e.message);
                }
            }

            const id = require("crypto").randomBytes(16).toString("hex");
            db.prepare(
                `INSERT INTO aniversarios_publicos
                 (id, igreja_id, nome_completo, data_nascimento, celular, whatsapp, email, cargo, departamento, congregacao, agenda_pastoral_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
                id,
                igreja.id,
                nome_completo.trim(),
                data_nascimento,
                celular || null,
                whatsapp || null,
                email || null,
                cargo || null,
                departamento || null,
                req.body.congregacao?.trim() || null,
                agendaPastoralId,
            );

            // Notificação interna para a igreja
            try {
                const cargoLabel = cargo + (departamento ? ` (${departamento})` : "");
                db.prepare(
                    `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
                     VALUES (lower(hex(randomblob(16))), ?, 'aniversario_publico', ?, ?, ?)`,
                ).run(
                    igreja.id,
                    "Novo Aniversário Cadastrado",
                    `${nome_completo.trim()} (${cargoLabel}) cadastrou seu aniversário na página pública.`,
                    JSON.stringify({ aniversario_id: id, nome: nome_completo.trim(), cargo: cargo || null, departamento: departamento || null }),
                );
            } catch (e) {
                console.error("[AniversarioPublico] Erro ao criar notificação:", e.message);
            }

            res.status(201).json({ ok: true, id, agenda_pastoral_criada: !!agendaPastoralId });
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /api/publico/contato/:slug ─────────────────────────────────────────
// Formulário de contato público do site institucional da igreja
const contatoLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { sucesso: false, erro: "Muitas solicitações. Tente novamente em 1 hora." },
});

router.post(
    "/contato/:slug",
    contatoLimiter,
    [
        body("nome").trim().notEmpty().withMessage("Nome é obrigatório"),
        body("email").trim().notEmpty().isEmail().withMessage("E-mail inválido"),
        body("mensagem").trim().notEmpty().withMessage("Mensagem é obrigatória"),
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    sucesso: false,
                    erro: errors
                        .array()
                        .map((e) => e.msg)
                        .join(" • "),
                });
            }

            const db = getDb();
            const slug = req.params.slug.toLowerCase().trim();
            const igreja = db.prepare("SELECT id FROM igrejas WHERE slug = ? AND ativo = 1").get(slug);
            if (!igreja) return res.status(404).json({ sucesso: false, erro: "Igreja não encontrada" });

            const { nome, email, telefone, mensagem } = req.body;

            db.prepare(
                `INSERT INTO contatos_site (id, igreja_id, nome, email, telefone, mensagem)
                 VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)`,
            ).run(igreja.id, nome, email, telefone || null, mensagem);

            // Notificação interna
            try {
                db.prepare(
                    `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
                     VALUES (lower(hex(randomblob(16))), ?, 'contato_site', ?, ?, ?)`,
                ).run(igreja.id, "Nova Mensagem de Contato", `${nome} enviou uma mensagem pelo site.`, JSON.stringify({ nome, email }));
            } catch (e) {
                console.error("[Contato Site] Erro ao criar notificação:", e.message);
            }

            res.status(201).json({ sucesso: true, mensagem: "Mensagem enviada com sucesso! Entraremos em contato em breve." });
        } catch (err) {
            next(err);
        }
    },
);

module.exports = router;
