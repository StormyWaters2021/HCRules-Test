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
   const remove=button('Delete',()=>deleteSaved(item.id),'game-tools-action adv-saved-delete');
   remove.setAttribute('aria-label','Delete '+item.name);
   actions.append(load,remove);
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
