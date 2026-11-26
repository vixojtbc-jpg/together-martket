// 공구 등록 / 수정 / 취소 (공구장)
const groupBuyService = require('../services/groupBuyService');
const imageStorage = require('../services/imageStorage');
const AppError = require('../utils/AppError');
const { parseId, parseIntInRange, trimString } = require('../utils/validators');
const { HOUR, DAY, toKSTInputValue, parseKSTInput } = require('../utils/format');

const LIMITS = {
  price: [100, 10_000_000],
  quantity: [1, 10_000],
  maxDeadlineDays: 90,
};

// 폼 입력 검증. existing 이 있으면 수정 모드 (마감일을 안 바꿨으면 1시간 규칙을 적용하지 않음)
function validateForm(body, existing, now = new Date()) {
  const values = {
    title: trimString(body.title),
    description: trimString(body.description),
    originalPrice: trimString(body.originalPrice),
    salePrice: trimString(body.salePrice),
    targetQuantity: trimString(body.targetQuantity),
    maxQuantity: trimString(body.maxQuantity),
    deadlineAt: trimString(body.deadlineAt),
  };
  const errors = {};

  if (values.title.length < 2 || values.title.length > 100) errors.title = '상품명은 2~100자로 입력해 주세요.';
  if (values.description.length < 10 || values.description.length > 5000) {
    errors.description = '상품 설명은 10~5,000자로 입력해 주세요.';
  }

  const originalPrice = parseIntInRange(values.originalPrice, ...LIMITS.price);
  const salePrice = parseIntInRange(values.salePrice, ...LIMITS.price);
  if (originalPrice === null) errors.originalPrice = '정가는 100원~1,000만 원 사이 숫자로 입력해 주세요.';
  if (salePrice === null) errors.salePrice = '공구가는 100원~1,000만 원 사이 숫자로 입력해 주세요.';
  else if (originalPrice !== null && salePrice > originalPrice) errors.salePrice = '공구가는 정가보다 클 수 없어요.';

  const targetQuantity = parseIntInRange(values.targetQuantity, ...LIMITS.quantity);
  if (targetQuantity === null) errors.targetQuantity = '목표 수량은 1~10,000개로 입력해 주세요.';

  let maxQuantity = null;
  if (values.maxQuantity !== '') {
    maxQuantity = parseIntInRange(values.maxQuantity, ...LIMITS.quantity);
    if (maxQuantity === null) errors.maxQuantity = '최대 수량은 1~10,000개로 입력해 주세요. (제한 없으면 비워 두세요)';
    else if (targetQuantity !== null && maxQuantity < targetQuantity) {
      errors.maxQuantity = '최대 수량은 목표 수량 이상이어야 해요.';
    }
  }

  // 입력칸은 분 단위라서, 수정 화면에서 마감일을 그대로 두면 기존 값(초 포함)을 그대로 쓴다.
  const unchangedDeadline = Boolean(existing) && values.deadlineAt === toKSTInputValue(existing.deadline_at);
  const deadlineAt = unchangedDeadline ? existing.deadline_at : parseKSTInput(values.deadlineAt);
  if (!deadlineAt) {
    errors.deadlineAt = '마감 일시를 선택해 주세요.';
  } else if (!unchangedDeadline) {
    if (deadlineAt.getTime() < now.getTime() + HOUR) errors.deadlineAt = '마감은 지금부터 1시간 이후로 정해 주세요.';
    else if (deadlineAt.getTime() > now.getTime() + LIMITS.maxDeadlineDays * DAY) {
      errors.deadlineAt = `마감은 ${LIMITS.maxDeadlineDays}일 이내로 정해 주세요.`;
    }
  }

  return {
    values,
    errors,
    data: { title: values.title, description: values.description, originalPrice, salePrice, targetQuantity, maxQuantity, deadlineAt },
  };
}

function valuesFromRow(gb) {
  return {
    title: gb.title,
    description: gb.description,
    originalPrice: String(gb.original_price),
    salePrice: String(gb.sale_price),
    targetQuantity: String(gb.target_quantity),
    maxQuantity: gb.max_quantity === null ? '' : String(gb.max_quantity),
    deadlineAt: toKSTInputValue(gb.deadline_at),
  };
}

