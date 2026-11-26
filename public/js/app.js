// 공구마켓 공통 스크립트 (없어도 기능은 동작하고, 편의 기능만 더한다)
(function () {
  // data-confirm 이 있는 폼은 제출 전에 한 번 더 확인
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!window.confirm(form.dataset.confirm)) event.preventDefault();
    });
  });

  // 참여 폼: 수량을 바꾸면 합계 금액 갱신
  document.querySelectorAll('form[data-price]').forEach(function (form) {
    var price = Number(form.dataset.price);
    var qty = form.querySelector('input[name="quantity"]');
    var total = form.querySelector('[data-total]');
    if (!qty || !total) return;
    qty.addEventListener('input', function () {
      var n = Math.max(0, Math.floor(Number(qty.value) || 0));
      total.textContent = (price * n).toLocaleString('ko-KR') + '원';
    });
  });
})();
