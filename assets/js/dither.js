/* Dependency-free Bayer dither canvas kit. Colors are RGB arrays; set to match tokens.css. */
(function(){"use strict";
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
var INK=[205,205,200],SIG=[232,166,74],DIM=[96,96,102];
var BAY=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]].map(function(r){return r.map(function(v){return(v+.5)/16})});
function bay(x,y){return BAY[y&3][x&3]}
function rgba(c,a){return"rgba("+c[0]+","+c[1]+","+c[2]+","+a+")"}
function ease(t){return 1-Math.pow(1-t,3)}
/* size canvas to CSS box at DPR<=2; returns grid of `cell`-px dither cells */
function fit(cv,cell){var r=cv.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height)),d=Math.min(devicePixelRatio||1,2);
  cv.width=Math.round(w*d);cv.height=Math.round(h*d);var c=cv.getContext("2d");c.setTransform(d,0,0,d,0,0);return{c:c,w:w,h:h,cols:Math.ceil(w/cell),rows:Math.ceil(h/cell)}}
/* render a low-res offscreen grid, then upscale with smoothing off => crisp pixels */
function blit(f,o,cell){f.c.imageSmoothingEnabled=false;f.c.clearRect(0,0,f.w,f.h);f.c.drawImage(o,0,0,f.cols*cell,f.rows*cell)}
function grid(cols,rows){var o=document.createElement("canvas");o.width=cols;o.height=rows;return o}
/* rAF loop capped at fps, paused offscreen (IntersectionObserver) and on hidden tab; static frame if reduced motion */
function loop(el,fps,draw){if(RM){draw(0);return}var vis=false,raf=0,last=0,t0=0,iv=1000/fps;
  function tick(n){raf=requestAnimationFrame(tick);if(!vis||document.hidden)return;if(!t0)t0=n;if(n-last<iv)return;last=n;draw((n-t0)/1000)}
  new IntersectionObserver(function(e){vis=e[0].isIntersecting;if(vis&&!raf)raf=requestAnimationFrame(tick)},{rootMargin:"80px"}).observe(el)}
function onReveal(el,fn){if(RM){fn();return}var io=new IntersectionObserver(function(e){if(e[0].isIntersecting){io.disconnect();fn()}},{threshold:.15});io.observe(el)}

/* 1. Hero background field: <canvas class="field" id="heroField"> */
function field(cv){var CELL=4,f,o,oc;function setup(){f=fit(cv,CELL);o=grid(f.cols,f.rows);oc=o.getContext("2d")}
  function draw(t){var C=f.cols,R=f.rows,img=oc.createImageData(C,R),D=img.data,dx=Math.floor(t*3)&3;
    for(var y=0;y<R;y++)for(var x=0;x<C;x++){var nx=x/C,ny=y/R;
      var d=.5+.5*Math.sin(nx*7+t*.35+Math.sin(ny*5-t*.25)*1.6)*Math.cos(ny*4-t*.2);d*=Math.max(0,(nx-.3)/.7)*.42; /* fade toward text side */
      if(d>bay(x+dx,y)){var i=(y*C+x)*4;D[i]=INK[0];D[i+1]=INK[1];D[i+2]=INK[2];D[i+3]=34+90*d}}
    oc.putImageData(img,0,0);blit(f,o,CELL)}
  setup();draw(0);loop(cv,12,draw);addEventListener("resize",function(){setup();draw(0)})}

/* 2. Meter bar that fills on scroll + shimmers on hover: <span class="meter" data-meter="72" data-max="100" data-hl="1"> */
function meter(el){var cv=document.createElement("canvas");cv.className="dither";cv.style.cssText="position:absolute;inset:0;width:100%;height:100%";el.appendChild(cv);
  var v=+el.dataset.meter,mx=+el.dataset.max||100,col=el.dataset.hl==="1"?SIG:INK,CELL=2,p=0,hov=0;
  function draw(ph){var f=fit(cv,CELL),o=grid(f.cols,f.rows),c=o.getContext("2d"),fill=Math.round(f.cols*Math.min(1,v/mx)*p),sh=Math.floor(ph*4)&3;
    for(var y=0;y<f.rows;y++)for(var x=0;x<fill;x++){var d=.55+.4*(x/Math.max(1,fill))+(hov?.08*Math.sin(ph*6+x*.4):0);if(d>bay(x+sh,y)){c.fillStyle=rgba(col,.45+.5*d);c.fillRect(x,y,1,1)}}
    blit(f,o,CELL)}
  if(RM){p=1;draw(0);return}draw(0);
  onReveal(el,function(){var s=performance.now(),dur=700+Math.random()*500;(function a(n){var t=Math.min(1,(n-s)/dur);p=ease(t);draw(t*3);if(t<1)requestAnimationFrame(a)})(s)});
  var host=el.closest(".br,.chip")||el,raf=0;
  host.addEventListener("mouseenter",function(){hov=1;var s=performance.now();(function a(n){draw((n-s)/1000);raf=requestAnimationFrame(a)})(s)});
  host.addEventListener("mouseleave",function(){hov=0;cancelAnimationFrame(raf);draw(0)})}

