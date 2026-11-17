window.installTournamentEditor=function(){
  'use strict';
  PondRussian.catalogues();
  var appendField=P,jsonInit=wi;
  P=function(input,label,name){return appendField(input,PondRussian.label(label),name);};
  wi=function(block,definition){return jsonInit(block,PondRussian.definition(definition));};
  var drawArena=Mn;Mn=function(){drawArena();PondHealth.update(Z.pb,'cd','dv');};
  Hn.addEventListener('load',function(){if(Cn&&Dn&&Z.pb.length)Mn();});
  var portal=PondPortal,unlocked=false,originalHTML=Jo,library={owned:[],available:[]},selectedAlgorithm=null,storageKey;
  Jo=function(){
    var box=document.createElement('div');box.innerHTML=originalHTML();
    PondToolbox.complete(box.querySelector('#toolbox'));
    ['languageMenu','linkButton'].forEach(function(id){var e=box.querySelector('#'+id);if(e)e.remove();});
    box.querySelector('#header_cta').insertAdjacentHTML('beforeend',' <a href="portal/account.html">Личный кабинет</a> <a href="portal/tournament.html">Турниры и алгоритмы команды</a>');
    box.querySelector('#visualization').insertAdjacentHTML('afterend','<div id="course-feedback"><div id="course-status" role="status">Загружаем учётную запись…</div><div id="arena-tools"><details open><summary>Мои алгоритмы</summary><form id="algorithm-save"><label>Название алгоритма<input id="algorithm-name" required maxlength="80"></label><button>Сохранить в системе</button></form><label>Сохранённый алгоритм<select id="algorithm-library"></select></label><button id="algorithm-load" type="button">Загрузить в редактор</button></details><details open><summary>Тренировочный пруд</summary><label>Количество противников<select id="opponent-count"></select></label><div id="duck-assignments"></div><p>Для своей утки можно выбрать текущие блоки, сохранённый алгоритм или оставить её без алгоритма. Чужие алгоритмы доступны, если автор разрешил тренировки.</p></details><details open><summary>Заявка на турнир</summary><label>Турнир<select id="tournament-select"></select></label><label>Отправляемый алгоритм<select id="tournament-algorithm"></select></label><label><input id="algorithm-shared" type="checkbox"> Разрешить другим командам использовать алгоритм для тренировок</label><label><input id="algorithm-main" type="checkbox" checked> Основной алгоритм команды</label><button id="tournament-submit" type="button">Заявить сохранённый алгоритм</button><p><a href="portal/tournament.html">Изменить основной алгоритм и доступность заявок →</a></p></details></div></div>');
    var tools=box.querySelector('#arena-tools');
    tools.setAttribute('aria-label','Настройки турнирного редактора');
    Array.from(tools.querySelectorAll('details')).forEach(function(menu,index){
      menu.removeAttribute('open');var summary=menu.querySelector('summary');
      if(index===2)summary.textContent='Заявки на турнир';
      var panel=document.createElement('div');panel.className='arena-menu-panel';
      Array.from(menu.childNodes).forEach(function(node){if(node!==summary)panel.appendChild(node);});menu.appendChild(panel);
    });
    box.querySelector('#header_cta').prepend(tools);
    PondFeedback.place(box);return box.innerHTML;
  };
  var originalTab=Po;Po=function(mode){if(mode===0)originalTab(0);};Qo=function(){};
  // The arena assignments control opponents; native stat-row clicks must not open their source.
  var originalAvatarSelect=No;No=function(){if(!unlocked)return originalAvatarSelect();U('avatar-select').selectedIndex=0;};
  var saveAvatar=$n,suppressSave=false;$n=function(){if(!suppressSave)saveAvatar();};
  function report(message,kind){PondFeedback.show(message,kind);}
  var resetBattle=Z.reset,updateBattle=Z.update,lastDamageAt=Date.now(),previousDamage=[];
  Z.reset=function(){resetBattle();lastDamageAt=Date.now();previousDamage=Z.pb.map(function(a){return a.cd;});};
  Z.update=function(){
    var damage=Z.pb.map(function(a){return a.cd;});
    if(damage.some(function(value,index){return value>(previousDamage[index]||0);}))lastDamageAt=Date.now();
    previousDamage=damage;
    if(Z.pb.filter(function(a){return !a.vd;}).length>1&&Date.now()-lastDamageAt>=60000){Z.stop();report('Тренировочный бой завершён: минуту никто не получал урон.');return;}
    updateBattle();
  };
  function loadBlocks(xml){Bm.clear();kd(jd(xml),Bm);Oo(false);Po(0);}
  function refOptions(select,own){
    select.replaceChildren();select.add(new Option(own?'Текущие блоки в редакторе':'Без алгоритма',own?'current':'none'));
    if(own)select.add(new Option('Без алгоритма','none'));
    library.owned.forEach(function(a){select.add(new Option(a.name+' · мой','owned:'+a.id));});
    library.available.forEach(function(a){select.add(new Option(a.name+' · '+a.author+' / '+a.team,'shared:'+a.id));});
  }
  function assignments(){
    var container=U('duck-assignments'),old=Array.from(container.querySelectorAll('select')).map(function(s){return s.value;});container.replaceChildren();
    for(var i=0;i<=Number(U('opponent-count').value);i++){
      var label=document.createElement('label');label.textContent=i?'Противник '+i:'Моя утка';var select=document.createElement('select');select.dataset.duck=String(i);refOptions(select,i===0);if(old[i]&&Array.from(select.options).some(function(o){return o.value===old[i];}))select.value=old[i];label.appendChild(select);container.appendChild(label);
    }
  }
  async function refreshLibrary(preferred){
    library=await portal.request('/api/arena/algorithms');var select=U('algorithm-library'),old=preferred||select.value;select.replaceChildren();select.add(new Option('Выбери свой алгоритм',''));
    library.owned.forEach(function(a){select.add(new Option(a.name,a.id));});if(old)select.value=old;selectedAlgorithm=select.value?Number(select.value):null;
    var submission=U('tournament-algorithm'),previous=submission.value;submission.replaceChildren();submission.add(new Option('Выбери алгоритм для заявки',''));
    var teamAlgorithms=portal.user.captain_id===portal.user.id?(library.team||library.owned):[];
    teamAlgorithms.forEach(function(a){submission.add(new Option(a.name+(a.author?' · '+a.author:''),a.id));});if(previous)submission.value=previous;submission.disabled=portal.user.captain_id!==portal.user.id;assignments();
  }
  async function resolved(reference){
    if(reference==='current')return {name:'Моя утка',code:Om(),xml:Em()};
    if(reference==='none')return {name:'Без алгоритма',code:'',xml:'<xml></xml>'};
    var parts=reference.split(':');return (await portal.request('/api/arena/algorithms/'+parts[0]+'/'+parts[1])).algorithm;
  }
  async function prepareArena(preview){
    var selectors=Array.from(U('duck-assignments').querySelectorAll('select'));
    var ducks=await Promise.all(selectors.map(function(s){return preview?Promise.resolve({name:s.dataset.duck==='0'?'Моя утка':'Противник '+s.dataset.duck,code:'',xml:'<xml></xml>'}):resolved(s.value);}));
    var points=[];for(var x of [10,30,50,70,90])for(var y of [10,30,50,70,90])points.push([x,y]);
    for(var i=points.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),temp=points[i];points[i]=points[j];points[j]=temp;}
    clearTimeout(Z.vr);Z.reset();Z.pb.length=0;var nativeSelect=U('avatar-select');nativeSelect.replaceChildren();
    ducks.forEach(function(a,index){var avatar=new yn((index?'Противник '+index:'Моя утка')+' · '+a.name,new r(points[index][0],points[index][1]),index===0);zn(avatar,index===0?Em():a.xml,undefined,a.code);nativeSelect.add(new Option(avatar.name,String(index)));});
    Yn=Z.pb[0];nativeSelect.selectedIndex=0;Z.reset();Ln();Mn();
  }
  var originalRun=Un,preparing=false;Un=async function(event){
    if(!unlocked){report('Сначала заверши обучение и создай команду.','error');return;}
    if(preparing)return;preparing=true;U('runButton').disabled=true;
    try{
      await portal.refresh();if(!portal.user||!portal.user.team_id||(!portal.user.unlocked&&portal.user.role!=='admin')){location.assign('portal/tournament.html');return;}
      await PondFeedback.ready;if(document.querySelector('#duck-assignments select').value==='current'){var issues=PondFeedback.validate(Em());if(issues.length){PondFeedback.issues(issues);return;}}
      await prepareArena(false);suppressSave=true;try{originalRun(event);}finally{suppressSave=false;}report('Тренировочный бой запущен.');
    }catch(error){report(['TypeError','ReferenceError','SyntaxError','RangeError'].includes(error.name)?PondFeedback.runtime(error):error.message,'error');}finally{preparing=false;U('runButton').disabled=false;}
  };
  var initializeAvatar=yn.prototype.nn;yn.prototype.nn=function(){
    try{initializeAvatar.call(this);}catch(error){report(PondFeedback.runtime(error),'error');throw error;}
    var step=this.Dq.step;this.Dq.step=function(){try{return step.apply(this,arguments);}catch(error){report(PondFeedback.runtime(error),'error');throw error;}};
  };
  portal.onLoad(async function(){
    var tools=U('arena-tools'),menus=Array.from(tools.querySelectorAll('details'));
    menus.forEach(function(menu){menu.addEventListener('toggle',function(){if(menu.open){menus.forEach(function(other){if(other!==menu)other.open=false;});if(unlocked&&menu.querySelector('#tournament-algorithm'))refreshLibrary().catch(function(error){report(error.message,'error');});}});});
    document.addEventListener('click',function(event){if(!tools.contains(event.target))menus.forEach(function(menu){menu.open=false;});});
    document.addEventListener('keydown',function(event){if(event.key==='Escape')menus.forEach(function(menu){if(menu.open){menu.open=false;menu.querySelector('summary').focus();}});});
    document.title='Редактор и тренировочный пруд';U('avatar-select').style.display='none';await portal.ready;
    if(!portal.user){portal.signIn();return;}
    if((!portal.user.unlocked&&portal.user.role!=='admin')||!portal.user.team_id){location.replace('portal/tournament.html');return;}
    unlocked=true;storageKey='pond-tournament:'+portal.user.id;
    var saved=localStorage.getItem(storageKey);if(saved){try{loadBlocks(saved);}catch(error){report('Черновик не удалось открыть.','error');}}
    window.addEventListener('beforeunload',function(){if(Bm&&!Dm)localStorage.setItem(storageKey,Em());});
    for(var n=1;n<=3;n++)U('opponent-count').add(new Option(String(n),String(n)));U('opponent-count').value='3';
    U('opponent-count').onchange=async function(){assignments();Vn();await prepareArena(true);};
    U('algorithm-library').onchange=function(){selectedAlgorithm=this.value?Number(this.value):null;};
    U('algorithm-load').onclick=async function(){try{if(!selectedAlgorithm)throw Error('Выбери сохранённый алгоритм.');var a=await resolved('owned:'+selectedAlgorithm);loadBlocks(a.xml);U('algorithm-name').value=a.name;document.querySelector('#duck-assignments select').value='current';report('Алгоритм «'+a.name+'» загружен.');}catch(error){report(error.message,'error');}};
    U('algorithm-save').onsubmit=async function(event){event.preventDefault();var button=this.querySelector('button');button.disabled=true;try{await PondFeedback.ready;var xml=Em(),issues=PondFeedback.validate(xml);if(issues.length){PondFeedback.issues(issues);return;}var result=await portal.request('/api/arena/algorithms/save',{name:U('algorithm-name').value,xml:xml,code:Om()});localStorage.setItem(storageKey,xml);await refreshLibrary(String(result.id));report(result.replaced?'Алгоритм перезаписан. Дубликаты этого названия удалены из библиотеки.':'Алгоритм сохранён в личной библиотеке.','success');}catch(error){report(error.message,'error');}finally{button.disabled=false;}};
    try{
      await refreshLibrary();await prepareArena(true);
      var tournaments=(await portal.request('/api/tournaments')).tournaments.filter(function(t){return t.status==='open';}),select=U('tournament-select');
      tournaments.forEach(function(t){select.add(new Option(t.name,t.id));});var requested=new URLSearchParams(location.search).get('tournament');if(requested&&tournaments.some(function(t){return String(t.id)===requested;}))select.value=requested;
      U('tournament-submit').disabled=!tournaments.length||portal.user.captain_id!==portal.user.id;
      if(portal.user.captain_id!==portal.user.id){var notice=document.createElement('p');notice.textContent='Отправлять алгоритмы на турнир может только капитан команды.';U('tournament-submit').after(notice);}
      U('tournament-submit').onclick=async function(){var button=this;button.disabled=true;try{var algorithmId=Number(U('tournament-algorithm').value);if(!algorithmId)throw Error('Выбери отправляемый алгоритм участника команды. Если список пуст, участникам нужно сохранить алгоритм в личной библиотеке.');await portal.request('/api/arena/submit',{tournament_id:Number(select.value),algorithm_id:algorithmId,shared:U('algorithm-shared').checked,is_main:U('algorithm-main').checked});await refreshLibrary();report('Выбранный алгоритм заявлен. Основной алгоритм и доступность можно менять на странице турниров.','success');}catch(error){report(error.message,'error');}finally{button.disabled=!tournaments.length||portal.user.captain_id!==portal.user.id;}};
      report('Команда «'+portal.user.team+'». Сохраняй алгоритмы, назначай их уткам и готовь заявки.');
    }catch(error){report(error.message,'error');}
  });
};
