// PM2 설정 — 사용: pm2 start ecosystem.config.js --env production
// 비밀 값(DB 비밀번호 등)은 여기에 쓰지 않고 서버의 .env 에만 둔다.
module.exports = {
  apps: [
    {
      name: 'gonggu-market',
      script: 'src/server.js',
      cwd: __dirname,
      // 작은 인스턴스(t2/t3.micro, 메모리 1GB) 기준 1개. 자동 마감 스케줄러도 1개만 돈다.
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      kill_timeout: 10000, // 종료 신호 후 진행 중인 요청을 마칠 시간 (server.js 의 shutdown)
      time: true, // 로그에 시간 표시
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
