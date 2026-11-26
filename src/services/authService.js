const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');

const BCRYPT_ROUNDS = 12;
// 없는 이메일로 로그인할 때도 비슷한 시간이 걸리게 해서 가입 여부를 추측하기 어렵게 한다.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

// 가입 가능한 역할 (ADMIN 은 가입 화면에서 만들 수 없음)
const SIGNUP_ROLES = ['USER', 'HOST'];

// 회원가입. 중복이면 { errors } 를 돌려준다.
async function signup({ email, password, nickname, role }) {
  const errors = {};
  if (await userRepository.existsByEmail(email)) errors.email = '이미 가입된 이메일이에요.';
  if (await userRepository.existsByNickname(nickname)) errors.nickname = '이미 사용 중인 닉네임이에요.';
  if (Object.keys(errors).length > 0) return { errors };

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const id = await userRepository.create({ email, passwordHash, nickname, role });
    return { userId: id };
  } catch (err) {
    // 동시에 같은 이메일로 가입한 경우 (UNIQUE 제약)
    if (err.code === 'ER_DUP_ENTRY') return { errors: { email: '이미 가입된 이메일이에요.' } };
    throw err;
  }
}

// 로그인. 성공하면 사용자, 실패하면 null
async function authenticate(email, password) {
  const user = await userRepository.findByEmailWithHash(email);
  const matched = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !matched) return null;
  const { password_hash: _ignored, ...safeUser } = user;
  return safeUser;
}

module.exports = { SIGNUP_ROLES, signup, authenticate };
