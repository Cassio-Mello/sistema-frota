#!/usr/bin/env bash

# start.sh - Inicia backend e frontend do Sistema de Gestão de Frota
# Uso: ./start.sh [porta_frontend] [porta_backend]
# Ex: ./start.sh 3000 3001

set -e

FRONTEND_PORT=${1:-3000}
BACKEND_PORT=${2:-3001}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

function kill_on_port() {
  local port="$1"
  if lsof -i:"$port" -t >/dev/null 2>&1; then
    echo "Porta $port já em uso. Matando processo existente..."
    lsof -ti:"$port" | xargs -r kill -9
  fi
}

echo "Iniciando backend em $BACKEND_DIR (porta $BACKEND_PORT)..."
cd "$BACKEND_DIR"
kill_on_port "$BACKEND_PORT"

# Inicia backend em segundo plano
nohup npm run dev -- --port "$BACKEND_PORT" > "$ROOT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
sleep 2

if ! curl -sSf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
  echo "Falha ao iniciar backend. Verifique '$ROOT_DIR/backend.log'."
  exit 1
fi

echo "Backend iniciado (PID $BACKEND_PID)";

# Inicia frontend
cd "$ROOT_DIR"
kill_on_port "$FRONTEND_PORT"

echo "Iniciando frontend em http://localhost:$FRONTEND_PORT ..."
nohup npx serve . -l "$FRONTEND_PORT" > "$ROOT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

sleep 1

cat <<EOF
Setup concluído:
- Frontend: http://localhost:$FRONTEND_PORT
- Backend : http://localhost:$BACKEND_PORT/api
PID backend : $BACKEND_PID
PID frontend: $FRONTEND_PID
Logs: backend.log, frontend.log
EOF

exit 0
