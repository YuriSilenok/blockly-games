(async function () {
  var api = PondPortal, status = document.getElementById('status'), tournaments = [], select = document.getElementById('tournaments');
  await api.ready;
  if (!api.user || api.user.role !== 'admin') return;
  document.getElementById('panel').hidden = false;
  var finish=document.getElementById('finish-tournament');
  var currentData=null,repeatBusy=false,startBusy=false,preparedRoundId=null;
  var player=new PondBattlePlayer({element:document.getElementById('tournament-player'),base:'/api/admin/matches/',speedKey:'pond-admin-playback-speed:'+api.user.id,onStart:startRound,onError:fail,onPause:function(){table(true).catch(fail);}});
  player.followLive();
  function showLive(){player.followLive();document.getElementById('live').scrollIntoView({behavior:'smooth',block:'start'});}
  document.getElementById('follow-live').onclick=showLive;
  function roundSettings(){return {mode:document.getElementById('round-mode').value,respawns:Number(document.getElementById('round-respawns').value),kill_target:document.getElementById('round-score-enabled').checked?Number(document.getElementById('round-kill-target').value):0};}
  function syncSettings(){var king=document.getElementById('round-mode').value==='king',enabled=document.getElementById('round-score-enabled');enabled.disabled=king||Number(document.getElementById('round-respawns').value)===0;if(king)enabled.checked=true;else if(enabled.disabled)enabled.checked=false;document.getElementById('round-kill-target').disabled=!enabled.checked;}
  ['round-mode','round-respawns','round-score-enabled'].forEach(function(id){document.getElementById(id).onchange=syncSettings;});syncSettings();
  async function load(preferred) {
    var old = preferred?String(preferred):select.value||sessionStorage.getItem('pond-admin-tournament'); tournaments = (await api.request('/api/tournaments')).tournaments; select.replaceChildren();
    tournaments.forEach(function (t) { select.add(new Option(t.name, t.id)); }); if (old) select.value = old;
    if (!select.value && tournaments.length) select.selectedIndex = 0;
    if(select.value)sessionStorage.setItem('pond-admin-tournament',select.value);
    await table(true);
  }
  async function table(rebuild) {
    var t = tournaments.find(function (t) { return String(t.id) === select.value; });
    document.getElementById('toggle').disabled = !t||t.status==='finished';finish.disabled=!t||t.status==='finished';document.querySelector('#create-round button').disabled=!t||t.status==='finished';
    if (!t) {player.setStartEnabled(false);currentData=null;document.getElementById('round-editors').replaceChildren();document.getElementById('round-report').replaceChildren();document.getElementById('tournament-state').textContent='Нет турниров';return;}
    document.getElementById('tournament-state').textContent={open:'Приём открыт',closed:'Приём закрыт',finished:'Турнир завершён'}[t.status];
    document.getElementById('toggle').textContent = t.status === 'open' ? 'Закрыть приём алгоритмов' : t.status==='finished'?'Турнир завершён':'Открыть приём алгоритмов';
    var data=await api.request('/api/arena/tournaments/'+t.id);if(select.value!==String(t.id))return;currentData=data;
    var draft=data.rounds.find(function(round){return round.id===preparedRoundId&&round.status==='draft';})||data.rounds.find(function(round){return round.status==='draft';});
    preparedRoundId=draft?draft.id:null;
    player.setStartEnabled(!startBusy&&t.status!=='finished'&&!!draft&&draft.players.length>=2&&draft.players.length<=(draft.mode==='king'?64:4)&&!data.rounds.some(function(round){return ['queued','running'].includes(round.status);}));
    if(!player.busy())api.roundReport(data.rounds,document.getElementById('round-report'),{onReplay:function(id){player.open(id).catch(fail);},onResume:t.status!=='finished'?resumeRound:null});
    var last=data.rounds[0];document.getElementById('repeat-round').disabled=repeatBusy||t.status==='finished'||!last||!['done','error'].includes(last.status);
    if(rebuild&&!player.busy()){editors(data,t);lastStates=JSON.stringify(data.rounds.map(function(r){return [r.id,r.status];}));}
  }
  function editors(data,t){
    var target=document.getElementById('round-editors');target.replaceChildren();
    data.rounds.forEach(function(round){
      if(round.status==='done'||round.status==='error')return;
      var box=document.createElement('section');box.className='round-editor';var title=document.createElement('h3');title.textContent=round.name;box.appendChild(title);
      var modeInfo=document.createElement('p');modeInfo.className='muted';modeInfo.textContent=(round.mode==='king'?'Царь горы':'Общий бой')+' · Возрождений: '+round.respawns+(round.kill_target?' · До '+round.kill_target+' потоплений (побед)':' · До последней утки');box.appendChild(modeInfo);
      if(round.status==='draft'){
        var hint=document.createElement('p');hint.textContent=round.mode==='king'?'Выбери от 2 до 64 команд. Порядок списка задаёт очередь, стрелками можно его изменить.':'Выбери от двух до четырёх команд. Утки стартуют в углах с отступом 10.';box.appendChild(hint);
        var choices=document.createElement('div');choices.className='team-choices';
        var order=round.players.slice().sort(function(a,b){return a.queue_order-b.queue_order;}).map(function(p){return p.team_id;});
        data.teams.slice().sort(function(a,b){var x=order.indexOf(a.team_id),y=order.indexOf(b.team_id);return (x<0?10000:x)-(y<0?10000:y);}).forEach(function(team){var line=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input');line.className='team-choice-line';input.type='checkbox';input.value=team.team_id;input.checked=round.players.some(function(p){return p.team_id===team.team_id;});label.appendChild(input);label.appendChild(document.createTextNode(team.team+' · '+team.algorithm));line.appendChild(label);if(round.mode==='king'){[-1,1].forEach(function(direction){var move=document.createElement('button');move.type='button';move.className='secondary';move.textContent=direction<0?'↑':'↓';move.setAttribute('aria-label',(direction<0?'Поднять ':'Опустить ')+team.team);move.onclick=function(){var sibling=direction<0?line.previousElementSibling:line.nextElementSibling;if(sibling)choices.insertBefore(direction<0?line:sibling,direction<0?sibling:line);};line.appendChild(move);});}choices.appendChild(line);});box.appendChild(choices);
        var start=document.createElement('button');start.textContent='Сохранить состав';start.disabled=t.status==='finished';
        start.onclick=async function(){start.disabled=true;try{await api.request('/api/admin/rounds/'+round.id+'/teams',{team_ids:Array.from(choices.querySelectorAll('input:checked')).map(function(i){return Number(i.value);})});preparedRoundId=round.id;showLive();await table(true);status.textContent='Состав сохранён. Выбери скорость у пруда и нажми «Запустить игру».';status.hidden=false;}catch(error){fail(error);start.disabled=false;}};box.appendChild(start);
      }else{var note=document.createElement('p');note.textContent=round.status==='queued'?'Раунд в очереди.':'Идёт бой.';box.appendChild(note);}
      target.appendChild(box);
    });
  }
  select.onchange = function () { preparedRoundId=null;player.setStartEnabled(false);currentData=null;document.getElementById('repeat-round').disabled=true;player.followLive();player.clearLive(); sessionStorage.setItem('pond-admin-tournament',select.value);table(true).catch(fail); };
  document.getElementById('create-round').onsubmit=async function(event){event.preventDefault();var button=this.querySelector('button');button.disabled=true;try{await api.request('/api/admin/rounds',Object.assign({tournament_id:Number(select.value)},roundSettings()));preparedRoundId=null;showLive();await table(true);status.textContent='Раунд создан. Выбери состав и запусти бой отдельно.';status.hidden=false;}catch(error){fail(error);}finally{button.disabled=false;}};
  finish.onclick=async function(){if(!confirm('Завершить турнир? Приём и изменение заявок будут закрыты, новые раунды создать будет нельзя.'))return;try{await api.request('/api/admin/tournaments/'+select.value+'/status',{status:'finished'});await load();}catch(error){fail(error);}};
  document.getElementById('create').onsubmit = async function (event) {
    event.preventDefault(); var button = this.querySelector('button'); button.disabled = true;
    try { var created=await api.request('/api/admin/tournaments', Object.fromEntries(new FormData(this)));await load(created.id);this.reset();document.querySelector('.admin-create').open=false;status.textContent = 'Турнир создан и выбран для работы.';status.hidden=false; } catch (error) { fail(error); }
    finally { button.disabled = false; }
  };
  document.getElementById('toggle').onclick = async function () {
    var t = tournaments.find(function (t) { return String(t.id) === select.value; });
    try { await api.request('/api/admin/tournaments/' + t.id + '/status', {status: t.status === 'open' ? 'closed' : 'open'}); await load(); } catch (error) { fail(error); }
  };
  function fail(error) { status.textContent = error.message;status.hidden=false; }
  async function resumeRound(id){
    if(!confirm('Продолжить прерванную серию? Завершённые поединки и счёт сохранятся, прерванный поединок начнётся заново.'))return;
    try{await api.request('/api/admin/rounds/'+id+'/resume',{});showLive();await table(true);status.textContent='Серия продолжится с сохранённым счётом и очередью.';status.hidden=false;}catch(error){fail(error);}
  }
  async function startRound(){
    if(startBusy||!preparedRoundId)return;
    startBusy=true;player.setStartEnabled(false);
    try{await api.request('/api/admin/rounds/'+preparedRoundId+'/start',{speed:player.speed()});showLive();status.textContent='Раунд отправлен на запуск с выбранной скоростью.';status.hidden=false;}
    catch(error){fail(error);}finally{startBusy=false;table(true).catch(fail);}
  }
  var liveCursor=0,liveAfter=-1,liveTournament=null;
  async function live(){
    var tournament=select.value,started=performance.now();
    if(liveTournament!==tournament){liveCursor=0;liveAfter=-1;liveTournament=tournament;}
    try{if(tournament){var data=await player.fetchLive('/api/admin/live?tournament_id='+encodeURIComponent(tournament)+'&match_id='+liveCursor+'&after='+liveAfter);if(select.value===tournament){document.getElementById('queue').textContent='Раундов в работе и очереди: '+data.waiting;if(data.match){var frames=data.match.frames||[];if(liveCursor!==data.match.id)liveAfter=-1;liveCursor=data.match.id;if(frames.length)liveAfter=frames[frames.length-1].time;player.live(data.match);}else player.clearLive();}}}
    catch(error){fail(error);}setTimeout(live,Math.max(0,200-(performance.now()-started)));
  }
  document.getElementById('repeat-round').onclick=async function(){
    var last=currentData&&currentData.rounds[0],t=tournaments.find(function(t){return String(t.id)===select.value;});
    if(repeatBusy||!last||!t||t.status==='finished'||!['done','error'].includes(last.status))return;
    repeatBusy=true;this.disabled=true;
    try{var latest=await api.request('/api/arena/tournaments/'+t.id);last=latest.rounds[0];if(!last||!['done','error'].includes(last.status))throw Error('Последний раунд ещё не завершён. Обнови страницу турнира.');var created=await api.request('/api/admin/rounds',{tournament_id:t.id,mode:last.mode,respawns:last.respawns,kill_target:last.kill_target});await api.request('/api/admin/rounds/'+created.id+'/teams',{team_ids:last.players.slice().sort(function(a,b){return a.queue_order-b.queue_order;}).map(function(p){return p.team_id;})});preparedRoundId=created.id;showLive();status.textContent='Раунд создан с составом последнего раунда. Бой можно запустить отдельно.';status.hidden=false;}
    catch(error){fail(error);}finally{repeatBusy=false;await table(true);}
  };
  var lastStates='';
  try { await load(); live(); setInterval(async function(){try{if(player.busy())return;await table();if(!currentData||player.busy())return;var states=JSON.stringify(currentData.rounds.map(function(r){return [r.id,r.status];}));if(states!==lastStates){lastStates=states;var t=tournaments.find(function(t){return String(t.id)===select.value;});editors(currentData,t);}}catch(error){fail(error);}},3000); } catch (error) { fail(error); }
})();
