"""Persistent, sequential king-of-the-hill tournament series."""
import json
import time
from .store import db


def run_series(round_row, players, job, duel):
    from .arena import positions
    by_id = {p['team_id']: p for p in players}
    state = json.loads(round_row['series_state']) if round_row['series_state'] else {
        'queue': list(by_id), 'points': {str(i): 0 for i in by_id},
        'idle': {str(i): 0 for i in by_id}, 'health': {str(i): 100 for i in by_id},
        'respawns': {str(i): 0 for i in by_id}, 'errors': {}, 'out': {}, 'sequence': 0,
    }
    target = round_row['kill_target']
    if target < 1:
        raise ValueError('Для серии нужно указать число потоплений (побед).')
    while len(state['queue']) >= 2 and max(state['points'].values()) < target:
        left, right = state['queue'][:2]
        remaining = state['queue'][2:]
        sequence = state['sequence'] + 1
        title = '%s · Бой %s · %s — %s' % (round_row['name'], sequence, by_id[left]['team_name'], by_id[right]['team_name'])
        # A completed bout may precede its checkpoint if the process was restarted.
        with db() as c:
            saved = c.execute("SELECT id,result FROM matches WHERE job_id=? AND title=? AND status='done' ORDER BY id DESC LIMIT 1", (job['id'], title)).fetchone()
        if saved:
            result = dict(json.loads(saved['result']), match_id=saved['id'])
        else:
            starts = positions(2)
            result = duel({
                'avatars': [dict(name=by_id[team]['team_name'], code=by_id[team]['code'], x=point[0], y=point[1], series_score=state['points'][str(team)]) for team, point in zip((left, right), starts)],
                'no_damage_seconds': 60, 'realtime': True, 'record_replay': True,
                'playback_speed': round_row['playback_speed'], 'respawns': round_row['respawns'],
            }, job['id'], title)
        a, b = result['avatars']
        difference = a['health'] - b['health']
        winner = left if difference > .0001 else right if difference < -.0001 else None
        full_draw = winner is None and abs(a['health'] - 100) < .0001 and abs(b['health'] - 100) < .0001
        for team, avatar in zip((left, right), (a, b)):
            key = str(team)
            state['health'][key] = avatar['health']
            state['respawns'][key] += avatar.get('generation', 0)
            state['errors'][key] = avatar.get('error')
            state['idle'][key] = state['idle'][key] + 1 if full_draw else 0
            if state['idle'][key] >= 2:
                state['out'][key] = len(state['out']) + 1
        if winner is not None:
            loser = right if winner == left else left
            state['points'][str(winner)] += 1
            state['queue'] = [winner] + remaining + [loser]
        else:
            state['queue'] = remaining + [team for team in (left, right) if str(team) not in state['out']]
        state['sequence'] = sequence
        bout = {'health': [a['health'], b['health']], 'scores': [state['points'][str(left)], state['points'][str(right)]],
                'full_draw': full_draw, 'idle_streaks': [state['idle'][str(left)], state['idle'][str(right)]],
                'disqualified': [team for team in (left, right) if str(team) in state['out']]}
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
                          (state['health'][key], state['points'][key], int(key in state['out']), state['out'].get(key), state['respawns'][key], state['errors'].get(key), round_row['id'], team))
    winner = next((team for team in by_id if state['points'][str(team)] >= target), None)
    reason = 'kill_target' if winner is not None else 'last_remaining' if len(state['queue']) == 1 else 'all_disqualified'
    if winner is None and len(state['queue']) == 1:
        winner = state['queue'][0]
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        c.execute('UPDATE round_players SET eliminated=? WHERE round_id=? AND disqualified=0', (len(state['out']) + 1, round_row['id']))
        c.execute("UPDATE rounds SET status='done',finished=?,winner_team_id=?,end_reason=? WHERE id=?", (time.time(), winner, reason, round_row['id']))
    return {'message': 'Серия «Царь горы» завершена. Все поединки и счёт сохранены.', 'round_id': round_row['id'], 'winner_team_id': winner}
