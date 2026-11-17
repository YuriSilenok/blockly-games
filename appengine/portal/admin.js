(async function () {
  var api = PondPortal, status = document.getElementById('status'), tournaments = [], select = document.getElementById('tournaments');
  await api.ready;
  if (!api.user || api.user.role !== 'admin') { status.hidden=false;status.innerHTML = 'Нужен <a href="/account?next=/admin">вход администратора</a>.'; return; }
  document.getElementById('panel').hidden = false;
  var roundsPanel=document.createElement('section');roundsPanel.className='card';roundsPanel.innerHTML='<h2>Раунды турнира</h2><form id="create-round"><button>Создать раунд</button></form><div id="round-editors"></div><div id="round-report"></div>';
  document.getElementById('panel').appendChild(roundsPanel);
  document.querySelector('#create small').textContent='Общий бой завершается, когда остаётся одна утка или минуту никто не получает урон.';
  document.querySelector('.admin-side .pill').textContent='Общие бои';
  document.getElementById('standings').hidden=true;
  var finish=document.createElement('button');finish.className='quiet danger';finish.textContent='Завершить турнир';document.getElementById('toggle').after(finish);
  var currentData=null;
  async function load() {
    var old = select.value; tournaments = (await api.request('/api/tournaments')).tournaments; select.replaceChildren();
    tournaments.forEach(function (t) { select.add(new Option(t.name, t.id)); }); if (old) select.value = old;
    if (!select.value && tournaments.length) select.selectedIndex = 0;
    await table(true);
  }
  async function table(rebuild) {
    var t = tournaments.find(function (t) { return String(t.id) === select.value; });
    document.getElementById('toggle').disabled = !t||t.status==='finished';finish.disabled=!t||t.status==='finished';document.querySelector('#create-round button').disabled=!t||t.status==='finished';
    if (!t) return;
    document.getElementById('toggle').textContent = t.status === 'open' ? 'Закрыть приём алгоритмов' : t.status==='finished'?'Турнир завершён':'Открыть приём алгоритмов';
    var data=await api.request('/api/arena/tournaments/'+t.id);currentData=data;
    api.roundReport(data.rounds,document.getElementById('round-report'));
    if(rebuild){editors(data,t);lastStates=JSON.stringify(data.rounds.map(function(r){return [r.id,r.status];}));}
  }
  function editors(data,t){
    var target=document.getElementById('round-editors');target.replaceChildren();
    data.rounds.forEach(function(round){
      var box=document.createElement('section');box.className='round-editor';var title=document.createElement('h3');title.textContent=round.name;box.appendChild(title);
      if(round.status==='draft'){
        var choices=document.createElement('div');choices.className='team-choices';
        data.teams.forEach(function(team){var label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=team.team_id;input.checked=round.players.some(function(p){return p.team_id===team.team_id;});label.appendChild(input);label.appendChild(document.createTextNode(team.team+' · '+team.algorithm));choices.appendChild(label);});box.appendChild(choices);
        var start=document.createElement('button');start.textContent='Сохранить состав и запустить';start.disabled=t.status==='finished';
        start.onclick=async function(){start.disabled=true;try{await api.request('/api/admin/rounds/'+round.id+'/teams',{team_ids:Array.from(choices.querySelectorAll('input:checked')).map(function(i){return Number(i.value);})});await api.request('/api/admin/rounds/'+round.id+'/start',{});await table(true);}catch(error){fail(error);start.disabled=false;}};box.appendChild(start);
      }else if(round.status==='done'||round.status==='error'){
        var again=document.createElement('button');again.className='secondary';again.textContent='Новый раунд с этим составом';again.disabled=t.status==='finished';
        again.onclick=async function(){again.disabled=true;try{var created=await api.request('/api/admin/rounds',{tournament_id:t.id});await api.request('/api/admin/rounds/'+created.id+'/teams',{team_ids:round.players.map(function(p){return p.team_id;})});await api.request('/api/admin/rounds/'+created.id+'/start',{});await table(true);}catch(error){fail(error);await table(true);}};box.appendChild(again);
      }else{var note=document.createElement('p');note.textContent=round.status==='queued'?'Раунд в очереди.':'Идёт бой.';box.appendChild(note);}
      target.appendChild(box);
    });
  }
  select.onchange = function () { table(true).catch(fail); };
  document.getElementById('create-round').onsubmit=async function(event){event.preventDefault();var button=this.querySelector('button');button.disabled=true;try{await api.request('/api/admin/rounds',{tournament_id:Number(select.value)});await table(true);}catch(error){fail(error);}finally{button.disabled=false;}};
  finish.onclick=async function(){if(!confirm('Завершить турнир? Приём и изменение заявок будут закрыты, новые раунды создать будет нельзя.'))return;try{await api.request('/api/admin/tournaments/'+select.value+'/status',{status:'finished'});await load();}catch(error){fail(error);}};
  document.getElementById('create').onsubmit = async function (event) {
    event.preventDefault(); var button = this.querySelector('button'); button.disabled = true;
    try { await api.request('/api/admin/tournaments', Object.fromEntries(new FormData(this))); await load(); status.textContent = 'Турнир создан.';status.hidden=false; } catch (error) { fail(error); }
    finally { button.disabled = false; }
  };
  document.getElementById('toggle').onclick = async function () {
    var t = tournaments.find(function (t) { return String(t.id) === select.value; });
    try { await api.request('/api/admin/tournaments/' + t.id + '/status', {status: t.status === 'open' ? 'closed' : 'open'}); await load(); } catch (error) { fail(error); }
  };
  function fail(error) { status.textContent = error.message;status.hidden=false; }
  var canvas = document.getElementById('pond'), ctx = canvas.getContext('2d'), colors = ['#fff394','#e87979','#79cf92','#414c64'];
  async function live() {
    try {
      var data = await api.request('/api/admin/live'); var m = data.match, frame = m && m.snapshot;
      document.getElementById('queue').textContent = 'Решений в работе и очереди: ' + data.waiting;
      document.getElementById('battle').textContent = m ? m.title + (frame ? ' · ' + frame.time.toFixed(1) + ' с' : '') + (m.status === 'running' ? '' : ' · завершён') : 'Ожидание решений';
      ctx.fillStyle = '#7cb8da'; ctx.fillRect(0,0,500,500); ctx.strokeStyle = '#ffffff55';
      for (var i=0;i<=10;i++) { ctx.beginPath(); ctx.moveTo(i*50,0);ctx.lineTo(i*50,500);ctx.moveTo(0,i*50);ctx.lineTo(500,i*50);ctx.stroke(); }
      if (frame) {
        frame.avatars.forEach(function (a,i) {ctx.globalAlpha=a.dead ? .3 : 1;ctx.fillStyle=colors[i%4];ctx.beginPath();ctx.arc(a.x*5,500-a.y*5,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#263645';ctx.font='14px sans-serif';ctx.fillText(String(i+1),a.x*5-4,500-a.y*5+5);ctx.globalAlpha=1;});
        ctx.fillStyle='#ffedab';frame.missiles.forEach(function (p) {ctx.beginPath();ctx.arc(p.x*5,500-p.y*5,4,0,Math.PI*2);ctx.fill();});
        document.getElementById('ducks').textContent=frame.avatars.map(function(a,i){return(i+1)+'. '+a.name+' — '+Number(a.health.toFixed(3))+' ХП';}).join(' · ');
      }
    } catch (error) { fail(error); }
    setTimeout(live,250);
  }
  var lastStates='';
  try { await load(); live(); setInterval(async function(){try{await table();var states=JSON.stringify(currentData.rounds.map(function(r){return [r.id,r.status];}));if(states!==lastStates){lastStates=states;var t=tournaments.find(function(t){return String(t.id)===select.value;});editors(currentData,t);}}catch(error){fail(error);}},3000); } catch (error) { fail(error); }
})();
