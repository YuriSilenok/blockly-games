"""Saved algorithms, invitations and manually scheduled tournament rounds."""
import random
import re
import time
import json
from .store import db
from .control import RoundStopped


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
    if 'archived' not in {r['name'] for r in c.execute('PRAGMA table_info(algorithms)')}:
        c.execute('ALTER TABLE algorithms ADD COLUMN archived INTEGER NOT NULL DEFAULT 0')
    if 'playback_speed' not in {r['name'] for r in c.execute('PRAGMA table_info(rounds)')}:
        c.execute('ALTER TABLE rounds ADD COLUMN playback_speed REAL NOT NULL DEFAULT 1')
    for name, definition in [('mode', "TEXT NOT NULL DEFAULT 'survival'"), ('respawns', 'INTEGER NOT NULL DEFAULT 0'),
                             ('kill_target', 'INTEGER NOT NULL DEFAULT 0'), ('series_state', 'TEXT'),
                             ('winner_team_id', 'INTEGER REFERENCES teams(id)'), ('end_reason', 'TEXT'),
                             ('stop_requested', 'INTEGER NOT NULL DEFAULT 0'), ('deleted', 'INTEGER NOT NULL DEFAULT 0'),
                             ('rules_version', 'INTEGER NOT NULL DEFAULT 1')]:
        if name not in {r['name'] for r in c.execute('PRAGMA table_info(rounds)')}:
            c.execute('ALTER TABLE rounds ADD COLUMN %s %s' % (name, definition))
    for name in ('queue_order', 'disqualified', 'respawns_used'):
        if name not in {r['name'] for r in c.execute('PRAGMA table_info(round_players)')}:
            c.execute('ALTER TABLE round_players ADD COLUMN %s INTEGER NOT NULL DEFAULT 0' % name)
    c.execute('''CREATE TABLE IF NOT EXISTS round_bouts (
      round_id INTEGER NOT NULL REFERENCES rounds(id), sequence INTEGER NOT NULL,
      match_id INTEGER NOT NULL REFERENCES matches(id), left_team INTEGER NOT NULL REFERENCES teams(id),
      right_team INTEGER NOT NULL REFERENCES teams(id), winner_team INTEGER REFERENCES teams(id),
      result TEXT NOT NULL, PRIMARY KEY(round_id,sequence))''')


def settings(value, problem):
    mode = value.get('mode', 'survival')
    if mode == 'king_elimination':
        mode = 'king'
    respawns, target = value.get('respawns', 0), value.get('kill_target', 0)
    if mode not in ('survival', 'king'):
        raise problem('Выбери режим «Выживание» или «Царь горы».')
    if any(type(number) is not int or not 0 <= number <= 1000 for number in (respawns, target)):
        raise problem('Возрождения и потопления должны быть целыми числами от 0 до 1000.')
    if mode == 'king':
        if target < 2:
            raise problem('Для «Царя горы» укажи не менее двух потоплений для победы.')
        respawns = 0
    else:
        target = 0
    return mode, respawns, target


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
        owned = [dict(r) for r in c.execute('SELECT id,name,created,updated FROM algorithms WHERE user_id=? AND archived=0 ORDER BY updated DESC', (user['id'],))]
        team = [dict(r) for r in c.execute('''SELECT a.id,a.name,a.created,a.updated,u.login AS author FROM algorithms a
          JOIN users u ON u.id=a.user_id JOIN team_members m ON m.user_id=a.user_id JOIN teams t ON t.id=m.team_id
          WHERE t.id=? AND t.captain_id=? AND t.dissolved=0 AND a.archived=0 ORDER BY a.updated DESC,a.id DESC''', (user['team_id'], user['id']))]
        available = [dict(r) for r in c.execute('''SELECT s.id,s.name,u.login AS author,t.name AS team,s.team_id
          FROM tournament_algorithms s JOIN users u ON u.id=s.user_id JOIN teams t ON t.id=s.team_id
          WHERE s.shared=1 OR s.user_id=? OR s.team_id=? ORDER BY s.id DESC''', (user['id'], user['team_id']))]
    return {'owned': owned, 'available': available, 'team': team}


