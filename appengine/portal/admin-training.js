(async function(){
  'use strict';
  var api=PondPortal;
  await api.ready;
  if(!api.user||api.user.role!=='admin')return;
  var panel=document.createElement('section');panel.className='card admin-training';
  panel.innerHTML='<h2>Прогресс обучения</h2><p>Распределение участников по количеству пройденных уровней. Администраторы не учитываются.</p><button id="training-refresh" class="secondary">Обновить</button><p id="training-status" role="status"></p><div id="training-histogram" class="training-histogram" aria-label="Гистограмма прогресса обучения"></div><h3>Допустить участника после обучения</h3><p>Отметка засчитает все уровни, сохранив существующие решения пользователя.</p><label>Поиск по логину<input id="training-search" type="search"></label><div id="training-users" class="table-scroll"></div>';
  document.getElementById('panel').appendChild(panel);
  var users=[],lessons=20;
  function message(text){panel.querySelector('#training-status').textContent=text;}
  function drawUsers(){
    var query=panel.querySelector('#training-search').value.trim().toLocaleLowerCase('ru-RU');
    var table=document.createElement('table'),head=table.insertRow();
    ['Пользователь','Пройдено уровней','Допуск','Действия'].forEach(function(text){var th=document.createElement('th');th.textContent=text;head.appendChild(th);});
    users.filter(function(user){return user.login.toLocaleLowerCase('ru-RU').includes(query);}).forEach(function(user){
      var row=table.insertRow();row.insertCell().textContent=user.login;row.insertCell().textContent=user.completed+' / '+lessons;
      var cell=row.insertCell();
      if(user.role==='admin'){cell.textContent='Администратор';row.insertCell().textContent='Права администратора выданы';return;}
      var actions=row.insertCell(),remove=document.createElement('button');remove.className='quiet danger';remove.textContent='Удалить пользователя';actions.appendChild(remove);
      var promote=document.createElement('button');promote.className='secondary';promote.textContent='Назначить администратором';actions.prepend(promote);
      promote.onclick=async function(){
        if(!confirm('Назначить «'+user.login+'» администратором? Пользователь получит полный доступ к управлению турнирами, алгоритмами и пользователями, включая назначение администраторов.'))return;
        promote.disabled=true;
        try{await api.request('/api/admin/users/'+user.id+'/promote',{login:user.login});await load();message('Пользователь «'+user.login+'» назначен администратором. Доступ откроется после обновления страницы.');}catch(error){message(error.message);}finally{promote.disabled=false;}
      };
      remove.onclick=async function(){
        var login=prompt('Удалить пользователя «'+user.login+'»? Вход и прогресс будут удалены, история боёв и алгоритмы сохранятся. Если пользователь — капитан, команда будет распущена. Для подтверждения введи его логин:');
        if(login===null)return;if(login!==user.login){message('Логин не совпадает. Пользователь не удалён.');return;}
        remove.disabled=true;
        try{await api.request('/api/admin/users/'+user.id+'/delete',{login:login});await load();message('Пользователь «'+user.login+'» удалён. История соревнований сохранена.');}catch(error){message(error.message);}finally{remove.disabled=false;}
      };
      if(user.completed===lessons){cell.textContent='Обучение пройдено';return;}
      var button=document.createElement('button');button.className='secondary';button.textContent='Отметить обучение пройденным';cell.appendChild(button);
      button.onclick=async function(){
        if(!confirm('Засчитать все уровни пользователю «'+user.login+'» и открыть доступ к редактору, песочнице и турнирам?'))return;
        button.disabled=true;
        try{await api.request('/api/admin/users/'+user.id+'/graduate',{});await load();message('Обучение пользователя «'+user.login+'» отмечено пройденным.');}catch(error){message(error.message);}finally{button.disabled=false;}
      };
    });
    panel.querySelector('#training-users').replaceChildren(table);
  }
  async function load(){
    var button=panel.querySelector('#training-refresh');button.disabled=true;
    try{
      var data=await api.request('/api/admin/training');users=data.users;lessons=data.lessons;
      var chart=panel.querySelector('#training-histogram');chart.replaceChildren();var max=Math.max.apply(null,[1].concat(data.histogram));
      data.histogram.forEach(function(count,level){
        var column=document.createElement('div');column.className='training-bin';column.title=level+' уровней: '+count+' участников';column.setAttribute('aria-label',column.title);
        var value=document.createElement('span');value.textContent=count;column.appendChild(value);
        var track=document.createElement('div');track.className='training-bin-track';var bar=document.createElement('div');bar.style.height=(count/max*100)+'%';track.appendChild(bar);column.appendChild(track);
        var label=document.createElement('span');label.textContent=level;column.appendChild(label);chart.appendChild(column);
      });
      drawUsers();
    }catch(error){message(error.message);}finally{button.disabled=false;}
  }
  panel.querySelector('#training-search').oninput=drawUsers;panel.querySelector('#training-refresh').onclick=load;
  load();
})();
