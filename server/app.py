"""Small same-origin HTTP application. Python 3.8; run behind nginx on a VPS."""
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import threading
import time
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

from .store import ROOT, db, initialize, password_hash, password_matches
from .worker import LESSONS, work

STATIC = ROOT / 'appengine'
ORIGIN = os.environ.get('POND_ORIGIN', 'http://localhost:8000').rstrip('/')
SECURE = ORIGIN.startswith('https://')


class Problem(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


class Handler(BaseHTTPRequestHandler):
    server_version = 'Pond'

    def send_json(self, value, status=200, cookie=None):
        body = json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(body)

    def session(self, required=True):
        jar = cookies.SimpleCookie()
        try:
            jar.load(self.headers.get('Cookie', ''))
        except cookies.CookieError:
            pass
        raw = jar.get('pond_session')
        token = hashlib.sha256(raw.value.encode()).hexdigest() if raw else ''
        with db() as c:
            row = c.execute('SELECT s.token,s.csrf,u.id,u.login,u.role,u.team FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?', (token, time.time())).fetchone()
        if required and not row:
            raise Problem('Войди в учётную запись.', 401)
        return dict(row) if row else None

    def admin(self):
        user = self.session()
        if user['role'] != 'admin':
            raise Problem('Нужен доступ администратора.', 403)
        return user

    def body(self):
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            raise Problem('Ожидается JSON.', 415)
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            raise Problem('Некорректный размер запроса.')
        if length < 1 or length > 240000:
            raise Problem('Слишком большой запрос.', 413)
        try:
            value = json.loads(self.rfile.read(length))
            if not isinstance(value, dict):
                raise ValueError()
            return value
        except (ValueError, UnicodeError):
            raise Problem('Некорректные данные запроса.')

    def progress(self, user_id):
        with db() as c:
            return [r['level'] for r in c.execute('SELECT level FROM progress WHERE user_id=? ORDER BY level', (user_id,))]

    def do_GET(self):
        try:
            path = urlsplit(self.path).path
            if path == '/api/health':
                self.send_json({'ok': True, 'lessons': LESSONS})
            elif path == '/api/me':
                user = self.session(False)
                if user:
                    user.pop('token')
                    user['completed'] = self.progress(user['id'])
                    user['unlocked'] = all(i in user['completed'] for i in range(1, LESSONS + 1))
                self.send_json({'user': user})
            elif path == '/api/tournaments':
                self.session()
                with db() as c:
                    rows = c.execute('SELECT id,name,status,seconds FROM tournaments ORDER BY id DESC').fetchall()
                self.send_json({'tournaments': [dict(r) for r in rows]})
            elif re.fullmatch(r'/api/tournaments/\d+/standings', path):
                self.session()
                tournament_id = int(path.split('/')[3])
                with db() as c:
                    rows = c.execute('SELECT e.position,u.team,e.user_id,e.submission_id FROM entries e JOIN users u ON u.id=e.user_id WHERE e.tournament_id=? ORDER BY e.position', (tournament_id,)).fetchall()
                self.send_json({'standings': [dict(r) for r in rows]})
            elif re.fullmatch(r'/api/jobs/\d+', path):
                user = self.session()
                with db() as c:
                    row = c.execute('SELECT id,user_id,status,result FROM jobs WHERE id=?', (int(path.split('/')[-1]),)).fetchone()
                if not row or (row['user_id'] != user['id'] and user['role'] != 'admin'):
                    raise Problem('Задание не найдено.', 404)
                self.send_json({'id': row['id'], 'status': row['status'], 'result': json.loads(row['result']) if row['result'] else None})
            elif re.fullmatch(r'/api/training/\d+', path):
                user = self.session()
                with db() as c:
                    row = c.execute('SELECT xml FROM progress WHERE user_id=? AND level=?', (user['id'], int(path.split('/')[-1]))).fetchone()
                self.send_json({'xml': row['xml'] if row else None})
            elif path == '/api/admin/live':
                self.admin()
                with db() as c:
                    row = c.execute("SELECT m.id,m.title,m.status,m.snapshot,j.tournament_id,j.kind FROM matches m JOIN jobs j ON j.id=m.job_id WHERE j.kind='tournament' ORDER BY CASE m.status WHEN 'running' THEN 0 ELSE 1 END,m.id DESC LIMIT 1").fetchone()
                    waiting = c.execute("SELECT count(*) FROM jobs WHERE status IN ('queued','running') AND kind='tournament'").fetchone()[0]
                match = dict(row) if row else None
                if match:
                    match['snapshot'] = json.loads(match['snapshot']) if match['snapshot'] else None
                self.send_json({'match': match, 'waiting': waiting})
            else:
                self.static(path)
        except Problem as error:
            self.send_json({'error': error.message}, error.status)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            self.log_error('Request failed')
            self.send_json({'error': 'Внутренняя ошибка сервера.'}, 500)

    def do_POST(self):
        try:
            path = urlsplit(self.path).path
            origin = self.headers.get('Origin')
            if origin and origin.rstrip('/') != ORIGIN:
                raise Problem('Запрос с другого сайта запрещён.', 403)
            value = self.body()
            if path in ('/api/login', '/api/register'):
                self.authenticate(path, value)
                return
            user = self.session()
            if not secrets.compare_digest(self.headers.get('X-CSRF-Token', ''), user['csrf']):
                raise Problem('Обнови страницу и повтори действие.', 403)
            if path == '/api/logout':
                with db() as c:
                    c.execute('DELETE FROM sessions WHERE token=?', (user['token'],))
                self.send_json({'ok': True}, cookie='pond_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict')
            elif path == '/api/profile':
                team = str(value.get('team', '')).strip()
                if not 2 <= len(team) <= 60:
                    raise Problem('Название команды: от 2 до 60 символов.')
                with db() as c:
                    if c.execute('SELECT 1 FROM users WHERE team=? COLLATE NOCASE AND id<>?', (team, user['id'])).fetchone():
                        raise Problem('Это название команды уже занято.')
                    c.execute('UPDATE users SET team=? WHERE id=?', (team, user['id']))
                self.send_json({'ok': True})
            elif path == '/api/progress/reset':
                with db() as c:
                    if c.execute("SELECT 1 FROM jobs WHERE user_id=? AND kind='training' AND status='running'", (user['id'],)).fetchone():
                        raise Problem('Дождись завершения текущей проверки уровня.', 409)
                    c.execute('DELETE FROM progress WHERE user_id=?', (user['id'],))
                    c.execute("UPDATE jobs SET status='cancelled' WHERE user_id=? AND kind='training' AND status='queued'", (user['id'],))
                self.send_json({'ok': True})
            elif path in ('/api/training/submit', '/api/tournament/submit'):
                self.submit(user, path, value)
            elif path == '/api/admin/tournaments':
                self.admin()
                name = str(value.get('name', '')).strip()
                seconds = int(value.get('seconds', 60))
                if not 2 <= len(name) <= 80 or not 10 <= seconds <= 120:
                    raise Problem('Укажи название и длительность боя от 10 до 120 секунд.')
                with db() as c:
                    tournament_id = c.execute('INSERT INTO tournaments(name,status,seconds,created) VALUES(?,?,?,?)', (name, 'open', seconds, time.time())).lastrowid
                self.send_json({'id': tournament_id}, 201)
            elif re.fullmatch(r'/api/admin/tournaments/\d+/status', path):
                self.admin()
                if value.get('status') not in ('open', 'closed'):
                    raise Problem('Неизвестный статус турнира.')
                with db() as c:
                    c.execute('UPDATE tournaments SET status=? WHERE id=?', (value['status'], int(path.split('/')[4])))
                self.send_json({'ok': True})
            else:
                raise Problem('Адрес не найден.', 404)
        except Problem as error:
            self.send_json({'error': error.message}, error.status)
        except (ValueError, TypeError, ET.ParseError):
            self.send_json({'error': 'Проверь введённые данные.'}, 400)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            self.log_error('Request failed')
            self.send_json({'error': 'Внутренняя ошибка сервера.'}, 500)

    def authenticate(self, path, value):
        address = self.client_address[0]
        if os.environ.get('POND_TRUST_PROXY') == '1' and address in ('127.0.0.1', '::1'):
            address = self.headers.get('X-Real-IP', address)
        login = str(value.get('login', '')).strip()
        password = str(value.get('password', ''))
        if not re.fullmatch(r'[a-zA-Z0-9_.-]{3,40}', login) or not 8 <= len(password) <= 256:
            raise Problem('Логин: 3–40 латинских букв, цифр, точек, дефисов или подчёркиваний. Пароль: 8–256 символов.')
        with db() as c:
            c.execute('DELETE FROM auth_failures WHERE at<?', (time.time() - 900,))
            if c.execute('SELECT count(*) FROM auth_failures WHERE ip=?', (address,)).fetchone()[0] >= 15:
                raise Problem('Слишком много попыток. Попробуй через 15 минут.', 429)
            row = c.execute('SELECT * FROM users WHERE login=? COLLATE NOCASE', (login,)).fetchone()
            if path == '/api/register':
                if row:
                    raise Problem('Этот логин занят.')
                user_id = c.execute('INSERT INTO users(login,password,role,created) VALUES(?,?,?,?)', (login, password_hash(password), 'student', time.time())).lastrowid
            else:
                if not row or not password_matches(password, row['password']):
                    c.execute('INSERT INTO auth_failures VALUES(?,?)', (address, time.time()))
                    c.commit()
                    raise Problem('Неверный логин или пароль.', 401)
                user_id = row['id']
            raw = secrets.token_urlsafe(32)
            token = hashlib.sha256(raw.encode()).hexdigest()
            csrf = secrets.token_urlsafe(24)
            c.execute('INSERT INTO sessions VALUES(?,?,?,?)', (token, user_id, csrf, time.time() + 7 * 86400))
        cookie = 'pond_session=%s; Path=/; Max-Age=604800; HttpOnly; SameSite=Strict%s' % (raw, '; Secure' if SECURE else '')
        self.send_json({'ok': True}, cookie=cookie)

    def submit(self, user, path, value):
        code, xml = str(value.get('code', '')), str(value.get('xml', ''))
        if not code.strip() or len(code) > 60000 or not xml or len(xml) > 120000:
            raise Problem('Алгоритм пустой или слишком большой.')
        if '<!DOCTYPE' in xml.upper() or '<!ENTITY' in xml.upper():
            raise Problem('Некорректный формат блоков.')
        root = ET.fromstring(xml)
        if root.tag.split('}')[-1] != 'xml' or sum(1 for _ in root.iter()) > 4000:
            raise Problem('Слишком много блоков или некорректный формат.')
        completed = self.progress(user['id'])
        level = tournament_id = None
        kind = 'training' if path == '/api/training/submit' else 'tournament'
        if kind == 'training':
            level = int(value.get('level', 0))
            if not 1 <= level <= LESSONS or any(i not in completed for i in range(1, level)):
                raise Problem('Сначала заверши предыдущие уровни.', 403)
        else:
            if not user['team']:
                raise Problem('Укажи название команды в учётной записи.')
            if any(i not in completed for i in range(1, LESSONS + 1)):
                raise Problem('Для турнира заверши обучение.', 403)
            tournament_id = int(value.get('tournament_id', 0))
        with db() as c:
            if c.execute("SELECT 1 FROM jobs WHERE user_id=? AND status IN ('queued','running')", (user['id'],)).fetchone():
                raise Problem('Предыдущее решение ещё проверяется.', 409)
            if kind == 'tournament' and not c.execute("SELECT 1 FROM tournaments WHERE id=? AND status='open'", (tournament_id,)).fetchone():
                raise Problem('Турнир не найден или закрыт.')
            job_id = c.execute('INSERT INTO jobs(user_id,tournament_id,kind,level,code,xml,created) VALUES(?,?,?,?,?,?,?)',
                               (user['id'], tournament_id, kind, level, code, xml, time.time())).lastrowid
        self.send_json({'id': job_id}, 202)

    def static(self, path):
        aliases = {'/': '/index.html', '/admin': '/portal/admin.html', '/account': '/portal/account.html', '/tournament': '/portal/tournament.html'}
        if path in aliases and path != '/':
            self.send_response(302)
            self.send_header('Location', aliases[path])
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        path = aliases.get(path, path)
        if path.startswith('/api/'):
            raise Problem('Адрес не найден.', 404)
        filename = (STATIC / unquote(path).lstrip('/')).resolve()
        if STATIC.resolve() not in filename.parents or not filename.is_file():
            raise Problem('Страница не найдена.', 404)
        content = filename.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(str(filename))[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.end_headers()
        self.wfile.write(content)


def main():
    initialize()
    stop = threading.Event()
    worker = threading.Thread(target=work, args=(stop,), daemon=True)
    worker.start()
    server = ThreadingHTTPServer((os.environ.get('POND_HOST', '127.0.0.1'), int(os.environ.get('POND_PORT', '8000'))), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        server.server_close()


if __name__ == '__main__':
    main()
