#!/bin/bash
# setup.sh — Instalação rápida do projeto

echo "🕊️  Assembleia de Deus em Jacumã — Setup"
echo "========================================="

echo ""
echo "📦 Instalando dependências do Frontend..."
cd frontend && npm install
cd ..

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "Para rodar em desenvolvimento:"
echo "  npm run dev"
echo ""
echo "Para build de produção:"
echo "  npm run build"
echo ""
