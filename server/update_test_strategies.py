"""Explicit database-only replacement of the eleven test tournament strategies."""
import argparse
import sqlite3
import time

from .store import DATA, db
from .seed_test_tournament import strategy


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tournament', required=True)
    parser.add_argument('--apply', action='store_true', required=True)
    args = parser.parse_args()
    with db() as c:
        backup = DATA / 'backups' / ('before-test-strategy-update-%s.sqlite3' % time.time_ns())
        backup.parent.mkdir(mode=0o700, exist_ok=True)
        with sqlite3.connect(str(backup)) as destination:
            c.backup(destination)
        backup.chmod(0o600)
        c.execute('BEGIN IMMEDIATE')
        tournaments = c.execute('SELECT id,status FROM tournaments WHERE name=? COLLATE NOCASE', (args.tournament,)).fetchall()
        if len(tournaments) != 1 or tournaments[0]['status'] == 'finished':
            raise ValueError('Exactly one unfinished tournament is required.')
        tid = tournaments[0]['id']
        if c.execute("SELECT 1 FROM jobs WHERE tournament_id=? AND status IN ('queued','running')", (tid,)).fetchone():
            raise ValueError('Wait until all queued/running tournament rounds finish.')
        for index in range(1, 12):
            login = 'test%02d' % index
            rows = c.execute('''SELECT s.id,s.algorithm_id FROM tournament_algorithms s
              JOIN users u ON u.id=s.user_id JOIN algorithms a ON a.id=s.algorithm_id
              WHERE s.tournament_id=? AND u.login=? AND u.deleted=0 AND u.role='student'
              AND a.user_id=u.id AND a.archived=0 AND s.is_main=1''', (tid, login)).fetchall()
            if len(rows) != 1:
                raise ValueError('Expected exactly one main strategy for ' + login)
            row = rows[0]
            if c.execute('SELECT 1 FROM sandbox_submissions WHERE algorithm_id=?', (row['algorithm_id'],)).fetchone():
                raise ValueError('Sandbox history must remain immutable: ' + login)
            _, code, xml = strategy(index)
            c.execute('UPDATE algorithms SET code=?,xml=?,updated=? WHERE id=?', (code, xml, time.time(), row['algorithm_id']))
            c.execute('UPDATE tournament_algorithms SET code=?,xml=? WHERE id=?', (code, xml, row['id']))
    print('Updated 11 test library strategies and 11 tournament snapshots; scan step 1-2 degrees. No battles started; historical rounds unchanged.')


if __name__ == '__main__':
    main()
