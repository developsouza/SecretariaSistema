const router = require("express").Router();
const { body, query, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../database/db");
const { authMiddleware, assinaturaAtiva } = require("../middlewares/auth");

router.use(authMiddleware);
router.use(assinaturaAtiva);

// ─── GET /api/congregacoes ────────────────────────────────────────────────
router.get("/", (req, res, next) => {
    try {
        const db = getDb();
        const congregacoes = db
            .prepare(
                `SELECT c.*, COUNT(m.id) AS total_membros
         FROM congregacoes c
         LEFT JOIN membros m ON m.congregacao_id = c.id AND m.situacao = 'ativo'
         WHERE c.igreja_id = ?
         GROUP BY c.id
         ORDER BY c.nome`,
            )
            .all(req.igreja.id);
        res.json(congregacoes);
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/congregacoes/:id ────────────────────────────────────────────
router.get("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const congregacao = db
            .prepare(
                `SELECT c.*, COUNT(m.id) AS total_membros
         FROM congregacoes c
         LEFT JOIN membros m ON m.congregacao_id = c.id AND m.situacao = 'ativo'
         WHERE c.id = ? AND c.igreja_id = ?
         GROUP BY c.id`,
            )
            .get(req.params.id, req.igreja.id);
        if (!congregacao) return res.status(404).json({ error: "Congregação não encontrada" });
        res.json(congregacao);
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/congregacoes/:id/membros ────────────────────────────────────
router.get(
    "/:id/membros",
    [
        query("pagina").optional().isInt({ min: 1 }),
        query("limite").optional().isInt({ min: 1, max: 100 }),
        query("busca").optional().trim(),
        query("situacao").optional().isIn(["ativo", "inativo", "transferido", "falecido", "disciplina", ""]),
        query("cargo").optional().trim(),
    ],
    (req, res, next) => {
        try {
            const db = getDb();

            // Verifica que a congregação pertence à igreja
            const congr = db.prepare("SELECT id FROM congregacoes WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
            if (!congr) return res.status(404).json({ error: "Congregação não encontrada" });

            const pagina = parseInt(req.query.pagina) || 1;
            const limite = parseInt(req.query.limite) || 20;
            const offset = (pagina - 1) * limite;
            const busca = req.query.busca || "";
            const situacao = req.query.situacao || "";
            const cargo = req.query.cargo || "";

            let where = "WHERE m.congregacao_id = @congregacaoId";
            const params = { congregacaoId: req.params.id };

            if (busca) {
                where += " AND (m.nome_completo LIKE @busca OR m.celular LIKE @busca OR m.cpf LIKE @busca OR m.numero_membro LIKE @busca)";
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

            const total = db.prepare(`SELECT COUNT(*) AS c FROM membros m ${where}`).get(params)?.c || 0;
            const membros = db
                .prepare(
                    `SELECT m.id, m.numero_membro, m.nome_completo, m.celular, m.email,
                    m.situacao, m.cargo, m.foto_url, m.data_nascimento
             FROM membros m ${where}
             ORDER BY m.nome_completo
             LIMIT @limite OFFSET @offset`,
                )
                .all({ ...params, limite, offset });

            res.json({ membros, total, pagina, limite, total_paginas: Math.ceil(total / limite) });
        } catch (err) {
            next(err);
        }
    },
);

// ─── POST /api/congregacoes ───────────────────────────────────────────────
router.post("/", [body("nome").trim().isLength({ min: 2 }).withMessage("Nome obrigatório (mín. 2 caracteres)")], (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

        const db = getDb();
        const dup = db.prepare("SELECT id FROM congregacoes WHERE lower(nome) = lower(?) AND igreja_id = ?").get(req.body.nome.trim(), req.igreja.id);
        if (dup) return res.status(409).json({ error: "Já existe uma congregação com este nome" });

        const id = uuidv4();
        const {
            nome,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            dirigente_nome,
            dirigente_cargo,
            dirigente_celular,
            dirigente2_nome,
            dirigente2_cargo,
            dirigente2_celular,
            ativo,
        } = req.body;

        db.prepare(
            `INSERT INTO congregacoes (
          id, igreja_id, nome,
          cep, logradouro, numero, complemento, bairro, cidade, estado,
          dirigente_nome, dirigente_cargo, dirigente_celular,
          dirigente2_nome, dirigente2_cargo, dirigente2_celular,
          ativo
        ) VALUES (
          @id, @igrejaId, @nome,
          @cep, @logradouro, @numero, @complemento, @bairro, @cidade, @estado,
          @dirigente_nome, @dirigente_cargo, @dirigente_celular,
          @dirigente2_nome, @dirigente2_cargo, @dirigente2_celular,
          @ativo
        )`,
        ).run({
            id,
            igrejaId: req.igreja.id,
            nome: nome.trim(),
            cep: cep || null,
            logradouro: logradouro || null,
            numero: numero || null,
            complemento: complemento || null,
            bairro: bairro || null,
            cidade: cidade || null,
            estado: estado || null,
            dirigente_nome: dirigente_nome || null,
            dirigente_cargo: dirigente_cargo || null,
            dirigente_celular: dirigente_celular || null,
            dirigente2_nome: dirigente2_nome || null,
            dirigente2_cargo: dirigente2_cargo || null,
            dirigente2_celular: dirigente2_celular || null,
            ativo: ativo === false ? 0 : 1,
        });

        res.status(201).json({ id, message: "Congregação cadastrada com sucesso" });
    } catch (err) {
        next(err);
    }
});

// ─── PUT /api/congregacoes/:id ────────────────────────────────────────────
router.put("/:id", [body("nome").trim().isLength({ min: 2 }).withMessage("Nome obrigatório (mín. 2 caracteres)")], (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

        const db = getDb();
        const existe = db.prepare("SELECT id FROM congregacoes WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!existe) return res.status(404).json({ error: "Congregação não encontrada" });

        const dup = db
            .prepare("SELECT id FROM congregacoes WHERE lower(nome) = lower(?) AND igreja_id = ? AND id != ?")
            .get(req.body.nome.trim(), req.igreja.id, req.params.id);
        if (dup) return res.status(409).json({ error: "Já existe uma congregação com este nome" });

        const {
            nome,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            dirigente_nome,
            dirigente_cargo,
            dirigente_celular,
            dirigente2_nome,
            dirigente2_cargo,
            dirigente2_celular,
            ativo,
        } = req.body;

        db.prepare(
            `UPDATE congregacoes SET
          nome = @nome,
          cep = @cep, logradouro = @logradouro, numero = @numero,
          complemento = @complemento, bairro = @bairro, cidade = @cidade, estado = @estado,
          dirigente_nome = @dirigente_nome, dirigente_cargo = @dirigente_cargo,
          dirigente_celular = @dirigente_celular,
          dirigente2_nome = @dirigente2_nome, dirigente2_cargo = @dirigente2_cargo,
          dirigente2_celular = @dirigente2_celular,
          ativo = @ativo,
          updated_at = datetime('now')
        WHERE id = @id AND igreja_id = @igrejaId`,
        ).run({
            id: req.params.id,
            igrejaId: req.igreja.id,
            nome: nome.trim(),
            cep: cep || null,
            logradouro: logradouro || null,
            numero: numero || null,
            complemento: complemento || null,
            bairro: bairro || null,
            cidade: cidade || null,
            estado: estado || null,
            dirigente_nome: dirigente_nome || null,
            dirigente_cargo: dirigente_cargo || null,
            dirigente_celular: dirigente_celular || null,
            dirigente2_nome: dirigente2_nome || null,
            dirigente2_cargo: dirigente2_cargo || null,
            dirigente2_celular: dirigente2_celular || null,
            ativo: ativo === false ? 0 : 1,
        });

        res.json({ message: "Congregação atualizada com sucesso" });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/congregacoes/:id ─────────────────────────────────────────
router.delete("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const existe = db.prepare("SELECT id FROM congregacoes WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!existe) return res.status(404).json({ error: "Congregação não encontrada" });

        db.prepare("UPDATE membros SET congregacao_id = NULL WHERE congregacao_id = ?").run(req.params.id);
        db.prepare("DELETE FROM congregacoes WHERE id = ? AND igreja_id = ?").run(req.params.id, req.igreja.id);

        res.json({ message: "Congregação removida com sucesso" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

router.use(authMiddleware);
router.use(assinaturaAtiva);

// ─── GET /api/congregacoes ────────────────────────────────────────────────
// Lista todas as congregações da igreja (incluindo total de membros)
router.get("/", (req, res, next) => {
    try {
        const db = getDb();
        const congregacoes = db
            .prepare(
                `
        SELECT
          c.*,
          COUNT(m.id) AS total_membros
        FROM congregacoes c
        LEFT JOIN membros m ON m.congregacao_id = c.id AND m.situacao = 'ativo'
        WHERE c.igreja_id = ?
        GROUP BY c.id
        ORDER BY c.nome
      `,
            )
            .all(req.igreja.id);
        res.json(congregacoes);
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/congregacoes/:id ────────────────────────────────────────────
router.get("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const congregacao = db
            .prepare(
                `
        SELECT c.*, COUNT(m.id) AS total_membros
        FROM congregacoes c
        LEFT JOIN membros m ON m.congregacao_id = c.id AND m.situacao = 'ativo'
        WHERE c.id = ? AND c.igreja_id = ?
        GROUP BY c.id
      `,
            )
            .get(req.params.id, req.igreja.id);
        if (!congregacao) return res.status(404).json({ error: "Congregação não encontrada" });
        res.json(congregacao);
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/congregacoes ───────────────────────────────────────────────
router.post("/", [body("nome").trim().isLength({ min: 2 }).withMessage("Nome obrigatório (mín. 2 caracteres)")], (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

        const db = getDb();

        // Verifica nome duplicado dentro da mesma igreja
        const dup = db.prepare("SELECT id FROM congregacoes WHERE lower(nome) = lower(?) AND igreja_id = ?").get(req.body.nome.trim(), req.igreja.id);
        if (dup) return res.status(409).json({ error: "Já existe uma congregação com este nome" });

        const id = uuidv4();
        const { nome, cep, logradouro, numero, complemento, bairro, cidade, estado, dirigente_nome, dirigente_cargo, dirigente_celular, ativo } =
            req.body;

        db.prepare(
            `INSERT INTO congregacoes (
          id, igreja_id, nome,
          cep, logradouro, numero, complemento, bairro, cidade, estado,
          dirigente_nome, dirigente_cargo, dirigente_celular,
          ativo
        ) VALUES (
          @id, @igrejaId, @nome,
          @cep, @logradouro, @numero, @complemento, @bairro, @cidade, @estado,
          @dirigente_nome, @dirigente_cargo, @dirigente_celular,
          @ativo
        )`,
        ).run({
            id,
            igrejaId: req.igreja.id,
            nome: nome.trim(),
            cep: cep || null,
            logradouro: logradouro || null,
            numero: numero || null,
            complemento: complemento || null,
            bairro: bairro || null,
            cidade: cidade || null,
            estado: estado || null,
            dirigente_nome: dirigente_nome || null,
            dirigente_cargo: dirigente_cargo || null,
            dirigente_celular: dirigente_celular || null,
            ativo: ativo === false ? 0 : 1,
        });

        res.status(201).json({ id, message: "Congregação cadastrada com sucesso" });
    } catch (err) {
        next(err);
    }
});

// ─── PUT /api/congregacoes/:id ────────────────────────────────────────────
router.put("/:id", [body("nome").trim().isLength({ min: 2 }).withMessage("Nome obrigatório (mín. 2 caracteres)")], (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

        const db = getDb();
        const existe = db.prepare("SELECT id FROM congregacoes WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!existe) return res.status(404).json({ error: "Congregação não encontrada" });

        // Verifica nome duplicado (exceto o próprio)
        const dup = db
            .prepare("SELECT id FROM congregacoes WHERE lower(nome) = lower(?) AND igreja_id = ? AND id != ?")
            .get(req.body.nome.trim(), req.igreja.id, req.params.id);
        if (dup) return res.status(409).json({ error: "Já existe uma congregação com este nome" });

        const { nome, cep, logradouro, numero, complemento, bairro, cidade, estado, dirigente_nome, dirigente_cargo, dirigente_celular, ativo } =
            req.body;

        db.prepare(
            `UPDATE congregacoes SET
          nome = @nome,
          cep = @cep, logradouro = @logradouro, numero = @numero,
          complemento = @complemento, bairro = @bairro, cidade = @cidade, estado = @estado,
          dirigente_nome = @dirigente_nome, dirigente_cargo = @dirigente_cargo,
          dirigente_celular = @dirigente_celular,
          ativo = @ativo,
          updated_at = datetime('now')
        WHERE id = @id AND igreja_id = @igrejaId`,
        ).run({
            id: req.params.id,
            igrejaId: req.igreja.id,
            nome: nome.trim(),
            cep: cep || null,
            logradouro: logradouro || null,
            numero: numero || null,
            complemento: complemento || null,
            bairro: bairro || null,
            cidade: cidade || null,
            estado: estado || null,
            dirigente_nome: dirigente_nome || null,
            dirigente_cargo: dirigente_cargo || null,
            dirigente_celular: dirigente_celular || null,
            ativo: ativo === false ? 0 : 1,
        });

        res.json({ message: "Congregação atualizada com sucesso" });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/congregacoes/:id ─────────────────────────────────────────
router.delete("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const existe = db.prepare("SELECT id FROM congregacoes WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!existe) return res.status(404).json({ error: "Congregação não encontrada" });

        // Desvincula membros antes de excluir
        db.prepare("UPDATE membros SET congregacao_id = NULL WHERE congregacao_id = ?").run(req.params.id);
        db.prepare("DELETE FROM congregacoes WHERE id = ? AND igreja_id = ?").run(req.params.id, req.igreja.id);

        res.json({ message: "Congregação removida com sucesso" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
