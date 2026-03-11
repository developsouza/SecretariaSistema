const router = require("express").Router();
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
