#!/usr/bin/env node
// TOKENMAXX x SuperCompress link. Reads your SuperCompress API key locally, asks
// SuperCompress for a READ-ONLY usage share token, and sends only that share token
// to TOKENMAXX. Your API key goes to SuperCompress and nowhere else. Nothing is printed.
"use strict";
const fs=require("fs"),os=require("os"),path=require("path");
const HOST=process.env.TOKENMAXX_HOST||"https://tokenmaxx.supercompress.dev";
const SCAPI=process.env.SC_API_BASE||"https://api.supercompress.dev";
const a=process.argv.slice(2),arg=f=>{const i=a.indexOf(f);return i>=0?a[i+1]:null};
const credF=path.join(os.homedir(),".config","tokenmaxx","credentials.json");
let cred={};try{cred=JSON.parse(fs.readFileSync(credF,"utf8"))}catch(_){}
const token=arg("--token")||cred.token,handle=(arg("--handle")||cred.handle||"").toLowerCase();
if(!token){console.error("No TOKENMAXX token. Claim a handle at "+HOST+"/connect first.");process.exit(1)}
if(a.includes("--save")){fs.mkdirSync(path.dirname(credF),{recursive:true,mode:0o700});fs.writeFileSync(credF,JSON.stringify({token,handle},null,2),{mode:0o600});fs.chmodSync(credF,0o600)}
function scKey(){if(process.env.SUPERCOMPRESS_API_KEY)return process.env.SUPERCOMPRESS_API_KEY.trim();
  const dir=process.env.SUPERCOMPRESS_CONFIG_DIR||path.join(os.homedir(),".supercompress");
  try{return String(JSON.parse(fs.readFileSync(path.join(dir,"config.json"),"utf8")).api_key||"").trim()}catch(_){return""}}
(async()=>{
  const st=await fetch(HOST+"/api/link-sc").then(r=>r.json()).catch(()=>({}));
  if(!st.enabled){console.log("SuperCompress account linking is coming soon. Local log sync works today:\n  curl -fsSL "+HOST+"/sync.js | node -");return}
  const key=scKey();if(!key){console.error("No SuperCompress key found. Run: npx -y supercompress-proxy setup");process.exit(1)}
  const m=await fetch(SCAPI+"/api/usage-share",{method:"POST",headers:{"X-API-Key":key}});const mj=await m.json().catch(()=>({}));
  if(!m.ok||!mj.token){console.error("SuperCompress could not mint a share token ("+m.status+").");process.exit(1)}
  const h={"Content-Type":"application/json",Authorization:"Bearer "+token};if(handle)h["X-Tokenmaxx-Handle"]=handle;
  const r=await fetch(HOST+"/api/link-sc",{method:"POST",headers:h,body:JSON.stringify({share:mj.token})});const j=await r.json().catch(()=>({}));
  if(!r.ok){console.error("Link failed: "+(j.error||r.status));process.exit(1)}
  console.log("Linked "+j.handle+" to SuperCompress. Burned and saved boards update from your SuperCompress usage. "+HOST+"/board")})()
  .catch(e=>{console.error("Link failed: "+e.message);process.exit(1)});
