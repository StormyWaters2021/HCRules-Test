/* Cloudflare Pages Function. Serves public HCUnits team + dial JSON same-origin.
   Origin and path are fixed; arbitrary URL fetching is not allowed. */
export async function onRequestGet({params}){
 const path=Array.isArray(params.path)?params.path.join('/'):String(params.path||'');
 const match=path.match(/^(team|unit)\/([a-zA-Z0-9-]+)$/);
 if(!match)return Response.json({error:'Invalid HCUnits resource'}, {status:400});
 const [,kind,id]=match;
 if((kind==='team'&&!/^[0-9a-f-]{36}$/i.test(id))||(kind==='unit'&&!/^[a-z0-9]{2,30}$/i.test(id)))
  return Response.json({error:'Invalid identifier'}, {status:400});
 const url=kind==='team'
  ? 'https://hcunits.net/teams/'+encodeURIComponent(id)+'/'
  : 'https://hcunits.net/api/v1/units/'+encodeURIComponent(id)+'/';
 try{
  const r=await fetch(url,{headers:{Accept:kind==='team'?'text/html':'application/json','User-Agent':'ClixRules-Reference/1.0'}});
  if(!r.ok)return Response.json({error:'HCUnits returned '+r.status},{status:r.status===404?404:502});
  let data;
  if(kind==='unit')data=await r.json();
  else{
   const html=await r.text();
   const script=html.match(/<script\b(?=[^>]*\bid\s*=\s*["']teamObject["'])[^>]*>([\s\S]*?)<\/script>/i);
   if(!script)return Response.json({error:'HCUnits team data not found'}, {status:502});
   data=JSON.parse(script[1].trim());
  }
  return Response.json(data,{headers:{'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
 }catch(_e){return Response.json({error:'Unable to retrieve HCUnits data'}, {status:502})}
}
