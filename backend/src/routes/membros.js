const router = require("express").Router();
const { body, query, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../database/db");
const { authMiddleware, assinaturaAtiva } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { validarMimeReal } = require("../middlewares/upload");
const path = require("path");
const fs = require("fs");

router.use(authMiddleware);
router.use(assinaturaAtiva);

// ─── Gerador de número de membro ──────────────────────────────────────────
function gerarNumeroMembro(igrejaId, db) {
    const row = db.prepare("SELECT MAX(CAST(numero_membro AS INTEGER)) AS max_num FROM membros WHERE igreja_id = ?").get(igrejaId);
    return String((row?.max_num || 0) + 1);
}

// ─── GET /api/membros ─────────────────────────────────────────────────────
router.get(
    "/",
    [
        query("pagina").optional().isInt({ min: 1 }),
        query("limite").optional().isInt({ min: 1, max: 100 }),
        query("busca").optional().trim(),
        query("situacao").optional().isIn(["ativo", "inativo", "transferido", "falecido", "disciplina", ""]),
        query("cargo").optional().trim(),
        query("congregacao_id").optional().trim(),
    ],
    (req, res, next) => {
        try {
            const db = getDb();
            const pagina = parseInt(req.query.pagina) || 1;
            const limite = parseInt(req.query.limite) || 20;
            const offset = (pagina - 1) * limite;
            const busca = req.query.busca || "";
            const situacao = req.query.situacao || "";
            const cargo = req.query.cargo || "";
            const congregacaoId = req.query.congregacao_id || "";

            let where = "WHERE m.igreja_id = @igrejaId";
            const params = { igrejaId: req.igreja.id };

            if (busca) {
                where += ` AND (m.nome_completo LIKE @busca OR m.celular LIKE @busca OR m.cpf LIKE @busca OR m.numero_membro LIKE @busca OR m.email LIKE @busca)`;
                params.busca = `%${busca}%`;
            }
            if (situacao) {
                where += " AND m.situacao = @situacao";
                params.situacao = situacao;
            }
            if (cargo) {
                where += " AND m.cargo LIKE @cargo";
                params.cargo = `%${cargo}%`;
            }
            if (congregacaoId === "sede") {
                where += " AND (m.congregacao_id IS NULL OR m.congregacao_id = '')";
            } else if (congregacaoId) {
                where += " AND m.congregacao_id = @congregacaoId";
                params.congregacaoId = congregacaoId;
            }

            const total = db.prepare(`SELECT COUNT(*) AS c FROM membros m ${where}`).get(params)?.c || 0;
            const membros = db
                .prepare(
                    `
      SELECT m.id, m.numero_membro, m.nome_completo, m.celular, m.email, m.situacao,
             m.cargo, m.data_entrada_igreja, m.foto_url, m.data_nascimento, m.cidade, m.estado,
             m.carteira_gerada, m.carteira_gerada_em, m.carteira_entregue,
             m.carteira_entregue_em, m.carteira_entregue_para,
             m.created_at, m.congregacao_id,
             c.nome AS congregacao_nome
      FROM membros m
      LEFT JOIN congregacoes c ON c.id = m.congregacao_id
      ${where}
      ORDER BY m.nome_completo
      LIMIT @limite OFFSET @offset
    `,
                )
                .all({ ...params, limite, offset });

            res.json({ membros, total, pagina, limite, total_paginas: Math.ceil(total / limite) });
        } catch (err) {
            next(err);
        }
    },
);

// ─── GET /api/membros/exportar ────────────────────────────────────────────
// Disponível mesmo durante grace period (GET → assinaturaAtiva permite).
// Gera CSV com todos os membros da igreja.
router.get("/exportar", (req, res, next) => {
    try {
        const db = getDb();
        const membros = db
            .prepare(
                `SELECT numero_membro, nome_completo, situacao, sexo, data_nascimento,
                        cpf, rg, celular, email, cargo,
                        estado_civil, naturalidade, estado,
                        data_entrada_igreja, data_batismo, congregacao_nome
                 FROM membros
                 WHERE igreja_id = ?
                 ORDER BY nome_completo`,
            )
            .all(req.igreja.id);

        const colunas = [
            "numero_membro",
            "nome_completo",
            "situacao",
            "sexo",
            "data_nascimento",
            "cpf",
            "rg",
            "celular",
            "email",
            "cargo",
            "estado_civil",
            "naturalidade",
            "estado",
            "data_entrada_igreja",
            "data_batismo",
            "congregacao_nome",
        ];

        const escapar = (v) => {
            if (v == null) return "";
            const s = String(v).replace(/"/g, '""');
            return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
        };

        const linhas = [colunas.join(","), ...membros.map((m) => colunas.map((c) => escapar(m[c])).join(","))];

        const nomeArquivo = `membros_${req.igreja.slug || req.igreja.id}_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
        res.send("\uFEFF" + linhas.join("\r\n")); // BOM para Excel
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/membros/:id ────────────────────────────────────────────────
router.get("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const membro = db
            .prepare(
                `
          SELECT m.*, c.nome AS congregacao_nome
          FROM membros m
          LEFT JOIN congregacoes c ON c.id = m.congregacao_id
          WHERE m.id = ? AND m.igreja_id = ?
        `,
            )
            .get(req.params.id, req.igreja.id);
        if (!membro) return res.status(404).json({ error: "Membro não encontrado" });

        // Deserializar JSON
        ["departamentos", "celulas", "dons_ministeriais", "filhos"].forEach((f) => {
            try {
                membro[f] = JSON.parse(membro[f] || "[]");
            } catch {
                membro[f] = [];
            }
        });
        try {
            membro.dados_extras = JSON.parse(membro.dados_extras || "{}");
        } catch {
            membro.dados_extras = {};
        }

        res.json(membro);
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/membros ────────────────────────────────────────────────────
router.post(
    "/",
    [
        body("nome_completo").trim().isLength({ min: 3 }),
        body("celular").trim().notEmpty(),
        body("situacao").optional().isIn(["ativo", "inativo", "transferido", "falecido", "disciplina"]),
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

            const db = getDb();

            // Verifica limite do plano
            const count = db.prepare("SELECT COUNT(*) AS c FROM membros WHERE igreja_id = ?").get(req.igreja.id)?.c || 0;
            if (count >= req.igreja.limite_membros) {
                return res
                    .status(402)
                    .json({ error: `Limite de ${req.igreja.limite_membros} membros atingido. Faça upgrade do plano.`, code: "MEMBER_LIMIT_REACHED" });
            }

            // Verifica CPF duplicado
            if (req.body.cpf) {
                const dup = db.prepare("SELECT id FROM membros WHERE cpf = ? AND igreja_id = ?").get(req.body.cpf, req.igreja.id);
                if (dup) return res.status(409).json({ error: "CPF já cadastrado nesta igreja" });
            }

            const id = uuidv4();
            const numero = req.body.numero_membro || gerarNumeroMembro(req.igreja.id, db);

            const {
                nome_completo,
                nome_social,
                tipo_cadastro,
                data_nascimento,
                sexo,
                estado_civil,
                nacionalidade,
                outra_nacionalidade,
                cidade_nascimento,
                estado_nascimento,
                naturalidade,
                doador_sangue,
                tipo_sangue,
                cpf,
                rg,
                rg_orgao,
                rg_uf,
                titulo_eleitor,
                zona_eleitoral,
                secao_eleitoral,
                email,
                telefone,
                celular,
                whatsapp,
                cep,
                endereco_completo,
                logradouro,
                numero: num,
                complemento,
                bairro,
                cidade,
                estado,
                profissao,
                empresa_trabalho,
                escolaridade,
                graduacao,
                data_conversao,
                data_ingresso,
                data_entrada_igreja,
                forma_entrada,
                situacao,
                data_batismo,
                data_batismo_agua,
                cidade_batismo,
                estado_batismo,
                ano_batismo_espirito_santo,
                denominacao_origem,
                data_mudanca_denominacao,
                veio_outra_assembleia,
                data_mudanca,
                cidade_origem,
                estado_origem,
                cargo,
                auxiliar_trabalho,
                auxiliar_trabalho_detalhes,
                diacono,
                diacono_detalhes,
                presbitero,
                presbitero_detalhes,
                evangelista,
                evangelista_detalhes,
                pastor,
                pastor_detalhes,
                departamentos,
                celulas,
                dons_ministeriais,
                nome_pai,
                nome_mae,
                nome_conjuge,
                certidao_casamento,
                data_casamento,
                livro_casamento,
                folha_casamento,
                filhos,
                observacoes,
                dados_extras,
                congregacao_id,
            } = req.body;

            db.prepare(
                `
      INSERT INTO membros (
        id, igreja_id, numero_membro, tipo_cadastro,
        nome_completo, nome_social, data_nascimento, sexo, estado_civil,
        nacionalidade, outra_nacionalidade, cidade_nascimento, estado_nascimento, naturalidade,
        doador_sangue, tipo_sangue,
        cpf, rg, rg_orgao, rg_uf, titulo_eleitor, zona_eleitoral, secao_eleitoral,
        email, telefone, celular, whatsapp,
        cep, endereco_completo, logradouro, numero, complemento, bairro, cidade, estado,
        profissao, empresa_trabalho, escolaridade, graduacao,
        data_conversao, data_ingresso, data_entrada_igreja, forma_entrada, situacao,
        data_batismo, data_batismo_agua, cidade_batismo, estado_batismo, ano_batismo_espirito_santo,
        denominacao_origem, data_mudanca_denominacao,
        veio_outra_assembleia, data_mudanca, cidade_origem, estado_origem,
        cargo,
        auxiliar_trabalho, auxiliar_trabalho_detalhes,
        diacono, diacono_detalhes,
        presbitero, presbitero_detalhes,
        evangelista, evangelista_detalhes,
        pastor, pastor_detalhes,
        departamentos, celulas, dons_ministeriais,
        nome_pai, nome_mae, nome_conjuge,
        certidao_casamento, data_casamento, livro_casamento, folha_casamento,
        filhos, observacoes, dados_extras, congregacao_id
      ) VALUES (
        @id, @igrejaId, @numero, @tipo_cadastro,
        @nome_completo, @nome_social, @data_nascimento, @sexo, @estado_civil,
        @nacionalidade, @outra_nacionalidade, @cidade_nascimento, @estado_nascimento, @naturalidade,
        @doador_sangue, @tipo_sangue,
        @cpf, @rg, @rg_orgao, @rg_uf, @titulo_eleitor, @zona_eleitoral, @secao_eleitoral,
        @email, @telefone, @celular, @whatsapp,
        @cep, @endereco_completo, @logradouro, @num, @complemento, @bairro, @cidade, @estado,
        @profissao, @empresa_trabalho, @escolaridade, @graduacao,
        @data_conversao, @data_ingresso, @data_entrada_igreja, @forma_entrada, @situacao,
        @data_batismo, @data_batismo_agua, @cidade_batismo, @estado_batismo, @ano_batismo_espirito_santo,
        @denominacao_origem, @data_mudanca_denominacao,
        @veio_outra_assembleia, @data_mudanca, @cidade_origem, @estado_origem,
        @cargo,
        @auxiliar_trabalho, @auxiliar_trabalho_detalhes,
        @diacono, @diacono_detalhes,
        @presbitero, @presbitero_detalhes,
        @evangelista, @evangelista_detalhes,
        @pastor, @pastor_detalhes,
        @departamentos, @celulas, @dons_ministeriais,
        @nome_pai, @nome_mae, @nome_conjuge,
        @certidao_casamento, @data_casamento, @livro_casamento, @folha_casamento,
        @filhos, @observacoes, @dados_extras, @congregacao_id
      )
    `,
            ).run({
                id,
                igrejaId: req.igreja.id,
                numero,
                tipo_cadastro: tipo_cadastro || null,
                nome_completo,
                nome_social: nome_social || null,
                data_nascimento: data_nascimento || null,
                sexo: sexo || null,
                estado_civil: estado_civil || null,
                nacionalidade: nacionalidade || "Brasileira",
                outra_nacionalidade: outra_nacionalidade || null,
                cidade_nascimento: cidade_nascimento || null,
                estado_nascimento: estado_nascimento || null,
                naturalidade: naturalidade || null,
                doador_sangue: doador_sangue ? 1 : 0,
                tipo_sangue: tipo_sangue || null,
                cpf: cpf || null,
                rg: rg || null,
                rg_orgao: rg_orgao || null,
                rg_uf: rg_uf || null,
                titulo_eleitor: titulo_eleitor || null,
                zona_eleitoral: zona_eleitoral || null,
                secao_eleitoral: secao_eleitoral || null,
                email: email || null,
                telefone: telefone || null,
                celular,
                whatsapp: whatsapp || null,
                cep: cep || null,
                endereco_completo: endereco_completo || null,
                logradouro: logradouro || null,
                num: num || null,
                complemento: complemento || null,
                bairro: bairro || null,
                cidade: cidade || null,
                estado: estado || null,
                profissao: profissao || null,
                empresa_trabalho: empresa_trabalho || null,
                escolaridade: escolaridade || null,
                graduacao: graduacao || null,
                data_conversao: data_conversao || null,
                data_ingresso: data_ingresso || null,
                data_entrada_igreja: data_entrada_igreja || new Date().toISOString().split("T")[0],
                forma_entrada: forma_entrada || "conversão",
                situacao: situacao || "ativo",
                data_batismo: data_batismo || null,
                data_batismo_agua: data_batismo_agua || null,
                cidade_batismo: cidade_batismo || null,
                estado_batismo: estado_batismo || null,
                ano_batismo_espirito_santo: ano_batismo_espirito_santo || null,
                denominacao_origem: denominacao_origem || null,
                data_mudanca_denominacao: data_mudanca_denominacao || null,
                veio_outra_assembleia: veio_outra_assembleia ? 1 : 0,
                data_mudanca: data_mudanca || null,
                cidade_origem: cidade_origem || null,
                estado_origem: estado_origem || null,
                cargo: cargo || null,
                auxiliar_trabalho: auxiliar_trabalho ? 1 : 0,
                auxiliar_trabalho_detalhes: auxiliar_trabalho_detalhes || null,
                diacono: diacono ? 1 : 0,
                diacono_detalhes: diacono_detalhes || null,
                presbitero: presbitero ? 1 : 0,
                presbitero_detalhes: presbitero_detalhes || null,
                evangelista: evangelista ? 1 : 0,
                evangelista_detalhes: evangelista_detalhes || null,
                pastor: pastor ? 1 : 0,
                pastor_detalhes: pastor_detalhes || null,
                departamentos: JSON.stringify(departamentos || []),
                celulas: JSON.stringify(celulas || []),
                dons_ministeriais: JSON.stringify(dons_ministeriais || []),
                nome_pai: nome_pai || null,
                nome_mae: nome_mae || null,
                nome_conjuge: nome_conjuge || null,
                certidao_casamento: certidao_casamento || null,
                data_casamento: data_casamento || null,
                livro_casamento: livro_casamento || null,
                folha_casamento: folha_casamento || null,
                filhos: JSON.stringify(filhos || []),
                observacoes: observacoes || null,
                dados_extras: JSON.stringify(dados_extras || {}),
                congregacao_id: congregacao_id || null,
            });

            res.status(201).json({ id, numero_membro: numero, message: "Membro cadastrado com sucesso" });
        } catch (err) {
            next(err);
        }
    },
);

// ─── PUT /api/membros/:id ────────────────────────────────────────────────
router.put(
    "/:id",
    [
        body("nome_completo").trim().isLength({ min: 3 }),
        // Converte null/undefined para string vazia antes de validar
        body("celular")
            .customSanitizer((v) => (v == null ? "" : String(v)))
            .trim()
            .notEmpty(),
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

            const db = getDb();
            const membro = db.prepare("SELECT id FROM membros WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
            if (!membro) return res.status(404).json({ error: "Membro não encontrado" });

            // Verifica CPF duplicado (excluindo o próprio membro)
            if (req.body.cpf) {
                const dup = db
                    .prepare("SELECT id FROM membros WHERE cpf = ? AND igreja_id = ? AND id != ?")
                    .get(req.body.cpf, req.igreja.id, req.params.id);
                if (dup) return res.status(409).json({ error: "CPF já cadastrado por outro membro" });
            }

            const {
                numero_membro,
                nome_completo,
                nome_social,
                tipo_cadastro,
                data_nascimento,
                sexo,
                estado_civil,
                nacionalidade,
                outra_nacionalidade,
                cidade_nascimento,
                estado_nascimento,
                naturalidade,
                doador_sangue,
                tipo_sangue,
                cpf,
                rg,
                rg_orgao,
                rg_uf,
                titulo_eleitor,
                zona_eleitoral,
                secao_eleitoral,
                email,
                telefone,
                celular,
                whatsapp,
                cep,
                endereco_completo,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                profissao,
                empresa_trabalho,
                escolaridade,
                graduacao,
                data_conversao,
                data_ingresso,
                data_entrada_igreja,
                forma_entrada,
                situacao,
                data_batismo,
                data_batismo_agua,
                cidade_batismo,
                estado_batismo,
                ano_batismo_espirito_santo,
                denominacao_origem,
                data_mudanca_denominacao,
                veio_outra_assembleia,
                data_mudanca,
                cidade_origem,
                estado_origem,
                cargo,
                auxiliar_trabalho,
                auxiliar_trabalho_detalhes,
                diacono,
                diacono_detalhes,
                presbitero,
                presbitero_detalhes,
                evangelista,
                evangelista_detalhes,
                pastor,
                pastor_detalhes,
                departamentos,
                celulas,
                dons_ministeriais,
                nome_pai,
                nome_mae,
                nome_conjuge,
                certidao_casamento,
                data_casamento,
                livro_casamento,
                folha_casamento,
                filhos,
                observacoes,
                dados_extras,
                congregacao_id,
            } = req.body;

            db.prepare(
                `UPDATE membros SET
                numero_membro = @numero_membro,
                nome_completo = @nome_completo,
                nome_social = @nome_social,
                tipo_cadastro = @tipo_cadastro,
                data_nascimento = @data_nascimento,
                sexo = @sexo,
                estado_civil = @estado_civil,
                nacionalidade = @nacionalidade,
                outra_nacionalidade = @outra_nacionalidade,
                cidade_nascimento = @cidade_nascimento,
                estado_nascimento = @estado_nascimento,
                naturalidade = @naturalidade,
                doador_sangue = @doador_sangue,
                tipo_sangue = @tipo_sangue,
                cpf = @cpf,
                rg = @rg,
                rg_orgao = @rg_orgao,
                rg_uf = @rg_uf,
                titulo_eleitor = @titulo_eleitor,
                zona_eleitoral = @zona_eleitoral,
                secao_eleitoral = @secao_eleitoral,
                email = @email,
                telefone = @telefone,
                celular = @celular,
                whatsapp = @whatsapp,
                cep = @cep,
                endereco_completo = @endereco_completo,
                logradouro = @logradouro,
                numero = @numero,
                complemento = @complemento,
                bairro = @bairro,
                cidade = @cidade,
                estado = @estado,
                profissao = @profissao,
                empresa_trabalho = @empresa_trabalho,
                escolaridade = @escolaridade,
                graduacao = @graduacao,
                data_conversao = @data_conversao,
                data_ingresso = @data_ingresso,
                data_entrada_igreja = @data_entrada_igreja,
                forma_entrada = @forma_entrada,
                situacao = @situacao,
                data_batismo = @data_batismo,
                data_batismo_agua = @data_batismo_agua,
                cidade_batismo = @cidade_batismo,
                estado_batismo = @estado_batismo,
                ano_batismo_espirito_santo = @ano_batismo_espirito_santo,
                denominacao_origem = @denominacao_origem,
                data_mudanca_denominacao = @data_mudanca_denominacao,
                veio_outra_assembleia = @veio_outra_assembleia,
                data_mudanca = @data_mudanca,
                cidade_origem = @cidade_origem,
                estado_origem = @estado_origem,
                cargo = @cargo,
                auxiliar_trabalho = @auxiliar_trabalho,
                auxiliar_trabalho_detalhes = @auxiliar_trabalho_detalhes,
                diacono = @diacono,
                diacono_detalhes = @diacono_detalhes,
                presbitero = @presbitero,
                presbitero_detalhes = @presbitero_detalhes,
                evangelista = @evangelista,
                evangelista_detalhes = @evangelista_detalhes,
                pastor = @pastor,
                pastor_detalhes = @pastor_detalhes,
                departamentos = @departamentos,
                celulas = @celulas,
                dons_ministeriais = @dons_ministeriais,
                nome_pai = @nome_pai,
                nome_mae = @nome_mae,
                nome_conjuge = @nome_conjuge,
                certidao_casamento = @certidao_casamento,
                data_casamento = @data_casamento,
                livro_casamento = @livro_casamento,
                folha_casamento = @folha_casamento,
                filhos = @filhos,
                observacoes = @observacoes,
                dados_extras = @dados_extras,
                congregacao_id = @congregacao_id,
                updated_at = datetime('now')
             WHERE id = @_id AND igreja_id = @_igrejaId`,
            ).run({
                numero_membro: numero_membro || null,
                nome_completo,
                nome_social: nome_social || null,
                tipo_cadastro: tipo_cadastro || null,
                data_nascimento: data_nascimento || null,
                sexo: sexo || null,
                estado_civil: estado_civil || null,
                nacionalidade: nacionalidade || "Brasileira",
                outra_nacionalidade: outra_nacionalidade || null,
                cidade_nascimento: cidade_nascimento || null,
                estado_nascimento: estado_nascimento || null,
                naturalidade: naturalidade || null,
                doador_sangue: doador_sangue ? 1 : 0,
                tipo_sangue: tipo_sangue || null,
                cpf: cpf || null,
                rg: rg || null,
                rg_orgao: rg_orgao || null,
                rg_uf: rg_uf || null,
                titulo_eleitor: titulo_eleitor || null,
                zona_eleitoral: zona_eleitoral || null,
                secao_eleitoral: secao_eleitoral || null,
                email: email || null,
                telefone: telefone || null,
                celular,
                whatsapp: whatsapp || null,
                cep: cep || null,
                endereco_completo: endereco_completo || null,
                logradouro: logradouro || null,
                numero: numero || null,
                complemento: complemento || null,
                bairro: bairro || null,
                cidade: cidade || null,
                estado: estado || null,
                profissao: profissao || null,
                empresa_trabalho: empresa_trabalho || null,
                escolaridade: escolaridade || null,
                graduacao: graduacao || null,
                data_conversao: data_conversao || null,
                data_ingresso: data_ingresso || null,
                data_entrada_igreja: data_entrada_igreja || new Date().toISOString().split("T")[0],
                forma_entrada: forma_entrada || null,
                situacao: situacao || "ativo",
                data_batismo: data_batismo || null,
                data_batismo_agua: data_batismo_agua || null,
                cidade_batismo: cidade_batismo || null,
                estado_batismo: estado_batismo || null,
                ano_batismo_espirito_santo: ano_batismo_espirito_santo || null,
                denominacao_origem: denominacao_origem || null,
                data_mudanca_denominacao: data_mudanca_denominacao || null,
                veio_outra_assembleia: veio_outra_assembleia ? 1 : 0,
                data_mudanca: data_mudanca || null,
                cidade_origem: cidade_origem || null,
                estado_origem: estado_origem || null,
                cargo: cargo || null,
                auxiliar_trabalho: auxiliar_trabalho ? 1 : 0,
                auxiliar_trabalho_detalhes: auxiliar_trabalho_detalhes || null,
                diacono: diacono ? 1 : 0,
                diacono_detalhes: diacono_detalhes || null,
                presbitero: presbitero ? 1 : 0,
                presbitero_detalhes: presbitero_detalhes || null,
                evangelista: evangelista ? 1 : 0,
                evangelista_detalhes: evangelista_detalhes || null,
                pastor: pastor ? 1 : 0,
                pastor_detalhes: pastor_detalhes || null,
                departamentos: JSON.stringify(Array.isArray(departamentos) ? departamentos : []),
                celulas: JSON.stringify(Array.isArray(celulas) ? celulas : []),
                dons_ministeriais: JSON.stringify(Array.isArray(dons_ministeriais) ? dons_ministeriais : []),
                nome_pai: nome_pai || null,
                nome_mae: nome_mae || null,
                nome_conjuge: nome_conjuge || null,
                certidao_casamento: certidao_casamento || null,
                data_casamento: data_casamento || null,
                livro_casamento: livro_casamento || null,
                folha_casamento: folha_casamento || null,
                filhos: JSON.stringify(Array.isArray(filhos) ? filhos : []),
                observacoes: observacoes || null,
                dados_extras: JSON.stringify(dados_extras || {}),
                congregacao_id: congregacao_id || null,
                _id: req.params.id,
                _igrejaId: req.igreja.id,
            });

            // Retorna o membro atualizado para o cliente atualizar o cache diretamente
            const membroAtualizado = db
                .prepare(
                    `SELECT m.*, c.nome AS congregacao_nome
                 FROM membros m
                 LEFT JOIN congregacoes c ON c.id = m.congregacao_id
                 WHERE m.id = ? AND m.igreja_id = ?`,
                )
                .get(req.params.id, req.igreja.id);

            ["departamentos", "celulas", "dons_ministeriais", "filhos"].forEach((f) => {
                try {
                    membroAtualizado[f] = JSON.parse(membroAtualizado[f] || "[]");
                } catch {
                    membroAtualizado[f] = [];
                }
            });
            try {
                membroAtualizado.dados_extras = JSON.parse(membroAtualizado.dados_extras || "{}");
            } catch {
                membroAtualizado.dados_extras = {};
            }

            res.json(membroAtualizado);
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /api/membros/:id/foto ───────────────────────────────────────────
router.post("/:id/foto", upload.single("foto"), validarMimeReal, (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
        const db = getDb();
        const membro = db.prepare("SELECT foto_url FROM membros WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!membro) return res.status(404).json({ error: "Membro não encontrado" });

        // Remove foto antiga
        if (membro.foto_url) {
            const old = path.join(__dirname, "../../", membro.foto_url);
            if (fs.existsSync(old)) fs.unlinkSync(old);
        }

        const fotoUrl = `/uploads/fotos/${req.file.filename}`;
        db.prepare("UPDATE membros SET foto_url = ?, carteira_gerada = 0, updated_at = datetime('now') WHERE id = ?").run(fotoUrl, req.params.id);
        res.json({ foto_url: fotoUrl });
    } catch (err) {
        next(err);
    }
});

// ─── PATCH /api/membros/:id/situacao ─────────────────────────────────────
router.patch("/:id/situacao", [body("situacao").isIn(["ativo", "inativo", "transferido", "falecido", "disciplina"])], (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
        const db = getDb();
        db.prepare(
            "UPDATE membros SET situacao = ?, data_saida = ?, motivo_saida = ?, updated_at = datetime('now') WHERE id = ? AND igreja_id = ?",
        ).run(req.body.situacao, req.body.data_saida || null, req.body.motivo_saida || null, req.params.id, req.igreja.id);
        res.json({ message: "Situação atualizada" });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/membros/:id ─────────────────────────────────────────────
router.delete("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const membro = db.prepare("SELECT foto_url FROM membros WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!membro) return res.status(404).json({ error: "Membro não encontrado" });
        if (membro.foto_url) {
            const p = path.join(__dirname, "../../", membro.foto_url);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        // Remover referências FK antes de excluir para evitar FOREIGN KEY constraint failed
        db.prepare("UPDATE pre_cadastros SET membro_id = NULL WHERE membro_id = ?").run(req.params.id);
        db.prepare("UPDATE departamentos SET lider_id = NULL WHERE lider_id = ?").run(req.params.id);
        db.prepare("UPDATE celulas SET lider_id = NULL WHERE lider_id = ?").run(req.params.id);
        db.prepare("DELETE FROM membros WHERE id = ? AND igreja_id = ?").run(req.params.id, req.igreja.id);
        res.json({ message: "Membro removido" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
