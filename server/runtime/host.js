/* Headless adapters for the saved Pond engine. No compiler or browser required. */
var window = globalThis;
var console = {log: function () {}, warn: function () {}};
var goog = {provide: function () {}, require: function () {}};
var Pond = {Battle: {}};
var BlocklyGames = {normalizeAngle: function (a) { return ((a % 360) + 360) % 360; }};
var Blockly = {utils: {math: {
  toRadians: function (a) { return a * Math.PI / 180; },
  toDegrees: function (a) { return a * 180 / Math.PI; },
  clamp: function (a, lo, hi) { return Math.max(lo, Math.min(hi, a)); }
}}};
Blockly.utils.Coordinate = function (x, y) { this.x = x || 0; this.y = y || 0; };
Blockly.utils.Coordinate.distance = function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y); };
var matchClock = 1000;
Date.now = function () { return matchClock; };
function clearTimeout() {}
function setTimeout() { return 0; }
var matchMetrics;
function learnerError(error) {
  var name = String(error && error.name || '');
  if (name === 'ReferenceError') return 'Ошибка выполнения: переменная ещё не получила значение. Задай её значение до первого использования.';
  if (name === 'TypeError') return 'Ошибка выполнения: проверь числовые параметры блоков и значения переменных.';
  if (name === 'SyntaxError') return 'Не удалось запустить программу. Проверь соединения блоков и заполнение их параметров.';
  if (name === 'RangeError') return 'Программа превысила допустимую глубину вызовов. Проверь вызовы функций.';
  return 'Программу не удалось выполнить. Проверь параметры блоков и значения переменных.';
}
function startMatch(spec) {
  var battle = Pond.Battle;
  battle.AVATARS.length = 0;
  battle.RANK.length = 0;
  matchClock = 1000;
  battle.lastDamageAt = matchClock;
  battle.eliminationCount = 0;
  battle.nextMissileId = 0;
  battle.recordReplay = !!spec.record_replay;
  battle.replayScans = [];
  battle.replayFlights = [];
  battle.nextScanId = 0;
  battle.idleLimit = spec.no_damage_seconds ? Number(spec.no_damage_seconds) * 1000 : Infinity;
  battle.clockLimit = spec.no_damage_seconds ? Infinity : 121000;
  matchMetrics = {scan: 0, cannon: 0, swim: 0, speed: 0, getX: 0, getY: 0, log: 0};
  spec.avatars.forEach(function (item, index) {
    var duck = new Pond.Avatar(item.name, new Blockly.utils.Coordinate(item.x, item.y), item.damage || 0, false, battle);
    duck.setCode(undefined, undefined, item.code);
    if (index === 0) Pond.currentAvatar = duck;
  });
  battle.reset();
  var initialize = battle.initInterpreter;
  battle.AVATARS.forEach(function (duck, index) {
    try {
      duck.interpreter = new Interpreter(duck.compiled, function (interpreter, scope) {
        initialize(interpreter, scope);
        if (index !== 0) return;
        Object.keys(matchMetrics).forEach(function (name) {
          var original = interpreter.getProperty(scope, name);
          if (!original || !original.nativeFunc) return;
          var fn = original.nativeFunc;
          original.nativeFunc = function () {
            matchMetrics[name]++;
            if (['scan', 'cannon', 'swim'].indexOf(name) !== -1 && !Number.isFinite(arguments[0])) throw new TypeError();
            return fn.apply(this, arguments);
          };
        });
      });
      var step = duck.interpreter.step;
      duck.interpreter.step = function () {
        try { return step.apply(this, arguments); }
        catch (error) { duck.loadError = learnerError(error); throw error; }
      };
    } catch (error) {
      duck.die();
      duck.loadError = learnerError(error);
    }
  });
}
function advanceMatch(frames) {
  var b = Pond.Battle;
  for (var i = 0; i < frames; i++) {
    matchClock += 20;
    b.updateInterpreters_();
    b.updateMissiles_();
    b.updateAvatars_();
    if (b.recordReplay) {
      var seenScans = {};
      b.EVENTS.forEach(function (event) {
        var avatar = b.AVATARS.indexOf(event.avatar);
        if (event.type === 'SCAN') {
          var key = avatar + ':' + event.degree + ':' + event.resolution;
          if (seenScans[key]) return;
          seenScans[key] = true;
          b.replayScans.push({id: ++b.nextScanId, avatar: avatar, x: event.x, y: event.y,
            degree: event.degree, resolution: event.resolution, time: (event.at - 1000) / 1000});
        } else if (event.type === 'BANG') {
          var m = event.missile;
          var steps = Math.max(1, Math.floor((m.range - b.MISSILE_SPEED / 2) / b.MISSILE_SPEED) + 1);
          var start = (m.launchedAt - 1000) / 1000;
          b.replayFlights.push({id: m.replayId, avatar: avatar, startX: m.startLoc.x, startY: m.startLoc.y,
            endX: m.endLoc.x, endY: m.endLoc.y, startTime: start, endTime: start + (steps - 1) / b.GAME_FPS});
        }
      });
      var now = (matchClock - 1000) / 1000;
      b.replayScans = b.replayScans.filter(function (scan) { return now - scan.time <= .25; });
      b.replayFlights = b.replayFlights.filter(function (flight) { return now - flight.endTime <= .25; });
    }
    // Keep only the bounded, serializable recording above, never avatar references.
    b.EVENTS.length = 0;
    var alive = b.AVATARS.filter(function (a) { return !a.dead; });
    if (alive.length <= 1 || matchClock >= b.clockLimit || matchClock - b.lastDamageAt >= b.idleLimit) break;
  }
  var alive = b.AVATARS.filter(function (a) { return !a.dead; });
  return JSON.stringify({
    done: alive.length <= 1 || matchClock >= b.clockLimit || matchClock - b.lastDamageAt >= b.idleLimit,
    time: (matchClock - 1000) / 1000,
    metrics: matchMetrics,
    replay_version: b.recordReplay ? 2 : 0,
    scans: b.replayScans,
    flights: b.replayFlights,
    avatars: b.AVATARS.map(function (a) { return {name: a.name, x: a.loc.x, y: a.loc.y, facing: a.facing, health: Math.max(0, 100 - a.damage), dead: a.dead, eliminated: a.eliminatedOrder || b.eliminationCount + 1, kills: a.kills || 0, error: a.loadError || null}; }),
    missiles: b.MISSILES.map(function (m) { return {id: m.replayId, x: m.startLoc.x + (m.endLoc.x - m.startLoc.x) * Math.min(1, m.progress / Math.max(1, m.range)), y: m.startLoc.y + (m.endLoc.y - m.startLoc.y) * Math.min(1, m.progress / Math.max(1, m.range))}; })
  });
}
