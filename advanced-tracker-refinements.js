/* Advanced tracker display refinements, staging only. */
const ADV_CUSTOM_SYMBOLS={
 Trait:null,
 Speed:'assets/source-icons/speed/run_white.png',
 Attack:'assets/source-icons/attack/fist_white.png',
 Defense:'assets/source-icons/defense/shield_white.png',
 Damage:'assets/source-icons/damage/standard_white.png'
};
function advCustomKind(value){
 if(value in ADV_CUSTOM_SYMBOLS)return value;
 return advPower(value)?.group||'Trait';
}
function advCustomSymbol(value){
 const kind=advCustomKind(value);
 const shell=E('span','adv-custom-symbol adv-custom-'+kind.toLowerCase());
 shell.setAttribute('role','img');shell.setAttribute('aria-label',kind+' combat symbol');
 if(kind==='Trait')shell.textContent='★';
 else{
  const image=E('img','adv-custom-image');image.src=ADV_CUSTOM_SYMBOLS[kind];image.alt='';shell.append(image);
 }
 return shell;
}
function advDialColor(powerId){
 const power=advPower(powerId);
 if(!power)return {background:'#fff',foreground:'#111',name:powerId==='special'?'Special':'No power'};
 const hex=power.color||'#ffffff';
 const rgb=hex.replace('#','');
 const [r,g,b]=[0,2,4].map(i=>parseInt(rgb.slice(i,i+2),16)/255);
 const lin=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
 const lum=.2126*lin(r)+.7152*lin(g)+.0722*lin(b);
 return {background:hex,foreground:lum<=.179?'#fff':'#111',name:power.name};
}
function advTrackedPowerIcon(name){
 const symbol=trackerIcon(name);
 const artwork=symbol.querySelector('.power-category-icon');
 if(artwork){
  const contrast=advDialColor(name);
  symbol.style.setProperty('--adv-icon-filter',contrast.foreground==='#fff'?'brightness(0) invert(1)':'brightness(0)');
 }
 return symbol;
}
function advStatSymbol(group,unit){
 const src=advCombatIcon(unit,group);
 const img=E('img','adv-stat-symbol');img.src=src;img.alt='';
 return img;
}
function advStatLine(unit,active){
 const stats=E('div','adv-dial-stats');
 const range=E('div','adv-range');range.setAttribute('aria-label',String(unit.range??0)+' range, '+String(unit.targets??0)+' targets');
 range.append(E('strong','adv-range-number',String(unit.range??'—')));
 const bolts=E('span','adv-range-bolts');
 for(let n=0;n<Math.min(6,Math.max(0,Number(unit.targets)||0));n++){
  const im=E('img','adv-target-bolt');im.src='assets/combat/bolt.png';im.alt='';bolts.append(im);
 }
 range.append(bolts);stats.append(range);
 for(const group of ADV_SLOT_GROUPS){
  const id=group.toLowerCase();
  const powerId=active?.[id+'_power'];
  const color=advDialColor(powerId);
  const cell=E('div','adv-dial-stat');
  cell.style.backgroundColor=color.background;
  cell.style.color=color.foreground;
  cell.title=group+': '+String(active?.[id+'_value']??'—')+' ('+color.name+')';
  cell.setAttribute('aria-label',cell.title);
  const symbol=advStatSymbol(group,unit);
  // Existing repository artwork is dark; make it white when the PAC square is dark.
  symbol.style.setProperty('--adv-stat-filter',color.foreground==='#fff'?'brightness(0) invert(1)':'brightness(0)');
  cell.append(symbol,E('strong','adv-stat-value',String(active?.[id+'_value']??'—')));
  stats.append(cell);
 }
 return stats;
}
function advRenderUnits(){
 const host=document.getElementById('advancedUnitRows');if(!host)return;
 host.replaceChildren();
 if(!advancedTeam.units.length){host.append(E('p','advanced-empty','Load an HCUnits team to start tracking its units.'));return}
 for(const unit of advancedTeam.units){
  const dial=Array.isArray(unit.dial)?unit.dial:[];
  const i=dial.findIndex(d=>Number(d.click_number)===Number(unit.click));
  const active=dial[i]||dial[0];
  const card=E('article','adv-compact-unit');
  const line=E('div','adv-compact-line');
  const identity=E('div','adv-compact-identity');
  identity.append(E('strong','adv-unit-name',unit.name),E('small','adv-unit-details',unit.id.toUpperCase()+(unit.points!=null?' · '+unit.points+' pts':'')));
  line.append(identity);
  const abilities=E('div','adv-compact-powers');
  const shown=[];
  if(active)for(const group of ADV_SLOT_GROUPS){
   const power=advPower(active[group.toLowerCase()+'_power']);
   if(power&&advancedPowers.includes(power.name)&&!shown.some(x=>x.key===power.name))shown.push({key:power.name,label:power.name});
  }
  // Special powers and traits are deliberately never auto-added.
  for(const extra of unit.custom||[]){
   if(extra.all||extra.clicks?.includes(Number(unit.click)))shown.push({key:'custom:'+extra.id,label:extra.name,icon:advCustomKind(extra.icon),custom:true});
  }
  for(const entry of shown){
   const usedKey=advUsedKey(entry,unit.click);
   const isUsed=!!unit.used?.[usedKey];
   const isReady=!!unit.ready?.[usedKey];
   const ability=button('',()=>{
    unit.used=unit.used||{};
    unit.used[usedKey]=!unit.used[usedKey];
    if(unit.used[usedKey]&&unit.ready)delete unit.ready[usedKey];
    advSave();advRenderUnits();
   },'adv-compact-ability'+(isUsed?' is-used':'')+(isReady&&!isUsed?' is-ready':''));
   const icon=entry.custom?advCustomSymbol(entry.icon):advTrackedPowerIcon(entry.label);
   ability.append(icon,E('span','adv-compact-ability-label',entry.label));
   ability.title=entry.label+(isUsed?' (used)':' (unused)');
   ability.setAttribute('aria-pressed',String(isUsed));
   abilities.append(ability);
  }
  line.append(abilities);
  const add=button('+ Add Custom',()=>advCustomModal(unit),'adv-compact-add');
  add.setAttribute('aria-label','Add a custom ability for '+unit.name);
  const click=E('div','adv-compact-click');
  const back=button('−',()=>advSetClick(unit,Math.max(0,i-1)),'adv-click-control');back.disabled=i<=0;
  const number=E('span','adv-click-number',String(unit.click));
  const forward=button('+',()=>advSetClick(unit,Math.min(dial.length-1,i+1)),'adv-click-control');forward.disabled=i<0||i===dial.length-1;
  click.append(back,number,forward);line.append(click,add);
  card.append(line,advStatLine(unit,active));host.append(card);
 }
}
function advCustomModal(unit){
 const {layer,panel}=advModal('Add Custom Ability');
 panel.classList.add('adv-custom-dialog');
 const form=E('form','adv-custom-form');
 let chosen='Trait';
 const iconPicker=E('div','adv-kind-picker');
 iconPicker.append(E('strong','adv-field-heading','Icon'));
 const toggle=button('',()=>{menu.hidden=!menu.hidden},'adv-kind-toggle');
 const menu=E('div','adv-kind-menu');menu.hidden=true;
 function selectIcon(kind){
  chosen=kind;
  toggle.replaceChildren(advCustomSymbol(kind),E('span','',kind),E('span','adv-menu-chevron','▾'));
  menu.hidden=true;
 }
 for(const kind of Object.keys(ADV_CUSTOM_SYMBOLS)){
  const opt=button('',()=>selectIcon(kind),'adv-kind-item');
  opt.append(advCustomSymbol(kind),E('span','',kind));menu.append(opt);
 }
 toggle.setAttribute('aria-label','Choose custom ability combat symbol');
 iconPicker.append(toggle,menu);selectIcon('Trait');
 const nameLabel=E('label','adv-custom-name','Ability name');
 const name=E('input','advanced-field');name.maxLength=70;name.required=true;name.placeholder='Ability name';nameLabel.append(name);
 const clickField=E('div','adv-custom-click-field');
 clickField.append(E('strong','adv-field-heading','Active on clicks'));
 const checks=E('div','adv-custom-checks');
 const allInput=E('input');allInput.type='checkbox';allInput.checked=true;
 const allLabel=E('label','adv-check');allLabel.append(allInput,E('span','','All'));checks.append(allLabel);
 const numbered=[];
 for(const d of unit.dial){
  const input=E('input');input.type='checkbox';input.checked=true;
  const label=E('label','adv-check');label.append(input,E('span','',String(d.click_number)));
  checks.append(label);numbered.push({input,click:Number(d.click_number)});
 }
 allInput.onchange=()=>numbered.forEach(v=>v.input.checked=allInput.checked);
 numbered.forEach(v=>v.input.onchange=()=>allInput.checked=numbered.every(x=>x.input.checked));
 clickField.append(checks);
 const save=button('Add Ability',null,'game-tools-action');save.type='submit';
 form.append(iconPicker,nameLabel,clickField,save);
 form.onsubmit=e=>{
  e.preventDefault();
  const clicks=numbered.filter(x=>x.input.checked).map(x=>x.click);
  if(!clicks.length){clickField.classList.add('adv-invalid');return}
  unit.custom=unit.custom||[];
  unit.custom.push({id:String(Date.now()),name:name.value.trim(),icon:chosen,all:allInput.checked,clicks});
  advSave();layer.remove();advRenderUnits();
 };
 panel.append(form);name.focus();
}
