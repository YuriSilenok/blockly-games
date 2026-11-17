"""The running process keeps the revision it started with until deployment restarts it."""
import re
import subprocess
from .store import ROOT, DATA


def revision():
    try:
        value = (DATA / 'deployed-revision').read_text(encoding='ascii').strip()
        if re.fullmatch(r'[0-9a-f]{40,64}', value):
            return value
    except (OSError, UnicodeError):
        pass
    try:
        value = subprocess.check_output(
            ['git', '-c', 'safe.directory=' + str(ROOT), 'rev-parse', 'HEAD'],
            cwd=str(ROOT), stderr=subprocess.DEVNULL, timeout=2).decode('ascii').strip()
        return value if re.fullmatch(r'[0-9a-f]{40,64}', value) else ''
    except (OSError, subprocess.SubprocessError, UnicodeError):
        return ''


REVISION = revision()
