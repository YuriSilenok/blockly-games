(function () {
  'use strict';
  var api = window.PondPortal = {user: null, online: false};
  api.onLoad = function (callback) {
    if (document.readyState === 'complete') setTimeout(callback, 0);
    else window.addEventListener('load', callback);
  };
  api.signIn = function () {
    var next=location.pathname+location.search;
    var base=api.online?'portal/account.html':'https://xn--e1afhclgq.xn--p1ai/portal/account.html';
    if(!api.online)next='/pond-tutor.html';
    location.replace(base+'?next='+encodeURIComponent(next));
  };
  api.request = async function (path, value) {
    var options = {credentials: 'same-origin', headers: {}};
    if (value !== undefined) {
      options.method = 'POST';
      options.headers['Content-Type'] = 'application/json';
      options.headers['X-CSRF-Token'] = api.user ? api.user.csrf : '';
      options.body = JSON.stringify(value);
    }
    var response;
    try{response=await fetch(path,options);}catch(error){throw Error('Не удалось связаться с сервером. Проверь соединение и повтори действие.');}
    var data;
    try { data = await response.json(); } catch (e) {
      if(response.status===413)throw Error('Размер запроса превышает допустимый. Уменьши программу и повтори сохранение.');
      if(response.status>=500)throw Error('Сервер не смог обработать запрос. Повтори действие позже.');
      throw Error('Сервер вернул неполный или некорректный ответ. Обнови страницу и повтори действие.');
    }
    if (!response.ok) { if(response.status===401)api.user=null; throw Error(data.error || 'Не удалось выполнить запрос.'); }
    return data;
  };
  api.refresh = async function () {
    var data = await api.request('/api/me');
    api.user = data.user; api.online = true;
    api.editorNavigation();
    return api.user;
  };
  api.editorNavigation=function(){
    document.querySelectorAll('.nav-links,#header_cta').forEach(function(menu){
      var link=menu.querySelector('[data-editor-link]');
      if(!link){link=document.createElement('a');link.href='/editor';link.dataset.editorLink='true';link.textContent='Редактор алгоритмов';menu.appendChild(link);if(menu.id==='header_cta')requestAnimationFrame(function(){window.dispatchEvent(new Event('resize'));});}
      link.hidden=!(api.user&&api.user.unlocked);
      if(location.pathname==='/pond-duck.html'||location.pathname==='/editor'){link.setAttribute('aria-current','page');link.classList.add('nav-active');}
    });
  };
  function watchNavigation(){api.editorNavigation();new MutationObserver(api.editorNavigation).observe(document.body,{childList:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchNavigation);else watchNavigation();
  api.ready = api.refresh().catch(function () { return null; });
  api.roundReport=function(rounds,target,options){
    target.replaceChildren();var heading=document.createElement('h3');heading.textContent='Статистика раундов';target.appendChild(heading);
    if(!rounds.length){var empty=document.createElement('p');empty.className='empty-state';empty.textContent='Раунды пока не проводились.';target.appendChild(empty);return;}
    var note=document.createElement('p');note.className='muted';note.textContent='«Выбыл» — номер выбытия. Оставшиеся к концу боя утки получают одинаковый следующий номер.';target.appendChild(note);
    var scroll=document.createElement('div');scroll.className='table-scroll';var table=document.createElement('table'),head=table.createTHead().insertRow();
    ['Команда','Алгоритм','Выбыл','Здоровье','Потоплений'].forEach(function(label){var th=document.createElement('th');th.scope='col';th.textContent=label;head.appendChild(th);});
    var states={draft:'Подготовка',queued:'В очереди',running:'Идёт бой',done:'Завершён',error:'Не завершён'};
    rounds.forEach(function(round){
      var group=table.createTBody(),heading=group.insertRow(),label=document.createElement('th');label.colSpan=5;label.scope='rowgroup';label.className='round-group-heading';heading.appendChild(label);
      var groupHeader=document.createElement('div'),groupContent=document.createElement('div'),groupActions=document.createElement('div'),groupTitle=document.createElement('strong');groupHeader.className='round-group-top';groupContent.className='round-group-content';groupActions.className='round-group-actions';groupTitle.textContent=round.name+' · '+(states[round.status]||round.status);groupContent.appendChild(groupTitle);groupHeader.appendChild(groupContent);groupHeader.appendChild(groupActions);label.appendChild(groupHeader);
      var config=document.createElement('p');config.className='muted';config.textContent=(round.mode==='king'?'Царь горы':'Выживание')+' · Возрождений: '+(round.respawns||0)+(round.kill_target?' · До '+round.kill_target+' потоплений (побед)':'');groupContent.appendChild(config);
      var winner=(round.players||[]).find(function(player){return player.team_id===round.winner_team_id;});
      if(winner){var winnerText=document.createElement('p');winnerText.textContent='Победитель: '+winner.team;groupContent.appendChild(winnerText);}
      if(round.end_reason==='all_disqualified'){var noWinner=document.createElement('p');noWinner.textContent='Все участники дисквалифицированы. Победителя нет.';groupContent.appendChild(noWinner);}
      if(round.end_reason==='no_opponents'){var noGoal=document.createElement('p');noGoal.textContent='Соперников больше нет, заданное число потоплений не достигнуто. Победителя нет.';groupContent.appendChild(noGoal);}
      if(round.end_reason==='idle'&&!winner){var idle=document.createElement('p');idle.textContent='Бой завершён после минуты без урона, победитель не определён.';groupContent.appendChild(idle);}
      if(options&&options.onReplay&&round.replay_match_id){
        var boutSelect=null;
        if(round.mode==='king'&&round.bouts&&round.bouts.length){boutSelect=document.createElement('select');boutSelect.setAttribute('aria-label','Поединок для просмотра');round.bouts.forEach(function(bout){var option=new Option('Бой '+bout.sequence,bout.match_id);option.title=bout.left_name+' — '+bout.right_name;boutSelect.add(option);});boutSelect.value=String(round.bouts[round.bouts.length-1].match_id);groupActions.appendChild(boutSelect);}
        var replay=document.createElement('button');replay.className='secondary';replay.textContent='Смотреть запись';replay.onclick=function(){options.onReplay(boutSelect?Number(boutSelect.value):round.replay_match_id);};groupActions.appendChild(replay);
      }
      if(options&&options.onResume&&round.mode==='king'&&round.status==='error'){var resume=document.createElement('button');resume.textContent='Продолжить прерванную серию';resume.onclick=async function(){resume.disabled=true;try{await options.onResume(round.id);}finally{resume.disabled=false;}};groupActions.appendChild(resume);}
      var players=round.players.length?round.players.slice().sort(function(a,b){return (b.eliminated==null?-1:b.eliminated)-(a.eliminated==null?-1:a.eliminated)||a.team.localeCompare(b.team,'ru');}):[{team:'Состав не выбран'}];
      players.forEach(function(player){var row=group.insertRow();if(api.user&&player.team_id===api.user.team_id)row.className='my-team';
        var health=player.health==null?'—':(player.health>0&&player.health<.001?'<0,001':Number(player.health.toFixed(3)).toLocaleString('ru-RU'))+' ХП';
        [player.team+(player.disqualified?' · дисквалифицирован':''),player.algorithm_name||'—',player.eliminated==null?'—':player.eliminated,health+(player.respawns_used?' · возрождений: '+player.respawns_used:''),player.kills==null?'—':player.kills].forEach(function(value){row.insertCell().textContent=value;});
        if(player.error)row.title=player.error;
      });
      if(round.mode==='king'&&round.bouts&&round.bouts.length){
        var detailRow=group.insertRow(),detailCell=detailRow.insertCell();detailCell.colSpan=5;
        var details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Поединки серии: '+round.bouts.length;details.appendChild(summary);var list=document.createElement('ol');list.className='round-bout-list';
        round.bouts.forEach(function(bout){var entry=document.createElement('li'),result=bout.result,winning=bout.winner_team===bout.left_team?bout.left_name:bout.right_name;
          entry.textContent='Бой '+bout.sequence+': '+bout.left_name+' — '+bout.right_name+' · ХП '+result.health.map(function(value){return Number(value.toFixed(3)).toLocaleString('ru-RU');}).join(' : ')+' · счёт '+result.scores.join(' : ')+(bout.winner_team?' · победитель: '+winning:result.full_draw?' · 100:100, бездействие '+result.idle_streaks.join(' : '):' · равное ХП, обе команды в конец очереди')+(result.disqualified.length?' · дисквалифицированы: '+result.disqualified.map(function(id){return id===bout.left_team?bout.left_name:bout.right_name;}).join(', '):'');
          list.appendChild(entry);
        });details.appendChild(list);detailCell.appendChild(details);
      }
    });scroll.appendChild(table);target.appendChild(scroll);
  };
  api.wait = async function (id, changed) {
    for (;;) {
      var job = await api.request('/api/jobs/' + id);
      if (changed) changed(job.status === 'queued' ? 'Решение в очереди…' : 'Идёт сражение…');
      if (job.status === 'error') throw Error(job.result.message);
      if (job.status === 'done') return job.result;
      if (job.status === 'cancelled') throw Error('Проверка отменена.');
      await new Promise(function (resolve) { setTimeout(resolve, 1000); });
    }
  };
  api.table = async function (id, target) {
    var data = await api.request('/api/tournaments/' + id + '/standings');
    target.replaceChildren();
    var table = document.createElement('table');
    var head = table.insertRow();
    ['Место', 'Команда'].forEach(function (s) { var th = document.createElement('th'); th.textContent = s; head.appendChild(th); });
    data.standings.forEach(function (entry) {
      var row = table.insertRow();if(api.user&&api.user.team_id===entry.team_id)row.className='my-team';row.insertCell().textContent = String(entry.position).padStart(2,'0');
      row.insertCell().textContent = entry.team;
    });
    target.appendChild(table);
    if (!data.standings.length) { var p = document.createElement('p');p.className='empty-state';p.textContent = 'Первое место пока свободно. Отправьте алгоритм команды, чтобы открыть таблицу.'; target.appendChild(p); }
  };
})();
