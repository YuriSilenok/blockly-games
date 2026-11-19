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
    try{state=await api.request('/api/sandbox');state.fights.forEach(function(f){history.set(f.id,f);});if(!historyInitialized){older=state.next_fight;historyInitialized=true;}render();}finally{loading=false;}
  }
  byId('sandbox-algorithm').onchange=position;
  byId('older-fights').onclick=async function(){var button=this;button.disabled=true;try{var data=await api.request('/api/sandbox?before_match_id='+older);data.fights.forEach(function(f){history.set(f.id,f);});older=data.next_fight;renderFights();}catch(error){message(error.message);}finally{button.disabled=false;}};
  var playback=null,time=0,playing=false,lastWall=0;
  var canvas=byId('replay-pond'),pondView=new PondRenderer(canvas),colors=PondRenderer.colors;
  function background(){pondView.draw({time:0,avatars:[],missiles:[]});}
  function draw(frame){
    pondView.draw(frame);var health=byId('replay-health');if(health.children.length!==frame.avatars.length){health.replaceChildren();frame.avatars.forEach(function(a,index){var row=document.createElement('li');row.style.borderColor=colors[index%4];health.appendChild(row);});}
    frame.avatars.forEach(function(a,index){
      health.children[index].textContent=a.name+' — '+PondRenderer.formatHealth(a.health)+' ХП'+(a.dead?' · выбыл':'');
    });
  }
  async function chunk(record,index){
    if(!record.cache.has(index))record.cache.set(index,api.request('/api/sandbox/matches/'+record.id+'/replay/chunks/'+index).then(function(data){return data.frames;}));
    var pending=record.cache.get(index);record.cache.delete(index);record.cache.set(index,pending);while(record.cache.size>8)record.cache.delete(record.cache.keys().next().value);
    try{return await pending;}catch(error){record.cache.delete(index);throw error;}
  }
  async function sample(record,at){
    var section=record.chunks.find(function(c){return at<=c.last_time;})||record.chunks[record.chunks.length-1];if(!section)throw Error('Запись боя не содержит кадров.');
    var frames=await chunk(record,section.chunk_index),index=frames.findIndex(function(f){return f.time>=at;});if(index<0)index=frames.length-1;
    var right=frames[index],left=index?frames[index-1]:right;
    if(!index&&section.chunk_index>0&&at<right.time){var previous=await chunk(record,section.chunk_index-1);left=previous[previous.length-1];}
    var fraction=right.time>left.time?Math.max(0,Math.min(1,(at-left.time)/(right.time-left.time))):1;
    if(fraction>=1)return right;
    return PondRenderer.interpolate(left,right,fraction);
  }
  async function openReplay(id){
    playing=false;var record=await api.request('/api/sandbox/matches/'+id+'/replay');record.cache=new Map();playback=record;pondView.reset();time=0;lastWall=0;
    byId('replay-title').textContent=record.title+(record.visuals?'':' · Старая запись: события радара и полёта снарядов не сохранялись.');byId('replay-controls').hidden=false;byId('replay-seek').max=String(record.duration);byId('replay-play').textContent='Воспроизвести';
    var first=await sample(record,0);if(playback!==record)return;draw(first);byId('replay-pond').scrollIntoView({behavior:'smooth',block:'center'});
  }
  byId('replay-play').onclick=function(){if(!playback)return;if(time>=playback.duration)time=0;playing=!playing;lastWall=performance.now();this.textContent=playing?'Пауза':'Воспроизвести';};
  byId('replay-restart').onclick=function(){time=0;lastWall=performance.now();};
  byId('replay-seek').oninput=function(){time=Number(this.value);lastWall=performance.now();};
  async function tick(now){
    if(playback){var record=playback;if(playing&&lastWall)time=Math.min(record.duration,time+Math.max(0,now-lastWall)/1000*Number(byId('replay-speed').value));
      try{var frame=await sample(record,time);if(playback===record){draw(frame);byId('replay-seek').value=String(time);byId('replay-time').textContent=time.toFixed(1)+' / '+record.duration.toFixed(1)+' с';if(time>=record.duration){playing=false;byId('replay-play').textContent='Воспроизвести';}}}catch(error){playing=false;byId('replay-play').textContent='Воспроизвести';message(error.message);playback=null;}
    }lastWall=performance.now();requestAnimationFrame(tick);
  }
  background();requestAnimationFrame(tick);
  try{await library();await refresh();}catch(error){message(error.message);}
  setInterval(function(){refresh().catch(function(error){message(error.message);});},3000);
  window.addEventListener('focus',function(){library().then(position).catch(function(error){message(error.message);});});
})();
