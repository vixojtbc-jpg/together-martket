#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 공구마켓 EC2(Ubuntu 24.04) 최초 설치 스크립트
#
# EC2 에 ubuntu 계정으로 접속한 뒤:
#   curl -fsSL https://raw.githubusercontent.com/vixojtbc-jpg/together-martket/main/deploy/setup-server.sh -o setup-server.sh
#   bash setup-server.sh                                    # 도메인 없이 (http://공인IP)
#   DOMAIN=gonggu.example.com CERT_EMAIL=me@example.com bash setup-server.sh   # 도메인 + HTTPS
#
# 하는 일: 스왑 → 패키지(nginx, mysql, node 22, pm2) → 코드 내려받기 → DB/계정 생성 →
#         .env 생성(비밀 값 자동 생성) → 마이그레이션 → PM2 실행/부팅 시 자동 시작 → Nginx → (선택) HTTPS
# 여러 번 실행해도 안전하다. (이미 있는 DB 비밀번호/.env 는 다시 만들지 않음)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/vixojtbc-jpg/together-martket.git}"
APP_DIR="${APP_DIR:-$HOME/together-market}"
DOMAIN="${DOMAIN:-}"
CERT_EMAIL="${CERT_EMAIL:-}"
DB_NAME="gonggu_market"
DB_USER="gonggu"

step() { echo; echo "▶ $*"; }

if [ "$(id -u)" -eq 0 ]; then
  echo "root 가 아니라 ubuntu 계정으로 실행해 주세요. (sudo 없이: bash setup-server.sh)"
  exit 1
fi
if [ -n "$DOMAIN" ] && [ -z "$CERT_EMAIL" ]; then
  echo "DOMAIN 을 쓰려면 인증서 알림용 CERT_EMAIL 도 함께 넣어 주세요."
  exit 1
fi

step "1/9 스왑 메모리 (메모리 1GB 인스턴스 대비 1GB)"
if ! swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

step "2/9 기본 패키지 설치 (nginx, mysql-server, git)"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx mysql-server git curl build-essential openssl

step "3/9 Node.js 22 LTS + PM2"
if ! command -v node >/dev/null || ! node -v | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v pm2 >/dev/null || sudo npm install -g pm2
echo "node $(node -v), npm $(npm -v), pm2 $(pm2 -v)"

step "4/9 코드 내려받기 → $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

step "5/9 MySQL DB / 계정 + .env"
# MySQL 은 기본으로 127.0.0.1 에서만 접속을 받는다 (3306 외부 비공개)
if [ ! -f .env ]; then
  DB_PASSWORD="$(openssl rand -hex 16)"
  SESSION_SECRET="$(openssl rand -hex 48)"
  sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
  umask 077
  cat > .env <<ENV
NODE_ENV=production
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
SESSION_SECRET=${SESSION_SECRET}
HTTPS_ENABLED=false
ENV
  umask 022
  echo ".env 생성 완료 (권한 600, 비밀 값은 화면에 출력하지 않음)"
else
  echo ".env 가 이미 있어서 그대로 사용합니다."
fi

step "6/9 패키지 설치 + 마이그레이션"
npm ci --omit=dev
npm run db:migrate

step "7/9 PM2 실행 + 부팅 시 자동 시작"
if pm2 describe gonggu-market >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null
echo "PM2 등록 완료"

step "8/9 Nginx 리버스 프록시"
SERVER_NAME="${DOMAIN:-_}"
sed "s/__SERVER_NAME__/${SERVER_NAME}/" deploy/nginx.conf | sudo tee /etc/nginx/sites-available/gonggu-market >/dev/null
sudo ln -sf /etc/nginx/sites-available/gonggu-market /etc/nginx/sites-enabled/gonggu-market
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

step "9/9 HTTPS (Let's Encrypt)"
if [ -n "$DOMAIN" ]; then
  sudo apt-get install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERT_EMAIL" --redirect
  sed -i 's/^HTTPS_ENABLED=.*/HTTPS_ENABLED=true/' .env
  pm2 reload ecosystem.config.js --env production
  URL="https://${DOMAIN}"
else
  echo "도메인이 없어서 건너뜁니다. (http 로만 접속, 나중에 DOMAIN=... 으로 다시 실행하면 HTTPS 설정)"
  PUBLIC_IP="$(curl -fs --max-time 3 https://checkip.amazonaws.com || echo '<EC2 공인 IP>')"
  URL="http://${PUBLIC_IP}"
fi

sleep 2
if curl -fs -o /dev/null http://127.0.0.1:3000/; then
  echo; echo "✅ 설치 완료: ${URL}"
else
  echo; echo "⚠️  앱이 응답하지 않아요. 로그 확인: pm2 logs gonggu-market --lines 50"
fi
cat <<'MSG'

다음 할 일
 - 사이트에서 회원가입 후, 관리자 권한 부여:
     sudo mysql gonggu_market -e "UPDATE users SET role='ADMIN' WHERE email='가입한이메일'"
 - 코드 업데이트 배포: bash ~/together-market/deploy/deploy.sh
 - 로그 보기: pm2 logs gonggu-market
MSG
