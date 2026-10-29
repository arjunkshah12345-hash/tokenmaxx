const S=require("../lib/store");
module.exports=async(req,res)=>{const u=await S.auth(req);if(!u)return S.json(res,401,{error:"Bad or missing token."});
  if(req.method==="DELETE"){await S.delUser(u.handle);await S.del("t/"+u.tokenHash.slice(0,32)+".json").catch(()=>{});return S.json(res,200,{deleted:u.handle})}
  S.json(res,200,{handle:u.handle,createdAt:u.createdAt,lastSync:u.lastSync,buckets:Object.keys(u.buckets||{}).length})};
