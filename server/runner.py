"""One isolated battle process; compatible with Python 3.8."""
import json
import os
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parent.parent


def run(spec):
    import quickjs
    context = quickjs.Context()
    context.set_memory_limit(96 * 1024 * 1024)
    context.set_max_stack_size(2 * 1024 * 1024)
    context.set_time_limit(4)
    for path in [
        ROOT / 'server/runtime/host.js',
        ROOT / 'appengine/third-party/JS-Interpreter/compressed.js',
        ROOT / 'server/runtime/avatar.js',
        ROOT / 'server/runtime/battle.js',
        ROOT / 'appengine/pond/duck/default-ducks.js',
        ROOT / 'appengine/pond/course-data.js',
    ]:
        context.eval(path.read_text(encoding='utf-8-sig'))
    if spec.get('level'):
        level = int(spec['level'])
        scene = json.loads(context.eval('JSON.stringify(POND_COURSE[%d].scene)' % (level - 1)))
        scene[0]['code'] = spec['code']
        spec['avatars'] = scene
    context.eval('startMatch(%s)' % json.dumps(spec, ensure_ascii=True))
    started = time.monotonic()
    limit = min(120, max(10, int(spec.get('seconds', 60))))
    while True:
        frame = json.loads(context.eval('advanceMatch(5)'))
        if frame['time'] >= limit:
            frame['done'] = True
        print(json.dumps(frame, ensure_ascii=True), flush=True)
        if frame['done']:
            return
        if spec.get('realtime'):
            # Match-clock pacing makes the admin viewer show the actual live duel.
            delay = frame['time'] - (time.monotonic() - started)
            if delay > 0:
                time.sleep(min(delay, .1))


if __name__ == '__main__':
    try:
        if os.name == 'posix':
            import resource
            resource.setrlimit(resource.RLIMIT_CPU, (90, 90))
            resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
            resource.setrlimit(resource.RLIMIT_FSIZE, (8 * 1024 * 1024, 8 * 1024 * 1024))
        request = sys.stdin.buffer.readline(250001)
        if len(request) > 250000:
            raise ValueError('Слишком большой алгоритм')
        run(json.loads(request))
    except Exception:
        print(json.dumps({'error': 'Не удалось выполнить алгоритм. Измени блоки и попробуй снова.'}), flush=True)
        sys.exit(1)
