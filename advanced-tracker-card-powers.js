/* HCUnits special-power and trait reference, Advanced Tracker only. */
(function () {
 'use strict';
 const renderStats = advStatLine;

 function specialEntries(unit, group) {
  return (unit.special_powers || []).filter(p =>
   p && String(p.type || '').toLowerCase() === group.toLowerCase() && p.name);
 }
 function traits(unit) {
  return (unit.special_powers || []).filter(p =>
   p && String(p.type || '').toLowerCase() === 'trait')
   .filter((trait, index) => !(unit.hiddenTraits || [])
    .includes(index + ':' + String(trait.name || '')));
 }

 function openReference(entry, type) {
  document.getElementById('advancedCardPowerOverlay')?.remove();
  const overlay = E('div', 'symbol-overlay adv-card-power-overlay');
  overlay.id = 'advancedCardPowerOverlay';
  const dialog = E('section', 'symbol-dialog adv-card-power-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', (entry.name || type) + ' rules');
  const header = E('div', 'symbol-dialog-header');
  const symbol = E('span', 'adv-card-ref-icon', type === 'Trait' ? '★' : '✦');
  header.append(symbol, E('h2', '', entry.name || type));
  const close = button('✕', () => overlay.remove(), 'symbol-close');
  close.setAttribute('aria-label', 'Close ability rules');
  header.append(close);
  dialog.append(header);
  const article = E('article', 'symbol-reference-panel comic-reading-panel');
  article.dataset.panel = '0';
  article.append(E('h3', 'symbol-reference-title', entry.name || type));
  const content = E('div', 'symbol-reference-text');
  const raw = String(entry.description || '').trim();
  if (raw) {
   // The HCUnits description is plain text with // separating distinct effects.
   for (const part of raw.split(/\s*\/\/\s*/).filter(Boolean))
    content.append(E('p', 'adv-card-power-paragraph', part.trim()));
  } else {
   content.append(E('p', 'adv-card-power-paragraph', 'No description was provided by HCUnits.'));
  }
  article.append(content);dialog.append(article);
  overlay.append(dialog);
  overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
  overlay.addEventListener('keydown', event => { if (event.key === 'Escape') overlay.remove(); });
  document.body.append(overlay);
  close.focus();
 }

 function openSpecial(unit, group) {
  const matches = specialEntries(unit, group);
  if (matches.length === 1) { openReference(matches[0], group); return; }
  // A "special" dial entry identifies the category, not a specific named
  // power. When multiple entries share a category, never guess which applies.
  const {panel} = advModal(group + ' Special Powers');
  panel.classList.add('adv-card-special-picker');
  if (!matches.length) {
   panel.append(E('p', '', 'HCUnits did not provide a named ' + group.toLowerCase() + ' special power for this character.'));
   return;
  }
  panel.append(E('p', '', 'This dial marks a ' + group.toLowerCase() +
   ' special power, but the data does not identify which of these applies on this click.'));
  for (const ability of matches) {
   const option = button(ability.name, () => openReference(ability, group), 'adv-card-special-option');
   panel.append(option);
  }
 }

 function makeTrait(trait) {
  const label = String(trait.name || 'Trait');
  const trigger = button('', () => openReference(trait, 'Trait'), 'adv-card-trait');
  const star = E('span', 'adv-card-trait-symbol', '★');
  star.setAttribute('aria-hidden', 'true');
  trigger.append(star, E('span', 'adv-card-trait-name', label));
  trigger.setAttribute('aria-label', 'View trait ' + label);
  trigger.title = label + ' — tap for trait text';
  return trigger;
 }

 advStatLine = function (unit, active) {
  const bar = renderStats(unit, active);
  const range = bar.querySelector('.adv-range');
  const entries = traits(unit);
  if (entries.length && range) {
   const strip = E('div', 'adv-card-traits');
   strip.setAttribute('aria-label', entries.length + ' character traits');
   for (const trait of entries) strip.append(makeTrait(trait));
   bar.insertBefore(strip, range);
  }
  const squares = [...bar.querySelectorAll('.adv-dial-stat')];
  ADV_SLOT_GROUPS.forEach((group, i) => {
   if (String(active?.[group.toLowerCase() + '_power'] || '').toLowerCase() !== 'special') return;
   const original = squares[i];
   if (!original) return;
   // Discard the generic PAC square and its event handlers.
   const square = original.cloneNode(false);
   square.className = 'adv-dial-stat adv-special-stat adv-rule-trigger';
   const icon = original.querySelector('.adv-stat-symbol');
   if (icon) {
    const copy = icon.cloneNode(true);
    copy.style.setProperty('--adv-stat-filter', 'brightness(0)');
    square.append(copy);
   }
   const value = E('strong', 'adv-stat-value adv-special-value',
    String(active?.[group.toLowerCase() + '_value'] ?? '—'));
   square.append(value);
   square.style.backgroundColor = '#fff';
   square.style.color = '#111';
   square.title = 'View ' + group + ' special power';
   square.setAttribute('aria-label', group + ' special power, ' + value.textContent + '. View rules');
   square.setAttribute('role', 'button');
   square.tabIndex = 0;
   square.addEventListener('click', () => openSpecial(unit, group));
   square.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
     event.preventDefault();
     openSpecial(unit, group);
    }
   });
   original.replaceWith(square);
  });
  return bar;
 };
})();
