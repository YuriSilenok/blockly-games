/* Stamp the revision of this HTML response, rather than a newer server revision. */
(function(){
  'use strict';
  if(window.self!==window.top)return;
  var revision=document.currentScript.dataset.version;
  var style=document.createElement('style');
  style.textContent='.site-version{font:12px/1.5 system-ui,sans-serif;color:#6b7e81;white-space:nowrap}.pond-version-footer{box-sizing:border-box;margin:20px 0 0;padding:14px 10px;border-top:1px solid #dfe7e4}.pond-version-footer.game-version-footer{width:400px;max-width:100%}';
  document.head.appendChild(style);
  function mount(){
    var footer=document.querySelector('footer.site-footer,footer.pond-version-footer');
    if(!footer){footer=document.createElement('footer');footer.className='pond-version-footer';if(document.getElementById('blockly'))footer.classList.add('game-version-footer');document.body.appendChild(footer);}
    if(footer.querySelector('.site-version'))return;
    var label=document.createElement('span');label.className='site-version';label.textContent=revision?'Версия '+revision.slice(0,8):'Версия не определена';label.title=revision?'Опубликованный коммит: '+revision:'Не удалось определить опубликованный коммит';footer.appendChild(label);
  }
  mount();
  // The retained game bundles replace the body when their editor is initialized.
  new MutationObserver(mount).observe(document.body,{childList:true});
})();
