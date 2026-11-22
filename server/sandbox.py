"""Independent algorithm ladder and recordings of completed server-side fights."""
import json
import re
import time
import zlib
from urllib.parse import parse_qs, urlsplit
from .store import db
from .arena import positions


def initialize(c):
    c.executescript('''
      CREATE TABLE IF NOT EXISTS sandbox_submissions (
        job_id INTEGER PRIMARY KEY REFERENCES jobs(id),
        algorithm_id INTEGER NOT NULL REFERENCES algorithms(id),
        name TEXT NOT NULL, result TEXT);
      CREATE TABLE IF NOT EXISTS sandbox_entries (
        algorithm_id INTEGER PRIMARY KEY REFERENCES algorithms(id),
        user_id INTEGER NOT NULL REFERENCES users(id), position INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL, code TEXT NOT NULL, xml TEXT NOT NULL,
        job_id INTEGER NOT NULL REFERENCES jobs(id));
      CREATE TABLE IF NOT EXISTS sandbox_fights (
        match_id INTEGER PRIMARY KEY REFERENCES matches(id), job_id INTEGER NOT NULL REFERENCES jobs(id),
        encounter INTEGER NOT NULL, bout INTEGER NOT NULL,
        opponent_user_id INTEGER REFERENCES users(id), opponent_algorithm_id INTEGER REFERENCES algorithms(id),
        opponent_job_id INTEGER REFERENCES jobs(id), opponent_name TEXT NOT NULL,
        winner INTEGER NOT NULL, candidate_wins INTEGER NOT NULL, opponent_wins INTEGER NOT NULL,
        tied INTEGER NOT NULL DEFAULT 0, error TEXT,
        UNIQUE(job_id,encounter,bout));
      CREATE TABLE IF NOT EXISTS match_replay_chunks (
        match_id INTEGER NOT NULL REFERENCES matches(id), chunk_index INTEGER NOT NULL,
        first_time REAL NOT NULL, last_time REAL NOT NULL, frame_count INTEGER NOT NULL,
        payload BLOB NOT NULL, PRIMARY KEY(match_id,chunk_index));
      CREATE INDEX IF NOT EXISTS sandbox_algorithm ON sandbox_submissions(algorithm_id,job_id);
      CREATE INDEX IF NOT EXISTS sandbox_opponent ON sandbox_fights(opponent_user_id,match_id);
    ''')


def compare(job, opponent, encounter, duel):
    wins = [0, 0]
    for bout in range(1, 4):
        with db() as c:
            recorded = c.execute('SELECT * FROM sandbox_fights WHERE job_id=? AND encounter=? AND bout=?', (job['id'], encounter, bout)).fetchone()
        if recorded:
            if recorded['error']:
                raise ValueError(recorded['error'])
            wins = [recorded['candidate_wins'], recorded['opponent_wins']]
            if max(wins) == 2:
                return wins[0] == 2
            continue
        starts = positions(2)
        avatars = [dict(name=job['name'], code=job['code'], x=starts[0][0], y=starts[0][1]),
                   dict(name=opponent['name'], code=opponent['code'], x=starts[1][0], y=starts[1][1])]
        title = 'Песочница: %s — %s · бой %s' % (job['name'], opponent['name'], bout)
        frame = duel({'avatars': avatars, 'no_damage_seconds': 60, 'record_replay': True}, job['id'], title)
        left, right = frame['avatars']
        difference = left['health'] - right['health']
        tied = abs(difference) <= .0001
        if left.get('error'):
            winner = 1
        elif right.get('error'):
            winner = 0
        elif not tied:
            winner = 0 if difference > 0 else 1
        else:
            winner = 0 if job['id'] < opponent.get('job_id', 0) else 1
        wins[winner] += 1
        with db() as c:
            c.execute('''INSERT INTO sandbox_fights(match_id,job_id,encounter,bout,opponent_user_id,
              opponent_algorithm_id,opponent_job_id,opponent_name,winner,candidate_wins,opponent_wins,tied,error)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)''',
              (frame['match_id'], job['id'], encounter, bout, opponent.get('user_id'), opponent.get('algorithm_id'),
               opponent.get('job_id'), opponent['name'], winner, wins[0], wins[1], tied, left.get('error')))
            c.execute('UPDATE matches SET title=? WHERE id=?',
                      (title + ' · счёт %s:%s%s' % (wins[0], wins[1], ' · приоритет ранней отправки' if tied else ''), frame['match_id']))
        if left.get('error'):
            raise ValueError(left['error'])
        if max(wins) == 2:
            return wins[0] == 2
    return wins[0] == 2


