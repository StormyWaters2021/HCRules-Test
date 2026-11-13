/* Dice placeholders from source rules. Isolated adapter for easy rollback.
   Converts text like [5]–[6] to stable die faces without changing source text. */
(function(){
 'use strict';
 const faces={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
 function makeDie(face){
  const die=document.createElement('span');
  die.className='rule-die-face';
  die.setAttribute('role','img');
  die.setAttribute('aria-label','die showing '+face);
  die.title='Die showing '+face;
  const occupied=faces[face];
  for(let i=0;i<9;i++){
   const pip=document.createElement('span');
   pip.className=occupied.includes(i)?'rule-die-pip active':'rule-die-pip';
   die.append(pip);
  }
  return die;
 }
 const previous=linkedLine;
 linkedLine=function(t,source){
  const host=previous(t,source);
  const pattern=/\[([1-6])\]/g;
  for(const child of [...host.childNodes]){
   if(child.nodeType!==3 || !/\[[1-6]\]/.test(child.nodeValue))continue;
   const fragment=document.createDocumentFragment();
   let position=0,match;
   pattern.lastIndex=0;
   while((match=pattern.exec(child.nodeValue))){
    fragment.append(document.createTextNode(child.nodeValue.slice(position,match.index)));
    fragment.append(makeDie(Number(match[1])));
    position=pattern.lastIndex;
   }
   fragment.append(document.createTextNode(child.nodeValue.slice(position)));
   child.replaceWith(fragment);
  }
  return host;
 };
})();
