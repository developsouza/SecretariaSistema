#!/bin/bash
# =============================================================================
# update.sh — Re-deploy incremental do SecretariaSistema
# Uso: sudo bash update.sh
# Rodar após fazer push de alterações no repositório.
# Só executa as etapas afetadas pelas mudanças de código.
# =============================================================================

set -e

APP_DIR="/var/www/secretariasistema"

echo "════════════════════════════════════════════════"
echo "  SecretariaSistema — Atualização de Código"
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

echo "$MUDANCAS" | grep -q "^backend/package" && BACKEND_DEPS_MUDOU=true
echo "$MUDANCAS" | grep -q "^backend/"        && BACKEND_MUDOU=true
echo "$MUDANCAS" | grep -q "^frontend/package" && FRONTEND_DEPS_MUDOU=true
echo "$MUDANCAS" | grep -q "^frontend/"        && FRONTEND_MUDOU=true

echo "  Mudanças detectadas:"
[ "$BACKEND_MUDOU" = true ]  && echo "    • Backend  (deps: $BACKEND_DEPS_MUDOU)"
[ "$FRONTEND_MUDOU" = true ] && echo "    • Frontend (deps: $FRONTEND_DEPS_MUDOU)"
echo ""

# ── Backend ───────────────────────────────────────────────────────────────────
if [ "$BACKEND_MUDOU" = true ]; then
  echo "[2/4] Atualizando backend..."
  cd "$APP_DIR/backend"

  if [ "$BACKEND_DEPS_MUDOU" = true ]; then
    echo "  → package.json alterado — reinstalando dependências..."
    npm ci --production
  fi

  # Migrations são idempotentes: seguro sempre que o backend mudar
  npm run migrate 2>/dev/null || true

  echo "  → Reiniciando serviço..."
  systemctl restart secretariasistema

  # Aguarda o serviço subir e confirma status
  sleep 2
  if systemctl is-active --quiet secretariasistema; then
    echo "  ✅ Backend atualizado e serviço rodando."
  else
    echo "  ❌ Serviço falhou ao iniciar. Verifique os logs:"
    journalctl -u secretariasistema -n 30 --no-pager
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

# ── NGINX (reload gracioso, sem derrubar conexões ativas) ─────────────────────
if [ "$FRONTEND_MUDOU" = true ]; then
  echo "[4/4] Recarregando NGINX..."
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
echo "  Logs em tempo real: journalctl -u secretariasistema -f"
echo ""
