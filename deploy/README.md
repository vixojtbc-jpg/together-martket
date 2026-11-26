# 공구마켓 AWS EC2 배포 안내

구성: **EC2(Ubuntu 24.04) + Nginx(80/443) → Node 22 앱(127.0.0.1:3000, PM2) + MySQL(127.0.0.1:3306)**

## 1. EC2 인스턴스 만들기 (AWS 콘솔)

1. AWS 콘솔 오른쪽 위에서 리전을 **서울 (ap-northeast-2)** 로 바꾼다.
2. **EC2 → 인스턴스 시작**
   - 이름: `gonggu-market`
   - AMI: **Ubuntu Server 24.04 LTS (x86_64)**
   - 인스턴스 유형: **t3.micro** (또는 프리 티어 표시가 있는 유형)
   - 키 페어: **새 키 페어 생성** → 이름 `gonggu-key`, 유형 RSA, 형식 `.pem` → 내려받은 파일을 안전한 곳에 보관
   - 네트워크 설정 → **보안 그룹 생성**
     - SSH(22): 소스 **내 IP**
     - HTTP(80): 소스 **0.0.0.0/0** (위치 무관)
     - HTTPS(443): 소스 **0.0.0.0/0**
     - 3000, 3306 은 **추가하지 않는다**
   - 스토리지: 20GiB gp3
3. **인스턴스 시작** → 인스턴스 상세에서 **퍼블릭 IPv4 주소** 확인
4. (권장) **탄력적 IP** 를 할당해서 인스턴스에 연결 — 재시작해도 IP가 바뀌지 않음

## 2. 서버 접속

Windows PowerShell 또는 WSL 터미널:

```bash
# WSL 이라면 키를 리눅스 쪽으로 복사하고 권한을 줄여야 한다
cp /mnt/c/Users/<윈도우사용자>/Downloads/gonggu-key.pem ~/.ssh/
chmod 400 ~/.ssh/gonggu-key.pem

ssh -i ~/.ssh/gonggu-key.pem ubuntu@<퍼블릭 IP>
```

## 3. 설치 (서버에서, 한 번만)

```bash
curl -fsSL https://raw.githubusercontent.com/vixojtbc-jpg/together-martket/main/deploy/setup-server.sh -o setup-server.sh

# 도메인 없이 IP 로 먼저 띄우기
bash setup-server.sh

# 도메인이 있다면 (DNS A 레코드를 EC2 IP로 먼저 연결한 뒤)
DOMAIN=gonggu.example.com CERT_EMAIL=me@example.com bash setup-server.sh
```

끝나면 `✅ 설치 완료: http://...` 주소가 나온다. 5~10분 정도 걸린다.

- DB 비밀번호와 `SESSION_SECRET` 은 스크립트가 무작위로 만들어 서버의 `~/together-market/.env`(권한 600)에만 저장한다.
- 도메인 없이 설치하면 `.env` 에 `HTTPS_ENABLED=false` 가 들어간다. (http 에서도 로그인 쿠키가 동작하도록)
  도메인을 연결한 뒤 `DOMAIN=... CERT_EMAIL=...` 로 다시 실행하면 HTTPS 인증서를 받고 `HTTPS_ENABLED=true` 로 바뀐다.

## 4. 관리자 계정 만들기

사이트에서 회원가입한 다음, 서버에서:

```bash
sudo mysql gonggu_market -e "UPDATE users SET role='ADMIN' WHERE email='가입한이메일'"
```

## 5. 코드 업데이트 배포

로컬에서 GitHub 에 push 한 뒤, 서버에서:

```bash
bash ~/together-market/deploy/deploy.sh
```

(내부 순서: `git pull` → `npm ci --omit=dev` → `npm run db:migrate` → `pm2 reload ecosystem.config.js --env production`)

## 자주 쓰는 명령

| 하는 일 | 명령 |
|---|---|
| 앱 상태 | `pm2 status` |
| 앱 로그 | `pm2 logs gonggu-market --lines 100` |
| 앱 재시작 | `pm2 reload ecosystem.config.js --env production` |
| Nginx 설정 확인/반영 | `sudo nginx -t && sudo systemctl reload nginx` |
| Nginx 에러 로그 | `sudo tail -n 50 /var/log/nginx/error.log` |
| DB 접속 | `sudo mysql gonggu_market` |
| 인증서 갱신 테스트 | `sudo certbot renew --dry-run` |

## 주의

- 업로드 이미지는 `~/together-market/uploads/` 에 저장된다. 인스턴스를 지우면 함께 사라진다.
  (S3 로 옮길 때는 `src/services/imageStorage.js` 만 바꾸면 된다)
- 시드(`npm run db:seed`)는 운영(`NODE_ENV=production`)에서 실행되지 않는다.
- 보안 그룹에서 3000, 3306 포트를 열지 않는다. MySQL 은 서버 안(127.0.0.1)에서만 접속된다.
- 사용하지 않을 때는 인스턴스를 **중지**하면 컴퓨팅 요금이 나가지 않는다. (스토리지/탄력적 IP 요금은 별도)
