/* Integration layer for the retained, prebuilt Pond Tutor bundle. */
window.installPondCourse = function () {
  'use strict';
  PondRussian.catalogues();
  var appendField=P,jsonInit=ei;
  P=function(input,label,name){return appendField(input,PondRussian.label(label),name);};
  ei=function(block,definition){return jsonInit(block,PondRussian.definition(definition));};
  // The first scene may be drawn before the sprite sheet has finished loading.
  Kn.addEventListener('load', function () {
    if (Fn && Gn && Z.Jb.length) Pn();
  });
  mm = POND_COURSE.length;
  nm = Math.max(1, Math.min(mm, nm));
  var lesson = POND_COURSE[nm - 1], portal = PondPortal;
  var metrics = {}, running = null, pending = false, ready = false, checkingSession = false;
  var runtimeFailure='',programFinished=false,idleReported=false,consoleSolution=null;
  var loops = ['controls_whileUntil','controls_repeat_ext','controls_repeat','controls_for','controls_forEach'];
  function key(level) { return 'pond-course-v6:' + (portal.user ? portal.user.id : 'preview') + ':' + level; }
  function completed(level) { return portal.user ? portal.user.completed.indexOf(level) !== -1 : !!localStorage.getItem(key(level)); }
  pm = function (level) { return completed(level) ? localStorage.getItem(key(level)) || '<xml></xml>' : null; };
  // A new level starts empty; only this level's saved work is restored below.
  Hm = function () { Im('<xml></xml>'); };
  function report(text,kind) { PondFeedback.show(text,kind); }
  function blocks(xml) {
    return PondFeedback.nodes(xml).filter(function(node){return node.localName==='block';});
  }
  function planError(xml) {
    var bs = blocks(xml), types = bs.map(function (b) { return b.getAttribute('type'); });
    function has(type) { return types.indexOf(type) !== -1; }
    if(nm===6){var loopCount=types.filter(function(type){return loops.includes(type);}).length;if(loopCount>1)return 'На уровне 6 можно использовать не более одного активного цикла. Сейчас их: '+loopCount+'.';}
    if(nm===6||nm===8){var swimLimit=nm===6?2:1,swimCount=types.filter(function(type){return type==='pond_swim';}).length;if(swimCount>swimLimit)return 'На уровне '+nm+' можно использовать не более '+swimLimit+' активных блоков «Плыть». Сейчас их: '+swimCount+'.';}
    if(nm===12||nm===13||nm===14||nm===15){var loopCount=types.filter(function(type){return loops.includes(type);}).length,ifCount=types.filter(function(type){return type==='controls_if';}).length;if(loopCount!==1||ifCount!==1)return 'На уровне '+nm+' нужны ровно один цикл и один блок «Если». Сейчас циклов: '+loopCount+', блоков «Если»: '+ifCount+'.';}
    if(nm===9){var loopCount=types.filter(function(type){return loops.includes(type);}).length;if(loopCount>2)return 'На уровне 9 можно использовать не более двух циклов. Сейчас их: '+loopCount+'.';}
    if(nm===10){var loopCount=types.filter(function(type){return loops.includes(type);}).length;if(loopCount>3)return 'На уровне 10 можно использовать не более трёх циклов. Сейчас их: '+loopCount+'.';}
    if(nm===11){var loopCount=types.filter(function(type){return loops.includes(type);}).length;if(loopCount>2)return 'На уровне 11 можно использовать не более двух циклов. Сейчас их: '+loopCount+'.';}
    if ([5,6,7,8,9,10,11,13,15].indexOf(nm) !== -1 && has('pond_cannon')) return 'На этом уровне исследуем таран: убери выстрелы из активной программы.';
    if ([1,2,3,4,12,14].indexOf(nm) !== -1 && !has('pond_cannon')) return 'Попробуй исследовать стрельбу с помощью cannon.';
    if ([2,3,4,12,13,14,15].indexOf(nm) !== -1 && !has('pond_scan')) return 'Добавь измерение расстояния с помощью scan.';
    if(nm===2&&!PondFeedback.scanInCannon(xml))return 'Условие второго уровня: помести scan в параметр расстояния блока cannon. Отдельный блок scan или scan в параметре угла не выполняет это условие.';
    if (nm === 3 && (!has('variables_set') || !has('variables_get'))) return 'Исследуй, как сохранить направление в переменной и использовать его.';
    if(nm===3){var count=PondFeedback.nodes(xml).filter(function(node){return ['math_number','pond_math_number'].includes(node.getAttribute('type'));}).length;if(count!==1)return 'Условие третьего уровня: используй ровно один числовой блок во всей активной программе. Сейчас их: '+count+'. Повторно используй значение через переменную.';}
    if (nm === 4 && !has('pond_log')) return 'Добавь log, чтобы наблюдать измерение расстояния.';
    if(nm===4){var nodes=PondFeedback.nodes(xml),counts=[['числовой блок',nodes.filter(function(node){return ['math_number','pond_math_number'].includes(node.getAttribute('type'));}).length]];['log','cannon','scan'].forEach(function(name){counts.push([name,nodes.filter(function(node){return node.getAttribute('type')==='pond_'+name;}).length]);});var wrong=counts.filter(function(item){return item[1]!==1;});if(wrong.length)return 'Условие четвёртого уровня: ровно один числовой блок, один log, один cannon и один scan. Сейчас: '+wrong.map(function(item){return item[0]+': '+item[1];}).join('; ')+'.';}
    if (nm === 6 && (!has('pond_speed') || !types.some(function(t){return loops.indexOf(t)!==-1;}))) return 'Попробуй измерение скорости и цикл ожидания.';
    if(nm===7||nm===8){var loopBlocks=bs.filter(function(b){return loops.includes(b.getAttribute('type'));});var whiles=loopBlocks.filter(function(b){return b.getAttribute('type')==='controls_whileUntil';});var repeats=loopBlocks.filter(function(b){return ['controls_repeat','controls_repeat_ext'].includes(b.getAttribute('type'));});function inside(outer,inner){return Array.from(outer.children).some(function(node){return node.localName==='statement'&&node.contains(inner);});}if(nm===7){if(loopBlocks.length!==2||whiles.length!==2)return 'На уровне 7 нужны ровно два цикла «пока». Другие виды циклов не подходят.';}else{if(loopBlocks.length!==2||whiles.length!==1||repeats.length!==1)return 'На уровне '+nm+' нужны ровно два цикла: «повторить» и «пока».';if(!inside(repeats[0],whiles[0]))return 'Помести цикл «пока» внутрь цикла «повторить».';}}
    if ([10,11].includes(nm) && (!has('pond_getX') || !has('pond_getY') || !types.some(function(t){return loops.indexOf(t)!==-1;}))) return 'Используй обе координаты и циклы для управления маршрутом.';
    return '';
  }
  function metricError() {
    if([1,2,3,4,12,14].includes(nm)&&!metrics.cannon)return 'Условие задания не выполнено: команда cannon не была выполнена. Проверь, достигает ли программа блока выстрела.';
    if ([2,3,4,12,13,14,15].indexOf(nm)!==-1 && !metrics.scan) return 'Радар должен участвовать в выполнении программы. Попробуй изменить расположение блоков.';
    if (nm===4 && !metrics.log) return 'Измерение нужно вывести через log во время выполнения программы.';
    if (nm===6 && !metrics.speed) return 'Измеряй скорость во время выполнения программы.';
    if ([10,11].includes(nm) && (!metrics.getX || !metrics.getY)) return 'Попробуй использовать обе координаты во время движения.';
    return '';
  }
  var originalHTML = No;
  No = function () {
    var container = document.createElement('div'); container.innerHTML = originalHTML();
    ['languageMenu','linkButton','helpUseScan','playerPendulum','playerScared','playerDefense'].forEach(function(id){var e=container.querySelector('#'+id);if(e)e.remove();});
    var help = container.querySelector('#help');
    help.innerHTML = '<div class="course-scroll"><section id="course-new-blocks" hidden><h2>Новые блоки</h2><p id="course-quote"></p><div id="course-block-images" class="level-help-documentation"></div></section><section><h2>Задание: '+lesson.title+'</h2><p id="course-task"></p></section></div><div class="course-buttons"><button class="secondary addHideHandler">Понятно</button></div>';
    help.querySelector('#course-task').textContent=PondRussian.prose(lesson.task);
    if(nm===4)help.querySelector('#course-task').insertAdjacentHTML('afterend','<p>Открой консоль браузера: нажми F12 и выбери вкладку «Консоль» или нажми Ctrl+Shift+J (на macOS — Cmd+Option+J). Запусти программу и найди последнее сообщение «Проверочное число для уровня 4». Возьми следующие за ним шесть цифр. Это отдельное число, а не расстояние, которое выводит блок «вывести в консоль». После победы введи его в окне результата. При новом запуске нужно брать число из нового сообщения.</p>');
    var done=container.querySelector('#dialogDone');
    done.innerHTML='<div class="course-scroll"><h2>Эксперимент удался!</h2><p id="course-result"></p></div><div class="course-buttons"><button class="addHideHandler">Продолжить эксперимент</button><button id="course-next" class="secondary">Следующий уровень</button></div>';
    done.querySelector('.course-scroll').insertAdjacentHTML('beforeend','<form id="course-console-form" hidden><label for="course-console-answer">Проверочное число из консоли</label><input id="course-console-answer" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" required aria-describedby="course-console-hint"><p id="course-console-hint">Найди последнее сообщение «Проверочное число для уровня 4» в консоли браузера (F12 → «Консоль»).</p><p id="course-console-error" role="alert"></p><button type="submit" class="secondary">Подтвердить и засчитать уровень</button></form>');
    var toolbar=container.querySelector('#header_cta');
    toolbar.insertAdjacentHTML('beforeend',' <button id="course-reset">Сброс</button> <a href="portal/account.html">Личный кабинет</a> <a href="portal/tournament.html">Турниры</a>');
    container.querySelector('#visualization').insertAdjacentHTML('afterend','<div id="course-feedback"><div id="course-status" role="status"></div><div id="course-log" aria-label="Консоль измерений"></div></div>');
    lesson.scene.slice(1).forEach(function(a,i){var e=document.createElement('div');e.id='course-bot-'+i;e.style.display='none';e.textContent=a.code;container.appendChild(e);});
    var toolbox=container.querySelector('#toolbox');
    var allowed=['pond_math_number'];
    if(nm<=4) {allowed.push('pond_cannon');if(nm>=2)allowed.push('pond_scan');if(nm>=4)allowed.push('pond_log');}
    else if(nm===5)allowed=['pond_swim'];
    else if(nm===6)allowed.push('pond_swim','pond_speed','controls_whileUntil','logic_compare');
    else if(nm===7||nm===8)allowed.push('pond_swim','pond_speed','controls_whileUntil','logic_compare');
    else if(nm===9)allowed.push('pond_swim','pond_health','controls_whileUntil','logic_compare');
    else if(nm===10||nm===11)allowed.push('pond_swim','pond_getX','pond_getY','controls_whileUntil','logic_compare');
    else if(nm===12||nm===13||nm===14||nm===15)allowed.push((nm===13||nm===15)?'pond_swim':'pond_cannon','pond_scan','controls_whileUntil','controls_if','logic_compare','logic_boolean');
    else allowed=null;
    if(nm===14)allowed.push('pond_swim','pond_stop');
    if(nm===11){allowed.push('logic_operation','logic_negate','logic_boolean');var logic=toolbox.querySelector('category[name="'+X('Games.catLogic',false)+'"]');['logic_operation','logic_negate'].forEach(function(type){if(!logic.querySelector('block[type="'+type+'"]'))logic.insertAdjacentHTML('beforeend','<block type="'+type+'"></block>');});}
    if(nm>=4&&allowed){allowed.push('pond_log','pond_math_number');}
    if(nm===9)toolbox.querySelector('category[name="'+X('Games.pond',false)+'"]').insertAdjacentHTML('beforeend','<block type="pond_health"></block>');
    if(allowed)Array.from(toolbox.querySelectorAll('block')).forEach(function(b){if(allowed.indexOf(b.getAttribute('type'))===-1)b.remove();});
    if(nm===8||nm===9||nm===11||nm>=16){var category=toolbox.querySelector('category[name="'+X('Games.catLoops',false)+'"]');category.insertAdjacentHTML('beforeend','<block type="controls_repeat_ext"><value name="TIMES"><shadow type="pond_math_number"><field name="NUM">4</field></shadow></value></block>');}
    if(nm>=16){var math=toolbox.querySelector('category[name="'+X('Games.catMath',false)+'"]');if(math)math.insertAdjacentHTML('beforeend','<block type="pond_math_arithmetic"><value name="A"><shadow type="pond_math_number"><field name="NUM">1</field></shadow></value><value name="B"><shadow type="pond_math_number"><field name="NUM">1</field></shadow></value></block>');}
    if(nm>=16)PondToolbox.complete(toolbox);
    Array.from(toolbox.querySelectorAll('category')).forEach(function(c){if(c.getAttribute('custom')){if(nm===5||nm===6||nm===10)c.remove();}else if(!c.querySelector('block'))c.remove();});
    PondFeedback.place(container);
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
        try{
          if(['scan','cannon','swim'].includes(name)&&!Number.isFinite(arguments[0]))throw new TypeError();
          return fn.apply(this,arguments);
        }catch(error){if(Z.Fb===En){runtimeFailure='Блок «'+name+'»: '+PondFeedback.runtime(error);report(runtimeFailure,'error');}throw error;}
      };
    });
  };
  var originalRun=Yn;
  var initializeAvatar=Bn.prototype.dn;
  Bn.prototype.dn=function(){
    try{initializeAvatar.call(this);}catch(error){if(this===En){runtimeFailure=PondFeedback.runtime(error);report(runtimeFailure,'error');}throw error;}
    if(this!==En)return;
    var step=this.xq.step;
    this.xq.step=function(){try{var result=step.apply(this,arguments);if(result===false)programFinished=true;return result;}catch(error){runtimeFailure=runtimeFailure||PondFeedback.runtime(error);report(runtimeFailure,'error');throw error;}};
  };
  var originalDraw=Pn;
  var pondView=null,resetPond=Z.reset;
  Z.reset=function(){if(pondView)pondView.reset();return resetPond.apply(this,arguments);};
  Pn=function(){
    var frame=PondRenderer.fromNative(Z.Jb,Z.zg,Z.Nd,{position:'P',dead:'td',damage:'aa',color:'xl',degree:'Vd',start:'$i',end:'Yh',owner:'bt'});
    // Keep the saved bundle's sounds and health bookkeeping; share the visible display.
    originalDraw();
    if(!pondView)pondView=new PondRenderer(W('display'),{sprites:Kn});
    pondView.draw(frame);
    PondHealth.update(Z.Jb,'aa','Nu');
    if(running&&programFinished&&!idleReported&&!runtimeFailure&&!En.td&&En.speed===0&&Z.zg.length===0){
      idleReported=true;var remaining=Z.Jb.filter(function(a){return a!==En&&!a.td;}).length;
      var problem=metricError();
      if(problem||remaining)report('Программа завершилась. '+(problem||'Осталось целей: '+remaining+'. Проверь направление и расстояние действий или добавь повторение.'),'error');
    }
  };
  var originalReset=Zn;
  Zn=function(event){originalReset(event);if(W('runButton').style.display!=='inline')return;running=null;runtimeFailure='';programFinished=false;idleReported=false;if(!pending)report('Поле возвращено в начальное состояние. Можно изменить блоки и повторить запуск.');};
  var originalSnapshot=Oo;
  Oo=function(){try{originalSnapshot();}catch(error){report(PondFeedback.runtime(error),'error');}};
  Yn=async function(event){
    if(checkingSession)return;
    checkingSession=true;
    try{
      try{await portal.refresh();}catch(error){report('Не удалось проверить вход. Повтори запуск.','error');return;}
      if(!portal.user){portal.signIn();return;}
      if(!ready){report('Подожди загрузки прогресса.');return;}
      if(pending){report('Дождись сохранения результата.');return;}
      for(var i=1;i<nm;i++)if(!completed(i)){report('Сначала пройди предыдущие уровни. Уровень '+i+' ещё не завершён.','error');return;}
      await PondFeedback.ready;
      var xml=Jm(),issues=PondFeedback.validate(xml);if(issues.length){PondFeedback.issues(issues);return;}
      var problem=planError(xml);if(problem){PondFeedback.issues([problem]);return;}
      var solution={xml:xml,code:ki()};
      if(nm===4){
        var challenge;try{challenge=await portal.request('/api/training/challenge',{code:solution.code,xml:xml});}catch(error){report(error.message,'error');return;}
        if(Jm()!==xml){report('Блоки изменились во время подготовки запуска. Нажми «Запустить программу» ещё раз.','error');return;}
        solution.challenge_id=challenge.id;
        console.info('Проверочное число для уровня 4: '+challenge.number+' (для текущего запуска).');
      }
      metrics={};runtimeFailure='';programFinished=false;idleReported=false;consoleSolution=null;running=solution;W('course-log').textContent='';report('Наблюдай за результатом и меняй алгоритм.');
      localStorage.setItem(key(nm)+':draft',xml);
      originalRun(event);
    }catch(error){running=null;report(PondFeedback.runtime(error),'error');}finally{checkingSession=false;}
  };
  var style={width:'50%',left:'25%',top:'5em',height:'70vh',display:'flex',flexDirection:'column'};
  Zm=function(needsConsole){
    W('course-result').textContent=needsConsole?'Цель поражена. Чтобы завершить четвёртый уровень, введи проверочное число из консоли браузера.':nm===mm?'Все типы противников побеждены. Доступ к турнирам открыт.':lesson.title+' — цель достигнута. Можно изменить алгоритм и провести новый эксперимент.';
    W('course-console-form').hidden=!needsConsole;
    W('course-next').hidden=!!needsConsole;
    W('course-next').textContent=nm===mm?'К турнирам':'Следующий уровень';
    if(!W('dialog').contains(W('dialogDone')))Y.Wi(W('dialogDone'),null,false,true,style,Y.Mo);
    // The standard dialog handler closes on Enter/Space; the answer form needs them.
    if(needsConsole)Y.Mo();else Y.Lo();
    if(needsConsole){W('course-console-answer').value='';W('course-console-error').textContent='';W('course-console-answer').focus();}
  };
  Wn=async function(){
    clearTimeout(Mn);
    if(!running)return;
    if(runtimeFailure){report(runtimeFailure,'error');return;}
    var problem=metricError();if(problem){report('Условие задания не выполнено. '+problem,'error');return;}
    if(En.td){report('Попытка завершена: твоя утка потонула. Измени стратегию и попробуй снова.','error');return;}
    var remaining=Z.Jb.filter(function(a){return a!==En&&!a.td;}).length;
    if(remaining){report('Время попытки закончилось. Осталось целей: '+remaining+'. Проверь направление, дальность и повторение действий.','error');return;}
    var solution=running;running=null;
    if(nm===4){consoleSolution=solution;report('Цель поражена. Введи число из консоли в окне результата, чтобы завершить уровень.');Zm(true);return;}
    await saveVictory(solution);
  };
  async function saveVictory(solution,consoleAnswer){
    var consoleButton=W('course-console-form').querySelector('button');
    var wasGraduated=!!(portal.user&&portal.user.unlocked);
    try{
      pending=true;
      consoleButton.disabled=true;
      if(!portal.user){portal.signIn();return;}
      if(portal.user){
        report('Сохраняем результат: сервер повторяет эксперимент…');
        var job=await portal.request('/api/training/submit',{level:nm,code:solution.code,xml:solution.xml,challenge_id:solution.challenge_id,console_answer:consoleAnswer});
        var result=await portal.wait(job.id,function(message){report(message);if(nm===4)W('course-console-error').textContent=message;});
        if(!result.passed){report(result.message,'error');if(nm===4)W('course-console-error').textContent=PondRussian.prose(result.message);return;}
        await portal.refresh();
      }
      localStorage.setItem(key(nm),solution.xml);report('Прогресс сохранён в учётной записи.','success');
      if(nm>=16&&nm<mm){localStorage.setItem(key(nm+1)+':draft',solution.xml);localStorage.setItem(key(nm+1)+':migrated','1');}
      consoleSolution=null;
      if(nm===mm&&!wasGraduated){location.assign('portal/tournament.html');return;}
      var level=W('level'+nm);if(level)level.classList.add('level_done');Zm();
    }catch(error){
      if(nm===4){W('course-console-error').textContent=PondRussian.prose(error.message);W('course-console-answer').setAttribute('aria-invalid','true');}
      else{running=solution;report(error.message+' Нажми «Сохранить результат», чтобы повторить отправку.','error');var retry=document.createElement('button');retry.textContent='Сохранить результат';retry.onclick=function(){retry.remove();Wn();};W('course-status').appendChild(retry);}
    }finally{pending=false;consoleButton.disabled=false;}
  }
  async function quote(){
    var map={cannon:['cannon'],scan:['scan'],variables:['Переменные'],log:['log'],swim:['swim'],stop:['stop'],speed:['speed'],health:['health'],while:['while'],compare:['Сравнение'],repeat:['Повторить'],change:['Увеличить значение переменной'],coordinates:['getX','getY'],if:['if'],logic:['и/или','не','Логические значения']};
    var names=[];
    lesson.concepts.forEach(function(concept){(map[concept]||[]).forEach(function(name){names.push(PondRussian.label(name));});});
    W('course-new-blocks').hidden=!names.length;
    W('course-quote').textContent=names.length?(names.length===1?'Добавлен новый блок: ':'Добавлены новые блоки: ')+names.map(function(name){return '«'+name+'»';}).join(', ')+'.':'';
    if(!names.length)return;
    var images=W('course-block-images');
    var sections={cannon:['Выстрел'],scan:['Поиск противника'],variables:['Присваивание','Получение значения'],log:['Отладка'],swim:['Движение'],stop:['Остановка'],speed:['Скорость'],health:['Здоровье'],while:['Цикл «пока»'],compare:['Сравнения'],repeat:['Цикл «повторить»'],change:['Увеличение значения'],coordinates:['Координаты'],if:['Условия'],logic:['«И» и «или»','Отрицание','Логические значения']};
    var descriptions={
      'Выстрел':'Стреляет в заданном направлении. Параметры: угол в градусах и дальность от 0 до 70. Блок команды не возвращает значение.',
      'Поиск противника':'Измеряет расстояние до ближайшей утки в указанном направлении. Параметр: угол в градусах. Возвращает расстояние или бесконечность, если цели нет.',
      'Присваивание':'Сохраняет значение в переменной. Выбери переменную и задай значение. Блок команды не возвращает значение.',
      'Получение значения':'Возвращает текущее значение выбранной переменной. Входных параметров нет.',
      'Отладка':'Выводит значение в консоль браузера. Параметр: выводимое значение. Блок команды не возвращает значение.',
      'Движение':'Задаёт импульс движения. Параметр: направление в градусах. Блок команды не возвращает значение.',
      'Остановка':'Останавливает движение утки с учётом инерции. Параметров и возвращаемого значения нет.',
      'Скорость':'Возвращает текущую скорость утки от 0 до 100. Параметров нет.',
      'Здоровье':'Возвращает оставшееся здоровье утки от 0 до 100. Параметров нет.',
      'Цикл «пока»':'Повторяет вложенные действия, пока условие истинно. Вход: логическое условие. Значение не возвращает.',
      'Сравнения':'Сравнивает два значения выбранным способом. Вход: два сравниваемых значения. Возвращает истину или ложь.',
      'Цикл «повторить»':'Повторяет вложенные действия заданное число раз. Параметр: число повторений. Значение не возвращает.',
      'Увеличение значения':'Прибавляет число к значению выбранной переменной. Параметр: прибавляемое число. Значение не возвращает.',
      'Координаты':'Блоки «координата X» и «координата Y» возвращают соответствующую текущую координату утки от 0 до 100. Параметров нет.',
      'Условия':'Выполняет вложенные действия, если условие истинно. Вход: логическое условие. Значение не возвращает.',
      '«И» и «или»':'Объединяет два условия. «И» истинно, когда истинны оба условия; «или» — хотя бы одно. Возвращает истину или ложь.',
      'Отрицание':'Меняет логическое значение на противоположное. Вход: одно условие. Возвращает истину или ложь.',
      'Логические значения':'Возвращает выбранное значение: истина или ложь. Параметров нет.'
    };
    try{
      var response=await fetch('pond/docs.html');if(!response.ok)throw Error();
      var doc=new DOMParser().parseFromString(await response.text(),'text/html');
      var headings=Array.from(doc.querySelectorAll('h2,h3'));
      lesson.concepts.forEach(function(concept){(sections[concept]||[]).forEach(function(name){
        var heading=headings.find(function(node){return node.tagName==='H3'&&node.textContent.indexOf(name)!==-1;});
        if(!heading)return;
        var next=headings[headings.indexOf(heading)+1],range=doc.createRange();
        range.setStartAfter(heading);if(next)range.setEndBefore(next);else range.setEndAfter(heading.parentNode.lastChild);
        range.cloneContents().querySelectorAll('svg,img').forEach(function(source){
          var picture=source.cloneNode(true),wrapper=document.createElement('p');wrapper.className='blocks';
          if(picture.tagName.toLowerCase()==='img')picture.src=new URL(picture.getAttribute('src'),new URL('pond/docs.html',location.href)).href;
          wrapper.appendChild(picture);images.appendChild(wrapper);
        });
        var explanation=document.createElement('p');explanation.textContent=descriptions[name]||'';images.appendChild(explanation);
      });});
      images.querySelectorAll('[id]').forEach(function(node){node.removeAttribute('id');});
      PondRussian.images(images);
    }catch(error){images.textContent='Изображения блоков не загрузились. Попробуй открыть справку после обновления страницы.';}
  }
  portal.onLoad(async function(){
    document.title='Уровень '+nm+' — '+lesson.title+' — Пруд';
    W('course-next').onclick=function(){location.href=nm===mm?'portal/tournament.html':'?level='+(nm+1);};
    W('course-console-form').onsubmit=async function(event){event.preventDefault();if(!consoleSolution||pending)return;W('course-console-error').textContent='Проверяем число и сохраняем результат…';W('course-console-answer').removeAttribute('aria-invalid');await saveVictory(consoleSolution,W('course-console-answer').value.trim());};
    W('course-reset').onclick=async function(){
      if(!confirm('Сбросить пройденные уровни обучения? Турнирные результаты сохранятся.'))return;
      try{if(portal.user)await portal.request('/api/progress/reset',{});for(var i=1;i<=mm;i++){localStorage.removeItem(key(i));localStorage.removeItem(key(i)+':draft');localStorage.removeItem(key(i)+':migrated');localStorage.removeItem('pond-course:'+portal.user.id+':'+i);localStorage.removeItem('pond-course:'+portal.user.id+':'+i+':draft');localStorage.removeItem('pond-course-v2:'+portal.user.id+':'+i);localStorage.removeItem('pond-course-v2:'+portal.user.id+':'+i+':draft');localStorage.removeItem('pond-course-v5:'+portal.user.id+':'+i);localStorage.removeItem('pond-course-v5:'+portal.user.id+':'+i+':draft');localStorage.removeItem('pond-course-v4:'+portal.user.id+':'+i);localStorage.removeItem('pond-course-v4:'+portal.user.id+':'+i+':draft');localStorage.removeItem('pond-course-v3:'+portal.user.id+':'+i);localStorage.removeItem('pond-course-v3:'+portal.user.id+':'+i+':draft');}location.href='?level=1';}catch(error){report(error.message);}
    };
    quote();await portal.ready;
    if(!portal.user){portal.signIn();return;}
    try{
      var saved=localStorage.getItem(key(nm)+':draft');
      if(!localStorage.getItem(key(nm)+':migrated')){var oldLevel=nm===13?14:nm===14?13:nm;if(!saved)saved=localStorage.getItem('pond-course-v5:'+portal.user.id+':'+oldLevel+':draft');var prior=oldLevel<13?oldLevel:oldLevel>13?oldLevel-1:null;var previous=prior===null?null:prior<11?prior:prior>11?prior-1:null;if(prior&&!saved)saved=localStorage.getItem('pond-course-v4:'+portal.user.id+':'+prior+':draft');if(previous&&!saved){saved=localStorage.getItem('pond-course-v3:'+portal.user.id+':'+previous+':draft');var second=previous<9?previous:previous>9?previous-1:null;if(!saved&&second){saved=localStorage.getItem('pond-course-v2:'+portal.user.id+':'+second+':draft');var original=second<7?second:second>7?second-1:null;if(!saved&&original)saved=localStorage.getItem('pond-course:'+portal.user.id+':'+original+':draft');}if(saved)localStorage.setItem(key(nm)+':draft',saved);}if(saved)localStorage.setItem(key(nm)+':draft',saved);localStorage.setItem(key(nm)+':migrated','1');}
      if(portal.user){var data=await portal.request('/api/training/'+nm);saved=saved||data.xml;if(!saved&&nm>=17&&completed(nm-1)){var preceding=await portal.request('/api/training/'+(nm-1));saved=preceding.xml;if(saved)localStorage.setItem(key(nm)+':draft',saved);}}
      if(saved)Im(saved);
      for(var i=1;i<=mm;i++){var node=W('level'+i);if(node)node.classList.toggle('level_done',completed(i));}
      report('Уровень '+nm+' · '+lesson.title+'\nПрогресс сохраняется для '+portal.user.login+'.');
      ready=true;
    }catch(error){report(['TypeError','ReferenceError','SyntaxError','RangeError'].includes(error.name)?PondFeedback.runtime(error):error.message,'error');}
  });
};
