/* Shared recorded/live battle viewer. Replay never runs a simulation. */
window.PondBattlePlayer=function(options){
  'use strict';
  var self=this,api=PondPortal,message=options.onError||function(){};
  options.element.innerHTML="<h2>\u0417\u0430\u043f\u0438\u0441\u044c \u0431\u043e\u044f</h2><p id=\"replay-title\">\u0412\u044b\u0431\u0435\u0440\u0438 \u043f\u0440\u043e\u0432\u0435\u0434\u0451\u043d\u043d\u044b\u0439 \u0431\u043e\u0439 \u0438\u0437 \u0441\u043f\u0438\u0441\u043a\u0430 \u043d\u0438\u0436\u0435.</p><canvas id=\"replay-pond\" width=\"400\" height=\"400\" aria-label=\"\u0412\u043e\u0441\u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u0441\u0435\u0440\u0432\u0435\u0440\u043d\u043e\u0433\u043e \u0431\u043e\u044f\"></canvas><div id=\"replay-controls\" hidden><div class=\"round-controls\"><button id=\"replay-play\" type=\"button\">\u0412\u043e\u0441\u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0441\u0442\u0438</button><button id=\"replay-restart\" class=\"secondary\" type=\"button\">\u0421 \u043d\u0430\u0447\u0430\u043b\u0430</button><select id=\"replay-speed\" aria-label=\"\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u0432\u043e\u0441\u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0434\u0435\u043d\u0438\u044f\"><option value=\"0.1\">0,1\u00d7</option><option value=\"0.25\">0,25\u00d7</option><option value=\"0.5\">0,5\u00d7</option><option value=\"1\" selected>1\u00d7</option><option value=\"2\">2\u00d7</option></select></div><label for=\"replay-seek\">\u041f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0432 \u0437\u0430\u043f\u0438\u0441\u0438</label><input id=\"replay-seek\" type=\"range\" min=\"0\" max=\"0\" step=\"0.02\" value=\"0\"><output id=\"replay-time\"></output><p id=\"replay-buffer\" class=\"muted\" role=\"status\" hidden>\u041f\u043e\u0434\u0433\u0440\u0443\u0436\u0430\u0435\u043c \u0437\u0430\u043f\u0438\u0441\u044c\u2026</p><ul id=\"replay-health\"></ul><p class=\"muted\">\u042d\u0442\u043e \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0435 \u043a\u0430\u0434\u0440\u044b \u0440\u0430\u043d\u0435\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u043e\u0433\u043e \u0431\u043e\u044f. \u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0438 \u043f\u0435\u0440\u0435\u043c\u043e\u0442\u043a\u0430 \u043d\u0435 \u0437\u0430\u043f\u0443\u0441\u043a\u0430\u044e\u0442 \u043d\u043e\u0432\u0443\u044e \u0438\u0433\u0440\u0443 \u043d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435.</p></div>";
  var byId=function(id){return options.element.querySelector('#'+id);};
  var speedSelect=byId('replay-speed'),speedHome=speedSelect.parentElement,liveControls=document.createElement('div'),startButton=null,canStart=false;
  liveControls.className='round-controls';liveControls.hidden=true;options.element.insertBefore(liveControls,byId('replay-controls'));
  if(options.onStart){startButton=document.createElement('button');startButton.textContent='Запустить игру';startButton.disabled=true;startButton.onclick=function(){options.onStart();};liveControls.appendChild(startButton);}
  if(options.speedKey){var savedSpeed=localStorage.getItem(options.speedKey);if(Array.from(speedSelect.options).some(function(option){return option.value===savedSpeed;}))speedSelect.value=savedSpeed;}
  speedSelect.onchange=function(){if(options.speedKey)localStorage.setItem(options.speedKey,speedSelect.value);};
  options.element.appendChild(byId('replay-health'));
  options.element.appendChild(byId('replay-buffer'));
  var liveMode=false,liveQueue=[],liveTime=null,liveRunning=false,liveWaiting=false,liveDirty=false,liveId=null,liveSpeed=1,reportedFailure=null;
  var playback=null,time=0,playing=false,lastWall=0,dirty=false,buffering=false,lastControls=0,replayRequest=0,pendingSeek=null,opening=false;
  var canvas=byId('replay-pond'),pondView=new PondRenderer(canvas),colors=PondRenderer.colors;
  function background(){pondView.draw({time:0,avatars:[],missiles:[]});}
  function draw(frame){
    pondView.draw(frame);var health=byId('replay-health');if(health.children.length!==frame.avatars.length){health.replaceChildren();frame.avatars.forEach(function(a,index){var row=document.createElement('li');row.style.borderColor=colors[index%4];health.appendChild(row);});}
    frame.avatars.forEach(function(a,index){
      var label=a.name+' — '+PondRenderer.formatHealth(a.health)+' ХП'+(a.dead?' · выбыл':'')+((a.generation||a.respawns_remaining)?' · респавнов осталось: '+a.respawns_remaining:'')+(a.series_kills!=null?' · потоплений в раунде: '+a.series_kills:a.series_score!=null?' · побед в серии: '+a.series_score:'');if(health.children[index].textContent!==label)health.children[index].textContent=label;
    });
  }
  var loader=null,loaderSequence=0,loaderPending=new Map();
  try{
    loader=new Worker('replay-loader.js');
    loader.onmessage=function(event){var pending=loaderPending.get(event.data.id);if(!pending)return;loaderPending.delete(event.data.id);if(event.data.error)pending.reject(Error(event.data.error));else pending.resolve(pending.live?event.data.payload:event.data.frames);};
    loader.onerror=function(){if(loader)loader.terminate();loader=null;loaderPending.forEach(function(pending){api.request(pending.url).then(function(data){pending.resolve(pending.live?data:data.frames);},pending.reject);});loaderPending.clear();};
  }catch(error){loader=null;}
  function loadFrames(url){if(!loader)return api.request(url).then(function(data){if(!Array.isArray(data.frames)||!data.frames.length)throw Error('Фрагмент записи не содержит кадров.');return data.frames;});return new Promise(function(resolve,reject){var id=++loaderSequence;loaderPending.set(id,{resolve:resolve,reject:reject,url:url});loader.postMessage({id:id,url:url});});}
  function trim(record){record.cache.forEach(function(entry,index){if(record.cache.size>8&&Math.abs(index-record.cursor)>2&&entry.frames)record.cache.delete(index);});}
  function chunk(record,index){
    if(index<0||index>=record.chunks.length)return null;
    var entry=record.cache.get(index);if(entry&&entry.error&&Date.now()>=entry.retryAt){record.cache.delete(index);entry=null;}if(entry)return entry;
    entry={frames:null,error:null};record.cache.set(index,entry);
    entry.promise=loadFrames(options.base+record.id+'/replay/chunks/'+record.chunks[index].chunk_index).then(function(frames){entry.frames=frames;trim(record);if(playback===record)dirty=true;},function(error){entry.error=error;entry.retryAt=Date.now()+3000;});
    return entry;
  }
  function warm(record,index){record.cursor=index;for(var i=index-1;i<=index+2;i++)chunk(record,i);trim(record);}
  function lowerBound(items,at,key){var low=0,high=items.length;while(low<high){var middle=(low+high)>>1;if(items[middle][key]<at)low=middle+1;else high=middle;}return Math.min(low,items.length-1);}
  function sample(record,at){
    var section=lowerBound(record.chunks,at,'last_time');if(section!==record.cursor)warm(record,section);
    var entry=chunk(record,section);if(entry.error)throw entry.error;if(!entry.frames)return null;
    var frames=entry.frames,index=lowerBound(frames,at,'time'),right=frames[index],left=index?frames[index-1]:right;
    if(!index&&section>0&&at<right.time){var previous=chunk(record,section-1);if(previous.error)throw previous.error;if(!previous.frames)return null;left=previous.frames[previous.frames.length-1];}
    var fraction=right.time>left.time?Math.max(0,Math.min(1,(at-left.time)/(right.time-left.time))):1;
    return PondRenderer.interpolate(left,right,fraction);
  }
  function setBuffering(value){if(buffering===value)return;buffering=value;byId('replay-buffer').hidden=!value;}
  async function openReplay(id){
    speedHome.appendChild(speedSelect);liveControls.hidden=true;speedSelect.disabled=false;
    liveMode=false;var request=++replayRequest;playing=false;dirty=false;pendingSeek=null;opening=true;setBuffering(true);byId('replay-title').textContent='Загружаем запись боя…';byId('replay-play').disabled=true;
    try{
      var record=await api.request(options.base+id+'/replay');if(request!==replayRequest)return;if(!record.chunks.length)throw Error('Запись боя не содержит кадров.');
      record.cache=new Map();record.cursor=0;warm(record,0);var first=chunk(record,0);await first.promise;if(request!==replayRequest)return;if(first.error)throw first.error;
      playback=record;pondView.reset();time=0;lastWall=0;dirty=true;lastControls=0;
      byId('replay-title').textContent=record.title+(record.visuals?'':' · Старая запись: события радара и полёта снарядов не сохранялись.');byId('replay-controls').hidden=false;byId('replay-seek').max=String(record.duration);byId('replay-play').textContent='Воспроизвести';
      byId('replay-pond').scrollIntoView({behavior:'smooth',block:'center'});
    }catch(error){if(request===replayRequest){byId('replay-title').textContent=playback?playback.title:'Не удалось загрузить запись.';throw error;}}
    finally{if(request===replayRequest){opening=false;setBuffering(false);byId('replay-play').disabled=false;}}
  }
  byId('replay-play').onclick=function(){if(!playback)return;if(pendingSeek)time=pendingSeek.at;if(time>=playback.duration)time=0;pendingSeek=null;playing=!playing;dirty=true;lastWall=0;this.textContent=playing?'Пауза':'Воспроизвести';if(!playing&&options.onPause)options.onPause();};
  byId('replay-restart').onclick=function(){pendingSeek=null;time=0;dirty=true;lastWall=0;};
  byId('replay-seek').oninput=function(){pendingSeek={at:Number(this.value),resume:pendingSeek?pendingSeek.resume:playing,after:performance.now()+100};playing=false;byId('replay-play').textContent='Воспроизвести';};
  byId('replay-seek').onchange=function(){if(pendingSeek)pendingSeek.after=0;};
  function tick(now){
    var elapsed=lastWall?Math.max(0,now-lastWall)/1000:0;lastWall=now;
    if(pendingSeek&&now>=pendingSeek.after){time=pendingSeek.at;playing=pendingSeek.resume;pendingSeek=null;dirty=true;elapsed=0;byId('replay-play').textContent=playing?'Пауза':'Воспроизвести';}
    if(liveMode)drawLive(elapsed);
    if(!liveMode&&playback&&!opening&&!pendingSeek&&(playing||dirty||buffering)){
      var record=playback,at=playing?Math.min(record.duration,time+elapsed*Number(byId('replay-speed').value)):time;
      try{
        var frame=sample(record,at);setBuffering(!frame);
        if(frame){time=at;draw(frame);dirty=false;if(now-lastControls>=100||!playing||time>=record.duration){byId('replay-seek').value=String(time);byId('replay-time').textContent=time.toFixed(1)+' / '+record.duration.toFixed(1)+' с';lastControls=now;}if(time>=record.duration){playing=false;byId('replay-play').textContent='Воспроизвести';}}
      }catch(error){playing=false;dirty=false;setBuffering(false);byId('replay-play').textContent='Воспроизвести';message(error.message);}
    }
    requestAnimationFrame(tick);
  }
  background();requestAnimationFrame(tick);

  this.open=openReplay;
  this.speed=function(){return Number(speedSelect.value);};
  this.setStartEnabled=function(enabled){canStart=enabled;if(startButton)startButton.disabled=!enabled||liveRunning;};
  this.fetchLive=function(url){if(!loader)return api.request(url);return new Promise(function(resolve,reject){var id=++loaderSequence;loaderPending.set(id,{resolve:resolve,reject:reject,url:url,live:true});loader.postMessage({id:id,url:url,live:true});});};
  this.busy=function(){return playing||!!pendingSeek||opening||(liveMode&&(liveRunning||liveTime!==null&&liveQueue.length&&liveTime<liveQueue[liveQueue.length-1].time));};
  function drawLive(elapsed){
    if(!liveQueue.length)return;
    var first=liveQueue[0],last=liveQueue[liveQueue.length-1];
    if(liveTime===null||liveTime<first.time){liveTime=Math.max(first.time,last.time-.5*liveSpeed);liveDirty=true;}
    if(liveWaiting&&liveRunning&&last.time-liveTime<.3*liveSpeed){setBuffering(true);return;}
    liveWaiting=false;
    var at=Math.min(last.time,liveTime+elapsed*liveSpeed);
    if(at===last.time&&liveRunning)liveWaiting=true;
    setBuffering(liveWaiting);
    if(at===liveTime&&!liveDirty)return;
    var index=lowerBound(liveQueue,at,'time'),right=liveQueue[index],left=index?liveQueue[index-1]:right;
    draw(PondRenderer.interpolate(left,right,right.time>left.time?(at-left.time)/(right.time-left.time):1));liveTime=at;liveDirty=false;
  }
  this.live=function(match){
    if(!match)return;
    if(liveId!==match.id){liveQueue=[];liveTime=null;liveId=match.id;liveWaiting=false;if(liveMode){pondView.reset();if(match.status==='running'){speedSelect.value=String(match.playback_speed||1);if(options.speedKey)localStorage.setItem(options.speedKey,speedSelect.value);}}}
    liveRunning=match.status==='running';
    liveSpeed=match.playback_speed||1;
    if(liveMode)speedSelect.disabled=liveRunning;
    if(startButton)startButton.disabled=!canStart||liveRunning;
    var frames=match.frames&&match.frames.length?match.frames:match.snapshot?[match.snapshot]:[];
    frames.forEach(function(frame){if(!liveQueue.length||frame.time>liveQueue[liveQueue.length-1].time){liveQueue.push(frame);liveDirty=true;}});
    if(liveQueue.length>150)liveQueue.splice(0,liveQueue.length-150);
    var frame=liveQueue[liveQueue.length-1];if(!frame)return;
    var failed=match.status==='error'||match.status==='interrupted';
    if(liveMode)byId('replay-title').textContent=match.title+' · '+frame.time.toFixed(1)+' с'+(match.status==='running'?' · Прямой показ':match.status==='stopped'?' · Остановлен администратором':failed?' · Бой прерван':' · Бой завершён');
    if(liveMode&&failed&&reportedFailure!==match.id){reportedFailure=match.id;message(match.failure||'Бой прерван из-за ошибки сервера. Завершённые поединки сохранены; серию можно продолжить из статистики.');}
  };
  this.followLive=function(){++replayRequest;liveMode=true;liveTime=null;liveDirty=true;opening=false;playing=false;pendingSeek=null;liveControls.appendChild(speedSelect);liveControls.hidden=false;speedSelect.disabled=liveRunning;setBuffering(false);pondView.reset();byId('replay-controls').hidden=true;byId('replay-title').textContent='Ожидание раунда';};
  this.clearLive=function(){liveQueue=[];liveTime=null;liveId=null;liveRunning=false;liveWaiting=false;if(liveMode){speedSelect.disabled=false;setBuffering(false);background();byId('replay-health').replaceChildren();byId('replay-title').textContent='Ожидание раунда';}};
  document.addEventListener('visibilitychange',function(){lastWall=0;});
};
