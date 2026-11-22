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
  var reportStates=new WeakMap();
  api.roundReport=function(rounds,target,options){
    var viewState=reportStates.get(target)||new Map();reportStates.set(target,viewState);
    target.querySelectorAll('details[data-round-details]').forEach(function(details){var state=viewState.get(details.dataset.roundDetails)||{};state.open=details.open;viewState.set(details.dataset.roundDetails,state);});
    target.querySelectorAll('select[data-round-replay]').forEach(function(select){var state=viewState.get(select.dataset.roundReplay)||{};state.replay=select.value;viewState.set(select.dataset.roundReplay,state);});
    target.replaceChildren();var heading=document.createElement('h3');heading.textContent='Статистика раундов';target.appendChild(heading);
    if(!rounds.length){var empty=document.createElement('p');empty.className='empty-state';empty.textContent='Раунды пока не проводились.';target.appendChild(empty);return;}
    var states={draft:'Подготовка',queued:'В очереди',running:'Идёт бой',done:'Завершён',error:'Не завершён',stopped:'Остановлен'};
    rounds.forEach(function(round){
      var king=['king','king_elimination'].includes(round.mode);
      var section=document.createElement('section');section.className='round-report-group';var label=document.createElement('div');label.className='round-group-heading';section.appendChild(label);
      var scroll=document.createElement('div');scroll.className='table-scroll';var table=document.createElement('table'),head=table.createTHead().insertRow(),group=table.createTBody();
      ['Команда','Алгоритм',king?'Утонул':'Выбыл','Здоровье','Потоплений'].forEach(function(text){var th=document.createElement('th');th.scope='col';th.textContent=text;head.appendChild(th);});
      var groupHeader=document.createElement('div'),groupContent=document.createElement('div'),groupActions=document.createElement('div'),groupTitle=document.createElement('strong');groupHeader.className='round-group-top';groupContent.className='round-group-content';groupActions.className='round-group-actions';groupTitle.textContent=round.name+' · '+(states[round.status]||round.status);groupContent.appendChild(groupTitle);groupHeader.appendChild(groupContent);groupHeader.appendChild(groupActions);label.appendChild(groupHeader);
      var config=document.createElement('p');config.className='muted';config.textContent=(round.mode==='king_elimination'?'Царь горы на вылет (прежние правила)':king?(round.rules_version>=2?'Царь горы':'Царь горы (прежние правила)'):(round.rules_version>=2?'Выживание':'Выживание (прежние правила)'))+' · Возрождений: '+(round.respawns||0)+(round.kill_target?' · До '+round.kill_target+(king&&round.rules_version<2?' побед в серии':' потоплений'):'');groupContent.appendChild(config);
      if(king){var metrics=document.createElement('p');metrics.className='muted';metrics.textContent='ХП суммируется после каждого потопления соперника перед перезапуском; потопления и утопления считаются за весь раунд. Для прежних правил число побед поединков показано отдельно.';groupContent.appendChild(metrics);if(round.players.some(function(player){return player.health_complete===false;})){var legacy=document.createElement('p');legacy.className='muted';legacy.textContent='В старых записях ХП перед возрождениями не сохранялось. Недостающая сумма обозначена «—».';groupContent.appendChild(legacy);}}
      else{var eliminationNote=document.createElement('p');eliminationNote.className='muted';eliminationNote.textContent='«Выбыл» — номер окончательного выбытия; оставшиеся утки получают одинаковый следующий номер.';groupContent.appendChild(eliminationNote);}
      var winner=(round.players||[]).find(function(player){return player.team_id===round.winner_team_id;});
      if(winner){var winnerText=document.createElement('p');winnerText.textContent='Победитель: '+winner.team;groupContent.appendChild(winnerText);}
      if(round.end_reason==='all_disqualified'){var noWinner=document.createElement('p');noWinner.textContent='Все участники дисквалифицированы. Победителя нет.';groupContent.appendChild(noWinner);}
      if(round.end_reason==='no_remaining'){var noRemaining=document.createElement('p');noRemaining.textContent='Все команды выбыли, победителя нет.';groupContent.appendChild(noRemaining);}
      if(round.end_reason==='no_opponents'){var noGoal=document.createElement('p');noGoal.textContent='Соперников больше нет, заданное число потоплений не достигнуто. Победителя нет.';groupContent.appendChild(noGoal);}
      if(round.end_reason==='idle'&&!winner){var idle=document.createElement('p');idle.textContent='Бой завершён после минуты без урона, победитель не определён.';groupContent.appendChild(idle);}
      if(round.status==='stopped'){var stopped=document.createElement('p');stopped.textContent='Остановлен администратором. Победитель не назначается.';groupContent.appendChild(stopped);}
      if(options&&options.onReplay&&round.replay_match_id){
        var boutSelect=null;
        if(['king','king_elimination'].includes(round.mode)&&round.bouts&&round.bouts.length){boutSelect=document.createElement('select');boutSelect.dataset.roundReplay=String(round.id);boutSelect.setAttribute('aria-label','Поединок для просмотра');round.bouts.forEach(function(bout){var option=new Option('Поединок '+bout.sequence,bout.match_id);option.title=bout.left_name+' — '+bout.right_name;boutSelect.add(option);});var selected=(viewState.get(String(round.id))||{}).replay;boutSelect.value=selected&&Array.from(boutSelect.options).some(function(option){return option.value===selected;})?selected:String(round.bouts[round.bouts.length-1].match_id);groupActions.appendChild(boutSelect);}
        var replay=document.createElement('button');replay.className='secondary';replay.textContent='Смотреть запись';replay.onclick=function(){options.onReplay(boutSelect?Number(boutSelect.value):round.replay_match_id);};groupActions.appendChild(replay);
      }
      if(options&&options.onResume&&king&&round.status==='error'){var resume=document.createElement('button');resume.textContent='Продолжить прерванную серию';resume.onclick=async function(){resume.disabled=true;try{await options.onResume(round.id);}finally{resume.disabled=false;}};groupActions.appendChild(resume);}
      if(options&&options.onDelete&&['done','error','stopped'].includes(round.status)){var remove=document.createElement('button');remove.className='quiet danger';remove.textContent='Удалить раунд';remove.onclick=async function(){remove.disabled=true;try{await options.onDelete(round.id);}finally{remove.disabled=false;}};groupActions.appendChild(remove);}
      var players=round.players.length?round.players.slice().sort(function(a,b){return (b.eliminated==null?-1:b.eliminated)-(a.eliminated==null?-1:a.eliminated)||a.team.localeCompare(b.team,'ru');}):[{team:'Состав не выбран'}];
      players.forEach(function(player){var row=group.insertRow();if(api.user&&player.team_id===api.user.team_id)row.className='my-team';
        var healthValue=king?(player.health_complete===false?null:player.health_total):player.health;
        var health=healthValue==null?'—':(healthValue>0&&healthValue<.001?'<0,001':Number(healthValue.toFixed(3)).toLocaleString('ru-RU'))+' ХП';
        var sunk=king?(player.stats_complete===false?'—':player.sunk):player.eliminated;
        var kills=king?(player.stats_complete===false?'—':player.opponent_kills):player.kills;
        [player.team+(player.disqualified?' · дисквалифицирован':round.mode==='king_elimination'&&player.eliminated!=null&&player.team_id!==round.winner_team_id?' · выбыл из раунда':''),player.algorithm_name||'—',sunk==null?'—':sunk,health,kills==null?'—':kills].forEach(function(value){row.insertCell().textContent=value;});
        if(player.error)row.title=player.error;
      });
      if(king&&round.bouts&&round.bouts.length){
        var detailRow=group.insertRow(),detailCell=detailRow.insertCell();detailCell.colSpan=5;
        var details=document.createElement('details'),summary=document.createElement('summary');details.dataset.roundDetails=String(round.id);details.open=!!(viewState.get(String(round.id))||{}).open;details.addEventListener('toggle',function(){if(target.contains(details)){var state=viewState.get(String(round.id))||{};state.open=details.open;viewState.set(String(round.id),state);}});summary.textContent='Поединки серии: '+round.bouts.length;details.appendChild(summary);var list=document.createElement('ol');list.className='round-bout-list';
        round.bouts.forEach(function(bout){var entry=document.createElement('li'),result=bout.result,winning=bout.winner_team===bout.left_team?bout.left_name:bout.right_name;
          entry.textContent=(result.circle?'Круг '+result.circle+' · ':'')+'Поединок '+bout.sequence+': '+bout.left_name+' — '+bout.right_name+' · ХП '+result.health.map(function(value){return Number(value.toFixed(3)).toLocaleString('ru-RU');}).join(' : ')+' · счёт '+result.scores.join(' : ')+(result.stopped?' · остановлен администратором, очки не начислены':result.idle_result&&bout.winner_team?' · минута без урона, царь: '+winning+' (без потопления)':bout.winner_team?' · победитель: '+winning:result.full_draw?' · 100:100, бездействие '+result.idle_streaks.join(' : '):' · равное ХП, обе команды в конец очереди')+(result.disqualified.length?' · дисквалифицированы: '+result.disqualified.map(function(id){return id===bout.left_team?bout.left_name:bout.right_name;}).join(', '):'');
          if(result.advanced)entry.appendChild(document.createTextNode(' · в следующий круг: '+(result.advanced===bout.left_team?bout.left_name:bout.right_name)));
          if(result.eliminated&&result.eliminated.length)entry.appendChild(document.createTextNode(' · выбыл из раунда: '+result.eliminated.map(function(id){return id===bout.left_team?bout.left_name:bout.right_name;}).join(', ')));
          list.appendChild(entry);
        });details.appendChild(list);detailCell.appendChild(details);
      }
      scroll.appendChild(table);section.appendChild(scroll);target.appendChild(section);
    });
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
