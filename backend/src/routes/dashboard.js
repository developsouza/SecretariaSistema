const router = require("express").Router();
const { getDb } = require("../database/db");
const { authMiddleware, assinaturaAtiva } = require("../middlewares/auth");

router.use(authMiddleware);
router.use(assinaturaAtiva);

// ─── GET /api/dashboard/resumo ────────────────────────────────────────────
router.get("/resumo", (req, res, next) => {
    try {
        const db = getDb();
        const igrejaId = req.igreja.id;

        const totalMembros = db.prepare("SELECT COUNT(*) AS c FROM membros WHERE igreja_id=? AND situacao='ativo'").get(igrejaId)?.c || 0;
        const preCadastrosPendentes =
            db.prepare("SELECT COUNT(*) AS c FROM pre_cadastros WHERE igreja_id=? AND status='pendente'").get(igrejaId)?.c || 0;
        const totalInativos = db.prepare("SELECT COUNT(*) AS c FROM membros WHERE igreja_id=? AND situacao='inativo'").get(igrejaId)?.c || 0;
        const totalHoje = db.prepare("SELECT COUNT(*) AS c FROM membros WHERE igreja_id=? AND date(created_at)=date('now')").get(igrejaId)?.c || 0;
        const totalMes =
            db
                .prepare("SELECT COUNT(*) AS c FROM membros WHERE igreja_id=? AND strftime('%Y-%m',data_entrada_igreja)=strftime('%Y-%m','now')")
                .get(igrejaId)?.c || 0;
        const totalCarteiras = db.prepare("SELECT COUNT(*) AS c FROM membros WHERE igreja_id=? AND carteira_gerada=1").get(igrejaId)?.c || 0;
        const semFoto =
            db.prepare("SELECT COUNT(*) AS c FROM membros WHERE igreja_id=? AND foto_url IS NULL AND situacao='ativo'").get(igrejaId)?.c || 0;

        // Membros por situação
        const porSituacao = db
            .prepare(
                `
      SELECT situacao, COUNT(*) AS total FROM membros WHERE igreja_id=? GROUP BY situacao
    `,
            )
            .all(igrejaId);

        // Membros por cargo
        const porCargo = db
            .prepare(
                `
      SELECT COALESCE(cargo,'Sem cargo') AS cargo, COUNT(*) AS total FROM membros WHERE igreja_id=? AND situacao='ativo' GROUP BY cargo ORDER BY total DESC LIMIT 10
    `,
            )
            .all(igrejaId);

        // Cadastros por mês (últimos 12 meses)
        const cadastrosMes = db
            .prepare(
                `
      SELECT strftime('%Y-%m', data_entrada_igreja) AS mes, COUNT(*) AS total
      FROM membros WHERE igreja_id=? AND data_entrada_igreja >= date('now','-12 months')
      GROUP BY mes ORDER BY mes
    `,
            )
            .all(igrejaId);

        // Faixa etária
        const faixaEtaria = db
            .prepare(
                `
      SELECT
        CASE
          WHEN CAST((julianday('now') - julianday(data_nascimento)) / 365.25 AS INT) < 12 THEN 'Criança (0-11)'
          WHEN CAST((julianday('now') - julianday(data_nascimento)) / 365.25 AS INT) < 18 THEN 'Adolescente (12-17)'
          WHEN CAST((julianday('now') - julianday(data_nascimento)) / 365.25 AS INT) < 35 THEN 'Jovem (18-34)'
          WHEN CAST((julianday('now') - julianday(data_nascimento)) / 365.25 AS INT) < 60 THEN 'Adulto (35-59)'
          ELSE 'Sênior (60+)'
        END AS faixa, COUNT(*) AS total
      FROM membros WHERE igreja_id=? AND data_nascimento IS NOT NULL AND situacao='ativo'
      GROUP BY faixa ORDER BY total DESC
    `,
            )
            .all(igrejaId);

        // Últimos cadastros
        const ultimosCadastros = db
            .prepare(
                `
      SELECT id, nome_completo, foto_url, situacao, cargo, created_at
      FROM membros WHERE igreja_id=? ORDER BY created_at DESC LIMIT 5
    `,
            )
            .all(igrejaId);

        res.json({
            totais: {
                membros_ativos: totalMembros,
                inativos: totalInativos,
                cadastros_hoje: totalHoje,
                cadastros_mes: totalMes,
                carteiras_geradas: totalCarteiras,
                sem_foto: semFoto,
                pre_cadastros_pendentes: preCadastrosPendentes,
                limite: req.igreja.limite_membros,
            },
            por_situacao: porSituacao,
            por_cargo: porCargo,
            cadastros_por_mes: cadastrosMes,
            faixa_etaria: faixaEtaria,
            ultimos_cadastros: ultimosCadastros,
        });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/dashboard/relatorio-membros ────────────────────────────────
router.get("/relatorio-membros", (req, res, next) => {
    try {
        const db = getDb();
        const { situacao, cargo, sexo, estado_civil, de, ate } = req.query;

        let where = "WHERE m.igreja_id = @igrejaId";
        const params = { igrejaId: req.igreja.id };

        if (situacao) {
            where += " AND m.situacao = @situacao";
            params.situacao = situacao;
        }
        if (cargo) {
            where += " AND m.cargo LIKE @cargo";
            params.cargo = `%${cargo}%`;
        }
        if (sexo) {
            where += " AND m.sexo = @sexo";
            params.sexo = sexo;
        }
        if (estado_civil) {
            where += " AND m.estado_civil = @estado_civil";
            params.estado_civil = estado_civil;
        }
        if (de) {
            where += " AND m.data_entrada_igreja >= @de";
            params.de = de;
        }
        if (ate) {
            where += " AND m.data_entrada_igreja <= @ate";
            params.ate = ate;
        }

        const membros = db
            .prepare(
                `
      SELECT m.numero_membro, m.nome_completo, m.celular, m.email, m.situacao, m.cargo,
             m.tipo_cadastro, m.data_ingresso, m.data_entrada_igreja, m.data_nascimento,
             m.cidade_nascimento, m.estado_nascimento, m.cidade, m.estado, m.bairro,
             m.sexo, m.estado_civil, m.cpf, m.rg,
             m.profissao, m.empresa_trabalho, m.escolaridade, m.graduacao,
             m.data_batismo_agua, m.data_batismo, m.ano_batismo_espirito_santo, m.cidade_batismo,
             m.denominacao_origem, m.doador_sangue, m.tipo_sangue,
             m.nome_pai, m.nome_mae, m.nome_conjuge
      FROM membros m ${where} ORDER BY m.nome_completo
    `,
            )
            .all(params);

        res.json({ total: membros.length, membros });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/dashboard/aniversariantes ──────────────────────────────────
router.get("/aniversariantes", (req, res, next) => {
    try {
        const db = getDb();
        const igrejaId = req.igreja.id;
        // mês da consulta (1-12), padrão = mês atual
        const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
        const mesPad = String(mes).padStart(2, "0");

        const aniversariantes = db
            .prepare(
                `
      SELECT id, nome_completo, foto_url, cargo, situacao, celular, email,
             data_nascimento,
             strftime('%d', data_nascimento) AS dia,
             strftime('%m', data_nascimento) AS mes_nasc
      FROM membros
      WHERE igreja_id = ?
        AND situacao = 'ativo'
        AND data_nascimento IS NOT NULL
        AND strftime('%m', data_nascimento) = ?
      ORDER BY strftime('%d', data_nascimento)
    `,
            )
            .all(igrejaId, mesPad);

        // Aniversariantes de hoje
        const hoje = db
            .prepare(
                `
      SELECT id, nome_completo, foto_url, cargo, celular, email, data_nascimento
      FROM membros
      WHERE igreja_id = ?
        AND situacao = 'ativo'
        AND data_nascimento IS NOT NULL
        AND strftime('%m-%d', data_nascimento) = strftime('%m-%d', 'now')
      ORDER BY nome_completo
    `,
            )
            .all(igrejaId);

        // Próximos 7 dias (excluindo hoje)
        const proximos = db
            .prepare(
                `
      SELECT id, nome_completo, foto_url, cargo, celular, email, data_nascimento,
             strftime('%m-%d', data_nascimento) AS dia_mes
      FROM membros
      WHERE igreja_id = ?
        AND situacao = 'ativo'
        AND data_nascimento IS NOT NULL
        AND strftime('%m-%d', data_nascimento) > strftime('%m-%d', 'now')
        AND strftime('%m-%d', data_nascimento) <= strftime('%m-%d', datetime('now', '+7 days'))
      ORDER BY strftime('%m-%d', data_nascimento)
      LIMIT 10
    `,
            )
            .all(igrejaId);

        res.json({ aniversariantes, hoje, proximos, mes });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/dashboard/aniversariantes/semana ────────────────────────────
// Retorna todos os aniversariantes dos 7 dias da semana corrente (Dom–Sáb)
router.get("/aniversariantes/semana", (req, res, next) => {
    try {
        const db = getDb();
        const igrejaId = req.igreja.id;

        const hoje = new Date();
        const diaDaSemana = hoje.getDay(); // 0 = Dom
        const inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - diaDaSemana);

        // Monta array de { data, mmdd } para os 7 dias
        const dias = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(inicio);
            d.setDate(inicio.getDate() + i);
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            dias.push({ data: d.toISOString().slice(0, 10), mmdd: `${mm}-${dd}` });
        }

        const lista = [];
        dias.forEach(({ data, mmdd }) => {
            const membros = db
                .prepare(
                    `SELECT id, nome_completo, foto_url, cargo, celular, email, data_nascimento
                     FROM membros
                     WHERE igreja_id = ?
                       AND situacao = 'ativo'
                       AND data_nascimento IS NOT NULL
                       AND strftime('%m-%d', data_nascimento) = ?
                     ORDER BY nome_completo`,
                )
                .all(igrejaId, mmdd);
            membros.forEach((m) => lista.push({ ...m, data_aniversario: data }));
        });

        res.json({ aniversariantes: lista, total: lista.length });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
