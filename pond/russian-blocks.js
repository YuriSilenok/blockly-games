/* Translate displayed fields only. Block IDs, variable names and generators stay intact. */
(function(){
  'use strict';
  var labels={scan:'радар',cannon:'выстрел',swim:'плыть',stop:'остановиться',speed:'скорость',health:'здоровье',getX:'координата X',getY:'координата Y',log:'вывести в консоль',
    'Math.sqrt':'квадратный корень','Math.abs':'модуль','Math.sin_deg':'синус','Math.cos_deg':'косинус','Math.tan_deg':'тангенс','Math.asin_deg':'арксинус','Math.acos_deg':'арккосинус','Math.atan_deg':'арктангенс',
    'var':'задать','if (':'если','else if (':'иначе если','else':'иначе',') {':'то','}':'',';':'','true':'истина','false':'ложь','function':'функция','return':'вернуть','name':'имя','null':'ничего','undefined':'не задано','Infinity':'бесконечность','NaN':'не число','break':'прервать','continue':'продолжить','for (':'для'};
  var russian=window.PondRussian={};
  russian.label=function(text){
    if(typeof text!=='string')return text;
    if(Object.prototype.hasOwnProperty.call(labels,text))return labels[text];
    if(/^Math\.random\s*\(\s*\)$/.test(text))return 'случайное число';
    return text.replace(/\bwhile\b/g,'пока').replace(/\buntil\b/g,'до выполнения условия').replace(/\belse if\b/g,'иначе если').replace(/\bif\b/g,'если').replace(/\belse\b/g,'иначе').replace(/\breturn\b/g,'вернуть').replace(/\bfunction\b/g,'функция');
  };
  russian.definition=function(definition){
    var copy=Object.assign({},definition);
    Object.keys(copy).forEach(function(key){
      if(/^message\d+$/.test(key))copy[key]=russian.label(copy[key]);
      if(/^args\d+$/.test(key))copy[key]=copy[key].map(function(arg){
        if(typeof arg==='string')return russian.label(arg);
        var item=Object.assign({},arg);
        if(item.options&&Array.isArray(item.options))item.options=item.options.map(function(option){return [russian.label(option[0]),option[1]];});
        if(item.variable==='name')item.variable='переменная';
        return item;
      });
    });
    return copy;
  };
  russian.prose=function(text){return String(text).replace(/«(scan|cannon|swim|stop|speed|health|getX|getY|log)»/g,function(match,name){return '«'+labels[name]+'»';}).replace(/\b(scan|cannon|swim|stop|speed|health|getX|getY|log)\b/g,function(name){return '«'+labels[name]+'»';});};
  russian.images=function(root){
    root.querySelectorAll('svg text').forEach(function(element){
      Array.from(element.childNodes).forEach(function(node){
        if(node.nodeType!==3)return;
        var original=node.textContent.trim(),short={getX:'X',getY:'Y',log:'вывод','Math.sqrt':'корень'},translated=short[original]||russian.label(original);
        if(original&&translated!==original){node.textContent=node.textContent.replace(original,translated);if(translated.length>original.length){element.setAttribute('textLength',String(original.length*7));element.setAttribute('lengthAdjust','spacingAndGlyphs');}}
      });
    });
  };
})();
