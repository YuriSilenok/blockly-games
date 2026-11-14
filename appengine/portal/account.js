(async function () {
  var api = PondPortal, status = document.getElementById('status');
  await api.ready;
  function render() {
    document.getElementById('auth').hidden = !!api.user || !api.online;
    document.getElementById('profile').hidden = !api.user;
    if (!api.online) { status.textContent = 'Учётные записи доступны на силенок.рф.'; return; }
    if (!api.user) return;
    document.getElementById('name').textContent = api.user.login;
    document.getElementById('progress').textContent = 'Пройдено уровней: ' + api.user.completed.length + ' из 15.' + (api.user.unlocked ? ' Доступ к турниру открыт.' : ' Заверши обучение, чтобы открыть турнир.');
    document.querySelector('#team input').value = api.user.team || '';
    document.getElementById('admin').hidden = api.user.role !== 'admin';
    var nextLevel=1;while(nextLevel<=15&&api.user.completed.indexOf(nextLevel)!==-1)nextLevel++;
    document.querySelector('#profile a.button').href='../pond-tutor.html?level='+Math.min(15,nextLevel);
  }
  ['login','register'].forEach(function (kind) {
    document.getElementById(kind).onsubmit = async function (event) {
      event.preventDefault(); var button = this.querySelector('button'); button.disabled = true;
      try {
        await api.request('/api/' + kind, Object.fromEntries(new FormData(this)));
        await api.refresh(); render(); status.textContent = '';
        var next = new URLSearchParams(location.search).get('next');
        if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) location.assign(next);
      } catch (error) { status.textContent = error.message; }
      finally { button.disabled = false; }
    };
  });
  document.getElementById('team').onsubmit = async function (event) {
    event.preventDefault();
    try { await api.request('/api/profile', Object.fromEntries(new FormData(this))); await api.refresh(); render(); status.textContent = 'Название команды сохранено.'; }
    catch (error) { status.textContent = error.message; }
  };
  document.getElementById('logout').onclick = async function () {
    try { await api.request('/api/logout', {}); await api.refresh(); render(); } catch (error) { status.textContent = error.message; }
  };
  render();
})();
