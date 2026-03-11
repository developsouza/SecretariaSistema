# Gestão Secretaria — Sprints de Adequação SaaS B2C

> Documento de rastreamento do desenvolvimento crítico.
> Cada sprint detalha o que foi feito, como testar e o que falta para considerar completo.

---

## ✅ Sprint 1 — Recuperação de Senha

**Status:** Implementado | **Data:** 03/03/2026

### O que foi feito

| Arquivo                                 | Alteração                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `backend/src/routes/auth.js`            | +3 rotas: `POST /esqueci-senha`, `GET /validar-token/:token`, `POST /redefinir-senha` |
| `frontend/src/pages/EsqueciSenha.jsx`   | Nova página — form de solicitação + tela de sucesso                                   |
| `frontend/src/pages/RedefinirSenha.jsx` | Nova página — valida token na URL, form nova senha, sucesso c/ redirect               |
| `frontend/src/App.jsx`                  | Rotas `/esqueci-senha` e `/redefinir-senha` registradas                               |
| `frontend/src/pages/LoginPage.jsx`      | Link "Esqueceu sua senha?" adicionado abaixo do form                                  |
| `frontend/src/services/api.js`          | `authAPI.esqueciSenha()`, `authAPI.validarToken()`, `authAPI.redefinirSenha()`        |

### Fluxo completo

```
1. LoginPage → "Esqueceu sua senha?" → /esqueci-senha
2. Usuário informa e-mail → POST /api/auth/esqueci-senha
   → Gera UUID como reset_token, salva com reset_expiry = NOW + 2h
   → Se SMTP configurado: envia e-mail com link /redefinir-senha?token={uuid}
   → Se SMTP não configurado: loga token no console
   → Sempre retorna sucesso (evita enumeração de e-mail)
3. Usuário acessa /redefinir-senha?token=...
   → GET /api/auth/validar-token/:token (valida expiração)
   → Token inválido: tela de erro com botão "Solicitar novo link"
   → Token válido: mostra e-mail mascarado + form de nova senha
4. Usuário salva nova senha → POST /api/auth/redefinir-senha
   → Valida token novamente
   → Atualiza senha_hash, limpa reset_token e reset_expiry
   → Redireciona para /login após 3,5s
```

### Rate limiting implementado

- `POST /esqueci-senha`: **5 requisições / 15 min** (previne abuso de envio de e-mail)

### Como testar sem SMTP

1. Não configure `SMTP_USER`/`SMTP_PASS` no `.env`
2. Chame `POST /api/auth/esqueci-senha` com e-mail válido
3. O token aparece no **console do servidor**:
    ```
    [Auth] Reset token para admin@igrejagv.com.br: xxxxxxxx-...
    [Auth] URL: http://localhost:3000/redefinir-senha?token=xxxxxxxx-...
    ```
4. Acesse a URL no browser

