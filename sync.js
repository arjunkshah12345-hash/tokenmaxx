#!/usr/bin/env node
/* TOKENMAXX sync. Reads local Claude Code and Codex usage logs and posts hourly token totals.
   Only numbers leave your machine: provider, UTC hour, token count, message count. No prompts, no code, no paths. */
"use strict";
const fs=require("fs"),os=require("os"),path=require("path"),https=require("https");
const API=process.env.TOKENMAXX_API||"https://tokenmaxx.supercompress.dev";
const CFG=path.join(os.homedir(),".config","tokenmaxx"),CF=path.join(CFG,"credentials.json");
const argv=process.argv.slice(2),arg=k=>{const i=argv.indexOf(k);return i>-1?argv[i+1]:null},has=k=>argv.includes(k);
let cred=null;try{cred=JSON.parse(fs.readFileSync(CF,"utf8"))}catch(e){}
const token=arg("--token")||process.env.TOKENMAXX_TOKEN||(cred&&cred.token),handle=arg("--handle")||(cred&&cred.handle)||"";
if(!token){console.error("No token. Join at "+API+"/connect and run the command it shows.");process.exit(1)}
if(has("--save")||!cred){fs.mkdirSync(CFG,{recursive:true,mode:0o700});fs.writeFileSync(CF,JSON.stringify({token,handle}),{mode:0o600});fs.chmodSync(CF,0o600);console.log("Saved credentials to "+CF+" (chmod 600).")}
function walk(d,out){let es;try{es=fs.readdirSync(d,{withFileTypes:true})}catch(e){return out}for(const e of es){const p=path.join(d,e.name);if(e.isDirectory())walk(p,out);else if(e.name.endsWith(".jsonl"))out.push(p)}return out}
const B=new Map();function add(p,ts,t){if(!(t>0))return;const d=new Date(ts);if(isNaN(d))return;const k=p+"|"+d.toISOString().slice(0,13);const v=B.get(k)||[0,0];v[0]+=t;v[1]+=1;B.set(k,v)}
function lines(f,fn){let s;try{s=fs.readFileSync(f,"utf8")}catch(e){return}for(const l of s.split("\n")){if(!l||l.indexOf("usage")<0)continue;let j;try{j=JSON.parse(l)}catch(e){continue}fn(j)}}
/* Claude Code: assistant messages carry message.usage; dedupe on message.id + requestId (logs repeat lines) */
const H=os.homedir(),seen=new Set();
const cdirs=[process.env.CLAUDE_CONFIG_DIR&&path.join(process.env.CLAUDE_CONFIG_DIR,"projects"),path.join(H,".claude","projects"),path.join(H,".config","claude","projects")].filter(Boolean);
for(const d of [...new Set(cdirs)])for(const f of walk(d,[]))lines(f,j=>{const m=j.message,u=m&&m.usage;if(!u||!j.timestamp)return;
  const id=(m.id||"")+":"+(j.requestId||"");if(m.id){if(seen.has(id))return;seen.add(id)}
  add("claude-code",j.timestamp,(u.input_tokens||0)+(u.output_tokens||0)+(u.cache_creation_input_tokens||0)+(u.cache_read_input_tokens||0))});
/* Codex: token_count events carry a cumulative total per session; count only positive deltas */
const xdirs=[path.join(process.env.CODEX_HOME||path.join(H,".codex"),"sessions"),path.join(process.env.CODEX_HOME||path.join(H,".codex"),"archived_sessions")];
const sess=new Set();
for(const d of xdirs)for(const f of walk(d,[])){const base=path.basename(f);if(sess.has(base))continue;sess.add(base);let prev=0;
  lines(f,j=>{const p=j.payload;if(!p||p.type!=="token_count"||!p.info||!p.info.total_token_usage)return;const tot=p.info.total_token_usage.total_tokens||0;if(tot>prev){add("codex",j.timestamp,tot-prev);prev=tot}})}
const buckets=[...B].map(([k,[t,n]])=>{const [p,h]=k.split("|");return{p,h,t,n}});
const sum={};for(const b of buckets)sum[b.p]=(sum[b.p]||0)+b.t;
const fmt=n=>n>=1e9?(n/1e9).toFixed(2)+"B":n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(n);
console.log("Found: "+(Object.entries(sum).map(([p,t])=>p+" "+fmt(t)).join(", ")||"no Claude Code or Codex usage logs"));
if(has("--dry-run"))process.exit(0);
const data=JSON.stringify({client:"sync.js/1",buckets}),u=new URL("/api/sync",API);
const req=https.request(u,{method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(data),"Authorization":"Bearer "+token,"X-Tokenmaxx-Handle":handle}},r=>{let s="";r.on("data",c=>s+=c);r.on("end",()=>{let j={};try{j=JSON.parse(s)}catch(e){}
  if(r.statusCode!==200){console.error("Sync failed ("+r.statusCode+"): "+(j.error||s.slice(0,200)));process.exit(1)}
  if(!handle&&j.handle){fs.writeFileSync(CF,JSON.stringify({token,handle:j.handle}),{mode:0o600})}
  const rj=Object.entries(j.rejected||{}).filter(([,v])=>v).map(([k,v])=>k+" "+v).join(", ");
  console.log("Synced as "+j.handle+": "+j.accepted+" hourly buckets accepted"+(rj?" (rejected: "+rj+")":"")+". Board: "+API+"/board")})});
req.on("error",e=>{console.error("Sync failed: "+e.message);process.exit(1)});req.end(data);