def rank(job, duel):
    with db() as c:
        submission = c.execute('SELECT * FROM sandbox_submissions WHERE job_id=?', (job['id'],)).fetchone()
        if not submission:
            raise ValueError('Отправка в песочницу не найдена.')
        if submission['result']:
            return json.loads(submission['result'])
        entries = [dict(r) for r in c.execute('SELECT * FROM sandbox_entries ORDER BY position')]
    job = dict(job, name=submission['name'], algorithm_id=submission['algorithm_id'])
    incumbent = next((e for e in entries if e['algorithm_id'] == job['algorithm_id']), None)
    if incumbent:
        # A legacy queued duplicate cannot replace an already ranked immutable submission.
        result = {'accepted': False, 'position': incumbent['position'],
                  'message': 'Этот алгоритм уже находится в таблице. Для нового решения сохрани алгоритм под другим названием.'}
        with db() as c:
            c.execute('UPDATE sandbox_submissions SET result=? WHERE job_id=?', (json.dumps(result, ensure_ascii=False), job['id']))
        return result
    opponents = [e for e in entries if e['algorithm_id'] != job['algorithm_id']]
    low, high, encounter = 0, len(opponents), 0
    if not opponents:
        # The first entry still gets an executable server fight and a recording.
        compare(job, {'name': 'Проверочный соперник (вне таблицы)', 'code': ''}, 0, duel)
    while low < high:
        middle = (low + high) // 2
        encounter += 1
        if compare(job, opponents[middle], encounter, duel):
            high = middle
        else:
            low = middle + 1
    candidate = low + 1
    result = {'accepted': True, 'position': candidate,
              'candidate_position': candidate,
              'message': 'Алгоритм занял место в таблице песочницы.'}
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        # An administrator may rename the algorithm while its ranking fights run.
        opponents.insert(low, dict(algorithm_id=job['algorithm_id'], user_id=job['user_id'], name=job['name'], code=job['code'], xml=job['xml'], job_id=job['id']))
        for entry in opponents:
            current = c.execute('SELECT name FROM algorithms WHERE id=?', (entry['algorithm_id'],)).fetchone()
            if current:
                entry['name'] = current['name']
        c.execute('DELETE FROM sandbox_entries')
        for position, entry in enumerate(opponents, 1):
            c.execute('INSERT INTO sandbox_entries(algorithm_id,user_id,position,name,code,xml,job_id) VALUES(?,?,?,?,?,?,?)',
                      (entry['algorithm_id'], entry['user_id'], position, entry['name'], entry['code'], entry['xml'], entry['job_id']))
        c.execute('UPDATE sandbox_submissions SET result=? WHERE job_id=?', (json.dumps(result, ensure_ascii=False), job['id']))
    return result