### Variáveis de ambiente necessárias para e-mail funcionar

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu@gmail.com
SMTP_PASS=sua_senha_de_app        # App Password do Google (não a senha normal)
FRONTEND_URL=https://seudominio.com
```

### Pendências / próximas melhorias

- [ ] **Rate limit por IP + por e-mail** (atualmente só por IP via express-rate-limit)
- [ ] **Verificação de e-mail no registro** — sem verificação, tokens de reset chegam para e-mails inválidos
- [ ] **Página de "Esqueci senha" na área do dashboard** (para usuário já logado que quer enviar para outro usuário)

---

## ✅ Sprint 2 — E-mails de Trial Expirando

**Status:** Implementado | **Data:** 03/03/2026

### O que foi feito

| Arquivo                             | Alteração                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `backend/src/services/scheduler.js` | +função `executarJobTrialExpirando()`, +template HTML `gerarHtmlTrial()`, +cron registrado, +export atualizado |

### Fluxo

O job roda **todo dia às 06:00 BRT** (junto ao job de aniversariantes) e:

1. Busca todas as igrejas com `stripe_status = 'trialing'`
2. Calcula `diasRestantes = trial_end - hoje`
3. Nos **marcos abaixo**, cria notificação interna + envia e-mail ao admin:

| `diasRestantes` | Tipo de notificação | Ação                              |
| --------------- | ------------------- | --------------------------------- |
| `7`             | `trial_aviso_7d`    | "Seu trial expira em 7 dias"      |
| `1`             | `trial_aviso_1d`    | "Último dia do trial"             |
| `0`             | `trial_aviso_0d`    | "Trial expira hoje"               |
| `-1`            | `trial_expirado`    | "Trial expirado — Acesso pausado" |

- **Deduplicação:** usa tabela `notificacoes` — só cria se `tipo + date(created_at) = hoje` não existe
- **Fallback:** se SMTP não configurado, registra no console

### Templates de e-mail

| Marco     | Cor header         | Emoji | CTA                 |
| --------- | ------------------ | ----- | ------------------- |
| T-7       | Azul `#1a56db`     | ⏳    | "Escolher um plano" |
| T-1 e T-0 | Âmbar `#d97706`    | 🚨    | "Escolher um plano" |
| Expirado  | Vermelho `#dc2626` | 🔒    | "Reativar agora"    |

Todos contêm URL `{FRONTEND_URL}/dashboard/planos`.

### Como testar manualmente

```js
// No terminal do backend:
const { executarJobTrialExpirando } = require("./src/services/scheduler");
executarJobTrialExpirando().then(() => console.log("Pronto"));
```

Ou adicione uma rota temporária de debug:

```js
// Em server.js (remover antes de produção)
app.get("/debug/trial-job", async (req, res) => {
    const { executarJobTrialExpirando } = require("./services/scheduler");
    await executarJobTrialExpirando();
    res.json({ ok: true });
});
```

### Pendências / próximas melhorias

- [ ] **Grace period de 30 dias** após expiração (atualmente `assinaturaAtiva` bloqueia imediatamente)
    - Sugestão: mudar middleware para bloquear somente se `stripe_status = 'canceled'` E `data_cancelamento + 30d < hoje`
- [ ] **Notificação in-app** de trial no header do dashboard (banner amarelo/vermelho)
    - Depende de: adicionar `trial_end` e `stripe_status` no retorno de `GET /auth/me`
    - Já disponível em `req.igreja` no backend; só precisa ser exposto no `GET /auth/me`
- [ ] **E-mail de boas-vindas** ao início do trial no registro (`POST /auth/registrar`)

---

## ✅ Sprint 3 — Billing Anual Conectado

**Status:** Implementado | **Data:** 03/03/2026

### O que foi feito

