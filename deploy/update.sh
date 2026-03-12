#!/bin/bash
# =============================================================================
# update.sh — Re-deploy incremental do Gestão Secretaria
# Uso: sudo bash update.sh
# Rodar após fazer push de alterações no repositório.
# Só executa as etapas afetadas pelas mudanças de código.
# =============================================================================

set -e

# ── Autodescoberta de paths e serviços ───────────────────────────────────────
# APP_DIR é sempre derivado da localização real deste script no disco,
# independentemente do nome do diretório (/var/www/secretariasistema,
# /var/www/gestao-secretaria, etc.).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

# Detecta o nome do serviço systemd já instalado no servidor
if systemctl list-units --full --all 2>/dev/null | grep -qF "secretariasistema.service"; then
  SERVICE_NAME="secretariasistema"
elif systemctl list-units --full --all 2>/dev/null | grep -qF "gestao-secretaria.service"; then
  SERVICE_NAME="gestao-secretaria"
else
  # Fallback: usa o nome do diretório do app
  SERVICE_NAME="$(basename "$APP_DIR")"
fi

# Detecta o nome do site nginx já configurado no servidor
NGINX_SITE=""
for candidate in secretariasistema gestao-secretaria "$(basename "$APP_DIR")"; do
  if [ -f "/etc/nginx/sites-available/$candidate" ]; then
    NGINX_SITE="$candidate"
    break
  fi
done
[ -z "$NGINX_SITE" ] && NGINX_SITE="$SERVICE_NAME"
# ─────────────────────────────────────────────────────────────────────────────

echo "════════════════════════════════════════════════"
echo "  Gestão Secretaria — Atualização de Código"
echo "════════════════════════════════════════════════"

cd "$APP_DIR"

# ── Captura hash atual antes do pull ──────────────────────────────────────────
HASH_ANTES=$(git rev-parse HEAD)

# ── Puxa alterações do repositório ────────────────────────────────────────────
echo "[1/4] Buscando atualizações do repositório..."
git pull

HASH_DEPOIS=$(git rev-parse HEAD)

if [ "$HASH_ANTES" = "$HASH_DEPOIS" ]; then
  echo "  ℹ️  Nenhuma alteração encontrada. Repositório já está atualizado."
  exit 0
fi

echo "  Commits: ${HASH_ANTES:0:7} → ${HASH_DEPOIS:0:7}"
echo ""

# ── Detecta quais partes do código mudaram ────────────────────────────────────
MUDANCAS=$(git diff --name-only "$HASH_ANTES" "$HASH_DEPOIS")

BACKEND_DEPS_MUDOU=false
BACKEND_MUDOU=false
FRONTEND_DEPS_MUDOU=false
FRONTEND_MUDOU=false
SITE_JACUMA_DEPS_MUDOU=false
SITE_JACUMA_MUDOU=false
NGINX_MUDOU=false

echo "$MUDANCAS" | grep -q "^backend/package"            && BACKEND_DEPS_MUDOU=true
echo "$MUDANCAS" | grep -q "^backend/"                  && BACKEND_MUDOU=true
echo "$MUDANCAS" | grep -q "^frontend/package"           && FRONTEND_DEPS_MUDOU=true
echo "$MUDANCAS" | grep -q "^frontend/"                 && FRONTEND_MUDOU=true
echo "$MUDANCAS" | grep -q "^assembleia-jacuma/frontend/package" && SITE_JACUMA_DEPS_MUDOU=true
echo "$MUDANCAS" | grep -q "^assembleia-jacuma/frontend/" && SITE_JACUMA_MUDOU=true
echo "$MUDANCAS" | grep -q "^deploy/nginx/"              && NGINX_MUDOU=true

echo "  Mudanças detectadas:"
[ "$BACKEND_MUDOU" = true ]      && echo "    • Backend  (deps: $BACKEND_DEPS_MUDOU)"
[ "$FRONTEND_MUDOU" = true ]     && echo "    • Frontend (deps: $FRONTEND_DEPS_MUDOU)"
[ "$SITE_JACUMA_MUDOU" = true ]  && echo "    • Site Jacumã (deps: $SITE_JACUMA_DEPS_MUDOU)"
[ "$NGINX_MUDOU" = true ]        && echo "    • Config NGINX"
echo ""

