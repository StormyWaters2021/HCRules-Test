/* Advanced Tracker only: retain source-white custom symbols and match PAC reference dialogs. */
(function () {
  'use strict';

  const source = {
    Speed: 'assets/source-icons/speed/run_white.png',
    Attack: 'assets/source-icons/attack/fist_white.png',
    Defense: 'assets/source-icons/defense/shield_white.png',
    Damage: 'assets/source-icons/damage/standard_white.png'
  };

  // Use each source PNG as an alpha mask instead of an image element: the
  // rulebook's global img filters must continue to apply outside the tracker.
  advCustomSymbol = function (value) {
    const kind = advCustomKind(value);
    const circle = E('span', 'adv-custom-symbol adv-custom-' + kind.toLowerCase());
    circle.setAttribute('role', 'img');
    circle.setAttribute('aria-label', kind + ' combat symbol');
    if (kind === 'Trait') {
      circle.append(E('span', 'adv-masked-star', '★'));
    } else {
      const art = E('span', 'adv-white-combat-glyph');
      const path = source[kind] || source.Speed;
      art.style.setProperty('mask-image', 'url("' + path + '")');
      art.style.setProperty('-webkit-mask-image', 'url("' + path + '")');
      circle.append(art);
    }
    return circle;
  };

  function openPacReference(power) {
    document.querySelector('#advancedPacRuleOverlay')?.remove();
    const overlay = E('div', 'symbol-overlay adv-pac-reference-overlay');
    overlay.id = 'advancedPacRuleOverlay';
    const dialog = E('section', 'symbol-dialog adv-pac-reference-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', power.name + ' rules');
    const header = E('div', 'symbol-dialog-header');
    const marker = powerSymbol(power);
    marker.classList.add('adv-pac-reference-symbol');
    header.append(marker, E('h2', '', power.name));
    const close = button('✕', () => overlay.remove(), 'symbol-close');
    close.setAttribute('aria-label', 'Close rules');
    header.append(close);
    dialog.append(header);

    const pieces = textContentPieces(
      power.inlineContent || power.text,
      { type: 'power', id: power.id },
      Boolean(power.inlineContent)
    );
    pieces.forEach((piece, i) => {
      const paper = E('article', 'symbol-reference-panel comic-reading-panel');
      paper.dataset.panel = String(i % 2);
      if (i === 0) paper.append(E('h3', 'symbol-reference-title', power.name));
      const content = E('div', 'symbol-reference-text');
      content.append(piece);
      paper.append(content);
      dialog.append(paper);
    });
    overlay.append(dialog);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); overlay.remove(); }
    });
    document.body.append(overlay);
    close.focus();
  }

  // The prior staging extension already added handlers to stat squares.
  // Replace each square with its clone to discard those handlers and attach
  // the PAC-style reference behavior once, without altering dial rendering.
  const renderStats = advStatLine;
  advStatLine = function (unit, active) {
    const bar = renderStats(unit, active);
    const squares = [...bar.querySelectorAll('.adv-dial-stat')];
    ADV_SLOT_GROUPS.forEach((group, i) => {
      const square = squares[i];
      if (!square) return;
      const clean = square.cloneNode(true);
      square.replaceWith(clean);
      const power = advPower(active?.[group.toLowerCase() + '_power']);
      if (!power) return;
      clean.classList.add('adv-rule-trigger');
      clean.setAttribute('role', 'button');
      clean.tabIndex = 0;
      clean.title = 'View ' + power.name + ' rules';
      clean.setAttribute('aria-label', group + ': ' + power.name + ' rules');
      clean.addEventListener('click', () => openPacReference(power));
      clean.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPacReference(power);
        }
      });
    });
    return bar;
  };
})();