| Arquivo                                   | Alteração                                                                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/pages/dashboard/Planos.jsx` | Spinner por card individual, badge de período na assinatura atual, aviso quando `stripe_price_id_anual` não configurado |

### Estado do backend (já estava correto)

- `POST /api/planos/checkout` já recebia e processava `{ plano_id, periodo }`
- Seleção de price_id: `periodo === 'anual' ? plano.stripe_price_id_anual : plano.stripe_price_id_mensal`
- Erro tratado: `"Plano sem price_id Stripe configurado"` quando o campo é `NULL`

### O que mudou no frontend

1. **Spinner por card** — `checkingOutId` rastreia qual `plano_id` está em checkout; somente aquele botão mostra spinner
2. **Badge de período** — card de assinatura atual exibe "Mensal" ou "Anual" com ícone de calendário
3. **Aviso de configuração** — quando `periodo = 'anual'` mas nenhum plano tem `stripe_price_id_anual`, aparece banner âmbar explicando o que configurar; botões ficam desabilitados

### Como configurar preços anuais no Stripe

1. Acesse o Stripe Dashboard → Products
2. Para cada produto (Básico, Profissional, Premium), crie um Price com `billing_period = yearly`
3. Copie o `price_id` (começa com `price_...`)
4. Execute no banco:

```sql
UPDATE planos SET stripe_price_id_anual = 'price_XXXX_anual' WHERE nome = 'Básico';
UPDATE planos SET stripe_price_id_anual = 'price_XXXX_anual' WHERE nome = 'Profissional';
UPDATE planos SET stripe_price_id_anual = 'price_XXXX_anual' WHERE nome = 'Premium';
```

5. Fazer o mesmo para `stripe_price_id_mensal` se ainda não configurado

### Pendências / próximas melhorias

- [ ] **Tela de confirmação de upgrade/downgrade** — atualmente redireciona direto para Stripe sem mostrar resumo
- [ ] **Proration no Stripe** — configurar no webhook `checkout.session.completed` para salvar `plano_periodo`
    - O campo `plano_periodo` existe em `igrejas` mas o webhook em `routes/webhooks.js` não o atualiza
    - **Fix necessário:** no handler `checkout.session.completed`, salvar `session.metadata.periodo` em `plano_periodo`
- [ ] **Comparação de preços** — mostrar economia anual em destaque (ex: "Economize R$ 119,80/ano")

---

## ✅ Sprint 4 — Upgrade Wall com CTA

**Status:** Implementado | **Data:** 03/03/2026

### O que foi feito

| Arquivo                                          | Alteração                                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `frontend/src/components/UpgradeModal.jsx`       | Novo componente — modal âmbar com resumo numérico, benefícios e CTA para `/dashboard/planos`  |
| `frontend/src/pages/dashboard/membros/Lista.jsx` | Botão "Novo Membro" verifica `membros_ativos >= limite` antes de navegar; abre modal se cheio |
| `frontend/src/pages/dashboard/membros/Form.jsx`  | `onError` da mutation detecta `code === "MEMBER_LIMIT_REACHED"` e abre modal em vez de toast  |

### Fluxo completo

```
1. Usuário clica em "Novo Membro" na lista
   → Consulta GET /api/dashboard/resumo (cacheada 60s)
   → totalAtivos >= limite? → UpgradeModal aberto (sem navegar)
   → Caso contrário → navega para /dashboard/membros/novo

2. Usuário preenche o form e clica "Salvar Membro"
   → POST /api/membros retorna 403 com { code: "MEMBER_LIMIT_REACHED" }
   → UpgradeModal aberto (em vez do toast genérico)

3. Dentro do modal:
   → "Agora não" → fecha modal
   → "Ver planos" → fecha modal + navigate("/dashboard/planos")
```

### Dados utilizados

- `resumo.membros_ativos` e `resumo.limite` — retornados por `GET /api/dashboard/resumo`
- `code: "MEMBER_LIMIT_REACHED"` — retornado pelo backend em `routes/membros.js` (linha ~136)
- Backend já expõe `limite_membros` em `req.igreja` (middleware `auth.js`) e via `GET /auth/me`

### Componente UpgradeModal — API

```jsx
<UpgradeModal
    isOpen={boolean}
    onClose={() => void}
    limiteMembros={number}   // ex: 50
    totalAtivos={number}     // ex: 50 (opcional — usa limiteMembros como fallback)
