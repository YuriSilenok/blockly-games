import json
import queue
import random
import math
import subprocess
import sys
import threading
import time
import xml.etree.ElementTree as ET
import zlib
from collections import deque

from .store import ROOT, db
from .blocks import block_errors, active_nodes, number_count, scan_in_cannon, lesson_four_problem, nested_loop_problem
from . import challenges
from . import arena
from . import sandbox
from .control import RoundStopped

LESSONS = 20
_live_lock = threading.Lock()
_live_match = None
_live_frames = deque(maxlen=150)


def live_frames(match_id, after=-1):
    with _live_lock:
        return [frame for frame in _live_frames if frame['time'] > after] if _live_match == match_id else []


PIXELS_PER_UNIT = (400 - 35) / 100  # Pond's canvas includes a half-duck inset at each edge.


def concept_error(level, xml, metrics):
    """Check concepts, not exact values, names, operators or block ordering."""
    root = ET.fromstring(xml)
    blocks = list(active_nodes(root))
    types = {b.get('type') for b in blocks}
    loops = {'controls_whileUntil', 'controls_repeat_ext', 'controls_repeat', 'controls_for', 'controls_forEach'}
    if level == 2 and not scan_in_cannon(root):
        return 'Условие второго уровня: используй scan внутри параметра расстояния блока cannon.'
    if level in (2, 3, 4, 13, 14, 15, 16) and not metrics.get('scan'):
        return 'Попробуй использовать радар scan во время выполнения программы.'
    if level == 3 and not {'variables_set', 'variables_get'}.issubset(types):
        return 'Исследуй использование переменной для направления.'
    if level == 3 and number_count(root) != 1:
        return 'Условие третьего уровня: нужен ровно один числовой блок. Сейчас их: %s.' % number_count(root)
    if level == 4 and not metrics.get('log'):
        return 'Выведи измерение через log, чтобы увидеть результат работы радара.'
    if level == 4 and lesson_four_problem(root):
        return lesson_four_problem(root)
    if level == 6 and (not metrics.get('speed') or not types.intersection(loops)):
        return 'Используй измерение скорости и цикл для ожидания.'
    if level in (6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16) and nested_loop_problem(root, level):
        return nested_loop_problem(root, level)
    if level in (11, 12) and (not metrics.get('getX') or not metrics.get('getY') or not types.intersection(loops)):
        return 'Используй обе координаты и циклы, чтобы управлять маршрутом.'
    if level in (1, 2, 3, 4, 13, 15) and not metrics.get('cannon'):
        return 'На этом уровне нужно исследовать стрельбу.'
    if level in (5, 6, 7, 8, 9, 10, 11, 12, 14, 16) and metrics.get('cannon'):
        return 'На этом уровне цели нужно протаранить без выстрелов.'
    return None


