#!/usr/bin/env bash
# MayronCombat — Démarre les 3 serveurs d'un coup
#   Vite    → http://localhost:3060
#   API     → http://localhost:3061
#   XTTS v2 → http://localhost:5500  (optionnel, fallback Piper si absent)
#
# Usage :
#   ./start.sh          — tous les serveurs avec logs colorés
#   ./start.sh no-xtts  — sans le serveur XTTS Python

set -e
cd "$(dirname "$0")"

if [[ "$1" == "no-xtts" ]]; then
  echo "▶  Démarrage sans XTTS (Piper fallback actif)"
  npm run dev:no-xtts
else
  echo "▶  Démarrage de MayronCombat (Vite :3060 · API :3061 · XTTS :5500)"
  echo "   Arrêter : Ctrl+C  ou  ./stop.sh dans un autre terminal"
  npm run dev
fi
