#!/usr/bin/env bash
# MayronCombat — Arrête tous les serveurs
#   Vite :3060 · API Express :3061 · XTTS Python :5500

cd "$(dirname "$0")"

echo "⏹  Arrêt des serveurs MayronCombat..."

pkill -f "vite.*3060"      2>/dev/null && echo "   ✓ Vite      :3060 arrêté" || echo "   —  Vite      :3060 déjà arrêté"
pkill -f "tsx server.ts"   2>/dev/null && echo "   ✓ API       :3061 arrêté" || echo "   —  API       :3061 déjà arrêté"
pkill -f "tts_server.py"   2>/dev/null && echo "   ✓ XTTS      :5500 arrêté" || echo "   —  XTTS      :5500 déjà arrêté"

echo ""
echo "Tous les serveurs sont arrêtés."
