const {put,list,del}=require("@vercel/blob");const crypto=require("crypto");
const HANDLE=/^[a-z0-9_]{2,20}$/;
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const path=h=>`u/${h}.json`;
async function all(){const out=[];let cursor;do{const r=await list({prefix:"u/",cursor,limit:1000});out.push(...r.blobs);cursor=r.cursor}while(cursor);return out}
async function readBlob(b){const r=await fetch(b.url+"?v="+new Date(b.uploadedAt).getTime(),{cache:"no-store"});if(!r.ok)return null;return r.json()}
async function getUser(h){const r=await list({prefix:path(h),limit:1});const b=r.blobs.find(x=>x.pathname===path(h));return b?readBlob(b):null}
async function saveUser(u){await put(path(u.handle),JSON.stringify(u),{access:"public",addRandomSuffix:false,allowOverwrite:true,contentType:"application/json",cacheControlMaxAge:60})}
async function delUser(h){await del(path(h))}
async function auth(req){const m=/^Bearer\s+(tmx_[a-f0-9]{40})$/.exec(req.headers.authorization||"");if(!m)return null;
  const tok=m[1],h=(req.headers["x-tokenmaxx-handle"]||"").toLowerCase();
  if(h){const u=await getUser(h);return u&&crypto.timingSafeEqual(Buffer.from(u.tokenHash),Buffer.from(sha(tok)))?u:null}
  const idx=await list({prefix:"t/"+sha(tok).slice(0,32),limit:1});if(!idx.blobs[0])return null;const ref=await readBlob(idx.blobs[0]);
  const u=ref&&await getUser(ref.handle);return u&&u.tokenHash===sha(tok)?u:null}
async function body(req){if(req.body&&typeof req.body==="object")return req.body;let s="";for await(const c of req)s+=c;if(s.length>2e6)throw new Error("too big");return s?JSON.parse(s):{}}
function json(res,code,o){res.statusCode=code;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(o))}
module.exports={HANDLE,sha,all,readBlob,getUser,saveUser,delUser,auth,body,json,put,del,list};
