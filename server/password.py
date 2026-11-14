"""Rotate the administrator password without exposing it in a command line."""
import getpass
from .store import db, password_hash

if __name__ == '__main__':
    password = getpass.getpass('Новый пароль администратора: ')
    if len(password) < 8 or password != getpass.getpass('Повтори пароль: '):
        raise SystemExit('Пароли не совпали или короче 8 символов.')
    with db() as connection:
        row = connection.execute("SELECT id FROM users WHERE login='silenok'").fetchone()
        if not row:
            raise SystemExit('Учётная запись администратора не найдена.')
        connection.execute('UPDATE users SET password=? WHERE id=?', (password_hash(password), row['id']))
        connection.execute('DELETE FROM sessions WHERE user_id=?', (row['id'],))
    print('Пароль изменён. Открытые сессии администратора завершены.')
