(async function () {
  var api = PondPortal, status = document.getElementById('status');
  await api.ready;
  if (!api.user || api.user.role !== 'admin') return;
  document.getElementById('panel').hidden = false;
  var libraryPanel=document.createElement('section');libraryPanel.className='card admin-algorithms';
  libraryPanel.innerHTML='<h2>Все алгоритмы</h2><p>Сохранённые алгоритмы всех пользователей, включая архивные. Просмотр не изменяет библиотеку и заявки.</p><label>Поиск по названию или автору<input id="admin-algorithm-search" type="search" placeholder="Название или логин"></label><button id="admin-algorithms-refresh" class="secondary">Обновить список</button><p id="admin-algorithms-count" role="status"></p><div id="admin-algorithms-list" class="table-scroll"></div>';
  document.getElementById('panel').appendChild(libraryPanel);
  var allAlgorithms=[];
  function algorithmList(){
    var query=document.getElementById('admin-algorithm-search').value.trim().toLocaleLowerCase('ru-RU');
    var rows=allAlgorithms.filter(function(a){return (a.name+' '+a.author).toLocaleLowerCase('ru-RU').includes(query);});
    document.getElementById('admin-algorithms-count').textContent='Найдено: '+rows.length+' из '+allAlgorithms.length;
    var grid=document.createElement('table'),head=grid.insertRow();
    ['Название','Автор','Сохранён','Статус','Действия'].forEach(function(label){var cell=document.createElement('th');cell.textContent=label;head.appendChild(cell);});
    rows.forEach(function(a){
      var row=grid.insertRow();[a.name,a.author,new Date(a.updated*1000).toLocaleString('ru-RU'),a.archived?'Архивный':'В библиотеке'].forEach(function(text){row.insertCell().textContent=text;});
      var button=document.createElement('button');button.className='secondary';button.textContent='Открыть';row.insertCell().appendChild(button);
      button.onclick=function(){location.assign('/pond-duck.html?admin_algorithm='+a.id);};
      var rename=document.createElement('button');rename.className='secondary';rename.textContent='Переименовать';row.cells[4].appendChild(rename);
      rename.onclick=async function(){
        var name=prompt('Новое название стратегии пользователя '+a.author+' (от 1 до 80 символов):',a.name);
        if(name===null)return;name=name.trim();
        if(!name||name.length>80){fail(Error('Укажи название алгоритма: от 1 до 80 символов.'));return;}
        if(name===a.name)return;rename.disabled=true;
        try{await api.request('/api/admin/algorithms/'+a.id+'/rename',{name:name});await loadAlgorithms();status.textContent='Стратегия переименована. Код и история боёв сохранены.';status.hidden=false;}
        catch(error){fail(error);}finally{rename.disabled=false;}
      };
    });
    document.getElementById('admin-algorithms-list').replaceChildren(grid);
  }
  async function loadAlgorithms(){var button=document.getElementById('admin-algorithms-refresh');button.disabled=true;try{allAlgorithms=(await api.request('/api/admin/algorithms')).algorithms;algorithmList();}catch(error){fail(error);}finally{button.disabled=false;}}
  document.getElementById('admin-algorithm-search').oninput=algorithmList;
  document.getElementById('admin-algorithms-refresh').onclick=loadAlgorithms;
  loadAlgorithms();
  function fail(error){status.textContent=error.message;status.hidden=false;}
})();
