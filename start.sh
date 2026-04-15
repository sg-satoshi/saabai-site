#!/bin/zsh

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$(dirname "$0")"

echo "Cleaning existing processes..."

# Kill anything on port 3000
PORT_PID=$(lsof -ti :3000)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID
  sleep 2
fi

# Remove lock safely
rm -f .next/dev/lock

echo "Starting OpenClaw..."

npm run dev &

sleep 5

open http://localhost:3000

wait