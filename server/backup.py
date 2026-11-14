"""Consistent SQLite backup, including outstanding WAL changes."""
from pathlib import Path
import sqlite3
import sys
from .store import db

if __name__ == '__main__':
    target = Path(sys.argv[1]).resolve()
    if target.exists():
        raise SystemExit('Файл назначения уже существует.')
    with db() as source, sqlite3.connect(str(target)) as destination:
        source.backup(destination)
    target.chmod(0o600)
    print('Резервная копия создана.')