# ── Backend ───────────────────────────────────────────────────────────────────
if [ "$BACKEND_MUDOU" = true ]; then
  echo "[2/4] Atualizando backend..."
  cd "$APP_DIR/backend"

  if [ "$BACKEND_DEPS_MUDOU" = true ]; then
    echo "  → package.json alterado — reinstalando dependências..."
    rm -rf node_modules
    npm ci --production
    # Recompila módulos nativos a partir do source para garantir compatibilidade
    echo "  → Recompilando módulos nativos..."
    npm rebuild better-sqlite3 --build-from-source
    npm rebuild sharp --build-from-source 2>/dev/null || true
  else
    # Mesmo sem mudança no package.json, recompila módulos nativos
    # caso o Node.js tenha sido atualizado no servidor
    npm rebuild better-sqlite3 --build-from-source 2>/dev/null || true
  fi

  # Garante que os diretórios de dados existam (necessário para o systemd namespace)
  mkdir -p data uploads/fotos uploads/logos uploads/carteiras
  chown -R www-data:www-data data uploads

  # Migrations são idempotentes: seguro sempre que o backend mudar
  npm run migrate 2>/dev/null || true

  echo "  → Reiniciando serviço..."
  systemctl restart "$SERVICE_NAME"

  # Aguarda o serviço subir e confirma status
  sleep 2
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "  ✅ Backend atualizado e serviço rodando."
  else
    echo "  ❌ Serviço falhou ao iniciar. Verifique os logs:"
    journalctl -u "$SERVICE_NAME" -n 30 --no-pager
    exit 1
  fi
else
  echo "[2/4] Backend sem alterações — pulando."
fi

# ── Frontend ──────────────────────────────────────────────────────────────────
if [ "$FRONTEND_MUDOU" = true ]; then
  echo "[3/4] Reconstruindo frontend..."
  cd "$APP_DIR/frontend"

  if [ "$FRONTEND_DEPS_MUDOU" = true ]; then
    echo "  → package.json alterado — reinstalando dependências..."
    npm ci
  fi

  npm run build
  echo "  ✅ Frontend reconstruído."
else
  echo "[3/4] Frontend sem alterações — pulando."
fi

# ── Site Assembleia Jacumã ─────────────────────────────────────────────────
if [ "$SITE_JACUMA_MUDOU" = true ]; then
  echo "[3b/4] Reconstruindo site Assembleia Jacumã..."
  cd "$APP_DIR/assembleia-jacuma/frontend"

  if [ "$SITE_JACUMA_DEPS_MUDOU" = true ]; then
    echo "  → package.json alterado — reinstalando dependências..."
    npm ci
  fi

  VITE_SAAS_API_URL=https://secretariaigreja.g3tsistemas.com.br/api npm run build
  echo "  ✅ Site Jacumã reconstruído."
else
  echo "[3b/4] Site Jacumã sem alterações — pulando."
fi

# ── NGINX (reload gracioso, sem derrubar conexões ativas) ─────────────────────
if [ "$FRONTEND_MUDOU" = true ] || [ "$NGINX_MUDOU" = true ]; then
  echo "[4/4] Recarregando NGINX..."

  # Se a config do nginx mudou, copia o arquivo atualizado antes do reload
  if [ "$NGINX_MUDOU" = true ]; then
    echo "  → Aplicando nova configuração nginx..."
    cp "$APP_DIR/deploy/nginx/secretariasistema.conf" "/etc/nginx/sites-available/$NGINX_SITE"
  fi

  nginx -t && systemctl reload nginx
  echo "  ✅ NGINX recarregado."
else
  echo "[4/4] Reload de NGINX não necessário — pulando."
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  ✅ Atualização concluída!"
echo "════════════════════════════════════════════════"
echo "  Versão implantada: $(git -C "$APP_DIR" rev-parse --short HEAD)"
  echo "  Logs em tempo real: journalctl -u $SERVICE_NAME -f"
echo ""
