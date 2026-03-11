const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const DB_PATH = process.env.DB_PATH || "./data/secretaria.db";

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma("journal_mode = WAL");
        db.pragma("foreign_keys = ON");
        db.pragma("busy_timeout = 5000");
        initSchema();
    }
    return db;
}

function initSchema() {
    db.exec(`
    -- ─── Planos SaaS ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS planos (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      nome        TEXT NOT NULL,
      descricao   TEXT,
      limite_membros INTEGER NOT NULL DEFAULT 100,
      preco_mensal REAL NOT NULL DEFAULT 0,
      preco_anual  REAL NOT NULL DEFAULT 0,
      stripe_price_id_mensal TEXT,
      stripe_price_id_anual  TEXT,
      recursos    TEXT NOT NULL DEFAULT '{}',
      ativo       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Igrejas (Tenants) ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS igrejas (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      nome            TEXT NOT NULL,
      nome_curto      TEXT,
      cnpj            TEXT UNIQUE,
      email           TEXT UNIQUE NOT NULL,
      telefone        TEXT,
      celular         TEXT,
      site            TEXT,
      -- Endereço
      cep             TEXT,
      logradouro      TEXT,
      numero          TEXT,
      complemento     TEXT,
      bairro          TEXT,
      cidade          TEXT NOT NULL,
      estado          TEXT NOT NULL,
      -- Identidade visual
      logo_url        TEXT,
      marca_dagua_url TEXT,
      cor_primaria    TEXT NOT NULL DEFAULT '#1a56db',
      cor_secundaria  TEXT NOT NULL DEFAULT '#6366f1',
      cor_texto       TEXT NOT NULL DEFAULT '#ffffff',
      -- Denominação
      denominacao     TEXT,
      pastor_nome     TEXT,
      pastor_titulo   TEXT DEFAULT 'Pastor',
      fundacao_ano    INTEGER,
      -- Plano / Stripe
      plano_id        TEXT REFERENCES planos(id),
      stripe_customer_id      TEXT UNIQUE,
      stripe_subscription_id  TEXT UNIQUE,
      stripe_status           TEXT DEFAULT 'inactive',
      plano_periodo           TEXT DEFAULT 'mensal',
      plano_vencimento        TEXT,
      trial_end               TEXT,
      -- Status
      ativo           INTEGER NOT NULL DEFAULT 1,
      slug            TEXT UNIQUE,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Usuários (Admin da Igreja) ───────────────────────────────────────
    CREATE TABLE IF NOT EXISTS usuarios (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      igreja_id   TEXT REFERENCES igrejas(id) ON DELETE CASCADE,
      nome        TEXT NOT NULL,
      email       TEXT NOT NULL,
      senha_hash  TEXT NOT NULL,
      perfil      TEXT NOT NULL DEFAULT 'secretario',
      ativo       INTEGER NOT NULL DEFAULT 1,
      ultimo_login TEXT,
      reset_token TEXT,
      reset_expiry TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(email, igreja_id)
    );

    -- ─── Membros ──────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS membros (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      igreja_id       TEXT NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
      numero_membro   TEXT,           -- Número do Rol
      funcao          TEXT,           -- Função na igreja
      tipo_cadastro   TEXT,           -- Tipo de cadastro
      -- Dados Pessoais
      nome_completo   TEXT NOT NULL,
      nome_social     TEXT,
      data_nascimento TEXT,
      sexo            TEXT,
      estado_civil    TEXT,
      nacionalidade   TEXT DEFAULT 'Brasileira',
      outra_nacionalidade TEXT,
      cidade_nascimento TEXT,
      estado_nascimento TEXT,
      naturalidade    TEXT,           -- legado (cidade/estado texto livre)
      doador_sangue   INTEGER DEFAULT 0,
      tipo_sangue     TEXT,
      cpf             TEXT,
      rg              TEXT,
      rg_orgao        TEXT,
      rg_uf           TEXT,
      titulo_eleitor  TEXT,
      zona_eleitoral  TEXT,
      secao_eleitoral TEXT,
      -- Profissão / Educação
      profissao       TEXT,
      empresa_trabalho TEXT,
      escolaridade    TEXT,
      graduacao       TEXT,
      -- Contato
      email           TEXT,
      telefone        TEXT,
      celular         TEXT NOT NULL,
      whatsapp        TEXT,
      -- Endereço
      cep             TEXT,
      endereco_completo TEXT,
      logradouro      TEXT,
      numero          TEXT,
      complemento     TEXT,
      bairro          TEXT,
      cidade          TEXT,           -- cidade_residencia
      estado          TEXT,           -- estado_residencia
      -- Dados Eclesiásticos
      data_conversao  TEXT,
      data_ingresso   TEXT,           -- Data de ingresso na igreja
      data_entrada_igreja TEXT NOT NULL DEFAULT (date('now')),
      forma_entrada   TEXT DEFAULT 'conversão',
      data_saida      TEXT,
      motivo_saida    TEXT,
      situacao        TEXT NOT NULL DEFAULT 'ativo',
      -- Batismo
      data_batismo    TEXT,           -- data_batismo (genérica)
      data_batismo_agua TEXT,
      cidade_batismo  TEXT,
      estado_batismo  TEXT,
      ano_batismo_espirito_santo INTEGER,
      denominacao_origem TEXT,
      data_mudanca_denominacao TEXT,
      -- Veio de outra assembleia
      veio_outra_assembleia INTEGER DEFAULT 0,
      data_mudanca    TEXT,
      cidade_origem   TEXT,
      estado_origem   TEXT,
      -- Cargos Ministeriais (flags)
      cargo           TEXT,           -- cargo principal (seleção)
      auxiliar_trabalho INTEGER DEFAULT 0,
      auxiliar_trabalho_detalhes TEXT,
      diacono         INTEGER DEFAULT 0,
      diacono_detalhes TEXT,
      presbitero      INTEGER DEFAULT 0,
      presbitero_detalhes TEXT,
      evangelista     INTEGER DEFAULT 0,
      evangelista_detalhes TEXT,
      pastor          INTEGER DEFAULT 0,
      pastor_detalhes TEXT,
      -- Departamentos / Ministérios
      departamentos   TEXT DEFAULT '[]',
      celulas         TEXT DEFAULT '[]',
      dons_ministeriais TEXT DEFAULT '[]',
      -- Família
      nome_pai        TEXT,
      nome_mae        TEXT,
      nome_conjuge    TEXT,
      certidao_casamento TEXT,
      data_casamento  TEXT,
      livro_casamento TEXT,
      folha_casamento TEXT,
      filhos          TEXT DEFAULT '[]',
      -- Foto
      foto_url        TEXT,
      -- Carteira
      carteira_gerada INTEGER DEFAULT 0,
      carteira_url    TEXT,
      carteira_gerada_em TEXT,
      -- Dados adicionais (JSON livre)
      dados_extras    TEXT DEFAULT '{}',
      -- Observações
      observacoes     TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(cpf, igreja_id)
    );

    -- ─── Congregações ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS congregacoes (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      igreja_id   TEXT NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
      nome        TEXT NOT NULL,
      -- Endereço
      cep         TEXT,
      logradouro  TEXT,
      numero      TEXT,
      complemento TEXT,
      bairro      TEXT,
      cidade      TEXT,
      estado      TEXT,
      -- Responsável / Dirigente 1
      dirigente_nome  TEXT,
      dirigente_cargo TEXT,
      dirigente_celular TEXT,
      -- Dirigente 2
      dirigente2_nome  TEXT,
      dirigente2_cargo TEXT,
      dirigente2_celular TEXT,
      -- Metadados
      ativo       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Departamentos ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS departamentos (
      id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      igreja_id  TEXT NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
      nome       TEXT NOT NULL,
      descricao  TEXT,
      lider_id   TEXT REFERENCES membros(id) ON DELETE SET NULL,
      ativo      INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Células / Grupos ─────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS celulas (
      id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      igreja_id  TEXT NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
      nome       TEXT NOT NULL,
      endereco   TEXT,
      lider_id   TEXT REFERENCES membros(id) ON DELETE SET NULL,
      dia_semana TEXT,
      horario    TEXT,
      ativo      INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Índices ──────────────────────────────────────────────────────────
    -- ─── Notificações ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS notificacoes (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      igreja_id   TEXT NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
      tipo        TEXT NOT NULL DEFAULT 'aniversario',
      titulo      TEXT NOT NULL,
      mensagem    TEXT NOT NULL,
      lida        INTEGER NOT NULL DEFAULT 0,
      dados       TEXT DEFAULT '{}',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Pré-Cadastros Públicos ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS pre_cadastros (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      igreja_id       TEXT NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
      -- Status do pré-cadastro
      status          TEXT NOT NULL DEFAULT 'pendente',  -- pendente | aprovado | rejeitado
      motivo_rejeicao TEXT,
      aprovado_por    TEXT,
      aprovado_em     TEXT,
      rejeitado_por   TEXT,
      rejeitado_em    TEXT,
      membro_id       TEXT REFERENCES membros(id) ON DELETE SET NULL,       -- preenchido após aprovação
      -- Dados Pessoais
      nome_completo   TEXT NOT NULL,
      data_nascimento TEXT,
      sexo            TEXT,
      estado_civil    TEXT,
      cpf             TEXT,
      rg              TEXT,
      rg_orgao        TEXT,
      -- Contato
      email           TEXT,
      celular         TEXT NOT NULL,
      whatsapp        TEXT,
      telefone        TEXT,
      -- Endereço
      cep             TEXT,
      logradouro      TEXT,
      numero          TEXT,
      complemento     TEXT,
      bairro          TEXT,
      cidade          TEXT,
      estado          TEXT,
      -- Dados Eclesiásticos
      forma_entrada   TEXT,
      data_batismo_agua TEXT,
      data_conversao  TEXT,
      denominacao_origem TEXT,
      cargo           TEXT,
      -- Congregação preferida (texto livre para identificação)
      congregacao_preferida TEXT,
      -- Foto
      foto_url        TEXT,
      -- Observações
      observacoes     TEXT,
      -- Dados extras (JSON)
      dados_extras    TEXT DEFAULT '{}',
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── Agenda de Eventos e Agenda Pastoral ─────────────────────────────
    CREATE TABLE IF NOT EXISTS agenda_eventos (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      igreja_id   TEXT NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
      tipo        TEXT NOT NULL DEFAULT 'evento',  -- 'pastoral' | 'evento'
      titulo      TEXT NOT NULL,
      descricao   TEXT,
      local       TEXT,
      data_inicio TEXT NOT NULL,   -- YYYY-MM-DD
      hora_inicio TEXT,            -- HH:MM
      data_fim    TEXT,            -- YYYY-MM-DD (para eventos multi-dia)
      hora_fim    TEXT,            -- HH:MM
      cor         TEXT DEFAULT '#1a56db',
      dia_todo    INTEGER NOT NULL DEFAULT 0,
      recorrente  INTEGER NOT NULL DEFAULT 0,
      recorrencia TEXT,            -- 'semanal' | 'mensal' | 'anual'
      notificado_dia_anterior INTEGER NOT NULL DEFAULT 0,
      created_by  TEXT REFERENCES usuarios(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notificacoes_igreja ON notificacoes(igreja_id, lida);
    CREATE INDEX IF NOT EXISTS idx_congregacoes_igreja ON congregacoes(igreja_id);
    CREATE INDEX IF NOT EXISTS idx_membros_igreja ON membros(igreja_id);
    CREATE INDEX IF NOT EXISTS idx_membros_situacao ON membros(situacao);
    CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
    CREATE INDEX IF NOT EXISTS idx_igrejas_slug ON igrejas(slug);
    CREATE INDEX IF NOT EXISTS idx_igrejas_stripe ON igrejas(stripe_customer_id);
    CREATE INDEX IF NOT EXISTS idx_pre_cadastros_igreja ON pre_cadastros(igreja_id, status);
    CREATE INDEX IF NOT EXISTS idx_agenda_igreja_tipo ON agenda_eventos(igreja_id, tipo, data_inicio);

    -- ─── Superadmins (Master/SaaS owner) ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS superadmins (
      id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      nome         TEXT NOT NULL,
      email        TEXT UNIQUE NOT NULL,
      senha_hash   TEXT NOT NULL,
      ativo        INTEGER NOT NULL DEFAULT 1,
      ultimo_login TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_superadmins_email ON superadmins(email);
  `);

    // ─── Migração incremental (bancos existentes) ─────────────────────────
    const novasColunas = [
        "ALTER TABLE membros ADD COLUMN funcao TEXT",
        "ALTER TABLE membros ADD COLUMN tipo_cadastro TEXT",
        "ALTER TABLE membros ADD COLUMN outra_nacionalidade TEXT",
        "ALTER TABLE membros ADD COLUMN cidade_nascimento TEXT",
        "ALTER TABLE membros ADD COLUMN estado_nascimento TEXT",
        "ALTER TABLE membros ADD COLUMN doador_sangue INTEGER DEFAULT 0",
        "ALTER TABLE membros ADD COLUMN tipo_sangue TEXT",
        "ALTER TABLE membros ADD COLUMN empresa_trabalho TEXT",
        "ALTER TABLE membros ADD COLUMN graduacao TEXT",
        "ALTER TABLE membros ADD COLUMN endereco_completo TEXT",
        "ALTER TABLE membros ADD COLUMN data_ingresso TEXT",
        "ALTER TABLE membros ADD COLUMN data_batismo TEXT",
        "ALTER TABLE membros ADD COLUMN cidade_batismo TEXT",
        "ALTER TABLE membros ADD COLUMN estado_batismo TEXT",
        "ALTER TABLE membros ADD COLUMN ano_batismo_espirito_santo INTEGER",
        "ALTER TABLE membros ADD COLUMN denominacao_origem TEXT",
        "ALTER TABLE membros ADD COLUMN data_mudanca_denominacao TEXT",
        "ALTER TABLE membros ADD COLUMN veio_outra_assembleia INTEGER DEFAULT 0",
        "ALTER TABLE membros ADD COLUMN data_mudanca TEXT",
        "ALTER TABLE membros ADD COLUMN cidade_origem TEXT",
        "ALTER TABLE membros ADD COLUMN estado_origem TEXT",
        "ALTER TABLE membros ADD COLUMN auxiliar_trabalho INTEGER DEFAULT 0",
        "ALTER TABLE membros ADD COLUMN auxiliar_trabalho_detalhes TEXT",
        "ALTER TABLE membros ADD COLUMN diacono INTEGER DEFAULT 0",
        "ALTER TABLE membros ADD COLUMN diacono_detalhes TEXT",
        "ALTER TABLE membros ADD COLUMN presbitero INTEGER DEFAULT 0",
        "ALTER TABLE membros ADD COLUMN presbitero_detalhes TEXT",
        "ALTER TABLE membros ADD COLUMN evangelista INTEGER DEFAULT 0",
        "ALTER TABLE membros ADD COLUMN evangelista_detalhes TEXT",
        "ALTER TABLE membros ADD COLUMN pastor INTEGER DEFAULT 0",
        "ALTER TABLE membros ADD COLUMN pastor_detalhes TEXT",
        "ALTER TABLE membros ADD COLUMN certidao_casamento TEXT",
        "ALTER TABLE membros ADD COLUMN data_casamento TEXT",
        "ALTER TABLE membros ADD COLUMN livro_casamento TEXT",
        "ALTER TABLE membros ADD COLUMN folha_casamento TEXT",
        "ALTER TABLE membros ADD COLUMN congregacao_nome TEXT",
        "ALTER TABLE igrejas ADD COLUMN assinatura_pastor_url TEXT",
        "ALTER TABLE igrejas ADD COLUMN marca_dagua_url TEXT",
        "ALTER TABLE igrejas ADD COLUMN cores_funcoes TEXT DEFAULT '{}'",
        "ALTER TABLE membros ADD COLUMN congregacao_id TEXT REFERENCES congregacoes(id)",
        "ALTER TABLE congregacoes ADD COLUMN dirigente2_nome TEXT",
        "ALTER TABLE congregacoes ADD COLUMN dirigente2_cargo TEXT",
        "ALTER TABLE congregacoes ADD COLUMN dirigente2_celular TEXT",
        // Sprint 5 — Grace Period 30 dias
        "ALTER TABLE igrejas ADD COLUMN cancelado_em TEXT",
        // Sprint 6 — Verificação de E-mail no Registro
        "ALTER TABLE usuarios ADD COLUMN email_verificado INTEGER DEFAULT 0",
        "ALTER TABLE usuarios ADD COLUMN email_token TEXT",
        "ALTER TABLE usuarios ADD COLUMN email_token_expiry TEXT",
        // Sprint 7 — Onboarding Guiado
        "ALTER TABLE igrejas ADD COLUMN onboarding_steps TEXT DEFAULT '{}'",
        // Pré-Cadastros — campos de naturalidade
        "ALTER TABLE pre_cadastros ADD COLUMN cidade_nascimento TEXT",
        "ALTER TABLE pre_cadastros ADD COLUMN estado_nascimento TEXT",
        // Sprint 8 — Entrega de Carteira
        "ALTER TABLE membros ADD COLUMN carteira_entregue INTEGER DEFAULT 0",
        "ALTER TABLE membros ADD COLUMN carteira_entregue_em TEXT",
        "ALTER TABLE membros ADD COLUMN carteira_entregue_para TEXT",
        // Agenda — pastor WhatsApp e email
        "ALTER TABLE igrejas ADD COLUMN pastor_whatsapp TEXT",
        "ALTER TABLE igrejas ADD COLUMN pastor_email TEXT",
    ];
    for (const sql of novasColunas) {
        try {
            db.exec(sql);
        } catch (_) {
            /* coluna já existe */
        }
    }

    // Sprint 6 — marcar email_verificado = 1 para usuários já existentes (anteriores à feature)
    // Usuários de igrejas que não estão em 'pending_verification' já passaram pelo processo de registro anterior
    db.exec(`
        UPDATE usuarios SET email_verificado = 1
        WHERE email_verificado = 0
          AND id IN (
            SELECT u.id FROM usuarios u
            JOIN igrejas i ON i.id = u.igreja_id
            WHERE i.stripe_status != 'pending_verification'
          )
    `);

    // Migração de recursos de planos — garantir que Profissional e Premium tenham `agenda: true`
    try {
        const planos = db.prepare("SELECT id, nome, recursos FROM planos").all();
        for (const plano of planos) {
            if (plano.nome === "Profissional" || plano.nome === "Premium") {
                const recursos = JSON.parse(plano.recursos || "{}");
                if (!recursos.agenda) {
                    recursos.agenda = true;
                    db.prepare("UPDATE planos SET recursos = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(recursos), plano.id);
                    console.log(`[DB] Plano "${plano.nome}" atualizado: agenda=true`);
                }
            }
        }
    } catch (_) {
        /* planos ainda não criados — seed será executado depois */
    }

    // Seed superadmin padrão se ainda não existir nenhum
    const totalSuperadmins = db.prepare("SELECT COUNT(*) AS n FROM superadmins").get().n;
    if (totalSuperadmins === 0) {
        const email = process.env.SUPERADMIN_EMAIL || "master@gestaosecretaria.com.br";
        const senha = process.env.SUPERADMIN_SENHA || "Master@2025!";
        const hash = bcrypt.hashSync(senha, 12);
        db.prepare("INSERT INTO superadmins (id, nome, email, senha_hash) VALUES (?, ?, ?, ?)").run(uuidv4(), "Master Admin", email, hash);
        console.log("[DB] Superadmin criado → e-mail:", email, "| senha (altere após o 1º acesso):", senha);
    }
}

module.exports = { getDb };
