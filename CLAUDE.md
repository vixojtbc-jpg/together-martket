# CLAUDE.md — 공구마켓 (공동구매 플랫폼)

이 파일은 Claude가 이 프로젝트에서 작업할 때 항상 따라야 할 지침입니다.

## 프로젝트 개요

**공구마켓**은 여러 사람이 모여 상품을 함께 싸게 사는 공동구매(공구) 웹사이트입니다.

- **공구장(주최자)**: 상품을 올리고 목표 수량과 마감일을 정합니다.
- **참여자(구매자)**: 공구에 참여하고, 목표가 달성되면 결제·배송이 진행됩니다.
- 목표를 채우지 못하고 마감되면 공구는 **실패** 처리되고 참여는 자동 취소됩니다.

타깃은 한국 사용자이며, **모든 UI 문구는 한국어**로 작성합니다.

## 기술 스택 (변경 금지)

- **런타임**: Node.js 22 LTS
- **서버**: Express
- **뷰**: EJS (서버 사이드 렌더링) + `express-ejs-layouts`
- **DB**: MySQL 8 + `mysql2/promise` (커넥션 풀 사용, ORM 사용 안 함)
- **세션/인증**: `express-session` + `express-mysql-session` (세션을 MySQL에 저장), 비밀번호는 `bcrypt`
- **기타**: `dotenv`, `helmet`, `multer`(이미지 업로드), `method-override`
- **스타일**: 순수 CSS (`public/css/`). CSS 프레임워크 사용 안 함
- **배포**: AWS EC2 (Ubuntu) + Nginx(리버스 프록시) + PM2
- **패키지 매니저**: npm

React, Next.js, TypeScript, Prisma, Sequelize 등 위 목록에 없는 기술은 쓰지 않는다.
새 npm 패키지는 **설치하기 전에 먼저 나에게 물어볼 것.**

## 폴더 구조 (MVC)

```
src/
  app.js              # Express 앱 설정 (미들웨어, 라우터 연결)
  server.js           # 서버 실행 (app.listen)
  config/
    db.js             # mysql2 커넥션 풀
    session.js        # 세션 설정
  routes/             # URL → 컨트롤러 연결만
  controllers/        # 요청/응답 처리, 입력 검증, res.render
  services/           # 비즈니스 로직 (공구 상태 전이, 참여 처리)
  repositories/       # SQL 쿼리만 모아두는 곳
  middlewares/        # 로그인 확인, 권한 확인, 에러 처리
  utils/              # 날짜/금액 포맷 등
views/
  layouts/main.ejs
  partials/           # header, footer, 공구 카드 등
  pages/              # 각 페이지
public/
  css/  js/  images/
uploads/              # 업로드 이미지 (git에 올리지 않음)
db/
  migrations/         # 001_init.sql, 002_xxx.sql ... 번호 순서
  seed.sql            # 개발용 샘플 데이터
```

계층 규칙: **routes → controllers → services → repositories** 순서로만 호출한다.
컨트롤러나 EJS에서 SQL을 직접 쓰지 않는다.

## 데이터베이스 규칙

- 모든 쿼리는 **플레이스홀더(`?`)** 를 사용한다. 문자열 이어붙이기로 SQL 만들기 절대 금지 (SQL 인젝션 방지).
- 커넥션 풀 하나만 만들어서 재사용한다 (`config/db.js`).
- 스키마 변경은 `db/migrations/` 에 새 번호의 `.sql` 파일을 추가하는 방식으로만 한다. 기존 마이그레이션 파일은 수정하지 않는다.
- 문자셋: `utf8mb4`, 콜레이션: `utf8mb4_unicode_ci`.
- 시간은 DB에 **UTC**로 저장(풀 옵션 `timezone: 'Z'`)하고, 화면에는 **한국 시간(Asia/Seoul)** 으로 표시한다.
- 금액은 **INT(원 단위)**. 소수점 계산 금지. 표시는 `toLocaleString('ko-KR') + '원'`.

### 테이블

- `users` — id, email(UNIQUE), password_hash, nickname, role(`USER`/`HOST`/`ADMIN`), created_at
- `group_buys` — id, host_id, title, description, image_path, original_price, sale_price, target_quantity, max_quantity(NULL 가능), current_quantity, deadline_at, status, created_at
- `participations` — id, group_buy_id, user_id, quantity, status(`JOINED`/`CANCELED`), created_at
- `orders` — id, participation_id, amount, status, paid_at (mock 결제)
- `sessions` — express-mysql-session이 자동 생성

## 핵심 도메인 규칙

### 공구 상태 (group_buys.status)

| 상태 | 의미 |
|---|---|
| `RECRUITING` | 모집 중 (마감 전, 목표 미달) |
| `SUCCEEDED` | 마감 전이지만 목표 달성 |
| `CLOSED` | 마감 + 목표 달성 → 결제 단계 |
| `FAILED` | 마감 + 목표 미달 → 참여 전부 자동 취소 |
| `CANCELED` | 공구장이 직접 취소 |

- 상태 변경은 `services/groupBuyService.js` **한 곳에서만** 한다.
- **참여/취소는 반드시 트랜잭션**으로 처리한다.
  `SELECT ... FROM group_buys WHERE id = ? FOR UPDATE` 로 행을 잠근 뒤 수량을 확인하고 갱신한다.
