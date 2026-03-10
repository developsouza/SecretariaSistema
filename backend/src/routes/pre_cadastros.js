const router = require("express").Router();
const { body, query, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const { getDb } = require("../database/db");
const { authMiddleware, assinaturaAtiva } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

// ─── Helper: enviar e-mail de rejeição ────────────────────────────────────────
async function enviarEmailRejeicao({ destinatario, nomeDestino, nomeIgreja, motivo, linkReCadastro }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[PreCadastro] SMTP não configurado. E-mail de rejeição para ${destinatario} não enviado.`);
        return false;
    }
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
        from: `"${nomeIgreja}" <${process.env.SMTP_USER}>`,
        to: destinatario,
        subject: `Seu pré-cadastro em ${nomeIgreja} precisa de atenção`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
            <p style="font-size:36px;margin:0;">📋</p>
            <h1 style="color:#fff;margin:8px 0 4px;font-size:22px;">Pré-Cadastro Incompleto</h1>
            <p style="color:#c7d2fe;margin:0;font-size:13px;">${nomeIgreja}</p>
          </div>
          <div style="padding:28px 24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Olá, <strong>${nomeDestino}</strong>!<br/><br/>
              Recebemos sua solicitação de pré-cadastro em <strong>${nomeIgreja}</strong>, 
              mas precisamos que você nos forneça algumas informações adicionais ou corrija os dados enviados.
            </p>
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:16px 20px;margin:20px 0;">
              <p style="color:#92400e;font-size:14px;font-weight:700;margin:0 0 8px;">Motivo / Dados necessários:</p>
              <p style="color:#78350f;font-size:14px;line-height:1.6;margin:0;">${motivo}</p>
            </div>
            <p style="color:#374151;font-size:14px;line-height:1.6;">
              Por favor, acesse o link abaixo e preencha seu cadastro novamente com as informações corrigidas:
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${linkReCadastro}"
                 style="display:inline-block;background:#1a56db;color:#fff;font-weight:700;
                        font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Refazer Pré-Cadastro
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.5;">
              Se tiver dúvidas, entre em contato diretamente com a secretaria da igreja.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
              ${nomeIgreja} · Sistema de Gestão de Membros
            </p>
          </div>
        </div>`,
    });
    return true;
}

// ─── Helper: gerar número de membro ──────────────────────────────────────────
function gerarNumeroMembro(igrejaId, db) {
    const rows = db.prepare("SELECT numero_membro FROM membros WHERE igreja_id = ?").all(igrejaId);
    let max = 0;
    for (const row of rows) {
        const match = (row.numero_membro || "").match(/(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > max) max = num;
        }
    }
    return String(max + 1);
}

