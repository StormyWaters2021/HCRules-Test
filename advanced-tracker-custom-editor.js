/* Custom ability management and turn behavior for the Advanced Tracker. */
(function () {
  'use strict';

  const originalRender = advRenderUnits;
  const originalReset = advReset;
  const originalPassTurn = advPassTurn;
  const kinds = Object.keys(ADV_CUSTOM_SYMBOLS);

  function customKey(ability, click) {
    return 'custom:' + ability.id + '@' + click;
  }

  function deleteCustomState(unit, ability) {
    for (const key of Object.keys(unit.used || {})) {
      if (key.startsWith('custom:' + ability.id + '@')) delete unit.used[key];
    }
    for (const key of Object.keys(unit.ready || {})) {
      if (key.startsWith('custom:' + ability.id + '@')) delete unit.ready[key];
    }
  }

  function customActive(ability, click) {
    return ability.all || ability.clicks?.includes(Number(click));
  }

  function persistAndRender() {
    advSave();
    advRenderUnits();
  }

  function manageCustom(unit) {
    const {panel} = advModal('Edit Abilities — ' + unit.name);
    panel.classList.add('adv-custom-dialog');
    const description = E('p', 'adv-manager-intro', 'Edit, remove, or add custom abilities for this character.');
    const list = E('div', 'adv-custom-manager-list');

    function refresh() {
      list.replaceChildren();
      if (!unit.custom?.length) {
        list.append(E('p', 'adv-manager-empty', 'No custom abilities added yet.'));
      }
      for (const ability of unit.custom || []) {
        const row = E('div', 'adv-custom-manager-row');
        const details = E('div', 'adv-custom-manager-details');
        details.append(advCustomSymbol(ability.icon), E('strong', '', ability.name));
        const behavior = ability.startAlert ? 'Start my turn' : ability.eachTurn ? "Each player's turn" : 'Manual';
        details.append(E('small', '', behavior));
        const edit = button('Edit', () => editCustom(unit, ability, () => manageCustom(unit)), 'adv-manager-action');
        const remove = button('Remove', () => {
          if (!window.confirm('Remove ' + ability.name + ' from ' + unit.name + '?')) return;
          unit.custom = unit.custom.filter(item => item !== ability);
          deleteCustomState(unit, ability);
          persistAndRender();
          refresh();
        }, 'adv-manager-action adv-manager-danger');
        row.append(details, edit, remove);
        list.append(row);
      }
    }

    const importedTraits = (unit.special_powers || []).filter(power =>
      power && String(power.type || '').toLowerCase() === 'trait');
    if (importedTraits.length) {
      const traitSection = E('div', 'adv-manager-traits');
      traitSection.append(E('strong', 'adv-field-heading', 'Show Traits'));
      importedTraits.forEach((trait, index) => {
        const key = index + ':' + String(trait.name || '');
        const label = E('label', 'adv-manager-trait-option');
        const checkbox = E('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !(unit.hiddenTraits || []).includes(key);
        checkbox.onchange = () => {
          const hidden = new Set(unit.hiddenTraits || []);
          if (checkbox.checked) hidden.delete(key);
          else hidden.add(key);
          unit.hiddenTraits = [...hidden];
          persistAndRender();
        };
        label.append(checkbox, E('span', '', trait.name || 'Unnamed Trait'));
        traitSection.append(label);
      });
      panel.append(traitSection);
    }

    const specials = (unit.special_powers || [])
      .map((power,index)=>({power,index}))
      .filter(({power})=>power && ADV_SLOT_GROUPS.some(group =>
        group.toLowerCase()===String(power.type||'').toLowerCase()));
    if (specials.length) {
      const section = E('div', 'adv-manager-specials');
      section.append(E('strong', 'adv-field-heading', 'Track Special Powers'));
      for (const {power,index} of specials) {
        const key=index+':'+String(power.name||'');
        const label=E('label', 'adv-manager-trait-option');
        const checkbox=E('input');
        checkbox.type='checkbox';
        checkbox.checked=(unit.trackedSpecials||[]).includes(key);
        checkbox.onchange=()=>{
          const tracked=new Set(unit.trackedSpecials||[]);
          if(checkbox.checked)tracked.add(key);
          else tracked.delete(key);
          unit.trackedSpecials=[...tracked];
          persistAndRender();
        };
        label.append(checkbox, E('span', '', (power.name||'Unnamed Special')+
          ' ('+String(power.type||'Special')+')'));
        section.append(label);
      }
      panel.append(section);
    }

    const add = button('+ Add Custom', () => editCustom(unit, null, () => manageCustom(unit)), 'game-tools-action');
    const actions = E('div', 'adv-custom-manager-actions');
    actions.append(add);
    panel.append(description, list, actions);
    refresh();
  }

  function editCustom(unit, existing, onDone) {
    const editing = Boolean(existing);
    const {layer, panel} = advModal(editing ? 'Edit Custom Ability' : 'Add Custom Ability');
    panel.classList.add('adv-custom-dialog');
    const form = E('form', 'adv-custom-form');
    const picker = E('div', 'adv-kind-picker');
    picker.append(E('strong', 'adv-field-heading', 'Icon'));
    let selected = kinds.includes(existing?.icon) ? existing.icon : 'Trait';
    const toggle = button('', () => { menu.hidden = !menu.hidden; }, 'adv-kind-toggle');
    const menu = E('div', 'adv-kind-menu');
    menu.hidden = true;
    function choose(kind) {
      selected = kind;
      toggle.replaceChildren(advCustomSymbol(kind), E('span', '', kind), E('span', 'adv-menu-chevron', '▾'));
      menu.hidden = true;
    }
    for (const kind of kinds) {
      const option = button('', () => choose(kind), 'adv-kind-item');
      option.append(advCustomSymbol(kind), E('span', '', kind));
      menu.append(option);
    }
    toggle.setAttribute('aria-label', 'Select custom ability icon');
    picker.append(toggle, menu);
    choose(selected);

    const colorPicker = E('fieldset', 'adv-custom-color-options');
    colorPicker.append(E('legend', 'adv-field-heading', 'Color'));
    const colors=[{name:'White',hex:'#ffffff'},...db.pac.filter(p=>p.group==='Speed')
      .map(p=>({name:p.name,hex:p.color.toLowerCase()}))];
    const colorChoices=E('div', 'adv-custom-color-choices');
    const existingColor=String(existing?.color||'#ffffff').toLowerCase();
    let chosenColor=colors.some(c=>c.hex===existingColor)?existingColor:'#ffffff';
    for(const color of colors){
      const option=E('label', 'adv-custom-color-option');
      const radio=E('input');
      radio.type='radio';
      radio.name='adv-custom-color';
      radio.value=color.hex;
      radio.checked=color.hex===chosenColor;
      radio.onchange=()=>{if(radio.checked)chosenColor=color.hex;};
      const swatch=E('span', 'adv-custom-color-swatch');
      swatch.style.backgroundColor=color.hex;
      swatch.title=color.name;
      option.append(radio,swatch);
      option.title=color.name;
      option.setAttribute('aria-label',color.name);
      colorChoices.append(option);
    }
    colorPicker.append(colorChoices);

    const nameLabel = E('label', 'adv-custom-name', 'Ability name');
    const name = E('input', 'advanced-field');
    name.maxLength = 70;
    name.required = true;
    name.value = existing?.name || '';
    name.placeholder = 'Ability name';
    nameLabel.append(name);

    const clickField = E('div', 'adv-custom-click-field');
    clickField.append(E('strong', 'adv-field-heading', 'Active on clicks'));
    const checks = E('div', 'adv-custom-checks');
    const allInput = E('input');
    allInput.type = 'checkbox';
    allInput.checked = existing ? Boolean(existing.all) : true;
    const allLabel = E('label', 'adv-check');
    allLabel.append(allInput, E('span', '', 'All'));
    checks.append(allLabel);
    const numbered = [];
    for (const dial of unit.dial || []) {
      const input = E('input');
      input.type = 'checkbox';
      input.checked = existing ? customActive(existing, Number(dial.click_number)) : true;
      const label = E('label', 'adv-check');
      label.append(input, E('span', '', String(dial.click_number)));
      checks.append(label);
      numbered.push({input, click: Number(dial.click_number)});
    }
    allInput.onchange = () => numbered.forEach(item => { item.input.checked = allInput.checked; });
    numbered.forEach(item => {
      item.input.onchange = () => { allInput.checked = numbered.every(x => x.input.checked); };
    });
    clickField.append(checks);

    const turnField = E('fieldset', 'adv-custom-turn-options');
    turnField.append(E('legend', 'adv-field-heading', 'Turn behavior'));
    const startInput = E('input');
    startInput.type = 'checkbox';
    startInput.checked = Boolean(existing?.startAlert);
    const startLabel = E('label', 'adv-check');
    startLabel.append(startInput, E('span', '', 'Alert at the start of my turn'));
    const eachInput = E('input');
    eachInput.type = 'checkbox';
    eachInput.checked = Boolean(existing?.eachTurn);
    const eachLabel = E('label', 'adv-check');
    eachLabel.append(eachInput, E('span', '', "Each player's turn (reset after Pass Turn)"));
    turnField.append(startLabel, eachLabel);

    const actions = E('div', 'adv-custom-form-actions');
    const cancel = button('Cancel', () => { layer.remove(); if (onDone) onDone(); }, 'adv-manager-action');
    cancel.type = 'button';
    const save = button(editing ? 'Save Changes' : 'Add Ability', null, 'game-tools-action');
    save.type = 'submit';
    actions.append(cancel, save);
    form.append(picker, colorPicker, nameLabel, clickField, turnField, actions);
    form.onsubmit = event => {
      event.preventDefault();
      const clicks = numbered.filter(x => x.input.checked).map(x => x.click);
      if (!name.value.trim() || !clicks.length) {
        clickField.classList.toggle('adv-invalid', !clicks.length);
        return;
      }
      const previousAlert = Boolean(existing?.startAlert);
      const changes = {
        name: name.value.trim(), icon: selected, color: chosenColor,
        all: allInput.checked, clicks,
        startAlert: startInput.checked, eachTurn: eachInput.checked
      };
      if (editing) {
        Object.assign(existing, changes);
        if (previousAlert && !existing.startAlert) {
          for (const key of Object.keys(unit.ready || {}))
            if (key.startsWith('custom:' + existing.id + '@')) delete unit.ready[key];
        }
      } else {
        unit.custom = unit.custom || [];
        unit.custom.push({id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7), ...changes});
      }
      persistAndRender();
      layer.remove();
      if (onDone) onDone();
    };
    panel.append(form);
    name.focus();
  }

  advCustomModal = function (unit) { editCustom(unit, null); };

  advRenderUnits = function () {
    originalRender();
    const rows = document.getElementById('advancedUnitRows');
    if (!rows) return;
    [...rows.querySelectorAll('.adv-compact-unit')].forEach((card, index) => {
      const unit = advancedTeam.units[index];
      const line = card.querySelector('.adv-compact-line');
      if (!unit || !line) return;
      const gear = button('⚙', () => manageCustom(unit), 'adv-compact-edit');
      gear.setAttribute('aria-label', 'Edit abilities for ' + unit.name);
      gear.title = 'Edit custom abilities';
      line.append(gear);
    });
  };

  advReset = function (start) {
    originalReset(start);
    for (const unit of advancedTeam.units) {
      if (!start) continue;
      for (const ability of unit.custom || []) {
        if (ability.startAlert && customActive(ability, unit.click)) {
          unit.ready = unit.ready || {};
          unit.ready[customKey(ability, unit.click)] = true;
        }
      }
    }
    persistAndRender();
  };

  advPassTurn = function () {
    originalPassTurn();
    for (const unit of advancedTeam.units) {
      for (const ability of unit.custom || []) {
        if (!ability.eachTurn) continue;
        for (const key of Object.keys(unit.used || {})) {
          if (key.startsWith('custom:' + ability.id + '@')) delete unit.used[key];
        }
      }
    }
    persistAndRender();
  };
})();