function renderForm(res, status, { mode, gb = null, values, errors, formError = null }) {
  res.status(status).render('pages/group-buys/form', {
    title: `${mode === 'edit' ? '공구 수정' : '공구 열기'} - 공구마켓`,
    mode,
    gb,
    values,
    errors,
    formError,
    deadlineMin: toKSTInputValue(new Date(Date.now() + HOUR)),
  });
}

// 업로드된 파일이 있으면 저장. 실패 시 errors.image 설정
async function handleImage(req, errors) {
  if (req.uploadError) {
    errors.image = req.uploadError;
    return undefined;
  }
  if (!req.file) return undefined;
  if (Object.keys(errors).length > 0) return undefined; // 다른 입력이 틀렸으면 저장하지 않음
  const filename = await imageStorage.saveImage(req.file);
  if (!filename) errors.image = 'jpg, png, webp 이미지 파일만 올릴 수 있어요.';
  return filename || undefined;
}

function requireId(req) {
  const id = parseId(req.params.id);
  if (!id) throw new AppError(404, '공구를 찾을 수 없어요.');
  return id;
}

// GET /group-buys/new
function newForm(req, res) {
  const values = { title: '', description: '', originalPrice: '', salePrice: '', targetQuantity: '', maxQuantity: '', deadlineAt: '' };
  renderForm(res, 200, { mode: 'new', values, errors: {} });
}

// POST /group-buys
async function create(req, res) {
  const { values, errors, data } = validateForm(req.body);
  const imagePath = await handleImage(req, errors);
  if (Object.keys(errors).length > 0) {
    await imageStorage.removeImage(imagePath);
    return renderForm(res, 400, { mode: 'new', values, errors });
  }

  let id;
  try {
    id = await groupBuyService.createGroupBuy(req.user.id, { ...data, imagePath: imagePath || null });
  } catch (err) {
    await imageStorage.removeImage(imagePath);
    throw err;
  }
  req.flash('success', '공구를 열었어요! 이웃들에게 공유해 보세요.');
  return res.redirect(`/group-buys/${id}`);
}

// GET /group-buys/:id/edit
async function editForm(req, res) {
  const gb = await groupBuyService.getForEdit(req.user, requireId(req));
  renderForm(res, 200, { mode: 'edit', gb, values: valuesFromRow(gb), errors: {} });
}

// PUT /group-buys/:id
async function update(req, res) {
  const id = requireId(req);
  const gb = await groupBuyService.getForEdit(req.user, id);

  // 참여자가 있으면 가격 입력은 무시하고 기존 값 유지 (화면에서도 잠금)
  const body = gb.hasParticipants
    ? { ...req.body, originalPrice: String(gb.original_price), salePrice: String(gb.sale_price) }
    : req.body;
  const { values, errors, data } = validateForm(body, gb);
  const imagePath = await handleImage(req, errors);
  if (Object.keys(errors).length > 0) {
    await imageStorage.removeImage(imagePath);
    return renderForm(res, 400, { mode: 'edit', gb, values, errors });
  }

  try {
    const { oldImagePath } = await groupBuyService.updateGroupBuy(req.user, id, { ...data, imagePath });
    await imageStorage.removeImage(oldImagePath);
  } catch (err) {
    await imageStorage.removeImage(imagePath);
    if (err instanceof AppError && err.status === 409) {
      return renderForm(res, 409, { mode: 'edit', gb, values, errors: {}, formError: err.message });
    }
    throw err;
  }

  req.flash('success', '공구 정보를 수정했어요.');
  return res.redirect(`/group-buys/${id}`);
}

// POST /group-buys/:id/cancel
async function cancel(req, res) {
  const id = requireId(req);
  try {
    const { canceledCount } = await groupBuyService.cancelGroupBuy(req.user, id);
    req.flash('success', `공구를 취소했어요. 참여 ${canceledCount}건이 함께 취소되었어요.`);
  } catch (err) {
    if (!(err instanceof AppError) || err.status !== 409) throw err;
    req.flash('error', err.message);
  }
  res.redirect(`/group-buys/${id}`);
}

module.exports = { newForm, create, editForm, update, cancel, validateForm };
