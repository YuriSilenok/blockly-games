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
    var response = await fetch(path, options);
    var data;
    try { data = await response.json(); } catch (e) { throw Error('Сервис учётных записей доступен на силенок.рф.'); }
    if (!response.ok) { if(response.status===401)api.user=null; throw Error(data.error || 'Не удалось выполнить запрос.'); }
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
      var row = table.insertRow();if(api.user&&api.user.team_id===entry.team_id)row.className='my-team';row.insertCell().textContent = String(entry.position).padStart(2,'0');
      row.insertCell().textContent = entry.team;
    });
    target.appendChild(table);
    if (!data.standings.length) { var p = document.createElement('p');p.className='empty-state';p.textContent = 'Первое место пока свободно. Отправьте алгоритм команды, чтобы открыть таблицу.'; target.appendChild(p); }
  };
})();
