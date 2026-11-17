(async function(){
  'use strict';
  var api=PondPortal,status=document.getElementById('status'),list=document.getElementById('list');
  function message(text){status.textContent=text;status.hidden=!text;}
  await api.ready;
  if(!api.user){location.replace('account.html?next=%2Fportal%2Ftournament.html');return;}
  if(!api.user.unlocked&&api.user.role!=='admin'){location.replace('account.html?training_required=1');return;}
  async function load(){
    await api.refresh();
    var team=(await api.request('/api/team')).team;
    document.getElementById('team-registration').hidden=!!team;
    document.getElementById('team-ready').hidden=!team;
    if(team){document.getElementById('team-title').textContent='Команда «'+team.name+'»';document.getElementById('team-members').textContent=team.members.map(function(m){return m.login;}).join(', ')+(team.invitations.length?' · приглашений ожидают: '+team.invitations.length:'');}
    var tournaments=(await api.request('/api/tournaments')).tournaments;list.replaceChildren();
    if(!tournaments.length){var empty=document.createElement('p');empty.className='empty-state';empty.textContent='Турниров пока нет. Можно готовить алгоритмы в тренировочном пруду.';list.appendChild(empty);}
    for(var t of tournaments){
      var data=await api.request('/api/arena/tournaments/'+t.id),card=document.createElement('section');card.className='card';
      var heading=document.createElement('h2');heading.textContent=t.name;card.appendChild(heading);
      var state=document.createElement('p');state.className='pill';state.textContent=t.status==='open'?'Приём алгоритмов открыт':t.status==='finished'?'Турнир завершён':'Приём алгоритмов закрыт';card.appendChild(state);
      if(team){
        if(t.status==='open'){var link=document.createElement('a');link.className='button secondary';link.href='../pond-duck.html?tournament='+t.id;link.textContent='Подготовить и заявить алгоритм';card.appendChild(link);}
        var title=document.createElement('h3');title.textContent='Алгоритмы команды';card.appendChild(title);
        var table=document.createElement('table'),head=table.insertRow();['Название','Автор','Доступен для тренировок','Основной'].forEach(function(label){var th=document.createElement('th');th.textContent=label;head.appendChild(th);});
        data.algorithms.forEach(function(a){var row=table.insertRow();row.insertCell().textContent=a.name;row.insertCell().textContent=a.author;['shared','is_main'].forEach(function(flag){var cell=row.insertCell(),box=document.createElement('input');box.type='checkbox';box.checked=!!a[flag];box.disabled=t.status==='finished';box.setAttribute('aria-label',(flag==='shared'?'Доступен для тренировок: ':'Основной: ')+a.name);box.onchange=async function(){box.disabled=true;try{var value={};value[flag]=box.checked;await api.request('/api/arena/submissions/'+a.id+'/flags',value);await load();}catch(error){box.checked=!box.checked;box.disabled=false;message(error.message);}};cell.appendChild(box);});});
        card.appendChild(table);if(!data.algorithms.length){var no=document.createElement('p');no.textContent='Заявленных алгоритмов пока нет.';card.appendChild(no);}
      }
      var report=document.createElement('div');report.dataset.tournamentReport=String(t.id);api.roundReport(data.rounds,report);card.appendChild(report);list.appendChild(card);
    }
  }
  document.getElementById('team-form').onsubmit=async function(event){event.preventDefault();var button=this.querySelector('button');button.disabled=true;try{var value=Object.fromEntries(new FormData(this));await api.request('/api/team/create',{name:value.name,members:[value.member1,value.member2].filter(function(s){return s.trim();})});await load();message('Команда создана. Приглашённые игроки должны подтвердить участие в личном кабинете.');}catch(error){message(error.message);}finally{button.disabled=false;}};
  try{await load();}catch(error){message(error.message);}
  setInterval(async function(){try{for(var target of document.querySelectorAll('[data-tournament-report]')){var data=await api.request('/api/arena/tournaments/'+target.dataset.tournamentReport);api.roundReport(data.rounds,target);}}catch(error){message(error.message);}},5000);
})();
