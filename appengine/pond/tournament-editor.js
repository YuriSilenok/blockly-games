window.installTournamentEditor=function(){
  'use strict';
  // Redraw the idle arena when its sprites become available.
  Hn.addEventListener('load',function(){if(Cn&&Dn&&Z.pb.length)Mn();});
  var portal=PondPortal, unlocked=false, originalHTML=Jo;
  Jo=function(){
    var box=document.createElement('div');box.innerHTML=originalHTML();
    ['languageMenu','linkButton'].forEach(function(id){var e=box.querySelector('#'+id);if(e)e.remove();});
    box.querySelector('#header_cta').insertAdjacentHTML('beforeend',' <a href="portal/account.html">Личный кабинет</a> <a href="portal/tournament.html">Таблица турниров</a> <button id="tournament-submit" disabled>Отправить на турнир</button>');
    box.querySelector('#visualization').insertAdjacentHTML('afterend','<div id="course-feedback"><div id="course-status" role="status">Загружаем учётную запись…</div><select id="tournament-select" aria-label="Турнир"></select></div>');
    return box.innerHTML;
  };
  var originalTab=Po;Po=function(mode){if(mode===0)originalTab(0);};
  Qo=function(){};
  var originalRun=Un;Un=function(event){if(!unlocked){alert('Для доступа к турниру войди в учётную запись и заверши обучение.');return;}originalRun(event);};
  function report(message){U('course-status').textContent=message;}
  portal.onLoad(async function(){
    document.title='Алгоритм команды — Пруд';U('avatar-select').style.display='none';
    var names={rook:'Ладья',counter:'Контратакующий',sniper:'Снайпер'};
    Z.pb.forEach(function(a,i){if(Mo[i]&&names[Mo[i].id])a.name=names[Mo[i].id];});
    await portal.ready;
    if(!portal.user || !portal.user.unlocked){
      var curtain=document.createElement('div');curtain.style.cssText='position:fixed;inset:0;background:#eff6f5f5;z-index:10000;padding:15vh 10vw;font:20px/1.6 sans-serif';
      curtain.innerHTML='<h1>Подготовься к турниру</h1><p>Для отправки алгоритма нужна учётная запись и завершённое обучение.</p><p><a href="portal/account.html">Личный кабинет</a> · <a href="pond-tutor.html">Обучение</a></p>';
      document.body.appendChild(curtain);return;
    }
    unlocked=true;var storageKey='pond-tournament:'+portal.user.id, saved=localStorage.getItem(storageKey);
    if(saved){try{Bm.clear();kd(jd(saved),Bm);}catch(error){report('Сохранённый черновик не удалось открыть.');}}
    window.addEventListener('beforeunload',function(){if(Bm&&!Dm)localStorage.setItem(storageKey,Em());});
    var select=U('tournament-select'),button=U('tournament-submit');
    try{
      var tournaments=(await portal.request('/api/tournaments')).tournaments.filter(function(t){return t.status==='open';});
      tournaments.forEach(function(t){select.add(new Option(t.name,t.id));});
      var requested=new URLSearchParams(location.search).get('tournament');if(requested&&tournaments.some(function(t){return String(t.id)===requested;}))select.value=requested;
      button.disabled=!tournaments.length||!portal.user.team;
      report(!portal.user.team?'Создай команду в личном кабинете или попроси капитана добавить тебя.':!tournaments.length?'Нет открытых турниров. Можно экспериментировать с алгоритмом.':'Команда «'+portal.user.team+'». Испытай алгоритм и отправь его на турнир.');
      button.onclick=async function(){
        button.disabled=true;
        try{
          var xml=Em(),code=Om();localStorage.setItem(storageKey,xml);
          var job=await portal.request('/api/tournament/submit',{tournament_id:Number(select.value),code:code,xml:xml});
          report('Решение отправлено…');var result=await portal.wait(job.id,report);
          report(result.message+(result.position?' Место команды: '+result.position+'.':'')+(result.candidate_position?' Место нового решения: '+result.candidate_position+'.':''));
        }catch(error){report(error.message);}finally{button.disabled=false;}
      };
    }catch(error){report(error.message);}
  });
};
