"""Persistent, sequential king-of-the-hill tournament series."""
import json
import time
from .store import db
from .control import RoundStopped


def run_series(round_row, players, job, duel):
    from .arena import positions
    by_id = {p['team_id']: p for p in players}
    elimination = round_row['mode'] == 'king_elimination'
    queue_rules = round_row.get('rules_version', 1) >= 2 and round_row['mode'] == 'king'
    state = json.loads(round_row['series_state']) if round_row['series_state'] else {
        'queue': list(by_id), 'points': {str(i): 0 for i in by_id},
        'idle': {str(i): 0 for i in by_id}, 'health': {str(i): 100 for i in by_id},
        'respawns': {str(i): 0 for i in by_id}, 'errors': {}, 'out': {}, 'sequence': 0,
        'passed': [], 'circle': 1, 'disqualified': [],
    }
    target = round_row['kill_target']
    if not elimination and target < 1:
        raise ValueError('Для серии нужно указать число потоплений (побед).')
    while len(state['queue']) >= 2 and (elimination or max(state['points'].values()) < target):
        with db() as c:
            if c.execute('SELECT stop_requested FROM rounds WHERE id=?', (round_row['id'],)).fetchone()['stop_requested']:
                raise RoundStopped()
        left, right = state['queue'][:2]
        remaining = state['queue'][2:]
        sequence = state['sequence'] + 1
        circle = state.get('circle', 1)
        title = '%s · %s%s · %s — %s' % (round_row['name'], ('Круг %s · Поединок ' % circle) if elimination else 'Бой ', sequence, by_id[left]['team_name'], by_id[right]['team_name'])
        # A completed bout may precede its checkpoint if the process was restarted.
        with db() as c:
            saved = c.execute("SELECT id,result FROM matches WHERE job_id=? AND title=? AND status='done' ORDER BY id DESC LIMIT 1", (job['id'], title)).fetchone()
        if saved:
            result = dict(json.loads(saved['result']), match_id=saved['id'])
        else:
            starts = positions(2)
            try:
                result = duel({
                    'avatars': [dict(dict(name=by_id[team]['team_name'], code=by_id[team]['code'], x=point[0], y=point[1]), **{('series_kills' if queue_rules else 'series_score'): state['points'][str(team)]}) for team, point in zip((left, right), starts)],
                    'no_damage_seconds': 60, 'realtime': True, 'record_replay': True,
                    'playback_speed': round_row['playback_speed'], 'respawns': round_row['respawns'], 'restart_on_respawn': True,
                    'series_target': target if queue_rules else 0,
                    'king_queue_rules': queue_rules,
                    'idle_champion': (left, right).index(state['king']) if queue_rules and state.get('king') in (left, right) else None,
                }, job['id'], title)
            except RoundStopped as error:
                error.team_ids = (left, right)
                if error.snapshot:
                    partial = {'health': [a['health'] for a in error.snapshot['avatars']], 'scores': [state['points'][str(left)], state['points'][str(right)]],
                               'full_draw': False, 'idle_streaks': [state['idle'][str(left)], state['idle'][str(right)]], 'disqualified': [], 'stopped': True, 'circle': circle if elimination else None}
                    with db() as c:
                        c.execute('INSERT INTO round_bouts(round_id,sequence,match_id,left_team,right_team,winner_team,result) VALUES(?,?,?,?,?,NULL,?)',
                                  (round_row['id'], sequence, error.snapshot['match_id'], left, right, json.dumps(partial, ensure_ascii=False)))
                raise
        a, b = result['avatars']
        difference = a['health'] - b['health']
        winner = left if difference > .0001 else right if difference < -.0001 else None
        if queue_rules and result.get('end_reason') == 'idle':
            winner = state.get('king') if state.get('king') in (left, right) else winner
        full_draw = winner is None and abs(a['health'] - 100) < .0001 and abs(b['health'] - 100) < .0001
        for team, avatar in zip((left, right), (a, b)):
            key = str(team)
            state['health'][key] = avatar['health']
            if queue_rules:
                state['points'][key] += avatar.get('kills', 0)
            state['respawns'][key] += avatar.get('respawns_used', avatar.get('generation', 0))
            state['errors'][key] = avatar.get('error')
            state['idle'][key] = state['idle'][key] + 1 if full_draw and not queue_rules else 0
            if state['idle'][key] >= 2:
                state['out'][key] = len(state['out']) + 1
                if elimination:
                    state['disqualified'].append(team)
        removed = []
        if winner is not None:
            loser = right if winner == left else left
            if not queue_rules:
                state['points'][str(winner)] += 1
            else:
                state['king'] = winner
            if elimination:
                state['passed'].append(winner)
                state['queue'] = [loser] + remaining
                if len(state['queue']) == 1:
                    state['out'][str(loser)] = len(state['out']) + 1
                    removed.append(loser)
                    state['queue'] = state['passed']
                    state['passed'] = []
                    if len(state['queue']) > 1:
                        import random
                        random.SystemRandom().shuffle(state['queue'])
                        state['circle'] += 1
            else:
                state['queue'] = [winner] + remaining + [loser]
        else:
            if queue_rules:
                state['king'] = None
            state['queue'] = remaining + [team for team in (left, right) if str(team) not in state['out']]
            if elimination and len(state['queue']) < 2:
                state['queue'] += state['passed']
                state['passed'] = []
                if len(state['queue']) > 1:
                    import random
                    random.SystemRandom().shuffle(state['queue'])
                    state['circle'] += 1
        state['sequence'] = sequence
        if queue_rules and result.get('end_reason') == 'kill_target' and result.get('winner') is not None:
            state['goal_winner'] = (left, right)[result['winner']]
        bout = {'health': [a['health'], b['health']], 'scores': [state['points'][str(left)], state['points'][str(right)]],
                'full_draw': full_draw, 'idle_streaks': [state['idle'][str(left)], state['idle'][str(right)]],
                'disqualified': [team for team in (left, right) if team in state.get('disqualified', [])] if elimination else [team for team in (left, right) if str(team) in state['out']],
                'eliminated': removed, 'advanced': winner if elimination else None, 'circle': circle if elimination else None,
                'score_kind': 'kills' if queue_rules else 'wins'}
        if queue_rules:
            bout['idle_result'] = result.get('end_reason') == 'idle'
            bout['retained_king'] = winner if bout['idle_result'] else None
            bout['full_draw'] = False
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            c.execute('INSERT INTO round_bouts(round_id,sequence,match_id,left_team,right_team,winner_team,result) VALUES(?,?,?,?,?,?,?)',
                      (round_row['id'], sequence, result['match_id'], left, right, winner, json.dumps(bout, ensure_ascii=False)))
            c.execute('UPDATE rounds SET series_state=? WHERE id=?', (json.dumps(state, ensure_ascii=False), round_row['id']))
            suffix = ' · счёт %s:%s' % tuple(bout['scores'])
            if full_draw:
                suffix += ' · 100:100'
            if bout['disqualified']:
                suffix += ' · дисквалификация: ' + ', '.join(by_id[team]['team_name'] for team in bout['disqualified'])
            c.execute('UPDATE matches SET title=? WHERE id=?', (title + suffix, result['match_id']))
            for team in by_id:
                key = str(team)
                c.execute('UPDATE round_players SET health=?,kills=?,disqualified=?,eliminated=?,respawns_used=?,error=? WHERE round_id=? AND team_id=?',
                          (state['health'][key], state['points'][key], int(team in state.get('disqualified', [])) if elimination else int(key in state['out']), state['out'].get(key), state['respawns'][key], state['errors'].get(key), round_row['id'], team))
    winner = None if elimination else state.get('goal_winner') or next((team for team in by_id if state['points'][str(team)] >= target), None)
    reason = ('elimination' if len(state['queue']) == 1 else 'no_remaining') if elimination else 'kill_target' if winner is not None else 'last_remaining' if len(state['queue']) == 1 else 'all_disqualified'
    if queue_rules and winner is None:
        reason = 'no_opponents'
    if not queue_rules and winner is None and len(state['queue']) == 1:
        winner = state['queue'][0]
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        if elimination:
            c.execute('UPDATE round_players SET eliminated=? WHERE round_id=? AND eliminated IS NULL', (len(state['out']) + 1, round_row['id']))
        else:
            c.execute('UPDATE round_players SET eliminated=? WHERE round_id=? AND disqualified=0', (len(state['out']) + 1, round_row['id']))
        c.execute("UPDATE rounds SET status='done',finished=?,winner_team_id=?,end_reason=? WHERE id=?", (time.time(), winner, reason, round_row['id']))
    return {'message': 'Серия «Царь горы» завершена. Все поединки и счёт сохранены.', 'round_id': round_row['id'], 'winner_team_id': winner}
