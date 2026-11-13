/* Optional dial layout experiment. Remove this script and its CSS link to revert. */
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
   const icon = square.querySelector('.adv-stat-symbol');
   if (icon) icon.style.setProperty('--adv-stat-filter', 'brightness(0)');
   square.classList.add('adv-dial-compact-experiment');
  }
  return bar;
 };

 // All structural changes are applied after the existing renderers run.
 const previousRenderUnits = advRenderUnits;
 advRenderUnits = function () {
  previousRenderUnits();
  const cards = document.querySelectorAll('#advancedUnitRows .adv-compact-unit');
  for (const card of cards) {
   const line = card.querySelector('.adv-compact-line');
   const stats = card.querySelector('.adv-dial-stats');
   const click = line?.querySelector('.adv-compact-click');
   const add = line?.querySelector('.adv-compact-add');
   const gear = line?.querySelector('.adv-compact-edit');
   const details = card.querySelector('.adv-unit-details');
   if (details && !details.querySelector('.adv-click-label')) {
    details.append(E('span', 'adv-click-label', 'Click'));
   }
   if (stats && add && gear) {
    const actions = E('div', 'adv-dial-actions');
    actions.append(add, gear);
    stats.append(actions);
   }
  }
 };
})();
