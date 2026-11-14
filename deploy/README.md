# Сервер Пруда

Приложение рассчитано на Python 3.8. Сервер использует стандартную библиотеку Python, SQLite и QuickJS. Готовые клиентские сборки не компилируются. Файлы `server/runtime` — исполняемый движок с исходной физикой Pond для серверных сражений.

Рабочий сайт: https://силенок.рф. VPS: 193.124.115.164.

## Установка на Ubuntu

Пакеты: `nginx`, `git`, `python3-venv`, `certbot`, `python3-certbot-nginx`.

Репозиторий размещается в `/opt/pond`, окружение Python — `/opt/pond-venv`. Установить зависимости: `/opt/pond-venv/bin/pip install -r /opt/pond/server/requirements.txt`.

Системный пользователь `pond` запускает приложение без доступа к домашним каталогам. `/var/lib/pond` принадлежит этому пользователю с правами 700. База SQLite, учётные записи, сессии, решения и таблицы хранятся здесь и не затрагиваются обновлением сайта.

Файл `/etc/pond.env` (root:root, 600):

```ini
POND_HOST=127.0.0.1
POND_PORT=8000
POND_DATA_DIR=/var/lib/pond
POND_ORIGIN=https://xn--e1afhclgq.xn--p1ai
POND_TRUST_PROXY=1
POND_ADMIN_PASSWORD_HASH=<PBKDF2-хеш начального пароля>
```

Скопировать `pond.service`, `pond-update.service`, `pond-update.timer` в `/etc/systemd/system/`. Выполнить `systemctl daemon-reload` и `systemctl enable --now pond pond-update.timer`.

Конфигурация nginx находится в `nginx.conf`. После установки сертификата Certbot дополняет её HTTPS и перенаправлением с HTTP. Сертификат продлевается стандартным `certbot.timer`.

## Автообновление

Таймер `pond-update.timer` раз в минуту проверяет `origin/master`. `update.sh` принимает только последовательные изменения Git, устанавливает зависимости и перезапускает сервис. При неудачной установке зависимостей или остановке сервиса после запуска возвращает предыдущий коммит. Таймер не запускает тесты и не компилирует клиент. GitHub-токен и SSH-пароль для обновлений не нужны: репозиторий публичный.

GitHub Pages продолжает публиковать каталог `appengine` отдельным существующим workflow. Там доступно знакомство с обучением; серверные функции работают на основном домене.

Команды сопровождения:

```sh
systemctl status pond pond-update.timer
journalctl -u pond -u pond-update --since today
systemctl start pond-update.service
```

Автоматическое обновление активируется только после отправки коммита в `master`. Незакоммиченные локальные изменения на сервер не попадают. Настройки nginx и `/etc/pond.env` обновлением не перезаписываются.

## Администратор и резервная копия

Вход: `/account`, панель: `/admin`. Начальный логин — `silenok`; пароль соответствует указанному владельцем проекта. Пароль и его хеш в репозитории не хранятся. При первом запуске хеш берётся из закрытого `/etc/pond.env`; затем используется запись в базе. Для изменения пароля выполнить из `/opt/pond`: `sudo -u pond POND_DATA_DIR=/var/lib/pond /opt/pond-venv/bin/python -m server.password`.

Резервная копия при работающем приложении: `sudo -u pond POND_DATA_DIR=/var/lib/pond /opt/pond-venv/bin/python -m server.backup /var/lib/pond/backup.sqlite3`. Копировать готовый файл в защищённое хранилище вне VDS. Для восстановления остановить `pond`, вернуть файл как `pond.sqlite3`, удалить старые файлы `pond.sqlite3-wal` и `pond.sqlite3-shm`, восстановить владельца `pond` и запустить сервис.
