// 업로드 이미지 저장 로직은 이 파일 하나에만 둔다.
// 나중에 S3 로 옮길 때는 saveImage / removeImage / imageUrl 만 바꾸면 된다.
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const FILENAME_RE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });

// 파일 앞부분(매직 넘버)으로 실제 이미지 형식 확인 — 확장자/Content-Type 위조 방지
function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1, fields: 20, fieldSize: 100 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      req.uploadError = 'jpg, png, webp 이미지만 올릴 수 있어요.';
      return cb(null, false);
    }
    return cb(null, true);
  },
});

// 라우터용 미들웨어: 업로드 에러를 예외 대신 req.uploadError 에 담아 폼에 다시 보여준다.
function uploadSingle(fieldName) {
  const handler = upload.single(fieldName);
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        req.uploadError =
          err.code === 'LIMIT_FILE_SIZE' ? '이미지는 5MB 이하만 올릴 수 있어요.' : '이미지 업로드에 실패했어요.';
        req.body = req.body || {};
        return next();
      }
      return next(err);
    });
  };
}

// 이미지 저장 → 저장된 파일 이름 반환. 실제 이미지가 아니면 null
async function saveImage(file) {
  const type = detectImageType(file.buffer);
  if (!type || ALLOWED_MIME.get(file.mimetype) !== type) return null;
  const filename = `${crypto.randomUUID()}.${type}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer, { flag: 'wx' });
  return filename;
}

async function removeImage(filename) {
  if (!filename || !FILENAME_RE.test(filename)) return;
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('이미지 삭제 실패:', filename, err.message);
  }
}

module.exports = { UPLOAD_DIR, MAX_SIZE, uploadSingle, saveImage, removeImage };
