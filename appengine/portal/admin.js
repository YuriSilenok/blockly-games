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
    player.setStartEnabled(!startBusy&&t.status!=='finished'&&!!draft&&draft.players.length>=2&&draft.players.length<=4&&!data.rounds.some(function(round){return ['queued','running'].includes(round.status);}));
    if(!player.busy())api.roundReport(data.rounds,document.getElementById('round-report'),{onReplay:function(id){player.open(id).catch(fail);}});
    var last=data.rounds[0];document.getElementById('repeat-round').disabled=repeatBusy||t.status==='finished'||!last||!['done','error'].includes(last.status);
    if(rebuild&&!player.busy()){editors(data,t);lastStates=JSON.stringify(data.rounds.map(function(r){return [r.id,r.status];}));}
  }
  function editors(data,t){
    var target=document.getElementById('round-editors');target.replaceChildren();
    data.rounds.forEach(function(round){
      if(round.status==='done'||round.status==='error')return;
      var box=document.createElement('section');box.className='round-editor';var title=document.createElement('h3');title.textContent=round.name;box.appendChild(title);
      if(round.status==='draft'){
        var hint=document.createElement('p');hint.textContent='Выбери от двух до четырёх команд. Утки стартуют в углах с отступом 10.';box.appendChild(hint);
        var choices=document.createElement('div');choices.className='team-choices';
        data.teams.forEach(function(team){var label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=team.team_id;input.checked=round.players.some(function(p){return p.team_id===team.team_id;});label.appendChild(input);label.appendChild(document.createTextNode(team.team+' · '+team.algorithm));choices.appendChild(label);});box.appendChild(choices);
        var start=document.createElement('button');start.textContent='Сохранить состав';start.disabled=t.status==='finished';
        start.onclick=async function(){start.disabled=true;try{await api.request('/api/admin/rounds/'+round.id+'/teams',{team_ids:Array.from(choices.querySelectorAll('input:checked')).map(function(i){return Number(i.value);})});preparedRoundId=round.id;showLive();await table(true);status.textContent='Состав сохранён. Выбери скорость у пруда и нажми «Запустить игру».';status.hidden=false;}catch(error){fail(error);start.disabled=false;}};box.appendChild(start);
      }else{var note=document.createElement('p');note.textContent=round.status==='queued'?'Раунд в очереди.':'Идёт бой.';box.appendChild(note);}
      target.appendChild(box);
    });
  }
  select.onchange = function () { preparedRoundId=null;player.setStartEnabled(false);currentData=null;document.getElementById('repeat-round').disabled=true;player.followLive();player.clearLive(); sessionStorage.setItem('pond-admin-tournament',select.value);table(true).catch(fail); };
  document.getElementById('create-round').onsubmit=async function(event){event.preventDefault();var button=this.querySelector('button');button.disabled=true;try{await api.request('/api/admin/rounds',{tournament_id:Number(select.value)});preparedRoundId=null;showLive();await table(true);status.textContent='Раунд создан. Выбери состав и запусти бой отдельно.';status.hidden=false;}catch(error){fail(error);}finally{button.disabled=false;}};
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
    try{var latest=await api.request('/api/arena/tournaments/'+t.id);last=latest.rounds[0];if(!last||!['done','error'].includes(last.status))throw Error('Последний раунд ещё не завершён. Обнови страницу турнира.');var created=await api.request('/api/admin/rounds',{tournament_id:t.id});await api.request('/api/admin/rounds/'+created.id+'/teams',{team_ids:last.players.map(function(p){return p.team_id;})});preparedRoundId=created.id;showLive();status.textContent='Раунд создан с составом последнего раунда. Бой можно запустить отдельно.';status.hidden=false;}
    catch(error){fail(error);}finally{repeatBusy=false;await table(true);}
  };
  var lastStates='';
  try { await load(); live(); setInterval(async function(){try{if(player.busy())return;await table();if(!currentData||player.busy())return;var states=JSON.stringify(currentData.rounds.map(function(r){return [r.id,r.status];}));if(states!==lastStates){lastStates=states;var t=tournaments.find(function(t){return String(t.id)===select.value;});editors(currentData,t);}}catch(error){fail(error);}},3000); } catch (error) { fail(error); }
})();