- `max_quantity` 가 있으면 초과 참여 불가. 같은 사용자의 중복 참여는 수량 추가로 처리한다.
- 참여 취소는 마감 전, `RECRUITING`/`SUCCEEDED` 상태에서만 가능하다.
- 마감 처리: 서버에서 1분마다 마감일이 지난 공구를 찾아 `CLOSED` 또는 `FAILED` 로 바꾼다 (`setInterval`, 별도 패키지 없이).

## 기능 목록 (우선순위 순)

1. 공구 목록 (`GET /`) — 카드형, 진행률 바, 할인율, 남은 시간, "마감 임박" 뱃지(24시간 이내)
2. 공구 상세 (`GET /group-buys/:id`) — 상품 정보, 참여 현황, 참여 버튼
3. 회원가입 / 로그인 / 로그아웃
4. 공구 참여 / 참여 취소
5. 공구 등록·수정 (HOST만) — 이미지 업로드(multer, 5MB 이하, jpg/png/webp만)
6. 마이페이지 — 내가 참여한 공구, 내가 연 공구
7. 자동 마감 처리
8. mock 결제 및 주문 내역
9. 관리자 페이지 (ADMIN만)

**한 번에 하나의 기능만** 구현한다. 요청하지 않은 다음 기능으로 넘어가지 않는다.

## 코드 규칙

- CommonJS(`require`) 사용. `async/await` 사용, 콜백 스타일 금지.
- 비동기 라우트의 에러는 공통 에러 핸들러 미들웨어로 보낸다. 사용자에게는 친절한 한국어 에러 페이지를, 서버 로그에는 상세 에러를 남긴다.
- 입력값 검증은 **서버(컨트롤러)에서 반드시** 한다.
- EJS 출력은 기본 `<%= %>`(이스케이프)를 쓴다. `<%- %>`는 partial include에만 쓴다 (XSS 방지).
- 폼 전송에 CSRF 대비: 세션 쿠키는 `httpOnly`, `sameSite: 'lax'`, 운영에서는 `secure: true`.
- 로그인 필요한 페이지는 `middlewares/auth.js` 의 `requireLogin`, `requireRole('HOST')` 로 보호한다.
- 비밀 값은 `.env` 에만 둔다. `.env.example` 을 항상 최신으로 유지한다. `.env`, `uploads/`, `node_modules/` 는 `.gitignore`에 넣는다.

### 환경 변수 (.env.example)

```
NODE_ENV=development
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=gonggu
DB_PASSWORD=
DB_NAME=gonggu_market
SESSION_SECRET=
```

## 디자인 가이드

- 모바일 우선. 공구 카드는 모바일 2열, 데스크톱 4열.
- 메인 색상: 주황 계열(`#FF7A00`). 진행률 바, 참여 버튼에 사용.
- 할인율은 크게, 빨간색으로 강조.
- 빈 상태(공구 없음, 참여 내역 없음)에도 안내 문구를 넣는다.

## 작업 방식

1. 작업 전에 **무엇을 할지 3~5줄로 계획을 먼저 말한다.**
2. 구현 후 서버를 실행해 확인하고, 에러가 나면 고친 뒤 다시 확인한다.
3. 끝나면 **바뀐 파일 목록과 직접 확인하는 방법**(어떤 URL에서 무엇을 눌러볼지)을 알려준다.
4. DB 스키마를 바꾸면 마이그레이션 파일과 `seed.sql` 을 함께 갱신한다.
5. 기능 하나가 끝날 때마다 커밋 메시지를 제안한다. (커밋은 내가 하라고 할 때만)
6. 확실하지 않은 요구사항은 추측해서 크게 만들지 말고 **먼저 질문한다.**

## 자주 쓰는 명령

```bash
npm run dev        # node --watch src/server.js (개발)
npm start          # node src/server.js (운영)
npm run db:migrate # db/migrations/*.sql 순서대로 실행하는 스크립트
npm run db:seed    # db/seed.sql 실행
```

## AWS EC2 배포

### 서버 구성
- EC2: Ubuntu 24.04 LTS
- Node.js 22 LTS, PM2로 앱 실행 (`ecosystem.config.js` 사용, 앱 이름 `gonggu-market`)
- Nginx가 80/443 포트를 받아서 `127.0.0.1:3000` 으로 프록시
- MySQL: EC2 내부 설치 또는 RDS. **3306 포트는 외부에 열지 않는다.**
- HTTPS: Let's Encrypt(certbot)
- 업로드 이미지는 EC2의 `uploads/` 에 저장 (나중에 S3로 옮길 수 있게 저장 로직은 한 파일에 모아둔다)

### 보안 그룹
- 22(SSH): 내 IP만
- 80, 443: 전체 허용
- 3000, 3306: 열지 않음

### 배포 순서
```bash
git pull
npm ci --omit=dev
npm run db:migrate
pm2 reload ecosystem.config.js --env production
```

- 운영에서는 `app.set('trust proxy', 1)` 을 설정한다 (Nginx 뒤에서 secure 쿠키 동작용).
- Nginx 설정 파일 예시는 `deploy/nginx.conf`, PM2 설정은 `ecosystem.config.js` 에 둔다.
- 배포 관련 파일을 만들 때는 **실제 서버에서 실행할 명령을 순서대로** 같이 알려준다.

## 하지 말 것

- 실제 결제, 실제 개인정보(주민번호, 카드번호) 저장 코드 작성 금지
- SQL 문자열 직접 이어붙이기 금지
- 요청 없이 대규모 리팩터링, 폴더 구조 변경, 파일 삭제 금지
- 정해진 스택 외 프레임워크 도입 금지
- `.env` 나 비밀번호를 코드, 커밋, 로그에 남기지 않기