/* Staging-only Advanced Tracker fixes. No global rulebook or Basic tracker changes. */
(function () {
 'use strict';

 // The original source-icons/*_white.png images are white already. Shared rulebook
 // CSS forces them to black with !important, so an element-scoped override is needed.
 const originalCustomSymbol = advCustomSymbol;
 advCustomSymbol = function (kind) {
  const symbol = originalCustomSymbol(kind);
  symbol.style.setProperty('background-color', '#26364b', 'important');
  symbol.style.setProperty('color', '#fff', 'important');
  const image = symbol.querySelector('img.adv-custom-image');
  if (image) {
   image.style.setProperty('filter', 'none', 'important');
   image.style.setProperty('opacity', '1', 'important');
  }
  return symbol;
 };

 function showAdvancedPacRule(power) {
  const modal = advModal(power.name);
  modal.panel.classList.add('adv-rule-dialog');
  const title = modal.panel.querySelector('.advanced-modal-heading h3');
  if (title) title.prepend(powerSymbol(power));
  const content = E('div', 'adv-rule-content');
  const pieces = textContentPieces(
   power.inlineContent || power.text,
   {type: 'power', id: power.id},
   Boolean(power.inlineContent)
  );
  for (const [index, piece] of pieces.entries()) {
   const panel = E('div', 'rule-paper comic-reading-panel adv-rule-paper');
   panel.dataset.panel = String(index % 2);
   panel.append(piece);
   content.append(panel);
  }
  modal.panel.append(content);
 }

 // Dial squares reference a current PAC power, not the powers selected for
 // automatic tracking. A normal-number or special square has no PAC to open.
 const originalStatLine = advStatLine;
 advStatLine = function (unit, active) {
  const stats = originalStatLine(unit, active);
  const squares = stats.querySelectorAll('.adv-dial-stat');
  ADV_SLOT_GROUPS.forEach((group, index) => {
   const square = squares[index];
   if (!square) return;
   const power = advPower(active?.[group.toLowerCase() + '_power']);
   if (!power) return;
   const openRule = () => showAdvancedPacRule(power);
   square.classList.add('adv-rule-trigger');
   square.setAttribute('role', 'button');
   square.setAttribute('tabindex', '0');
   square.setAttribute('aria-label', group + ' ' + square.textContent.trim() + ': View ' + power.name + ' rules');
   square.title = power.name + ' — tap for rules';
   square.addEventListener('click', openRule);
   square.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
     e.preventDefault();
     openRule();
    }
   });
  });
  return stats;
 };

 // A unit without a standard dial (equipment, avatars, etc.) should not
 // prevent playable team members from loading. Retain per-entry point values.
 advLoadModal = function () {
  const {layer, panel} = advModal('Load Team from HCUnits');
  const form = E('form', 'advanced-form');
  const label = E('label', '', 'HCUnits Team Link');
  const input = E('input', 'advanced-field');
  input.type = 'url';
  input.required = true;
  input.placeholder = 'https://hcunits.net/teams/.../';
  input.value = advancedTeam.url || '';
  label.append(input);
  const status = E('p', 'advanced-load-status');
  status.setAttribute('role', 'status');
  const load = button('Load Team', null, 'game-tools-action');
  load.type = 'submit';
  form.append(label, load, status);
  form.addEventListener('submit', async e => {
   e.preventDefault();
   let id;
   try {
    const url = new URL(input.value);
    if (!['hcunits.net', 'www.hcunits.net'].includes(url.hostname)) throw new Error();
    id = url.pathname.match(/^\/teams\/([a-f0-9-]{36})\/?$/i)?.[1];
    if (!id) throw new Error();
   } catch (_) {
    status.textContent = 'Enter a valid HCUnits team link.';
    return;
   }
   load.disabled = true;
   status.textContent = 'Loading team and character dials…';
   try {
    const team = await advGetJson('team/' + id);
    if (!Array.isArray(team.units)) throw new Error('The team response did not contain a unit list.');
    const eligible = team.units.filter(entry => entry.section === 'main_force' && entry.unit?.id &&
     (!entry.unit.type || entry.unit.type === 'character'));
    const skipped = (team.unsupported_units || []).map(e => e.name || e.id);
    for (const entry of team.units) {
     if (entry.section === 'main_force' && entry.unit?.id && entry.unit.type && entry.unit.type !== 'character' &&
         !skipped.includes(entry.unit.name || entry.unit.id)) skipped.push(entry.unit.name || entry.unit.id);
    }
    const results = await Promise.allSettled(eligible.map(async (entry) => {
     const data = await advGetJson('unit/' + encodeURIComponent(entry.unit.id));
     if (!Array.isArray(data.dial) || !data.dial.length) throw new Error('No standard dial');
     const selected = (data.point_values || []).find(p => Number(p.point_value) === Number(entry.point_value))
      || data.point_values?.[0] || {};
     const start = Number(selected.click_number ?? data.dial[0].click_number);
     const click = data.dial.some(d => Number(d.click_number) === start) ? start : Number(data.dial[0].click_number);
     return {
      key: String(entry.id ?? data.id), id: data.id, name: data.name,
      points: entry.point_value ?? selected.point_value,
      click, dial: data.dial, range: data.unit_range, targets: data.targets,
      combat_symbols: selected.combat_symbols || data.combat_symbols || [],
      special_powers: data.special_powers || [], custom: [], used: {}, ready: {}
     };
    }));
    const units = [];
    results.forEach((result, i) => {
     if (result.status === 'fulfilled') units.push(result.value);
     else skipped.push(eligible[i].unit.name || eligible[i].unit.id);
    });
    if (!units.length) throw new Error('No figures with standard dials could be loaded.');
    advancedTeam = {
     name: team.public_name || team.name_safe || 'HCUnits Team',
     url: input.value, units, skipped
    };
    advSave();
    layer.remove();
    advUpdateHeading();
    advRenderUnits();
    if (skipped.length) {
     const host = document.getElementById('advancedTeamTitle');
     if (host) {
      const note = E('span', 'adv-skipped-note', ' · ' + skipped.length + ' non-dial entr' + (skipped.length === 1 ? 'y' : 'ies') + ' omitted');
      note.title = skipped.join(', ');
      host.append(note);
     }
    }
   } catch (err) {
    status.textContent = (typeof err?.message === 'string' ? err.message : String(err)) || 'Unable to load team.';
   } finally {
    load.disabled = false;
   }
  });
  panel.append(form);
  input.focus();
 };
})();
