(async function(){
  'use strict';
  var api=PondPortal,byId=function(id){return document.getElementById(id);},state=null,history=new Map(),older=null,historyInitialized=false,loading=false;
  function message(text){byId('status').textContent=text;byId('status').hidden=!text;}
  await api.ready;
  if(!api.user){location.replace('account.html?next=%2Fportal%2Fsandbox.html');return;}
  if(!api.user.unlocked&&api.user.role!=='admin'){location.replace('account.html?training_required=1');return;}
  byId('sandbox-panel').hidden=false;
  var player=new PondBattlePlayer({element:byId('battle-player'),base:'/api/sandbox/matches/',onError:message,onPause:function(){if(state)render();}});
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
      var button=document.createElement('button');button.className='secondary';button.textContent='Смотреть запись';button.onclick=function(){player.open(fight.id).catch(function(error){message(error.message);});};row.appendChild(button);target.appendChild(row);
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
    try{state=await api.request('/api/sandbox');state.fights.forEach(function(f){history.set(f.id,f);});if(!historyInitialized){older=state.next_fight;historyInitialized=true;}if(!player.busy())render();}finally{loading=false;}
  }
  byId('sandbox-algorithm').onchange=position;
  byId('older-fights').onclick=async function(){var button=this;button.disabled=true;try{var data=await api.request('/api/sandbox?before_match_id='+older);data.fights.forEach(function(f){history.set(f.id,f);});older=data.next_fight;renderFights();}catch(error){message(error.message);}finally{button.disabled=false;}};
  try{await library();await refresh();}catch(error){message(error.message);}
  setInterval(function(){if(!player.busy()&&!document.hidden)refresh().catch(function(error){message(error.message);});},3000);
  window.addEventListener('focus',function(){library().then(position).catch(function(error){message(error.message);});});
})();
