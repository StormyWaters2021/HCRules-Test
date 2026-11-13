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

 // HCUnits card descriptions use [d:1] through [d:6] for dice.
 // Use the same verified PDF dice artwork as the rules reference.
 const cardDice = {
  1:'assets/inline/10_8-2.png',
  2:'assets/inline/12_6b-0.png',
  3:'assets/inline/12_6b-2.png',
  4:'assets/inline/10_8-0.png',
  5:'assets/inline/12_6b-6.png',
  6:'assets/inline/10_8-1.png'
 };
 // Each icon and definition is keyed by the exact HCUnits team ability identifier.
 const definitionsURL = 'assets/team-abilities/definitions.json';
 const remoteDefinitionsURL =
  'https://raw.githubusercontent.com/StormyWaters2021/HCRules-Test/main/assets/team-abilities/definitions.json';
 let localDefinitions,remoteDefinitions;
 async function readTeamDefinitions(url) {
  try {
   const response=await fetch(url,{headers:{Accept:'application/json'}});
   if(!response.ok)return null;
   const parsed=await response.json();
   return parsed && typeof parsed.abilities==='object' ? parsed.abilities : null;
  }catch(_error){return null;}
 }
 async function findTeamDefinition(id) {
  if(!localDefinitions)localDefinitions=readTeamDefinitions(definitionsURL);
  const local=await localDefinitions;
  if(local?.[id]?.description)return local[id];
  if(!remoteDefinitions)remoteDefinitions=readTeamDefinitions(remoteDefinitionsURL);
  const remote=await remoteDefinitions;
  return remote?.[id]?.description?remote[id]:null;
 }
 function teamAbilitySymbol(id) {
  const img=E('img','adv-team-ability-icon');
  img.alt='';
  img.decoding='async';
  const missing=()=>{
   const warn=E('span','adv-team-ability-missing','⚠');
   warn.setAttribute('aria-label','Missing team ability symbol: '+id);
   warn.title='Missing team ability symbol: '+id;
   img.replaceWith(warn);
  };
  img.onerror=()=>{
   img.onerror=missing;
   img.src='https://storage.googleapis.com/static.hcunits.net/images/ta/'+encodeURIComponent(id)+'.svg';
  };
  img.src='assets/team-abilities/'+id+'.svg';
  return img;
 }
 async function openTeamAbility(id) {
  document.getElementById('advancedTeamAbilityOverlay')?.remove();
  const overlay=E('div','symbol-overlay adv-card-power-overlay');
  overlay.id='advancedTeamAbilityOverlay';
  const dialog=E('section','symbol-dialog adv-card-power-dialog adv-team-definition-dialog');
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-label','Team ability information');
  const heading=E('div','symbol-dialog-header');
  heading.append(teamAbilitySymbol(id));
  const title=E('h2','',id.replace(/_/g,' '));
  heading.append(title);
  const close=button('✕',()=>overlay.remove(),'symbol-close');
  close.setAttribute('aria-label','Close team ability rules');
  heading.append(close);
  const paper=E('article','symbol-reference-panel comic-reading-panel');
  paper.dataset.panel='0';
  const text=E('div','symbol-reference-text');
  text.append(E('p','adv-card-power-paragraph','Loading HCUnits team ability description…'));
  paper.append(text);
  dialog.append(heading,paper);
  overlay.append(dialog);
  overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.remove();});
  overlay.addEventListener('keydown',event=>{if(event.key==='Escape')overlay.remove();});
  document.body.append(overlay);
  close.focus();
  const item=await findTeamDefinition(id);
  if(!overlay.isConnected)return;
  text.replaceChildren();
  if(item){
   title.textContent=item.name||id.replace(/_/g,' ');
   dialog.setAttribute('aria-label',title.textContent+' team ability');
   const raw=String(item.description);
   for(const part of raw.split(/\s*\/\/\s*/).filter(Boolean)){
    const p=E('p','adv-card-power-paragraph');
    p.append(cardDescription(part.trim()));
    text.append(p);
   }
  }else{
   text.append(E('p','adv-team-definition-unavailable',
    '⚠ Team ability definition unavailable: '+id));
   const link=E('a','adv-team-definition-source','View HCUnits team ability reference');
   link.href='https://hcunits.net/help/teams/tags/team_abilities/';
   link.target='_blank';link.rel='noopener noreferrer';
   text.append(link);
  }
 }

 function cardDescription(part) {
  const content = document.createDocumentFragment();
  const pattern = /\[(?:d:([1-6])|ta:([a-z0-9_]+))\]/gi;
  let last = 0, match;
  while ((match = pattern.exec(part))) {
   content.append(document.createTextNode(part.slice(last, match.index)));
   if (match[1]) {
    const face = Number(match[1]);
    const icon = glyph(cardDice[face], 'Die showing ' + face);
    icon.classList.add('rule-source-die');
    icon.title = 'Die showing ' + face;
    content.append(icon);
   } else {
    const id = match[2].toLowerCase();
    const trigger=button('',()=>openTeamAbility(id),'adv-team-ability-trigger');
    trigger.setAttribute('aria-label','View '+id.replace(/_/g,' ')+' team ability rules');
    trigger.title='View '+id.replace(/_/g,' ')+' team ability';
    trigger.append(teamAbilitySymbol(id));
    content.append(trigger);
   }
   last = pattern.lastIndex;
  }
  content.append(document.createTextNode(part.slice(last)));
  return content;
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
    { const paragraph = E('p', 'adv-card-power-paragraph');
      paragraph.append(cardDescription(part.trim()));
      content.append(paragraph); }
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

 // Add all HCUnits team ability symbols immediately beside each character name.
 // Saved teams already carry this field when saved after the updated import.
 const renderUnitsWithTeamAbilities = advRenderUnits;
 advRenderUnits = function () {
  renderUnitsWithTeamAbilities();
  const cards=document.querySelectorAll('#advancedUnitRows .adv-compact-unit');
  cards.forEach((card,index)=>{
   const unit=advancedTeam.units[index];
   const name=card.querySelector('.adv-unit-name');
   if(!unit||!name)return;
   const ids=[...new Set((Array.isArray(unit.team_abilities)?unit.team_abilities:[])
    .filter(id=>typeof id==='string' && /^[a-z0-9_]+$/i.test(id))
    .map(id=>id.toLowerCase()))];
   if(!ids.length)return;
   const row=E('span','adv-unit-name-row');
   name.replaceWith(row);
   row.append(name);
   const symbols=E('span','adv-unit-team-abilities');
   symbols.setAttribute('aria-label','Character team abilities');
   for(const id of ids){
    const trigger=button('',()=>openTeamAbility(id),'adv-unit-team-ability');
    trigger.setAttribute('aria-label','View '+id.replace(/_/g,' ')+' team ability rules');
    trigger.title='View '+id.replace(/_/g,' ')+' team ability';
    trigger.append(teamAbilitySymbol(id));
    symbols.append(trigger);
   }
   row.append(symbols);
  });
 };

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
