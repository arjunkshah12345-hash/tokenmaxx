const S=require("../lib/store");
const PROVIDERS={"claude-code":"Claude Code",codex:"Codex"};
const HOUR_CAP=300e6,PER_MSG_CAP=2.5e6,MIN_GAP=30e3;
module.exports=async(req,res)=>{if(req.method!=="POST")return S.json(res,405,{error:"POST only"});
  const u=await S.auth(req);if(!u)return S.json(res,401,{error:"Bad or missing token."});
  const now=Date.now();if(u.lastSync&&now-Date.parse(u.lastSync)<MIN_GAP)return S.json(res,429,{error:"Slow down: one sync every 30 seconds."});
  let b;try{b=await S.body(req)}catch(e){return S.json(res,400,{error:"Bad JSON"})}
  const list=Array.isArray(b.buckets)?b.buckets:[];if(list.length>20000)return S.json(res,413,{error:"Too many buckets."});
  const out={},rej={future:0,old:0,cap:0,perMsg:0,bad:0},minH=now-400*864e5,maxH=now+3600e3;
  for(const x of list){const p=String(x.p),h=String(x.h),t=Math.round(+x.t),n=Math.round(+x.n);
    if(!PROVIDERS[p]||!/^\d{4}-\d\d-\d\dT\d\d$/.test(h)||!(t>=0)||!(n>=1)){rej.bad++;continue}
    const ms=Date.parse(h+":00:00Z");if(ms>maxH){rej.future++;continue}if(ms<minH){rej.old++;continue}
    if(t>HOUR_CAP){rej.cap++;continue}if(t/n>PER_MSG_CAP){rej.perMsg++;continue}
    const k=p+"|"+h;out[k]=[t,n]}
  /* replace each synced provider's buckets wholesale: re-syncs are idempotent, never additive */
  const synced=new Set(Object.keys(out).map(k=>k.split("|")[0]));const keep={};
  for(const [k,v] of Object.entries(u.buckets||{}))if(!synced.has(k.split("|")[0]))keep[k]=v;
  u.buckets=Object.assign(keep,out);u.lastSync=new Date(now).toISOString();u.syncs=(u.syncs||0)+1;u.client=String(b.client||"").slice(0,40);
  await S.saveUser(u);
  const tot={};for(const [k,v] of Object.entries(u.buckets)){const p=k.split("|")[0];tot[p]=(tot[p]||0)+v[0]}
  S.json(res,200,{handle:u.handle,accepted:Object.keys(out).length,rejected:rej,totals:tot})};
