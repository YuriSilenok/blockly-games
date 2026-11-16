/* Health labels stay at the right edge of the full bar, even at very low HP. */
(function(){
  'use strict';
  var format=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3});
  window.PondHealth={update:function(avatars,damageKey,barKey){
    avatars.forEach(function(avatar){
      var bar=avatar[barKey],cell=bar&&bar.parentNode;if(!cell)return;
      var health=Math.max(0,Math.min(100,100-avatar[damageKey]));
      var value=health>0&&health<0.001?'<0,001':format.format(health);
      var text=value+' ХП';
      var label=avatar.pondHealthLabel;
      if(!label||label.parentNode!==cell){
        label=document.createElement('span');label.className='avatarStatHealthValue';
        cell.classList.add('avatarHealthCell');cell.appendChild(label);avatar.pondHealthLabel=label;
        bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
      }
      if(label.textContent!==text)label.textContent=text;
      cell.title=avatar.name+': '+text;
      bar.setAttribute('aria-label',avatar.name+' — остаток здоровья');
      bar.setAttribute('aria-valuenow',String(health));bar.setAttribute('aria-valuetext',text);
    });
  }};
})();
