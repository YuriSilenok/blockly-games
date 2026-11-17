"""Team membership shared by the account UI and tournament queue."""
import time
from .store import db


class TeamProblem(Exception):
    pass


def details(user_id):
    with db() as c:
        row = c.execute('SELECT t.* FROM teams t JOIN team_members m ON m.team_id=t.id WHERE m.user_id=?', (user_id,)).fetchone()
        if not row:
            return None
        team = dict(row)
        team['members'] = [dict(r) for r in c.execute(
            'SELECT u.id,u.login FROM team_members m JOIN users u ON u.id=m.user_id WHERE m.team_id=? ORDER BY u.id<>?,m.joined',
            (team['id'], team['captain_id']))]
        team['invitations'] = [dict(r) for r in c.execute('''SELECT i.id,u.login FROM team_invitations i
          JOIN users u ON u.id=i.user_id WHERE i.team_id=? AND i.status='pending' ''', (team['id'],))]
        return team


def change(user_id, action, value):
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        team = c.execute('SELECT t.* FROM teams t JOIN team_members m ON m.team_id=t.id WHERE m.user_id=?', (user_id,)).fetchone()
        if action in ('accept', 'decline'):
            invitation = c.execute("SELECT i.* FROM team_invitations i JOIN teams t ON t.id=i.team_id WHERE i.id=? AND i.user_id=? AND i.status='pending' AND t.dissolved=0", (int(value.get('invitation_id', 0)), user_id)).fetchone()
            if not invitation:
                raise TeamProblem('Приглашение больше недоступно.')
            if action == 'accept':
                if team:
                    raise TeamProblem('Сначала выйди из текущей команды: можно состоять только в одной.')
                if c.execute('SELECT count(*) FROM team_members WHERE team_id=?', (invitation['team_id'],)).fetchone()[0] >= 3:
                    raise TeamProblem('В команде уже три участника.')
                c.execute('INSERT INTO team_members VALUES(?,?,?)', (user_id, invitation['team_id'], time.time()))
                c.execute("UPDATE team_invitations SET status='declined' WHERE user_id=? AND status='pending'", (user_id,))
            c.execute('UPDATE team_invitations SET status=? WHERE id=?', ('accepted' if action == 'accept' else 'declined', invitation['id']))
        elif action == 'create':
            if team:
                raise TeamProblem('Ты уже состоишь в команде.')
            name = str(value.get('name', '')).strip()
            check_name(c, name)
            team_id = c.execute('INSERT INTO teams(name,captain_id,created) VALUES(?,?,?)', (name, user_id, time.time())).lastrowid
            c.execute('INSERT INTO team_members VALUES(?,?,?)', (user_id, team_id, time.time()))
            logins = value.get('members', [])
            if not isinstance(logins, list) or len(logins) > 2:
                raise TeamProblem('Можно пригласить не более двух игроков.')
            for login in logins:
                member = c.execute('SELECT id FROM users WHERE login=? COLLATE NOCASE', (str(login).strip(),)).fetchone()
                if not member or member['id'] == user_id:
                    raise TeamProblem('Укажи логины других зарегистрированных игроков.')
                if c.execute('SELECT 1 FROM team_members WHERE user_id=?', (member['id'],)).fetchone():
                    raise TeamProblem('Один из игроков уже состоит в команде.')
                c.execute('INSERT OR IGNORE INTO team_invitations(team_id,user_id,created) VALUES(?,?,?)', (team_id, member['id'], time.time()))
        else:
            if not team:
                raise TeamProblem('Сначала создай команду или попроси капитана добавить тебя по логину.')
            if action == 'leave':
                if team['captain_id'] == user_id:
                    raise TeamProblem('Капитан может распустить команду.')
                c.execute('DELETE FROM team_members WHERE user_id=?', (user_id,))
            else:
                if team['captain_id'] != user_id:
                    raise TeamProblem('Составом и названием управляет капитан команды.')
                if action == 'rename':
                    name = str(value.get('name', '')).strip()
                    check_name(c, name, team['id'])
                    c.execute('UPDATE teams SET name=? WHERE id=?', (name, team['id']))
                elif action == 'add':
                    if c.execute('SELECT count(*) FROM team_members WHERE team_id=?', (team['id'],)).fetchone()[0] >= 3:
                        raise TeamProblem('В команде уже три участника — это максимальный состав.')
                    member = c.execute('SELECT id FROM users WHERE login=? COLLATE NOCASE', (str(value.get('login', '')).strip(),)).fetchone()
                    if not member:
                        raise TeamProblem('Участник с таким логином не найден. Сначала ему нужно зарегистрироваться.')
                    if c.execute('SELECT 1 FROM team_members WHERE user_id=?', (member['id'],)).fetchone():
                        raise TeamProblem('Этот участник уже состоит в команде.')
                    reserved = c.execute("SELECT (SELECT count(*) FROM team_members WHERE team_id=?) + (SELECT count(*) FROM team_invitations WHERE team_id=? AND status='pending')", (team['id'], team['id'])).fetchone()[0]
                    pending = c.execute("SELECT 1 FROM team_invitations WHERE team_id=? AND user_id=? AND status='pending'", (team['id'], member['id'])).fetchone()
                    if reserved >= 3 and not pending:
                        raise TeamProblem('Все места заняты или ожидают подтверждения. Отзови лишнее приглашение.')
                    c.execute('''INSERT INTO team_invitations(team_id,user_id,created) VALUES(?,?,?)
                      ON CONFLICT(team_id,user_id) DO UPDATE SET status='pending',created=excluded.created''', (team['id'], member['id'], time.time()))
                elif action == 'remove':
                    member_id = int(value.get('user_id', 0))
                    if member_id == user_id:
                        raise TeamProblem('Нельзя исключить капитана из команды.')
                    c.execute('DELETE FROM team_members WHERE user_id=? AND team_id=?', (member_id, team['id']))
                elif action == 'cancel':
                    c.execute("UPDATE team_invitations SET status='cancelled' WHERE id=? AND team_id=? AND status='pending'", (int(value.get('invitation_id', 0)), team['id']))
                elif action == 'dissolve':
                    if c.execute("SELECT 1 FROM round_players p JOIN rounds r ON r.id=p.round_id WHERE p.team_id=? AND r.status IN ('queued','running')", (team['id'],)).fetchone():
                        raise TeamProblem('Дождись завершения раунда команды перед роспуском.')
                    c.execute('UPDATE teams SET dissolved=1 WHERE id=?', (team['id'],))
                    c.execute('DELETE FROM team_members WHERE team_id=?', (team['id'],))
                    c.execute("UPDATE team_invitations SET status='cancelled' WHERE team_id=? AND status='pending'", (team['id'],))
                else:
                    raise TeamProblem('Неизвестное действие с командой.')
    return details(user_id)


def check_name(connection, name, team_id=0):
    if not 2 <= len(name) <= 60:
        raise TeamProblem('Название команды должно содержать от 2 до 60 символов.')
    if connection.execute('SELECT 1 FROM teams WHERE name=? COLLATE NOCASE AND id<>?', (name, team_id)).fetchone():
        raise TeamProblem('Это название команды уже занято.')
