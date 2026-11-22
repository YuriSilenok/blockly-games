"""Create an explicit set of tournament participants; does not run any battles."""
import argparse
import csv
import os
from pathlib import Path
import secrets
import sqlite3
import time
import xml.etree.ElementTree as ET

from .store import DATA, db, password_hash
from .worker import LESSONS


def strategy(index):
    # Build the executable program and editor XML together, without compiling a client.
    specs = [
        ('Круговой дозор', 0, 10, 'none', 1),
        ('Обратный дозор', 180, -10, 'none', 1),
        ('Точный поиск', 45, 5, 'none', 1),
        ('Быстрый обзор', 90, 20, 'none', 1),
        ('Двойной выстрел', 270, 15, 'none', 2),
        ('Преследователь', 0, 10, 'approach', 1),
        ('Обратное преследование', 180, -15, 'approach', 1),
        ('Боковой манёвр', 90, 10, 'strafe', 1),
        ('Обратный манёвр', 270, -10, 'strafe', 1),
        ('Отход с огнём', 45, 15, 'retreat', 1),
        ('Подвижная батарея', 135, -5, 'strafe', 2),
    ]
    title, start, step, movement, burst = specs[index - 1]

    def block(kind, fields=None, values=None, statements=None):
        node = ET.Element('block', type=kind)
        for name, value in (fields or {}).items():
            ET.SubElement(node, 'field', name=name).text = str(value)
        for name, value in (values or {}).items():
            ET.SubElement(node, 'value', name=name).append(value)
        for name, value in (statements or {}).items():
            ET.SubElement(node, 'statement', name=name).append(value)
        return node

    def number(value):
        return block('pond_math_number', {'NUM': value})

    def variable(name):
        return block('variables_get', {'VAR': name})

    def assign(name, value):
        return block('variables_set', {'VAR': name}, {'VALUE': value})

    def add(left, right):
        return block('pond_math_arithmetic', {'OP': 'ADD'}, {'A': left, 'B': right})

    def chain(nodes):
        for left, right in zip(nodes, nodes[1:]):
            ET.SubElement(left, 'next').append(right)
        return nodes[0]

    shots = [block('pond_cannon', values={'DEGREE': variable('a'), 'RANGE': variable('d')}) for _ in range(burst)]
    code_shots = 'cannon(a, d); ' * burst
    if movement == 'approach':
        shots.append(block('pond_swim', values={'DEGREE': variable('a')}))
        code_shots += 'swim(a); '
    elif movement in ('strafe', 'retreat'):
        offset = 90 if movement == 'strafe' else 180
        shots.append(block('pond_swim', values={'DEGREE': add(variable('a'), number(offset))}))
        code_shots += 'swim(a + %s); ' % offset
    condition = block('logic_compare', {'OP': 'LTE'}, {'A': variable('d'), 'B': number(70)})
    statements = {'DO0': chain(shots)}
    branch = block('controls_if', values={'IF0': condition}, statements=statements)
    otherwise = ''
    if movement != 'none':
        mutation = ET.Element('mutation', {'else': '1'})
        branch.insert(0, mutation)
        ET.SubElement(branch, 'statement', name='ELSE').append(block('pond_swim', values={'DEGREE': variable('a')}))
        otherwise = ' else { swim(a); }'
    body = chain([
        assign('d', block('pond_scan', values={'DEGREE': variable('a')})),
        branch,
        assign('a', add(variable('a'), number(step))),
    ])
    loop = block('controls_whileUntil', {'MODE': 'WHILE'}, {'BOOL': block('logic_boolean', {'BOOL': 'TRUE'})}, {'DO': body})
    root = ET.Element('xml', xmlns='https://developers.google.com/blockly/xml')
    variables = ET.SubElement(root, 'variables')
    for name in ('a', 'd'):
        ET.SubElement(variables, 'variable', id=name).text = name
    root.append(chain([assign('a', number(start)), loop]))
    # Match variable field identities to the explicit declarations in the editor.
    for field in root.iter('field'):
        if field.get('name') == 'VAR':
            field.set('id', field.text)
    code = 'var a = %s, d;\nwhile (true) { d = scan(a); if (d <= 70) { %s}%s a = a + (%s); }\n' % (start, code_shots, otherwise, step)
    return title, code, ET.tostring(root, encoding='unicode')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tournament', required=True)
    parser.add_argument('--credentials', type=Path, required=True)
    parser.add_argument('--apply', action='store_true', required=True)
    args = parser.parse_args()
    names = ['test%02d' % n for n in range(1, 12)]
    passwords = {name: secrets.token_urlsafe(15) for name in names}
    args.credentials.parent.mkdir(parents=True, exist_ok=True)
    # Never overwrite an existing credential file.
    descriptor = os.open(str(args.credentials), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        with os.fdopen(descriptor, 'w', encoding='utf-8', newline='') as output:
            writer = csv.writer(output)
            writer.writerow(['login', 'password', 'team', 'strategy'])
            with db() as c:
                backup = DATA / 'backups' / ('before-test-participants-%s.sqlite3' % time.time_ns())
                backup.parent.mkdir(mode=0o700, exist_ok=True)
                with sqlite3.connect(str(backup)) as destination:
                    c.backup(destination)
                backup.chmod(0o600)
                c.execute('BEGIN IMMEDIATE')
                tournament = c.execute('SELECT id,status FROM tournaments WHERE name=? COLLATE NOCASE', (args.tournament,)).fetchall()
                if len(tournament) != 1 or tournament[0]['status'] != 'open':
                    raise ValueError('Exactly one open tournament with this name is required.')
                for name in names:
                    if c.execute('SELECT 1 FROM users WHERE login=? COLLATE NOCASE', (name,)).fetchone():
                        raise ValueError('Account already exists: ' + name)
                    if c.execute('SELECT 1 FROM teams WHERE name=? COLLATE NOCASE', (name,)).fetchone():
                        raise ValueError('Team already exists: ' + name)
                now = time.time()
                for index, name in enumerate(names, 1):
                    title, code, xml = strategy(index)
                    uid = c.execute('INSERT INTO users(login,password,role,created) VALUES(?,?,?,?)', (name, password_hash(passwords[name]), 'student', now)).lastrowid
                    c.executemany('INSERT INTO progress(user_id,level,code,xml,completed) VALUES(?,?,?,?,?)', [(uid, level, '', '<xml></xml>', now) for level in range(1, LESSONS + 1)])
                    team = c.execute('INSERT INTO teams(name,captain_id,created) VALUES(?,?,?)', (name, uid, now)).lastrowid
                    c.execute('INSERT INTO team_members(user_id,team_id,joined) VALUES(?,?,?)', (uid, team, now))
                    aid = c.execute('INSERT INTO algorithms(user_id,name,code,xml,created,updated) VALUES(?,?,?,?,?,?)', (uid, title, code, xml, now, now)).lastrowid
                    c.execute('''INSERT INTO tournament_algorithms(tournament_id,team_id,algorithm_id,user_id,name,code,xml,shared,is_main,created)
                      VALUES(?,?,?,?,?,?,?,0,1,?)''', (tournament[0]['id'], team, aid, uid, title, code, xml, now))
                    writer.writerow([name, passwords[name], name, title])
                output.flush()
                os.fsync(output.fileno())
        print('Created 11 users, completed training, 11 teams and 11 main submissions. No battles started.')
        print('Credentials: ' + str(args.credentials))
    except Exception:
        args.credentials.unlink(missing_ok=True)
        raise


if __name__ == '__main__':
    main()
