/* Fit tracker labels without breaking words into fragments. */
(function () {
 'use strict';
 const previousRender = advRenderUnits;
 let scheduled = false;

 function fitLabels() {
  scheduled = false;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return;
  for (const label of document.querySelectorAll(
    '#advancedUnitRows .adv-compact-ability-label, #advancedUnitRows .adv-card-trait-name')) {
   label.style.removeProperty('font-size');
   const width = label.getBoundingClientRect().width;
   if (!width) continue;
   const style = getComputedStyle(label);
   const base = parseFloat(style.fontSize);
   const words = label.textContent.trim().split(/\s+/).filter(Boolean);
   if (!base || !words.length) continue;
   context.font = [style.fontStyle, style.fontWeight, base + 'px', style.fontFamily].join(' ');
   const longest = Math.max(...words.map(word => context.measureText(word).width));
   if (longest > width - 2) {
    const smaller = Math.max(5.5, Math.floor(base * (width - 3) / longest * 10) / 10);
    label.style.fontSize = smaller + 'px';
   }
  }
 }
 function scheduleFit() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(fitLabels);
 }
 advRenderUnits = function () {
  previousRender();
  scheduleFit();
 };
 if (document.fonts?.ready) document.fonts.ready.then(scheduleFit);
})();
