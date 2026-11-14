import json
import queue
import subprocess
import sys
import threading
import time
import xml.etree.ElementTree as ET

from .store import ROOT, db

LESSONS = 15


def concept_error(level, xml, metrics):
    """Check concepts, not exact values, names, operators or block ordering."""
    root = ET.fromstring(xml)
    def active(node):
        if node.get('disabled') == 'true':
            return
        if node.tag.split('}')[-1] == 'block':
            yield node
        for child in node:
            yield from active(child)
    blocks = list(active(root))
    types = {b.get('type') for b in blocks}
    loops = {'controls_whileUntil', 'controls_repeat_ext', 'controls_repeat', 'controls_for', 'controls_forEach'}
    if level in (2, 3, 4, 9, 10, 11) and not metrics.get('scan'):
        return 'Попробуй использовать радар scan во время выполнения программы.'
    if level == 3 and not {'variables_set', 'variables_get'}.issubset(types):
        return 'Исследуй использование переменной для направления.'
    if level == 4 and not metrics.get('log'):
        return 'Выведи измерение через log, чтобы увидеть результат работы радара.'
    if level == 6 and (not metrics.get('speed') or not types.intersection(loops)):
        return 'Используй измерение скорости и цикл для ожидания.'
    if level == 7:
        nested = any(b.get('type') in loops and any(x is not b and x in blocks and x.get('type') in loops for x in b.iter()) for b in blocks)
        if not nested:
            return 'Исследуй повторение: помести один цикл внутрь другого.'
    if level == 8 and (not metrics.get('getX') or not metrics.get('getY') or not types.intersection(loops)):
        return 'Используй обе координаты и циклы, чтобы управлять маршрутом.'
    if level in (1, 2, 3, 4, 9) and not metrics.get('cannon'):
        return 'На этом уровне нужно исследовать стрельбу.'
    if level in (5, 6, 7, 8, 10, 11) and metrics.get('cannon'):
        return 'На этом уровне цели нужно протаранить без выстрелов.'
    return None


def duel(spec, job_id, title):
    with db() as c:
        match_id = c.execute('INSERT INTO matches(job_id,title,status,created) VALUES(?,?,?,?)',
                             (job_id, title, 'running', time.time())).lastrowid
    process = subprocess.Popen([sys.executable, '-m', 'server.runner'], cwd=str(ROOT),
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE, text=True, encoding='utf-8')
    lines = queue.Queue(maxsize=1500)

    def read_output():
        try:
            for line in process.stdout:
                lines.put(line)
        finally:
            lines.put(None)

    thread = threading.Thread(target=read_output, daemon=True)
    thread.start()
    snapshot = None
    started = time.monotonic()
    try:
        process.stdin.write(json.dumps(spec) + '\n')
        process.stdin.close()
        while True:
            if time.monotonic() - started > (int(spec.get('seconds', 60)) + 100):
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
            with db() as c:
                c.execute('UPDATE matches SET snapshot=? WHERE id=?', (json.dumps(snapshot), match_id))
        process.wait(timeout=5)
        if process.returncode or not snapshot or not snapshot.get('done'):
            raise RuntimeError('Бой не завершился: проверь установку quickjs и журнал сервера')
        with db() as c:
            c.execute("UPDATE matches SET status='done',result=? WHERE id=?", (json.dumps(snapshot), match_id))
        return snapshot
    except Exception:
        with db() as c:
            c.execute("UPDATE matches SET status='error' WHERE id=?", (match_id,))
        raise
    finally:
        if process.poll() is None:
            process.kill()
        process.wait(timeout=5)
        process.stdout.close()
        process.stderr.close()


