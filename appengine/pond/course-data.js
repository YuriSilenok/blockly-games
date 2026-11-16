/* Shared course scenarios. Executed directly by the browser and match runner. */
(function (root) {
  'use strict';
  var bots = {};
  (root.DUCKS || []).forEach(function (duck) {
    if (!duck.editable) bots[duck.id] = duck.compiled;
  });
  var flee = 'var a = 0; while (true) { if (getX() < 15) a = 0; if (getX() > 85) a = 180; if (getY() < 15) a = 90; if (getY() > 85) a = 270; swim(a); }';
  function avatar(name, x, y, damage, code) {
    return {name: name, x: x, y: y, damage: damage || 0, code: code || ''};
  }
  function target(x, y, index) { return avatar('Цель ' + (index || 1), x, y, 99); }
  function hero(x, y) { return avatar('Игрок', x, y, 0); }
  var all = ['rook', 'counter', 'sniper'];
  var names = {rook: 'Ладья', counter: 'Контратакующий', sniper: 'Снайпер'};
  var positions = [[80, 80], [20, 80], [80, 20]];
  var lessons = [
    {title: 'Первый выстрел', task: 'Порази цель над своей уткой выстрелом.', concepts: ['cannon'], mission: 'shoot', scene: [hero(50, 50), target(50, 85)]},
    {title: 'Измерение расстояния', task: 'Порази цель слева выстрелом. Дальность выстрела должна определяться показанием радара.', concepts: ['scan'], mission: 'scan-shoot', scene: [hero(50, 50), target(15, 50)]},
    {title: 'Один угол — несколько действий', task: 'Порази цель снизу выстрелом. В программе должны присутствовать радар и переменная. Дополнительное условие: ровно один числовой блок во всей активной программе. Одинаковые числа в разных блоках считаются отдельно; отключённые блоки не учитываются.', concepts: ['variables'], mission: 'variable', scene: [hero(50, 50), target(50, 15)]},
    {title: 'Наблюдение за измерениями', task: 'Порази цель справа и выведи расстояние до неё в консоль. В активной программе должны быть ровно один числовой блок, один log, один cannon и один scan. После победы введи проверочное шестизначное число, которое появилось в консоли браузера при запуске этой попытки.', concepts: ['log'], mission: 'log', scene: [hero(50, 50), target(85, 50)]},
    {title: 'Первый таран', task: 'Протарань цель. Стрелять нельзя.', concepts: ['swim'], mission: 'ram', scene: [hero(50, 20), target(50, 80)]},
    {title: 'Две цели', task: 'Протарань обе цели. В программе должны присутствовать цикл и измерение скорости. Стрелять нельзя.', concepts: ['speed', 'while', 'compare'], mission: 'wait', scene: [hero(50, 50), target(80, 50), target(20, 50, 2)]},
    {title: 'Три цели', task: 'Протарань все цели. В программе должны быть ровно два цикла «пока», без других видов циклов. Стрелять нельзя.', concepts: [], mission: 'two-while', scene: [hero(10, 10), target(90, 10), target(85, 90, 2), target(10, 85, 3)]},
    {title: 'Повторяющийся маршрут', task: 'Протарань все цели. В программе должны быть ровно один цикл «повторить» и один цикл «пока», без других видов циклов. Стрелять нельзя.', concepts: ['repeat', 'nested', 'change'], mission: 'nested-repeat', scene: [hero(10, 10), target(90, 10), target(85, 90, 2), target(10, 85, 3)]},
    {title: 'Движение по координатам', task: 'Протарань три цели. В программе должны присутствовать циклы и измерения обеих координат. Стрелять нельзя.', concepts: ['coordinates'], mission: 'coordinates', scene: [hero(10, 10), target(90, 10), target(90, 90, 2), target(10, 90, 3)]},
    {title: 'Цели вокруг', task: 'Порази все цели выстрелами. В программе должен работать радар.', concepts: ['if'], mission: 'scan-shoot', scene: [hero(50, 50), target(78, 67), target(23, 73, 2), target(35, 19, 3)]},
    {title: 'Таран по всем направлениям', task: 'Протарань все цели. В программе должен работать радар. Стрелять нельзя.', concepts: [], mission: 'scan-ram', scene: [hero(50, 50), target(82, 63), target(19, 71, 2), target(34, 18, 3)]},
    {title: 'Догонялки', task: 'Догони и протарань всех движущихся противников. В программе должен работать радар. Стрелять нельзя.', concepts: [], mission: 'scan-ram', scene: [hero(50, 50), avatar('Беглец 1', 80, 30, 99, flee), avatar('Беглец 2', 25, 80, 99, flee)]}
  ];
  all.forEach(function (id) {
    lessons.push({title: 'Поединок: ' + names[id], task: 'Победи противника «' + names[id] + '». Способ победы выбираешь ты.', concepts: [], mission: 'battle', scene: [hero(20, 20), avatar(names[id], 80, 80, 0, bots[id])]});
  });
  lessons.push({title: 'Допуск к турниру', task: 'Победи трёх разных противников одновременно. Собери собственную стратегию. После победы откроется отправка алгоритма на турнир.', concepts: [], mission: 'battle', scene: [hero(20, 20)].concat(all.map(function (id, i) { return avatar(names[id], positions[i][0], positions[i][1], 0, bots[id]); }))});
  root.POND_COURSE = lessons;
})(typeof window === 'undefined' ? globalThis : window);