/>
```

### Pendências / próximas melhorias

- [ ] **Barra de progresso de uso** — ex: "50/50 membros (100%)" como barra horizontal no Resumo do dashboard
- [ ] **Badge de aviso antecipado** — quando uso ≥ 80%, mostrar badge âmbar no menu lateral de Membros

---

## ✅ Sprint 5 — Grace Period de 30 dias

**Status:** Implementado | **Data:** 03/03/2026

### O que foi feito

| Arquivo                                    | Alteração                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `backend/src/database/db.js`               | Migração incremental: `ALTER TABLE igrejas ADD COLUMN cancelado_em TEXT`                               |
| `backend/src/middlewares/auth.js`          | `authMiddleware` expõe `grace_period` e `grace_days_left` em `req.igreja`; `assinaturaAtiva` reescrito |
| `backend/src/routes/webhooks.js`           | Handler `customer.subscription.deleted` salva `cancelado_em = datetime('now')`                         |
| `backend/src/routes/membros.js`            | Nova rota `GET /api/membros/exportar` — CSV com BOM UTF-8, funciona durante grace period               |
| `frontend/src/layouts/DashboardLayout.jsx` | Banner vermelho de grace period acima do conteúdo; botões "Exportar dados" + "Reativar agora"          |

### Comportamento por status

| `stripe_status`     | `grace_period` | GET      | POST/PUT/PATCH/DELETE                  |
| ------------------- | -------------- | -------- | -------------------------------------- |
| `active`            | `false`        | ✅ livre | ✅ livre                               |
| `trialing`          | `false`        | ✅ livre | ✅ livre                               |
| `canceled`          | `true` (≤30d)  | ✅ livre | ❌ 402 `GRACE_PERIOD` + dias restantes |
| `canceled`          | `false` (>30d) | ❌ 402   | ❌ 402 `SUBSCRIPTION_INACTIVE`         |
| `past_due` / outros | `false`        | ❌ 402   | ❌ 402 `SUBSCRIPTION_INACTIVE`         |

### Fluxo de exportação CSV

```
GET /api/membros/exportar
  → authMiddleware (necessita token)
  → assinaturaAtiva (grace period: GET permitido)
  → Retorna CSV com BOM (compatível Excel) + Content-Disposition
```

### Campos exportados no CSV

`numero_membro`, `nome_completo`, `situacao`, `sexo`, `data_nascimento`, `cpf`, `rg`, `celular`, `email`, `cargo`, `funcao`, `estado_civil`, `naturalidade`, `estado`, `data_entrada_igreja`, `data_batismo`, `congregacao_nome`

### Banner Frontend

- Aparece automaticamente quando `usuario.igreja.grace_period === true` (resolvido em `GET /auth/me`)
- Exibe: dias restantes, botão de download CSV, link "Reativar agora" → `/dashboard/planos`
- Botões de criar/editar/excluir que tentarem chamar a API receberão `402 GRACE_PERIOD` — o frontend os trata com toast de erro

### Pendências / próximas melhorias

- [ ] **Desabilitar visualmente** botões de criar/editar/excluir quando `grace_period = true` (atualmente o bloqueio é só no backend — o botão é clicável mas falha)
- [ ] **E-mail de aviso** quando a assinatura é cancelada (via scheduler ou webhook handler)

---

## ✅ Sprint 6 — Verificação de E-mail no Registro

**Status:** Implementado | **Data:** 03/03/2026

### O que foi feito

| Arquivo                                 | Alteração                                                                                                                                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/database/db.js`            | Migração: `ALTER TABLE usuarios ADD COLUMN email_verificado / email_token / email_token_expiry`                                                                                                                 |
| `backend/src/routes/auth.js`            | Helper `enviarEmailVerificacao()`, rate limiter `reenviarLimiter`, modificação no `POST /registrar`, nova rota `GET /verificar-email/:token`, nova rota `POST /reenviar-verificacao`, bloqueio no `POST /login` |
| `frontend/src/pages/VerificarEmail.jsx` | Nova página — 3 estados (loading / sucesso / erro+reenvio)                                                                                                                                                      |
| `frontend/src/pages/RegistroPage.jsx`   | Tela de sucesso atualizada para orientar verificação de e-mail                                                                                                                                                  |
| `frontend/src/pages/LoginPage.jsx`      | Trata erro `EMAIL_NOT_VERIFIED` com banner âmbar + botão de reenvio inline                                                                                                                                      |
| `frontend/src/services/api.js`          | `authAPI.verificarEmail()`, `authAPI.reenviarVerificacao()`                                                                                                                                                     |
| `frontend/src/App.jsx`                  | Rota `/verificar-email` registrada                                                                                                                                                                              |