def train(job):
    result = duel({'level': job['level'], 'code': job['code'], 'seconds': 120}, job['id'], 'Проверка уровня %s' % job['level'])
    avatars = result['avatars']
    if avatars[0].get('error'):
        return {'passed': False, 'message': 'Алгоритм не удалось выполнить. Измени блоки и попробуй снова.'}
    error = concept_error(job['level'], job['xml'], result['metrics'])
    victory = not avatars[0]['dead'] and all(a['dead'] for a in avatars[1:])
    if not victory or error:
        return {'passed': False, 'message': error or 'На серверной проверке остались цели. Попробуй улучшить алгоритм и повторить эксперимент.'}
    with db() as c:
        for level in range(1, job['level']):
            if not c.execute('SELECT 1 FROM progress WHERE user_id=? AND level=?', (job['user_id'], level)).fetchone():
                return {'passed': False, 'message': 'Сначала заверши предыдущие уровни.'}
        c.execute('INSERT OR REPLACE INTO progress VALUES(?,?,?,?,?)',
                  (job['user_id'], job['level'], job['code'], job['xml'], time.time()))
    return {'passed': True, 'message': 'Уровень пройден. Можно продолжать.', 'unlocked': job['level'] == LESSONS}


def compare(job, opponent, seconds):
    score = 0
    for mirror in (False, True):
        positions = [(20, 20), (80, 80)]
        if mirror:
            positions.reverse()
        avatars = [
            dict(name=job['team'], x=positions[0][0], y=positions[0][1], code=job['code']),
            dict(name=opponent['team'], x=positions[1][0], y=positions[1][1], code=opponent['code']),
        ]
        frame = duel({'avatars': avatars, 'seconds': seconds, 'realtime': True}, job['id'],
                     '%s — %s · бой %s/2' % (job['team'], opponent['team'], 2 if mirror else 1))
        left, right = frame['avatars']
        if left.get('error'):
            raise ValueError('Алгоритм не удалось выполнить. Исправь блоки и отправь снова.')
        difference = left['health'] - right['health']
        score += 1 if difference > .0001 else -1 if difference < -.0001 else 0
    return score > 0  # Draws retain the incumbent order.


def rank(job):
    with db() as c:
        tournament = c.execute('SELECT * FROM tournaments WHERE id=?', (job['tournament_id'],)).fetchone()
        if not tournament or tournament['status'] != 'open':
            return {'message': 'Турнир закрыт. Решение не добавлено.', 'accepted': False}
        entries = [dict(row) for row in c.execute('SELECT e.*,u.team FROM entries e JOIN users u ON u.id=e.user_id WHERE tournament_id=? ORDER BY position,id', (tournament['id'],))]
    incumbent = next((e for e in entries if e['user_id'] == job['user_id']), None)
    opponents = [e for e in entries if e['user_id'] != job['user_id']]
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
    opponents.insert(low, dict(user_id=job['user_id'], code=job['code'], xml=job['xml'], submission_id=job['id']))
    with db() as c:
        current = c.execute('SELECT status FROM tournaments WHERE id=?', (tournament['id'],)).fetchone()
        if current['status'] != 'open':
            return {'accepted': False, 'message': 'Турнир закрыт во время проверки. Таблица не изменена.'}
        c.execute('DELETE FROM entries WHERE tournament_id=?', (tournament['id'],))
        for position, entry in enumerate(opponents, 1):
            c.execute('INSERT INTO entries(tournament_id,user_id,position,code,xml,submission_id) VALUES(?,?,?,?,?,?)',
                      (tournament['id'], entry['user_id'], position, entry['code'], entry['xml'], entry['submission_id']))
    return {'accepted': True, 'position': candidate_position, 'message': 'Лучший алгоритм команды сохранён в таблице.'}


def work(stop):
    while not stop.is_set():
        with db() as c:
            row = c.execute("SELECT j.*,u.team FROM jobs j JOIN users u ON u.id=j.user_id WHERE j.status='queued' ORDER BY CASE kind WHEN 'training' THEN 0 ELSE 1 END,j.id LIMIT 1").fetchone()
            if row:
                c.execute("UPDATE jobs SET status='running' WHERE id=?", (row['id'],))
        if not row:
            stop.wait(.5)
            continue
        job = dict(row)
        try:
            result = train(job) if job['kind'] == 'training' else rank(job)
            status = 'done'
        except Exception as error:
            result = {'message': str(error)[:300] or 'Ошибка выполнения боя'}
            status = 'error'
        with db() as c:
            c.execute('UPDATE jobs SET status=?,result=? WHERE id=?', (status, json.dumps(result, ensure_ascii=False), job['id']))
