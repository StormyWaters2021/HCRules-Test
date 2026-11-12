/* Advanced Ability Tracker — isolated from Basic tracker state. */
const ADV_TRACKER_KEY='clixrules:advanced-tracker:v1';
const ADV_MODE_KEY='clixrules:tracker-mode:v1';
const ADV_DEFAULT_POWERS=['Sidestep','Poison','Willpower','Probability Control','Perplex','Outwit','Leadership'];
const ADV_SLOT_GROUPS=['Speed','Attack','Defense','Damage'];
let advancedTeam={name:'',url:'',units:[]};
let advancedPowers=[...ADV_DEFAULT_POWERS];
let advancedMode='basic';
function advStored(){
 try{
  const data=JSON.parse(localStorage.getItem(ADV_TRACKER_KEY)||'{}');
  if(Array.isArray(data.powers))advancedPowers=data.powers.filter(x=>db.pac.some(p=>p.name===x));
  if(data.team&&Array.isArray(data.team.units))advancedTeam=data.team;
  advancedMode=localStorage.getItem(ADV_MODE_KEY)==='advanced'?'advanced':'basic';
 }catch(_e){}
}
function advSave(){
 try{localStorage.setItem(ADV_TRACKER_KEY,JSON.stringify({powers:advancedPowers,team:advancedTeam}))}catch(_e){}
}
function advPowerName(id){return String(id||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bOf\b/g,'of').replace(/\bAnd\b/g,'and').replace(/\bWith\b/g,'with')}
function advPower(id){
 const slug=String(id||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 return db.pac.find(p=>p.name.toLowerCase().replace(/[^a-z0-9]/g,'')===slug);
}
function advModal(title){
 document.querySelector('.advanced-modal-layer')?.remove();
 const layer=E('div','advanced-modal-layer');
 const panel=E('section','advanced-modal comic-reading-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);
 const heading=E('div','advanced-modal-heading');heading.append(E('h3','',title));
 const close=button('×',()=>layer.remove(),'advanced-modal-close');close.setAttribute('aria-label','Close dialog');heading.append(close);
 panel.append(heading);layer.append(panel);document.body.append(layer);
 layer.addEventListener('mousedown',e=>{if(e.target===layer)layer.remove()});
 layer.addEventListener('keydown',e=>{if(e.key==='Escape')layer.remove()});
 close.focus();
 return {layer,panel};
}
function advPowerBadge(name,custom=false){
 const power=advPower(name);
 if(custom||!power){
  const star=E('span','advanced-star','★');star.title='Special power';return star;
 }
 return trackerIcon(power.name);
}
function advUsedKey(entry,click){return entry.key+'@'+click}
function advRenderUnits(){
 const host=document.getElementById('advancedUnitRows');if(!host)return;
 host.replaceChildren();
 if(!advancedTeam.units.length){host.append(E('p','advanced-empty','Load an HCUnits team to start tracking its units.'));return}
 for(const unit of advancedTeam.units){
  const dial=Array.isArray(unit.dial)?unit.dial:[];
  const active=dial.find(d=>Number(d.click_number)===Number(unit.click))||dial[0];
  const card=E('article','advanced-unit-card');
  const top=E('div','advanced-unit-top');
  const details=E('div','advanced-unit-identity');
  details.append(E('strong','',unit.name),E('small','',unit.id.toUpperCase()+(unit.points?' · '+unit.points+' pts':'')));
  const clickWrap=E('div','advanced-click');
  clickWrap.append(E('span','advanced-click-label','Click'));
  const controls=E('div','advanced-click-controls');
  const i=dial.findIndex(d=>Number(d.click_number)===Number(unit.click));
  const back=button('−',()=>advSetClick(unit,Math.max(0,i-1)),'advanced-click-button');
  back.disabled=i<=0;
  const count=E('span','advanced-click-number',String(unit.click));
  const fwd=button('+',()=>advSetClick(unit,Math.min(dial.length-1,i+1)),'advanced-click-button');
  fwd.disabled=i<0||i>=dial.length-1;
  controls.append(back,count,fwd);clickWrap.append(controls);
  top.append(details,clickWrap);card.append(top);
  const abilities=E('div','advanced-ability-row');
  const visible=[];
  if(active){
   for(const group of ADV_SLOT_GROUPS){
    const power=advPower(active[group.toLowerCase()+'_power']);
    if(power&&advancedPowers.includes(power.name)&&!visible.some(v=>v.key===power.name))visible.push({key:power.name,label:power.name});
    if(active[group.toLowerCase()+'_power']==='special'){
     const key='special:'+group;
     const defined=(unit.special_powers||[]).find(p=>p.type===group.toLowerCase());
     visible.push({key,label:defined?.name||'Special',custom:true});
    }
   }
   // Trait-granted PAC powers can be active even when absent from dial slots.
   for(const trait of unit.special_powers||[]){
    if(trait.type!=='trait'||!Array.isArray(trait.powers))continue;
    for(const id of trait.powers){
     const power=advPower(id);
     if(power&&advancedPowers.includes(power.name)&&!visible.some(v=>v.key===power.name))
      visible.push({key:power.name,label:power.name});
    }
   }
  }
  for(const extra of unit.custom||[]){
   if(extra.all||extra.clicks?.includes(Number(unit.click)))visible.push({key:'custom:'+extra.id,label:extra.name,custom:true,icon:extra.icon});
  }
  for(const entry of visible){
   const cell=button('',()=>{unit.used=unit.used||{};const key=advUsedKey(entry,unit.click);unit.used[key]=!unit.used[key];if(unit.used[key]&&unit.ready)delete unit.ready[key];advSave();advRenderUnits()},'advanced-ability'+(unit.used?.[advUsedKey(entry,unit.click)]?' is-used':'')+(unit.ready?.[advUsedKey(entry,unit.click)]?' is-ready':''));
   const badge=entry.icon?advPowerBadge(entry.icon):advPowerBadge(entry.label,entry.custom);
   cell.append(badge,E('span','advanced-ability-label',entry.label));
   cell.title=entry.label+(unit.used?.[advUsedKey(entry,unit.click)]?' (used)':' (unused)');
   cell.setAttribute('aria-pressed',String(!!unit.used?.[advUsedKey(entry,unit.click)]));
   abilities.append(cell);
  }
  const add=button('+',()=>advCustomModal(unit),'advanced-add-ability');add.setAttribute('aria-label','Add custom ability for '+unit.name);
  abilities.append(add);card.append(abilities);
  const stats=E('div','advanced-stats');
  function stat(text,value,token,group){
   const part=E('div','advanced-stat '+(group?'advanced-stat-'+group.toLowerCase():''));
   if(token){
    const icon=E('img','advanced-stat-symbol');icon.src=token;icon.alt='';part.append(icon);
   }else part.append(E('span','advanced-stat-label',text));
   part.append(E('strong','',String(value??'—')));part.title=text+': '+String(value??'—');return part;
  }
  stats.append(stat('Range',unit.range,'assets/combat/bolt.png'),stat('Targets',unit.targets,null));
  for(const group of ADV_SLOT_GROUPS){
   const symbol=advCombatIcon(unit,group);
   stats.append(stat(group,active?.[group.toLowerCase()+'_value'],symbol,group));
  }
  card.append(stats);
  host.append(card);
 }
}
function advCombatIcon(unit,group){
 const identifiers=unit.combat_symbols||[];
 const variants={
  Speed:identifiers.includes('wing')?'flight':identifiers.includes('dolphin')?'swim':'run',
  Attack:identifiers.includes('autonomous')?'autonomous':'fist',
  Defense:identifiers.includes('vehicle')?'vehicle':'shield',
  Damage:identifiers.includes('colossal')?'colossal':identifiers.includes('giant')?'giant':identifiers.includes('tiny')?'tiny':'standard'
 };
 return 'assets/combat-token/'+group.toLowerCase()+'-'+variants[group]+'.png';
}
function advSetClick(unit,index){
 if(index<0||index>=unit.dial.length)return;
 unit.click=Number(unit.dial[index].click_number);
 advSave();advRenderUnits();
}
function advCustomModal(unit){
 const {layer,panel}=advModal('Add Custom Ability');
 const form=E('form','advanced-form');
 const iconLabel=E('div','advanced-icon-picker');
 iconLabel.append(E('strong','','Icon'));
 let selectedIcon='Special';
 const iconToggle=button('',()=>{iconMenu.hidden=!iconMenu.hidden},'advanced-icon-toggle');
 const iconMenu=E('div','advanced-icon-options');iconMenu.hidden=true;
 function chooseIcon(value){
  selectedIcon=value;
  iconToggle.replaceChildren(advPowerBadge(value,value==='Special'),E('span','',value),E('span','advanced-icon-arrow','▾'));
  iconMenu.hidden=true;
 }
 for(const value of ['Special',...db.pac.map(p=>p.name)]){
  const option=button('',()=>chooseIcon(value),'advanced-icon-option');
  option.append(advPowerBadge(value,value==='Special'),E('span','',value));
  iconMenu.append(option);
 }
 iconToggle.setAttribute('aria-label','Select HeroClix power icon');
 iconLabel.append(iconToggle,iconMenu);
 chooseIcon('Special');
 const nameLabel=E('label','','Ability Name');const name=E('input','advanced-field');name.required=true;name.maxLength=70;name.placeholder='Name this ability';nameLabel.append(name);
 const checkLabel=E('strong','','Active on Clicks');
 const grid=E('div','advanced-click-checks');
 const all=E('input');all.type='checkbox';all.checked=true;
 const allLabel=E('label','');allLabel.append(all,E('span','','All'));grid.append(allLabel);
 const clickInputs=[];
 for(const d of unit.dial){
  const input=E('input');input.type='checkbox';input.checked=true;
  const label=E('label','');label.append(input,E('span','',String(d.click_number)));grid.append(label);clickInputs.push({input,click:Number(d.click_number)});
 }
 all.onchange=()=>clickInputs.forEach(x=>x.input.checked=all.checked);
 clickInputs.forEach(x=>x.input.onchange=()=>{all.checked=clickInputs.every(i=>i.input.checked)});
 const save=button('Add Ability',null,'game-tools-action');save.type='submit';
 form.append(iconLabel,nameLabel,checkLabel,grid,save);
 form.onsubmit=e=>{
  e.preventDefault();if(!name.value.trim())return;
  const clicks=clickInputs.filter(x=>x.input.checked).map(x=>x.click);
  if(!clicks.length){alert('Select at least one click.');return}
  unit.custom=unit.custom||[];
  unit.custom.push({id:String(Date.now()),name:name.value.trim(),icon:selectedIcon,all:all.checked,clicks});
  advSave();layer.remove();advRenderUnits();
 };
 panel.append(form);name.focus();
}
function advSettingsModal(){
 const {layer,panel}=advModal('Tracked Powers');
 panel.append(E('p','advanced-modal-note','Choose which PAC abilities appear automatically on each unit’s current click.'));
 const form=E('form','advanced-form');
 const grid=E('div','advanced-settings-grid');
 const checkboxes=[];
 for(const group of ADV_SLOT_GROUPS){
  const heading=E('h4','',group);grid.append(heading);
  for(const p of db.pac.filter(p=>p.group===group)){
   const label=E('label','advanced-settings-option');
   const input=E('input');input.type='checkbox';input.checked=advancedPowers.includes(p.name);
   label.append(input,trackerIcon(p.name),E('span','',p.name));grid.append(label);
   checkboxes.push({input,name:p.name});
  }
 }
 const save=button('Save Settings',null,'game-tools-action');save.type='submit';
 form.append(grid,save);form.onsubmit=e=>{e.preventDefault();advancedPowers=checkboxes.filter(x=>x.input.checked).map(x=>x.name);advSave();layer.remove();advRenderUnits()};
 panel.append(form);
}
async function advGetJson(path){
 const response=await fetch('/api/hcunits/'+path,{headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('HCUnits import failed (HTTP '+response.status+'). Verify that the staging proxy is configured.');
 return response.json();
}
function advLoadModal(){
 const {layer,panel}=advModal('Load Team from HCUnits');
 const form=E('form','advanced-form');
 const label=E('label','','HCUnits Team Link');
 const input=E('input','advanced-field');input.type='url';input.required=true;input.placeholder='https://hcunits.net/teams/.../';input.value=advancedTeam.url||'';label.append(input);
 const status=E('p','advanced-load-status');status.setAttribute('role','status');
 const load=button('Load Team',null,'game-tools-action');load.type='submit';
 form.append(label,load,status);
 form.onsubmit=async e=>{
  e.preventDefault();
  let id;
  try{const url=new URL(input.value);if(url.hostname!=='hcunits.net'&&url.hostname!=='www.hcunits.net')throw Error();id=url.pathname.match(/^\/teams\/([a-f0-9-]{36})\/?$/i)?.[1];if(!id)throw Error()}
  catch(_e){status.textContent='Enter a valid HCUnits team URL.';return}
  load.disabled=true;status.textContent='Loading team and individual dials…';
  try{
   const data=await advGetJson('team/'+id);
   if(!Array.isArray(data.units))throw Error('Team data does not contain a units list.');
   const entries=data.units.filter(x=>x.section==='main_force'&&x.unit?.id);
   const units=await Promise.all(entries.map(async x=>{
    const unit=await advGetJson('unit/'+encodeURIComponent(x.unit.id));
    if(!Array.isArray(unit.dial)||!unit.dial.length)throw Error('No dial data for '+x.unit.id);
    const pv=(unit.point_values||[]).find(p=>Number(p.point_value)===Number(x.point_value))||unit.point_values?.[0]||{};
    const start=Number(pv.click_number||unit.dial[0].click_number);
    return {id:unit.id,name:unit.name,points:x.point_value||pv.point_value,click:unit.dial.some(d=>Number(d.click_number)===start)?start:Number(unit.dial[0].click_number),dial:unit.dial,range:unit.unit_range,targets:unit.targets,combat_symbols:pv.combat_symbols||unit.combat_symbols||[],special_powers:unit.special_powers||[],custom:[],used:{},ready:{}};
   }));
   if(!units.length)throw Error('No main-force units were found.');
   advancedTeam={name:data.public_name||data.name_safe||'HCUnits Team',url:input.value,units};
   advSave();layer.remove();advRenderUnits();advUpdateHeading();
  }catch(err){status.textContent=err.message||'Unable to load team';}finally{load.disabled=false}
 };
 panel.append(form);input.focus();
}
function advUpdateHeading(){
 const heading=document.getElementById('advancedTeamTitle');if(heading)heading.textContent=advancedTeam.name||'No team loaded';
}
function advReset(start){
 for(const unit of advancedTeam.units){
  unit.used={};unit.ready={};
  if(start){
   const active=unit.dial.find(d=>Number(d.click_number)===Number(unit.click));
   for(const group of ADV_SLOT_GROUPS){
    const power=advPower(active?.[group.toLowerCase()+'_power']);
    if(power&&['Willpower','Leadership'].includes(power.name))unit.ready[advUsedKey({key:power.name},unit.click)]=true;
   }
  }
 }
 advSave();advRenderUnits();
}
function advPassTurn(){
 for(const unit of advancedTeam.units){
  for(const key of Object.keys(unit.used||{}))if(key.startsWith('Probability Control@'))delete unit.used[key];
 }
 advSave();advRenderUnits();
}
function renderAdvancedTracker(){
 const host=document.getElementById('advancedTrackerHost');if(!host)return;
 host.replaceChildren();
 const actions=E('div','game-tracker-actions');
 actions.append(button('Load Team',advLoadModal,'game-tools-action'),button('⚙ Powers',advSettingsModal,'game-tools-action'),button('Start My Turn',()=>advReset(true),'game-tools-action'),button('Pass Turn',advPassTurn,'game-tools-action'));
 const heading=E('p','advanced-team-title');heading.id='advancedTeamTitle';
 const rows=E('div','advanced-unit-rows');rows.id='advancedUnitRows';
 host.append(actions,heading,rows);
 advUpdateHeading();advRenderUnits();
}
function advAttachMode(tracker,basicNodes){
 advStored();
 const switcher=E('div','advanced-mode-toggle');switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Ability Tracker mode');
 const basic=button('Basic',()=>setMode('basic'),'advanced-mode-button');
 const advanced=button('Advanced',()=>setMode('advanced'),'advanced-mode-button');
 const host=E('div','');host.id='advancedTrackerHost';
 const setMode=mode=>{
  advancedMode=mode;
  try{localStorage.setItem(ADV_MODE_KEY,mode)}catch(_e){}
  basic.classList.toggle('selected',mode==='basic');advanced.classList.toggle('selected',mode==='advanced');
  basic.setAttribute('aria-pressed',String(mode==='basic'));advanced.setAttribute('aria-pressed',String(mode==='advanced'));
  for(const el of basicNodes)el.hidden=mode!=='basic';
  host.hidden=mode!=='advanced';
  if(mode==='advanced')renderAdvancedTracker();
 };
 switcher.append(basic,advanced);
 tracker.insertBefore(switcher,basicNodes[0]||null);
 tracker.append(host);
 setMode(advancedMode);
}
