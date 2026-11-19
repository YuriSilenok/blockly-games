/* Fetch and decode recordings away from the animation thread. */
'use strict';
self.onmessage=async function(event){
  var id=event.data.id;
  try{
    var url=new URL(event.data.url,self.location.origin);if(url.origin!==self.location.origin)throw Error('Недопустимый адрес записи.');
    var response=await fetch(url.href,{credentials:'same-origin'}),data;
    try{data=await response.json();}catch(error){throw Error('Не удалось загрузить фрагмент записи. Повтори воспроизведение.');}
    if(!response.ok)throw Error(data.error||'Не удалось загрузить фрагмент записи.');
    if(!Array.isArray(data.frames)||!data.frames.length)throw Error('Фрагмент записи не содержит кадров.');
    // Adjacent frames repeat the same events; preserve shared references in the clone.
    var scans=new Map(),flights=new Map();
    data.frames.forEach(function(frame){
      ['scans','flights'].forEach(function(key){var pool=key==='scans'?scans:flights;frame[key]=(frame[key]||[]).map(function(item){if(!pool.has(item.id))pool.set(item.id,item);return pool.get(item.id);});});
      delete frame.metrics;
    });
    self.postMessage({id:id,frames:data.frames});
  }catch(error){self.postMessage({id:id,error:error.message||'Не удалось загрузить запись.'});}
};