### Fluxo completo

```
1. Usuário preenche /registro e envia
   → POST /api/auth/registrar
   → Igreja criada com stripe_status = 'pending_verification', trial_end = NULL
   → Usuario criado com email_verificado = 0, email_token = UUID, email_token_expiry = agora + 24h
   → E-mail enviado com link /verificar-email?token={uuid}
   → Tela de sucesso: "Verifique seu e-mail"

2. Usuário clica no link do e-mail → /verificar-email?token=...
   → GET /api/auth/verificar-email/:token
   → Token inválido/expirado → tela de erro com form de reenvio
   → Token válido → email_verificado = 1, stripe_status = 'trialing', trial_end = hoje + 14d
   → Mensagem de sucesso + botão "Fazer login"

3. Usuário tenta fazer login sem verificar
   → POST /api/auth/login retorna 403 { code: "EMAIL_NOT_VERIFIED", email }
   → Banner âmbar na LoginPage com opção "Reenviar link" (rate limit: 3 req/15 min)
```

### Comportamento por `stripe_status`

| `stripe_status`        | Permite login               | Permite acesso |
| ---------------------- | --------------------------- | -------------- |
| `pending_verification` | ❌ 403 `EMAIL_NOT_VERIFIED` | ❌             |
| `trialing`             | ✅                          | ✅             |
| `active`               | ✅                          | ✅             |

### Como testar sem SMTP

1. Não configure `SMTP_USER`/`SMTP_PASS` no `.env`
2. Registre uma nova conta em `/registro`
3. O token aparece no **console do servidor**:
    ```
    [Auth] SMTP não configurado. URL de verificação para user@test.com: http://localhost:3000/verificar-email?token=...
    ```
4. Acesse a URL no browser
5. Após confirmar, o login funciona normalmente

### Pendências / próximas melhorias

- [ ] **Bloquear acesso ao dashboard** se `stripe_status = 'pending_verification'` (por segurança extra no middleware)
- [ ] **E-mail de boas-vindas** após confirmação (além do e-mail de verificação)
- [ ] **Exclusão automática** de contas não verificadas após X dias (limpeza via scheduler)

---

## ✅ Sprint 7 — Onboarding Guiado

**Status:** Implementado | **Data:** 03/03/2026

### O que foi feito

| Arquivo                                           | Alteração                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `backend/src/database/db.js`                      | Migração: `ALTER TABLE igrejas ADD COLUMN onboarding_steps TEXT DEFAULT '{}'`        |
| `backend/src/middlewares/auth.js`                 | Adiciona `onboarding_steps` ao SELECT e expõe em `req.igreja` (parseado como objeto) |
| `backend/src/routes/igrejas.js`                   | Nova rota `PATCH /api/igrejas/onboarding` — merge do JSON atual com o body recebido  |
| `frontend/src/services/api.js`                    | `igrejasAPI.marcarOnboarding(steps)` — chama `PATCH /api/igrejas/onboarding`         |
| `frontend/src/components/OnboardingChecklist.jsx` | Novo componente — checklist de 6 passos, barra de progresso, botão "Dispensar"       |
| `frontend/src/pages/dashboard/Resumo.jsx`         | Importa e renderiza `<OnboardingChecklist totais={totais} />` logo abaixo do header  |

### Passos do checklist e lógica de detecção