def get(h, path):
    user = h.graduate()
    if path == '/api/sandbox':
        try:
            before = int(parse_qs(urlsplit(h.path).query).get('before_match_id', ['9223372036854775807'])[0])
            if not 1 <= before <= 9223372036854775807:
                raise ValueError()
        except ValueError:
            raise h.problem('Некорректная страница списка боёв.')
        with db() as c:
            standings = [dict(r) for r in c.execute('''SELECT e.algorithm_id,e.user_id,e.position,e.name,u.login AS author
              FROM sandbox_entries e JOIN users u ON u.id=e.user_id ORDER BY e.position''')]
            recent = [dict(r) for r in c.execute('''SELECT j.id,j.status,j.created,j.result,s.name,s.algorithm_id
              FROM jobs j JOIN sandbox_submissions s ON s.job_id=j.id WHERE j.user_id=? ORDER BY j.id DESC LIMIT 30''', (user['id'],))]
            for item in recent:
                item['result'] = json.loads(item['result']) if item['result'] else None
            fights = [dict(r) for r in c.execute('''SELECT m.id,m.title,m.created,j.user_id,s.name AS candidate,
              f.opponent_name,f.winner,f.candidate_wins,f.opponent_wins,f.tied
              FROM sandbox_fights f JOIN matches m ON m.id=f.match_id JOIN jobs j ON j.id=f.job_id
              JOIN sandbox_submissions s ON s.job_id=j.id WHERE m.status='done' AND (j.user_id=? OR f.opponent_user_id=?) AND m.id<?
              ORDER BY m.id DESC LIMIT 50''', (user['id'], user['id'], before))]
            waiting = c.execute("SELECT count(*) FROM jobs WHERE kind='sandbox' AND status='queued'").fetchone()[0]
            active = c.execute("SELECT id FROM jobs WHERE kind='sandbox' AND status='running' LIMIT 1").fetchone()
        h.send_json({'standings': standings, 'submissions': recent, 'fights': fights, 'next_fight': fights[-1]['id'] if len(fights) == 50 else None, 'waiting': waiting, 'active': active['id'] if active else None})
    elif re.fullmatch(r'/api/sandbox/matches/\d+/replay(?:/chunks/\d+)?', path):
        parts = path.split('/')
        match_id = int(parts[4])
        with db() as c:
            fight = c.execute('''SELECT m.id,m.title,m.status,m.result,j.user_id,f.opponent_user_id
              FROM sandbox_fights f JOIN matches m ON m.id=f.match_id JOIN jobs j ON j.id=f.job_id
              WHERE m.id=?''', (match_id,)).fetchone()
            if not fight or (user['role'] != 'admin' and user['id'] not in (fight['user_id'], fight['opponent_user_id'])):
                raise h.problem('Запись боя недоступна.', 404)
            if fight['status'] != 'done':
                raise h.problem('Запись доступна после завершения боя.', 409)
            if len(parts) == 8:
                row = c.execute('SELECT payload FROM match_replay_chunks WHERE match_id=? AND chunk_index=?', (match_id, int(parts[7]))).fetchone()
                if not row:
                    raise h.problem('Фрагмент записи не найден.', 404)
                h.send_json({'frames': json.loads(zlib.decompress(row['payload']).decode('utf-8'))})
            else:
                chunks = [dict(r) for r in c.execute('SELECT chunk_index,first_time,last_time,frame_count FROM match_replay_chunks WHERE match_id=? ORDER BY chunk_index', (match_id,))]
                result = json.loads(fight['result'])
                h.send_json({'id': match_id, 'title': fight['title'], 'duration': result['time'], 'visuals': result.get('replay_version', 0) >= 2, 'chunks': chunks})
    else:
        raise h.problem('Адрес не найден.', 404)


def admin_replay(h, path):
    h.admin()
    parts = path.split('/')
    match_id = int(parts[4])
    with db() as c:
        match = c.execute('''SELECT m.* FROM matches m JOIN jobs j ON j.id=m.job_id
          WHERE m.id=? AND j.kind IN ('round','tournament')''', (match_id,)).fetchone()
        if not match:
            raise h.problem('Запись боя недоступна.', 404)
        if match['status'] != 'done':
            raise h.problem('Запись доступна после завершения боя.', 409)
        if len(parts) == 8:
            row = c.execute('SELECT payload FROM match_replay_chunks WHERE match_id=? AND chunk_index=?', (match_id, int(parts[7]))).fetchone()
            if not row:
                raise h.problem('Фрагмент записи не найден.', 404)
            h.send_json({'frames': json.loads(zlib.decompress(row['payload']).decode('utf-8'))})
        else:
            chunks = [dict(r) for r in c.execute('SELECT chunk_index,first_time,last_time,frame_count FROM match_replay_chunks WHERE match_id=? ORDER BY chunk_index', (match_id,))]
            if not chunks:
                raise h.problem('Этот бой прошёл до включения записи. Повтор недоступен.', 404)
            result = json.loads(match['result'])
            h.send_json({'id': match_id, 'title': match['title'], 'duration': result['time'],
                         'visuals': result.get('replay_version', 0) >= 2, 'chunks': chunks})


def submit(h, user, value):
    h.graduate()
    algorithm_id = int(value.get('algorithm_id', 0))
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        algorithm = c.execute('SELECT * FROM algorithms WHERE id=? AND user_id=? AND archived=0', (algorithm_id, user['id'])).fetchone()
        if not algorithm:
            raise h.problem('Выбери свой сохранённый алгоритм.')
        code, xml, root = h.program(dict(code=algorithm['code'], xml=algorithm['xml']))
        if c.execute('SELECT 1 FROM sandbox_submissions WHERE algorithm_id=?', (algorithm_id,)).fetchone():
            raise h.problem('Этот алгоритм уже отправлен в песочницу. Для новой отправки сохрани доработанное решение под другим названием.', 409)
        job_id = c.execute("INSERT INTO jobs(user_id,kind,code,xml,created) VALUES(?,'sandbox',?,?,?)", (user['id'], code, xml, time.time())).lastrowid
        c.execute('INSERT INTO sandbox_submissions(job_id,algorithm_id,name) VALUES(?,?,?)', (job_id, algorithm_id, algorithm['name']))
    h.send_json({'id': job_id}, 202)
