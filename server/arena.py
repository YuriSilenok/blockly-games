"""Saved algorithms, invitations and manually scheduled tournament rounds."""
import math
import random
import re
import time
from .store import db


def initialize(c):
    columns = {r['name'] for r in c.execute('PRAGMA table_info(teams)')}
    if 'dissolved' not in columns:
        c.execute('ALTER TABLE teams ADD COLUMN dissolved INTEGER NOT NULL DEFAULT 0')
    c.executescript('''
      CREATE TABLE IF NOT EXISTS team_invitations (
        id INTEGER PRIMARY KEY, team_id INTEGER NOT NULL REFERENCES teams(id),
        user_id INTEGER NOT NULL REFERENCES users(id), status TEXT NOT NULL DEFAULT 'pending',
        created REAL NOT NULL, UNIQUE(team_id,user_id));
      CREATE TABLE IF NOT EXISTS algorithms (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL, code TEXT NOT NULL, xml TEXT NOT NULL,
        created REAL NOT NULL, updated REAL NOT NULL);
      CREATE TABLE IF NOT EXISTS tournament_algorithms (
        id INTEGER PRIMARY KEY, tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
        team_id INTEGER NOT NULL REFERENCES teams(id), algorithm_id INTEGER NOT NULL REFERENCES algorithms(id),
        user_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL,
        code TEXT NOT NULL, xml TEXT NOT NULL, shared INTEGER NOT NULL DEFAULT 0,
        is_main INTEGER NOT NULL DEFAULT 0, created REAL NOT NULL,
        UNIQUE(tournament_id,team_id,algorithm_id));
      CREATE UNIQUE INDEX IF NOT EXISTS one_main_algorithm
        ON tournament_algorithms(tournament_id,team_id) WHERE is_main=1;
      CREATE TABLE IF NOT EXISTS rounds (
        id INTEGER PRIMARY KEY, tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
        name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', job_id INTEGER REFERENCES jobs(id),
        created REAL NOT NULL, finished REAL);
      CREATE TABLE IF NOT EXISTS round_players (
        round_id INTEGER NOT NULL REFERENCES rounds(id), team_id INTEGER NOT NULL REFERENCES teams(id),
        submission_id INTEGER REFERENCES tournament_algorithms(id),
        team_name TEXT, algorithm_name TEXT, code TEXT, xml TEXT,
        eliminated REAL, health REAL, kills INTEGER, error TEXT,
        PRIMARY KEY(round_id,team_id));
      CREATE INDEX IF NOT EXISTS invitations_user ON team_invitations(user_id,status);
      CREATE INDEX IF NOT EXISTS algorithms_owner ON algorithms(user_id,updated);
      CREATE INDEX IF NOT EXISTS submissions_team ON tournament_algorithms(tournament_id,team_id);
      CREATE INDEX IF NOT EXISTS rounds_tournament ON rounds(tournament_id,id);
    ''')


def invitations(user_id):
    with db() as c:
        return [dict(r) for r in c.execute('''SELECT i.id,t.name AS team,u.login AS captain
          FROM team_invitations i JOIN teams t ON t.id=i.team_id JOIN users u ON u.id=t.captain_id
          WHERE i.user_id=? AND i.status='pending' AND t.dissolved=0 ORDER BY i.id''', (user_id,))]


def migrate_legacy(c):
    if c.execute("SELECT 1 FROM course_migrations WHERE name='algorithm-library-v1'").fetchone():
        return
    for row in c.execute('SELECT e.*,t.name AS team FROM entries e JOIN teams t ON t.id=e.team_id ORDER BY e.id').fetchall():
        name = ('Алгоритм команды «' + row['team'] + '»')[:80]
        algorithm_id = c.execute('INSERT INTO algorithms(user_id,name,code,xml,created,updated) VALUES(?,?,?,?,?,?)',
                                 (row['user_id'], name, row['code'], row['xml'], time.time(), time.time())).lastrowid
        c.execute('''INSERT INTO tournament_algorithms(tournament_id,team_id,algorithm_id,user_id,name,code,xml,is_main,created)
          VALUES(?,?,?,?,?,?,?,1,?)''', (row['tournament_id'], row['team_id'], algorithm_id, row['user_id'], name, row['code'], row['xml'], time.time()))
    c.execute("INSERT INTO course_migrations VALUES('algorithm-library-v1')")


