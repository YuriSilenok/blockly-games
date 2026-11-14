import hashlib
from contextlib import contextmanager
import hmac
import os
from pathlib import Path
import secrets
import sqlite3
import time

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get('POND_DATA_DIR', str(ROOT / 'var')))


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 260000).hex()
    return 'pbkdf2_sha256$260000$%s$%s' % (salt, digest)


def password_matches(password, encoded):
    try:
        _, _, salt, _ = encoded.split('$')
        return hmac.compare_digest(password_hash(password, salt), encoded)
    except (ValueError, TypeError):
        return False


@contextmanager
def db():
    connection = sqlite3.connect(str(DATA / 'pond.sqlite3'), timeout=20)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys=ON')
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize():
    DATA.mkdir(parents=True, exist_ok=True)
    with db() as c:
        c.execute('PRAGMA journal_mode=WAL')
        c.executescript('''
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY, login TEXT UNIQUE COLLATE NOCASE NOT NULL,
          password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
          team TEXT UNIQUE COLLATE NOCASE, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
          csrf TEXT NOT NULL, expires REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS progress (
          user_id INTEGER NOT NULL REFERENCES users(id), level INTEGER NOT NULL,
          code TEXT NOT NULL, xml TEXT NOT NULL, completed REAL NOT NULL,
          PRIMARY KEY(user_id, level));
        CREATE TABLE IF NOT EXISTS tournaments (
          id INTEGER PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL,
          seconds INTEGER NOT NULL DEFAULT 60, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS jobs (
          id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
          tournament_id INTEGER REFERENCES tournaments(id), kind TEXT NOT NULL,
          level INTEGER, code TEXT NOT NULL, xml TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'queued', result TEXT, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY, tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
          user_id INTEGER NOT NULL REFERENCES users(id), position INTEGER NOT NULL,
          code TEXT NOT NULL, xml TEXT NOT NULL, submission_id INTEGER NOT NULL REFERENCES jobs(id),
          UNIQUE(tournament_id, user_id));
        CREATE TABLE IF NOT EXISTS matches (
          id INTEGER PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES jobs(id),
          title TEXT NOT NULL, status TEXT NOT NULL, snapshot TEXT,
          result TEXT, created REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS jobs_queue ON jobs(status, kind, id);
        CREATE TABLE IF NOT EXISTS auth_failures (
          ip TEXT NOT NULL, at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS teams (
          id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE,
          captain_id INTEGER NOT NULL REFERENCES users(id), created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS team_members (
          user_id INTEGER PRIMARY KEY REFERENCES users(id),
          team_id INTEGER NOT NULL REFERENCES teams(id), joined REAL NOT NULL);
        ''')
        c.execute('BEGIN IMMEDIATE')
        # Preserve existing accounts, individual teams and their tournament places.
        if 'team_id' not in {r['name'] for r in c.execute('PRAGMA table_info(jobs)')}:
            c.execute('ALTER TABLE jobs ADD COLUMN team_id INTEGER REFERENCES teams(id)')
            c.execute('ALTER TABLE entries ADD COLUMN team_id INTEGER REFERENCES teams(id)')
            for user in c.execute('SELECT id,team FROM users WHERE team IS NOT NULL').fetchall():
                team_id = c.execute('INSERT INTO teams(name,captain_id,created) VALUES(?,?,?)',
                                    (user['team'], user['id'], time.time())).lastrowid
                c.execute('INSERT INTO team_members VALUES(?,?,?)', (user['id'], team_id, time.time()))
                c.execute('UPDATE jobs SET team_id=? WHERE user_id=? AND kind=\'tournament\'', (team_id, user['id']))
                c.execute('UPDATE entries SET team_id=? WHERE user_id=?', (team_id, user['id']))
            c.execute('UPDATE users SET team=NULL')
            c.execute('''CREATE TABLE entries_v2 (
                id INTEGER PRIMARY KEY, tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
                user_id INTEGER NOT NULL REFERENCES users(id), position INTEGER NOT NULL,
                code TEXT NOT NULL, xml TEXT NOT NULL, submission_id INTEGER NOT NULL REFERENCES jobs(id),
                team_id INTEGER REFERENCES teams(id))''')
            c.execute('INSERT INTO entries_v2 SELECT id,tournament_id,user_id,position,code,xml,submission_id,team_id FROM entries')
            c.execute('DROP TABLE entries')
            c.execute('ALTER TABLE entries_v2 RENAME TO entries')
        c.execute('CREATE UNIQUE INDEX IF NOT EXISTS entries_team ON entries(tournament_id,team_id)')
        c.execute('CREATE INDEX IF NOT EXISTS members_team ON team_members(team_id)')
        if not c.execute("SELECT 1 FROM users WHERE login='silenok'").fetchone():
            encoded = os.environ.get('POND_ADMIN_PASSWORD_HASH')
            if not encoded or not encoded.startswith('pbkdf2_sha256$260000$'):
                raise RuntimeError('Перед первым запуском укажи POND_ADMIN_PASSWORD_HASH в закрытой конфигурации сервера.')
            c.execute('INSERT INTO users(login,password,role,created) VALUES(?,?,?,?)',
                      ('silenok', encoded, 'admin', time.time()))
        c.execute("UPDATE jobs SET status='queued' WHERE status='running'")
        c.execute("UPDATE matches SET status='interrupted' WHERE status='running'")
        c.execute('DELETE FROM sessions WHERE expires < ?', (time.time(),))
