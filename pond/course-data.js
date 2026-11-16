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
    {title: 'Первый выстрел', task: 'Исследуй направление и дальность cannon. Найди способ поразить цель над своей уткой.', concepts: ['cannon'], mission: 'shoot', scene: [hero(50, 50), target(50, 85)]},
    {title: 'Измерение расстояния', task: 'Цель слева. Попробуй измерить расстояние с помощью scan и использовать результат для точного выстрела. Дополнительное условие: используй scan внутри параметра расстояния блока cannon.', concepts: ['scan'], mission: 'scan-shoot', scene: [hero(50, 50), target(15, 50)]},
    {title: 'Один угол — несколько действий', task: 'Цель снизу. Исследуй, как переменная помогает использовать одно направление для поиска и выстрела. Дополнительное условие: во всей активной программе должен быть ровно один числовой блок. Даже одинаковые числа в разных блоках считаются отдельно. Отключённые блоки не учитываются.', concepts: ['variables'], mission: 'variable', scene: [hero(50, 50), target(50, 15)]},
    {title: 'Наблюдение за измерениями', task: 'Цель справа. Найди её с помощью scan и порази. Выведи измеренное расстояние через log. Используй во всей активной программе ровно один числовой блок, один log, один cannon и один scan. При запуске в консоль браузера выводится отдельное случайное шестизначное число. После победы введи это проверочное число в окне результата — только тогда уровень будет зачтён.', concepts: ['log'], mission: 'log', scene: [hero(50, 50), target(85, 50)]},
    {title: 'Движение одной командой', task: 'Что происходит после одного вызова swim? Подбери направление и доберись до цели. Попробуй обойтись одним блоком движения.', concepts: ['swim'], mission: 'ram', scene: [hero(50, 20), target(50, 80)]},
    {title: 'Момент остановки', task: 'Протарань обе цели. Исследуй speed и цикл: как дождаться остановки, прежде чем изменить направление?', concepts: ['speed', 'while', 'compare'], mission: 'wait', scene: [hero(50, 50), target(80, 50), target(20, 50, 2)]},
    {title: 'Два ожидания на маршруте', task: 'Протарань все цели, меняя направление движения на маршруте. Используй два цикла «пока», чтобы дождаться снижения скорости перед переходом к следующему участку. Подбери направления и условия ожидания самостоятельно. В программе должны быть ровно два цикла «пока», без других видов циклов.', concepts: [], mission: 'two-while', scene: [hero(10, 10), target(90, 10), target(85, 90, 2), target(10, 85, 3)]},
    {title: 'Маршрут с вложенными циклами', task: 'Протарань все цели, используя ровно два вложенных цикла: внешний «повторить» и внутренний «пока». Исследуй, как повторять движение и изменение направления, а внутри каждого повторения ждать снижения скорости. Значения и условия выбери самостоятельно.', concepts: ['repeat', 'nested', 'change'], mission: 'nested-repeat', scene: [hero(10, 10), target(90, 10), target(85, 90, 2), target(10, 85, 3)]},
    {title: 'Движение по координатам', task: 'Протарань три цели. Исследуй getX и getY: попробуй управлять сторонами маршрута тремя циклами, выполняющимися друг за другом.', concepts: ['coordinates'], mission: 'coordinates', scene: [hero(10, 10), target(90, 10), target(90, 90, 2), target(10, 90, 3)]},
    {title: 'Круговой поиск и стрельба', task: 'Цели вокруг тебя. Построй поиск по разным направлениям и используй измерения радара, чтобы поразить все цели выстрелами.', concepts: ['if'], mission: 'scan-shoot', scene: [hero(50, 50), target(78, 67), target(23, 73, 2), target(35, 19, 3)]},
    {title: 'Круговой поиск и таран', task: 'Найди все цели вокруг себя и протарань их. Попробуй связать измерения scan с выбором направления движения. Стрелять нельзя.', concepts: [], mission: 'scan-ram', scene: [hero(50, 50), target(82, 63), target(19, 71, 2), target(34, 18, 3)]},
    {title: 'Догонялки', task: 'Противники движутся. Исследуй, как часто нужно повторять поиск, чтобы догнать и протаранить каждого. Стрелять нельзя.', concepts: [], mission: 'scan-ram', scene: [hero(50, 50), avatar('Беглец 1', 80, 30, 99, flee), avatar('Беглец 2', 25, 80, 99, flee)]}
  ];
  all.forEach(function (id) {
    lessons.push({title: 'Поединок: ' + names[id], task: 'Победи противника «' + names[id] + '». Наблюдай за его поведением, экспериментируй с поиском, движением и стрельбой. Способ победы выбираешь ты.', concepts: [], mission: 'battle', scene: [hero(20, 20), avatar(names[id], 80, 80, 0, bots[id])]});
  });
  lessons.push({title: 'Допуск к турниру', task: 'Победи трёх разных противников одновременно. Собери собственную стратегию. После победы откроется отправка алгоритма на турнир.', concepts: [], mission: 'battle', scene: [hero(20, 20)].concat(all.map(function (id, i) { return avatar(names[id], positions[i][0], positions[i][1], 0, bots[id]); }))});
  root.POND_COURSE = lessons;
})(typeof window === 'undefined' ? globalThis : window);
