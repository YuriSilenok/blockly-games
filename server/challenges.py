"""Per-attempt console confirmation for lesson four."""
import hashlib
import hmac
import json
import secrets
import time
from .store import db


def program_hash(code, xml):
    return hashlib.sha256(json.dumps([code, xml], ensure_ascii=False).encode('utf-8')).hexdigest()


def answer_hash(challenge_id, answer):
    return hashlib.sha256((challenge_id + ':' + str(answer).strip()).encode('utf-8')).hexdigest()


def issue(user_id, code, xml):
    token = secrets.token_urlsafe(24)
    number = str(secrets.randbelow(900000) + 100000)
    with db() as c:
        c.execute('DELETE FROM training_challenges WHERE user_id=? OR expires<?', (user_id, time.time()))
        c.execute('INSERT INTO training_challenges(id,user_id,program_hash,answer_hash,expires) VALUES(?,?,?,?,?)',
                  (token, user_id, program_hash(code, xml), answer_hash(token, number), time.time() + 1800))
    return {'id': token, 'number': number}


def problem(connection, user_id, code, xml, challenge_id, supplied_hash):
    row = connection.execute('SELECT * FROM training_challenges WHERE id=? AND user_id=?', (challenge_id, user_id)).fetchone()
    if not row or row['used'] or row['expires'] < time.time():
        return 'Число для этой попытки больше не действует. Запусти программу заново и возьми новое число из консоли.'
    if not hmac.compare_digest(row['program_hash'], program_hash(code, xml)):
        return 'Программа изменилась после получения числа. Запусти её заново.'
    if not hmac.compare_digest(row['answer_hash'], supplied_hash):
        return 'Число не совпало. Открой консоль и найди последнее сообщение «Проверочное число для уровня 4».'
    return None
