#!/bin/bash
# =============================================================================
# deploy.sh — Script de deploy para SecretariaSistema
# Servidor: Ubuntu 22.04 LTS + NGINX + Node.js 20
# Uso: sudo bash deploy.sh
# =============================================================================

set -e

APP_DIR="/var/www/secretariasistema"
REPO_URL="https://github.com/developsouza/SecretariaSistema.git"  # Ajuste para seu repositório
DOMAIN="secretariaigreja.g3tsistemas.com.br"

echo "════════════════════════════════════════════════"
echo "  SecretariaSistema — Script de Deploy"
echo "════════════════════════════════════════════════"

# ── Atualiza sistema ──────────────────────────────────────────────────────────
echo "[1/9] Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

# ── Instala dependências ──────────────────────────────────────────────────────
echo "[2/9] Instalando dependências do sistema..."
apt-get install -y -qq curl git build-essential nginx certbot python3-certbot-nginx

# ── Instala Node.js 20 ────────────────────────────────────────────────────────
echo "[3/9] Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verifica versão
node --version
npm --version

# ── Clona ou atualiza repositório ─────────────────────────────────────────────
echo "[4/9] Configurando aplicação..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── Backend ───────────────────────────────────────────────────────────────────
echo "[5/9] Instalando dependências do backend..."
cd "$APP_DIR/backend"
npm ci --production

# Copia e configura .env se não existir
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  ATENÇÃO: Configure o arquivo .env em $APP_DIR/backend/.env antes de continuar!"
  echo "   Especialmente: JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET"
  echo ""
fi

# Executa migrations do banco (seguro em re-deploy)
npm run migrate 2>/dev/null || true
# NOTA: npm run seed NÃO é executado em produção automaticamente.
# Para banco novo, execute manualmente: npm run seed

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "[6/9] Construindo frontend..."
cd "$APP_DIR/frontend"
npm ci
npm run build

# ── NGINX (config HTTP provisória para o Certbot validar o domínio) ────────────
echo "[7/9] Configurando NGINX (provisório HTTP para emitir SSL)..."
cat > /etc/nginx/sites-available/secretariasistema <<NGINX_BOOTSTRAP
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root /var/www/secretariasistema/frontend/dist;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX_BOOTSTRAP

ln -sf /etc/nginx/sites-available/secretariasistema /etc/nginx/sites-enabled/secretariasistema
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ── Systemd ───────────────────────────────────────────────────────────────────
echo "[8/9] Configurando serviço systemd..."
cp "$APP_DIR/deploy/systemd/secretariasistema.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable secretariasistema
systemctl restart secretariasistema

# ── SSL via Let's Encrypt ─────────────────────────────────────────────────────
echo "[9/9] Emitindo certificado SSL (Certbot)..."
certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || \
  { echo "⚠️  SSL não emitido. Verifique se o DNS do domínio aponta para este servidor."; exit 1; }

# Aplica config NGINX final com SSL (certificado já existe agora)
echo "[9/9] Aplicando configuração NGINX final (HTTPS)..."
cp "$APP_DIR/deploy/nginx/secretariasistema.conf" /etc/nginx/sites-available/secretariasistema
nginx -t
systemctl reload nginx

# ── Status ────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  ✅ Deploy concluído!"
echo "════════════════════════════════════════════════"
echo "  API:      https://$DOMAIN/api/health"
echo "  Sistema:  https://$DOMAIN"
echo ""
echo "  Status do serviço:"
systemctl status secretariasistema --no-pager -l
echo ""
echo "  Logs em tempo real:"
echo "  journalctl -u secretariasistema -f"
