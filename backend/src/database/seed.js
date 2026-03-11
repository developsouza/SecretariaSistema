require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { getDb } = require("./db");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

async function seed() {
    const db = getDb();
    console.log("🌱 Executando seed...");

    // ── Planos ────────────────────────────────────────────────────────────────
    const planos = [
        {
            id: uuidv4(),
            nome: "Básico",
            descricao: "Ideal para igrejas pequenas",
            limite_membros: 100,
            preco_mensal: 49.9,
            preco_anual: 479.0,
            recursos: JSON.stringify({ carteiras: true, qrcode: false, email: false, relatorios_basicos: true }),
        },
        {
            id: uuidv4(),
            nome: "Profissional",
            descricao: "Para igrejas em crescimento",
            limite_membros: 500,
            preco_mensal: 99.9,
            preco_anual: 959.0,
            recursos: JSON.stringify({
                carteiras: true,
                qrcode: true,
                email: true,
                agenda: true,
                relatorios_basicos: true,
                relatorios_avancados: true,
            }),
        },
        {
            id: uuidv4(),
            nome: "Premium",
            descricao: "Sem limites, para grandes igrejas",
            limite_membros: 999999,
            preco_mensal: 199.9,
            preco_anual: 1919.0,
            recursos: JSON.stringify({
                carteiras: true,
                qrcode: true,
                email: true,
                agenda: true,
                relatorios_basicos: true,
                relatorios_avancados: true,
                api_publica: true,
                suporte_prioritario: true,
            }),
        },
    ];

    const insertPlano = db.prepare(`
    INSERT OR IGNORE INTO planos (id, nome, descricao, limite_membros, preco_mensal, preco_anual, recursos)
    VALUES (@id, @nome, @descricao, @limite_membros, @preco_mensal, @preco_anual, @recursos)
  `);
    planos.forEach((p) => insertPlano.run(p));
    console.log("✅ Planos inseridos");

    // ── Igreja Demo ───────────────────────────────────────────────────────────
    const planoProId = db.prepare("SELECT id FROM planos WHERE nome='Profissional'").get()?.id;
    const igrejaId = uuidv4();

    db.prepare(
        `
    INSERT OR IGNORE INTO igrejas (id, nome, nome_curto, email, telefone, cidade, estado, denominacao, pastor_nome, slug, plano_id, stripe_status, ativo)
    VALUES (?, 'Igreja Evangélica Graça e Verdade', 'Igreja GV', 'admin@igrejagv.com.br', '(11) 3000-0000',
            'São Paulo', 'SP', 'Assembleia de Deus', 'João Carlos Silva', 'igrejagv', ?, 'active', 1)
  `,
    ).run(igrejaId, planoProId);
    console.log("✅ Igreja demo inserida");

    // ── Admin Demo ────────────────────────────────────────────────────────────
    const senhaHash = bcrypt.hashSync("Admin@123", 12);
    db.prepare(
        `
    INSERT OR IGNORE INTO usuarios (id, igreja_id, nome, email, senha_hash, perfil, ativo)
    VALUES (?, ?, 'Administrador', 'admin@igrejagv.com.br', ?, 'admin', 1)
  `,
    ).run(uuidv4(), igrejaId, senhaHash);
    console.log("✅ Usuário admin demo inserido (email: admin@igrejagv.com.br / senha: Admin@123)");

    console.log("\n✅ Seed concluído com sucesso!\n");
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
