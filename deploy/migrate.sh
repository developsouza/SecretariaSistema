#!/bin/bash
# =============================================================================
# migrate.sh — Migra o servidor de secretariasistema → gestao-secretaria
#              e força o rebuild completo do frontend.
#
# Execute no servidor como root/sudo:
#   sudo bash /var/www/secretariasistema/deploy/migrate.sh
#
# O script é idempotente: se o app já estiver em gestao-secretaria,
# apenas faz git pull + rebuild do frontend (sem migração de diretório).
# =============================================================================

set -e

OLD_SERVICE="secretariasistema"
NEW_SERVICE="gestao-secretaria"
NEW_DIR="/var/www/gestao-secretaria"

# Usuário de deploy (quem roda o GitHub Actions via SSH)
# Detecta automaticamente pelo SUDO_USER; ajuste se necessário.
DEPLOY_USER="${SUDO_USER:-ubuntu}"

echo "════════════════════════════════════════════════════════"
echo "  Gestão Secretaria — Migração + Rebuild do Frontend"
echo "════════════════════════════════════════════════════════"
echo ""

# ── Autodescoberta: de onde este script está sendo rodado ────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
echo "  Diretório detectado: $APP_DIR"
echo "  Usuário de deploy:   $DEPLOY_USER"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ETAPA 0 — Atualiza o código e reconstrói o frontend
#            (resolve o problema de assets antigos sendo servidos)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "[0/6] Atualizando código via git pull..."
cd "$APP_DIR"
git pull
echo "  ✅ Código atualizado."
echo ""

echo "[1/6] Reconstruindo frontend (rebuild completo)..."
cd "$APP_DIR/frontend"
npm ci
npm run build
echo "  ✅ Frontend reconstruído em $APP_DIR/frontend/dist"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Se já está no diretório correto, só precisávamos do rebuild acima.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if [ "$APP_DIR" = "$NEW_DIR" ]; then
  echo "  ℹ️  App já está em $NEW_DIR — migração de diretório não necessária."

  # Restart backend para garantir que está usando o código atualizado
  if systemctl is-active --quiet "$NEW_SERVICE"; then
    systemctl restart "$NEW_SERVICE"
    echo "  ✅ Serviço $NEW_SERVICE reiniciado."
  fi

  systemctl reload nginx
  echo "  ✅ NGINX recarregado."
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "  ✅ Rebuild concluído! Frontend atualizado."
  echo "════════════════════════════════════════════════════════"
  exit 0
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# A partir daqui: migração completa  $APP_DIR  →  $NEW_DIR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "  Iniciando migração de diretório:"
echo "    $APP_DIR  →  $NEW_DIR"
echo ""

# Garante que o destino não existe (evita mv dentro de subpasta)
if [ -d "$NEW_DIR" ]; then
  echo "  ❌ Já existe um diretório em $NEW_DIR."
  echo "     Remova-o antes de migrar:  rm -rf $NEW_DIR"
  exit 1
fi

# ── [2/6] Para e desabilita o serviço antigo ─────────────────────────────────
echo "[2/6] Parando serviço $OLD_SERVICE..."
systemctl stop    "$OLD_SERVICE" 2>/dev/null || true
systemctl disable "$OLD_SERVICE" 2>/dev/null || true
echo "  ✅ Serviço parado e desabilitado."
echo ""

# ── [3/6] Move o diretório ───────────────────────────────────────────────────
echo "[3/6] Movendo diretório..."
mv "$APP_DIR" "$NEW_DIR"
echo "  ✅ Movido para $NEW_DIR"
echo ""

# ── [4/6] Instala o novo serviço systemd ─────────────────────────────────────
echo "[4/6] Instalando serviço systemd $NEW_SERVICE..."
cp "$NEW_DIR/deploy/systemd/secretariasistema.service" \
   "/etc/systemd/system/$NEW_SERVICE.service"

systemctl daemon-reload
systemctl enable  "$NEW_SERVICE"
systemctl start   "$NEW_SERVICE"

sleep 3
if systemctl is-active --quiet "$NEW_SERVICE"; then
  echo "  ✅ Serviço $NEW_SERVICE ativo e rodando."
else
  echo "  ❌ Serviço falhou ao iniciar. Logs:"
  journalctl -u "$NEW_SERVICE" -n 40 --no-pager
  exit 1
fi
echo ""

# ── [5/6] Migra configuração NGINX ───────────────────────────────────────────
echo "[5/6] Atualizando NGINX..."

# Copia a conf atualizada (já aponta para /var/www/gestao-secretaria/)
cp "$NEW_DIR/deploy/nginx/secretariasistema.conf" \
   "/etc/nginx/sites-available/$NEW_SERVICE"

# Ativa o novo site
ln -sf "/etc/nginx/sites-available/$NEW_SERVICE" \
       "/etc/nginx/sites-enabled/$NEW_SERVICE"

# Remove o site antigo
rm -f "/etc/nginx/sites-enabled/$OLD_SERVICE"
rm -f "/etc/nginx/sites-available/$OLD_SERVICE"

nginx -t
systemctl reload nginx
echo "  ✅ NGINX atualizado e recarregado."
echo ""

# ── [6/6] Atualiza sudoers ───────────────────────────────────────────────────
echo "[6/6] Atualizando sudoers para $DEPLOY_USER..."

# Cria entrada para o novo caminho
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/bash $NEW_DIR/deploy/update.sh" \
  > "/etc/sudoers.d/$NEW_SERVICE"
chmod 440 "/etc/sudoers.d/$NEW_SERVICE"

# Remove entrada antiga
rm -f "/etc/sudoers.d/$OLD_SERVICE"
echo "  ✅ Sudoers atualizado: /etc/sudoers.d/$NEW_SERVICE"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "════════════════════════════════════════════════════════"
echo "  ✅ Migração concluída com sucesso!"
echo ""
echo "  Aplicação:  $NEW_DIR"
echo "  Serviço:    $NEW_SERVICE  (systemctl status $NEW_SERVICE)"
echo "  NGINX:      /etc/nginx/sites-available/$NEW_SERVICE"
echo "  Sudoers:    /etc/sudoers.d/$NEW_SERVICE"
echo ""
echo "  Próximos deploys via GitHub Actions funcionarão"
echo "  automaticamente com o novo caminho."
echo "════════════════════════════════════════════════════════"
