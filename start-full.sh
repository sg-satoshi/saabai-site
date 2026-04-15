#!/bin/zsh

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$(dirname "$0")"

echo "Cleaning old processes..."

PORT_PID=$(lsof -ti :3000)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID
  sleep 2
fi

rm -f .next/dev/lock

echo "Starting OpenClaw..."
npm run dev &

sleep 5

echo "Opening browser..."
open http://localhost:3000

echo "Opening VS Code..."
code .

wait