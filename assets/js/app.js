(function(){"use strict";
var $=function(s){return document.querySelector(s)};
function k(e){return e>=1e9?(e/1e9).toFixed(2)+"B":e>=1e6?(e/1e6).toFixed(2)+"M":e>=1e3?(e/1e3).toFixed(1)+"K":Math.round(e).toLocaleString("en-US")}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function tm(d){try{return new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}catch(e){return""}}
async function api(u,o){var r=await fetch(u,Object.assign({cache:"no-store"},o||{}));var j={};try{j=await r.json()}catch(e){}return{ok:r.ok,status:r.status,j:j}}
var mb=$(".menu"),nav=$("#nav");if(mb)mb.addEventListener("click",function(){var o=nav.classList.toggle("open");mb.setAttribute("aria-expanded",o)});
function wire(root){root.querySelectorAll("[data-meter]").forEach(function(m){if(window.Dither&&!m.dataset.w){m.dataset.w=1;Dither.meter(m)}})}
function empty(el,txt){el.innerHTML='<p class="mono" style="color:var(--tx3);font-size:13px">'+txt+' <a href="https://supercompress.dev" rel="noopener">Install SuperCompress</a></p>'}
function bars(root,rows,txt){rows=rows.filter(function(r){return r.tokens>0});if(!rows.length)return empty(root,txt);var mx=rows[0].tokens;
  root.innerHTML=rows.slice(0,8).map(function(r,i){return'<div class="br"><span class="bl">'+esc(r.handle)+'</span><span class="meter bm" data-meter="'+r.tokens+'" data-max="'+mx+'" data-hl="'+(i===0?1:0)+'"></span><span class="bv num">'+k(r.tokens)+'</span></div>'}).join("");
  root.setAttribute("aria-label","Top players by tokens: "+rows.slice(0,8).map(function(r){return r.handle+" "+k(r.tokens)}).join(", "));
  (document.fonts?document.fonts.ready:Promise.resolve()).then(function(){wire(root)})}
if($("#bRows")){var T={hourly:"This hour",daily:"Today",weekly:"This week",monthly:"This month"},P="daily",M="passed";
  function load(p){P=p=p||P;document.querySelectorAll(".tabs [data-p]").forEach(function(b){b.setAttribute("aria-selected",b.dataset.p===p)});document.querySelectorAll(".tabs [data-m]").forEach(function(b){b.setAttribute("aria-selected",b.dataset.m===M)});
    if($("#bTitle"))$("#bTitle").textContent=T[p]+(M==="compressed"?" · compressed":" · passed");
    api("/api/leaderboard?period="+p+"&metric="+M).then(function(x){var s=x.j,r=s.rows||[];var ET="No SuperCompress players in this window yet.";
      if($("#bChart"))bars($("#bChart"),r,ET);
      $("#bRows").innerHTML=r.map(function(e){return'<tr><td class="rk">'+e.rank+'</td><td>'+esc(e.handle)+'</td><td class="r mono num"'+(M==="passed"?'':' style="color:var(--tx2)"')+'>'+k(e.passed)+'</td><td class="r mono num"'+(M==="compressed"?'':' style="color:var(--tx2)"')+'>'+k(e.compressed)+'</td></tr>'}).join("")||'<tr><td colspan="4" class="rk">No players in this window yet.</td></tr>';
      if($("#tick"))$("#tick").textContent="UTC windows · updated "+tm(s.updatedAt)+(s.players?" · "+s.players+" players":"")}).catch(function(){if($("#bChart"))empty($("#bChart"),"Board unavailable.");$("#bRows").innerHTML='<tr><td colspan="4" class="rk">Board unavailable.</td></tr>'})}
  document.querySelectorAll(".tabs [data-p]").forEach(function(b){b.addEventListener("click",function(){load(b.dataset.p)})});
  document.querySelectorAll(".tabs [data-m]").forEach(function(b){b.addEventListener("click",function(){M=b.dataset.m;load()})});
  load("daily")}
})();