def duel(spec, job_id, title):
    global _live_match
    with db() as c:
        match_id = c.execute('INSERT INTO matches(job_id,title,status,created) VALUES(?,?,?,?)',
                             (job_id, title, 'running', time.time())).lastrowid
    process = subprocess.Popen([sys.executable, '-m', 'server.runner'], cwd=str(ROOT),
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True, encoding='utf-8')
    lines = queue.Queue(maxsize=1500)
    reader_stop = threading.Event()

    def read_output():
        try:
            for line in process.stdout:
                while not reader_stop.is_set():
                    try:
                        lines.put(line, timeout=.2)
                        break
                    except queue.Full:
                        continue
                if reader_stop.is_set():
                    break
        finally:
            while not reader_stop.is_set():
                try:
                    lines.put(None, timeout=.2)
                    break
                except queue.Full:
                    continue

    thread = threading.Thread(target=read_output, daemon=True)
    thread.start()
    snapshot = None
    if spec.get('realtime'):
        with _live_lock:
            _live_match = match_id
            _live_frames.clear()
    replay_frames = []
    replay_index = 0

    def flush_replay():
        nonlocal replay_index
        if not replay_frames:
            return
        payload = zlib.compress(json.dumps(replay_frames, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
        with db() as c:
            c.execute('INSERT INTO match_replay_chunks(match_id,chunk_index,first_time,last_time,frame_count,payload) VALUES(?,?,?,?,?,?)',
                      (match_id, replay_index, replay_frames[0]['time'], replay_frames[-1]['time'], len(replay_frames), payload))
        replay_frames.clear()
        replay_index += 1

    started = time.monotonic()
    stop_check_at = 0

    def check_stop():
        if spec.get('realtime'):
            with db() as c:
                row = c.execute('SELECT stop_requested FROM rounds WHERE job_id=?', (job_id,)).fetchone()
            if row and row['stop_requested']:
                raise RoundStopped(snapshot)
    try:
        process.stdin.write(json.dumps(spec, ensure_ascii=False) + '\n')
        process.stdin.close()
        while True:
            if time.monotonic() >= stop_check_at:
                check_stop()
                stop_check_at = time.monotonic() + .2
            if not spec.get('no_damage_seconds') and time.monotonic() - started > (int(spec.get('seconds', 60)) + 100):
                raise RuntimeError('Превышено время выполнения боя')
            try:
                line = lines.get(timeout=1)
            except queue.Empty:
                continue
            if line is None:
                break
            snapshot = json.loads(line)
            if snapshot.get('error'):
                raise RuntimeError(snapshot['error'])
            if spec.get('realtime'):
                with _live_lock:
                    _live_frames.append({key: value for key, value in snapshot.items() if key != 'metrics'})
            if spec.get('record_replay'):
                replay_frames.append(snapshot)
                if len(replay_frames) >= 200:
                    flush_replay()
            if not spec.get('record_replay') or snapshot.get('done') or round(snapshot['time'] * 50) % 5 == 0:
                with db() as c:
                    c.execute('UPDATE matches SET snapshot=? WHERE id=?', (json.dumps(snapshot), match_id))
        check_stop()
        process.wait(timeout=5)
        if process.returncode:
            print('Battle runner exited: job=%s match=%s returncode=%s game_time=%s' % (job_id, match_id, process.returncode, snapshot.get('time') if snapshot else None), file=sys.stderr, flush=True)
            raise RuntimeError('Исполнитель боя остановлен ограничением ресурсов. Завершённые поединки сохранены; прерванную серию можно продолжить.')
        if not snapshot or not snapshot.get('done'):
            raise RuntimeError('Сервер не смог завершить проверку. Попробуй отправить решение ещё раз.')
        flush_replay()
        with db() as c:
            c.execute("UPDATE matches SET status='done',result=? WHERE id=?", (json.dumps(snapshot), match_id))
        return dict(snapshot, match_id=match_id)
    except RoundStopped as error:
        if process.poll() is None:
            process.kill()
        if snapshot:
            stopped = dict(snapshot, done=True, winner=None, end_reason='stopped', match_id=match_id)
            if spec.get('record_replay'):
                if replay_frames and replay_frames[-1]['time'] == stopped['time']:
                    replay_frames[-1] = stopped
                else:
                    replay_frames.append(stopped)
                flush_replay()
            error.snapshot = stopped
        with db() as c:
            c.execute("UPDATE matches SET status='stopped',snapshot=?,result=?,failure=NULL WHERE id=?", (json.dumps(error.snapshot) if error.snapshot else None, json.dumps(error.snapshot) if error.snapshot else None, match_id))
        raise
    except Exception as error:
        with db() as c:
            c.execute("UPDATE matches SET status='error',failure=? WHERE id=?", (str(error)[:300], match_id))
        raise
    finally:
        reader_stop.set()
        if process.poll() is None:
            process.kill()
        process.wait(timeout=5)
        thread.join(timeout=1)
        process.stdout.close()
        process.stderr.close()


def train(job):
    issues = block_errors(ET.fromstring(job['xml']))
    if issues:
        return {'passed': False, 'message': 'Проверь программу:\n' + '\n'.join(issues[:8])}
    result = duel({'level': job['level'], 'code': job['code'], 'seconds': 120}, job['id'], 'Проверка уровня %s' % job['level'])
    avatars = result['avatars']
    if avatars[0].get('error'):
        return {'passed': False, 'message': avatars[0]['error']}
    error = concept_error(job['level'], job['xml'], result['metrics'])
    victory = not avatars[0]['dead'] and all(a['dead'] for a in avatars[1:])
    if not victory or error:
        return {'passed': False, 'message': error or 'На серверной проверке остались цели. Попробуй улучшить алгоритм и повторить эксперимент.'}
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        if job['level'] == 4:
            error = challenges.problem(c, job['user_id'], job['code'], job['xml'], job['console_challenge_id'], job['console_answer_hash'] or '')
            if error:
                return {'passed': False, 'message': error}
        for level in range(1, job['level']):
            if not c.execute('SELECT 1 FROM progress WHERE user_id=? AND level=?', (job['user_id'], level)).fetchone():
                return {'passed': False, 'message': 'Сначала заверши предыдущие уровни.'}
        c.execute('INSERT OR REPLACE INTO progress VALUES(?,?,?,?,?)',
                  (job['user_id'], job['level'], job['code'], job['xml'], time.time()))
        if job['level'] == 4:
            c.execute('UPDATE training_challenges SET used=1 WHERE id=?', (job['console_challenge_id'],))
    return {'passed': True, 'message': 'Уровень пройден. Можно продолжать.', 'unlocked': job['level'] == LESSONS}


def starting_positions():
    # Use the saved renderer's scale: coordinate / 100 * (canvasWidth - 35).
    rng = random.SystemRandom()
    while True:
        positions = [(rng.uniform(10, 90), rng.uniform(10, 90)) for _ in range(2)]
        if math.hypot(positions[0][0] - positions[1][0], positions[0][1] - positions[1][1]) * PIXELS_PER_UNIT >= 70:
            return positions


def compare(job, opponent, seconds):
    wins = [0, 0]
    round_number = 0
    candidate_earlier = job['id'] < opponent.get('submission_id', -1)
    while max(wins) < 2:
        positions = starting_positions()
        round_number += 1
        avatars = [
            dict(name=job['team'], x=positions[0][0], y=positions[0][1], code=job['code']),
            dict(name=opponent['team'], x=positions[1][0], y=positions[1][1], code=opponent['code']),
        ]
        frame = duel({'avatars': avatars, 'seconds': seconds, 'realtime': True}, job['id'],
                     '%s — %s · счёт %s:%s · бой %s · до двух побед' % (job['team'], opponent['team'], wins[0], wins[1], round_number))
        left, right = frame['avatars']
        if left.get('error'):
            raise ValueError(left['error'])
        difference = left['health'] - right['health']
        if difference > .0001:
            wins[0] += 1
        elif difference < -.0001:
            wins[1] += 1
        else:
            wins[0 if candidate_earlier else 1] += 1
        with db() as c:
            c.execute('UPDATE matches SET title=? WHERE id=(SELECT max(id) FROM matches WHERE job_id=?)',
                      ('%s — %s · счёт %s:%s · бой %s завершён%s' % (job['team'], opponent['team'], wins[0], wins[1], round_number,
                       ' · равный результат: приоритет ранней отправки' if abs(difference) <= .0001 else ''), job['id']))
    return wins[0] == 2


def rank(job):
    with db() as c:
        tournament = c.execute('SELECT * FROM tournaments WHERE id=?', (job['tournament_id'],)).fetchone()
        if not tournament or tournament['status'] != 'open':
            return {'message': 'Турнир закрыт. Решение не добавлено.', 'accepted': False}
        entries = [dict(row) for row in c.execute('SELECT e.*,t.name AS team FROM entries e JOIN teams t ON t.id=e.team_id WHERE tournament_id=? ORDER BY position,e.id', (tournament['id'],))]
    incumbent = next((e for e in entries if e['team_id'] == job['team_id']), None)
    opponents = [e for e in entries if e['team_id'] != job['team_id']]
    low, high = 0, len(opponents)
    if not opponents:
        # Even the first submission must be executable; its baseline bout is visible.
        compare(job, {'team': 'Проверочный соперник', 'code': 'var a=0; while(true){cannon(a,scan(a)); a+=5;}'}, tournament['seconds'])
    while low < high:
        middle = (low + high) // 2
        if compare(job, opponents[middle], tournament['seconds']):
            high = middle
        else:
            low = middle + 1
    candidate_position = low + 1
    if incumbent and candidate_position >= incumbent['position']:
        return {'accepted': False, 'position': incumbent['position'], 'candidate_position': candidate_position,
                'message': 'Прежний алгоритм сохранил лучшее место в таблице.'}
    opponents.insert(low, dict(user_id=job['user_id'], team_id=job['team_id'], code=job['code'], xml=job['xml'], submission_id=job['id']))
    with db() as c:
        current = c.execute('SELECT status FROM tournaments WHERE id=?', (tournament['id'],)).fetchone()
        if current['status'] != 'open':
            return {'accepted': False, 'message': 'Турнир закрыт во время проверки. Таблица не изменена.'}
        c.execute('DELETE FROM entries WHERE tournament_id=?', (tournament['id'],))
        for position, entry in enumerate(opponents, 1):
            c.execute('INSERT INTO entries(tournament_id,user_id,team_id,position,code,xml,submission_id) VALUES(?,?,?,?,?,?,?)',
                      (tournament['id'], entry['user_id'], entry['team_id'], position, entry['code'], entry['xml'], entry['submission_id']))
    return {'accepted': True, 'position': candidate_position, 'message': 'Лучший алгоритм команды сохранён в таблице.'}


def work(stop):
    while not stop.is_set():
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            row = None
            if not c.execute("SELECT 1 FROM jobs WHERE status='running' LIMIT 1").fetchone():
                row = c.execute("SELECT j.*,t.name AS team FROM jobs j LEFT JOIN teams t ON t.id=j.team_id WHERE j.status='queued' ORDER BY CASE kind WHEN 'training' THEN 0 ELSE 1 END,j.id LIMIT 1").fetchone()
            if row:
                c.execute("UPDATE jobs SET status='running' WHERE id=?", (row['id'],))
        if not row:
            stop.wait(.5)
            continue
        job = dict(row)
        try:
            if job['kind'] == 'training':
                result = train(job)
            elif job['kind'] == 'round':
                result = arena.run_round(job, duel)
            elif job['kind'] == 'sandbox':
                result = sandbox.rank(job, duel)
            else:
                result = {'accepted': False, 'message': 'Автоматическое ранжирование заменено раундами. Сохрани и заяви алгоритм в новой библиотеке.'}
            status = 'done'
        except RoundStopped as error:
            result = {'message': str(error)}
            status = 'cancelled'
        except Exception as error:
            result = {'message': str(error)[:300] or 'Ошибка выполнения боя'}
            status = 'error'
        with db() as c:
            c.execute('UPDATE jobs SET status=?,result=? WHERE id=?', (status, json.dumps(result, ensure_ascii=False), job['id']))
