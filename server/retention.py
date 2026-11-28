"""Remove inactive student accounts and their shared battle artifacts."""
import calendar
from datetime import datetime, timezone
import time

from .store import db


def inactivity_cutoff(now):
    date = datetime.fromtimestamp(now, timezone.utc)
    month = date.year * 12 + date.month - 1 - 6
    year, month = divmod(month, 12)
    month += 1
    return date.replace(year=year, month=month,
                        day=min(date.day, calendar.monthrange(year, month)[1])).timestamp()


def purge_account(c, user_id):
    # Temporary ID sets keep large histories below SQLite's parameter limit.
    for name in ('teams', 'algorithms', 'submissions', 'jobs', 'rounds', 'matches'):
        c.execute('CREATE TEMP TABLE purge_%s (id INTEGER PRIMARY KEY)' % name)
    c.execute('INSERT INTO purge_teams SELECT id FROM teams WHERE captain_id=?', (user_id,))
    c.execute('INSERT INTO purge_algorithms SELECT id FROM algorithms WHERE user_id=?', (user_id,))
    c.execute('''INSERT INTO purge_submissions SELECT id FROM tournament_algorithms
      WHERE user_id=? OR algorithm_id IN purge_algorithms OR team_id IN purge_teams''', (user_id,))
    c.execute('''INSERT INTO purge_jobs SELECT id FROM jobs WHERE user_id=? OR team_id IN purge_teams
      OR id IN (SELECT job_id FROM sandbox_submissions WHERE algorithm_id IN purge_algorithms)''', (user_id,))
    c.execute('''INSERT INTO purge_rounds SELECT id FROM rounds WHERE job_id IN purge_jobs
      OR winner_team_id IN purge_teams
      OR id IN (SELECT round_id FROM round_players WHERE team_id IN purge_teams OR submission_id IN purge_submissions)
      OR id IN (SELECT round_id FROM round_bouts WHERE left_team IN purge_teams OR right_team IN purge_teams)''')
    c.execute('INSERT OR IGNORE INTO purge_jobs SELECT job_id FROM rounds WHERE id IN purge_rounds AND job_id IS NOT NULL')
    if c.execute("SELECT 1 FROM jobs WHERE id IN purge_jobs AND status IN ('queued','running')").fetchone() or c.execute(
            "SELECT 1 FROM rounds WHERE id IN purge_rounds AND status IN ('queued','running')").fetchone():
        for name in ('teams', 'algorithms', 'submissions', 'jobs', 'rounds', 'matches'):
            c.execute('DROP TABLE purge_%s' % name)
        return False
    c.execute('''INSERT INTO purge_matches SELECT id FROM matches WHERE job_id IN purge_jobs
      OR id IN (SELECT match_id FROM round_bouts WHERE round_id IN purge_rounds)
      OR id IN (SELECT match_id FROM sandbox_fights WHERE opponent_user_id=?
        OR opponent_algorithm_id IN purge_algorithms OR opponent_job_id IN purge_jobs)''', (user_id,))

    c.execute('DELETE FROM match_replay_chunks WHERE match_id IN purge_matches')
    c.execute('DELETE FROM sandbox_fights WHERE match_id IN purge_matches OR job_id IN purge_jobs OR opponent_job_id IN purge_jobs')
    c.execute('DELETE FROM round_bouts WHERE round_id IN purge_rounds')
    c.execute('DELETE FROM round_players WHERE round_id IN purge_rounds')
    c.execute('DELETE FROM rounds WHERE id IN purge_rounds')
    c.execute('DELETE FROM sandbox_entries WHERE user_id=? OR algorithm_id IN purge_algorithms OR job_id IN purge_jobs', (user_id,))
    c.execute('DELETE FROM sandbox_submissions WHERE algorithm_id IN purge_algorithms OR job_id IN purge_jobs')
    c.execute('DELETE FROM entries WHERE user_id=? OR team_id IN purge_teams OR submission_id IN purge_jobs', (user_id,))
    c.execute('DELETE FROM matches WHERE id IN purge_matches')
    c.execute('DELETE FROM jobs WHERE id IN purge_jobs')
    c.execute('DELETE FROM tournament_algorithms WHERE id IN purge_submissions')
    c.execute('DELETE FROM algorithms WHERE id IN purge_algorithms')
    c.execute('DELETE FROM team_invitations WHERE user_id=? OR team_id IN purge_teams', (user_id,))
    c.execute('DELETE FROM team_members WHERE user_id=? OR team_id IN purge_teams', (user_id,))
    c.execute('DELETE FROM teams WHERE id IN purge_teams')
    for table in ('sessions', 'progress', 'training_challenges'):
        c.execute('DELETE FROM %s WHERE user_id=?' % table, (user_id,))
    c.execute('DELETE FROM users WHERE id=?', (user_id,))
    for name in ('teams', 'algorithms', 'submissions', 'jobs', 'rounds', 'matches'):
        c.execute('DROP TABLE purge_%s' % name)
    return True


def purge_inactive(now=None):
    now = time.time() if now is None else now
    removed = 0
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        # The single executor may hold an in-memory ladder or round snapshot.
        if c.execute("SELECT 1 FROM jobs WHERE status='running'").fetchone():
            return 0
        c.execute('UPDATE account_id_sequence SET highest_id=MAX(highest_id,COALESCE((SELECT MAX(id) FROM users),0))')
        users = c.execute("SELECT id FROM users WHERE role='student' AND last_login<?", (inactivity_cutoff(now),)).fetchall()
        for user in users:
            if purge_account(c, user['id']):
                removed += 1
        # Preserve relative order and remove gaps without UNIQUE collisions.
        if removed:
            entries = c.execute('SELECT algorithm_id FROM sandbox_entries ORDER BY position').fetchall()
            c.execute('UPDATE sandbox_entries SET position=-position')
            for position, entry in enumerate(entries, 1):
                c.execute('UPDATE sandbox_entries SET position=? WHERE algorithm_id=?', (position, entry['algorithm_id']))
    return removed
