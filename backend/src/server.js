require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

// Garante que os diretórios existam
["./data", "./uploads", "./uploads/fotos", "./uploads/logos"].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();

// Confia no primeiro proxy reverso (nginx) para que req.ip retorne o IP real do cliente.
// Necessário para o express-rate-limit funcionar corretamente em produção.
app.set("trust proxy", 1);

// ─── Segurança & Middlewares ───────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

// Stripe webhook precisa do body raw
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Rate limiting global — defesa de base contra flood
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300, // 300 req por IP a cada 15 min
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
    skip: (req) => req.path === "/health", // não limitar health check
});
app.use("/api/", globalLimiter);

// Arquivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Rotas ────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/igrejas", require("./routes/igrejas"));
app.use("/api/membros", require("./routes/membros"));
app.use("/api/congregacoes", require("./routes/congregacoes"));
app.use("/api/carteiras", require("./routes/carteiras"));
app.use("/api/planos", require("./routes/planos"));
app.use("/api/webhooks", require("./routes/webhooks"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/notificacoes", require("./routes/notificacoes"));
app.use("/api/publico", require("./routes/publico"));
app.use("/api/pre-cadastros", require("./routes/pre_cadastros"));
app.use("/api/agenda", require("./routes/agenda"));

// ─── Health check ─────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
});

// ─── Tratamento de erros ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada" }));

app.use((err, req, res, _next) => {
    console.error("[ERRO]", err.stack || err.message);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        error: err.message || "Erro interno do servidor",
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
});

// ─── Scheduler ───────────────────────────────────────────────────────────────
const { iniciarScheduler } = require("./services/scheduler");
iniciarScheduler();

// ─── Inicialização ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 SecretariaSistema API rodando na porta ${PORT}`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || "development"}`);
    console.log(`   Health:   http://localhost:${PORT}/health\n`);
});

module.exports = app;
