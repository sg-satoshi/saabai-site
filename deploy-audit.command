#!/bin/zsh
# One-click deploy: predeploy check → push → verify Vercel
cd "$(dirname "$0")"

echo "── Running predeploy (TypeScript + build) ──"
npm run predeploy || { echo "❌ Build failed — fix before pushing. Nothing was pushed."; exit 1; }

echo "── Pushing to GitHub (triggers Vercel deploy) ──"
git push || { echo "❌ Push failed."; exit 1; }

echo "── Waiting 60s for Vercel build, then checking status ──"
sleep 60
npx vercel ls 2>/dev/null | head -8 || echo "Check manually: vercel.com/shanegoldbergs-projects/saabai-site"

echo ""
echo "✅ Done. Confirm the latest deployment shows READY above."
echo "Then visit: https://www.saabai.ai/saabai-admin/audits"
