(async function(){
  'use strict';
  var api=PondPortal,status=document.getElementById('status'),list=document.getElementById('list');
  function message(text){status.textContent=text;status.hidden=!text;}
  await api.ready;
  if(!api.user){status.innerHTML='Для участия и просмотра таблицы <a href="account.html?next=%2Fportal%2Ftournament.html">войди</a> или <a href="account.html?mode=register&amp;next=%2Fportal%2Ftournament.html">создай учётную запись</a>.';status.hidden=false;return;}
  if(!api.user.unlocked)message('Осталось завершить обучение, чтобы отправлять алгоритмы. Пройдено уровней: '+api.user.completed.length+' из 19.');
  else if(!api.user.team){status.innerHTML='Обучение завершено. <a href="account.html">Создай команду в личном кабинете</a> или попроси капитана добавить тебя по логину.';status.hidden=false;}
  else message('Ты выступаешь за команду «'+api.user.team+'». Каждый участник, завершивший обучение, может отправить её новое решение.');
  try{
    var data=await api.request('/api/tournaments');
    if(!data.tournaments.length){list.innerHTML='<div class="empty-state"><strong>Готовимся к новому старту</strong>Администратор скоро сможет открыть первый турнир.</div>';return;}
    data.tournaments.forEach(function(t){
      var card=document.createElement('section');card.className='card tournament-card';
      var top=document.createElement('div');top.className='tournament-top';var info=document.createElement('div');var heading=document.createElement('h2');heading.textContent=t.name;info.appendChild(heading);
      var meta=document.createElement('div');meta.className='tournament-meta';var badge=document.createElement('span');badge.className='pill'+(t.status==='open'?' open':'');badge.textContent=t.status==='open'?'Приём решений открыт':'Турнир закрыт';meta.appendChild(badge);var duration=document.createElement('span');duration.textContent='Бой до '+t.seconds+' с · серия до 2 побед';meta.appendChild(duration);info.appendChild(meta);top.appendChild(info);
      if(t.status==='open'&&api.user.unlocked&&api.user.team){var a=document.createElement('a');a.className='button';a.href='../pond-duck.html?tournament='+t.id;a.textContent='Подготовить алгоритм ↗';top.appendChild(a);}
      card.appendChild(top);var table=document.createElement('div');card.appendChild(table);list.appendChild(card);
      function refresh(){api.table(t.id,table).catch(function(error){message(error.message);});}refresh();setInterval(refresh,5000);
    });
  }catch(error){message(error.message);}
})();
