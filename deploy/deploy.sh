#!/usr/bin/env bash
# 공구마켓 업데이트 배포 (EC2 에서 실행): bash ~/together-market/deploy/deploy.sh
# CLAUDE.md 의 배포 순서: git pull → npm ci → 마이그레이션 → pm2 reload
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/together-market}"
cd "$APP_DIR"

echo "▶ 최신 코드 받기"
git pull --ff-only

echo "▶ 패키지 설치"
npm ci --omit=dev

echo "▶ DB 마이그레이션"
npm run db:migrate

echo "▶ 앱 재시작"
pm2 reload ecosystem.config.js --env production
pm2 save

sleep 2
if curl -fs -o /dev/null http://127.0.0.1:3000/; then
  echo "✅ 배포 완료 ($(git log --oneline -1))"
else
  echo "⚠️  앱이 응답하지 않아요: pm2 logs gonggu-market --lines 50"
  exit 1
fi
