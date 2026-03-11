# Deploy — Gestão Secretaria na HostGator VPS (Ubuntu 22.04)

> Guia passo a passo para primeiro deploy e redeploys futuros.

---

## Pré-requisitos

- [ ] VPS HostGator contratada com Ubuntu 22.04 LTS
- [ ] Acesso SSH (usuário `root` ou com `sudo`)
- [ ] Domínio apontando para o IP da VPS (DNS propagado — pode levar até 24h)
- [ ] Código do projeto em um repositório GitHub (público ou privado)

---

## Parte 1 — Preparar o repositório

### 1.1 — Ajustar o deploy.sh

Abra o arquivo `deploy/deploy.sh` e edite as duas linhas no topo:

```bash
REPO_URL="https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git"
DOMAIN="seudominio.com.br"
```

### 1.2 — Ajustar o nginx

Abra o arquivo `deploy/nginx/secretariasistema.conf` e substitua todas as ocorrências de `gestaosecretaria.com.br` pelo seu domínio real.

### 1.3 — Fazer push para o GitHub

```bash
git add .
git commit -m "chore: configurar domínio para produção"
git push origin main
```

---

## Parte 2 — Acessar o servidor

### 2.1 — Conectar via SSH

No Windows, abra o PowerShell ou terminal:

```bash
ssh root@IP_DA_SUA_VPS
```

> A HostGator envia o IP e a senha root por e-mail após a contratação.

### 2.2 — Trocar a senha root (recomendado)

```bash
passwd
```

### 2.3 — Criar usuário não-root (boa prática)

```bash
maindeploy
usermod -aG sudo deploy
```

---

## Parte 3 — Executar o deploy

### 3.1 — Rodar o script de deploy

```bash
curl -fsSL https://raw.githubusercontent.com/developsouza/SecretariaSistema/main/deploy/deploy.sh | bash
```

Ou, clonando primeiro:

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git /tmp/secretaria
bash /tmp/secretaria/deploy/deploy.sh
```

O script executa automaticamente:

1. Atualiza o sistema (`apt update && apt upgrade`)
2. Instala nginx, git, build-essential, certbot
3. Instala Node.js 20
4. Clona o repositório em `/var/www/gestao-secretaria`
5. Instala dependências do backend (`npm ci --production`)
6. Builda o frontend React (`npm run build`)
7. Configura o nginx como proxy reverso
8. Registra e inicia o serviço systemd
9. Emite o certificado SSL via Let's Encrypt

> ⚠️ O script vai pausar e avisar para configurar o `.env` antes de continuar.

---

## Parte 4 — Configurar o .env de produção

### 4.1 — Editar o arquivo

```bash
nano /var/www/gestao-secretaria/backend/.env
```

### 4.2 — Preencher todas as variáveis

```env
# ── Servidor ──────────────────────────────────────────────────
PORT=3001
NODE_ENV=production

# ── JWT (gere valores únicos — veja seção 4.3) ────────────────
JWT_SECRET=GERE_UM_VALOR_ALEATORIO_AQUI
JWT_SA_SECRET=GERE_OUTRO_VALOR_DIFERENTE_AQUI
JWT_EXPIRES_IN=7d

# ── Banco de dados ────────────────────────────────────────────
DB_PATH=./data/secretaria.db
BACKUP_DIR=./data/backups

# ── Stripe ────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_SUA_CHAVE_LIVE_AQUI
STRIPE_WEBHOOK_SECRET=whsec_SUA_CHAVE_WEBHOOK_AQUI
STRIPE_PRICE_BASICO=price_ID_DO_PLANO_BASICO
STRIPE_PRICE_PROFISSIONAL=price_ID_DO_PLANO_PROFISSIONAL
STRIPE_PRICE_PREMIUM=price_ID_DO_PLANO_PREMIUM

# ── Upload ────────────────────────────────────────────────────
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# ── CORS ──────────────────────────────────────────────────────
FRONTEND_URL=https://seudominio.com.br

# ── E-mail (Nodemailer) ───────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seuemail@gmail.com
SMTP_PASS=SUA_APP_PASSWORD_GMAIL
SMTP_FROM=noreply@seudominio.com.br

# ── App ───────────────────────────────────────────────────────
APP_NAME=Gestão Secretaria
```

Salvar no `nano`: `Ctrl+O` → `Enter` → `Ctrl+X`

### 4.3 — Gerar JWT_SECRET e JWT_SA_SECRET

Execute no servidor para gerar dois valores únicos:

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_SA_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Cole cada resultado no `.env`.

### 4.4 — Senha de app do Gmail

Para o `SMTP_PASS`, não use sua senha normal do Gmail. Gere uma **senha de app**:

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione "Outro" como dispositivo
3. Copie a senha gerada (16 caracteres) e cole no `SMTP_PASS`

---

## Parte 5 — Primeiro banco de dados

Execute apenas uma vez ao criar o servidor:

```bash
# Criar diretórios de dados
mkdir -p /var/www/gestao-secretaria/backend/data/backups