def algorithm(c, user, source, algorithm_id):
    if source == 'owned':
        row = c.execute('SELECT * FROM algorithms WHERE id=? AND user_id=? AND archived=0', (algorithm_id, user['id'])).fetchone()
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
    for row in c.execute('SELECT id,name,status,created,finished,mode,respawns,kill_target,winner_team_id,end_reason,stop_requested,rules_version FROM rounds WHERE tournament_id=? AND deleted=0 ORDER BY id DESC', (tournament_id,)).fetchall():
        item = dict(row)
        if row['status'] == 'draft':
            item['rules_version'] = 2
            if row['mode'] in ('king', 'king_elimination'):
                item['mode'], item['respawns'], item['kill_target'] = 'king', 0, max(2, row['kill_target'])
            else:
                item['respawns'], item['kill_target'] = max(0, row['respawns']), 0
        replay = c.execute('''SELECT m.id FROM matches m JOIN rounds r ON r.job_id=m.job_id
          WHERE r.id=? AND m.status IN ('done','stopped') AND EXISTS(SELECT 1 FROM match_replay_chunks c WHERE c.match_id=m.id)
          ORDER BY m.id DESC LIMIT 1''', (row['id'],)).fetchone()
        item['replay_match_id'] = replay['id'] if replay else None
        item['players'] = [dict(r) for r in c.execute('''SELECT p.team_id,COALESCE(p.team_name,t.name) AS team,
          p.algorithm_name,p.eliminated,p.health,p.kills,p.error,p.queue_order,p.disqualified,p.respawns_used FROM round_players p
          JOIN teams t ON t.id=p.team_id WHERE round_id=? ORDER BY p.eliminated DESC,t.name''', (row['id'],))]
        rounds.append(item)
        item['bouts'] = [dict(r) for r in c.execute('''SELECT b.sequence,b.match_id,b.left_team,b.right_team,b.winner_team,
          COALESCE(lp.team_name,l.name) AS left_name,COALESCE(rp.team_name,r.name) AS right_name,b.result,m.result AS battle_snapshot FROM round_bouts b
          JOIN matches m ON m.id=b.match_id
          JOIN teams l ON l.id=b.left_team JOIN teams r ON r.id=b.right_team
          JOIN round_players lp ON lp.round_id=b.round_id AND lp.team_id=b.left_team
          JOIN round_players rp ON rp.round_id=b.round_id AND rp.team_id=b.right_team
          WHERE b.round_id=? ORDER BY b.sequence''', (row['id'],))]
        for bout in item['bouts']:
            bout['result'] = json.loads(bout['result'])
        if row['mode'] in ('king', 'king_elimination'):
            totals = {p['team_id']: p for p in item['players']}
            for player in item['players']:
                player.update(sunk=0, health_total=0, opponent_kills=0, series_wins=0, stats_complete=True, health_complete=True)
            for bout in item['bouts']:
                snapshot = json.loads(bout.pop('battle_snapshot') or '{}')
                avatars = snapshot.get('avatars', [])
                for index, team_id in enumerate((bout['left_team'], bout['right_team'])):
                    player = totals[team_id]
                    if bout['winner_team'] == team_id and not bout['result'].get('stopped'):
                        player['series_wins'] += 1
                    if index < len(avatars):
                        avatar = avatars[index]
                        # Older recordings have life expenditure and final dead state.
                        player['sunk'] += avatar.get('sunk_count', avatar.get('respawns_used', avatar.get('generation', 0)) + int(bool(avatar.get('dead'))))
                        player['opponent_kills'] += avatar.get('kills', 0)
                        if 'victory_health' in avatar:
                            player['health_total'] += avatar['victory_health']
                        else:
                            if any(a.get('respawns_used', a.get('generation', 0)) for a in avatars):
                                player['health_complete'] = False
                            if bout['winner_team'] == team_id and not bout['result'].get('stopped'):
                                player['health_total'] += bout['result']['health'][index]
                    else:
                        player['stats_complete'] = False
                        player['health_complete'] = False
        else:
            for bout in item['bouts']:
                bout.pop('battle_snapshot', None)
    return rounds


def positions(count):
    if not 1 <= count <= 4:
        raise ValueError('В углах пруда можно разместить не более четырёх уток.')
    points = [(10, 10), (90, 10), (90, 90), (10, 90)]
    random.SystemRandom().shuffle(points)
    return points[:count]


