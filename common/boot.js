/** Saved bundles only; the site has one language. */
(async function () {
  'use strict';
  var match = location.pathname.match(/\/([-\w]+)(?:\.html)?$/);
  var app = match ? match[1].replace('-', '/') : 'index';
  await PondPortal.ready;
  if(!PondPortal.user){PondPortal.signIn();return;}
  window.BlocklyGamesLanguages = ['ru'];
  window.BlocklyGamesLang = 'ru';
  var messages = document.createElement('script');
  messages.src = app + '/generated/msg/ru.js';
  messages.onload = function () {
    var bundle = document.createElement('script');
    bundle.src = app + '/generated/compressed.js';
    document.head.appendChild(bundle);
  };
  document.head.appendChild(messages);
})();