def algorithms(user):
    with db() as c:
        owned = [dict(r) for r in c.execute('SELECT id,name,created,updated FROM algorithms WHERE user_id=? ORDER BY updated DESC', (user['id'],))]
        available = [dict(r) for r in c.execute('''SELECT s.id,s.name,u.login AS author,t.name AS team,s.team_id
          FROM tournament_algorithms s JOIN users u ON u.id=s.user_id JOIN teams t ON t.id=s.team_id
          WHERE s.shared=1 OR s.user_id=? OR s.team_id=? ORDER BY s.id DESC''', (user['id'], user['team_id']))]
    return {'owned': owned, 'available': available}


def algorithm(c, user, source, algorithm_id):
    if source == 'owned':
        row = c.execute('SELECT * FROM algorithms WHERE id=? AND user_id=?', (algorithm_id, user['id'])).fetchone()
    else:
        row = c.execute('SELECT * FROM tournament_algorithms WHERE id=? AND (shared=1 OR user_id=? OR team_id=?)',
                        (algorithm_id, user['id'], user['team_id'])).fetchone()
    return row


def submissions(c, tournament_id, user):
    return [dict(r) for r in c.execute('''SELECT s.id,s.team_id,t.name AS team,s.name,u.login AS author,
      s.shared,s.is_main,s.created FROM tournament_algorithms s JOIN teams t ON t.id=s.team_id
      JOIN users u ON u.id=s.user_id WHERE s.tournament_id=? AND s.team_id=? ORDER BY s.created DESC''',
      (tournament_id, user['team_id']))]


def report(c, tournament_id):
    rounds = []
    for row in c.execute('SELECT id,name,status,created,finished FROM rounds WHERE tournament_id=? ORDER BY id DESC', (tournament_id,)).fetchall():
        item = dict(row)
        item['players'] = [dict(r) for r in c.execute('''SELECT p.team_id,COALESCE(p.team_name,t.name) AS team,
          p.algorithm_name,p.eliminated,p.health,p.kills,p.error FROM round_players p
          JOIN teams t ON t.id=p.team_id WHERE round_id=? ORDER BY p.health DESC,p.kills DESC,t.name''', (row['id'],))]
        rounds.append(item)
    return rounds


def positions(count):
    rng = random.SystemRandom()
    # Retry a bounded random packing, then use a shuffled grid with >70 px spacing.
    for attempt in range(50):
        points = []
        for unused in range(2000):
            candidate = (rng.uniform(10, 90), rng.uniform(10, 90))
            if all(math.hypot(candidate[0]-x, candidate[1]-y) * 3.65 >= 70 for x, y in points):
                points.append(candidate)
                if len(points) == count:
                    return points
    points = [(x, y) for x in (10, 30, 50, 70, 90) for y in (10, 30, 50, 70, 90)]
    rng.shuffle(points)
    return points[:count]


def run_round(job, duel):
    with db() as c:
        row = c.execute('SELECT * FROM rounds WHERE job_id=?', (job['id'],)).fetchone()
        if not row:
            raise ValueError('Раунд не найден.')
        if row['status'] == 'done':
            return {'message': 'Раунд завершён. Отчёт сохранён.', 'round_id': row['id']}
        players = [dict(p) for p in c.execute('SELECT * FROM round_players WHERE round_id=? ORDER BY team_id', (row['id'],))]
        c.execute("UPDATE rounds SET status='running' WHERE id=?", (row['id'],))
    try:
        starts = positions(len(players))
        result = duel({'avatars': [dict(name=p['team_name'], code=p['code'], x=xy[0], y=xy[1])
                                  for p, xy in zip(players, starts)], 'no_damage_seconds': 60, 'realtime': True}, job['id'], row['name'])
        with db() as c:
            for p, avatar in zip(players, result['avatars']):
                c.execute('UPDATE round_players SET eliminated=?,health=?,kills=?,error=? WHERE round_id=? AND team_id=?',
                          (avatar.get('eliminated'), avatar['health'], avatar.get('kills', 0), avatar.get('error'), row['id'], p['team_id']))
            c.execute("UPDATE rounds SET status='done',finished=? WHERE id=?", (time.time(), row['id']))
        return {'message': 'Раунд завершён. Отчёт сохранён.', 'round_id': row['id']}
    except Exception:
        with db() as c:
            c.execute("UPDATE rounds SET status='error',finished=? WHERE id=?", (time.time(), row['id']))
        raise


