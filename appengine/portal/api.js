(function () {
  'use strict';
  var api = window.PondPortal = {user: null, online: false};
  api.request = async function (path, value) {
    var options = {credentials: 'same-origin', headers: {}};
    if (value !== undefined) {
      options.method = 'POST';
      options.headers['Content-Type'] = 'application/json';
      options.headers['X-CSRF-Token'] = api.user ? api.user.csrf : '';
      options.body = JSON.stringify(value);
    }
    var response = await fetch(path, options);
    var data;
    try { data = await response.json(); } catch (e) { throw Error('Сервис учётных записей доступен на силенок.рф.'); }
    if (!response.ok) throw Error(data.error || 'Не удалось выполнить запрос.');
    return data;
  };
  api.refresh = async function () {
    var data = await api.request('/api/me');
    api.user = data.user; api.online = true;
    return api.user;
  };
  api.ready = api.refresh().catch(function () { return null; });
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
      var row = table.insertRow(); row.insertCell().textContent = entry.position;
      row.insertCell().textContent = entry.team;
    });
    target.appendChild(table);
    if (!data.standings.length) { var p = document.createElement('p'); p.textContent = 'Пока нет участников.'; target.appendChild(p); }
  };
})();