# Definir permissões
chown -R www-data:www-data /var/www/gestao-secretaria/backend/data
chown -R www-data:www-data /var/www/gestao-secretaria/backend/uploads

# Popular banco com dados iniciais (planos, superadmin, etc.)
cd /var/www/gestao-secretaria/backend
sudo -u www-data node src/database/seed.js
```

---

## Parte 6 — Iniciar e verificar

### 6.1 — Reiniciar o serviço

```bash
systemctl restart gestao-secretaria
systemctl status gestao-secretaria
```

A saída deve mostrar `Active: active (running)`.

### 6.2 — Testar a API

```bash
curl https://seudominio.com.br/api/health
```

Deve retornar `{"status":"ok"}` ou similar.

### 6.3 — Ver logs em tempo real

```bash
journalctl -u gestao-secretaria -f
```

Para sair: `Ctrl+C`

### 6.4 — Verificar o nginx

```bash
nginx -t
systemctl status nginx
```

---

## Parte 7 — Configurar webhook do Stripe

No painel do Stripe (https://dashboard.stripe.com):

1. Vá em **Developers → Webhooks → Add endpoint**
2. URL: `https://seudominio.com.br/api/webhooks/stripe`
3. Eventos a escutar:
    - `checkout.session.completed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_failed`
4. Copie o **Signing secret** (`whsec_...`) e cole no `.env` como `STRIPE_WEBHOOK_SECRET`
5. Reinicie o serviço: `systemctl restart gestao-secretaria`

---

## Parte 8 — Redeploys futuros

Sempre que fizer alterações no código e quiser atualizar o servidor:

```bash
ssh root@IP_DA_SUA_VPS
bash /var/www/gestao-secretaria/deploy/deploy.sh
```

O script fará `git pull`, reinstalará dependências, rebuild do frontend e reiniciará o serviço automaticamente.

---

## Comandos úteis do dia a dia

```bash
# Ver status do backend
systemctl status gestao-secretaria

# Reiniciar backend
systemctl restart gestao-secretaria

# Ver logs do backend
journalctl -u gestao-secretaria -f

# Ver logs do nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Testar configuração do nginx
nginx -t

# Renovar SSL manualmente (é automático, mas caso precise)
certbot renew

# Ver uso de disco
df -h

# Ver uso de memória
free -h

# Ver processos Node.js
ps aux | grep node
```

---

## Solução de problemas

### Backend não sobe

```bash
# Ver erro detalhado
journalctl -u gestao-secretaria -n 50 --no-pager
```

Causas comuns:

- `.env` com variável faltando ou errada
- Porta 3001 já em uso: `lsof -i :3001`
- Permissão negada na pasta `/data`: `chown -R www-data:www-data /var/www/gestao-secretaria/backend/data`

### Erro 502 Bad Gateway no nginx

O nginx está no ar mas o Node.js não. Verifique:

```bash
systemctl status gestao-secretaria
journalctl -u gestao-secretaria -n 20 --no-pager
```

### SSL não emitido

```bash
# Verificar se o domínio aponta para o IP certo
nslookup seudominio.com.br

# Tentar emitir manualmente
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

### Banco de dados corrompido

```bash
# Verificar integridade
cd /var/www/gestao-secretaria/backend
node -e "const db = require('better-sqlite3')('./data/secretaria.db'); console.log(db.pragma('integrity_check'));"

# Restaurar backup mais recente
ls -lh /var/www/gestao-secretaria/backend/data/backups/
cp /var/www/gestao-secretaria/backend/data/backups/secretaria-YYYY-MM-DD.db \
   /var/www/gestao-secretaria/backend/data/secretaria.db
systemctl restart gestao-secretaria
```

---

## Checklist — Primeiro deploy

- [ ] DNS do domínio apontando para o IP da VPS
- [ ] `REPO_URL` e `DOMAIN` corretos no `deploy/deploy.sh`
- [ ] `.env` preenchido completamente (especialmente JWT, Stripe, SMTP)
- [ ] `JWT_SECRET` e `JWT_SA_SECRET` com valores diferentes e aleatórios
- [ ] Webhook do Stripe configurado
- [ ] `npm run seed` executado uma vez
- [ ] `curl https://seudominio.com.br/api/health` retornando OK
- [ ] Login no sistema funcionando
