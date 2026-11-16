/* Translate displayed fields only. Block IDs, variable names and generators stay intact. */
(function(){
  'use strict';
  var labels={scan:'радар',cannon:'выстрел',swim:'плыть',stop:'остановиться',speed:'скорость',health:'здоровье',getX:'координата X',getY:'координата Y',log:'вывести в консоль',
    'Math.sqrt':'квадратный корень','Math.abs':'модуль','Math.sin_deg':'синус','Math.cos_deg':'косинус','Math.tan_deg':'тангенс','Math.asin_deg':'арксинус','Math.acos_deg':'арккосинус','Math.atan_deg':'арктангенс',
    'var':'задать','if (':'если','else if (':'иначе если','else':'иначе',') {':'то','}':'',';':'','true':'истина','false':'ложь','function':'функция','return':'вернуть','name':'имя','null':'ничего','undefined':'не задано','Infinity':'бесконечность','NaN':'не число','break':'прервать','continue':'продолжить','for (':'для'};
  var russian=window.PondRussian={};
  labels['&&']='и';labels['||']='или';labels['!']='не';
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
    // A viewBox scales the existing paths and fields together instead of cropping them.
    root.querySelectorAll('svg').forEach(function(svg){
      var width=parseFloat(svg.getAttribute('width')),height=parseFloat(svg.getAttribute('height'));
      if(!svg.hasAttribute('viewBox')&&width>0&&height>0)svg.setAttribute('viewBox','0 0 '+width+' '+height);
      svg.setAttribute('preserveAspectRatio','xMinYMin meet');
      svg.classList.add('documentation-block-image');
    });
    var context=document.createElement('canvas').getContext('2d');
    root.querySelectorAll('svg text').forEach(function(element){
      var originalText=element.textContent.replace(/\s+/g,' ').trim(),changed=false;
      Array.from(element.childNodes).forEach(function(node){
        if(node.nodeType!==3)return;
        var original=node.textContent.trim(),short={getX:'X',getY:'Y',log:'вывод','var':'зад.','Math.sqrt':'корень'},translated=short[original]||russian.label(original);
        if(original&&translated!==original){node.textContent=node.textContent.replace(original,translated);changed=true;}
      });
      if(changed&&context){
        var style=window.getComputedStyle(element);
        context.font=style.font||style.fontSize+' '+style.fontFamily;
        var available=context.measureText(originalText).width;
        var required=context.measureText(element.textContent.replace(/\s+/g,' ').trim()).width;
        if(available>0&&required>available){element.setAttribute('textLength',String(available));element.setAttribute('lengthAdjust','spacingAndGlyphs');}
      }
    });
  };
})();
