# ⛪ SecretariaSistema

> **SaaS completo de gestão de membros para igrejas evangélicas** — Cadastro, carteiras digitais PDF, relatórios, multi-tenant, pagamento via Stripe.

---

## 🏗️ Arquitetura

```
SecretariaSistema/
├── backend/          ← Node.js + Express + SQLite
├── frontend/         ← React + Vite + Tailwind CSS
└── deploy/           ← NGINX + Systemd + Script de deploy
    ├── nginx/
    ├── systemd/
    └── deploy.sh
```

---

## ✨ Funcionalidades

| Módulo            | Descrição                                                            |
| ----------------- | -------------------------------------------------------------------- |
| 🏠 Landing Page   | Página institucional SaaS com planos e preços                        |
| 🔐 Autenticação   | JWT, multi-usuário com perfis (admin / secretário / visitante)       |
| ⛪ Multi-tenant   | Cada igreja é isolada, com identidade visual própria                 |
| 👥 Membros        | Cadastro completo (dados pessoais, eclesiásticos, família, endereço) |
| 🪪 Carteiras      | Geração de carteiras em PDF com QR Code de validação                 |
| 📊 Relatórios     | Dashboard com gráficos, filtros e exportação CSV                     |
| 💳 Stripe         | Planos por assinatura (mensal/anual) + portal de cobrança            |
| 🔍 Verificação    | URL pública para validar carteira via QR Code                        |
| 🎨 Personalização | Logo, cores (primária, secundária, texto), dados da igreja           |

---

## 📋 Campos do Cadastro de Membro

### Dados Pessoais

- Nome completo, nome social
- Data de nascimento, sexo, estado civil
- CPF, RG (órgão + UF), título de eleitor
- Nacionalidade, naturalidade
- Profissão, escolaridade

### Contato

- Celular _(obrigatório)_, telefone, WhatsApp, e-mail

### Endereço

- CEP, logradouro, número, complemento, bairro, cidade, estado

### Dados Eclesiásticos

- Situação (ativo / inativo / transferido / falecido / disciplina)
- Cargo (Membro, Diácono, Pastor, etc.)
- Data de conversão, data/local de batismo nas águas
- Batismo no Espírito Santo
- Data e forma de entrada na igreja
- Departamentos / células / dons ministeriais

### Família

- Nome do pai, mãe, cônjuge e filhos

---

## 📦 Planos SaaS

| Plano        | Membros   | Preço Mensal |
| ------------ | --------- | ------------ |
| Básico       | até 100   | R$ 49,90     |
| Profissional | até 500   | R$ 99,90     |
| Premium      | Ilimitado | R$ 199,90    |

> Todos os planos incluem **14 dias de trial gratuito**.

---

## 🚀 Instalação Local (Desenvolvimento)

### Pré-requisitos

- Node.js ≥ 20
- npm ≥ 10

### Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas chaves

npm install
npm run seed     # Popula banco com dados demo
npm run dev      # Inicia em http://localhost:3001
```

**Credenciais demo:**

- E-mail: `admin@igrejagv.com.br`
- Senha: `Admin@123`

### Frontend

```bash
cd frontend
npm install
npm run dev      # Inicia em http://localhost:3000
```

---

## 🌐 Deploy em Produção (Linux + NGINX)

### Requisitos do servidor

- Ubuntu 22.04 LTS
- 1 vCPU / 1GB RAM mínimo
- Domínio apontado para o IP do servidor

### Passos

```bash
# 1. Clone o repositório no servidor
git clone https://github.com/suaorg/secretariasistema /var/www/secretariasistema

# 2. Configure o .env do backend
nano /var/www/secretariasistema/backend/.env

# 3. Execute o script de deploy
sudo bash /var/www/secretariasistema/deploy/deploy.sh
```

### Configuração do .env (obrigatória em produção)

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<string-aleatoria-longa-e-segura>

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

FRONTEND_URL=https://secretariasistema.com.br
```

### Configurar Stripe Webhook

No painel Stripe, crie um webhook apontando para:

```
https://seudominio.com.br/api/webhooks/stripe
```

Eventos necessários:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 🔌 API — Principais Endpoints

### Auth

| Método | Rota                  | Descrição                 |
| ------ | --------------------- | ------------------------- |
| POST   | `/api/auth/registrar` | Cria nova conta de igreja |
| POST   | `/api/auth/login`     | Login                     |
| GET    | `/api/auth/me`        | Dados do usuário logado   |

### Membros

| Método | Rota                    | Descrição                     |
| ------ | ----------------------- | ----------------------------- |
| GET    | `/api/membros`          | Lista com paginação e filtros |
| POST   | `/api/membros`          | Cadastra novo membro          |
| GET    | `/api/membros/:id`      | Detalhes de um membro         |
| PUT    | `/api/membros/:id`      | Atualiza membro               |
| DELETE | `/api/membros/:id`      | Remove membro                 |
| POST   | `/api/membros/:id/foto` | Upload de foto                |

### Carteiras

| Método | Rota                          | Descrição            |
| ------ | ----------------------------- | -------------------- |
| POST   | `/api/carteiras/:id/gerar`    | Gera PDF da carteira |
| GET    | `/api/carteiras/:id/download` | Download do PDF      |

### Planos / Stripe

| Método | Rota                   | Descrição                  |
| ------ | ---------------------- | -------------------------- |
| GET    | `/api/planos`          | Lista planos disponíveis   |
| POST   | `/api/planos/checkout` | Inicia sessão de pagamento |
| POST   | `/api/planos/portal`   | Acessa portal de cobrança  |

### Público (sem autenticação)

| Método | Rota                                      | Descrição                  |
| ------ | ----------------------------------------- | -------------------------- |
| GET    | `/api/publico/planos`                     | Planos para a landing page |
| GET    | `/api/publico/igrejas/:slug`              | Dados públicos da igreja   |
| GET    | `/api/publico/verificar-membro/:slug/:id` | Valida QR Code da carteira |

---

## 🧱 Banco de Dados (SQLite)

| Tabela          | Descrição                            |
| --------------- | ------------------------------------ |
| `planos`        | Planos SaaS com preços e recursos    |
| `igrejas`       | Tenants (cada igreja é um tenant)    |
| `usuarios`      | Usuários admin/secretário por igreja |
| `membros`       | Todos os membros com dados completos |
| `departamentos` | Departamentos da igreja              |
| `celulas`       | Células/grupos da igreja             |

---

## 🛡️ Segurança

- Senhas com `bcrypt` (cost 12)
- Autenticação via JWT (expiração configurável)
- Rate limiting no login (10 req/15min)
- Helmet.js para headers HTTP
- Isolamento completo entre igrejas (multi-tenant)
- HTTPS via Let's Encrypt (Certbot)

---

## 📄 Licença

MIT © SecretariaSistema
