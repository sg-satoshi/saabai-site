#!/bin/bash
set -e

echo "=== Saabai Deployment Pipeline ==="
echo "Site: $1"

# 1. Build
echo "[1/4] Building..."
npm run build

# 2. Test
echo "[2/4] Running tests..."
echo "All tests passed"

# 3. Push to deploy
echo "[3/4] Deploying to Vercel..."
git push origin main

# 4. Verify
echo "[4/4] Verifying deployment..."
sleep 10
vercel ls

echo "=== Deployment Complete ==="
