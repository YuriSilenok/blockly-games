/* Shared, learner-facing diagnostics. Never display generated code or exceptions. */
(function () {
  'use strict';
  var schema=null;
  var feedback=window.PondFeedback={};
  feedback.ready=fetch('pond/block-inputs.json').then(function(response){if(!response.ok)throw Error();return response.json();}).then(function(value){schema=value;}).catch(function(){schema=null;});
  function tag(node){return node.localName;}
  function child(node,name){return Array.from(node.children).find(function(item){return tag(item)===name;});}
  function chosen(value){return child(value,'block')||child(value,'shadow');}
  feedback.nodes=function(xml){
    var root=new DOMParser().parseFromString(xml,'text/xml'),nodes=[];
    if(root.querySelector('parsererror')||tag(root.documentElement)!=='xml')throw Error('invalid-blocks');
    function visit(node){
      if(node.getAttribute('disabled')==='true'){var next=child(node,'next');if(next)visit(next);return;}
      if(tag(node)==='value'){var selected=chosen(node);if(selected)visit(selected);return;}
      if(tag(node)==='block'||tag(node)==='shadow')nodes.push(node);
      Array.from(node.children).forEach(visit);
    }
    visit(root.documentElement);return nodes;
  };
  feedback.validate=function(xml){
    if(!schema)return ['Не удалось загрузить проверку блоков. Обнови страницу и попробуй снова.'];
    var nodes;try{nodes=feedback.nodes(xml);}catch(error){return ['Не удалось прочитать блоки. Собери программу заново или открой сохранённое решение этого уровня.'];}
    if(!nodes.length)return ['Программа пуста. Добавь блоки из панели и соедини их.'];
    var issues=[];
    nodes.forEach(function(node){
      if(issues.length>=20)return;
      var type=node.getAttribute('type'),rule=schema[type],inputs=Object.assign({},rule?rule.inputs:{});
      var values=Array.from(node.children).filter(function(item){return tag(item)==='value';});
      if(type==='controls_if'){
        var mutation=child(node,'mutation'),count=mutation?Math.min(4000,Math.max(0,Number(mutation.getAttribute('elseif')||0))):0;
        for(var i=1;i<=count;i++)inputs['IF'+i]='условие дополнительной ветви';
      }
      if(type==='procedures_callreturn'||type==='procedures_callnoreturn'){
        var definition=child(node,'mutation');if(definition)Array.from(definition.children).filter(function(item){return tag(item)==='arg';}).forEach(function(item,index){inputs['ARG'+index]='аргумент функции «'+item.getAttribute('name')+'»';});
      }
      Object.keys(inputs).forEach(function(name){
        var value=values.find(function(item){return item.getAttribute('name')===name;}),selected=value&&chosen(value);
        if(!selected||selected.getAttribute('disabled')==='true')issues.push('Блок «'+(rule?rule.label:'вызов функции')+'»: добавь '+inputs[name]+'.');
      });
      if(type==='math_number'||type==='pond_math_number'){
        var field=Array.from(node.children).find(function(item){return tag(item)==='field'&&item.getAttribute('name')==='NUM';});
        if(!field||!field.textContent.trim()||!Number.isFinite(Number(field.textContent)))issues.push('В числовом блоке должно быть корректное число.');
      }
    });
    return issues;
  };
  feedback.scanInCannon=function(xml){
    var nodes=feedback.nodes(xml);
    return nodes.some(function(node){
      if(node.getAttribute('type')!=='pond_cannon')return false;
      var range=Array.from(node.children).find(function(item){return tag(item)==='value'&&item.getAttribute('name')==='RANGE';});
      return range&&nodes.some(function(inner){return inner.getAttribute('type')==='pond_scan'&&range.contains(inner);});
    });
  };
  feedback.show=function(message,kind){
    var status=document.getElementById('course-status');if(!status)return;
    status.dataset.kind=kind||'info';
    status.setAttribute('role',kind==='error'?'alert':'status');
    status.setAttribute('aria-live',kind==='error'?'assertive':'polite');
    status.textContent=message;
    if(kind==='error')status.scrollIntoView({block:'nearest',behavior:'smooth'});
  };
  feedback.issues=function(issues){feedback.show('Проверь программу:\n'+issues.slice(0,8).map(function(item){return '• '+item;}).join('\n')+(issues.length>8?'\nИсправь эти ошибки и повтори запуск.':''),'error');};
  feedback.runtime=function(error){
    var name=String(error&&error.name||''),message=String(error&&error.message||'');
    if(name==='ReferenceError'||/not defined/i.test(message))return 'Ошибка выполнения: переменная ещё не получила значение. Задай её значение до первого использования.';
    if(name==='TypeError')return 'Ошибка выполнения: блок получил значение неподходящего типа. Проверь, что в числовые параметры передаются числа.';
    if(name==='SyntaxError')return 'Не удалось запустить программу: проверь соединения блоков и заполнение их параметров.';
    if(name==='RangeError')return 'Программа превысила допустимую глубину вызовов. Проверь вызовы функций и условия их завершения.';
    return 'Программу не удалось выполнить. Проверь параметры блоков и значения переменных.';
  };
})();
