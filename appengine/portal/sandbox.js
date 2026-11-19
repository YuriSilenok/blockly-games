(async function(){
  'use strict';
  var api=PondPortal,byId=function(id){return document.getElementById(id);},state=null,history=new Map(),older=null,historyInitialized=false,loading=false;
  function message(text){byId('status').textContent=text;byId('status').hidden=!text;}
  await api.ready;
  if(!api.user){location.replace('account.html?next=%2Fportal%2Fsandbox.html');return;}
  if(!api.user.unlocked&&api.user.role!=='admin'){location.replace('account.html?training_required=1');return;}
  byId('sandbox-panel').hidden=false;
  function table(target,columns,rows){
    target.replaceChildren();var grid=document.createElement('table'),head=grid.insertRow();columns.forEach(function(name){var th=document.createElement('th');th.textContent=name;head.appendChild(th);});
    rows.forEach(function(item){var row=grid.insertRow();if(item.mine)row.className='my-team';item.cells.forEach(function(value){row.insertCell().textContent=value;});});target.appendChild(grid);
    if(!rows.length){var empty=document.createElement('p');empty.className='empty-state';empty.textContent='Пока нет записей.';target.appendChild(empty);}
  }
  function position(){
    if(!state)return;var algorithmId=Number(byId('sandbox-algorithm').value),entry=state.standings.find(function(e){return e.algorithm_id===algorithmId;});
    byId('my-position').textContent=!algorithmId?'Выбери алгоритм для отправки.':entry?'Текущее место алгоритма: '+entry.position:'Этот алгоритм ещё не вошёл в таблицу.';
    var pending=state.submissions.some(function(s){return s.algorithm_id===algorithmId&&['queued','running'].includes(s.status);});
    if(pending)byId('my-position').textContent+=' Новая отправка ожидает результата.';
  }
  function render(){
    table(byId('sandbox-standings'),['Место','Алгоритм','Автор'],state.standings.map(function(e){return {mine:e.user_id===api.user.id,cells:[e.position,e.name,e.author]};}));
    var labels={queued:'В очереди',running:'Идут бои',done:'Проверка завершена',error:'Ошибка',cancelled:'Отменено'};
    table(byId('sandbox-submissions'),['Алгоритм','Статус','Результат отправки'],state.submissions.map(function(s){var result=s.result;return {cells:[s.name,labels[s.status]||s.status,result?(result.message+(result.position?' Место на момент проверки: '+result.position+'.':'')+(result.accepted===false&&result.candidate_position?' Новая версия: '+result.candidate_position+'.':'')):'—']};}));
    byId('queue').textContent=(state.active?'Сервер проверяет отправку №'+state.active+'. ':'')+'В очереди песочницы: '+state.waiting+'. Бои выполняются последовательно.';
    position();renderFights();
  }
  function renderFights(){
    var target=byId('sandbox-fights');target.replaceChildren();
    Array.from(history.values()).sort(function(a,b){return b.id-a.id;}).forEach(function(fight){
      var row=document.createElement('div');row.className='sandbox-fight';var info=document.createElement('div'),title=document.createElement('strong');title.textContent=fight.title;info.appendChild(title);
      var detail=document.createElement('small');detail.textContent=new Date(fight.created*1000).toLocaleString('ru-RU')+' · победил: '+(fight.winner===0?fight.candidate:fight.opponent_name);info.appendChild(detail);row.appendChild(info);
      var button=document.createElement('button');button.className='secondary';button.textContent='Смотреть запись';button.onclick=function(){openReplay(fight.id).catch(function(error){message(error.message);});};row.appendChild(button);target.appendChild(row);
    });
    if(!history.size){var empty=document.createElement('p');empty.className='empty-state';empty.textContent='Здесь появятся записи серверных боёв твоих алгоритмов.';target.appendChild(empty);}
    byId('older-fights').hidden=!older;
  }
  async function library(){
    var data=await api.request('/api/arena/algorithms'),select=byId('sandbox-algorithm'),old=select.value;select.replaceChildren();select.add(new Option('Выбери сохранённый алгоритм',''));
    data.owned.forEach(function(a){select.add(new Option(a.name,a.id));});if(old)select.value=old;if(!select.value&&data.owned.length)select.value=String(data.owned[0].id);
  }
  async function refresh(){
    if(loading)return;loading=true;
    try{state=await api.request('/api/sandbox');state.fights.forEach(function(f){history.set(f.id,f);});if(!historyInitialized){older=state.next_fight;historyInitialized=true;}if(!playing)render();}finally{loading=false;}
  }
  byId('sandbox-algorithm').onchange=position;
  byId('older-fights').onclick=async function(){var button=this;button.disabled=true;try{var data=await api.request('/api/sandbox?before_match_id='+older);data.fights.forEach(function(f){history.set(f.id,f);});older=data.next_fight;renderFights();}catch(error){message(error.message);}finally{button.disabled=false;}};
  var playback=null,time=0,playing=false,lastWall=0,dirty=false,buffering=false,lastControls=0,replayRequest=0,pendingSeek=null,opening=false;
  var canvas=byId('replay-pond'),pondView=new PondRenderer(canvas),colors=PondRenderer.colors;
  function background(){pondView.draw({time:0,avatars:[],missiles:[]});}
  function draw(frame){
    pondView.draw(frame);var health=byId('replay-health');if(health.children.length!==frame.avatars.length){health.replaceChildren();frame.avatars.forEach(function(a,index){var row=document.createElement('li');row.style.borderColor=colors[index%4];health.appendChild(row);});}
    frame.avatars.forEach(function(a,index){
      var label=a.name+' — '+PondRenderer.formatHealth(a.health)+' ХП'+(a.dead?' · выбыл':'');if(health.children[index].textContent!==label)health.children[index].textContent=label;
    });
  }
  var loader=null,loaderSequence=0,loaderPending=new Map();
  try{
    loader=new Worker('replay-loader.js');
    loader.onmessage=function(event){var pending=loaderPending.get(event.data.id);if(!pending)return;loaderPending.delete(event.data.id);if(event.data.error)pending.reject(Error(event.data.error));else pending.resolve(event.data.frames);};
    loader.onerror=function(){if(loader)loader.terminate();loader=null;loaderPending.forEach(function(pending){api.request(pending.url).then(function(data){pending.resolve(data.frames);},pending.reject);});loaderPending.clear();};
  }catch(error){loader=null;}
  function loadFrames(url){if(!loader)return api.request(url).then(function(data){if(!Array.isArray(data.frames)||!data.frames.length)throw Error('Фрагмент записи не содержит кадров.');return data.frames;});return new Promise(function(resolve,reject){var id=++loaderSequence;loaderPending.set(id,{resolve:resolve,reject:reject,url:url});loader.postMessage({id:id,url:url});});}
  function trim(record){record.cache.forEach(function(entry,index){if(record.cache.size>8&&Math.abs(index-record.cursor)>2&&entry.frames)record.cache.delete(index);});}
  function chunk(record,index){
    if(index<0||index>=record.chunks.length)return null;
    var entry=record.cache.get(index);if(entry&&entry.error&&Date.now()>=entry.retryAt){record.cache.delete(index);entry=null;}if(entry)return entry;
    entry={frames:null,error:null};record.cache.set(index,entry);
    entry.promise=loadFrames('/api/sandbox/matches/'+record.id+'/replay/chunks/'+record.chunks[index].chunk_index).then(function(frames){entry.frames=frames;trim(record);if(playback===record)dirty=true;},function(error){entry.error=error;entry.retryAt=Date.now()+3000;});
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
    var request=++replayRequest;playing=false;dirty=false;pendingSeek=null;opening=true;setBuffering(true);byId('replay-title').textContent='Загружаем запись боя…';byId('replay-play').disabled=true;
    try{
      var record=await api.request('/api/sandbox/matches/'+id+'/replay');if(request!==replayRequest)return;if(!record.chunks.length)throw Error('Запись боя не содержит кадров.');
      record.cache=new Map();record.cursor=0;warm(record,0);var first=chunk(record,0);await first.promise;if(request!==replayRequest)return;if(first.error)throw first.error;
      playback=record;pondView.reset();time=0;lastWall=0;dirty=true;lastControls=0;
      byId('replay-title').textContent=record.title+(record.visuals?'':' · Старая запись: события радара и полёта снарядов не сохранялись.');byId('replay-controls').hidden=false;byId('replay-seek').max=String(record.duration);byId('replay-play').textContent='Воспроизвести';
      byId('replay-pond').scrollIntoView({behavior:'smooth',block:'center'});
    }catch(error){if(request===replayRequest){byId('replay-title').textContent=playback?playback.title:'Не удалось загрузить запись.';throw error;}}
    finally{if(request===replayRequest){opening=false;setBuffering(false);byId('replay-play').disabled=false;}}
  }
  byId('replay-play').onclick=function(){if(!playback)return;if(pendingSeek)time=pendingSeek.at;if(time>=playback.duration)time=0;pendingSeek=null;playing=!playing;dirty=true;lastWall=0;this.textContent=playing?'Пауза':'Воспроизвести';if(!playing)render();};
  byId('replay-restart').onclick=function(){pendingSeek=null;time=0;dirty=true;lastWall=0;};
  byId('replay-seek').oninput=function(){pendingSeek={at:Number(this.value),resume:pendingSeek?pendingSeek.resume:playing,after:performance.now()+100};playing=false;byId('replay-play').textContent='Воспроизвести';};
  byId('replay-seek').onchange=function(){if(pendingSeek)pendingSeek.after=0;};
  function tick(now){
    var elapsed=lastWall?Math.max(0,now-lastWall)/1000:0;lastWall=now;
    if(pendingSeek&&now>=pendingSeek.after){time=pendingSeek.at;playing=pendingSeek.resume;pendingSeek=null;dirty=true;elapsed=0;byId('replay-play').textContent=playing?'Пауза':'Воспроизвести';}
    if(playback&&!opening&&!pendingSeek&&(playing||dirty||buffering)){
      var record=playback,at=playing?Math.min(record.duration,time+elapsed*Number(byId('replay-speed').value)):time;
      try{
        var frame=sample(record,at);setBuffering(!frame);
        if(frame){time=at;draw(frame);dirty=false;if(now-lastControls>=100||!playing||time>=record.duration){byId('replay-seek').value=String(time);byId('replay-time').textContent=time.toFixed(1)+' / '+record.duration.toFixed(1)+' с';lastControls=now;}if(time>=record.duration){playing=false;byId('replay-play').textContent='Воспроизвести';}}
      }catch(error){playing=false;dirty=false;setBuffering(false);byId('replay-play').textContent='Воспроизвести';message(error.message);}
    }
    requestAnimationFrame(tick);
  }
  background();requestAnimationFrame(tick);
  try{await library();await refresh();}catch(error){message(error.message);}
  setInterval(function(){if(!playing&&!pendingSeek&&!document.hidden)refresh().catch(function(error){message(error.message);});},3000);
  document.addEventListener('visibilitychange',function(){lastWall=0;});
  window.addEventListener('focus',function(){library().then(position).catch(function(error){message(error.message);});});
})();
