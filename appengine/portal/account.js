(async function () {
  'use strict';
  var api=PondPortal, status=document.getElementById('status'), team=null;
  function notify(message){status.textContent=message;status.hidden=!message;}
  function tab(kind){['login','register'].forEach(function(name){document.getElementById(name).hidden=name!==kind;document.getElementById('tab-'+name).setAttribute('aria-selected',String(name===kind));});}
  ['login','register'].forEach(function(kind){document.getElementById('tab-'+kind).onclick=function(){tab(kind);notify('');};});
  tab(new URLSearchParams(location.search).get('mode')==='register'?'register':'login');
  async function render(){
    document.getElementById('auth').hidden=!!api.user||!api.online;
    document.getElementById('profile').hidden=!api.user;
    if(!api.online){status.replaceChildren();var link=document.createElement('a');link.href='https://xn--e1afhclgq.xn--p1ai/portal/account.html';link.textContent='Открыть регистрацию и вход на силенок.рф →';status.appendChild(link);status.hidden=false;return;}
    if(!api.user){document.getElementById('page-title').textContent='Каждое открытие начинается с тебя.';return;}
    document.getElementById('page-title').textContent='Привет, '+api.user.login+'.';
    document.getElementById('page-description').textContent='Твои эксперименты, команда и следующий шаг — всё здесь.';
    document.getElementById('name').textContent='Выполнен вход: '+api.user.login;
    document.getElementById('progress').textContent=api.user.unlocked?'Обучение завершено. Собери команду и испытай свою стратегию в турнире.':'Пройдено уровней: '+api.user.completed.length+' из 19. Продолжай исследовать, чтобы открыть турнир.';
    document.getElementById('progress-count').textContent=api.user.completed.length+' / 19';
    document.getElementById('learning-progress').value=api.user.completed.length;
    document.getElementById('admin').hidden=api.user.role!=='admin';
    var next=1;while(next<=19&&api.user.completed.includes(next))next++;
    document.getElementById('continue').href=api.user.unlocked?'tournament.html':'../pond-tutor.html?level='+Math.min(19,next);
    document.getElementById('continue').textContent=api.user.unlocked?'Открыть турниры ↗':'Продолжить обучение ↗';
    var teamData=await api.request('/api/team');team=teamData.team;renderTeam();renderInvitations(teamData.invitations||[]);
    if(new URLSearchParams(location.search).has('training_required'))notify('Доступ к турнирам откроется после завершения всех уровней обучения.');
  }
  function renderInvitations(items){
    var panel=document.getElementById('team-invitations');
    if(!panel){panel=document.createElement('section');panel.id='team-invitations';panel.className='card';document.getElementById('security').before(panel);}
    panel.replaceChildren();panel.hidden=!items.length;if(!items.length)return;
    var heading=document.createElement('h2');heading.textContent='Приглашения в команды';panel.appendChild(heading);
    items.forEach(function(invitation){var row=document.createElement('p');row.textContent='Команда «'+invitation.team+'», капитан '+invitation.captain+' ';['accept','decline'].forEach(function(action){var button=document.createElement('button');button.textContent=action==='accept'?'Присоединиться':'Отклонить';button.className='secondary';button.onclick=function(){mutate(action,{invitation_id:invitation.id},button);};row.appendChild(button);});panel.appendChild(row);});
  }
  function renderTeam(){
    document.getElementById('create-team').hidden=!!team;document.getElementById('team-current').hidden=!team;
    document.getElementById('team-size').textContent=team?team.members.length+' / 3 участника':'1–3 игрока';
    if(!team)return;
    var captain=team.captain_id===api.user.id;
    document.getElementById('team-name').textContent=team.name;
    document.getElementById('team-role').textContent=captain?'Ты капитан: управляй составом и названием команды.':'Ты участник команды. После обучения можешь отправлять её алгоритмы.';
    document.getElementById('captain-controls').hidden=!captain;document.getElementById('leave-team').hidden=captain;
    var dissolve=document.getElementById('dissolve-team');if(!dissolve){dissolve=document.createElement('button');dissolve.id='dissolve-team';dissolve.className='quiet danger';dissolve.textContent='Распустить команду';dissolve.onclick=function(){if(confirm('Распустить команду? Личные алгоритмы и история турниров сохранятся.'))mutate('dissolve',{},dissolve);};document.getElementById('captain-controls').appendChild(dissolve);}
    document.querySelector('#rename-team input').value=team.name;
    var members=document.getElementById('members');members.replaceChildren();
    team.members.forEach(function(member){
      var row=document.createElement('li'),avatar=document.createElement('span');avatar.className='member-avatar';avatar.textContent=member.login.slice(0,1).toUpperCase();row.appendChild(avatar);
      var info=document.createElement('span');info.className='member-info';var name=document.createElement('strong');name.textContent=member.login+(member.id===api.user.id?' · ты':'');info.appendChild(name);var role=document.createElement('small');role.textContent=member.id===team.captain_id?'Капитан':'Участник';info.appendChild(role);row.appendChild(info);
      if(captain&&member.id!==api.user.id){var remove=document.createElement('button');remove.type='button';remove.className='quiet danger';remove.textContent='Исключить';remove.onclick=function(){if(confirm('Исключить '+member.login+' из команды?'))mutate('remove',{user_id:member.id},remove);};row.appendChild(remove);}members.appendChild(row);
    });
    (team.invitations||[]).forEach(function(invitation){var row=document.createElement('li');row.textContent=invitation.login+' · ожидает подтверждения ';if(captain){var cancel=document.createElement('button');cancel.className='quiet';cancel.textContent='Отозвать';cancel.onclick=function(){mutate('cancel',{invitation_id:invitation.id},cancel);};row.appendChild(cancel);}members.appendChild(row);});
    document.querySelector('#add-member button').disabled=team.members.length+(team.invitations||[]).length>=3;
    document.getElementById('member-hint').textContent=team.members.length>=3?'Команда в полном составе.':'Приглашённый игрок должен подтвердить участие в своём личном кабинете.';
  }
  async function mutate(action,value,button){
    button.disabled=true;
    try{await api.request('/api/team/'+action,value);await api.refresh();await render();notify('Изменения команды сохранены.');}
    catch(error){notify(error.message);}
    finally{button.disabled=false;if(team&&team.members.length+(team.invitations||[]).length>=3)document.querySelector('#add-member button').disabled=true;}
  }
  ['login','register'].forEach(function(kind){
    document.getElementById(kind).onsubmit=async function(event){
      event.preventDefault();var button=this.querySelector('button');button.disabled=true;notify('');
      try{
        var value=Object.fromEntries(new FormData(this));
        if(kind==='register'&&value.password!==value.confirm_password)throw Error('Пароли не совпадают.');
        await api.request('/api/'+kind,value);this.reset();await api.refresh();
        var next=new URLSearchParams(location.search).get('next');
        if(next){var destination=new URL(next,location.origin);if(destination.origin===location.origin){location.assign(destination.href);return;}}
        await render();
      }catch(error){notify(error.message);}finally{button.disabled=false;}
    };
  });
  ['create','rename','add'].forEach(function(action){var form=document.getElementById(action==='create'?'create-team':action==='rename'?'rename-team':'add-member');form.onsubmit=function(event){event.preventDefault();mutate(action,Object.fromEntries(new FormData(form)),form.querySelector('button'));};});
  document.getElementById('leave-team').onclick=function(){if(confirm('Выйти из команды? Личные алгоритмы и история турниров сохранятся.'))mutate('leave',{},this);};
  document.getElementById('password').onsubmit=async function(event){
    event.preventDefault();var button=this.querySelector('button'),output=document.getElementById('password-status');button.disabled=true;output.textContent='';
    try{var value=Object.fromEntries(new FormData(this));if(value.new_password!==value.confirm_password)throw Error('Новые пароли не совпадают.');await api.request('/api/password',value);this.reset();await api.refresh();output.textContent='Пароль изменён. На этом устройстве вход сохранён.';}catch(error){output.textContent=error.message;}finally{button.disabled=false;}
  };
  document.getElementById('logout').onclick=async function(){try{await api.request('/api/logout',{});document.querySelectorAll('form').forEach(function(form){form.reset();});await api.refresh();notify('');await render();window.scrollTo({top:0,behavior:'smooth'});}catch(error){notify(error.message);}};
  await api.ready;try{await render();}catch(error){notify(error.message);}
})();
