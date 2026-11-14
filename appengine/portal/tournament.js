(async function () {
  var api = PondPortal, status = document.getElementById('status'); await api.ready;
  if (!api.user) { status.innerHTML = 'Для участия и просмотра таблицы <a href="/account?next=/tournament">войди в учётную запись</a>.'; return; }
  if (!api.user.unlocked) status.textContent = 'Для отправки алгоритма заверши все 15 уровней обучения.';
  else if (!api.user.team) status.innerHTML = 'Укажи <a href="/account">название команды</a>, чтобы отправить алгоритм.';
  try {
    var data = await api.request('/api/tournaments');
    if (!data.tournaments.length) status.textContent += ' Турниры пока не созданы.';
    data.tournaments.forEach(function (t) {
      var card = document.createElement('section'); card.className = 'card';
      var heading = document.createElement('h2'); heading.textContent = t.name; card.appendChild(heading);
      var p = document.createElement('p'); p.textContent = (t.status === 'open' ? 'Приём решений открыт' : 'Приём решений закрыт') + ' · бой до ' + t.seconds + ' с'; card.appendChild(p);
      if (t.status === 'open' && api.user.unlocked && api.user.team) { var a = document.createElement('a'); a.className = 'button'; a.href = '/pond-duck.html?tournament=' + t.id; a.textContent = 'Подготовить алгоритм'; card.appendChild(a); }
      var table = document.createElement('div'); card.appendChild(table); document.getElementById('list').appendChild(card);
      function refresh() { api.table(t.id, table).catch(function (error) { status.textContent = error.message; }); }
      refresh(); setInterval(refresh, 5000);
    });
  } catch (error) { status.textContent = error.message; }
})();