| #   | Passo                           | Detectado automaticamente por                                  | Link de ação                      |
| --- | ------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| 1   | Conta criada                    | Sempre `true`                                                  | —                                 |
| 2   | Adicione o logo da sua igreja   | `usuario.igreja.logo_url != null`                              | `/dashboard/configuracoes#visual` |
| 3   | Configure as cores da sua marca | `cor_primaria !== '#1a56db'` ou `cor_secundaria !== '#6366f1'` | `/dashboard/configuracoes#visual` |
| 4   | Cadastre o primeiro membro      | `totais.membros_ativos > 0`                                    | `/dashboard/membros/novo`         |
| 5   | Gere a primeira carteirinha     | `totais.carteiras_geradas > 0`                                 | `/dashboard/carteiras`            |
| 6   | Escolha um plano                | `usuario.igreja.stripe_status === 'active'`                    | `/dashboard/planos`               |

### Comportamento

- O card aparece no Painel (`Resumo.jsx`) enquanto houver passos incompletos
- Passos concluídos aparecem com `✅` e texto riscado; passos pendentes são clicáveis (navegam para a rota de ação)
- Barra de progresso mostra `N/6 concluídos`
- Botão `✕` "Dispensar" persiste `{ dispensado: true }` via `PATCH /api/igrejas/onboarding` e esconde o card permanentemente
- Quando **todos os 6 passos** estiverem concluídos, o card desaparece automaticamente (sem precisar dispensar)

### Fluxo da API

```
PATCH /api/igrejas/onboarding
  Authorization: Bearer {token}
  Body: { "dispensado": true }

  → Lê onboarding_steps atual do banco
  → Merge com body recebido
  → Salva JSON atualizado em igrejas.onboarding_steps
  → Retorna { onboarding_steps: { ... } }
```

### Pendências / próximas melhorias

- [ ] **Re-exibir checklist** se novos passos importantes forem adicionados no futuro (versionar os passos)
- [ ] **Marcar passos individualmente** no backend quando ações específicas ocorrem (ex: upload de logo marca step automaticamente via rota)
- [ ] **Tooltip de dica** em cada passo explicando brevemente o que fazer

---

## ✅ Sprint 8 — JWT em httpOnly Cookie

**Status:** Implementado | **Data:** 03/03/2026

### O que foi feito

| Arquivo                           | Alteração                                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `backend/package.json`            | `+cookie-parser` instalado                                                                                                  |
| `backend/src/server.js`           | `+require("cookie-parser")`, `app.use(cookieParser())` antes do `express.json`                                              |
| `backend/src/middlewares/auth.js` | `rawToken` lê: 1) `req.cookies.token` 2) `Authorization: Bearer` 3) `req.query.token`                                       |
| `backend/src/routes/auth.js`      | `POST /login` seta cookie httpOnly; `POST /logout` limpa o cookie; `token` removido do body de resposta                     |
| `frontend/src/services/api.js`    | `withCredentials: true` na instância axios; interceptor de `Authorization` removido; `authAPI.logout()` adicionado          |
| `frontend/src/hooks/useAuth.jsx`  | `localStorage.setItem("ss_token")` removido; `verificarSessao` não verifica token local; `logout` chama `POST /auth/logout` |

### Comportamento do cookie

| Atributo   | Valor                             | Motivo                                         |
| ---------- | --------------------------------- | ---------------------------------------------- |
| `httpOnly` | `true`                            | Inacessível a JavaScript — protege contra XSS  |
| `sameSite` | `"strict"`                        | Bloqueia CSRF em requisições cross-site        |
| `secure`   | `true` (produção) / `false` (dev) | Obriga HTTPS em produção; dev funciona em HTTP |
| `maxAge`   | 7 dias (ms)                       | Consistente com `JWT_EXPIRES_IN=7d`            |
| `path`     | `"/"`                             | Enviado em todas as rotas do servidor          |

### Prioridade de leitura do token no `authMiddleware`

```
1. req.cookies.token          ← httpOnly cookie (fluxo principal)
2. Authorization: Bearer ...  ← compatibilidade com clientes externos / testes
3. req.query.token            ← downloads diretos (ex: exportar CSV)
```

### Fluxo de login/logout