def get(h, path):
    if not path.startswith('/api/arena/'):
        return False
    user = h.graduate()
    if path == '/api/arena/algorithms':
        h.send_json(algorithms(user))
    elif re.fullmatch(r'/api/arena/algorithms/(owned|shared)/\d+', path):
        with db() as c:
            row = algorithm(c, user, path.split('/')[-2], int(path.split('/')[-1]))
        if not row:
            raise h.problem('Алгоритм недоступен.', 404)
        h.send_json({'algorithm': {key: row[key] for key in ('id', 'name', 'code', 'xml')}})
    elif re.fullmatch(r'/api/arena/tournaments/\d+', path):
        with db() as c:
            tournament_id = int(path.split('/')[-1])
            teams = [dict(r) for r in c.execute('''SELECT s.team_id,t.name AS team,s.name AS algorithm
              FROM tournament_algorithms s JOIN teams t ON t.id=s.team_id
              WHERE s.tournament_id=? AND s.is_main=1 AND t.dissolved=0 ORDER BY t.name''', (tournament_id,))]
            h.send_json({'algorithms': submissions(c, tournament_id, user), 'teams': teams, 'rounds': report(c, tournament_id)})
    else:
        raise h.problem('Адрес не найден.', 404)
    return True


def post(h, user, path, value):
    if not path.startswith('/api/arena/') and not path.startswith('/api/admin/rounds'):
        return False
    h.graduate()
    if path == '/api/arena/algorithms/save':
        code, xml, root = h.program(value)
        name = str(value.get('name', '')).strip()
        if not 1 <= len(name) <= 80:
            raise h.problem('Укажи название алгоритма: от 1 до 80 символов.')
        with db() as c:
            algorithm_id = c.execute('INSERT INTO algorithms(user_id,name,code,xml,created,updated) VALUES(?,?,?,?,?,?)',
                                     (user['id'], name, code, xml, time.time(), time.time())).lastrowid
        h.send_json({'id': algorithm_id}, 201)
    elif path == '/api/arena/submit':
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            team = c.execute('SELECT t.* FROM team_members m JOIN teams t ON t.id=m.team_id WHERE m.user_id=? AND t.dissolved=0', (user['id'],)).fetchone()
            if not team:
                raise h.problem('Сначала создай команду или подтверди приглашение в личном кабинете.', 403)
            tournament_id = int(value.get('tournament_id', 0))
            if not c.execute("SELECT 1 FROM tournaments WHERE id=? AND status='open'", (tournament_id,)).fetchone():
                raise h.problem('Приём алгоритмов на этот турнир закрыт.', 409)
            saved = algorithm(c, user, 'owned', int(value.get('algorithm_id', 0)))
            if not saved:
                raise h.problem('Сначала сохрани свой алгоритм в библиотеке.')
            main = value.get('is_main') is True
            shared = value.get('shared') is True
            if main:
                c.execute('UPDATE tournament_algorithms SET is_main=0 WHERE tournament_id=? AND team_id=?', (tournament_id, team['id']))
            existing = c.execute('SELECT id FROM tournament_algorithms WHERE tournament_id=? AND team_id=? AND algorithm_id=?', (tournament_id, team['id'], saved['id'])).fetchone()
            if existing:
                c.execute('UPDATE tournament_algorithms SET shared=?,is_main=? WHERE id=?', (shared, main, existing['id']))
            else:
                c.execute('''INSERT INTO tournament_algorithms(tournament_id,team_id,algorithm_id,user_id,name,code,xml,shared,is_main,created)
                  VALUES(?,?,?,?,?,?,?,?,?,?)''', (tournament_id, team['id'], saved['id'], user['id'], saved['name'], saved['code'], saved['xml'], shared, main, time.time()))
        h.send_json({'ok': True})
    elif re.fullmatch(r'/api/arena/submissions/\d+/flags', path):
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            row = c.execute('''SELECT s.*,t.status FROM tournament_algorithms s JOIN tournaments t ON t.id=s.tournament_id
              JOIN team_members m ON m.team_id=s.team_id WHERE s.id=? AND m.user_id=?''', (int(path.split('/')[-2]), user['id'])).fetchone()
            if not row:
                raise h.problem('Алгоритм команды не найден.', 404)
            if row['status'] == 'finished':
                raise h.problem('Турнир уже завершён.', 409)
            main = value.get('is_main', bool(row['is_main'])) is True
            shared = value.get('shared', bool(row['shared'])) is True
            if main:
                c.execute('UPDATE tournament_algorithms SET is_main=0 WHERE tournament_id=? AND team_id=?', (row['tournament_id'], row['team_id']))
            c.execute('UPDATE tournament_algorithms SET shared=?,is_main=? WHERE id=?', (shared, main, row['id']))
        h.send_json({'ok': True})
    elif path == '/api/admin/rounds':
        h.admin()
        tournament_id = int(value.get('tournament_id', 0))
        name = str(value.get('name', '')).strip()
        if not 1 <= len(name) <= 80:
            raise h.problem('Укажи название раунда.')
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            if not c.execute("SELECT 1 FROM tournaments WHERE id=? AND status<>'finished'", (tournament_id,)).fetchone():
                raise h.problem('Турнир не найден или завершён.')
            round_id = c.execute('INSERT INTO rounds(tournament_id,name,created) VALUES(?,?,?)', (tournament_id, name, time.time())).lastrowid
        h.send_json({'id': round_id}, 201)
    elif re.fullmatch(r'/api/admin/rounds/\d+/(teams|start)', path):
        h.admin()
        round_id = int(path.split('/')[-2])
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            row = c.execute('SELECT r.*,t.status AS tournament_status FROM rounds r JOIN tournaments t ON t.id=r.tournament_id WHERE r.id=?', (round_id,)).fetchone()
            if not row or row['status'] != 'draft' or row['tournament_status'] == 'finished':
                raise h.problem('Менять состав и запускать можно только подготовленный раунд незавершённого турнира.', 409)
            if path.endswith('/teams'):
                team_ids = value.get('team_ids', [])
                if not isinstance(team_ids, list) or len(team_ids) > 25:
                    raise h.problem('Выбери не более 25 команд.')
                team_ids = set(int(i) for i in team_ids)
                c.execute('DELETE FROM round_players WHERE round_id=?', (round_id,))
                for team_id in team_ids:
                    if not c.execute('''SELECT 1 FROM tournament_algorithms s JOIN teams t ON t.id=s.team_id
                      WHERE s.tournament_id=? AND s.team_id=? AND s.is_main=1 AND t.dissolved=0''', (row['tournament_id'], team_id)).fetchone():
                        raise h.problem('У выбранной команды нет основного алгоритма.')
                    c.execute('INSERT INTO round_players(round_id,team_id) VALUES(?,?)', (round_id, team_id))
            else:
                players = c.execute('SELECT team_id FROM round_players WHERE round_id=? ORDER BY team_id', (round_id,)).fetchall()
                if len(players) < 2:
                    raise h.problem('Добавь в раунд хотя бы две команды.')
                for p in players:
                    saved = c.execute('''SELECT s.*,t.name AS team FROM tournament_algorithms s JOIN teams t ON t.id=s.team_id
                      WHERE s.tournament_id=? AND s.team_id=? AND s.is_main=1 AND t.dissolved=0''', (row['tournament_id'], p['team_id'])).fetchone()
                    if not saved:
                        raise h.problem('Состав изменился: у команды нет основного алгоритма. Обнови состав раунда.')
                    c.execute('UPDATE round_players SET submission_id=?,team_name=?,algorithm_name=?,code=?,xml=? WHERE round_id=? AND team_id=?',
                              (saved['id'], saved['team'], saved['name'], saved['code'], saved['xml'], round_id, p['team_id']))
                job_id = c.execute("INSERT INTO jobs(user_id,tournament_id,kind,code,xml,created) VALUES(?,?,'round','','',?)",
                                   (user['id'], row['tournament_id'], time.time())).lastrowid
                c.execute("UPDATE rounds SET status='queued',job_id=? WHERE id=?", (job_id, round_id))
        h.send_json({'ok': True})
    else:
        raise h.problem('Адрес не найден.', 404)
    return True
