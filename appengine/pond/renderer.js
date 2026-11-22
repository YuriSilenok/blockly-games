/* Shared Pond display: the retained Tutor sprites, geometry and visual effects. */
(function(){
  'use strict';
  var spriteUrl=new URL('sprites.png',document.currentScript.src).href;
  var colors=['#ff8b00','#c90015','#166c0b','#223068'];
  var healthFormat=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3});
  var mergedEvents={left:null,right:null},scanTextures=new Map();
  function coordinate(value){return value*3.65+17.5;}
  function radians(value){return value*Math.PI/180;}
  function color(index){return colors[((index||0)%colors.length+colors.length)%colors.length];}
  function merge(left,right,key){if(mergedEvents.left!==left||mergedEvents.right!==right)mergedEvents={left:left,right:right};if(mergedEvents[key])return mergedEvents[key];var values=new Map();(left[key]||[]).concat(right[key]||[]).forEach(function(event){values.set(event.id,event);});mergedEvents[key]=Array.from(values.values());return mergedEvents[key];}
  function Renderer(canvas,options){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.sprites=options&&options.sprites||new Image();this.scans=[];this.impacts=[];this.sequence=0;this.lastFrame=null;this.lastTime=-Infinity;
    canvas.classList.add('pond-canvas');var self=this;
    this.sprites.addEventListener('load',function(){if(self.lastFrame)self.draw(self.lastFrame);});
    if(!(options&&options.sprites))this.sprites.src=spriteUrl;
  }
  Renderer.prototype.reset=function(){this.scans=[];this.impacts=[];this.lastFrame=null;this.lastTime=-Infinity;};
  Renderer.prototype.draw=function(frame){
    frame=frame||{time:0,avatars:[],missiles:[]};var self=this,now=frame.time||0;
    if(now<this.lastTime)this.reset();
    if(frame!==this.lastFrame)(frame.events||[]).forEach(function(event){
      if(event.type==='SCAN')self.scans.push(Object.assign({id:'native-'+(++self.sequence),time:now},event));
      if(event.type==='BOOM')self.impacts.push({x:event.x,y:event.y,time:now});
    });
    this.scans=this.scans.filter(function(scan){return now-scan.time<=.16;});this.impacts=this.impacts.filter(function(impact){return now-impact.time<=.15;});this.lastFrame=frame;this.lastTime=now;
    var ctx=this.ctx;ctx.save();ctx.setTransform(this.canvas.width/400,0,0,this.canvas.height/400,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#527dbf';ctx.fillRect(0,0,400,400);
    (frame.avatars||[]).map(function(a,index){return {avatar:a,index:index};}).sort(function(a,b){return Number(b.avatar.dead)-Number(a.avatar.dead)||(a.avatar.dead?a.index-b.index:b.index-a.index);}).forEach(function(item){self.duck(item.avatar,item.index);});
    if(frame.replay_version>=2||frame.visual_version>=2){
      (frame.flights||[]).forEach(function(flight){
        if(now<flight.startTime)return;var duration=flight.endTime-flight.startTime;
        if(duration>0&&now<flight.endTime)self.missile(flight.startX,flight.startY,flight.endX,flight.endY,(now-flight.startTime)/duration,flight.avatar);
        else if(now-flight.endTime<=.15)self.impact(flight.endX,flight.endY,now-flight.endTime);
      });
    }else(frame.missiles||[]).forEach(function(m){
      if(Number.isFinite(m.startX)&&Number.isFinite(m.endX)&&m.range>0)self.missile(m.startX,m.startY,m.endX,m.endY,m.progress/m.range,m.avatar);
      else{ctx.fillStyle=color(m.avatar);ctx.beginPath();ctx.arc(coordinate(m.x),coordinate(100-m.y),5,0,Math.PI*2);ctx.fill();}
    });
    var scans={};(frame.scans||[]).concat(this.scans).forEach(function(scan){var age=now-scan.time;if(age<0||age>.16)return;if(!scans[scan.avatar])scans[scan.avatar]=[];scans[scan.avatar].push(scan);});
    Object.keys(scans).forEach(function(avatar){scans[avatar].slice(-4).forEach(function(scan){self.scan(scan,now);});});
    this.impacts.forEach(function(impact){self.impact(impact.x,impact.y,now-impact.time);});ctx.restore();
  };
  Renderer.prototype.duck=function(a,index){
    var ctx=this.ctx,sprites=this.sprites,facing=((a.facing||0)%360+360)%360,row=(a.color==null?index:a.color)%4*35;
    ctx.save();ctx.translate(coordinate(a.x),coordinate(100-a.y));if(a.dead)ctx.globalAlpha=.25;
    if(sprites.complete&&sprites.naturalWidth){
      if(a.speed>0){ctx.save();ctx.rotate(radians(-(a.degree||0)));ctx.drawImage(sprites,455,a.speed>50?0:a.speed>25?35:70,35,35,-45.5,-17.5,35,35);ctx.restore();}
      ctx.drawImage(sprites,0,row,35,35,-17.5,-17.5,35,35);ctx.translate(Math.cos(radians(facing))*12,-Math.sin(radians(facing))*12-2);
      var head=(14-Math.round(facing/360*12))%12+1,offset=facing%30;if(offset>=15)offset-=30;ctx.rotate(radians(-offset/1.5));ctx.drawImage(sprites,head*35,row,35,35,-15.5,-15.5,35,35);
    }else{ctx.fillStyle=color(index);ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();}ctx.restore();
  };
  Renderer.prototype.missile=function(startX,startY,endX,endY,progress,avatar){
    progress=Math.max(0,Math.min(1,progress));var ctx=this.ctx,range=Math.hypot(endX-startX,endY-startY),height=4*range*.15*progress*(1-progress);
    var x=coordinate(startX+(endX-startX)*progress),ground=coordinate(100-startY-(endY-startY)*progress);
    ctx.save();ctx.beginPath();ctx.arc(x,ground,Math.max(0,1-height/10)*5,0,Math.PI*2);ctx.fillStyle='rgba(128,128,128,'+Math.max(0,1-height/10)+')';ctx.fill();
    ctx.beginPath();ctx.arc(x,ground-height*3.65,5,0,Math.PI*2);ctx.fillStyle=color(avatar);ctx.fill();ctx.restore();
  };
  Renderer.prototype.scan=function(scan,now){
    var ctx=this.ctx,half=Math.max(.5,scan.resolution/2),texture=scanTextures.get(half);
    if(!texture){texture=document.createElement('canvas');texture.width=texture.height=400;var pen=texture.getContext('2d');pen.beginPath();pen.moveTo(200,200);pen.arc(200,200,200,-radians(half),radians(half));pen.closePath();var gradient=pen.createRadialGradient(200,200,17.5,200,200,200);gradient.addColorStop(0,'rgba(255,255,255,.3)');gradient.addColorStop(1,'rgba(255,255,255,0)');pen.fillStyle=gradient;pen.fill();if(scanTextures.size>=32)scanTextures.delete(scanTextures.keys().next().value);scanTextures.set(half,texture);}
    ctx.save();ctx.globalAlpha=Math.max(0,1-(now-scan.time)/.16);ctx.translate(coordinate(scan.x),coordinate(100-scan.y));ctx.rotate(-radians(scan.degree));ctx.drawImage(texture,-200,-200);ctx.restore();
  };
  Renderer.prototype.impact=function(x,y,age){var ctx=this.ctx;ctx.save();ctx.lineWidth=5;ctx.strokeStyle='rgba(255,255,255,'+Math.max(0,1-age/.15)+')';ctx.beginPath();ctx.arc(coordinate(x),coordinate(100-y),1+Math.max(0,age)/.15*10,0,Math.PI*2);ctx.stroke();ctx.restore();};
  Renderer.fromNative=function(avatars,missiles,events,keys){
    var now=performance.now()/1000;
    return {time:now,avatars:avatars.map(function(a,index){var p=a[keys.position];return {name:a.name,x:p.x,y:p.y,facing:a.facing,speed:a.speed,degree:a[keys.degree],dead:a[keys.dead],health:Math.max(0,100-a[keys.damage]),color:a[keys.color]==null?index:a[keys.color]};}),
      missiles:missiles.map(function(m){var start=m[keys.start],end=m[keys.end],owner=m[keys.owner],progress=Math.min(1,m.progress/Math.max(1,m.range));return {id:m.id,x:start.x+(end.x-start.x)*progress,y:start.y+(end.y-start.y)*progress,startX:start.x,startY:start.y,endX:end.x,endY:end.y,range:m.range,progress:m.progress,avatar:owner?owner[keys.color]:0};}),
      events:events.map(function(e){var index=avatars.indexOf(e.avatar),p=e.avatar&&e.avatar[keys.position];return {type:e.type,avatar:index,degree:e.degree,resolution:e.resolution,x:e.x==null&&p?p.x:e.x,y:e.y==null&&p?p.y:e.y};})};
  };
  Renderer.interpolate=function(left,right,fraction){
    if(!left||fraction>=1)return right;fraction=Math.max(0,fraction);
    return Object.assign({},left,{time:left.time+(right.time-left.time)*fraction,scans:merge(left,right,'scans'),flights:merge(left,right,'flights'),avatars:left.avatars.map(function(a,index){var next=right.avatars[index]||a;if(a.generation!==next.generation)return a;var turn=(((next.facing||0)-(a.facing||0)+540)%360)-180;return Object.assign({},a,{x:a.x+(next.x-a.x)*fraction,y:a.y+(next.y-a.y)*fraction,facing:(a.facing||0)+turn*fraction});}),missiles:(left.missiles||[]).map(function(m){var next=(right.missiles||[]).find(function(n){return n.id===m.id;});return next?Object.assign({},m,{x:m.x+(next.x-m.x)*fraction,y:m.y+(next.y-m.y)*fraction,progress:m.progress==null?undefined:m.progress+(next.progress-m.progress)*fraction}):m;})});
  };
  window.PondRenderer=Renderer;
  Renderer.colors=colors;
  Renderer.formatHealth=function(value){return value>0&&value<.001?'<0,001':healthFormat.format(value);};
})();
