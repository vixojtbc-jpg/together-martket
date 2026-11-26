// 사용자에게 그대로 보여줘도 되는 에러 (expose = true)
// 예: throw new AppError(404, '공구를 찾을 수 없어요.')
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.expose = true;
  }
}

module.exports = AppError;
