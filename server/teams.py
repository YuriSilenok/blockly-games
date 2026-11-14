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
        return team


def change(user_id, action, value):
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        team = c.execute('SELECT t.* FROM teams t JOIN team_members m ON m.team_id=t.id WHERE m.user_id=?', (user_id,)).fetchone()
        if action == 'create':
            if team:
                raise TeamProblem('Ты уже состоишь в команде.')
            name = str(value.get('name', '')).strip()
            check_name(c, name)
            team_id = c.execute('INSERT INTO teams(name,captain_id,created) VALUES(?,?,?)', (name, user_id, time.time())).lastrowid
            c.execute('INSERT INTO team_members VALUES(?,?,?)', (user_id, team_id, time.time()))
        else:
            if not team:
                raise TeamProblem('Сначала создай команду или попроси капитана добавить тебя по логину.')
            if action == 'leave':
                if team['captain_id'] == user_id:
                    raise TeamProblem('Капитан остаётся в своей команде. Можно изменить название и состав.')
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
                    c.execute('INSERT INTO team_members VALUES(?,?,?)', (member['id'], team['id'], time.time()))
                elif action == 'remove':
                    member_id = int(value.get('user_id', 0))
                    if member_id == user_id:
                        raise TeamProblem('Нельзя исключить капитана из команды.')
                    c.execute('DELETE FROM team_members WHERE user_id=? AND team_id=?', (member_id, team['id']))
                else:
                    raise TeamProblem('Неизвестное действие с командой.')
    return details(user_id)


def check_name(connection, name, team_id=0):
    if not 2 <= len(name) <= 60:
        raise TeamProblem('Название команды должно содержать от 2 до 60 символов.')
    if connection.execute('SELECT 1 FROM teams WHERE name=? COLLATE NOCASE AND id<>?', (name, team_id)).fetchone():
        raise TeamProblem('Это название команды уже занято.')
