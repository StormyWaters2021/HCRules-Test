/* Saved Advanced Tracker teams. Kept separate from the currently active team. */
(function () {
 'use strict';
 const KEY='clixrules:advanced-saved-teams:v1';
 const MAX_TEAMS=40;
 function savedTeams(){
  try{
   const items=JSON.parse(localStorage.getItem(KEY)||'[]');
   return Array.isArray(items)?items.filter(item=>item&&item.id&&item.team&&Array.isArray(item.team.units)):[];
  }catch(_){return [];}
 }
 function snapshot(team){return JSON.parse(JSON.stringify(team));}
 function writeTeams(teams){
  try{localStorage.setItem(KEY,JSON.stringify(teams));return true;}
  catch(_){window.alert('Could not save teams. Browser storage may be full or disabled.');return false;}
 }
 function saveCurrent(){
  if(!Array.isArray(advancedTeam.units)||!advancedTeam.units.length){
   window.alert('Load a team before saving it.');return;
  }
  const teams=savedTeams();
  if(teams.length>=MAX_TEAMS){
   window.alert('Saved Teams is full ('+MAX_TEAMS+' teams). Delete an older team to save another.');return;
  }
  const entry={
   id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),
   name:advancedTeam.name||'Unnamed Team',
   savedAt:new Date().toISOString(),
   team:snapshot(advancedTeam)
  };
  teams.push(entry);
  if(writeTeams(teams))renderList();
 }
 function loadSaved(id){
  const item=savedTeams().find(entry=>entry.id===id);
  if(!item)return;
  advancedTeam=snapshot(item.team);
  advSave();
  advUpdateHeading();
  advRenderUnits();
  const header=document.getElementById('advancedTeamTitle');
  if(header&&advancedTeam.skipped?.length){
   const note=E('span','adv-skipped-note',' · '+advancedTeam.skipped.length+' non-dial entries omitted');
   note.title=advancedTeam.skipped.join(', ');
   header.append(note);
  }
 }
 // One-time migration utility: create a refreshed COPY, never replace the saved team.
 async function refreshTeamAbilities(id, control){
  const original=savedTeams().find(entry=>entry.id===id);
  if(!original)return;
  const source=original.team.units;
  if(!source.length||source.some(unit=>!unit.id)){
   window.alert('The saved team has missing character IDs and cannot be refreshed safely.');
   return;
  }
  if(savedTeams().length>=MAX_TEAMS){
   window.alert('Saved Teams is full. Make room for a refreshed copy before continuing.');
   return;
  }
  if(!window.confirm('Refresh team abilities for "'+original.name+'"? This creates a separate saved copy. Your original saved team, custom powers, clicks, and settings will not be changed.'))return;
  const previousLabel=control.textContent;
  control.disabled=true;control.textContent='Refreshing…';
  try{
   const ids=[...new Set(source.map(unit=>String(unit.id).toLowerCase()))];
   const results=await Promise.all(ids.map(async unitId=>{
    try {
     const data=await advGetJson('unit/'+encodeURIComponent(unitId));
     if(String(data?.id||'').toLowerCase()!==unitId)
      throw Error('HCUnits returned a different character ID');
     if(!Array.isArray(data?.team_abilities)||!data.team_abilities.every(code=>typeof code==='string'))
      throw Error('No valid team abilities returned');
     return {id:unitId,abilities:data.team_abilities};
    } catch(error) {
     return {id:unitId,error:error?.message||String(error)};
    }
   }));
   const abilities=new Map(results.filter(result=>!result.error)
    .map(result=>[result.id,result.abilities]));
   const skipped=results.filter(result=>result.error).map(result=>{
    const unit=source.find(unit=>String(unit.id).toLowerCase()===result.id);
    return (unit?.name||result.id)+' ('+result.id+'): '+result.error;
   });
   if(!abilities.size)throw Error('No entries could be refreshed. '+skipped.join('; '));
   const refreshed=snapshot(original.team);
   for(const unit of refreshed.units){
    const updated=abilities.get(String(unit.id).toLowerCase());
    if(updated)unit.team_abilities=[...updated];
   }
   const current=savedTeams();
   if(!current.some(entry=>entry.id===id))throw Error('Original saved team is no longer available.');
   if(current.length>=MAX_TEAMS)throw Error('Saved Teams is full.');
   const copy={
    id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),
    name:original.name+' (Refreshed)',
    savedAt:new Date().toISOString(),
    team:refreshed
   };
   if(writeTeams([...current,copy])){
    renderList();
    window.alert('Created "'+copy.name+'" with team abilities refreshed for '+abilities.size+' of '+ids.length+' unique entries. Your original is unchanged. Click Load on the refreshed copy to use it.'+
     (skipped.length?'\n\nNot refreshed (kept unchanged):\n'+skipped.join('\n'):''));

   }
  }catch(error){
   window.alert('No saved teams were changed. Refresh failed: '+(error?.message||'Unable to retrieve HCUnits data.'));
  }finally{
   if(control.isConnected){control.disabled=false;control.textContent=previousLabel;}
  }
 }
 function deleteSaved(id){
  const teams=savedTeams();
  const item=teams.find(entry=>entry.id===id);
  if(!item)return;
  if(!window.confirm('Delete saved team "'+item.name+'"? This will not affect the currently loaded team.'))return;
  if(writeTeams(teams.filter(entry=>entry.id!==id)))renderList();
 }
 function renderList(){
  const list=document.getElementById('advancedSavedTeamsList');
  if(!list)return;
  const items=savedTeams();
  list.replaceChildren();
  if(!items.length){
   list.append(E('p','adv-saved-empty','No saved teams yet.'));
   return;
  }
  for(const item of items){
   const row=E('div','adv-saved-row');
   const title=E('span','adv-saved-name',item.name);
   const actions=E('div','adv-saved-actions');
   const load=button('Load',()=>loadSaved(item.id),'game-tools-action adv-saved-load');
   load.setAttribute('aria-label','Load '+item.name);
   const refresh=button('Refresh Team Abilities',null,'game-tools-action adv-saved-refresh');
   refresh.setAttribute('aria-label','Create a refreshed copy of '+item.name+' with current HCUnits team abilities');
   refresh.title='Create a copy with current HCUnits team abilities; preserve all existing settings';
   refresh.addEventListener('click',()=>refreshTeamAbilities(item.id,refresh));
   const remove=button('Delete',()=>deleteSaved(item.id),'game-tools-action adv-saved-delete');
   remove.setAttribute('aria-label','Delete '+item.name);
   actions.append(load,refresh,remove);
   row.append(title,actions);
   list.append(row);
  }
 }
 const originalRender=renderAdvancedTracker;
 renderAdvancedTracker=function(){
  originalRender();
  const host=document.getElementById('advancedTrackerHost');
  if(!host)return;
  const actions=host.querySelector('.game-tracker-actions');
  if(actions){
   const save=button('Save Team',saveCurrent,'game-tools-action adv-save-team');
   save.title='Save a copy of the current team on this device';
   actions.insertBefore(save,actions.children[1]||null);
  }
  // Keep team actions above the name, with turn controls in their own row below it.
  const heading=host.querySelector('#advancedTeamTitle');
  if(actions && heading){
   const turnRow=E('div','adv-turn-controls');
   turnRow.setAttribute('role','group');
   turnRow.setAttribute('aria-label','Turn controls');
   const buttons=[...actions.querySelectorAll('button')];
   const start=buttons.find(el=>el.textContent.trim()==='Start My Turn');
   const pass=buttons.find(el=>el.textContent.trim()==='Pass Turn');
   if(start&&pass){
    turnRow.append(start,pass);
    heading.after(turnRow);
   }
  }
  const section=E('section','adv-saved-teams');
  section.id='advancedSavedTeams';
  section.append(E('h3','adv-saved-title','Saved Teams'));
  const list=E('div','adv-saved-list');
  list.id='advancedSavedTeamsList';
  section.append(list);
  host.append(section);
  renderList();
 };
})();
