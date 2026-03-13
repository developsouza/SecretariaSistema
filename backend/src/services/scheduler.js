/**
 * scheduler.js – Agendamento de notificações de aniversariantes
 * Executa todo dia às 06:00 horário de Brasília (UTC-3)
 * Cron: "0 9 * * *"  → 09:00 UTC = 06:00 BRT
 */
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const { getDb } = require("../database/db");

// ─── Configura transportador de e‑mail via variáveis de ambiente ──────────
function criarTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// ─── Mensagem de aniversário predefinida ─────────────────────────────────
function gerarMensagemAniversario(nomeCompleto, nomeIgreja) {
    const primeiroNome = nomeCompleto.split(" ")[0];
    return {
        texto: `🎉 Feliz Aniversário, ${primeiroNome}! 🎉

${nomeIgreja} louva a Deus por sua vida neste dia tão especial. Somos gratos ao Senhor por sua dedicação, comunhão e fidelidade na obra. Que esta nova etapa seja marcada por crescimento espiritual, saúde, paz e muitas conquistas em Cristo.

"Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais."
(Jeremias 29:11).

Que o Senhor continue dirigindo seus passos e fortalecendo sua fé a cada dia.

Receba nosso carinho e nossas orações.
Deus abençoe ricamente sua vida! 🙏✨`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
            <p style="font-size:48px;margin:0;">🎂</p>
            <h1 style="color:#fff;margin:8px 0 4px;font-size:24px;">Feliz Aniversário, ${primeiroNome}!</h1>
            <p style="color:#c7d2fe;margin:0;font-size:14px;">${new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div style="padding:28px 24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              <strong>${nomeIgreja}</strong> louva a Deus por sua vida neste dia tão especial.
              Somos gratos ao Senhor por sua dedicação, comunhão e fidelidade na obra.
              Que esta nova etapa seja marcada por crescimento espiritual, saúde, paz e muitas conquistas em Cristo.
            </p>
            <blockquote style="margin:20px 0;padding:16px 20px;background:#f0f4ff;border-left:4px solid #1a56db;border-radius:0 8px 8px 0;">
              <p style="color:#1e3a8a;font-style:italic;margin:0;font-size:14px;line-height:1.6;">
                &ldquo;Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.&rdquo;
              </p>
              <p style="color:#3b82f6;font-weight:600;margin:8px 0 0;font-size:13px;">Jeremias 29:11</p>
            </blockquote>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Que o Senhor continue dirigindo seus passos e fortalecendo sua fé a cada dia.
            </p>
            <p style="color:#374151;font-size:15px;">
              Receba nosso carinho e nossas orações.
            </p>
            <p style="font-size:22px;margin:16px 0 0;">Deus abençoe ricamente sua vida! 🙏✨</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
              Com carinho, <strong>${nomeIgreja}</strong>
            </p>
          </div>
        </div>`,
    };
}

// ─── Formata lista de aniversariantes para e‑mail ─────────────────────────
function formatarListaEmail(membros) {
    if (membros.length === 0) return "<p>Nenhum aniversariante hoje.</p>";
    return `
    <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;">
      <thead>
        <tr style="background:#1a56db;color:#fff;">
          <th style="padding:8px 12px;text-align:left;">Nome</th>
          <th style="padding:8px 12px;text-align:left;">Cargo</th>
          <th style="padding:8px 12px;text-align:left;">Celular</th>
          <th style="padding:8px 12px;text-align:left;">Data de Nascimento</th>
        </tr>
      </thead>
      <tbody>
        ${membros
            .map(
                (m, i) => `
          <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#fff"};">
            <td style="padding:8px 12px;">${m.nome_completo}</td>
            <td style="padding:8px 12px;">${m.cargo || "Membro"}</td>
            <td style="padding:8px 12px;">${m.celular || "-"}</td>
            <td style="padding:8px 12px;">${m.data_nascimento ? m.data_nascimento.slice(5) : "-"}</td>
          </tr>`,
            )
            .join("")}
      </tbody>
    </table>`;
}

// ─── Job principal ────────────────────────────────────────────────────────
async function executarJobAniversariantes() {
    console.log("[Scheduler] Executando job de aniversariantes...");
    const db = getDb();

    // Busca todas as igrejas ativas com assinatura válida
    const igrejas = db
        .prepare(
            `SELECT i.id, i.nome, i.email,
              u.email AS admin_email, u.nome AS admin_nome
       FROM igrejas i
       JOIN usuarios u ON u.igreja_id = i.id AND u.perfil = 'admin' AND u.ativo = 1
       WHERE i.ativo = 1
         AND i.stripe_status IN ('active','trialing')`,
        )
        .all();

    if (igrejas.length === 0) {
        console.log("[Scheduler] Nenhuma igreja ativa encontrada.");
        return;
    }

    let transporter = null;
    const smtpConfigurado = process.env.SMTP_USER && process.env.SMTP_PASS;
    if (smtpConfigurado) {
        transporter = criarTransporter();
    }

    for (const igreja of igrejas) {
        try {
            // Aniversariantes de hoje — membros cadastrados
            const membrosHoje = db
                .prepare(
                    `SELECT id, nome_completo, foto_url, cargo, celular, email, data_nascimento
           FROM membros
           WHERE igreja_id = ?
             AND situacao = 'ativo'
             AND data_nascimento IS NOT NULL
             AND strftime('%m-%d', data_nascimento) = strftime('%m-%d', 'now')
           ORDER BY nome_completo`,
                )
                .all(igreja.id);

            // Aniversariantes de hoje — registros públicos
            const publicosHoje = db
                .prepare(
                    `SELECT id, nome_completo, NULL AS foto_url, cargo, celular, email, data_nascimento
           FROM aniversarios_publicos
           WHERE igreja_id = ? AND ativo = 1
             AND strftime('%m-%d', data_nascimento) = strftime('%m-%d', 'now')
           ORDER BY nome_completo`,
                )
                .all(igreja.id);

            const hoje = [...membrosHoje, ...publicosHoje];

            if (hoje.length === 0) {
                console.log(`[Scheduler] ${igreja.nome}: Sem aniversariantes hoje.`);
                continue;
            }

            const nomes = hoje.map((m) => m.nome_completo).join(", ");
            const titulo = hoje.length === 1 ? `🎂 Aniversariante hoje: ${hoje[0].nome_completo}` : `🎂 ${hoje.length} aniversariantes hoje`;
            const mensagem = `Aniversariantes: ${nomes}`;

            // Evita duplicar notificações no mesmo dia
            const jaExiste = db
                .prepare(
                    `SELECT id FROM notificacoes
           WHERE igreja_id = ?
             AND tipo = 'aniversario'
             AND date(created_at) = date('now')
           LIMIT 1`,
                )
                .get(igreja.id);

            if (!jaExiste) {
                db.prepare(
                    `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
           VALUES (lower(hex(randomblob(16))), ?, 'aniversario', ?, ?, ?)`,
                ).run(igreja.id, titulo, mensagem, JSON.stringify({ membros: hoje.map((m) => ({ id: m.id, nome: m.nome_completo })) }));
                console.log(`[Scheduler] Notificação criada para ${igreja.nome}: ${titulo}`);
            }

            // Envia e-mail se SMTP configurado
            if (transporter) {
                // 1) E-mail de gestão ao administrador
                const destino = process.env.NOTIFY_EMAIL || igreja.admin_email;
                await transporter.sendMail({
                    from: `"Gestão Secretaria" <${process.env.SMTP_USER}>`,
                    to: destino,
                    subject: `[${igreja.nome}] ${titulo}`,
                    html: `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                      <div style="background:#1a56db;padding:20px;border-radius:8px 8px 0 0;">
                        <h2 style="color:#fff;margin:0;">🎂 Aniversariantes de Hoje</h2>
                        <p style="color:#c7d2fe;margin:4px 0 0;">${new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                      <div style="padding:24px;background:#f9fafb;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;">
                        <p style="color:#374151;">Olá, <strong>${igreja.admin_nome}</strong>!</p>
                        <p style="color:#374151;">Os seguintes membros de <strong>${igreja.nome}</strong> fazem aniversário hoje:</p>
                        ${formatarListaEmail(hoje)}
                        <p style="margin-top:16px;color:#6b7280;font-size:12px;">
                          Este e-mail foi enviado automaticamente pelo Gestão Secretaria às 06:00 (Brasília).
                        </p>
                      </div>
                    </div>`,
                });
                console.log(`[Scheduler] E-mail de gestão enviado para ${destino} (${igreja.nome})`);

                // 2) E-mail de parabéns individual a cada membro que tem e-mail
                for (const membro of hoje) {
                    if (!membro.email) continue;
                    try {
                        const msg = gerarMensagemAniversario(membro.nome_completo, igreja.nome);
                        await transporter.sendMail({
                            from: `"${igreja.nome}" <${process.env.SMTP_USER}>`,
                            to: membro.email,
                            subject: `🎉 Feliz Aniversário, ${membro.nome_completo.split(" ")[0]}! | ${igreja.nome}`,
                            html: msg.html,
                        });
                        console.log(`[Scheduler] E-mail de parabéns enviado para ${membro.nome_completo} <${membro.email}>`);
                    } catch (errMembro) {
                        console.error(`[Scheduler] Erro ao enviar parabéns para ${membro.nome_completo}:`, errMembro.message);
                    }
                }
            }
        } catch (err) {
            console.error(`[Scheduler] Erro ao processar ${igreja.nome}:`, err.message);
        }
    }
}

// ─── HTML para lista de aniversariantes (com destaque de cargo) ───────────
function gerarHtmlAniversariantesList(lista, titulo, subtitulo, nomeIgreja, adminNome) {
    const getCargoDestaque = (cargo) => {
        if (!cargo) return null;
        const c = cargo.toLowerCase();
        if (/pastor|bispo|ap[oó]stolo|reverendo/.test(c)) return { cor: "#7c3aed", bg: "#ede9fe" };
        if (/presb[ií]tero|anc[ií][aã]o|obreiro/.test(c)) return { cor: "#2563eb", bg: "#dbeafe" };
        if (/di[aá]con[ao]/.test(c)) return { cor: "#0891b2", bg: "#cffafe" };
        if (/evangelista|mission[aá]rio/.test(c)) return { cor: "#16a34a", bg: "#dcfce7" };
        if (/l[ií]der|dirig|coordenador|supervisor|minist/.test(c)) return { cor: "#b45309", bg: "#fef3c7" };
        return { cor: "#6b7280", bg: "#f3f4f6" };
    };

    const linhasHtml = lista
        .map((m) => {
            const dataNasc = m.data_nascimento ? new Date(m.data_nascimento + "T12:00:00") : null;
            const diaMes = dataNasc ? dataNasc.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "—";
            const cargo = m.cargo || "";
            const destaque = getCargoDestaque(cargo);
            const cargoHtml = cargo
                ? `<span style="display:inline-block;padding:1px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${destaque.bg};color:${destaque.cor};margin-left:6px;vertical-align:middle;text-transform:uppercase;letter-spacing:.04em;">${cargo}</span>`
                : "";
            return `<tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">
                <strong style="color:#111827;">${m.nome_completo}</strong>${cargoHtml}
              </td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:13px;white-space:nowrap;">
                🎂 ${diaMes}
              </td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">
                ${m.celular || "—"}
              </td>
            </tr>`;
        })
        .join("");

    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#be185d,#7c3aed);padding:28px 24px;border-radius:12px 12px 0 0;">
        <p style="font-size:32px;margin:0;">🎂</p>
        <h1 style="color:#fff;margin:8px 0 4px;font-size:20px;">${titulo}</h1>
        <p style="color:#fce7f3;margin:0;font-size:13px;">${nomeIgreja}${subtitulo ? ` — ${subtitulo}` : ""}</p>
      </div>
      <div style="padding:24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <p style="color:#374151;font-size:15px;">Olá, <strong>${adminNome}</strong>! Aqui estão os aniversariantes:</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:12px;">
          <thead>
            <tr style="background:#fdf4ff;">
              <th style="padding:8px 12px;text-align:left;color:#374151;">Nome</th>
              <th style="padding:8px 12px;text-align:left;color:#374151;">Aniversário</th>
              <th style="padding:8px 12px;text-align:left;color:#374151;">Celular</th>
            </tr>
          </thead>
          <tbody>${linhasHtml}</tbody>
        </table>
        <p style="margin-top:20px;color:#9ca3af;font-size:12px;text-align:center;">
          Enviado automaticamente pelo Gestão Secretaria. © ${nomeIgreja}
        </p>
      </div>
    </div>`;
}

// ─── Job: aviso de aniversariantes com 2 dias de antecedência ────────────
async function executarJobAniversariantesDoisDias() {
    console.log("[Scheduler] Executando job de aniversariantes — 2 dias de antecedência...");
    const db = getDb();

    const doisDias = new Date();
    doisDias.setDate(doisDias.getDate() + 2);
    const mmdd = `${String(doisDias.getMonth() + 1).padStart(2, "0")}-${String(doisDias.getDate()).padStart(2, "0")}`;
    const dataFormatada = doisDias.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

    const igrejas = db
        .prepare(
            `SELECT i.id, i.nome, u.email AS admin_email, u.nome AS admin_nome
       FROM igrejas i
       JOIN usuarios u ON u.igreja_id = i.id AND u.perfil = 'admin' AND u.ativo = 1
       WHERE i.ativo = 1 AND i.stripe_status IN ('active','trialing')`,
        )
        .all();

    let transporter = null;
    const smtpConfigurado = process.env.SMTP_USER && process.env.SMTP_PASS;
    if (smtpConfigurado) transporter = criarTransporter();

    for (const igreja of igrejas) {
        try {
            const membros2dias = db
                .prepare(
                    `SELECT id, nome_completo, cargo, celular, email, data_nascimento
           FROM membros
           WHERE igreja_id = ? AND situacao = 'ativo'
             AND strftime('%m-%d', data_nascimento) = ?`,
                )
                .all(igreja.id, mmdd);

            const publicos2dias = db
                .prepare(
                    `SELECT id, nome_completo, cargo, celular, email, data_nascimento
           FROM aniversarios_publicos
           WHERE igreja_id = ? AND ativo = 1
             AND strftime('%m-%d', data_nascimento) = ?`,
                )
                .all(igreja.id, mmdd);

            const membros = [...membros2dias, ...publicos2dias];

            if (membros.length === 0) continue;

            const tituloNotif = `🎂 ${membros.length} aniversariante${membros.length > 1 ? "s" : ""} daqui a 2 dias`;
            const mensagemNotif = membros.map((m) => m.nome_completo).join(", ");

            // Evita duplicar no mesmo dia
            const jaExiste = db
                .prepare(`SELECT id FROM notificacoes WHERE igreja_id = ? AND tipo = 'aniversario_2dias' AND date(created_at) = date('now') LIMIT 1`)
                .get(igreja.id);

            if (!jaExiste) {
                db.prepare(
                    `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
           VALUES (lower(hex(randomblob(16))), ?, 'aniversario_2dias', ?, ?, ?)`,
                ).run(igreja.id, tituloNotif, mensagemNotif, JSON.stringify({ data: doisDias.toISOString().slice(0, 10), total: membros.length }));
                console.log(`[Scheduler] Notificação de aniversário (2 dias) criada para ${igreja.nome}`);
            }

            if (!transporter) continue;

            const titulo = `🎂 Aniversariantes em 2 dias — ${dataFormatada}`;
            const destAdmin = process.env.NOTIFY_EMAIL || igreja.admin_email;
            await transporter.sendMail({
                from: `"Gestão Secretaria" <${process.env.SMTP_USER}>`,
                to: destAdmin,
                subject: `[${igreja.nome}] ${titulo}`,
                html: gerarHtmlAniversariantesList(membros, titulo, `Aniversário em ${dataFormatada}`, igreja.nome, igreja.admin_nome),
            });
            console.log(`[Scheduler] E-mail aniversariantes (2 dias) enviado para ${destAdmin} (${igreja.nome})`);
        } catch (err) {
            console.error(`[Scheduler] Erro ao processar aniversariantes (2 dias) de ${igreja.nome}:`, err.message);
        }
    }
}

// ─── Job: resumo semanal de aniversariantes (toda segunda-feira) ──────────
async function executarJobAniversariantesSemana() {
    console.log("[Scheduler] Executando job de aniversariantes — resumo semanal...");
    const db = getDb();

    const hoje = new Date();
    const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() + i);
        return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });

    const fimSemana = new Date(hoje);
    fimSemana.setDate(hoje.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
    const periodoLabel = `${fmt(hoje)} a ${fmt(fimSemana)}`;

    const igrejas = db
        .prepare(
            `SELECT i.id, i.nome, u.email AS admin_email, u.nome AS admin_nome
       FROM igrejas i
       JOIN usuarios u ON u.igreja_id = i.id AND u.perfil = 'admin' AND u.ativo = 1
       WHERE i.ativo = 1 AND i.stripe_status IN ('active','trialing')`,
        )
        .all();

    let transporter = null;
    const smtpConfigurado = process.env.SMTP_USER && process.env.SMTP_PASS;
    if (smtpConfigurado) transporter = criarTransporter();

    for (const igreja of igrejas) {
        try {
            const placeholders = dias.map(() => "?").join(",");
            const membrosSemana = db
                .prepare(
                    `SELECT id, nome_completo, cargo, celular, email, data_nascimento
           FROM membros
           WHERE igreja_id = ? AND situacao = 'ativo'
             AND strftime('%m-%d', data_nascimento) IN (${placeholders})
           ORDER BY strftime('%m-%d', data_nascimento)`,
                )
                .all(igreja.id, ...dias);

            const publicosSemana = db
                .prepare(
                    `SELECT id, nome_completo, cargo, celular, email, data_nascimento
           FROM aniversarios_publicos
           WHERE igreja_id = ? AND ativo = 1
             AND strftime('%m-%d', data_nascimento) IN (${placeholders})
           ORDER BY strftime('%m-%d', data_nascimento)`,
                )
                .all(igreja.id, ...dias);

            const membros = [...membrosSemana, ...publicosSemana].sort((a, b) => {
                const da = a.data_nascimento.slice(5);
                const db_ = b.data_nascimento.slice(5);
                return da < db_ ? -1 : da > db_ ? 1 : 0;
            });

            if (membros.length === 0) {
                console.log(`[Scheduler] ${igreja.nome}: nenhum aniversariante esta semana.`);
                continue;
            }

            const titulo = `🎂 Aniversariantes da Semana — ${periodoLabel}`;
            const tituloNotif = `🎂 ${membros.length} aniversariante${membros.length > 1 ? "s" : ""} esta semana`;

            // Evita duplicar no mesmo dia
            const jaExiste = db
                .prepare(`SELECT id FROM notificacoes WHERE igreja_id = ? AND tipo = 'aniversario_semana' AND date(created_at) = date('now') LIMIT 1`)
                .get(igreja.id);

            if (!jaExiste) {
                db.prepare(
                    `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
           VALUES (lower(hex(randomblob(16))), ?, 'aniversario_semana', ?, ?, ?)`,
                ).run(
                    igreja.id,
                    tituloNotif,
                    membros.map((m) => m.nome_completo).join(", "),
                    JSON.stringify({ semana: periodoLabel, total: membros.length }),
                );
                console.log(`[Scheduler] Notificação de aniversariantes (semanal) criada para ${igreja.nome}`);
            }

            if (!transporter) continue;

            const destAdmin = process.env.NOTIFY_EMAIL || igreja.admin_email;
            await transporter.sendMail({
                from: `"Gestão Secretaria" <${process.env.SMTP_USER}>`,
                to: destAdmin,
                subject: `[${igreja.nome}] ${titulo}`,
                html: gerarHtmlAniversariantesList(membros, titulo, periodoLabel, igreja.nome, igreja.admin_nome),
            });
            console.log(`[Scheduler] E-mail aniversariantes (semanal) enviado para ${destAdmin} (${igreja.nome})`);
        } catch (err) {
            console.error(`[Scheduler] Erro ao processar aniversariantes (semanal) de ${igreja.nome}:`, err.message);
        }
    }
}

// ─── Templates de e-mail de trial ────────────────────────────────────────
function gerarHtmlTrial({ nomeIgreja, diasRestantes, plansUrl, tipo }) {
    const isExpirado = tipo === "expirado";
    const isUltimoDia = diasRestantes <= 1;

    const corHeader = isExpirado ? "#dc2626" : isUltimoDia ? "#d97706" : "#1a56db";
    const emoji = isExpirado ? "🔒" : isUltimoDia ? "🚨" : "⏳";
    const titulo = isExpirado ? "Seu trial expirou" : isUltimoDia ? "Último dia do seu trial" : `Seu trial expira em ${diasRestantes} dias`;
    const corpo = isExpirado
        ? `O período de avaliação gratuita de <strong>${nomeIgreja}</strong> foi encerrado.
           Para continuar acessando a plataforma e manter todos os dados dos seus membros, assine um dos nossos planos.`
        : isUltimoDia
          ? `Hoje é o <strong>último dia</strong> do seu período de avaliação gratuita em <strong>${nomeIgreja}</strong>.
             Assine agora para continuar sem interrupções — seus dados estão seguros.`
          : `O período de avaliação gratuita de <strong>${nomeIgreja}</strong> expira em <strong>${diasRestantes} dias</strong>.
             Escolha um plano e continue aproveitando todos os recursos sem preocupações.`;
    const ctaTexto = isExpirado ? "Reativar agora" : "Escolher um plano";

    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:${corHeader};padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
        <p style="font-size:40px;margin:0;">${emoji}</p>
        <h1 style="color:#fff;margin:8px 0 4px;font-size:22px;">${titulo}</h1>
        <p style="color:rgba(255,255,255,0.7);margin:0;font-size:13px;">Gestão Secretaria · ${nomeIgreja}</p>
      </div>
      <div style="padding:28px 24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <p style="color:#374151;font-size:15px;line-height:1.7;">${corpo}</p>
        ${
            !isExpirado
                ? `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:16px 0;">
             <p style="color:#92400e;font-size:13px;margin:0;">
               ⚠️ Após o término do trial, o acesso ao painel será <strong>pausado automaticamente</strong> até a ativação de um plano.
               Todos os dados ficam preservados por 30 dias.
             </p>
           </div>`
                : `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0;">
             <p style="color:#991b1b;font-size:13px;margin:0;">
               🔒 Seu acesso está pausado. Assine um plano para reativar imediatamente.
               Seus dados estão seguros e serão preservados por 30 dias.
             </p>
           </div>`
        }
        <div style="text-align:center;margin:28px 0;">
          <a href="${plansUrl}"
             style="display:inline-block;background:${corHeader};color:#fff;font-weight:700;
                    font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">
            ${ctaTexto}
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
          Gestão Secretaria · Plataforma de gestão de membros<br/>
          Dúvidas? Responda este e-mail.
        </p>
      </div>
    </div>`;
}

// ─── Job de trial expirando ───────────────────────────────────────────────
async function executarJobTrialExpirando() {
    console.log("[Scheduler] Executando job de trial expirando...");
    const db = getDb();

    // Busca todas as igrejas ainda em trial
    const igrejas = db
        .prepare(
            `SELECT i.id, i.nome, i.email, i.trial_end,
              u.email AS admin_email, u.nome AS admin_nome
       FROM igrejas i
       JOIN usuarios u ON u.igreja_id = i.id AND u.perfil = 'admin' AND u.ativo = 1
       WHERE i.ativo = 1 AND i.stripe_status = 'trialing' AND i.trial_end IS NOT NULL`,
        )
        .all();

    if (igrejas.length === 0) {
        console.log("[Scheduler] Nenhuma igreja em trial encontrada.");
        return;
    }

    let transporter = null;
    const smtpConfigurado = process.env.SMTP_USER && process.env.SMTP_PASS;
    if (smtpConfigurado) transporter = criarTransporter();

    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);

    for (const igreja of igrejas) {
        try {
            const trialEnd = new Date(igreja.trial_end);
            trialEnd.setUTCHours(0, 0, 0, 0);

            const diffMs = trialEnd - hoje;
            const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

            // Apenas notifica nos marcos: 7 dias, 1 dia, 0 (hoje expira), -1 (expirou ontem)
            const MARCOS = { 7: "trial_aviso_7d", 1: "trial_aviso_1d", 0: "trial_aviso_0d", "-1": "trial_expirado" };
            const tipoNotif = MARCOS[diasRestantes];
            if (!tipoNotif) continue;

            // Evita duplicar no mesmo dia
            const jaExiste = db
                .prepare(
                    `SELECT id FROM notificacoes
           WHERE igreja_id = ? AND tipo = ? AND date(created_at) = date('now') LIMIT 1`,
                )
                .get(igreja.id, tipoNotif);
            if (jaExiste) {
                console.log(`[Scheduler] Trial (${tipoNotif}): notificação já existe para ${igreja.nome}, pulando.`);
                continue;
            }

            // Monta conteúdo da notificação
            const conteudos = {
                trial_aviso_7d: {
                    titulo: "⏳ Seu trial expira em 7 dias",
                    mensagem: "Escolha um plano para continuar usando o Gestão Secretaria sem interrupções.",
                    emailSubject: `[${igreja.nome}] Seu trial expira em 7 dias`,
                    tipoCss: "aviso",
                },
                trial_aviso_1d: {
                    titulo: "🚨 Último dia do trial",
                    mensagem: "Hoje é o último dia! Assine agora para não perder o acesso.",
                    emailSubject: `[${igreja.nome}] Último dia do trial — Ação necessária`,
                    tipoCss: "urgente",
                },
                trial_aviso_0d: {
                    titulo: "🚨 Trial expira hoje",
                    mensagem: "Seu trial expira hoje. Assine um plano para continuar.",
                    emailSubject: `[${igreja.nome}] Trial expira hoje — Ação necessária`,
                    tipoCss: "urgente",
                },
                trial_expirado: {
                    titulo: "🔒 Trial expirado — Acesso pausado",
                    mensagem: "Seu período de teste terminou. Assine um plano para reativar o acesso.",
                    emailSubject: `[${igreja.nome}] Trial expirado — Reative seu acesso`,
                    tipoCss: "critico",
                },
            };

            const c = conteudos[tipoNotif];

            // Cria notificação interna
            db.prepare(
                `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
           VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)`,
            ).run(igreja.id, tipoNotif, c.titulo, c.mensagem, JSON.stringify({ dias_restantes: diasRestantes, trial_end: igreja.trial_end }));
            console.log(`[Scheduler] Notificação de trial criada para ${igreja.nome}: ${c.titulo}`);

            // Envia e-mail
            if (transporter) {
                const plansUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/planos`;
                const tipo = tipoNotif === "trial_expirado" ? "expirado" : diasRestantes <= 1 ? "urgente" : "aviso";
                try {
                    await transporter.sendMail({
                        from: `"Gestão Secretaria" <${process.env.SMTP_USER}>`,
                        to: process.env.NOTIFY_EMAIL || igreja.admin_email,
                        subject: c.emailSubject,
                        html: gerarHtmlTrial({ nomeIgreja: igreja.nome, diasRestantes, plansUrl, tipo }),
                    });
                    console.log(`[Scheduler] E-mail de trial enviado para ${igreja.admin_email} (${igreja.nome})`);
                } catch (mailErr) {
                    console.error(`[Scheduler] Erro ao enviar e-mail de trial para ${igreja.nome}:`, mailErr.message);
                }
            }
        } catch (err) {
            console.error(`[Scheduler] Erro ao processar trial de ${igreja.nome}:`, err.message);
        }
    }

    console.log(`[Scheduler] Job de trial finalizado. ${igrejas.length} igreja(s) verificada(s).`);
}

