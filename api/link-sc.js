const S=require("../lib/store"),SC=require("../lib/sc");
module.exports=async(req,res)=>{
  if(req.method==="GET")return S.json(res,200,{enabled:SC.enabled()});
  if(req.method!=="POST")return S.json(res,405,{error:"GET or POST"});
  if(!SC.enabled())return S.json(res,503,{error:"coming_soon",message:"SuperCompress account linking is coming soon. Local log sync works today."});
  const u=await S.auth(req);if(!u)return S.json(res,401,{error:"Bad token"});
  let b;try{b=await S.body(req)}catch(e){return S.json(res,400,{error:"Bad JSON"})}
  const share=String(b.share||"");if(!/^scu_[A-Za-z0-9_.-]{20,600}$/.test(share))return S.json(res,400,{error:"Expected a SuperCompress read-only share token (scu_)."});
  let j;try{j=await SC.fetchUsage(share)}catch(e){return S.json(res,e.status===401?401:502,{error:"SuperCompress did not accept that share token."})}
  const acct=String(j.account||"").replace(/[^a-f0-9]/g,"").slice(0,32);if(!acct)return S.json(res,502,{error:"No account ref from SuperCompress."});
  const ix="a/"+acct+".json",got=await S.list({prefix:ix,limit:1});
  if(got.blobs[0]){const ref=await S.readBlob(got.blobs[0]);if(ref&&ref.handle!==u.handle)return S.json(res,409,{error:"That SuperCompress account is already linked to another handle."})}
  const fresh=!u.sc||u.sc.account!==acct;u.sc={account:acct,enc:SC.enc(share),linkedAt:new Date().toISOString(),last:fresh?null:u.sc.last};if(fresh)u.scb={};
  SC.apply(u,j.usage||{});await S.saveUser(u);
  await S.put(ix,JSON.stringify({handle:u.handle}),{access:"public",addRandomSuffix:false,allowOverwrite:true,contentType:"application/json"});
  S.json(res,200,{ok:true,handle:u.handle,month:j.usage&&j.usage.month})};
