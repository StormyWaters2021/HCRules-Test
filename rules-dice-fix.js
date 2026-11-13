/* Dice placeholders from source rules. Isolated adapter for easy rollback.
   Converts text like [5]–[6] to stable die faces without changing source text. */
(function(){
 'use strict';
 // Source dice artwork used by Breaking Away (10.8), with matching PDF faces
 // from the Knockback example for values not displayed in 10.8.
 const diceSources={
  1:'assets/inline/10_8-2.png',
  2:'assets/inline/12_6b-0.png',
  3:'assets/inline/12_6b-2.png',
  4:'assets/inline/10_8-1.png',
  5:'assets/inline/12_6b-6.png',
  6:'assets/inline/10_8-0.png'
 };
 function makeDie(face){
  const die=glyph(diceSources[face],'Die showing '+face);
  die.classList.add('rule-source-die');
  die.setAttribute('aria-label','Die showing '+face);
  die.title='Die showing '+face;
  return die;
 }
 const previous=linkedLine;
 linkedLine=function(t,source){
  const host=previous(t,source);
  const pattern=/\[([1-6])\]|([\u2680-\u2685])/g;
  for(const child of [...host.childNodes]){
   if(child.nodeType!==3 || !/(?:\[[1-6]\]|[\u2680-\u2685])/.test(child.nodeValue))continue;
   const fragment=document.createDocumentFragment();
   let position=0,match;
   pattern.lastIndex=0;
   while((match=pattern.exec(child.nodeValue))){
    fragment.append(document.createTextNode(child.nodeValue.slice(position,match.index)));
    fragment.append(makeDie(match[1]?Number(match[1]):match[2].codePointAt(0)-0x267f));
    position=pattern.lastIndex;
   }
   fragment.append(document.createTextNode(child.nodeValue.slice(position)));
   child.replaceWith(fragment);
  }
  return host;
 };
})();
