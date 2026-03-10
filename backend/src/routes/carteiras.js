const router = require("express").Router();
const { getDb } = require("../database/db");
const { authMiddleware, assinaturaAtiva } = require("../middlewares/auth");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

router.use(authMiddleware);
router.use(assinaturaAtiva);

const CARTEIRAS_DIR = "./uploads/carteiras";
if (!fs.existsSync(CARTEIRAS_DIR)) fs.mkdirSync(CARTEIRAS_DIR, { recursive: true });

// Converte hex para RGB
function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return [r, g, b];
}

// Converte RGB para hex
function rgbToHex(r, g, b) {
    return (
        "#" +
        [r, g, b]
            .map((x) =>
                Math.max(0, Math.min(255, Math.round(x)))
                    .toString(16)
                    .padStart(2, "0"),
            )
            .join("")
    );
}

// Escurece um canal de cor
const dk = (c, amt = 40) => Math.max(0, c - amt);

// Mistura duas cores (a=0..1 → proporção da cor c sobre fundo bg)
const mix = (c, bg, a) => Math.round(c * a + bg * (1 - a));

// ─── POST /api/carteiras/:membroId/gerar ─────────────────────────────────
router.post("/:membroId/gerar", async (req, res, next) => {
    try {
        const db = getDb();
        const membro = db
            .prepare(
                `SELECT m.*, c.nome AS congregacao_nome
                 FROM membros m
                 LEFT JOIN congregacoes c ON c.id = m.congregacao_id
                 WHERE m.id = ? AND m.igreja_id = ?`,
            )
            .get(req.params.membroId, req.igreja.id);
        if (!membro) return res.status(404).json({ error: "Membro não encontrado" });

        const igreja = db.prepare("SELECT * FROM igrejas WHERE id = ?").get(req.igreja.id);

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const verifyUrl = `${baseUrl}/verificar/${igreja.slug}/${membro.id}`;
        const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 200, margin: 1, color: { dark: "#1a1a2e", light: "#ffffff" } });

        // RG brasileiro: 85,6 × 54 mm → 243 × 153 pt
        const W = 243,
            H = 153,
            M = 16,
            GAP = 0;
        const PW = W * 2 + M * 2 + GAP;
        const PH = H + M * 2;

        const filename = `carteira-${membro.id}.pdf`;
        const outPath = path.join(CARTEIRAS_DIR, filename);

        const doc = new PDFDocument({
            size: [PW, PH],
            margin: 0,
            autoFirstPage: true,
            info: { Title: `Carteira de Membro – ${membro.nome_completo}`, Author: igreja.nome },
        });

        const stream = fs.createWriteStream(outPath);
        doc.pipe(stream);

        // baseX=0, baseY=0: margens de corte já estão embutidas no tamanho da página
        drawCardPair(doc, membro, igreja, qrBuffer, 0, 0);

        doc.end();
        stream.on("finish", () => {
            const carteiraUrl = `/uploads/carteiras/${filename}`;
            db.prepare("UPDATE membros SET carteira_gerada=1, carteira_url=?, carteira_gerada_em=datetime('now') WHERE id=?").run(
                carteiraUrl,
                membro.id,
            );
            res.json({ carteira_url: carteiraUrl, message: "Carteira gerada com sucesso!" });
        });
        stream.on("error", next);
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/carteiras/:membroId/entregar ──────────────────────────────
router.post("/:membroId/entregar", (req, res, next) => {
    try {
        const db = getDb();
        const { data_entrega, entregue_para } = req.body;

        if (!data_entrega || !entregue_para?.trim()) {
            return res.status(400).json({ error: "Data de entrega e destinatário são obrigatórios" });
        }

        const membro = db.prepare("SELECT id, carteira_gerada FROM membros WHERE id = ? AND igreja_id = ?").get(req.params.membroId, req.igreja.id);
        if (!membro) return res.status(404).json({ error: "Membro não encontrado" });
        if (!membro.carteira_gerada) return res.status(400).json({ error: "Carteira ainda não foi gerada para este membro" });

        db.prepare("UPDATE membros SET carteira_entregue = 1, carteira_entregue_em = ?, carteira_entregue_para = ? WHERE id = ?").run(
            data_entrega,
            entregue_para.trim(),
            membro.id,
        );

        res.json({ message: "Entrega registrada com sucesso!" });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/carteiras/:membroId/download ───────────────────────────────
router.get("/:membroId/download", (req, res, next) => {
    try {
        const db = getDb();
        const membro = db
            .prepare("SELECT carteira_url, nome_completo FROM membros WHERE id = ? AND igreja_id = ?")
            .get(req.params.membroId, req.igreja.id);
        if (!membro?.carteira_url) return res.status(404).json({ error: "Carteira não gerada" });

        const filePath = path.join("./", membro.carteira_url);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Arquivo não encontrado" });

        const nome = membro.nome_completo.replace(/\s+/g, "_");
        res.setHeader("Content-Disposition", `attachment; filename="carteira-${nome}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/carteiras/lote/pdf ────────────────────────────────────────
// Gera um único PDF A4 retrato com todas as carteiras empilhadas verticalmente.
// Cada par frente+verso ocupa 518×185pt; cabem até 4 pares por folha A4.
router.post("/lote/pdf", async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Informe os IDs dos membros" });
        if (ids.length > 200) return res.status(400).json({ error: "Máximo 200 carteiras por lote" });

        const db = getDb();
        const igreja = db.prepare("SELECT * FROM igrejas WHERE id = ?").get(req.igreja.id);
        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        // Dimensões do par de carteiras incluindo margens de corte
        const W = 243,
            H = 153,
            M = 16,
            GAP = 0;
        const CARD_W = W * 2 + M * 2 + GAP; // 518 pt
        const CARD_H = H + M * 2; // 185 pt

        // Layout A4 retrato (595,28 × 841,89 pt)
        const A4_W = 595.28;
        const A4_H = 841.89;
        const PAGE_MARGIN = 18; // margem superior/inferior
        const CARD_GAP = 8; // espaço entre pares de carteiras na página

        // Centraliza horizontalmente
        const OFFSET_X = (A4_W - CARD_W) / 2;
        // Quantas carteiras cabem por página
        const AVAILABLE_H = A4_H - PAGE_MARGIN * 2;
        const CARDS_PER_PAGE = Math.floor((AVAILABLE_H + CARD_GAP) / (CARD_H + CARD_GAP));

        const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="carteiras-lote.pdf"`);
        doc.pipe(res);

        let cardIndex = 0;
        for (const membroId of ids) {
            const membro = db
                .prepare(
                    `SELECT m.*, c.nome AS congregacao_nome
                     FROM membros m
                     LEFT JOIN congregacoes c ON c.id = m.congregacao_id
                     WHERE m.id = ? AND m.igreja_id = ?`,
                )
                .get(membroId, req.igreja.id);
            if (!membro) continue;

            const verifyUrl = `${baseUrl}/verificar/${igreja.slug}/${membro.id}`;
            const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 200, margin: 1, color: { dark: "#1a1a2e", light: "#ffffff" } });

            const posInPage = cardIndex % CARDS_PER_PAGE;
            if (cardIndex > 0 && posInPage === 0) {
                doc.addPage({ size: "A4", margin: 0 });
            }

            const offsetY = PAGE_MARGIN + posInPage * (CARD_H + CARD_GAP);
            drawCardPair(doc, membro, igreja, qrBuffer, OFFSET_X, offsetY);

            cardIndex++;
        }

        if (cardIndex === 0) {
            doc.end();
            return res.status(404).end();
        }

        doc.end();
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/carteiras/lote ─────────────────────────────────────────────
// Gera carteiras individuais para cada membro e retorna a lista de URLs.
router.post("/lote", async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Informe os IDs dos membros" });
        if (ids.length > 50) return res.status(400).json({ error: "Máximo 50 carteiras por vez" });

        // Dispara geração em background (simplificado — retorna lista de URLs)
        const resultados = [];
        for (const id of ids) {
            try {
                const r = await fetch(`http://localhost:${process.env.PORT || 3001}/api/carteiras/${id}/gerar`, {
                    method: "POST",
                    headers: { Authorization: req.headers.authorization },
                });
                const data = await r.json();
                resultados.push({ id, ...data });
            } catch {
                resultados.push({ id, error: "Falha ao gerar" });
            }
        }
        res.json({ resultados });
    } catch (err) {
        next(err);
    }
});

// ─── Cores padrão por cargo/função (espelho do frontend) ─────────────────
const CARGOS_CORES_PADRAO = {
    Membro: { cor_primaria: "#1e3a8a", cor_secundaria: "#3b82f6", cor_texto: "#ffffff" },
    "Membro (Feminino)": { cor_primaria: "#831843", cor_secundaria: "#f472b6", cor_texto: "#ffffff" },
    Diácono: { cor_primaria: "#5b21b6", cor_secundaria: "#8b5cf6", cor_texto: "#ffffff" },
    Diaconisa: { cor_primaria: "#831843", cor_secundaria: "#ec4899", cor_texto: "#ffffff" },
    Presbítero: { cor_primaria: "#0f4c5c", cor_secundaria: "#0e9aa7", cor_texto: "#ffffff" },
    Evangelista: { cor_primaria: "#92400e", cor_secundaria: "#f59e0b", cor_texto: "#ffffff" },
    Pastor: { cor_primaria: "#7f1d1d", cor_secundaria: "#ef4444", cor_texto: "#ffffff" },
    Missionário: { cor_primaria: "#064e3b", cor_secundaria: "#10b981", cor_texto: "#ffffff" },
    Obreiro: { cor_primaria: "#374151", cor_secundaria: "#6b7280", cor_texto: "#ffffff" },
    Líder: { cor_primaria: "#0c4a6e", cor_secundaria: "#0ea5e9", cor_texto: "#ffffff" },
    "Líder de Célula": { cor_primaria: "#0c4a6e", cor_secundaria: "#0ea5e9", cor_texto: "#ffffff" },
    "Líder de Departamento": { cor_primaria: "#312e81", cor_secundaria: "#818cf8", cor_texto: "#ffffff" },
    Auxiliar: { cor_primaria: "#374151", cor_secundaria: "#6b7280", cor_texto: "#ffffff" },
    Secretário: { cor_primaria: "#1a4731", cor_secundaria: "#16a34a", cor_texto: "#ffffff" },
    Tesoureiro: { cor_primaria: "#78350f", cor_secundaria: "#d97706", cor_texto: "#ffffff" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR");
}
function church(i) {
    return i.nome_curto || i.nome;
}
function drawPlaceholder(doc, x, y, w, h) {
    doc.rect(x, y, w, h).fill("#cccccc");
    doc.fontSize(6)
        .fillColor("#777777")
        .font("Helvetica")
        .text("SEM FOTO", x, y + h / 2 - 4, { width: w, align: "center" });
}

// ─── drawCardPair ─────────────────────────────────────────────────────────
// Desenha um par frente+verso no `doc` a partir de (baseX, baseY).
// baseX/baseY indicam o canto superior-esquerdo da área total, incluindo
// as margens de corte (M=16 pt em cada lado).
function drawCardPair(doc, membro, igreja, qrBuffer, baseX, baseY) {
    const W = 243,
        H = 153,
        M = 16,
        CM = 8,
        GAP = 0,
        P = 8;

    const FX = baseX + M; // frente — x inicial da face
    const VX = baseX + M + W + GAP; // verso  — x inicial da face
    const FY = baseY + M; // y inicial (frente e verso compartilham)
    const VY = baseY + M;

    // Cores base — usa as cores do cargo do membro, com fallback para as cores da igreja
    const coresFuncoes = (() => {
        try {
            return JSON.parse(igreja.cores_funcoes || "{}");
        } catch {
            return {};
        }
    })();
    const isFeminino = membro.sexo === "feminino";
    const cargoBase = membro.cargo || "Membro";
    const cargoKey = cargoBase === "Membro" && isFeminino ? "Membro (Feminino)" : cargoBase;
    // Prioridade: config personalizada da chave → padrão da chave →
    //             config personalizada do cargo base → padrão do cargo base
    const coresCargo = coresFuncoes[cargoKey] || CARGOS_CORES_PADRAO[cargoKey] || coresFuncoes[cargoBase] || CARGOS_CORES_PADRAO[cargoBase] || {};

    const [r1, g1, b1] = hexToRgb(coresCargo.cor_primaria || igreja.cor_primaria || "#1e3a8a");
    const [r2, g2, b2] = hexToRgb(coresCargo.cor_secundaria || igreja.cor_secundaria || "#3b82f6");
    const [rt, gt, bt] = hexToRgb(coresCargo.cor_texto || igreja.cor_texto || "#ffffff");

    const HEX1 = rgbToHex(r1, g1, b1);
    const HEX2 = rgbToHex(r2, g2, b2);
    const HEXDARK = rgbToHex(dk(r1, 25), dk(g1, 25), dk(b1, 25));
    const HEXTXT = rgbToHex(rt, gt, bt);

    const DTXT = [22, 28, 55];
    const LTXT = [115, 120, 145];
    const WHITE = [255, 255, 255];
    const BGCARD = [252, 253, 255];

    // ── Marcas de corte ────────────────────────────────────────────────────
    const cutColor = "#aaaaaa",
        cutW = 0.4;
    const cutMarks = (rx, ry, rw, rh) => {
        doc.save().strokeColor(cutColor).lineWidth(cutW);
        doc.moveTo(rx - CM, ry)
            .lineTo(rx - 2, ry)
            .stroke();
        doc.moveTo(rx, ry - CM)
            .lineTo(rx, ry - 2)
            .stroke();
        doc.moveTo(rx + rw + 2, ry)
            .lineTo(rx + rw + CM, ry)
            .stroke();
        doc.moveTo(rx + rw, ry - CM)
            .lineTo(rx + rw, ry - 2)
            .stroke();
        doc.moveTo(rx - CM, ry + rh)
            .lineTo(rx - 2, ry + rh)
            .stroke();
        doc.moveTo(rx, ry + rh + 2)
            .lineTo(rx, ry + rh + CM)
            .stroke();
        doc.moveTo(rx + rw + 2, ry + rh)
            .lineTo(rx + rw + CM, ry + rh)
            .stroke();
        doc.moveTo(rx + rw, ry + rh + 2)
            .lineTo(rx + rw, ry + rh + CM)
            .stroke();
        doc.restore();
    };
    cutMarks(FX, FY, W * 2 + GAP, H);

    // Linha de dobra
    doc.save()
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .dash(3, { space: 3 })
        .moveTo(VX, FY - CM)
        .lineTo(VX, FY + H + CM)
        .stroke()
        .undash()
        .restore();
    doc.fillColor("#bbbbbb")
        .fontSize(4)
        .font("Helvetica")
        .text("✂ dobrar aqui", VX - 28, FY - CM - 7, { width: 56, align: "center" });

    // ════════════════════════════════════════════════════════════════════════
    //  FRENTE — face esquerda
    // ════════════════════════════════════════════════════════════════════════
    const HEADER_H = 54,
        FOOTER_H = 22;
    const BODY_Y = FY + HEADER_H;
    const BODY_H = H - HEADER_H - FOOTER_H;

    doc.rect(FX, FY, W, H).fill(BGCARD);

    const hdrGrad = doc.linearGradient(FX, FY, FX + W, FY);
    hdrGrad.stop(0, HEX1).stop(1, HEX2);
    doc.rect(FX, FY, W, HEADER_H).fill(hdrGrad);
    doc.rect(FX, FY + HEADER_H - 2, W, 2).fill(HEXDARK);

    // Logo
    let logoDrawn = false;
    const LOGO_W = 72,
        LOGO_H = 48;
    const LOGO_X = FX + P;
    const LOGO_Y = FY + (HEADER_H - 2 - LOGO_H) / 2;
    if (igreja.logo_url) {
        const lp = path.resolve(__dirname, "../../uploads", igreja.logo_url.replace(/^\/uploads\//, "").replace(/^\//, ""));
        if (fs.existsSync(lp)) {
            try {
                doc.image(lp, LOGO_X, LOGO_Y, { fit: [LOGO_W, LOGO_H], align: "left", valign: "center" });
                logoDrawn = true;
            } catch {
                /* sem logo */
            }
        }
    }

    // Dados da igreja — ocupa a largura total do header (pode sobrepor logo)
    const INFO_X = FX + P;
    const INFO_W = W - P * 2;
    let infoY = FY + 11;

    doc.font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(HEXTXT)
        .text(igreja.nome.toUpperCase(), INFO_X, infoY, { width: INFO_W, align: "right", lineBreak: false, ellipsis: true });
    infoY = doc.y + 0;

    const endIgr = [
        igreja.logradouro && `${igreja.logradouro}${igreja.numero ? ", " + igreja.numero : ""}`,
        igreja.cidade && `${igreja.cidade}${igreja.estado ? "/" + igreja.estado : ""}`,
    ]
        .filter(Boolean)
        .join(" – ");
    if (endIgr) {
        doc.font("Helvetica-Bold")
            .fontSize(6)
            .fillColor(HEXTXT)
            .text(endIgr, INFO_X, infoY, { width: INFO_W, align: "right", lineBreak: false, ellipsis: true });
        infoY = doc.y + 0.5;
    }
    if (igreja.cnpj) {
        doc.font("Helvetica-Bold")
            .fontSize(5)
            .fillColor(HEXTXT)
            .text(`CNPJ: ${igreja.cnpj}`, INFO_X, infoY, { width: INFO_W, align: "right", lineBreak: false, ellipsis: true });
    }

    // Corpo da frente — divisão esquerda/direita
    const LEFT_W = Math.round(W * 0.75); // ~182pt: espaço amplo para texto
    const RIGHT_W = W - LEFT_W; // ~49pt: painel foto estreito
    const LEFT_X = FX;
    const RIGHT_X = FX + LEFT_W;

    doc.rect(RIGHT_X, BODY_Y, RIGHT_W, BODY_H).fill([240, 244, 252]);
    doc.rect(RIGHT_X, BODY_Y + 4, 0.5, BODY_H - 8).fill([r1, g1, b1]);

    const TX = LEFT_X + P;
    const TW = LEFT_W - P * 2;
    let ty = BODY_Y + 7;

    doc.font("Helvetica").fontSize(9).fillColor(LTXT).text("CARTEIRA DE IDENTIDADE DE", TX, ty, { width: TW, align: "center" });
    ty = doc.y + 2;

    const cargoLabel = (membro.cargo || "Membro").toUpperCase();
    doc.font("Helvetica-Bold")
        .fontSize(10)
        .fillColor([r1, g1, b1])
        .text(cargoLabel, TX, ty, { width: TW, align: "center", lineBreak: false, ellipsis: true });
    ty = doc.y + 4;

    doc.rect(TX, ty, TW, 0.5).fill([r1, g1, b1]);
    ty += 5;

    doc.font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(DTXT)
        .text(membro.nome_completo, TX, ty, { width: TW, align: "center", lineBreak: false, ellipsis: true });
    ty = doc.y + 5;

    // Helper campo (definido mas disponível para uso futuro)
    // eslint-disable-next-line no-unused-vars
    const fld = (lbl, val) => {
        if (!val) return;
        doc.font("Helvetica").fontSize(4).fillColor(LTXT).text(lbl, TX, ty, { width: TW });
        ty = doc.y + 0.5;
        doc.font("Helvetica-Bold").fontSize(5.5).fillColor(DTXT).text(val, TX, ty, { width: TW });
        ty = doc.y + 5;
    };

    const congregFrn = membro.congregacao_nome || membro.denominacao_origem || null;

    // Painel direito: Foto 3x4 com margem lateral de 6pt (sem Nº do ROL — já está no rodapé)
    const FOTO_W = RIGHT_W - 12; // 6pt de margem em cada lado
    const FOTO_H = Math.round(FOTO_W * (4 / 3)); // proporção 3x4
    const FOTO_X = RIGHT_X + (RIGHT_W - FOTO_W) / 2;
    const FOTO_Y = BODY_Y + (BODY_H - FOTO_H) / 2;

    doc.roundedRect(FOTO_X - 2, FOTO_Y - 2, FOTO_W + 4, FOTO_H + 4, 3).fill([r1, g1, b1]);
    doc.roundedRect(FOTO_X - 1, FOTO_Y - 1, FOTO_W + 2, FOTO_H + 2, 2.5).fill(WHITE);

    let fotoOk = false;
    if (membro.foto_url) {
        const fp = path.resolve(__dirname, "../../", membro.foto_url.replace(/^\//, ""));
        if (fs.existsSync(fp)) {
            try {
                doc.save();
                doc.roundedRect(FOTO_X, FOTO_Y, FOTO_W, FOTO_H, 2).clip();
                doc.image(fp, FOTO_X, FOTO_Y, { width: FOTO_W, height: FOTO_H, cover: [FOTO_W, FOTO_H] });
                doc.restore();
                fotoOk = true;
            } catch {
                /* */
            }
        }
    }
    if (!fotoOk) drawPlaceholder(doc, FOTO_X, FOTO_Y, FOTO_W, FOTO_H);

    // Congregação — base do painel esquerdo
    if (congregFrn) {
        const congY = BODY_Y + BODY_H - 18;
        doc.font("Helvetica").fontSize(5).fillColor(LTXT).text("CONGREGAÇÃO", TX, congY, { width: TW });
        doc.font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor(DTXT)
            .text(congregFrn, TX, doc.y + 0.5, { width: TW, lineBreak: false, ellipsis: true });
    }

    // Rodapé Frente
    const FFOOT_Y = FY + H - FOOTER_H;
    const footGrad = doc.linearGradient(FX, FFOOT_Y, FX + W, FFOOT_Y);
    footGrad.stop(0, HEXDARK).stop(1, HEX1);
    doc.rect(FX, FFOOT_Y, W, FOOTER_H).fill(footGrad);
    doc.rect(FX, FFOOT_Y, W, 1).fill(HEX2);

    const pLabel = igreja.pastor_nome ? `${igreja.pastor_titulo || "Pastor"}: ${igreja.pastor_nome}` : "";
    const numRolLabel = `ROL: ${String(membro.numero_membro || membro.id).padStart(4, "0")}`;
    doc.font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(HEXTXT)
        .text(numRolLabel, FX + P, FFOOT_Y + 4, { width: W - P * 2, align: "right" });
    doc.font("Helvetica-BoldOblique")
        .fontSize(5)
        .fillColor(HEXTXT)
        .text("Este cartão só terá validade com a apresentação da carta de recomendação.", FX + P, FFOOT_Y + 14, {
            width: W - P * 2,
            align: "center",
        });

    // ════════════════════════════════════════════════════════════════════════
    //  VERSO — face direita
    // ════════════════════════════════════════════════════════════════════════
    const V_HEADER_H = 28,
        V_FOOTER_H = 22;
    const V_BODY_Y = VY + V_HEADER_H;
    const V_BODY_H = H - V_HEADER_H - V_FOOTER_H;
    const V_SIG_H = 40;

    doc.rect(VX, VY, W, H).fill(BGCARD);

    const vHdrGrad = doc.linearGradient(VX, VY, VX + W, VY);
    vHdrGrad.stop(0, HEX2).stop(1, HEX1);
    doc.rect(VX, VY, W, V_HEADER_H).fill(vHdrGrad);
    doc.rect(VX, VY + V_HEADER_H - 2, W, 2).fill(HEXDARK);

    doc.font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(HEXTXT)
        .text("DADOS DO MEMBRO", VX + P, VY + 11, { width: W - P * 2, lineBreak: false });

    // QR Code — ancorado ao topo/meio vertical do corpo
    const QR_SIZE = 46;
    const QR_X = VX + W - P - QR_SIZE;
    // Bloco visual completo: borda superior (3) + QR + borda inferior (3) + texto "Verificar" (~10) = QR_SIZE + 16
    const QR_BLOCK_H = QR_SIZE + 16;
    const QR_Y = V_BODY_Y + (V_BODY_H - QR_BLOCK_H) / 2 + 2;

    doc.roundedRect(QR_X - 3, QR_Y - 3, QR_SIZE + 6, QR_SIZE + 6 + 10, 3).fill([r1, g1, b1]);
    doc.rect(QR_X - 2, QR_Y - 2, QR_SIZE + 4, QR_SIZE + 4).fill(WHITE);
    doc.image(qrBuffer, QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });
    doc.font("Helvetica")
        .fontSize(4)
        .fillColor([r1, g1, b1])
        .text("Verificar", QR_X - 3, QR_Y + QR_SIZE + 2, { width: QR_SIZE + 6, align: "center" });

    // Campos de dados
    const DATA_W = W - P * 2 - QR_SIZE - 6;
    const FULL_DATA_W = W - P * 2; // largura completa usada para campos acima do QR
    const COL_W = DATA_W / 2;
    const C1X = VX + P;
    const C2X = C1X + COL_W + 2;
    const ROW_H = 14;

    // filiacao deve ser calculada antes de vy para ajustar o offset de centralização
    const filiacao = [membro.nome_pai, membro.nome_mae].filter(Boolean).join(" / ") || null;

    // Centraliza verticalmente o bloco de dados + assinatura, como é feito com o QR code
    const FILIACAO_H = 18; // filiação sempre presente
    const DADOS_BLOCK_H = FILIACAO_H + 3 * ROW_H + 28 /* SIG_IMG_H */ + 10;
    let vy = V_BODY_Y + Math.max(2, Math.round((V_BODY_H - DADOS_BLOCK_H) / 2));

    const vFld = (lbl, val, cx, cw) => {
        if (!val || val === "—") return;
        doc.font("Helvetica").fontSize(5).fillColor(LTXT).text(lbl.toUpperCase(), cx, vy, { width: cw });
        doc.font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor(DTXT)
            .text(String(val), cx, doc.y + 0.5, { width: cw, lineBreak: false, ellipsis: true });
    };
    // Filiação — sempre exibida acima dos demais dados, fonte menor, largura total
    doc.font("Helvetica").fontSize(5).fillColor(LTXT).text("FILIA\u00c7\u00c3O", C1X, vy, { width: FULL_DATA_W, lineBreak: false });
    doc.font("Helvetica-Bold")
        .fontSize(6.5)
        .fillColor(DTXT)
        .text(filiacao || "\u2013", C1X, doc.y + 0.5, { width: FULL_DATA_W, lineBreak: true, ellipsis: true });
    vy = doc.y + 3;

    vFld("Membro Desde", membro.data_entrada_igreja ? formatDate(membro.data_entrada_igreja) : null, C1X, COL_W);
    vFld("Nacionalidade", membro.nacionalidade || "Brasileira", C2X, COL_W);
    vy += ROW_H;

    const naturalDe =
        membro.naturalidade ||
        (membro.cidade_nascimento ? `${membro.cidade_nascimento}${membro.estado_nascimento ? "/" + membro.estado_nascimento : ""}` : null);
    vFld("Natural de", naturalDe, C1X, COL_W);
    vFld("Estado Civil", membro.estado_civil ? membro.estado_civil.charAt(0).toUpperCase() + membro.estado_civil.slice(1) : null, C2X, COL_W);
    vy += ROW_H;

    const cpfFmt = membro.cpf ? membro.cpf.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : null;
    vFld("CPF", cpfFmt, C1X, COL_W);
    vFld(
        "Identidade (RG)",
        membro.rg ? `${membro.rg}${membro.rg_orgao ? " " + membro.rg_orgao : ""}${membro.rg_uf ? "/" + membro.rg_uf : ""}` : null,
        C2X,
        COL_W,
    );
    vy += ROW_H;

    const dataBat = membro.data_batismo_agua || membro.data_batismo;
    vFld("Data de Nascimento", membro.data_nascimento ? formatDate(membro.data_nascimento) : null, C1X, COL_W);
    vFld("Data do Batismo", dataBat ? formatDate(dataBat) : null, C2X, COL_W);
    // vy aqui = início do último row; conteúdo termina ~13pt abaixo
    // SIG_IMG_Y = vy + 14 (fim do row) + 4 (gap pequeno) = vy + 18
    // Mas queremos o mínimo possível: vy + 15 (só 2pt após o texto)

    // Área de assinatura — posicionada logo após os dados, com gap mínimo
    const SIG_CENTER_X = VX + P + DATA_W / 2;
    const SIG_LINE_W = 90,
        SIG_IMG_W = 110,
        SIG_IMG_H = 28;
    const SIG_IMG_Y = vy + 9;
    const SIG_LINE_Y = SIG_IMG_Y + SIG_IMG_H - 6;

    if (igreja.assinatura_pastor_url) {
        const sigPath = path.resolve(__dirname, "../../uploads", igreja.assinatura_pastor_url.replace(/^\/uploads\//, "").replace(/^\//, ""));
        if (fs.existsSync(sigPath)) {
            try {
                doc.image(sigPath, SIG_CENTER_X - SIG_IMG_W / 2, SIG_IMG_Y, { fit: [SIG_IMG_W, SIG_IMG_H], align: "center", valign: "bottom" });
            } catch {
                /* */
            }
        }
    }

    doc.rect(SIG_CENTER_X - SIG_LINE_W / 2, SIG_LINE_Y, SIG_LINE_W, 0.4).fill([r1, g1, b1]);
    doc.font("Helvetica-Bold")
        .fontSize(5.5)
        .fillColor(DTXT)
        .text(pLabel || "Assinatura do Pastor", SIG_CENTER_X - SIG_LINE_W / 2, SIG_LINE_Y + 2, { width: SIG_LINE_W, align: "center" });

    // Rodapé Verso
    const V_FOOT_Y = VY + H - V_FOOTER_H;
    const vFootGrad = doc.linearGradient(VX, V_FOOT_Y, VX + W, V_FOOT_Y);
    vFootGrad.stop(0, HEX1).stop(1, HEX2);
    doc.rect(VX, V_FOOT_Y, W, V_FOOTER_H).fill(vFootGrad);
    doc.rect(VX, V_FOOT_Y, W, 1).fill(HEX2);

    doc.font("Helvetica-Bold")
        .fontSize(5)
        .fillColor(HEXTXT)
        .text(`${church(igreja)} \u2022 Escaneie o QRCode para verificar a situação do membro.`, VX + P, V_FOOT_Y + 14, {
            width: W - P * 2 - 42,
            lineBreak: false,
            ellipsis: true,
        });
    doc.font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(HEXTXT)
        .text(String(new Date().getFullYear()), VX + P, V_FOOT_Y + 4, { width: W - P * 2, align: "right", lineBreak: false });
    doc.font("Helvetica-Bold")
        .fontSize(5.5)
        .fillColor(HEXTXT)
        .text(`ROL: ${String(membro.numero_membro || membro.id).padStart(4, "0")}`, VX + P, V_FOOT_Y + 13, {
            width: W - P * 2,
            align: "right",
            lineBreak: false,
        });
}

module.exports = router;