```
Login:
  POST /api/auth/login { email, senha }
  → Gera JWT → res.cookie("token", jwt, { httpOnly, sameSite=strict, secure, maxAge=7d })
  → Retorna { usuario: { ... } } (sem token no body)

Logout:
  POST /api/auth/logout
  → res.clearCookie("token")
  → Retorna { message: "Sessão encerrada com sucesso." }

Frontend ao iniciar:
  → authAPI.me() com withCredentials=true
  → Cookie enviado automaticamente → backend valida → retorna dados do usuário
  → Sem cookie ou cookie expirado → 401 → redirect /login
```

### Pendências / próximas melhorias

- [ ] **Refresh token** — emitir token de longa duração em cookie separado para renovar o JWT sem novo login
- [ ] **Revogar sessões** — tabela de tokens revogados ou registro de `jti` no banco para logout forçado (ex: troca de senha)
- [ ] **Configurar `FRONTEND_URL` como domínio do cookie** em multi-tenant quando frontend e backend estiverem em domínios diferentes

---

## ✅ Sprint 9 — Consolidação de Melhorias (Pendências Abertas)

**Status:** Implementado | **Data:** 03/03/2026

### O que foi feito

| Arquivo                                          | Alteração                                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/middlewares/auth.js`                | Adiciona `i.trial_end` ao SELECT; expõe `trial_end` e `trial_days_left` em `req.igreja`; `assinaturaAtiva` bloqueia `pending_verification` com 402 `PENDING_EMAIL_VERIFICATION` |
| `backend/src/routes/auth.js`                     | Helper `enviarEmailBoasVindas()`; `GET /verificar-email/:token` busca `nome_igreja` e chama welcome email após ativar trial                                                     |
| `backend/src/services/scheduler.js`              | +`executarJobLimpezaContasNaoVerificadas` — remove igrejas/usuários com `pending_verification` após 7 dias; cron diário às 03:00 BRT                                            |
| `backend/src/routes/webhooks.js`                 | `customer.subscription.deleted` agora envia e-mail de cancelamento ao admin com link de reativação                                                                              |
| `frontend/src/layouts/DashboardLayout.jsx`       | +Banner âmbar de trial expirando (aparece quando `trialing` e `trial_days_left ≤ 7`); usa `trial_end` de `usuario.igreja`                                                       |
| `frontend/src/pages/dashboard/membros/Lista.jsx` | Botões "Novo Membro", "Editar" e "Remover" desabilitados visualmente (`disabled + opacity-40`) quando `grace_period = true`; tooltip de aviso                                   |
| `frontend/src/pages/dashboard/Planos.jsx`        | No modo anual, exibe "💰 Economize R$ X,XX por ano" calculado em tempo real (`preco_mensal * 12 - preco_anual`)                                                                 |
| `frontend/src/pages/dashboard/Resumo.jsx`        | `StatCard` ampliado com prop opcional `progress`; card "Membros Ativos" mostra barra de progresso colorida (verde → âmbar ≥75% → vermelho ≥90%)                                 |

### Detalhes por área

#### Banner de trial expirando

- Visível nos últimos **7 dias** do trial (inclusive no dia zero)
- Cor âmbar; CTA "Escolher plano" → `/dashboard/planos`
- Desaparece automaticamente após conversão para `active`

#### Bloqueio de `pending_verification`

- `assinaturaAtiva` retorna **402** `PENDING_EMAIL_VERIFICATION` para qualquer rota protegida
- O login já bloqueava o acesso; agora o middleware garante segurança em profundidade

#### E-mail de boas-vindas pós-verificação

- Disparado imediatamente após confirmação do e-mail em `GET /verificar-email/:token`
- Informa que o trial de 14 dias foi ativado + botão "Acessar o painel"
- Silencioso se SMTP não configurado (log no console)

#### Limpeza automática de contas não verificadas

- Job cron diário — apaga usuários com `email_verificado = 0` em igrejas `pending_verification` com mais de **7 dias**
- Se a igreja ficar sem usuários, é removida também
- Prevenção de acúmulo de dados de usuários que nunca verificaram o e-mail

#### E-mail ao cancelar assinatura

- Webhook `customer.subscription.deleted` busca o admin da igreja e envia e-mail vermelho com CTA "Reativar assinatura"
- 30 dias de grace period são mencionados explicitamente no corpo do e-mail

#### Botões desabilitados no grace period

- `Lista.jsx`: "Novo Membro" (`disabled`), "Editar" (`disabled`), "Remover" (`disabled`)
- Todos exibem `title="Acesso somente leitura durante o período de carência"` no hover

#### Economia anual nos planos

- Cálculo: `preco_mensal × 12 − preco_anual`
- Exibido somente quando `periodo === 'anual'` e `preco_mensal > 0`

#### Barra de progresso de uso de membros

- Renderizada dentro do card "Membros Ativos" no Painel
- Verde até 74%, âmbar de 75–89%, vermelho a partir de 90%

### Pendências resolvidas nesta sprint

Todas as pendências abaixo, originárias de sprints anteriores, foram resolvidas:

| Sprint origem | Pendência                                              |
| ------------- | ------------------------------------------------------ |
| Sprint 2      | Notificação in-app de trial no header do dashboard     |
| Sprint 4      | Barra de progresso de uso no Resumo                    |
| Sprint 5      | Desabilitar visualmente botões no grace period         |
| Sprint 5      | E-mail de aviso ao cancelar assinatura                 |
| Sprint 6      | Bloquear acesso ao dashboard se `pending_verification` |
| Sprint 6      | E-mail de boas-vindas após confirmação                 |
| Sprint 6      | Exclusão automática de contas não verificadas          |
| Sprint 3      | Comparação de preços — economia anual                  |

---

## 🟢 Sistema Completo — Sem Backlog Pendente

O sistema está finalizado com todas as funcionalidades SaaS B2C implementadas. Possíveis evoluções futuras:

- **Refresh token** — renovar JWT sem novo login (Sprint 8 pendência técnica)
- **Revogar sessões** — tabela de tokens revogados para logout forçado
- **Tela de confirmação** de upgrade/downgrade antes do Stripe Checkout
- **Proration** — atualizar `plano_periodo` corretamente via webhook `checkout.session.completed` (já implementado no código, pendente validação em produção)

---

## 🔴 Backlog — Próximas Sprints

> ✅ **Todas as sprints planejadas foram implementadas.** Ver seção "Sistema Completo" acima para evoluções opcionais.

---

## Variáveis de Ambiente — Referência Completa

```env
# ─── Servidor ──────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ─── Banco de dados ────────────────────────────────────────────────────────
DB_PATH=./data/secretaria.db

# ─── JWT ──────────────────────────────────────────────────────────────────
JWT_SECRET=troque_por_string_aleatoria_64_chars
JWT_EXPIRES_IN=7d

# ─── Stripe ───────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── SMTP (obrigatório para Sprint 1 e Sprint 2) ───────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sistema@suaigreja.com.br
SMTP_PASS=xxxx_xxxx_xxxx_xxxx      # App Password (não senha normal)

# ─── Notificações ─────────────────────────────────────────────────────────
NOTIFY_EMAIL=admin@suaigreja.com.br  # Se definido, substitui o e-mail do admin
```

---

## Como Rodar Localmente

```bash
# Backend
cd backend
npm install
npm run dev         # nodemon src/server.js → http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev         # Vite → http://localhost:3000

# Seed (primeira vez)
cd backend
npm run seed        # Cria igreja demo + admin demo
```

Credenciais demo após seed:

- **URL:** `http://localhost:3000/login`
- **E-mail:** `admin@igrejagv.com.br`
- **Senha:** `Admin@123`
