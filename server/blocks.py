"""Validate filled block inputs using the same schema as the client."""
import json
import math
from .store import ROOT

SCHEMA = json.loads((ROOT / 'appengine/pond/block-inputs.json').read_text(encoding='utf-8-sig'))


def tag(node):
    return node.tag.split('}')[-1]


def child(node, name):
    return next((item for item in node if tag(item) == name), None)


def chosen(value):
    block = child(value, 'block')
    return block if block is not None else child(value, 'shadow')


def active_nodes(node):
    if node.get('disabled') == 'true':
        following = child(node, 'next')
        if following is not None:
            yield from active_nodes(following)
        return
    if tag(node) == 'value':
        selected = chosen(node)
        if selected is not None:
            yield from active_nodes(selected)
        return
    if tag(node) in ('block', 'shadow'):
        yield node
    for item in node:
        yield from active_nodes(item)


def block_errors(root):
    nodes = list(active_nodes(root))
    if not nodes:
        return ['Программа пуста. Добавь блоки из панели и соедини их.']
    issues = []
    for node in nodes:
        if len(issues) >= 20:
            break
        kind = node.get('type')
        rule = SCHEMA.get(kind, {})
        inputs = dict(rule.get('inputs', {}))
        mutation = child(node, 'mutation')
        if kind == 'controls_if' and mutation is not None:
            for index in range(1, min(4000, max(0, int(mutation.get('elseif', '0')))) + 1):
                inputs['IF%s' % index] = 'условие дополнительной ветви'
        if kind in ('procedures_callreturn', 'procedures_callnoreturn') and mutation is not None:
            for index, arg in enumerate(item for item in mutation if tag(item) == 'arg'):
                inputs['ARG%s' % index] = 'аргумент функции «%s»' % arg.get('name', '')
        values = {item.get('name'): item for item in node if tag(item) == 'value'}
        for name, hint in inputs.items():
            value = values.get(name)
            selected = chosen(value) if value is not None else None
            if selected is None or selected.get('disabled') == 'true':
                issues.append('Блок «%s»: добавь %s.' % (rule.get('label', 'вызов функции'), hint))
                if len(issues) >= 20:
                    break
        if kind in ('math_number', 'pond_math_number'):
            field = next((item for item in node if tag(item) == 'field' and item.get('name') == 'NUM'), None)
            try:
                if field is None or not math.isfinite(float(field.text)):
                    raise ValueError()
            except (TypeError, ValueError):
                issues.append('В числовом блоке должно быть корректное число.')
    return issues


def number_count(root):
    return sum(node.get('type') in ('math_number', 'pond_math_number') for node in active_nodes(root))


def lesson_four_problem(root):
    nodes = list(active_nodes(root))
    counts = [('числовой блок', number_count(root))]
    for kind in ('pond_log', 'pond_cannon', 'pond_scan'):
        counts.append((kind[5:], sum(node.get('type') == kind for node in nodes)))
    wrong = ['%s: %s' % (label, count) for label, count in counts if count != 1]
    return ('Условие четвёртого уровня: ровно один числовой блок, один log, один cannon и один scan. Сейчас: ' + '; '.join(wrong) + '.') if wrong else None


def scan_in_cannon(root):
    for node in active_nodes(root):
        if node.get('type') == 'pond_cannon':
            value = next((item for item in node if tag(item) == 'value' and item.get('name') == 'RANGE'), None)
            if value is not None and any(item.get('type') == 'pond_scan' for item in active_nodes(value)):
                return True
    return False


def nested_loop_problem(root, level):
    loops = [node for node in active_nodes(root) if node.get('type') in
             ('controls_whileUntil', 'controls_repeat_ext', 'controls_repeat', 'controls_for', 'controls_forEach')]
    if level == 9 and len(loops) > 2:
        return 'На уровне 9 можно использовать не более двух циклов. Сейчас их: %s.' % len(loops)
    if level == 10 and len(loops) > 3:
        return 'На уровне 10 можно использовать не более трёх циклов. Сейчас их: %s.' % len(loops)
    if level == 11 and len(loops) > 2:
        return 'На уровне 11 можно использовать не более двух циклов. Сейчас их: %s.' % len(loops)
    if level in (12, 13, 14):
        conditionals = sum(node.get('type') == 'controls_if' for node in active_nodes(root))
        if len(loops) != 1 or conditionals != 1:
            return 'На уровне %s нужны ровно один цикл и один блок «Если». Сейчас циклов: %s, блоков «Если»: %s.' % (level, len(loops), conditionals)
    if level == 7:
        if len(loops) != 2 or any(node.get('type') != 'controls_whileUntil' for node in loops):
            return 'На уровне 7 нужны ровно два цикла «пока». Другие виды циклов не подходят.'
    if level == 8:
        repeats = [node for node in loops if node.get('type') in ('controls_repeat_ext', 'controls_repeat')]
        whiles = [node for node in loops if node.get('type') == 'controls_whileUntil']
        if len(loops) != 2 or len(repeats) != 1 or len(whiles) != 1:
            return 'На уровне %s нужны ровно два цикла: «повторить» и «пока».' % level
        # Descend into the body, not the following statement chain.
        body = child(repeats[0], 'statement')
        if body is None or not any(item is whiles[0] for item in active_nodes(body)):
            return 'Помести цикл «пока» внутрь цикла «повторить».'
    return None