// ─── Helpers de e-mail da agenda ──────────────────────────────────────────
function gerarHtmlAgendaPastoral(eventos, titulo, nomeIgreja, adminNome) {
    const linhasHtml = eventos
        .map((e) => {
            const data = new Date(e.data_inicio + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
            const horario = e.dia_todo ? "Dia todo" : e.hora_inicio ? `${e.hora_inicio}${e.hora_fim ? ` – ${e.hora_fim}` : ""}` : "Horário a definir";
            const local = e.local ? `<br/><span style="color:#6b7280;font-size:13px;">📍 ${e.local}</span>` : "";
            const desc = e.descricao ? `<br/><span style="color:#6b7280;font-size:13px;">💬 ${e.descricao}</span>` : "";
            return `<tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:12px;color:#6b7280;">${data}</span><br/>
                <strong style="color:#111827;">${e.titulo}</strong>
                ${local}${desc}
              </td>
              <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;white-space:nowrap;color:#374151;font-size:13px;vertical-align:top;">
                ${horario}
              </td>
            </tr>`;
        })
        .join("");

    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:28px 24px;border-radius:12px 12px 0 0;">
        <p style="font-size:32px;margin:0;">📅</p>
        <h1 style="color:#fff;margin:8px 0 4px;font-size:20px;">${titulo}</h1>
        <p style="color:#c7d2fe;margin:0;font-size:13px;">${nomeIgreja}</p>
      </div>
      <div style="padding:24px;background:#fff;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
        <p style="color:#374151;font-size:15px;">Olá, <strong>${adminNome}</strong>! Aqui está a agenda pastoral:</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:12px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;text-align:left;color:#374151;">Compromisso</th>
              <th style="padding:8px 12px;text-align:left;color:#374151;">Horário</th>
            </tr>
          </thead>
          <tbody>${linhasHtml}</tbody>
        </table>
        <p style="margin-top:20px;color:#9ca3af;font-size:12px;text-align:center;">
          Enviado automaticamente pelo Gestão Secretaria. © ${nomeIgreja}
        </p>
      </div>
    </div>`;
}

// ─── Job: lembrete diário de compromissos pastorais do dia seguinte ───────
async function executarJobAgendaPastoralDiaAnterior() {
    console.log("[Scheduler] Executando job de agenda pastoral — dia anterior...");
    const db = getDb();

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().slice(0, 10);

    const igrejas = db
        .prepare(
            `SELECT i.id, i.nome, i.pastor_nome, i.pastor_titulo, i.pastor_email,
              u.email AS admin_email, u.nome AS admin_nome
       FROM igrejas i
       JOIN usuarios u ON u.igreja_id = i.id AND u.perfil = 'admin' AND u.ativo = 1
       WHERE i.ativo = 1 AND i.stripe_status IN ('active','trialing')`,
        )
        .all();

    let transporter = null;
    const smtpConfigurado = process.env.SMTP_USER && process.env.SMTP_PASS;
    if (smtpConfigurado) transporter = criarTransporter();

    for (const igreja of igrejas) {
        try {
            const eventos = db
                .prepare(
                    `SELECT titulo, descricao, local, data_inicio, hora_inicio, hora_fim, dia_todo
           FROM agenda_eventos
           WHERE igreja_id = ? AND tipo = 'pastoral' AND data_inicio = ?
           ORDER BY hora_inicio`,
                )
                .all(igreja.id, amanhaStr);

            if (eventos.length === 0) continue;

            const titulo = `📅 Agenda Pastoral de Amanhã — ${amanha.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`;
            const tituloLabel = eventos.length === 1 ? `1 compromisso pastoral amanhã` : `${eventos.length} compromissos pastorais amanhã`;
            const mensagem = `${tituloLabel}: ${eventos.map((e) => e.titulo).join(", ")}`;

            // Notificação interna
            const jaExiste = db
                .prepare(
                    `SELECT id FROM notificacoes WHERE igreja_id = ? AND tipo = 'agenda_pastoral_amanha' AND date(created_at) = date('now') LIMIT 1`,
                )
                .get(igreja.id);
            if (!jaExiste) {
                db.prepare(
                    `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
           VALUES (lower(hex(randomblob(16))), ?, 'agenda_pastoral_amanha', ?, ?, ?)`,
                ).run(igreja.id, titulo, mensagem, JSON.stringify({ data: amanhaStr, total: eventos.length }));
            }

            if (!transporter) continue;

            // E-mail para admin
            const destAdmin = process.env.NOTIFY_EMAIL || igreja.admin_email;
            await transporter.sendMail({
                from: `"Gestão Secretaria" <${process.env.SMTP_USER}>`,
                to: destAdmin,
                subject: `[${igreja.nome}] ${titulo}`,
                html: gerarHtmlAgendaPastoral(eventos, titulo, igreja.nome, igreja.admin_nome),
            });
            console.log(`[Scheduler] E-mail agenda pastoral (amanhã) enviado para ${destAdmin} (${igreja.nome})`);

            // E-mail para o pastor (se tiver e-mail cadastrado)
            if (igreja.pastor_email) {
                const nomePastor = (igreja.pastor_nome || "Pastor").split(" ")[0];
                const tituloPastor = igreja.pastor_titulo || "Pastor";
                await transporter.sendMail({
                    from: `"${igreja.nome}" <${process.env.SMTP_USER}>`,
                    to: igreja.pastor_email,
                    subject: `Sua agenda de amanhã — ${amanha.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`,
                    html: gerarHtmlAgendaPastoral(
                        eventos,
                        `${tituloPastor} ${nomePastor}, sua agenda de amanhã:`,
                        igreja.nome,
                        `${tituloPastor} ${nomePastor}`,
                    ),
                });
                console.log(`[Scheduler] E-mail agenda pastoral (amanhã) enviado ao pastor de ${igreja.nome}`);
            }
        } catch (err) {
            console.error(`[Scheduler] Erro agenda pastoral (amanhã) para ${igreja.nome}:`, err.message);
        }
    }
}

// ─── Job: resumo semanal da agenda pastoral (toda segunda-feira) ──────────
async function executarJobAgendaPastoralSemanal() {
    console.log("[Scheduler] Executando job de agenda pastoral — semanal...");
    const db = getDb();

    // Segunda a domingo da semana atual
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0=dom
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    const inicioStr = inicio.toISOString().slice(0, 10);
    const fimStr = fim.toISOString().slice(0, 10);

    const formatData = (d) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
    const titulo = `📅 Agenda Pastoral da Semana — ${formatData(inicio)} a ${formatData(fim)}`;

    const igrejas = db
        .prepare(
            `SELECT i.id, i.nome, i.pastor_nome, i.pastor_titulo, i.pastor_email,
              u.email AS admin_email, u.nome AS admin_nome
       FROM igrejas i
       JOIN usuarios u ON u.igreja_id = i.id AND u.perfil = 'admin' AND u.ativo = 1
       WHERE i.ativo = 1 AND i.stripe_status IN ('active','trialing')`,
        )
        .all();

    let transporter = null;
    const smtpConfigurado = process.env.SMTP_USER && process.env.SMTP_PASS;
    if (smtpConfigurado) transporter = criarTransporter();

    for (const igreja of igrejas) {
        try {
            const eventos = db
                .prepare(
                    `SELECT titulo, descricao, local, data_inicio, hora_inicio, hora_fim, dia_todo
           FROM agenda_eventos
           WHERE igreja_id = ? AND tipo = 'pastoral'
             AND data_inicio BETWEEN ? AND ?
           ORDER BY data_inicio, hora_inicio`,
                )
                .all(igreja.id, inicioStr, fimStr);

            if (eventos.length === 0) {
                console.log(`[Scheduler] ${igreja.nome}: sem compromissos pastorais esta semana.`);
                continue;
            }

            // Notificação interna
            const jaExiste = db
                .prepare(
                    `SELECT id FROM notificacoes WHERE igreja_id = ? AND tipo = 'agenda_pastoral_semanal' AND date(created_at) = date('now') LIMIT 1`,
                )
                .get(igreja.id);
            if (!jaExiste) {
                db.prepare(
                    `INSERT INTO notificacoes (id, igreja_id, tipo, titulo, mensagem, dados)
           VALUES (lower(hex(randomblob(16))), ?, 'agenda_pastoral_semanal', ?, ?, ?)`,
                ).run(
                    igreja.id,
                    titulo,
                    `${eventos.length} compromisso(s) desta semana`,
                    JSON.stringify({ semana_inicio: inicioStr, semana_fim: fimStr, total: eventos.length }),
                );
            }

            if (!transporter) continue;

            // E-mail para admin
            const destAdmin = process.env.NOTIFY_EMAIL || igreja.admin_email;
            await transporter.sendMail({
                from: `"Gestão Secretaria" <${process.env.SMTP_USER}>`,
                to: destAdmin,
                subject: `[${igreja.nome}] ${titulo}`,
                html: gerarHtmlAgendaPastoral(eventos, titulo, igreja.nome, igreja.admin_nome),
            });
            console.log(`[Scheduler] E-mail agenda pastoral (semanal) enviado para ${destAdmin} (${igreja.nome})`);

            // E-mail para o pastor
            if (igreja.pastor_email) {
                const nomePastor = (igreja.pastor_nome || "Pastor").split(" ")[0];
                const tituloPastor = igreja.pastor_titulo || "Pastor";
                await transporter.sendMail({
                    from: `"${igreja.nome}" <${process.env.SMTP_USER}>`,
                    to: igreja.pastor_email,
                    subject: `Sua agenda da semana — ${formatData(inicio)} a ${formatData(fim)}`,
                    html: gerarHtmlAgendaPastoral(
                        eventos,
                        `${tituloPastor} ${nomePastor}, sua agenda desta semana:`,
                        igreja.nome,
                        `${tituloPastor} ${nomePastor}`,
                    ),
                });
                console.log(`[Scheduler] E-mail agenda pastoral (semanal) enviado ao pastor de ${igreja.nome}`);
            }
        } catch (err) {
            console.error(`[Scheduler] Erro agenda pastoral (semanal) para ${igreja.nome}:`, err.message);
        }
    }
}

// ─── Job: limpeza de contas não verificadas (7 dias) ─────────────────────
async function executarJobLimpezaContasNaoVerificadas() {
    console.log("[Scheduler] Iniciando limpeza de contas não verificadas...");
    const db = getDb();

    const igrejas = db
        .prepare(
            `SELECT i.id, i.nome
             FROM igrejas i
             WHERE i.stripe_status = 'pending_verification'
               AND i.created_at < datetime('now', '-7 days')`,
        )
        .all();

    let removidas = 0;
    for (const igreja of igrejas) {
        try {
            db.prepare(`DELETE FROM usuarios WHERE igreja_id = ? AND email_verificado = 0`).run(igreja.id);
            const restantes = db.prepare(`SELECT COUNT(*) AS total FROM usuarios WHERE igreja_id = ?`).get(igreja.id);
            if (restantes.total === 0) {
                db.prepare(`DELETE FROM igrejas WHERE id = ?`).run(igreja.id);
                removidas++;
                console.log(`[Scheduler] Conta não verificada removida: ${igreja.nome}`);
            }
        } catch (err) {
            console.error(`[Scheduler] Erro ao remover conta ${igreja.nome}:`, err.message);
        }
    }

    console.log(`[Scheduler] Limpeza concluída. ${removidas} conta(s) removida(s).`);
}

// ─── Job: backup diário do banco SQLite ──────────────────────────────────
async function executarJobBackupBanco() {
    const db = getDb();
    const dbPath = process.env.DB_PATH || "./data/secretaria.db";
    const backupDir = process.env.BACKUP_DIR || "./data/backups";
    const fs = require("fs");
    const path = require("path");

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().slice(0, 10);
    const destPath = path.join(backupDir, `secretaria-${timestamp}.db`);

    try {
        await db.backup(destPath);
        console.log(`[Scheduler] Backup do banco criado: ${destPath}`);

        // Remove backups com mais de 7 dias
        const arquivos = fs
            .readdirSync(backupDir)
            .filter((f) => f.startsWith("secretaria-") && f.endsWith(".db"))
            .sort();
        const limite = new Date();
        limite.setDate(limite.getDate() - 7);
        for (const arq of arquivos) {
            const dataArq = arq.replace("secretaria-", "").replace(".db", "");
            if (dataArq < limite.toISOString().slice(0, 10)) {
                fs.unlinkSync(path.join(backupDir, arq));
                console.log(`[Scheduler] Backup antigo removido: ${arq}`);
            }
        }
    } catch (err) {
        console.error("[Scheduler] Erro ao criar backup:", err.message);
    }
}

// ─── Registra o cron ───────────────────────────────────────────────────────
// "0 9 * * *" → todos os dias às 09:00 UTC = 06:00 BRT (UTC-3)
function iniciarScheduler() {
    if (process.env.NODE_ENV !== "production") {
        console.log("[Scheduler] Desabilitado em ambiente de desenvolvimento (NODE_ENV ≠ production).");
        return;
    }
    cron.schedule("0 9 * * *", executarJobAniversariantes, {
        timezone: "UTC",
    });
    console.log("[Scheduler] Job de aniversariantes agendado para 06:00 (Brasília).");

    cron.schedule("0 9 * * *", executarJobTrialExpirando, {
        timezone: "UTC",
    });
    console.log("[Scheduler] Job de trial expirando agendado para 06:00 (Brasília).");

    // Limpeza de contas não verificadas — diariamente às 03:00 BRT (06:00 UTC)
    cron.schedule("0 6 * * *", executarJobLimpezaContasNaoVerificadas, {
        timezone: "UTC",
    });
    console.log("[Scheduler] Job de limpeza de contas não verificadas agendado para 03:00 (Brasília).");

    // Agenda pastoral — lembrete diário do dia seguinte às 06:00 BRT (09:00 UTC)
    cron.schedule("0 9 * * *", executarJobAgendaPastoralDiaAnterior, { timezone: "UTC" });
    console.log("[Scheduler] Job de agenda pastoral (dia anterior) agendado para 06:00 (Brasília).");

    // Agenda pastoral — resumo semanal toda segunda-feira às 06:00 BRT (09:00 UTC)
    cron.schedule("0 9 * * 1", executarJobAgendaPastoralSemanal, { timezone: "UTC" });
    console.log("[Scheduler] Job de agenda pastoral (semanal) agendado para segundas-feiras 06:00 (Brasília).");

    // Aniversariantes — aviso com 2 dias de antecedência (diário às 06:00 BRT)
    cron.schedule("0 9 * * *", executarJobAniversariantesDoisDias, { timezone: "UTC" });
    console.log("[Scheduler] Job de aniversariantes (2 dias) agendado para 06:00 (Brasília).");

    // Aniversariantes — resumo semanal toda segunda-feira às 06:00 BRT
    cron.schedule("0 9 * * 1", executarJobAniversariantesSemana, { timezone: "UTC" });
    console.log("[Scheduler] Job de aniversariantes (semanal) agendado para segundas-feiras 06:00 (Brasília).");

    // Backup diário do banco às 02:00 BRT (05:00 UTC)
    cron.schedule("0 5 * * *", executarJobBackupBanco, { timezone: "UTC" });
    console.log("[Scheduler] Job de backup do banco agendado para 02:00 (Brasília).");
}

module.exports = {
    iniciarScheduler,
    executarJobAniversariantes,
    executarJobAniversariantesDoisDias,
    executarJobAniversariantesSemana,
    executarJobTrialExpirando,
    executarJobLimpezaContasNaoVerificadas,
    executarJobAgendaPastoralDiaAnterior,
    executarJobAgendaPastoralSemanal,
    executarJobBackupBanco,
};
