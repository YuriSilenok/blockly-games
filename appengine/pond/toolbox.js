/* The complete Pond palette, shared by the final lessons and tournament editor. */
(function(){
  'use strict';
  window.PondToolbox={complete:function(toolbox){
    function category(name,custom){
      var existing=Array.from(toolbox.querySelectorAll('category')).find(function(node){return custom?node.getAttribute('custom')===custom:node.getAttribute('name')===name;});
      if(existing)return existing;
      var node=document.createElement('category');node.setAttribute('name',name);if(custom)node.setAttribute('custom',custom);toolbox.appendChild(node);return node;
    }
    function add(group,type,values){
      if(toolbox.querySelector('block[type="'+type+'"]'))return;
      var block=document.createElement('block');block.setAttribute('type',type);
      Object.keys(values||{}).forEach(function(name){var value=document.createElement('value'),shadow=document.createElement('shadow'),field=document.createElement('field');value.setAttribute('name',name);shadow.setAttribute('type','pond_math_number');field.setAttribute('name','NUM');field.textContent=values[name];shadow.appendChild(field);value.appendChild(shadow);block.appendChild(value);});
      group.appendChild(block);
    }
    var pond=category('Пруд'),logic=category('Логика'),loops=category('Циклы'),math=category('Математика');
    add(pond,'pond_cannon',{DEGREE:0,RANGE:70});add(pond,'pond_scan',{DEGREE:0});add(pond,'pond_swim',{DEGREE:0});add(pond,'pond_log',{VALUE:123});
    ['pond_stop','pond_speed','pond_health','pond_getX','pond_getY'].forEach(function(type){add(pond,type);});
    ['controls_if','logic_compare','logic_operation','logic_negate','logic_boolean'].forEach(function(type){add(logic,type);});
    add(loops,'controls_whileUntil');add(loops,'controls_repeat_ext',{TIMES:4});
    add(math,'pond_math_number');
    if(!toolbox.querySelector('block[type="math_arithmetic"]'))add(math,'pond_math_arithmetic',{A:1,B:1});
    add(math,'pond_math_single',{NUM:9});add(math,'math_random_float');
    category('Переменные','VARIABLE');category('Функции','PROCEDURE');
  }};
})();
