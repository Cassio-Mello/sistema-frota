#!/usr/bin/env bash

# stop.sh - Encerra backend e frontend do Sistema de Gestão de Frota
# Uso: ./stop.sh

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

function kill_on_port() {
  local port="$1"
  if lsof -i:"$port" -t >/dev/null 2>&1; then
    echo "Matando processo na porta $port..."
    lsof -ti:"$port" | xargs -r kill -9
  else
    echo "Porta $port não está em uso."
  fi
}

for port in 3000 3001 42613; do
  kill_on_port "$port"
done

echo "Serviços encerrados."