/* 3. Heatmap cell, value 0..max, drifting threshold offset. null => sparse dim dots */
function cell(cv,v,max,hl,ph){var f=fit(cv,2),o=grid(f.cols,f.rows),c=o.getContext("2d"),ox=Math.floor(ph*2)&3,oy=Math.floor(ph*1.3)&3;
  for(var y=0;y<f.rows;y++)for(var x=0;x<f.cols;x++){
    if(v==null){if(((x+y+ox)&3)===0){c.fillStyle=rgba(DIM,.55);c.fillRect(x,y,1,1)}continue}
    var d=v/max*.92*(.94+.06*Math.sin(ph*1.4+x*.5+y*.3));if(d>bay(x+ox,y+oy)){c.fillStyle=rgba(hl?SIG:INK,.35+.6*d);c.fillRect(x,y,1,1)}}
  blit(f,o,2)}
function heat(root){var cvs=[].slice.call(root.querySelectorAll("canvas[data-v]"));
  function draw(t){cvs.forEach(function(cv,i){var s=cv.dataset.v;cell(cv,s===""?null:+s,+(cv.dataset.max||5),cv.dataset.hl==="1",t+i*.07)})}
  draw(0);loop(root,6,draw)}

/* 4. Radar: values[] in 0..max, Bayer-filled polygon, grows in on reveal then drifts */
function radar(cv,values,max,labels){var k=0;
  function draw(ph){var f=fit(cv,2),W=f.w,H=f.h,cx=W/2,cy=H/2,R=Math.min(W,H)/2-48,n=values.length,ctx=f.c;
    function pt(i,r){var a=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r]}
    ctx.clearRect(0,0,W,H);ctx.strokeStyle="#2a2a2e";ctx.lineWidth=1;
    for(var g=1;g<=5;g++){ctx.beginPath();for(var i=0;i<n;i++){var p=pt(i,R*g/5);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.closePath();ctx.stroke()}
    var o=grid(f.cols,f.rows),oc=o.getContext("2d"),path=new Path2D(),sh=Math.floor(ph*1.5)&3;
    values.forEach(function(v,i){var p=pt(i,R*k*v/max);i?path.lineTo(p[0]/2,p[1]/2):path.moveTo(p[0]/2,p[1]/2)});path.closePath();
    for(var y=0;y<f.rows;y++)for(var x=0;x<f.cols;x++){if(!oc.isPointInPath(path,x+.5,y+.5))continue;var d=.18+.38*Math.hypot(x*2-cx,y*2-cy)/R;if(d>bay(x+sh,y)){oc.fillStyle=rgba(SIG,.75);oc.fillRect(x,y,1,1)}}
    ctx.imageSmoothingEnabled=false;ctx.drawImage(o,0,0,f.cols*2,f.rows*2);ctx.save();ctx.scale(2,2);ctx.strokeStyle=rgba(SIG,.95);ctx.lineWidth=.5;ctx.stroke(path);ctx.restore();
    if(labels){ctx.font='500 11px GM,ui-monospace,monospace';ctx.fillStyle="#a6a6a8";ctx.textBaseline="middle";labels.forEach(function(l,i){var p=pt(i,R+20);ctx.textAlign=Math.abs(p[0]-cx)<8?"center":p[0]<cx?"right":"left";ctx.fillText(l,p[0],p[1])})}}
  if(RM){k=1;draw(0);return}draw(0);
  onReveal(cv,function(){var s=performance.now();(function a(n){var t=Math.min(1,(n-s)/900);k=ease(t);draw(0);if(t<1)requestAnimationFrame(a);else loop(cv,8,draw)})(s)})}

/* 5. Tier band: <canvas class="tband" data-tier="0..4">, denser for higher tiers, top tier in accent */
function band(cv){var i=+cv.dataset.tier,base=[.62,.5,.4,.3,.2][i]||.2,col=i===0?SIG:INK;
  function draw(t){var f=fit(cv,2),o=grid(f.cols,f.rows),c=o.getContext("2d"),sh=Math.floor(t*2)&3;
    for(var y=0;y<f.rows;y++)for(var x=0;x<f.cols;x++){var d=base*(1-x/f.cols*.55)*(.9+.1*Math.sin(t*1.2+y*.4+x*.15));if(d>bay(x+sh,y)){c.fillStyle=rgba(col,.25+.5*d);c.fillRect(x,y,1,1)}}
    blit(f,o,2)}
  draw(0);loop(cv,8,draw)}

/* 6. Section fade-in: only for sections below the fold */
function reveals(){if(RM)return;document.querySelectorAll(".sec,.phead").forEach(function(s){if(s.getBoundingClientRect().top<innerHeight)return;s.classList.add("rv");onReveal(s,function(){s.classList.add("in")})})}

window.Dither={bay:bay,fit:fit,loop:loop,onReveal:onReveal,field:field,meter:meter,heat:heat,radar:radar,band:band,reveals:reveals};
function init(){reveals();var hf=document.getElementById("heroField");if(hf)field(hf);
  document.querySelectorAll("[data-meter]").forEach(meter);document.querySelectorAll("[data-heat]").forEach(heat);document.querySelectorAll("canvas.tband").forEach(band)}
(document.fonts?document.fonts.ready:Promise.resolve()).then(init); /* wait for fonts so canvas labels measure right */
})();
