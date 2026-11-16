(async function () {
  var api = PondPortal, status = document.getElementById('status'), tournaments = [], select = document.getElementById('tournaments');
  await api.ready;
  if (!api.user || api.user.role !== 'admin') { status.hidden=false;status.innerHTML = 'Нужен <a href="/account?next=/admin">вход администратора</a>.'; return; }
  document.getElementById('panel').hidden = false;
  async function load() {
    var old = select.value; tournaments = (await api.request('/api/tournaments')).tournaments; select.replaceChildren();
    tournaments.forEach(function (t) { select.add(new Option(t.name, t.id)); }); if (old) select.value = old;
    if (!select.value && tournaments.length) select.selectedIndex = 0;
    await table();
  }
  async function table() {
    var t = tournaments.find(function (t) { return String(t.id) === select.value; });
    document.getElementById('toggle').disabled = !t;
    if (!t) return;
    document.getElementById('toggle').textContent = t.status === 'open' ? 'Закрыть приём решений' : 'Открыть приём решений';
    await api.table(t.id, document.getElementById('standings'));
  }
  select.onchange = function () { table().catch(fail); };
  document.getElementById('create').onsubmit = async function (event) {
    event.preventDefault(); var button = this.querySelector('button'); button.disabled = true;
    try { await api.request('/api/admin/tournaments', Object.fromEntries(new FormData(this))); await load(); status.textContent = 'Турнир создан.';status.hidden=false; } catch (error) { fail(error); }
    finally { button.disabled = false; }
  };
  document.getElementById('toggle').onclick = async function () {
    var t = tournaments.find(function (t) { return String(t.id) === select.value; });
    try { await api.request('/api/admin/tournaments/' + t.id + '/status', {status: t.status === 'open' ? 'closed' : 'open'}); await load(); } catch (error) { fail(error); }
  };
  function fail(error) { status.textContent = error.message;status.hidden=false; }
  var canvas = document.getElementById('pond'), ctx = canvas.getContext('2d'), colors = ['#fff394','#e87979','#79cf92','#414c64'];
  async function live() {
    try {
      var data = await api.request('/api/admin/live'); var m = data.match, frame = m && m.snapshot;
      document.getElementById('queue').textContent = 'Решений в работе и очереди: ' + data.waiting;
      document.getElementById('battle').textContent = m ? m.title + (frame ? ' · ' + frame.time.toFixed(1) + ' с' : '') + (m.status === 'running' ? '' : ' · завершён') : 'Ожидание решений';
      ctx.fillStyle = '#7cb8da'; ctx.fillRect(0,0,500,500); ctx.strokeStyle = '#ffffff55';
      for (var i=0;i<=10;i++) { ctx.beginPath(); ctx.moveTo(i*50,0);ctx.lineTo(i*50,500);ctx.moveTo(0,i*50);ctx.lineTo(500,i*50);ctx.stroke(); }
      if (frame) {
        frame.avatars.forEach(function (a,i) {ctx.globalAlpha=a.dead ? .3 : 1;ctx.fillStyle=colors[i%4];ctx.beginPath();ctx.arc(a.x*5,500-a.y*5,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#263645';ctx.font='14px sans-serif';ctx.fillText(String(i+1),a.x*5-4,500-a.y*5+5);ctx.globalAlpha=1;});
        ctx.fillStyle='#ffedab';frame.missiles.forEach(function (p) {ctx.beginPath();ctx.arc(p.x*5,500-p.y*5,4,0,Math.PI*2);ctx.fill();});
        document.getElementById('ducks').textContent=frame.avatars.map(function(a,i){return(i+1)+'. '+a.name+' — '+Math.round(a.health)+'%';}).join(' · ');
      }
    } catch (error) { fail(error); }
    setTimeout(live,250);
  }
  try { await load(); live(); setInterval(function(){table().catch(fail);},3000); } catch (error) { fail(error); }
})();