def run_round(job, duel):
    with db() as c:
        row = c.execute('SELECT * FROM rounds WHERE job_id=?', (job['id'],)).fetchone()
        if not row:
            raise ValueError('Раунд не найден.')
        if row['status'] == 'done':
            return {'message': 'Раунд завершён. Отчёт сохранён.', 'round_id': row['id']}
        players = [dict(p) for p in c.execute('SELECT * FROM round_players WHERE round_id=? ORDER BY queue_order,team_id', (row['id'],))]
        c.execute("UPDATE rounds SET status='running' WHERE id=?", (row['id'],))
    try:
        if row['stop_requested']:
            raise RoundStopped()
        if row['mode'] in ('king', 'king_elimination'):
            from .king import run_series
            return run_series(dict(row), players, job, duel)
        starts = positions(len(players))
        result = duel({'avatars': [dict(name=p['team_name'], code=p['code'], x=xy[0], y=xy[1])
                                  for p, xy in zip(players, starts)], 'no_damage_seconds': 60, 'realtime': True,
                       'playback_speed': row['playback_speed'], 'respawns': row['respawns'],
                       'kill_target': row['kill_target'], 'record_replay': True,
                       'survival_until_last': row['rules_version'] >= 2,
                       'respawn_farthest': row['rules_version'] >= 2}, job['id'], row['name'])
        with db() as c:
            for p, avatar in zip(players, result['avatars']):
                c.execute('UPDATE round_players SET eliminated=?,health=?,kills=?,error=?,respawns_used=? WHERE round_id=? AND team_id=?',
                          (avatar.get('eliminated'), avatar['health'], avatar.get('kills', 0), avatar.get('error'), avatar.get('respawns_used', avatar.get('generation', 0)), row['id'], p['team_id']))
            winner = result.get('winner')
            winner_id = players[winner]['team_id'] if winner is not None else None
            c.execute("UPDATE rounds SET status='done',finished=?,winner_team_id=?,end_reason=? WHERE id=?", (time.time(), winner_id, result.get('end_reason'), row['id']))
        return {'message': 'Раунд завершён. Отчёт сохранён.', 'round_id': row['id']}
    except RoundStopped as error:
        with db() as c:
            if error.snapshot:
                selected = error.team_ids or [p['team_id'] for p in players]
                for team_id, avatar in zip(selected, error.snapshot.get('avatars', [])):
                    if row['mode'] in ('king', 'king_elimination'):
                        c.execute('UPDATE round_players SET health=?,respawns_used=respawns_used+? WHERE round_id=? AND team_id=?', (avatar['health'], avatar.get('respawns_used', avatar.get('generation', 0)), row['id'], team_id))
                    else:
                        c.execute('UPDATE round_players SET health=?,kills=?,eliminated=?,respawns_used=? WHERE round_id=? AND team_id=?',
                                  (avatar['health'], avatar.get('kills', 0), avatar.get('eliminated'), avatar.get('respawns_used', avatar.get('generation', 0)), row['id'], team_id))
            c.execute("UPDATE rounds SET status='stopped',finished=?,winner_team_id=NULL,end_reason='stopped' WHERE id=?", (time.time(), row['id']))
        raise
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
            c.execute('BEGIN IMMEDIATE')
            published = c.execute('''SELECT 1 FROM algorithms a WHERE a.user_id=? AND a.name=? AND
              (EXISTS(SELECT 1 FROM tournament_algorithms s WHERE s.algorithm_id=a.id)
               OR EXISTS(SELECT 1 FROM sandbox_submissions s WHERE s.algorithm_id=a.id)) LIMIT 1''', (user['id'], name)).fetchone()
            if published:
                raise h.problem('Алгоритм с этим названием уже отправлен в песочницу или на турнир и не может быть изменён. Сохрани доработанное решение под другим названием.', 409)
            previous = c.execute('SELECT id FROM algorithms WHERE user_id=? AND name=? AND archived=0 ORDER BY updated DESC,id DESC LIMIT 1', (user['id'], name)).fetchone()
            if previous:
                algorithm_id = previous['id']
                c.execute('UPDATE algorithms SET code=?,xml=?,updated=? WHERE id=?', (code, xml, time.time(), algorithm_id))
                # Published snapshots keep their references, but duplicates disappear from the library.
                c.execute('UPDATE algorithms SET archived=1 WHERE user_id=? AND name=? AND id<>?', (user['id'], name, algorithm_id))
                c.execute('DELETE FROM algorithms WHERE user_id=? AND name=? AND id<>? AND NOT EXISTS (SELECT 1 FROM tournament_algorithms s WHERE s.algorithm_id=algorithms.id) AND NOT EXISTS (SELECT 1 FROM sandbox_submissions s WHERE s.algorithm_id=algorithms.id)', (user['id'], name, algorithm_id))
            else:
                algorithm_id = c.execute('INSERT INTO algorithms(user_id,name,code,xml,created,updated) VALUES(?,?,?,?,?,?)',
                                         (user['id'], name, code, xml, time.time(), time.time())).lastrowid
        h.send_json({'id': algorithm_id, 'replaced': bool(previous)}, 200 if previous else 201)
    elif path == '/api/arena/submit':
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            team = c.execute('SELECT t.* FROM team_members m JOIN teams t ON t.id=m.team_id WHERE m.user_id=? AND t.dissolved=0', (user['id'],)).fetchone()
            if not team:
                raise h.problem('Сначала создай команду или подтверди приглашение в личном кабинете.', 403)
            if team['captain_id'] != user['id']:
                raise h.problem('Отправлять алгоритмы на турнир может только капитан команды.', 403)
            tournament_id = int(value.get('tournament_id', 0))
            if not c.execute("SELECT 1 FROM tournaments WHERE id=? AND status='open'", (tournament_id,)).fetchone():
                raise h.problem('Приём алгоритмов на этот турнир закрыт.', 409)
            saved = c.execute('''SELECT a.* FROM algorithms a JOIN team_members m ON m.user_id=a.user_id
              WHERE a.id=? AND m.team_id=? AND a.archived=0''', (int(value.get('algorithm_id', 0)), team['id'])).fetchone()
            if not saved:
                raise h.problem('Выбери сохранённый алгоритм участника своей команды.')
            main = value.get('is_main') is True
            shared = value.get('shared') is True
            if main:
                c.execute('UPDATE tournament_algorithms SET is_main=0 WHERE tournament_id=? AND team_id=?', (tournament_id, team['id']))
            existing = c.execute('SELECT id FROM tournament_algorithms WHERE tournament_id=? AND team_id=? AND algorithm_id=?', (tournament_id, team['id'], saved['id'])).fetchone()
            if existing:
                c.execute('UPDATE tournament_algorithms SET shared=?,is_main=? WHERE id=?', (shared, main, existing['id']))
            else:
                c.execute('''INSERT INTO tournament_algorithms(tournament_id,team_id,algorithm_id,user_id,name,code,xml,shared,is_main,created)
                  VALUES(?,?,?,?,?,?,?,?,?,?)''', (tournament_id, team['id'], saved['id'], saved['user_id'], saved['name'], saved['code'], saved['xml'], shared, main, time.time()))
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
        mode, respawns, target = settings(value, h.problem)
        tournament_id = int(value.get('tournament_id', 0))
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            if not c.execute("SELECT 1 FROM tournaments WHERE id=? AND status<>'finished'", (tournament_id,)).fetchone():
                raise h.problem('Турнир не найден или завершён.')
            number = c.execute('SELECT count(*)+1 FROM rounds WHERE tournament_id=?', (tournament_id,)).fetchone()[0]
            name = 'Раунд %s' % number
            round_id = c.execute('INSERT INTO rounds(tournament_id,name,created,mode,respawns,kill_target,rules_version) VALUES(?,?,?,?,?,?,2)', (tournament_id, name, time.time(), mode, respawns, target)).lastrowid
        h.send_json({'id': round_id}, 201)
    elif re.fullmatch(r'/api/admin/rounds/\d+/(stop|delete)', path):
        h.admin()
        round_id = int(path.split('/')[-2])
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            row = c.execute('''SELECT r.*,j.status AS job_status FROM rounds r LEFT JOIN jobs j ON j.id=r.job_id
              WHERE r.id=? AND r.deleted=0''', (round_id,)).fetchone()
            if not row:
                raise h.problem('Раунд не найден.', 404)
            if path.endswith('/delete'):
                if row['status'] in ('queued', 'running') or row['job_status'] in ('queued', 'running'):
                    raise h.problem('Сначала останови раунд и дождись остановки исполнителя.', 409)
                c.execute('UPDATE rounds SET deleted=1 WHERE id=?', (round_id,))
            else:
                if row['status'] not in ('queued', 'running'):
                    raise h.problem('Остановить можно только запущенный раунд или раунд в очереди.', 409)
                c.execute('UPDATE rounds SET stop_requested=1 WHERE id=?', (round_id,))
                if row['job_status'] != 'running':
                    c.execute("UPDATE jobs SET status='cancelled',result=? WHERE id=?", (json.dumps({'message': 'Раунд остановлен администратором.'}, ensure_ascii=False), row['job_id']))
                    c.execute("UPDATE rounds SET status='stopped',finished=?,end_reason='stopped' WHERE id=?", (time.time(), round_id))
        h.send_json({'ok': True})
    elif re.fullmatch(r'/api/admin/rounds/\d+/resume', path):
        h.admin()
        round_id = int(path.split('/')[-2])
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            row = c.execute('''SELECT r.*,t.status AS tournament_status,j.status AS job_status FROM rounds r
              JOIN tournaments t ON t.id=r.tournament_id JOIN jobs j ON j.id=r.job_id WHERE r.id=?''', (round_id,)).fetchone()
            if not row or row['deleted'] or row['mode'] not in ('king', 'king_elimination') or row['status'] != 'error' or row['job_status'] != 'error' or row['tournament_status'] == 'finished':
                raise h.problem('Продолжить можно только прерванную серию незавершённого турнира.', 409)
            c.execute("UPDATE jobs SET status='queued',result=NULL WHERE id=?", (row['job_id'],))
            c.execute("UPDATE rounds SET status='queued',finished=NULL,end_reason=NULL WHERE id=?", (round_id,))
        h.send_json({'ok': True})
    elif re.fullmatch(r'/api/admin/rounds/\d+/(teams|start)', path):
        h.admin()
        round_id = int(path.split('/')[-2])
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            row = c.execute('SELECT r.*,t.status AS tournament_status FROM rounds r JOIN tournaments t ON t.id=r.tournament_id WHERE r.id=?', (round_id,)).fetchone()
            if not row or row['deleted'] or row['status'] != 'draft' or row['tournament_status'] == 'finished':
                raise h.problem('Менять состав и запускать можно только подготовленный раунд незавершённого турнира.', 409)
            if path.endswith('/teams'):
                team_ids = value.get('team_ids', [])
                limit = 64 if row['mode'] in ('king', 'king_elimination') else 4
                if not isinstance(team_ids, list) or len(team_ids) > limit:
                    raise h.problem('В этом режиме допускается не более %s команд.' % limit)
                team_ids = list(dict.fromkeys(int(i) for i in team_ids))
                c.execute('DELETE FROM round_players WHERE round_id=?', (round_id,))
                for order, team_id in enumerate(team_ids):
                    if not c.execute('''SELECT 1 FROM tournament_algorithms s JOIN teams t ON t.id=s.team_id
                      WHERE s.tournament_id=? AND s.team_id=? AND s.is_main=1 AND t.dissolved=0''', (row['tournament_id'], team_id)).fetchone():
                        raise h.problem('У выбранной команды нет основного алгоритма.')
                    c.execute('INSERT INTO round_players(round_id,team_id,queue_order) VALUES(?,?,?)', (round_id, team_id, order))
            else:
                speed = value.get('speed', 1)
                if isinstance(speed, bool) or speed not in (.1, .25, .5, 1, 2):
                    raise h.problem('Выбери скорость боя: 0,1×, 0,25×, 0,5×, 1× или 2×.')
                players = c.execute('SELECT team_id FROM round_players WHERE round_id=? ORDER BY team_id', (round_id,)).fetchall()
                if len(players) < 2:
                    raise h.problem('Добавь в раунд хотя бы две команды.')
                if len(players) > (64 if row['mode'] in ('king', 'king_elimination') else 4):
                    raise h.problem('В общем бою допускается до 4 команд, в «Царе горы» — до 64. Измени состав раунда.')
                for p in players:
                    saved = c.execute('''SELECT s.*,t.name AS team FROM tournament_algorithms s JOIN teams t ON t.id=s.team_id
                      WHERE s.tournament_id=? AND s.team_id=? AND s.is_main=1 AND t.dissolved=0''', (row['tournament_id'], p['team_id'])).fetchone()
                    if not saved:
                        raise h.problem('Состав изменился: у команды нет основного алгоритма. Обнови состав раунда.')
                    c.execute('UPDATE round_players SET submission_id=?,team_name=?,algorithm_name=?,code=?,xml=? WHERE round_id=? AND team_id=?',
                              (saved['id'], saved['team'], saved['name'], saved['code'], saved['xml'], round_id, p['team_id']))
                job_id = c.execute("INSERT INTO jobs(user_id,tournament_id,kind,code,xml,created) VALUES(?,?,'round','','',?)",
                                   (user['id'], row['tournament_id'], time.time())).lastrowid
                mode = 'king' if row['mode'] in ('king', 'king_elimination') else 'survival'
                respawns = 0 if mode == 'king' else max(0, row['respawns'])
                target = max(2, row['kill_target']) if mode == 'king' else 0
                c.execute('UPDATE rounds SET mode=?,respawns=?,kill_target=?,rules_version=2 WHERE id=?', (mode, respawns, target, round_id))
                c.execute("UPDATE rounds SET status='queued',job_id=?,playback_speed=? WHERE id=?", (job_id, speed, round_id))
        h.send_json({'ok': True})
    else:
        raise h.problem('Адрес не найден.', 404)
    return True
