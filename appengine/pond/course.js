/* Integration layer for the retained, prebuilt Pond Tutor bundle. */
window.installPondCourse = function () {
  'use strict';
  mm = POND_COURSE.length;
  nm = Math.max(1, Math.min(mm, nm));
  var lesson = POND_COURSE[nm - 1], portal = PondPortal;
  var metrics = {}, running = null, pending = false, ready = false, checkingSession = false;
  var loops = ['controls_whileUntil','controls_repeat_ext','controls_repeat','controls_for','controls_forEach'];
  function key(level) { return 'pond-course:' + (portal.user ? portal.user.id : 'preview') + ':' + level; }
  function completed(level) { return portal.user ? portal.user.completed.indexOf(level) !== -1 : !!localStorage.getItem(key(level)); }
  pm = function (level) { return completed(level) ? localStorage.getItem(key(level)) || '<xml></xml>' : null; };
  // A new level starts empty; only this level's saved work is restored below.
  Hm = function () { Im('<xml></xml>'); };
  function report(text) { var e = document.getElementById('course-status'); if (e) e.textContent = text; }
  function blocks(xml) {
    var root = new DOMParser().parseFromString(xml, 'text/xml');
    return Array.from(root.querySelectorAll('block')).filter(function (b) { return !b.closest('[disabled="true"]'); });
  }
  function planError(xml) {
    var bs = blocks(xml), types = bs.map(function (b) { return b.getAttribute('type'); });
    function has(type) { return types.indexOf(type) !== -1; }
    if ([5,6,7,8,10,11].indexOf(nm) !== -1 && has('pond_cannon')) return 'На этом уровне исследуем таран: убери выстрелы из активной программы.';
    if ([1,2,3,4,9].indexOf(nm) !== -1 && !has('pond_cannon')) return 'Попробуй исследовать стрельбу с помощью cannon.';
    if ([2,3,4,9,10,11].indexOf(nm) !== -1 && !has('pond_scan')) return 'Добавь измерение расстояния с помощью scan.';
    if (nm === 3 && (!has('variables_set') || !has('variables_get'))) return 'Исследуй, как сохранить направление в переменной и использовать его.';
    if (nm === 4 && !has('pond_log')) return 'Добавь log, чтобы наблюдать измерение расстояния.';
    if (nm === 6 && (!has('pond_speed') || !types.some(function(t){return loops.indexOf(t)!==-1;}))) return 'Попробуй измерение скорости и цикл ожидания.';
    if (nm === 7 && !bs.some(function(b){return loops.indexOf(b.getAttribute('type'))!==-1 && bs.some(function(inner){return inner!==b && b.contains(inner) && loops.indexOf(inner.getAttribute('type'))!==-1;});})) return 'Исследуй повторение: помести один цикл внутрь другого.';
    if (nm === 8 && (!has('pond_getX') || !has('pond_getY') || !types.some(function(t){return loops.indexOf(t)!==-1;}))) return 'Используй обе координаты и циклы для управления маршрутом.';
    return '';
  }
  function metricError() {
    if ([2,3,4,9,10,11].indexOf(nm)!==-1 && !metrics.scan) return 'Радар должен участвовать в выполнении программы. Попробуй изменить расположение блоков.';
    if (nm===4 && !metrics.log) return 'Измерение нужно вывести через log во время выполнения программы.';
    if (nm===6 && !metrics.speed) return 'Измеряй скорость во время выполнения программы.';
    if (nm===8 && (!metrics.getX || !metrics.getY)) return 'Попробуй использовать обе координаты во время движения.';
    return '';
  }
  var originalHTML = No;
  No = function () {
    var container = document.createElement('div'); container.innerHTML = originalHTML();
    ['languageMenu','linkButton','helpUseScan','playerPendulum','playerScared','playerDefense'].forEach(function(id){var e=container.querySelector('#'+id);if(e)e.remove();});
    var help = container.querySelector('#help');
    help.innerHTML = '<div class="course-scroll"><section><h2>Новые возможности</h2><div id="course-quote">Загружаем цитату документации…</div></section><section><h2>Задание: '+lesson.title+'</h2><p id="course-task"></p></section></div><div class="course-buttons"><button class="secondary addHideHandler">Понятно</button></div>';
    help.querySelector('#course-task').textContent=lesson.task;
    var done=container.querySelector('#dialogDone');
    done.innerHTML='<div class="course-scroll"><h2>Эксперимент удался!</h2><p id="course-result"></p></div><div class="course-buttons"><button class="addHideHandler">Продолжить эксперимент</button><button id="course-next" class="secondary">Следующий уровень</button></div>';
    var toolbar=container.querySelector('#header_cta');
    toolbar.insertAdjacentHTML('beforeend',' <button id="course-reset">Сброс</button> <a href="portal/account.html">Личный кабинет</a> <a href="portal/tournament.html">Турниры</a>');
    container.querySelector('#visualization').insertAdjacentHTML('afterend','<div id="course-feedback"><div id="course-status" role="status"></div><div id="course-log" aria-label="Консоль измерений"></div></div>');
    lesson.scene.slice(1).forEach(function(a,i){var e=document.createElement('div');e.id='course-bot-'+i;e.style.display='none';e.textContent=a.code;container.appendChild(e);});
    var toolbox=container.querySelector('#toolbox');
    var allowed=['pond_math_number'];
    if(nm<=4) {allowed.push('pond_cannon');if(nm>=2)allowed.push('pond_scan');if(nm>=4)allowed.push('pond_log');}
    else if(nm===5)allowed=['pond_swim'];
    else if(nm===6)allowed.push('pond_swim','pond_speed','controls_whileUntil','logic_compare');
    else if(nm===7)allowed.push('pond_swim','pond_speed','controls_whileUntil','logic_compare');
    else if(nm===8)allowed.push('pond_swim','pond_getX','pond_getY','controls_whileUntil','logic_compare');
    else allowed=null;
    if(allowed)Array.from(toolbox.querySelectorAll('block')).forEach(function(b){if(allowed.indexOf(b.getAttribute('type'))===-1)b.remove();});
    if(nm===7 || nm>=9) {
      var category=document.createElement('category');category.setAttribute('name','Повторение');
      category.innerHTML='<block type="controls_repeat_ext"><value name="TIMES"><shadow type="pond_math_number"><field name="NUM">4</field></shadow></value></block><block type="pond_math_change"><value name="DELTA"><shadow type="pond_math_number"><field name="NUM">1</field></shadow></value></block>';
      toolbox.appendChild(category);
    }
    if(nm>=9){var math=toolbox.querySelector('category[name="'+X('Games.catMath',false)+'"]');if(math)math.insertAdjacentHTML('beforeend','<block type="pond_math_arithmetic"><value name="A"><shadow type="pond_math_number"><field name="NUM">1</field></shadow></value><value name="B"><shadow type="pond_math_number"><field name="NUM">1</field></shadow></value></block>');}
    Array.from(toolbox.querySelectorAll('category')).forEach(function(c){if(c.getAttribute('custom')){if(nm===5||nm===6||nm===8)c.remove();}else if(!c.querySelector('block'))c.remove();});
    return container.innerHTML;
  };
  Po=function(){return lesson.scene.map(function(a,i){return {name:a.name,start:new q(a.x,a.y),aa:a.damage,code:i?'course-bot-'+(i-1):null};});};
  var initialize = Z.dn;
  Z.dn = function(interpreter,scope){
    initialize(interpreter,scope);
    ['scan','cannon','swim','speed','getX','getY','log'].forEach(function(name){
      var property=interpreter.getProperty(scope,name), fn=property && property.nativeFunc;
      if(!fn)return;
      property.nativeFunc=function(){
        if(Z.Fb===En){metrics[name]=(metrics[name]||0)+1;if(name==='log'){var log=W('course-log');var line=document.createElement('div');line.textContent=String(Number(arguments[0]));log.appendChild(line);while(log.children.length>100)log.firstChild.remove();log.scrollTop=log.scrollHeight;}}
        return fn.apply(this,arguments);
      };
    });
  };
  var originalRun=Yn;
  Yn=async function(event){
    if(checkingSession)return;
    checkingSession=true;
    try{await portal.refresh();}catch(error){report('Не удалось проверить вход. Повтори запуск.');return;}finally{checkingSession=false;}
    if(!portal.user){portal.signIn();return;}
    if(!ready){report('Подожди загрузки прогресса.');return;}
    if(pending){report('Дождись сохранения результата.');return;}
    for(var i=1;i<nm;i++)if(!completed(i)){alert('Сначала пройди предыдущие уровни.');return;}
    var xml=Jm(), problem=planError(xml);
    if(problem){report(problem);return;}
    metrics={};running={xml:xml,code:ki()};W('course-log').textContent='';report('Наблюдай за результатом и меняй алгоритм.');
    localStorage.setItem(key(nm)+':draft',xml);
    originalRun(event);
  };
  var style={width:'50%',left:'25%',top:'5em',height:'70vh',display:'flex',flexDirection:'column'};
  Zm=function(){
    W('course-result').textContent=nm===mm?'Все типы противников побеждены. Доступ к турнирам открыт.':lesson.title+' — цель достигнута. Можно изменить алгоритм и провести новый эксперимент.';
    W('course-next').textContent=nm===mm?'К турнирам':'Следующий уровень';
    Y.Wi(W('dialogDone'),null,false,true,style,Y.Mo);Y.Lo();
  };
  Wn=async function(){
    clearTimeout(Mn);
    if(!running || En.td || Z.Jb.some(function(a){return a!==En&&!a.td;}))return;
    var problem=metricError();if(problem){report(problem);return;}
    var solution=running;running=null;
    try{
      pending=true;
      if(!portal.user){portal.signIn();return;}
      if(portal.user){
        report('Сохраняем результат: сервер повторяет эксперимент…');
        var job=await portal.request('/api/training/submit',{level:nm,code:solution.code,xml:solution.xml});
        var result=await portal.wait(job.id,report);
        if(!result.passed){report(result.message);return;}
        await portal.refresh();
      }
      localStorage.setItem(key(nm),solution.xml);report('Прогресс сохранён в учётной записи.');
      var level=W('level'+nm);if(level)level.classList.add('level_done');Zm();
    }catch(error){running=solution;report(error.message+' Нажми «Сохранить результат», чтобы повторить отправку.');var retry=document.createElement('button');retry.textContent='Сохранить результат';retry.onclick=function(){retry.remove();Wn();};W('course-status').appendChild(retry);}
    finally{pending=false;}
  };
  async function quote(){
    var target=W('course-quote');
    if(!lesson.concepts.length){target.textContent='Новых блоков нет. Комбинируй изученные возможности и исследуй поведение противников.';return;}
    var map={cannon:['Углы','cannon'],scan:['scan'],variables:['Присваивание','Получение значения'],log:['Отладка'],swim:['swim'],speed:['Скорость'],while:['Цикл «пока»'],compare:['Сравнения'],nested:['Вложенные циклы'],change:['Увеличение значения'],coordinates:['Координаты'],if:['Условия']};
    try{
      var response=await fetch('pond/docs.html');if(!response.ok)throw Error();
      var doc=new DOMParser().parseFromString(await response.text(),'text/html');target.textContent='';
      lesson.concepts.forEach(function(concept){(map[concept]||[]).forEach(function(name){
        var heading=Array.from(doc.querySelectorAll('h3')).find(function(h){return h.textContent.indexOf(name)!==-1;});
        if(!heading)return;
        var headings=Array.from(doc.querySelectorAll('h2,h3')),next=headings[headings.indexOf(heading)+1];
        var range=doc.createRange();range.setStartBefore(heading);if(next)range.setEndBefore(next);else range.setEndAfter(heading.parentNode.lastChild);
        target.appendChild(range.cloneContents());
      });});
      target.querySelectorAll('.js,pre,script').forEach(function(e){e.remove();});
      target.querySelectorAll('img').forEach(function(e){e.src=new URL(e.getAttribute('src'),new URL('pond/docs.html',location.href)).href;});
      target.querySelectorAll('[id]').forEach(function(e){e.removeAttribute('id');});
    }catch(error){target.textContent='Документация не загрузилась. Открой её кнопкой «Документация» и повтори попытку позже.';}
  }
  portal.onLoad(async function(){
    document.title='Уровень '+nm+' — '+lesson.title+' — Пруд';
    W('course-next').onclick=function(){location.href=nm===mm?'portal/tournament.html':'?level='+(nm+1);};
    W('course-reset').onclick=async function(){
      if(!confirm('Сбросить пройденные уровни обучения? Турнирные результаты сохранятся.'))return;
      try{if(portal.user)await portal.request('/api/progress/reset',{});for(var i=1;i<=mm;i++){localStorage.removeItem(key(i));localStorage.removeItem(key(i)+':draft');}location.href='?level=1';}catch(error){report(error.message);}
    };
    quote();await portal.ready;
    if(!portal.user){portal.signIn();return;}
    try{
      var saved=localStorage.getItem(key(nm)+':draft');
      if(portal.user){var data=await portal.request('/api/training/'+nm);saved=saved||data.xml;}
      if(saved)Im(saved);
      for(var i=1;i<=mm;i++){var node=W('level'+i);if(node)node.classList.toggle('level_done',completed(i));}
      report('Уровень '+nm+' · '+lesson.title+'\nПрогресс сохраняется для '+portal.user.login+'.');
      ready=true;
    }catch(error){report(error.message);}
  });
};
