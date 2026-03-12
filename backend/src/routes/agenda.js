const router = require("express").Router();
const nodemailer = require("nodemailer");
const { getDb } = require("../database/db");
const { authMiddleware, assinaturaAtiva } = require("../middlewares/auth");

router.use(authMiddleware);
router.use(assinaturaAtiva);

// ─── Helpers ──────────────────────────────────────────────────────────────
function validarTipo(tipo) {
    return tipo === "pastoral" || tipo === "evento";
}

function escaparIcs(str) {
    if (!str) return "";
    return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function dobrarLinhaIcs(linha) {
    if (Buffer.byteLength(linha, "utf8") <= 75) return linha;
    const resultado = [linha.slice(0, 75)];
    let i = 75;
    while (i < linha.length) {
        resultado.push(" " + linha.slice(i, i + 74));
        i += 74;
    }
    return resultado.join("\r\n");
}

// ─── GET /api/agenda?tipo=pastoral&mes=2026-03 ─────────────────────────────
// Lista eventos do mês/tipo especificado
router.get("/", (req, res, next) => {
    try {
        const db = getDb();
        const { tipo, mes, data_inicio, data_fim } = req.query;

        let where = "WHERE e.igreja_id = ?";
        const params = [req.igreja.id];

        if (tipo && validarTipo(tipo)) {
            where += " AND e.tipo = ?";
            params.push(tipo);
        }

        // Filtro por mês (YYYY-MM) ou por intervalo explícito
        if (mes) {
            where += " AND strftime('%Y-%m', e.data_inicio) = ?";
            params.push(mes);
        } else if (data_inicio && data_fim) {
            where += " AND e.data_inicio BETWEEN ? AND ?";
            params.push(data_inicio, data_fim);
        }

        const eventos = db
            .prepare(
                `SELECT e.*, u.nome AS criado_por_nome
         FROM agenda_eventos e
         LEFT JOIN usuarios u ON u.id = e.created_by
         ${where}
         ORDER BY e.data_inicio ASC, e.hora_inicio ASC`,
            )
            .all(...params);

        res.json({ eventos });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/agenda/exportar-ics?tipo=pastoral&mes=2026-03 ───────────────
// Gera arquivo .ics compatível com Google Calendar / Apple Calendar
router.get("/exportar-ics", (req, res, next) => {
    try {
        const db = getDb();
        const { tipo, mes } = req.query;

        let where = "WHERE e.igreja_id = ?";
        const params = [req.igreja.id];

        if (tipo && validarTipo(tipo)) {
            where += " AND e.tipo = ?";
            params.push(tipo);
        }
        if (mes) {
            where += " AND strftime('%Y-%m', e.data_inicio) = ?";
            params.push(mes);
        }

        const eventos = db.prepare(`SELECT * FROM agenda_eventos e ${where} ORDER BY e.data_inicio ASC, e.hora_inicio ASC`).all(...params);

        const pad = (n) => String(n).padStart(2, "0");
        const dtstamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

        const linhas = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Gestão Secretaria//Agenda//PT",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:Agenda - Gestão Secretaria",
            "X-WR-TIMEZONE:America/Sao_Paulo",
        ];

        for (const ev of eventos) {
            const uid = `${ev.id}@gestaosecretaria`;

            let dtstart, dtend;
            if (ev.dia_todo) {
                const inicioStr = ev.data_inicio.replace(/-/g, "");
                dtstart = `DTSTART;VALUE=DATE:${inicioStr}`;
                const dataFim = ev.data_fim || ev.data_inicio;
                const fim = new Date(dataFim + "T12:00:00");
                fim.setDate(fim.getDate() + 1);
                const fimStr = `${fim.getFullYear()}${pad(fim.getMonth() + 1)}${pad(fim.getDate())}`;
                dtend = `DTEND;VALUE=DATE:${fimStr}`;
            } else {
                const inicioStr = `${ev.data_inicio.replace(/-/g, "")}T${(ev.hora_inicio || "00:00").replace(":", "")}00`;
                dtstart = `DTSTART;TZID=America/Sao_Paulo:${inicioStr}`;
                const dataFim = ev.data_fim || ev.data_inicio;
                const horaFim = ev.hora_fim || ev.hora_inicio || "00:00";
                const fimStr = `${dataFim.replace(/-/g, "")}T${horaFim.replace(":", "")}00`;
                dtend = `DTEND;TZID=America/Sao_Paulo:${fimStr}`;
            }

            linhas.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${dtstamp}`, dtstart, dtend, dobrarLinhaIcs(`SUMMARY:${escaparIcs(ev.titulo)}`));
            if (ev.descricao) linhas.push(dobrarLinhaIcs(`DESCRIPTION:${escaparIcs(ev.descricao)}`));
            if (ev.local) linhas.push(dobrarLinhaIcs(`LOCATION:${escaparIcs(ev.local)}`));
            linhas.push("END:VEVENT");
        }

        linhas.push("END:VCALENDAR");

        const tipoLabel = tipo === "pastoral" ? "agenda-pastoral" : tipo === "evento" ? "eventos-igreja" : "agenda";
        const nomeArquivo = `${tipoLabel}-${mes || "todos"}.ics`;

        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
        res.send(linhas.join("\r\n"));
    } catch (err) {
        next(err);
    }
});

// ─── Helper: transporter de e-mail ────────────────────────────────────────
function criarTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
}

// ─── GET /api/agenda/solicitacoes ─────────────────────────────────────────
// Lista solicitações de agendamento da igreja (admin)
router.get("/solicitacoes", (req, res, next) => {
    try {
        const db = getDb();
        const status = req.query.status || "pendente";
        const solicitacoes = db
            .prepare(
                `SELECT s.*, u1.nome AS aprovado_por_nome, u2.nome AS reprovado_por_nome
                 FROM solicitacoes_agendamento s
                 LEFT JOIN usuarios u1 ON u1.id = s.aprovado_por
                 LEFT JOIN usuarios u2 ON u2.id = s.reprovado_por
                 WHERE s.igreja_id = ? AND s.status = ?
                 ORDER BY s.created_at DESC`,
            )
            .all(req.igreja.id, status);
        res.json({ solicitacoes });
    } catch (err) {
        next(err);
    }
});

// ─── PATCH /api/agenda/solicitacoes/:id/aprovar ───────────────────────────
// Aprova solicitação: cria o evento na agenda automaticamente
router.patch("/solicitacoes/:id/aprovar", (req, res, next) => {
    try {
        const db = getDb();
        const s = db.prepare("SELECT * FROM solicitacoes_agendamento WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!s) return res.status(404).json({ error: "Solicitação não encontrada" });
        if (s.status !== "pendente") return res.status(400).json({ error: "Solicitação já foi processada" });

        // Criar evento na agenda da igreja
        const created = db
            .prepare(
                `INSERT INTO agenda_eventos
                 (id, igreja_id, tipo, titulo, descricao, local, data_inicio, hora_inicio,
                  data_fim, hora_fim, cor, dia_todo, recorrente, recorrencia, notificado_dia_anterior, created_by)
                 VALUES (lower(hex(randomblob(16))), ?, 'evento', ?, ?, ?, ?, ?, ?, ?, '#1a56db', 0, 0, null, 0, ?)
                 RETURNING id`,
            )
            .get(req.igreja.id, s.titulo, s.descricao, s.local, s.data_inicio, s.hora_inicio, s.data_fim, s.hora_fim, req.user.id);

        db.prepare(
            `UPDATE solicitacoes_agendamento
             SET status = 'aprovado', aprovado_por = ?, aprovado_em = datetime('now'),
                 evento_id = ?, updated_at = datetime('now')
             WHERE id = ?`,
        ).run(req.user.id, created.id, s.id);

        // Marcar notificação relacionada como lida
        try {
            db.prepare("UPDATE notificacoes SET lida = 1 WHERE igreja_id = ? AND dados LIKE ?").run(req.igreja.id, `%"solicitacao_id":"${s.id}"%`);
        } catch (_) {}

        res.json({ ok: true, evento_id: created.id });
    } catch (err) {
        next(err);
    }
});

// ─── PATCH /api/agenda/solicitacoes/:id/reprovar ──────────────────────────
// Reprova solicitação: envia e-mail ao solicitante e retorna link WhatsApp
router.patch("/solicitacoes/:id/reprovar", async (req, res, next) => {
    try {
        const db = getDb();
        const s = db.prepare("SELECT * FROM solicitacoes_agendamento WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!s) return res.status(404).json({ error: "Solicitação não encontrada" });
        if (s.status !== "pendente") return res.status(400).json({ error: "Solicitação já foi processada" });

        const { motivo } = req.body;
        const dataFormatada = s.data_inicio.split("-").reverse().join("/");

        db.prepare(
            `UPDATE solicitacoes_agendamento
             SET status = 'reprovado', reprovado_por = ?, reprovado_em = datetime('now'),
                 motivo_reprovacao = ?, updated_at = datetime('now')
             WHERE id = ?`,
        ).run(req.user.id, motivo || null, s.id);

        // Marcar notificação relacionada como lida
        try {
            db.prepare("UPDATE notificacoes SET lida = 1 WHERE igreja_id = ? AND dados LIKE ?").run(req.igreja.id, `%"solicitacao_id":"${s.id}"%`);
        } catch (_) {}

        // Enviar e-mail de reprovação (se solicitante tiver e-mail e SMTP configurado)
        if (s.email && process.env.SMTP_USER) {
            try {
                const transporter = criarTransporter();
                await transporter.sendMail({
                    from: `"${req.igreja.nome}" <${process.env.SMTP_USER}>`,
                    to: s.email,
                    subject: `Solicitação de Agendamento — ${req.igreja.nome}`,
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                          <div style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
                            <h1 style="color:#fff;margin:0;font-size:22px;">${req.igreja.nome}</h1>
                            <p style="color:#c7d2fe;margin:6px 0 0;font-size:14px;">Solicitação de Agendamento</p>
                          </div>
                          <div style="padding:28px 24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
                            <p style="color:#374151;font-size:15px;line-height:1.6;">Olá, <strong>${s.nome}</strong>.</p>
                            <p style="color:#374151;font-size:15px;line-height:1.6;">
                              Infelizmente, sua solicitação de agendamento para o evento
                              <strong>"${s.titulo}"</strong> na data <strong>${dataFormatada}</strong>
                              não pôde ser confirmada.
                            </p>
                            ${motivo ? `<div style="margin:16px 0;padding:14px 18px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;"><p style="color:#7f1d1d;margin:0;font-size:14px;"><strong>Motivo:</strong> ${motivo}</p></div>` : ""}
                            <p style="color:#374151;font-size:14px;line-height:1.6;">
                              Entre em contato conosco para mais informações ou para verificar outras datas disponíveis.
                            </p>
                            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
                            <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">— Equipe <strong>${req.igreja.nome}</strong></p>
                          </div>
                        </div>`,
                });
            } catch (emailErr) {
                console.error("[Agenda] Erro ao enviar e-mail de reprovação:", emailErr.message);
            }
        }

        // Gerar link WhatsApp para envio manual (retornado ao frontend)
        const telefoneRaw = (s.whatsapp || s.celular || "").replace(/\D/g, "");
        let whatsapp_url = null;
        if (telefoneRaw.length >= 10) {
            const numero = telefoneRaw.startsWith("55") ? telefoneRaw : `55${telefoneRaw}`;
            const mensagem =
                `Olá ${s.nome}, sua solicitação de agendamento do evento "${s.titulo}" ` +
                `para ${dataFormatada} infelizmente não pôde ser confirmada pela ${req.igreja.nome}.` +
                (motivo ? ` Motivo: ${motivo}.` : "") +
                " Em caso de dúvidas, entre em contato conosco.";
            whatsapp_url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
        }

        res.json({ ok: true, whatsapp_url });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/agenda/:id ───────────────────────────────────────────────────
router.get("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const evento = db
            .prepare(
                `SELECT e.*, u.nome AS criado_por_nome
         FROM agenda_eventos e
         LEFT JOIN usuarios u ON u.id = e.created_by
         WHERE e.id = ? AND e.igreja_id = ?`,
            )
            .get(req.params.id, req.igreja.id);

        if (!evento) return res.status(404).json({ error: "Evento não encontrado" });
        res.json({ evento });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/agenda ──────────────────────────────────────────────────────
router.post("/", (req, res, next) => {
    try {
        const { tipo, titulo, descricao, local, data_inicio, hora_inicio, data_fim, hora_fim, cor, dia_todo, recorrente, recorrencia } = req.body;

        if (!tipo || !validarTipo(tipo)) return res.status(400).json({ error: "Tipo inválido. Use 'pastoral' ou 'evento'" });
        if (!titulo?.trim()) return res.status(400).json({ error: "Título obrigatório" });
        if (!data_inicio) return res.status(400).json({ error: "Data de início obrigatória" });

        const db = getDb();
        const id = db
            .prepare(
                `INSERT INTO agenda_eventos
           (id, igreja_id, tipo, titulo, descricao, local, data_inicio, hora_inicio,
            data_fim, hora_fim, cor, dia_todo, recorrente, recorrencia, notificado_dia_anterior, created_by)
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
         RETURNING id`,
            )
            .get(
                req.igreja.id,
                tipo,
                titulo.trim(),
                descricao || null,
                local || null,
                data_inicio,
                hora_inicio || null,
                data_fim || null,
                hora_fim || null,
                cor || "#1a56db",
                dia_todo ? 1 : 0,
                recorrente ? 1 : 0,
                recorrencia || null,
                req.user.id,
            );

        const evento = db.prepare("SELECT * FROM agenda_eventos WHERE id = ?").get(id.id);
        res.status(201).json({ evento });
    } catch (err) {
        next(err);
    }
});

// ─── PUT /api/agenda/:id ──────────────────────────────────────────────────
router.put("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const existente = db.prepare("SELECT id FROM agenda_eventos WHERE id = ? AND igreja_id = ?").get(req.params.id, req.igreja.id);
        if (!existente) return res.status(404).json({ error: "Evento não encontrado" });

        const { tipo, titulo, descricao, local, data_inicio, hora_inicio, data_fim, hora_fim, cor, dia_todo, recorrente, recorrencia } = req.body;

        if (tipo && !validarTipo(tipo)) return res.status(400).json({ error: "Tipo inválido" });
        if (titulo !== undefined && !titulo?.trim()) return res.status(400).json({ error: "Título não pode ser vazio" });

        db.prepare(
            `UPDATE agenda_eventos SET
         tipo        = COALESCE(?, tipo),
         titulo      = COALESCE(?, titulo),
         descricao   = ?,
         local       = ?,
         data_inicio = COALESCE(?, data_inicio),
         hora_inicio = ?,
         data_fim    = ?,
         hora_fim    = ?,
         cor         = COALESCE(?, cor),
         dia_todo    = COALESCE(?, dia_todo),
         recorrente  = COALESCE(?, recorrente),
         recorrencia = ?,
         notificado_dia_anterior = 0,
         updated_at  = datetime('now')
       WHERE id = ? AND igreja_id = ?`,
        ).run(
            tipo || null,
            titulo?.trim() || null,
            descricao !== undefined ? descricao || null : undefined,
            local !== undefined ? local || null : undefined,
            data_inicio || null,
            hora_inicio !== undefined ? hora_inicio || null : undefined,
            data_fim !== undefined ? data_fim || null : undefined,
            hora_fim !== undefined ? hora_fim || null : undefined,
            cor || null,
            dia_todo !== undefined ? (dia_todo ? 1 : 0) : null,
            recorrente !== undefined ? (recorrente ? 1 : 0) : null,
            recorrencia !== undefined ? recorrencia || null : undefined,
            req.params.id,
            req.igreja.id,
        );

        const evento = db.prepare("SELECT * FROM agenda_eventos WHERE id = ?").get(req.params.id);
        res.json({ evento });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/agenda/:id ───────────────────────────────────────────────
router.delete("/:id", (req, res, next) => {
    try {
        const db = getDb();
        const resultado = db.prepare("DELETE FROM agenda_eventos WHERE id = ? AND igreja_id = ?").run(req.params.id, req.igreja.id);
        if (resultado.changes === 0) return res.status(404).json({ error: "Evento não encontrado" });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/agenda/pastoral/enviar-whatsapp ────────────────────────────
// Gera a URL de WhatsApp com os compromissos pastorais do dia seguinte (ou semana)
router.post("/pastoral/enviar-whatsapp", (req, res, next) => {
    try {
        const db = getDb();
        const { periodo } = req.body; // 'amanha' | 'semana'

        const igreja = db.prepare("SELECT pastor_nome, pastor_titulo, pastor_whatsapp, nome FROM igrejas WHERE id = ?").get(req.igreja.id);

        if (!igreja?.pastor_whatsapp) {
            return res.status(400).json({ error: "WhatsApp do pastor não cadastrado. Configure em Configurações da Igreja." });
        }

        let eventos;
        let tituloMensagem;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (periodo === "semana") {
            // Segunda da semana atual até domingo
            const diaSemana = hoje.getDay(); // 0=dom, 1=seg...
            const inicio = new Date(hoje);
            inicio.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
            const fim = new Date(inicio);
            fim.setDate(inicio.getDate() + 6);

            const inicioStr = inicio.toISOString().slice(0, 10);
            const fimStr = fim.toISOString().slice(0, 10);
            tituloMensagem = `*Agenda Pastoral*\nSemana de ${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}`;

            eventos = db
                .prepare(
                    `SELECT titulo, descricao, local, data_inicio, hora_inicio, hora_fim, dia_todo
           FROM agenda_eventos
           WHERE igreja_id = ? AND tipo = 'pastoral'
             AND data_inicio BETWEEN ? AND ?
           ORDER BY data_inicio, hora_inicio`,
                )
                .all(req.igreja.id, inicioStr, fimStr);
        } else {
            // Amanhã
            const amanha = new Date(hoje);
            amanha.setDate(hoje.getDate() + 1);
            const amanhaStr = amanha.toISOString().slice(0, 10);
            const dataFormatada = amanha.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
            tituloMensagem = `*Agenda Pastoral*\n${dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)}`;

            eventos = db
                .prepare(
                    `SELECT titulo, descricao, local, data_inicio, hora_inicio, hora_fim, dia_todo
           FROM agenda_eventos
           WHERE igreja_id = ? AND tipo = 'pastoral' AND data_inicio = ?
           ORDER BY hora_inicio`,
                )
                .all(req.igreja.id, amanhaStr);
        }

        const titulo = igreja.pastor_titulo || "Pastor";
        const nomePastor = igreja.pastor_nome || "Pastor";

        if (eventos.length === 0) {
            const mensagem = `${tituloMensagem}\n\n${titulo} ${nomePastor}, não há compromissos agendados para esse período.\n\n_${igreja.nome}_`;
            const numero = igreja.pastor_whatsapp.replace(/\D/g, "");
            return res.json({ url: `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, total: 0 });
        }

        const linhas = eventos.map((e, i) => {
            const data = new Date(e.data_inicio + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
            const horario = e.dia_todo
                ? "Dia todo"
                : e.hora_inicio
                  ? `${e.hora_inicio}${e.hora_fim ? ` às ${e.hora_fim}` : ""}`
                  : "Horário a definir";
            const linhaLocal = e.local ? `\nLocal: ${e.local}` : "";
            const linhaDesc = e.descricao ? `\n_${e.descricao}_` : "";
            return `*${i + 1}. ${e.titulo}*\n${data} - ${horario}${linhaLocal}${linhaDesc}`;
        });

        const mensagem = `${tituloMensagem}\n\n${titulo} ${nomePastor}, seguem seus compromissos:\n\n${linhas.join("\n\n")}\n\n_${igreja.nome}_`;
        const numero = igreja.pastor_whatsapp.replace(/\D/g, "");
        const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;

        res.json({ url, total: eventos.length, mensagem });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
