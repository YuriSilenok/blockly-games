(async function(){
  'use strict';
  var navigation=document.getElementById('admin-navigation');
  [['admin.html','Обзор'],['admin-tournaments.html','Турниры'],['admin-algorithms.html','Алгоритмы'],['admin-training.html','Обучение и допуск']].forEach(function(item){
    var link=document.createElement('a');link.href=item[0];link.textContent=item[1];
    if(location.pathname.endsWith('/'+item[0]))link.setAttribute('aria-current','page');
    navigation.appendChild(link);
  });
  await PondPortal.ready;
  if(!PondPortal.user||PondPortal.user.role!=='admin'){
    var status=document.getElementById('status');status.hidden=false;status.textContent='Раздел доступен только администратору. ';
    var login=document.createElement('a');login.href='/account?next='+encodeURIComponent(location.pathname);login.textContent='Войти в учётную запись';status.appendChild(login);return;
  }
  document.getElementById('panel').hidden=false;
})();