// ─── Helpers de formatação de máscara ─────────────────────────────────────────
function formatarTelefone(v) {
    if (!v) return v;
    const digits = String(v).replace(/\D/g, "").slice(0, 11);
    if (!digits) return v;
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function formatarCPF(v) {
    if (!v) return v;
    const digits = String(v).replace(/\D/g, "").slice(0, 11);
    if (!digits) return v;
    return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatarCEP(v) {
    if (!v) return v;
    const digits = String(v).replace(/\D/g, "").slice(0, 8);
    if (!digits) return v;
    return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

// ─── Rotas protegidas (admin) ─────────────────────────────────────────────────
router.use(authMiddleware);
router.use(assinaturaAtiva);

// ─── GET /api/pre-cadastros ───────────────────────────────────────────────────
router.get(
    "/",
    [
        query("pagina").optional().isInt({ min: 1 }),
        query("limite").optional().isInt({ min: 1, max: 100 }),
        query("status").optional().isIn(["pendente", "aprovado", "rejeitado", ""]),
        query("busca").optional().trim(),
    ],
    (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const db = getDb();
            const pagina = parseInt(req.query.pagina) || 1;
            const limite = parseInt(req.query.limite) || 20;
            const offset = (pagina - 1) * limite;
            const status = req.query.status ?? "pendente";
            const busca = req.query.busca || "";

            let where = "WHERE igreja_id = @igrejaId";
            const params = { igrejaId: req.igreja.id };

            if (status) {
                where += " AND status = @status";
                params.status = status;
            }
            if (busca) {
                where += " AND (nome_completo LIKE @busca OR celular LIKE @busca OR email LIKE @busca OR cpf LIKE @busca)";
                params.busca = `%${busca}%`;
            }

            const total = db.prepare(`SELECT COUNT(*) AS c FROM pre_cadastros ${where}`).get(params)?.c || 0;
            const registros = db
                .prepare(
                    `SELECT id, nome_completo, email, celular, cpf, sexo, data_nascimento,
                            estado_civil, cargo, forma_entrada, cidade, estado,
                            status, motivo_rejeicao, foto_url, created_at, updated_at
                     FROM pre_cadastros ${where}
                     ORDER BY created_at DESC
                     LIMIT @limite OFFSET @offset`,
                )
                .all({ ...params, limite, offset });

            res.json({ registros, total, pagina, limite, total_paginas: Math.ceil(total / limite) });
        } catch (err) {
            next(err);
        }
    },
);

// ─── GET /api/pre-cadastros/:id ───────────────────────────────────────────────
router.get("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const registro = db.prepare("SELECT * FROM pre_cadastros WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!registro) return res.status(404).json({ error: "Pré-cadastro não encontrado" });
        res.json(registro);
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/pre-cadastros/:id/aprovar ─────────────────────────────────────
router.post("/:id/aprovar", (req, res, next) => {
    try {
        const db = getDb();
        const registro = db
            .prepare("SELECT * FROM pre_cadastros WHERE id = ? AND igreja_id = ? AND status = 'pendente'")
            .get(req.params.id, req.igreja.id);
        if (!registro) return res.status(404).json({ error: "Pré-cadastro não encontrado ou já processado" });

        // Criar o membro a partir dos dados do pré-cadastro
        const membroId = uuidv4();
        const numeroMembro = gerarNumeroMembro(req.igreja.id, db);
        const agora = new Date().toISOString();

        // Garante que celular nunca seja null (campo NOT NULL em membros)
        const celularFormatado = formatarTelefone(registro.celular) || registro.celular || "";
        if (!celularFormatado) {
            return res.status(422).json({ error: "O pré-cadastro não possui celular válido para criar o membro." });
        }

        // Executa INSERT + UPDATE dentro de uma transação atômica
        const aprovar = db.transaction(() => {
            db.prepare(
                `
                INSERT INTO membros (
                    id, igreja_id, numero_membro, nome_completo, data_nascimento, sexo, estado_civil,
                    cpf, rg, rg_orgao, email, celular, whatsapp, telefone,
                    cep, logradouro, numero, complemento, bairro, cidade, estado,
                    cidade_nascimento, estado_nascimento,
                    forma_entrada, data_entrada_igreja, data_batismo, data_batismo_agua,
                    data_conversao, denominacao_origem,
                    cargo, observacoes, foto_url, situacao, created_at, updated_at
                ) VALUES (
                    @id, @igrejaId, @numeroMembro, @nomeCompleto, @dataNascimento, @sexo, @estadoCivil,
                    @cpf, @rg, @rgOrgao, @email, @celular, @whatsapp, @telefone,
                    @cep, @logradouro, @numero, @complemento, @bairro, @cidade, @estado,
                    @cidadeNascimento, @estadoNascimento,
                    @formaEntrada, @dataEntradaIgreja, @dataBatismo, @dataBatismoAgua,
                    @dataConversao, @denominacaoOrigem,
                    @cargo, @observacoes, @fotoUrl, 'ativo', @agora, @agora
                )
            `,
            ).run({
                id: membroId,
                igrejaId: req.igreja.id,
                numeroMembro,
                nomeCompleto: registro.nome_completo,
                dataNascimento: registro.data_nascimento || null,
                sexo: registro.sexo || null,
                estadoCivil: registro.estado_civil || null,
                cpf: formatarCPF(registro.cpf) || null,
                rg: registro.rg || null,
                rgOrgao: registro.rg_orgao || null,
                email: registro.email || null,
                celular: celularFormatado,
                whatsapp: formatarTelefone(registro.whatsapp || registro.celular) || celularFormatado,
                telefone: formatarTelefone(registro.telefone) || null,
                cep: formatarCEP(registro.cep) || null,
                logradouro: registro.logradouro || null,
                numero: registro.numero || null,
                complemento: registro.complemento || null,
                bairro: registro.bairro || null,
                cidade: registro.cidade || null,
                estado: registro.estado || null,
                cidadeNascimento: registro.cidade_nascimento || null,
                estadoNascimento: registro.estado_nascimento || null,
                formaEntrada: registro.forma_entrada || "conversão",
                dataEntradaIgreja: agora.slice(0, 10),
                dataBatismo: registro.data_batismo_agua || null,
                dataBatismoAgua: registro.data_batismo_agua || null,
                dataConversao: registro.data_conversao || null,
                denominacaoOrigem: registro.denominacao_origem || null,
                cargo: registro.cargo || "Membro",
                observacoes: registro.observacoes || null,
                fotoUrl: registro.foto_url || null,
                agora,
            });

            db.prepare(
                "UPDATE pre_cadastros SET status = 'aprovado', aprovado_por = ?, aprovado_em = ?, membro_id = ?, updated_at = ? WHERE id = ?",
            ).run(req.user.id, agora, membroId, agora, req.params.id);
        });

        aprovar();

        res.json({ ok: true, membro_id: membroId, numero_membro: numeroMembro });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/pre-cadastros/:id/rejeitar ────────────────────────────────────
router.post("/:id/rejeitar", [body("motivo").trim().notEmpty().withMessage("Informe o motivo da rejeição")], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const db = getDb();
        const registro = db
            .prepare("SELECT * FROM pre_cadastros WHERE id = ? AND igreja_id = ? AND status = 'pendente'")
            .get(req.params.id, req.igreja.id);
        if (!registro) return res.status(404).json({ error: "Pré-cadastro não encontrado ou já processado" });

        const agora = new Date().toISOString();
        db.prepare(
            "UPDATE pre_cadastros SET status = 'rejeitado', motivo_rejeicao = ?, rejeitado_por = ?, rejeitado_em = ?, updated_at = ? WHERE id = ?",
        ).run(req.body.motivo, req.user.id, agora, agora, req.params.id);

        // Enviar e-mail de rejeição se o solicitante tiver e-mail
        let emailEnviado = false;
        if (registro.email) {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            const linkReCadastro = `${frontendUrl}/pre-cadastro/${req.igreja.slug}`;
            try {
                emailEnviado = await enviarEmailRejeicao({
                    destinatario: registro.email,
                    nomeDestino: registro.nome_completo,
                    nomeIgreja: req.igreja.nome,
                    motivo: req.body.motivo,
                    linkReCadastro,
                });
            } catch (emailErr) {
                console.error("[PreCadastro] Erro ao enviar e-mail de rejeição:", emailErr.message);
            }
        }

        res.json({ ok: true, email_enviado: emailEnviado });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
