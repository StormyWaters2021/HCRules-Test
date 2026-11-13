/* Optional experiment: isolate dial color behind the number only.
   To revert, remove the two dial-compact experiment references from index.html. */
(function () {
 'use strict';
 const previousStatLine = advStatLine;
 advStatLine = function (unit, active) {
  const bar = previousStatLine(unit, active);
  for (const square of bar.querySelectorAll('.adv-dial-stat')) {
   const number = square.querySelector('.adv-stat-value');
   if (!number) continue;
   const special = square.classList.contains('adv-special-stat');
   number.style.setProperty('--adv-dial-number-bg', special ? '#fff' : (square.style.backgroundColor || '#fff'));
   number.style.setProperty('--adv-dial-number-ink', special ? '#111' : (square.style.color || '#111'));
   square.classList.add('adv-dial-compact-experiment');
  }
  return bar;
 };
})();
